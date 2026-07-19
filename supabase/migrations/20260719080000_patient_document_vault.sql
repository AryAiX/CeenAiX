-- Permissioned patient document vault metadata for the private documents bucket.

CREATE TABLE IF NOT EXISTS public.patient_document_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  bucket_id text NOT NULL DEFAULT 'documents',
  storage_path text NOT NULL UNIQUE,
  original_file_name text NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes >= 0),
  source_kind text NOT NULL DEFAULT 'uploaded',
  source_record_id uuid,
  allow_care_team_access boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_document_files_bucket_chk CHECK (bucket_id = 'documents'),
  CONSTRAINT patient_document_files_category_chk CHECK (
    category IN ('lab-report', 'prescription', 'insurance', 'imaging', 'visit-note', 'upload', 'other')
  ),
  CONSTRAINT patient_document_files_source_chk CHECK (
    source_kind IN ('uploaded', 'lab_order', 'prescription', 'insurance', 'imaging', 'appointment', 'other')
  )
);

CREATE INDEX IF NOT EXISTS idx_patient_document_files_patient
  ON public.patient_document_files(patient_id, created_at DESC)
  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_patient_document_files_storage_path
  ON public.patient_document_files(storage_path)
  WHERE NOT is_deleted;

DROP TRIGGER IF EXISTS trg_patient_document_files_updated_at ON public.patient_document_files;
CREATE TRIGGER trg_patient_document_files_updated_at
  BEFORE UPDATE ON public.patient_document_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.patient_document_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_manage_own_document_files" ON public.patient_document_files;
CREATE POLICY "patients_manage_own_document_files"
  ON public.patient_document_files
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid() AND NOT is_deleted)
  WITH CHECK (
    patient_id = auth.uid()
    AND uploaded_by = auth.uid()
    AND bucket_id = 'documents'
    AND storage_path LIKE auth.uid()::text || '/%'
  );

DROP POLICY IF EXISTS "doctors_read_consented_patient_document_files" ON public.patient_document_files;
CREATE POLICY "doctors_read_consented_patient_document_files"
  ON public.patient_document_files
  FOR SELECT
  TO authenticated
  USING (
    allow_care_team_access
    AND NOT is_deleted
    AND EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.patient_id = patient_document_files.patient_id
        AND a.doctor_id = auth.uid()
        AND NOT a.is_deleted
    )
  );

CREATE TABLE IF NOT EXISTS public.patient_document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.patient_document_files(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text,
  recipient_contact text,
  share_method text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_document_shares_method_chk CHECK (share_method IN ('link', 'email', 'whatsapp', 'care_team'))
);

CREATE INDEX IF NOT EXISTS idx_patient_document_shares_patient
  ON public.patient_document_shares(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_document_shares_document
  ON public.patient_document_shares(document_id, created_at DESC);

ALTER TABLE public.patient_document_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_manage_own_document_shares" ON public.patient_document_shares;
CREATE POLICY "patients_manage_own_document_shares"
  ON public.patient_document_shares
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (
    patient_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.patient_document_files f
      WHERE f.id = patient_document_shares.document_id
        AND f.patient_id = auth.uid()
        AND NOT f.is_deleted
    )
  );

-- Tighten doctor reads in the private documents bucket to metadata rows where
-- the patient explicitly allowed care-team access.
DROP POLICY IF EXISTS "documents_doctors_read" ON storage.objects;
CREATE POLICY "documents_doctors_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1
      FROM public.patient_document_files f
      JOIN public.appointments a
        ON a.patient_id = f.patient_id
       AND a.doctor_id = auth.uid()
       AND NOT a.is_deleted
      WHERE f.bucket_id = storage.objects.bucket_id
        AND f.storage_path = storage.objects.name
        AND f.allow_care_team_access
        AND NOT f.is_deleted
    )
  );

NOTIFY pgrst, 'reload schema';
