-- Harden lab order workflow RPCs from PR #88 (selective, production-safe).
-- - Fail-closed lab membership (no silent first-lab pick)
-- - claim assigns only (no ordered→collected jump)
-- - confirm specimen / start processing / release / reject via scoped DEFINER RPCs
-- - fixed search_path + revoke anon/public execute
-- - Do NOT port plaintext release PINs, imaging doctor RPC, or loinc=test_code backfill

-- ---------------------------------------------------------------------------
-- Columns used by the workflow
-- ---------------------------------------------------------------------------

ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS sample_received_at timestamptz;

-- ---------------------------------------------------------------------------
-- Drop unsafe / out-of-slice overloads from ad-hoc #88 apply on some envs
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.lab_release_order_with_pin(uuid, text);
DROP FUNCTION IF EXISTS public.lab_start_processing(uuid, text);

-- ---------------------------------------------------------------------------
-- current_user_lab_id: fail closed when 0 or >1 active memberships
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_lab_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN count(DISTINCT ls.lab_id) = 1 THEN (array_agg(DISTINCT ls.lab_id))[1]
    ELSE NULL
  END
  FROM public.lab_staff ls
  WHERE ls.user_id = auth.uid()
    AND ls.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.require_current_user_lab_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  membership_count int;
BEGIN
  SELECT count(DISTINCT ls.lab_id)
  INTO membership_count
  FROM public.lab_staff ls
  WHERE ls.user_id = auth.uid()
    AND ls.is_active = true;

  IF membership_count = 0 THEN
    RAISE EXCEPTION 'You are not a member of any lab.' USING ERRCODE = 'P0001';
  END IF;

  IF membership_count > 1 THEN
    RAISE EXCEPTION 'Multiple active laboratory memberships; select a single lab before continuing.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT ls.lab_id
  INTO current_lab
  FROM public.lab_staff ls
  WHERE ls.user_id = auth.uid()
    AND ls.is_active = true
  LIMIT 1;

  RETURN current_lab;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_lab_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_lab_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_lab_id() TO authenticated;

