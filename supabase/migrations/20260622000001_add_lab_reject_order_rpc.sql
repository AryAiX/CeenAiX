CREATE OR REPLACE FUNCTION public.lab_reject_order(
  target_order_id uuid,
  rejection_reason text DEFAULT 'No reason provided'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lab_id uuid;
  v_order_assigned_lab_id uuid;
BEGIN
  -- Get the current user's lab
  SELECT ls.lab_id INTO v_lab_id
  FROM lab_staff ls
  JOIN user_profiles up ON up.user_id = auth.uid()
  WHERE ls.user_id = auth.uid()
    AND ls.is_active = true
    AND up.role = 'lab'
  LIMIT 1;

  IF v_lab_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized: user is not active lab staff';
  END IF;

  -- Check the order exists and is accessible to this lab
  SELECT assigned_lab_id INTO v_order_assigned_lab_id
  FROM lab_orders
  WHERE id = target_order_id
    AND is_deleted = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or already deleted';
  END IF;

  IF v_order_assigned_lab_id IS NOT NULL AND v_order_assigned_lab_id != v_lab_id THEN
    RAISE EXCEPTION 'Not authorized: order belongs to a different lab';
  END IF;

  -- Soft delete the order with the rejection reason
  UPDATE lab_orders
  SET
    is_deleted = true,
    deleted_at = now(),
    clinical_notes = '[REJECTED] ' || rejection_reason
  WHERE id = target_order_id;
END;
$$;