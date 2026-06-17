-- 20260617000004_add_soft_delete_to_imaging_studies.sql

-- lab_portal_imaging_studies currently has no soft-delete mechanism, 
-- but the lab portal's Reject button was incorrectly calling rejectOrder 
-- (which only updates lab_orders) against imaging study IDs, which 
-- belong to a completely separate table. This adds the same soft-delete 
-- pattern used by lab_orders so imaging studies can be properly rejected 
-- and later reviewed in a dedicated Rejected tab.

ALTER TABLE public.lab_portal_imaging_studies
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.lab_portal_imaging_studies.is_deleted IS 'Soft-delete flag, set true when a lab rejects an imaging order';
COMMENT ON COLUMN public.lab_portal_imaging_studies.deleted_at IS 'Timestamp when the imaging study was rejected/soft-deleted';
COMMENT ON COLUMN public.lab_portal_imaging_studies.rejection_reason IS 'Reason provided when the imaging study was rejected';