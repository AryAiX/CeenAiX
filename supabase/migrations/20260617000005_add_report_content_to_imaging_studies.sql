-- 20260617000005_add_report_content_to_imaging_studies.sql

-- The radiology reporting workspace's Findings, Impression, and 
-- Recommendations textareas were purely decorative — their content was 
-- never read or saved anywhere, and worse, they had fabricated default 
-- text that would be silently submitted as real medical findings if a 
-- radiologist didn't manually clear it first. This adds real columns so 
-- report content can actually be persisted.

ALTER TABLE public.lab_portal_imaging_studies
  ADD COLUMN IF NOT EXISTS findings text,
  ADD COLUMN IF NOT EXISTS impression text,
  ADD COLUMN IF NOT EXISTS recommendations text,
  ADD COLUMN IF NOT EXISTS report_checklist jsonb;

COMMENT ON COLUMN public.lab_portal_imaging_studies.findings IS 'Radiologist-entered findings text for this study''s report';
COMMENT ON COLUMN public.lab_portal_imaging_studies.impression IS 'Radiologist-entered impression/conclusion text for this study''s report';
COMMENT ON COLUMN public.lab_portal_imaging_studies.recommendations IS 'Radiologist-entered follow-up recommendations for this study''s report';
COMMENT ON COLUMN public.lab_portal_imaging_studies.report_checklist IS 'JSON object recording which manual report checklist items were completed (e.g. {"anatomy": true, "impression": true})';