-- QA-168: DHA licence verification could be bypassed.
--
-- 1. A verified doctor could change their licence number on the Profile page and stay
--    "DHA verified", because nothing reset the flag when the number changed. The clinic
--    invite function (clinic_invite_doctor) can also overwrite a doctor's licence number.
-- 2. The doctor_profiles rule "doctors_own_doctor_profile" lets a doctor write every column of
--    their own row, so a doctor could set dha_license_verified = true on themselves through the
--    API, without an admin.
--
-- This trigger, on every insert and update of doctor_profiles:
--   * keeps dha_license_verified / dha_verified_at as they were unless the change comes from a
--     super admin or from trusted server-side code (service role, SQL editor, migrations);
--     a new row from anyone else always starts unverified;
--   * turns verification off when the licence number changes, unless the same update also sets
--     the verification itself (an admin re-verifying with the new number).
-- No table rules (RLS) are changed and no data is changed when this file runs.

CREATE OR REPLACE FUNCTION public.guard_doctor_licence_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_trusted boolean;
BEGIN
  -- No signed-in user (SQL editor, migrations, cron) or the service role: trusted.
  -- Otherwise only a super admin may set the verification.
  IF auth.uid() IS NULL OR coalesce(auth.role(), '') = 'service_role' THEN
    v_trusted := true;
  ELSE
    v_trusted := public.is_current_user_super_admin();
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT v_trusted THEN
      NEW.dha_license_verified := false;
      NEW.dha_verified_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT v_trusted THEN
    NEW.dha_license_verified := OLD.dha_license_verified;
    NEW.dha_verified_at := OLD.dha_verified_at;
  END IF;

  IF NEW.license_number IS DISTINCT FROM OLD.license_number
     AND NEW.dha_license_verified IS NOT DISTINCT FROM OLD.dha_license_verified
     AND NEW.dha_verified_at IS NOT DISTINCT FROM OLD.dha_verified_at THEN
    NEW.dha_license_verified := false;
    NEW.dha_verified_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_doctor_licence_verification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_doctor_licence_verification() FROM anon;

CREATE OR REPLACE TRIGGER trg_doctor_profiles_guard_licence_verification
  BEFORE INSERT OR UPDATE ON public.doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_doctor_licence_verification();

COMMENT ON FUNCTION public.guard_doctor_licence_verification() IS
  'QA-168: only super admins or server-side code can set DHA verification on doctor_profiles; changing the licence number turns verification off.';
