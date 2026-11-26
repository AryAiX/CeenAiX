-- QA-264: anyone could read, add, change and delete every pharmacy's stock batches.
--
-- 20260427054000 switched on row security for the pharmacy tables in a loop, but
-- pharmacy_inventory_batches was not in the list (it has no organization_id of its own; it belongs
-- to a pharmacy through its item). Its row security stayed OFF, with no rules, and the API roles
-- keep their default rights, so even a visitor who is not signed in (anon key) could read, add,
-- change and delete the batches of every pharmacy: quantities, expiry dates and unit costs.
--
-- This switches row security on and adds the same rules the items have:
--   * read: super admins, and members of the pharmacy that owns the batch's item;
--   * add / change / delete: super admins only (as for items; the portal does not edit stock yet).
-- TRUNCATE ignores row security, so the API roles lose that right on this table, and visitors who
-- are not signed in lose every right on it. Nothing is dropped. Safe to run more than once.

ALTER TABLE public.pharmacy_inventory_batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pharmacy_inventory_batches'
      AND policyname = 'pharmacy_inventory_batches_ops_read'
  ) THEN
    CREATE POLICY "pharmacy_inventory_batches_ops_read"
      ON public.pharmacy_inventory_batches
      FOR SELECT
      TO authenticated
      USING (
        public.is_current_user_super_admin()
        OR EXISTS (
          SELECT 1
          FROM public.pharmacy_inventory_items i
          WHERE i.id = pharmacy_inventory_batches.inventory_item_id
            AND public.is_current_user_ops_org(i.organization_id, 'pharmacy')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pharmacy_inventory_batches'
      AND policyname = 'pharmacy_inventory_batches_admin_manage'
  ) THEN
    CREATE POLICY "pharmacy_inventory_batches_admin_manage"
      ON public.pharmacy_inventory_batches
      FOR ALL
      TO authenticated
      USING (public.is_current_user_super_admin())
      WITH CHECK (public.is_current_user_super_admin());
  END IF;
END;
$$;

REVOKE ALL ON public.pharmacy_inventory_batches FROM anon;
REVOKE TRUNCATE ON public.pharmacy_inventory_batches FROM authenticated;
