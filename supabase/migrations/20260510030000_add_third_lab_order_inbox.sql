-- Add a third "New" lab order so the Lab Orders > New (3) tab matches hosted.
-- Hosted shows: Aisha Mohammed (Urgent), Ibrahim Al Marzouqi (STAT), Noura Al Hashimi (Routine).
-- We already have Aisha as 'ordered'; add Ibrahim & Noura as separate new inbound orders.
-- The existing critical-value Ibrahim record (LAB-20260407-002847) stays in 'resulted' state.

DO $$
DECLARE
  demo_lab_id uuid;
  patient_user_id uuid;
  doctor_user_id uuid;
BEGIN
  SELECT id INTO demo_lab_id FROM public.lab_profiles WHERE slug = 'dubai-medical-imaging-centre';
  SELECT user_id INTO patient_user_id FROM public.user_profiles WHERE role = 'patient' LIMIT 1;
  SELECT user_id INTO doctor_user_id FROM public.user_profiles WHERE role = 'doctor' LIMIT 1;

  IF demo_lab_id IS NULL OR patient_user_id IS NULL OR doctor_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Inbound STAT order: Ibrahim Al Marzouqi (separate from the resulted critical record)
  IF NOT EXISTS (SELECT 1 FROM public.lab_orders WHERE lab_order_code = 'LAB-20260407-004001') THEN
    INSERT INTO public.lab_orders (
      id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
      insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
      clinical_notes, specimen_summary, fasting_instructions, preauth_status,
      technician_name, technician_initials, source_label,
      patient_display_name, patient_age, patient_gender,
      due_by, total_cost_aed
    )
    VALUES (
      gen_random_uuid(), patient_user_id, doctor_user_id, 'ordered', now() - interval '15 minutes',
      demo_lab_id, 'LAB-20260407-004001', 'stat',
      'Oman Insurance', 'O+', 'DHA-PRAC-2019-031042', 'General Medicine', 'Al Zahra Clinic',
      'Acute chest pain. Rule out MI. Repeat troponin if first negative.',
      'SST × 1 · Citrate × 1 · EDTA × 1', 'Not required', 'Not required',
      NULL, 'U', 'CeenAiX ePrescription',
      'Ibrahim Al Marzouqi', 55, 'male',
      now() + interval '1 hour', 380
    );
  END IF;

  -- Inbound Routine order: Noura Al Hashimi
  IF NOT EXISTS (SELECT 1 FROM public.lab_orders WHERE lab_order_code = 'LAB-20260407-004002') THEN
    INSERT INTO public.lab_orders (
      id, patient_id, doctor_id, status, ordered_at, assigned_lab_id, lab_order_code, urgency,
      insurance_plan, blood_type, doctor_dha_license, doctor_specialty, clinic_name,
      clinical_notes, specimen_summary, fasting_instructions, preauth_status,
      technician_name, technician_initials, source_label,
      patient_display_name, patient_age, patient_gender,
      due_by, total_cost_aed
    )
    VALUES (
      gen_random_uuid(), patient_user_id, doctor_user_id, 'ordered', now() - interval '25 minutes',
      demo_lab_id, 'LAB-20260407-004002', 'routine',
      'Daman Enhanced', 'B+', 'DHA-PRAC-2020-029481', 'Endocrinologist', 'City Hospital Dubai',
      'Routine diabetic check. Monitor HbA1c trend and lipid profile.',
      'EDTA × 1 · Fluoride oxalate × 1 · SST × 1', '10–12 hours', 'Covered by Daman Enhanced',
      NULL, 'U', 'Walk-in',
      'Noura Al Hashimi', 47, 'female',
      now() + interval '4 hours', 360
    );
  END IF;
END $$;

-- Lab order items for the new orders
INSERT INTO public.lab_order_items (lab_order_id, test_name, status, status_category, sort_order, loinc_code, specimen_type, target_tat, reference_text)
SELECT lo.id, t.test_name, 'ordered'::lab_order_status, 'pending', t.sort_order, t.loinc, t.specimen, t.tat, t.ref
FROM public.lab_orders lo
CROSS JOIN (VALUES
  ('Troponin I (High Sensitivity)', 1, '89579-7', 'Serum', '1h', '0–14 ng/L'),
  ('D-Dimer', 2, '48065-7', 'Plasma', '1h', '<500 ng/mL'),
  ('CBC with differential', 3, '58410-2', 'EDTA', '1h', NULL)
) AS t(test_name, sort_order, loinc, specimen, tat, ref)
WHERE lo.lab_order_code = 'LAB-20260407-004001';

INSERT INTO public.lab_order_items (lab_order_id, test_name, status, status_category, sort_order, loinc_code, specimen_type, target_tat, reference_text)
SELECT lo.id, t.test_name, 'ordered'::lab_order_status, 'pending', t.sort_order, t.loinc, t.specimen, t.tat, t.ref
FROM public.lab_orders lo
CROSS JOIN (VALUES
  ('HbA1c', 1, '41995-2', 'EDTA', '4h', '< 7.0%'),
  ('Fasting Blood Sugar', 2, '1558-6', 'Fluoride', '4h', '4.0–6.0 mmol/L'),
  ('Lipid Panel', 3, '57698-3', 'Serum', '4h', NULL)
) AS t(test_name, sort_order, loinc, specimen, tat, ref)
WHERE lo.lab_order_code = 'LAB-20260407-004002';

-- Hide the orphan demo order (no patient_display_name, no insurance, predates the redesign)
UPDATE public.lab_orders SET is_deleted = true
WHERE lab_order_code = 'LAB-20260304-0921' AND patient_display_name IS NULL;
