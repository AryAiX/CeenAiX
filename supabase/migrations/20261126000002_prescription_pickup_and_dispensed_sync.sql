-- QA-256: "Picked up" could never happen, and dispensing never reached the doctor's and patient's pages.
--
-- 1. The patient's "I picked it up" wrote to pharmacy_dispensing_tasks and prescription_items, but
--    patients have no update rule on either, so nothing changed and no error was shown.
--    -> patient_confirm_prescription_pickup(prescription): only the prescription's own patient, and
--       only medicines that are dispensed. (The pharmacy marks the handover itself through the
--       QA-255 guard: dispensed -> picked_up.)
-- 2. prescription_items.is_dispensed (what the doctor's and patient's pages show as "Dispensed") was
--    never set by the pharmacy flow, because the pharmacy cannot update the doctor's lines.
--    -> trigger: when a task becomes dispensed or picked up, its prescription line is marked
--       dispensed. Lines of tasks already dispensed are filled in once below.
-- 3. The "ready for pickup" notification waited for every task to be exactly "dispensed", so one
--    medicine already picked up or cancelled stopped it for good, and cancelled medicines were
--    listed as ready.
--    -> picked up and cancelled medicines no longer count as waiting; cancelled ones are not listed.
--       Everything else in the notification is unchanged (English, like every database notification).
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 3. "Ready for pickup" notification (same function, two conditions changed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_patient_prescription_dispensed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_patient_id uuid;
  v_pharmacy_name text;
  v_pending integer;
  v_meds text;
BEGIN
  IF NEW.workflow_status <> 'dispensed'
     OR (OLD.workflow_status IS NOT DISTINCT FROM 'dispensed') THEN
    RETURN NEW;
  END IF;

  IF NEW.prescription_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.patient_id
    INTO v_patient_id
    FROM public.prescriptions p
   WHERE p.id = NEW.prescription_id
     AND NOT p.is_deleted
   LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- QA-256: picked up and cancelled medicines are not waiting for anything.
  SELECT count(*)::integer
    INTO v_pending
    FROM public.pharmacy_dispensing_tasks t
   WHERE t.prescription_id = NEW.prescription_id
     AND t.workflow_status NOT IN ('dispensed', 'picked_up', 'cancelled');

  IF v_pending > 0 THEN
    RETURN NEW;
  END IF;

  SELECT o.name
    INTO v_pharmacy_name
    FROM public.organizations o
   WHERE o.id = NEW.organization_id
   LIMIT 1;

  -- QA-256: cancelled medicines are not ready for pickup.
  SELECT string_agg(DISTINCT t.medication_name, ', ' ORDER BY t.medication_name)
    INTO v_meds
    FROM public.pharmacy_dispensing_tasks t
   WHERE t.prescription_id = NEW.prescription_id
     AND t.workflow_status <> 'cancelled';

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    v_patient_id,
    'medication',
    'Your medication is ready for pickup',
    COALESCE(v_meds, 'Your prescription') || ' is ready at '
      || COALESCE(v_pharmacy_name, 'your pharmacy') || '. Please visit to collect.',
    '/patient/prescriptions'
  );

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Dispensed at the pharmacy -> "Dispensed" on the doctor's line
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_prescription_item_dispensed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.prescription_item_id IS NOT NULL
     AND NEW.workflow_status IN ('dispensed', 'picked_up')
     AND OLD.workflow_status IS DISTINCT FROM NEW.workflow_status
  THEN
    UPDATE public.prescription_items
       SET is_dispensed = true
     WHERE id = NEW.prescription_item_id
       AND is_dispensed = false;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_prescription_item_dispensed() IS
  'QA-256: when the pharmacy dispenses a medicine (or it is picked up), the doctor''s prescription line shows it as dispensed.';

REVOKE ALL ON FUNCTION public.sync_prescription_item_dispensed() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_prescription_item_dispensed() FROM anon;
REVOKE ALL ON FUNCTION public.sync_prescription_item_dispensed() FROM authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.pharmacy_dispensing_tasks'::regclass
      AND tgname = 'trg_sync_prescription_item_dispensed'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_sync_prescription_item_dispensed
      AFTER UPDATE OF workflow_status ON public.pharmacy_dispensing_tasks
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_prescription_item_dispensed();
  END IF;
END;
$$;

-- One-time fill: lines whose medicine the pharmacy already dispensed.
UPDATE public.prescription_items pi
   SET is_dispensed = true
  FROM public.pharmacy_dispensing_tasks t
 WHERE t.prescription_item_id = pi.id
   AND t.workflow_status IN ('dispensed', 'picked_up')
   AND pi.is_dispensed = false;

-- ---------------------------------------------------------------------------
-- 1. The patient confirms they collected their medicines
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.patient_confirm_prescription_pickup(p_prescription_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.prescriptions p
    WHERE p.id = p_prescription_id
      AND p.patient_id = auth.uid()
      AND NOT p.is_deleted
  ) THEN
    RAISE EXCEPTION 'Prescription not found.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.pharmacy_dispensing_tasks
     SET workflow_status = 'picked_up',
         hold_reason_code = NULL,
         hold_note = NULL,
         updated_at = now()
   WHERE prescription_id = p_prescription_id
     AND workflow_status = 'dispensed';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nothing from this prescription is ready for pickup.' USING ERRCODE = '22023';
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.patient_confirm_prescription_pickup(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.patient_confirm_prescription_pickup(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.patient_confirm_prescription_pickup(uuid) TO authenticated;

COMMENT ON FUNCTION public.patient_confirm_prescription_pickup(uuid) IS
  'QA-256: the prescription''s own patient confirms they collected the medicines that are dispensed. Returns how many medicines were marked picked up.';
