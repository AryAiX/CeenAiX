import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CONSULTATION_AUDIO_BUCKET } from '../lib/consultation-scribe';
import type {
  AiClinicalNote,
  ConsultationConsentLog,
  ConsultationConsentMethod,
  ConsultationRecording,
  ConsultationRecordingMode,
  ConsultationScribeInputMode,
  ConsultationTranscript,
  ChannelAudioPaths,
  SpeakerReferenceAudioPaths,
  SpeakerChannelMap,
  TranscriptSegment,
} from '../types';
import { useQuery } from './use-query';

export interface ConsultationScribeData {
  recording: ConsultationRecording | null;
  transcript: ConsultationTranscript | null;
  note: AiClinicalNote | null;
  consent: ConsultationConsentLog | null;
}

export interface CreateRecordingInput {
  appointmentId: string;
  doctorId: string;
  patientId: string;
  clinicId: string | null;
  consentMethod: ConsultationConsentMethod;
  informedPatient: boolean;
  verbalConsent: boolean;
  signatureImageUrl: string | null;
  mode?: ConsultationRecordingMode;
  speakerChannelMap?: SpeakerChannelMap;
  audioChannelCount?: number | null;
  scribeInputMode?: ConsultationScribeInputMode;
  speakerReferencePaths?: SpeakerReferenceAudioPaths;
}

