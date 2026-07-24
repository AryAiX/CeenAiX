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
  v_patient_id uuid;
  v_doctor_id uuid;
  v_scheduled_at timestamptz;
  v_doctor_name text;
BEGIN
  SELECT status::text, patient_id, doctor_id, scheduled_at
  INTO v_old_status, v_patient_id, v_doctor_id, v_scheduled_at
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
  ELSE
    v_old_rank := CASE v_old_status WHEN 'scheduled' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'in-progress' THEN 2 END;
    v_new_rank := CASE p_new_status WHEN 'scheduled' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'in-progress' THEN 2 WHEN 'completed' THEN 3 ELSE NULL END;

    IF v_new_rank IS NULL OR v_new_rank <= v_old_rank THEN
      RAISE EXCEPTION 'Cannot move appointment status backward from % to %.', v_old_status, p_new_status;
    END IF;

    UPDATE public.appointments SET status = p_new_status::appointment_status, updated_at = now() WHERE id = p_appointment_id;
  END IF;

  IF p_new_status IN ('cancelled', 'no-show') THEN
    SELECT full_name INTO v_doctor_name FROM public.user_profiles WHERE user_id = v_doctor_id;

    INSERT INTO public.notifications (user_id, type, title, body, action_url)
    VALUES (
      v_patient_id,
      'appointment',
      CASE p_new_status
        WHEN 'cancelled' THEN '❌ Appointment Cancelled'
        WHEN 'no-show' THEN '⚠️ Appointment Marked as No-Show'
      END,
      CASE p_new_status
        WHEN 'cancelled' THEN format('Your appointment with %s on %s has been cancelled by the clinic.', coalesce(v_doctor_name, 'your doctor'), to_char(v_scheduled_at, 'FMMonth FMDD, YYYY'))
        WHEN 'no-show' THEN format('Your appointment with %s on %s has been marked as a no-show.', coalesce(v_doctor_name, 'your doctor'), to_char(v_scheduled_at, 'FMMonth FMDD, YYYY'))
      END,
      '/patient/appointments'
    );
  END IF;
END;
$function$;

NOTIFY pgrst, 'reload schema';