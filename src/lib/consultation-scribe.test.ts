import { describe, expect, it } from 'vitest';
import {
  audioExtensionForMimeType,
  buildConsultationAudioPath,
  formatRecordingDuration,
  normalizeClinicalNoteDiagnoses,
  normalizeClinicalNoteFollowUp,
  normalizeClinicalNoteMedications,
  normalizeSmartSuggestions,
  normalizeTranscriptSegments,
} from './consultation-scribe';

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
