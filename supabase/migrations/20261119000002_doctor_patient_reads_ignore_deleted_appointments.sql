-- QA-133: a deleted appointment still let the doctor read the patient's record.
--
-- The doctor read rules on user_profiles, patient_profiles, medical_conditions,
-- allergies and vaccinations allow access when ANY appointment links the doctor
-- and the patient, including appointments marked is_deleted. Everywhere else
-- (the doctor's own appointment and patient lists, the record-update and
-- reported-medication rules, and the messaging care rule from QA-073) a deleted
-- appointment no longer counts. So after an appointment was removed, the patient
-- disappeared from the doctor's lists but the full chart still opened from an
-- old link.
--
-- Each rule now also requires the appointment to be not deleted. Nothing else
-- changes: same policy names, same tables, same roles, SELECT only.
-- ALTER POLICY keeps the existing policies in place (no DROP).

ALTER POLICY "doctors_read_patient_profiles" ON public.user_profiles
  USING (
    EXISTS (
      SELECT 1
      FROM public.appointments
      WHERE appointments.doctor_id = auth.uid()
        AND appointments.patient_id = user_profiles.user_id
        AND NOT appointments.is_deleted
    )
  );

ALTER POLICY "doctors_read_patient_profiles_ext" ON public.patient_profiles
  USING (
    EXISTS (
      SELECT 1
      FROM public.appointments
      WHERE appointments.doctor_id = auth.uid()
        AND appointments.patient_id = patient_profiles.user_id
        AND NOT appointments.is_deleted
    )
  );

ALTER POLICY "doctors_read_conditions" ON public.medical_conditions
  USING (
    NOT is_deleted
    AND EXISTS (
      SELECT 1
      FROM public.appointments
      WHERE appointments.doctor_id = auth.uid()
        AND appointments.patient_id = medical_conditions.patient_id
        AND NOT appointments.is_deleted
    )
  );

ALTER POLICY "doctors_read_allergies" ON public.allergies
  USING (
    NOT is_deleted
    AND EXISTS (
      SELECT 1
      FROM public.appointments
      WHERE appointments.doctor_id = auth.uid()
        AND appointments.patient_id = allergies.patient_id
        AND NOT appointments.is_deleted
    )
  );

ALTER POLICY "doctors_read_vaccinations" ON public.vaccinations
  USING (
    NOT is_deleted
    AND EXISTS (
      SELECT 1
      FROM public.appointments
      WHERE appointments.doctor_id = auth.uid()
        AND appointments.patient_id = vaccinations.patient_id
        AND NOT appointments.is_deleted
    )
  );
