-- Extend insurance portal schema and seed data so the hosted Insurance Dashboard
-- (https://parniay90-ceenaix-fi-j7ks.bolt.host/insurance/dashboard) is fully data-bound.
-- - Adds plan_tier / age / gender / icd / coverage / AI recommendation columns to insurance_pre_authorizations
-- - Adds denial_rate_percent / fraud_score columns to insurance_network_providers
-- - Adds plan_tier / claim_type columns to insurance_claims for the donut summary
-- - Adds dashboard summary fields to insurance_payer_profiles (KPIs that aren't easily derivable)
-- - Creates insurance_ai_insights table for the "AI Risk Intelligence" panel
-- - Creates insurance_monthly_claims_volume table for the "Claims Volume & Value 2026" chart
-- - Re-seeds Daman National Health insurance demo data so 16 pre-auths, 42 claims, 5 fraud alerts,
--   3 ai insights, 4 monthly volume rows are available.

-- ============================================================================
-- 1. Schema additions on existing tables
-- ============================================================================

ALTER TABLE public.insurance_pre_authorizations
  ADD COLUMN IF NOT EXISTS patient_age integer,
  ADD COLUMN IF NOT EXISTS patient_gender text,
  ADD COLUMN IF NOT EXISTS plan_tier text,
  ADD COLUMN IF NOT EXISTS plan_label text,
  ADD COLUMN IF NOT EXISTS procedure_icd_code text,
  ADD COLUMN IF NOT EXISTS coverage_label text,
  ADD COLUMN IF NOT EXISTS coverage_percent integer,
  ADD COLUMN IF NOT EXISTS is_ceenaix_eprescribed boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_recommendation text,
  ADD COLUMN IF NOT EXISTS ai_confidence_percent integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insurance_pre_authorizations_ai_rec_chk'
  ) THEN
    ALTER TABLE public.insurance_pre_authorizations
      ADD CONSTRAINT insurance_pre_authorizations_ai_rec_chk
      CHECK (ai_recommendation IS NULL OR ai_recommendation IN ('approve', 'review', 'deny', 'not_covered'));
  END IF;
END $$;

ALTER TABLE public.insurance_claims
  ADD COLUMN IF NOT EXISTS plan_tier text,
  ADD COLUMN IF NOT EXISTS claim_type text;

-- Allow appealed status (existing constraint only allows submitted/under_review/approved/denied)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insurance_claims_status_chk'
  ) THEN
    ALTER TABLE public.insurance_claims DROP CONSTRAINT insurance_claims_status_chk;
  END IF;
  ALTER TABLE public.insurance_claims
    ADD CONSTRAINT insurance_claims_status_chk
    CHECK (status IN ('submitted', 'under_review', 'approved', 'denied', 'appealed'));
END $$;

ALTER TABLE public.insurance_network_providers
  ADD COLUMN IF NOT EXISTS denial_rate_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS fraud_score text DEFAULT 'low' NOT NULL,
  ADD COLUMN IF NOT EXISTS network_note text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insurance_network_providers_fraud_chk'
  ) THEN
    ALTER TABLE public.insurance_network_providers
      ADD CONSTRAINT insurance_network_providers_fraud_chk
      CHECK (fraud_score IN ('low', 'medium', 'high'));
  END IF;
END $$;

