-- Operational portal data for pharmacy and insurance workspaces.
-- These tables replace UI-only demo constants with tenant-scoped Supabase seed data.

CREATE OR REPLACE FUNCTION public.current_user_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'role', ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    (
      SELECT up.role::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_app_role() TO authenticated;

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_title text NOT NULL,
  is_primary boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_unique UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user
  ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org
  ON public.organization_members(organization_id);

DROP TRIGGER IF EXISTS trg_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER trg_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_current_user_ops_org(target_organization_id uuid, expected_kind text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_current_user_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.organizations org ON org.id = om.organization_id
      WHERE om.organization_id = target_organization_id
        AND om.user_id = auth.uid()
        AND (om.ends_at IS NULL OR om.ends_at > now())
        AND (expected_kind IS NULL OR org.kind = expected_kind)
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations org
      WHERE org.id = target_organization_id
        AND expected_kind IS NOT NULL
        AND org.kind = expected_kind
        AND public.current_user_app_role() = expected_kind
    );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_ops_org(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_ops_org(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "organization_members_ops_read" ON public.organization_members;
CREATE POLICY "organization_members_ops_read"
  ON public.organization_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_current_user_super_admin()
    OR public.is_current_user_ops_org(organization_id)
  );

DROP POLICY IF EXISTS "organization_members_admin_manage" ON public.organization_members;
CREATE POLICY "organization_members_admin_manage"
  ON public.organization_members
  FOR ALL
  USING (public.is_current_user_super_admin())
  WITH CHECK (public.is_current_user_super_admin());

DROP POLICY IF EXISTS "organizations_ops_members_read" ON public.organizations;
CREATE POLICY "organizations_ops_members_read"
  ON public.organizations
  FOR SELECT
  USING (
    public.is_current_user_super_admin()
    OR public.is_current_user_ops_org(id, kind)
  );

CREATE TABLE IF NOT EXISTS public.pharmacy_facility_profiles (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  license_number text NOT NULL,
  license_valid_until date,
  address text NOT NULL,
  operating_hours text NOT NULL,
  pharmacist_in_charge text,
  dha_connected boolean NOT NULL DEFAULT true,
  nabidh_connected boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role_title text NOT NULL,
  credential_number text,
  shift_status text NOT NULL DEFAULT 'on_shift',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_staff_members_shift_chk CHECK (shift_status IN ('on_shift', 'off_shift', 'on_call'))
);

CREATE TABLE IF NOT EXISTS public.pharmacy_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sku text NOT NULL,
  generic_name text NOT NULL,
  brand_name text NOT NULL,
  strength text,
  dosage_form text NOT NULL DEFAULT 'Tablets',
  atc_code text,
  category text,
  unit text NOT NULL DEFAULT 'tabs',
  reorder_level integer NOT NULL DEFAULT 20,
  is_controlled boolean NOT NULL DEFAULT false,
  is_dha_formulary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pharmacy_inventory_items_sku_unique UNIQUE (organization_id, sku)
);

CREATE TABLE IF NOT EXISTS public.pharmacy_inventory_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.pharmacy_inventory_items(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  quantity_on_hand integer NOT NULL DEFAULT 0,
  expiry_date date,
  received_at timestamptz NOT NULL DEFAULT now(),
  unit_cost_aed numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pharmacy_inventory_batches_unique UNIQUE (inventory_item_id, batch_number)
);

CREATE TABLE IF NOT EXISTS public.pharmacy_dispensing_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  prescription_item_id uuid REFERENCES public.prescription_items(id) ON DELETE SET NULL,
  external_ref text NOT NULL,
  patient_name text NOT NULL,
  prescriber_name text NOT NULL,
  medication_name text NOT NULL,
  quantity integer,
  priority text NOT NULL DEFAULT 'routine',
  workflow_status text NOT NULL DEFAULT 'new',
  received_at timestamptz NOT NULL DEFAULT now(),
  insurance_provider text NOT NULL DEFAULT 'Cash',
  copay_aed numeric(10, 2) NOT NULL DEFAULT 0,
  allergy_flag boolean NOT NULL DEFAULT false,
  assigned_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pharmacy_dispensing_tasks_ref_unique UNIQUE (organization_id, external_ref),
  CONSTRAINT pharmacy_dispensing_tasks_priority_chk CHECK (priority IN ('stat', 'routine', 'scheduled')),
  CONSTRAINT pharmacy_dispensing_tasks_status_chk CHECK (workflow_status IN ('new', 'in_progress', 'on_hold', 'dispensed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.pharmacy_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dispensing_task_id uuid REFERENCES public.pharmacy_dispensing_tasks(id) ON DELETE SET NULL,
  external_ref text NOT NULL,
  payer_name text NOT NULL,
  amount_aed numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pharmacy_claims_ref_unique UNIQUE (organization_id, external_ref),
  CONSTRAINT pharmacy_claims_status_chk CHECK (status IN ('paid', 'review', 'pending', 'denied'))
);

CREATE TABLE IF NOT EXISTS public.pharmacy_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  specialty text NOT NULL,
  message_type text NOT NULL,
  status text NOT NULL,
  unread_count integer NOT NULL DEFAULT 0,
  last_message text NOT NULL,
  contact_message text NOT NULL,
  pharmacy_response text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pharmacy_messages_type_chk CHECK (message_type IN ('doctor', 'patient', 'system', 'dha')),
  CONSTRAINT pharmacy_messages_status_chk CHECK (status IN ('awaiting', 'sent', 'resolved', 'info'))
);

CREATE TABLE IF NOT EXISTS public.pharmacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pharmacy_settings_key_unique UNIQUE (organization_id, setting_key)
);

