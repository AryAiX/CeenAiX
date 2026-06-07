-- Fix RLS policies to allow soft-delete on patient records
-- The NOT is_deleted check was blocking UPDATE operations that set is_deleted = true

DROP POLICY IF EXISTS patients_own_allergies ON public.allergies;
CREATE POLICY patients_own_allergies ON public.allergies
FOR ALL
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS patients_own_conditions ON public.medical_conditions;
CREATE POLICY patients_own_conditions ON public.medical_conditions
FOR ALL
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS patients_own_vaccinations ON public.vaccinations;
CREATE POLICY patients_own_vaccinations ON public.vaccinations
FOR ALL
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);