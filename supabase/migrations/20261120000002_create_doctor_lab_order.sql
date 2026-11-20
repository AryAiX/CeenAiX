-- QA-143: saving a new lab order could leave an empty lab order behind.
--
-- The New Lab Order page saved in two separate requests: first the lab_orders
-- row, then its lab_order_items. If the second request failed, the first was
-- already saved, so the patient was left with an "ordered" lab order that has
-- no tests (same problem as prescriptions, QA-136).
--
-- This function saves the lab order and all of its tests in one transaction:
-- either everything is saved or nothing is. The existing insert trigger on
-- lab_order_items (imaging study sync) still runs, inside the same transaction.
--
-- It runs as the calling doctor (SECURITY INVOKER), so the existing table
-- rules decide what is allowed, exactly as with the direct inserts it
-- replaces. It adds no new permissions.

CREATE OR REPLACE FUNCTION public.create_doctor_lab_order(
  p_patient_id uuid,
  p_appointment_id uuid,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_doctor_id uuid := auth.uid();
  v_lab_order_id uuid;
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
    RAISE EXCEPTION 'At least one test is required' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    WHERE btrim(coalesce(item ->> 'test_name', '')) = ''
  ) THEN
    RAISE EXCEPTION 'Every test needs a name' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.lab_orders (patient_id, doctor_id, appointment_id, status)
  VALUES (p_patient_id, v_doctor_id, p_appointment_id, 'ordered')
  RETURNING id INTO v_lab_order_id;

  INSERT INTO public.lab_order_items (
    lab_order_id,
    lab_test_catalog_id,
    lab_test_catalog_suggestion_id,
    test_name,
    test_code,
    loinc_code,
    specimen_type,
    status
  )
  SELECT
    v_lab_order_id,
    item.lab_test_catalog_id,
    item.lab_test_catalog_suggestion_id,
    btrim(item.test_name),
    nullif(btrim(item.test_code), ''),
    nullif(btrim(item.loinc_code), ''),
    nullif(btrim(item.specimen_type), ''),
    'ordered'
  FROM jsonb_to_recordset(p_items) AS item(
    lab_test_catalog_id uuid,
    lab_test_catalog_suggestion_id uuid,
    test_name text,
    test_code text,
    loinc_code text,
    specimen_type text
  );

  RETURN v_lab_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_doctor_lab_order(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_doctor_lab_order(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_doctor_lab_order(uuid, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.create_doctor_lab_order(uuid, uuid, jsonb) IS
  'QA-143: saves a lab order and all its tests in one transaction (all or nothing). Runs as the calling doctor; existing table rules apply.';
