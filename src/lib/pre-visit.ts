import type { PreVisitAssessmentStatus, PreVisitQuestionType, PreVisitTemplateStatus } from '../types';
import {
  getPatientMemorySourceLabel,
  getPatientMemoryValue,
  inferPatientMemoryKey,
  normalizePatientMemoryKey,
  type ResolvedPatientMemoryFact,
} from './patient-memory';

export interface PreVisitQuestionOption {
  label: string;
  value: string;
}

export interface PreVisitTemplateQuestionDraft {
  key: string;
  label: string;
  helpText: string | null;
  type: PreVisitQuestionType;
  required: boolean;
  options: PreVisitQuestionOption[];
  displayOrder: number;
  autofillSource: string | null;
  memoryKey: string | null;
  aiInstructions: string | null;
}

export interface PreVisitTemplateSnapshot {
  templateId: string | null;
  title: string;
  description: string | null;
  specializationId: string | null;
  questions: PreVisitTemplateQuestionDraft[];
}

export interface DoctorPreVisitTemplateRecord {
  id: string;
  title: string;
  description: string | null;
  status: PreVisitTemplateStatus;
  isActive: boolean;
  specializationId: string | null;
  publishedAt: string | null;
  sourceBucket: 'documents' | null;
  sourcePath: string | null;
  sourceFileName: string | null;
  extractionMetadata: Record<string, unknown>;
  questions: PreVisitTemplateQuestionDraft[];
}

export interface PatientPreVisitAssessmentRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  templateId: string | null;
  templateTitle: string;
  status: PreVisitAssessmentStatus;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  reviewedAt: string | null;
  lastAnsweredAt: string | null;
  appointment: {
    scheduledAt: string;
    chiefComplaint: string | null;
    doctorName: string;
  };
  summary: {
    summaryText: string;
    keyPoints: string[];
    riskFlags: string[];
    pendingQuestions: string[];
    generatedAt: string;
  } | null;
  snapshot: PreVisitTemplateSnapshot;
}

export interface PreVisitAutofillContext {
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
  activeMedications: string[];
  memoryFactsByKey: Map<string, ResolvedPatientMemoryFact>;
}

export interface PreVisitAnswerDraft {
  questionKey: string;
  questionLabel: string;
  questionType: PreVisitQuestionType;
  memoryKey: string | null;
  answerText: string | null;
  answerJson: unknown;
  autofillValue: unknown;
  autofillSource: string | null;
  autofillLabel: string | null;
  autofilled: boolean;
  confirmedByPatient: boolean;
  answeredAt: string | null;
}

export const PRE_VISIT_AUTOFILL_SOURCE_OPTIONS = [
  { value: 'profile.full_name', label: 'Patient full name' },
  { value: 'profile.date_of_birth', label: 'Date of birth' },
  { value: 'profile.gender', label: 'Gender' },
  { value: 'profile.address', label: 'Address' },
  { value: 'profile.phone', label: 'Phone number' },
  { value: 'profile.city', label: 'City' },
  { value: 'patient.blood_type', label: 'Blood type' },
  { value: 'patient.emergency_contact', label: 'Emergency contact' },
  { value: 'patient.emergency_contact_name', label: 'Emergency contact name' },
  { value: 'patient.emergency_contact_phone', label: 'Emergency contact phone' },
  { value: 'medical_conditions.active', label: 'Active conditions' },
  { value: 'allergies.active', label: 'Allergies' },
  { value: 'prescriptions.active', label: 'Active medications' },
] as const;

const QUESTION_TYPES: PreVisitQuestionType[] = [
  'short_text',
  'long_text',
  'single_select',
  'multi_select',
  'boolean',
  'number',
  'date',
];

const AUTOFILL_SOURCE_LABELS = new Map<string, string>(
  PRE_VISIT_AUTOFILL_SOURCE_OPTIONS.map((option) => [option.value, `From your record: ${option.label}`])
);

