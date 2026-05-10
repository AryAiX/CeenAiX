-- Admin Portal Parity Data
-- Adds rich seeded directories + dashboard context tables + parity RPCs so
-- the Super Admin portal can render the hosted reference UI fully data-bound.
--
-- New tables (all RLS-locked to super_admin):
--   admin_portal_context              one-row narrative headline figures
--   admin_dashboard_issues            issue banners on the dashboard
--   admin_doctor_directory            rich doctor list for /admin/doctors
--   admin_patient_directory           rich patient list for /admin/patients
--   admin_insurance_partners          insurer cards for /admin/insurance
--   admin_portal_status_snapshots     per-portal live status row
--   admin_live_activity_events        live activity feed
--   admin_compliance_checklist        DHA compliance checklist
--   admin_license_alerts              doctor license expiry alerts
--   admin_ai_usage_breakdown          AI usage by language / portal / topic
--   admin_revenue_daily               daily revenue series
--
-- New RPCs:
--   admin_get_dashboard()             one-shot dashboard payload
--   admin_get_doctor_directory()      doctor list
--   admin_get_patient_directory()     patient list
--   admin_get_insurance_partners()    insurer cards
--   admin_get_ai_dashboard()          rich AI analytics payload
--
-- All payloads can be served from real (small) DB rows or seeded narrative values.

-- ============================================================================
-- 1. New tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_portal_context (
  id boolean PRIMARY KEY DEFAULT true,
  total_patients integer NOT NULL DEFAULT 0,
  patients_30d_active integer NOT NULL DEFAULT 0,
  patients_new_month integer NOT NULL DEFAULT 0,
  patients_flagged integer NOT NULL DEFAULT 0,
  patients_suspended integer NOT NULL DEFAULT 0,
  patient_change_pct numeric(6,2) NOT NULL DEFAULT 0,
  verified_doctors integer NOT NULL DEFAULT 0,
  pending_doctors integer NOT NULL DEFAULT 0,
  doctors_added_this_month integer NOT NULL DEFAULT 0,
  doctors_active_now integer NOT NULL DEFAULT 0,
  doctor_license_alerts integer NOT NULL DEFAULT 0,
  doctor_avg_rating numeric(3,2) NOT NULL DEFAULT 0,
  doctor_fees_mtd_aed integer NOT NULL DEFAULT 0,
  connected_orgs integer NOT NULL DEFAULT 0,
  orgs_clinics integer NOT NULL DEFAULT 0,
  orgs_hospitals integer NOT NULL DEFAULT 0,
  orgs_pharmacies integer NOT NULL DEFAULT 0,
  orgs_labs integer NOT NULL DEFAULT 0,
  orgs_added_this_month integer NOT NULL DEFAULT 0,
  ai_sessions_today integer NOT NULL DEFAULT 0,
  ai_sessions_month integer NOT NULL DEFAULT 0,
  ai_sessions_alltime bigint NOT NULL DEFAULT 0,
  ai_active_now integer NOT NULL DEFAULT 0,
  ai_avg_response_sec numeric(4,2) NOT NULL DEFAULT 0,
  ai_uptime_pct numeric(5,2) NOT NULL DEFAULT 0,
  ai_satisfaction numeric(3,2) NOT NULL DEFAULT 0,
  ai_satisfaction_count integer NOT NULL DEFAULT 0,
  ai_to_booking_pct numeric(5,2) NOT NULL DEFAULT 0,
  ai_to_booking_count integer NOT NULL DEFAULT 0,
  ai_safety_flags_today integer NOT NULL DEFAULT 0,
  ai_safety_escalated integer NOT NULL DEFAULT 0,
  ai_safety_resolved integer NOT NULL DEFAULT 0,
  ai_revenue_today_aed integer NOT NULL DEFAULT 0,
  ai_revenue_net_aed integer NOT NULL DEFAULT 0,
  ai_revenue_margin_pct numeric(5,2) NOT NULL DEFAULT 0,
  revenue_today_aed integer NOT NULL DEFAULT 0,
  revenue_target_aed integer NOT NULL DEFAULT 0,
  revenue_change_pct numeric(5,2) NOT NULL DEFAULT 0,
  uptime_pct numeric(6,3) NOT NULL DEFAULT 0,
  uptime_incidents_month integer NOT NULL DEFAULT 0,
  dha_score numeric(4,2) NOT NULL DEFAULT 0,
  dha_license text,
  dha_license_expires text,
  active_sessions integer NOT NULL DEFAULT 0,
  open_issues integer NOT NULL DEFAULT 0,
  super_admin_name text,
  super_admin_role_label text,
  super_admin_organization text,
  platform_version text NOT NULL DEFAULT 'v2.4.1',
  environment_label text NOT NULL DEFAULT 'PRODUCTION',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_portal_context_singleton CHECK (id = true)
);

