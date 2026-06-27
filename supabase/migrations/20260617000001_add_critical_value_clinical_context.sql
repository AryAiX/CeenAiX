-- 20260617000001_add_critical_value_clinical_context.sql

-- The lab portal's critical value banner was hardcoding the reference
-- range, ordering doctor, and facility for every critical value alert.
-- Add the missing columns so this data can be populated and displayed
-- correctly per critical value.

ALTER TABLE public.lab_portal_critical_values
  ADD COLUMN IF NOT EXISTS reference_range text,
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS facility_name text;

COMMENT ON COLUMN public.lab_portal_critical_values.reference_range IS 'Normal reference range for the critical test (e.g. "3.5–5.0 mEq/L")';
COMMENT ON COLUMN public.lab_portal_critical_values.doctor_name IS 'Ordering doctor to be notified of this critical value';
COMMENT ON COLUMN public.lab_portal_critical_values.facility_name IS 'Clinic/facility associated with the ordering doctor';