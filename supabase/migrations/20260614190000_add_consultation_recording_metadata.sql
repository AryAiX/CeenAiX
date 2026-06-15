-- Store AI scribe setup/reference metadata directly on the recording.
-- Idempotent so it can be applied safely after existing consultation recording deployments.

ALTER TABLE consultation_recordings
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_consultation_recordings_metadata_gin
  ON consultation_recordings
  USING gin (metadata);
