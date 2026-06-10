-- Allow clinic users to read profiles of doctors linked to their facility
CREATE POLICY "clinic_read_facility_staff_profiles"
ON user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM clinic_portal_members cpm
    JOIN facility_staff fs ON fs.facility_id = cpm.facility_id
    WHERE cpm.user_id = auth.uid()
    AND cpm.is_active = true
    AND fs.doctor_user_id = user_profiles.user_id
  )
);