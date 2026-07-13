-- Read-only / metadata regression coverage for final PR #88 imaging RPC slice.
-- Run against a non-production environment after applying
-- 20260713033000_harden_lab_imaging_rpcs.sql
BEGIN;

DO $$
DECLARE
  function_config text[];
  unsafe_pin_exists boolean;
  doctor_create_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'lab_sign_radiology_report'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_study_id uuid, p_radiologist_pin text, p_findings text, p_impression text, p_recommendations text, p_report_checklist jsonb'
  )
  INTO unsafe_pin_exists;

  IF unsafe_pin_exists THEN
    RAISE EXCEPTION 'unsafe PIN-based lab_sign_radiology_report overload still exists';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'doctor_create_imaging_order'
  )
  INTO doctor_create_exists;

  IF doctor_create_exists THEN
    RAISE EXCEPTION 'unsafe doctor_create_imaging_order still exists';
  END IF;

  SELECT p.proconfig
  INTO function_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'lab_set_imaging_study_status'
  LIMIT 1;

  IF function_config IS NULL THEN
    RAISE EXCEPTION 'lab_set_imaging_study_status missing';
  END IF;

  IF NOT (
    'search_path=pg_catalog, public' = ANY (function_config)
    OR 'search_path=pg_catalog,public' = ANY (function_config)
  ) THEN
    RAISE EXCEPTION 'lab_set_imaging_study_status search_path is not fixed: %', function_config;
  END IF;

  SELECT p.proconfig
  INTO function_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'lab_reject_imaging_study'
  LIMIT 1;

  IF function_config IS NULL THEN
    RAISE EXCEPTION 'lab_reject_imaging_study missing';
  END IF;

  IF NOT (
    'search_path=pg_catalog, public' = ANY (function_config)
    OR 'search_path=pg_catalog,public' = ANY (function_config)
  ) THEN
    RAISE EXCEPTION 'lab_reject_imaging_study search_path is not fixed: %', function_config;
  END IF;

  IF has_function_privilege(
    'anon',
    'public.lab_set_imaging_study_status(uuid, text, text, text, text, text, jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon can execute lab_set_imaging_study_status';
  END IF;

  IF has_function_privilege('anon', 'public.lab_reject_imaging_study(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute lab_reject_imaging_study';
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.lab_set_imaging_study_status(uuid, text, text, text, text, text, jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated cannot execute lab_set_imaging_study_status';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.lab_reject_imaging_study(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute lab_reject_imaging_study';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lab_portal_imaging_studies'
      AND column_name = 'is_deleted'
  ) THEN
    RAISE EXCEPTION 'lab_portal_imaging_studies.is_deleted missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lab_portal_imaging_studies'
      AND column_name = 'report_checklist'
  ) THEN
    RAISE EXCEPTION 'lab_portal_imaging_studies.report_checklist missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'
      AND rel.relname = 'lab_portal_imaging_studies'
      AND c.conname = 'lab_portal_imaging_status_chk'
      AND pg_get_constraintdef(c.oid) LIKE '%rejected%'
  ) THEN
    RAISE EXCEPTION 'lab_portal_imaging_status_chk does not allow rejected';
  END IF;
END $$;

ROLLBACK;
