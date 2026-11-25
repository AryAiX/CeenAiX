-- QA-263: any signed-in user could write a notification into anyone's inbox.
--
-- Dev and production have two INSERT rules on public.notifications that are in no migration file:
--   * "authenticated_can_insert_notifications"  WITH CHECK (true)
--   * "pharmacy_insert_notifications"           WITH CHECK (true)
-- One rule that allows an insert is enough, so any signed-in user could add a notification with any
-- type, title, text and link for any user. This also undid QA-222 (20261124000004).
--
-- The app relied on them in three places, which wrote a notification for the patient directly:
--   * the doctor's Create Prescription page ("New prescription issued");
--   * the doctor's Create Lab Order page ("New lab order created");
--   * the pharmacy's "put on hold" ("Prescription On Hold").
-- Those now call the three database functions below (SECURITY DEFINER). Each one checks who is asking
-- and writes a fixed text built from the database, never text sent by the caller:
--   * notify_patient_prescription_issued(prescription)  - only the prescription's own doctor;
--                                                          once per prescription.
--   * notify_patient_lab_order_created(lab order)        - only the lab order's own doctor;
--                                                          once per lab order.
--   * notify_patient_prescription_on_hold(task ids)      - only a member of the pharmacy holding the
--                                                          tasks; all tasks of one prescription and on
--                                                          hold; at most one identical notification
--                                                          per 2 minutes.
-- Then the two open rules are narrowed to "your own notifications only" with ALTER POLICY (no DROP;
-- the names stay). They only exist where someone added them by hand, so this step is skipped where
-- they are missing. Patients telling clinic staff about bookings ("notifications_insert_related_
-- clinic_events", QA-222) and the database's own notification triggers are not affected.
-- Texts are English, like every notification the database writes today.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Doctor -> patient: new prescription
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_patient_prescription_issued(p_prescription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_patient_id uuid;
  v_created_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;

  SELECT p.patient_id, p.created_at
  INTO v_patient_id, v_created_at
  FROM public.prescriptions p
  WHERE p.id = p_prescription_id
    AND p.doctor_id = auth.uid()
    AND NOT p.is_deleted;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'Prescription not found.' USING ERRCODE = '42501';
  END IF;

  -- Once per prescription: calling again does not add a second notification.
  IF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = v_patient_id
      AND n.title = 'New prescription issued'
      AND n.action_url = '/patient/prescriptions'
      AND n.created_at >= v_created_at
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    v_patient_id,
    'medication',
    'New prescription issued',
    'Your doctor added a new medication plan to your account.',
    '/patient/prescriptions'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notify_patient_prescription_issued(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_patient_prescription_issued(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.notify_patient_prescription_issued(uuid) TO authenticated;

COMMENT ON FUNCTION public.notify_patient_prescription_issued(uuid) IS
  'QA-263: the prescription''s own doctor tells the patient about a new prescription (once per prescription).';

-- ---------------------------------------------------------------------------
-- 2. Doctor -> patient: new lab order
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_patient_lab_order_created(p_lab_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_patient_id uuid;
  v_created_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;

  SELECT lo.patient_id, lo.created_at
  INTO v_patient_id, v_created_at
  FROM public.lab_orders lo
  WHERE lo.id = p_lab_order_id
    AND lo.doctor_id = auth.uid()
    AND NOT lo.is_deleted;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'Lab order not found.' USING ERRCODE = '42501';
  END IF;

  -- Once per lab order.
  IF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = v_patient_id
      AND n.title = 'New lab order created'
      AND n.action_url = '/patient/lab-results'
      AND n.created_at >= v_created_at
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (
    v_patient_id,
    'system',
    'New lab order created',
    'Your doctor added a new lab order to your care plan.',
    '/patient/lab-results'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notify_patient_lab_order_created(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_patient_lab_order_created(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.notify_patient_lab_order_created(uuid) TO authenticated;

COMMENT ON FUNCTION public.notify_patient_lab_order_created(uuid) IS
  'QA-263: the lab order''s own doctor tells the patient about a new lab order (once per lab order).';

-- ---------------------------------------------------------------------------
-- 3. Pharmacy -> patient: prescription on hold
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_patient_prescription_on_hold(p_task_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_task_count integer;
  v_found integer;
  v_prescription_count integer;
  v_prescription_id uuid;
  v_organization_count integer;
  v_organization_id uuid;
  v_reason_code text;
  v_meds text;
  v_patient_id uuid;
  v_reason text;
  v_title constant text := 'Prescription On Hold';
  v_body text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;

  SELECT count(DISTINCT x) INTO v_task_count FROM unnest(p_task_ids) AS x WHERE x IS NOT NULL;
  IF v_task_count IS NULL OR v_task_count = 0 OR v_task_count > 50 THEN
    RAISE EXCEPTION 'Choose the medicines of one prescription.' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*),
    count(DISTINCT t.prescription_id),
    min(t.prescription_id::text)::uuid,
    count(DISTINCT t.organization_id),
    min(t.organization_id::text)::uuid,
    min(t.hold_reason_code),
    left(string_agg(DISTINCT t.medication_name, ', ' ORDER BY t.medication_name), 300)
  INTO v_found, v_prescription_count, v_prescription_id, v_organization_count, v_organization_id,
       v_reason_code, v_meds
  FROM public.pharmacy_dispensing_tasks t
  WHERE t.id = ANY (p_task_ids)
    AND t.workflow_status = 'on_hold'
    AND t.prescription_id IS NOT NULL;

  -- Every task must exist, be on hold, belong to one prescription and one pharmacy, and the caller
  -- must be a member of that pharmacy.
  IF v_found <> v_task_count
     OR v_prescription_count <> 1
     OR v_organization_count <> 1
     OR NOT public.is_current_user_ops_org(v_organization_id, 'pharmacy')
  THEN
    RAISE EXCEPTION 'Prescription not found.' USING ERRCODE = '42501';
  END IF;

  SELECT p.patient_id
  INTO v_patient_id
  FROM public.prescriptions p
  WHERE p.id = v_prescription_id
    AND NOT p.is_deleted;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'Prescription not found.' USING ERRCODE = '42501';
  END IF;

  v_reason := CASE v_reason_code
    WHEN 'out_of_stock' THEN 'Out of Stock'
    WHEN 'insurance_issue' THEN 'Insurance Issue'
    WHEN 'allergy_concern' THEN 'Allergy Concern'
    WHEN 'doctor_clarification' THEN 'Doctor Clarification Needed'
    WHEN 'substitution_required' THEN 'Substitution Required'
    WHEN 'incomplete_prescription' THEN 'Incomplete Prescription'
    WHEN 'patient_not_reachable' THEN 'Patient Not Reachable'
    ELSE 'Other'
  END;

  v_body := 'Your prescription for ' || coalesce(v_meds, 'your medicines') || ' is on hold: '
    || v_reason || '. Tap to message the pharmacy.';

  -- No repeats: the same notification at most once every 2 minutes.
  IF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = v_patient_id
      AND n.title = v_title
      AND n.body = v_body
      AND n.created_at > now() - interval '2 minutes'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, action_url)
  VALUES (v_patient_id, 'medication', v_title, v_body, '/patient/messages');
END;
$$;

REVOKE ALL ON FUNCTION public.notify_patient_prescription_on_hold(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_patient_prescription_on_hold(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.notify_patient_prescription_on_hold(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.notify_patient_prescription_on_hold(uuid[]) IS
  'QA-263: a member of the pharmacy tells the patient that the medicines of one prescription are on hold. Text is built from the tasks; same notification at most once per 2 minutes.';

-- ---------------------------------------------------------------------------
-- 4. Close the two open insert rules (only where they exist)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
      AND policyname = 'authenticated_can_insert_notifications'
  ) THEN
    EXECUTE 'ALTER POLICY "authenticated_can_insert_notifications" ON public.notifications '
      || 'WITH CHECK (user_id = auth.uid())';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
      AND policyname = 'pharmacy_insert_notifications'
  ) THEN
    EXECUTE 'ALTER POLICY "pharmacy_insert_notifications" ON public.notifications '
      || 'WITH CHECK (user_id = auth.uid())';
  END IF;
END;
$$;
