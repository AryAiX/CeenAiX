-- Save the reason a patient gives when they cancel an appointment.
-- The existing cancel_patient_appointment function stays as it is, so screens
-- that cancel without a reason keep working.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

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
      cancellation_reason = NULLIF(btrim(p_reason), ''),
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
GRANT EXECUTE ON FUNCTION public.cancel_patient_appointment_with_reason(uuid, text) TO authenticated;