CREATE TABLE IF NOT EXISTS public.insurance_payer_profiles (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  regulator_name text NOT NULL,
  active_members integer NOT NULL DEFAULT 0,
  officer_name text NOT NULL,
  officer_title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.insurance_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_insurance_id uuid REFERENCES public.patient_insurance(id) ON DELETE SET NULL,
  external_member_id text NOT NULL,
  patient_name text NOT NULL,
  plan_name text NOT NULL,
  utilization_percent integer NOT NULL DEFAULT 0,
  claim_count integer NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insurance_members_unique UNIQUE (organization_id, external_member_id),
  CONSTRAINT insurance_members_risk_chk CHECK (risk_level IN ('low', 'medium', 'high'))
);

CREATE TABLE IF NOT EXISTS public.insurance_pre_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_ref text NOT NULL,
  patient_name text NOT NULL,
  clinician_name text NOT NULL,
  provider_name text NOT NULL,
  procedure_name text NOT NULL,
  priority text NOT NULL DEFAULT 'routine',
  status text NOT NULL DEFAULT 'review',
  requested_amount_aed numeric(12, 2) NOT NULL DEFAULT 0,
  approved_amount_aed numeric(12, 2),
  requested_at timestamptz NOT NULL DEFAULT now(),
  sla_due_at timestamptz NOT NULL,
  decision_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insurance_pre_authorizations_unique UNIQUE (organization_id, external_ref),
  CONSTRAINT insurance_pre_authorizations_priority_chk CHECK (priority IN ('urgent', 'high', 'routine')),
  CONSTRAINT insurance_pre_authorizations_status_chk CHECK (status IN ('overdue', 'review', 'approved', 'denied'))
);

CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_ref text NOT NULL,
  patient_name text NOT NULL,
  plan_name text NOT NULL,
  provider_name text NOT NULL,
  amount_aed numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  adjudicated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insurance_claims_unique UNIQUE (organization_id, external_ref),
  CONSTRAINT insurance_claims_status_chk CHECK (status IN ('submitted', 'under_review', 'approved', 'denied'))
);

CREATE TABLE IF NOT EXISTS public.insurance_fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_ref text NOT NULL,
  subject_name text NOT NULL,
  subject_type text NOT NULL DEFAULT 'provider',
  reason text NOT NULL,
  score integer NOT NULL,
  exposure_amount_aed numeric(12, 2) NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insurance_fraud_alerts_unique UNIQUE (organization_id, external_ref),
  CONSTRAINT insurance_fraud_alerts_score_chk CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT insurance_fraud_alerts_severity_chk CHECK (severity IN ('high', 'medium', 'low')),
  CONSTRAINT insurance_fraud_alerts_status_chk CHECK (status IN ('open', 'investigating', 'resolved'))
);

CREATE TABLE IF NOT EXISTS public.insurance_network_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  specialty text NOT NULL,
  claims_count integer NOT NULL DEFAULT 0,
  approval_rate_percent integer NOT NULL DEFAULT 0,
  average_cost_aed numeric(12, 2) NOT NULL DEFAULT 0,
  performance_flag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insurance_network_providers_unique UNIQUE (organization_id, provider_name)
);

CREATE TABLE IF NOT EXISTS public.insurance_risk_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  segment_name text NOT NULL,
  utilization_percent integer NOT NULL DEFAULT 0,
  loss_ratio_percent integer NOT NULL DEFAULT 0,
  forecast_note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insurance_risk_segments_unique UNIQUE (organization_id, segment_name)
);

CREATE TABLE IF NOT EXISTS public.insurance_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_name text NOT NULL,
  period_label text NOT NULL,
  status text NOT NULL DEFAULT 'ready',
  storage_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insurance_report_runs_unique UNIQUE (organization_id, report_name, period_label),
  CONSTRAINT insurance_report_runs_status_chk CHECK (status IN ('ready', 'running', 'failed'))
);

