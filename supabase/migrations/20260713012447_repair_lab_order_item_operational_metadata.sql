-- Repair operational lab-item metadata columns that exist on dev but were
-- missing from ceenaix-prod because of historical migration drift.
ALTER TABLE public.lab_order_items
  ADD COLUMN IF NOT EXISTS specimen_type text,
  ADD COLUMN IF NOT EXISTS target_tat text,
  ADD COLUMN IF NOT EXISTS reference_min_value text,
  ADD COLUMN IF NOT EXISTS reference_max_value text;

NOTIFY pgrst, 'reload schema';
