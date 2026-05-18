-- Canonical public directory: facilities + lab directory RPCs.
-- Replaces Bolt-era `hospitals`, `hospital_doctors`, and `laboratories` table reads from the app.

-- ---------------------------------------------------------------------------
-- facilities (spec-aligned; extended with public-directory display fields)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  facility_type text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  phone text,
  email text,
  license_number text,
  dha_status text,
  image_url text,
  description text,
  rating numeric(2, 1) NOT NULL DEFAULT 0,
  total_reviews integer NOT NULL DEFAULT 0,
  specialties jsonb NOT NULL DEFAULT '[]'::jsonb,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  emergency_services boolean NOT NULL DEFAULT false,
  parking_available boolean NOT NULL DEFAULT false,
  insurance_accepted jsonb NOT NULL DEFAULT '[]'::jsonb,
  operating_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT facilities_type_chk CHECK (facility_type IN ('hospital', 'clinic', 'pharmacy', 'laboratory')),
  CONSTRAINT facilities_rating_chk CHECK (rating >= 0 AND rating <= 5)
);

CREATE INDEX IF NOT EXISTS idx_facilities_city ON public.facilities(city);
CREATE INDEX IF NOT EXISTS idx_facilities_type ON public.facilities(facility_type);
CREATE INDEX IF NOT EXISTS idx_facilities_active ON public.facilities(is_active) WHERE is_deleted = false;

DROP TRIGGER IF EXISTS trg_facilities_updated_at ON public.facilities;
CREATE TRIGGER trg_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facilities_admin_manage" ON public.facilities;
CREATE POLICY "facilities_admin_manage"
  ON public.facilities
  FOR ALL
  USING (public.is_current_user_super_admin())
  WITH CHECK (public.is_current_user_super_admin());

-- ---------------------------------------------------------------------------
-- facility_staff: doctors affiliated with a facility (canonical junction)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.facility_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  doctor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT true,
  consultation_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  consultation_hours text,
  room_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id, doctor_user_id)
);

CREATE INDEX IF NOT EXISTS idx_facility_staff_facility ON public.facility_staff(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_staff_doctor ON public.facility_staff(doctor_user_id);

DROP TRIGGER IF EXISTS trg_facility_staff_updated_at ON public.facility_staff;
CREATE TRIGGER trg_facility_staff_updated_at
  BEFORE UPDATE ON public.facility_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.facility_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facility_staff_admin_manage" ON public.facility_staff;
CREATE POLICY "facility_staff_admin_manage"
  ON public.facility_staff
  FOR ALL
  USING (public.is_current_user_super_admin())
  WITH CHECK (public.is_current_user_super_admin());

-- ---------------------------------------------------------------------------
-- Migrate legacy hospitals rows when present (id-stable for bookmarks)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'hospitals'
  ) THEN
    INSERT INTO public.facilities (
      id,
      name,
      facility_type,
      address,
      city,
      phone,
      email,
      image_url,
      description,
      rating,
      total_reviews,
      specialties,
      amenities,
      emergency_services,
      parking_available,
      insurance_accepted,
      operating_hours,
      latitude,
      longitude,
      is_active
    )
    SELECT
      h.id,
      h.name,
      h.type,
      h.address,
      h.city,
      h.phone,
      h.email,
      h.image_url,
      h.description,
      COALESCE(h.rating, 0),
      COALESCE(h.total_reviews, 0),
      COALESCE(h.specialties, '[]'::jsonb),
      COALESCE(h.facilities, '[]'::jsonb),
      COALESCE(h.emergency_services, false),
      COALESCE(h.parking_available, false),
      COALESCE(h.insurance_accepted, '[]'::jsonb),
      COALESCE(h.operating_hours, '{}'::jsonb),
      h.latitude,
      h.longitude,
      true
    FROM public.hospitals h
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      facility_type = EXCLUDED.facility_type,
      address = EXCLUDED.address,
      city = EXCLUDED.city,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      image_url = EXCLUDED.image_url,
      description = EXCLUDED.description,
      rating = EXCLUDED.rating,
      total_reviews = EXCLUDED.total_reviews,
      specialties = EXCLUDED.specialties,
      amenities = EXCLUDED.amenities,
      emergency_services = EXCLUDED.emergency_services,
      parking_available = EXCLUDED.parking_available,
      insurance_accepted = EXCLUDED.insurance_accepted,
      operating_hours = EXCLUDED.operating_hours,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      updated_at = now();
  END IF;
