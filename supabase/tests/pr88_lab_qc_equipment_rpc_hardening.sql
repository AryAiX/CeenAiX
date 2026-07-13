-- Read-only / metadata regression coverage for Slice C QC + equipment RPCs.
-- Run against a non-production environment after applying
-- 20260713030000_harden_lab_qc_equipment_rpcs.sql
BEGIN;

DO $$
DECLARE
  function_config text[];
  fn_name text;
  expected_fns text[] := ARRAY[
    'lab_log_qc_run',
    'lab_review_qc_failure',
    'lab_log_maintenance',
    'lab_mark_equipment_online'
  ];
  short_overload_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'lab_log_qc_run'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_instrument_name text, p_department text, p_lot_number text, p_level_label text, p_result_label text, p_status text, p_run_at timestamp with time zone'
  )
  INTO short_overload_exists;

  IF short_overload_exists THEN
    RAISE EXCEPTION 'short lab_log_qc_run overload still exists';
  END IF;

  FOREACH fn_name IN ARRAY expected_fns LOOP
    SELECT p.proconfig
    INTO function_config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = fn_name
    ORDER BY p.oid
    LIMIT 1;

    IF function_config IS NULL THEN
      RAISE EXCEPTION '% missing', fn_name;
    END IF;

    IF NOT (
      'search_path=pg_catalog, public' = ANY (function_config)
      OR 'search_path=pg_catalog,public' = ANY (function_config)
    ) THEN
      RAISE EXCEPTION '% search_path is not fixed to pg_catalog, public: %', fn_name, function_config;
    END IF;
  END LOOP;

  IF has_function_privilege(
    'anon',
    'public.lab_log_qc_run(text, text, text, text, text, text, numeric, numeric, numeric, text, timestamp with time zone)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon can execute lab_log_qc_run';
  END IF;

  IF has_function_privilege('anon', 'public.lab_review_qc_failure(uuid, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute lab_review_qc_failure';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.lab_log_maintenance(uuid, text, text, text, timestamp with time zone, text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon can execute lab_log_maintenance';
  END IF;

  IF has_function_privilege('anon', 'public.lab_mark_equipment_online(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute lab_mark_equipment_online';
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.lab_log_qc_run(text, text, text, text, text, text, numeric, numeric, numeric, text, timestamp with time zone)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated cannot execute lab_log_qc_run';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lab_portal_qc_runs'
      AND column_name = 'failure_notes'
  ) THEN
    RAISE EXCEPTION 'lab_portal_qc_runs.failure_notes missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lab_portal_qc_runs'
      AND column_name = 'result_value'
  ) THEN
    RAISE EXCEPTION 'lab_portal_qc_runs.result_value missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lab_portal_equipment'
      AND column_name = 'is_running'
  ) THEN
    RAISE EXCEPTION 'lab_portal_equipment.is_running missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'lab_equipment_maintenance_logs'
  ) THEN
    RAISE EXCEPTION 'lab_equipment_maintenance_logs missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_equipment_maintenance_logs'
      AND policyname = 'lab_staff_read_maintenance_logs'
  ) THEN
    RAISE EXCEPTION 'maintenance logs read policy missing';
  END IF;
END $$;

ROLLBACK;
