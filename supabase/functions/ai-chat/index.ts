import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import {
  buildEvidenceItems,
  createPromptContext,
  createSuggestedActions,
  planPatientRetrieval,
  type EvidenceItem,
  type PatientRetrievalBundle,
} from '../_shared/ai-chat-retrieval.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AiChatFileAttachment {
  type: 'uploaded_file';
  bucket: 'medical-files';
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
}

interface AiChatAction {
  type: 'navigate';
  label: string;
  href: string;
}

interface AiChatAssistantMetadata {
  type: 'response_metadata';
  intent: string;
  usedPatientContext: boolean;
  mode: 'chat' | 'previsit';
  recommendedSpecialty: string | null;
  evidence: EvidenceItem[];
  suggestedActions: AiChatAction[];
  nextAppointmentId: string | null;
  nextAppointmentLabel: string | null;
}

type AiChatStoredAttachment = AiChatFileAttachment | AiChatAssistantMetadata;

interface AiChatRequestBody {
  message?: string;
  sessionId?: string | null;
  attachments?: AiChatStoredAttachment[];
  usePatientContext?: boolean;
  mode?: 'chat' | 'previsit';
  appointmentId?: string | null;
}

interface PatientContextSummary {
  conditionsCount: number;
  allergiesCount: number;
  activeMedicationCount: number;
  recentAppointmentsCount: number;
  labResultCount: number;
}

interface LoadedPatientContext {
  summary: PatientContextSummary;
  promptContext: string;
  assistantMetadata: AiChatAssistantMetadata;
}

interface ExtractedPatientMemoryFact {
  memoryKey: string;
  label: string;
  valueType: 'text' | 'text_list' | 'boolean' | 'number' | 'date' | 'json';
  valueText: string | null;
  valueJson: unknown;
  confidence: number;
  usableInForms: boolean;
}

interface CurrentCanonicalRecordState {
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
  city: string | null;
  bloodType: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  activeConditions: string[];
  allergies: string[];
  currentMedications: string[];
}

interface ExtractedCanonicalUpdateCandidate {
  targetField:
    | 'profile.full_name'
    | 'profile.date_of_birth'
    | 'profile.gender'
    | 'profile.address'
    | 'profile.phone'
    | 'profile.city'
    | 'patient.blood_type'
    | 'patient.emergency_contact'
    | 'medical_conditions.active'
    | 'allergies.active'
    | 'medications.current';
  confidence: number;
  proposedValue:
    | { value: string | null }
    | { name: string | null; phone: string | null }
    | { values: string[] };
}

