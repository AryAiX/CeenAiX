-- A doctor could create a prescription or lab order for any patient id: the rules only checked
-- that the doctor was the author. Writes now also need a care relationship, the same one the
-- doctor read rules use (20261119000002): a non-deleted appointment between this doctor and the
-- patient. Reads are unchanged. ALTER POLICY keeps the rule names; nothing is dropped and no
-- data is changed.

ALTER POLICY "doctors_own_prescriptions" ON public.prescriptions
  WITH CHECK (
    auth.uid() = doctor_id
    AND NOT is_deleted
    AND EXISTS (
      SELECT 1
      FROM public.appointments
      WHERE appointments.doctor_id = auth.uid()
        AND appointments.patient_id = prescriptions.patient_id
        AND NOT appointments.is_deleted
    )
  );

ALTER POLICY "doctors_own_lab_orders" ON public.lab_orders
  WITH CHECK (
    auth.uid() = doctor_id
    AND NOT is_deleted
    AND EXISTS (
      SELECT 1
      FROM public.appointments
      WHERE appointments.doctor_id = auth.uid()
        AND appointments.patient_id = lab_orders.patient_id
        AND NOT appointments.is_deleted
    )
  );
