CREATE OR REPLACE FUNCTION public.lab_release_order_with_pin(
  target_order_id uuid,
  technician_pin text
)
RETURNS lab_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_lab uuid;
  stored_pin text;
  incomplete_count int;
  updated_row public.lab_orders%ROWTYPE;
BEGIN
  current_lab := public.current_user_lab_id();
  IF current_lab IS NULL THEN
    RAISE EXCEPTION 'You are not a member of any lab.' USING ERRCODE = 'P0001';
  END IF;

  -- Validate PIN against lab_staff record
  SELECT ls.release_pin INTO stored_pin
  FROM public.lab_staff ls
  WHERE ls.user_id = auth.uid()
    AND ls.lab_id = current_lab
    AND ls.is_active = true;

  IF stored_pin IS NULL THEN
    RAISE EXCEPTION 'No PIN set for your account. Please set a release PIN in your lab profile.' USING ERRCODE = 'P0001';
  END IF;

  IF stored_pin != technician_pin THEN
    RAISE EXCEPTION 'Incorrect PIN. Please try again.' USING ERRCODE = 'P0001';
  END IF;

  -- Check all tests have results
  SELECT count(*)
  INTO incomplete_count
  FROM public.lab_order_items loi
  JOIN public.lab_orders lo ON lo.id = loi.lab_order_id
  WHERE lo.id = target_order_id
    AND lo.assigned_lab_id = current_lab
    AND NOT lo.is_deleted
    AND loi.status NOT IN ('resulted', 'reviewed');

  IF incomplete_count > 0 THEN
    RAISE EXCEPTION 'Some tests on this order do not have results yet.' USING ERRCODE = 'P0001';
  END IF;

  -- Release the order
  UPDATE public.lab_orders lo
  SET status = 'reviewed'::lab_order_status,
      results_released_at = now(),
      technician_name = (SELECT full_name FROM public.user_profiles WHERE user_id = auth.uid()),
      updated_at = now()
  WHERE lo.id = target_order_id
    AND lo.assigned_lab_id = current_lab
    AND NOT lo.is_deleted
    AND lo.status IN ('ordered', 'collected', 'processing', 'resulted')
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    SELECT * INTO updated_row
    FROM public.lab_orders lo2
    WHERE lo2.id = target_order_id
      AND lo2.assigned_lab_id = current_lab
      AND NOT lo2.is_deleted;
    IF updated_row.id IS NULL THEN
      RAISE EXCEPTION 'Order not found or not assigned to your lab.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    updated_row.patient_id,
    'lab_result',
    'Your lab results are ready',
    'Open the lab results page to review and, if needed, ask the AI assistant for a plain-language explanation.',
    '/patient/lab-results'
  );

  RETURN updated_row;
END;
$$;