CREATE POLICY "clinic_update_appointment_facility"
ON appointments FOR UPDATE
USING (
  facility_id IN (
    SELECT facility_id FROM clinic_portal_members
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR facility_id IS NULL
)
WITH CHECK (
  facility_id IN (
    SELECT facility_id FROM clinic_portal_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);