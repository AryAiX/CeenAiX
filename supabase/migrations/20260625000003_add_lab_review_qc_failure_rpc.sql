CREATE OR REPLACE FUNCTION public.lab_review_qc_failure(
  p_run_id uuid,
  p_failure_notes text,
  p_action text
)
RETURNS lab_portal_qc_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_lab uuid;
  updated_row public.lab_portal_qc_runs%ROWTYPE;
BEGIN
  current_lab := public.current_user_lab_id();
  IF current_lab IS NULL THEN
    RAISE EXCEPTION 'You are not a member of any lab.' USING ERRCODE = 'P0001';
  END IF;

  IF p_action NOT IN ('maintenance', 'replacement') THEN
    RAISE EXCEPTION 'Invalid action. Must be maintenance or replacement.' USING ERRCODE = 'P0001';
  END IF;

  -- Save the review details
  UPDATE public.lab_portal_qc_runs
  SET failure_notes = p_failure_notes,
      failure_action = p_action,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_run_id
    AND lab_id = current_lab
    AND status = 'failed'
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'QC run not found or not a failed run from your lab.' USING ERRCODE = 'P0001';
  END IF;

  -- If action is maintenance, update the equipment status
  IF p_action = 'maintenance' THEN
    UPDATE public.lab_portal_equipment
    SET status = 'maintenance',
        updated_at = now()
    WHERE lab_id = current_lab
      AND department = updated_row.department
      AND name = updated_row.instrument_name;
  END IF;

  RETURN updated_row;
END;
$$;