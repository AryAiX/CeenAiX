-- 20260617000002_add_instrument_to_lab_order_items.sql

-- The lab results entry page lets technicians select which instrument 
-- (e.g. Roche Cobas 6000) was used to run a test, but this was only 
-- used for matching QC runs on screen and never actually saved with 
-- the result. Add a nullable column so the instrument used can be 
-- recorded alongside each result.

ALTER TABLE public.lab_order_items
  ADD COLUMN IF NOT EXISTS instrument text;

COMMENT ON COLUMN public.lab_order_items.instrument IS 'Instrument used to produce this result (e.g. "Roche Cobas 6000", "Manual Entry")';