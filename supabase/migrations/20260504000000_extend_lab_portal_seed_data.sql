-- Extend lab portal schema and seed data so all hosted Lab tabs are fully data-bound.
-- - Adds insurance plan/blood type/dha_license/clinical_notes columns to lab_orders
-- - Adds reference_range/loinc_code/specimen/icd10/cpt to lab_order_items
-- - Adds extra metadata columns to imaging studies (icd10, cpt, contrast, prep, indication, technician, insurance)
-- - Adds critical_value_log, lab_test_orders catalog, and report_drafts tables
-- - Seeds 8 lab samples + 8 imaging studies + 8 equipment + 6 qc runs + 8 nabidh events + 6 settings
-- All data is keyed off the seeded "Dubai Medical & Imaging Centre" lab_profile.

-- ============================================================================
-- 1. Schema additions on existing tables
-- ============================================================================

ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS insurance_plan text,
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS doctor_dha_license text,
  ADD COLUMN IF NOT EXISTS doctor_specialty text,
  ADD COLUMN IF NOT EXISTS clinic_name text,
  ADD COLUMN IF NOT EXISTS clinical_notes text,
  ADD COLUMN IF NOT EXISTS specimen_summary text,
  ADD COLUMN IF NOT EXISTS fasting_instructions text,
  ADD COLUMN IF NOT EXISTS preauth_status text,
  ADD COLUMN IF NOT EXISTS technician_name text,
  ADD COLUMN IF NOT EXISTS technician_initials text,
  ADD COLUMN IF NOT EXISTS source_label text,
  ADD COLUMN IF NOT EXISTS patient_display_name text,
  ADD COLUMN IF NOT EXISTS patient_age integer,
  ADD COLUMN IF NOT EXISTS patient_gender text;

ALTER TABLE public.lab_order_items
  ADD COLUMN IF NOT EXISTS specimen_type text,
  ADD COLUMN IF NOT EXISTS target_tat text,
  ADD COLUMN IF NOT EXISTS reference_min_value text,
  ADD COLUMN IF NOT EXISTS reference_max_value text;

ALTER TABLE public.lab_portal_imaging_studies
  ADD COLUMN IF NOT EXISTS icd10_code text,
  ADD COLUMN IF NOT EXISTS icd10_description text,
  ADD COLUMN IF NOT EXISTS cpt_code text,
  ADD COLUMN IF NOT EXISTS clinical_indication text,
  ADD COLUMN IF NOT EXISTS contrast text,
  ADD COLUMN IF NOT EXISTS prep_instructions text,
  ADD COLUMN IF NOT EXISTS rooms_available_summary text,
  ADD COLUMN IF NOT EXISTS suggested_slot text,
  ADD COLUMN IF NOT EXISTS preauth_status text,
  ADD COLUMN IF NOT EXISTS preauth_coverage text,
  ADD COLUMN IF NOT EXISTS insurance_plan text,
  ADD COLUMN IF NOT EXISTS doctor_dha_license text,
  ADD COLUMN IF NOT EXISTS doctor_specialty text,
  ADD COLUMN IF NOT EXISTS source_label text;

ALTER TABLE public.lab_portal_equipment
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS today_count integer,
  ADD COLUMN IF NOT EXISTS uptime_percent integer,
  ADD COLUMN IF NOT EXISTS qc_lot_number text,
  ADD COLUMN IF NOT EXISTS qc_passed_at_label text,
  ADD COLUMN IF NOT EXISTS reagents jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_user_label text,
  ADD COLUMN IF NOT EXISTS active_remaining_label text;

-- ============================================================================
-- 2. New tables for hosted-only UI surfaces
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lab_portal_critical_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.lab_profiles(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  test_name text NOT NULL,
  value_label text NOT NULL,
  notified_in_minutes integer,
  status text NOT NULL DEFAULT 'pending',
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_portal_critical_values_status_chk CHECK (status IN ('pending', 'notified'))
);

CREATE INDEX IF NOT EXISTS idx_lab_portal_critical_values_lab
  ON public.lab_portal_critical_values(lab_id, observed_at DESC);

ALTER TABLE public.lab_portal_critical_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_portal_critical_values_read_lab" ON public.lab_portal_critical_values;
CREATE POLICY "lab_portal_critical_values_read_lab"
  ON public.lab_portal_critical_values
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

CREATE TABLE IF NOT EXISTS public.lab_portal_top_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.lab_profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  value integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_portal_top_metrics_category_chk CHECK (category IN ('lab_test', 'imaging_study')),
  CONSTRAINT lab_portal_top_metrics_unique UNIQUE (lab_id, category, label)
);

CREATE INDEX IF NOT EXISTS idx_lab_portal_top_metrics_lab
  ON public.lab_portal_top_metrics(lab_id, category, sort_order);

ALTER TABLE public.lab_portal_top_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_portal_top_metrics_read_lab" ON public.lab_portal_top_metrics;
CREATE POLICY "lab_portal_top_metrics_read_lab"
  ON public.lab_portal_top_metrics
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

CREATE TABLE IF NOT EXISTS public.lab_portal_volume_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.lab_profiles(id) ON DELETE CASCADE,
  day_label text NOT NULL,
  lab_volume integer NOT NULL DEFAULT 0,
  radiology_volume integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_portal_volume_trends_unique UNIQUE (lab_id, day_label)
);

CREATE INDEX IF NOT EXISTS idx_lab_portal_volume_trends_lab
  ON public.lab_portal_volume_trends(lab_id, sort_order);

ALTER TABLE public.lab_portal_volume_trends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_portal_volume_trends_read_lab" ON public.lab_portal_volume_trends;
CREATE POLICY "lab_portal_volume_trends_read_lab"
  ON public.lab_portal_volume_trends
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

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

CREATE TABLE IF NOT EXISTS public.lab_portal_setting_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id uuid NOT NULL REFERENCES public.lab_portal_settings(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_selected boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_portal_setting_options_unique UNIQUE (setting_id, label)
);

CREATE INDEX IF NOT EXISTS idx_lab_portal_setting_options_setting
  ON public.lab_portal_setting_options(setting_id, sort_order);

ALTER TABLE public.lab_portal_setting_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_portal_setting_options_read_lab" ON public.lab_portal_setting_options;
CREATE POLICY "lab_portal_setting_options_read_lab"
  ON public.lab_portal_setting_options
  FOR SELECT
  USING (true);

-- ============================================================================
-- 3. Seed Lab samples (lab_orders + items) for the demo lab.
-- ============================================================================

-- We need at least one patient and doctor user_profile to attach lab_orders to.
DO $$
DECLARE
  demo_lab_id uuid;
  patient_user_id uuid := '00000000-0000-0000-0000-000000000a01';
  doctor_user_id uuid := '00000000-0000-0000-0000-000000000a02';
  i integer;