ALTER TABLE public.admin_portal_context ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_portal_context_admin_read" ON public.admin_portal_context;
CREATE POLICY "admin_portal_context_admin_read"
  ON public.admin_portal_context FOR SELECT
  USING (public.is_current_user_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_dashboard_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  category text NOT NULL,
  title text NOT NULL,
  detail text,
  cta_label text,
  cta_kind text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_dashboard_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_dashboard_issues_admin_read" ON public.admin_dashboard_issues;
CREATE POLICY "admin_dashboard_issues_admin_read"
  ON public.admin_dashboard_issues FOR SELECT
  USING (public.is_current_user_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_doctor_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initials text NOT NULL,
  full_name text NOT NULL,
  age integer,
  gender text,
  nationality text,
  dha_license text,
  dha_verified boolean NOT NULL DEFAULT true,
  specialty text,
  specialty_sub text,
  clinic_name text,
  city text,
  consults_lifetime integer NOT NULL DEFAULT 0,
  consults_recent_label text,
  rating numeric(3,2),
  rating_count integer NOT NULL DEFAULT 0,
  license_expires_at date,
  license_expires_label text,
  reminder_status text,
  status_label text NOT NULL DEFAULT 'verified',
  status_flag text,
  badge_emoji text,
  badge_label text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_doctor_directory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_doctor_directory_admin_read" ON public.admin_doctor_directory;
CREATE POLICY "admin_doctor_directory_admin_read"
  ON public.admin_doctor_directory FOR SELECT
  USING (public.is_current_user_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_patient_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initials text NOT NULL,
  full_name text NOT NULL,
  age integer,
  gender text,
  blood_type text,
  patient_code text NOT NULL,
  emirates_id_masked text,
  insurance_plan text,
  insurance_member_id_masked text,
  city text,
  joined_label text,
  last_active_label text,
  risk_level text NOT NULL DEFAULT 'low',
  status_label text NOT NULL DEFAULT 'active',
  status_flag text,
  badge_emoji text,
  badge_label text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_patient_directory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_patient_directory_admin_read" ON public.admin_patient_directory;
CREATE POLICY "admin_patient_directory_admin_read"
  ON public.admin_patient_directory FOR SELECT
  USING (public.is_current_user_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_insurance_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initials text NOT NULL,
  insurer_name text NOT NULL,
  cbuae_license text NOT NULL,
  partner_tier text NOT NULL DEFAULT 'standard',
  is_government boolean NOT NULL DEFAULT false,
  is_new_partner boolean NOT NULL DEFAULT false,
  api_status text NOT NULL DEFAULT 'healthy',
  api_latency_ms integer,
  members integer NOT NULL DEFAULT 0,
  claims_today integer NOT NULL DEFAULT 0,
  claim_value_today_aed integer NOT NULL DEFAULT 0,
  auto_approval_pct numeric(5,2) NOT NULL DEFAULT 0,
  plan_pills text[] DEFAULT '{}',
  partner_since text,
  platform_revenue_label text,
  sla_status text,
  breach_label text,
  fraud_alert_count integer NOT NULL DEFAULT 0,
  fraud_alert_severity text,
  api_warning_label text,
  sla_breach_label text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_insurance_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_insurance_partners_admin_read" ON public.admin_insurance_partners;
CREATE POLICY "admin_insurance_partners_admin_read"
  ON public.admin_insurance_partners FOR SELECT
  USING (public.is_current_user_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_portal_status_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_key text NOT NULL UNIQUE,
  portal_name text NOT NULL,
  active_users integer NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'online',
  sort_order integer NOT NULL DEFAULT 0,
  observed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_portal_status_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_portal_status_admin_read" ON public.admin_portal_status_snapshots;
CREATE POLICY "admin_portal_status_admin_read"
  ON public.admin_portal_status_snapshots FOR SELECT
  USING (public.is_current_user_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_live_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  detail text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ago_label text,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.admin_live_activity_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_live_activity_admin_read" ON public.admin_live_activity_events;
CREATE POLICY "admin_live_activity_admin_read"
  ON public.admin_live_activity_events FOR SELECT
  USING (public.is_current_user_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_compliance_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  detail text,
  is_compliant boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.admin_compliance_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_compliance_checklist_admin_read" ON public.admin_compliance_checklist;
CREATE POLICY "admin_compliance_checklist_admin_read"
  ON public.admin_compliance_checklist FOR SELECT
  USING (public.is_current_user_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_license_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_name text NOT NULL,
  doctor_initials text,
  days_remaining integer NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'medium',
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.admin_license_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_license_alerts_admin_read" ON public.admin_license_alerts;
CREATE POLICY "admin_license_alerts_admin_read"
  ON public.admin_license_alerts FOR SELECT
  USING (public.is_current_user_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_ai_usage_breakdown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL CHECK (bucket IN ('language', 'topic', 'portal')),
  label text NOT NULL,
  sub_label text,
  sessions integer NOT NULL DEFAULT 0,
  percent numeric(5,2) NOT NULL DEFAULT 0,
  metric_1_label text,
  metric_1_value text,
  metric_2_label text,
  metric_2_value text,
  metric_3_label text,
  metric_3_value text,
  metric_4_label text,
  metric_4_value text,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.admin_ai_usage_breakdown ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_ai_usage_admin_read" ON public.admin_ai_usage_breakdown;
CREATE POLICY "admin_ai_usage_admin_read"
  ON public.admin_ai_usage_breakdown FOR SELECT
  USING (public.is_current_user_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_revenue_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_label text NOT NULL,
  day_index integer NOT NULL,
  total_aed integer NOT NULL DEFAULT 0,
  consults_aed integer NOT NULL DEFAULT 0,
  ai_aed integer NOT NULL DEFAULT 0,
  lab_aed integer NOT NULL DEFAULT 0,
  target_aed integer NOT NULL DEFAULT 0
);
ALTER TABLE public.admin_revenue_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_revenue_daily_admin_read" ON public.admin_revenue_daily;
CREATE POLICY "admin_revenue_daily_admin_read"
  ON public.admin_revenue_daily FOR SELECT
  USING (public.is_current_user_super_admin());

-- ============================================================================
-- 2. Seed data
-- ============================================================================

TRUNCATE public.admin_portal_context;
INSERT INTO public.admin_portal_context (
  id,
  total_patients, patients_30d_active, patients_new_month, patients_flagged, patients_suspended, patient_change_pct,
  verified_doctors, pending_doctors, doctors_added_this_month, doctors_active_now, doctor_license_alerts, doctor_avg_rating, doctor_fees_mtd_aed,
  connected_orgs, orgs_clinics, orgs_hospitals, orgs_pharmacies, orgs_labs, orgs_added_this_month,
  ai_sessions_today, ai_sessions_month, ai_sessions_alltime, ai_active_now, ai_avg_response_sec, ai_uptime_pct,
  ai_satisfaction, ai_satisfaction_count, ai_to_booking_pct, ai_to_booking_count,
  ai_safety_flags_today, ai_safety_escalated, ai_safety_resolved,
  ai_revenue_today_aed, ai_revenue_net_aed, ai_revenue_margin_pct,
  revenue_today_aed, revenue_target_aed, revenue_change_pct,
  uptime_pct, uptime_incidents_month, dha_score, dha_license, dha_license_expires,
  active_sessions, open_issues, super_admin_name, super_admin_role_label, super_admin_organization,
  platform_version, environment_label, updated_at
) VALUES (
  true,
  48231, 31847, 1247, 5, 2, 12.40,
  847, 23, 8, 234, 11, 4.70, 39900,
  34, 18, 4, 8, 4, 4,
  8921, 127450, 1247891, 247, 2.30, 99.98,
  4.60, 48291, 34.70, 3097,
  12, 3, 9,
  287000, 269000, 93.70,
  847000, 2500000, 22.40,
  99.970, 0, 97.40, 'DHA-PLAT-2025-001847', 'Dec 2026',
  1247, 3, 'Dr. Parnia Yazdkhasti', 'CEO & Co-Founder · AryAiX LLC', 'AryAiX LLC',
  'v2.4.1', 'PRODUCTION', now()
);

TRUNCATE public.admin_dashboard_issues;
INSERT INTO public.admin_dashboard_issues (severity, category, title, detail, cta_label, cta_kind, sort_order) VALUES
  ('high', 'license', 'Dr. Ahmed Sultan — DHA license expires in 18 days', 'License DHA-PRAC-2022-0718 expires 25 Apr 2026. No reminder sent.', 'View', 'view', 1),
  ('high', 'security', 'IP 182.X.X.X — 3 failed logins · Blocked', 'Source: Dubai. Repeated bad password against admin endpoint.', 'Review', 'review', 2),
  ('medium', 'integration', 'Daman API slow · 3.2s response', 'Pre-auth and claims endpoints degraded since 1:20 PM GST.', 'Check', 'check', 3);

TRUNCATE public.admin_doctor_directory;
INSERT INTO public.admin_doctor_directory (
  initials, full_name, age, gender, nationality, dha_license, dha_verified, specialty, specialty_sub,
  clinic_name, city, consults_lifetime, consults_recent_label, rating, rating_count,
  license_expires_at, license_expires_label, reminder_status, status_label, status_flag,
  badge_emoji, badge_label, sort_order
) VALUES
  ('AA','Dr. Ahmed Al Rashidi',45,'male','🇦🇪','DHA-PRAC-2018-047821',true,'Cardiology','Interventional','Al Noor Medical Center','Dubai',1247,'89/mo',4.90,186,'2026-12-31','31 Dec 2026 · 269 days',NULL,'verified',NULL,'⭐','Top',1),
  ('SK','Dr. Sarah Al Khateeb',38,'female','🇦🇪','DHA-PRAC-2020-058321',true,'Cardiology',NULL,'Al Zahra Hospital','Dubai',892,'67/mo',4.70,94,'2026-12-31','31 Dec 2026 · 269 days',NULL,'verified',NULL,NULL,NULL,2),
  ('MF','Dr. Maryam Al Farsi',34,'female','🇦🇪','DHA-PRAC-2021-062821',true,'General Practice',NULL,'Gulf Medical Center','Dubai',634,'234 today',4.60,67,'2027-01-15','15 Jan 2027 · 283 days',NULL,'verified',NULL,NULL,NULL,3),
  ('FM','Dr. Fatima Al Mansoori',41,'female','🇦🇪','DHA-PRAC-2019-047251',true,'Endocrinology',NULL,'Dubai Specialist Hospital','Dubai',1089,'45/mo',4.80,124,'2027-02-20','20 Feb 2027 · 319 days',NULL,'verified',NULL,NULL,NULL,4),
  ('KR','Dr. Khalid Al Rashedi',52,'male','🇦🇪','DHA-PRAC-2017-038452',true,'Neurology',NULL,'Emirates Specialty Hospital','Dubai',2341,'34/mo',4.50,289,'2026-11-30','30 Nov 2026 · 237 days',NULL,'verified',NULL,NULL,NULL,5),
  ('AS','Dr. Ahmed Sultan',48,'male','🇸🇦','DHA-PRAC-2022-071831',true,'General Practice',NULL,'Emirates Medical Center','Dubai',456,'28/mo',4.30,51,'2026-04-25','25 Apr 2026 · 18 DAYS','No response','expiring',NULL,'⚠️','Expiring',6),
  ('LR','Dr. Layla Al Rashidi',35,'female','🇦🇪','DHA-PRAC-2020-059121',true,'Dermatology',NULL,'Dubai Cosmetic & Skin Clinic','Dubai',678,'41/mo',4.70,89,'2026-05-01','1 May 2026 · 24 DAYS','Renewal submitted ✅','expiring',NULL,'⚠️','Expiring',7),
  ('OF','Dr. Omar Al Farsi',44,'male','🇦🇪','DHA-PRAC-2021-063912',true,'Orthopedics',NULL,'Emirates Orthopedic Hospital','Dubai',891,'52/mo',4.60,112,'2026-05-06','6 May 2026 · 29 DAYS','Not yet sent','expiring',NULL,'⚠️','Expiring',8),
  ('TH','Dr. Tooraj Helmi',43,'male','🇮🇷','DHA-PRAC-2020-051221',true,'General Practice',NULL,'AryAiX Health Clinic','Dubai',12,'0/mo',5.00,3,'2027-06-30','30 Jun 2027 · 449 days',NULL,'verified',NULL,'⭐','Team',9),
  ('HZ','Dr. Hessa Al Zaabi',39,'female','🇦🇪','DHA-PRAC-2021-067321',true,'Orthopedics',NULL,'City Hospital Sharjah','Sharjah',523,'31/mo',4.40,74,'2027-08-15','15 Aug 2027 · 495 days',NULL,'verified',NULL,NULL,NULL,10),
  ('OH','Dr. Omar Al Hassan',46,'male','🇦🇪','DHA-PRAC-2019-052841',true,'Pulmonology',NULL,'Al Zahra Hospital','Dubai',876,'39/mo',4.60,108,'2026-10-31','31 Oct 2026 · 177 days',NULL,'verified',NULL,NULL,NULL,11),
  ('RA','Dr. Rania Al Suwaidi',37,'female','🇦🇪','DHA-PRAC-2018-048121',true,'Radiology','FRCR','Dubai Medical & Imaging Centre','Dubai',1432,'72/mo',4.90,167,'2026-12-15','15 Dec 2026 · 253 days',NULL,'verified',NULL,'⭐','Top',12),
  ('YA','Dr. Yousuf Al Zaabi',43,'male','🇦🇪','DHA-PRAC-2020-061821',true,'Cardiology',NULL,'Unnamed Private Clinic','Dubai',394,'18/mo',3.80,47,'2027-02-28','28 Feb 2027 · 327 days',NULL,'flagged','flag','🚩',NULL,13),
  ('MS','Dr. Maria Santos',38,'female','🇵🇭','DHA-PRAC-2021-063821',true,'General Practice',NULL,'Emirates Clinic','Dubai',567,'0/mo',4.20,78,'2026-03-30','30 Mar 2026 · EXPIRED',NULL,'suspended','suspend','⛔',NULL,14),
  ('KI','Dr. Khalid Ibrahim Al Mazrouei',37,'male','🇦🇪','DHA-PRAC-2023-084712',false,'Neurology',NULL,'Dubai Neurology Institute','Dubai',0,'0/mo',NULL,0,'2027-12-31','31 Dec 2027 · 634 days',NULL,'pending',NULL,'⏳',NULL,15);

TRUNCATE public.admin_patient_directory;
INSERT INTO public.admin_patient_directory (
  initials, full_name, age, gender, blood_type, patient_code, emirates_id_masked,
  insurance_plan, insurance_member_id_masked, city, joined_label, last_active_label,
  risk_level, status_label, status_flag, badge_emoji, badge_label, sort_order
) VALUES
  ('PY','Parnia Yazdkhasti',38,'female','A+','PT-001','784-●●●●-●●●●●●●-3','Daman Gold','DAM-2024-IND…','Dubai','Jan 2024','Just now','medium','active',NULL,'⭐','Premium',1),
  ('KH','Khalid Hassan Abdullah',54,'male','B+','PT-002','784-●●●●-●●●●●●●-1','ADNIC','ADN-2023-IND…','Dubai','Jan 2024','2 hours ago','low','active',NULL,NULL,NULL,2),
  ('FB','Fatima Bint Rashid',41,'female','O+','PT-003','784-●●●●-●●●●●●●-2','Thiqa','THQ-2024-IND…','Abu Dhabi','Feb 2024','Yesterday','low','active',NULL,NULL,NULL,3),
  ('MS','Mohammed Rashid Al Shamsi',48,'male','AB+','PT-004','784-●●●●-●●●●●●●-4','Daman Basic','DAM-2024-IND…','Dubai','Mar 2024','3 hours ago','high','active',NULL,NULL,NULL,4),
  ('AM','Aisha Mohammed Al Reem',42,'female','O-','PT-006','784-●●●●-●●●●●●●-5','AXA Gulf','AXA-2024-IND…','Dubai','Jun 2024','Today 2:05 PM','medium','active',NULL,NULL,NULL,5),
  ('SR','Saeed Rashid Al Mansoori',58,'male','A-','PT-007','784-●●●●-●●●●●●●-6','Oman Insurance','OMN-2023-IND…','Sharjah','Aug 2024','Today 2:30 PM','medium','active',NULL,NULL,NULL,6),
  ('NK','Noura Bint Khalid',28,'female','B-','PT-008','784-●●●●-●●●●●●●-7','Daman Silver','DAM-2024-IND…','Dubai','Sep 2024','Today 3:30 PM','low','active',NULL,NULL,NULL,7),
  ('IM','Ibrahim Al Marzouqi',55,'male','O+','PT-009','784-●●●●-●●●●●●●-8','Daman Gold','DAM-2024-IND…','Dubai','Oct 2024','Today 1:52 PM','critical','active',NULL,NULL,NULL,8),
  ('LA','Layla Ahmed Al Rashidi',34,'female','A+','PT-010','784-●●●●-●●●●●●●-9','Daman Silver','DAM-2025-IND…','Abu Dhabi','Nov 2024','5 days ago','low','active',NULL,NULL,NULL,9),
  ('OH','Omar Khalil Al Hassan',62,'male','B+','PT-011','784-●●●●-●●●●●●●-0','Cash','—…','Dubai','Jan 2025','45 days ago','low','inactive',NULL,NULL,NULL,10),
  ('SH','Sarah Bint Hamdan',35,'female','A-','PT-012','784-●●●●-●●●●●●●-1','Daman Gold','DAM-2025-IND…','Dubai','Feb 2025','Today 1:00 PM','low','active',NULL,NULL,NULL,11),
  ('MS','Mariam Jassim Al Suwaidi',38,'female','O+','PT-013','784-●●●●-●●●●●●●-2','AXA Gulf','AXA-2025-IND…','Sharjah','Mar 2025','Today 2:45 PM','low','active',NULL,NULL,NULL,12),
  ('YZ','Yousuf Khalid Al Zaabi',48,'male','A+','PT-014','784-●●●●-●●●●●●●-3','Daman Silver','DAM-2025-IND…','Dubai','Apr 2025','Yesterday','medium','active',NULL,NULL,NULL,13),
  ('HM','Hassan Rashid Al Mansoori',45,'male','AB+','PT-015','784-●●●●-●●●●●●●-4','ADNIC','ADN-2025-IND…','Dubai','May 2025','3 weeks ago','high','flagged','flag','🚩',NULL,14),
  ('AI','Ahmad Mohammed Ibrahim',52,'male','O-','PT-016','784-●●●●-●●●●●●●-5','Daman Basic','DAM-2025-IND…','Dubai','Jun 2025','6 days ago','high','suspended','suspend','🔒',NULL,15);

TRUNCATE public.admin_insurance_partners;
INSERT INTO public.admin_insurance_partners (
  initials, insurer_name, cbuae_license, partner_tier, is_government, is_new_partner,
  api_status, api_latency_ms, members, claims_today, claim_value_today_aed, auto_approval_pct,
  plan_pills, partner_since, platform_revenue_label,
  sla_status, breach_label, fraud_alert_count, fraud_alert_severity,
  api_warning_label, sla_breach_label, notes, sort_order
) VALUES
  ('D','Daman National Health Insurance','CBUAE-INS-2006-001847','premium', false, false,
    'degraded', 3247, 8247, 312, 1248000, 78.20,
    ARRAY['Daman Gold','Daman Silver','Daman Basic','Thiqa'], 'Since Jan 2024', 'AED 92,062/mo',
    'breach', '⚠️ 1 breach · 5 alerts 🔍', 5, 'high',
    '⚠️ API 3247ms slow', '⚡ SLA breach — PA-20260407-00912', '🔍 2 HIGH fraud alerts', 1),
  ('A','AXA Gulf','CBUAE-INS-2004-000891','standard', false, false,
    'healthy', 421, 6341, 218, 847000, 82.10,
    ARRAY['AXA Standard','AXA Enhanced'], 'Since Mar 2024', 'AED 61,400/mo',
    'compliant', '✅ SLA Compliant · 1 alerts 🔍', 1, 'medium', NULL, NULL, NULL, 2),
  ('AD','ADNIC','CBUAE-INS-2001-000234','standard', false, false,
    'healthy', 378, 4891, 167, 621000, 85.40,
    ARRAY['ADNIC Standard','ADNIC Plus'], 'Since Jun 2024', 'AED 42,800/mo',
    'compliant', '✅ SLA Compliant · 0 fraud ✅', 0, NULL, NULL, NULL, NULL, 3),
  ('T','Thiqa (Abu Dhabi Government Healthcare)','CBUAE-INS-THIQA-001','premium', true, false,
    'healthy', 291, 3847, 89, 354000, 94.70,
    ARRAY['Thiqa (Government)'], 'Since Jan 2024', 'AED 48,200/mo',
    'compliant', '✅ SLA Compliant · 0 fraud ✅', 0, NULL, NULL, NULL, NULL, 4),
  ('O','Oman Insurance Company','CBUAE-INS-2003-000612','standard', false, false,
    'healthy', 612, 2847, 134, 422000, 79.30,
    ARRAY['OIC Standard','OIC Gold'], 'Since Sep 2024', 'AED 28,100/mo',
    'compliant', '✅ SLA Compliant · 0 fraud ✅', 0, NULL, NULL, NULL, NULL, 5),
  ('OR','Orient Insurance','CBUAE-INS-2000-000184','standard', false, false,
    'healthy', 548, 1647, 67, 215000, 76.80,
    ARRAY['Orient Standard'], 'Since Dec 2024', 'AED 14,200/mo',
    'compliant', '✅ SLA Compliant · 0 fraud ✅', 0, NULL, NULL, NULL, NULL, 6),
  ('G','GIG Gulf','CBUAE-INS-2005-000743','standard', false, true,
    'healthy', 714, 1241, 45, 148000, 73.40,
    ARRAY['GIG Standard','GIG Premium'], 'Since Feb 2025', 'AED 9,800/mo',
    'compliant', '✅ SLA Compliant · 1 alerts 🔍', 1, 'low', NULL, NULL, NULL, 7);

TRUNCATE public.admin_portal_status_snapshots;
INSERT INTO public.admin_portal_status_snapshots (portal_key, portal_name, active_users, latency_ms, status, sort_order) VALUES
  ('patient','Patient Portal',891,124,'online',1),
  ('doctor','Doctor Portal',234,89,'online',2),
  ('pharmacy','Pharmacy Portal',67,112,'online',3),
  ('diagnostics','Diagnostics Portal',38,98,'online',4),
  ('insurance','Insurance Portal',14,3200,'degraded',5),
  ('admin','Admin Portal',3,67,'online',6);

TRUNCATE public.admin_live_activity_events;
INSERT INTO public.admin_live_activity_events (category, title, detail, occurred_at, ago_label, sort_order) VALUES
  ('patient','New patient registered','Mariam Al Suwaidi · Daman Gold · Dubai', now(),'just now',1),
  ('consult','Consultation completed','Dr. Ahmed → Aisha Mohammed · Al Noor', now() - interval '12 seconds','12s ago',2),
  ('prescription','Prescription sent to pharmacy','RX-20260407-003124 → Al Shifa Pharmacy', now() - interval '45 seconds','45s ago',3),
  ('ai','AI consultation started','Patient #48231 · Symptom checker · Arabic', now() - interval '1 minute','1m ago',4),
  ('lab','Lab results released','Dubai Medical Lab → PT-004 · Mohammed Al Shamsi', now() - interval '1 minute','1m ago',5),
  ('insurance','Pre-auth submitted to Daman','PA-20260407-00847 · AED 2,500 · Cardiac MRI', now() - interval '2 minutes','2m ago',6),
  ('auth','Doctor login · Al Noor Medical','Dr. Ahmed Al Rashidi · Dubai · Chrome', now() - interval '3 minutes','3m ago',7),
  ('claim','Insurance claim approved','CLM-20260407-00481 · AED 360 · Daman Gold', now() - interval '3 minutes','3m ago',8),
  ('ai','AI consultation → doctor escalation','Patient #31847 → Dr. Maryam Al Farsi', now() - interval '4 minutes','4m ago',9),
  ('license','DHA license renewal alert sent','Dr. Ahmed Sultan · Expires 25 April 2026', now() - interval '8 minutes','8m ago',10),
  ('security','Failed login blocked','IP 182.X.X.X · 3 attempts · Dubai', now() - interval '12 minutes','12m ago',11),
  ('nabidh','Nabidh sync batch completed','3,421 records · 8:00 AM bulk sync ✅', now() - interval '6 hours','6h ago',12);

TRUNCATE public.admin_compliance_checklist;
INSERT INTO public.admin_compliance_checklist (label, detail, is_compliant, sort_order) VALUES
  ('DHA Platform License','Valid until Dec 2026', true, 1),
  ('NABIDH HIE Approved','Approved · Active', true, 2),
  ('Patient Data Encryption','AES-256 · At rest + transit', true, 3),
  ('ePrescription Module','DHA-certified · v3.2', true, 4),
  ('Audit Logging','All events logged · 7yr retention', true, 5),
  ('ISO 27001','Renewal due Aug 2026', true, 6);

TRUNCATE public.admin_license_alerts;
INSERT INTO public.admin_license_alerts (doctor_name, doctor_initials, days_remaining, severity, sort_order) VALUES
  ('Dr. Ahmed Sultan','AS',18,'high',1),
  ('Dr. Layla Rashid','LR',24,'medium',2),
  ('Dr. Omar Al Farsi','OF',29,'medium',3);

TRUNCATE public.admin_ai_usage_breakdown;
INSERT INTO public.admin_ai_usage_breakdown (bucket, label, sub_label, sessions, percent, metric_1_label, metric_1_value, metric_2_label, metric_2_value, metric_3_label, metric_3_value, metric_4_label, metric_4_value, sort_order) VALUES
  ('language','🇦🇪 Arabic',NULL,5531,62.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
  ('language','🇬🇧 English',NULL,3033,34.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2),
  ('language','🇮🇳 Hindi',NULL,268,3.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3),
  ('language','🇵🇭 Tagalog',NULL,89,1.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,4),
  ('topic','Symptom assessment',NULL,3033,34.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1),
  ('topic','Medication query',NULL,1963,22.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2),
  ('topic','Appointment booking',NULL,1695,19.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3),
  ('topic','Lab result interpretation',NULL,1338,15.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,4),
  ('topic','Other',NULL,892,10.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,5),
  ('portal','Patient Health Assistant','6,847 sessions today · 76.8%',6847,76.80,'Satisfaction','4.6★','Booking rate','34.7%','Avg duration','7 min','Accuracy','89.4%',1),
  ('portal','Doctor Clinical Support','1,841 sessions today · 20.6%',1841,20.60,'SOAP acceptance','78.3%','ICD-10 accuracy','92.1%','Time saved','4.2 min','Daily usage','67.4%',2),
  ('portal','Insurance Pre-Auth AI','233 sessions today · 2.6%',233,2.60,'Rec. accuracy','94.2%','Fraud TP rate','89.1%','False positive','4.2%','Processing','1.8s',3);

TRUNCATE public.admin_revenue_daily;
INSERT INTO public.admin_revenue_daily (day_label, day_index, total_aed, consults_aed, ai_aed, lab_aed, target_aed) VALUES
  ('Apr 1', 1, 121000, 56000, 41000, 24000, 125000),
  ('Apr 2', 2, 137000, 64000, 45000, 28000, 125000),
  ('Apr 3', 3, 158000, 73000, 49000, 36000, 125000),
  ('Apr 4', 4, 169000, 79000, 51000, 39000, 125000),
  ('Apr 5', 5, 142000, 67000, 44000, 31000, 125000),
  ('Apr 6', 6, 153000, 71000, 47000, 35000, 125000),
  ('Apr 7', 7, 173000, 84000, 50000, 39000, 125000);

-- Backfill organizations to match hosted (6 orgs)
INSERT INTO public.organizations (slug, name, kind, city, country, primary_contact_name, primary_contact_email, seats_allocated, seats_used, status, contract_started_at, contract_ends_at, notes)
VALUES
  ('mediclinic-dubai-mall','Mediclinic Dubai Mall','hospital','Dubai','AE','Operations Director','ops@mediclinic.ae',300,234,'active', now() - interval '14 months', now() + interval '24 months', 'NABIDH connected · DHA-H-2023-10456'),
  ('aster-pharmacy-marina','Aster Pharmacy Marina','pharmacy','Dubai','AE','Pharmacy Lead','marina@aster.ae',60,45,'active', now() - interval '8 months', now() + interval '28 months','NABIDH connected · DHA-P-2024-08923'),
  ('nmc-royal-hospital','NMC Royal Hospital','hospital','Sharjah','AE','Hospital Director','royal@nmc.ae',400,312,'active', now() - interval '14 months', now() + interval '20 months','NABIDH connected · DHA-H-2023-07834'),
  ('healthhub-clinic-jlt','HealthHub Clinic JLT','clinic','Dubai','AE','Clinic Manager','jlt@healthhub.ae',30,12,'pending', now() - interval '1 month', now() + interval '11 months','Onboarding · DHA-C-2026-02341'),
  ('unilabs-dubai','Unilabs Dubai','lab','Dubai','AE','Lab Director','labs@unilabs.ae',80,67,'active', now() - interval '10 months', now() + interval '22 months','NABIDH connected · DHA-L-2024-01123'),
  ('cleveland-clinic-abu-dhabi','Cleveland Clinic Abu Dhabi','hospital','Abu Dhabi','AE','Hospital Director','abudhabi@clevelandclinic.ae',500,456,'active', now() - interval '14 months', now() + interval '24 months','NABIDH connected · DHA-H-2023-05001')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  city = EXCLUDED.city,
  status = EXCLUDED.status,
  seats_allocated = EXCLUDED.seats_allocated,
  seats_used = EXCLUDED.seats_used,
  notes = EXCLUDED.notes,
  contract_started_at = EXCLUDED.contract_started_at,
  contract_ends_at = EXCLUDED.contract_ends_at,
  updated_at = now();

-- ============================================================================
-- 3. RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  ctx jsonb;
  issues jsonb;
  portals jsonb;
  live_feed jsonb;
  checklist jsonb;
  license_alerts jsonb;
  revenue jsonb;
  orgs_summary jsonb;
BEGIN
  IF NOT public.is_current_user_super_admin() THEN
    RAISE EXCEPTION 'Only super_admin users can read admin dashboard.' USING ERRCODE = 'P0001';
  END IF;

  SELECT to_jsonb(c) INTO ctx FROM public.admin_portal_context c WHERE id = true;

  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.sort_order), '[]'::jsonb)
  INTO issues
  FROM public.admin_dashboard_issues i;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.sort_order), '[]'::jsonb)
  INTO portals
  FROM public.admin_portal_status_snapshots p;

  SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.sort_order), '[]'::jsonb)
  INTO live_feed
  FROM public.admin_live_activity_events e;

  SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.sort_order), '[]'::jsonb)
  INTO checklist
  FROM public.admin_compliance_checklist c;

  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.sort_order), '[]'::jsonb)
  INTO license_alerts
  FROM public.admin_license_alerts a;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.day_index), '[]'::jsonb)
  INTO revenue
  FROM public.admin_revenue_daily r;

  SELECT jsonb_build_object(
    'total', count(*),
    'hospitals', count(*) FILTER (WHERE kind = 'hospital'),
    'clinics', count(*) FILTER (WHERE kind = 'clinic'),
    'pharmacies', count(*) FILTER (WHERE kind = 'pharmacy'),
    'labs', count(*) FILTER (WHERE kind = 'lab'),
    'insurance', count(*) FILTER (WHERE kind = 'insurance')
  ) INTO orgs_summary
  FROM public.organizations;

  payload := jsonb_build_object(
    'generatedAt', to_jsonb(now()),
    'context', COALESCE(ctx, '{}'::jsonb),
    'issues', issues,
    'portals', portals,
    'liveActivity', live_feed,
    'complianceChecklist', checklist,
    'licenseAlerts', license_alerts,
    'revenueDaily', revenue,
    'orgsSummary', orgs_summary
  );

  RETURN payload;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_doctor_directory()
