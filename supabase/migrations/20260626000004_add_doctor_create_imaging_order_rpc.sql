CREATE OR REPLACE FUNCTION public.doctor_create_imaging_order(
  p_patient_id uuid,
  p_appointment_id uuid DEFAULT NULL,
  p_modality text DEFAULT 'Radiology',
  p_study_name text DEFAULT 'Imaging Study',
  p_priority text DEFAULT 'Routine',
  p_clinical_indication text DEFAULT NULL,
  p_contrast text DEFAULT NULL,
  p_prep_instructions text DEFAULT NULL,
  p_icd10_code text DEFAULT NULL,
  p_icd10_description text DEFAULT NULL,
  p_scheduled_at timestamp with time zone DEFAULT NULL,
  p_clinic_name text DEFAULT NULL
)
RETURNS lab_portal_imaging_studies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  doctor_row public.user_profiles%ROWTYPE;
  patient_row public.user_profiles%ROWTYPE;
  target_lab_id uuid;
  new_accession text;
  preauth text;
  new_study public.lab_portal_imaging_studies%ROWTYPE;
BEGIN
  -- Get doctor profile
  SELECT * INTO doctor_row
  FROM public.user_profiles
  WHERE user_id = auth.uid();

  IF doctor_row.user_id IS NULL THEN
    RAISE EXCEPTION 'Doctor profile not found.' USING ERRCODE = 'P0001';
  END IF;

  -- Get patient profile
  SELECT * INTO patient_row
  FROM public.user_profiles
  WHERE user_id = p_patient_id;

  IF patient_row.user_id IS NULL THEN
    RAISE EXCEPTION 'Patient not found.' USING ERRCODE = 'P0001';
  END IF;

  -- Find the primary lab (dubai-medical-imaging-centre)
  SELECT id INTO target_lab_id
  FROM public.lab_profiles
  WHERE slug = 'dubai-medical-imaging-centre'
  LIMIT 1;

  IF target_lab_id IS NULL THEN
    SELECT id INTO target_lab_id
    FROM public.lab_profiles
    LIMIT 1;
  END IF;

  IF target_lab_id IS NULL THEN
    RAISE EXCEPTION 'No lab facility found.' USING ERRCODE = 'P0001';
  END IF;

  -- Generate accession number
  new_accession := 'RAD-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));

  -- Auto-set pre-auth status based on modality
  preauth := CASE
    WHEN UPPER(p_modality) IN ('MRI', 'CT', 'PET-CT', 'PET') THEN 'Pre-auth required'
    ELSE 'Not required'
  END;

  -- Insert the imaging study
  INSERT INTO public.lab_portal_imaging_studies (
    lab_id,
    accession,
    patient_name,
    patient_age,
    patient_gender,
    doctor_name,
    clinic_name,
    modality,
    study_name,
    priority,
    status,
    scheduled_at,
    clinical_indication,
    contrast,
    prep_instructions,
    icd10_code,
    icd10_description,
    preauth_status,
    source_label,
    nabidh_status,
    progress_percent,
    alerts,
    is_deleted
  ) VALUES (
    target_lab_id,
    new_accession,
    COALESCE(patient_row.full_name, 'Unknown Patient'),
    CASE
      WHEN patient_row.date_of_birth IS NOT NULL
      THEN DATE_PART('year', AGE(patient_row.date_of_birth))::integer
      ELSE NULL
    END,
    patient_row.gender,
    COALESCE(doctor_row.full_name, 'Unknown Doctor'),
    COALESCE(p_clinic_name, 'CeenAiX Clinic'),
    p_modality,
    p_study_name,
    p_priority,
    'ordered',
    p_scheduled_at,
    p_clinical_indication,
    p_contrast,
    p_prep_instructions,
    p_icd10_code,
    p_icd10_description,
    preauth,
    'CeenAiX ePrescription',
    'pending',
    0,
    ARRAY[]::text[],
    false
  )
  RETURNING * INTO new_study;

  RETURN new_study;
END;
$$;