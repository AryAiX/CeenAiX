-- Allow authenticated users to read pharmacy user profiles
-- This enables pharmacy name to show correctly in patient messaging
CREATE POLICY "patients_read_pharmacy_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'pharmacy'
  );