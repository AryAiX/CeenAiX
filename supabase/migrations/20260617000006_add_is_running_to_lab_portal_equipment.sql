-- 20260617000006_add_is_running_to_lab_portal_equipment.sql

-- The equipment page was determining whether a piece of equipment was 
-- actively running a test/scan by regex-matching the words "remaining" 
-- or "ongoing" inside the free-text activeRemainingLabel field. This is 
-- fragile — any differently-phrased label silently breaks the status 
-- display. Add a real boolean column so this can be determined reliably.

ALTER TABLE public.lab_portal_equipment
  ADD COLUMN IF NOT EXISTS is_running boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.lab_portal_equipment.is_running IS 'True if the equipment is actively running a test/scan right now, used to display SCANNING/RUNNING status instead of relying on text-matching activeRemainingLabel';

-- Backfill existing rows using the same text-matching heuristic that
-- was previously done in the frontend, so current data isn't lost —
-- this is a one-time migration of the existing (fragile) signal into
-- the new reliable column. Going forward, this should be set explicitly
-- whenever equipment status is updated.
UPDATE public.lab_portal_equipment
SET is_running = true
WHERE active_remaining_label ~* '(remaining|ongoing)';