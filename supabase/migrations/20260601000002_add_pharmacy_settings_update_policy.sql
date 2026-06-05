-- Allow pharmacy users to update their own settings
CREATE POLICY "pharmacy_settings_ops_update"
  ON public.pharmacy_settings
  FOR UPDATE
  TO authenticated
  USING (is_current_user_ops_org(organization_id, 'pharmacy'::text))
  WITH CHECK (is_current_user_ops_org(organization_id, 'pharmacy'::text));