-- Product-readiness insurance workflows:
-- - payer decisions go through row-scoped RPCs
-- - patient insurance views can read linked payer-side records

ALTER TABLE public.insurance_pre_authorizations
  ADD COLUMN IF NOT EXISTS insurance_member_id uuid REFERENCES public.insurance_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_insurance_id uuid REFERENCES public.patient_insurance(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_note text;

ALTER TABLE public.insurance_claims
  ADD COLUMN IF NOT EXISTS insurance_member_id uuid REFERENCES public.insurance_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_insurance_id uuid REFERENCES public.patient_insurance(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS adjudicated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS adjudication_note text;

ALTER TABLE public.insurance_fraud_alerts
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_note text;

CREATE INDEX IF NOT EXISTS idx_insurance_members_patient_insurance
  ON public.insurance_members(patient_insurance_id);
CREATE INDEX IF NOT EXISTS idx_insurance_preauth_member
  ON public.insurance_pre_authorizations(insurance_member_id);
CREATE INDEX IF NOT EXISTS idx_insurance_preauth_patient_insurance
  ON public.insurance_pre_authorizations(patient_insurance_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_member
  ON public.insurance_claims(insurance_member_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient_insurance
  ON public.insurance_claims(patient_insurance_id);

DROP POLICY IF EXISTS "patients_read_linked_insurance_pre_authorizations" ON public.insurance_pre_authorizations;
CREATE POLICY "patients_read_linked_insurance_pre_authorizations"
  ON public.insurance_pre_authorizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.patient_insurance pi
      WHERE pi.patient_id = auth.uid()
        AND (
          pi.id = insurance_pre_authorizations.patient_insurance_id
          OR EXISTS (
            SELECT 1
            FROM public.insurance_members im
            WHERE im.id = insurance_pre_authorizations.insurance_member_id
              AND im.patient_insurance_id = pi.id
          )
        )
    )
  );

DROP POLICY IF EXISTS "patients_read_linked_insurance_claims" ON public.insurance_claims;
CREATE POLICY "patients_read_linked_insurance_claims"
  ON public.insurance_claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.patient_insurance pi
      WHERE pi.patient_id = auth.uid()
        AND (
          pi.id = insurance_claims.patient_insurance_id
          OR EXISTS (
            SELECT 1
            FROM public.insurance_members im
            WHERE im.id = insurance_claims.insurance_member_id
              AND im.patient_insurance_id = pi.id
          )
        )
    )
  );

DROP FUNCTION IF EXISTS public.insurance_decide_pre_authorization(uuid, text, numeric, text);
DROP FUNCTION IF EXISTS public.insurance_adjudicate_claim(uuid, text, text);
DROP FUNCTION IF EXISTS public.insurance_update_fraud_alert_status(uuid, text, text);
DROP FUNCTION IF EXISTS public.insurance_set_setting_enabled(uuid, boolean);

