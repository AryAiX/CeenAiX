-- Forward fixes for doctor→pharmacy connection (PR #58 review).
-- Do not edit already-applied migrations; this file applies on dev/prod via Management API.

-- ---------------------------------------------------------------------------
-- Booking: show doctors without availability slots (discovery)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_bookable_doctors()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  specialty text,
  specialization_ids uuid[],
  city text,
  address text,
  bio text,
  consultation_fee numeric,
  active_availability_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    up.user_id,
    up.full_name,
    dp.specialization AS specialty,
    COALESCE(
      array_agg(DISTINCT ds.specialization_id) FILTER (WHERE ds.specialization_id IS NOT NULL),
      ARRAY[]::uuid[]
    ) AS specialization_ids,
    up.city,
    up.address,
    dp.bio,
    dp.consultation_fee,
    COUNT(DISTINCT da.id) AS active_availability_count
  FROM public.user_profiles up
  JOIN public.doctor_profiles dp
    ON dp.user_id = up.user_id
  LEFT JOIN public.doctor_availability da
    ON da.doctor_id = up.user_id
   AND da.is_active = true
  LEFT JOIN public.doctor_specializations ds
    ON ds.doctor_user_id = up.user_id
  WHERE up.role = 'doctor'
  GROUP BY
    up.user_id,
    up.full_name,
    dp.specialization,
    up.city,
    up.address,
    dp.bio,
    dp.consultation_fee
  ORDER BY lower(up.full_name);
$$;

-- ---------------------------------------------------------------------------
-- Pharmacy ops: staff + facility profile writes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "organization_staff_members_ops_insert" ON public.organization_staff_members;
CREATE POLICY "organization_staff_members_ops_insert"
  ON public.organization_staff_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_ops_org(organization_id));

DROP POLICY IF EXISTS "organization_staff_members_ops_update" ON public.organization_staff_members;
CREATE POLICY "organization_staff_members_ops_update"
  ON public.organization_staff_members
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_ops_org(organization_id))
  WITH CHECK (public.is_current_user_ops_org(organization_id));

DROP POLICY IF EXISTS "organization_staff_members_ops_delete" ON public.organization_staff_members;
CREATE POLICY "organization_staff_members_ops_delete"
  ON public.organization_staff_members
  FOR DELETE
  TO authenticated
  USING (public.is_current_user_ops_org(organization_id));

DROP POLICY IF EXISTS "pharmacy_facility_profiles_ops_update" ON public.pharmacy_facility_profiles;
CREATE POLICY "pharmacy_facility_profiles_ops_update"
  ON public.pharmacy_facility_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_ops_org(organization_id, 'pharmacy'::text))
  WITH CHECK (public.is_current_user_ops_org(organization_id, 'pharmacy'::text));

-- ---------------------------------------------------------------------------
-- Dispensing tasks: pharmacy can update workflow; patients can read own queue
-- ---------------------------------------------------------------------------
ALTER TABLE public.pharmacy_dispensing_tasks
  ADD COLUMN IF NOT EXISTS hold_reason_code text,
  ADD COLUMN IF NOT EXISTS hold_note text;

DROP POLICY IF EXISTS "pharmacy_dispensing_tasks_ops_update" ON public.pharmacy_dispensing_tasks;
CREATE POLICY "pharmacy_dispensing_tasks_ops_update"
  ON public.pharmacy_dispensing_tasks
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_ops_org(organization_id, 'pharmacy'))
  WITH CHECK (public.is_current_user_ops_org(organization_id, 'pharmacy'));

DROP POLICY IF EXISTS "patients_read_own_dispensing_tasks" ON public.pharmacy_dispensing_tasks;
CREATE POLICY "patients_read_own_dispensing_tasks"
  ON public.pharmacy_dispensing_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.prescriptions p
      WHERE p.id = pharmacy_dispensing_tasks.prescription_id
        AND p.patient_id = auth.uid()
        AND NOT p.is_deleted
    )
  );

-- ---------------------------------------------------------------------------
-- Patient assigns prescription to pharmacy (narrow write path)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "patients_update_pharmacy_org" ON public.prescriptions;

