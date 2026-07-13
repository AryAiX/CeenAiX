-- Harden lab QC + equipment maintenance RPCs from PR #88 (selective, production-safe).
-- - Fail-closed lab membership via require_current_user_lab_id()
-- - QC run / failure review / maintenance / mark-online as scoped DEFINER RPCs
-- - Equipment updates scoped by lab_id (+ equipment id where applicable)
-- - Fixed search_path + revoke anon/public execute
-- - Do NOT port plaintext release PINs / lab_release_order_with_pin

-- ---------------------------------------------------------------------------
-- Columns / tables (idempotent)
-- ---------------------------------------------------------------------------

ALTER TABLE public.lab_portal_qc_runs
  ADD COLUMN IF NOT EXISTS failure_notes text,
  ADD COLUMN IF NOT EXISTS failure_action text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS result_value numeric,
  ADD COLUMN IF NOT EXISTS target_value numeric,
  ADD COLUMN IF NOT EXISTS sd_value numeric,
  ADD COLUMN IF NOT EXISTS unit text;

ALTER TABLE public.lab_portal_equipment
  ADD COLUMN IF NOT EXISTS is_running boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.lab_portal_equipment.is_running IS
  'True when the instrument is actively running a test/scan.';

CREATE TABLE IF NOT EXISTS public.lab_equipment_maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.lab_profiles(id),
  equipment_id uuid NOT NULL REFERENCES public.lab_portal_equipment(id),
  equipment_name text NOT NULL,
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('scheduled', 'unscheduled')),
  reason text NOT NULL,
  performed_by text,
  started_at timestamptz NOT NULL DEFAULT now(),
  expected_return_at timestamptz,
  completed_at timestamptz,
  notes text,
  logged_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_equipment_maintenance_logs_lab
  ON public.lab_equipment_maintenance_logs(lab_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_lab_equipment_maintenance_logs_equipment
  ON public.lab_equipment_maintenance_logs(equipment_id, completed_at);

ALTER TABLE public.lab_equipment_maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lab_staff_read_maintenance_logs ON public.lab_equipment_maintenance_logs;
CREATE POLICY lab_staff_read_maintenance_logs
  ON public.lab_equipment_maintenance_logs
  FOR SELECT
  USING (
    public.is_current_user_in_lab(lab_id)
    AND public.is_current_user_lab_staff()
  );

DROP POLICY IF EXISTS lab_staff_insert_maintenance_logs ON public.lab_equipment_maintenance_logs;
CREATE POLICY lab_staff_insert_maintenance_logs
  ON public.lab_equipment_maintenance_logs
  FOR INSERT
  WITH CHECK (
    public.is_current_user_in_lab(lab_id)
    AND public.is_current_user_lab_staff()
  );

DROP POLICY IF EXISTS lab_staff_update_maintenance_logs ON public.lab_equipment_maintenance_logs;
CREATE POLICY lab_staff_update_maintenance_logs
  ON public.lab_equipment_maintenance_logs
  FOR UPDATE
  USING (
    public.is_current_user_in_lab(lab_id)
    AND public.is_current_user_lab_staff()
  )
  WITH CHECK (
    public.is_current_user_in_lab(lab_id)
    AND public.is_current_user_lab_staff()
  );

-- ---------------------------------------------------------------------------
-- Drop short lab_log_qc_run overload (no numeric params) if present
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.lab_log_qc_run(
  text, text, text, text, text, text, timestamptz
);

-- ---------------------------------------------------------------------------
-- lab_log_qc_run: insert QC row + sync matching equipment status (lab-scoped)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lab_log_qc_run(
  p_instrument_name text,
  p_department text,
  p_lot_number text,
  p_level_label text,
  p_result_label text,
  p_status text,
  p_result_value numeric DEFAULT NULL,
  p_target_value numeric DEFAULT NULL,
  p_sd_value numeric DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_run_at timestamptz DEFAULT now()
)
RETURNS public.lab_portal_qc_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  new_row public.lab_portal_qc_runs%ROWTYPE;
  new_equipment_status text;
BEGIN
  current_lab := public.require_current_user_lab_id();

  IF p_status NOT IN ('passed', 'warning', 'failed') THEN
    RAISE EXCEPTION 'Invalid status. Must be passed, warning, or failed.' USING ERRCODE = 'P0001';
  END IF;

  IF p_department NOT IN ('laboratory', 'radiology') THEN
    RAISE EXCEPTION 'Invalid department. Must be laboratory or radiology.' USING ERRCODE = 'P0001';
  END IF;

  new_equipment_status := CASE p_status
    WHEN 'passed' THEN 'online'
    WHEN 'warning' THEN 'warning'
    WHEN 'failed' THEN 'maintenance'
  END;

  UPDATE public.lab_portal_equipment
  SET status = new_equipment_status,
      updated_at = now()
  WHERE lab_id = current_lab
    AND department = p_department
    AND name = p_instrument_name;

  INSERT INTO public.lab_portal_qc_runs (
    lab_id,
    department,
    instrument_name,
    lot_number,
    level_label,
    result_label,
    status,
    result_value,
    target_value,
    sd_value,
    unit,
    run_at
  ) VALUES (
    current_lab,
    p_department,
    p_instrument_name,
    p_lot_number,
    p_level_label,
    p_result_label,
    p_status,
    p_result_value,
    p_target_value,
    p_sd_value,
    p_unit,
    p_run_at
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

REVOKE ALL ON FUNCTION public.lab_log_qc_run(
  text, text, text, text, text, text, numeric, numeric, numeric, text, timestamptz
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_log_qc_run(
  text, text, text, text, text, text, numeric, numeric, numeric, text, timestamptz
) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_log_qc_run(
  text, text, text, text, text, text, numeric, numeric, numeric, text, timestamptz
) TO authenticated;

-- ---------------------------------------------------------------------------
-- lab_review_qc_failure: record review; optionally put instrument in maintenance
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lab_review_qc_failure(
  p_run_id uuid,
  p_failure_notes text,
  p_action text
)
RETURNS public.lab_portal_qc_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  updated_row public.lab_portal_qc_runs%ROWTYPE;
BEGIN
  current_lab := public.require_current_user_lab_id();

  IF p_action NOT IN ('maintenance', 'replacement') THEN
    RAISE EXCEPTION 'Invalid action. Must be maintenance or replacement.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_portal_qc_runs
  SET failure_notes = p_failure_notes,
      failure_action = p_action,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_run_id
    AND lab_id = current_lab
    AND status = 'failed'
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'QC run not found or not a failed run from your lab.' USING ERRCODE = 'P0001';
  END IF;

  IF p_action = 'maintenance' THEN
    UPDATE public.lab_portal_equipment
    SET status = 'maintenance',
        updated_at = now()
    WHERE lab_id = current_lab
      AND department = updated_row.department
      AND name = updated_row.instrument_name;
  END IF;

  RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.lab_review_qc_failure(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_review_qc_failure(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_review_qc_failure(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- lab_log_maintenance: open maintenance log + set equipment status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lab_log_maintenance(
  p_equipment_id uuid,
  p_maintenance_type text,
  p_reason text,
  p_performed_by text DEFAULT NULL,
  p_expected_return_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.lab_equipment_maintenance_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  equipment_row public.lab_portal_equipment%ROWTYPE;
  new_log public.lab_equipment_maintenance_logs%ROWTYPE;
BEGIN
  current_lab := public.require_current_user_lab_id();

  IF p_maintenance_type NOT IN ('scheduled', 'unscheduled') THEN
    RAISE EXCEPTION 'Invalid maintenance type. Must be scheduled or unscheduled.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Maintenance reason is required.' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO equipment_row
  FROM public.lab_portal_equipment
  WHERE id = p_equipment_id
    AND lab_id = current_lab;

  IF equipment_row.id IS NULL THEN
    RAISE EXCEPTION 'Equipment not found or not assigned to your lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_portal_equipment
  SET status = 'maintenance',
      is_running = false,
      updated_at = now()
  WHERE id = p_equipment_id
    AND lab_id = current_lab;

  INSERT INTO public.lab_equipment_maintenance_logs (
    lab_id,
    equipment_id,
    equipment_name,
    maintenance_type,
    reason,
    performed_by,
    expected_return_at,
    notes,
    logged_by
  ) VALUES (
    current_lab,
    p_equipment_id,
    equipment_row.name,
    p_maintenance_type,
    btrim(p_reason),
    p_performed_by,
    p_expected_return_at,
    p_notes,
    auth.uid()
  )
  RETURNING * INTO new_log;

  RETURN new_log;
END;
$$;

REVOKE ALL ON FUNCTION public.lab_log_maintenance(
  uuid, text, text, text, timestamptz, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_log_maintenance(
  uuid, text, text, text, timestamptz, text
) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_log_maintenance(
  uuid, text, text, text, timestamptz, text
) TO authenticated;

-- ---------------------------------------------------------------------------
-- lab_mark_equipment_online: restore online + close open maintenance logs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lab_mark_equipment_online(
  p_equipment_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.lab_portal_equipment
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_lab uuid;
  updated_row public.lab_portal_equipment%ROWTYPE;
BEGIN
  current_lab := public.require_current_user_lab_id();

  UPDATE public.lab_portal_equipment
  SET status = 'online',
      updated_at = now()
  WHERE id = p_equipment_id
    AND lab_id = current_lab
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Equipment not found or not assigned to your lab.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.lab_equipment_maintenance_logs
  SET completed_at = now(),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE equipment_id = p_equipment_id
    AND lab_id = current_lab
    AND completed_at IS NULL;

  RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.lab_mark_equipment_online(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lab_mark_equipment_online(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lab_mark_equipment_online(uuid, text) TO authenticated;
