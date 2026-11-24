-- QA-123: when a doctor cancels an appointment, tell the patient.
--
-- Until now cancel_doctor_appointment(uuid) only set status = 'cancelled'. Nothing notified
-- the patient in production, although the doctor portal said it would. (Dev also has a
-- leftover cancel_doctor_appointment(uuid, text DEFAULT NULL) from the July work that does
-- notify; it was never in a migration on main.)
--
-- This adds a NEW function, following the cancel_patient_appointment_with_reason pattern
-- (20261110000001 / 20261110000002), instead of changing the old one:
--   * no DROP is needed;
--   * no overload clash: on production, adding a (uuid, text DEFAULT NULL) version of the
--     old name next to the existing (uuid) one would make the one-argument call ambiguous;
--   * both old versions stay untouched until nothing calls them.
--
-- Same rules as before (own appointment, scheduled or confirmed, still in the future), plus:
--   * an optional reason, trimmed, at most 500 characters, blank stored as NULL;
--   * an 'appointment' notification to the patient, linking to the appointment.
-- Safe to run more than once (CREATE OR REPLACE; REVOKE / GRANT are idempotent).

CREATE OR REPLACE FUNCTION public.cancel_doctor_appointment_with_reason(
  p_appointment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text := NULLIF(left(btrim(coalesce(p_reason, '')), 500), '');
  v_patient_id uuid;
  v_doctor_id uuid;
  v_scheduled_at timestamptz;
  v_doctor_name text;
BEGIN
  UPDATE public.appointments
  SET status = 'cancelled',
      cancellation_reason = v_reason,
      updated_at = now()
  WHERE id = p_appointment_id
    AND doctor_id = auth.uid()
    AND is_deleted = false
    AND status IN ('scheduled', 'confirmed')
    AND scheduled_at > now()
  RETURNING patient_id, doctor_id, scheduled_at
  INTO v_patient_id, v_doctor_id, v_scheduled_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment could not be cancelled.';
  END IF;

  SELECT NULLIF(btrim(full_name), '')
  INTO v_doctor_name
  FROM public.user_profiles
  WHERE user_id = v_doctor_id;

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    v_patient_id,
    'appointment',
    'Appointment cancelled',
    'Your appointment'
      || COALESCE(' with ' || v_doctor_name, '')
      || ' on ' || to_char(v_scheduled_at AT TIME ZONE 'Asia/Dubai', 'DD Mon YYYY "at" HH24:MI')
      || ' has been cancelled by your doctor.'
      || COALESCE(' Reason: ' || v_reason, ''),
    '/patient/appointments/' || p_appointment_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_doctor_appointment_with_reason(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_doctor_appointment_with_reason(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_doctor_appointment_with_reason(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.cancel_doctor_appointment_with_reason(uuid, text) IS
  'Doctor cancels their own future scheduled/confirmed appointment, with an optional reason (max 500 chars), and the patient is notified.';
