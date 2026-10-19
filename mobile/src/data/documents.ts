import type { PatientVaultDocumentCategory } from '@/data/web/hooks/use-patient-document-vault';
import { supabase } from '@/lib/supabase';
import { randomId, safeFileName, uploadToBucket, type LocalAsset } from '@/lib/uploads';

// Native counterpart of web `uploadPatientDocument` (which takes a DOM File):
// same bucket, `${patientId}/${uuid}-${safeFileName}` path, row columns and
// rollback-on-insert-failure behaviour.

export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

export const UPLOAD_CATEGORIES: PatientVaultDocumentCategory[] = ['upload', 'lab-report', 'prescription', 'imaging', 'insurance', 'visit-note', 'other'];

export interface NativeDocumentUpload {
  patientId: string;
  asset: LocalAsset;
  title: string;
  description: string;
  category: PatientVaultDocumentCategory;
  allowCareTeamAccess: boolean;
}

export async function uploadVaultDocument(input: NativeDocumentUpload): Promise<void> {
  const path = `${input.patientId}/${randomId()}-${safeFileName(input.asset.name)}`;
  await uploadToBucket('documents', path, input.asset);

  const { error } = await supabase.from('patient_document_files').insert({
    patient_id: input.patientId,
    bucket_id: 'documents',
    storage_path: path,
    original_file_name: input.asset.name,
    title: input.title.trim() || input.asset.name,
    description: input.description.trim() || null,
    category: input.category,
    mime_type: input.asset.mimeType || 'application/octet-stream',
    file_size_bytes: input.asset.size,
    source_kind: 'uploaded',
    allow_care_team_access: input.allowCareTeamAccess,
  });
  if (error) {
    await supabase.storage.from('documents').remove([path]);
    throw error;
  }
}