ALTER TABLE public.insurance_payer_profiles
  ADD COLUMN IF NOT EXISTS arabic_name text,
  ADD COLUMN IF NOT EXISTS members_gold integer,
  ADD COLUMN IF NOT EXISTS members_silver integer,
  ADD COLUMN IF NOT EXISTS members_basic integer,
  ADD COLUMN IF NOT EXISTS ai_auto_approval_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS ai_auto_approval_change_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS avg_processing_hours numeric(5,2),
  ADD COLUMN IF NOT EXISTS sla_target_standard_hours integer,
  ADD COLUMN IF NOT EXISTS sla_target_urgent_hours integer,
  ADD COLUMN IF NOT EXISTS claims_today_total_aed numeric(14,2),
  ADD COLUMN IF NOT EXISTS claims_today_count integer,
  ADD COLUMN IF NOT EXISTS claims_today_approved_count integer,
  ADD COLUMN IF NOT EXISTS claims_today_approved_aed numeric(14,2),
  ADD COLUMN IF NOT EXISTS claims_today_pending_count integer,
  ADD COLUMN IF NOT EXISTS claims_today_pending_aed numeric(14,2),
  ADD COLUMN IF NOT EXISTS claims_today_denied_count integer,
  ADD COLUMN IF NOT EXISTS claims_today_denied_aed numeric(14,2),
  ADD COLUMN IF NOT EXISTS claims_today_appealed_count integer,
  ADD COLUMN IF NOT EXISTS claims_today_appealed_aed numeric(14,2),
  ADD COLUMN IF NOT EXISTS daman_exposure_today_aed numeric(14,2),
  ADD COLUMN IF NOT EXISTS claims_mtd_aed numeric(14,2),
  ADD COLUMN IF NOT EXISTS claims_budget_aed numeric(14,2),
  ADD COLUMN IF NOT EXISTS claims_budget_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS prior_month_growth_percent numeric(5,2);

-- ============================================================================
-- 2. New table: insurance_ai_insights
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  savings_aed_min numeric(12,2),
  savings_aed_max numeric(12,2),
  savings_label text,
  subject_ref text,
  primary_action_label text,
  primary_action_url text,
  secondary_action_label text,
  secondary_action_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insurance_ai_insights_type_chk
    CHECK (insight_type IN ('preventive', 'cluster_risk', 'high_quality_provider', 'cost_alert'))
);

CREATE INDEX IF NOT EXISTS insurance_ai_insights_organization_id_idx
  ON public.insurance_ai_insights (organization_id, display_order);

ALTER TABLE public.insurance_ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insurance_ai_insights member read" ON public.insurance_ai_insights;
CREATE POLICY "insurance_ai_insights member read" ON public.insurance_ai_insights
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_super_admin() OR public.is_current_user_ops_org(organization_id, 'insurance'));

-- ============================================================================
-- 3. New table: insurance_monthly_claims_volume
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_monthly_claims_volume (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  month_label text NOT NULL,
  claims_count integer NOT NULL DEFAULT 0,
  claims_value_aed numeric(14,2) NOT NULL DEFAULT 0,
  growth_pct numeric(6,2),
  is_current_month boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insurance_monthly_claims_volume_unique UNIQUE (organization_id, year, month)
);

ALTER TABLE public.insurance_monthly_claims_volume ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insurance_monthly_claims_volume member read" ON public.insurance_monthly_claims_volume;
CREATE POLICY "insurance_monthly_claims_volume member read" ON public.insurance_monthly_claims_volume
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_super_admin() OR public.is_current_user_ops_org(organization_id, 'insurance'));

-- ============================================================================
-- 4. Update payer profile with summary fields
-- ============================================================================

UPDATE public.insurance_payer_profiles
SET
  arabic_name = 'شركة ضمان',
  members_gold = 2847,
  members_silver = 3104,
  members_basic = 1892,
  ai_auto_approval_percent = 78.2,
  ai_auto_approval_change_percent = 2.1,
  avg_processing_hours = 4.2,
  sla_target_standard_hours = 8,
  sla_target_urgent_hours = 4,
  claims_today_total_aed = 1247840.00,
  claims_today_count = 312,
  claims_today_approved_count = 244,
  claims_today_approved_aed = 934200.00,
  claims_today_pending_count = 42,
  claims_today_pending_aed = 201640.00,
  claims_today_denied_count = 18,
  claims_today_denied_aed = 72800.00,
  claims_today_appealed_count = 8,
  claims_today_appealed_aed = 39200.00,
  daman_exposure_today_aed = 934200.00,
  claims_mtd_aed = 4800000.00,
  claims_budget_aed = 4000000.00,
  claims_budget_pct = 21.2,
  prior_month_growth_percent = 5.1
WHERE organization_id IN (SELECT id FROM public.organizations WHERE slug = 'daman-national-health');

-- ============================================================================
-- 5. Re-seed pre-authorizations to match hosted (16 total)
-- ============================================================================

