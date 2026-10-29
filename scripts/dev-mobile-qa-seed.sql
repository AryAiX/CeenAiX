-- DEV-only clinical rows for the mobile smoke patient.
-- Idempotent. Runs as the database owner via the Management API, so it
-- bypasses RLS. Do not add this file to the production release path.
--
-- Fixed ids (so tests can deep-link):
--   prescription  22222222-3333-4333-8444-000000000911
--   lab order     22222222-3333-4333-8444-000000000921
--   imaging item  22222222-3333-4333-8444-000000000923  (accession IMG-22222222)
--   pharmacy      22222222-3333-4333-8444-000000000951
--   pre-visit     22222222-3333-4333-8444-000000000932  (only if that appointment has none)

DO $$
DECLARE
  v_patient uuid;
  v_doctor uuid;
  v_lab uuid;
  v_appt uuid := '22222222-3333-4333-8444-000000000901';
  v_rx uuid := '22222222-3333-4333-8444-000000000911';
  v_rx_item uuid := '22222222-3333-4333-8444-000000000912';
  v_order uuid := '22222222-3333-4333-8444-000000000921';
  v_lab_item uuid := '22222222-3333-4333-8444-000000000922';
  v_img_item uuid := '22222222-3333-4333-8444-000000000923';
  v_pharmacy uuid := '22222222-3333-4333-8444-000000000951';
  v_template uuid := '22222222-3333-4333-8444-000000000931';
  v_assessment uuid := '22222222-3333-4333-8444-000000000932';
  v_snapshot jsonb;
