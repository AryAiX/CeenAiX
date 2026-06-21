-- Repair recursive user_profiles RLS policies that block auth role resolution.
--
-- When a SELECT policy on user_profiles queries user_profiles again, Postgres
-- re-enters the same policy and aborts with 42P17. Keep self-read direct and
-- move admin role checks behind a SECURITY DEFINER helper.

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.role = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_super_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_read_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_update_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_own_profile_no_recursion" ON public.user_profiles;

CREATE POLICY "users_read_own_profile_no_recursion"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins_read_all_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_super_admin());

CREATE POLICY "admins_update_all_profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_super_admin())
  WITH CHECK (public.is_current_user_super_admin());
