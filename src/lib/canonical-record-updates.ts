import type {
  PatientCanonicalUpdateSourceKind,
  PatientCanonicalUpdateStatus,
  PatientCanonicalUpdateStrategy,
} from '../types';
import i18n from 'i18next';
import type { PreVisitAnswerDraft, PreVisitAutofillContext } from './pre-visit';
import { supabase } from './supabase';

type CanonicalScalarValue = { value: string | null };
type CanonicalListValue = { values: string[] };
type CanonicalEmergencyContactValue = { name: string | null; phone: string | null };

type CanonicalStoredValue = CanonicalScalarValue | CanonicalListValue | CanonicalEmergencyContactValue;

export interface CanonicalUpdateDraft {
  patientId: string;
  sourceKind: PatientCanonicalUpdateSourceKind;
  sourceRecordId: string;
  targetField: string;
  displayLabel: string;
  applyStrategy: PatientCanonicalUpdateStrategy;
  currentValue: CanonicalStoredValue;
  proposedValue: CanonicalStoredValue;
  requiresDoctorReview: boolean;
  metadata: Record<string, unknown>;
}

export interface CanonicalUpdateRequestRecord {
  id: string;
  patientId: string;
  sourceKind: PatientCanonicalUpdateSourceKind;
  sourceRecordId: string;
  targetField: string;
  displayLabel: string;
  applyStrategy: PatientCanonicalUpdateStrategy;
  currentValue: CanonicalStoredValue;
  proposedValue: CanonicalStoredValue;
  status: PatientCanonicalUpdateStatus;
  requiresDoctorReview: boolean;
  metadata: Record<string, unknown>;
  confirmedAt: string | null;
  appliedAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const normalizeString = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
};

const normalizeStringList = (values: string[]) =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.toLowerCase())
    )
  ).sort();

const splitListText = (value: string | null) =>
  (value ?? '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseEmergencyContact = (value: string | null) => {
  const trimmed = normalizeString(value);

  if (!trimmed) {
    return { name: null, phone: null };
  }

  const [namePart, phonePart] = trimmed.split(/\s*[•|]\s*/, 2);
  const normalizedName = normalizeString(namePart ?? null);
  const normalizedPhone = normalizeString(phonePart ?? null);

  if (normalizedName || normalizedPhone) {
    return {
      name: normalizedName,
      phone: normalizedPhone,
    };
  }

  const phoneMatch = trimmed.match(/(\+?[0-9][0-9\s()-]{6,})$/);

  if (!phoneMatch) {
    return {
      name: trimmed,
      phone: null,
    };
  }

  const phone = normalizeString(phoneMatch[1]);
  const name = normalizeString(trimmed.slice(0, Math.max(0, phoneMatch.index ?? trimmed.length)).replace(/[-,:]\s*$/, ''));

  return {
    name,
    phone,
  };
};

const sameScalar = (left: CanonicalScalarValue, right: CanonicalScalarValue) =>
  normalizeString(left.value)?.toLowerCase() === normalizeString(right.value)?.toLowerCase();

const sameList = (left: CanonicalListValue, right: CanonicalListValue) => {
  const leftValues = normalizeStringList(left.values);
  const rightValues = normalizeStringList(right.values);
  return leftValues.length === rightValues.length && leftValues.every((value, index) => value === rightValues[index]);
};

const sameEmergencyContact = (left: CanonicalEmergencyContactValue, right: CanonicalEmergencyContactValue) =>
  normalizeString(left.name)?.toLowerCase() === normalizeString(right.name)?.toLowerCase() &&
  normalizeString(left.phone)?.toLowerCase() === normalizeString(right.phone)?.toLowerCase();

const toScalarValue = (value: string | null): CanonicalScalarValue => ({
  value: normalizeString(value),
});

const toListValue = (values: string[]): CanonicalListValue => ({
  values: values.map((value) => value.trim()).filter(Boolean),
});

const getAnswerList = (answer: PreVisitAnswerDraft) => {
  if (Array.isArray(answer.answerJson)) {
    return answer.answerJson.filter((value): value is string => typeof value === 'string');
  }

  return splitListText(answer.answerText);
};