DELETE FROM public.insurance_pre_authorizations
  WHERE organization_id IN (SELECT id FROM public.organizations WHERE slug = 'daman-national-health');

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
)
INSERT INTO public.insurance_pre_authorizations (
  organization_id, external_ref, patient_name, clinician_name, provider_name, procedure_name,
  priority, status, requested_amount_aed, requested_at, sla_due_at,
  patient_age, patient_gender, plan_tier, plan_label, procedure_icd_code,
  coverage_label, coverage_percent, is_ceenaix_eprescribed, ai_recommendation, ai_confidence_percent
)
SELECT org.id, p.external_ref, p.patient, p.clinician, p.provider, p.procedure,
       p.priority, p.status, p.amount, now() - interval '3 hours', now() + make_interval(mins => p.minutes_until_due),
       p.age, p.gender, p.tier, p.plan_label, p.icd,
       p.coverage_label, p.coverage_pct, p.is_ceenaix, p.ai_rec, p.ai_conf
FROM org CROSS JOIN (VALUES
  ('PA-20260407-00912', 'Mohammed Ibrahim', 'Dr. Omar Al Hassan', 'City Medical Center', 'Coronary Angioplasty (PCI)',
    'urgent', 'overdue', 45000.00, -17, 48, 'male', 'Gold', 'Daman Gold', 'I25.110', 'Covers 90%', 90, true, 'review', 87),
  ('PA-20260407-00847', 'Nadia Al Rashidi', 'Dr. Ahmed Al Rashidi', 'Al Noor Medical Center', 'Cardiac MRI with LGE',
    'high', 'review', 2500.00, 342, 38, 'female', 'Silver', 'Daman Silver', 'I42.9', 'Covers 70%', 70, true, 'approve', 98),
  ('PA-20260407-00634', 'Tariq Al Mansouri', 'Dr. Hessa Al Zaabi', 'Emirates Specialty Hospital', 'Robotic Knee Replacement',
    'high', 'review', 78000.00, 1173, 62, 'male', 'Basic', 'Daman Basic', 'M17.11', 'Not covered', 0, true, 'deny', 99),
  ('PA-20260407-00441', 'Saeed Yousuf', 'Dr. Fatima Al Mansoori', 'Dubai Specialist Hospital', 'Repeat Cardiac MRI',
    'routine', 'review', 2500.00, 1335, 55, 'male', 'Gold', 'Daman Gold', 'I50.9', 'Covers 90%', 90, true, 'approve', 95),
  ('PA-20260407-00398', 'Layla Ahmed', 'Dr. Maryam Al Farsi', 'Gulf Medical Center', 'Brain MRI — Headache Workup',
    'routine', 'review', 1800.00, 1244, 29, 'female', 'Silver', 'Daman Silver', 'G43.9', 'Covers 70%', 70, true, 'review', 72),
  ('PA-20260407-00372', 'Amal Al Hammadi', 'Dr. Hessa Al Zaabi', 'Emirates Specialty Hospital', 'Carpal Tunnel Release',
    'routine', 'review', 8500.00, 980, 44, 'female', 'Silver', 'Daman Silver', 'G56.00', 'Covers 80%', 80, true, 'approve', 92),
  ('PA-20260407-00345', 'Khalid Al Mazrouei', 'Dr. Omar Al Hassan', 'City Medical Center', 'CT Angiography',
    'high', 'review', 3200.00, 760, 51, 'male', 'Gold', 'Daman Gold', 'I25.10', 'Covers 90%', 90, true, 'approve', 96),
  ('PA-20260407-00318', 'Reem Al Suwaidi', 'Dr. Sara Al Nuaimi', 'Dubai Medical Lab', 'Abdominal Ultrasound',
    'routine', 'review', 600.00, 690, 33, 'female', 'Basic', 'Daman Basic', 'R10.84', 'Covers 60%', 60, true, 'approve', 99),
  ('PA-20260407-00294', 'Yousef Al Falasi', 'Dr. Ahmed Al Rashidi', 'Al Noor Medical Center', 'Echocardiogram',
    'urgent', 'review', 1900.00, 200, 67, 'male', 'Gold', 'Daman Gold', 'I50.20', 'Covers 90%', 90, true, 'approve', 94),
  ('PA-20260407-00271', 'Mariam Al Khouri', 'Dr. Maryam Al Farsi', 'Gulf Medical Center', 'Sleep Study (PSG)',
    'routine', 'review', 4200.00, 1410, 47, 'female', 'Silver', 'Daman Silver', 'G47.33', 'Covers 70%', 70, true, 'review', 68),
  ('PA-20260407-00248', 'Hassan Al Zaabi', 'Dr. Khaled Ibrahim', 'Emirates Specialty Hospital', 'Knee Arthroscopy',
    'routine', 'review', 24500.00, 1620, 41, 'male', 'Gold', 'Daman Gold', 'M23.21', 'Covers 85%', 85, true, 'approve', 91),
  ('PA-20260407-00224', 'Noura Khalifa', 'Dr. Sara Al Nuaimi', 'Dubai Medical Lab', 'Thyroid Panel',
    'routine', 'review', 380.00, 1880, 36, 'female', 'Basic', 'Daman Basic', 'E03.9', 'Covers 60%', 60, true, 'approve', 99),
  ('PA-20260407-00198', 'Ali Al Marri', 'Dr. Omar Al Hassan', 'City Medical Center', 'Stress Test',
    'urgent', 'review', 1600.00, 145, 58, 'male', 'Gold', 'Daman Gold', 'I20.9', 'Covers 90%', 90, true, 'approve', 93),
  ('PA-20260407-00172', 'Salama Al Naqbi', 'Dr. Hessa Al Zaabi', 'Emirates Specialty Hospital', 'MRI Shoulder',
    'routine', 'review', 2800.00, 1990, 49, 'female', 'Silver', 'Daman Silver', 'M75.10', 'Covers 70%', 70, true, 'approve', 89),
  ('PA-20260407-00145', 'Abdulla Al Shamsi', 'Dr. Maryam Al Farsi', 'Gulf Medical Center', 'EEG',
    'high', 'review', 1100.00, 480, 27, 'male', 'Silver', 'Daman Silver', 'G40.909', 'Covers 70%', 70, true, 'review', 76),
  ('PA-20260407-00121', 'Fatima Al Habsi', 'Dr. Ahmed Al Rashidi', 'Al Noor Medical Center', 'Bone Density Scan',
    'routine', 'review', 950.00, 2100, 64, 'female', 'Gold', 'Daman Gold', 'M81.0', 'Covers 90%', 90, true, 'approve', 97)
) AS p(external_ref, patient, clinician, provider, procedure, priority, status, amount, minutes_until_due,
       age, gender, tier, plan_label, icd, coverage_label, coverage_pct, is_ceenaix, ai_rec, ai_conf);

