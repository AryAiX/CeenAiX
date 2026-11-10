-- QA-064 follow-up: tighten cancel_patient_appointment_with_reason.
-- 20261110000001 saves the cancellation reason. This keeps that behaviour and adds:
--   * a 500-character limit on the stored reason (longer text is cut, blank text is stored as NULL);
--   * no EXECUTE for anon (signed-out users), so only signed-in patients can call it;
--   * a description on the new column.

CREATE OR REPLACE FUNCTION public.cancel_patient_appointment_with_reason(
  p_appointment_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.appointments
  SET status = 'cancelled',
      cancellation_reason = NULLIF(left(btrim(coalesce(p_reason, '')), 500), ''),
      updated_at = now()
  WHERE id = p_appointment_id
    AND patient_id = auth.uid()
    AND is_deleted = false
    AND status IN ('scheduled', 'confirmed')
    AND scheduled_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment could not be cancelled.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_patient_appointment_with_reason(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_patient_appointment_with_reason(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_patient_appointment_with_reason(uuid, text) TO authenticated;

COMMENT ON COLUMN public.appointments.cancellation_reason IS
  'Reason the patient gave when cancelling (free text, trimmed, at most 500 characters). NULL when none was given.';