END $$;

-- Seed from active hospital/clinic organizations when no facilities exist yet.
INSERT INTO public.facilities (
  name,
  facility_type,
  address,
  city,
  phone,
  email,
  description,
  rating,
  total_reviews,
  specialties,
  is_active
)
SELECT
  o.name,
  o.kind,
  COALESCE(o.city, 'UAE') || ' — contact facility for full address',
  COALESCE(o.city, 'UAE'),
  NULL,
  o.primary_contact_email,
  COALESCE(o.notes, 'CeenAiX network facility'),
  4.5,
  0,
  '["General Medicine"]'::jsonb,
  true
FROM public.organizations o
WHERE o.kind IN ('hospital', 'clinic')
  AND o.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM public.facilities LIMIT 1)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Extend lab_profiles for public directory metadata
-- ---------------------------------------------------------------------------

ALTER TABLE public.lab_profiles
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating numeric(2, 1) NOT NULL DEFAULT 4.5,
  ADD COLUMN IF NOT EXISTS tests_available integer NOT NULL DEFAULT 0;

UPDATE public.lab_profiles
SET
  featured = slug = 'ceenaix-reference-lab',
  capabilities = COALESCE(
    NULLIF(capabilities, '[]'::jsonb),
    '["Blood Tests", "Pathology", "Radiology"]'::jsonb
  ),
  tests_available = GREATEST(tests_available, 180),
  rating = GREATEST(rating, 4.8)
WHERE slug = 'ceenaix-reference-lab';