export interface ConsultationScribeActions {
  logEvent: (input: {
    recordingId: string | null;
    appointmentId: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  createRecording: (input: CreateRecordingInput) => Promise<ConsultationRecording>;
  attachAudioAndProcess: (input: {
    recordingId: string;
    appointmentId: string;
    audioStoragePath: string;
    audioMimeType: string;
    durationSeconds: number;
    speakerChannelMap?: SpeakerChannelMap;
    audioChannelCount?: number | null;
    channelAudioPaths?: ChannelAudioPaths;
    scribeInputMode?: ConsultationScribeInputMode;
    speakerReferencePaths?: SpeakerReferenceAudioPaths;
  }) => Promise<void>;
  discardRecording: (recording: ConsultationRecording) => Promise<void>;
  updateTranscriptSegments: (transcriptId: string, segments: TranscriptSegment[]) => Promise<void>;
  saveTranscriptText: (input: {
    recordingId: string;
    fullText: string;
    segments: TranscriptSegment[];
  }) => Promise<void>;
  markNoteApproved: (input: {
    recordingId: string;
    noteId: string;
    appointmentId: string;
    doctorId: string;
  }) => Promise<void>;
}

const fireAuditLog = async (input: {
  recordingId: string | null;
  appointmentId: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  // Audit writes are best-effort; never let logging block the clinical flow.
  await supabase.from('consultation_recordings_audit').insert({
    recording_id: input.recordingId,
    appointment_id: input.appointmentId,
    actor_id: user.id,
    action: input.action,
    metadata: input.metadata ?? {},
  });
};

const SPEAKER_REFERENCE_LABELS = {
  doctor: 'TX1',
  patient: 'TX2',
} as const;

const buildSourceAssignmentMetadata = (
  inputMode: ConsultationScribeInputMode,
  speakerReferencePaths?: SpeakerReferenceAudioPaths
) => ({
  scribeInputMode: inputMode,
  stereoSeparated: inputMode === 'stereo_separated',
  sourceAssignments: {
    doctor: 'TX1',
    patient: 'TX2',
  },
  speakerReferenceLabels: SPEAKER_REFERENCE_LABELS,
  speakerReferencePaths: speakerReferencePaths ?? {},
  speakerReferencesAttached: Boolean(speakerReferencePaths?.doctor && speakerReferencePaths.patient),
});

const speakerReferencePathsFromMetadata = (metadata: Record<string, unknown> | null | undefined): string[] => {
  const value = metadata?.speakerReferencePaths;
  if (!value || typeof value !== 'object') {
    return [];
  }
  const candidate = value as Partial<Record<'doctor' | 'patient', unknown>>;
  return [candidate.doctor, candidate.patient].filter(
    (path): path is string => typeof path === 'string' && path.length > 0
  );
};

export function useConsultationScribe(
  doctorUserId: string | null | undefined,
  appointmentId: string | null | undefined
) {
  const query = useQuery<ConsultationScribeData | null>(async () => {
    if (!doctorUserId || !appointmentId) {
      return null;
    }

    const { data: recordings, error: recordingError } = await supabase
      .from('consultation_recordings')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('doctor_id', doctorUserId)
      .eq('is_deleted', false)
      .neq('status', 'discarded')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recordingError) throw recordingError;

    const recording = (recordings?.[0] as ConsultationRecording | undefined) ?? null;
    if (!recording) {
      return { recording: null, transcript: null, note: null, consent: null };
    }

    const [
      { data: transcript, error: transcriptError },
      { data: notes, error: noteError },
      { data: consents, error: consentError },
    ] = await Promise.all([
      supabase.from('consultation_transcripts').select('*').eq('recording_id', recording.id).maybeSingle(),
      supabase
        .from('ai_clinical_notes')
        .select('*')
        .eq('recording_id', recording.id)
        .eq('is_deleted', false)
        .order('generated_at', { ascending: false })
        .limit(1),
      supabase
        .from('consultation_consent_log')
        .select('*')
        .eq('recording_id', recording.id)
        .order('consented_at', { ascending: false })
        .limit(1),
    ]);

    if (transcriptError) throw transcriptError;
    if (noteError) throw noteError;
    if (consentError) throw consentError;

    return {
      recording,
      transcript: (transcript as ConsultationTranscript | null) ?? null,
      note: ((notes ?? [])[0] as AiClinicalNote | undefined) ?? null,
      consent: ((consents ?? [])[0] as ConsultationConsentLog | undefined) ?? null,
    };
  }, [doctorUserId ?? '', appointmentId ?? '']);

  const logEvent = useCallback<ConsultationScribeActions['logEvent']>(async (input) => {
    await fireAuditLog(input);
  }, []);

  const createRecording = useCallback<ConsultationScribeActions['createRecording']>(async (input) => {
    const { data: recording, error } = await supabase
      .from('consultation_recordings')
      .insert({
        appointment_id: input.appointmentId,
        doctor_id: input.doctorId,
        patient_id: input.patientId,
        clinic_id: input.clinicId,
        status: 'recording',
        mode: input.mode ?? 'recorded',
        metadata: buildSourceAssignmentMetadata(input.scribeInputMode ?? 'voice_context', input.speakerReferencePaths),
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    const { error: consentError } = await supabase.from('consultation_consent_log').insert({
      appointment_id: input.appointmentId,
      recording_id: recording.id,
      doctor_id: input.doctorId,
      patient_id: input.patientId,
      consent_method: input.consentMethod,
      informed_patient: input.informedPatient,
      verbal_consent: input.verbalConsent,
      signature_image_url: input.signatureImageUrl,
    });
    if (consentError) throw consentError;

    await fireAuditLog({
      recordingId: recording.id,
      appointmentId: input.appointmentId,
      action: 'started',
      metadata: {
        consentMethod: input.consentMethod,
        mode: input.mode ?? 'recorded',
        speakerChannelMap: input.speakerChannelMap,
        audioChannelCount: input.audioChannelCount ?? null,
        ...buildSourceAssignmentMetadata(input.scribeInputMode ?? 'voice_context', input.speakerReferencePaths),
      },
    });

    return recording as ConsultationRecording;
  }, []);

  const attachAudioAndProcess = useCallback<ConsultationScribeActions['attachAudioAndProcess']>(
    async (input) => {
      const { error } = await supabase
        .from('consultation_recordings')
        .update({
          audio_storage_path: input.audioStoragePath,
          audio_mime_type: input.audioMimeType,
          duration_seconds: input.durationSeconds,
          ended_at: new Date().toISOString(),
          status: 'processing',
          metadata: buildSourceAssignmentMetadata(input.scribeInputMode ?? 'voice_context', input.speakerReferencePaths),
        })
        .eq('id', input.recordingId);
      if (error) throw error;

      await fireAuditLog({
        recordingId: input.recordingId,
        appointmentId: input.appointmentId,
        action: 'stopped',
        metadata: {
          durationSeconds: input.durationSeconds,
          speakerChannelMap: input.speakerChannelMap,
          audioChannelCount: input.audioChannelCount ?? null,
          channelAudioPaths: input.channelAudioPaths ?? {},
          ...buildSourceAssignmentMetadata(input.scribeInputMode ?? 'voice_context', input.speakerReferencePaths),
        },
      });
    },
    []
  );

  const discardRecording = useCallback<ConsultationScribeActions['discardRecording']>(
    async (recording) => {
      const storagePaths = [
        recording.audio_storage_path,
        ...speakerReferencePathsFromMetadata(recording.metadata),
      ].filter((path): path is string => typeof path === 'string' && path.length > 0);
      if (storagePaths.length > 0) {
        await supabase.storage.from(CONSULTATION_AUDIO_BUCKET).remove(storagePaths);
      }
      const { error } = await supabase
        .from('consultation_recordings')
        .update({ status: 'discarded', is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', recording.id);
      if (error) throw error;

      await fireAuditLog({
        recordingId: recording.id,
        appointmentId: recording.appointment_id,
        action: 'discarded',
      });
    },
    []
  );

  const updateTranscriptSegments = useCallback<ConsultationScribeActions['updateTranscriptSegments']>(
    async (transcriptId, segments) => {
      const { error } = await supabase
        .from('consultation_transcripts')
        .update({ segments })
        .eq('id', transcriptId);
      if (error) throw error;
    },
    []
  );

  const saveTranscriptText = useCallback<ConsultationScribeActions['saveTranscriptText']>(
    async (input) => {
      const { data: existing } = await supabase
        .from('consultation_transcripts')
        .select('id')
        .eq('recording_id', input.recordingId)
        .maybeSingle();
      const payload = {
        recording_id: input.recordingId,
        full_text: input.fullText,
        segments: input.segments,
        model_used: 'whisper-1-live',
      };
      const operation = existing
        ? supabase.from('consultation_transcripts').update(payload).eq('id', existing.id)
        : supabase.from('consultation_transcripts').insert(payload);
      const { error } = await operation;
      if (error) throw error;
    },
    []
  );

  const markNoteApproved = useCallback<ConsultationScribeActions['markNoteApproved']>(async (input) => {
    const now = new Date().toISOString();
    const { error: noteError } = await supabase
      .from('ai_clinical_notes')
      .update({ approved_by: input.doctorId, approved_at: now })
      .eq('id', input.noteId);
    if (noteError) throw noteError;

    const { error: recordingError } = await supabase
      .from('consultation_recordings')
      .update({ status: 'approved' })
      .eq('id', input.recordingId);
    if (recordingError) throw recordingError;

    await fireAuditLog({
      recordingId: input.recordingId,
      appointmentId: input.appointmentId,
      action: 'note_approved',
    });
  }, []);

  const actions: ConsultationScribeActions = {
    logEvent,
    createRecording,
    attachAudioAndProcess,
    discardRecording,
    updateTranscriptSegments,
    saveTranscriptText,
    markNoteApproved,
  };

  return { ...query, actions };
}
