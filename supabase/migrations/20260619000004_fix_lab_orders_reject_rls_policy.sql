ALTER POLICY lab_staff_update_lab_orders ON lab_orders
USING (
  (NOT is_deleted)
  AND ((assigned_lab_id IS NULL) OR is_current_user_in_lab(assigned_lab_id))
  AND is_current_user_lab_staff()
)
WITH CHECK (
  ((assigned_lab_id IS NULL) OR is_current_user_in_lab(assigned_lab_id))
  AND is_current_user_lab_staff()
);