-- QA-190: clinic staff could set any appointment status at any time.
--
-- The clinic Appointments page updated appointments.status directly, and the two clinic UPDATE
-- rules (appointments_clinic_manager_update, clinic_update_appointment_facility) allowed any
-- change to any column of any appointment at the clinic. Staff could complete a cancelled visit,
-- mark next week's visit as a no-show, move a completed visit back to scheduled, or cancel
-- without a reason and without telling the patient.
--
-- Rules (Option A, needs Tooraj's OK):
--   * Confirm  : scheduled -> confirmed, before the start time.
--   * Cancel   : scheduled / confirmed -> cancelled, before the start time, optional reason
--                (trimmed, max 500 characters); the patient and the doctor are notified.
--   * No-show  : scheduled / confirmed -> no_show, once the start time has passed.
--   * In progress / Completed stay with the doctor (they record that the visit happened).
--   * Completed, cancelled and no-show are final for the clinic.
-- Only clinic admins / managers of the appointment's own clinic may call it (same people the
-- old UPDATE rules allowed).
--
-- Direct clinic UPDATEs on appointments are switched off with ALTER POLICY instead of DROP
-- (clinic_update_appointment_facility allows nothing; appointments_clinic_manager_update keeps
-- only its super admin part), so this function is the only clinic path. Nothing else in the
-- clinic portal updates appointments directly; approve_doctor_and_link_appointments is
-- SECURITY DEFINER and is not affected. Doctor, patient and admin rules are unchanged.
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.clinic_set_appointment_status(
  p_appointment_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_facility_id uuid := public.current_user_clinic_facility_id();
  v_reason text := NULLIF(left(btrim(coalesce(p_reason, '')), 500), '');
  v_appt record;
  v_allowed boolean;
  v_clinic_name text;
  v_doctor_name text;
  v_patient_name text;
  v_when text;
BEGIN
  IF auth.uid() IS NULL OR v_facility_id IS NULL OR NOT public.clinic_member_can_manage() THEN
    RAISE EXCEPTION 'Not authorized to change this appointment.' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('confirmed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'This status change is not allowed.' USING ERRCODE = '22023';
  END IF;

  SELECT a.id, a.patient_id, a.doctor_id, a.scheduled_at, a.status::text AS status
  INTO v_appt
  FROM public.appointments a
  WHERE a.id = p_appointment_id
    AND a.facility_id = v_facility_id
    AND a.is_deleted = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found.' USING ERRCODE = 'P0002';
  END IF;

  v_allowed := CASE p_status
    WHEN 'confirmed' THEN v_appt.status = 'scheduled' AND v_appt.scheduled_at > now()
    WHEN 'cancelled' THEN v_appt.status IN ('scheduled', 'confirmed') AND v_appt.scheduled_at > now()
    WHEN 'no_show'   THEN v_appt.status IN ('scheduled', 'confirmed') AND v_appt.scheduled_at <= now()
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'This status change is not allowed.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.appointments
  SET status = p_status::public.appointment_status,
      cancellation_reason = CASE WHEN p_status = 'cancelled' THEN v_reason ELSE cancellation_reason END,
      updated_at = now()
  WHERE id = v_appt.id;

  IF p_status = 'cancelled' THEN
    SELECT NULLIF(btrim(coalesce(f.name_en, f.name)), '') INTO v_clinic_name
    FROM public.facilities f WHERE f.id = v_facility_id;
    SELECT NULLIF(btrim(full_name), '') INTO v_doctor_name
    FROM public.user_profiles WHERE user_id = v_appt.doctor_id;
    SELECT NULLIF(btrim(full_name), '') INTO v_patient_name
    FROM public.user_profiles WHERE user_id = v_appt.patient_id;
    v_when := to_char(v_appt.scheduled_at AT TIME ZONE 'Asia/Dubai', 'DD Mon YYYY "at" HH24:MI');

    INSERT INTO public.notifications (user_id, type, title, body, action_url)
    VALUES (
      v_appt.patient_id,
      'appointment',
      'Appointment cancelled',
      'Your appointment'
        || COALESCE(' with ' || v_doctor_name, '')
        || ' on ' || v_when
        || ' has been cancelled by ' || COALESCE(v_clinic_name, 'the clinic') || '.'
        || COALESCE(' Reason: ' || v_reason, ''),
      '/patient/appointments/' || v_appt.id
    );

    INSERT INTO public.notifications (user_id, type, title, body, action_url)
    VALUES (
      v_appt.doctor_id,
      'appointment',
      'Appointment cancelled by the clinic',
      'Your appointment'
        || COALESCE(' with ' || v_patient_name, '')
        || ' on ' || v_when
        || ' was cancelled by ' || COALESCE(v_clinic_name, 'the clinic') || '.'
        || COALESCE(' Reason: ' || v_reason, ''),
      '/doctor/appointments/' || v_appt.id
    );
  END IF;

  RETURN p_status;
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_set_appointment_status(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_set_appointment_status(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.clinic_set_appointment_status(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.clinic_set_appointment_status(uuid, text, text) IS
  'QA-190: clinic admin/manager confirms (before start), cancels (before start, optional reason, patient and doctor notified) or marks no-show (after start) an appointment at their own clinic.';

-- Switch off direct clinic UPDATEs on appointments (no DROP).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'appointments'
      AND policyname = 'appointments_clinic_manager_update'
  ) THEN
    -- Super admin keeps the update right it had through this rule; the clinic part is removed.
    ALTER POLICY "appointments_clinic_manager_update" ON public.appointments
      USING (public.is_current_user_super_admin())
      WITH CHECK (public.is_current_user_super_admin());
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'appointments'
      AND policyname = 'clinic_update_appointment_facility'
  ) THEN
    ALTER POLICY "clinic_update_appointment_facility" ON public.appointments
      USING (false) WITH CHECK (false);
  END IF;
END $$;
