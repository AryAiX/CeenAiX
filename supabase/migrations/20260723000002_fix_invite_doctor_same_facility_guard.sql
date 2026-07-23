CREATE OR REPLACE FUNCTION public.invite_doctor_to_clinic(p_facility_id uuid, p_doctor_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing public.facility_staff%ROWTYPE;
  v_other_clinic RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.' USING ERRCODE = '28000';
  END IF;

  IF NOT (
    public.is_current_user_super_admin()
    OR (
      p_facility_id = public.current_user_clinic_facility_id()
      AND public.clinic_member_can_manage()
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to invite doctors for this clinic.' USING ERRCODE = '42501';
  END IF;

  SELECT f.id, COALESCE(f.name_en, f.name) AS clinic_name
  INTO v_other_clinic
  FROM public.facility_staff fs
  JOIN public.facilities f ON f.id = fs.facility_id
  WHERE fs.doctor_user_id = p_doctor_user_id
    AND fs.invitation_status = 'accepted'
    AND fs.is_active = true
    AND fs.facility_id <> p_facility_id
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'This doctor is already an active member of %. They must be removed from that clinic before joining another.', v_other_clinic.clinic_name
      USING ERRCODE = '23505';
  END IF;

  SELECT * INTO v_existing
  FROM public.facility_staff
  WHERE facility_id = p_facility_id
    AND doctor_user_id = p_doctor_user_id
  FOR UPDATE;

  IF FOUND AND v_existing.invitation_status = 'accepted' AND v_existing.is_active = true THEN
    RAISE EXCEPTION 'This doctor is already an active member of your clinic.' USING ERRCODE = '23505';
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.facility_staff (facility_id, doctor_user_id, invitation_status, is_active, is_available)
    VALUES (p_facility_id, p_doctor_user_id, 'invited', false, false);
  ELSE
    UPDATE public.facility_staff
    SET invitation_status = 'invited',
        is_active = false,
        is_available = false,
        updated_at = now()
    WHERE id = v_existing.id;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.invite_doctor_to_clinic(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';