export const inferAutofillSourceFromQuestion = (question: { key: string; label: string }) => {
  const normalized = `${question.key} ${question.label}`.toLowerCase();

  if (normalized.includes('full name') || normalized.includes('patient name')) {
    return 'profile.full_name';
  }

  if (normalized.includes('date of birth') || normalized.includes('dob')) {
    return 'profile.date_of_birth';
  }

  if (normalized.includes('gender') || normalized.includes('sex')) {
    return 'profile.gender';
  }

  // Match more-specific emergency-contact phrases BEFORE the generic
  // `phone` / `contact` / `name` branches, otherwise the broader rule
  // wins and "Emergency contact phone" autofills with the patient's own
  // profile.phone instead of the emergency contact phone number.
  if (normalized.includes('emergency contact phone')) {
    return 'patient.emergency_contact_phone';
  }

  if (normalized.includes('emergency contact name')) {
    return 'patient.emergency_contact_name';
  }

  if (normalized.includes('emergency contact')) {
    return 'patient.emergency_contact';
  }

  if (normalized.includes('phone')) {
    return 'profile.phone';
  }

  if (normalized.includes('city')) {
    return 'profile.city';
  }

  if (normalized.includes('blood type')) {
    return 'patient.blood_type';
  }

  if (normalized.includes('allerg')) {
    return 'allergies.active';
  }

  if (normalized.includes('medication') || normalized.includes('medicine')) {
    return 'prescriptions.active';
  }

  if (normalized.includes('condition') || normalized.includes('diagnos')) {
    return 'medical_conditions.active';
  }

  if (normalized.includes('address')) {
    return 'profile.address';
  }

  return null;
};

const normalizeQuestionType = (value: unknown): PreVisitQuestionType => {
  if (typeof value === 'string' && QUESTION_TYPES.includes(value as PreVisitQuestionType)) {
    return value as PreVisitQuestionType;
  }

  return 'short_text';
};

const normalizeOptions = (value: unknown): PreVisitQuestionOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return {
          label: item.trim(),
          value: item.trim(),
        };
      }

      if (item && typeof item === 'object') {
        const candidate = item as { label?: unknown; value?: unknown };
        const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
        const optionValue = typeof candidate.value === 'string' ? candidate.value.trim() : label;

        if (label) {
          return { label, value: optionValue || label };
        }
      }

      return null;
    })
    .filter((item): item is PreVisitQuestionOption => Boolean(item && item.label));
};

export const normalizeQuestionKey = (value: string, index: number) => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || `question_${index + 1}`;
};

export const normalizeTemplateQuestion = (
  question: Partial<PreVisitTemplateQuestionDraft> & { key?: string; label?: string },
  index: number
): PreVisitTemplateQuestionDraft => {
  const label = question.label?.trim() || `Question ${index + 1}`;
  const key = normalizeQuestionKey(question.key?.trim() || label, index);
  const autofillSource = question.autofillSource?.trim() || inferAutofillSourceFromQuestion({ key, label });
  const memoryKey =
    normalizePatientMemoryKey(question.memoryKey?.trim() || '') ||
    inferPatientMemoryKey({
      label,
      helpText: question.helpText?.trim() || null,
      fallbackKey: key,
      autofillSource,
    });

  return {
    key,
    label,
    helpText: question.helpText?.trim() || null,
    type: normalizeQuestionType(question.type),
    required: Boolean(question.required),
    options: normalizeOptions(question.options),
    displayOrder: typeof question.displayOrder === 'number' ? question.displayOrder : index,
    autofillSource,
    memoryKey,
    aiInstructions: question.aiInstructions?.trim() || null,
  };
};

export const normalizeTemplateQuestions = (questions: unknown): PreVisitTemplateQuestionDraft[] => {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions
    .map((question, index) => {
      if (!question || typeof question !== 'object') {
        return null;
      }

      return normalizeTemplateQuestion(question as Partial<PreVisitTemplateQuestionDraft>, index);
    })
    .filter((question): question is PreVisitTemplateQuestionDraft => Boolean(question))
    .sort((left, right) => left.displayOrder - right.displayOrder);
};

export const parseTemplateSnapshot = (snapshot: unknown): PreVisitTemplateSnapshot => {
  if (!snapshot || typeof snapshot !== 'object') {
    return {
      templateId: null,
      title: 'Pre-visit assessment',
      description: null,
      specializationId: null,
      questions: [],
    };
  }

  const candidate = snapshot as {
    templateId?: unknown;
    title?: unknown;
    description?: unknown;
    specializationId?: unknown;
    questions?: unknown;
  };

  return {
    templateId: typeof candidate.templateId === 'string' ? candidate.templateId : null,
    title: typeof candidate.title === 'string' && candidate.title.trim() ? candidate.title : 'Pre-visit assessment',
    description: typeof candidate.description === 'string' && candidate.description.trim() ? candidate.description : null,
    specializationId: typeof candidate.specializationId === 'string' ? candidate.specializationId : null,
    questions: normalizeTemplateQuestions(candidate.questions),
  };
};

