-- QA-202: every clinic could read the full profile of every doctor on the platform.
--
-- The rule clinic_member_read_doctor_profiles (20260614093000) on user_profiles allowed a clinic
-- admin / manager to read ANY row with role = 'doctor'. A doctor's user_profiles row holds personal
-- data: email, phone, date of birth, Emirates ID / UAE ID number, home address, insurance policy.
-- The clinic "Add Doctor" search read it directly and showed the doctor's email.
--
-- Now:
--   * clinic_search_doctors(query): the "Add Doctor" search. Returns only id, name and
--     specialization of matching doctors (clinic admin / manager only, at least 2 characters,
--     at most 8 results, typed % and _ matched literally, suspended accounts left out).
--   * clinic_member_read_doctor_profiles is narrowed (ALTER POLICY, no DROP) to doctors who have a
--     link with the caller's clinic (any status) or a visit at it, so the clinic pages keep showing
--     their own doctors' names.
-- Messages uses its own SECURITY DEFINER functions and is not affected. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.clinic_search_doctors(p_query text)
RETURNS TABLE (user_id uuid, full_name text, specialization text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_query text := btrim(coalesce(p_query, ''));
  v_pattern text;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_clinic_facility_id() IS NULL OR NOT public.clinic_member_can_manage() THEN
    RAISE EXCEPTION 'Not authorized to search doctors.' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_query) < 2 THEN
    RETURN;
  END IF;

  v_pattern := '%' || replace(replace(replace(left(v_query, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
  SELECT up.user_id, up.full_name, dp.specialization
  FROM public.user_profiles up
  LEFT JOIN public.doctor_profiles dp ON dp.user_id = up.user_id
  WHERE up.role = 'doctor'
    AND coalesce(up.account_status, 'active') <> 'suspended'
    AND up.full_name ILIKE v_pattern
  ORDER BY up.full_name, up.user_id
  LIMIT 8;
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_search_doctors(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_search_doctors(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.clinic_search_doctors(text) TO authenticated;

COMMENT ON FUNCTION public.clinic_search_doctors(text) IS
  'QA-202: clinic "Add Doctor" search. Returns only id, name and specialization (no contact or identity data).';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
      AND policyname = 'clinic_member_read_doctor_profiles'
  ) THEN
    ALTER POLICY "clinic_member_read_doctor_profiles" ON public.user_profiles
      USING (
        role = 'doctor'
        AND public.clinic_member_can_manage()
        AND (
          EXISTS (
            SELECT 1 FROM public.facility_staff fs
            WHERE fs.facility_id = public.current_user_clinic_facility_id()
              AND fs.doctor_user_id = user_profiles.user_id
          )
          OR EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.facility_id = public.current_user_clinic_facility_id()
              AND a.doctor_id = user_profiles.user_id
          )
        )
      );
  END IF;
END $$;
