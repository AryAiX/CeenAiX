-- 20260615000001_fix_user_profiles_infinite_recursion.sql

-- Create a SECURITY DEFINER helper to check if the current user is a patient,
-- avoiding direct inline queries to user_profiles inside other tables' RLS
-- policies (which caused infinite recursion with clinic_read_facility_staff_profiles).
CREATE OR REPLACE FUNCTION public.is_current_user_patient()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.role = 'patient'
  );
$$;

-- Replace the recursive policy on facility_staff to use the new helper
DROP POLICY IF EXISTS patient_read_active_doctor_facility_links ON public.facility_staff;

CREATE POLICY patient_read_active_doctor_facility_links
ON public.facility_staff
FOR SELECT
USING (
  is_active = true
  AND invitation_status = 'accepted'
  AND public.is_current_user_patient()
);