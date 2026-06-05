-- Create patient_family_members table to persist family member data
-- Allows patients to manage their family members in their profile

CREATE TABLE public.patient_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  date_of_birth text,
  emirates_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_family_members ENABLE ROW LEVEL SECURITY;

-- Patient can only see and manage their own family members
CREATE POLICY "patient_own_family_members"
ON public.patient_family_members
FOR ALL
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());