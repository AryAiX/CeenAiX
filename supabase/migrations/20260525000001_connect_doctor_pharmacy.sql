-- Doctor → Pharmacy connection: column + dispensing-task trigger.
-- Patient assignment uses assign_prescription_pharmacy() (see 20260528120000).

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS pharmacy_organization_id uuid
    REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prescriptions_pharmacy_org
  ON public.prescriptions(pharmacy_organization_id)
  WHERE pharmacy_organization_id IS NOT NULL;

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

DROP TRIGGER IF EXISTS trg_create_pharmacy_dispensing_tasks ON public.prescriptions;

CREATE TRIGGER trg_create_pharmacy_dispensing_tasks
  AFTER UPDATE OF pharmacy_organization_id
  ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_pharmacy_dispensing_tasks();
