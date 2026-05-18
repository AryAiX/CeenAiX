import { supabase } from '../lib/supabase';
import type { CanonicalUpdateRequestRecord } from '../lib/canonical-record-updates';
import {
  type DoctorPreVisitTemplateRecord,
  type PatientPreVisitAssessmentRecord,
  parseTemplateSnapshot,
  type PreVisitAutofillContext,
  type PreVisitAnswerDraft,
  createAutofilledAnswer,
  getAutofillLabel,
} from '../lib/pre-visit';
import i18n from 'i18next';
import { resolvePatientMemoryFacts } from '../lib/patient-memory';
import { useQuery } from './use-query';

const doctorFallback = () => i18n.t('shared.doctor', { defaultValue: 'Doctor' });

interface UsePreVisitAssessmentData {
  assessment: PatientPreVisitAssessmentRecord;
  answers: PreVisitAnswerDraft[];
  autofillContext: PreVisitAutofillContext;
  pendingCanonicalUpdates: CanonicalUpdateRequestRecord[];
}

const buildAutofillContext = async (patientId: string): Promise<PreVisitAutofillContext> => {
  const [
    { data: userProfile, error: userProfileError },
    { data: patientProfile, error: patientProfileError },
    { data: conditions, error: conditionsError },
    { data: allergies, error: allergiesError },
    { data: prescriptions, error: prescriptionsError },
    { data: reportedMedications, error: reportedMedicationsError },
    { data: memoryFacts, error: memoryFactsError },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('full_name, date_of_birth, gender, address, phone, city')
      .eq('user_id', patientId)
      .maybeSingle(),
    supabase
      .from('patient_profiles')
      .select('blood_type, emergency_contact_name, emergency_contact_phone')
      .eq('user_id', patientId)
      .maybeSingle(),
    supabase
      .from('medical_conditions')
      .select('condition_name, status')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
    supabase
      .from('allergies')
      .select('allergen')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
    supabase
      .from('prescriptions')
      .select('id, status')
      .eq('patient_id', patientId)
      .eq('is_deleted', false),
    supabase
      .from('patient_reported_medications')
      .select('medication_name')
      .eq('patient_id', patientId)
      .eq('is_current', true)
      .eq('is_deleted', false),
    supabase
      .from('patient_memory_facts')
      .select(
        'id, patient_id, source_kind, source_record_id, memory_key, label, value_type, value_text, value_json, status, confidence, usable_in_chat, usable_in_forms, confirmed_at, last_used_at, metadata, created_at, updated_at'
      )
      .eq('patient_id', patientId)
      .eq('usable_in_forms', true)
      .order('created_at', { ascending: false }),
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

  if (memoryFactsError) {
    throw memoryFactsError;
  }

  if (reportedMedicationsError) {
    throw reportedMedicationsError;
  }

  const activePrescriptionIds = (prescriptions ?? [])
    .filter((prescription) => prescription.status === 'active')
    .map((prescription) => prescription.id);

  let activeMedications: string[] = [];

  if (activePrescriptionIds.length > 0) {
    const { data: prescriptionItems, error: prescriptionItemsError } = await supabase
      .from('prescription_items')
      .select('medication_name, prescription_id')
      .in('prescription_id', activePrescriptionIds);

    if (prescriptionItemsError) {
      throw prescriptionItemsError;
    }

    activeMedications = (prescriptionItems ?? [])
      .map((item) => item.medication_name?.trim())
      .filter((value): value is string => Boolean(value));
  }

  activeMedications = Array.from(
    new Set([
      ...activeMedications,
      ...(reportedMedications ?? [])
        .map((item) => item.medication_name?.trim())
        .filter((value): value is string => Boolean(value)),
    ])
  );

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
    activeMedications,
    memoryFactsByKey: resolvePatientMemoryFacts(
      (memoryFacts ?? []).map((fact) => ({
        id: fact.id,
        patientId: fact.patient_id,
        sourceKind: fact.source_kind,
        sourceRecordId: fact.source_record_id,
        memoryKey: fact.memory_key,
        label: fact.label,
        valueType: fact.value_type,
        valueText: fact.value_text,
        valueJson: fact.value_json,
        status: fact.status,
        confidence: typeof fact.confidence === 'number' ? fact.confidence : Number(fact.confidence ?? 0),
        usableInChat: fact.usable_in_chat,
        usableInForms: fact.usable_in_forms,
        confirmedAt: fact.confirmed_at,
        lastUsedAt: fact.last_used_at,
        metadata:
          fact.metadata && typeof fact.metadata === 'object' ? (fact.metadata as Record<string, unknown>) : {},
        createdAt: fact.created_at,
        updatedAt: fact.updated_at,
      }))
    ),
  };
};

