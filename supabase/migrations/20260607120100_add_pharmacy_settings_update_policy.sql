-- Allow pharmacy users to update their own settings
DROP POLICY IF EXISTS "pharmacy_settings_ops_update" ON public.pharmacy_settings;

CREATE POLICY "pharmacy_settings_ops_update"
  ON public.pharmacy_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_ops_org(organization_id, 'pharmacy'::text))
  WITH CHECK (public.is_current_user_ops_org(organization_id, 'pharmacy'::text));