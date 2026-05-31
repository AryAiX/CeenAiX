import type { Page, Route } from '@playwright/test';
import { e2eUsers } from './supabase-mock';

export const SCRIBE_APPOINTMENT_ID = '00000000-0000-4000-8000-000000000601';
export const SCRIBE_RECORDING_ID = '00000000-0000-4000-8000-0000000000a1';

const doctorId = e2eUsers.doctor.id;
const patientId = e2eUsers.patient.id;
const nowIso = new Date().toISOString();

export interface ScribeState {
  recording: Record<string, unknown> | null;
  transcript: Record<string, unknown> | null;
  note: Record<string, unknown> | null;
}

export const sampleTranscript = () => ({
  id: 'transcript-e2e',
  recording_id: SCRIBE_RECORDING_ID,
  full_text:
    'Doctor: What brings you in today? Patient: I have had chest tightness and a cough for three days.',
  segments: [
    { speaker: 'doctor', start_ms: 0, end_ms: 2200, text: 'What brings you in today?', confidence: 0.95 },
    {
      speaker: 'patient',
      start_ms: 2200,
      end_ms: 7000,
      text: 'I have had chest tightness and a cough for three days.',
      confidence: 0.42,
    },
  ],
  language: 'en',
  model_used: 'whisper-1',
  created_at: nowIso,
  updated_at: nowIso,
});

export const sampleNote = () => ({
  id: 'note-e2e',
  recording_id: SCRIBE_RECORDING_ID,
  appointment_id: SCRIBE_APPOINTMENT_ID,
  doctor_id: doctorId,
  patient_id: patientId,
  chief_complaint: 'Chest tightness and cough for three days.',
  soap_subjective: 'Patient reports three days of chest tightness and a productive cough.',
  soap_objective: 'Afebrile. Chest auscultation notable for mild wheeze.',
  soap_assessment: 'Likely acute bronchitis; rule out cardiac involvement.',
  soap_plan: 'Order ECG. Start supportive care. Review in one week.',
  symptoms: ['Chest tightness', 'Productive cough'],
  medications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', notes: null }],
  diagnoses: [{ description: 'Acute bronchitis', icd10_code: 'J20.9' }],
  follow_up: [{ action: 'Order ECG', category: 'lab_order' }],
  education_points: ['Stay hydrated', 'Return if breathing worsens'],
  output_language: 'en',
  model_used: 'gpt-4o',
  prompt_template: 'general',
  custom_instructions: null,
  generated_at: nowIso,
  approved_by: null,
  approved_at: null,
  is_deleted: false,
  deleted_at: null,
  created_at: nowIso,
  updated_at: nowIso,
});

export const sampleRecording = (status: string) => ({
  id: SCRIBE_RECORDING_ID,
  appointment_id: SCRIBE_APPOINTMENT_ID,
  doctor_id: doctorId,
  patient_id: patientId,
  clinic_id: null,
  audio_storage_path: `${doctorId}/${SCRIBE_APPOINTMENT_ID}/audio.webm`,
  audio_mime_type: 'audio/webm',
  duration_seconds: 42,
  language_detected: 'en',
  status,
  started_at: nowIso,
  ended_at: nowIso,
  is_deleted: false,
  deleted_at: null,
  created_at: nowIso,
  updated_at: nowIso,
});

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });

const noContent = (route: Route) =>
  route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });

export async function installScribeRoutes(page: Page, state: ScribeState) {
  await page.route('**/rest/v1/consultation_recordings*', async (route) => {
    const method = route.request().method();
    if (method === 'OPTIONS') return noContent(route);
    if (method === 'POST') {
      state.recording = sampleRecording('recording');
      return json(route, state.recording);
    }
    if (method === 'PATCH') {
      if (state.recording) {
        const patch = route.request().postDataJSON() as Record<string, unknown>;
        state.recording = { ...state.recording, ...patch };
      }
      return json(route, state.recording ?? {});
    }
    return json(route, state.recording ? [state.recording] : []);
  });

  await page.route('**/rest/v1/consultation_transcripts*', async (route) => {
    if (route.request().method() === 'OPTIONS') return noContent(route);
    return json(route, state.transcript);
  });

  await page.route('**/rest/v1/ai_clinical_notes*', async (route) => {
    const method = route.request().method();
    if (method === 'OPTIONS') return noContent(route);
    if (method === 'PATCH') {
      const patch = route.request().postDataJSON() as Record<string, unknown>;
      if (state.note && !(patch.is_deleted === true)) {
        state.note = { ...state.note, ...patch };
      }
      return json(route, state.note ?? {});
    }
    return json(route, state.note ? [state.note] : []);
  });

  await page.route('**/rest/v1/consultation_consent_log*', async (route) => {
    if (route.request().method() === 'OPTIONS') return noContent(route);
    return json(route, route.request().method() === 'GET' ? [] : {});
  });

  await page.route('**/rest/v1/consultation_recordings_audit*', async (route) => {
    if (route.request().method() === 'OPTIONS') return noContent(route);
    return json(route, route.request().method() === 'GET' ? [] : {});
  });

  await page.route('**/functions/v1/consultation-scribe', async (route) => {
    const contentType = route.request().headers()['content-type'] ?? '';
    if (contentType.includes('multipart/form-data')) {
      // Live audio chunk → canned transcript segment.
      return json(route, { text: 'Patient reports chest tightness and a cough.', language: 'en' });
    }
    const body = route.request().postDataJSON() as { task?: string };
    if (body.task === 'live_cues') {
      return json(route, {
        cues: [
          { kind: 'question', text: 'Ask whether the chest tightness radiates to the arm or jaw.' },
          { kind: 'red_flag', text: 'Chest tightness + cough — consider cardiac vs respiratory causes.' },
          { kind: 'reminder', text: 'Patient history notes a penicillin allergy.' },
        ],
      });
    }
    if (body.task === 'transcribe') {
      state.transcript = sampleTranscript();
      if (state.recording) state.recording = { ...state.recording, status: 'ready' };
      return json(route, { transcript: state.transcript, durationSeconds: 42, languageDetected: 'en' });
    }
    if (body.task === 'generate_note') {
      state.note = sampleNote();
      return json(route, { note: state.note });
    }
    if (body.task === 'suggestions') {
      return json(route, {
        suggestions: [
          { id: 's1', kind: 'lab_order', label: 'Order ECG', detail: 'Mentioned: chest tightness', value: { test_name: 'ECG' } },
          {
            id: 's2',
            kind: 'medication',
            label: 'Lisinopril 10mg',
            detail: 'Mentioned during visit',
            value: { name: 'Lisinopril' },
          },
        ],
      });
    }
    return json(route, {});
  });

  await page.route('**/storage/v1/object/consultation-audio/**', async (route) =>
    json(route, { Key: 'consultation-audio/upload', path: `${doctorId}/${SCRIBE_APPOINTMENT_ID}/audio.webm` })
  );
}
