CREATE OR REPLACE FUNCTION public.notify_doctor_of_pharmacy_hold(
  p_prescription_id uuid,
  p_medication_names text,
  p_hold_note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_doctor_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pharmacy_dispensing_tasks pdt
    JOIN organization_members om ON om.organization_id = pdt.organization_id
    WHERE pdt.prescription_id = p_prescription_id
      AND om.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not authorized to act on this prescription.';
  END IF;

  SELECT doctor_id INTO v_doctor_id
  FROM prescriptions
  WHERE id = p_prescription_id;

  IF v_doctor_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, action_url)
  VALUES (
    v_doctor_id,
    'medication',
    'Pharmacy Needs Clarification',
    'A pharmacy has a question about ' || p_medication_names || '. Tap to message the pharmacy.' ||
      CASE WHEN p_hold_note IS NOT NULL AND p_hold_note <> '' THEN ' Note: ' || p_hold_note ELSE '' END,
    '/doctor/messages'
  );

  RETURN v_doctor_id;
END;
$function$;