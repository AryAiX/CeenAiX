-- The admin "Verify doctor" action updates doctor_profiles, but no rule let a super admin write
-- that table, so the update matched no rows and nothing was saved. guard_doctor_licence_verification
-- (20261120000006) already allows super admins to set the verification fields.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'doctor_profiles'
      AND policyname = 'super_admin_update_doctor_profiles'
  ) THEN
    CREATE POLICY "super_admin_update_doctor_profiles"
      ON public.doctor_profiles
      FOR UPDATE
      TO authenticated
      USING (public.is_current_user_super_admin())
      WITH CHECK (public.is_current_user_super_admin());
  END IF;
END $$;
