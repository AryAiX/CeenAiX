CREATE OR REPLACE FUNCTION public.lab_claim_order(target_order_id uuid)
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

  -- Check the order exists and is claimable
  SELECT * INTO updated_row
  FROM public.lab_orders lo
  WHERE lo.id = target_order_id
    AND NOT lo.is_deleted
    AND (lo.assigned_lab_id IS NULL OR lo.assigned_lab_id = current_lab);

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Order not found or already claimed by another lab.' USING ERRCODE = 'P0001';
  END IF;

  -- Assign to this lab if not already assigned
  UPDATE public.lab_orders lo
  SET assigned_lab_id = current_lab,
      updated_at = now()
  WHERE lo.id = target_order_id;

  -- Return the updated row
  SELECT * INTO updated_row FROM public.lab_orders WHERE id = target_order_id;
  RETURN updated_row;
END;
$$;