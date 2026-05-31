import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import i18n from 'i18next';
import { supabase } from './supabase';
import type {
  AiClinicalNote,
  ClinicalNoteDiagnosis,
  ClinicalNoteFollowUp,
  ClinicalNoteMedication,
  ClinicalNoteOutputLanguage,
  ClinicalNotePromptTemplate,
  ConsultationTranscript,
  LiveCue,
  LiveCueKind,
  SmartSuggestion,
  TranscriptSegment,
  TranscriptSpeaker,
} from '../types';

export const CONSULTATION_AUDIO_BUCKET = 'consultation-audio';

const VALID_SPEAKERS: ReadonlySet<TranscriptSpeaker> = new Set(['doctor', 'patient', 'unknown']);

/** Render seconds as a zero-padded HH:MM:SS timer string (DM Mono display). */
export function formatRecordingDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Map a recorded MIME type to a sensible file extension for storage. */
export function audioExtensionForMimeType(mimeType: string | null | undefined): string {
  if (!mimeType) return 'webm';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

export function buildConsultationAudioPath(
  doctorId: string,
  appointmentId: string,
  mimeType: string | null | undefined
): string {
  const extension = audioExtensionForMimeType(mimeType);
  return `${doctorId}/${appointmentId}/${crypto.randomUUID()}.${extension}`;
}

/**
 * Upload the captured consultation audio to the private, encrypted
 * `consultation-audio` bucket. Returns the storage path for signed-URL access.
 */
export async function uploadConsultationAudio(input: {
  doctorId: string;
  appointmentId: string;
  blob: Blob;
}): Promise<{ path: string; mimeType: string; size: number }> {
  const mimeType = input.blob.type || 'audio/webm';
  const path = buildConsultationAudioPath(input.doctorId, input.appointmentId, mimeType);
  const { error } = await supabase.storage.from(CONSULTATION_AUDIO_BUCKET).upload(path, input.blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: mimeType,
  });

  if (error) {
    throw error;
  }

  return { path, mimeType, size: input.blob.size };
}

/** Create a short-lived signed URL so the doctor can replay the audio. */
export async function createConsultationAudioSignedUrl(
  path: string,
  expiresInSeconds = 60 * 10
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CONSULTATION_AUDIO_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    throw error;
  }
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Normalizers (pure, unit-testable)
// ---------------------------------------------------------------------------

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : [];

export function normalizeTranscriptSegments(value: unknown): TranscriptSegment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((raw): TranscriptSegment | null => {
      if (!raw || typeof raw !== 'object') {
        return null;
      }
      const candidate = raw as Record<string, unknown>;
      const text = asString(candidate.text);
      if (!text) {
        return null;
      }
      const speakerRaw = typeof candidate.speaker === 'string' ? candidate.speaker.toLowerCase() : 'unknown';
      const speaker = (VALID_SPEAKERS.has(speakerRaw as TranscriptSpeaker)
        ? speakerRaw
        : 'unknown') as TranscriptSpeaker;
      const startMs = typeof candidate.start_ms === 'number' ? candidate.start_ms : 0;
      const endMs = typeof candidate.end_ms === 'number' ? candidate.end_ms : startMs;
      const confidence =
        typeof candidate.confidence === 'number' ? Math.max(0, Math.min(1, candidate.confidence)) : 1;
      return { speaker, start_ms: startMs, end_ms: endMs, text, confidence };
    })
    .filter((segment): segment is TranscriptSegment => segment !== null);
}

export function normalizeClinicalNoteMedications(value: unknown): ClinicalNoteMedication[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw): ClinicalNoteMedication | null => {
      if (!raw || typeof raw !== 'object') return null;
      const candidate = raw as Record<string, unknown>;
      const name = asString(candidate.name);
      if (!name) return null;
      return {
        name,
        dosage: asString(candidate.dosage),
        frequency: asString(candidate.frequency),
        notes: asString(candidate.notes),
      };
    })
    .filter((item): item is ClinicalNoteMedication => item !== null);
}