const getCurrentEmergencyContactValue = (context: PreVisitAutofillContext): CanonicalEmergencyContactValue => ({
  name: normalizeString(context.emergencyContactName),
  phone: normalizeString(context.emergencyContactPhone),
});

const buildDraftFromAnswer = (args: {
  patientId: string;
  sourceKind: PatientCanonicalUpdateSourceKind;
  sourceRecordId: string;
  answer: PreVisitAnswerDraft;
  context: PreVisitAutofillContext;
}): CanonicalUpdateDraft | null => {
  const { answer, context } = args;
  const source = answer.autofillSource;

  if (!source || !answer.confirmedByPatient) {
    return null;
  }

  const base = {
    patientId: args.patientId,
    sourceKind: args.sourceKind,
    sourceRecordId: args.sourceRecordId,
    metadata: {
      questionKey: answer.questionKey,
      questionLabel: answer.questionLabel,
      questionType: answer.questionType,
      autofillSource: source,
    },
  };

  switch (source) {
    case 'profile.full_name': {
      const currentValue = toScalarValue(context.fullName);
      const proposedValue = toScalarValue(answer.answerText);
      return sameScalar(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: source,
            displayLabel: 'Full name',
            applyStrategy: 'user_profile_scalar',
            currentValue,
            proposedValue,
            requiresDoctorReview: false,
          };
    }
    case 'profile.date_of_birth': {
      const currentValue = toScalarValue(context.dateOfBirth);
      const proposedValue = toScalarValue(answer.answerText);
      return sameScalar(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: source,
            displayLabel: 'Date of birth',
            applyStrategy: 'user_profile_scalar',
            currentValue,
            proposedValue,
            requiresDoctorReview: false,
          };
    }
    case 'profile.gender': {
      const currentValue = toScalarValue(context.gender);
      const proposedValue = toScalarValue(answer.answerText);
      return sameScalar(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: source,
            displayLabel: 'Gender',
            applyStrategy: 'user_profile_scalar',
            currentValue,
            proposedValue,
            requiresDoctorReview: false,
          };
    }
    case 'profile.address': {
      const currentValue = toScalarValue(context.address);
      const proposedValue = toScalarValue(answer.answerText);
      return sameScalar(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: source,
            displayLabel: 'Address',
            applyStrategy: 'user_profile_scalar',
            currentValue,
            proposedValue,
            requiresDoctorReview: false,
          };
    }
    case 'profile.phone': {
      const currentValue = toScalarValue(context.phone);
      const proposedValue = toScalarValue(answer.answerText);
      return sameScalar(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: source,
            displayLabel: 'Phone number',
            applyStrategy: 'user_profile_scalar',
            currentValue,
            proposedValue,
            requiresDoctorReview: false,
          };
    }
    case 'profile.city': {
      const currentValue = toScalarValue(context.city);
      const proposedValue = toScalarValue(answer.answerText);
      return sameScalar(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: source,
            displayLabel: 'City',
            applyStrategy: 'user_profile_scalar',
            currentValue,
            proposedValue,
            requiresDoctorReview: false,
          };
    }
    case 'patient.blood_type': {
      const currentValue = toScalarValue(context.bloodType);
      const proposedValue = toScalarValue(answer.answerText);
      return sameScalar(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: source,
            displayLabel: 'Blood type',
            applyStrategy: 'patient_profile_scalar',
            currentValue,
            proposedValue,
            requiresDoctorReview: false,
          };
    }
    case 'patient.emergency_contact':
    case 'patient.emergency_contact_name':
    case 'patient.emergency_contact_phone': {
      const currentValue = getCurrentEmergencyContactValue(context);
      const proposedValue =
        source === 'patient.emergency_contact_name'
          ? { name: normalizeString(answer.answerText), phone: currentValue.phone }
          : source === 'patient.emergency_contact_phone'
            ? { name: currentValue.name, phone: normalizeString(answer.answerText) }
            : parseEmergencyContact(answer.answerText);

      if (!proposedValue.name && !proposedValue.phone) {
        return null;
      }

      return sameEmergencyContact(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: 'patient.emergency_contact',
            displayLabel: 'Emergency contact',
            applyStrategy: 'patient_profile_emergency_contact',
            currentValue,
            proposedValue,
            requiresDoctorReview: false,
          };
    }
    case 'medical_conditions.active': {
      const currentValue = toListValue(context.activeConditions);
      const proposedValue = toListValue(getAnswerList(answer));
      return sameList(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: source,
            displayLabel: 'Current medical conditions',
            applyStrategy: 'medical_conditions_replace',
            currentValue,
            proposedValue,
            requiresDoctorReview: false,
          };
    }
    case 'allergies.active': {
      const currentValue = toListValue(context.allergies);
      const proposedValue = toListValue(getAnswerList(answer));
      return sameList(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: source,
            displayLabel: 'Known allergies',
            applyStrategy: 'allergies_replace',
            currentValue,
            proposedValue,
            requiresDoctorReview: false,
          };
    }
    case 'prescriptions.active': {
      const currentValue = toListValue(context.activeMedications);
      const proposedValue = toListValue(getAnswerList(answer));
      return sameList(currentValue, proposedValue)
        ? null
        : {
            ...base,
            targetField: 'medications.current',
            displayLabel: 'Current medications',
            applyStrategy: 'patient_reported_medications_replace',
            currentValue,
            proposedValue,
            requiresDoctorReview: true,
          };
    }
    default:
      return null;
  }
};

