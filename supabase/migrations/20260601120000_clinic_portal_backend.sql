-- Clinic Portal backend: role, membership, services, pricing, RLS, RPCs, demo seed.
-- Maps spec "clinics" → canonical public.facilities; staff via clinic_portal_members + facility_staff.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'clinic';

-- ---------------------------------------------------------------------------
-- Extend facilities for clinic portal settings (bilingual + branding)
-- ---------------------------------------------------------------------------

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS license_expiry date,
  ADD COLUMN IF NOT EXISTS tax_registration_number text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

UPDATE public.facilities
SET
  name_en = COALESCE(name_en, name),
  name_ar = COALESCE(name_ar, name)
WHERE name_en IS NULL OR name_ar IS NULL;

-- ---------------------------------------------------------------------------
-- clinic_portal_members — clinic operators (admin / manager / receptionist)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clinic_portal_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_role text NOT NULL DEFAULT 'clinic_admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_portal_members_role_chk CHECK (
    portal_role IN ('clinic_admin', 'clinic_manager', 'clinic_receptionist')
  ),
  CONSTRAINT clinic_portal_members_facility_user_unique UNIQUE (facility_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_portal_members_user
  ON public.clinic_portal_members(user_id) WHERE is_active;

DROP TRIGGER IF EXISTS trg_clinic_portal_members_updated_at ON public.clinic_portal_members;
CREATE TRIGGER trg_clinic_portal_members_updated_at
  BEFORE UPDATE ON public.clinic_portal_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.clinic_portal_members ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- facility_services — clinic service catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.facility_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  description_en text,
  description_ar text,
  default_duration_min integer NOT NULL DEFAULT 30,
  default_price numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AED',
  category text NOT NULL DEFAULT 'consultation',
  required_specialization_id uuid REFERENCES public.specializations(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facility_services_facility
  ON public.facility_services(facility_id) WHERE is_deleted = false;

DROP TRIGGER IF EXISTS trg_facility_services_updated_at ON public.facility_services;
CREATE TRIGGER trg_facility_services_updated_at
  BEFORE UPDATE ON public.facility_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.facility_services ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Extend facility_staff for clinic-managed doctor economics + invitation
-- ---------------------------------------------------------------------------

ALTER TABLE public.facility_staff
  ADD COLUMN IF NOT EXISTS invitation_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS consultation_fee numeric(12, 2),
  ADD COLUMN IF NOT EXISTS telemedicine_fee numeric(12, 2),
  ADD COLUMN IF NOT EXISTS follow_up_fee numeric(12, 2),
  ADD COLUMN IF NOT EXISTS slot_duration_min integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS schedule_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS service_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS clinic_managed_pricing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invitation_email text;

ALTER TABLE public.facility_staff
  DROP CONSTRAINT IF EXISTS facility_staff_invitation_status_chk;

ALTER TABLE public.facility_staff
  ADD CONSTRAINT facility_staff_invitation_status_chk CHECK (
    invitation_status IN ('pending', 'accepted', 'active', 'suspended')
  );

-- ---------------------------------------------------------------------------
-- Per-doctor service price overrides
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.facility_doctor_pricing_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_staff_id uuid NOT NULL REFERENCES public.facility_staff(id) ON DELETE CASCADE,
  facility_service_id uuid NOT NULL REFERENCES public.facility_services(id) ON DELETE CASCADE,
  price numeric(12, 2) NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT facility_doctor_pricing_unique UNIQUE (facility_staff_id, facility_service_id)
);

DROP TRIGGER IF EXISTS trg_facility_doctor_pricing_updated_at ON public.facility_doctor_pricing_overrides;
CREATE TRIGGER trg_facility_doctor_pricing_updated_at
  BEFORE UPDATE ON public.facility_doctor_pricing_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.facility_doctor_pricing_overrides ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Pricing audit log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clinic_pricing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_pricing_audit_facility
  ON public.clinic_pricing_audit_log(facility_id, changed_at DESC);

ALTER TABLE public.clinic_pricing_audit_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Doctor invitations (email captured before auth account exists)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clinic_doctor_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_doctor_invitations_status_chk CHECK (
    status IN ('pending', 'accepted', 'cancelled')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS clinic_doctor_invitations_facility_email_unique
  ON public.clinic_doctor_invitations(facility_id, lower(trim(email)))
  WHERE status = 'pending';

ALTER TABLE public.clinic_doctor_invitations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Security helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_current_user_clinic_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.role = 'clinic'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_clinic_facility_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cpm.facility_id
  FROM public.clinic_portal_members cpm
  WHERE cpm.user_id = auth.uid()
    AND cpm.is_active
  ORDER BY cpm.created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_clinic_portal_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cpm.portal_role
  FROM public.clinic_portal_members cpm
  WHERE cpm.user_id = auth.uid()
    AND cpm.is_active
  ORDER BY cpm.created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.clinic_member_can_manage()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.current_user_clinic_portal_role() IN ('clinic_admin', 'clinic_manager'),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.clinic_member_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_clinic_portal_role() = 'clinic_admin', false);
$$;

REVOKE ALL ON FUNCTION public.is_current_user_clinic_member() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_clinic_facility_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_clinic_portal_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_member_can_manage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_member_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_clinic_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_clinic_facility_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_clinic_portal_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_member_can_manage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_member_is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: clinic portal members read/update their facility
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "facilities_clinic_member_read" ON public.facilities;
CREATE POLICY "facilities_clinic_member_read"
  ON public.facilities
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR id = public.current_user_clinic_facility_id()
  );

