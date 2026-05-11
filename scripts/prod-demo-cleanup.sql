-- Production demo-data cleanup.
--
-- The "mixed" migrations (20260427054000, 20260503133000, 20260510010000)
-- ship both schema (CREATE TABLE / RLS / RPCs) and demo INSERTs. For
-- production we want the schema but NOT the demo INSERTs. Marking those
-- migrations as `applied` would skip the schema too (bad). So we let them
-- run and then delete the demo rows here.
--
-- Reference data (specializations, medication_catalog, lab_test_catalog) is
-- intentionally kept — those are lookups the app uses everywhere.
--
-- Idempotent: re-running is safe. Every table reference is guarded by
-- information_schema so missing tables don't fail the script.

DO $$
DECLARE
  demo_tables text[] := ARRAY[
    -- Admin portal demo directories
    'admin_portal_context',
    'admin_dashboard_issues',
    'admin_doctor_directory',
    'admin_patient_directory',
    'admin_insurance_partners',
    'admin_portal_status_snapshots',
    'admin_live_activity_events',
    'admin_compliance_checklist',
    'admin_license_alerts',
    'admin_ai_usage_breakdown',
    'admin_revenue_daily',
    -- Lab portal demo data
    'lab_portal_imaging_studies',
    'lab_portal_equipment',
    'lab_portal_qc_runs',
    'lab_portal_nabidh_events',
    'lab_portal_settings',
    'lab_portal_critical_values',
    'lab_portal_top_metrics',
    'lab_portal_volume_trends',
    'lab_portal_facility_meta',
    'lab_portal_setting_options',
    -- Pharmacy + insurance portal demo data
    'pharmacy_portal_prescription_queue',
    'pharmacy_portal_inventory_alerts',
    'pharmacy_portal_revenue_tiles',
    'insurance_portal_preauth_queue',
    'insurance_portal_claims_queue',
    'insurance_portal_members',
    'insurance_portal_fraud_alerts',
    'insurance_portal_network_providers',
    'insurance_portal_risk_segments',
    'insurance_portal_reports',
    'insurance_portal_settings',
    'insurance_ai_insights',
    'insurance_monthly_claims_volume',
    'insurance_claim_appeals',
    -- Demo orgs / profiles
    'organizations',
    'lab_profiles',
    'pharmacy_profiles',
    'insurance_profiles',
    -- Demo lab orders + items (no-op if migrations didn't seed any)
    'lab_orders',
    'lab_order_items',
    -- Demo hospitals/clinics directory
    'hospitals',
    'clinics'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY demo_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
    END IF;
  END LOOP;
END $$;

-- Defensively remove demo auth users if any slipped in.
DELETE FROM auth.users WHERE id IN (
  '9a1f5c7c-4f74-4c5e-8d6e-7b2a1a111001',  -- lab1 demo
  '9a1f5c7c-4f74-4c5e-8d6e-7b2a1a111002'   -- admin1 demo
);

-- Sanity check
SELECT 'auth.users' AS t, COUNT(*) AS n FROM auth.users
UNION ALL SELECT 'organizations', COUNT(*) FROM public.organizations
UNION ALL SELECT 'lab_profiles', COUNT(*) FROM public.lab_profiles
UNION ALL SELECT 'admin_doctor_directory', COUNT(*) FROM public.admin_doctor_directory
UNION ALL SELECT 'admin_patient_directory', COUNT(*) FROM public.admin_patient_directory
UNION ALL SELECT 'lab_portal_imaging_studies', COUNT(*) FROM public.lab_portal_imaging_studies
UNION ALL SELECT 'specializations (kept ref)', COUNT(*) FROM public.specializations
UNION ALL SELECT 'medication_catalog (kept ref)', COUNT(*) FROM public.medication_catalog
UNION ALL SELECT 'lab_test_catalog (kept ref)', COUNT(*) FROM public.lab_test_catalog
ORDER BY t;
