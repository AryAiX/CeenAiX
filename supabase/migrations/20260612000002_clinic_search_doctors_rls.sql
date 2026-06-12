CREATE POLICY "clinic_search_doctors"
ON user_profiles FOR SELECT
USING (
  role = 'doctor'
  AND EXISTS (
    SELECT 1 FROM clinic_portal_members cpm
    WHERE cpm.user_id = auth.uid() AND cpm.is_active = true
  )
);