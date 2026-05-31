-- Super Admin clinic onboarding RPCs, doctor invitation claim, email tracking.

ALTER TABLE public.clinic_doctor_invitations
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_email_error text;

-- ---------------------------------------------------------------------------
-- Admin: list clinic facilities with org + staffing summary
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_clinics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can list clinics.' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'name'), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'facility_id', f.id,
      'name', f.name,
      'name_en', f.name_en,
      'name_ar', f.name_ar,
      'city', f.city,
      'address', f.address,
      'phone', f.phone,
      'email', f.email,
      'license_number', f.license_number,
      'is_active', f.is_active,
      'organization_id', f.organization_id,
      'organization_name', o.name,
      'organization_status', o.status,
      'doctor_count', (
        SELECT count(*)::int
        FROM public.facility_staff fs
        WHERE fs.facility_id = f.id AND fs.is_active
      ),
      'admin_count', (
        SELECT count(*)::int
        FROM public.clinic_portal_members cpm
        WHERE cpm.facility_id = f.id AND cpm.is_active
      ),
      'pending_invitations', (
        SELECT count(*)::int
        FROM public.clinic_doctor_invitations i
        WHERE i.facility_id = f.id AND i.status = 'pending'
      ),
      'created_at', f.created_at
    ) AS row
    FROM public.facilities f
    LEFT JOIN public.organizations o ON o.id = f.organization_id
    WHERE f.facility_type = 'clinic'
      AND f.is_deleted = false
  ) sub;

  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_clinics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_clinics() TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin: onboard a clinic (organization + facility + optional admin link)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_onboard_clinic(
  p_name_en text,
  p_name_ar text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT 'Dubai',
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_license_number text DEFAULT NULL,
  p_admin_email text DEFAULT NULL,
  p_admin_name text DEFAULT NULL,
  p_organization_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org public.organizations;
  v_facility_id uuid;
  v_admin_user_id uuid;
  v_org_name text;
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can onboard clinics.' USING ERRCODE = 'P0001';
  END IF;

  IF nullif(btrim(coalesce(p_name_en, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Clinic name (English) is required.' USING ERRCODE = '22023';
  END IF;

  v_org_name := nullif(btrim(coalesce(p_organization_name, p_name_en, '')), '');

  v_org := public.admin_create_organization(
    in_name := v_org_name,
    in_kind := 'clinic',
    in_city := nullif(btrim(coalesce(p_city, '')), ''),
    in_primary_contact_name := nullif(btrim(coalesce(p_admin_name, '')), ''),
    in_primary_contact_email := nullif(btrim(lower(coalesce(p_admin_email, ''))), ''),
    in_notes := 'Onboarded via Super Admin Clinics portal',
    in_slug := NULL,
    in_status := 'active',
    in_seats_allocated := 5
  );

  INSERT INTO public.facilities (
    name,
    name_en,
    name_ar,
    facility_type,
    address,
    city,
    phone,
    email,
    license_number,
    organization_id,
    is_active,
    branding
  )
  VALUES (
    v_org_name,
    btrim(p_name_en),
    nullif(btrim(coalesce(p_name_ar, p_name_en, '')), ''),
    'clinic',
    coalesce(nullif(btrim(coalesce(p_address, '')), ''), 'Address pending'),
    coalesce(nullif(btrim(coalesce(p_city, '')), ''), 'Dubai'),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(lower(coalesce(p_email, ''))), ''),
    nullif(btrim(coalesce(p_license_number, '')), ''),
    v_org.id,
    true,
    jsonb_build_object('primary_color', '#0D9488')
  )
  RETURNING id INTO v_facility_id;

  IF nullif(btrim(lower(coalesce(p_admin_email, ''))), '') IS NOT NULL THEN
    SELECT up.user_id
    INTO v_admin_user_id
    FROM public.user_profiles up
    WHERE lower(trim(up.email)) = lower(trim(p_admin_email))
    LIMIT 1;

    IF v_admin_user_id IS NOT NULL THEN
      UPDATE public.user_profiles
      SET role = 'clinic', full_name = coalesce(nullif(btrim(p_admin_name), ''), full_name)
      WHERE user_id = v_admin_user_id;

      INSERT INTO public.clinic_portal_members (facility_id, user_id, portal_role, is_active)
      VALUES (v_facility_id, v_admin_user_id, 'clinic_admin', true)
      ON CONFLICT (facility_id, user_id) DO UPDATE
      SET portal_role = 'clinic_admin', is_active = true, updated_at = now();
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'facility_id', v_facility_id,
    'organization_id', v_org.id,
    'organization_slug', v_org.slug,
    'admin_linked', v_admin_user_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_onboard_clinic(text, text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_onboard_clinic(text, text, text, text, text, text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin: suspend / reactivate clinic facility + linked organization
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_clinic_status(
  p_facility_id uuid,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can update clinic status.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.facilities f
  SET is_active = p_is_active, updated_at = now()
  WHERE f.id = p_facility_id
    AND f.facility_type = 'clinic'
    AND f.is_deleted = false
  RETURNING f.organization_id INTO v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic facility not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_org_id IS NOT NULL THEN
    UPDATE public.organizations
    SET status = CASE WHEN p_is_active THEN 'active' ELSE 'suspended' END,
        updated_at = now()
    WHERE id = v_org_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'is_active', p_is_active);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_clinic_status(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_clinic_status(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin: doctors without an active clinic affiliation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_unlinked_doctors()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can list unlinked doctors.' USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'doctor_user_id', up.user_id,
      'full_name', up.full_name,
      'email', up.email,
      'specialization', dp.specialization,
      'license_number', dp.license_number
    ) ORDER BY up.full_name)
    FROM public.user_profiles up
    JOIN public.doctor_profiles dp ON dp.user_id = up.user_id
    WHERE up.role = 'doctor'
      AND NOT EXISTS (
        SELECT 1
        FROM public.facility_staff fs
        WHERE fs.doctor_user_id = up.user_id
          AND fs.is_active
      )
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_unlinked_doctors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_unlinked_doctors() TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin: link standalone doctor to a clinic facility
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_link_doctor_to_clinic(
  p_facility_id uuid,
  p_doctor_user_id uuid,
  p_consultation_fee numeric DEFAULT NULL,
  p_telemedicine_fee numeric DEFAULT NULL,
  p_follow_up_fee numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can link doctors to clinics.' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = p_facility_id AND f.facility_type = 'clinic' AND f.is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Clinic facility not found.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = p_doctor_user_id AND up.role = 'doctor'
  ) THEN
    RAISE EXCEPTION 'Doctor profile not found.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.facility_staff (
    facility_id,
    doctor_user_id,
    invitation_status,
    consultation_fee,
    telemedicine_fee,
    follow_up_fee,
    clinic_managed_pricing,
    is_available,
    is_active
  )
  VALUES (
    p_facility_id,
    p_doctor_user_id,
    'active',
    p_consultation_fee,
    p_telemedicine_fee,
    p_follow_up_fee,
    true,
    true,
    true
  )
  ON CONFLICT (facility_id, doctor_user_id) DO UPDATE SET
    invitation_status = 'active',
    consultation_fee = COALESCE(EXCLUDED.consultation_fee, facility_staff.consultation_fee),
    telemedicine_fee = COALESCE(EXCLUDED.telemedicine_fee, facility_staff.telemedicine_fee),
    follow_up_fee = COALESCE(EXCLUDED.follow_up_fee, facility_staff.follow_up_fee),
    clinic_managed_pricing = true,
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_staff_id;

  RETURN jsonb_build_object('success', true, 'staff_id', v_staff_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_link_doctor_to_clinic(uuid, uuid, numeric, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_link_doctor_to_clinic(uuid, uuid, numeric, numeric, numeric) TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin: clinic doctors grouped by facility (for admin Clinics detail panel)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_clinic_doctors(p_facility_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_current_user_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super_admin users can read clinic doctors.' USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'staff_id', fs.id,
      'doctor_user_id', fs.doctor_user_id,
      'full_name', up.full_name,
      'email', up.email,
      'specialization', dp.specialization,
      'invitation_status', fs.invitation_status,
      'consultation_fee', fs.consultation_fee,
      'is_available', fs.is_available
    ) ORDER BY up.full_name)
    FROM public.facility_staff fs
    JOIN public.user_profiles up ON up.user_id = fs.doctor_user_id
    LEFT JOIN public.doctor_profiles dp ON dp.user_id = fs.doctor_user_id
    WHERE fs.facility_id = p_facility_id
      AND fs.is_active
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_clinic_doctors(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_clinic_doctors(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Doctor onboarding: claim pending clinic invitation by email
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_clinic_doctor_invitation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_invitation public.clinic_doctor_invitations;
  v_payload jsonb;
  v_staff_id uuid;
BEGIN
  SELECT lower(trim(up.email))
  INTO v_email
  FROM public.user_profiles up
  WHERE up.user_id = auth.uid();

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_email');
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.clinic_doctor_invitations i
  WHERE lower(trim(i.email)) = v_email
    AND i.status = 'pending'
  ORDER BY i.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_invitation');
  END IF;

  v_payload := COALESCE(v_invitation.payload, '{}'::jsonb);

  INSERT INTO public.facility_staff (
    facility_id,
    doctor_user_id,
    invitation_status,
    consultation_fee,
    telemedicine_fee,
    follow_up_fee,
    service_ids,
    schedule_json,
    clinic_managed_pricing,
    invitation_email,
    is_available,
    is_active
  )
  VALUES (
    v_invitation.facility_id,
    auth.uid(),
    'active',
    NULLIF(v_payload->>'consultation_fee', '')::numeric,
    NULLIF(v_payload->>'telemedicine_fee', '')::numeric,
    NULLIF(v_payload->>'follow_up_fee', '')::numeric,
    COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(v_payload->'service_ids')::uuid
      ),
      '{}'::uuid[]
    ),
    COALESCE(v_payload->'schedule_json', '{}'::jsonb),
    true,
    v_invitation.email,
    true,
    true
  )
  ON CONFLICT (facility_id, doctor_user_id) DO UPDATE SET
    invitation_status = 'active',
    consultation_fee = EXCLUDED.consultation_fee,
    telemedicine_fee = EXCLUDED.telemedicine_fee,
    follow_up_fee = EXCLUDED.follow_up_fee,
    service_ids = EXCLUDED.service_ids,
    schedule_json = EXCLUDED.schedule_json,
    clinic_managed_pricing = true,
    updated_at = now()
  RETURNING id INTO v_staff_id;

  UPDATE public.doctor_profiles dp
  SET
    license_number = COALESCE(NULLIF(trim(v_payload->>'license_number'), ''), dp.license_number),
    specialization = COALESCE(NULLIF(trim(v_payload->>'specialization'), ''), dp.specialization)
  WHERE dp.user_id = auth.uid();

  UPDATE public.clinic_doctor_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'claimed', true,
    'staff_id', v_staff_id,
    'facility_id', v_invitation.facility_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_clinic_doctor_invitation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_clinic_doctor_invitation() TO authenticated;

-- ---------------------------------------------------------------------------
-- Edge function helper: mark invitation email delivery
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.clinic_mark_doctor_invitation_email_sent(
  p_invitation_id uuid,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clinic_doctor_invitations
  SET
    email_sent_at = CASE WHEN p_error IS NULL THEN now() ELSE email_sent_at END,
    last_email_error = p_error,
    updated_at = now()
  WHERE id = p_invitation_id
    AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_mark_doctor_invitation_email_sent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinic_mark_doctor_invitation_email_sent(uuid, text) TO service_role;

-- Link demo Al Noor clinic to an organization when missing
UPDATE public.facilities f
SET organization_id = o.id
FROM public.organizations o
WHERE f.id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND f.organization_id IS NULL
  AND o.slug = 'al-noor-family-clinic'
  AND NOT EXISTS (SELECT 1 FROM public.organizations o2 WHERE o2.slug = 'al-noor-family-clinic');

INSERT INTO public.organizations (slug, name, kind, city, country, status, notes, seats_allocated)
SELECT
  'al-noor-family-clinic',
  'Al Noor Family Clinic',
  'clinic',
  'Dubai',
  'UAE',
  'active',
  'Demo clinic seed',
  5
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug = 'al-noor-family-clinic');

UPDATE public.facilities f
SET organization_id = o.id
FROM public.organizations o
WHERE f.id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND f.organization_id IS NULL
  AND o.slug = 'al-noor-family-clinic';
