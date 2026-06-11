-- Allow doctor to insert their own join request
CREATE POLICY "doctor_insert_own_facility_request"
ON facility_staff FOR INSERT
WITH CHECK (doctor_user_id = auth.uid());

-- Allow doctor to update their own record
CREATE POLICY "doctor_update_own_facility_request"
ON facility_staff FOR UPDATE
USING (doctor_user_id = auth.uid());