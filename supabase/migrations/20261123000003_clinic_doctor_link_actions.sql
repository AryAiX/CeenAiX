-- QA-199: a clinic could change a doctor's clinic link without the doctor agreeing.
--
-- The rule facility_staff_clinic_manage (FOR ALL) lets clinic admins / managers insert and update
-- any column of any link at their clinic. Through the API a clinic could, for example:
--   * set an 'invited' doctor to 'accepted' + is_active = true without the doctor accepting;
--   * re-activate a doctor who declined, was rejected or was removed;
--   * create a link for any doctor directly as 'accepted'.
-- It is the clinic-side twin of QA-174. Also, the doctor was never told about approvals,
-- rejections, suspensions or removals (only invitations sent a notification, from the browser).
--
-- This migration adds:
--   1. clinic_doctor_link_action(doctor, action): the only way for a clinic to change a link.
--        invite      : no link, or declined / cancelled / removed / rejected -> invited
--        cancel_invite: invited                                 -> cancelled
--        reject      : pending (doctor's join request)          -> rejected
--        suspend     : accepted / active                        -> suspended
--        reactivate  : suspended                                -> accepted
--        remove      : accepted / active / suspended            -> removed
--      Approving a join request stays approve_doctor_and_link_appointments; accepting an
--      invitation stays with the doctor. The doctor is notified of every action
--      (English, like the app's other notifications).
--   2. A guard trigger: a direct API write by anyone other than the doctor themselves or a super
--      admin may not insert a link or change invitation_status, is_active, doctor_user_id or
--      facility_id. Fees and other settings stay editable. SECURITY DEFINER functions (this one,
--      approve_doctor_and_link_appointments, the admin tools) are not affected.
-- No policy is dropped and no data is changed. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.clinic_doctor_link_action(
  p_doctor_user_id uuid,
  p_action text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_facility_id uuid := public.current_user_clinic_facility_id();
  v_link record;
  v_current text;
  v_next text;
  v_active boolean;
  v_clinic_name text;
  v_title text;
  v_body text;
BEGIN
  IF auth.uid() IS NULL OR v_facility_id IS NULL OR NOT public.clinic_member_can_manage() THEN
    RAISE EXCEPTION 'Not authorized to change clinic doctors.' USING ERRCODE = '42501';
  END IF;

  IF p_action IS NULL OR p_action NOT IN ('invite', 'cancel_invite', 'reject', 'suspend', 'reactivate', 'remove') THEN
    RAISE EXCEPTION 'Unknown action.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = p_doctor_user_id AND up.role = 'doctor'
  ) THEN
    RAISE EXCEPTION 'Doctor not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT fs.id, fs.invitation_status
  INTO v_link
  FROM public.facility_staff fs
  WHERE fs.facility_id = v_facility_id
    AND fs.doctor_user_id = p_doctor_user_id
  FOR UPDATE;

  v_current := CASE WHEN FOUND THEN v_link.invitation_status ELSE NULL END;

  v_next := CASE p_action
    WHEN 'invite' THEN
      CASE WHEN v_current IS NULL OR v_current IN ('declined', 'cancelled', 'removed', 'rejected') THEN 'invited' END
    WHEN 'cancel_invite' THEN CASE WHEN v_current = 'invited' THEN 'cancelled' END
    WHEN 'reject'        THEN CASE WHEN v_current = 'pending' THEN 'rejected' END
    WHEN 'suspend'       THEN CASE WHEN v_current IN ('accepted', 'active') THEN 'suspended' END
    WHEN 'reactivate'    THEN CASE WHEN v_current = 'suspended' THEN 'accepted' END
    WHEN 'remove'        THEN CASE WHEN v_current IN ('accepted', 'active', 'suspended') THEN 'removed' END
  END;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'This change is not allowed for this doctor.' USING ERRCODE = '22023';
  END IF;

  v_active := (v_next = 'accepted');

  IF v_current IS NULL THEN
    INSERT INTO public.facility_staff (facility_id, doctor_user_id, invitation_status, is_active, is_available)
    VALUES (v_facility_id, p_doctor_user_id, v_next, false, false);
  ELSE
    UPDATE public.facility_staff
    SET invitation_status = v_next,
        is_active = v_active,
        is_available = v_active,
        updated_at = now()
    WHERE id = v_link.id;
  END IF;

  SELECT coalesce(NULLIF(btrim(coalesce(f.name_en, f.name)), ''), 'A clinic') INTO v_clinic_name
  FROM public.facilities f WHERE f.id = v_facility_id;

  SELECT t.title, t.body INTO v_title, v_body
  FROM (VALUES
    ('invite',        'Clinic invitation',          v_clinic_name || ' has invited you to join the clinic. Review and respond in Settings → My Clinic.'),
    ('cancel_invite', 'Clinic invitation withdrawn', v_clinic_name || ' has withdrawn its invitation.'),
    ('reject',        'Clinic join request declined', v_clinic_name || ' has declined your request to join the clinic.'),
    ('suspend',       'Clinic link suspended',       v_clinic_name || ' has suspended your clinic link. Patients cannot book you at this clinic until it is re-activated.'),
    ('reactivate',    'Clinic link re-activated',    v_clinic_name || ' has re-activated your clinic link.'),
    ('remove',        'Removed from clinic',         v_clinic_name || ' has removed you from its doctors.')
  ) AS t(action, title, body)
  WHERE t.action = p_action;

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (p_doctor_user_id, 'system', v_title, v_body, '/doctor/settings?section=my-clinic');

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_doctor_link_action(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_doctor_link_action(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.clinic_doctor_link_action(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.clinic_doctor_link_action(uuid, text) IS
  'QA-199: clinic admin/manager invites, cancels an invitation, rejects a join request, suspends, re-activates or removes a doctor at their clinic (allowed transitions only); the doctor is notified.';

-- Guard: direct API writes may not create links or change who / where / status / active.
-- Not SECURITY DEFINER on purpose: current_user is 'authenticated' for a direct API call and the
-- function owner inside SECURITY DEFINER functions, which keep working.
CREATE OR REPLACE FUNCTION public.guard_facility_staff_link_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user <> 'authenticated' OR public.is_current_user_super_admin() THEN
    RETURN NEW;
  END IF;

  -- The doctor's own link is governed by the doctor rules (QA-174).
  IF NEW.doctor_user_id = auth.uid() AND (TG_OP = 'INSERT' OR OLD.doctor_user_id = auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Use clinic_doctor_link_action to invite a doctor.' USING ERRCODE = '42501';
  END IF;

  IF NEW.invitation_status IS DISTINCT FROM OLD.invitation_status
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.doctor_user_id IS DISTINCT FROM OLD.doctor_user_id
     OR NEW.facility_id IS DISTINCT FROM OLD.facility_id THEN
    RAISE EXCEPTION 'Use clinic_doctor_link_action to change a doctor''s clinic status.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_guard_facility_staff_link_changes
  BEFORE INSERT OR UPDATE ON public.facility_staff
  FOR EACH ROW EXECUTE FUNCTION public.guard_facility_staff_link_changes();