export function normalizeClinicalNoteDiagnoses(value: unknown): ClinicalNoteDiagnosis[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw): ClinicalNoteDiagnosis | null => {
      if (!raw || typeof raw !== 'object') return null;
      const candidate = raw as Record<string, unknown>;
      const description = asString(candidate.description);
      if (!description) return null;
      return { description, icd10_code: asString(candidate.icd10_code) };
    })
    .filter((item): item is ClinicalNoteDiagnosis => item !== null);
}

export function normalizeClinicalNoteFollowUp(value: unknown): ClinicalNoteFollowUp[] {
  if (!Array.isArray(value)) return [];
  const validCategories = new Set<ClinicalNoteFollowUp['category']>([
    'lab_order',
    'referral',
    'appointment',
    'other',
  ]);
  return value
    .map((raw): ClinicalNoteFollowUp | null => {
      if (!raw || typeof raw !== 'object') return null;
      const candidate = raw as Record<string, unknown>;
      const action = asString(candidate.action);
      if (!action) return null;
      const category =
        typeof candidate.category === 'string' && validCategories.has(candidate.category as ClinicalNoteFollowUp['category'])
          ? (candidate.category as ClinicalNoteFollowUp['category'])
          : 'other';
      return { action, category };
    })
    .filter((item): item is ClinicalNoteFollowUp => item !== null);
}

export function normalizeSmartSuggestions(value: unknown): SmartSuggestion[] {
  if (!Array.isArray(value)) return [];
  const validKinds = new Set<SmartSuggestion['kind']>([
    'lab_order',
    'medication',
    'allergy',
    'referral',
    'follow_up',
  ]);
  return value
    .map((raw, index): SmartSuggestion | null => {
      if (!raw || typeof raw !== 'object') return null;
      const candidate = raw as Record<string, unknown>;
      const label = asString(candidate.label);
      if (!label) return null;
      const kind =
        typeof candidate.kind === 'string' && validKinds.has(candidate.kind as SmartSuggestion['kind'])
          ? (candidate.kind as SmartSuggestion['kind'])
          : 'follow_up';
      const suggestionValue =
        candidate.value && typeof candidate.value === 'object'
          ? (candidate.value as Record<string, unknown>)
          : {};
      return {
        id: asString(candidate.id) ?? `suggestion-${index}`,
        kind,
        label,
        detail: asString(candidate.detail),
        value: suggestionValue,
      };
    })
    .filter((item): item is SmartSuggestion => item !== null);
}

// ---------------------------------------------------------------------------
// Edge Function invocation
// ---------------------------------------------------------------------------

export interface ScribeTranscribeResult {
  transcript: ConsultationTranscript;
  durationSeconds: number;
  languageDetected: string | null;
}

export interface ScribeGenerateNoteResult {
  note: AiClinicalNote;
}

export interface ScribeSuggestionsResult {
  suggestions: SmartSuggestion[];
}

const getFriendlyScribeError = async (error: unknown): Promise<string> => {
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status;
    try {
      const body = await error.context.clone().json();
      if (body && typeof body.error === 'string' && body.error.trim().length > 0) {
        return body.error.trim();
      }
    } catch {
      // fall through to status messaging
    }
    if (status === 401 || status === 403) {
      return i18n.t('ai.errors.sessionExpired', {
        defaultValue: 'Your session expired while contacting the AI scribe. Refresh and try again.',
      });
    }
    if (status >= 500) {
      return i18n.t('ai.errors.serviceUnavailable', {
        defaultValue: 'The AI scribe service is temporarily unavailable. Please try again shortly.',
      });
    }
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return i18n.t('ai.errors.network', {
      defaultValue: 'We could not reach the AI scribe service. Check your connection and try again.',
    });
  }
  return i18n.t('ai.errors.generic', {
    defaultValue: 'We could not complete the AI scribe request. Please try again.',
  });
};

async function invokeScribe<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('consultation-scribe', { body });
  if (error) {
    throw new Error(await getFriendlyScribeError(error));
  }
  if (!data || typeof data !== 'object') {
    throw new Error(
      i18n.t('ai.errors.invalidScribeResponse', {
        defaultValue: 'The AI scribe returned an invalid response.',
      })
    );
  }
  return data as T;
}

