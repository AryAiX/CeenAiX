-- QA-222: people could write notifications into other people's inboxes, with any text and link.
--
-- The insert rule "notifications_insert_related_clinic_events" let a signed-in user add a
-- notification (any type, title, body and action_url) for:
--   * any patient with a visit at their clinic, and any doctor who ever had a link to it (even a
--     pending, rejected or removed one): clinic staff -> patients / doctors;
--   * the staff of any clinic they ever had a link to: doctors -> clinic staff;
--   * the staff of any clinic they have a visit at: patients -> clinic staff.
-- The app only uses the last one: the patient booking / rescheduling / cancelling pages tell the
-- clinic's staff, always with type 'appointment' and action_url '/clinic/appointments'.
-- Notifications from clinics to patients and doctors, and to clinics about doctor links, are written
-- by database functions (SECURITY DEFINER), which this rule does not affect.
--
-- Now a user can add a notification:
--   * for themselves (unchanged), or
--   * for an active staff member of a clinic they have a visit at, only as type 'appointment' with
--     action_url '/clinic/appointments', and with a title of at most 200 and a body of at most
--     2,000 characters.
-- ALTER POLICY keeps the rule's name; nothing is dropped. Reading, marking as read and dismissing
-- your own notifications ("users_own_notifications") are unchanged.
-- Follow-up (not done here): write the booking notifications in the database too, so patients do not
-- write into clinic inboxes at all.

ALTER POLICY "notifications_insert_related_clinic_events"
  ON public.notifications
  WITH CHECK (
    user_id = auth.uid()
    OR (
      type = 'appointment'
      AND action_url = '/clinic/appointments'
      AND char_length(title) <= 200
      AND char_length(coalesce(body, '')) <= 2000
      AND EXISTS (
        SELECT 1
        FROM public.appointments a
        JOIN public.clinic_portal_members cpm
          ON cpm.facility_id = a.facility_id
         AND cpm.user_id = notifications.user_id
         AND cpm.is_active = true
        WHERE a.patient_id = auth.uid()
          AND a.is_deleted = false
      )
    )
  );
