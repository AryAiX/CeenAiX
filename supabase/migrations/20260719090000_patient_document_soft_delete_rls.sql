-- Let patients soft-delete their own vault documents.
--
-- The original FOR ALL policy used `NOT is_deleted` as its USING clause. PostgREST
-- updates filter by id, which requires SELECT rights, so Postgres also checks the
-- updated row against the SELECT policy. A row with is_deleted = true can never pass
-- that, so every soft delete failed with "new row violates row-level security policy".
--
-- Split per command:
--   SELECT  owner sees all of their own rows (clients already filter is_deleted = false).
--   INSERT  unchanged ownership/path checks; rows start live.
--   UPDATE  only live rows; a soft delete must set deleted_at; ownership columns stay fixed.
--   DELETE  no policy: clinical documents are never hard-deleted.
-- Doctor reads stay limited to live, consented rows.

DROP POLICY IF EXISTS "patients_manage_own_document_files" ON public.patient_document_files;

DROP POLICY IF EXISTS "patients_read_own_document_files" ON public.patient_document_files;
CREATE POLICY "patients_read_own_document_files"
  ON public.patient_document_files
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "patients_insert_own_document_files" ON public.patient_document_files;
CREATE POLICY "patients_insert_own_document_files"
  ON public.patient_document_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = auth.uid()
    AND uploaded_by = auth.uid()
    AND bucket_id = 'documents'
    AND storage_path LIKE auth.uid()::text || '/%'
    AND NOT is_deleted
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "patients_update_own_document_files" ON public.patient_document_files;
CREATE POLICY "patients_update_own_document_files"
  ON public.patient_document_files
  FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid() AND NOT is_deleted)
  WITH CHECK (
    patient_id = auth.uid()
    AND uploaded_by = auth.uid()
    AND bucket_id = 'documents'
    AND storage_path LIKE auth.uid()::text || '/%'
    AND (NOT is_deleted OR deleted_at IS NOT NULL)
  );
