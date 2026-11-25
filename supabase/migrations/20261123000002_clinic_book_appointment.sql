-- QA-191: clinic bookings could double-book a doctor and could be half-saved.
--
-- The clinic Appointments and Patients pages inserted the appointment directly and then sent
-- the patient notification as a second, separate call:
--   * the slot was never checked again when saving, so two staff (or a patient and the clinic)
--     could book the same doctor at the same time; the clinic also cannot see the doctor's
--     visits at other clinics, so the slot picker could offer a time that was already taken;
--   * every booking was saved as 30 minutes, whatever the doctor's slot length;
--   * if the notification failed nobody noticed, and its text was English-only, had an emoji,
--     said the doctor (not the clinic) booked it, and showed the raw date.
--
-- This function books in one transaction:
--   * caller must be a clinic admin / manager; the appointment is always at the caller's clinic;
--   * the doctor must be an accepted / active doctor of that clinic, the patient a patient
--     (the same checks as the clinic_create_appointments rule);
--   * the start must be in the future, inside one of the doctor's active working windows for
--     that Dubai weekday, and not in blocked time; the length comes from that window;
--   * no overlap with any open visit of the doctor (scheduled / confirmed / in progress), at any
--     clinic; bookings for the same doctor are serialised with an advisory lock;
--   * the patient and the doctor are notified (English, like the app's other notifications).
-- Returns the new appointment id.
--
-- The direct clinic INSERT rule (clinic_create_appointments) is switched off with ALTER POLICY
-- (no DROP), so this function is the only clinic booking path. Patient and doctor booking rules
-- are unchanged. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.clinic_book_appointment(
  p_doctor_id uuid,
  p_patient_id uuid,
  p_scheduled_at timestamptz,
  p_type text DEFAULT 'in_person',
  p_chief_complaint text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_facility_id uuid := public.current_user_clinic_facility_id();
  v_local timestamp;
  v_time time;
  v_duration integer;
  v_end timestamptz;
  v_id uuid;
  v_clinic_name text;
  v_doctor_name text;
  v_patient_name text;
  v_when text;
BEGIN
  IF auth.uid() IS NULL OR v_facility_id IS NULL OR NOT public.clinic_member_can_manage() THEN
    RAISE EXCEPTION 'Not authorized to book appointments.' USING ERRCODE = '42501';
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('in_person', 'virtual') THEN
    RAISE EXCEPTION 'Unknown appointment type.' USING ERRCODE = '22023';
  END IF;

  IF p_scheduled_at IS NULL OR p_scheduled_at <= now() THEN
    RAISE EXCEPTION 'This time has already passed.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.facility_staff fs
    WHERE fs.facility_id = v_facility_id
      AND fs.doctor_user_id = p_doctor_id
      AND fs.is_active = true
      AND fs.invitation_status IN ('accepted', 'active')
  ) THEN
    RAISE EXCEPTION 'This doctor cannot be booked at this clinic.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = p_patient_id AND up.role = 'patient'
  ) THEN
    RAISE EXCEPTION 'Patient not found.' USING ERRCODE = 'P0002';
  END IF;

  -- One booking at a time per doctor, so two people cannot take the same slot.
  PERFORM pg_advisory_xact_lock(hashtextextended('appointment-doctor:' || p_doctor_id::text, 0));

  v_local := p_scheduled_at AT TIME ZONE 'Asia/Dubai';
  v_time := v_local::time;

  SELECT da.slot_duration_minutes
  INTO v_duration
  FROM public.doctor_availability da
  WHERE da.doctor_id = p_doctor_id
    AND da.is_active = true
    AND da.day_of_week = extract(dow FROM v_local)::integer
    AND da.start_time <= v_time
    AND v_time + make_interval(mins => da.slot_duration_minutes) > v_time -- no wrap past midnight
    AND v_time + make_interval(mins => da.slot_duration_minutes) <= da.end_time
  ORDER BY da.start_time
  LIMIT 1;

  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'This time is outside the doctor''s working hours.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocked_slots bs
    WHERE bs.doctor_id = p_doctor_id
      AND bs.blocked_date = v_local::date
      AND bs.start_time < v_time + make_interval(mins => v_duration)
      AND bs.end_time > v_time
  ) THEN
    RAISE EXCEPTION 'The doctor has blocked this time.' USING ERRCODE = '22023';
  END IF;

  v_end := p_scheduled_at + make_interval(mins => v_duration);

  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.doctor_id = p_doctor_id
      AND a.is_deleted = false
      AND a.status IN ('scheduled', 'confirmed', 'in_progress')
      AND a.scheduled_at < v_end
      AND a.scheduled_at + make_interval(mins => coalesce(a.duration_minutes, 30)) > p_scheduled_at
  ) THEN
    RAISE EXCEPTION 'This time slot is already booked.' USING ERRCODE = '23P01';
  END IF;

  INSERT INTO public.appointments (
    facility_id, doctor_id, patient_id, type, status, scheduled_at, duration_minutes,
    chief_complaint, notes
  )
  VALUES (
    v_facility_id, p_doctor_id, p_patient_id, p_type::public.appointment_type, 'scheduled',
    p_scheduled_at, v_duration,
    coalesce(NULLIF(left(btrim(coalesce(p_chief_complaint, '')), 200), ''), 'Consultation'),
    NULLIF(left(btrim(coalesce(p_notes, '')), 2000), '')
  )
  RETURNING id INTO v_id;

  SELECT NULLIF(btrim(coalesce(f.name_en, f.name)), '') INTO v_clinic_name
  FROM public.facilities f WHERE f.id = v_facility_id;
  SELECT NULLIF(btrim(full_name), '') INTO v_doctor_name
  FROM public.user_profiles WHERE user_id = p_doctor_id;
  SELECT NULLIF(btrim(full_name), '') INTO v_patient_name
  FROM public.user_profiles WHERE user_id = p_patient_id;
  v_when := to_char(v_local, 'DD Mon YYYY "at" HH24:MI');

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    p_patient_id,
    'appointment',
    'New appointment booked',
    'Your appointment'
      || COALESCE(' with ' || v_doctor_name, '')
      || ' on ' || v_when
      || ' has been booked by ' || COALESCE(v_clinic_name, 'the clinic') || '.',
    '/patient/appointments/' || v_id
  );

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    p_doctor_id,
    'appointment',
    'New appointment booked by the clinic',
    COALESCE(v_clinic_name, 'The clinic')
      || ' booked'
      || COALESCE(' ' || v_patient_name, ' a patient')
      || ' with you on ' || v_when || '.',
    '/doctor/appointments/' || v_id
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_book_appointment(uuid, uuid, timestamptz, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_book_appointment(uuid, uuid, timestamptz, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.clinic_book_appointment(uuid, uuid, timestamptz, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.clinic_book_appointment(uuid, uuid, timestamptz, text, text, text) IS
  'QA-191: clinic admin/manager books a patient with a clinic doctor in one transaction: working hours, blocked time and overlap checked, length from the doctor''s slot, patient and doctor notified.';

-- Switch off direct clinic INSERTs on appointments (no DROP; the rule stays, allowing nothing).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'appointments'
      AND policyname = 'clinic_create_appointments'
  ) THEN
    ALTER POLICY "clinic_create_appointments" ON public.appointments
      WITH CHECK (false);
  END IF;
END $$;