BEGIN
  SELECT id INTO v_patient
  FROM auth.users
  WHERE lower(email) = 'smoke.patient@ceenaix.test';

  SELECT u.id INTO v_doctor
  FROM auth.users u
  JOIN public.user_profiles p ON p.user_id = u.id
  WHERE p.role = 'doctor'
    AND (
      lower(u.email) = 'smoke.doctor@ceenaix.test'
      OR p.full_name ILIKE '%smoke%doctor%'
      OR p.full_name ILIKE '%smoke doctor%'
    )
  ORDER BY (lower(u.email) = 'smoke.doctor@ceenaix.test') DESC
  LIMIT 1;

  IF v_patient IS NULL OR v_doctor IS NULL THEN
    RAISE EXCEPTION 'mobile QA seed: smoke patient or doctor is missing on this database';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = v_appt AND patient_id = v_patient AND NOT is_deleted
  ) THEN
    v_appt := NULL;
  END IF;

  SELECT id INTO v_lab
  FROM public.lab_profiles
  WHERE is_active
  ORDER BY created_at
  LIMIT 1;

  IF v_lab IS NULL THEN
    INSERT INTO public.lab_profiles (id, slug, name, city, is_active)
    VALUES ('22222222-3333-4333-8444-000000000941', 'qa-mobile-lab', 'QA Mobile Lab', 'Dubai', true)
    ON CONFLICT (slug) DO UPDATE SET is_active = true
    RETURNING id INTO v_lab;
  END IF;

  INSERT INTO public.organizations (id, slug, name, kind, city, country, status)
  VALUES (v_pharmacy, 'qa-mobile-pharmacy', 'QA Al Noor Pharmacy', 'pharmacy', 'Dubai', 'AE', 'active')
  ON CONFLICT (slug) DO UPDATE
    SET status = 'active', kind = 'pharmacy', name = EXCLUDED.name;

  IF NOT EXISTS (SELECT 1 FROM public.prescriptions WHERE id = v_rx) THEN
    INSERT INTO public.prescriptions (
      id, patient_id, doctor_id, appointment_id, status, prescribed_at
    ) VALUES (
      v_rx, v_patient, v_doctor, v_appt, 'active', now() - interval '1 day'
    );
  END IF;

  INSERT INTO public.prescription_items (
    id, prescription_id, medication_name, dosage, frequency, duration, quantity, instructions
  ) VALUES (
    v_rx_item, v_rx, 'Amoxicillin', '500 mg', 'Three times a day', '7 days', 21,
    'Take with food. QA seed for the mobile pharmacy picker.'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.lab_orders WHERE id = v_order) THEN
    INSERT INTO public.lab_orders (
      id, patient_id, doctor_id, appointment_id, status, ordered_at,
      assigned_lab_id, lab_order_code, urgency, results_released_at
    ) VALUES (
      v_order, v_patient, v_doctor, v_appt, 'resulted', now() - interval '2 days',
      v_lab, 'LAB-MOBILE-QA-001', 'routine', now() - interval '1 day'
    );
  END IF;

  -- Patients can read lab_order_items only after the order is released.
  UPDATE public.lab_orders
  SET status = 'resulted',
      results_released_at = COALESCE(results_released_at, now() - interval '1 day')
  WHERE id = v_order;

  INSERT INTO public.lab_order_items (
    id, lab_order_id, test_name, test_code, status, status_category,
    result_value, result_unit, reference_range, is_abnormal, resulted_at
  ) VALUES (
    v_lab_item, v_order, 'HbA1c', '4548-4', 'resulted', 'borderline',
    '6.1', '%', '4.0–5.6 %', true, now() - interval '1 day'
  )
  ON CONFLICT (id) DO UPDATE
  SET status_category = 'borderline',
      is_abnormal = true,
      result_value = EXCLUDED.result_value,
      result_unit = EXCLUDED.result_unit,
      reference_range = EXCLUDED.reference_range;

  INSERT INTO public.lab_order_items (
    id, lab_order_id, test_name, test_code, status, resulted_at
  ) VALUES (
    v_img_item, v_order, 'MRI Brain', '24590-2', 'resulted', now() - interval '1 day'
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.sync_lab_order_imaging_studies(v_order);

  UPDATE public.lab_portal_imaging_studies
  SET status = 'released',
      report_status = 'final',
      findings = 'No acute intracranial abnormality. QA seed for the mobile imaging screen.',
      impression = 'Unremarkable MRI brain.',
      recommendations = 'No follow-up imaging required.',
      released_at = COALESCE(released_at, now()),
      is_deleted = false
  WHERE lab_order_item_id = v_img_item;

  INSERT INTO public.pre_visit_templates (
    id, doctor_user_id, title, description, status, is_active, published_at
  ) VALUES (
    v_template, v_doctor, 'QA mobile intake',
    'Short intake used by the mobile smoke patient.',
    'published', true, now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pre_visit_template_questions (
    template_id, question_key, label, question_type, display_order, is_required, options
  ) VALUES (
    v_template, 'symptom_severity', 'How severe are your symptoms?',
    'single_select', 0, true,
    '[{"value":"mild","label":"Mild"},{"value":"moderate","label":"Moderate"},{"value":"severe","label":"Severe"}]'::jsonb
  )
  ON CONFLICT (template_id, question_key) DO NOTHING;

  v_snapshot := jsonb_build_object(
    'templateId', v_template,
    'title', 'QA mobile intake',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'key', 'symptom_severity',
        'label', 'How severe are your symptoms?',
        'type', 'single_select',
        'required', true,
        'options', jsonb_build_array(
          jsonb_build_object('value', 'mild', 'label', 'Mild'),
          jsonb_build_object('value', 'moderate', 'label', 'Moderate'),
          jsonb_build_object('value', 'severe', 'label', 'Severe')
        )
      )
    )
  );

  IF v_appt IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.appointment_pre_visit_assessments WHERE appointment_id = v_appt
  ) THEN
    INSERT INTO public.appointment_pre_visit_assessments (
      id, appointment_id, patient_id, doctor_id, template_id, template_title,
      template_snapshot, status, due_at
    ) VALUES (
      v_assessment, v_appt, v_patient, v_doctor, v_template, 'QA mobile intake',
      v_snapshot, 'not_started', now() + interval '7 days'
    );
  END IF;

  UPDATE public.patient_document_files
  SET is_deleted = true,
      deleted_at = now()
  WHERE patient_id = v_patient
    AND NOT is_deleted
    AND (
      title ILIKE 'QA %'
      OR original_file_name ILIKE 'QA %'
    );
END $$;
