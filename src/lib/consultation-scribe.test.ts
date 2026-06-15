import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from './supabase';
import {
  audioExtensionForMimeType,
  buildConsultationAudioPath,
  buildConsultationChannelAudioPath,
  buildConsultationSpeakerReferenceAudioPath,
  DEFAULT_SPEAKER_CHANNEL_MAP,
  formatRecordingDuration,
  hasCompleteChannelAudioPaths,
  hasCompleteSpeakerReferencePaths,
  normalizeClinicalNoteDiagnoses,
  normalizeClinicalNoteFollowUp,
  normalizeClinicalNoteMedications,
  normalizeLiveCues,
  normalizeSmartSuggestions,
  normalizeSpeakerChannelMap,
  normalizeTranscriptSegments,
  preferenceToSpeakerChannelMap,
  REVERSED_SPEAKER_CHANNEL_MAP,
  speakerChannelMapToPreference,
  transcribeConsultation,
} from './consultation-scribe';

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('formatRecordingDuration', () => {
  it('formats as zero-padded HH:MM:SS', () => {
    expect(formatRecordingDuration(0)).toBe('00:00:00');
    expect(formatRecordingDuration(5)).toBe('00:00:05');
    expect(formatRecordingDuration(65)).toBe('00:01:05');
    expect(formatRecordingDuration(3661)).toBe('01:01:01');
  });

  it('guards against invalid input', () => {
    expect(formatRecordingDuration(-10)).toBe('00:00:00');
    expect(formatRecordingDuration(Number.NaN)).toBe('00:00:00');
  });
});

describe('audioExtensionForMimeType', () => {
  it('maps common mime types to extensions', () => {
    expect(audioExtensionForMimeType('audio/webm;codecs=opus')).toBe('webm');
    expect(audioExtensionForMimeType('audio/ogg')).toBe('ogg');
    expect(audioExtensionForMimeType('audio/mp4')).toBe('m4a');
    expect(audioExtensionForMimeType('audio/mpeg')).toBe('mp3');
    expect(audioExtensionForMimeType('audio/wav')).toBe('wav');
    expect(audioExtensionForMimeType(null)).toBe('webm');
  });
});

describe('buildConsultationAudioPath', () => {
  it('namespaces audio by doctor and appointment', () => {
    const path = buildConsultationAudioPath('doc-1', 'appt-1', 'audio/webm');
    expect(path.startsWith('doc-1/appt-1/')).toBe(true);
    expect(path.endsWith('.webm')).toBe(true);
  });
});

describe('speaker channel assignment helpers', () => {
  it('maps UI preferences to left/right speaker roles', () => {
    expect(preferenceToSpeakerChannelMap('left-doctor')).toEqual(DEFAULT_SPEAKER_CHANNEL_MAP);
    expect(preferenceToSpeakerChannelMap('left-patient')).toEqual(REVERSED_SPEAKER_CHANNEL_MAP);
    expect(speakerChannelMapToPreference(DEFAULT_SPEAKER_CHANNEL_MAP)).toBe('left-doctor');
    expect(speakerChannelMapToPreference(REVERSED_SPEAKER_CHANNEL_MAP)).toBe('left-patient');
  });

  it('normalizes invalid speaker channel maps to the default split', () => {
    expect(normalizeSpeakerChannelMap({ left: 'doctor', right: 'patient' })).toEqual(DEFAULT_SPEAKER_CHANNEL_MAP);
    expect(normalizeSpeakerChannelMap({ left: 'doctor', right: 'doctor' })).toEqual(DEFAULT_SPEAKER_CHANNEL_MAP);
    expect(normalizeSpeakerChannelMap({ left: 'patient', right: 'doctor' })).toEqual(REVERSED_SPEAKER_CHANNEL_MAP);
    expect(normalizeSpeakerChannelMap(null)).toEqual(DEFAULT_SPEAKER_CHANNEL_MAP);
  });

  it('tracks complete channel-audio path metadata', () => {
    expect(buildConsultationChannelAudioPath('doc-1', 'appt-1', 'left', 'audio/webm')).toContain('-left.webm');
    expect(hasCompleteChannelAudioPaths({ left: 'left.webm', right: 'right.webm' })).toBe(true);
    expect(hasCompleteChannelAudioPaths({ left: 'left.webm' })).toBe(false);
  });

  it('namespaces speaker reference samples by TX role', () => {
    const doctorPath = buildConsultationSpeakerReferenceAudioPath('doc-1', 'appt-1', 'doctor', 'audio/webm');
    const patientPath = buildConsultationSpeakerReferenceAudioPath('doc-1', 'appt-1', 'patient', 'audio/webm');
    expect(doctorPath).toContain('doc-1/appt-1/speaker-references/');
    expect(doctorPath).toContain('-tx1-doctor.webm');
    expect(patientPath).toContain('-tx2-patient.webm');
    expect(hasCompleteSpeakerReferencePaths({ doctor: doctorPath, patient: patientPath })).toBe(true);
    expect(hasCompleteSpeakerReferencePaths({ doctor: doctorPath })).toBe(false);
  });
});