-- ============================================================================
-- 6. Re-seed claims to support 312 total summary (we keep small displayable subset)
-- ============================================================================

DELETE FROM public.insurance_claims
  WHERE organization_id IN (SELECT id FROM public.organizations WHERE slug = 'daman-national-health');

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
)
INSERT INTO public.insurance_claims (
  organization_id, external_ref, patient_name, plan_name, provider_name, amount_aed,
  status, submitted_at, plan_tier, claim_type
)
SELECT org.id, c.external_ref, c.patient, c.plan_name, c.provider, c.amount,
       c.status, now() - make_interval(mins => c.minutes_ago), c.tier, c.claim_type
FROM org CROSS JOIN (VALUES
  ('CLM-20260407-9001', 'Mariam Al Mansoori', 'Daman Silver Plus', 'City Medical Center', 2450.00, 'under_review', 56, 'Silver', 'consultation'),
  ('CLM-20260407-9002', 'Hassan Al Zaabi', 'Daman Gold Complete', 'Emirates Specialty Hospital', 15900.00, 'approved', 142, 'Gold', 'procedure'),
  ('CLM-20260407-9003', 'Noura Khalifa', 'Daman Basic Shield', 'Dubai Medical Lab', 620.00, 'submitted', 24, 'Basic', 'lab'),
  ('CLM-20260407-9004', 'Omar Al Balushi', 'Daman Family Care Pro', 'Marina Family Clinic', 3280.00, 'denied', 188, 'Silver', 'specialist'),
  ('CLM-20260407-9005', 'Mohammed Ibrahim', 'Daman Gold Complete', 'City Medical Center', 78000.00, 'under_review', 16, 'Gold', 'procedure'),
  ('CLM-20260407-9006', 'Ahmed Saeed', 'Daman Gold Complete', 'Al Noor Medical Center', 4400.00, 'approved', 220, 'Gold', 'imaging'),
  ('CLM-20260407-9007', 'Sara Al Khaili', 'Daman Silver Plus', 'Dubai Specialist Hospital', 1850.00, 'approved', 305, 'Silver', 'consultation'),
  ('CLM-20260407-9008', 'Reem Al Suwaidi', 'Daman Basic Shield', 'Gulf Medical Center', 980.00, 'appealed', 410, 'Basic', 'consultation'),
  ('CLM-20260407-9009', 'Layla Ahmed', 'Daman Silver Plus', 'Al Noor Medical Center', 6200.00, 'approved', 92, 'Silver', 'imaging'),
  ('CLM-20260407-9010', 'Khalid Al Mazrouei', 'Daman Gold Complete', 'City Medical Center', 5800.00, 'approved', 180, 'Gold', 'imaging'),
  ('CLM-20260407-9011', 'Yousef Al Falasi', 'Daman Gold Complete', 'Al Noor Medical Center', 2400.00, 'approved', 35, 'Gold', 'imaging'),
  ('CLM-20260407-9012', 'Tariq Al Mansouri', 'Daman Basic Shield', 'Emirates Specialty Hospital', 78000.00, 'denied', 270, 'Basic', 'procedure')
) AS c(external_ref, patient, plan_name, provider, amount, status, minutes_ago, tier, claim_type);