CREATE OR REPLACE FUNCTION public.assign_prescription_pharmacy(
  p_prescription_id uuid,
  p_pharmacy_organization_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rx public.prescriptions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
    INTO v_rx
    FROM public.prescriptions
   WHERE id = p_prescription_id
     AND patient_id = auth.uid()
     AND NOT is_deleted
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found';
  END IF;

  IF v_rx.pharmacy_organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pharmacy already assigned for this prescription';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = p_pharmacy_organization_id
      AND o.kind = 'pharmacy'
      AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive pharmacy';
  END IF;

  UPDATE public.prescriptions
  SET pharmacy_organization_id = p_pharmacy_organization_id,
      updated_at = now()
  WHERE id = p_prescription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_prescription_pharmacy(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_prescription_pharmacy(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_active_pharmacies()
RETURNS TABLE (
  id uuid,
  name text,
  city text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.city
  FROM public.organizations o
  WHERE o.kind = 'pharmacy'
    AND o.status = 'active'
  ORDER BY lower(o.name);
$$;

REVOKE ALL ON FUNCTION public.list_active_pharmacies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_pharmacies() TO authenticated;

-- Fix dispensing-task trigger insurance lookup (canonical patient_insurance + insurance_plans)
CREATE OR REPLACE FUNCTION public.fn_create_pharmacy_dispensing_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_name  text;
  v_doctor_name   text;
  v_item          record;
  v_external_ref  text;
  v_insurance     text;
BEGIN
  IF OLD.pharmacy_organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.pharmacy_organization_id IS NULL OR NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = NEW.pharmacy_organization_id
      AND o.kind = 'pharmacy'
      AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid pharmacy organization for dispensing tasks';
  END IF;

  SELECT COALESCE(up.full_name, 'Unknown Patient')
    INTO v_patient_name
    FROM public.user_profiles up
   WHERE up.user_id = NEW.patient_id
   LIMIT 1;

  SELECT COALESCE(up.full_name, 'Unknown Doctor')
    INTO v_doctor_name
    FROM public.user_profiles up
   WHERE up.user_id = NEW.doctor_id
   LIMIT 1;

  SELECT COALESCE(ip.provider_company, 'Cash')
    INTO v_insurance
    FROM public.patient_insurance pi
    JOIN public.insurance_plans ip ON ip.id = pi.insurance_plan_id
   WHERE pi.patient_id = NEW.patient_id
     AND pi.is_primary = true
     AND (pi.valid_until IS NULL OR pi.valid_until >= CURRENT_DATE)
   ORDER BY pi.created_at DESC
   LIMIT 1;

  v_insurance := COALESCE(v_insurance, 'Cash');

  FOR v_item IN
    SELECT *
      FROM public.prescription_items
     WHERE prescription_id = NEW.id
  LOOP
    v_external_ref := 'rx-' || NEW.id || '-item-' || v_item.id;

    INSERT INTO public.pharmacy_dispensing_tasks (
      organization_id,
      prescription_id,
      prescription_item_id,
      external_ref,
      patient_name,
      prescriber_name,
      medication_name,
      quantity,
      priority,
      workflow_status,
      received_at,
      insurance_provider,
      copay_aed,
      allergy_flag
    )
    VALUES (
      NEW.pharmacy_organization_id,
      NEW.id,
      v_item.id,
      v_external_ref,
      v_patient_name,
      v_doctor_name,
      v_item.medication_name,
      v_item.quantity,
      'routine',
      'new',
      now(),
      v_insurance,
      0,
      false
    )
    ON CONFLICT (organization_id, external_ref) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_pharmacy_dispensing_tasks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_pharmacy_dispensing_tasks() TO authenticated;

-- Notify patient when all line items for a prescription are dispensed
CREATE OR REPLACE FUNCTION public.fn_notify_patient_prescription_dispensed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_pharmacy_name text;
  v_pending integer;
  v_meds text;
BEGIN
  IF NEW.workflow_status <> 'dispensed'
     OR (OLD.workflow_status IS NOT DISTINCT FROM 'dispensed') THEN
    RETURN NEW;
  END IF;

  IF NEW.prescription_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.patient_id
    INTO v_patient_id
    FROM public.prescriptions p
   WHERE p.id = NEW.prescription_id
     AND NOT p.is_deleted
   LIMIT 1;

  IF v_patient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer
    INTO v_pending
    FROM public.pharmacy_dispensing_tasks t
   WHERE t.prescription_id = NEW.prescription_id
     AND t.workflow_status <> 'dispensed';

  IF v_pending > 0 THEN
    RETURN NEW;
  END IF;

  SELECT o.name
    INTO v_pharmacy_name
    FROM public.organizations o
   WHERE o.id = NEW.organization_id
   LIMIT 1;

  SELECT string_agg(DISTINCT t.medication_name, ', ' ORDER BY t.medication_name)
    INTO v_meds
    FROM public.pharmacy_dispensing_tasks t
   WHERE t.prescription_id = NEW.prescription_id;

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    v_patient_id,
    'medication',
    'Your medication is ready for pickup',
    COALESCE(v_meds, 'Your prescription') || ' is ready at '
      || COALESCE(v_pharmacy_name, 'your pharmacy') || '. Please visit to collect.',
    '/patient/prescriptions'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_patient_prescription_dispensed ON public.pharmacy_dispensing_tasks;
CREATE TRIGGER trg_notify_patient_prescription_dispensed
  AFTER UPDATE OF workflow_status
  ON public.pharmacy_dispensing_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_patient_prescription_dispensed();