DROP POLICY IF EXISTS "facilities_clinic_admin_update" ON public.facilities;
CREATE POLICY "facilities_clinic_admin_update"
  ON public.facilities
  FOR UPDATE
  USING (
    public.is_current_user_super_admin()
    OR (id = public.current_user_clinic_facility_id() AND public.clinic_member_is_admin())
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR (id = public.current_user_clinic_facility_id() AND public.clinic_member_is_admin())
  );

DROP POLICY IF EXISTS "clinic_portal_members_self_read" ON public.clinic_portal_members;
CREATE POLICY "clinic_portal_members_self_read"
  ON public.clinic_portal_members
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR user_id = auth.uid()
    OR facility_id = public.current_user_clinic_facility_id()
  );

DROP POLICY IF EXISTS "clinic_portal_members_admin_manage" ON public.clinic_portal_members;
CREATE POLICY "clinic_portal_members_admin_manage"
  ON public.clinic_portal_members
  FOR ALL
  USING (
    public.is_current_user_super_admin()
    OR (facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_is_admin())
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR (facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_is_admin())
  );

DROP POLICY IF EXISTS "facility_services_clinic_manage" ON public.facility_services;
CREATE POLICY "facility_services_clinic_manage"
  ON public.facility_services
  FOR ALL
  USING (
    public.is_current_user_super_admin()
    OR (facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_can_manage())
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR (facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_can_manage())
  );

DROP POLICY IF EXISTS "facility_staff_clinic_read" ON public.facility_staff;
CREATE POLICY "facility_staff_clinic_read"
  ON public.facility_staff
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR facility_id = public.current_user_clinic_facility_id()
    OR doctor_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "facility_staff_clinic_manage" ON public.facility_staff;
CREATE POLICY "facility_staff_clinic_manage"
  ON public.facility_staff
  FOR ALL
  USING (
    public.is_current_user_super_admin()
    OR (facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_can_manage())
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR (facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_can_manage())
  );

DROP POLICY IF EXISTS "facility_doctor_pricing_clinic_manage" ON public.facility_doctor_pricing_overrides;
CREATE POLICY "facility_doctor_pricing_clinic_manage"
  ON public.facility_doctor_pricing_overrides
  FOR ALL
  USING (
    public.is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.facility_staff fs
      WHERE fs.id = facility_staff_id
        AND fs.facility_id = public.current_user_clinic_facility_id()
        AND public.clinic_member_can_manage()
    )
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.facility_staff fs
      WHERE fs.id = facility_staff_id
        AND fs.facility_id = public.current_user_clinic_facility_id()
        AND public.clinic_member_can_manage()
    )
  );