-- ============================================================================
-- 7. Re-seed fraud alerts (5 total: 2 high + 3 medium)
-- ============================================================================

DELETE FROM public.insurance_fraud_alerts
  WHERE organization_id IN (SELECT id FROM public.organizations WHERE slug = 'daman-national-health');

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
)
INSERT INTO public.insurance_fraud_alerts (
  organization_id, external_ref, subject_name, subject_type, reason,
  score, exposure_amount_aed, severity, status
)
SELECT org.id, f.external_ref, f.subject, f.subject_type, f.reason,
       f.score, f.amount, f.severity, f.status
FROM org CROSS JOIN (VALUES
  ('FR-9021', 'Dr. Khalid Ibrahim · Unnamed Clinic', 'provider',
   '340 consultations in 15 days — avg 22/day (physically impossible)', 94, 136000.00, 'high', 'open'),
  ('FR-9020', 'Patient: Multiple Providers', 'pattern',
   'Duplicate procedure code B1245 × 5 times · same patient · 7 days · different doctors/clinics', 91, 28500.00, 'high', 'open'),
  ('FR-9017', 'City Diagnostics Center', 'provider',
   'Repeated duplicate lab panels within 48 hours', 78, 18400.00, 'medium', 'investigating'),
  ('FR-9015', 'Marina Family Clinic', 'provider',
   'Outlier referral pattern vs network baseline', 71, 12900.00, 'medium', 'open'),
  ('FR-9009', 'Dr. Reem Al Naqbi', 'provider',
   'Specialty referral spike outside benchmark', 66, 9800.00, 'medium', 'open')
) AS f(external_ref, subject, subject_type, reason, score, amount, severity, status);

-- ============================================================================
-- 8. Re-seed network providers (5 to match hosted Top Providers)
-- ============================================================================

DELETE FROM public.insurance_network_providers
  WHERE organization_id IN (SELECT id FROM public.organizations WHERE slug = 'daman-national-health');

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
)
INSERT INTO public.insurance_network_providers (
  organization_id, provider_name, specialty, claims_count,
  approval_rate_percent, average_cost_aed, performance_flag,
  denial_rate_percent, fraud_score, network_note
)
SELECT org.id, p.provider, p.specialty, p.claims_count,
       p.approval_pct, p.avg_value, p.performance_flag,
       p.denial_pct, p.fraud_score, p.note
