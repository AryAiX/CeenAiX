-- Add patient_user_id to pharmacy_dispensing_tasks
-- This links dispensing tasks to the patient's auth user account
-- enabling notifications and messages to be sent to the patient
-- when their prescription status changes (e.g. put on hold)
ALTER TABLE public.pharmacy_dispensing_tasks
  ADD COLUMN IF NOT EXISTS patient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;