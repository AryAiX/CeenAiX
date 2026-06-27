CREATE TABLE public.lab_equipment_maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES lab_profiles(id),
  equipment_id uuid NOT NULL REFERENCES lab_portal_equipment(id),
  equipment_name text NOT NULL,
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('scheduled', 'unscheduled')),
  reason text NOT NULL,
  performed_by text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expected_return_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  logged_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.lab_equipment_maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY lab_staff_read_maintenance_logs ON public.lab_equipment_maintenance_logs
  FOR SELECT
  USING (is_current_user_in_lab(lab_id) AND is_current_user_lab_staff());

CREATE POLICY lab_staff_insert_maintenance_logs ON public.lab_equipment_maintenance_logs
  FOR INSERT
  WITH CHECK (is_current_user_in_lab(lab_id) AND is_current_user_lab_staff());