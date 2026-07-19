-- Unify doctor/lab/patient imaging around lab_portal_imaging_studies.

ALTER TABLE public.lab_portal_imaging_studies
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lab_order_id uuid REFERENCES public.lab_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lab_order_item_id uuid REFERENCES public.lab_order_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lab_portal_imaging_patient
  ON public.lab_portal_imaging_studies(patient_id, status, released_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_portal_imaging_doctor
  ON public.lab_portal_imaging_studies(doctor_id, status, scheduled_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_portal_imaging_lab_order_item_unique
  ON public.lab_portal_imaging_studies(lab_order_item_id)
  WHERE lab_order_item_id IS NOT NULL;

DROP POLICY IF EXISTS "doctors_read_linked_imaging_studies" ON public.lab_portal_imaging_studies;
CREATE POLICY "doctors_read_linked_imaging_studies"
  ON public.lab_portal_imaging_studies
  FOR SELECT
  TO authenticated
  USING (
    NOT COALESCE(is_deleted, false)
    AND (
      doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.id = lab_portal_imaging_studies.appointment_id
          AND a.doctor_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "patients_read_released_imaging_studies" ON public.lab_portal_imaging_studies;
DROP POLICY IF EXISTS "patients_read_own_imaging_studies" ON public.lab_portal_imaging_studies;
CREATE POLICY "patients_read_own_imaging_studies"
  ON public.lab_portal_imaging_studies
  FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    AND NOT COALESCE(is_deleted, false)
  );

CREATE OR REPLACE FUNCTION public.is_imaging_test_name(p_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_name, '') ~* '(mri|ct|x-?ray|ultrasound|sonography|echo|radiology|scan|doppler)';
$$;

CREATE OR REPLACE FUNCTION public.imaging_modality_from_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_name, '') ~* 'mri' THEN 'MRI'
    WHEN COALESCE(p_name, '') ~* 'ct' THEN 'CT'
    WHEN COALESCE(p_name, '') ~* 'x-?ray|xray' THEN 'X-Ray'
    WHEN COALESCE(p_name, '') ~* 'ultrasound|sonography|sono' THEN 'Ultrasound'
    WHEN COALESCE(p_name, '') ~* 'echo' THEN 'Echo'
    ELSE 'Radiology'
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_lab_order_imaging_studies(p_lab_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  order_row public.lab_orders%ROWTYPE;
  item_row public.lab_order_items%ROWTYPE;
  patient_name text;
  doctor_name text;
BEGIN
  SELECT *
  INTO order_row
  FROM public.lab_orders
  WHERE id = p_lab_order_id
    AND NOT is_deleted;

  IF NOT FOUND OR order_row.assigned_lab_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(up.full_name, 'Patient')
  INTO patient_name
  FROM public.user_profiles up
  WHERE up.user_id = order_row.patient_id;

  SELECT COALESCE(up.full_name, 'Doctor')
  INTO doctor_name
  FROM public.user_profiles up
  WHERE up.user_id = order_row.doctor_id;

  FOR item_row IN
    SELECT *
    FROM public.lab_order_items
    WHERE lab_order_id = p_lab_order_id
      AND public.is_imaging_test_name(test_name)
  LOOP
    INSERT INTO public.lab_portal_imaging_studies (
      lab_id,
      accession,
      patient_id,
      doctor_id,
      appointment_id,
      lab_order_id,
      lab_order_item_id,
      patient_name,
      doctor_name,
      clinic_name,
      modality,
      study_name,
      priority,
      status,
      scheduled_at,
      progress_percent,
      report_status,
      nabidh_status,
      alerts,
      source_label
    )
    VALUES (
      order_row.assigned_lab_id,
      'IMG-' || upper(substr(item_row.id::text, 1, 8)),
      order_row.patient_id,
      order_row.doctor_id,
      order_row.appointment_id,
      order_row.id,
      item_row.id,
      COALESCE(patient_name, 'Patient'),
      COALESCE(doctor_name, 'Doctor'),
      'CeenAiX',
      public.imaging_modality_from_name(item_row.test_name),
      item_row.test_name,
      CASE order_row.urgency WHEN 'stat' THEN 'STAT' WHEN 'urgent' THEN 'Urgent' ELSE 'Routine' END,
      'ordered',
      COALESCE(order_row.due_by, order_row.ordered_at),
      0,
      'Awaiting scheduling',
      'pending',
      ARRAY['Created from doctor imaging/lab order']::text[],
      'CeenAiX lab order'
    )
    ON CONFLICT (lab_order_item_id) WHERE lab_order_item_id IS NOT NULL DO UPDATE
    SET lab_id = EXCLUDED.lab_id,
        patient_id = EXCLUDED.patient_id,
        doctor_id = EXCLUDED.doctor_id,
        appointment_id = EXCLUDED.appointment_id,
        lab_order_id = EXCLUDED.lab_order_id,
        patient_name = EXCLUDED.patient_name,
        doctor_name = EXCLUDED.doctor_name,
        updated_at = now();
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_lab_order_imaging_studies_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'lab_order_items' THEN
    PERFORM public.sync_lab_order_imaging_studies(NEW.lab_order_id);
  ELSE
    PERFORM public.sync_lab_order_imaging_studies(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lab_order_item_imaging_studies ON public.lab_order_items;
CREATE TRIGGER trg_sync_lab_order_item_imaging_studies
  AFTER INSERT OR UPDATE OF test_name, status ON public.lab_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lab_order_imaging_studies_trigger();

DROP TRIGGER IF EXISTS trg_sync_lab_order_imaging_studies ON public.lab_orders;
CREATE TRIGGER trg_sync_lab_order_imaging_studies
  AFTER UPDATE OF assigned_lab_id, urgency, due_by ON public.lab_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lab_order_imaging_studies_trigger();

CREATE OR REPLACE FUNCTION public.lab_set_imaging_study_status(
  p_study_id uuid,
  p_status text,
  p_report_status text DEFAULT NULL,
  p_findings text DEFAULT NULL,
  p_impression text DEFAULT NULL,
  p_recommendations text DEFAULT NULL,
  p_report_checklist jsonb DEFAULT NULL
)
RETURNS public.lab_portal_imaging_studies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  previous_status text;
  updated_row public.lab_portal_imaging_studies%ROWTYPE;
BEGIN
  current_lab := public.require_current_user_lab_id();

  IF p_status NOT IN ('ordered', 'scheduled', 'scanning', 'report_pending', 'reported', 'released') THEN
    RAISE EXCEPTION 'Invalid imaging status.' USING ERRCODE = 'P0001';
  END IF;

  IF p_report_status IS NOT NULL AND p_report_status NOT IN ('draft', 'preliminary', 'final') THEN
    RAISE EXCEPTION 'Invalid radiology report status.' USING ERRCODE = 'P0001';
  END IF;

  SELECT status
  INTO previous_status
  FROM public.lab_portal_imaging_studies
  WHERE id = p_study_id
    AND lab_id = current_lab
    AND NOT is_deleted
  FOR UPDATE;

  IF previous_status IS NULL THEN
    RAISE EXCEPTION 'Study not found or not assigned to your lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_portal_imaging_studies studies
  SET status = p_status,
      report_status = COALESCE(
        p_report_status,
        CASE WHEN p_status = 'released' THEN 'final' ELSE studies.report_status END
      ),
      findings = CASE WHEN p_findings IS NULL THEN studies.findings ELSE NULLIF(btrim(p_findings), '') END,
      impression = CASE WHEN p_impression IS NULL THEN studies.impression ELSE NULLIF(btrim(p_impression), '') END,
      recommendations = CASE
        WHEN p_recommendations IS NULL THEN studies.recommendations
        ELSE NULLIF(btrim(p_recommendations), '')
      END,
      report_checklist = COALESCE(p_report_checklist, studies.report_checklist),
      released_at = CASE WHEN p_status = 'released' THEN COALESCE(studies.released_at, now()) ELSE studies.released_at END,
      updated_at = now()
  WHERE studies.id = p_study_id
    AND studies.lab_id = current_lab
    AND NOT studies.is_deleted
  RETURNING * INTO updated_row;

  IF p_status = 'released' AND previous_status <> 'released' THEN
    IF updated_row.patient_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, action_url)
      VALUES (
        updated_row.patient_id,
        'lab_result',
        'Imaging report released',
        updated_row.study_name || ' is now available in your imaging records.',
        '/patient/imaging'
      );
    END IF;

    IF updated_row.doctor_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, action_url)
      VALUES (
        updated_row.doctor_id,
        'lab_result',
        'Imaging report ready for review',
        updated_row.study_name || ' has been released by radiology.',
        '/doctor/imaging'
      );
    END IF;
  END IF;

  RETURN updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.doctor_review_imaging_study(p_study_id uuid)
RETURNS public.lab_portal_imaging_studies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  updated_row public.lab_portal_imaging_studies%ROWTYPE;
BEGIN
  UPDATE public.lab_portal_imaging_studies
  SET reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_study_id
    AND doctor_id = auth.uid()
    AND status = 'released'
    AND NOT is_deleted
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Released imaging study not found for this doctor.' USING ERRCODE = 'P0001';
  END IF;

  RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_lab_order_imaging_studies(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_lab_order_imaging_studies_trigger() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_imaging_test_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.imaging_modality_from_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.doctor_review_imaging_study(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.doctor_review_imaging_study(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
