CREATE OR REPLACE FUNCTION public.lab_start_processing(
  target_order_id uuid,
  p_instrument_name text DEFAULT NULL
)
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
  SET status = 'processing'::lab_order_status,
      sample_received_at = COALESCE(lo.sample_received_at, now()),
      updated_at = now()
  WHERE lo.id = target_order_id
    AND NOT lo.is_deleted
    AND lo.assigned_lab_id = current_lab
    AND lo.status IN ('ordered', 'collected')
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Order not found or not claimed by your lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_order_items
  SET status = CASE WHEN status IN ('ordered', 'collected') THEN 'processing'::lab_order_status ELSE status END,
      updated_at = now()
  WHERE lab_order_id = updated_row.id;

  -- Set instrument as running if provided
  IF p_instrument_name IS NOT NULL THEN
    UPDATE public.lab_portal_equipment
    SET is_running = true,
        updated_at = now()
    WHERE lab_id = current_lab
      AND department = 'laboratory'
      AND name = p_instrument_name;
  END IF;

  RETURN updated_row;
END;
$$;