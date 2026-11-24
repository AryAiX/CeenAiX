-- QA-174: a doctor could approve their own clinic join request.
--
-- The rule "doctor_update_own_facility_request" on facility_staff let a doctor update their own
-- clinic link while it was 'pending', 'invited', 'accepted' or 'declined', to 'accepted' or
-- 'declined', with no limit on is_active. So through the API a doctor could:
--   * turn their own 'pending' join request into 'accepted' + is_active = true, without the
--     clinic approving it;
--   * accept an invitation directly, skipping approve_doctor_and_link_appointments (which checks
--     the invitation and links the appointments);
--   * re-activate a link they had declined.
--
-- New rule: a doctor may only DECLINE (or withdraw / leave) their own link, and a declined link
-- is always inactive. Accepting an invitation goes through approve_doctor_and_link_appointments
-- (SECURITY DEFINER, unchanged), and approving a join request stays with the clinic.
-- ALTER POLICY keeps the same rule name; nothing is dropped and no data is changed.

ALTER POLICY "doctor_update_own_facility_request"
  ON public.facility_staff
  USING (
    doctor_user_id = auth.uid()
    AND invitation_status IN ('pending', 'invited', 'accepted')
  )
  WITH CHECK (
    doctor_user_id = auth.uid()
    AND invitation_status = 'declined'
    AND is_active = false
    AND is_available = false
  );
