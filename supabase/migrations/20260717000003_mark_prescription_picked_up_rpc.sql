CREATE OR REPLACE FUNCTION public.mark_prescription_picked_up(p_prescription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM prescriptions
    WHERE id = p_prescription_id
      AND patient_id = auth.uid()
      AND NOT is_deleted
  ) THEN
    RAISE EXCEPTION 'You are not authorized to update this prescription.';
  END IF;

  UPDATE pharmacy_dispensing_tasks
  SET workflow_status = 'picked_up',
      updated_at = now()
  WHERE prescription_id = p_prescription_id;

  UPDATE prescription_items
  SET is_dispensed = true
  WHERE prescription_id = p_prescription_id;
END;
$function$;