export const buildPreVisitCanonicalUpdateDrafts = (args: {
  patientId: string;
  sourceRecordId: string;
  answers: PreVisitAnswerDraft[];
  context: PreVisitAutofillContext;
}) => {
  const draftsByTarget = new Map<string, CanonicalUpdateDraft>();

  for (const answer of args.answers) {
    const draft = buildDraftFromAnswer({
      patientId: args.patientId,
      sourceKind: 'pre_visit_assessment',
      sourceRecordId: args.sourceRecordId,
      answer,
      context: args.context,
    });

    if (draft) {
      draftsByTarget.set(draft.targetField, draft);
    }
  }

  return Array.from(draftsByTarget.values());
};

const mapCanonicalUpdateRequest = (record: {
  id: string;
  patient_id: string;
  source_kind: PatientCanonicalUpdateSourceKind;
  source_record_id: string;
  target_field: string;
  display_label: string;
  apply_strategy: PatientCanonicalUpdateStrategy;
  current_value: unknown;
  proposed_value: unknown;
  status: PatientCanonicalUpdateStatus;
  requires_doctor_review: boolean;
  metadata: unknown;
  confirmed_at: string | null;
  applied_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}): CanonicalUpdateRequestRecord => ({
  id: record.id,
  patientId: record.patient_id,
  sourceKind: record.source_kind,
  sourceRecordId: record.source_record_id,
  targetField: record.target_field,
  displayLabel: record.display_label,
  applyStrategy: record.apply_strategy,
  currentValue:
    record.current_value && typeof record.current_value === 'object'
      ? (record.current_value as CanonicalStoredValue)
      : { value: null },
  proposedValue:
    record.proposed_value && typeof record.proposed_value === 'object'
      ? (record.proposed_value as CanonicalStoredValue)
      : { value: null },
  status: record.status,
  requiresDoctorReview: record.requires_doctor_review,
  metadata: record.metadata && typeof record.metadata === 'object' ? (record.metadata as Record<string, unknown>) : {},
  confirmedAt: record.confirmed_at,
  appliedAt: record.applied_at,
  dismissedAt: record.dismissed_at,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

export const fetchCanonicalUpdateRequests = async (args: {
  patientId: string;
  sourceKind?: PatientCanonicalUpdateSourceKind;
  sourceRecordId?: string | null;
  status?: PatientCanonicalUpdateStatus;
}) => {
  let query = supabase
    .from('patient_canonical_update_requests')
    .select(
      'id, patient_id, source_kind, source_record_id, target_field, display_label, apply_strategy, current_value, proposed_value, status, requires_doctor_review, metadata, confirmed_at, applied_at, dismissed_at, created_at, updated_at'
    )
    .eq('patient_id', args.patientId)
    .order('created_at', { ascending: false });

  if (args.sourceKind) {
    query = query.eq('source_kind', args.sourceKind);
  }

  if (args.sourceRecordId) {
    query = query.eq('source_record_id', args.sourceRecordId);
  }

  if (args.status) {
    query = query.eq('status', args.status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCanonicalUpdateRequest);
};

export const stageCanonicalUpdateRequests = async (args: {
  patientId: string;
  sourceKind: PatientCanonicalUpdateSourceKind;
  sourceRecordId: string;
  drafts: CanonicalUpdateDraft[];
}) => {
  const nextTargets = args.drafts.map((draft) => draft.targetField);
  const { data: existingPending, error: existingPendingError } = await supabase
    .from('patient_canonical_update_requests')
    .select('id, target_field')
    .eq('patient_id', args.patientId)
    .eq('source_kind', args.sourceKind)
    .eq('source_record_id', args.sourceRecordId)
    .eq('status', 'pending');

  if (existingPendingError) {
    throw existingPendingError;
  }

  const dismissIds = (existingPending ?? [])
    .filter((record) => !nextTargets.includes(record.target_field))
    .map((record) => record.id);

  if (dismissIds.length > 0) {
    const { error: dismissError } = await supabase
      .from('patient_canonical_update_requests')
      .update({
        status: 'dismissed' as const,
        dismissed_at: new Date().toISOString(),
      })
      .in('id', dismissIds);

    if (dismissError) {
      throw dismissError;
    }
  }

  if (args.drafts.length === 0) {
    return [] as CanonicalUpdateRequestRecord[];
  }

  const now = new Date().toISOString();
  const payload = args.drafts.map((draft) => ({
    patient_id: draft.patientId,
    source_kind: draft.sourceKind,
    source_record_id: draft.sourceRecordId,
    target_field: draft.targetField,
    display_label: draft.displayLabel,
    apply_strategy: draft.applyStrategy,
    current_value: draft.currentValue,
    proposed_value: draft.proposedValue,
    status: 'pending' as const,
    requires_doctor_review: draft.requiresDoctorReview,
    metadata: draft.metadata,
    confirmed_at: null,
    applied_at: null,
    dismissed_at: null,
    updated_at: now,
  }));

  const { error: upsertError } = await supabase.from('patient_canonical_update_requests').upsert(payload, {
    onConflict: 'source_kind,source_record_id,target_field',
  });

  if (upsertError) {
    throw upsertError;
  }

  return fetchCanonicalUpdateRequests({
    patientId: args.patientId,
    sourceKind: args.sourceKind,
    sourceRecordId: args.sourceRecordId,
    status: 'pending',
  });
};

export const applyCanonicalUpdateRequests = async (requestIds: string[]) => {
  if (requestIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc('apply_patient_canonical_update_requests', {
    p_request_ids: requestIds,
  });

  if (error) {
    console.error('Unable to apply canonical update requests', error);
    throw new Error(
      i18n.t('records.errors.applyUpdates', {
        defaultValue: 'Unable to apply those record updates right now.',
      })
    );
  }

  return Array.isArray(data) ? data : [];
};

export const dismissCanonicalUpdateRequests = async (requestIds: string[]) => {
  if (requestIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('patient_canonical_update_requests')
    .update({
      status: 'dismissed' as const,
      dismissed_at: new Date().toISOString(),
    })
    .in('id', requestIds);

  if (error) {
    console.error('Unable to dismiss canonical update requests', error);
    throw new Error(
      i18n.t('records.errors.dismissUpdates', {
        defaultValue: 'Unable to dismiss those updates right now.',
      })
    );
  }
};

export const formatCanonicalValueForReview = (value: CanonicalStoredValue) => {
  if ('values' in value) {
    return value.values.length > 0 ? value.values.join(', ') : 'None provided';
  }

  if ('name' in value) {
    return [value.name, value.phone].filter(Boolean).join(' • ') || 'None provided';
  }

  return value.value?.trim() || 'None provided';
};
