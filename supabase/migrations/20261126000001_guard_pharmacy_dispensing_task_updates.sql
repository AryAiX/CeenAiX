-- QA-255: pharmacy staff could change any column of a dispensing task, and make any status jump.
--
-- The update rule "pharmacy_dispensing_tasks_ops_update" lets any member of the pharmacy update a
-- task, with no limit on what changes. Through the API a member could rewrite the patient, the
-- medicine, the quantity, the copay, patient_user_id (who gets the notifications) or the pharmacy
-- itself, and move a task backwards (dispensed -> new) or forwards without the steps in between.
--
-- This trigger keeps the rule as it is (no DROP) and checks every update made by an app user who is
-- not a super admin:
--   * only workflow_status, hold_reason_code and hold_note may change (updated_at is set here);
--   * allowed status changes, matching the Dispensing page:
--       new         -> in_progress, on_hold
--       in_progress -> dispensed, on_hold
--       on_hold     -> in_progress
--       dispensed   -> picked_up      (handed to the patient, QA-256)
--     A task may also keep its status (for example to correct the hold note).
--     Dispensed -> anything else, picked up and cancelled are final for pharmacy staff.
--   * on hold needs one of the known reasons; the note is at most 1,000 characters; other statuses
--     have no hold reason or note.
-- Database functions that run as their owner (SECURITY DEFINER, for example the trigger that creates
-- the tasks) and super admins are not affected. Safe to run more than once.

CREATE OR REPLACE FUNCTION public.guard_pharmacy_dispensing_task_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_current_user_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.prescription_id IS DISTINCT FROM OLD.prescription_id
     OR NEW.prescription_item_id IS DISTINCT FROM OLD.prescription_item_id
     OR NEW.external_ref IS DISTINCT FROM OLD.external_ref
     OR NEW.patient_name IS DISTINCT FROM OLD.patient_name
     OR NEW.patient_user_id IS DISTINCT FROM OLD.patient_user_id
     OR NEW.prescriber_name IS DISTINCT FROM OLD.prescriber_name
     OR NEW.medication_name IS DISTINCT FROM OLD.medication_name
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.received_at IS DISTINCT FROM OLD.received_at
     OR NEW.insurance_provider IS DISTINCT FROM OLD.insurance_provider
     OR NEW.copay_aed IS DISTINCT FROM OLD.copay_aed
     OR NEW.allergy_flag IS DISTINCT FROM OLD.allergy_flag
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only the status and the hold reason of a prescription can be changed.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.workflow_status IS DISTINCT FROM OLD.workflow_status
     AND NOT (
       (OLD.workflow_status = 'new' AND NEW.workflow_status IN ('in_progress', 'on_hold'))
       OR (OLD.workflow_status = 'in_progress' AND NEW.workflow_status IN ('dispensed', 'on_hold'))
       OR (OLD.workflow_status = 'on_hold' AND NEW.workflow_status = 'in_progress')
       OR (OLD.workflow_status = 'dispensed' AND NEW.workflow_status = 'picked_up')
     )
  THEN
    RAISE EXCEPTION 'A prescription cannot go from % to %.', OLD.workflow_status, NEW.workflow_status
      USING ERRCODE = '42501';
  END IF;

  IF NEW.workflow_status = 'on_hold' THEN
    IF NEW.hold_reason_code IS NULL OR NEW.hold_reason_code NOT IN (
      'out_of_stock',
      'insurance_issue',
      'allergy_concern',
      'doctor_clarification',
      'substitution_required',
      'incomplete_prescription',
      'patient_not_reachable',
      'other'
    ) THEN
      RAISE EXCEPTION 'Choose a reason for the hold.' USING ERRCODE = '22023';
    END IF;
    IF char_length(coalesce(NEW.hold_note, '')) > 1000 THEN
      RAISE EXCEPTION 'The hold note can be at most 1000 characters.' USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.hold_reason_code IS NOT NULL OR NEW.hold_note IS NOT NULL THEN
    RAISE EXCEPTION 'Only a prescription on hold has a hold reason.' USING ERRCODE = '22023';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_pharmacy_dispensing_task_update() IS
  'QA-255: pharmacy staff may only change the status (allowed steps only) and the hold reason / note of a dispensing task.';

REVOKE ALL ON FUNCTION public.guard_pharmacy_dispensing_task_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_pharmacy_dispensing_task_update() FROM anon;
REVOKE ALL ON FUNCTION public.guard_pharmacy_dispensing_task_update() FROM authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.pharmacy_dispensing_tasks'::regclass
      AND tgname = 'trg_guard_pharmacy_dispensing_task_update'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_guard_pharmacy_dispensing_task_update
      BEFORE UPDATE ON public.pharmacy_dispensing_tasks
      FOR EACH ROW
      EXECUTE FUNCTION public.guard_pharmacy_dispensing_task_update();
  END IF;
END;
$$;