const SYSTEM_PROMPT = `You are the CeenAiX patient AI assistant for a healthcare platform.

Patient history retrieval is the default for authenticated patient chat, even when the user does not explicitly ask about their history.
Ground your answer in the supplied evidence pack when it is relevant.
Be clear, calm, and concise.
Do not invent medications, diagnoses, lab results, appointments, or document contents.
If information is missing, say so plainly.
Do not claim certainty for diagnosis or emergency triage.
For urgent red-flag symptoms, tell the patient to seek immediate clinical help or emergency care.
Remind the patient that the answer is AI-generated when the situation is clinically sensitive.
If the user is preparing for an appointment, help them with a practical pre-visit assessment and summarize useful questions for the doctor when appropriate.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const extractFirstJsonObject = (value: string) => {
  const match = value.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error('AI response did not include valid JSON.');
  }

  return JSON.parse(match[0]);
};

const normalizeNullableText = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
};

const normalizeTextList = (values: string[]) =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.toLowerCase())
    )
  ).sort();

const sameScalarValue = (left: string | null | undefined, right: string | null | undefined) =>
  normalizeNullableText(left)?.toLowerCase() === normalizeNullableText(right)?.toLowerCase();

const sameListValue = (left: string[], right: string[]) => {
  const leftValues = normalizeTextList(left);
  const rightValues = normalizeTextList(right);
  return leftValues.length === rightValues.length && leftValues.every((value, index) => value === rightValues[index]);
};

const sameEmergencyContactValue = (
  left: { name: string | null; phone: string | null },
  right: { name: string | null; phone: string | null }
) =>
  sameScalarValue(left.name, right.name) && sameScalarValue(left.phone, right.phone);

const normalizeMemoryKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const formatDate = (value: string | null) => {
  if (!value) {
    return 'unknown date';
  }

  return new Date(value).toISOString().slice(0, 10);
};

const isFileAttachment = (value: unknown): value is AiChatFileAttachment => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AiChatFileAttachment>;
  return (
    candidate.type === 'uploaded_file' &&
    candidate.bucket === 'medical-files' &&
    typeof candidate.path === 'string' &&
    typeof candidate.fileName === 'string' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.size === 'number'
  );
};

const sanitizeIncomingAttachments = (attachments: unknown): AiChatFileAttachment[] => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.filter(isFileAttachment);
};

async function extractPatientMemoryFacts(args: {
  openAiApiKey: string | null;
  message: string;
  recentUserMessages: string[];
}) {
  if (!args.openAiApiKey) {
    return [] as ExtractedPatientMemoryFact[];
  }

  const prompt = [
    'Extract reusable patient-stated facts from this authenticated healthcare chat turn.',
    'Return only JSON with this exact shape:',
    '{"facts":[{"memoryKey":"string","label":"string","valueType":"text|text_list|boolean|number|date|json","valueText":"string|null","valueJson":null,"confidence":0.0,"usableInForms":true}]}',
    'Only include first-person facts the patient states about themselves.',
    'Good examples: symptom duration, symptom onset, symptom location, current pain severity, worst pain severity, associated symptoms, triggers, relievers, family history, surgical history, smoking status, pregnancy status.',
    'Do not extract diagnoses, clinician recommendations, or anything not explicitly stated by the patient.',
    'Use stable snake_case memoryKey values for semantically reusable facts.',
    'Examples: "How long have you had this pain?" -> "symptom_duration"; "Duration of symptoms" -> "symptom_duration".',
    'Keep near-miss concepts separate, such as current pain severity vs worst pain severity, and family history vs personal history.',
    `Recent patient context: ${args.recentUserMessages.slice(-2).join(' | ') || 'none'}`,
    `Current patient message: ${args.message}`,
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    return [] as ExtractedPatientMemoryFact[];
  }

  try {
    const responseJson = await response.json();
    const outputText =
      typeof responseJson.output_text === 'string'
        ? responseJson.output_text
        : Array.isArray(responseJson.output)
          ? responseJson.output
              .flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
              .map((item: { text?: string }) => item.text ?? '')
              .join('\n')
          : '';
    const parsed = extractFirstJsonObject(outputText) as { facts?: unknown };
    const facts = Array.isArray(parsed.facts) ? parsed.facts : [];

    return facts
      .map((fact) => {
        if (!fact || typeof fact !== 'object') {
          return null;
        }

        const candidate = fact as {
          memoryKey?: unknown;
          label?: unknown;
          valueType?: unknown;
          valueText?: unknown;
          valueJson?: unknown;
          confidence?: unknown;
          usableInForms?: unknown;
        };
        const memoryKey =
          typeof candidate.memoryKey === 'string' ? normalizeMemoryKey(candidate.memoryKey) : '';
        const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
        const valueType =
          candidate.valueType === 'text_list' ||
          candidate.valueType === 'boolean' ||
          candidate.valueType === 'number' ||
          candidate.valueType === 'date' ||
          candidate.valueType === 'json'
            ? candidate.valueType
            : 'text';
        const valueText =
          typeof candidate.valueText === 'string' && candidate.valueText.trim() ? candidate.valueText.trim() : null;
        const confidence =
          typeof candidate.confidence === 'number'
            ? Math.max(0, Math.min(1, candidate.confidence))
            : 0.6;

        if (!memoryKey || !label) {
          return null;
        }

        const hasValue =
          Boolean(valueText) ||
          (Array.isArray(candidate.valueJson) && candidate.valueJson.length > 0) ||
          typeof candidate.valueJson === 'number' ||
          typeof candidate.valueJson === 'boolean' ||
          (candidate.valueJson && typeof candidate.valueJson === 'object');

        if (!hasValue) {
          return null;
        }

        return {
          memoryKey,
          label,
          valueType,
          valueText,
          valueJson: candidate.valueJson ?? null,
          confidence,
          usableInForms: candidate.usableInForms !== false,
        } satisfies ExtractedPatientMemoryFact;
      })
      .filter((fact): fact is ExtractedPatientMemoryFact => Boolean(fact));
  } catch {
    return [] as ExtractedPatientMemoryFact[];
  }
}

async function loadCurrentCanonicalRecordState(
  adminClient: ReturnType<typeof createClient>,
  patientId: string
): Promise<CurrentCanonicalRecordState> {
  const [
    { data: userProfile, error: userProfileError },
    { data: patientProfile, error: patientProfileError },
    { data: conditions, error: conditionsError },
    { data: allergies, error: allergiesError },
    { data: prescriptions, error: prescriptionsError },
    { data: reportedMedications, error: reportedMedicationsError },
  ] = await Promise.all([
    adminClient
      .from('user_profiles')
      .select('full_name, date_of_birth, gender, address, phone, city')
      .eq('user_id', patientId)
      .maybeSingle(),
    adminClient
      .from('patient_profiles')
      .select('blood_type, emergency_contact_name, emergency_contact_phone')
      .eq('user_id', patientId)
      .maybeSingle(),
    adminClient
      .from('medical_conditions')
      .select('condition_name, status')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
    adminClient
      .from('allergies')
      .select('allergen')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
    adminClient
      .from('prescriptions')
      .select('id, status')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
    adminClient
      .from('patient_reported_medications')
      .select('medication_name')
      .eq('patient_id', patientId)
      .eq('is_current', true)
      .eq('is_deleted', false),
  ]);

  if (userProfileError) {
    throw userProfileError;
  }

  if (patientProfileError) {
    throw patientProfileError;
  }

  if (conditionsError) {
    throw conditionsError;
  }

  if (allergiesError) {
    throw allergiesError;
  }

  if (prescriptionsError) {
    throw prescriptionsError;
  }

  if (reportedMedicationsError) {
    throw reportedMedicationsError;
  }

  const activePrescriptionIds = (prescriptions ?? [])
    .filter((prescription) => prescription.status === 'active')
    .map((prescription) => prescription.id);

  let currentMedications: string[] = [];

  if (activePrescriptionIds.length > 0) {
    const { data: prescriptionItems, error: prescriptionItemsError } = await adminClient
      .from('prescription_items')
      .select('medication_name')
      .in('prescription_id', activePrescriptionIds);

    if (prescriptionItemsError) {
      throw prescriptionItemsError;
    }

    currentMedications = (prescriptionItems ?? [])
      .map((item) => item.medication_name?.trim())
      .filter((value): value is string => Boolean(value));
  }

  return {
    fullName: userProfile?.full_name ?? null,
    dateOfBirth: userProfile?.date_of_birth ?? null,
    gender: userProfile?.gender ?? null,
    address: userProfile?.address ?? null,
    phone: userProfile?.phone ?? null,
    city: userProfile?.city ?? null,
    bloodType: patientProfile?.blood_type ?? null,
    emergencyContactName: patientProfile?.emergency_contact_name ?? null,
    emergencyContactPhone: patientProfile?.emergency_contact_phone ?? null,
    activeConditions: Array.from(
      new Set(
        (conditions ?? [])
          .filter((condition) => condition.status === 'active' || condition.status === 'chronic')
          .map((condition) => condition.condition_name?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ),
    allergies: Array.from(
      new Set(
        (allergies ?? [])
          .map((allergy) => allergy.allergen?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ),
    currentMedications: Array.from(
      new Set([
        ...currentMedications,
        ...(reportedMedications ?? [])
          .map((item) => item.medication_name?.trim())
          .filter((value): value is string => Boolean(value)),
      ])
    ),
  };
}

async function extractCanonicalUpdateCandidates(args: {
  openAiApiKey: string | null;
  message: string;
  recentUserMessages: string[];
  currentState: CurrentCanonicalRecordState;
}) {
  if (!args.openAiApiKey) {
    return [] as ExtractedCanonicalUpdateCandidate[];
  }

  const prompt = [
    'Extract patient-provided canonical record updates from this authenticated healthcare chat turn.',
    'Only include facts that belong in a reusable patient record review step.',
    'Do not include symptom descriptions, doctor recommendations, or tentative diagnoses unless the patient clearly says they currently have a condition or allergy.',
    'Return only JSON with this exact shape:',
    '{"updates":[{"targetField":"profile.full_name|profile.date_of_birth|profile.gender|profile.address|profile.phone|profile.city|patient.blood_type|patient.emergency_contact|medical_conditions.active|allergies.active|medications.current","confidence":0.0,"proposedValue":{"value":"string|null"},"displayValue":"string"}]}',
    'For patient.emergency_contact, use proposedValue as {"name":"string|null","phone":"string|null"}.',
    'For medical_conditions.active, allergies.active, and medications.current, use proposedValue as {"values":["string"]}.',
    'Only include updates with confidence >= 0.7.',
    `Recent patient context: ${args.recentUserMessages.slice(-2).join(' | ') || 'none'}`,
    `Current patient message: ${args.message}`,
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    return [] as ExtractedCanonicalUpdateCandidate[];
  }

  try {
    const responseJson = await response.json();
    const outputText =
      typeof responseJson.output_text === 'string'
        ? responseJson.output_text
        : Array.isArray(responseJson.output)
          ? responseJson.output
              .flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
              .map((item: { text?: string }) => item.text ?? '')
              .join('\n')
          : '';
    const parsed = extractFirstJsonObject(outputText) as { updates?: unknown };
    const updates = Array.isArray(parsed.updates) ? parsed.updates : [];

    return updates
      .map((update) => {
        if (!update || typeof update !== 'object') {
          return null;
        }

        const candidate = update as {
          targetField?: unknown;
          confidence?: unknown;
          proposedValue?: unknown;
        };

        if (
          candidate.targetField !== 'profile.full_name' &&
          candidate.targetField !== 'profile.date_of_birth' &&
          candidate.targetField !== 'profile.gender' &&
          candidate.targetField !== 'profile.address' &&
          candidate.targetField !== 'profile.phone' &&
          candidate.targetField !== 'profile.city' &&
          candidate.targetField !== 'patient.blood_type' &&
          candidate.targetField !== 'patient.emergency_contact' &&
          candidate.targetField !== 'medical_conditions.active' &&
          candidate.targetField !== 'allergies.active' &&
          candidate.targetField !== 'medications.current'
        ) {
          return null;
        }

        const confidence =
          typeof candidate.confidence === 'number'
            ? Math.max(0, Math.min(1, candidate.confidence))
            : 0;

        if (confidence < 0.7 || !candidate.proposedValue || typeof candidate.proposedValue !== 'object') {
          return null;
        }

        return {
          targetField: candidate.targetField,
          confidence,
          proposedValue: candidate.proposedValue as ExtractedCanonicalUpdateCandidate['proposedValue'],
        } satisfies ExtractedCanonicalUpdateCandidate;
      })
      .filter((update): update is ExtractedCanonicalUpdateCandidate => Boolean(update))
      .filter((update) => {
        switch (update.targetField) {
          case 'profile.full_name':
            return !sameScalarValue(args.currentState.fullName, (update.proposedValue as { value: string | null }).value);
          case 'profile.date_of_birth':
            return !sameScalarValue(args.currentState.dateOfBirth, (update.proposedValue as { value: string | null }).value);
          case 'profile.gender':
            return !sameScalarValue(args.currentState.gender, (update.proposedValue as { value: string | null }).value);
          case 'profile.address':
            return !sameScalarValue(args.currentState.address, (update.proposedValue as { value: string | null }).value);
          case 'profile.phone':
            return !sameScalarValue(args.currentState.phone, (update.proposedValue as { value: string | null }).value);
          case 'profile.city':
            return !sameScalarValue(args.currentState.city, (update.proposedValue as { value: string | null }).value);
          case 'patient.blood_type':
            return !sameScalarValue(args.currentState.bloodType, (update.proposedValue as { value: string | null }).value);
          case 'patient.emergency_contact':
            return !sameEmergencyContactValue(
              {
                name: args.currentState.emergencyContactName,
                phone: args.currentState.emergencyContactPhone,
              },
              update.proposedValue as { name: string | null; phone: string | null }
            );
          case 'medical_conditions.active':
            return !sameListValue(
              args.currentState.activeConditions,
              (update.proposedValue as { values: string[] }).values ?? []
            );
          case 'allergies.active':
            return !sameListValue(args.currentState.allergies, (update.proposedValue as { values: string[] }).values ?? []);
          case 'medications.current':
            return !sameListValue(
              args.currentState.currentMedications,
              (update.proposedValue as { values: string[] }).values ?? []
            );
          default:
            return false;
        }
      });
  } catch {
    return [] as ExtractedCanonicalUpdateCandidate[];
  }
}

const buildCanonicalUpdateRequestPayload = (args: {
  patientId: string;
  sourceRecordId: string;
  sessionId: string;
  messagePreview: string;
  currentState: CurrentCanonicalRecordState;
  candidates: ExtractedCanonicalUpdateCandidate[];
}) =>
  args.candidates.map((candidate) => {
    switch (candidate.targetField) {
      case 'profile.full_name':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'Full name',
          apply_strategy: 'user_profile_scalar' as const,
          current_value: { value: args.currentState.fullName },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: false,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
      case 'profile.date_of_birth':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'Date of birth',
          apply_strategy: 'user_profile_scalar' as const,
          current_value: { value: args.currentState.dateOfBirth },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: false,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
      case 'profile.gender':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'Gender',
          apply_strategy: 'user_profile_scalar' as const,
          current_value: { value: args.currentState.gender },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: false,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
      case 'profile.address':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'Address',
          apply_strategy: 'user_profile_scalar' as const,
          current_value: { value: args.currentState.address },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: false,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
      case 'profile.phone':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'Phone number',
          apply_strategy: 'user_profile_scalar' as const,
          current_value: { value: args.currentState.phone },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: false,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
      case 'profile.city':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'City',
          apply_strategy: 'user_profile_scalar' as const,
          current_value: { value: args.currentState.city },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: false,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
      case 'patient.blood_type':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'Blood type',
          apply_strategy: 'patient_profile_scalar' as const,
          current_value: { value: args.currentState.bloodType },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: false,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
      case 'patient.emergency_contact':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'Emergency contact',
          apply_strategy: 'patient_profile_emergency_contact' as const,
          current_value: {
            name: args.currentState.emergencyContactName,
            phone: args.currentState.emergencyContactPhone,
          },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: false,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
      case 'medical_conditions.active':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'Current medical conditions',
          apply_strategy: 'medical_conditions_replace' as const,
          current_value: { values: args.currentState.activeConditions },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: false,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
      case 'allergies.active':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'Known allergies',
          apply_strategy: 'allergies_replace' as const,
          current_value: { values: args.currentState.allergies },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: false,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
      case 'medications.current':
        return {
          patient_id: args.patientId,
          source_kind: 'ai_chat_message' as const,
          source_record_id: args.sourceRecordId,
          target_field: candidate.targetField,
          display_label: 'Current medications',
          apply_strategy: 'patient_reported_medications_replace' as const,
          current_value: { values: args.currentState.currentMedications },
          proposed_value: candidate.proposedValue,
          status: 'pending' as const,
          requires_doctor_review: true,
          metadata: {
            sessionId: args.sessionId,
            messagePreview: args.messagePreview,
            confidence: candidate.confidence,
          },
        };
    }
  });

async function loadPatientContext(
  adminClient: ReturnType<typeof createClient>,
  patientId: string,
  currentMessage: string,
  recentUserMessages: string[],
  options: {
    usePatientContext: boolean;
    mode: 'chat' | 'previsit';
    appointmentId: string | null;
  }
) {
  const planner = planPatientRetrieval(currentMessage, recentUserMessages);

  if (!options.usePatientContext) {
    return {
      summary: {
        conditionsCount: 0,
        allergiesCount: 0,
        activeMedicationCount: 0,
        recentAppointmentsCount: 0,
        labResultCount: 0,
      },
      promptContext: 'PATIENT CONTEXT DISABLED FOR THIS MESSAGE.',
      assistantMetadata: {
        type: 'response_metadata',
        intent: planner.intent,
        usedPatientContext: false,
        mode: options.mode,
        recommendedSpecialty: planner.recommendedSpecialty,
        evidence: [],
        suggestedActions: [],
        nextAppointmentId: null,
        nextAppointmentLabel: null,
      } satisfies AiChatAssistantMetadata,
    } satisfies LoadedPatientContext;
  }

  const [
    { data: conditions, error: conditionsError },
    { data: allergies, error: allergiesError },
    { data: prescriptions, error: prescriptionsError },
    { data: reportedMedications, error: reportedMedicationsError },
    { data: appointments, error: appointmentsError },
    { data: labOrders, error: labOrdersError },
    { data: nextAppointments, error: nextAppointmentError },
    { data: memoryFacts, error: memoryFactsError },
  ] = await Promise.all([
    adminClient
      .from('medical_conditions')
      .select('id, condition_name, status, diagnosed_date, notes')
      .eq('patient_id', patientId)
      .eq('is_deleted', false)
      .order('diagnosed_date', { ascending: false })
      .limit(10),
    adminClient
      .from('allergies')
      .select('id, allergen, severity, reaction')
      .eq('patient_id', patientId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10),
    adminClient
      .from('prescriptions')
      .select('id, status, prescribed_at')
      .eq('patient_id', patientId)
      .eq('is_deleted', false)
      .order('prescribed_at', { ascending: false })
      .limit(8),
    adminClient
      .from('patient_reported_medications')
      .select('id, medication_name, created_at')
      .eq('patient_id', patientId)
      .eq('is_current', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(12),
    adminClient
      .from('appointments')
      .select('id, doctor_id, status, scheduled_at, chief_complaint, notes')
      .eq('patient_id', patientId)
      .eq('is_deleted', false)
      .order('scheduled_at', { ascending: false })
      .limit(8),
    adminClient
      .from('lab_orders')
      .select('id, status, ordered_at')
      .eq('patient_id', patientId)
      .eq('is_deleted', false)
      .order('ordered_at', { ascending: false })
      .limit(8),
    adminClient
      .from('appointments')
      .select('id, doctor_id, status, scheduled_at, chief_complaint')
      .eq('patient_id', patientId)
      .eq('is_deleted', false)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(3),
    adminClient
      .from('patient_memory_facts')
      .select('id, memory_key, label, value_text, value_json, status, source_kind, created_at, confirmed_at')
      .eq('patient_id', patientId)
      .eq('usable_in_chat', true)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (conditionsError) {
    throw conditionsError;
  }

  if (allergiesError) {
    throw allergiesError;
  }

  if (prescriptionsError) {
    throw prescriptionsError;
  }

  if (reportedMedicationsError) {
    throw reportedMedicationsError;
  }

  if (appointmentsError) {
    throw appointmentsError;
  }

  if (labOrdersError) {
    throw labOrdersError;
  }

  if (nextAppointmentError) {
    throw nextAppointmentError;
  }

  if (memoryFactsError) {
    throw memoryFactsError;
  }

  const prescriptionIds = (prescriptions ?? []).map((prescription) => prescription.id);
  const appointmentIds = (appointments ?? []).map((appointment) => appointment.id);
  const doctorIds = Array.from(new Set((appointments ?? []).map((appointment) => appointment.doctor_id)));
  const labOrderIds = (labOrders ?? []).map((labOrder) => labOrder.id);

  const [
    { data: prescriptionItems, error: prescriptionItemsError },
    { data: consultationNotes, error: consultationNotesError },
    { data: doctorProfiles, error: doctorProfilesError },
    { data: labOrderItems, error: labOrderItemsError },
  ] = await Promise.all([
    prescriptionIds.length
      ? adminClient
          .from('prescription_items')
          .select('id, prescription_id, medication_name, dosage, frequency, duration, instructions, is_dispensed')
          .in('prescription_id', prescriptionIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    appointmentIds.length
      ? adminClient
          .from('consultation_notes')
          .select('appointment_id, assessment, plan, subjective')
          .in('appointment_id', appointmentIds)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    doctorIds.length
      ? adminClient.from('user_profiles').select('user_id, full_name').in('user_id', doctorIds)
      : Promise.resolve({ data: [], error: null }),
    labOrderIds.length
      ? adminClient
          .from('lab_order_items')
          .select('id, lab_order_id, test_name, status, result_value, result_unit, reference_range, is_abnormal, resulted_at')
          .in('lab_order_id', labOrderIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (prescriptionItemsError) {
    throw prescriptionItemsError;
  }

  if (consultationNotesError) {
    throw consultationNotesError;
  }

  if (doctorProfilesError) {
    throw doctorProfilesError;
  }

  if (labOrderItemsError) {
    throw labOrderItemsError;
  }

  const itemsByPrescriptionId = new Map<string, typeof prescriptionItems>();

  for (const item of prescriptionItems ?? []) {
    const currentItems = itemsByPrescriptionId.get(item.prescription_id) ?? [];
    currentItems.push(item);
    itemsByPrescriptionId.set(item.prescription_id, currentItems);
  }

  const notesByAppointmentId = new Map<string, typeof consultationNotes[number]>();

  for (const note of consultationNotes ?? []) {
    if (!notesByAppointmentId.has(note.appointment_id)) {
      notesByAppointmentId.set(note.appointment_id, note);
    }
  }

  const labItemsByOrderId = new Map<string, typeof labOrderItems>();

  for (const item of labOrderItems ?? []) {
    const currentItems = labItemsByOrderId.get(item.lab_order_id) ?? [];
    currentItems.push(item);
    labItemsByOrderId.set(item.lab_order_id, currentItems);
  }

  const doctorNameById = new Map((doctorProfiles ?? []).map((profile) => [profile.user_id, profile.full_name ?? 'Doctor']));
  const nextAppointmentCandidate =
    (options.appointmentId
      ? (nextAppointments ?? []).find((appointment) => appointment.id === options.appointmentId) ?? null
      : null) ?? nextAppointments?.[0] ?? null;

  const nextAppointmentLabel = nextAppointmentCandidate
    ? `${formatDate(nextAppointmentCandidate.scheduled_at)} with ${doctorNameById.get(nextAppointmentCandidate.doctor_id) ?? 'Doctor'}${nextAppointmentCandidate.chief_complaint ? ` for ${nextAppointmentCandidate.chief_complaint}` : ''}`
    : null;

  const bundle: PatientRetrievalBundle = {
    conditions:
      conditions?.map((condition) => ({
        id: condition.id,
        conditionName: condition.condition_name,
        status: condition.status,
        diagnosedDate: condition.diagnosed_date,
        notes: condition.notes,
      })) ?? [],
    allergies:
      allergies?.map((allergy) => ({
        id: allergy.id,
        allergen: allergy.allergen,
        severity: allergy.severity,
        reaction: allergy.reaction,
      })) ?? [],
    prescriptions:
      [
        ...(prescriptions?.map((prescription) => ({
          id: prescription.id,
          status: prescription.status,
          prescribedAt: prescription.prescribed_at,
          items:
            itemsByPrescriptionId.get(prescription.id)?.map((item) => ({
              id: item.id,
              medicationName: item.medication_name,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions,
              isDispensed: item.is_dispensed,
            })) ?? [],
        })) ?? []),
        ...((reportedMedications?.length ?? 0) > 0
          ? [
              {
                id: 'patient-reported-medications',
                status: 'active',
                prescribedAt: reportedMedications?.[0]?.created_at ?? new Date().toISOString(),
                items: (reportedMedications ?? []).map((item) => ({
                  id: item.id,
                  medicationName: item.medication_name,
                  dosage: null,
                  frequency: null,
                  duration: null,
                  instructions: 'Patient-reported medication awaiting doctor review.',
                  isDispensed: false,
                })),
              },
            ]
          : []),
      ],
    appointments:
      appointments?.map((appointment) => {
        const relatedNote = notesByAppointmentId.get(appointment.id);

        return {
          id: appointment.id,
          status: appointment.status,
          scheduledAt: appointment.scheduled_at,
          chiefComplaint: appointment.chief_complaint,
          notes: appointment.notes,
          doctorSummary: relatedNote?.assessment ?? null,
          doctorPlan: relatedNote?.plan ?? null,
          doctorSubjective: relatedNote?.subjective ?? null,
        };
      }) ?? [],
    labResults:
      (labOrders ?? []).flatMap((labOrder) =>
        (labItemsByOrderId.get(labOrder.id) ?? []).map((item) => ({
          id: item.id,
          orderedAt: labOrder.ordered_at,
          status: item.status ?? labOrder.status,
          testName: item.test_name,
          resultValue: item.result_value,
          resultUnit: item.result_unit,
          referenceRange: item.reference_range,
          isAbnormal: item.is_abnormal,
          resultedAt: item.resulted_at,
        }))
      ) ?? [],
    memoryFacts:
      (memoryFacts ?? []).map((fact) => ({
        id: fact.id,
        memoryKey: fact.memory_key,
        label: fact.label,
        valueText: fact.value_text,
        valueJson: fact.value_json,
        status: fact.status,
        sourceKind: fact.source_kind,
        createdAt: fact.created_at,
        confirmedAt: fact.confirmed_at,
      })) ?? [],
  };

  const evidence = buildEvidenceItems(bundle, planner);
  const { data: specializationMatches } = planner.recommendedSpecialty
    ? await adminClient
        .from('specializations')
        .select('id')
        .ilike('name', planner.recommendedSpecialty)
        .eq('is_active', true)
        .limit(1)
    : { data: [] };

  const summary = {
    conditionsCount: bundle.conditions.length,
    allergiesCount: bundle.allergies.length,
    activeMedicationCount: bundle.prescriptions.filter((prescription) => prescription.status === 'active').length,
    recentAppointmentsCount: bundle.appointments.length,
    labResultCount: bundle.labResults.filter((item) => item.resultedAt).length,
  };

  const suggestedActions = createSuggestedActions({
    plan: planner,
    nextAppointmentId: nextAppointmentCandidate?.id ?? null,
    recommendedSpecializationId: specializationMatches?.[0]?.id ?? null,
    reason: currentMessage,
  }).map((action) => ({
    type: 'navigate' as const,
    label: action.label,
    href: action.href,
  }));

  const promptContext = [
    'PATIENT CONTEXT',
    createPromptContext({ plan: planner, evidence, bundle }),
    nextAppointmentLabel ? `NEXT UPCOMING APPOINTMENT: ${nextAppointmentLabel}` : 'NEXT UPCOMING APPOINTMENT: none',
    options.mode === 'previsit'
      ? 'PRE-VISIT MODE: Ask focused appointment-preparation questions or provide a structured pre-visit summary when enough information is available.'
      : 'CHAT MODE: answer the patient question directly while using the evidence pack when relevant.',
  ].join('\n\n');

  return {
    summary,
    promptContext,
    assistantMetadata: {
      type: 'response_metadata',
      intent: planner.intent,
      usedPatientContext: true,
      mode: options.mode,
      recommendedSpecialty: planner.recommendedSpecialty,
      evidence,
      suggestedActions,
      nextAppointmentId: nextAppointmentCandidate?.id ?? null,
      nextAppointmentLabel,
    },
  } satisfies LoadedPatientContext;
}

async function createAssistantAnswer(args: {
  openAiApiKey: string | null;
  conversationMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  patientContext: LoadedPatientContext | null;
  mode: 'chat' | 'previsit';
  userAttachments: AiChatFileAttachment[];
}) {
  if (!args.openAiApiKey) {
    return args.patientContext
      ? `The AI backend is connected to your patient context, but the Supabase project is still missing the \`OPENAI_API_KEY\` secret. Once that secret is added, this chat will answer using your saved conditions, allergies, medications, appointments, and lab history.`
      : 'The AI backend is not fully configured yet. Add the Supabase project secret `OPENAI_API_KEY` to enable AI responses.';
  }

  const attachmentNote =
    args.userAttachments.length > 0
      ? `\n\nUPLOADED FILES FOR THIS TURN:\n${args.userAttachments
          .map((attachment) => `- ${attachment.fileName} (${attachment.mimeType})`)
          .join('\n')}\nDo not claim to have analyzed document contents unless extracted text is explicitly provided.`
      : '';

  const messages = [
    {
      role: 'system' as const,
      content: args.patientContext
        ? `${SYSTEM_PROMPT}\n\n${args.patientContext.promptContext}`
        : `${SYSTEM_PROMPT}\n\nNo patient-specific context is available for this conversation.`,
    },
    ...args.conversationMessages.map((message, index, allMessages) => {
      if (index === allMessages.length - 1 && message.role === 'user' && attachmentNote) {
        return {
          ...message,
          content: `${message.content}${attachmentNote}`,
        };
      }

      return message;
    }),
    ...(args.mode === 'previsit'
      ? [
          {
            role: 'system' as const,
            content:
              'This message is part of a pre-visit assessment flow. Ask focused, clinically useful questions for the next appointment, and when enough detail is available, provide a section titled "Pre-visit summary" followed by short bullets the patient can share with the doctor.',
          },
        ]
      : []),
  ];

  const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.3,
      messages,
    }),
  });

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const responseJson = await openAiResponse.json();
  const content = responseJson?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI returned an empty response.');
  }

  return content.trim();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY') ?? null;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: 'Supabase Edge Function environment is not configured correctly.' }, 500);
    }

    const authHeader = request.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body = (await request.json()) as AiChatRequestBody;
    const message = body.message?.trim();
    const mode = body.mode === 'previsit' ? 'previsit' : 'chat';
    const usePatientContext = body.usePatientContext ?? true;
    const incomingAttachments = sanitizeIncomingAttachments(body.attachments);

    if (!message) {
      return json({ error: 'A chat message is required.' }, 400);
    }

    const authResult = authHeader ? await userClient.auth.getUser() : { data: { user: null }, error: null };
    const user = authResult.data.user;
    const authError = authResult.error;

    if (authHeader && authError) {
      return json({ error: authError.message }, 401);
    }

    let sessionId = body.sessionId ?? null;

    if (sessionId) {
      const sessionQuery = adminClient
        .from('ai_chat_sessions')
        .select('id, user_id')
        .eq('id', sessionId)
        .limit(1);

      const { data: existingSessions, error: sessionLookupError } = user
        ? await sessionQuery.eq('user_id', user.id)
        : await sessionQuery.is('user_id', null);

      if (sessionLookupError) {
        throw sessionLookupError;
      }

      if (!existingSessions?.length) {
        sessionId = null;
      }
    }

    if (!sessionId) {
      const { data: newSession, error: createSessionError } = await adminClient
        .from('ai_chat_sessions')
        .insert({
          user_id: user?.id ?? null,
          context_patient_id: user?.id ?? null,
        })
        .select('id')
        .single();

      if (createSessionError) {
        throw createSessionError;
      }

      sessionId = newSession.id;
    }

    const { data: userMessage, error: insertUserMessageError } = await adminClient
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message,
        attachments: incomingAttachments,
      })
      .select('id')
      .single();

    if (insertUserMessageError) {
      throw insertUserMessageError;
    }

    const { data: storedMessages, error: historyError } = await adminClient
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (historyError) {
      throw historyError;
    }

    const conversationMessages =
      storedMessages
        ?.filter((storedMessage) => storedMessage.role === 'user' || storedMessage.role === 'assistant')
        .slice(-12)
        .map((storedMessage) => ({
          role: storedMessage.role,
          content: storedMessage.content,
        })) ?? [];

    const recentUserMessages =
      storedMessages
        ?.filter((storedMessage) => storedMessage.role === 'user')
        .slice(-4)
        .map((storedMessage) => storedMessage.content) ?? [];

    const currentCanonicalRecordState = user ? await loadCurrentCanonicalRecordState(adminClient, user.id) : null;
    const patientContext = user
      ? await loadPatientContext(adminClient, user.id, message, recentUserMessages, {
          usePatientContext,
          mode,
          appointmentId: body.appointmentId ?? null,
        })
      : null;
    const [assistantContent, extractedMemoryFacts, extractedCanonicalUpdates] = await Promise.all([
      createAssistantAnswer({
        openAiApiKey,
        conversationMessages,
        patientContext,
        mode,
        userAttachments: incomingAttachments,
      }),
      user
        ? extractPatientMemoryFacts({
            openAiApiKey,
            message,
            recentUserMessages,
          })
        : Promise.resolve([]),
      user && currentCanonicalRecordState
        ? extractCanonicalUpdateCandidates({
            openAiApiKey,
            message,
            recentUserMessages,
            currentState: currentCanonicalRecordState,
          })
        : Promise.resolve([]),
    ]);

    const { data: assistantMessage, error: insertAssistantError } = await adminClient
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: assistantContent,
        attachments: patientContext ? [patientContext.assistantMetadata] : [],
      })
      .select('id, content, created_at, attachments')
      .single();

    if (insertAssistantError) {
      throw insertAssistantError;
    }

    if (user && userMessage?.id && extractedMemoryFacts.length > 0) {
      const memoryFactPayload = extractedMemoryFacts.map((fact) => ({
        patient_id: user.id,
        source_kind: 'ai_chat_message' as const,
        source_record_id: userMessage.id,
        memory_key: fact.memoryKey,
        label: fact.label,
        value_type: fact.valueType,
        value_text: fact.valueText,
        value_json: fact.valueJson,
        status: 'suggested' as const,
        confidence: fact.confidence,
        usable_in_chat: true,
        usable_in_forms: fact.usableInForms,
        metadata: {
          sessionId,
          messagePreview: message.slice(0, 240),
        },
      }));

      const { error: memoryPersistError } = await adminClient.from('patient_memory_facts').upsert(memoryFactPayload, {
        onConflict: 'source_kind,source_record_id,memory_key',
      });

      if (memoryPersistError) {
        console.error('Unable to persist chat memory facts', memoryPersistError);
      }
    }

    if (user && userMessage?.id && currentCanonicalRecordState && extractedCanonicalUpdates.length > 0) {
      const canonicalUpdatePayload = buildCanonicalUpdateRequestPayload({
        patientId: user.id,
        sourceRecordId: userMessage.id,
        sessionId,
        messagePreview: message.slice(0, 240),
        currentState: currentCanonicalRecordState,
        candidates: extractedCanonicalUpdates,
      });

      const { error: canonicalUpdatePersistError } = await adminClient
        .from('patient_canonical_update_requests')
        .upsert(canonicalUpdatePayload, {
          onConflict: 'source_kind,source_record_id,target_field',
        });

      if (canonicalUpdatePersistError) {
        console.error('Unable to stage canonical update requests', canonicalUpdatePersistError);
      }
    }

    return json({
      sessionId,
      assistantMessage: {
        id: assistantMessage.id,
        content: assistantMessage.content,
        createdAt: assistantMessage.created_at,
        attachments: assistantMessage.attachments ?? [],
      },
      contextSummary: patientContext?.summary ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown AI chat failure.';
    return json({ error: message }, 500);
  }
});
