-- Admin readiness: lifecycle status, audited user updates, and insurance plan CRUD.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_account_status_chk;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_account_status_chk
  CHECK (account_status IN ('active', 'suspended'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_account_status
  ON public.user_profiles(account_status);

DROP FUNCTION IF EXISTS public.admin_list_users(text, text, integer);
DROP FUNCTION IF EXISTS public.admin_update_user_account_status(uuid, text);
DROP FUNCTION IF EXISTS public.admin_update_user_role(uuid, user_role);
DROP FUNCTION IF EXISTS public.admin_list_insurance_plans();
DROP FUNCTION IF EXISTS public.admin_upsert_insurance_plan(uuid, text, text, text, numeric, numeric, text, boolean);
DROP FUNCTION IF EXISTS public.admin_set_insurance_plan_active(uuid, boolean);

CREATE OR REPLACE FUNCTION public.admin_list_users(
  search_text text DEFAULT NULL,
  filter_role text DEFAULT NULL,
  max_rows integer DEFAULT 100
)
RETURNS TABLE (
  user_id uuid,
  role user_role,
  full_name text,
  email text,
  phone text,
  city text,
  profile_completed boolean,
  account_status text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_dha_verified boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can list users.' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT
    up.user_id,
    up.role,
    up.full_name,
    up.email,
    up.phone,
    up.city,
    up.profile_completed,
    up.account_status,
    up.created_at,
    au.last_sign_in_at,
    COALESCE(dp.dha_license_verified, false) AS is_dha_verified
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.user_id
  LEFT JOIN public.doctor_profiles dp ON dp.user_id = up.user_id
  WHERE (search_text IS NULL OR search_text = ''
      OR up.full_name ILIKE '%' || search_text || '%'
      OR up.email ILIKE '%' || search_text || '%'
      OR up.phone ILIKE '%' || search_text || '%')
    AND (filter_role IS NULL OR filter_role = '' OR up.role::text = filter_role)
  ORDER BY up.created_at DESC
  LIMIT COALESCE(max_rows, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_account_status(
  p_user_id uuid,
  p_account_status text
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row public.user_profiles%ROWTYPE;
  updated_row public.user_profiles%ROWTYPE;
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can update user lifecycle status.' USING ERRCODE = 'P0001';
  END IF;

  IF p_account_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid account status.' USING ERRCODE = 'P0001';
  END IF;

  IF p_user_id = auth.uid() AND p_account_status = 'suspended' THEN
    RAISE EXCEPTION 'You cannot suspend your own admin account.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO old_row
  FROM public.user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF old_row.user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.user_profiles
  SET account_status = p_account_status,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO updated_row;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
  VALUES (
    auth.uid(),
    'update',
    'user_profiles',
    updated_row.id,
    jsonb_build_object('account_status', old_row.account_status),
    jsonb_build_object('account_status', updated_row.account_status)
  );

  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id uuid,
  p_role user_role
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row public.user_profiles%ROWTYPE;
  updated_row public.user_profiles%ROWTYPE;
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can update user roles.' USING ERRCODE = 'P0001';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own admin role.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO old_row
  FROM public.user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF old_row.user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.user_profiles
  SET role = p_role,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO updated_row;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
  VALUES (
    auth.uid(),
    'update',
    'user_profiles',
    updated_row.id,
    jsonb_build_object('role', old_row.role),
    jsonb_build_object('role', updated_row.role)
  );

  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_insurance_plans()
RETURNS SETOF public.insurance_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can list insurance plans.' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.insurance_plans
  ORDER BY provider_company ASC, name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_insurance_plan(
  p_plan_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_provider_company text DEFAULT NULL,
  p_coverage_type text DEFAULT NULL,
  p_annual_limit numeric DEFAULT NULL,
  p_co_pay_percentage numeric DEFAULT NULL,
  p_network_type text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS public.insurance_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row public.insurance_plans%ROWTYPE;
  updated_row public.insurance_plans%ROWTYPE;
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can manage insurance plans.' USING ERRCODE = 'P0001';
  END IF;

  IF NULLIF(btrim(COALESCE(p_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Plan name is required.' USING ERRCODE = 'P0001';
  END IF;

  IF NULLIF(btrim(COALESCE(p_provider_company, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Provider company is required.' USING ERRCODE = 'P0001';
  END IF;

  IF p_co_pay_percentage IS NOT NULL AND (p_co_pay_percentage < 0 OR p_co_pay_percentage > 100) THEN
    RAISE EXCEPTION 'Co-pay percentage must be between 0 and 100.' USING ERRCODE = 'P0001';
  END IF;

  IF p_plan_id IS NULL THEN
    INSERT INTO public.insurance_plans (
      name,
      provider_company,
      coverage_type,
      annual_limit,
      co_pay_percentage,
      network_type,
      is_active
    )
    VALUES (
      btrim(p_name),
      btrim(p_provider_company),
      NULLIF(btrim(COALESCE(p_coverage_type, '')), ''),
      p_annual_limit,
      p_co_pay_percentage,
      NULLIF(btrim(COALESCE(p_network_type, '')), ''),
      COALESCE(p_is_active, true)
    )
    RETURNING * INTO updated_row;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_value)
    VALUES (auth.uid(), 'create', 'insurance_plans', updated_row.id, to_jsonb(updated_row));
  ELSE
    SELECT * INTO old_row
    FROM public.insurance_plans
    WHERE id = p_plan_id
    FOR UPDATE;

    IF old_row.id IS NULL THEN
      RAISE EXCEPTION 'Insurance plan not found.' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.insurance_plans
    SET name = btrim(p_name),
        provider_company = btrim(p_provider_company),
        coverage_type = NULLIF(btrim(COALESCE(p_coverage_type, '')), ''),
        annual_limit = p_annual_limit,
        co_pay_percentage = p_co_pay_percentage,
        network_type = NULLIF(btrim(COALESCE(p_network_type, '')), ''),
        is_active = COALESCE(p_is_active, true),
        updated_at = now()
    WHERE id = p_plan_id
    RETURNING * INTO updated_row;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    VALUES (auth.uid(), 'update', 'insurance_plans', updated_row.id, to_jsonb(old_row), to_jsonb(updated_row));
  END IF;

  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_insurance_plan_active(
  p_plan_id uuid,
  p_is_active boolean
)
RETURNS public.insurance_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row public.insurance_plans%ROWTYPE;
  updated_row public.insurance_plans%ROWTYPE;
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can manage insurance plans.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO old_row
  FROM public.insurance_plans
  WHERE id = p_plan_id
  FOR UPDATE;

  IF old_row.id IS NULL THEN
    RAISE EXCEPTION 'Insurance plan not found.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.insurance_plans
  SET is_active = p_is_active,
      updated_at = now()
  WHERE id = p_plan_id
  RETURNING * INTO updated_row;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_value, new_value)
  VALUES (
    auth.uid(),
    'update',
    'insurance_plans',
    updated_row.id,
    jsonb_build_object('is_active', old_row.is_active),
    jsonb_build_object('is_active', updated_row.is_active)
  );

  RETURN updated_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_account_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_insurance_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_insurance_plan(uuid, text, text, text, numeric, numeric, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_insurance_plan_active(uuid, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
