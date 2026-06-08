-- Repair production migration-history drift: prod recorded the lab portal mixed
-- migration as applied, but the facility metadata table was absent.

CREATE TABLE IF NOT EXISTS public.lab_portal_facility_meta (
  lab_id uuid PRIMARY KEY REFERENCES public.lab_profiles(id) ON DELETE CASCADE,
  short_code text NOT NULL DEFAULT 'DM',
  arabic_name text,
  facility_type text,
  operating_hours text,
  website text,
  ceenaix_integration text,
  dha_lab_license text,
  dha_lab_expiry text,
  dha_lab_accreditations text,
  dha_radiology_license text,
  dha_radiology_expiry text,
  dha_radiology_accreditations text,
  nabidh_vendor_id text,
  radiologist_name text,
  radiologist_credentials text,
  technician_name text,
  technician_credentials text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_lab_portal_facility_meta_updated_at ON public.lab_portal_facility_meta;
CREATE TRIGGER trg_lab_portal_facility_meta_updated_at
  BEFORE UPDATE ON public.lab_portal_facility_meta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.lab_portal_facility_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_portal_facility_meta_read_lab" ON public.lab_portal_facility_meta;
CREATE POLICY "lab_portal_facility_meta_read_lab"
  ON public.lab_portal_facility_meta
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );
