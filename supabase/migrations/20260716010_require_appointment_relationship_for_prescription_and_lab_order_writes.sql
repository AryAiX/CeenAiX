ALTER POLICY doctors_own_prescriptions ON prescriptions
WITH CHECK (
  auth.uid() = doctor_id
  AND EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.doctor_id = auth.uid()
    AND appointments.patient_id = prescriptions.patient_id
    AND appointments.is_deleted = false
  )
);

ALTER POLICY doctors_own_lab_orders ON lab_orders
WITH CHECK (
  auth.uid() = doctor_id
  AND EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.doctor_id = auth.uid()
    AND appointments.patient_id = lab_orders.patient_id
    AND appointments.is_deleted = false
  )
);