-- QA-213: clinic service changes were not recorded or checked, and services could be deleted for good.
--
-- The clinic Pricing page saves straight into facility_services. Nothing was written to
-- clinic_pricing_audit_log (QA-205 only covered doctor fees), the database accepted a negative or
-- huge price, a duration of 0 or less and an empty name, and the clinic rule (FOR ALL) also let a
-- clinic manager permanently DELETE a service through the API, which removes the doctor price
-- overrides linked to it (ON DELETE CASCADE). The page itself only ever hides a service
-- (is_deleted = true).
--
-- Now:
--   * a trigger writes clinic_pricing_audit_log rows (entity_type 'facility_service') when a service
--     is added, and for every change of price, duration, English / Arabic name, category,
--     on / off (is_active) and removed (is_deleted): who, old value, new value. Changes without a
--     signed-in user (seeds, scripts) are skipped, because changed_by is required. SECURITY DEFINER
--     so it can always write the history row (direct inserts are super admin only since QA-212).
--   * a CHECK keeps the price between 0 and 100,000, the duration between 5 and 480 minutes and
--     both names non-empty. Added NOT VALID: it applies to new and changed rows and does not fail
--     on any existing data.
--   * permanent deletes from the app / API are blocked (super admins and the database's own
--     functions, seeds and cascades are not affected). Removing a service keeps hiding it.
-- No DROP. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.log_facility_service_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.clinic_pricing_audit_log (facility_id, changed_by, entity_type, entity_id, field_name, old_value, new_value)
    VALUES (
      NEW.facility_id, auth.uid(), 'facility_service', NEW.id, 'created', NULL,
      jsonb_build_object(
        'name_en', NEW.name_en,
        'default_price', NEW.default_price,
        'default_duration_min', NEW.default_duration_min,
        'category', NEW.category,
        'is_active', NEW.is_active
      )
    );
    RETURN NEW;
  END IF;

  INSERT INTO public.clinic_pricing_audit_log (facility_id, changed_by, entity_type, entity_id, field_name, old_value, new_value)
  SELECT NEW.facility_id, auth.uid(), 'facility_service', NEW.id, f.field, f.old_value, f.new_value
  FROM (VALUES
    ('default_price',        to_jsonb(OLD.default_price),        to_jsonb(NEW.default_price)),
    ('default_duration_min', to_jsonb(OLD.default_duration_min), to_jsonb(NEW.default_duration_min)),
    ('name_en',              to_jsonb(OLD.name_en),              to_jsonb(NEW.name_en)),
    ('name_ar',              to_jsonb(OLD.name_ar),              to_jsonb(NEW.name_ar)),
    ('category',             to_jsonb(OLD.category),             to_jsonb(NEW.category)),
    ('is_active',            to_jsonb(OLD.is_active),            to_jsonb(NEW.is_active)),
    ('is_deleted',           to_jsonb(OLD.is_deleted),           to_jsonb(NEW.is_deleted))
  ) AS f(field, old_value, new_value)
  WHERE f.old_value IS DISTINCT FROM f.new_value;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_facility_service_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_facility_service_changes() FROM anon;

CREATE OR REPLACE TRIGGER trg_log_facility_service_changes
  AFTER INSERT OR UPDATE ON public.facility_services
  FOR EACH ROW EXECUTE FUNCTION public.log_facility_service_changes();

-- Blocks permanent deletes made directly through the API (current_user = 'authenticated'),
-- except by a super admin. Inside SECURITY DEFINER functions and for cascades current_user is the
-- owner, so those are not affected.
CREATE OR REPLACE FUNCTION public.guard_facility_service_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.is_current_user_super_admin() THEN
    RAISE EXCEPTION 'Services cannot be deleted. Remove the service to hide it instead.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_facility_service_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_facility_service_delete() FROM anon;

CREATE OR REPLACE TRIGGER trg_guard_facility_service_delete
  BEFORE DELETE ON public.facility_services
  FOR EACH ROW EXECUTE FUNCTION public.guard_facility_service_delete();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'facility_services_values_chk'
      AND conrelid = 'public.facility_services'::regclass
  ) THEN
    ALTER TABLE public.facility_services
      ADD CONSTRAINT facility_services_values_chk CHECK (
        default_price BETWEEN 0 AND 100000
        AND default_duration_min BETWEEN 5 AND 480
        AND btrim(name_en) <> ''
        AND btrim(name_ar) <> ''
      ) NOT VALID;
  END IF;
END $$;
