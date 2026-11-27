-- QA-291: pharmacy staff could set their own licence and DHA / NABIDH status.
--
-- The rule "pharmacy_facility_profiles_ops_update" (and, on databases that have it,
-- "pharmacy_facility_profiles_ops_insert") lets any member of the pharmacy write every column of
-- the pharmacy profile, including the licence number, the licence expiry date and the
-- "DHA licensed" / "NABIDH connected" switches. The portal showed those as facts ("DHA Licensed",
-- "Connected"), and both switches defaulted to on, so a new pharmacy looked licensed and connected.
--
-- This trigger keeps the rules as they are (no DROP) and, for app users who are not super admins:
--   * on UPDATE: refuses a change to license_number, license_valid_until, dha_connected or
--     nabidh_connected (the other fields, such as name, address, contact details, hours and logo,
--     stay editable);
--   * on INSERT: starts the profile with no licence on file and both switches off.
-- The two switches now default to off. Existing values are not changed (a CeenAiX administrator
-- confirms them). Database functions that run as their owner and super admins are not affected.
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.guard_pharmacy_facility_profile_regulatory()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_current_user_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.license_number := '';
    NEW.license_valid_until := NULL;
    NEW.dha_connected := false;
    NEW.nabidh_connected := false;
    RETURN NEW;
  END IF;

  IF NEW.license_number IS DISTINCT FROM OLD.license_number
     OR NEW.license_valid_until IS DISTINCT FROM OLD.license_valid_until
     OR NEW.dha_connected IS DISTINCT FROM OLD.dha_connected
     OR NEW.nabidh_connected IS DISTINCT FROM OLD.nabidh_connected THEN
    RAISE EXCEPTION 'The licence and the DHA / NABIDH status are set by a CeenAiX administrator.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_guard_pharmacy_facility_profile_regulatory'
      AND tgrelid = 'public.pharmacy_facility_profiles'::regclass
  ) THEN
    CREATE TRIGGER trg_guard_pharmacy_facility_profile_regulatory
      BEFORE INSERT OR UPDATE ON public.pharmacy_facility_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.guard_pharmacy_facility_profile_regulatory();
  END IF;
END;
$$;

ALTER TABLE public.pharmacy_facility_profiles ALTER COLUMN dha_connected SET DEFAULT false;
ALTER TABLE public.pharmacy_facility_profiles ALTER COLUMN nabidh_connected SET DEFAULT false;
