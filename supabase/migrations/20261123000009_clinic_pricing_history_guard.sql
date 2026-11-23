-- QA-212: anyone signed in could write fake entries into a clinic's price history.
--
-- log_clinic_pricing_change(...) is SECURITY DEFINER and granted to every signed-in user, but it
-- never checked who was calling: a patient (or any account) could add rows to any clinic's
-- clinic_pricing_audit_log, for any entity, with any old / new value. The app does not call it.
-- The table's insert policy also let clinic managers insert history rows directly.
--
-- Now:
--   * log_clinic_pricing_change only accepts a super admin, or a clinic admin / manager of that
--     same clinic, and only for a doctor link (facility_staff) or service (facility_services) that
--     belongs to that clinic. Everyone else gets "Not authorized".
--   * Direct inserts into clinic_pricing_audit_log are for super admins only. Price history is
--     written by the database itself (QA-205 fee trigger, SECURITY DEFINER), which is not affected.
-- Reading the history is unchanged. No DROP. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.log_clinic_pricing_change(
  p_facility_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_field_name text,
  p_old_value jsonb,
  p_new_value jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.is_current_user_super_admin()
    OR (p_facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_can_manage())
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_entity_type = 'facility_staff' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.facility_staff fs
      WHERE fs.id = p_entity_id AND fs.facility_id = p_facility_id
    ) THEN
      RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
    END IF;
  ELSIF p_entity_type = 'facility_service' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.facility_services s
      WHERE s.id = p_entity_id AND s.facility_id = p_facility_id
    ) THEN
      RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown price history type' USING ERRCODE = '22023';
  END IF;

  IF coalesce(btrim(p_field_name), '') = '' THEN
    RAISE EXCEPTION 'Field name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.clinic_pricing_audit_log (
    facility_id, changed_by, entity_type, entity_id, field_name, old_value, new_value
  )
  VALUES (
    p_facility_id, auth.uid(), p_entity_type, p_entity_id, p_field_name, p_old_value, p_new_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_clinic_pricing_change(uuid, text, uuid, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_clinic_pricing_change(uuid, text, uuid, text, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_clinic_pricing_change(uuid, text, uuid, text, jsonb, jsonb) TO authenticated;

ALTER POLICY "clinic_pricing_audit_clinic_insert"
  ON public.clinic_pricing_audit_log
  WITH CHECK (public.is_current_user_super_admin());
