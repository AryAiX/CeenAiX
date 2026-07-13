-- Read-only / metadata regression coverage for Slice B lab workflow RPCs.
-- Run against a non-production environment after applying
-- 20260713025000_harden_lab_order_workflow_rpcs.sql
BEGIN;

DO $$
DECLARE
  function_config text[];
  fn_name text;
  expected_fns text[] := ARRAY[
    'require_current_user_lab_id',
    'lab_claim_order',
    'lab_confirm_specimen',
    'lab_start_processing',
    'lab_release_order',
    'lab_reject_order'
  ];
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'lab_release_order_with_pin'
  ) THEN
    RAISE EXCEPTION 'plaintext PIN release RPC still exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'lab_start_processing'
      AND pg_get_function_identity_arguments(p.oid) = 'target_order_id uuid, p_instrument_name text'
  ) THEN
    RAISE EXCEPTION 'instrument side-effect start_processing overload still exists';
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

  IF has_function_privilege('anon', 'public.lab_claim_order(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute lab_claim_order';
  END IF;

  IF has_function_privilege('anon', 'public.lab_confirm_specimen(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute lab_confirm_specimen';
  END IF;

  IF has_function_privilege('anon', 'public.lab_reject_order(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute lab_reject_order';
  END IF;

  IF has_function_privilege('anon', 'public.lab_release_order(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute lab_release_order';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.lab_claim_order(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute lab_claim_order';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lab_orders'
      AND column_name = 'rejection_reason'
  ) THEN
    RAISE EXCEPTION 'lab_orders.rejection_reason missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lab_orders'
      AND column_name = 'sample_received_at'
  ) THEN
    RAISE EXCEPTION 'lab_orders.sample_received_at missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_orders'
      AND policyname = 'lab_staff_read_rejected_lab_orders'
  ) THEN
    RAISE EXCEPTION 'rejected-order read policy missing';
  END IF;

  -- current_user_lab_id must not silently pick the first of many memberships
  IF position('COUNT(DISTINCT' in upper(pg_get_functiondef('public.current_user_lab_id()'::regprocedure))) = 0 THEN
    RAISE EXCEPTION 'current_user_lab_id missing distinct membership count fail-closed guard';
  END IF;
END;
$$;

ROLLBACK;
