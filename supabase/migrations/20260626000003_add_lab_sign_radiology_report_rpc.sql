CREATE OR REPLACE FUNCTION public.lab_sign_radiology_report(
  p_study_id uuid,
  p_radiologist_pin text,
  p_findings text DEFAULT NULL,
  p_impression text DEFAULT NULL,
  p_recommendations text DEFAULT NULL,
  p_report_checklist jsonb DEFAULT NULL
)
RETURNS lab_portal_imaging_studies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_lab uuid;
  stored_pin text;
  updated_row public.lab_portal_imaging_studies%ROWTYPE;
BEGIN
  current_lab := public.current_user_lab_id();
  IF current_lab IS NULL THEN
    RAISE EXCEPTION 'You are not a member of any lab.' USING ERRCODE = 'P0001';
  END IF;

  SELECT ls.release_pin INTO stored_pin
  FROM public.lab_staff ls
  WHERE ls.user_id = auth.uid()
    AND ls.lab_id = current_lab
    AND ls.is_active = true;

  IF stored_pin IS NULL THEN
    RAISE EXCEPTION 'No PIN set for your account. Please set a release PIN in your lab profile.' USING ERRCODE = 'P0001';
  END IF;

  IF stored_pin != p_radiologist_pin THEN
    RAISE EXCEPTION 'Incorrect PIN. Please try again.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_portal_imaging_studies
  SET status = 'released',
      report_status = 'final',
      findings = COALESCE(p_findings, findings),
      impression = COALESCE(p_impression, impression),
      recommendations = COALESCE(p_recommendations, recommendations),
      report_checklist = COALESCE(p_report_checklist, report_checklist),
      updated_at = now()
  WHERE id = p_study_id
    AND lab_id = current_lab
    AND is_deleted = false
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Study not found or not assigned to your lab.' USING ERRCODE = 'P0001';
  END IF;

  RETURN updated_row;
END;
$$;