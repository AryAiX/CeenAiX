CREATE POLICY "authenticated_read_active_clinic_members"
ON clinic_portal_members FOR SELECT
USING (
  is_active = true
  AND auth.role() = 'authenticated'
);