BEGIN
  SELECT id INTO demo_lab_id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre' LIMIT 1;
  IF demo_lab_id IS NULL THEN
    RAISE NOTICE 'demo lab profile missing, skipping lab order seed';
    RETURN;
  END IF;

  -- Ensure auth.users + user_profiles for canonical patient and doctor.
  -- We use deterministic UUIDs and skip if real users already exist with this id.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = patient_user_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
      is_sso_user, is_anonymous
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', patient_user_id, 'authenticated', 'authenticated',
      'lab.demo.patient@example.local', crypt('CeenAiXDemo!', gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('role', 'patient', 'full_name', 'Aisha Mohammed Al Reem'),
      false, now(), now(), false, false
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = doctor_user_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
      is_sso_user, is_anonymous
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', doctor_user_id, 'authenticated', 'authenticated',
      'lab.demo.doctor@example.local', crypt('CeenAiXDemo!', gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('role', 'doctor', 'full_name', 'Dr. Ahmed Al Rashidi'),
      false, now(), now(), false, false
    );
  END IF;

  INSERT INTO public.user_profiles (user_id, role, full_name, first_name, last_name, email, city, gender, date_of_birth, profile_completed, terms_accepted)
  VALUES
    (patient_user_id, 'patient', 'Aisha Mohammed Al Reem', 'Aisha', 'Al Reem', 'lab.demo.patient@example.local', 'Dubai', 'female', date '1984-04-12', true, true),
    (doctor_user_id, 'doctor', 'Dr. Ahmed Al Rashidi', 'Ahmed', 'Al Rashidi', 'lab.demo.doctor@example.local', 'Dubai', 'male', date '1979-09-03', true, true)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    city = EXCLUDED.city,
    gender = EXCLUDED.gender,
    date_of_birth = EXCLUDED.date_of_birth,
    profile_completed = true,
    terms_accepted = true,
    updated_at = now();

  -- Wipe and re-seed lab orders for this lab so the queue shows hosted-style 8 samples
  DELETE FROM public.lab_order_items
    WHERE lab_order_id IN (SELECT id FROM public.lab_orders WHERE assigned_lab_id = demo_lab_id);
  DELETE FROM public.lab_orders WHERE assigned_lab_id = demo_lab_id;

  -- Sample 1: Critical unnotified
  INSERT INTO public.lab_orders (
    id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
    insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
    clinical_notes, specimen_summary, fasting_instructions, preauth_status,
    technician_name, technician_initials, source_label,
    patient_display_name, patient_age, patient_gender,
    sample_collection_at, results_released_at, due_by, total_cost_aed
  )
  VALUES (
    gen_random_uuid(), patient_user_id, doctor_user_id, 'resulted', now() - interval '2 hours 37 minutes',
    demo_lab_id, 'LAB-20260407-002847', 'stat',
    'Oman Insurance', 'O+', 'DHA-PRAC-2019-031042', 'General Medicine', 'Al Zahra Clinic',
    'Acute chest pain. Rule out MI. Repeat troponin if first negative.',
    'SST × 1 · Citrate × 1 · EDTA × 1', 'Not required', 'Not required',
    'Fatima Al Rashidi', 'FA', 'CeenAiX ePrescription',
    'Ibrahim Al Marzouqi', 55, 'male',
    now() - interval '2 hours 30 minutes', NULL, now() + interval '23 minutes', 540
  );

  -- Sample 2: Newly received
  INSERT INTO public.lab_orders (
    id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
    insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
    clinical_notes, specimen_summary, fasting_instructions, preauth_status,
    technician_name, technician_initials, source_label,
    patient_display_name, patient_age, patient_gender,
    sample_collection_at, due_by, total_cost_aed
  )
  VALUES (
    gen_random_uuid(), patient_user_id, doctor_user_id, 'ordered', now() - interval '5 minutes',
    demo_lab_id, 'LAB-20260407-003891', 'urgent',
    'AXA Gulf Standard', 'O-', 'DHA-PRAC-2018-047821', 'Cardiologist', 'Al Noor Medical Center',
    'Patient on RAAS therapy (Enalapril + Spironolactone). K+ monitoring critical. Please flag if K+ > 5.0.',
    'Serum separator tube (SST) × 2 · EDTA × 1', 'Not required', 'Not required',
    NULL, 'U', 'CeenAiX ePrescription',
    'Aisha Mohammed', 42, 'female',
    now() - interval '2 minutes', now() + interval '3 hours 55 minutes', 420
  );

  -- Sample 3: In Progress
  INSERT INTO public.lab_orders (
    id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
    insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
    clinical_notes, specimen_summary, fasting_instructions, preauth_status,
    technician_name, technician_initials, source_label,
    patient_display_name, patient_age, patient_gender,
    sample_collection_at, due_by, total_cost_aed
  )
  VALUES (
    gen_random_uuid(), patient_user_id, doctor_user_id, 'processing', now() - interval '1 hour 5 minutes',
    demo_lab_id, 'LAB-20260407-003241', 'urgent',
    'Daman', 'A+', 'DHA-PRAC-2017-019234', 'Cardiologist', 'Burjeel Hospital',
    'Cardiac workup. Rule out NSTEMI.',
    'SST × 2 · EDTA × 1', 'Not required', 'Not required',
    'Ali Hassan', 'AH', 'CeenAiX ePrescription',
    'Mohammed Al Shamsi', 48, 'male',
    now() - interval '1 hour', now() + interval '2 hours 50 minutes', 480
  );

  -- Sample 4: Verified (recent)
  INSERT INTO public.lab_orders (
    id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
    insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
    clinical_notes, specimen_summary, fasting_instructions, preauth_status,
    technician_name, technician_initials, source_label,
    patient_display_name, patient_age, patient_gender,
    sample_collection_at, results_released_at, due_by, total_cost_aed
  )
  VALUES (
    gen_random_uuid(), patient_user_id, doctor_user_id, 'reviewed', now() - interval '3 hours 20 minutes',
    demo_lab_id, 'LAB-20260407-003102', 'routine',
    'MetLife', 'B+', 'DHA-PRAC-2020-029481', 'Internal Medicine', 'Saudi German Hospital',
    'Annual check-up.',
    'EDTA × 1 · SST × 1', '12 hours', 'Not required',
    'Fatima Al Rashidi', 'FA', 'CeenAiX ePrescription',
    'Sara Al Khalili', 34, 'female',
    now() - interval '3 hours 15 minutes', now() - interval '1 hour', now() + interval '40 minutes', 280
  );

  -- Sample 5: Released
  INSERT INTO public.lab_orders (
    id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
    insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
    clinical_notes, specimen_summary, fasting_instructions, preauth_status,
    technician_name, technician_initials, source_label,
    patient_display_name, patient_age, patient_gender,
    sample_collection_at, results_released_at, due_by, total_cost_aed
  )
  VALUES (
    gen_random_uuid(), patient_user_id, doctor_user_id, 'reviewed', now() - interval '4 hours 10 minutes',
    demo_lab_id, 'LAB-20260407-002991', 'routine',
    'Thiqa', 'AB+', 'DHA-PRAC-2017-031044', 'Endocrinologist', 'Cleveland Clinic Abu Dhabi',
    'Diabetic monitoring. Trend HbA1c and lipid profile.',
    'EDTA × 1 · Fluoride oxalate × 1 · SST × 1', '10–12 hours', 'Not required',
    'Omar Said', 'OS', 'CeenAiX ePrescription',
    'Yousuf Al Zaabi', 61, 'male',
    now() - interval '4 hours', now() - interval '1 hour 30 minutes', now() - interval '10 minutes', 360
  );

  -- Sample 6: Accessioned (Urgent)
  INSERT INTO public.lab_orders (
    id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
    insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
    clinical_notes, specimen_summary, fasting_instructions, preauth_status,
    technician_name, technician_initials, source_label,
    patient_display_name, patient_age, patient_gender,
    sample_collection_at, due_by, total_cost_aed
  )
  VALUES (
    gen_random_uuid(), patient_user_id, doctor_user_id, 'collected', now() - interval '29 minutes',
    demo_lab_id, 'LAB-20260407-003450', 'urgent',
    'Daman Enhanced', 'A-', 'DHA-PRAC-2020-029481', 'Hematology', 'City Hospital Dubai',
    'Coagulation panel pre-procedure.',
    'Citrate × 2', 'Not required', 'Covered by Daman Enhanced',
    'Fatima Al Rashidi', 'FA', 'CeenAiX ePrescription',
    'Mariam Al Suwaidi', 29, 'female',
    now() - interval '20 minutes', now() + interval '3 hours 30 minutes', 320
  );

  -- Sample 7: In Progress (Microbiology)
  INSERT INTO public.lab_orders (
    id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
    insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
    clinical_notes, specimen_summary, fasting_instructions, preauth_status,
    technician_name, technician_initials, source_label,
    patient_display_name, patient_age, patient_gender,
    sample_collection_at, due_by, total_cost_aed
  )
  VALUES (
    gen_random_uuid(), patient_user_id, doctor_user_id, 'processing', now() - interval '4 hours 7 minutes',
    demo_lab_id, 'LAB-20260407-003567', 'urgent',
    'Oman Insurance', 'O+', 'DHA-PRAC-2018-047821', 'Internal Medicine', 'Al Noor Medical Center',
    'Suspected bacterial infection. Culture and sensitivity panel.',
    'Sterile container × 1', 'Not required', 'Not required',
    'Nour Saleh', 'NS', 'CeenAiX ePrescription',
    'Hassan Al Mansoori', 52, 'male',
    now() - interval '4 hours', now() + interval '20 hours', 380
  );

  -- Sample 8: Pending Verify (Routine)
  INSERT INTO public.lab_orders (
    id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
    insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
    clinical_notes, specimen_summary, fasting_instructions, preauth_status,
    technician_name, technician_initials, source_label,
    patient_display_name, patient_age, patient_gender,
    sample_collection_at, due_by, total_cost_aed
  )
  VALUES (
    gen_random_uuid(), patient_user_id, doctor_user_id, 'resulted', now() - interval '3 hours 12 minutes',
    demo_lab_id, 'LAB-20260407-003612', 'routine',
    'AXA Gulf', 'B-', 'DHA-PRAC-2020-061122', 'Family Medicine', 'City Hospital Dubai',
    'UTI workup.',
    'Sterile urine container × 1', 'Not required', 'Not required',
    'Ali Hassan', 'AH', 'CeenAiX ePrescription',
    'Fatima Ibrahim', 31, 'female',
    now() - interval '3 hours', now() + interval '50 minutes', 240
  );
END $$;

-- ============================================================================
-- 4. Seed lab_order_items (tests + LOINC codes) per sample
-- ============================================================================

-- Helper: build items for each sample using lab_order_code lookup.
-- Sample 1 (002847) — STAT critical K+/Na+/Cl- panel
INSERT INTO public.lab_order_items (
  lab_order_id, test_name, status, status_category, sort_order, loinc_code,
  result_value, result_unit, reference_range, reference_text, flag,
  numeric_value, reference_min, reference_max, is_abnormal, specimen_type, target_tat,
  reference_min_value, reference_max_value, resulted_at
)
SELECT lo.id, t.test_name, t.status::lab_order_status, t.status_category, t.sort_order, t.loinc,
       t.result_value, t.result_unit, t.ref_range, t.ref_text, t.flag,
       t.numeric_value, t.ref_min, t.ref_max, t.is_abnormal, t.specimen, t.tat,
       t.ref_min_text, t.ref_max_text, t.resulted_at
FROM public.lab_orders lo
CROSS JOIN (VALUES
  ('K+ (Potassium)', 'resulted', 'critical', 1, '2823-3', '6.8', 'mEq/L', '3.5–5.0 mEq/L', '3.5–5.0 mEq/L', 'HH', 6.8::numeric, 3.5::numeric, 5.0::numeric, true, 'Serum', '1h', '3.5', '5.0', now() - interval '15 minutes'),
  ('Na+ (Sodium)', 'resulted', 'normal', 2, '2951-2', '141', 'mmol/L', '135–145 mmol/L', '135–145 mmol/L', NULL, 141::numeric, 135::numeric, 145::numeric, false, 'Serum', '1h', '135', '145', now() - interval '15 minutes'),
  ('Cl- (Chloride)', 'resulted', 'normal', 3, '2075-0', '102', 'mmol/L', '98–107 mmol/L', '98–107 mmol/L', NULL, 102::numeric, 98::numeric, 107::numeric, false, 'Serum', '1h', '98', '107', now() - interval '15 minutes'),
  ('Troponin I', 'resulted', 'borderline', 4, '89579-7', '42', 'ng/L', '0–14 ng/L', '0–14 ng/L', 'H', 42::numeric, 0::numeric, 14::numeric, true, 'Serum', '1h', '0', '14', now() - interval '15 minutes')
) AS t(test_name, status, status_category, sort_order, loinc, result_value, result_unit, ref_range, ref_text, flag, numeric_value, ref_min, ref_max, is_abnormal, specimen, tat, ref_min_text, ref_max_text, resulted_at)
WHERE lo.lab_order_code = 'LAB-20260407-002847';

-- Sample 2 (003891) — BNP / Electrolytes / Renal
INSERT INTO public.lab_order_items (lab_order_id, test_name, status, status_category, sort_order, loinc_code, specimen_type, target_tat, reference_text, reference_min_value, reference_max_value)
SELECT lo.id, t.test_name, 'ordered'::lab_order_status, 'pending', t.sort_order, t.loinc, t.specimen, t.tat, t.ref_text, t.ref_min, t.ref_max
FROM public.lab_orders lo
CROSS JOIN (VALUES
  ('BNP (B-type Natriuretic Peptide)', 1, '30604-8', 'Serum', '2h', '0–100 pg/mL', '0', '100'),
  ('Electrolytes Panel', 2, '24326-1', 'Serum', '1h', NULL, NULL, NULL),
  ('Renal Function', 3, '33914-3', 'Serum', '1h', NULL, NULL, NULL),
  ('K+ (Potassium)', 4, '2823-3', 'Serum', '1h', '3.5–5.0 mEq/L', '3.5', '5.0'),
  ('Creatinine', 5, '2160-0', 'Serum', '1h', '44–97 µmol/L', '44', '97')
) AS t(test_name, sort_order, loinc, specimen, tat, ref_text, ref_min, ref_max)
WHERE lo.lab_order_code = 'LAB-20260407-003891';

-- Sample 3 (003241) — Troponin / BNP / Lipid Panel
INSERT INTO public.lab_order_items (lab_order_id, test_name, status, status_category, sort_order, loinc_code, specimen_type, target_tat, reference_text)
SELECT lo.id, t.test_name, 'processing'::lab_order_status, 'pending', t.sort_order, t.loinc, t.specimen, t.tat, t.ref_text
FROM public.lab_orders lo
CROSS JOIN (VALUES
  ('Troponin I', 1, '89579-7', 'Serum', '1h', '0–14 ng/L'),
  ('BNP', 2, '30604-8', 'Serum', '2h', '0–100 pg/mL'),
  ('Lipid Panel', 3, '57698-3', 'Serum', '4h', NULL),
  ('CBC with differential', 4, '58410-2', 'EDTA', '1h', NULL)
) AS t(test_name, sort_order, loinc, specimen, tat, ref_text)
WHERE lo.lab_order_code = 'LAB-20260407-003241';

-- Sample 4 (003102) — CBC + ESR
INSERT INTO public.lab_order_items (lab_order_id, test_name, status, status_category, sort_order, loinc_code, specimen_type, target_tat, reference_text, result_value, result_unit, is_abnormal)
SELECT lo.id, t.test_name, 'reviewed'::lab_order_status, 'normal', t.sort_order, t.loinc, t.specimen, t.tat, t.ref, t.val, t.unit, false
FROM public.lab_orders lo
CROSS JOIN (VALUES
  ('CBC', 1, '58410-2', 'EDTA', '1h', '4.0–11.0 ×10⁹/L', '6.4', '×10⁹/L'),
  ('ESR', 2, '4537-7', 'EDTA', '1h', '0–20 mm/h', '12', 'mm/h')
) AS t(test_name, sort_order, loinc, specimen, tat, ref, val, unit)
WHERE lo.lab_order_code = 'LAB-20260407-003102';

-- Sample 5 (002991) — HbA1c / FBS / Lipid Panel
INSERT INTO public.lab_order_items (lab_order_id, test_name, status, status_category, sort_order, loinc_code, specimen_type, target_tat, reference_text, result_value, result_unit, is_abnormal)
SELECT lo.id, t.test_name, 'reviewed'::lab_order_status, t.cat, t.sort_order, t.loinc, t.specimen, t.tat, t.ref, t.val, t.unit, t.abnormal
FROM public.lab_orders lo
CROSS JOIN (VALUES
  ('HbA1c', 1, '41995-2', 'EDTA', '4h', '< 6.5%', '7.4', '%', 'borderline', true),
  ('Fasting Blood Sugar', 2, '1558-6', 'Fluoride', '4h', '4.0–6.0 mmol/L', '8.2', 'mmol/L', 'borderline', true),
  ('Lipid Panel', 3, '57698-3', 'Serum', '4h', NULL, NULL, NULL, 'normal', false)
) AS t(test_name, sort_order, loinc, specimen, tat, ref, val, unit, cat, abnormal)
WHERE lo.lab_order_code = 'LAB-20260407-002991';

-- Sample 6 (003450) — Coagulation panel
INSERT INTO public.lab_order_items (lab_order_id, test_name, status, status_category, sort_order, loinc_code, specimen_type, target_tat, reference_text)
SELECT lo.id, t.test_name, 'collected'::lab_order_status, 'pending', t.sort_order, t.loinc, t.specimen, t.tat, t.ref
FROM public.lab_orders lo
CROSS JOIN (VALUES
  ('PT', 1, '5902-2', 'Citrate', '1h', '11.0–14.0 sec'),
  ('aPTT', 2, '14979-9', 'Citrate', '1h', '24–35 sec'),
  ('INR', 3, '6301-6', 'Citrate', '1h', '0.8–1.2'),
  ('Fibrinogen', 4, '3255-7', 'Citrate', '2h', '2.0–4.0 g/L')
) AS t(test_name, sort_order, loinc, specimen, tat, ref)
WHERE lo.lab_order_code = 'LAB-20260407-003450';

-- Sample 7 (003567) — Microbiology
INSERT INTO public.lab_order_items (lab_order_id, test_name, status, status_category, sort_order, loinc_code, specimen_type, target_tat, reference_text)
SELECT lo.id, t.test_name, 'processing'::lab_order_status, 'pending', t.sort_order, t.loinc, t.specimen, t.tat, t.ref
FROM public.lab_orders lo
CROSS JOIN (VALUES
  ('Culture & Sensitivity', 1, '634-6', 'Sterile container', '48–72h', NULL),
  ('Gram Stain', 2, '11551-9', 'Sterile container', '1h', NULL)
) AS t(test_name, sort_order, loinc, specimen, tat, ref)
WHERE lo.lab_order_code = 'LAB-20260407-003567';

-- Sample 8 (003612) — Urinalysis
INSERT INTO public.lab_order_items (lab_order_id, test_name, status, status_category, sort_order, loinc_code, specimen_type, target_tat, reference_text)
SELECT lo.id, t.test_name, 'resulted'::lab_order_status, 'normal', t.sort_order, t.loinc, t.specimen, t.tat, t.ref
FROM public.lab_orders lo
CROSS JOIN (VALUES
  ('Urinalysis', 1, '5804-0', 'Urine', '1h', NULL),
  ('Urine Culture', 2, '630-4', 'Urine', '24–48h', NULL)
) AS t(test_name, sort_order, loinc, specimen, tat, ref)
WHERE lo.lab_order_code = 'LAB-20260407-003612';

-- ============================================================================
-- 5. Reset and re-seed imaging studies with full hosted detail
-- ============================================================================

DELETE FROM public.lab_portal_imaging_studies
  WHERE lab_id IN (SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre');

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_imaging_studies (
  lab_id, accession, patient_name, patient_age, patient_gender,
  doctor_name, clinic_name, modality, study_name, priority, status,
  room, scheduled_at, progress_percent, tat_minutes, report_status, nabidh_status, alerts,
  icd10_code, icd10_description, cpt_code, clinical_indication, contrast, prep_instructions,
  rooms_available_summary, suggested_slot, preauth_status, preauth_coverage, insurance_plan,
  doctor_dha_license, doctor_specialty, source_label
)
SELECT lab.id, s.accession, s.patient, s.age, s.gender, s.doctor, s.clinic, s.modality,
       s.study, s.priority, s.status, s.room, s.scheduled_at, s.progress, s.tat,
       s.report_status, s.nabidh_status, s.alerts,
       s.icd10, s.icd10_desc, s.cpt, s.indication, s.contrast, s.prep,
       s.rooms_avail, s.slot, s.preauth, s.coverage, s.insurance,
       s.dha, s.specialty, s.source
FROM lab CROSS JOIN (VALUES
  ('MRI-20260407-001', 'Sarah Al Hamdan', 35, 'female', 'Dr. Maryam Al Sayed', 'Al Zahra Clinic', 'MRI', 'Brain MRI w/wo contrast', 'STAT', 'scanning',
   'MRI-2 (Siemens Vida 3T)', now() - interval '15 minutes', 55, 20, 'In acquisition', 'pending', ARRAY['Critical neuro indication'],
   'G93.40', 'Encephalopathy unspecified', '70553', 'Acute neuro symptoms. Rule out stroke vs encephalopathy.', 'Gadolinium', 'No metal items',
   '4 of 6 rooms available', 'Today 4:00 PM', NULL, NULL, 'Oman Insurance',
   'DHA-PRAC-2019-031042', 'Neurology', 'CeenAiX ePrescription'),
  ('CT-20260407-002', 'Hassan Al Mansoori', 52, 'male', 'Dr. Khalid Al Nasser', 'Burjeel Hospital', 'CT', 'CT Chest w/ contrast', 'Urgent', 'scanning',
   'CT-2 (Philips IQon 256)', now() - interval '5 minutes', 78, 15, 'In acquisition', 'pending', ARRAY['Iodine contrast — consent on file'],
   'R91.8', 'Lung lesion', '71250', 'RLL nodule surveillance.', 'Iodine 80mL IV', 'Remove metal',
   '3 of 4 rooms available', 'Today 3:00 PM', NULL, NULL, 'Daman',
   'DHA-PRAC-2017-019234', 'Cardiology', 'CeenAiX ePrescription'),
  ('USS-20260407-003', 'Fatima Ibrahim', 31, 'female', 'Dr. Mariam Al Farsi', 'City Hospital Dubai', 'USS', 'Obstetric USS — 20 weeks', 'Routine', 'scanning',
   'USS-3', now() - interval '10 minutes', 40, 10, 'In acquisition', 'pending', ARRAY[]::text[],
   'Z34.83', 'Encounter for supervision of pregnancy', '76805', 'Routine obstetric anatomy scan.', 'No', 'Full bladder',
   '5 of 6 rooms available', 'Today 2:30 PM', NULL, NULL, 'AXA Gulf',
   'DHA-PRAC-2020-061122', 'Family Medicine', 'CeenAiX ePrescription'),
  ('CT-20260407-004', 'Mohammed Al Khalidi', 48, 'male', 'Dr. Fatima Al Mansoori', 'Al Noor Medical Center', 'CT', 'CT Chest w/ contrast', 'Urgent', 'report_pending',
   'CT-2 (Philips IQon 256)', now() - interval '2 hours 30 minutes', 100, 150, 'Awaiting radiologist', 'pending', ARRAY['2.5h pending — exceeds 3h target soon'],
   'R91.8', 'Lung lesion', '71250', 'Known smoker, RLL nodule surveillance from June 2025 CT. Query growth/progression.', 'Iodine 80mL IV', 'Remove metal',
   '3 of 4 rooms available', 'Reported by 4:00 PM', NULL, NULL, 'Daman',
   'DHA-PRAC-2018-047821', 'Pulmonology', 'CeenAiX ePrescription'),
  ('MRI-20260407-005', 'Aisha Al Mansoori', 46, 'female', 'Dr. Rashed Al Blooshi', 'Cleveland Clinic Abu Dhabi', 'MRI', 'MRI Lumbar Spine', 'Urgent', 'report_pending',
   'MRI-2 (Siemens Vida 3T)', now() - interval '4 hours 48 minutes', 100, 288, 'OVERDUE', 'failed', ARRAY['4.8h pending — overdue', 'NABIDH submission failed'],
   'M51.36', 'Other intervertebral disc degeneration', '72148', 'Chronic low back pain with radiculopathy.', 'No', 'No metal',
   '4 of 6 rooms available', 'Sign by 4:30 PM', NULL, NULL, 'Thiqa',
   'DHA-PRAC-2017-031044', 'Neurology', 'CeenAiX ePrescription'),
  ('MRI-20260407-006', 'Yousuf Al Zaabi', 61, 'male', 'Dr. Layla Al Hashimi', 'City Hospital Dubai', 'MRI', 'MRI Knee (Right)', 'Routine', 'scheduled',
   'MRI-1 (Siemens Sola 1.5T)', now() + interval '15 minutes', 0, NULL, 'Scheduled', 'pending', ARRAY[]::text[],
   'M25.561', 'Pain in right knee', '73721', 'Right knee pain post-trauma.', 'No', 'Remove metal',
   'Queue 1 study', 'Today 2:30 PM', NULL, NULL, 'Thiqa',
   'DHA-PRAC-2017-031044', 'Orthopedics', 'CeenAiX ePrescription'),
  ('CT-20260407-007', 'Mariam Al Suwaidi', 29, 'female', 'Dr. Layla Al Hashimi', 'City Hospital Dubai', 'CT', 'CT Abdomen + Pelvis', 'Urgent', 'scheduled',
   'CT-1 (Siemens Definition 64)', now() + interval '30 minutes', 0, NULL, 'Scheduled', 'pending', ARRAY['Contrast consent not yet signed'],
   'R10.84', 'Generalized abdominal pain', '74178', 'RLQ pain. Rule out appendicitis.', 'Iodine 100mL IV', 'NPO 4 hours',
   '3 of 4 rooms available', 'Today 2:45 PM', 'Pre-auth required', '80% covered pending pre-auth', 'AXA Gulf Standard',
   'DHA-PRAC-2020-029481', 'Hematology', 'CeenAiX ePrescription'),
  ('PET-20260407-008', 'Mohammed Al Rasheed', 63, 'male', 'Dr. Amira Al Nabulsi', 'Dubai Hospital', 'PET', 'PET-CT Full Body', 'Urgent', 'scheduled',
   'PET-1 (GE Discovery MI)', now() + interval '1 hour 15 minutes', 0, NULL, 'Scheduled', 'pending', ARRAY['FDG injection due at 2:30 PM'],
   'C34.9', 'Malignant neoplasm of bronchus and lung', '78816', 'Staging PET-CT for newly diagnosed NSCLC.', 'FDG', 'Fasting 4–6 hours',
   '1 of 1 rooms available', 'Today 3:30 PM', 'Pre-auth required', '100% covered subject to approval', 'Thiqa',
   'DHA-PRAC-2017-019234', 'Oncology', 'CeenAiX ePrescription'),
  ('XR-20260407-009', 'Salem Al Mazrouei', 29, 'male', 'Dr. Hassan Al Ali', 'Walk-in', 'X-Ray', 'Chest X-Ray (PA + Lateral)', 'Routine', 'released',
   'X-Ray Bay 3', now() - interval '3 hours', 100, 35, 'Released', 'submitted', ARRAY[]::text[],
   'R05', 'Cough', '71046', 'Productive cough 2 weeks. Rule out pneumonia or TB.', 'No', 'Remove metal',
   '2 of 3 rooms available', 'Released 11:45 AM', 'Not required', 'Covered by Daman', 'Daman',
   'DHA-PRAC-2022-062811', 'GP', 'Walk-in'),
  ('USS-20260407-010', 'Noura Al Hashimi', 47, 'female', 'Dr. Layla Al Hashimi', 'City Hospital Dubai', 'USS', 'Abdomen Ultrasound', 'Routine', 'reported',
   'USS-2', now() - interval '1 hour 48 minutes', 100, 108, 'Reported', 'submitted', ARRAY[]::text[],
   'R10.84', 'Generalized abdominal pain', '76700', 'RUQ tenderness. Rule out cholelithiasis.', 'No', 'Fasting 6 hours',
   '5 of 6 rooms available', 'Reported 12:15 PM', 'Not required', 'Covered by Daman Enhanced', 'Daman Enhanced',
   'DHA-PRAC-2020-029481', 'Endocrinology', 'CeenAiX ePrescription')
) AS s(accession, patient, age, gender, doctor, clinic, modality, study, priority, status,
       room, scheduled_at, progress, tat, report_status, nabidh_status, alerts,
       icd10, icd10_desc, cpt, indication, contrast, prep,
       rooms_avail, slot, preauth, coverage, insurance, dha, specialty, source);

-- ============================================================================
-- 6. Reset and re-seed equipment with hosted detail
-- ============================================================================

DELETE FROM public.lab_portal_equipment
  WHERE lab_id IN (SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre');

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_equipment (
  lab_id, department, name, equipment_type, room, status,
  metric_label, metric_value, qc_status, reagent_level_percent, alert, maintenance_due_at,
  subtitle, today_count, uptime_percent, qc_lot_number, qc_passed_at_label, reagents,
  active_user_label, active_remaining_label
)
SELECT lab.id, e.department, e.name, e.type, e.room, e.status,
       e.metric_label, e.metric_value, e.qc_status, e.reagent_level, e.alert, e.maintenance_due,
       e.subtitle, e.today_count, e.uptime, e.qc_lot, e.qc_when, e.reagents::jsonb,
       e.active_user, e.active_remaining
FROM lab CROSS JOIN (VALUES
  -- Radiology
  ('radiology', 'MRI-2', 'Siemens MAGNETOM Vida 3T', 'MRI Suite 2', 'maintenance', 'Today', '12', 'Daily QC passed 6:00 AM', NULL::integer, NULL::text,
    NULL::timestamptz, 'MRI · 3 Tesla', 12, 94, NULL, '6:00 AM', '[]', 'Sarah Al Hamdan · Brain MRI', '~20 min remaining'),
  ('radiology', 'MRI-1', 'Siemens MAGNETOM Sola 1.5T', 'MRI Suite 1', 'online', 'Today', '8', 'QC Passed 6:00 AM', NULL, NULL,
    NULL::timestamptz, 'MRI · 1.5 Tesla', 8, 97, NULL, '6:00 AM', '[]', 'Queue: 1 study (Yousuf Al Zaabi, 2:30 PM)', NULL),
  ('radiology', 'CT-2', 'Philips IQon Spectral CT 256-slice', 'CT Room 2', 'maintenance', 'Today', '7', 'Passed', NULL, 'Today avg DLP: 287 mGy·cm',
    NULL::timestamptz, 'CT · 256-slice', 7, 99, NULL, NULL, '[]', 'Hassan Al Mansoori · CT Chest', '~5 min remaining'),
  ('radiology', 'CT-1', 'Siemens SOMATOM Definition 64-slice', 'CT Room 1', 'online', 'Today', '3', 'Passed · Contrast injector: Ready', NULL, NULL,
    NULL::timestamptz, 'CT · 64-slice', 3, 98, NULL, NULL, '[]', 'Queue: Mariam Al Suwaidi · 2:45 PM', NULL),
  ('radiology', 'USS Suite (USS-1 to USS-6)', 'Ultrasound Suite', 'Ultrasound Suite', 'online', 'Today', '8', 'All units calibrated', NULL, NULL,
    NULL::timestamptz, 'Diagnostic Ultrasound', 8, 100, NULL, NULL, '[]', '5 of 6 rooms available — USS-3 currently scanning (Fatima Ibrahim · Obstetric)', NULL),
  ('radiology', 'MAMMO-1', 'Mammography Unit', 'Mammography Suite', 'online', 'Today', '2', 'Within MQSA standards', NULL, 'Within MQSA dose limits',
    NULL::timestamptz, 'Full-field digital mammography', 2, 100, NULL, NULL, '[]', 'Next screening: 3 Jan 2027 (annual calibration)', NULL),
  ('radiology', 'PET-1', 'GE Discovery MI PET-CT', 'PET Suite', 'warning', 'Today', '0', 'Monthly radiation survey completed', NULL, 'FDG injection due at 2:30 PM — 23 min away',
    NULL::timestamptz, 'PET-CT Hybrid', 0, 100, NULL, NULL, '[]', 'Next study: Mohammed Al Rasheed · 3:30 PM', NULL),
  ('radiology', 'X-Ray Suite (XR-1, XR-2, XR-3)', 'Digital X-Ray Suite', 'Imaging Bay', 'warning', 'Today', '20', 'Daily QA in progress', NULL, 'XR-3 in QA: Image quality phantom test · ETA 15 min. XR-1 & XR-2 online.',
    NULL::timestamptz, 'DR Radiography', 20, 96, NULL, NULL, '[]', NULL, NULL),
  -- Laboratory
  ('laboratory', 'Roche Cobas 6000', 'Chemistry Analyzer', 'Chemistry', 'online', 'Maintenance due', '15 Apr 2026 (8 days)', '✅ PASS 6:00 AM', NULL, NULL,
    now() + interval '8 days', '12 samples in current batch · Lipid panels', 12, NULL, 'QC-2026-CH-044', '6:00 AM',
    '[{"name":"Cholesterol","percent":67},{"name":"Glucose","percent":45},{"name":"Triglycerides","percent":38}]',
    NULL, '~45 min remaining'),
  ('laboratory', 'Roche Cobas 8000', 'Immunoassay / Hormones Analyzer', 'Immunology & Hormones', 'online', 'Maintenance due', '22 Apr 2026 (15 days)', '✅ PASS 6:30 AM', NULL, NULL,
    now() + interval '15 days', 'Queue: 4 samples pending', 4, NULL, 'QC-2026-IM-021', '6:30 AM',
    '[{"name":"TSH reagent","percent":72},{"name":"FT4 reagent","percent":58},{"name":"Cortisol","percent":81}]',
    NULL, NULL),
  ('laboratory', 'Sysmex XN-3000', 'Haematology Analyser', 'Haematology', 'online', 'Maintenance due', '30 Apr 2026 (23 days)', '✅ PASS 6:15 AM', NULL, NULL,
    now() + interval '23 days', 'Queue: 8 CBCs pending', 8, NULL, 'QC-2026-HM-038', '6:15 AM',
    '[{"name":"CELL PACK DFL","percent":82},{"name":"SE-PACK","percent":71},{"name":"LYSERCELL WDF","percent":64}]',
    NULL, NULL),
  ('laboratory', 'Siemens BCS XP', 'Coagulation Analyser', 'Coagulation', 'maintenance', 'Maintenance due', 'ETA: 3:00 PM', '⚠️ No QC run — under maintenance', NULL, 'Engineer: Siemens Field Service · On site',
    now() + interval '0 days', '⚠️ UNDER MAINTENANCE — Since: 1:30 PM · ETA: 3:00 PM · Reason: Daily maintenance + ISI calibration. Samples rerouted to Sysmex CA-600.', 0, NULL, 'N/A', NULL,
    '[]',
    NULL, NULL),
  ('laboratory', 'Sysmex CA-600', 'Coagulation Analyser (Backup)', 'Coagulation', 'online', 'Maintenance due', '18 Apr 2026 (11 days)', '✅ Recalibrated 1:30 PM · PASS', NULL, NULL,
    now() + interval '11 days', 'Handling diverted BCS XP samples', 0, NULL, 'QC-2026-CO-009', '1:30 PM',
    '[{"name":"PT reagent","percent":76},{"name":"aPTT reagent","percent":68}]',
    NULL, 'Ongoing'),
  ('laboratory', 'BioMerieux VITEK 2', 'Microbiology Identification System', 'Microbiology', 'online', 'Maintenance due', '10 May 2026 (33 days)', '✅ PASS · Incubator: 35.0°C ✅', NULL, NULL,
    now() + interval '33 days', '7 active cultures — 48–72h cycles', 7, NULL, 'QC-2026-MC-017', NULL,
    '[{"name":"GN card","percent":83},{"name":"GP card","percent":91}]',
    NULL, NULL),
  ('laboratory', 'Beckman AU 5800', 'Urinalysis Analyzer', 'Urinalysis', 'online', 'Maintenance due', '25 Apr 2026 (18 days)', '✅ PASS 6:45 AM', NULL, NULL,
    now() + interval '18 days', 'Queue: 3 samples', 3, NULL, 'QC-2026-UR-011', '6:45 AM',
    '[{"name":"Urisys reagent strips","percent":78}]',
    NULL, NULL)
) AS e(department, name, type, room, status, metric_label, metric_value, qc_status, reagent_level, alert, maintenance_due,
       subtitle, today_count, uptime, qc_lot, qc_when, reagents, active_user, active_remaining);

-- ============================================================================
-- 7. Reset and re-seed QC runs with hosted detail
-- ============================================================================

DELETE FROM public.lab_portal_qc_runs
  WHERE lab_id IN (SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre');

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_qc_runs (lab_id, department, instrument_name, lot_number, level_label, result_label, status, run_at)
SELECT lab.id, q.department, q.instrument, q.lot, q.level, q.result, q.status, q.run_at
FROM lab CROSS JOIN (VALUES
  ('laboratory', 'Roche Cobas 6000', 'QC-2026-CH-044', 'L1 + L2', 'PASS', 'passed', now() - interval '8 hours'),
  ('laboratory', 'Sysmex XN-3000', 'QC-2026-HM-038', 'L1 + L2', 'PASS', 'passed', now() - interval '7 hours 45 minutes'),
  ('laboratory', 'Roche Cobas 8000', 'QC-2026-IM-021', 'L1 + L2', 'PASS', 'passed', now() - interval '7 hours 30 minutes'),
  ('laboratory', 'BioMerieux VITEK 2', 'QC-2026-MC-017', 'Positive control', 'PASS', 'passed', now() - interval '7 hours 15 minutes'),
  ('laboratory', 'Siemens BCS XP', 'N/A', 'N/A', 'MAINTENANCE', 'warning', now() - interval '30 minutes'),
  ('laboratory', 'Sysmex CA-600', 'QC-2026-CO-009', 'L1 + L2', 'PASS (recal.)', 'passed', now() - interval '30 minutes')
) AS q(department, instrument, lot, level, result, status, run_at);

-- ============================================================================
-- 8. Reset and re-seed NABIDH events with hosted detail
-- ============================================================================

DELETE FROM public.lab_portal_nabidh_events
  WHERE lab_id IN (SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre');

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_nabidh_events (
  lab_id, resource_type, reference_code, patient_name, status, reason, submitted_at, created_at
)
SELECT lab.id, e.rt, e.ref, e.patient, e.status, e.reason, e.submitted, e.created
FROM lab CROSS JOIN (VALUES
  ('Observation', 'LAB-003891', 'Aisha Mohammed', 'pending', 'Results pending — awaiting analyzer', NULL::timestamptz, now() - interval '5 minutes'),
  ('DiagnosticReport', 'LAB-002847', 'Ibrahim Al Marzouqi', 'pending', 'Critical value — held pending notification', NULL::timestamptz, now() - interval '15 minutes'),
  ('Observation', 'LAB-003450', 'Mariam Al Suwaidi', 'pending', 'BCS XP maintenance — rerouted to backup', NULL::timestamptz, now() - interval '29 minutes'),
  ('Observation', 'LAB-003567', 'Hassan Al Mansoori', 'pending', 'Culture in progress — 48–72h cycle', NULL::timestamptz, now() - interval '4 hours'),
  ('Observation', 'LAB-003612', 'Fatima Ibrahim', 'pending', 'Awaiting supervisor verification', NULL::timestamptz, now() - interval '3 hours 12 minutes'),
  ('ImagingStudy', 'CT-20260407-004', 'Mohammed Al Khalidi', 'pending', 'Report pending radiologist sign-off', NULL::timestamptz, now() - interval '2 hours 30 minutes'),
  ('ImagingStudy', 'MRI-20260407-001', 'Sarah Al Hamdan', 'pending', 'Study still in progress', NULL::timestamptz, now() - interval '15 minutes'),
  ('ImagingStudy', 'USS-20260407-003', 'Fatima Ibrahim', 'pending', 'Study still in progress', NULL::timestamptz, now() - interval '10 minutes'),
  ('Observation', 'NABIDH-OBS-20260407-00841', 'Aisha Mohammed', 'submitted', NULL, now() - interval '5 minutes', now() - interval '6 minutes'),
  ('DiagnosticReport', 'NABIDH-DR-20260407-00839', 'Ibrahim Al Marzouqi', 'submitted', NULL, now() - interval '15 minutes', now() - interval '16 minutes'),
  ('DiagnosticReport', 'NABIDH-DR-20260407-00821', 'Yousuf Al Zaabi', 'submitted', NULL, now() - interval '1 hour 30 minutes', now() - interval '1 hour 31 minutes'),
  ('Observation', 'NABIDH-OBS-20260407-00804', 'Sara Al Khalili', 'submitted', NULL, now() - interval '2 hours 30 minutes', now() - interval '2 hours 31 minutes'),
  ('ImagingStudy', 'NABIDH-IS-20260407-00797', 'Salem Al Mazrouei', 'submitted', NULL, now() - interval '3 hours', now() - interval '3 hours 1 minutes')
) AS e(rt, ref, patient, status, reason, submitted, created);

-- ============================================================================
-- 9. Reset and re-seed settings with options
-- ============================================================================

DELETE FROM public.lab_portal_settings
  WHERE lab_id IN (SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre');

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_settings (lab_id, section, label, value, enabled)
SELECT lab.id, s.section, s.label, s.value, s.enabled
FROM lab CROSS JOIN (VALUES
  ('General', 'Default landing page', 'Dashboard', true),
  ('General', 'Auto-logout timer', '15 minutes', true),
  ('General', 'Compact mode', 'Off', false),
  ('General', 'Barcode scanner input', 'USB HID (keyboard)', true),
  ('General', 'Result units', 'mmol/L (SI units)', true),
  ('Notifications', 'Critical value escalation', 'After 15 minutes', true)
) AS s(section, label, value, enabled);

WITH demo_settings AS (
  SELECT lps.id, lps.label
  FROM public.lab_portal_settings lps
  JOIN public.lab_profiles lp ON lp.id = lps.lab_id
  WHERE lp.slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_setting_options (setting_id, label, is_selected, sort_order)
SELECT s.id, opt.label, opt.is_selected, opt.sort_order
FROM demo_settings s
JOIN (VALUES
  ('Default landing page', 'Dashboard', true, 1),
  ('Default landing page', 'Lab Queue', false, 2),
  ('Default landing page', 'Imaging Queue', false, 3),
  ('Auto-logout timer', '15 minutes', true, 1),
  ('Auto-logout timer', '30 minutes', false, 2),
  ('Auto-logout timer', '60 minutes', false, 3),
  ('Compact mode', 'On', false, 1),
  ('Compact mode', 'Off', true, 2),
  ('Barcode scanner input', 'USB HID (keyboard)', true, 1),
  ('Barcode scanner input', 'Serial port', false, 2),
  ('Barcode scanner input', 'Camera', false, 3),
  ('Result units', 'mmol/L (SI units)', true, 1),
  ('Result units', 'mg/dL (conventional)', false, 2)
) AS opt(setting_label, label, is_selected, sort_order)
  ON s.label = opt.setting_label
ON CONFLICT (setting_id, label) DO NOTHING;

-- ============================================================================
-- 10. Seed facility meta + critical values + top metrics + volume trends
-- ============================================================================

INSERT INTO public.lab_portal_facility_meta (
  lab_id, short_code, arabic_name, facility_type, operating_hours, website, ceenaix_integration,
  dha_lab_license, dha_lab_expiry, dha_lab_accreditations,
  dha_radiology_license, dha_radiology_expiry, dha_radiology_accreditations,
  nabidh_vendor_id, radiologist_name, radiologist_credentials,
  technician_name, technician_credentials
)
SELECT lp.id, 'DM', 'مركز دبي للتشخيص والتصوير الطبي', 'Private Diagnostic Centre',
       '24/7 — Day | Evening | Night shifts', 'www.dubaimedicalimaging.ae', 'Fully integrated',
       'DHA-LAB-2015-002841', 'Dec 2026', 'CAP Accredited ✅ | ISO 15189:2022 ✅',
       'DHA-RAD-2016-001247', 'Mar 2027', 'JCI Accredited ✅ | Radiation safety ✅',
       'NABIDH-VENDOR-2024-00847', 'Dr. Rania Al Suwaidi', 'FRCR',
       'Fatima Al Rashidi', 'MLS Senior'
FROM public.lab_profiles lp
WHERE lp.slug = 'dubai-medical-imaging-centre'
ON CONFLICT (lab_id) DO UPDATE SET
  short_code = EXCLUDED.short_code,
  arabic_name = EXCLUDED.arabic_name,
  facility_type = EXCLUDED.facility_type,
  operating_hours = EXCLUDED.operating_hours,
  website = EXCLUDED.website,
  ceenaix_integration = EXCLUDED.ceenaix_integration,
  dha_lab_license = EXCLUDED.dha_lab_license,
  dha_lab_expiry = EXCLUDED.dha_lab_expiry,
  dha_lab_accreditations = EXCLUDED.dha_lab_accreditations,
  dha_radiology_license = EXCLUDED.dha_radiology_license,
  dha_radiology_expiry = EXCLUDED.dha_radiology_expiry,
  dha_radiology_accreditations = EXCLUDED.dha_radiology_accreditations,
  nabidh_vendor_id = EXCLUDED.nabidh_vendor_id,
  radiologist_name = EXCLUDED.radiologist_name,
  radiologist_credentials = EXCLUDED.radiologist_credentials,
  technician_name = EXCLUDED.technician_name,
  technician_credentials = EXCLUDED.technician_credentials,
  updated_at = now();

DELETE FROM public.lab_portal_critical_values
  WHERE lab_id IN (SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre');

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_critical_values (lab_id, patient_name, test_name, value_label, notified_in_minutes, status, observed_at)
SELECT lab.id, c.patient, c.test, c.value, c.notified, c.status, c.observed
FROM lab CROSS JOIN (VALUES
  ('Ibrahim Al Marzouqi', 'K+ (Potassium)', '6.8 mEq/L ↑↑', 15, 'pending', now() - interval '15 minutes'),
  ('Hassan Al Mansoori', 'WBC', '28.4 × 10⁹/L ↑↑', 8, 'notified', now() - interval '40 minutes'),
  ('Sara Al Khalili', 'Hemoglobin', '5.2 g/dL ↓↓', 12, 'notified', now() - interval '1 hour 5 minutes'),
  ('Mohammed Al Shamsi', 'Troponin I', '42 ng/L ↑', 23, 'notified', now() - interval '1 hour 30 minutes'),
  ('Fatima Ibrahim', 'Na+ (Sodium)', '158 mmol/L ↑↑', 76, 'notified', now() - interval '2 hours'),
  ('Yousuf Al Zaabi', 'Glucose', '28.4 mmol/L ↑↑', 19, 'notified', now() - interval '2 hours 30 minutes'),
  ('Noura Al Hashimi', 'Potassium', '2.3 mEq/L ↓↓', 31, 'notified', now() - interval '3 hours')
) AS c(patient, test, value, notified, status, observed);

DELETE FROM public.lab_portal_top_metrics
  WHERE lab_id IN (SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre');

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_top_metrics (lab_id, category, label, value, sort_order)
SELECT lab.id, m.category, m.label, m.value, m.sort_order
FROM lab CROSS JOIN (VALUES
  ('lab_test', 'CBC', 56, 1),
  ('lab_test', 'HbA1c', 34, 2),
  ('lab_test', 'Lipid Panel', 29, 3),
  ('lab_test', 'CMP', 22, 4),
  ('lab_test', 'TSH', 19, 5),
  ('lab_test', 'Troponin', 14, 6),
  ('imaging_study', 'Chest X-Ray', 14, 1),
  ('imaging_study', 'CT Chest', 8, 2),
  ('imaging_study', 'Abdomen USS', 8, 3),
  ('imaging_study', 'Brain MRI', 5, 4),
  ('imaging_study', 'Knee MRI', 4, 5),
  ('imaging_study', 'Echo', 4, 6)
) AS m(category, label, value, sort_order);

DELETE FROM public.lab_portal_volume_trends
  WHERE lab_id IN (SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre');

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_volume_trends (lab_id, day_label, lab_volume, radiology_volume, sort_order)
SELECT lab.id, t.day_label, t.lab_volume, t.radiology_volume, t.sort_order
FROM lab CROSS JOIN (VALUES
  ('Mon', 198, 38, 1),
  ('Tue', 215, 42, 2),
  ('Wed', 230, 45, 3),
  ('Thu', 244, 47, 4),
  ('Fri', 187, 31, 5),
  ('Sat', 162, 24, 6),
  ('Today', 234, 47, 7)
) AS t(day_label, lab_volume, radiology_volume, sort_order);
