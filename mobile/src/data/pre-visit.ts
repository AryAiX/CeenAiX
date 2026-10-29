import { dateTimeFormatWithNumerals, resolveLocale } from '@ceenaix/shared/i18n-ui';
import { buildPatientMemoryValue } from '@ceenaix/shared/patient-memory';
import type { PreVisitAnswerDraft, PreVisitTemplateQuestionDraft } from '@ceenaix/shared/pre-visit';
import type { usePreVisitAssessment } from '@/data/web/hooks/use-pre-visit';
import {
  applyCanonicalUpdateRequests,
  buildPreVisitCanonicalUpdateDrafts,
  dismissCanonicalUpdateRequests,
  stageCanonicalUpdateRequests,
} from '@/data/web/lib/canonical-record-updates';
import { generatePreVisitSummary } from '@/lib/ai';
import { supabase } from '@/lib/supabase';

// Persistence for the patient pre-visit intake, mirrored from the handlers
// inside web `src/pages/patient/PreVisitAssessment.tsx` (they are not in a
// shared hook): answers upsert, patient memory facts, canonical update
// staging, AI summary via the `ai-chat` Edge Function, assessment status.

export type PreVisitAssessmentData = NonNullable<ReturnType<typeof usePreVisitAssessment>['data']>;

export const formatPreVisitAppointmentLabel = (appointment: PreVisitAssessmentData['assessment']['appointment'], language: string) => {
  const dateLabel = new Date(appointment.scheduledAt).toLocaleString(
    resolveLocale(language),
    dateTimeFormatWithNumerals(language, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  );
  return appointment.chiefComplaint
    ? `${dateLabel} with ${appointment.doctorName} for ${appointment.chiefComplaint}`
    : `${dateLabel} with ${appointment.doctorName}`;
};

export const hasAnswerValue = (answer: PreVisitAnswerDraft | undefined) =>
  Boolean(answer?.answerText?.trim()) || (Array.isArray(answer?.answerJson) && answer.answerJson.length > 0);

export const needsAutofillConfirmation = (answer: PreVisitAnswerDraft | undefined) => Boolean(answer?.autofilled && !answer.confirmedByPatient);

export const getRequiredQuestionIssues = (questions: PreVisitTemplateQuestionDraft[], answers: PreVisitAnswerDraft[]) =>
  questions
    .filter((question) => question.required)
    .filter((question) => {
      const answer = answers.find((current) => current.questionKey === question.key);
      return !hasAnswerValue(answer) || needsAutofillConfirmation(answer);
    })
    .map((question) => ({ key: question.key, label: question.label }));

export function applyAnswer(answers: PreVisitAnswerDraft[], question: PreVisitTemplateQuestionDraft, value: string | string[]): PreVisitAnswerDraft[] {
  const next = [...answers];
  const index = next.findIndex((answer) => answer.questionKey === question.key);
  const current = index >= 0 ? next[index] : undefined;
  const answer: PreVisitAnswerDraft = {
    questionKey: question.key,
    questionLabel: question.label,
    questionType: question.type,
    memoryKey: current ? current.memoryKey : question.memoryKey,
    answerText: Array.isArray(value) ? value.join(', ') : value,
    answerJson: question.type === 'multi_select' ? value : null,
    autofillValue: current ? current.autofillValue : value,
    autofillSource: current ? current.autofillSource : question.autofillSource,
    autofillLabel: current ? current.autofillLabel : null,
    autofilled: current ? current.autofilled : false,
    confirmedByPatient: true,
    answeredAt: new Date().toISOString(),
  };
  if (current) next[index] = { ...current, ...answer };
  else next.push(answer);
  return next;
}

export const confirmAutofill = (answers: PreVisitAnswerDraft[], questionKey: string): PreVisitAnswerDraft[] =>
  answers.map((answer) => (answer.questionKey === questionKey ? { ...answer, confirmedByPatient: true, answeredAt: new Date().toISOString() } : answer));

export async function persistPreVisitAssessment(
  data: PreVisitAssessmentData,
  answers: PreVisitAnswerDraft[],
  status: 'in_progress' | 'completed'
): Promise<void> {
  const now = new Date().toISOString();
  const { assessment } = data;

  const { error: answersError } = await supabase.from('appointment_pre_visit_answers').upsert(
    answers.map((answer) => ({
      assessment_id: assessment.id,
      question_key: answer.questionKey,
      question_label: answer.questionLabel,
      question_type: answer.questionType,
      answer_text: answer.answerText?.trim() || null,
      answer_json: answer.answerJson ?? null,
      autofill_value: answer.autofillValue ?? null,
      autofill_source: answer.autofillSource,
      autofilled: answer.autofilled,
      confirmed_by_patient: answer.confirmedByPatient,
      answered_at: answer.answeredAt ?? now,
    })),
    { onConflict: 'assessment_id,question_key' }
  );
  if (answersError) throw answersError;

  const { error: deleteError } = await supabase
    .from('patient_memory_facts')
    .delete()
    .eq('patient_id', assessment.patientId)
    .eq('source_kind', 'pre_visit_answer')
    .eq('source_record_id', assessment.id);
  if (deleteError) throw deleteError;

  const facts = answers.flatMap((answer) => {
    if (!answer.confirmedByPatient || !answer.memoryKey) return [];
    const value = buildPatientMemoryValue({ questionType: answer.questionType, answerText: answer.answerText, answerJson: answer.answerJson });
    const hasValue =
      Boolean(value.valueText?.trim()) ||
      (Array.isArray(value.valueJson) && value.valueJson.length > 0) ||
      typeof value.valueJson === 'number' ||
      typeof value.valueJson === 'boolean';
    if (!hasValue) return [];
    return [
      {
        patient_id: assessment.patientId,
        source_kind: 'pre_visit_answer' as const,
        source_record_id: assessment.id,
        memory_key: answer.memoryKey,
        label: answer.questionLabel,
        value_type: value.valueType,
        value_text: value.valueText,
        value_json: value.valueJson,
        status: 'confirmed' as const,
        confidence: 1,
        usable_in_chat: true,
        usable_in_forms: true,
        confirmed_at: answer.answeredAt ?? now,
        metadata: {
          assessmentId: assessment.id,
          appointmentId: assessment.appointmentId,
          questionKey: answer.questionKey,
          questionType: answer.questionType,
        },
      },
    ];
  });
  if (facts.length > 0) {
    const { error: factsError } = await supabase.from('patient_memory_facts').insert(facts);
    if (factsError) throw factsError;
  }

  const { error: assessmentError } = await supabase
    .from('appointment_pre_visit_assessments')
    .update({
      status,
      started_at: assessment.startedAt ?? now,
      completed_at: status === 'completed' ? now : null,
      last_answered_at: now,
    })
    .eq('id', assessment.id);
  if (assessmentError) throw assessmentError;
}

async function summarizeAndComplete(data: PreVisitAssessmentData, answers: PreVisitAnswerDraft[], language: string) {
  const { assessment } = data;
  const summary = await generatePreVisitSummary({
    appointmentLabel: formatPreVisitAppointmentLabel(assessment.appointment, language),
    templateTitle: assessment.templateTitle,
    patientId: assessment.patientId,
    answers,
  });
  const { error } = await supabase.from('appointment_pre_visit_summaries').upsert(
    {
      assessment_id: assessment.id,
      appointment_id: assessment.appointmentId,
      patient_id: assessment.patientId,
      doctor_id: assessment.doctorId,
      summary_text: summary.summaryText,
      key_points: summary.keyPoints,
      risk_flags: summary.riskFlags,
      pending_questions: summary.pendingQuestions,
      generated_by: 'ai',
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'assessment_id' }
  );
  if (error) throw error;
  await persistPreVisitAssessment(data, answers, 'completed');
}

/**
 * "Complete intake": saves answers, stages record updates detected from the
 * answers and — when there are none to review — generates the AI summary and
 * marks the assessment completed. Returns `'review'` when updates need the
 * patient's decision first.
 */
export async function completePreVisitAssessment(
  data: PreVisitAssessmentData,
  answers: PreVisitAnswerDraft[],
  language: string
): Promise<'completed' | 'review'> {
  await persistPreVisitAssessment(data, answers, 'in_progress');
  const pending = await stageCanonicalUpdateRequests({
    patientId: data.assessment.patientId,
    sourceKind: 'pre_visit_assessment',
    sourceRecordId: data.assessment.id,
    drafts: buildPreVisitCanonicalUpdateDrafts({
      patientId: data.assessment.patientId,
      sourceRecordId: data.assessment.id,
      answers,
      context: data.autofillContext,
    }),
  });
  if (pending.length > 0) return 'review';
  await summarizeAndComplete(data, answers, language);
  return 'completed';
}

export async function finishPreVisitWithUpdates(
  data: PreVisitAssessmentData,
  answers: PreVisitAnswerDraft[],
  language: string,
  mode: 'apply' | 'skip'
): Promise<void> {
  const ids = data.pendingCanonicalUpdates.map((update) => update.id);
  if (mode === 'apply') await applyCanonicalUpdateRequests(ids);
  else await dismissCanonicalUpdateRequests(ids);
  await summarizeAndComplete(data, answers, language);
}
