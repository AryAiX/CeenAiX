-- Patient pickup confirmation writes `picked_up`; keep the workflow status
-- constraint aligned with the UI and hook-level mutation.
ALTER TABLE public.pharmacy_dispensing_tasks
  DROP CONSTRAINT IF EXISTS pharmacy_dispensing_tasks_status_chk;

ALTER TABLE public.pharmacy_dispensing_tasks
  ADD CONSTRAINT pharmacy_dispensing_tasks_status_chk
  CHECK (workflow_status IN ('new', 'in_progress', 'on_hold', 'dispensed', 'picked_up', 'cancelled'));