describe('transcribeConsultation', () => {
  it('passes voice reference metadata to the scribe function', async () => {
    const invokeMock = vi.mocked(supabase.functions.invoke);
    invokeMock.mockResolvedValue({
      data: {
        transcript: {
          id: 'transcript-1',
          recording_id: 'recording-1',
          full_text: 'Doctor: Hello',
          segments: [],
        },
        durationSeconds: 1,
        languageDetected: 'en',
      },
      error: null,
    });

    await transcribeConsultation({
      recordingId: 'recording-1',
      scribeInputMode: 'voice_context',
      speakerReferencePaths: {
        doctor: 'doc-1/appt-1/speaker-references/ref-tx1-doctor.webm',
        patient: 'doc-1/appt-1/speaker-references/ref-tx2-patient.webm',
      },
    });

    expect(invokeMock).toHaveBeenCalledWith('consultation-scribe', {
      body: expect.objectContaining({
        task: 'transcribe',
        recordingId: 'recording-1',
        scribeInputMode: 'voice_context',
        speakerReferencePaths: {
          doctor: 'doc-1/appt-1/speaker-references/ref-tx1-doctor.webm',
          patient: 'doc-1/appt-1/speaker-references/ref-tx2-patient.webm',
        },
      }),
    });
  });
});

describe('normalizeTranscriptSegments', () => {
  it('keeps valid segments and clamps confidence', () => {
    const result = normalizeTranscriptSegments([
      { speaker: 'doctor', start_ms: 0, end_ms: 1000, text: 'Hello', confidence: 1.4 },
      { speaker: 'unknown', start_ms: 1000, end_ms: 2000, text: '  ', confidence: 0.9 },
      { speaker: 'alien', start_ms: 2000, end_ms: 3000, text: 'Patient reply', confidence: -1 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ speaker: 'doctor', text: 'Hello', confidence: 1 });
    expect(result[1]).toMatchObject({ speaker: 'unknown', text: 'Patient reply', confidence: 0 });
  });

  it('returns empty array for non-array input', () => {
    expect(normalizeTranscriptSegments(null)).toEqual([]);
    expect(normalizeTranscriptSegments('nope')).toEqual([]);
  });
});

describe('normalizeClinicalNoteMedications', () => {
  it('drops nameless entries and trims values', () => {
    const result = normalizeClinicalNoteMedications([
      { name: ' Lisinopril ', dosage: '10mg', frequency: 'daily', notes: null },
      { dosage: '5mg' },
    ]);
    expect(result).toEqual([{ name: 'Lisinopril', dosage: '10mg', frequency: 'daily', notes: null }]);
  });
});

describe('normalizeClinicalNoteDiagnoses', () => {
  it('keeps description and optional icd10', () => {
    const result = normalizeClinicalNoteDiagnoses([
      { description: 'Hypertension', icd10_code: 'I10' },
      { icd10_code: 'X' },
    ]);
    expect(result).toEqual([{ description: 'Hypertension', icd10_code: 'I10' }]);
  });
});

describe('normalizeClinicalNoteFollowUp', () => {
  it('defaults unknown categories to other', () => {
    const result = normalizeClinicalNoteFollowUp([
      { action: 'Order ECG', category: 'lab_order' },
      { action: 'Review next week', category: 'mystery' },
    ]);
    expect(result).toEqual([
      { action: 'Order ECG', category: 'lab_order' },
      { action: 'Review next week', category: 'other' },
    ]);
  });
});

describe('normalizeSmartSuggestions', () => {
  it('normalizes kind and assigns fallback ids', () => {
    const result = normalizeSmartSuggestions([
      { kind: 'medication', label: 'Lisinopril 10mg', value: { name: 'Lisinopril' } },
      { kind: 'bogus', label: 'Schedule follow-up' },
      { label: '' },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ kind: 'medication', label: 'Lisinopril 10mg' });
    expect(result[1]).toMatchObject({ kind: 'follow_up', label: 'Schedule follow-up' });
    expect(result[1].id).toBe('suggestion-1');
  });
});

describe('normalizeLiveCues', () => {
  it('keeps valid cues, defaults unknown kinds to reminder, and assigns ids', () => {
    const result = normalizeLiveCues([
      { kind: 'red_flag', text: 'Chest pain + diaphoresis — consider ACS' },
      { kind: 'question', text: 'Ask about radiation of the pain' },
      { kind: 'bogus', text: 'On warfarin' },
      { text: '' },
      'nope',
    ]);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ kind: 'red_flag' });
    expect(result[2]).toMatchObject({ kind: 'reminder', text: 'On warfarin', id: 'cue-2' });
  });

  it('returns empty for non-arrays', () => {
    expect(normalizeLiveCues(null)).toEqual([]);
    expect(normalizeLiveCues({})).toEqual([]);
  });
});
