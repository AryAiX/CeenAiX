-- QA-105: lab_order_items.status_category defaulted to 'normal', so a test with
-- no result (and any result saved through the 5-argument lab_save_item_result,
-- which never sets the category) could show "Normal" to the patient.
--
-- From now on NULL means "no category yet". The patient app shows Pending when
-- the test has no result value, and otherwise uses the lab's is_abnormal flag.
-- The allowed values (lab_order_items_status_category_check) are unchanged.

ALTER TABLE public.lab_order_items
  ALTER COLUMN status_category DROP DEFAULT,
  ALTER COLUMN status_category DROP NOT NULL;

-- Backfill: only rows still on the old default that have no result value.
-- Rows with a value, or with any other category, are left as they are.
UPDATE public.lab_order_items
SET status_category = NULL
WHERE status_category = 'normal'
  AND numeric_value IS NULL
  AND NULLIF(btrim(result_value), '') IS NULL;

COMMENT ON COLUMN public.lab_order_items.status_category IS
  'Result category set by the lab or doctor. NULL = not categorised yet: shown as Pending when there is no result value, otherwise derived from is_abnormal.';
