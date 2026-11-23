-- QA-200: approving a doctor moved unrelated visits into the clinic, and the approval function
-- accepted a link whatever its status.
--
-- approve_doctor_and_link_appointments (20260614093000) did two more things than approve:
--   * it set facility_id on EVERY visit of the doctor that had no clinic and was newer than the
--     link row. Those can be the doctor's own private visits, or bookings with a doctor who works
--     at two clinics (the patient booking saves no clinic then). The approving clinic could then
--     see those patients' names, phone numbers and visits.
--   * it did not check the link's status: a clinic admin / manager could "approve" an invited
--     doctor who had not accepted, or a doctor who declined, was rejected, removed or cancelled.
--     (QA-199's guard does not cover it, because this is a SECURITY DEFINER function.)
--
-- New version (same name and arguments, CREATE OR REPLACE):
--   * clinic admin / manager of the link's clinic: only a 'pending' join request;
--   * the doctor: only their own 'invited' link (accepting an invitation);
--   * super admin: 'pending' or 'invited';
--   * no visits are moved; new bookings already carry the clinic (QA-191);
--   * when the clinic approves, the doctor is notified (when the doctor accepts, the clinic is
--     notified by notify_clinic_about_doctor_link, QA-175).
-- Visits that were already moved are not changed back here (open question for Tooraj).
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.approve_doctor_and_link_appointments(
  p_staff_id uuid,
  p_facility_id uuid,
  p_doctor_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_staff public.facility_staff%ROWTYPE;
  v_is_admin boolean := public.is_current_user_super_admin();
  v_is_clinic boolean;
  v_is_doctor boolean;
  v_clinic_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '28000';
  END IF;

  SELECT *
  INTO v_staff
  FROM public.facility_staff
  WHERE id = p_staff_id
    AND facility_id = p_facility_id
    AND doctor_user_id = p_doctor_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic doctor link not found.' USING ERRCODE = 'P0002';
  END IF;

  v_is_clinic := p_facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_can_manage();
  v_is_doctor := p_doctor_user_id = auth.uid();

  IF NOT (v_is_admin OR v_is_clinic OR v_is_doctor) THEN
    RAISE EXCEPTION 'Not authorized to approve this clinic doctor link.' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    (v_is_admin AND v_staff.invitation_status IN ('pending', 'invited'))
    OR (v_is_clinic AND v_staff.invitation_status = 'pending')
    OR (v_is_doctor AND v_staff.invitation_status = 'invited')
  ) THEN
    RAISE EXCEPTION 'This clinic link cannot be approved in its current state.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.facility_staff
  SET
    is_active = true,
    is_available = true,
    invitation_status = 'accepted',
    updated_at = now()
  WHERE id = p_staff_id;

  -- QA-200: visits are no longer moved into the clinic here.

  IF NOT v_is_doctor THEN
    SELECT coalesce(NULLIF(btrim(coalesce(f.name_en, f.name)), ''), 'The clinic') INTO v_clinic_name
    FROM public.facilities f WHERE f.id = p_facility_id;

    INSERT INTO public.notifications (user_id, type, title, body, action_url)
    VALUES (
      p_doctor_user_id,
      'system',
      'Clinic join request approved',
      v_clinic_name || ' has approved your request to join the clinic.',
      '/doctor/settings?section=my-clinic'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_doctor_and_link_appointments(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_doctor_and_link_appointments(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_doctor_and_link_appointments(uuid, uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.approve_doctor_and_link_appointments(uuid, uuid, uuid) IS
  'QA-200: clinic approves a pending join request, or the doctor accepts their own invitation (super admin: either). Visits are not moved. The doctor is notified when the clinic approves.';
