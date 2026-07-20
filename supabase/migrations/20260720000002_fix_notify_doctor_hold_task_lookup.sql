DROP FUNCTION notify_doctor_of_pharmacy_hold(uuid, text, text);

CREATE OR REPLACE FUNCTION public.notify_doctor_of_pharmacy_hold(
  p_task_id uuid,
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
  v_organization_id uuid;
BEGIN
  SELECT p.doctor_id, pdt.organization_id
  INTO v_doctor_id, v_organization_id
  FROM pharmacy_dispensing_tasks pdt
  JOIN prescriptions p ON p.id = pdt.prescription_id
  WHERE pdt.id = p_task_id;

  IF v_doctor_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = v_organization_id
      AND om.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not authorized to act on this prescription.';
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