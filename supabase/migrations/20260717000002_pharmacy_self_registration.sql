-- Migration: 20260717000002_pharmacy_self_registration.sql

CREATE OR REPLACE FUNCTION public.self_register_pharmacy(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_slug text;
BEGIN
  IF NOT is_current_user_pharmacy() THEN
    RAISE EXCEPTION 'Only pharmacy accounts can self-register a pharmacy.';
  END IF;

  IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'This account is already linked to an organization.';
  END IF;

  v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO organizations (name, slug, kind, country, status, seats_allocated, seats_used)
  VALUES (trim(p_name), v_slug, 'pharmacy', 'UAE', 'active', 1, 1)
  RETURNING id INTO v_org_id;

  INSERT INTO organization_members (organization_id, user_id, role_title, is_primary, starts_at)
  VALUES (v_org_id, auth.uid(), 'Pharmacy Operator', true, now());

  RETURN v_org_id;
END;
$function$;

CREATE POLICY pharmacy_facility_profiles_ops_insert
ON pharmacy_facility_profiles
FOR INSERT
TO authenticated
WITH CHECK (is_current_user_ops_org(organization_id, 'pharmacy'));