DROP POLICY IF EXISTS "clinic_pricing_audit_clinic_read" ON public.clinic_pricing_audit_log;
CREATE POLICY "clinic_pricing_audit_clinic_read"
  ON public.clinic_pricing_audit_log
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR facility_id = public.current_user_clinic_facility_id()
  );

DROP POLICY IF EXISTS "clinic_pricing_audit_clinic_insert" ON public.clinic_pricing_audit_log;
CREATE POLICY "clinic_pricing_audit_clinic_insert"
  ON public.clinic_pricing_audit_log
  FOR INSERT
  WITH CHECK (
    public.is_current_user_super_admin()
    OR (facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_can_manage())
  );

DROP POLICY IF EXISTS "clinic_doctor_invitations_clinic_manage" ON public.clinic_doctor_invitations;
CREATE POLICY "clinic_doctor_invitations_clinic_manage"
  ON public.clinic_doctor_invitations
  FOR ALL
  USING (
    public.is_current_user_super_admin()
    OR (facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_can_manage())
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR (facility_id = public.current_user_clinic_facility_id() AND public.clinic_member_can_manage())
  );

-- Appointments: clinic members read appointments at their facility
DROP POLICY IF EXISTS "appointments_clinic_member_read" ON public.appointments;
CREATE POLICY "appointments_clinic_member_read"
  ON public.appointments
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR (
      facility_id = public.current_user_clinic_facility_id()
      AND public.is_current_user_clinic_member()
    )
  );

DROP POLICY IF EXISTS "appointments_clinic_manager_update" ON public.appointments;
CREATE POLICY "appointments_clinic_manager_update"
  ON public.appointments
  FOR UPDATE
  USING (
    public.is_current_user_super_admin()
    OR (
      facility_id = public.current_user_clinic_facility_id()
      AND public.clinic_member_can_manage()
    )
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR (
      facility_id = public.current_user_clinic_facility_id()
      AND public.clinic_member_can_manage()
    )
  );

-- Doctors at clinic can read their facility_staff row (already covered by doctor_user_id)

