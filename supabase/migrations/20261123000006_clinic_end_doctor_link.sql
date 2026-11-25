-- QA-203: removing or suspending a doctor left their upcoming visits at the clinic booked.
--
-- Patients kept appointments with a doctor who no longer works at the clinic (or is suspended),
-- nobody told them, and nothing warned the clinic.
--
-- clinic_end_doctor_link(doctor, action, cancel_future_visits) does it in one transaction:
--   * action 'suspend' or 'remove' (same rules as clinic_doctor_link_action, QA-199, which it calls);
--   * when cancel_future_visits is true, the doctor's open visits at this clinic that have not
--     started yet (scheduled / confirmed) are cancelled with a reason, and each patient is notified
--     (same wording style as the clinic cancel, QA-190);
--   * when false, the visits stay booked (the clinic saw the list and chose to keep them).
-- Returns the new link status and how many visits were cancelled. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.clinic_end_doctor_link(
  p_doctor_user_id uuid,
  p_action text,
  p_cancel_future_visits boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_facility_id uuid := public.current_user_clinic_facility_id();
  v_reason constant text := 'The doctor is no longer available at this clinic.';
  v_status text;
  v_cancelled integer := 0;
  v_clinic_name text;
  v_doctor_name text;
BEGIN
  IF auth.uid() IS NULL OR v_facility_id IS NULL OR NOT public.clinic_member_can_manage() THEN
    RAISE EXCEPTION 'Not authorized to change clinic doctors.' USING ERRCODE = '42501';
  END IF;

  IF p_action IS NULL OR p_action NOT IN ('suspend', 'remove') OR p_cancel_future_visits IS NULL THEN
    RAISE EXCEPTION 'Unknown action.' USING ERRCODE = '22023';
  END IF;

  -- Checks the doctor and the allowed status change, updates the link and notifies the doctor.
  v_status := public.clinic_doctor_link_action(p_doctor_user_id, p_action);

  IF p_cancel_future_visits THEN
    SELECT coalesce(NULLIF(btrim(coalesce(f.name_en, f.name)), ''), 'the clinic') INTO v_clinic_name
    FROM public.facilities f WHERE f.id = v_facility_id;
    SELECT NULLIF(btrim(full_name), '') INTO v_doctor_name
    FROM public.user_profiles WHERE user_id = p_doctor_user_id;

    WITH cancelled AS (
      UPDATE public.appointments a
      SET status = 'cancelled',
          cancellation_reason = v_reason,
          updated_at = now()
      WHERE a.facility_id = v_facility_id
        AND a.doctor_id = p_doctor_user_id
        AND a.is_deleted = false
        AND a.status IN ('scheduled', 'confirmed')
        AND a.scheduled_at > now()
      RETURNING a.id, a.patient_id, a.scheduled_at
    ), notified AS (
      INSERT INTO public.notifications (user_id, type, title, body, action_url)
      SELECT
        c.patient_id,
        'appointment',
        'Appointment cancelled',
        'Your appointment'
          || COALESCE(' with ' || v_doctor_name, '')
          || ' on ' || to_char(c.scheduled_at AT TIME ZONE 'Asia/Dubai', 'DD Mon YYYY "at" HH24:MI')
          || ' has been cancelled by ' || v_clinic_name || '. Reason: ' || v_reason,
        '/patient/appointments/' || c.id
      FROM cancelled c
      RETURNING 1
    )
    SELECT count(*) INTO v_cancelled FROM notified;
  END IF;

  RETURN jsonb_build_object('status', v_status, 'cancelled_visits', v_cancelled);
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_end_doctor_link(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_end_doctor_link(uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.clinic_end_doctor_link(uuid, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.clinic_end_doctor_link(uuid, text, boolean) IS
  'QA-203: clinic suspends or removes a doctor and, if asked, cancels the doctor''s upcoming visits at the clinic and notifies each patient, in one transaction.';
