CREATE OR REPLACE FUNCTION public.lab_confirm_specimen(target_order_id uuid)
RETURNS lab_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_lab uuid;
  updated_row public.lab_orders%ROWTYPE;
BEGIN
  current_lab := public.current_user_lab_id();
  IF current_lab IS NULL THEN
    RAISE EXCEPTION 'You are not a member of any lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_orders lo
  SET status = 'collected'::lab_order_status,
      sample_collection_at = now(),
      updated_at = now()
  WHERE lo.id = target_order_id
    AND NOT lo.is_deleted
    AND lo.assigned_lab_id = current_lab
    AND lo.status = 'ordered'
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Order not found, not claimed by your lab, or already past Received stage.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_order_items
  SET status = 'collected'::lab_order_status,
      updated_at = now()
  WHERE lab_order_id = updated_row.id
    AND status = 'ordered';

  RETURN updated_row;
END;
$$;