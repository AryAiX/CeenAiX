-- Adds 2 additional lab_orders with status='ordered' so the Lab Orders "New" tab
-- in the lab portal lands at 3 inbox cards (Ibrahim Al Marzouqi + 2 new).
-- Also hides orphan demo order `LAB-20260304-0921` which had no matching lab items.
-- Idempotent via NOT EXISTS check on lab_order_code.

DO $$
DECLARE
  demo_lab_id uuid;
  patient_user_id uuid;
  doctor_user_id uuid;
BEGIN
  SELECT id INTO demo_lab_id
  FROM public.lab_profiles
  WHERE slug = 'dubai-medical-imaging-centre'
  LIMIT 1;

  IF demo_lab_id IS NULL THEN
    RAISE NOTICE 'demo lab not found; skipping inbox seed';
    RETURN;
  END IF;

  SELECT patient_id, doctor_id INTO patient_user_id, doctor_user_id
  FROM public.lab_orders
  WHERE assigned_lab_id = demo_lab_id
  ORDER BY ordered_at DESC
  LIMIT 1;

  IF patient_user_id IS NULL OR doctor_user_id IS NULL THEN
    RAISE NOTICE 'no source patient/doctor on demo lab orders; skipping';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lab_orders WHERE lab_order_code = 'LAB-20260510-INBOX-02') THEN
    INSERT INTO public.lab_orders (
      id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
      insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
      clinical_notes, specimen_summary, fasting_instructions, preauth_status,
      technician_name, technician_initials, source_label,
      patient_display_name, patient_age, patient_gender,
      sample_collection_at, due_by, total_cost_aed
    ) VALUES (
      gen_random_uuid(), patient_user_id, doctor_user_id, 'ordered', now() - interval '4 minutes',
      demo_lab_id, 'LAB-20260510-INBOX-02', 'urgent',
      'Thiqa', 'A+', 'DHA-PRAC-2017-031044', 'Endocrinologist', 'Cleveland Clinic Abu Dhabi',
      'Diabetic surveillance — HbA1c trend + lipid panel.',
      'EDTA × 1 · SST × 1', '10–12 hours', 'Not required',
      NULL, 'U', 'CeenAiX ePrescription',
      'Ibrahim Al Marzouqi', 55, 'male',
      NULL, now() + interval '4 hours', 320
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lab_orders WHERE lab_order_code = 'LAB-20260510-INBOX-03') THEN
    INSERT INTO public.lab_orders (
      id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
      insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
      clinical_notes, specimen_summary, fasting_instructions, preauth_status,
      technician_name, technician_initials, source_label,
      patient_display_name, patient_age, patient_gender,
      sample_collection_at, due_by, total_cost_aed
    ) VALUES (
      gen_random_uuid(), patient_user_id, doctor_user_id, 'ordered', now() - interval '8 minutes',
      demo_lab_id, 'LAB-20260510-INBOX-03', 'routine',
      'Daman Enhanced', 'B-', 'DHA-PRAC-2020-029481', 'Internal Medicine', 'Saudi German Hospital',
      'Annual physical workup.',
      'EDTA × 1 · SST × 1 · Urine × 1', '12 hours', 'Not required',
      NULL, 'U', 'CeenAiX ePrescription',
      'Noura Al Hashimi', 47, 'female',
      NULL, now() + interval '6 hours', 260
    );
  END IF;

  -- Hide orphan order with no items, so the inbox count matches hosted (3).
  UPDATE public.lab_orders
  SET is_deleted = true
  WHERE lab_order_code = 'LAB-20260304-0921'
    AND NOT EXISTS (
      SELECT 1 FROM public.lab_order_items WHERE lab_order_id = public.lab_orders.id
    );
END;
$$ LANGUAGE plpgsql;
