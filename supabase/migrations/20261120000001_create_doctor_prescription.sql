-- QA-136: saving a new prescription could leave an empty prescription behind.
--
-- The New Prescription page saved in two separate requests: first the
-- prescriptions row, then its prescription_items. If the second request failed
-- (connection drop, a rejected item), the first was already saved, so the
-- patient was left with an "active" prescription that has no medicines.
--
-- This function saves the prescription and all of its items in one
-- transaction: either everything is saved or nothing is.
--
-- It runs as the calling doctor (SECURITY INVOKER), so the existing table
-- rules decide what is allowed, exactly as with the direct inserts it
-- replaces. It adds no new permissions.

CREATE OR REPLACE FUNCTION public.create_doctor_prescription(
  p_patient_id uuid,
  p_appointment_id uuid,
  p_status public.prescription_status,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_doctor_id uuid := auth.uid();
  v_prescription_id uuid;
BEGIN
  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  IF p_patient_id IS NULL THEN
    RAISE EXCEPTION 'A patient is required' USING ERRCODE = '22023';
  END IF;

  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one medication is required' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    WHERE btrim(coalesce(item ->> 'medication_name', '')) = ''
  ) THEN
    RAISE EXCEPTION 'Every medication needs a name' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.prescriptions (patient_id, doctor_id, appointment_id, status)
  VALUES (p_patient_id, v_doctor_id, p_appointment_id, coalesce(p_status, 'active'))
  RETURNING id INTO v_prescription_id;

  INSERT INTO public.prescription_items (
    prescription_id,
    medication_catalog_id,
    medication_catalog_suggestion_id,
    medication_name,
    medication_name_ar,
    dosage,
    frequency_code,
    duration_code,
    frequency,
    duration,
    quantity,
    instructions,
    is_dispensed
  )
  SELECT
    v_prescription_id,
    item.medication_catalog_id,
    item.medication_catalog_suggestion_id,
    btrim(item.medication_name),
    item.medication_name_ar,
    item.dosage,
    item.frequency_code,
    item.duration_code,
    item.frequency,
    item.duration,
    item.quantity,
    item.instructions,
    false
  FROM jsonb_to_recordset(p_items) AS item(
    medication_catalog_id uuid,
    medication_catalog_suggestion_id uuid,
    medication_name text,
    medication_name_ar text,
    dosage text,
    frequency_code text,
    duration_code text,
    frequency text,
    duration text,
    quantity integer,
    instructions text
  );

  RETURN v_prescription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_doctor_prescription(uuid, uuid, public.prescription_status, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_doctor_prescription(uuid, uuid, public.prescription_status, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_doctor_prescription(uuid, uuid, public.prescription_status, jsonb) TO authenticated;

COMMENT ON FUNCTION public.create_doctor_prescription(uuid, uuid, public.prescription_status, jsonb) IS
  'QA-136: saves a prescription and all its items in one transaction (all or nothing). Runs as the calling doctor; existing table rules apply.';
