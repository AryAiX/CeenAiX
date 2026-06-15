import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TaskType = 'transcribe' | 'generate_note' | 'suggestions' | 'live_transcribe_chunk' | 'live_cues';
type AudioInputChannel = 'left' | 'right';
type TranscriptSpeaker = 'doctor' | 'patient' | 'unknown';
type SpeakerChannelRole = Extract<TranscriptSpeaker, 'doctor' | 'patient'>;
type SpeakerChannelMap = Record<AudioInputChannel, SpeakerChannelRole>;
type ChannelAudioPaths = Partial<Record<AudioInputChannel, string>>;
type SpeakerReferencePaths = Partial<Record<SpeakerChannelRole, string>>;
type ConsultationScribeInputMode = 'stereo_separated' | 'voice_context';

interface RequestBody {
  task?: TaskType;
  recordingId?: string;
  promptTemplate?: string;
  outputLanguage?: string;
  customInstructions?: string | null;
  transcriptOverride?: string | null;
  transcript?: string | null;
  speakerChannelMap?: unknown;
  channelAudioPaths?: unknown;
  speakerReferencePaths?: unknown;
  audioChannelCount?: number | null;
  scribeInputMode?: unknown;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const AUDIO_EXTENSION_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

const fileNameForMime = (mime: string | null): string => {
  const ext = (mime && AUDIO_EXTENSION_BY_MIME[mime]) || 'webm';
  return `consultation.${ext}`;
};

const extractFirstJsonObject = (value: string): Record<string, unknown> => {
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('AI response did not include valid JSON.');
  }
  return JSON.parse(match[0]) as Record<string, unknown>;
};

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];

const DEFAULT_SPEAKER_CHANNEL_MAP: SpeakerChannelMap = { left: 'doctor', right: 'patient' };
const AUDIO_CHANNELS: readonly AudioInputChannel[] = ['left', 'right'];

const normalizeSpeakerChannelMap = (value: unknown): SpeakerChannelMap => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SPEAKER_CHANNEL_MAP;
  }
  const candidate = value as Record<AudioInputChannel, unknown>;
  const left = candidate.left === 'doctor' || candidate.left === 'patient' ? candidate.left : null;
  const right = candidate.right === 'doctor' || candidate.right === 'patient' ? candidate.right : null;
  if (!left || !right || left === right) {
    return DEFAULT_SPEAKER_CHANNEL_MAP;
  }
  return { left, right };
};

const parseSpeakerChannelMap = (value: FormDataEntryValue | null): SpeakerChannelMap | null => {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    return normalizeSpeakerChannelMap(JSON.parse(value));
  } catch {
    return null;
  }
};

const normalizeChannelAudioPaths = (value: unknown): ChannelAudioPaths => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const candidate = value as Record<AudioInputChannel, unknown>;
  return AUDIO_CHANNELS.reduce<ChannelAudioPaths>((acc, channel) => {
    const path = asString(candidate[channel]);
    if (path) {
      acc[channel] = path;
    }
    return acc;
  }, {});
};

const hasCompleteChannelAudioPaths = (paths: ChannelAudioPaths): paths is Record<AudioInputChannel, string> =>
  Boolean(paths.left && paths.right);

const normalizeSpeakerReferencePaths = (value: unknown): SpeakerReferencePaths => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const candidate = value as Record<SpeakerChannelRole, unknown>;
  const paths: SpeakerReferencePaths = {};
  const doctorPath = asString(candidate.doctor);
  const patientPath = asString(candidate.patient);
  if (doctorPath) {
    paths.doctor = doctorPath;
  }
  if (patientPath) {
    paths.patient = patientPath;
  }
  return paths;
};

const hasCompleteSpeakerReferencePaths = (
  paths: SpeakerReferencePaths
): paths is Record<SpeakerChannelRole, string> => Boolean(paths.doctor && paths.patient);

const normalizeScribeInputMode = (value: unknown): ConsultationScribeInputMode | null => {
  if (value === 'stereo_separated' || value === 'voice_context') {
    return value;
  }
  return null;
};

