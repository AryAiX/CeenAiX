CREATE POLICY "clinic_create_appointments"
ON appointments FOR INSERT
WITH CHECK (
  is_current_user_super_admin() OR
  (facility_id = current_user_clinic_facility_id() AND clinic_member_can_manage())
);