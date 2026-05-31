-- Repair dev/prod drift: remote may record canonical_public_directory without creating
-- public.facilities (version/name mismatch in migration history). Clinic portal depends
-- on facilities + facility_staff; bootstrap them when absent.

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