const speakerLabel = (speaker: TranscriptSpeaker): string => {
  if (speaker === 'doctor') return 'Doctor';
  if (speaker === 'patient') return 'Patient';
  return 'Speaker';
};

interface WhisperSegment {
  text?: string;
  start?: number;
  end?: number;
  no_speech_prob?: number;
  avg_logprob?: number;
}

interface TranscriptSegment {
  speaker: TranscriptSpeaker;
  start_ms: number;
  end_ms: number;
  text: string;
  confidence: number;
}

type VoiceReferenceTranscripts = Partial<Record<SpeakerChannelRole, string>>;

/**
 * Best-effort speaker diarization. Whisper does not perform diarization, so we
 * use a simple turn-taking heuristic: assume the visit opens with the doctor,
 * and flip the speaker whenever a segment ends with a question. The doctor can
 * correct any label in the transcript panel afterwards.
 */
const diarizeSegments = (segments: WhisperSegment[]): TranscriptSegment[] => {
  let speaker: 'doctor' | 'patient' = 'doctor';
  return segments
    .map((segment) => {
      const text = asString(segment.text);
      if (!text) return null;
      const current = speaker;
      if (text.endsWith('?') || text.endsWith('؟')) {
        speaker = speaker === 'doctor' ? 'patient' : 'doctor';
      }
      const confidence =
        typeof segment.avg_logprob === 'number'
          ? Math.max(0, Math.min(1, Math.exp(segment.avg_logprob)))
          : 1;
      return {
        speaker: current,
        start_ms: Math.round((segment.start ?? 0) * 1000),
        end_ms: Math.round((segment.end ?? segment.start ?? 0) * 1000),
        text,
        confidence,
      };
    })
    .filter((segment): segment is NonNullable<typeof segment> => segment !== null);
};

const segmentsForChannel = (
  payload: { text?: string; duration?: number; segments?: WhisperSegment[] },
  speaker: SpeakerChannelRole
): TranscriptSegment[] => {
  const whisperSegments = Array.isArray(payload.segments) ? payload.segments : [];
  const mappedSegments = whisperSegments
    .map((segment) => {
      const text = asString(segment.text);
      if (!text) return null;
      const confidence =
        typeof segment.avg_logprob === 'number'
          ? Math.max(0, Math.min(1, Math.exp(segment.avg_logprob)))
          : 1;
      return {
        speaker,
        start_ms: Math.round((segment.start ?? 0) * 1000),
        end_ms: Math.round((segment.end ?? segment.start ?? 0) * 1000),
        text,
        confidence,
      };
    })
    .filter((segment): segment is NonNullable<typeof segment> => segment !== null);

  if (mappedSegments.length > 0) {
    return mappedSegments;
  }

  const text = asString(payload.text);
  if (!text) {
    return [];
  }
  return [
    {
      speaker,
      start_ms: 0,
      end_ms: typeof payload.duration === 'number' ? Math.round(payload.duration * 1000) : 0,
      text,
      confidence: 1,
    },
  ];
};