RETURNS SETOF public.admin_doctor_directory
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.admin_doctor_directory
  WHERE public.is_current_user_super_admin()
  ORDER BY sort_order;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_doctor_directory() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_patient_directory()
RETURNS SETOF public.admin_patient_directory
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.admin_patient_directory
  WHERE public.is_current_user_super_admin()
  ORDER BY sort_order;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_patient_directory() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_insurance_partners()
RETURNS SETOF public.admin_insurance_partners
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.admin_insurance_partners
  WHERE public.is_current_user_super_admin()
  ORDER BY sort_order;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_insurance_partners() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_ai_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  ctx jsonb;
  by_lang jsonb;
  by_topic jsonb;
  by_portal jsonb;
BEGIN
  IF NOT public.is_current_user_super_admin() THEN
    RAISE EXCEPTION 'Only super_admin users can read AI dashboard.' USING ERRCODE = 'P0001';
  END IF;

  SELECT to_jsonb(c) INTO ctx FROM public.admin_portal_context c WHERE id = true;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.sort_order), '[]'::jsonb)
  INTO by_lang FROM public.admin_ai_usage_breakdown r WHERE bucket = 'language';

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.sort_order), '[]'::jsonb)
  INTO by_topic FROM public.admin_ai_usage_breakdown r WHERE bucket = 'topic';

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.sort_order), '[]'::jsonb)
  INTO by_portal FROM public.admin_ai_usage_breakdown r WHERE bucket = 'portal';

  payload := jsonb_build_object(
    'generatedAt', to_jsonb(now()),
    'context', COALESCE(ctx, '{}'::jsonb),
    'languages', by_lang,
    'topics', by_topic,
    'portals', by_portal
  );

  RETURN payload;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_ai_dashboard() TO authenticated;
