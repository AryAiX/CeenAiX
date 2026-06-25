CREATE OR REPLACE FUNCTION public.lab_log_qc_run(
  p_instrument_name text,
  p_department text,
  p_lot_number text,
  p_level_label text,
  p_result_label text,
  p_status text,
  p_result_value numeric DEFAULT NULL,
  p_target_value numeric DEFAULT NULL,
  p_sd_value numeric DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_run_at timestamp with time zone DEFAULT now()
)
RETURNS lab_portal_qc_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_lab uuid;
  new_row public.lab_portal_qc_runs%ROWTYPE;
  new_equipment_status text;
BEGIN
  current_lab := public.current_user_lab_id();
  IF current_lab IS NULL THEN
    RAISE EXCEPTION 'You are not a member of any lab.' USING ERRCODE = 'P0001';
  END IF;

  IF p_status NOT IN ('passed', 'warning', 'failed') THEN
    RAISE EXCEPTION 'Invalid status. Must be passed, warning, or failed.' USING ERRCODE = 'P0001';
  END IF;

  new_equipment_status := CASE p_status
    WHEN 'passed' THEN 'online'
    WHEN 'warning' THEN 'warning'
    WHEN 'failed' THEN 'maintenance'
  END;

  UPDATE public.lab_portal_equipment
  SET status = new_equipment_status,
      updated_at = now()
  WHERE lab_id = current_lab
    AND department = p_department
    AND name = p_instrument_name;

  INSERT INTO public.lab_portal_qc_runs (
    lab_id,
    department,
    instrument_name,
    lot_number,
    level_label,
    result_label,
    status,
    result_value,
    target_value,
    sd_value,
    unit,
    run_at
  ) VALUES (
    current_lab,
    p_department,
    p_instrument_name,
    p_lot_number,
    p_level_label,
    p_result_label,
    p_status,
    p_result_value,
    p_target_value,
    p_sd_value,
    p_unit,
    p_run_at
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;