INSERT INTO public.lab_profiles (slug, name, city, address, phone, email, is_active, featured, capabilities, rating, tests_available)
VALUES
  (
    'dubai-advanced-laboratory',
    'Dubai Advanced Laboratory',
    'Dubai Healthcare City',
    'Dubai Healthcare City, Building 14',
    '+971 4 100 2001',
    'bookings@dubaiadvancedlab.ae',
    true,
    true,
    '["Blood Tests", "Radiology", "Pathology", "Genetic Testing", "COVID-19 PCR"]'::jsonb,
    4.9,
    250
  ),
  (
    'healthcheck-lab-center',
    'HealthCheck Lab Center',
    'Jumeirah',
    'Jumeirah Beach Road',
    '+971 4 100 2002',
    'info@healthchecklab.ae',
    true,
    true,
    '["Blood Tests", "Urine Analysis", "X-Ray", "Ultrasound", "ECG"]'::jsonb,
    4.7,
    180
  ),
  (
    'emirates-diagnostic-center',
    'Emirates Diagnostic Center',
    'Dubai Marina',
    'Dubai Marina Walk',
    '+971 4 100 2003',
    'contact@emiratesdx.ae',
    true,
    false,
    '["Blood Tests", "MRI", "CT Scan", "Radiology", "Nuclear Medicine"]'::jsonb,
    4.8,
    220
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  is_active = true,
  featured = EXCLUDED.featured,
  capabilities = EXCLUDED.capabilities,
  rating = EXCLUDED.rating,
  tests_available = EXCLUDED.tests_available,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Public RPCs (anon + authenticated)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_facilities()
RETURNS TABLE (
  id uuid,
  name text,
  facility_type text,
  address text,
  city text,
  phone text,
  email text,
  image_url text,
  description text,
  rating numeric,
  total_reviews integer,
  specialties jsonb,
  amenities jsonb,
  emergency_services boolean,
  parking_available boolean,
  insurance_accepted jsonb,
  operating_hours jsonb,
  latitude numeric,
  longitude numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.name,
    f.facility_type,
    f.address,
    f.city,
    f.phone,
    f.email,
    f.image_url,
    f.description,
    f.rating,
    f.total_reviews,
    f.specialties,
    f.amenities,
    f.emergency_services,
    f.parking_available,
    f.insurance_accepted,
    f.operating_hours,
    f.latitude,
    f.longitude
  FROM public.facilities f
  WHERE f.is_active = true
    AND f.is_deleted = false
  ORDER BY f.rating DESC, lower(f.name);
$$;

CREATE OR REPLACE FUNCTION public.get_facility_doctors(p_facility_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  specialty text,
  city text,
  address text,
  consultation_fee numeric,
  is_available boolean,
  consultation_days jsonb,
  consultation_hours text,
  room_number text,
  active_availability_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH facility_row AS (
    SELECT f.id, f.city
    FROM public.facilities f
    WHERE f.id = p_facility_id
      AND f.is_active = true
      AND f.is_deleted = false
  ),
  staffed AS (
    SELECT
      up.user_id,
      up.full_name,
      dp.specialization AS specialty,
      up.city,
      up.address,
      dp.consultation_fee,
      fs.is_available,
      fs.consultation_days,
      fs.consultation_hours,
      fs.room_number,
      COUNT(DISTINCT da.id) AS active_availability_count
    FROM public.facility_staff fs
    JOIN facility_row fr ON fr.id = fs.facility_id
    JOIN public.user_profiles up ON up.user_id = fs.doctor_user_id
    JOIN public.doctor_profiles dp ON dp.user_id = fs.doctor_user_id
    LEFT JOIN public.doctor_availability da
      ON da.doctor_id = fs.doctor_user_id
     AND da.is_active = true
    WHERE fs.is_active = true
      AND up.role = 'doctor'
    GROUP BY
      up.user_id,
      up.full_name,
      dp.specialization,
      up.city,
      up.address,
      dp.consultation_fee,
      fs.is_available,
      fs.consultation_days,
      fs.consultation_hours,
      fs.room_number
  ),
  city_fallback AS (
    SELECT
      gbd.user_id,
      gbd.full_name,
      gbd.specialty,
      gbd.city,
      gbd.address,
      gbd.consultation_fee,
      true AS is_available,
      '[]'::jsonb AS consultation_days,
      NULL::text AS consultation_hours,
      NULL::text AS room_number,
      gbd.active_availability_count
    FROM public.get_bookable_doctors() gbd
    CROSS JOIN facility_row fr
    WHERE NOT EXISTS (SELECT 1 FROM staffed)
      AND lower(coalesce(gbd.city, '')) = lower(coalesce(fr.city, ''))
  )
  SELECT * FROM staffed
  UNION ALL
  SELECT * FROM city_fallback;
$$;

CREATE OR REPLACE FUNCTION public.get_public_laboratories()
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  city text,
  location text,
  phone text,
  email text,
  opening_hours text,
  rating numeric,
  tests_available integer,
  services jsonb,
  featured boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lp.id,
    lp.slug,
    lp.name,
    lp.city,
    COALESCE(lp.address, lp.city, '') AS location,
    lp.phone,
    lp.email,
    COALESCE(meta.operating_hours, '8:00 AM - 8:00 PM') AS opening_hours,
    lp.rating,
    lp.tests_available,
    lp.capabilities AS services,
    lp.featured
  FROM public.lab_profiles lp
  LEFT JOIN public.lab_portal_facility_meta meta ON meta.lab_id = lp.id
  WHERE lp.is_active = true
  ORDER BY lp.featured DESC, lp.rating DESC, lower(lp.name);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_facilities() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_facility_doctors(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_laboratories() TO anon, authenticated;