REVOKE ALL ON FUNCTION public.require_current_user_lab_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.require_current_user_lab_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.require_current_user_lab_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- lab_claim_order: assign only (no status jump)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lab_claim_order(target_order_id uuid)
RETURNS public.lab_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  updated_row public.lab_orders%ROWTYPE;
BEGIN
  current_lab := public.require_current_user_lab_id();

  UPDATE public.lab_orders lo
  SET assigned_lab_id = current_lab,
      updated_at = now()
  WHERE lo.id = target_order_id
    AND NOT lo.is_deleted
    AND (lo.assigned_lab_id IS NULL OR lo.assigned_lab_id = current_lab)
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Order not found or already claimed by another lab.' USING ERRCODE = 'P0001';
  END IF;

  RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.lab_claim_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_claim_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_claim_order(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- lab_confirm_specimen: ordered → collected for the caller's lab
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lab_confirm_specimen(target_order_id uuid)
RETURNS public.lab_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  updated_row public.lab_orders%ROWTYPE;
BEGIN
  current_lab := public.require_current_user_lab_id();

  UPDATE public.lab_orders lo
  SET status = 'collected'::lab_order_status,
      sample_collection_at = COALESCE(lo.sample_collection_at, now()),
      updated_at = now()
  WHERE lo.id = target_order_id
    AND NOT lo.is_deleted
    AND lo.assigned_lab_id = current_lab
    AND lo.status = 'ordered'
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Order not found, not claimed by your lab, or already past Received stage.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_order_items
  SET status = 'collected'::lab_order_status,
      updated_at = now()
  WHERE lab_order_id = updated_row.id
    AND status = 'ordered';

  RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.lab_confirm_specimen(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_confirm_specimen(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_confirm_specimen(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- lab_start_processing: set sample_received_at (no instrument side-effects)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lab_start_processing(target_order_id uuid)
RETURNS public.lab_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  updated_row public.lab_orders%ROWTYPE;
BEGIN
  current_lab := public.require_current_user_lab_id();

  UPDATE public.lab_orders lo
  SET status = 'processing'::lab_order_status,
      sample_received_at = COALESCE(lo.sample_received_at, now()),
      updated_at = now()
  WHERE lo.id = target_order_id
    AND NOT lo.is_deleted
    AND lo.assigned_lab_id = current_lab
    AND lo.status IN ('ordered', 'collected')
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Order not found or not claimed by your lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_order_items
  SET status = CASE
        WHEN status IN ('ordered', 'collected') THEN 'processing'::lab_order_status
        ELSE status
      END,
      updated_at = now()
  WHERE lab_order_id = updated_row.id;

  RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.lab_start_processing(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_start_processing(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_start_processing(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- lab_release_order: keep status=resulted (doctor still reviews → reviewed),
-- set results_released_at, avoid duplicate patient notifications on re-release
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lab_release_order(target_order_id uuid)
RETURNS public.lab_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  incomplete_count int;
  previous_released_at timestamptz;
  updated_row public.lab_orders%ROWTYPE;
BEGIN
  current_lab := public.require_current_user_lab_id();

  SELECT count(*)
  INTO incomplete_count
  FROM public.lab_order_items loi
  JOIN public.lab_orders lo ON lo.id = loi.lab_order_id
  WHERE lo.id = target_order_id
    AND lo.assigned_lab_id = current_lab
    AND NOT lo.is_deleted
    AND loi.status NOT IN ('resulted', 'reviewed');

  IF incomplete_count > 0 THEN
    RAISE EXCEPTION 'Some tests on this order do not have results yet.' USING ERRCODE = 'P0001';
  END IF;

  SELECT lo.results_released_at
  INTO previous_released_at
  FROM public.lab_orders lo
  WHERE lo.id = target_order_id
    AND lo.assigned_lab_id = current_lab
    AND NOT lo.is_deleted;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not assigned to your lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_orders lo
  SET status = 'resulted'::lab_order_status,
      results_released_at = COALESCE(lo.results_released_at, now()),
      updated_at = now()
  WHERE lo.id = target_order_id
    AND lo.assigned_lab_id = current_lab
    AND NOT lo.is_deleted
    AND lo.status IN ('ordered', 'collected', 'processing', 'resulted')
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Order not found or not assigned to your lab.' USING ERRCODE = 'P0001';
  END IF;

  IF previous_released_at IS NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, action_url)
    VALUES (
      updated_row.patient_id,
      'lab_result',
      'Your lab results are ready',
      'Open the lab results page to review and, if needed, ask the AI assistant for a plain-language explanation.',
      '/patient/lab-results'
    );
  END IF;

  RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.lab_release_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_release_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_release_order(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- lab_reject_order: soft-delete only when assigned to the caller's lab
-- (never soft-delete unassigned shared-queue rows — cross-lab DoS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lab_reject_order(
  target_order_id uuid,
  rejection_reason text DEFAULT 'No reason provided'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  trimmed_reason text;
  updated_id uuid;
BEGIN
  current_lab := public.require_current_user_lab_id();
  trimmed_reason := nullif(btrim(coalesce(rejection_reason, '')), '');
  IF trimmed_reason IS NULL THEN
    trimmed_reason := 'No reason provided';
  END IF;

  UPDATE public.lab_orders lo
  SET is_deleted = true,
      deleted_at = now(),
      rejection_reason = trimmed_reason,
      updated_at = now()
  WHERE lo.id = target_order_id
    AND NOT lo.is_deleted
    AND lo.assigned_lab_id = current_lab
  RETURNING lo.id INTO updated_id;

  IF updated_id IS NULL THEN
    RAISE EXCEPTION 'Order not found, already deleted, or not assigned to your lab.'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.lab_reject_order(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_reject_order(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_reject_order(uuid, text) TO authenticated;

-- Harden grants on result-entry overloads (do not change LOINC semantics).
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'lab_save_item_result'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Lab staff may read their own rejected (soft-deleted) orders for audit UI
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS lab_staff_read_rejected_lab_orders ON public.lab_orders;
CREATE POLICY lab_staff_read_rejected_lab_orders
  ON public.lab_orders
  FOR SELECT
  USING (
    is_deleted = true
    AND assigned_lab_id IS NOT NULL
    AND public.is_current_user_in_lab(assigned_lab_id)
    AND public.is_current_user_lab_staff()
  );

NOTIFY pgrst, 'reload schema';
