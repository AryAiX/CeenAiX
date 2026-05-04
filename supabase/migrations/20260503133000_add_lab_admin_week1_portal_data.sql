-- Current-week ops portal data foundations for Lab/Radiology parity.
-- Adds DB-backed support tables used by the hosted-style Lab portal:
-- imaging queue, equipment, QC, NABIDH event queue, and settings.

CREATE TABLE IF NOT EXISTS public.lab_portal_imaging_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.lab_profiles(id) ON DELETE CASCADE,
  accession text NOT NULL UNIQUE,
  patient_name text NOT NULL,
  patient_age integer,
  patient_gender text,
  doctor_name text NOT NULL,
  clinic_name text NOT NULL,
  modality text NOT NULL,
  study_name text NOT NULL,
  priority text NOT NULL DEFAULT 'Routine',
  status text NOT NULL DEFAULT 'scheduled',
  room text,
  scheduled_at timestamptz,
  progress_percent integer NOT NULL DEFAULT 0,
  tat_minutes integer,
  report_status text,
  nabidh_status text NOT NULL DEFAULT 'pending',
  alerts text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_portal_imaging_priority_chk CHECK (priority IN ('STAT', 'Urgent', 'Routine')),
  CONSTRAINT lab_portal_imaging_status_chk CHECK (status IN ('ordered', 'scheduled', 'scanning', 'report_pending', 'reported', 'released')),
  CONSTRAINT lab_portal_imaging_nabidh_chk CHECK (nabidh_status IN ('pending', 'submitted', 'failed')),
  CONSTRAINT lab_portal_imaging_progress_chk CHECK (progress_percent BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_lab_portal_imaging_lab_status
  ON public.lab_portal_imaging_studies(lab_id, status, scheduled_at);

DROP TRIGGER IF EXISTS trg_lab_portal_imaging_studies_updated_at ON public.lab_portal_imaging_studies;
CREATE TRIGGER trg_lab_portal_imaging_studies_updated_at
  BEFORE UPDATE ON public.lab_portal_imaging_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.lab_portal_imaging_studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_portal_imaging_read_lab" ON public.lab_portal_imaging_studies;
CREATE POLICY "lab_portal_imaging_read_lab"
  ON public.lab_portal_imaging_studies
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

DROP POLICY IF EXISTS "lab_portal_imaging_update_lab" ON public.lab_portal_imaging_studies;
CREATE POLICY "lab_portal_imaging_update_lab"
  ON public.lab_portal_imaging_studies
  FOR UPDATE
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

CREATE TABLE IF NOT EXISTS public.lab_portal_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.lab_profiles(id) ON DELETE CASCADE,
  department text NOT NULL,
  name text NOT NULL,
  equipment_type text NOT NULL,
  room text,
  status text NOT NULL DEFAULT 'online',
  metric_label text,
  metric_value text,
  qc_status text,
  reagent_level_percent integer,
  alert text,
  maintenance_due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_portal_equipment_department_chk CHECK (department IN ('laboratory', 'radiology')),
  CONSTRAINT lab_portal_equipment_status_chk CHECK (status IN ('online', 'maintenance', 'warning', 'offline')),
  CONSTRAINT lab_portal_equipment_reagent_chk CHECK (reagent_level_percent IS NULL OR reagent_level_percent BETWEEN 0 AND 100),
  CONSTRAINT lab_portal_equipment_unique UNIQUE (lab_id, name)
);

CREATE INDEX IF NOT EXISTS idx_lab_portal_equipment_lab_department
  ON public.lab_portal_equipment(lab_id, department, status);

DROP TRIGGER IF EXISTS trg_lab_portal_equipment_updated_at ON public.lab_portal_equipment;
CREATE TRIGGER trg_lab_portal_equipment_updated_at
  BEFORE UPDATE ON public.lab_portal_equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.lab_portal_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_portal_equipment_read_lab" ON public.lab_portal_equipment;
