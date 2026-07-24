CREATE OR REPLACE FUNCTION public.update_appointment_status(
  p_appointment_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_status text;
  v_old_rank int;
  v_new_rank int;
BEGIN
  SELECT status::text INTO v_old_status
  FROM public.appointments
  WHERE id = p_appointment_id
    AND facility_id = current_user_clinic_facility_id()
    AND clinic_member_can_manage()
    AND is_deleted = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or you do not have permission to update it.';
  END IF;

  IF v_old_status = p_new_status THEN
    RETURN;
  END IF;

  IF v_old_status IN ('completed', 'cancelled', 'no-show') THEN
    RAISE EXCEPTION 'This appointment is % and its status can no longer be changed.', v_old_status;
  END IF;

  IF p_new_status IN ('cancelled', 'no-show') THEN
    UPDATE public.appointments SET status = p_new_status::appointment_status, updated_at = now() WHERE id = p_appointment_id;
    RETURN;
  END IF;

  v_old_rank := CASE v_old_status WHEN 'scheduled' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'in-progress' THEN 2 END;
  v_new_rank := CASE p_new_status WHEN 'scheduled' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'in-progress' THEN 2 WHEN 'completed' THEN 3 ELSE NULL END;

  IF v_new_rank IS NULL OR v_new_rank <= v_old_rank THEN
    RAISE EXCEPTION 'Cannot move appointment status backward from % to %.', v_old_status, p_new_status;
  END IF;

  UPDATE public.appointments SET status = p_new_status::appointment_status, updated_at = now() WHERE id = p_appointment_id;
END;
$function$;

NOTIFY pgrst, 'reload schema';