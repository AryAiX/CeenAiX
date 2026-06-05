-- Create medication_reminders table to persist patient reminder preferences
-- Stores custom reminder times, pause status, and delete status per medication slot

CREATE TABLE public.medication_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescription_item_id uuid NOT NULL,
  slot text NOT NULL,
  reminder_time text NOT NULL DEFAULT '08:00',
  is_paused boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, prescription_item_id, slot)
);

-- Enable RLS
ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;

-- Patient can only see and manage their own reminders
CREATE POLICY "patient_own_reminders"
ON public.medication_reminders
FOR ALL
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());