export async function transcribeConsultation(input: {
  recordingId: string;
}): Promise<ScribeTranscribeResult> {
  const result = await invokeScribe<ScribeTranscribeResult>({
    task: 'transcribe',
    recordingId: input.recordingId,
  });
  return {
    ...result,
    transcript: {
      ...result.transcript,
      segments: normalizeTranscriptSegments(result.transcript?.segments),
    },
  };
}

export async function generateClinicalNote(input: {
  recordingId: string;
  promptTemplate?: ClinicalNotePromptTemplate;
  outputLanguage?: ClinicalNoteOutputLanguage;
  customInstructions?: string | null;
  transcriptOverride?: string | null;
}): Promise<ScribeGenerateNoteResult> {
  const result = await invokeScribe<ScribeGenerateNoteResult>({
    task: 'generate_note',
    recordingId: input.recordingId,
    promptTemplate: input.promptTemplate ?? 'general',
    outputLanguage: input.outputLanguage ?? 'en',
    customInstructions: input.customInstructions ?? null,
    transcriptOverride: input.transcriptOverride ?? null,
  });
  const note = result.note;
  return {
    note: {
      ...note,
      symptoms: asStringArray(note?.symptoms),
      medications: normalizeClinicalNoteMedications(note?.medications),
      diagnoses: normalizeClinicalNoteDiagnoses(note?.diagnoses),
      follow_up: normalizeClinicalNoteFollowUp(note?.follow_up),
      education_points: asStringArray(note?.education_points),
    },
  };
}

export async function extractSmartSuggestions(input: {
  recordingId: string;
}): Promise<ScribeSuggestionsResult> {
  const result = await invokeScribe<ScribeSuggestionsResult>({
    task: 'suggestions',
    recordingId: input.recordingId,
  });
  return { suggestions: normalizeSmartSuggestions(result.suggestions) };
}

// ---------------------------------------------------------------------------
// Live mode (near-real-time chunked Whisper + live cues)
// ---------------------------------------------------------------------------

const VALID_CUE_KINDS: ReadonlySet<LiveCueKind> = new Set(['question', 'red_flag', 'reminder']);

export function normalizeLiveCues(value: unknown): LiveCue[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw, index): LiveCue | null => {
      if (!raw || typeof raw !== 'object') return null;
      const candidate = raw as Record<string, unknown>;
      const text = asString(candidate.text);
      if (!text) return null;
      const kind =
        typeof candidate.kind === 'string' && VALID_CUE_KINDS.has(candidate.kind as LiveCueKind)
          ? (candidate.kind as LiveCueKind)
          : 'reminder';
      return { id: asString(candidate.id) ?? `cue-${index}`, kind, text };
    })
    .filter((cue): cue is LiveCue => cue !== null);
}

export interface LiveChunkResult {
  text: string;
  language: string | null;
}

/**
 * Send a single self-contained audio segment to the scribe Edge Function for a
 * Whisper pass. Used by live mode to build a near-real-time transcript.
 */
export async function transcribeLiveChunk(input: {
  recordingId: string;
  blob: Blob;
}): Promise<LiveChunkResult> {
  const formData = new FormData();
  formData.append('recordingId', input.recordingId);
  const extension = audioExtensionForMimeType(input.blob.type);
  formData.append('audio', input.blob, `chunk.${extension}`);

  const { data, error } = await supabase.functions.invoke('consultation-scribe', { body: formData });
  if (error) {
    throw new Error(await getFriendlyScribeError(error));
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    text: typeof payload.text === 'string' ? payload.text : '',
    language: typeof payload.language === 'string' ? payload.language : null,
  };
}

export async function fetchLiveCues(input: {
  recordingId: string;
  transcript: string;
}): Promise<{ cues: LiveCue[] }> {
  const result = await invokeScribe<{ cues: unknown }>({
    task: 'live_cues',
    recordingId: input.recordingId,
    transcript: input.transcript,
  });
  return { cues: normalizeLiveCues(result.cues) };
}

