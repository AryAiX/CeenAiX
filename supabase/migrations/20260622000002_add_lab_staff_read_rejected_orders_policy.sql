CREATE POLICY lab_staff_read_rejected_lab_orders ON lab_orders
  FOR SELECT
  USING (
    is_deleted = true
    AND ((assigned_lab_id IS NULL) OR is_current_user_in_lab(assigned_lab_id))
    AND is_current_user_lab_staff()
  );