-- Safe expansion for the PR #80 clinic portal port.
-- This intentionally omits demo data, hardcoded facility backfills, invoices,
-- and broad authenticated-user read policies from the original PR.

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_notifications_user_not_deleted
  ON public.notifications(user_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_not_deleted
  ON public.messages(conversation_id, sent_at)
  WHERE is_deleted = false;

DROP POLICY IF EXISTS "senders_soft_delete_own_messages" ON public.messages;
CREATE POLICY "senders_soft_delete_own_messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.created_by = auth.uid()
          OR c.participant_ids ? auth.uid()::text
        )
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.created_by = auth.uid()
          OR c.participant_ids ? auth.uid()::text
        )
    )
  );

ALTER TABLE public.facility_staff
  DROP CONSTRAINT IF EXISTS facility_staff_invitation_status_chk;

ALTER TABLE public.facility_staff
  ADD CONSTRAINT facility_staff_invitation_status_chk CHECK (
    invitation_status IN (
      'pending',
      'accepted',
      'active',
      'suspended',
      'rejected',
      'removed',
      'invited',
      'cancelled',
      'declined'
    )
  );

ALTER TABLE public.clinic_doctor_invitations
  DROP CONSTRAINT IF EXISTS clinic_doctor_invitations_status_chk;

ALTER TABLE public.clinic_doctor_invitations
  ADD CONSTRAINT clinic_doctor_invitations_status_chk CHECK (
    status IN ('pending', 'accepted', 'cancelled', 'rejected', 'declined')
  );

DROP POLICY IF EXISTS "facilities_public_read_active" ON public.facilities;
CREATE POLICY "facilities_public_read_active"
  ON public.facilities
  FOR SELECT
  TO anon, authenticated
  USING (
    facility_type = 'clinic'
    AND is_active = true
    AND is_deleted = false
  );

DROP POLICY IF EXISTS "doctor_insert_own_facility_request" ON public.facility_staff;
DROP POLICY IF EXISTS "doctor_update_own_facility_request" ON public.facility_staff;

CREATE POLICY "doctor_insert_own_facility_request"
  ON public.facility_staff
  FOR INSERT
  TO authenticated
  WITH CHECK (
    doctor_user_id = auth.uid()
    AND invitation_status = 'pending'
    AND is_active = false
    AND is_available = false
    AND EXISTS (
      SELECT 1
      FROM public.facilities f
      WHERE f.id = facility_id
        AND f.facility_type = 'clinic'
        AND f.is_active = true
        AND f.is_deleted = false
    )
  );

CREATE POLICY "doctor_update_own_facility_request"
  ON public.facility_staff
  FOR UPDATE
  TO authenticated
  USING (
    doctor_user_id = auth.uid()
    AND invitation_status IN ('pending', 'invited', 'accepted', 'declined')
  )
  WITH CHECK (
    doctor_user_id = auth.uid()
    AND invitation_status IN ('accepted', 'declined')
  );

DROP POLICY IF EXISTS "clinic_search_patients" ON public.user_profiles;
DROP POLICY IF EXISTS "clinic_search_doctors" ON public.user_profiles;
DROP POLICY IF EXISTS "clinic_member_read_linked_patient_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "clinic_member_read_doctor_profiles" ON public.user_profiles;

CREATE POLICY "clinic_member_read_linked_patient_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'patient'
    AND EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.patient_id = user_profiles.user_id
        AND a.facility_id = public.current_user_clinic_facility_id()
        AND a.is_deleted = false
    )
  );

CREATE POLICY "clinic_member_read_doctor_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'doctor'
    AND public.clinic_member_can_manage()
  );

DROP POLICY IF EXISTS "patient_read_active_doctor_facility_links" ON public.facility_staff;
CREATE POLICY "patient_read_active_doctor_facility_links"
  ON public.facility_staff
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND invitation_status = 'accepted'
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'patient'
    )
  );

