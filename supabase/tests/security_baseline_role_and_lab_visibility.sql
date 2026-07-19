-- Read-only / metadata regression coverage for the security baseline migration.
-- Run against dev after applying 20260719071500_harden_role_assignment_and_lab_visibility.sql.

SELECT '1..10';

SELECT CASE
  WHEN position('user_metadata' in pg_get_functiondef('public.current_user_app_role()'::regprocedure)) = 0
    THEN 'ok 1 - current_user_app_role does not trust auth user_metadata'
  ELSE 'not ok 1 - current_user_app_role still trusts auth user_metadata'
END;

SELECT CASE
  WHEN position('user_metadata' in pg_get_functiondef('public.is_current_user_super_admin(uuid)'::regprocedure)) = 0
    THEN 'ok 2 - is_current_user_super_admin does not trust auth user_metadata'
  ELSE 'not ok 2 - is_current_user_super_admin still trusts auth user_metadata'
END;

SELECT CASE
  WHEN position('COALESCE(target_user_id' in pg_get_functiondef('public.is_current_user_super_admin(uuid)'::regprocedure)) = 0
    THEN 'ok 3 - is_current_user_super_admin does not authorize against caller-supplied target users'
  ELSE 'not ok 3 - is_current_user_super_admin authorizes against caller-supplied target users'
END;

SELECT CASE
  WHEN position('current_user_app_role' in pg_get_functiondef('public.is_current_user_ops_org(uuid, text)'::regprocedure)) = 0
    THEN 'ok 4 - is_current_user_ops_org has no role-only operational access fallback'
  ELSE 'not ok 4 - is_current_user_ops_org still has a role-only operational access fallback'
END;

SELECT CASE
  WHEN position('organization_members' in pg_get_functiondef('public.is_current_user_ops_org(uuid, text)'::regprocedure)) > 0
    THEN 'ok 5 - is_current_user_ops_org is membership-backed'
  ELSE 'not ok 5 - is_current_user_ops_org is not membership-backed'
END;

SELECT CASE
  WHEN position('lab_staff' in pg_get_functiondef('public.is_current_user_lab_staff()'::regprocedure)) > 0
    THEN 'ok 6 - is_current_user_lab_staff is backed by lab_staff membership'
  ELSE 'not ok 6 - is_current_user_lab_staff is not backed by lab_staff membership'
END;

SELECT CASE
  WHEN
  EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_profiles'
      AND t.tgname = 'trg_prevent_user_profile_privilege_changes'
      AND NOT t.tgisinternal
  )
    THEN 'ok 7 - user profile privilege-change trigger exists'
  ELSE 'not ok 7 - user profile privilege-change trigger is missing'
END;

SELECT CASE
  WHEN
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'users_insert_own_patient_profile'
      AND with_check LIKE '%role = ''patient''%'
  )
    THEN 'ok 8 - patient-only self profile insert policy exists'
  ELSE 'not ok 8 - patient-only self profile insert policy is missing'
END;

SELECT CASE
  WHEN
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_orders'
      AND policyname = 'lab_staff_read_lab_orders'
      AND qual LIKE '%is_current_user_lab_staff%'
      AND qual LIKE '%current_user_lab_id%'
  )
    THEN 'ok 9 - lab order read policy requires active lab membership'
  ELSE 'not ok 9 - lab order read policy does not require active lab membership'
END;

SELECT CASE
  WHEN
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_order_items'
      AND policyname = 'patients_read_lab_items'
      AND qual LIKE '%results_released_at IS NOT NULL%'
  )
    THEN 'ok 10 - patient lab item read policy requires result release'
  ELSE 'not ok 10 - patient lab item read policy does not require result release'
END;
