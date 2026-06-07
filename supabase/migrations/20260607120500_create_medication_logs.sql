-- Create medication_logs table to persist patient medication taken status
-- Resets automatically each day via the taken_date unique constraint
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescription_item_id uuid NOT NULL REFERENCES public.prescription_items(id) ON DELETE CASCADE,
  taken_at timestamptz NOT NULL DEFAULT now(),
  taken_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, prescription_item_id, taken_date)
);

ALTER TABLE public.medication_logs
  DROP CONSTRAINT IF EXISTS medication_logs_prescription_item_id_fkey;

ALTER TABLE public.medication_logs
  ADD CONSTRAINT medication_logs_prescription_item_id_fkey
  FOREIGN KEY (prescription_item_id)
  REFERENCES public.prescription_items(id)
  ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Patient can only see and insert their own logs
DROP POLICY IF EXISTS "patient_own_medication_logs" ON public.medication_logs;

CREATE POLICY "patient_own_medication_logs"
ON public.medication_logs
FOR ALL
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());