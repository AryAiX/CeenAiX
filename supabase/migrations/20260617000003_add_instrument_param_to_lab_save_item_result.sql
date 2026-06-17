-- 20260617000003_add_instrument_param_to_lab_save_item_result.sql

-- Extends the 5-parameter lab_save_item_result function (used by both
-- use-lab-ops-portal.ts and use-lab-dashboard.ts) to accept and persist
-- which instrument was used to produce a result. The new parameter is
-- optional with a default of NULL, so existing callers continue to work
-- unchanged until they're updated to pass it.
--
-- Note: a separate, unrelated 14-parameter overload of this function
-- also exists (added in 20260420022518_extend_lab_results_for_patient_ui.sql)
-- but is not currently called by any reviewed frontend code. This
-- migration does not touch that overload.

CREATE OR REPLACE FUNCTION public.lab_save_item_result(
  target_item_id uuid,
  result_value text,
  result_unit text,
  reference_range text,
  is_abnormal boolean,
  instrument text DEFAULT NULL
)
RETURNS lab_order_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_lab uuid;
  target_order_id uuid;
  updated_row public.lab_order_items%ROWTYPE;
BEGIN
  current_lab := public.current_user_lab_id();
  IF current_lab IS NULL THEN
    RAISE EXCEPTION 'You are not a member of any lab.' USING ERRCODE = 'P0001';
  END IF;
  SELECT loi.lab_order_id INTO target_order_id
  FROM public.lab_order_items loi
  JOIN public.lab_orders lo ON lo.id = loi.lab_order_id
  WHERE loi.id = target_item_id
    AND NOT lo.is_deleted
    AND lo.assigned_lab_id = current_lab
  LIMIT 1;
  IF target_order_id IS NULL THEN
    RAISE EXCEPTION 'Lab item not found or not assigned to your lab.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.lab_order_items loi
  SET result_value = lab_save_item_result.result_value,
      result_unit = lab_save_item_result.result_unit,
      reference_range = lab_save_item_result.reference_range,
      is_abnormal = lab_save_item_result.is_abnormal,
      instrument = lab_save_item_result.instrument,
      status = 'resulted'::lab_order_status,
      resulted_at = COALESCE(loi.resulted_at, now()),
      updated_at = now()
  WHERE loi.id = target_item_id
  RETURNING * INTO updated_row;
  UPDATE public.lab_orders lo
  SET status = 'resulted'::lab_order_status,
      updated_at = now()
  WHERE lo.id = target_order_id
    AND lo.status IN ('ordered', 'collected', 'processing')
    AND NOT EXISTS (
      SELECT 1 FROM public.lab_order_items loi2
      WHERE loi2.lab_order_id = target_order_id
        AND loi2.status NOT IN ('resulted', 'reviewed')
    );
  RETURN updated_row;
END;
$function$;