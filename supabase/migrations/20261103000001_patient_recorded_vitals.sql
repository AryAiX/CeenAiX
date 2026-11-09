-- Let patients record their own blood pressure from the patient portal.
--
-- patient_vitals previously allowed patients to read their own rows and
-- doctors to write rows for patients they have an appointment with. There was
-- no way for a patient to add a reading, so the portal's "Add Reading" control
-- had nowhere to write.
--
-- This policy is deliberately narrow. A patient may only insert a row that is
-- about themselves, is attributed to themselves, is not tied to a clinical
-- appointment, and carries a plausible blood pressure pair. Everything else a
-- clinician can record stays clinician-only.
--
-- Patient-entered readings are identified by recorded_by = patient_id, so a
-- clinician can always tell a home reading from one taken in clinic. The
-- source column is left as 'manual' because its CHECK constraint allows only
-- manual, device or imported.

DROP POLICY IF EXISTS "patients_insert_own_vitals" ON public.patient_vitals;
CREATE POLICY "patients_insert_own_vitals"
  ON public.patient_vitals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = auth.uid()
    AND recorded_by = auth.uid()
    AND appointment_id IS NULL
    AND source = 'manual'
    AND is_deleted = false
    AND systolic_bp IS NOT NULL
    AND diastolic_bp IS NOT NULL
    AND systolic_bp BETWEEN 70 AND 250
    AND diastolic_bp BETWEEN 40 AND 150
    AND diastolic_bp < systolic_bp
    AND heart_rate IS NULL
    AND temperature_c IS NULL
    AND spo2_percent IS NULL
    AND weight_kg IS NULL
    AND height_cm IS NULL
    AND bmi IS NULL
  );

GRANT INSERT ON public.patient_vitals TO authenticated;
