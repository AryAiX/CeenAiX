-- RPC: admin_create_organization
-- Lets an authenticated super-admin create a new organization row from the
-- admin UI. Auto-derives the slug from the name when not supplied, validates
-- kind/status against the existing CHECK constraints, and returns the new row.

CREATE OR REPLACE FUNCTION public.admin_create_organization(
  in_name text,
  in_kind text,
  in_city text DEFAULT NULL,
  in_primary_contact_name text DEFAULT NULL,
  in_primary_contact_email text DEFAULT NULL,
  in_notes text DEFAULT NULL,
  in_slug text DEFAULT NULL,
  in_status text DEFAULT 'pending',
  in_seats_allocated integer DEFAULT 0
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  cleaned_name text;
  cleaned_kind text;
  cleaned_status text;
  derived_slug text;
  base_slug text;
  candidate text;
  suffix integer := 1;
  result public.organizations;
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can create organizations.' USING ERRCODE = 'P0001';
  END IF;

  cleaned_name := nullif(btrim(coalesce(in_name, '')), '');
  IF cleaned_name IS NULL THEN
    RAISE EXCEPTION 'Organization name is required.' USING ERRCODE = '22023';
  END IF;

  cleaned_kind := lower(btrim(coalesce(in_kind, '')));
  IF cleaned_kind NOT IN ('hospital', 'clinic', 'lab', 'pharmacy', 'insurance') THEN
    RAISE EXCEPTION 'Invalid organization kind: %', in_kind USING ERRCODE = '22023';
  END IF;

  cleaned_status := lower(btrim(coalesce(in_status, 'pending')));
  IF cleaned_status NOT IN ('active', 'suspended', 'pending', 'archived') THEN
    RAISE EXCEPTION 'Invalid organization status: %', in_status USING ERRCODE = '22023';
  END IF;

  -- Build slug: prefer caller-supplied, else derive from name (lowercase,
  -- collapse non-alphanumerics into hyphens, trim hyphens) and ensure uniqueness
  -- by appending -2, -3, ... if needed.
  base_slug := nullif(btrim(coalesce(in_slug, '')), '');
  IF base_slug IS NULL THEN
    base_slug := regexp_replace(lower(cleaned_name), '[^a-z0-9]+', '-', 'g');
    base_slug := btrim(base_slug, '-');
    IF base_slug = '' THEN
      base_slug := 'organization';
    END IF;
  END IF;

  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  END LOOP;
  derived_slug := candidate;

  INSERT INTO public.organizations (
    slug,
    name,
    kind,
    city,
    primary_contact_name,
    primary_contact_email,
    notes,
    status,
    seats_allocated
  )
  VALUES (
    derived_slug,
    cleaned_name,
    cleaned_kind,
    nullif(btrim(coalesce(in_city, '')), ''),
    nullif(btrim(coalesce(in_primary_contact_name, '')), ''),
    nullif(btrim(coalesce(in_primary_contact_email, '')), ''),
    nullif(btrim(coalesce(in_notes, '')), ''),
    cleaned_status,
    GREATEST(0, coalesce(in_seats_allocated, 0))
  )
  RETURNING * INTO result;

  RETURN result;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.admin_create_organization(
  text, text, text, text, text, text, text, text, integer
) TO authenticated;