export function useDoctorPreVisitTemplates(doctorUserId: string | null | undefined) {
  return useQuery<DoctorPreVisitTemplateRecord[]>(async () => {
    if (!doctorUserId) {
      return [];
    }

    const { data: templates, error: templatesError } = await supabase
      .from('pre_visit_templates')
      .select(
        'id, title, description, status, is_active, specialization_id, published_at, source_bucket, source_path, source_file_name, extraction_metadata'
      )
      .eq('doctor_user_id', doctorUserId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (templatesError) {
      throw templatesError;
    }

    const templateIds = (templates ?? []).map((template) => template.id);
    const { data: questions, error: questionsError } = templateIds.length
      ? await supabase
          .from('pre_visit_template_questions')
          .select(
            'template_id, question_key, label, help_text, question_type, display_order, is_required, options, autofill_source, memory_key, ai_instructions'
          )
          .in('template_id', templateIds)
          .order('display_order', { ascending: true })
      : { data: [], error: null };

    if (questionsError) {
      throw questionsError;
    }

    return (templates ?? []).map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description,
      status: template.status,
      isActive: template.is_active,
      specializationId: template.specialization_id,
      publishedAt: template.published_at,
      sourceBucket: template.source_bucket === 'documents' ? 'documents' : null,
      sourcePath: template.source_path,
      sourceFileName: template.source_file_name,
      extractionMetadata:
        template.extraction_metadata && typeof template.extraction_metadata === 'object'
          ? (template.extraction_metadata as Record<string, unknown>)
          : {},
      questions:
        questions
          ?.filter((question) => question.template_id === template.id)
          .map((question) => ({
            key: question.question_key,
            label: question.label,
            helpText: question.help_text,
            type: question.question_type,
            required: question.is_required,
            options: Array.isArray(question.options) ? question.options : [],
            displayOrder: question.display_order,
            autofillSource: question.autofill_source,
            memoryKey: question.memory_key,
            aiInstructions: question.ai_instructions,
          })) ?? [],
    }));
  }, [doctorUserId ?? '']);
}