CREATE TABLE IF NOT EXISTS public.insurance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insurance_settings_key_unique UNIQUE (organization_id, setting_key)
);

DO $$
DECLARE
  portal_entry text[];
  portal_table text;
  portal_kind text;
BEGIN
  FOREACH portal_entry SLICE 1 IN ARRAY ARRAY[
    ARRAY['pharmacy_facility_profiles', 'pharmacy'],
    ARRAY['organization_staff_members', ''],
    ARRAY['pharmacy_inventory_items', 'pharmacy'],
    ARRAY['pharmacy_dispensing_tasks', 'pharmacy'],
    ARRAY['pharmacy_claims', 'pharmacy'],
    ARRAY['pharmacy_messages', 'pharmacy'],
    ARRAY['pharmacy_settings', 'pharmacy'],
    ARRAY['insurance_payer_profiles', 'insurance'],
    ARRAY['insurance_members', 'insurance'],
    ARRAY['insurance_pre_authorizations', 'insurance'],
    ARRAY['insurance_claims', 'insurance'],
    ARRAY['insurance_fraud_alerts', 'insurance'],
    ARRAY['insurance_network_providers', 'insurance'],
    ARRAY['insurance_risk_segments', 'insurance'],
    ARRAY['insurance_report_runs', 'insurance'],
    ARRAY['insurance_settings', 'insurance']
  ]
  LOOP
    portal_table := portal_entry[1];
    portal_kind := NULLIF(portal_entry[2], '');

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', portal_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', portal_table || '_ops_read', portal_table);

    IF portal_table = 'organization_staff_members' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_current_user_super_admin() OR public.is_current_user_ops_org(organization_id))',
        portal_table || '_ops_read',
        portal_table
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_current_user_super_admin() OR public.is_current_user_ops_org(organization_id, %L))',
        portal_table || '_ops_read',
        portal_table,
        portal_kind
      );
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', portal_table || '_admin_manage', portal_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_current_user_super_admin()) WITH CHECK (public.is_current_user_super_admin())',
      portal_table || '_admin_manage',
      portal_table
    );
  END LOOP;
END $$;

-- Pharmacy facility profile: allow pharmacy ops staff to update their own profile
DROP POLICY IF EXISTS "pharmacy_facility_profiles_ops_update" ON public.pharmacy_facility_profiles;
CREATE POLICY "pharmacy_facility_profiles_ops_update"
  ON public.pharmacy_facility_profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_current_user_ops_org(organization_id, 'pharmacy'::text)
  )
  WITH CHECK (
    is_current_user_ops_org(organization_id, 'pharmacy'::text)
  );

INSERT INTO public.organizations (slug, name, kind, city, country, primary_contact_name, primary_contact_email, seats_allocated, seats_used, status, notes)
VALUES
  ('al-shifa-pharmacy', 'Al Shifa Pharmacy', 'pharmacy', 'Dubai', 'AE', 'Rania Hassan', 'pharmacy@ceenaix.local', 12, 3, 'active', 'DHA-PHARM-2019-003481'),
  ('daman-national-health', 'Daman National Health', 'insurance', 'Abu Dhabi', 'AE', 'Mariam Al Khateeb', 'insurance@ceenaix.local', 80, 12, 'active', 'UAE Insurance Authority')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    kind = EXCLUDED.kind,
    city = EXCLUDED.city,
    primary_contact_name = EXCLUDED.primary_contact_name,
    primary_contact_email = EXCLUDED.primary_contact_email,
    seats_allocated = EXCLUDED.seats_allocated,
    seats_used = EXCLUDED.seats_used,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = now();

WITH pharmacy_org AS (
  SELECT id FROM public.organizations WHERE slug = 'al-shifa-pharmacy'
),
insurance_org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
)
INSERT INTO public.organization_members (organization_id, user_id, role_title)
SELECT pharmacy_org.id, up.user_id, 'Pharmacy Operator'
FROM pharmacy_org
CROSS JOIN public.user_profiles up
WHERE up.role = 'pharmacy'
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role_title = EXCLUDED.role_title,
    updated_at = now();