export const getAutofillLabel = (autofillSource: string | null) => {
  if (!autofillSource) {
    return null;
  }

  if (autofillSource.startsWith('patient_memory.ai_chat_message.')) {
    return 'Suggested from earlier chat';
  }

  if (autofillSource.startsWith('patient_memory.pre_visit_answer.')) {
    return 'From your previous answer';
  }

  return AUTOFILL_SOURCE_LABELS.get(autofillSource) ?? 'Autofilled from your record';
};

const getAutofillDetails = (
  question: PreVisitTemplateQuestionDraft,
  context: PreVisitAutofillContext
): {
  value: unknown;
  source: string | null;
  label: string | null;
} => {
  switch (question.autofillSource) {
    case 'profile.full_name':
      return { value: context.fullName, source: question.autofillSource, label: getAutofillLabel(question.autofillSource) };
    case 'profile.date_of_birth':
      return { value: context.dateOfBirth, source: question.autofillSource, label: getAutofillLabel(question.autofillSource) };
    case 'profile.gender':
      return { value: context.gender, source: question.autofillSource, label: getAutofillLabel(question.autofillSource) };
    case 'profile.address':
      return { value: context.address, source: question.autofillSource, label: getAutofillLabel(question.autofillSource) };
    case 'profile.phone':
      return { value: context.phone, source: question.autofillSource, label: getAutofillLabel(question.autofillSource) };
    case 'profile.city':
      return { value: context.city, source: question.autofillSource, label: getAutofillLabel(question.autofillSource) };
    case 'patient.blood_type':
      return { value: context.bloodType, source: question.autofillSource, label: getAutofillLabel(question.autofillSource) };
    case 'patient.emergency_contact':
      return {
        value: [context.emergencyContactName, context.emergencyContactPhone].filter(Boolean).join(' • ') || null,
        source: question.autofillSource,
        label: getAutofillLabel(question.autofillSource),
      };
    case 'patient.emergency_contact_name':
      return {
        value: context.emergencyContactName,
        source: question.autofillSource,
        label: getAutofillLabel(question.autofillSource),
      };
    case 'patient.emergency_contact_phone':
      return {
        value: context.emergencyContactPhone,
        source: question.autofillSource,
        label: getAutofillLabel(question.autofillSource),
      };
    case 'medical_conditions.active':
      return {
        value: context.activeConditions.length > 0 ? context.activeConditions : null,
        source: question.autofillSource,
        label: getAutofillLabel(question.autofillSource),
      };
    case 'allergies.active':
      return {
        value: context.allergies.length > 0 ? context.allergies : null,
        source: question.autofillSource,
        label: getAutofillLabel(question.autofillSource),
      };
    case 'prescriptions.active':
      return {
        value: context.activeMedications.length > 0 ? context.activeMedications : null,
        source: question.autofillSource,
        label: getAutofillLabel(question.autofillSource),
      };
    default: {
      if (!question.memoryKey) {
        return { value: null, source: null, label: null };
      }

      const memoryFact = context.memoryFactsByKey.get(question.memoryKey);

      if (!memoryFact) {
        return { value: null, source: null, label: null };
      }

      return {
        value: getPatientMemoryValue(memoryFact),
        source: memoryFact.autofillSource,
        label: getPatientMemorySourceLabel(memoryFact),
      };
    }
  }
};

const toAnswerText = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return null;
};

const normalizeComparableText = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ');

const CANONICAL_OPTION_SYNONYMS: Record<string, string[]> = {
  cancer: ['cancer', 'tumor', 'malignancy', 'oncology'],
  diabetes: ['diabetes', 'type 1 diabetes', 'type 2 diabetes', 'diabetic'],
  high_blood_pressure: ['high blood pressure', 'hypertension', 'elevated blood pressure'],
  heart_attack: ['heart attack', 'myocardial infarction'],
  stroke: ['stroke', 'cva', 'cerebrovascular accident'],
};

