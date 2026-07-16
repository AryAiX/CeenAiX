ALTER POLICY patients_read_notes ON consultation_notes
USING (
  (NOT is_deleted)
  AND doctor_approved
  AND EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = consultation_notes.appointment_id
    AND appointments.patient_id = auth.uid()
  )
);