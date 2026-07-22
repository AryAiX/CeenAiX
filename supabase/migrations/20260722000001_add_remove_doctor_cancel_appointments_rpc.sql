CREATE OR REPLACE FUNCTION public.remove_doctor_and_cancel_appointments(
  p_staff_id uuid,
  p_facility_id uuid,
  p_doctor_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_staff public.facility_staff%ROWTYPE;
  v_facility_name text;
  v_appt RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_staff
  FROM public.facility_staff
  WHERE id = p_staff_id
    AND facility_id = p_facility_id
    AND doctor_user_id = p_doctor_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic doctor link not found.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_current_user_super_admin()
    OR (
      p_facility_id = public.current_user_clinic_facility_id()
      AND public.clinic_member_can_manage()
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to remove this doctor.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.facility_staff
  SET is_active = false,
      is_available = false,
      invitation_status = 'removed',
      updated_at = now()
  WHERE id = p_staff_id;

  SELECT COALESCE(name_en, name) INTO v_facility_name
  FROM public.facilities
  WHERE id = p_facility_id;

  FOR v_appt IN
    UPDATE public.appointments
    SET status = 'cancelled',
        updated_at = now(),
        cancellation_reason = COALESCE(p_reason, 'Doctor is no longer with this clinic'),
        cancelled_by_user_id = auth.uid(),
        cancelled_at = now()
    WHERE doctor_id = p_doctor_user_id
      AND facility_id = p_facility_id
      AND is_deleted = false
      AND status IN ('scheduled', 'confirmed')
      AND scheduled_at > now()
    RETURNING id, patient_id, scheduled_at
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, is_read, action_url, created_at, is_deleted)
    VALUES (
      v_appt.patient_id,
      'appointment',
      '❌ Appointment cancelled',
      'Your appointment on ' || to_char(v_appt.scheduled_at, 'FMDay, FMMonth FMDD, YYYY "at" FMHH12:MI AM')
        || ' has been cancelled because your doctor is no longer with ' || COALESCE(v_facility_name, 'this clinic') || '. Please rebook with another doctor.',
      false,
      '/patient/appointments',
      now(),
      false
    );
  END LOOP;

  INSERT INTO public.notifications (user_id, type, title, body, is_read, action_url, created_at, is_deleted)
  VALUES (
    p_doctor_user_id,
    'system',
    '🏥 Removed from clinic',
    'You have been removed from ' || COALESCE(v_facility_name, 'the clinic') || '. Any future appointments you had there have been cancelled and the affected patients notified.',
    false,
    '/doctor/settings',
    now(),
    false
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.remove_doctor_and_cancel_appointments(uuid, uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';