-- Wellness outreach campaign log + member flag-for-review support for the insurance portal.
-- Writes go through hardened SECURITY DEFINER RPCs (matching the pattern used for other
-- insurance/clinical write paths) rather than raw table RLS, so direct client table writes
-- to these tables remain restricted to super_admin.

ALTER TABLE public.insurance_members
  ADD COLUMN IF NOT EXISTS flagged_for_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason text,
  ADD COLUMN IF NOT EXISTS flagged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flagged_at timestamptz;

CREATE TABLE IF NOT EXISTS public.wellness_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.insurance_members(id) ON DELETE SET NULL,
  audience text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  channels text[] NOT NULL DEFAULT ARRAY[]::text[],
  plan_filter text[],
  subject_en text,
  subject_ar text,
  message_en text NOT NULL,
  message_ar text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wellness_outreach_log_audience_chk
    CHECK (audience IN ('all', 'high_risk', 'benefit_alert', 'custom', 'single_member')),
  CONSTRAINT wellness_outreach_log_recipient_count_chk CHECK (recipient_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_wellness_outreach_log_org
  ON public.wellness_outreach_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_wellness_outreach_log_member
  ON public.wellness_outreach_log(member_id);

ALTER TABLE public.wellness_outreach_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wellness_outreach_log_ops_read" ON public.wellness_outreach_log;
CREATE POLICY "wellness_outreach_log_ops_read"
  ON public.wellness_outreach_log
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_ops_org(organization_id, 'insurance')
  );

DROP POLICY IF EXISTS "wellness_outreach_log_admin_manage" ON public.wellness_outreach_log;
CREATE POLICY "wellness_outreach_log_admin_manage"
  ON public.wellness_outreach_log
  FOR ALL
  USING (public.is_current_user_super_admin())
  WITH CHECK (public.is_current_user_super_admin());

-- Flag a member for care review. SECURITY DEFINER so it can bypass the
-- super_admin-only table RLS on insurance_members while still enforcing
-- org-scoped access via is_current_user_ops_org.
CREATE OR REPLACE FUNCTION public.flag_insurance_member_for_review(
  p_member_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_organization_id uuid;
BEGIN
  SELECT organization_id INTO v_organization_id
  FROM public.insurance_members
  WHERE id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found.';
  END IF;

  IF NOT (
    public.is_current_user_super_admin()
    OR public.is_current_user_ops_org(v_organization_id, 'insurance')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to flag this member.';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to flag a member for review.';
  END IF;

  UPDATE public.insurance_members
  SET flagged_for_review = true,
      flagged_reason = p_reason,
      flagged_by = auth.uid(),
      flagged_at = now(),
      updated_at = now()
  WHERE id = p_member_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.flag_insurance_member_for_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flag_insurance_member_for_review(uuid, text) TO authenticated;

-- Log a wellness outreach campaign send. SECURITY DEFINER for the same
-- reason as above; enforces org-scoped access before inserting.
CREATE OR REPLACE FUNCTION public.log_wellness_outreach(
  p_organization_id uuid,
  p_audience text,
  p_recipient_count integer,
  p_channels text[],
  p_message_en text,
  p_member_id uuid DEFAULT NULL,
  p_plan_filter text[] DEFAULT NULL,
  p_subject_en text DEFAULT NULL,
  p_subject_ar text DEFAULT NULL,
  p_message_ar text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (
    public.is_current_user_super_admin()
    OR public.is_current_user_ops_org(p_organization_id, 'insurance')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to log outreach for this organization.';
  END IF;

  IF p_audience NOT IN ('all', 'high_risk', 'benefit_alert', 'custom', 'single_member') THEN
    RAISE EXCEPTION 'Invalid audience: %', p_audience;
  END IF;

  IF p_message_en IS NULL OR btrim(p_message_en) = '' THEN
    RAISE EXCEPTION 'A message is required to log wellness outreach.';
  END IF;

  IF p_member_id IS NOT NULL THEN
    PERFORM 1 FROM public.insurance_members
    WHERE id = p_member_id AND organization_id = p_organization_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Member not found in this organization.';
    END IF;
  END IF;

  INSERT INTO public.wellness_outreach_log (
    organization_id, member_id, audience, recipient_count, channels,
    plan_filter, subject_en, subject_ar, message_en, message_ar, created_by
  ) VALUES (
    p_organization_id, p_member_id, p_audience, p_recipient_count, p_channels,
    p_plan_filter, p_subject_en, p_subject_ar, p_message_en, p_message_ar, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.log_wellness_outreach(uuid, text, integer, text[], text, uuid, text[], text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_wellness_outreach(uuid, text, integer, text[], text, uuid, text[], text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
