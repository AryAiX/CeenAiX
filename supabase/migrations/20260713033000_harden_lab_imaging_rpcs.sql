-- Harden the remaining safe imaging/radiology RPC slice from PR #88.
-- - Adds soft-delete/report columns needed by the existing lab portal UI.
-- - Replaces direct client-side imaging mutations with row/lab-scoped RPCs.
-- - Uses fail-closed lab membership via require_current_user_lab_id().
-- - Explicitly drops unsafe #88 leftovers if they were applied ad hoc:
--   plaintext PIN signing and first-lab/Dubai-fallback doctor create.

ALTER TABLE public.lab_portal_imaging_studies
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS findings text,
  ADD COLUMN IF NOT EXISTS impression text,
  ADD COLUMN IF NOT EXISTS recommendations text,
  ADD COLUMN IF NOT EXISTS report_checklist jsonb;

COMMENT ON COLUMN public.lab_portal_imaging_studies.is_deleted IS
  'Soft-delete flag set true when a lab rejects an imaging order.';
COMMENT ON COLUMN public.lab_portal_imaging_studies.deleted_at IS
  'Timestamp when the imaging study was rejected/soft-deleted.';
COMMENT ON COLUMN public.lab_portal_imaging_studies.rejection_reason IS
  'Reason provided when the imaging study was rejected.';
COMMENT ON COLUMN public.lab_portal_imaging_studies.findings IS
  'Radiologist-entered findings text for this study report.';
COMMENT ON COLUMN public.lab_portal_imaging_studies.impression IS
  'Radiologist-entered impression/conclusion text for this study report.';
COMMENT ON COLUMN public.lab_portal_imaging_studies.recommendations IS
  'Radiologist-entered follow-up recommendations for this study report.';
COMMENT ON COLUMN public.lab_portal_imaging_studies.report_checklist IS
  'JSON object recording report checklist attestations.';

ALTER TABLE public.lab_portal_imaging_studies
  DROP CONSTRAINT IF EXISTS lab_portal_imaging_status_chk;

ALTER TABLE public.lab_portal_imaging_studies
  ADD CONSTRAINT lab_portal_imaging_status_chk
  CHECK (status IN ('ordered', 'scheduled', 'scanning', 'report_pending', 'reported', 'released', 'rejected'));

DROP FUNCTION IF EXISTS public.lab_set_imaging_study_status(uuid, text);
DROP FUNCTION IF EXISTS public.lab_sign_radiology_report(uuid, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.doctor_create_imaging_order(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamp with time zone,
  text
);

CREATE OR REPLACE FUNCTION public.lab_set_imaging_study_status(
  p_study_id uuid,
  p_status text,
  p_report_status text DEFAULT NULL,
  p_findings text DEFAULT NULL,
  p_impression text DEFAULT NULL,
  p_recommendations text DEFAULT NULL,
  p_report_checklist jsonb DEFAULT NULL
)
RETURNS public.lab_portal_imaging_studies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  updated_row public.lab_portal_imaging_studies%ROWTYPE;
BEGIN
  current_lab := public.require_current_user_lab_id();

  IF p_status NOT IN ('ordered', 'scheduled', 'scanning', 'report_pending', 'reported', 'released') THEN
    RAISE EXCEPTION 'Invalid imaging status.' USING ERRCODE = 'P0001';
  END IF;

  IF p_report_status IS NOT NULL AND p_report_status NOT IN ('draft', 'preliminary', 'final') THEN
    RAISE EXCEPTION 'Invalid radiology report status.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_portal_imaging_studies studies
  SET status = p_status,
      report_status = COALESCE(
        p_report_status,
        CASE WHEN p_status = 'released' THEN 'final' ELSE studies.report_status END
      ),
      findings = CASE WHEN p_findings IS NULL THEN studies.findings ELSE NULLIF(btrim(p_findings), '') END,
      impression = CASE WHEN p_impression IS NULL THEN studies.impression ELSE NULLIF(btrim(p_impression), '') END,
      recommendations = CASE
        WHEN p_recommendations IS NULL THEN studies.recommendations
        ELSE NULLIF(btrim(p_recommendations), '')
      END,
      report_checklist = COALESCE(p_report_checklist, studies.report_checklist),
      updated_at = now()
  WHERE studies.id = p_study_id
    AND studies.lab_id = current_lab
    AND NOT studies.is_deleted
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Study not found or not assigned to your lab.' USING ERRCODE = 'P0001';
  END IF;

  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.lab_reject_imaging_study(
  p_study_id uuid,
  p_rejection_reason text DEFAULT 'No reason provided'
)
RETURNS public.lab_portal_imaging_studies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  trimmed_reason text;
  updated_row public.lab_portal_imaging_studies%ROWTYPE;
BEGIN
  current_lab := public.require_current_user_lab_id();
  trimmed_reason := nullif(btrim(coalesce(p_rejection_reason, '')), '');
  IF trimmed_reason IS NULL THEN
    trimmed_reason := 'No reason provided';
  END IF;

  UPDATE public.lab_portal_imaging_studies studies
  SET status = 'rejected',
      is_deleted = true,
      deleted_at = now(),
      rejection_reason = trimmed_reason,
      updated_at = now()
  WHERE studies.id = p_study_id
    AND studies.lab_id = current_lab
    AND NOT studies.is_deleted
    AND studies.status = 'ordered'
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Study not found, not assigned to your lab, or already processed.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.lab_set_imaging_study_status(
  uuid, text, text, text, text, text, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_set_imaging_study_status(
  uuid, text, text, text, text, text, jsonb
) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_set_imaging_study_status(
  uuid, text, text, text, text, text, jsonb
) TO authenticated;

REVOKE ALL ON FUNCTION public.lab_reject_imaging_study(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_reject_imaging_study(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_reject_imaging_study(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
