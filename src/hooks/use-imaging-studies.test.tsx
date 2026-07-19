import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { createSupabaseQueryBuilder } from '../test/supabase-mock';
import { markDoctorImagingStudyReviewed, useImagingStudies } from './use-imaging-studies';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const fromMock = vi.mocked(supabase.from);
const rpcMock = vi.mocked(supabase.rpc);

beforeEach(() => {
  vi.clearAllMocks();
  rpcMock.mockResolvedValue({ data: null, error: null, count: null, status: 200, statusText: 'OK' });
});

describe('useImagingStudies', () => {
  it('returns an empty list without a user id', async () => {
    const { result } = renderHook(() => useImagingStudies(null, 'patient'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('loads canonical patient imaging studies', async () => {
    const builder = createSupabaseQueryBuilder({
      data: [
        {
          id: 'study-1',
          accession: 'IMG-0001',
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          patient_name: 'Patient One',
          doctor_name: 'Dr One',
          clinic_name: 'CeenAiX',
          modality: 'MRI',
          study_name: 'MRI Brain',
          priority: 'Routine',
          status: 'released',
          room: null,
          scheduled_at: '2026-07-19T10:00:00Z',
          released_at: '2026-07-19T11:00:00Z',
          reviewed_at: null,
          findings: 'No acute abnormality.',
          impression: 'Normal MRI.',
          recommendations: null,
          report_status: 'final',
          alerts: null,
          is_deleted: false,
        },
      ],
      error: null,
    });
    fromMock.mockReturnValue(builder as never);

    const { result } = renderHook(() => useImagingStudies('patient-1', 'patient'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fromMock).toHaveBeenCalledWith('lab_portal_imaging_studies');
    expect(builder.eq).toHaveBeenCalledWith('is_deleted', false);
    expect(builder.eq).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(result.current.data).toEqual([
      {
        id: 'study-1',
        accession: 'IMG-0001',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        patientName: 'Patient One',
        doctorName: 'Dr One',
        clinicName: 'CeenAiX',
        modality: 'MRI',
        studyName: 'MRI Brain',
        priority: 'Routine',
        status: 'released',
        room: null,
        scheduledAt: '2026-07-19T10:00:00Z',
        releasedAt: '2026-07-19T11:00:00Z',
        reviewedAt: null,
        findings: 'No acute abnormality.',
        impression: 'Normal MRI.',
        recommendations: null,
        reportStatus: 'final',
        alerts: [],
        isDeleted: false,
      },
    ]);
  });

  it('marks a doctor imaging study reviewed through the scoped RPC', async () => {
    await markDoctorImagingStudyReviewed('study-1');

    expect(rpcMock).toHaveBeenCalledWith('doctor_review_imaging_study', {
      p_study_id: 'study-1',
    });
  });
});
