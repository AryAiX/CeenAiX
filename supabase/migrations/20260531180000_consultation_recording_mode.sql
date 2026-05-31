-- AI Consultation Recording: distinguish live (near-real-time) vs recorded sessions.
-- Idempotent so it is safe to re-apply.

ALTER TABLE consultation_recordings
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'recorded';
