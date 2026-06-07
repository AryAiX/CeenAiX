-- Add patient_user_id to pharmacy_dispensing_tasks
-- This links dispensing tasks to the patient's auth user account
-- enabling notifications and messages to be sent to the patient
-- when their prescription status changes (e.g. put on hold)
ALTER TABLE public.pharmacy_dispensing_tasks
  ADD COLUMN IF NOT EXISTS patient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.pharmacy_dispensing_tasks task
SET patient_user_id = prescription.patient_id
FROM public.prescriptions prescription
WHERE task.prescription_id = prescription.id
  AND task.patient_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pharmacy_dispensing_tasks_patient_user
  ON public.pharmacy_dispensing_tasks(patient_user_id)
  WHERE patient_user_id IS NOT NULL;