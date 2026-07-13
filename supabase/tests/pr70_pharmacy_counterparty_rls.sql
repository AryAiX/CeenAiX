-- Read-only regression coverage for the PR #70 pharmacy counterparty boundary.
-- Run against a non-production environment with canonical demo users/data.
BEGIN;

DO $$
DECLARE
  function_result text;
  function_config text[];
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname IN (
        'Users can search for other users',
        'patients_read_linked_staff_profiles',
        'patients_read_pharmacy_profiles'
      )
  ) THEN
    RAISE EXCEPTION 'broad patient user profile policy still exists';
  END IF;

  SELECT
    pg_get_function_result(p.oid),
    p.proconfig
  INTO function_result, function_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_patient_prescription_pharmacy_contact'
    AND pg_get_function_identity_arguments(p.oid) = 'p_prescription_id uuid';

  IF function_result <> 'TABLE(user_id uuid, full_name text)' THEN
    RAISE EXCEPTION 'unexpected pharmacy contact RPC result: %', function_result;
  END IF;

  IF NOT ('search_path=pg_catalog, public' = ANY(function_config)) THEN
    RAISE EXCEPTION 'pharmacy contact RPC search_path is not fixed';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.get_patient_prescription_pharmacy_contact(uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon can execute pharmacy contact RPC';
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.get_patient_prescription_pharmacy_contact(uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated role cannot execute pharmacy contact RPC';
  END IF;

  SELECT
    pg_get_function_result(p.oid),
    p.proconfig
  INTO function_result, function_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_conversation_counterparty_profiles'
    AND pg_get_function_identity_arguments(p.oid) = 'p_user_ids uuid[]';

  IF function_result <> 'TABLE(user_id uuid, full_name text)' THEN
    RAISE EXCEPTION 'unexpected conversation profile RPC result: %', function_result;
  END IF;

  IF NOT ('search_path=pg_catalog, public' = ANY(function_config)) THEN
    RAISE EXCEPTION 'conversation profile RPC search_path is not fixed';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.get_conversation_counterparty_profiles(uuid[])',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon can execute conversation profile RPC';
  END IF;
END;
$$;

CREATE TEMP TABLE pr70_rls_context ON COMMIT DROP AS
SELECT
  p.id AS prescription_id,
  p.patient_id,
  p.doctor_id,
  p.pharmacy_organization_id AS organization_id,
  om.user_id AS pharmacy_user_id,
  linked_conversation.id AS conversation_id,
  (
    SELECT up.user_id
    FROM public.user_profiles up
    WHERE up.role NOT IN ('patient', 'pharmacy', 'super_admin')
      AND up.user_id NOT IN (p.patient_id, p.doctor_id, om.user_id)
    ORDER BY up.created_at
    LIMIT 1
  ) AS unrelated_user_id
FROM public.prescriptions p
JOIN public.organizations org
  ON org.id = p.pharmacy_organization_id
 AND org.kind = 'pharmacy'
 AND org.status = 'active'
JOIN public.organization_members om
  ON om.organization_id = org.id
 AND (om.ends_at IS NULL OR om.ends_at > now())
JOIN public.user_profiles pharmacy_profile
  ON pharmacy_profile.user_id = om.user_id
 AND pharmacy_profile.role = 'pharmacy'
JOIN LATERAL (
  SELECT c.id
  FROM public.conversations c
  WHERE (
      c.created_by = p.patient_id
      OR c.participant_ids ? p.patient_id::text
    )
    AND (
      c.created_by = om.user_id
      OR c.participant_ids ? om.user_id::text
    )
  ORDER BY c.created_at
  LIMIT 1
) linked_conversation ON true
WHERE NOT p.is_deleted
ORDER BY p.created_at
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pr70_rls_context
    WHERE unrelated_user_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'PR #70 RLS test requires linked patient/pharmacy data and an unrelated user';
  END IF;
END;
$$;

GRANT SELECT ON pr70_rls_context TO authenticated;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  context_row record;
  row_count integer;
BEGIN
  SELECT * INTO STRICT context_row FROM pr70_rls_context;

  PERFORM set_config('request.jwt.claim.sub', context_row.patient_id::text, true);

  SELECT count(*) INTO row_count
  FROM public.user_profiles
  WHERE user_id = context_row.pharmacy_user_id;
  IF row_count <> 0 THEN
    RAISE EXCEPTION 'patient can directly select pharmacy user profile';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.organization_members
  WHERE organization_id = context_row.organization_id;
  IF row_count <> 0 THEN
    RAISE EXCEPTION 'patient can enumerate pharmacy organization members';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.get_patient_prescription_pharmacy_contact(context_row.prescription_id);
  IF row_count <> 1 THEN
    RAISE EXCEPTION 'linked patient cannot resolve minimal pharmacy contact';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.get_conversation_counterparty_profiles(
    ARRAY[context_row.pharmacy_user_id]::uuid[]
  );
  IF row_count <> 1 THEN
    RAISE EXCEPTION 'linked patient cannot resolve minimal conversation display';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.user_profiles
  WHERE user_id = context_row.doctor_id;
  IF row_count <> 1 THEN
    RAISE EXCEPTION 'linked patient can no longer resolve prescribing doctor display';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', context_row.unrelated_user_id::text, true);

  SELECT count(*) INTO row_count
  FROM public.get_patient_prescription_pharmacy_contact(context_row.prescription_id);
  IF row_count <> 0 THEN
    RAISE EXCEPTION 'unrelated user can resolve patient pharmacy contact';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.get_conversation_counterparty_profiles(
    ARRAY[context_row.pharmacy_user_id]::uuid[]
  );
  IF row_count <> 0 THEN
    RAISE EXCEPTION 'unrelated user can resolve conversation counterparty display';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.user_profiles
  WHERE user_id = context_row.pharmacy_user_id;
  IF row_count <> 0 THEN
    RAISE EXCEPTION 'unrelated user can directly select pharmacy user profile';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', context_row.pharmacy_user_id::text, true);

  IF NOT public.is_current_user_ops_org(context_row.organization_id, 'pharmacy') THEN
    RAISE EXCEPTION 'pharmacy member cannot access their own organization';
  END IF;

  IF public.is_current_user_ops_org(gen_random_uuid(), 'pharmacy') THEN
    RAISE EXCEPTION 'pharmacy role fallback still grants an unrelated tenant';
  END IF;

  SELECT count(*) INTO row_count
  FROM public.user_profiles
  WHERE user_id IN (context_row.patient_id, context_row.doctor_id);
  IF row_count <> 2 THEN
    RAISE EXCEPTION 'linked pharmacy cannot resolve prescription counterparties';
  END IF;
END;
$$;

RESET ROLE;
ROLLBACK;
