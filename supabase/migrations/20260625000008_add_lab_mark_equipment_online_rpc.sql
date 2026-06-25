CREATE OR REPLACE FUNCTION public.lab_mark_equipment_online(
  p_equipment_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS lab_portal_equipment
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_lab uuid;
  updated_row public.lab_portal_equipment%ROWTYPE;
BEGIN
  current_lab := public.current_user_lab_id();
  IF current_lab IS NULL THEN
    RAISE EXCEPTION 'You are not a member of any lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_portal_equipment
  SET status = 'online',
      updated_at = now()
  WHERE id = p_equipment_id
    AND lab_id = current_lab
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Equipment not found or not assigned to your lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_equipment_maintenance_logs
  SET completed_at = now(),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE equipment_id = p_equipment_id
    AND lab_id = current_lab
    AND completed_at IS NULL;

  RETURN updated_row;
END;
$$;