WITH insurance_org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
)
INSERT INTO public.organization_members (organization_id, user_id, role_title)
SELECT insurance_org.id, up.user_id, 'Insurance Operator'
FROM insurance_org
CROSS JOIN public.user_profiles up
WHERE up.role = 'insurance'
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role_title = EXCLUDED.role_title,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'al-shifa-pharmacy'
)
INSERT INTO public.pharmacy_facility_profiles (
  organization_id, display_name, license_number, license_valid_until, address, operating_hours, pharmacist_in_charge
)
SELECT org.id, 'Al Shifa Pharmacy', 'DHA-PHARM-2019-003481', DATE '2026-12-31', 'Al Barsha 1, Dubai, UAE', '8 AM - 10 PM (Sun-Sat)', 'Rania Hassan'
FROM org
ON CONFLICT (organization_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    license_number = EXCLUDED.license_number,
    license_valid_until = EXCLUDED.license_valid_until,
    address = EXCLUDED.address,
    operating_hours = EXCLUDED.operating_hours,
    pharmacist_in_charge = EXCLUDED.pharmacist_in_charge,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'al-shifa-pharmacy'
),
staff(full_name, role_title, credential_number, shift_status) AS (
  VALUES
    ('Rania Hassan', 'Head Pharmacist', 'DHA-PHAR-2017-001294', 'on_shift'),
    ('Khalid Al Ameri', 'Pharmacy Technician', 'DHA-TECH-2020-007241', 'on_shift'),
    ('Maryam Ibrahim', 'Pharmacy Technician', 'DHA-TECH-2021-008491', 'off_shift')
)
INSERT INTO public.organization_staff_members (organization_id, full_name, role_title, credential_number, shift_status)
SELECT org.id, staff.full_name, staff.role_title, staff.credential_number, staff.shift_status
FROM org
CROSS JOIN staff
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organization_staff_members existing
  WHERE existing.organization_id = org.id
    AND existing.full_name = staff.full_name
);

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'al-shifa-pharmacy'
),
items(sku, generic_name, brand_name, strength, dosage_form, atc_code, category, unit, reorder_level, is_controlled, is_dha_formulary) AS (
  VALUES
    ('RX-ATO-20', 'Atorvastatin', 'Lipitor', '20 mg', 'Tablets', 'C10AA05', 'Statin', 'tabs', 20, false, true),
    ('RX-MET-500', 'Metformin', 'Glucophage', '500 mg', 'Tablets', 'A10BA02', 'Biguanide', 'tabs', 40, false, true),
    ('RX-BIS-5', 'Bisoprolol', 'Concor', '5 mg', 'Tablets', 'C07AB07', 'Beta Blocker', 'tabs', 25, false, true),
    ('RX-WAR-5', 'Warfarin', 'Coumadin', '5 mg', 'Tablets', 'B01AA03', 'Anticoagulant', 'tabs', 15, true, true),
    ('RX-FUR-40', 'Furosemide', 'Lasix', '40 mg', 'Tablets', 'C03CA01', 'Diuretic', 'tabs', 20, false, true),
    ('RX-SPI-25', 'Spironolactone', 'Aldactone', '25 mg', 'Tablets', 'C03DA01', 'Diuretic', 'tabs', 20, false, true)
)
INSERT INTO public.pharmacy_inventory_items (
  organization_id, sku, generic_name, brand_name, strength, dosage_form, atc_code, category, unit, reorder_level, is_controlled, is_dha_formulary
)
SELECT org.id, items.sku, items.generic_name, items.brand_name, items.strength, items.dosage_form, items.atc_code, items.category, items.unit, items.reorder_level, items.is_controlled, items.is_dha_formulary
FROM org
CROSS JOIN items
ON CONFLICT (organization_id, sku) DO UPDATE
SET generic_name = EXCLUDED.generic_name,
    brand_name = EXCLUDED.brand_name,
    strength = EXCLUDED.strength,
    dosage_form = EXCLUDED.dosage_form,
    atc_code = EXCLUDED.atc_code,
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    reorder_level = EXCLUDED.reorder_level,
    is_controlled = EXCLUDED.is_controlled,
    is_dha_formulary = EXCLUDED.is_dha_formulary,
    updated_at = now();