-- ---------------------------------------------------------------------------
-- Audit helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_clinic_pricing_change(
  p_facility_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_field_name text,
  p_old_value jsonb,
  p_new_value jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.clinic_pricing_audit_log (
    facility_id, changed_by, entity_type, entity_id, field_name, old_value, new_value
  )
  VALUES (
    p_facility_id, auth.uid(), p_entity_type, p_entity_id, p_field_name, p_old_value, p_new_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_clinic_pricing_change(uuid, text, uuid, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_clinic_pricing_change(uuid, text, uuid, text, jsonb, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: clinic portal dashboard snapshot
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_clinic_portal_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facility_id uuid;
  v_role text;
  v_facility jsonb;
  v_doctors jsonb;
  v_services jsonb;
  v_appointments jsonb;
  v_kpis jsonb;
  v_audit jsonb;
BEGIN
  IF public.is_current_user_clinic_member() IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_facility_id := public.current_user_clinic_facility_id();
  v_role := public.current_user_clinic_portal_role();

  IF v_facility_id IS NULL THEN
    RAISE EXCEPTION 'No clinic membership';
  END IF;

  SELECT to_jsonb(f.*) INTO v_facility
  FROM public.facilities f
  WHERE f.id = v_facility_id AND f.is_deleted = false;

  SELECT COALESCE(jsonb_agg(row_to_json(d)::jsonb ORDER BY d.full_name), '[]'::jsonb) INTO v_doctors
  FROM (
    SELECT
      fs.id AS staff_id,
      fs.doctor_user_id,
      fs.invitation_status,
      fs.consultation_fee,
      fs.telemedicine_fee,
      fs.follow_up_fee,
      fs.slot_duration_min,
      fs.schedule_json,
      fs.service_ids,
      fs.clinic_managed_pricing,
      fs.is_available,
      fs.is_active,
      up.full_name,
      up.email,
      up.avatar_url,
      dp.license_number,
      dp.specialization,
      dp.years_of_experience,
      dp.consultation_fee AS profile_consultation_fee,
      (
        SELECT count(*)::integer
        FROM public.appointments a
        WHERE a.doctor_id = fs.doctor_user_id
          AND a.facility_id = v_facility_id
          AND a.scheduled_at >= date_trunc('month', now())
          AND a.is_deleted = false
      ) AS appointments_this_month
    FROM public.facility_staff fs
    JOIN public.user_profiles up ON up.user_id = fs.doctor_user_id
    LEFT JOIN public.doctor_profiles dp ON dp.user_id = fs.doctor_user_id
    WHERE fs.facility_id = v_facility_id
      AND fs.is_active
  ) d;

  SELECT COALESCE(jsonb_agg(row_to_json(s)::jsonb ORDER BY s.name_en), '[]'::jsonb) INTO v_services
  FROM public.facility_services s
  WHERE s.facility_id = v_facility_id AND s.is_deleted = false;

  SELECT COALESCE(jsonb_agg(row_to_json(a)::jsonb ORDER BY a.scheduled_at DESC), '[]'::jsonb) INTO v_appointments
  FROM (
    SELECT
      ap.id,
      ap.doctor_id,
      ap.patient_id,
      ap.status,
      ap.type,
      ap.scheduled_at,
      ap.duration_minutes,
      ap.chief_complaint,
      doc.full_name AS doctor_name,
      pat.full_name AS patient_name,
      pat.phone AS patient_phone
    FROM public.appointments ap
    LEFT JOIN public.user_profiles doc ON doc.user_id = ap.doctor_id
    LEFT JOIN public.user_profiles pat ON pat.user_id = ap.patient_id
    WHERE ap.facility_id = v_facility_id
      AND ap.is_deleted = false
    ORDER BY ap.scheduled_at DESC
    LIMIT 200
  ) a;

  SELECT jsonb_build_object(
    'total_doctors', (SELECT count(*) FROM public.facility_staff fs WHERE fs.facility_id = v_facility_id AND fs.is_active),
    'active_doctors', (SELECT count(*) FROM public.facility_staff fs WHERE fs.facility_id = v_facility_id AND fs.is_active AND fs.invitation_status = 'active'),
    'appointments_this_month', (
      SELECT count(*) FROM public.appointments ap
      WHERE ap.facility_id = v_facility_id
        AND ap.scheduled_at >= date_trunc('month', now())
        AND ap.is_deleted = false
    ),
    'revenue_this_month', (
      SELECT COALESCE(sum(COALESCE(fs.consultation_fee, dp.consultation_fee, 0)), 0)
      FROM public.appointments ap
      JOIN public.facility_staff fs ON fs.doctor_user_id = ap.doctor_id AND fs.facility_id = v_facility_id
      LEFT JOIN public.doctor_profiles dp ON dp.user_id = ap.doctor_id
      WHERE ap.facility_id = v_facility_id
        AND ap.status = 'completed'
        AND ap.scheduled_at >= date_trunc('month', now())
        AND ap.is_deleted = false
    ),
    'pending_invitations', (
      SELECT count(*) FROM public.clinic_doctor_invitations i
      WHERE i.facility_id = v_facility_id AND i.status = 'pending'
    )
  ) INTO v_kpis;

  SELECT COALESCE(jsonb_agg(row_to_json(l)::jsonb ORDER BY l.changed_at DESC), '[]'::jsonb) INTO v_audit
  FROM (
    SELECT id, entity_type, entity_id, field_name, old_value, new_value, changed_at
    FROM public.clinic_pricing_audit_log
    WHERE facility_id = v_facility_id
    ORDER BY changed_at DESC
    LIMIT 50
  ) l;

  RETURN jsonb_build_object(
    'facility_id', v_facility_id,
    'portal_role', v_role,
    'facility', v_facility,
    'doctors', v_doctors,
    'services', v_services,
    'appointments', v_appointments,
    'kpis', v_kpis,
    'pricing_audit', v_audit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_clinic_portal_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_clinic_portal_snapshot() TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: invite / register clinic doctor (creates invitation row)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.clinic_invite_doctor(
  p_full_name text,
  p_email text,
  p_phone text,
  p_license_number text,
  p_specialization text,
  p_consultation_fee numeric,
  p_telemedicine_fee numeric,
  p_follow_up_fee numeric,
  p_service_ids uuid[],
  p_schedule_json jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facility_id uuid;
  v_existing_user uuid;
  v_staff_id uuid;
  v_invitation_id uuid;
BEGIN
  IF public.clinic_member_can_manage() IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_facility_id := public.current_user_clinic_facility_id();
  IF v_facility_id IS NULL THEN
    RAISE EXCEPTION 'No clinic membership';
  END IF;

  SELECT up.user_id INTO v_existing_user
  FROM public.user_profiles up
  WHERE lower(trim(up.email)) = lower(trim(p_email))
  LIMIT 1;

  IF v_existing_user IS NOT NULL THEN
    INSERT INTO public.facility_staff (
      facility_id, doctor_user_id, invitation_status, consultation_fee,
      telemedicine_fee, follow_up_fee, service_ids, schedule_json,
      clinic_managed_pricing, is_available, is_active
    )
    VALUES (
      v_facility_id, v_existing_user, 'active',
      p_consultation_fee, p_telemedicine_fee, p_follow_up_fee,
      COALESCE(p_service_ids, '{}'::uuid[]), COALESCE(p_schedule_json, '{}'::jsonb),
      true, true, true
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
      license_number = COALESCE(NULLIF(trim(p_license_number), ''), dp.license_number),
      specialization = COALESCE(NULLIF(trim(p_specialization), ''), dp.specialization)
    WHERE dp.user_id = v_existing_user;

    RETURN jsonb_build_object('success', true, 'mode', 'linked', 'staff_id', v_staff_id);
  END IF;

  INSERT INTO public.clinic_doctor_invitations (facility_id, invited_by, email, full_name, payload, status)
  VALUES (
    v_facility_id,
    auth.uid(),
    lower(trim(p_email)),
    trim(p_full_name),
    jsonb_build_object(
      'phone', p_phone,
      'license_number', p_license_number,
      'specialization', p_specialization,
      'consultation_fee', p_consultation_fee,
      'telemedicine_fee', p_telemedicine_fee,
      'follow_up_fee', p_follow_up_fee,
      'service_ids', COALESCE(p_service_ids, '{}'::uuid[]),
      'schedule_json', COALESCE(p_schedule_json, '{}'::jsonb)
    ),
    'pending'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object('success', true, 'mode', 'invited', 'invitation_id', v_invitation_id);
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_invite_doctor(text, text, text, text, text, numeric, numeric, numeric, uuid[], jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinic_invite_doctor(text, text, text, text, text, numeric, numeric, numeric, uuid[], jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Demo seed: clinic facility, auth user, services, doctor links
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  clinic_user_id uuid := '729ebc60-093f-412a-bb5e-8c748b30ec7b';
  clinic_facility_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  demo_password text := 'CeenAiXDemo!';
  doctor_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = clinic_user_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
      is_sso_user, is_anonymous
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', clinic_user_id, 'authenticated', 'authenticated',
      'clinic1@aryaix.com', crypt(demo_password, gen_salt('bf')), now(),
      '', '', '', '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('sub', clinic_user_id::text, 'role', 'clinic', 'email', 'clinic1@aryaix.com',
        'full_name', 'Clinic Admin', 'first_name', 'Clinic', 'last_name', 'Admin'),
      false, now(), now(), false, false
    );

    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), clinic_user_id::text, clinic_user_id,
      jsonb_build_object('sub', clinic_user_id::text, 'email', 'clinic1@aryaix.com'),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO public.user_profiles (
    user_id, role, full_name, first_name, last_name, email, profile_completed, terms_accepted, notification_preferences
  )
  VALUES (
    clinic_user_id, 'clinic', 'Clinic Admin', 'Clinic', 'Admin', 'clinic1@aryaix.com', true, true, '{}'::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE SET role = 'clinic', full_name = EXCLUDED.full_name, email = EXCLUDED.email;

  INSERT INTO public.facilities (
    id, name, name_en, name_ar, facility_type, address, city, phone, email,
    license_number, description, rating, is_active, operating_hours, branding
  )
  VALUES (
    clinic_facility_id,
    'Al Noor Family Clinic',
    'Al Noor Family Clinic',
    'عيادة النور العائلية',
    'clinic',
    'Sheikh Zayed Road, Dubai',
    'Dubai',
    '+971 4 123 4567',
    'admin@alnoorclinic.ae',
    'DHA-C-2024-001234',
    'Multi-specialty outpatient clinic on the CeenAiX network.',
    4.7,
    true,
    '{"sun":"08:00-20:00","mon":"08:00-20:00","tue":"08:00-20:00","wed":"08:00-20:00","thu":"08:00-20:00","fri":"14:00-20:00","sat":"09:00-17:00"}'::jsonb,
    jsonb_build_object('primary_color', '#0D9488', 'welcome_en', 'Welcome to Al Noor Family Clinic')
  )
  ON CONFLICT (id) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_ar = EXCLUDED.name_ar,
    updated_at = now();

  INSERT INTO public.clinic_portal_members (facility_id, user_id, portal_role, is_active)
  VALUES (clinic_facility_id, clinic_user_id, 'clinic_admin', true)
  ON CONFLICT (facility_id, user_id) DO UPDATE SET portal_role = 'clinic_admin', is_active = true;

  INSERT INTO public.facility_services (facility_id, name_en, name_ar, default_duration_min, default_price, category)
  SELECT clinic_facility_id, v.name_en, v.name_ar, v.duration_min, v.price, v.category
  FROM (VALUES
    ('General Consultation', 'استشارة عامة', 30, 300::numeric, 'consultation'),
    ('Follow-up Visit', 'زيارة متابعة', 20, 200::numeric, 'consultation'),
    ('Telemedicine Consultation', 'استشارة عن بُعد', 30, 250::numeric, 'telemedicine'),
    ('ECG', 'تخطيط القلب', 15, 150::numeric, 'procedure')
  ) AS v(name_en, name_ar, duration_min, price, category)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.facility_services fs
    WHERE fs.facility_id = clinic_facility_id AND fs.name_en = v.name_en
  );

  SELECT up.user_id INTO doctor_user_id
  FROM public.user_profiles up
  WHERE lower(up.email) = 'doctor1@aryaix.com'
  LIMIT 1;

  IF doctor_user_id IS NOT NULL THEN
    INSERT INTO public.facility_staff (
      facility_id, doctor_user_id, invitation_status, consultation_fee,
      telemedicine_fee, follow_up_fee, slot_duration_min, clinic_managed_pricing,
      consultation_days, consultation_hours, is_available, is_active
    )
    VALUES (
      clinic_facility_id, doctor_user_id, 'active', 800, 600, 400, 30, true,
      '["Mon","Tue","Wed","Thu"]'::jsonb, '09:00-17:00', true, true
    )
    ON CONFLICT (facility_id, doctor_user_id) DO UPDATE SET
      invitation_status = 'active',
      consultation_fee = 800,
      clinic_managed_pricing = true,
      updated_at = now();

    UPDATE public.appointments
    SET facility_id = clinic_facility_id
    WHERE doctor_id = doctor_user_id
      AND facility_id IS NULL
      AND is_deleted = false;
  END IF;
END $$;