CREATE OR REPLACE FUNCTION public.insurance_decide_pre_authorization(
  p_pre_authorization_id uuid,
  p_decision text,
  p_approved_amount_aed numeric DEFAULT NULL,
  p_decision_note text DEFAULT NULL
)
RETURNS public.insurance_pre_authorizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.insurance_pre_authorizations;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
BEGIN
  SELECT *
  INTO v_row
  FROM public.insurance_pre_authorizations
  WHERE id = p_pre_authorization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pre-authorization not found.' USING ERRCODE = 'P0001';
  END IF;

  IF public.is_current_user_ops_org(v_row.organization_id, 'insurance') IS NOT TRUE THEN
    RAISE EXCEPTION 'Only insurance members for this organization can decide pre-authorizations.' USING ERRCODE = 'P0001';
  END IF;

  IF v_decision NOT IN ('approve', 'review', 'deny') THEN
    RAISE EXCEPTION 'Unsupported pre-authorization decision: %', p_decision USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.insurance_pre_authorizations
  SET
    status = CASE v_decision
      WHEN 'approve' THEN 'approved'
      WHEN 'deny' THEN 'denied'
      ELSE 'review'
    END,
    approved_amount_aed = CASE v_decision
      WHEN 'approve' THEN COALESCE(p_approved_amount_aed, v_row.requested_amount_aed)
      WHEN 'deny' THEN 0
      ELSE approved_amount_aed
    END,
    decision_at = CASE WHEN v_decision IN ('approve', 'deny') THEN now() ELSE decision_at END,
    decision_by = auth.uid(),
    decision_note = NULLIF(btrim(coalesce(p_decision_note, '')), ''),
    updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.insurance_adjudicate_claim(
  p_claim_id uuid,
  p_decision text,
  p_adjudication_note text DEFAULT NULL
)
RETURNS public.insurance_claims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.insurance_claims;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
BEGIN
  SELECT *
  INTO v_row
  FROM public.insurance_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found.' USING ERRCODE = 'P0001';
  END IF;

  IF public.is_current_user_ops_org(v_row.organization_id, 'insurance') IS NOT TRUE THEN
    RAISE EXCEPTION 'Only insurance members for this organization can adjudicate claims.' USING ERRCODE = 'P0001';
  END IF;

  IF v_decision NOT IN ('approve', 'deny', 'review', 'appeal') THEN
    RAISE EXCEPTION 'Unsupported claim decision: %', p_decision USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.insurance_claims
  SET
    status = CASE v_decision
      WHEN 'approve' THEN 'approved'
      WHEN 'deny' THEN 'denied'
      WHEN 'appeal' THEN 'appealed'
      ELSE 'under_review'
    END,
    adjudicated_at = CASE WHEN v_decision IN ('approve', 'deny') THEN now() ELSE adjudicated_at END,
    adjudicated_by = auth.uid(),
    adjudication_note = NULLIF(btrim(coalesce(p_adjudication_note, '')), ''),
    updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.insurance_update_fraud_alert_status(
  p_alert_id uuid,
  p_status text,
  p_resolution_note text DEFAULT NULL
)
RETURNS public.insurance_fraud_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.insurance_fraud_alerts;
  v_status text := lower(btrim(coalesce(p_status, '')));
BEGIN
  SELECT *
  INTO v_row
  FROM public.insurance_fraud_alerts
  WHERE id = p_alert_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fraud alert not found.' USING ERRCODE = 'P0001';
  END IF;

  IF public.is_current_user_ops_org(v_row.organization_id, 'insurance') IS NOT TRUE THEN
    RAISE EXCEPTION 'Only insurance members for this organization can update fraud alerts.' USING ERRCODE = 'P0001';
  END IF;

  IF v_status NOT IN ('open', 'investigating', 'resolved') THEN
    RAISE EXCEPTION 'Unsupported fraud alert status: %', p_status USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.insurance_fraud_alerts
  SET
    status = v_status,
    updated_by = auth.uid(),
    resolved_at = CASE WHEN v_status = 'resolved' THEN now() ELSE NULL END,
    resolution_note = NULLIF(btrim(coalesce(p_resolution_note, '')), ''),
    updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.insurance_set_setting_enabled(
  p_setting_id uuid,
  p_enabled boolean
)
RETURNS public.insurance_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.insurance_settings;
BEGIN
  SELECT *
  INTO v_row
  FROM public.insurance_settings
  WHERE id = p_setting_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insurance setting not found.' USING ERRCODE = 'P0001';
  END IF;

  IF public.is_current_user_ops_org(v_row.organization_id, 'insurance') IS NOT TRUE THEN
    RAISE EXCEPTION 'Only insurance members for this organization can update settings.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.insurance_settings
  SET enabled = p_enabled,
      updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.insurance_decide_pre_authorization(uuid, text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insurance_adjudicate_claim(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insurance_update_fraud_alert_status(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insurance_set_setting_enabled(uuid, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insurance_decide_pre_authorization(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insurance_adjudicate_claim(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insurance_update_fraud_alert_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insurance_set_setting_enabled(uuid, boolean) TO authenticated;
