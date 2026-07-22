CREATE OR REPLACE FUNCTION public.request_join_clinic(p_facility_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_doctor_user_id uuid := auth.uid();
  v_existing public.facility_staff%ROWTYPE;
BEGIN
  IF v_doctor_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = p_facility_id
      AND f.facility_type = 'clinic'
      AND f.is_active = true
      AND f.is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Clinic not found or not accepting requests.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_existing
  FROM public.facility_staff
  WHERE facility_id = p_facility_id
    AND doctor_user_id = v_doctor_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.facility_staff (facility_id, doctor_user_id, invitation_status, is_active, is_available)
    VALUES (p_facility_id, v_doctor_user_id, 'pending', false, false);
  ELSIF v_existing.invitation_status IN ('declined', 'rejected', 'removed', 'suspended', 'cancelled') THEN
    UPDATE public.facility_staff
    SET invitation_status = 'pending',
        is_active = false,
        is_available = false,
        updated_at = now()
    WHERE id = v_existing.id;
  ELSIF v_existing.invitation_status IN ('pending', 'invited') THEN
    RAISE EXCEPTION 'You already have a pending request or invitation with this clinic.' USING ERRCODE = '23505';
  ELSE
    RAISE EXCEPTION 'You are already a member of this clinic.' USING ERRCODE = '23505';
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.request_join_clinic(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';