DROP POLICY IF EXISTS "clinic_member_doctor_read_active_members" ON public.clinic_portal_members;
DROP POLICY IF EXISTS "patient_read_appointment_clinic_members" ON public.clinic_portal_members;

CREATE POLICY "clinic_member_doctor_read_active_members"
  ON public.clinic_portal_members
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.facility_staff fs
      WHERE fs.facility_id = clinic_portal_members.facility_id
        AND fs.doctor_user_id = auth.uid()
        AND fs.invitation_status IN ('pending', 'invited', 'accepted', 'active')
    )
  );

CREATE POLICY "patient_read_appointment_clinic_members"
  ON public.clinic_portal_members
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.facility_id = clinic_portal_members.facility_id
        AND a.patient_id = auth.uid()
        AND a.is_deleted = false
    )
  );

DROP POLICY IF EXISTS "clinic_create_appointments" ON public.appointments;
CREATE POLICY "clinic_create_appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    facility_id = public.current_user_clinic_facility_id()
    AND public.clinic_member_can_manage()
    AND EXISTS (
      SELECT 1
      FROM public.facility_staff fs
      WHERE fs.facility_id = appointments.facility_id
        AND fs.doctor_user_id = appointments.doctor_id
        AND fs.is_active = true
        AND fs.invitation_status IN ('accepted', 'active')
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = appointments.patient_id
        AND up.role = 'patient'
    )
  );

DROP POLICY IF EXISTS "clinic_update_appointment_facility" ON public.appointments;
CREATE POLICY "clinic_update_appointment_facility"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    facility_id = public.current_user_clinic_facility_id()
    AND public.clinic_member_can_manage()
  )
  WITH CHECK (
    facility_id = public.current_user_clinic_facility_id()
    AND public.clinic_member_can_manage()
  );

DROP POLICY IF EXISTS "notifications_insert_related_clinic_events" ON public.notifications;
CREATE POLICY "notifications_insert_related_clinic_events"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.facility_staff fs
      WHERE fs.facility_id = public.current_user_clinic_facility_id()
        AND fs.doctor_user_id = notifications.user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.facility_id = public.current_user_clinic_facility_id()
        AND a.patient_id = notifications.user_id
        AND a.is_deleted = false
    )
    OR EXISTS (
      SELECT 1
      FROM public.facility_staff fs
      JOIN public.clinic_portal_members cpm
        ON cpm.facility_id = fs.facility_id
       AND cpm.user_id = notifications.user_id
       AND cpm.is_active = true
      WHERE fs.doctor_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.appointments a
      JOIN public.clinic_portal_members cpm
        ON cpm.facility_id = a.facility_id
       AND cpm.user_id = notifications.user_id
       AND cpm.is_active = true
      WHERE a.patient_id = auth.uid()
        AND a.is_deleted = false
    )
  );

CREATE OR REPLACE FUNCTION public.approve_doctor_and_link_appointments(
  p_staff_id uuid,
  p_facility_id uuid,
  p_doctor_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff public.facility_staff%ROWTYPE;
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

  IF NOT (
    public.is_current_user_super_admin()
    OR (
      p_facility_id = public.current_user_clinic_facility_id()
      AND public.clinic_member_can_manage()
    )
    OR (
      p_doctor_user_id = auth.uid()
      AND v_staff.invitation_status = 'invited'
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve this clinic doctor link.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.facility_staff
  SET
    is_active = true,
    is_available = true,
    invitation_status = 'accepted',
    updated_at = now()
  WHERE id = p_staff_id;

  UPDATE public.appointments
  SET
    facility_id = p_facility_id,
    updated_at = now()
  WHERE doctor_id = p_doctor_user_id
    AND facility_id IS NULL
    AND is_deleted = false
    AND scheduled_at >= v_staff.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_doctor_and_link_appointments(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_doctor_and_link_appointments(uuid, uuid, uuid) TO authenticated;
