ALTER TABLE lab_portal_qc_runs
ADD COLUMN result_value numeric,
ADD COLUMN target_value numeric,
ADD COLUMN sd_value numeric,
ADD COLUMN unit text;