async function transcribeAudioBlob(args: {
  openAiApiKey: string;
  audioBlob: Blob;
  mime: string;
}) {
  const formData = new FormData();
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('file', args.audioBlob, fileNameForMime(args.mime));

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${args.openAiApiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper transcription failed: ${errorText}`);
  }

  return (await response.json()) as {
    text?: string;
    language?: string;
    duration?: number;
    segments?: WhisperSegment[];
  };
}

type SupabaseClientLike = ReturnType<typeof createClient>;

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const mergeRecordingMetadata = (
  current: unknown,
  patch: Record<string, unknown>
): Record<string, unknown> => ({
  ...(asObject(current) ?? {}),
  ...patch,
});

async function transcribeSpeakerReferences(args: {
  openAiApiKey: string;
  adminClient: SupabaseClientLike;
  speakerReferencePaths: SpeakerReferencePaths;
  fallbackMime: string;
}): Promise<VoiceReferenceTranscripts> {
  const transcripts: VoiceReferenceTranscripts = {};
  const entries = Object.entries(args.speakerReferencePaths) as Array<[SpeakerChannelRole, string]>;

  await Promise.all(
    entries.map(async ([speaker, path]) => {
      const { data: referenceBlob, error } = await args.adminClient.storage
        .from('consultation-audio')
        .download(path);
      if (error) {
        throw error;
      }
      const payload = await transcribeAudioBlob({
        openAiApiKey: args.openAiApiKey,
        audioBlob: referenceBlob,
        mime: referenceBlob.type || args.fallbackMime,
      });
      const text = asString(payload.text);
      if (text) {
        transcripts[speaker] = text;
      }
    })
  );

  return transcripts;
}

async function relabelSegmentsWithVoiceReferences(args: {
  openAiApiKey: string;
  segments: TranscriptSegment[];
  referenceTranscripts: VoiceReferenceTranscripts;
}): Promise<TranscriptSegment[]> {
  if (args.segments.length === 0) {
    return args.segments;
  }

  const schema = '{"segments":[{"index":0,"speaker":"doctor|patient|unknown"}]}';
  const systemPrompt = [
    'You assign speaker labels for a doctor-patient consultation transcript.',
    'Doctor is TX1. Patient is TX2.',
    'Short setup reference samples were captured separately before the consultation and transcribed as text hints.',
    'Use the setup reference text and conversation context to choose Doctor, Patient, or unknown for each segment.',
    'Do not claim voice biometric matching or hardware signal separation; the browser provided mixed audio for the consultation.',
    'Only label a segment Doctor or Patient when supported by wording, role, turn context, or the reference text. Otherwise use unknown.',
    `Return strict JSON matching: ${schema}`,
  ].join('\n');

  const segmentLines = args.segments
    .map((segment, index) => `${index}. [${segment.start_ms}-${segment.end_ms}ms] ${segment.text}`)
    .join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            `Doctor / TX1 setup reference transcript: ${args.referenceTranscripts.doctor ?? 'not available'}`,
            `Patient / TX2 setup reference transcript: ${args.referenceTranscripts.patient ?? 'not available'}`,
            '',
            'Consultation segments:',
            segmentLines,
          ].join('\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Voice-reference speaker labeling failed: ${errorText}`);
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    return args.segments;
  }

  const parsed = extractFirstJsonObject(content);
  const labels = Array.isArray(parsed.segments) ? parsed.segments : [];
  const speakerByIndex = new Map<number, TranscriptSpeaker>();
  labels.forEach((raw) => {
    const item = asObject(raw);
    const index = typeof item?.index === 'number' ? item.index : null;
    const speaker = item?.speaker;
    if (
      index !== null &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < args.segments.length &&
      (speaker === 'doctor' || speaker === 'patient' || speaker === 'unknown')
    ) {
      speakerByIndex.set(index, speaker);
    }
  });

  return args.segments.map((segment, index) => ({
    ...segment,
    speaker: speakerByIndex.get(index) ?? segment.speaker,
  }));
}

