CREATE POLICY "authenticated_read_active_staff_links"
ON facility_staff FOR SELECT
USING (
  invitation_status = 'accepted' AND is_active = true
  AND auth.role() = 'authenticated'
);