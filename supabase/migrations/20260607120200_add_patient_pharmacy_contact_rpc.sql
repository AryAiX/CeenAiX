-- Replace broad patient reads of pharmacy staff/profile tables with a narrow
-- contact lookup tied to the caller's own prescription.
DROP POLICY IF EXISTS "patients_read_pharmacy_members" ON public.organization_members;
DROP POLICY IF EXISTS "patients_read_pharmacy_profiles" ON public.user_profiles;

CREATE OR REPLACE FUNCTION public.get_patient_prescription_pharmacy_contact(
  p_prescription_id uuid
)
RETURNS TABLE (
  user_id uuid,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    om.user_id,
    up.full_name
  FROM public.prescriptions p
  JOIN public.organizations org
    ON org.id = p.pharmacy_organization_id
   AND org.kind = 'pharmacy'
   AND org.status = 'active'
  JOIN public.organization_members om
    ON om.organization_id = org.id
   AND (om.ends_at IS NULL OR om.ends_at > now())
  JOIN public.user_profiles up
    ON up.user_id = om.user_id
   AND up.role = 'pharmacy'
  WHERE auth.uid() IS NOT NULL
    AND p.id = p_prescription_id
    AND p.patient_id = auth.uid()
    AND NOT p.is_deleted
  ORDER BY om.is_primary DESC, om.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_patient_prescription_pharmacy_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_patient_prescription_pharmacy_contact(uuid) TO authenticated;