const loadRecordingForDoctor = async (
  adminClient: SupabaseClientLike,
  recordingId: string,
  doctorId: string
) => {
  const { data, error } = await adminClient
    .from('consultation_recordings')
    .select('*')
    .eq('id', recordingId)
    .eq('doctor_id', doctorId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const logAudit = async (
  adminClient: SupabaseClientLike,
  entry: { recordingId: string | null; appointmentId: string | null; actorId: string; action: string; metadata?: Record<string, unknown>; ip?: string | null }
) => {
  await adminClient.from('consultation_recordings_audit').insert({
    recording_id: entry.recordingId,
    appointment_id: entry.appointmentId,
    actor_id: entry.actorId,
    action: entry.action,
    metadata: entry.metadata ?? {},
    ip_address: entry.ip ?? null,
  });
};

async function runTranscription(args: {
  openAiApiKey: string;
  adminClient: SupabaseClientLike;
  recording: Record<string, unknown>;
  speakerChannelMap: SpeakerChannelMap | null;
  channelAudioPaths: ChannelAudioPaths;
  speakerReferencePaths: SpeakerReferencePaths;
  scribeInputMode: ConsultationScribeInputMode;
}) {
  const recording = args.recording;
  const storagePath = asString(recording.audio_storage_path);
  if (!storagePath) {
    throw new Error('This recording has no uploaded audio to transcribe.');
  }

  const { data: audioBlob, error: downloadError } = await args.adminClient.storage
    .from('consultation-audio')
    .download(storagePath);
  if (downloadError) {
    throw downloadError;
  }

  const mime = asString(recording.audio_mime_type) ?? audioBlob.type ?? 'audio/webm';
  const channelMap = args.speakerChannelMap;
  const useChannelSplit = Boolean(
    args.scribeInputMode === 'stereo_separated' &&
    channelMap &&
    hasCompleteChannelAudioPaths(args.channelAudioPaths)
  );
  let fullText = '';
  let language: string | null = null;
  let durationSeconds = 0;
  let segments: TranscriptSegment[] = [];
  let modelUsed = 'whisper-1';
  let referenceTranscripts: VoiceReferenceTranscripts = {};
  let voiceReferenceLabelingApplied = false;
  let voiceReferenceLabelingError: string | null = null;

  if (useChannelSplit && channelMap && hasCompleteChannelAudioPaths(args.channelAudioPaths)) {
    const channelPayloads = await Promise.all(
      AUDIO_CHANNELS.map(async (channel) => {
        const path = args.channelAudioPaths[channel];
        const { data: channelBlob, error } = await args.adminClient.storage
          .from('consultation-audio')
          .download(path);
        if (error) {
          throw error;
        }
        const payload = await transcribeAudioBlob({
          openAiApiKey: args.openAiApiKey,
          audioBlob: channelBlob,
          mime: channelBlob.type || mime,
        });
        return { channel, payload };
      })
    );
    segments = channelPayloads
      .flatMap(({ channel, payload }) => segmentsForChannel(payload, channelMap[channel]))
      .sort((a, b) => a.start_ms - b.start_ms || speakerLabel(a.speaker).localeCompare(speakerLabel(b.speaker)));
    fullText = segments.map((segment) => `${speakerLabel(segment.speaker)}: ${segment.text}`).join('\n');
    language = asString(channelPayloads.find(({ payload }) => asString(payload.language))?.payload.language);
    durationSeconds = Math.max(
      ...channelPayloads.map(({ payload }) => (typeof payload.duration === 'number' ? Math.round(payload.duration) : 0)),
      0
    );
    modelUsed = 'whisper-1-channel-split';
  } else {
    const payload = await transcribeAudioBlob({
      openAiApiKey: args.openAiApiKey,
      audioBlob,
      mime,
    });
    fullText = asString(payload.text) ?? '';
    language = asString(payload.language);
    durationSeconds = typeof payload.duration === 'number' ? Math.round(payload.duration) : 0;
    segments = diarizeSegments(Array.isArray(payload.segments) ? payload.segments : []);
    if (hasCompleteSpeakerReferencePaths(args.speakerReferencePaths) && segments.length > 0) {
      try {
        referenceTranscripts = await transcribeSpeakerReferences({
          openAiApiKey: args.openAiApiKey,
          adminClient: args.adminClient,
          speakerReferencePaths: args.speakerReferencePaths,
          fallbackMime: mime,
        });
        segments = await relabelSegmentsWithVoiceReferences({
          openAiApiKey: args.openAiApiKey,
          segments,
          referenceTranscripts,
        });
        fullText = segments.map((segment) => `${speakerLabel(segment.speaker)}: ${segment.text}`).join('\n');
        modelUsed = 'whisper-1-voice-reference-context';
        voiceReferenceLabelingApplied = true;
      } catch (error) {
        voiceReferenceLabelingError = error instanceof Error ? error.message : 'Voice-reference labeling failed.';
      }
    }
  }

  const { data: existingTranscript } = await args.adminClient
    .from('consultation_transcripts')
    .select('id')
    .eq('recording_id', recording.id)
    .maybeSingle();

  const transcriptPayload = {
    recording_id: recording.id,
    full_text: fullText,
    segments,
    language,
    model_used: modelUsed,
  };

  const { data: transcript, error: transcriptError } = existingTranscript
    ? await args.adminClient
        .from('consultation_transcripts')
        .update(transcriptPayload)
        .eq('id', existingTranscript.id)
        .select('*')
        .single()
    : await args.adminClient
        .from('consultation_transcripts')
        .insert(transcriptPayload)
        .select('*')
        .single();

  if (transcriptError) {
    throw transcriptError;
  }

  await args.adminClient
    .from('consultation_recordings')
    .update({
      language_detected: language,
      duration_seconds: durationSeconds || recording.duration_seconds || 0,
      status: 'ready',
      metadata: mergeRecordingMetadata(recording.metadata, {
        scribeInputMode: args.scribeInputMode,
        stereoSeparated: useChannelSplit,
        channelAudioPaths: useChannelSplit ? args.channelAudioPaths : {},
        speakerReferencePaths: args.speakerReferencePaths,
        speakerReferenceLabels: { doctor: 'TX1', patient: 'TX2' },
        speakerReferencesAttached: hasCompleteSpeakerReferencePaths(args.speakerReferencePaths),
        voiceReferenceLabeling: {
          applied: voiceReferenceLabelingApplied,
          providerLevelVoiceEmbeddings: false,
          error: voiceReferenceLabelingError,
          referenceTranscriptsAvailable: {
            doctor: Boolean(referenceTranscripts.doctor),
            patient: Boolean(referenceTranscripts.patient),
          },
        },
      }),
    })
    .eq('id', recording.id);

  return { transcript, durationSeconds, languageDetected: language };
}

const loadPatientHistoryContext = async (adminClient: SupabaseClientLike, patientId: string) => {
  const [{ data: conditions }, { data: allergies }] = await Promise.all([
    adminClient
      .from('medical_conditions')
      .select('condition_name, status')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
    adminClient
      .from('allergies')
      .select('allergen, severity, reaction')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
  ]);

  const conditionLines = (conditions ?? [])
    .map((row) => [row.condition_name, row.status].filter(Boolean).join(' | '))
    .filter(Boolean);
  const allergyLines = (allergies ?? [])
    .map((row) => [row.allergen, row.severity, row.reaction].filter(Boolean).join(' | '))
    .filter(Boolean);

  return [
    conditionLines.length ? `Known conditions:\n- ${conditionLines.join('\n- ')}` : 'Known conditions: none recorded',
    allergyLines.length ? `Known allergies:\n- ${allergyLines.join('\n- ')}` : 'Known allergies: none recorded',
  ].join('\n\n');
};

const templateGuidance = (template: string): string => {
  switch (template) {
    case 'pediatric':
      return 'This is a pediatric consultation. Use age-appropriate framing, include weight-based dosing considerations when mentioned, and note caregiver instructions.';
    case 'cardiology':
      return 'This is a cardiology-focused consultation. Emphasize cardiovascular history, risk factors, ECG/echo findings, and cardiac medications.';
    case 'brief':
      return 'Produce a concise note. Keep each SOAP section to 1-3 short sentences.';
    default:
      return 'Produce a standard, thorough general-practice SOAP note.';
  }
};

async function runNoteGeneration(args: {
  openAiApiKey: string;
  adminClient: SupabaseClientLike;
  recording: Record<string, unknown>;
  promptTemplate: string;
  outputLanguage: string;
  customInstructions: string | null;
  transcriptOverride: string | null;
  actorId: string;
}) {
  const recording = args.recording;

  let transcriptText = asString(args.transcriptOverride);
  if (!transcriptText) {
    const { data: transcript, error } = await args.adminClient
      .from('consultation_transcripts')
      .select('full_text')
      .eq('recording_id', recording.id)
      .maybeSingle();
    if (error) throw error;
    transcriptText = asString(transcript?.full_text);
  }

  if (!transcriptText) {
    throw new Error('No transcript is available to generate a clinical note.');
  }

  const patientHistory = await loadPatientHistoryContext(
    args.adminClient,
    recording.patient_id as string
  );
  const outputLanguage = args.outputLanguage === 'ar' ? 'ar' : 'en';
  const languageInstruction =
    outputLanguage === 'ar'
      ? 'Write all free-text fields in Modern Standard Arabic.'
      : 'Write all free-text fields in English.';

  const schema =
    '{"chief_complaint":"string","soap":{"subjective":"string","objective":"string","assessment":"string","plan":"string"},"symptoms":["string"],"medications":[{"name":"string","dosage":"string|null","frequency":"string|null","notes":"string|null"}],"diagnoses":[{"description":"string","icd10_code":"string|null"}],"follow_up":[{"action":"string","category":"lab_order|referral|appointment|other"}],"education_points":["string"]}';

  const systemPrompt = [
    'You are a clinical scribe assistant for a UAE-licensed physician.',
    'Given a consultation transcript, produce a structured clinical note in SOAP format.',
    'Use the patient\'s chief complaint as stated. Do not invent symptoms, diagnoses, or medications that are not mentioned in the transcript.',
    'Only include an ICD-10 code when you are highly confident; otherwise set icd10_code to null.',
    templateGuidance(args.promptTemplate),
    languageInstruction,
    args.customInstructions ? `Additional doctor instruction: ${args.customInstructions}` : '',
    `Return strict JSON matching this schema: ${schema}`,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: ['Patient history context:', patientHistory, '', 'Consultation transcript:', transcriptText].join('\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clinical note generation failed: ${errorText}`);
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('The AI returned an empty clinical note.');
  }

  const parsed = extractFirstJsonObject(content);
  const soap = (parsed.soap && typeof parsed.soap === 'object' ? parsed.soap : {}) as Record<string, unknown>;

  const notePayload = {
    recording_id: recording.id,
    appointment_id: recording.appointment_id,
    doctor_id: recording.doctor_id,
    patient_id: recording.patient_id,
    chief_complaint: asString(parsed.chief_complaint),
    soap_subjective: asString(soap.subjective),
    soap_objective: asString(soap.objective),
    soap_assessment: asString(soap.assessment),
    soap_plan: asString(soap.plan),
    symptoms: asStringArray(parsed.symptoms),
    medications: Array.isArray(parsed.medications) ? parsed.medications : [],
    diagnoses: Array.isArray(parsed.diagnoses) ? parsed.diagnoses : [],
    follow_up: Array.isArray(parsed.follow_up) ? parsed.follow_up : [],
    education_points: asStringArray(parsed.education_points),
    output_language: outputLanguage,
    model_used: 'gpt-4o',
    prompt_template: args.promptTemplate,
    custom_instructions: args.customInstructions,
    generated_at: new Date().toISOString(),
  };

  // Regeneration supersedes any prior active note for this recording.
  await args.adminClient
    .from('ai_clinical_notes')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('recording_id', recording.id)
    .eq('is_deleted', false);

  const { data: note, error: noteError } = await args.adminClient
    .from('ai_clinical_notes')
    .insert(notePayload)
    .select('*')
    .single();

  if (noteError) {
    throw noteError;
  }

  await args.adminClient
    .from('consultation_recordings')
    .update({ status: 'ready' })
    .eq('id', recording.id);

  await logAudit(args.adminClient, {
    recordingId: recording.id as string,
    appointmentId: recording.appointment_id as string,
    actorId: args.actorId,
    action: 'note_generated',
    metadata: { promptTemplate: args.promptTemplate, outputLanguage },
  });

  return { note };
}

async function runSuggestions(args: {
  openAiApiKey: string;
  adminClient: SupabaseClientLike;
  recording: Record<string, unknown>;
}) {
  const { data: transcript } = await args.adminClient
    .from('consultation_transcripts')
    .select('full_text')
    .eq('recording_id', args.recording.id)
    .maybeSingle();

  const transcriptText = asString(transcript?.full_text);
  if (!transcriptText) {
    return { suggestions: [] };
  }

  const schema =
    '{"suggestions":[{"kind":"lab_order|medication|allergy|referral|follow_up","label":"string","detail":"string|null","value":{}}]}';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You scan consultation transcripts for actionable clinical items a doctor may want to add to the chart.',
            'Return only items explicitly supported by the transcript.',
            'kind must be one of: lab_order (a test the doctor may order), medication (a drug + dose mentioned), allergy (a stated allergy), referral (a suggested specialist), follow_up (a next step).',
            'For medication, set value to {"name","dosage","frequency"}. For lab_order, set value to {"test_name"}. For allergy, set value to {"allergen","reaction"}.',
            `Return strict JSON matching: ${schema}`,
          ].join('\n'),
        },
        { role: 'user', content: ['Consultation transcript:', transcriptText].join('\n') },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Smart suggestion extraction failed: ${errorText}`);
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    return { suggestions: [] };
  }

  const parsed = extractFirstJsonObject(content);
  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  return { suggestions };
}


async function runLiveChunkTranscription(args: {
  openAiApiKey: string;
  file: File;
  speaker: TranscriptSpeaker;
}) {
  const formData = new FormData();
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('file', args.file, args.file.name || 'chunk.webm');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${args.openAiApiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Live chunk transcription failed: ${errorText}`);
  }

  const payload = (await response.json()) as { text?: string; language?: string };
  return {
    text: typeof payload.text === 'string' ? payload.text.trim() : '',
    language: typeof payload.language === 'string' ? payload.language : null,
    speaker: args.speaker,
  };
}

