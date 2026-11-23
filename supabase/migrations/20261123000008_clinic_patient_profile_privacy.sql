-- QA-208: clinics could read the whole profile of their patients.
--
-- The rule clinic_member_read_linked_patient_profiles (20260614093000) on user_profiles let ANY
-- active clinic member read every column of a patient's row once the patient had any visit at the
-- clinic (even one cancelled visit): Emirates ID / UAE ID number and expiry, insurance provider and
-- policy number, home address, date of birth, and more. The clinic screens only use name, phone,
-- email and date of birth.
--
-- Now:
--   * clinic_patient_profiles(ids): name, phone, email and date of birth of the given patients,
--     only for patients with a (not deleted) visit at the caller's clinic; at most 200 ids per call.
--   * clinic_search_patients(query): the booking search; name and phone of this clinic's patients
--     (at least 2 characters, at most 8 results, typed % and _ matched literally). Same patients
--     as before (QA-192): only those who already have a visit at this clinic.
--   * clinic_member_read_linked_patient_profiles is switched off (ALTER POLICY, no DROP), so clinic
--     members can no longer read patient rows directly. Patients, doctors and admins keep their own
--     rules; messages use their own SECURITY DEFINER functions.
-- Callers: any active clinic member (same people as the old rule). Safe to run more than once.

CREATE OR REPLACE FUNCTION public.clinic_patient_profiles(p_patient_ids uuid[])
RETURNS TABLE (user_id uuid, full_name text, phone text, email text, date_of_birth date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_facility_id uuid := public.current_user_clinic_facility_id();
BEGIN
  IF auth.uid() IS NULL OR v_facility_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized to read clinic patients.' USING ERRCODE = '42501';
  END IF;

  IF coalesce(array_length(p_patient_ids, 1), 0) > 200 THEN
    RAISE EXCEPTION 'Ask for at most 200 patients at a time.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT up.user_id, up.full_name, up.phone, up.email, up.date_of_birth
  FROM public.user_profiles up
  WHERE up.user_id = ANY (coalesce(p_patient_ids, '{}'::uuid[]))
    AND up.role = 'patient'
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = up.user_id
        AND a.facility_id = v_facility_id
        AND a.is_deleted = false
    );
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_patient_profiles(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_patient_profiles(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.clinic_patient_profiles(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.clinic_patient_profiles(uuid[]) IS
  'QA-208: name, phone, email and date of birth of patients who have a visit at the caller''s clinic (no identity, insurance or address data).';

CREATE OR REPLACE FUNCTION public.clinic_search_patients(p_query text)
RETURNS TABLE (user_id uuid, full_name text, phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_facility_id uuid := public.current_user_clinic_facility_id();
  v_query text := btrim(coalesce(p_query, ''));
  v_pattern text;
BEGIN
  IF auth.uid() IS NULL OR v_facility_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized to search clinic patients.' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_query) < 2 THEN
    RETURN;
  END IF;

  v_pattern := '%' || replace(replace(replace(left(v_query, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
  SELECT up.user_id, up.full_name, up.phone
  FROM public.user_profiles up
  WHERE up.role = 'patient'
    AND up.full_name ILIKE v_pattern
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = up.user_id
        AND a.facility_id = v_facility_id
        AND a.is_deleted = false
    )
  ORDER BY up.full_name, up.user_id
  LIMIT 8;
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_search_patients(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_search_patients(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.clinic_search_patients(text) TO authenticated;

COMMENT ON FUNCTION public.clinic_search_patients(text) IS
  'QA-208: clinic booking search; name and phone of patients who already have a visit at the caller''s clinic.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
      AND policyname = 'clinic_member_read_linked_patient_profiles'
  ) THEN
    ALTER POLICY "clinic_member_read_linked_patient_profiles" ON public.user_profiles
      USING (false);
  END IF;
END $$;
