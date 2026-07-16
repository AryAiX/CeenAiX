CREATE OR REPLACE FUNCTION public.cancel_doctor_appointment(p_appointment_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_patient_id uuid;
  v_scheduled_at timestamptz;
  v_doctor_name text;
BEGIN
  UPDATE public.appointments
  SET status = 'cancelled',
      updated_at = now(),
      cancellation_reason = p_reason,
      cancelled_by_user_id = auth.uid(),
      cancelled_at = now()
  WHERE id = p_appointment_id
    AND doctor_id = auth.uid()
    AND is_deleted = false
    AND status IN ('scheduled', 'confirmed')
    AND scheduled_at > now()
  RETURNING patient_id, scheduled_at INTO v_patient_id, v_scheduled_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment could not be cancelled.';
  END IF;

  SELECT full_name INTO v_doctor_name FROM public.user_profiles WHERE user_id = auth.uid();

  INSERT INTO public.notifications (user_id, type, title, body, is_read, action_url, created_at, is_deleted)
  VALUES (
    v_patient_id,
    'appointment',
    '❌ Appointment cancelled',
    'Your appointment with ' || COALESCE(v_doctor_name, 'your doctor')
      || ' on ' || to_char(v_scheduled_at, 'FMDay, FMMonth FMDD, YYYY "at" FMHH12:MI AM')
      || ' has been cancelled by the doctor.'
      || CASE WHEN p_reason IS NOT NULL AND p_reason <> '' THEN ' Reason: ' || p_reason ELSE '' END,
    false,
    '/patient/appointments',
    now(),
    false
  );
END;
$function$;