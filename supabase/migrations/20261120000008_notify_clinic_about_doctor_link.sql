-- QA-175: clinics were never told when a doctor asked to join, accepted or declined.
--
-- The doctor Settings page tried to notify the clinic's staff itself: it read
-- clinic_portal_members (a doctor may only read their own membership rows, so it got nothing)
-- and inserted notifications for other users (the notifications rule only allows a user's own
-- rows). Both failed silently, so join requests, accepts and declines never reached the clinic.
--
-- This function does it on the server, for one clinic link of the calling doctor:
--   * it only works on the caller's own facility_staff row;
--   * the message comes from the link's CURRENT status (pending = join request,
--     accepted / active = joined, declined = declined), not from anything the caller sends;
--   * it notifies the clinic's active portal members;
--   * the same message is not sent twice within 10 minutes (no spamming by repeated calls).
-- Returns how many notifications were created. Messages are English, like the rest of the
-- app's notifications today (logged for Tooraj).

CREATE OR REPLACE FUNCTION public.notify_clinic_about_doctor_link(p_staff_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_doctor_id uuid := auth.uid();
  v_link record;
  v_doctor_name text;
  v_title text;
  v_body text;
  v_count integer;
BEGIN
  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT fs.id, fs.facility_id, fs.invitation_status::text AS status
  INTO v_link
  FROM public.facility_staff fs
  WHERE fs.id = p_staff_id
    AND fs.doctor_user_id = v_doctor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic link not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(nullif(btrim(up.full_name), ''), 'A doctor')
  INTO v_doctor_name
  FROM public.user_profiles up
  WHERE up.user_id = v_doctor_id;
  v_doctor_name := coalesce(v_doctor_name, 'A doctor');

  IF v_link.status = 'pending' THEN
    v_title := 'New doctor join request';
    v_body := v_doctor_name || ' has asked to join your clinic. Review the request in Doctors.';
  ELSIF v_link.status IN ('accepted', 'active') THEN
    v_title := 'Doctor accepted your invitation';
    v_body := v_doctor_name || ' has accepted your invitation and joined your clinic.';
  ELSIF v_link.status = 'declined' THEN
    v_title := 'Doctor declined your invitation';
    v_body := v_doctor_name || ' has declined or withdrawn from joining your clinic.';
  ELSE
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  SELECT m.user_id, 'system', v_title, v_body, '/clinic/doctors'
  FROM public.clinic_portal_members m
  WHERE m.facility_id = v_link.facility_id
    AND m.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = m.user_id
        AND n.title = v_title
        AND n.body = v_body
        AND n.created_at > now() - interval '10 minutes'
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_clinic_about_doctor_link(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_clinic_about_doctor_link(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.notify_clinic_about_doctor_link(uuid) TO authenticated;

COMMENT ON FUNCTION public.notify_clinic_about_doctor_link(uuid) IS
  'QA-175: notifies a clinic''s active portal members about the calling doctor''s own clinic link (join request / accepted / declined), based on the link''s current status.';