CREATE POLICY "lab_portal_equipment_read_lab"
  ON public.lab_portal_equipment
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

DROP POLICY IF EXISTS "lab_portal_equipment_update_lab" ON public.lab_portal_equipment;
CREATE POLICY "lab_portal_equipment_update_lab"
  ON public.lab_portal_equipment
  FOR UPDATE
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

CREATE TABLE IF NOT EXISTS public.lab_portal_qc_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.lab_profiles(id) ON DELETE CASCADE,
  department text NOT NULL,
  instrument_name text NOT NULL,
  lot_number text NOT NULL,
  level_label text NOT NULL,
  result_label text NOT NULL,
  status text NOT NULL DEFAULT 'passed',
  run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_portal_qc_department_chk CHECK (department IN ('laboratory', 'radiology')),
  CONSTRAINT lab_portal_qc_status_chk CHECK (status IN ('passed', 'warning', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_lab_portal_qc_lab_run
  ON public.lab_portal_qc_runs(lab_id, run_at DESC);

ALTER TABLE public.lab_portal_qc_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_portal_qc_read_lab" ON public.lab_portal_qc_runs;
CREATE POLICY "lab_portal_qc_read_lab"
  ON public.lab_portal_qc_runs
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

CREATE TABLE IF NOT EXISTS public.lab_portal_nabidh_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.lab_profiles(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  reference_code text NOT NULL,
  patient_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_portal_nabidh_status_chk CHECK (status IN ('pending', 'submitted', 'failed')),
  CONSTRAINT lab_portal_nabidh_unique UNIQUE (lab_id, reference_code)
);

CREATE INDEX IF NOT EXISTS idx_lab_portal_nabidh_lab_status
  ON public.lab_portal_nabidh_events(lab_id, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_lab_portal_nabidh_events_updated_at ON public.lab_portal_nabidh_events;
CREATE TRIGGER trg_lab_portal_nabidh_events_updated_at
  BEFORE UPDATE ON public.lab_portal_nabidh_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.lab_portal_nabidh_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_portal_nabidh_read_lab" ON public.lab_portal_nabidh_events;
CREATE POLICY "lab_portal_nabidh_read_lab"
  ON public.lab_portal_nabidh_events
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

DROP POLICY IF EXISTS "lab_portal_nabidh_update_lab" ON public.lab_portal_nabidh_events;
CREATE POLICY "lab_portal_nabidh_update_lab"
  ON public.lab_portal_nabidh_events
  FOR UPDATE
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

CREATE TABLE IF NOT EXISTS public.lab_portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.lab_profiles(id) ON DELETE CASCADE,
  section text NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_portal_settings_unique UNIQUE (lab_id, section, label)
);

CREATE INDEX IF NOT EXISTS idx_lab_portal_settings_lab_section
  ON public.lab_portal_settings(lab_id, section);

DROP TRIGGER IF EXISTS trg_lab_portal_settings_updated_at ON public.lab_portal_settings;
CREATE TRIGGER trg_lab_portal_settings_updated_at
  BEFORE UPDATE ON public.lab_portal_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.lab_portal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_portal_settings_read_lab" ON public.lab_portal_settings;
CREATE POLICY "lab_portal_settings_read_lab"
  ON public.lab_portal_settings
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

DROP POLICY IF EXISTS "lab_portal_settings_update_lab" ON public.lab_portal_settings;
CREATE POLICY "lab_portal_settings_update_lab"
  ON public.lab_portal_settings
  FOR UPDATE
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  )
  WITH CHECK (
    public.is_current_user_super_admin()
    OR public.is_current_user_in_lab(lab_id)
  );

WITH lab AS (
  INSERT INTO public.lab_profiles (slug, name, city, address, phone, email)
  VALUES (
    'dubai-medical-imaging-centre',
    'Dubai Medical & Imaging Centre',
    'Dubai Healthcare City',
    'Building 27, Dubai Healthcare City, Dubai',
    '+971 4 555 0198',
    'ops@dubaimedicalimaging.ae'
  )
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        city = EXCLUDED.city,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email
  RETURNING id
)
INSERT INTO public.lab_portal_imaging_studies (
  lab_id,
  accession,
  patient_name,
  patient_age,
  patient_gender,
  doctor_name,
  clinic_name,
  modality,
  study_name,
  priority,
  status,
  room,
  scheduled_at,
  progress_percent,
  tat_minutes,
  report_status,
  nabidh_status,
  alerts
)
SELECT
  lab.id,
  study.accession,
  study.patient_name,
  study.patient_age,
  study.patient_gender,
  study.doctor_name,
  study.clinic_name,
  study.modality,
  study.study_name,
  study.priority,
  study.status,
  study.room,
  study.scheduled_at,
  study.progress_percent,
  study.tat_minutes,
  study.report_status,
  study.nabidh_status,
  study.alerts
FROM lab
CROSS JOIN (
  VALUES
    ('RAD-20260503-001', 'Aisha Al Mansoori', 46, 'Female', 'Dr. Maryam Al Sayed', 'City Medical Center', 'MRI', 'Brain MRI with contrast', 'STAT', 'scanning', 'MRI Suite 1', now() + interval '12 minutes', 64, 42, 'In acquisition', 'pending', ARRAY['Contrast allergy reviewed', 'Critical neuro indication']),
    ('RAD-20260503-002', 'Omar Khaled', 58, 'Male', 'Dr. Hani Rashid', 'Nad Al Hamar Clinic', 'CT', 'CT Abdomen / Pelvis', 'Urgent', 'report_pending', 'CT Room 2', now() - interval '26 minutes', 100, 58, 'Awaiting radiologist', 'pending', ARRAY['Prior study available']),
    ('RAD-20260503-003', 'Fatima Hassan', 34, 'Female', 'Dr. Lina Youssef', 'Jumeirah Family Clinic', 'USS', 'Obstetric ultrasound', 'Routine', 'scheduled', 'US Room 4', now() + interval '1 hour', 0, 30, 'Scheduled', 'submitted', ARRAY[]::text[]),
    ('RAD-20260503-004', 'Ibrahim Al Marzouqi', 63, 'Male', 'Dr. Omar Al Hassan', 'Dubai Heart Clinic', 'X-Ray', 'Chest X-Ray portable', 'Urgent', 'reported', 'X-Ray Bay 3', now() - interval '2 hours', 100, 23, 'Preliminary signed', 'failed', ARRAY['NABIDH DiagnosticReport retry needed'])
) AS study(accession, patient_name, patient_age, patient_gender, doctor_name, clinic_name, modality, study_name, priority, status, room, scheduled_at, progress_percent, tat_minutes, report_status, nabidh_status, alerts)
ON CONFLICT (accession) DO UPDATE
  SET patient_name = EXCLUDED.patient_name,
      status = EXCLUDED.status,
      progress_percent = EXCLUDED.progress_percent,
      report_status = EXCLUDED.report_status,
      nabidh_status = EXCLUDED.nabidh_status,
      alerts = EXCLUDED.alerts,
      updated_at = now();

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_equipment (
  lab_id,
  department,
  name,
  equipment_type,
  room,
  status,
  metric_label,
  metric_value,
  qc_status,
  reagent_level_percent,
  alert,
  maintenance_due_at
)
SELECT
  lab.id,
  equipment.department,
  equipment.name,
  equipment.equipment_type,
  equipment.room,
  equipment.status,
  equipment.metric_label,
  equipment.metric_value,
  equipment.qc_status,
  equipment.reagent_level_percent,
  equipment.alert,
  equipment.maintenance_due_at
FROM lab
CROSS JOIN (
  VALUES
    ('laboratory', 'Cobas 8000 Chemistry', 'Chemistry analyzer', 'Core Lab', 'online', 'Runs today', '184', 'QC passed', 82, NULL, now() + interval '18 days'),
    ('laboratory', 'Sysmex XN-2000 Hematology', 'Hematology analyzer', 'Hematology', 'warning', 'Runs today', '96', 'Level 2 warning', 18, 'Diluent reagent below reorder threshold', now() + interval '4 days'),
    ('laboratory', 'GeneXpert Infinity', 'Molecular analyzer', 'Molecular', 'online', 'Cartridges', '42', 'QC passed', 64, NULL, now() + interval '11 days'),
    ('radiology', 'Siemens Magnetom Vida', 'MRI scanner', 'MRI Suite 1', 'online', 'Utilization', '86%', 'Daily QC passed', NULL, NULL, now() + interval '21 days'),
    ('radiology', 'GE Revolution CT', 'CT scanner', 'CT Room 2', 'maintenance', 'Downtime', '32 min', 'Engineer notified', NULL, 'Tube cooling check required', now() + interval '1 day'),
    ('radiology', 'Philips EPIQ Elite', 'Ultrasound', 'US Room 4', 'online', 'Studies today', '27', 'Daily QC passed', NULL, NULL, now() + interval '14 days')
) AS equipment(department, name, equipment_type, room, status, metric_label, metric_value, qc_status, reagent_level_percent, alert, maintenance_due_at)
ON CONFLICT (lab_id, name) DO UPDATE
  SET status = EXCLUDED.status,
      metric_value = EXCLUDED.metric_value,
      qc_status = EXCLUDED.qc_status,
      reagent_level_percent = EXCLUDED.reagent_level_percent,
      alert = EXCLUDED.alert,
      maintenance_due_at = EXCLUDED.maintenance_due_at,
      updated_at = now();

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_qc_runs (
  lab_id,
  department,
  instrument_name,
  lot_number,
  level_label,
  result_label,
  status,
  run_at
)
SELECT
  lab.id,
  qc.department,
  qc.instrument_name,
  qc.lot_number,
  qc.level_label,
  qc.result_label,
  qc.status,
  qc.run_at
FROM lab
CROSS JOIN (
  VALUES
    ('laboratory', 'Cobas 8000 Chemistry', 'QC-CHEM-0526-A', 'Level 1', 'Within 1 SD', 'passed', now() - interval '35 minutes'),
    ('laboratory', 'Sysmex XN-2000 Hematology', 'QC-HEME-0526-B', 'Level 2', 'Westgard 1-2s warning', 'warning', now() - interval '1 hour'),
    ('radiology', 'Siemens Magnetom Vida', 'QC-MRI-DAILY', 'Geometry phantom', 'Passed', 'passed', now() - interval '2 hours'),
    ('radiology', 'GE Revolution CT', 'QC-CT-DAILY', 'Water phantom', 'Engineer review', 'warning', now() - interval '3 hours')
) AS qc(department, instrument_name, lot_number, level_label, result_label, status, run_at);

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_nabidh_events (
  lab_id,
  resource_type,
  reference_code,
  patient_name,
  status,
  reason,
  submitted_at,
  created_at
)
SELECT
  lab.id,
  event.resource_type,
  event.reference_code,
  event.patient_name,
  event.status,
  event.reason,
  event.submitted_at,
  event.created_at
FROM lab
CROSS JOIN (
  VALUES
    ('DiagnosticReport', 'LAB-20260503-00941', 'Ibrahim Al Marzouqi', 'pending', 'Critical potassium requires manual notification confirmation', NULL::timestamptz, now() - interval '18 minutes'),
    ('Observation', 'LAB-20260503-00942', 'Aisha Al Mansoori', 'pending', 'Observation bundle queued for submission', NULL::timestamptz, now() - interval '31 minutes'),
    ('ImagingStudy', 'RAD-20260503-004', 'Ibrahim Al Marzouqi', 'failed', 'DHA endpoint timeout; retry scheduled', NULL::timestamptz, now() - interval '42 minutes'),
    ('DiagnosticReport', 'LAB-20260503-00877', 'Omar Khaled', 'submitted', NULL, now() - interval '1 hour', now() - interval '1 hour 5 minutes')
) AS event(resource_type, reference_code, patient_name, status, reason, submitted_at, created_at)
ON CONFLICT (lab_id, reference_code) DO UPDATE
  SET status = EXCLUDED.status,
      reason = EXCLUDED.reason,
      submitted_at = EXCLUDED.submitted_at,
      updated_at = now();

WITH lab AS (
  SELECT id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre'
)
INSERT INTO public.lab_portal_settings (lab_id, section, label, value, enabled)
SELECT lab.id, setting.section, setting.label, setting.value, setting.enabled
FROM lab
CROSS JOIN (
  VALUES
    ('General', 'Auto-assign unclaimed lab orders', 'Enabled for active shift', true),
    ('Laboratory', 'Critical potassium notification threshold', 'K+ >= 6.5 mEq/L', true),
    ('Laboratory', 'Supervisor PIN required for critical release', 'Required', true),
    ('Radiology', 'Radiologist double-read for STAT CT', 'Enabled', true),
    ('NABIDH', 'Auto-submit released diagnostic reports', 'Enabled after verification', true),
    ('Notifications', 'Escalate unnotified critical values', 'After 15 minutes', true)
) AS setting(section, label, value, enabled)
ON CONFLICT (lab_id, section, label) DO UPDATE
  SET value = EXCLUDED.value,
      enabled = EXCLUDED.enabled,
      updated_at = now();

-- Platform Admin review data. Existing RPCs aggregate these canonical tables;
-- these rows make the hosted-style admin portal meaningful in new environments.

INSERT INTO public.organizations (
  slug,
  name,
  kind,
  city,
  country,
  primary_contact_name,
  primary_contact_email,
  contract_started_at,
  contract_ends_at,
  seats_allocated,
  seats_used,
  status,
  notes
)
VALUES
  ('dubai-medical-city-hospital', 'Dubai Medical City Hospital', 'hospital', 'Dubai', 'AE', 'Dr. Ahmed Sultan', 'ops@dmch.ae', now() - interval '14 months', now() + interval '10 months', 180, 142, 'active', 'Primary tertiary-care tenant for admin portal parity.'),
  ('al-noor-family-clinic', 'Al Noor Family Clinic', 'clinic', 'Abu Dhabi', 'AE', 'Noura Al Ketbi', 'admin@alnoorclinic.ae', now() - interval '8 months', now() + interval '4 months', 45, 33, 'active', 'High-volume outpatient clinic.'),
  ('dubai-medical-imaging-org', 'Dubai Medical & Imaging Centre', 'lab', 'Dubai', 'AE', 'Fatima Al Rashidi', 'ops@dubaimedicalimaging.ae', now() - interval '6 months', now() + interval '6 months', 38, 29, 'active', 'Lab and radiology operations reference tenant.'),
  ('daman-national-health', 'Daman National Health', 'insurance', 'Abu Dhabi', 'AE', 'Mariam Al Khateeb', 'claims@daman-ceenaix.ae', now() - interval '5 months', now() + interval '7 months', 64, 51, 'active', 'Insurance portal reference payer.'),
  ('emirates-pharmacy-network', 'Emirates Pharmacy Network', 'pharmacy', 'Dubai', 'AE', 'Khalid Al Tamimi', 'ops@emiratespharmacy.ae', now() - interval '2 months', now() + interval '10 months', 25, 18, 'pending', 'Pending final DHA integration review.')
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      kind = EXCLUDED.kind,
      city = EXCLUDED.city,
      primary_contact_name = EXCLUDED.primary_contact_name,
      primary_contact_email = EXCLUDED.primary_contact_email,
      contract_started_at = EXCLUDED.contract_started_at,
      contract_ends_at = EXCLUDED.contract_ends_at,
      seats_allocated = EXCLUDED.seats_allocated,
      seats_used = EXCLUDED.seats_used,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = now();

INSERT INTO public.admin_incidents (
  title,
  summary,
  severity,
  status,
  detected_at,
  affected_records,
  regulator_reported,
  metadata
)
SELECT incident.title, incident.summary, incident.severity, incident.status, incident.detected_at, incident.affected_records, incident.regulator_reported, incident.metadata
FROM (
  VALUES
    ('DHA license expiry warning', 'Dr. Ahmed Sultan license expires in 18 days; verification team review required.', 'medium', 'open', now() - interval '2 hours', 1, false, '{"source":"admin_dashboard","cta":"View"}'::jsonb),
    ('Blocked login burst', 'IP 182.x.x.x triggered three failed privileged login attempts and was blocked.', 'high', 'investigating', now() - interval '46 minutes', 0, false, '{"source":"security_monitor","cta":"Review"}'::jsonb),
    ('Daman API slow response', 'Insurance eligibility integration p95 response exceeded 3.2 seconds.', 'medium', 'open', now() - interval '28 minutes', 0, false, '{"source":"integration_monitor","cta":"Check"}'::jsonb)
) AS incident(title, summary, severity, status, detected_at, affected_records, regulator_reported, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_incidents existing WHERE existing.title = incident.title
);

INSERT INTO public.feature_flags (key, name, description, environment, is_enabled, rollout_percent)
VALUES
  ('lab_radiology_portal_v2', 'Lab/Radiology Portal V2', 'Hosted-parity Lab and Radiology operational portal.', 'production', true, 100),
  ('admin_dark_ops_shell', 'Admin Dark Ops Shell', 'Hosted-parity Super Admin portal shell and navigation.', 'production', true, 100),
  ('nabidh_submission_centre', 'NABIDH Submission Centre', 'Manual and automatic NABIDH event queue tooling.', 'production', true, 80),
  ('ai_safety_monitor', 'AI Safety Monitor', 'Admin safety counters for clinical AI outputs.', 'production', true, 100)
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      environment = EXCLUDED.environment,
      is_enabled = EXCLUDED.is_enabled,
      rollout_percent = EXCLUDED.rollout_percent,
      updated_at = now();

INSERT INTO public.service_health_snapshots (
  service_key,
  service_name,
  category,
  status,
  latency_ms,
  region,
  message,
  observed_at
)
SELECT service.service_key, service.service_name, service.category, service.status, service.latency_ms, service.region, service.message, service.observed_at
FROM (
  VALUES
    ('patient_portal', 'Patient Portal', 'core', 'healthy', 118, 'UAE North', 'All patient routes responding normally.', now()),
    ('doctor_portal', 'Doctor Portal', 'core', 'healthy', 142, 'UAE North', 'Scheduling and prescriptions online.', now()),
    ('lab_radiology_portal', 'Lab & Radiology Portal', 'core', 'healthy', 126, 'UAE North', 'Sample and imaging queues synced.', now()),
    ('supabase_auth', 'Supabase Auth', 'core', 'healthy', 94, 'UAE North', 'Email/password and OTP auth healthy.', now()),
    ('daman_api', 'Daman Eligibility API', 'integration', 'degraded', 3200, 'Abu Dhabi', 'Elevated eligibility response time.', now()),
    ('nabidh_gateway', 'NABIDH Gateway', 'integration', 'degraded', 1480, 'Dubai', 'Eight diagnostic bundles pending retry.', now()),
    ('ceenaix_clinical_ai', 'CeenAiX Clinical AI', 'ai', 'healthy', 870, 'UAE North', 'Clinical AI responses within SLA.', now()),
    ('ai_safety_filter', 'AI Safety Filter', 'ai', 'healthy', 212, 'UAE North', 'No critical safety escalation in the last hour.', now())
) AS service(service_key, service_name, category, status, latency_ms, region, message, observed_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_health_snapshots existing WHERE existing.service_key = service.service_key
);
