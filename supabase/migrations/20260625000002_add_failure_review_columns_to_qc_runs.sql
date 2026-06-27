ALTER TABLE lab_portal_qc_runs
ADD COLUMN failure_notes text,
ADD COLUMN failure_action text,
ADD COLUMN reviewed_at timestamp with time zone,
ADD COLUMN reviewed_by uuid REFERENCES auth.users(id);