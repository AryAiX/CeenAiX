-- Security baseline for product-readiness:
-- - never trust user-editable auth user_metadata for authorization
-- - prevent self-service profile role escalation
-- - require active organization/lab membership for operational access
-- - hide lab result item rows from patients until explicit release

-- ---------------------------------------------------------------------------
-- Role helpers: app_metadata or database profile only; never user_metadata.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  -- Keep the legacy argument for older policies/RPC call sites, but never use
  -- it to authorize against another user's profile.
  SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin', false)
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = 'super_admin'
      LIMIT 1
    );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_super_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_user_super_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_super_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    (
      SELECT up.role::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_app_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_app_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_app_role() TO authenticated;

-- ---------------------------------------------------------------------------
-- user_profiles: self-service profile edits must not alter identity/role.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_user_profile_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF public.is_current_user_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Changing profile ownership is not allowed.' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changing profile role is not allowed.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_user_profile_privilege_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_user_profile_privilege_changes() FROM anon;

DROP TRIGGER IF EXISTS trg_prevent_user_profile_privilege_changes ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_profile_privilege_changes
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_profile_privilege_changes();

DROP POLICY IF EXISTS "users_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_insert_own_patient_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;

CREATE POLICY "users_read_own_profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_patient_profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'patient'
  );

CREATE POLICY "users_update_own_profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Operational membership helpers: role alone is not enough for tenant access.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_current_user_ops_org(target_organization_id uuid, expected_kind text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    public.is_current_user_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.organizations org ON org.id = om.organization_id
      WHERE om.organization_id = target_organization_id
        AND om.user_id = auth.uid()
        AND (om.ends_at IS NULL OR om.ends_at > now())
        AND (expected_kind IS NULL OR org.kind = expected_kind)
    );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_ops_org(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_user_ops_org(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_ops_org(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_current_user_lab_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lab_staff ls
    WHERE ls.user_id = auth.uid()
      AND ls.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_lab_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_user_lab_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_lab_staff() TO authenticated;

-- ---------------------------------------------------------------------------
-- Lab RLS: unassigned orders are visible only to authenticated active lab
-- members, and assigned orders remain scoped to the caller's lab membership.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "lab_staff_read_lab_orders" ON public.lab_orders;
CREATE POLICY "lab_staff_read_lab_orders"
  ON public.lab_orders
  FOR SELECT
  TO authenticated
  USING (
    NOT is_deleted
    AND public.is_current_user_lab_staff()
    AND public.current_user_lab_id() IS NOT NULL
    AND (
      assigned_lab_id IS NULL
      OR public.is_current_user_in_lab(assigned_lab_id)
    )
  );

DROP POLICY IF EXISTS "lab_staff_update_lab_orders" ON public.lab_orders;
CREATE POLICY "lab_staff_update_lab_orders"
  ON public.lab_orders
  FOR UPDATE
  TO authenticated
  USING (
    NOT is_deleted
    AND public.is_current_user_lab_staff()
    AND assigned_lab_id IS NOT NULL
    AND public.is_current_user_in_lab(assigned_lab_id)
  )
  WITH CHECK (
    NOT is_deleted
    AND public.is_current_user_lab_staff()
    AND assigned_lab_id IS NOT NULL
    AND public.is_current_user_in_lab(assigned_lab_id)
  );

DROP POLICY IF EXISTS "lab_staff_read_lab_items" ON public.lab_order_items;
CREATE POLICY "lab_staff_read_lab_items"
  ON public.lab_order_items
  FOR SELECT
  TO authenticated
  USING (
    public.is_current_user_lab_staff()
    AND public.current_user_lab_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.lab_orders lo
      WHERE lo.id = lab_order_items.lab_order_id
        AND NOT lo.is_deleted
        AND (
          lo.assigned_lab_id IS NULL
          OR public.is_current_user_in_lab(lo.assigned_lab_id)
        )
    )
  );

DROP POLICY IF EXISTS "patients_read_lab_items" ON public.lab_order_items;
CREATE POLICY "patients_read_lab_items"
  ON public.lab_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lab_orders lo
      WHERE lo.id = lab_order_items.lab_order_id
        AND lo.patient_id = auth.uid()
        AND NOT lo.is_deleted
        AND lo.results_released_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "lab_staff_read_user_profiles" ON public.user_profiles;
CREATE POLICY "lab_staff_read_user_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_current_user_lab_staff()
    AND public.current_user_lab_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.lab_orders lo
      WHERE NOT lo.is_deleted
        AND (
          lo.assigned_lab_id IS NULL
          OR public.is_current_user_in_lab(lo.assigned_lab_id)
        )
        AND (
          lo.patient_id = user_profiles.user_id
          OR lo.doctor_id = user_profiles.user_id
        )
    )
  );
