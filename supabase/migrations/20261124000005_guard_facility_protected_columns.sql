-- QA-230: a clinic admin could change any column of their clinic's facility row.
--
-- "facilities_clinic_admin_update" lets a clinic admin UPDATE their own facility, and a row policy
-- cannot limit columns. Through the API (not the Settings page) a clinic admin could therefore:
--   * switch their clinic back on after CeenAiX switched it off, or undo a delete
--     (is_active, is_deleted, deleted_at);
--   * set their own DHA status, licence number and licence expiry (dha_status, license_number,
--     license_expiry);
--   * set the rating and review count that Find a Clinic shows to the public (rating, total_reviews);
--   * change facility_type (a clinic that is not 'clinic' disappears from Find a Clinic) or move the
--     facility to another organisation (organization_id).
--
-- Now a trigger refuses changes to those columns made directly through the API
-- (current_user = 'authenticated') unless the user is a super admin. The database's own functions
-- (SECURITY DEFINER, e.g. the admin "switch clinic on / off"), scripts and seeds are not affected,
-- because current_user is then the function owner. Every other column (name, phone, email,
-- address, working hours, settings, …) stays editable by the clinic admin, as before.
-- No DROP. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.guard_facility_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user <> 'authenticated' OR public.is_current_user_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.dha_status IS DISTINCT FROM OLD.dha_status
     OR NEW.license_number IS DISTINCT FROM OLD.license_number
     OR NEW.license_expiry IS DISTINCT FROM OLD.license_expiry
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.total_reviews IS DISTINCT FROM OLD.total_reviews
     OR NEW.facility_type IS DISTINCT FROM OLD.facility_type
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only CeenAiX can change the clinic status, licence, rating, type or organisation.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_facility_protected_columns() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_facility_protected_columns() FROM anon;

CREATE OR REPLACE TRIGGER trg_guard_facility_protected_columns
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.guard_facility_protected_columns();
