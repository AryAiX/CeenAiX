CREATE OR REPLACE FUNCTION public.lab_log_maintenance(
  p_equipment_id uuid,
  p_maintenance_type text,
  p_reason text,
  p_performed_by text DEFAULT NULL,
  p_expected_return_at timestamp with time zone DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS lab_equipment_maintenance_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_lab uuid;
  equipment_row public.lab_portal_equipment%ROWTYPE;
  new_log public.lab_equipment_maintenance_logs%ROWTYPE;
BEGIN
  current_lab := public.current_user_lab_id();
  IF current_lab IS NULL THEN
    RAISE EXCEPTION 'You are not a member of any lab.' USING ERRCODE = 'P0001';
  END IF;

  IF p_maintenance_type NOT IN ('scheduled', 'unscheduled') THEN
    RAISE EXCEPTION 'Invalid maintenance type. Must be scheduled or unscheduled.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO equipment_row
  FROM public.lab_portal_equipment
  WHERE id = p_equipment_id
    AND lab_id = current_lab;

  IF equipment_row.id IS NULL THEN
    RAISE EXCEPTION 'Equipment not found or not assigned to your lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_portal_equipment
  SET status = 'maintenance',
      updated_at = now()
  WHERE id = p_equipment_id;

  INSERT INTO public.lab_equipment_maintenance_logs (
    lab_id,
    equipment_id,
    equipment_name,
    maintenance_type,
    reason,
    performed_by,
    expected_return_at,
    notes,
    logged_by
  ) VALUES (
    current_lab,
    p_equipment_id,
    equipment_row.name,
    p_maintenance_type,
    p_reason,
    p_performed_by,
    p_expected_return_at,
    p_notes,
    auth.uid()
  )
  RETURNING * INTO new_log;

  RETURN new_log;
END;
$$;