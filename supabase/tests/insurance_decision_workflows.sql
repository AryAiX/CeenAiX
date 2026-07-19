-- Read-only regression checks for insurance decision workflow hardening.

SELECT '1..8';

SELECT CASE
  WHEN
  EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'insurance_decide_pre_authorization'
        AND p.prosecdef
  )
    THEN 'ok 1 - insurance_decide_pre_authorization is SECURITY DEFINER'
  ELSE 'not ok 1 - insurance_decide_pre_authorization is not SECURITY DEFINER'
END;

SELECT CASE
  WHEN
  EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'insurance_adjudicate_claim'
        AND p.prosecdef
  )
    THEN 'ok 2 - insurance_adjudicate_claim is SECURITY DEFINER'
  ELSE 'not ok 2 - insurance_adjudicate_claim is not SECURITY DEFINER'
END;

SELECT CASE
  WHEN
  EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'insurance_update_fraud_alert_status'
        AND p.prosecdef
  )
    THEN 'ok 3 - insurance_update_fraud_alert_status is SECURITY DEFINER'
  ELSE 'not ok 3 - insurance_update_fraud_alert_status is not SECURITY DEFINER'
END;

SELECT CASE
  WHEN
  EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'insurance_set_setting_enabled'
        AND p.prosecdef
  )
    THEN 'ok 4 - insurance_set_setting_enabled is SECURITY DEFINER'
  ELSE 'not ok 4 - insurance_set_setting_enabled is not SECURITY DEFINER'
END;

SELECT CASE
  WHEN
  position(
    'is_current_user_ops_org(v_row.organization_id, ''insurance'') IS NOT TRUE'
    in pg_get_functiondef('public.insurance_decide_pre_authorization(uuid, text, numeric, text)'::regprocedure)
  ) > 0
    THEN 'ok 5 - preauth decision RPC is scoped to caller insurance organization'
  ELSE 'not ok 5 - preauth decision RPC is not scoped to caller insurance organization'
END;

SELECT CASE
  WHEN
  position(
    'is_current_user_ops_org(v_row.organization_id, ''insurance'') IS NOT TRUE'
    in pg_get_functiondef('public.insurance_adjudicate_claim(uuid, text, text)'::regprocedure)
  ) > 0
    THEN 'ok 6 - claim adjudication RPC is scoped to caller insurance organization'
  ELSE 'not ok 6 - claim adjudication RPC is not scoped to caller insurance organization'
END;

SELECT CASE
  WHEN
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'insurance_pre_authorizations'
      AND policyname = 'patients_read_linked_insurance_pre_authorizations'
      AND qual LIKE '%patient_insurance%'
  )
    THEN 'ok 7 - patient linked preauthorization read policy exists'
  ELSE 'not ok 7 - patient linked preauthorization read policy is missing'
END;

SELECT CASE
  WHEN
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'insurance_claims'
      AND policyname = 'patients_read_linked_insurance_claims'
      AND qual LIKE '%patient_insurance%'
  )
    THEN 'ok 8 - patient linked claim read policy exists'
  ELSE 'not ok 8 - patient linked claim read policy is missing'
END;
