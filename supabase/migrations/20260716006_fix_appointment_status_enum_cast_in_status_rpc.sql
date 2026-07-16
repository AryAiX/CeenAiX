CREATE OR REPLACE FUNCTION public.update_doctor_appointment_status(p_appointment_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status text;
BEGIN
  IF p_status NOT IN ('in_progress', 'completed', 'no_show') THEN
    RAISE EXCEPTION 'Invalid status for this action.';
  END IF;

  SELECT status INTO v_current_status
  FROM public.appointments
  WHERE id = p_appointment_id
    AND doctor_id = auth.uid()
    AND is_deleted = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF p_status = 'in_progress' AND v_current_status NOT IN ('scheduled', 'confirmed') THEN
    RAISE EXCEPTION 'Appointment cannot be marked in progress from its current status.';
  END IF;

  IF p_status = 'completed' AND v_current_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Appointment must be in progress before it can be marked completed.';
  END IF;

  IF p_status = 'no_show' AND v_current_status NOT IN ('scheduled', 'confirmed', 'in_progress') THEN
    RAISE EXCEPTION 'Appointment cannot be marked as no-show from its current status.';
  END IF;

  UPDATE public.appointments
  SET status = p_status::appointment_status,
      updated_at = now()
  WHERE id = p_appointment_id;
END;
$function$;