WITH batches(sku, batch_number, quantity_on_hand, expiry_date, unit_cost_aed) AS (
  VALUES
    ('RX-ATO-20', 'ATO-0426-A', 0, DATE '2026-11-30', 0.55),
    ('RX-MET-500', 'MET-1226-A', 96, DATE '2026-12-31', 0.18),
    ('RX-BIS-5', 'BIS-0926-A', 18, DATE '2026-09-30', 0.42),
    ('RX-WAR-5', 'WAR-0526-A', 12, DATE '2026-05-15', 0.63),
    ('RX-FUR-40', 'FUR-0127-A', 30, DATE '2027-01-31', 0.21),
    ('RX-SPI-25', 'SPI-0327-A', 22, DATE '2027-03-31', 0.33)
)
INSERT INTO public.pharmacy_inventory_batches (inventory_item_id, batch_number, quantity_on_hand, expiry_date, unit_cost_aed)
SELECT items.id, batches.batch_number, batches.quantity_on_hand, batches.expiry_date, batches.unit_cost_aed
FROM batches
JOIN public.pharmacy_inventory_items items ON items.sku = batches.sku
JOIN public.organizations org ON org.id = items.organization_id AND org.slug = 'al-shifa-pharmacy'
ON CONFLICT (inventory_item_id, batch_number) DO UPDATE
SET quantity_on_hand = EXCLUDED.quantity_on_hand,
    expiry_date = EXCLUDED.expiry_date,
    unit_cost_aed = EXCLUDED.unit_cost_aed,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'al-shifa-pharmacy'
),
tasks(external_ref, patient_name, prescriber_name, medication_name, quantity, priority, workflow_status, minutes_ago, insurance_provider, copay_aed, allergy_flag, assigned_to) AS (
  VALUES
    ('RX-20260407-1042', 'Mariam Al Mansoori', 'Dr. Ahmed Al Maktoum', 'Metformin 500 mg', 60, 'stat', 'new', 24, 'Daman', 24, false, 'Rania Hassan'),
    ('RX-20260407-1043', 'Noura Khalifa', 'Dr. Sara Al Shamsi', 'Atorvastatin 20 mg', 30, 'routine', 'on_hold', 77, 'ADNIC', 18, false, 'Khalid Al Ameri'),
    ('RX-20260407-1044', 'Hassan Al Zaabi', 'Dr. Rashid Al Nuaimi', 'Warfarin 5 mg', 30, 'scheduled', 'dispensed', 138, 'Thiqa', 12, true, 'Rania Hassan'),
    ('RX-20260407-1045', 'Layla Hussein', 'Dr. Fatima Al Suwaidi', 'Furosemide 40 mg', 30, 'routine', 'in_progress', 46, 'Cash', 42, false, 'Maryam Ibrahim'),
    ('RX-20260407-1046', 'Omar Al Balushi', 'Dr. Omar Al Hassan', 'Bisoprolol 5 mg', 28, 'routine', 'new', 12, 'AXA Gulf', 16, false, 'Khalid Al Ameri')
)
INSERT INTO public.pharmacy_dispensing_tasks (
  organization_id, external_ref, patient_name, prescriber_name, medication_name, quantity, priority, workflow_status, received_at, insurance_provider, copay_aed, allergy_flag, assigned_to
)
SELECT org.id, tasks.external_ref, tasks.patient_name, tasks.prescriber_name, tasks.medication_name, tasks.quantity, tasks.priority, tasks.workflow_status, now() - make_interval(mins => tasks.minutes_ago), tasks.insurance_provider, tasks.copay_aed, tasks.allergy_flag, tasks.assigned_to
FROM org
CROSS JOIN tasks
ON CONFLICT (organization_id, external_ref) DO UPDATE
SET patient_name = EXCLUDED.patient_name,
    prescriber_name = EXCLUDED.prescriber_name,
    medication_name = EXCLUDED.medication_name,
    quantity = EXCLUDED.quantity,
    priority = EXCLUDED.priority,
    workflow_status = EXCLUDED.workflow_status,
    received_at = EXCLUDED.received_at,
    insurance_provider = EXCLUDED.insurance_provider,
    copay_aed = EXCLUDED.copay_aed,
    allergy_flag = EXCLUDED.allergy_flag,
    assigned_to = EXCLUDED.assigned_to,
    updated_at = now();

