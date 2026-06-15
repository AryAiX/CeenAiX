import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { createSupabaseQueryBuilder } from '../test/supabase-mock';
import { useConsultationScribe } from './use-consultation-scribe';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

describe('useConsultationScribe', () => {
  const fromMock = vi.mocked(supabase.from);
  const getUserMock = vi.mocked(supabase.auth.getUser);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null without doctor or appointment id', async () => {
    const { result } = renderHook(() => useConsultationScribe(undefined, undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns empty payload when no recording exists', async () => {
    const recordingsBuilder = createSupabaseQueryBuilder({ data: [], error: null });
    fromMock.mockImplementation(((table: string) => {
      if (table === 'consultation_recordings') return recordingsBuilder;
      throw new Error(`Unexpected table ${table}`);
    }) as never);

    const { result } = renderHook(() => useConsultationScribe('doctor-1', 'appt-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({
      recording: null,
      transcript: null,
      note: null,
      consent: null,
    });
    expect(recordingsBuilder.eq).toHaveBeenCalledWith('appointment_id', 'appt-1');
    expect(recordingsBuilder.eq).toHaveBeenCalledWith('doctor_id', 'doctor-1');
    expect(recordingsBuilder.neq).toHaveBeenCalledWith('status', 'discarded');
  });

  it('loads recording, transcript, note, and consent when present', async () => {
    const recording = {
      id: 'rec-1',
      appointment_id: 'appt-1',
      doctor_id: 'doctor-1',
      patient_id: 'patient-1',
      status: 'ready',
    };
    const recordingsBuilder = createSupabaseQueryBuilder({ data: [recording], error: null });
    const transcriptBuilder = createSupabaseQueryBuilder({
      data: { id: 'tr-1', recording_id: 'rec-1', full_text: 'Hello', segments: [] },
      error: null,
    });
    const notesBuilder = createSupabaseQueryBuilder({
      data: [{ id: 'note-1', recording_id: 'rec-1' }],
      error: null,
    });
    const consentBuilder = createSupabaseQueryBuilder({
      data: [{ id: 'consent-1', recording_id: 'rec-1' }],
      error: null,
    });

    fromMock.mockImplementation(((table: string) => {
      if (table === 'consultation_recordings') return recordingsBuilder;
      if (table === 'consultation_transcripts') return transcriptBuilder;
      if (table === 'ai_clinical_notes') return notesBuilder;
      if (table === 'consultation_consent_log') return consentBuilder;
      throw new Error(`Unexpected table ${table}`);
    }) as never);

    const { result } = renderHook(() => useConsultationScribe('doctor-1', 'appt-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.recording?.id).toBe('rec-1');
    expect(result.current.data?.transcript?.id).toBe('tr-1');
    expect(result.current.data?.note?.id).toBe('note-1');
    expect(result.current.data?.consent?.id).toBe('consent-1');
  });

  it('stores speaker reference paths in recording metadata when audio is attached', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'doctor-1' } },
      error: null,
    } as never);
    const recordingBuilder = createSupabaseQueryBuilder({ data: {}, error: null });
    const auditBuilder = createSupabaseQueryBuilder({ data: {}, error: null });

    fromMock.mockImplementation(((table: string) => {
      if (table === 'consultation_recordings') return recordingBuilder;
      if (table === 'consultation_recordings_audit') return auditBuilder;
      throw new Error(`Unexpected table ${table}`);
    }) as never);

    const { result } = renderHook(() => useConsultationScribe(undefined, undefined));

    await result.current.actions.attachAudioAndProcess({
      recordingId: 'recording-1',
      appointmentId: 'appt-1',
      audioStoragePath: 'doctor-1/appt-1/audio.webm',
      audioMimeType: 'audio/webm',
      durationSeconds: 12,
      scribeInputMode: 'voice_context',
      speakerReferencePaths: {
        doctor: 'doctor-1/appt-1/speaker-references/ref-tx1-doctor.webm',
        patient: 'doctor-1/appt-1/speaker-references/ref-tx2-patient.webm',
      },
    });

    expect(recordingBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          scribeInputMode: 'voice_context',
          stereoSeparated: false,
          speakerReferenceLabels: { doctor: 'TX1', patient: 'TX2' },
          speakerReferencesAttached: true,
          speakerReferencePaths: {
            doctor: 'doctor-1/appt-1/speaker-references/ref-tx1-doctor.webm',
            patient: 'doctor-1/appt-1/speaker-references/ref-tx2-patient.webm',
          },
        }),
      })
    );
    expect(auditBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'stopped',
        metadata: expect.objectContaining({
          speakerReferencesAttached: true,
        }),
      })
    );
  });
});