export function usePatientPreVisitAssessments(patientUserId: string | null | undefined) {
  return useQuery<PatientPreVisitAssessmentRecord[]>(async () => {
    if (!patientUserId) {
      return [];
    }

    const { data: assessments, error: assessmentsError } = await supabase
      .from('appointment_pre_visit_assessments')
      .select(
        'id, appointment_id, patient_id, doctor_id, template_id, template_title, template_snapshot, status, due_at, started_at, completed_at, reviewed_at, last_answered_at'
      )
      .eq('patient_id', patientUserId)
      .order('created_at', { ascending: false });

    if (assessmentsError) {
      throw assessmentsError;
    }

    const appointmentIds = (assessments ?? []).map((assessment) => assessment.appointment_id);
    const doctorIds = Array.from(new Set((assessments ?? []).map((assessment) => assessment.doctor_id)));
    const assessmentIds = (assessments ?? []).map((assessment) => assessment.id);

    const [
      { data: appointments, error: appointmentsError },
      { data: doctorProfiles, error: doctorProfilesError },
      { data: summaries, error: summariesError },
    ] = await Promise.all([
      appointmentIds.length
        ? supabase
            .from('appointments')
            .select('id, scheduled_at, chief_complaint')
            .in('id', appointmentIds)
            .eq('is_deleted', false)
        : Promise.resolve({ data: [], error: null }),
      doctorIds.length
        ? supabase.from('user_profiles').select('user_id, full_name').in('user_id', doctorIds)
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? supabase
            .from('appointment_pre_visit_summaries')
            .select('assessment_id, summary_text, key_points, risk_flags, pending_questions, generated_at')
            .in('assessment_id', assessmentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (appointmentsError) {
      throw appointmentsError;
    }

    if (doctorProfilesError) {
      throw doctorProfilesError;
    }

    if (summariesError) {
      throw summariesError;
    }

    const appointmentById = new Map((appointments ?? []).map((appointment) => [appointment.id, appointment]));
    const doctorNameById = new Map((doctorProfiles ?? []).map((profile) => [profile.user_id, profile.full_name ?? doctorFallback()]));
    const summaryByAssessmentId = new Map((summaries ?? []).map((summary) => [summary.assessment_id, summary]));

    return (assessments ?? []).map((assessment) => {
      const appointment = appointmentById.get(assessment.appointment_id);
      const summary = summaryByAssessmentId.get(assessment.id);

      return {
        id: assessment.id,
        appointmentId: assessment.appointment_id,
        patientId: assessment.patient_id,
        doctorId: assessment.doctor_id,
        templateId: assessment.template_id,
        templateTitle: assessment.template_title,
        status: assessment.status,
        dueAt: assessment.due_at,
        startedAt: assessment.started_at,
        completedAt: assessment.completed_at,
        reviewedAt: assessment.reviewed_at,
        lastAnsweredAt: assessment.last_answered_at,
        appointment: {
          scheduledAt: appointment?.scheduled_at ?? new Date().toISOString(),
          chiefComplaint: appointment?.chief_complaint ?? null,
          doctorName: doctorNameById.get(assessment.doctor_id) ?? doctorFallback(),
        },
        summary: summary
          ? {
              summaryText: summary.summary_text,
              keyPoints: Array.isArray(summary.key_points)
                ? summary.key_points.filter((value): value is string => typeof value === 'string')
                : [],
              riskFlags: Array.isArray(summary.risk_flags)
                ? summary.risk_flags.filter((value): value is string => typeof value === 'string')
                : [],
              pendingQuestions: Array.isArray(summary.pending_questions)
                ? summary.pending_questions.filter((value): value is string => typeof value === 'string')
                : [],
              generatedAt: summary.generated_at,
            }
          : null,
        snapshot: parseTemplateSnapshot(assessment.template_snapshot),
      };
    });
  }, [patientUserId ?? '']);
}

export function usePreVisitAssessment(assessmentId: string | null | undefined) {
  return useQuery<UsePreVisitAssessmentData | null>(async () => {
    if (!assessmentId) {
      return null;
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from('appointment_pre_visit_assessments')
      .select(
        'id, appointment_id, patient_id, doctor_id, template_id, template_title, template_snapshot, status, due_at, started_at, completed_at, reviewed_at, last_answered_at'
      )
      .eq('id', assessmentId)
      .maybeSingle();

    if (assessmentError) {
      throw assessmentError;
    }

    if (!assessment) {
      return null;
    }

    const [
      { data: appointment, error: appointmentError },
      { data: doctorProfile, error: doctorProfileError },
      { data: answers, error: answersError },
      { data: summary, error: summaryError },
      { data: pendingCanonicalUpdates, error: pendingCanonicalUpdatesError },
    ] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, scheduled_at, chief_complaint')
        .eq('id', assessment.appointment_id)
        .eq('is_deleted', false)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .eq('user_id', assessment.doctor_id)
        .maybeSingle(),
      supabase
        .from('appointment_pre_visit_answers')
        .select(
          'question_key, question_label, question_type, answer_text, answer_json, autofill_value, autofill_source, autofilled, confirmed_by_patient, answered_at'
        )
        .eq('assessment_id', assessment.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('appointment_pre_visit_summaries')
        .select('summary_text, key_points, risk_flags, pending_questions, generated_at')
        .eq('assessment_id', assessment.id)
        .maybeSingle(),
      supabase
        .from('patient_canonical_update_requests')
        .select(
          'id, patient_id, source_kind, source_record_id, target_field, display_label, apply_strategy, current_value, proposed_value, status, requires_doctor_review, metadata, confirmed_at, applied_at, dismissed_at, created_at, updated_at'
        )
        .eq('patient_id', assessment.patient_id)
        .eq('source_kind', 'pre_visit_assessment')
        .eq('source_record_id', assessment.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
    ]);

    if (appointmentError) {
      throw appointmentError;
    }

    if (doctorProfileError) {
      throw doctorProfileError;
    }

    if (answersError) {
      throw answersError;
    }

    if (summaryError) {
      throw summaryError;
    }

    if (pendingCanonicalUpdatesError) {
      throw pendingCanonicalUpdatesError;
    }

    const autofillContext = await buildAutofillContext(assessment.patient_id);
    const snapshot = parseTemplateSnapshot(assessment.template_snapshot);
    const storedAnswerByKey = new Map((answers ?? []).map((answer) => [answer.question_key, answer]));
    const mergedAnswers = snapshot.questions.map((question) => {
      const storedAnswer = storedAnswerByKey.get(question.key);

      if (!storedAnswer) {
        return createAutofilledAnswer(question, autofillContext);
      }

      return {
        questionKey: question.key,
        questionLabel: question.label,
        questionType: question.type,
        memoryKey: question.memoryKey,
        answerText: storedAnswer.answer_text,
        answerJson: storedAnswer.answer_json,
        autofillValue: storedAnswer.autofill_value,
        autofillSource: storedAnswer.autofill_source,
        autofillLabel: getAutofillLabel(storedAnswer.autofill_source),
        autofilled: storedAnswer.autofilled,
        confirmedByPatient: storedAnswer.confirmed_by_patient,
        answeredAt: storedAnswer.answered_at,
      } satisfies PreVisitAnswerDraft;
    });

    return {
      assessment: {
        id: assessment.id,
        appointmentId: assessment.appointment_id,
        patientId: assessment.patient_id,
        doctorId: assessment.doctor_id,
        templateId: assessment.template_id,
        templateTitle: assessment.template_title,
        status: assessment.status,
        dueAt: assessment.due_at,
        startedAt: assessment.started_at,
        completedAt: assessment.completed_at,
        reviewedAt: assessment.reviewed_at,
        lastAnsweredAt: assessment.last_answered_at,
        appointment: {
          scheduledAt: appointment?.scheduled_at ?? new Date().toISOString(),
          chiefComplaint: appointment?.chief_complaint ?? null,
          doctorName: doctorProfile?.full_name ?? doctorFallback(),
        },
        summary: summary
          ? {
              summaryText: summary.summary_text,
              keyPoints: Array.isArray(summary.key_points)
                ? summary.key_points.filter((value): value is string => typeof value === 'string')
                : [],
              riskFlags: Array.isArray(summary.risk_flags)
                ? summary.risk_flags.filter((value): value is string => typeof value === 'string')
                : [],
              pendingQuestions: Array.isArray(summary.pending_questions)
                ? summary.pending_questions.filter((value): value is string => typeof value === 'string')
                : [],
              generatedAt: summary.generated_at,
            }
          : null,
        snapshot,
      },
      answers: mergedAnswers,
      autofillContext,
      pendingCanonicalUpdates: (pendingCanonicalUpdates ?? []).map((update) => ({
        id: update.id,
        patientId: update.patient_id,
        sourceKind: update.source_kind,
        sourceRecordId: update.source_record_id,
        targetField: update.target_field,
        displayLabel: update.display_label,
        applyStrategy: update.apply_strategy,
        currentValue:
          update.current_value && typeof update.current_value === 'object'
            ? (update.current_value as CanonicalUpdateRequestRecord['currentValue'])
            : { value: null },
        proposedValue:
          update.proposed_value && typeof update.proposed_value === 'object'
            ? (update.proposed_value as CanonicalUpdateRequestRecord['proposedValue'])
            : { value: null },
        status: update.status,
        requiresDoctorReview: update.requires_doctor_review,
        metadata: update.metadata && typeof update.metadata === 'object' ? (update.metadata as Record<string, unknown>) : {},
        confirmedAt: update.confirmed_at,
        appliedAt: update.applied_at,
        dismissedAt: update.dismissed_at,
        createdAt: update.created_at,
        updatedAt: update.updated_at,
      })),
    };
  }, [assessmentId ?? '']);
}
