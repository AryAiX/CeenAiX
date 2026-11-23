-- QA-205: doctor fee changes at a clinic were not recorded and not checked.
--
-- The clinic Doctors page saved consultation_fee straight into facility_staff: nothing was written
-- to clinic_pricing_audit_log (the history only existed if a page remembered to call
-- log_clinic_pricing_change afterwards), and empty or negative amounts were accepted.
--
-- Now:
--   * a trigger writes one clinic_pricing_audit_log row for every change of consultation_fee,
--     telemedicine_fee or follow_up_fee (who, old value, new value), whichever screen or API call
--     made it. Changes without a signed-in user (seeds, scripts) are skipped, because changed_by is
--     required. SECURITY DEFINER so it can always write the history row.
--   * a CHECK keeps fees empty (not set) or between 0 and 100,000. Added NOT VALID: it applies to
--     new and changed rows and does not fail on any existing data.
-- No DROP. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.log_facility_staff_fee_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.clinic_pricing_audit_log (facility_id, changed_by, entity_type, entity_id, field_name, old_value, new_value)
  SELECT NEW.facility_id, auth.uid(), 'facility_staff', NEW.id, f.field, f.old_value, f.new_value
  FROM (VALUES
    ('consultation_fee', to_jsonb(OLD.consultation_fee), to_jsonb(NEW.consultation_fee)),
    ('telemedicine_fee', to_jsonb(OLD.telemedicine_fee), to_jsonb(NEW.telemedicine_fee)),
    ('follow_up_fee',    to_jsonb(OLD.follow_up_fee),    to_jsonb(NEW.follow_up_fee))
  ) AS f(field, old_value, new_value)
  WHERE f.old_value IS DISTINCT FROM f.new_value;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_facility_staff_fee_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_facility_staff_fee_changes() FROM anon;

CREATE OR REPLACE TRIGGER trg_log_facility_staff_fee_changes
  AFTER UPDATE OF consultation_fee, telemedicine_fee, follow_up_fee ON public.facility_staff
  FOR EACH ROW EXECUTE FUNCTION public.log_facility_staff_fee_changes();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'facility_staff_fees_range_chk'
      AND conrelid = 'public.facility_staff'::regclass
  ) THEN
    ALTER TABLE public.facility_staff
      ADD CONSTRAINT facility_staff_fees_range_chk CHECK (
        (consultation_fee IS NULL OR consultation_fee BETWEEN 0 AND 100000)
        AND (telemedicine_fee IS NULL OR telemedicine_fee BETWEEN 0 AND 100000)
        AND (follow_up_fee IS NULL OR follow_up_fee BETWEEN 0 AND 100000)
      ) NOT VALID;
  END IF;
END $$;
