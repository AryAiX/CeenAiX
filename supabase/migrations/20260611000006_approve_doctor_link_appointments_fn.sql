CREATE OR REPLACE FUNCTION approve_doctor_and_link_appointments(
  p_staff_id UUID,
  p_facility_id UUID,
  p_doctor_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Approve doctor
  UPDATE facility_staff
  SET is_active = true,
      is_available = true,
      invitation_status = 'accepted'
  WHERE id = p_staff_id;

  -- Backfill facility_id on all existing appointments
  UPDATE appointments
  SET facility_id = p_facility_id
  WHERE doctor_id = p_doctor_user_id
    AND facility_id IS NULL
    AND is_deleted = false;
END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION approve_doctor_and_link_appointments TO authenticated;