async function runLiveCues(args: {
  openAiApiKey: string;
  adminClient: SupabaseClientLike;
  recording: Record<string, unknown>;
  transcript: string;
}) {
  const transcriptText = asString(args.transcript);
  if (!transcriptText) {
    return { cues: [] };
  }

  const patientHistory = await loadPatientHistoryContext(args.adminClient, args.recording.patient_id as string);
  const schema = '{"cues":[{"kind":"question|red_flag|reminder","text":"string"}]}';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are a real-time clinical copilot listening to a live doctor-patient consultation.',
            'Using the running transcript and the patient history, surface a few concise, high-value cues for the doctor.',
            'kind must be one of: question (a useful follow-up question to ask now), red_flag (a safety concern to consider), reminder (a relevant fact from the patient history).',
            'Only use information supported by the transcript or the provided patient history. Do not invent facts. Do not give definitive diagnoses.',
            'Return at most 5 cues, shortest first. If nothing is useful yet, return an empty array.',
            `Return strict JSON matching: ${schema}`,
          ].join('\n'),
        },
        {
          role: 'user',
          content: ['Patient history context:', patientHistory, '', 'Live transcript so far:', transcriptText].join('\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Live cue generation failed: ${errorText}`);
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    return { cues: [] };
  }
  const parsed = extractFirstJsonObject(content);
  const cues = Array.isArray(parsed.cues) ? parsed.cues : [];
  return { cues };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: 'Supabase Edge Function environment is not configured correctly.' }, 500);
    }
    if (!openAiApiKey) {
      return json({ error: 'OPENAI_API_KEY is not configured for consultation-scribe.' }, 500);
    }

    const authHeader = request.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return json({ error: authError?.message ?? 'Authentication required.' }, 401);
    }
    const doctorId = authData.user.id;

    const contentType = request.headers.get('content-type') ?? '';

    // Live audio chunks arrive as multipart/form-data so we can stream raw bytes
    // straight to Whisper without a storage round-trip.
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const recordingId = form.get('recordingId');
      const audio = form.get('audio');
      const sourceChannel = form.get('sourceChannel');
      const speakerChannelMap = parseSpeakerChannelMap(form.get('speakerChannelMap'));
      if (typeof recordingId !== 'string') {
        return json({ error: 'recordingId is required.' }, 400);
      }
      const recording = await loadRecordingForDoctor(adminClient, recordingId, doctorId);
      if (!recording) {
        return json({ error: 'Recording not found or you are not the treating doctor.' }, 403);
      }
      if (!(audio instanceof File)) {
        return json({ error: 'audio chunk is required.' }, 400);
      }
      const speaker =
        speakerChannelMap &&
        (sourceChannel === 'left' || sourceChannel === 'right')
          ? speakerChannelMap[sourceChannel]
          : 'unknown';
      const result = await runLiveChunkTranscription({ openAiApiKey, file: audio, speaker });
      return json(result);
    }

    const body = (await request.json()) as RequestBody;
    if (!body.recordingId) {
      return json({ error: 'recordingId is required.' }, 400);
    }

    const recording = await loadRecordingForDoctor(adminClient, body.recordingId, doctorId);
    if (!recording) {
      return json({ error: 'Recording not found or you are not the treating doctor.' }, 403);
    }

    const ip = request.headers.get('x-forwarded-for');
    const speakerChannelMap = normalizeSpeakerChannelMap(body.speakerChannelMap);
    const channelAudioPaths = normalizeChannelAudioPaths(body.channelAudioPaths);
    const speakerReferencePaths = normalizeSpeakerReferencePaths(body.speakerReferencePaths);
    const audioChannelCount = typeof body.audioChannelCount === 'number' ? body.audioChannelCount : null;
    const scribeInputMode =
      normalizeScribeInputMode(body.scribeInputMode) ??
      (hasCompleteChannelAudioPaths(channelAudioPaths) ? 'stereo_separated' : 'voice_context');
    const channelSplitApplied = scribeInputMode === 'stereo_separated' && hasCompleteChannelAudioPaths(channelAudioPaths);

    if (body.task === 'live_cues') {
      const result = await runLiveCues({
        openAiApiKey,
        adminClient,
        recording,
        transcript: typeof body.transcript === 'string' ? body.transcript : '',
      });
      return json(result);
    }

    if (body.task === 'transcribe') {
      await adminClient
        .from('consultation_recordings')
        .update({ status: 'processing' })
        .eq('id', recording.id);
      const result = await runTranscription({
        openAiApiKey,
        adminClient,
        recording,
        speakerChannelMap,
        channelAudioPaths,
        speakerReferencePaths,
        scribeInputMode,
      });
      await logAudit(adminClient, {
        recordingId: recording.id as string,
        appointmentId: recording.appointment_id as string,
        actorId: doctorId,
        action: 'transcribed',
        metadata: {
          language: result.languageDetected,
          durationSeconds: result.durationSeconds,
          speakerChannelMap,
          audioChannelCount,
          channelSplitApplied,
          scribeInputMode,
          stereoSeparated: scribeInputMode === 'stereo_separated',
          speakerReferencePaths,
          speakerReferencesAttached: hasCompleteSpeakerReferencePaths(speakerReferencePaths),
          sourceAssignments: {
            doctor: 'TX1',
            patient: 'TX2',
          },
        },
        ip,
      });
      return json(result);
    }

    if (body.task === 'generate_note') {
      const result = await runNoteGeneration({
        openAiApiKey,
        adminClient,
        recording,
        promptTemplate: typeof body.promptTemplate === 'string' ? body.promptTemplate : 'general',
        outputLanguage: typeof body.outputLanguage === 'string' ? body.outputLanguage : 'en',
        customInstructions: typeof body.customInstructions === 'string' ? body.customInstructions : null,
        transcriptOverride: typeof body.transcriptOverride === 'string' ? body.transcriptOverride : null,
        actorId: doctorId,
      });
      return json(result);
    }

    if (body.task === 'suggestions') {
      const result = await runSuggestions({ openAiApiKey, adminClient, recording });
      return json(result);
    }

    return json({ error: 'Unsupported consultation-scribe task.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown consultation-scribe failure.';
    return json({ error: message }, 500);
  }
});