WITH claims(external_ref, task_ref, payer_name, amount_aed, status, submitted_minutes_ago, paid_minutes_ago) AS (
  VALUES
    ('PCL-20260407-9001', 'RX-20260407-1042', 'Daman', 186.00, 'pending', 21, NULL::integer),
    ('PCL-20260407-9002', 'RX-20260407-1043', 'ADNIC', 144.00, 'review', 70, NULL::integer),
    ('PCL-20260407-9003', 'RX-20260407-1044', 'Thiqa', 128.00, 'paid', 120, 24),
    ('PCL-20260407-9004', 'RX-20260407-1045', 'Cash', 92.00, 'paid', 45, 7),
    ('PCL-20260407-9005', 'RX-20260407-1046', 'AXA Gulf', 104.00, 'pending', 9, NULL::integer)
)
INSERT INTO public.pharmacy_claims (organization_id, dispensing_task_id, external_ref, payer_name, amount_aed, status, submitted_at, paid_at)
SELECT org.id, tasks.id, claims.external_ref, claims.payer_name, claims.amount_aed, claims.status, now() - make_interval(mins => claims.submitted_minutes_ago), CASE WHEN claims.paid_minutes_ago IS NULL THEN NULL ELSE now() - make_interval(mins => claims.paid_minutes_ago) END
FROM claims
JOIN public.organizations org ON org.slug = 'al-shifa-pharmacy'
LEFT JOIN public.pharmacy_dispensing_tasks tasks ON tasks.organization_id = org.id AND tasks.external_ref = claims.task_ref
ON CONFLICT (organization_id, external_ref) DO UPDATE
SET dispensing_task_id = EXCLUDED.dispensing_task_id,
    payer_name = EXCLUDED.payer_name,
    amount_aed = EXCLUDED.amount_aed,
    status = EXCLUDED.status,
    submitted_at = EXCLUDED.submitted_at,
    paid_at = EXCLUDED.paid_at,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'al-shifa-pharmacy'
),
messages(contact_name, specialty, message_type, status, unread_count, last_message, contact_message, pharmacy_response, minutes_ago) AS (
  VALUES
    ('Dr. Sara Al Shamsi', 'Cardiology - Prescription clarification', 'doctor', 'awaiting', 1, 'Please confirm substitution for Atorvastatin 20 mg.', 'Please confirm substitution for Atorvastatin 20 mg before dispensing.', 'Acknowledged. We are checking stock and insurance coverage now.', 18),
    ('Noura Khalifa', 'Patient pickup window', 'patient', 'sent', 0, 'Prescription will be ready after insurance verification.', 'Can I pick up my medication after 5 PM today?', 'Yes. We will notify you once insurance verification is complete.', 43),
    ('DHA ePrescription', 'Regulatory feed', 'dha', 'info', 0, 'Daily dispensing ledger is ready for submission.', 'Daily dispensing ledger is ready for DHA submission.', NULL, 86)
)
INSERT INTO public.pharmacy_messages (
  organization_id, contact_name, specialty, message_type, status, unread_count, last_message, contact_message, pharmacy_response, last_message_at
)
SELECT org.id, messages.contact_name, messages.specialty, messages.message_type, messages.status, messages.unread_count, messages.last_message, messages.contact_message, messages.pharmacy_response, now() - make_interval(mins => messages.minutes_ago)
FROM org
CROSS JOIN messages
WHERE NOT EXISTS (
  SELECT 1 FROM public.pharmacy_messages existing
  WHERE existing.organization_id = org.id
    AND existing.contact_name = messages.contact_name
    AND existing.last_message = messages.last_message
);

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'al-shifa-pharmacy'
),
settings(setting_key, title, description, enabled) AS (
  VALUES
    ('prescription_notifications', 'Prescription Notifications', 'Receive alerts for new ePrescriptions', true),
    ('stock_alert_threshold', 'Stock Alert Threshold', 'Alert when stock falls below reorder level', true),
    ('auto_submit_dha_records', 'Auto-submit DHA Records', 'Automatically submit dispensing records to DHA', true),
    ('nabidh_sync', 'NABIDH Sync', 'Sync dispensing data with NABIDH HIE', true),
    ('insurance_preauth_alerts', 'Insurance Pre-auth Alerts', 'Notify when pre-authorization is needed', false),
    ('expiry_alerts', 'Expiry Alerts', 'Alert 30 days before batch expiry', true)
)
INSERT INTO public.pharmacy_settings (organization_id, setting_key, title, description, enabled)
SELECT org.id, settings.setting_key, settings.title, settings.description, settings.enabled
FROM org
CROSS JOIN settings
ON CONFLICT (organization_id, setting_key) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    enabled = EXCLUDED.enabled,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
)
INSERT INTO public.insurance_payer_profiles (organization_id, display_name, regulator_name, active_members, officer_name, officer_title)
SELECT org.id, 'Daman National Health', 'UAE Insurance Authority', 8247, 'Mariam Al Khateeb', 'Senior Claims Officer'
FROM org
ON CONFLICT (organization_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    regulator_name = EXCLUDED.regulator_name,
    active_members = EXCLUDED.active_members,
    officer_name = EXCLUDED.officer_name,
    officer_title = EXCLUDED.officer_title,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
),
members(external_member_id, patient_name, plan_name, utilization_percent, claim_count, risk_level) AS (
  VALUES
    ('MBR-220184', 'Mariam Al Mansoori', 'Silver Plus', 74, 8, 'medium'),
    ('MBR-220185', 'Hassan Al Zaabi', 'Gold Complete', 91, 14, 'high'),
    ('MBR-220186', 'Noura Khalifa', 'Basic Shield', 38, 2, 'low'),
    ('MBR-220187', 'Omar Al Balushi', 'Family Care Pro', 62, 5, 'medium')
)
INSERT INTO public.insurance_members (organization_id, external_member_id, patient_name, plan_name, utilization_percent, claim_count, risk_level)
SELECT org.id, members.external_member_id, members.patient_name, members.plan_name, members.utilization_percent, members.claim_count, members.risk_level
FROM org
CROSS JOIN members
ON CONFLICT (organization_id, external_member_id) DO UPDATE
SET patient_name = EXCLUDED.patient_name,
    plan_name = EXCLUDED.plan_name,
    utilization_percent = EXCLUDED.utilization_percent,
    claim_count = EXCLUDED.claim_count,
    risk_level = EXCLUDED.risk_level,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
),
preauth(external_ref, patient_name, clinician_name, provider_name, procedure_name, priority, status, requested_amount_aed, minutes_until_due) AS (
  VALUES
    ('PA-20260407-00912', 'Mohammed Ibrahim', 'Dr. Omar Al Hassan', 'City Medical Center', 'Coronary Angioplasty (PCI)', 'urgent', 'overdue', 78000.00, -17),
    ('PA-20260407-00908', 'Layla Hassan', 'Dr. Sara Al Nuaimi', 'Dubai Medical Lab', 'MRI Lumbar Spine', 'high', 'review', 4200.00, 102),
    ('PA-20260407-00897', 'Ahmed Al Zaabi', 'Dr. Khaled Ibrahim', 'Emirates Specialty Hospital', 'Knee Arthroscopy', 'routine', 'review', 24500.00, 720)
)
INSERT INTO public.insurance_pre_authorizations (
  organization_id, external_ref, patient_name, clinician_name, provider_name, procedure_name, priority, status, requested_amount_aed, requested_at, sla_due_at
)
SELECT org.id, preauth.external_ref, preauth.patient_name, preauth.clinician_name, preauth.provider_name, preauth.procedure_name, preauth.priority, preauth.status, preauth.requested_amount_aed, now() - interval '3 hours', now() + make_interval(mins => preauth.minutes_until_due)
FROM org
CROSS JOIN preauth
ON CONFLICT (organization_id, external_ref) DO UPDATE
SET patient_name = EXCLUDED.patient_name,
    clinician_name = EXCLUDED.clinician_name,
    provider_name = EXCLUDED.provider_name,
    procedure_name = EXCLUDED.procedure_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    requested_amount_aed = EXCLUDED.requested_amount_aed,
    requested_at = EXCLUDED.requested_at,
    sla_due_at = EXCLUDED.sla_due_at,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
),
claims(external_ref, patient_name, plan_name, provider_name, amount_aed, status, minutes_ago) AS (
  VALUES
    ('CLM-9001', 'Mariam Al Mansoori', 'Silver Plus', 'City Medical Center', 2450.00, 'under_review', 56),
    ('CLM-9002', 'Hassan Al Zaabi', 'Gold Complete', 'Emirates Specialty Hospital', 15900.00, 'approved', 142),
    ('CLM-9003', 'Noura Khalifa', 'Basic Shield', 'Dubai Medical Lab', 620.00, 'submitted', 24),
    ('CLM-9004', 'Omar Al Balushi', 'Family Care Pro', 'Marina Family Clinic', 3280.00, 'denied', 188),
    ('CLM-9005', 'Mohammed Ibrahim', 'Gold Complete', 'City Medical Center', 78000.00, 'under_review', 16)
)
INSERT INTO public.insurance_claims (organization_id, external_ref, patient_name, plan_name, provider_name, amount_aed, status, submitted_at)
SELECT org.id, claims.external_ref, claims.patient_name, claims.plan_name, claims.provider_name, claims.amount_aed, claims.status, now() - make_interval(mins => claims.minutes_ago)
FROM org
CROSS JOIN claims
ON CONFLICT (organization_id, external_ref) DO UPDATE
SET patient_name = EXCLUDED.patient_name,
    plan_name = EXCLUDED.plan_name,
    provider_name = EXCLUDED.provider_name,
    amount_aed = EXCLUDED.amount_aed,
    status = EXCLUDED.status,
    submitted_at = EXCLUDED.submitted_at,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
),
alerts(external_ref, subject_name, subject_type, reason, score, exposure_amount_aed, severity, status) AS (
  VALUES
    ('FR-9021', 'Dr. Khalid Ibrahim', 'provider', 'Unusual spike in high-value orthopedic claims', 94, 214000.00, 'high', 'open'),
    ('FR-9017', 'City Diagnostics Center', 'provider', 'Repeated duplicate lab panels within 48 hours', 88, 63400.00, 'high', 'investigating'),
    ('FR-9004', 'Marina Family Clinic', 'provider', 'Outlier referral pattern vs network baseline', 71, 32900.00, 'medium', 'open')
)
INSERT INTO public.insurance_fraud_alerts (organization_id, external_ref, subject_name, subject_type, reason, score, exposure_amount_aed, severity, status)
SELECT org.id, alerts.external_ref, alerts.subject_name, alerts.subject_type, alerts.reason, alerts.score, alerts.exposure_amount_aed, alerts.severity, alerts.status
FROM org
CROSS JOIN alerts
ON CONFLICT (organization_id, external_ref) DO UPDATE
SET subject_name = EXCLUDED.subject_name,
    subject_type = EXCLUDED.subject_type,
    reason = EXCLUDED.reason,
    score = EXCLUDED.score,
    exposure_amount_aed = EXCLUDED.exposure_amount_aed,
    severity = EXCLUDED.severity,
    status = EXCLUDED.status,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
),
providers(provider_name, specialty, claims_count, approval_rate_percent, average_cost_aed, performance_flag) AS (
  VALUES
    ('City Medical Center', 'Cardiology', 312, 94, 8900.00, 'SLA compliant'),
    ('Dubai Medical Lab', 'Diagnostics', 486, 97, 620.00, 'Preferred'),
    ('Emirates Specialty Hospital', 'Orthopedics', 141, 89, 12400.00, 'Monitor cost trend'),
    ('Marina Family Clinic', 'Primary Care', 228, 92, 780.00, 'Referral outlier')
)
INSERT INTO public.insurance_network_providers (organization_id, provider_name, specialty, claims_count, approval_rate_percent, average_cost_aed, performance_flag)
SELECT org.id, providers.provider_name, providers.specialty, providers.claims_count, providers.approval_rate_percent, providers.average_cost_aed, providers.performance_flag
FROM org
CROSS JOIN providers
ON CONFLICT (organization_id, provider_name) DO UPDATE
SET specialty = EXCLUDED.specialty,
    claims_count = EXCLUDED.claims_count,
    approval_rate_percent = EXCLUDED.approval_rate_percent,
    average_cost_aed = EXCLUDED.average_cost_aed,
    performance_flag = EXCLUDED.performance_flag,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
),
segments(segment_name, utilization_percent, loss_ratio_percent, forecast_note) AS (
  VALUES
    ('Cardiology', 82, 78, 'PCI pre-auth demand above monthly plan'),
    ('Orthopedics', 76, 81, 'Arthroscopy claims trending high'),
    ('Diagnostics', 61, 63, 'Lab utilization within benchmark'),
    ('Emergency', 48, 57, 'Stable acute episode volume')
)
INSERT INTO public.insurance_risk_segments (organization_id, segment_name, utilization_percent, loss_ratio_percent, forecast_note)
SELECT org.id, segments.segment_name, segments.utilization_percent, segments.loss_ratio_percent, segments.forecast_note
FROM org
CROSS JOIN segments
ON CONFLICT (organization_id, segment_name) DO UPDATE
SET utilization_percent = EXCLUDED.utilization_percent,
    loss_ratio_percent = EXCLUDED.loss_ratio_percent,
    forecast_note = EXCLUDED.forecast_note,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
),
reports(report_name, period_label, status) AS (
  VALUES
    ('DHA monthly claims ledger', 'April 2026', 'ready'),
    ('Pre-authorization SLA report', 'April 2026', 'ready'),
    ('Fraud detection case pack', 'April 2026', 'ready'),
    ('Network provider scorecard', 'April 2026', 'ready')
)
INSERT INTO public.insurance_report_runs (organization_id, report_name, period_label, status)
SELECT org.id, reports.report_name, reports.period_label, reports.status
FROM org
CROSS JOIN reports
ON CONFLICT (organization_id, report_name, period_label) DO UPDATE
SET status = EXCLUDED.status,
    updated_at = now();

WITH org AS (
  SELECT id FROM public.organizations WHERE slug = 'daman-national-health'
),
settings(setting_key, title, description, enabled) AS (
  VALUES
    ('urgent_preauth_sla_alerts', 'Urgent pre-auth SLA alerts', 'Notify claims officers when urgent cases exceed 4 hours', true),
    ('ai_fraud_detection', 'AI fraud detection', 'Run anomaly checks on claims and provider behavior', true),
    ('auto_export_dha_ledger', 'Auto-export DHA ledger', 'Prepare monthly regulatory exports automatically', true),
    ('provider_cost_outlier_alerts', 'Provider cost outlier alerts', 'Flag network providers above benchmark cost', false)
)
INSERT INTO public.insurance_settings (organization_id, setting_key, title, description, enabled)
SELECT org.id, settings.setting_key, settings.title, settings.description, settings.enabled
FROM org
CROSS JOIN settings
ON CONFLICT (organization_id, setting_key) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    enabled = EXCLUDED.enabled,
    updated_at = now();
