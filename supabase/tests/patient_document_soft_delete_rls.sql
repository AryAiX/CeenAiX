-- Regression coverage for 20260719090000_patient_document_soft_delete_rls.sql (MB-013).
-- Run against a non-production environment with at least two patient users.
-- Everything happens inside a transaction that is rolled back.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_document_files'
      AND policyname = 'patients_manage_own_document_files'
  ) THEN
    RAISE EXCEPTION 'legacy FOR ALL patient document policy still exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_document_files'
      AND cmd IN ('DELETE', 'ALL')
      AND 'authenticated' = ANY(roles)
  ) THEN
    RAISE EXCEPTION 'authenticated users can hard-delete patient document files';
  END IF;
END;
$$;

CREATE TEMP TABLE doc_rls_context ON COMMIT DROP AS
SELECT owner.user_id AS owner_id, other.user_id AS other_id, gen_random_uuid() AS document_id
FROM public.user_profiles owner
JOIN public.user_profiles other ON other.role = 'patient' AND other.user_id <> owner.user_id
WHERE owner.role = 'patient'
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM doc_rls_context) THEN
    RAISE EXCEPTION 'document RLS test requires two patient users';
  END IF;
END;
$$;

INSERT INTO public.patient_document_files (id, patient_id, uploaded_by, storage_path, original_file_name, title, mime_type, file_size_bytes)
SELECT document_id, owner_id, owner_id, owner_id::text || '/rls-test-' || document_id::text || '.pdf', 'rls-test.pdf', 'RLS test', 'application/pdf', 1
FROM doc_rls_context;

GRANT SELECT ON doc_rls_context TO authenticated;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ctx record;
  row_count integer;
BEGIN
  SELECT * INTO STRICT ctx FROM doc_rls_context;

  -- Another patient can neither see nor soft-delete the document.
  PERFORM set_config('request.jwt.claim.sub', ctx.other_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', ctx.other_id, 'role', 'authenticated')::text, true);
  UPDATE public.patient_document_files SET is_deleted = true, deleted_at = now() WHERE id = ctx.document_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count <> 0 THEN
    RAISE EXCEPTION 'another patient can soft-delete the document';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', ctx.owner_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', ctx.owner_id, 'role', 'authenticated')::text, true);

  -- A soft delete without deleted_at is rejected.
  BEGIN
    UPDATE public.patient_document_files SET is_deleted = true WHERE id = ctx.document_id;
    RAISE EXCEPTION 'soft delete without deleted_at was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- The owner can soft-delete, the same statement shape PostgREST sends.
  UPDATE public.patient_document_files SET is_deleted = true, deleted_at = now() WHERE id = ctx.document_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count <> 1 THEN
    RAISE EXCEPTION 'owner cannot soft-delete their document';
  END IF;

  -- A soft-deleted document cannot be restored or changed by the patient.
  UPDATE public.patient_document_files SET is_deleted = false, deleted_at = NULL WHERE id = ctx.document_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count <> 0 THEN
    RAISE EXCEPTION 'patient can restore a soft-deleted document';
  END IF;

  -- No hard delete.
  DELETE FROM public.patient_document_files WHERE id = ctx.document_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count <> 0 THEN
    RAISE EXCEPTION 'patient can hard-delete a document';
  END IF;
END;
$$;

RESET ROLE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.patient_document_files f
    JOIN doc_rls_context c ON c.document_id = f.id
    WHERE f.is_deleted AND f.deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'document row was not soft-deleted';
  END IF;
END;
$$;

SELECT 'ok - patient document soft delete RLS';

ROLLBACK;
