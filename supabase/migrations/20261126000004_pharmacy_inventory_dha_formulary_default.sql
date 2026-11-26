-- QA-266: a new inventory item claimed to be on the DHA formulary unless someone said otherwise.
--
-- pharmacy_inventory_items.is_dha_formulary was created with DEFAULT true, so any item added
-- without that check was shown with the "DHA formulary" badge. That is a compliance claim, so it
-- must come from someone who checked: new items now start as "not on the formulary" until set.
-- Existing rows are not changed (their values were set when they were added). Safe to run again.

ALTER TABLE public.pharmacy_inventory_items
  ALTER COLUMN is_dha_formulary SET DEFAULT false;

COMMENT ON COLUMN public.pharmacy_inventory_items.is_dha_formulary IS
  'QA-266: true only when someone confirmed the item is on the DHA formulary (default false).';
