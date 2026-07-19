import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { createSupabaseQueryBuilder } from '../test/supabase-mock';
import { uploadPatientDocument, usePatientDocumentVault } from './use-patient-document-vault';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

const fromMock = vi.mocked(supabase.from);
const storageFromMock = vi.mocked(supabase.storage.from);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePatientDocumentVault', () => {
  it('loads private patient document metadata', async () => {
    const builder = createSupabaseQueryBuilder({
      data: [
        {
          id: 'doc-1',
          patient_id: 'patient-1',
          uploaded_by: 'patient-1',
          bucket_id: 'documents',
          storage_path: 'patient-1/doc.pdf',
          original_file_name: 'doc.pdf',
          title: 'Insurance scan',
          description: 'Front and back',
          category: 'insurance',
          mime_type: 'application/pdf',
          file_size_bytes: 1000,
          source_kind: 'uploaded',
          source_record_id: null,
          allow_care_team_access: true,
          created_at: '2026-07-19T10:00:00Z',
          updated_at: '2026-07-19T10:00:00Z',
        },
      ],
      error: null,
    });
    fromMock.mockReturnValue(builder as never);

    const { result } = renderHook(() => usePatientDocumentVault('patient-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fromMock).toHaveBeenCalledWith('patient_document_files');
    expect(builder.eq).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(builder.eq).toHaveBeenCalledWith('is_deleted', false);
    expect(result.current.data?.[0]).toMatchObject({
      id: 'doc-1',
      patientId: 'patient-1',
      storagePath: 'patient-1/doc.pdf',
      allowCareTeamAccess: true,
    });
  });

  it('uploads to the private documents bucket before inserting metadata', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ data: { path: 'patient-1/doc.pdf' }, error: null });
    const removeMock = vi.fn().mockResolvedValue({ data: null, error: null });
    storageFromMock.mockReturnValue({ upload: uploadMock, remove: removeMock } as never);
    const builder = createSupabaseQueryBuilder({
      data: {
        id: 'doc-1',
        patient_id: 'patient-1',
        uploaded_by: 'patient-1',
        bucket_id: 'documents',
        storage_path: 'patient-1/doc.pdf',
        original_file_name: 'Doc.pdf',
        title: 'Doc',
        description: null,
        category: 'upload',
        mime_type: 'application/pdf',
        file_size_bytes: 4,
        source_kind: 'uploaded',
        source_record_id: null,
        allow_care_team_access: false,
        created_at: '2026-07-19T10:00:00Z',
        updated_at: '2026-07-19T10:00:00Z',
      },
      error: null,
    });
    fromMock.mockReturnValue(builder as never);

    const file = new File(['test'], 'Doc.pdf', { type: 'application/pdf' });
    await uploadPatientDocument({
      patientId: 'patient-1',
      file,
      title: 'Doc',
      category: 'upload',
      allowCareTeamAccess: false,
    });

    expect(storageFromMock).toHaveBeenCalledWith('documents');
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^patient-1\/.+-doc\.pdf$/),
      file,
      { cacheControl: '3600', upsert: false }
    );
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({
      patient_id: 'patient-1',
      bucket_id: 'documents',
      original_file_name: 'Doc.pdf',
      title: 'Doc',
      category: 'upload',
      allow_care_team_access: false,
    }));
  });
});
