CREATE OR REPLACE FUNCTION public.lab_reject_imaging_study(
  p_study_id uuid,
  p_rejection_reason text DEFAULT NULL
)
RETURNS lab_portal_imaging_studies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_lab uuid;
  updated_row public.lab_portal_imaging_studies%ROWTYPE;
BEGIN
  current_lab := public.current_user_lab_id();
  IF current_lab IS NULL THEN
    RAISE EXCEPTION 'You are not a member of any lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_portal_imaging_studies
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      is_deleted = true,
      deleted_at = now(),
      updated_at = now()
  WHERE id = p_study_id
    AND lab_id = current_lab
    AND is_deleted = false
    AND status = 'ordered'
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Study not found, not assigned to your lab, or already processed.' USING ERRCODE = 'P0001';
  END IF;

  RETURN updated_row;
END;
$$;