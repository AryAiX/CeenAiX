-- QA-017: let patients add their own blood pressure readings from the dashboard.
-- A patient may insert a row only for themselves, recorded by themselves,
-- as a manual entry, not linked to an appointment, and not deleted.
-- Safe to run more than once.

drop policy if exists patients_insert_own_vitals on public.patient_vitals;

create policy patients_insert_own_vitals
  on public.patient_vitals
  for insert
  to authenticated
  with check (
    auth.uid() = patient_id
    and recorded_by = auth.uid()
    and appointment_id is null
    and source = 'manual'
    and is_deleted = false
  );