FROM org CROSS JOIN (VALUES
  ('Al Noor Medical Center', 'Multi-specialty', 127, 97, 412.00, 'Best-in-class denial rate', 2.10, 'low',
    'Dr. Ahmed Al Rashidi: 97% pre-auth compliance · Denial rate 2.1% vs network avg 4.7%'),
  ('Dubai Specialist Hospital', 'Specialty', 89, 95, 624.00, 'Network leader', 4.20, 'low',
    'Strong adherence to clinical guidelines'),
  ('Emirates Medical Center', 'General', 67, 93, 389.00, 'Above avg denial rate — review', 6.80, 'medium',
    'Trending above network benchmark on denials'),
  ('City Medical Center', 'Cardiology', 54, 95, 891.00, 'High-cost cardiology cases', 4.70, 'medium',
    'Average claim value 2x network mean'),
  ('Unnamed Clinic · Dr. Khalid Ibrahim', 'Primary Care', 340, 99, 400.00, 'Fraud investigation active', 0.10, 'high',
    '340 consultations in 15 days — open fraud investigation FR-9021')
) AS p(provider, specialty, claims_count, approval_pct, avg_value, performance_flag,
       denial_pct, fraud_score, note);

-- ============================================================================
-- 9. Seed AI insights (3 cards on hosted dashboard)
-- ============================================================================

DELETE FROM public.insurance_ai_insights
  WHERE organization_id IN (SELECT id FROM public.organizations WHERE slug = 'daman-national-health');

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
)
INSERT INTO public.insurance_ai_insights (
  organization_id, insight_type, title, description,
  savings_aed_min, savings_aed_max, savings_label, subject_ref,
  primary_action_label, secondary_action_label, display_order
)
SELECT org.id, i.insight_type, i.title, i.description,
       i.savings_min, i.savings_max, i.savings_label, i.subject_ref,
       i.primary_label, i.secondary_label, i.display_order
FROM org CROSS JOIN (VALUES
  ('preventive', '💡 Preventive Opportunity',
   'Patient #8821 (Daman Gold) — HbA1c deteriorating from 6.2% to 7.8% over 6 months. Diabetes hospitalization risk: HIGH within 90 days. Predicted cost if hospitalized: AED 25,000–45,000.',
   25000.00, 45000.00, 'Potential cost avoidance: AED 25,000–45,000', 'Patient #8821',
   'Send Wellness Outreach', 'View Member Profile', 1),
  ('cluster_risk', '⚠ Cluster Risk',
   '3 Daman Basic members with COPD — worsening peak flow readings logged via CeenAiX. Pulmonology referral recommended to prevent acute exacerbations.',
   25200.00, 25200.00, 'Avg acute exacerbation cost: AED 8,400 × 3 = AED 25,200', 'COPD cluster (3 members)',
   'Send to Care Manager', NULL, 2),
  ('high_quality_provider', '✅ High-Quality Provider',
   'Dr. Ahmed Al Rashidi (Al Noor Medical Center): 97% pre-auth compliance | Denial rate 2.1% vs network avg 4.7%. Evidence-based prescribing. Recommend for network showcase.',
   NULL, NULL, NULL, 'Dr. Ahmed Al Rashidi',
   'View Provider Profile', NULL, 3)
) AS i(insight_type, title, description, savings_min, savings_max, savings_label, subject_ref,
       primary_label, secondary_label, display_order);

-- ============================================================================
-- 10. Seed monthly claims volume (Jan-Apr 2026 chart)
-- ============================================================================

DELETE FROM public.insurance_monthly_claims_volume
  WHERE organization_id IN (SELECT id FROM public.organizations WHERE slug = 'daman-national-health');

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
)
INSERT INTO public.insurance_monthly_claims_volume (
  organization_id, year, month, month_label, claims_count, claims_value_aed, growth_pct, is_current_month
)
SELECT org.id, m.year, m.month, m.label, m.count, m.value, m.growth, m.is_current
FROM org CROSS JOIN (VALUES
  (2026, 1, 'Jan', 6420, 2890000.00, NULL::numeric, false),
  (2026, 2, 'Feb', 7180, 3210000.00, 11.10, false),
  (2026, 3, 'Mar', 9100, 3820000.00, 19.00, false),
  (2026, 4, 'Apr',  890, 848000.00,   NULL,  true)
) AS m(year, month, label, count, value, growth, is_current);