const matchesQuestionOption = (candidateValue: string, option: PreVisitQuestionOption) => {
  const normalizedCandidate = normalizeComparableText(candidateValue);
  const normalizedOptionValue = normalizeComparableText(option.value);
  const normalizedOptionLabel = normalizeComparableText(option.label);
  const synonyms = CANONICAL_OPTION_SYNONYMS[option.value] ?? [];

  if (!normalizedCandidate || (!normalizedOptionValue && !normalizedOptionLabel)) {
    return false;
  }

  if (
    normalizedCandidate === normalizedOptionValue ||
    normalizedCandidate === normalizedOptionLabel ||
    normalizedCandidate.includes(normalizedOptionValue) ||
    normalizedCandidate.includes(normalizedOptionLabel) ||
    normalizedOptionValue.includes(normalizedCandidate) ||
    normalizedOptionLabel.includes(normalizedCandidate)
  ) {
    return true;
  }

  return synonyms.some((synonym) => normalizedCandidate.includes(normalizeComparableText(synonym)));
};

const normalizeAutofillValueForQuestion = (question: PreVisitTemplateQuestionDraft, value: unknown): unknown => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  switch (question.type) {
    case 'single_select': {
      if (typeof value === 'string') {
        const match = question.options.find((option) => matchesQuestionOption(value, option));
        return match?.value ?? null;
      }

      if (Array.isArray(value)) {
        const matchingItem = value.find((item): item is string =>
          typeof item === 'string' && question.options.some((option) => matchesQuestionOption(item, option))
        );
        const match = matchingItem
          ? question.options.find((option) => matchesQuestionOption(matchingItem, option))
          : null;
        return match?.value ?? null;
      }

      return null;
    }
    case 'multi_select': {
      if (Array.isArray(value)) {
        const matches = Array.from(
          new Set(
            value.flatMap((item) => {
              if (typeof item !== 'string') {
                return [];
              }

              return question.options.filter((option) => matchesQuestionOption(item, option)).map((option) => option.value);
            })
          )
        );
        return matches.length > 0 ? matches : null;
      }

      if (typeof value === 'string') {
        const matches = question.options.filter((option) => matchesQuestionOption(value, option)).map((option) => option.value);
        return matches.length > 0 ? matches : null;
      }

      return null;
    }
    case 'boolean': {
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (normalized === 'yes' || normalized === 'true') {
          return 'Yes';
        }

        if (normalized === 'no' || normalized === 'false') {
          return 'No';
        }
      }

      return null;
    }
    case 'number': {
      if (typeof value === 'number') {
        return value;
      }

      if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value.trim()))) {
        return value.trim();
      }

      return null;
    }
    case 'date':
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    case 'short_text':
    case 'long_text':
    default:
      return value;
  }
};

export const createAutofilledAnswer = (
  question: PreVisitTemplateQuestionDraft,
  context: PreVisitAutofillContext
): PreVisitAnswerDraft => {
  const autofill = getAutofillDetails(question, context);
  const autofillValue = normalizeAutofillValueForQuestion(question, autofill.value);

  return {
    questionKey: question.key,
    questionLabel: question.label,
    questionType: question.type,
    memoryKey: question.memoryKey,
    answerText: toAnswerText(autofillValue),
    answerJson: Array.isArray(autofillValue) ? autofillValue : null,
    autofillValue,
    autofillSource: autofill.source,
    autofillLabel: autofill.label,
    autofilled: autofillValue !== null && autofillValue !== '',
    confirmedByPatient: false,
    answeredAt: null,
  };
};

export const formatPreVisitStatus = (status: PreVisitAssessmentStatus) => {
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'reviewed':
      return 'Reviewed';
    default:
      return status;
  }
};

export const buildPreVisitSummaryPrompt = (args: {
  appointmentLabel: string;
  templateTitle: string;
  answers: PreVisitAnswerDraft[];
}) => {
  const answerLines = args.answers.map((answer) => {
    const answerValue =
      answer.answerText?.trim() ||
      (Array.isArray(answer.answerJson) ? answer.answerJson.join(', ') : '') ||
      'Not answered';

    return `- ${answer.questionLabel}: ${answerValue}`;
  });

  return [
    `Generate a concise structured pre-visit summary for the doctor for this appointment: ${args.appointmentLabel}.`,
    `Questionnaire title: ${args.templateTitle}.`,
    'Return valid JSON with this exact shape:',
    '{"summaryText":"string","keyPoints":["string"],"riskFlags":["string"],"pendingQuestions":["string"]}',
    'Keep the summary clinically useful, avoid diagnosis claims, and note unanswered items in pendingQuestions.',
    'Patient responses:',
    ...answerLines,
  ].join('\n');
};
