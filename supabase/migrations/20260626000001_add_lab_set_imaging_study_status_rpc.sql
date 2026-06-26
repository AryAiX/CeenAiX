CREATE OR REPLACE FUNCTION public.lab_set_imaging_study_status(
  p_study_id uuid,
  p_status text
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

  IF p_status NOT IN ('ordered', 'scheduled', 'scanning', 'report_pending', 'reported', 'released') THEN
    RAISE EXCEPTION 'Invalid status value.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_portal_imaging_studies
  SET status = p_status,
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