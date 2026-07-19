import { supabase } from '../lib/supabase';
import { useQuery } from './use-query';

export type PatientVaultDocumentCategory =
  | 'lab-report'
  | 'prescription'
  | 'insurance'
  | 'imaging'
  | 'visit-note'
  | 'upload'
  | 'other';

export interface PatientVaultDocument {
  id: string;
  patientId: string;
  uploadedBy: string | null;
  bucketId: 'documents';
  storagePath: string;
  originalFileName: string;
  title: string;
  description: string | null;
  category: PatientVaultDocumentCategory;
  mimeType: string;
  fileSizeBytes: number;
  sourceKind: string;
  sourceRecordId: string | null;
  allowCareTeamAccess: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PatientVaultDocumentRow {
  id: string;
  patient_id: string;
  uploaded_by: string | null;
  bucket_id: 'documents';
  storage_path: string;
  original_file_name: string;
  title: string;
  description: string | null;
  category: PatientVaultDocumentCategory;
  mime_type: string;
  file_size_bytes: number;
  source_kind: string;
  source_record_id: string | null;
  allow_care_team_access: boolean;
  created_at: string;
  updated_at: string;
}

export interface UploadPatientDocumentInput {
  patientId: string;
  file: File;
  title: string;
  description?: string;
  category: PatientVaultDocumentCategory;
  allowCareTeamAccess: boolean;
}

const mapDocument = (row: PatientVaultDocumentRow): PatientVaultDocument => ({
  id: row.id,
  patientId: row.patient_id,
  uploadedBy: row.uploaded_by,
  bucketId: row.bucket_id,
  storagePath: row.storage_path,
  originalFileName: row.original_file_name,
  title: row.title,
  description: row.description,
  category: row.category,
  mimeType: row.mime_type,
  fileSizeBytes: row.file_size_bytes,
  sourceKind: row.source_kind,
  sourceRecordId: row.source_record_id,
  allowCareTeamAccess: row.allow_care_team_access,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const safeFileName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'document';

export function usePatientDocumentVault(patientId: string | null | undefined) {
  return useQuery<PatientVaultDocument[]>(async () => {
    if (!patientId) {
      return [];
    }

    const { data, error } = await supabase
      .from('patient_document_files')
      .select(
        'id, patient_id, uploaded_by, bucket_id, storage_path, original_file_name, title, description, category, mime_type, file_size_bytes, source_kind, source_record_id, allow_care_team_access, created_at, updated_at'
      )
      .eq('patient_id', patientId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as PatientVaultDocumentRow[]).map(mapDocument);
  }, [patientId ?? '']);
}

export async function uploadPatientDocument(input: UploadPatientDocumentInput): Promise<PatientVaultDocument> {
  const cleanedTitle = input.title.trim() || input.file.name;
  const path = `${input.patientId}/${crypto.randomUUID()}-${safeFileName(input.file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, input.file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error } = await supabase
    .from('patient_document_files')
    .insert({
      patient_id: input.patientId,
      bucket_id: 'documents',
      storage_path: path,
      original_file_name: input.file.name,
      title: cleanedTitle,
      description: input.description?.trim() || null,
      category: input.category,
      mime_type: input.file.type || 'application/octet-stream',
      file_size_bytes: input.file.size,
      source_kind: 'uploaded',
      allow_care_team_access: input.allowCareTeamAccess,
    })
    .select(
      'id, patient_id, uploaded_by, bucket_id, storage_path, original_file_name, title, description, category, mime_type, file_size_bytes, source_kind, source_record_id, allow_care_team_access, created_at, updated_at'
    )
    .single();

  if (error) {
    await supabase.storage.from('documents').remove([path]);
    throw error;
  }

  return mapDocument(data as PatientVaultDocumentRow);
}

export async function getPatientDocumentSignedUrl(storagePath: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function setPatientDocumentCareTeamAccess(documentId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('patient_document_files')
    .update({ allow_care_team_access: enabled })
    .eq('id', documentId);

  if (error) {
    throw error;
  }
}

export async function recordPatientDocumentShare(
  documentId: string,
  patientId: string,
  shareMethod: 'link' | 'email' | 'whatsapp' | 'care_team',
  recipientContact?: string | null
): Promise<void> {
  const { error } = await supabase.from('patient_document_shares').insert({
    document_id: documentId,
    patient_id: patientId,
    share_method: shareMethod,
    recipient_contact: recipientContact?.trim() || null,
  });

  if (error) {
    throw error;
  }
}

export async function softDeletePatientDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('patient_document_files')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', documentId);

  if (error) {
    throw error;
  }
}
