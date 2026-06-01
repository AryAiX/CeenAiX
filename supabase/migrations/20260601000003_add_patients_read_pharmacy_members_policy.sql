-- Allow authenticated users to read pharmacy organization members
-- This enables patient → pharmacy direct messaging
CREATE POLICY "patients_read_pharmacy_members"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_members.organization_id
      AND organizations.kind = 'pharmacy'
    )
  );