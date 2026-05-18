import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Loader2, Save, Sparkles } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePreVisitAssessment } from '../../hooks';
import { generatePreVisitSummary } from '../../lib/ai';
import {
  applyCanonicalUpdateRequests,
  buildPreVisitCanonicalUpdateDrafts,
  dismissCanonicalUpdateRequests,
  formatCanonicalValueForReview,
  stageCanonicalUpdateRequests,
} from '../../lib/canonical-record-updates';
import { formatPreVisitStatus, type PreVisitAnswerDraft, type PreVisitTemplateQuestionDraft } from '../../lib/pre-visit';
import { buildPatientMemoryValue } from '../../lib/patient-memory';
import { supabase } from '../../lib/supabase';
import { dateTimeFormatWithNumerals, resolveLocale } from '../../lib/i18n-ui';

const formatAppointmentLabel = (
  scheduledAt: string,
  doctorName: string,
  chiefComplaint: string | null,
  language: string
) => {
  const locale = resolveLocale(language);
  const dateLabel = new Date(scheduledAt).toLocaleString(
    locale,
    dateTimeFormatWithNumerals(language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  );

  return chiefComplaint ? `${dateLabel} with ${doctorName} for ${chiefComplaint}` : `${dateLabel} with ${doctorName}`;
};

const getRequiredQuestionIssues = (
  questions: PreVisitTemplateQuestionDraft[],
  answers: PreVisitAnswerDraft[]
) => {
  return questions
    .filter((question) => question.required)
    .filter((question) => {
      const answer = answers.find((currentAnswer) => currentAnswer.questionKey === question.key);

      if (!answer) {
        return true;
      }

      const hasValue =
        Boolean(answer.answerText?.trim()) ||
        (Array.isArray(answer.answerJson) && answer.answerJson.length > 0);

      if (!hasValue) {
        return true;
      }

      return answer.autofilled && !answer.confirmedByPatient;
    })
    .map((question) => ({ key: question.key, label: question.label }));
};

export const PatientPreVisitAssessment: React.FC = () => {
  const { i18n, t } = useTranslation('common');
  const locale = resolveLocale(i18n.language);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(i18n.language, options);
  const navigate = useNavigate();
  const { assessmentId } = useParams();
  const { data, loading, error, refetch } = usePreVisitAssessment(assessmentId ?? null);
  const [answers, setAnswers] = useState<PreVisitAnswerDraft[]>([]);
  const [hasHydratedAnswers, setHasHydratedAnswers] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCanonicalUpdateReview, setShowCanonicalUpdateReview] = useState(false);
  const questionRefs = useRef<Record<string, HTMLElement | null>>({});
  const canonicalReviewRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if ((data?.pendingCanonicalUpdates.length ?? 0) > 0) {
      setShowCanonicalUpdateReview(true);
    }
  }, [data?.pendingCanonicalUpdates.length]);

  // Reset the hydration flag whenever the route assessmentId changes so a
  // second pre-visit opened in the same SPA session does not display the
  // previous assessment's answers.
  useEffect(() => {
    setHasHydratedAnswers(false);
    setAnswers([]);
    setShowCanonicalUpdateReview(false);
    setFeedback(null);
  }, [assessmentId]);

  useEffect(() => {
    if (!data || hasHydratedAnswers) {
      return;
    }

    setAnswers(data.answers);
    setHasHydratedAnswers(true);
  }, [data, hasHydratedAnswers]);

  const requiredIssues = useMemo(() => {
    if (!data) {
      return [];
    }

    return getRequiredQuestionIssues(data.assessment.snapshot.questions, answers);
  }, [answers, data]);
  const requiredErrors = requiredIssues.map((issue) => issue.label);

  useEffect(() => {
    if (
      showCanonicalUpdateReview &&
      (data?.pendingCanonicalUpdates.length ?? 0) > 0 &&
      typeof canonicalReviewRef.current?.scrollIntoView === 'function'
    ) {
      canonicalReviewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [data?.pendingCanonicalUpdates.length, showCanonicalUpdateReview]);

  const updateAnswer = (question: PreVisitTemplateQuestionDraft, nextValue: string | string[]) => {
    setAnswers((currentAnswers) => {
      const nextAnswers = [...currentAnswers];
      const currentIndex = nextAnswers.findIndex((answer) => answer.questionKey === question.key);
      const nextAnswer: PreVisitAnswerDraft = {
        questionKey: question.key,
        questionLabel: question.label,
        questionType: question.type,
        memoryKey: currentIndex >= 0 ? nextAnswers[currentIndex].memoryKey : question.memoryKey,
        answerText: Array.isArray(nextValue) ? nextValue.join(', ') : nextValue,
        answerJson: question.type === 'multi_select' ? nextValue : null,
        autofillValue:
          currentIndex >= 0 ? nextAnswers[currentIndex].autofillValue : Array.isArray(nextValue) ? nextValue : nextValue,
        autofillSource: currentIndex >= 0 ? nextAnswers[currentIndex].autofillSource : question.autofillSource,
        autofillLabel: currentIndex >= 0 ? nextAnswers[currentIndex].autofillLabel : null,
        autofilled: currentIndex >= 0 ? nextAnswers[currentIndex].autofilled : false,
        confirmedByPatient: true,
        answeredAt: new Date().toISOString(),
      };

      if (currentIndex >= 0) {
        nextAnswers[currentIndex] = {
          ...nextAnswers[currentIndex],
          ...nextAnswer,
        };
      } else {
        nextAnswers.push(nextAnswer);
      }

      return nextAnswers;
    });
    setFeedback(null);
  };

  const handleConfirmAutofill = (questionKey: string) => {
    setAnswers((currentAnswers) =>
      currentAnswers.map((answer) =>
        answer.questionKey === questionKey
          ? {
              ...answer,
              confirmedByPatient: true,
              answeredAt: new Date().toISOString(),
            }
          : answer
      )
    );
    setFeedback(null);
  };

  const persistAssessment = async (status: 'in_progress' | 'completed') => {
    if (!data) {
      return false;
    }

    const now = new Date().toISOString();
    const hasStarted = Boolean(data.assessment.startedAt);

    const answersPayload = answers.map((answer) => ({
      assessment_id: data.assessment.id,
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
    }));

    const { error: answersError } = await supabase.from('appointment_pre_visit_answers').upsert(answersPayload, {
      onConflict: 'assessment_id,question_key',
    });

    if (answersError) {
      throw answersError;
    }

    const { error: deleteMemoryFactsError } = await supabase
      .from('patient_memory_facts')
      .delete()
      .eq('patient_id', data.assessment.patientId)
      .eq('source_kind', 'pre_visit_answer')
      .eq('source_record_id', data.assessment.id);

    if (deleteMemoryFactsError) {
      throw deleteMemoryFactsError;
    }

    const memoryFactsPayload = answers
      .filter((answer) => answer.confirmedByPatient && answer.memoryKey)
      .map((answer) => {
        const value = buildPatientMemoryValue({
          questionType: answer.questionType,
          answerText: answer.answerText,
          answerJson: answer.answerJson,
        });

        const hasValue =
          Boolean(value.valueText?.trim()) ||
          (Array.isArray(value.valueJson) && value.valueJson.length > 0) ||
          typeof value.valueJson === 'number' ||
          typeof value.valueJson === 'boolean';

        if (!hasValue || !answer.memoryKey) {
          return null;
        }

        return {
          patient_id: data.assessment.patientId,
          source_kind: 'pre_visit_answer' as const,
          source_record_id: data.assessment.id,
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
            assessmentId: data.assessment.id,
            appointmentId: data.assessment.appointmentId,
            questionKey: answer.questionKey,
            questionType: answer.questionType,
          },
        };
      })
      .filter((fact): fact is NonNullable<typeof fact> => Boolean(fact));

    if (memoryFactsPayload.length > 0) {
      const { error: memoryFactsError } = await supabase.from('patient_memory_facts').insert(memoryFactsPayload);

      if (memoryFactsError) {
        throw memoryFactsError;
      }
    }

    const { error: assessmentError } = await supabase
      .from('appointment_pre_visit_assessments')
      .update({
        status,
        started_at: hasStarted ? data.assessment.startedAt : now,
        completed_at: status === 'completed' ? now : null,
        last_answered_at: now,
      })
      .eq('id', data.assessment.id);

    if (assessmentError) {
      throw assessmentError;
    }

    return true;
  };

  const handleSaveProgress = async () => {
    try {
      setFeedback(null);
      setIsSaving(true);
      await persistAssessment('in_progress');
      setFeedback({ type: 'success', message: 'Progress saved. You can come back later from your appointment card or AI chat.' });
      await refetch();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to save your pre-visit answers.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteAssessment = async () => {
    if (!data) {
      return;
    }

    if (requiredErrors.length > 0) {
      setFeedback({
        type: 'error',
        message: `Please finish the required items: ${requiredErrors.join(', ')}`,
      });

      const firstBlockingQuestion = requiredIssues[0]?.key
        ? questionRefs.current[requiredIssues[0].key]
        : null;

      if (typeof firstBlockingQuestion?.scrollIntoView === 'function') {
        firstBlockingQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setFeedback(null);
      setIsCompleting(true);
      await persistAssessment('in_progress');

      const pendingCanonicalUpdates = await stageCanonicalUpdateRequests({
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

      if (pendingCanonicalUpdates.length > 0) {
        setShowCanonicalUpdateReview(true);
        setFeedback({
          type: 'success',
          message: 'Review the detected record updates below before finishing this intake.',
        });
        await refetch();
        return;
      }

      const appointmentLabel = formatAppointmentLabel(
        data.assessment.appointment.scheduledAt,
        data.assessment.appointment.doctorName,
        data.assessment.appointment.chiefComplaint,
        i18n.language
      );
      const summary = await generatePreVisitSummary({
        appointmentLabel,
        templateTitle: data.assessment.templateTitle,
        patientId: data.assessment.patientId,
        answers,
      });

      const { error: summaryError } = await supabase.from('appointment_pre_visit_summaries').upsert(
        {
          assessment_id: data.assessment.id,
          appointment_id: data.assessment.appointmentId,
          patient_id: data.assessment.patientId,
          doctor_id: data.assessment.doctorId,
          summary_text: summary.summaryText,
          key_points: summary.keyPoints,
          risk_flags: summary.riskFlags,
          pending_questions: summary.pendingQuestions,
          generated_by: 'ai',
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'assessment_id' }
      );

      if (summaryError) {
        throw summaryError;
      }

      // Crucial: when there are no canonical-update drafts to review, we
      // still need to flip the assessment row from `in_progress` to
      // `completed`. Otherwise the doctor's queue keeps marking the intake
      // as outstanding even after the patient pressed "Finish".
      await persistAssessment('completed');
      navigate('/patient/appointments?previsit=completed', { replace: true });
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to complete your pre-visit assessment right now.',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleFinishWithCanonicalUpdates = async (mode: 'apply' | 'skip') => {
    if (!data) {
      return;
    }

    const pendingCanonicalUpdates = data.pendingCanonicalUpdates;

    try {
      setFeedback(null);
      setIsCompleting(true);

      if (mode === 'apply') {
        await applyCanonicalUpdateRequests(pendingCanonicalUpdates.map((update) => update.id));
      } else {
        await dismissCanonicalUpdateRequests(pendingCanonicalUpdates.map((update) => update.id));
      }

      await persistAssessment('completed');

      const appointmentLabel = formatAppointmentLabel(
        data.assessment.appointment.scheduledAt,
        data.assessment.appointment.doctorName,
        data.assessment.appointment.chiefComplaint,
        i18n.language
      );
      const summary = await generatePreVisitSummary({
        appointmentLabel,
        templateTitle: data.assessment.templateTitle,
        patientId: data.assessment.patientId,
        answers,
      });

      const { error: summaryError } = await supabase.from('appointment_pre_visit_summaries').upsert(
        {
          assessment_id: data.assessment.id,
          appointment_id: data.assessment.appointmentId,
          patient_id: data.assessment.patientId,
          doctor_id: data.assessment.doctorId,
          summary_text: summary.summaryText,
          key_points: summary.keyPoints,
          risk_flags: summary.riskFlags,
          pending_questions: summary.pendingQuestions,
          generated_by: 'ai',
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'assessment_id' }
      );

      if (summaryError) {
        throw summaryError;
      }

      navigate('/patient/appointments?previsit=completed', { replace: true });
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to finish your pre-visit assessment right now.',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pre-Visit Intake</h1>
        <p className="mt-1 text-sm text-slate-500">Review any autofilled details, complete the missing questions, and send a summary to your doctor before the visit.</p>
      </div>

      <div className="mx-auto w-full max-w-5xl">
        {loading ? (
          <div className="flex items-center justify-center rounded-3xl bg-white p-12 shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-ceenai-cyan" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        ) : !data ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900">Pre-visit assessment not found</p>
            <p className="mt-2 text-sm text-gray-600">
              This intake may have been removed or you may no longer have access to it.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
                  {formatPreVisitStatus(data.assessment.status)}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">{data.assessment.templateTitle}</h2>
                <p className="mt-2 text-sm text-gray-600">
                  {formatAppointmentLabel(
                    data.assessment.appointment.scheduledAt,
                    data.assessment.appointment.doctorName,
                    data.assessment.appointment.chiefComplaint,
                    i18n.language
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 text-sm text-cyan-900">
                <p className="font-semibold">How this works</p>
                <ul className="mt-3 space-y-2 text-cyan-950">
                  <li>Known details from your record are prefilled when possible.</li>
                  <li>Autofilled answers still need your confirmation before completion.</li>
                  <li>Once complete, an AI summary is prepared for your doctor.</li>
                </ul>
              </div>
            </section>

            {feedback ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  feedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {feedback.message}
              </div>
            ) : null}

            <section className="space-y-4">
              {data.assessment.snapshot.questions.map((question) => {
                const answer =
                  answers.find((currentAnswer) => currentAnswer.questionKey === question.key) ??
                  data.answers.find((currentAnswer) => currentAnswer.questionKey === question.key);
                const textValue = answer?.answerText ?? '';
                const multiValue = Array.isArray(answer?.answerJson) ? (answer?.answerJson as string[]) : [];
                const showAutofillPrompt = Boolean(answer?.autofilled && !answer.confirmedByPatient);

                return (
                  <article
                    key={question.key}
                    ref={(element) => {
                      questionRefs.current[question.key] = element;
                    }}
                    className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {question.label}
                          {question.required ? <span className="ml-1 text-red-500">*</span> : null}
                        </h3>
                        {question.helpText ? (
                          <p className="mt-1 text-sm text-gray-600">{question.helpText}</p>
                        ) : null}
                      </div>
                      {showAutofillPrompt ? (
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                          {answer?.autofillLabel ??
                            t('patient.preVisit.autofilled', { defaultValue: 'Autofilled from your record' })}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5">
                      {question.type === 'long_text' ? (
                        <textarea
                          rows={5}
                          value={textValue}
                          onChange={(event) => updateAnswer(question, event.target.value)}
                          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-ceenai-cyan focus:ring-2 focus:ring-ceenai-cyan/20"
                          placeholder={t('patient.preVisit.typeAnswerPh', { defaultValue: 'Type your answer' })}
                        />
                      ) : null}

                      {question.type === 'short_text' || question.type === 'number' || question.type === 'date' ? (
                        <input
                          type={question.type === 'number' ? 'number' : question.type === 'date' ? 'date' : 'text'}
                          value={textValue}
                          onChange={(event) => updateAnswer(question, event.target.value)}
                          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-ceenai-cyan focus:ring-2 focus:ring-ceenai-cyan/20"
                          placeholder={t('patient.preVisit.typeAnswerPh', { defaultValue: 'Type your answer' })}
                        />
                      ) : null}

                      {question.type === 'boolean' ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            { value: 'Yes', label: t('shared.yes', { defaultValue: 'Yes' }) },
                            { value: 'No', label: t('shared.no', { defaultValue: 'No' }) },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateAnswer(question, option.value)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                                textValue === option.value
                                  ? 'border-cyan-500 bg-cyan-50 text-cyan-800'
                                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {question.type === 'single_select' ? (
                        <div className="grid gap-3">
                          {question.options.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateAnswer(question, option.value)}
                              className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                                textValue === option.value
                                  ? 'border-cyan-500 bg-cyan-50 text-cyan-800'
                                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {question.type === 'multi_select' ? (
                        <div className="grid gap-3">
                          {question.options.map((option) => {
                            const checked = multiValue.includes(option.value);

                            return (
                              <label
                                key={option.value}
                                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                                  checked
                                    ? 'border-cyan-500 bg-cyan-50 text-cyan-800'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    const nextValues = event.target.checked
                                      ? [...multiValue, option.value]
                                      : multiValue.filter((value) => value !== option.value);
                                    updateAnswer(question, nextValues);
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span>{option.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    {showAutofillPrompt ? (
                      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 py-3 text-sm text-cyan-900">
                        <AlertCircle className="h-4 w-4" />
                        <span>
                          Review this autofilled answer before completing the intake.
                          {answer?.autofillLabel ? ` ${answer.autofillLabel}.` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleConfirmAutofill(question.key)}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-cyan-800 shadow-sm transition hover:shadow"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Confirm
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>

            {showCanonicalUpdateReview && data.pendingCanonicalUpdates.length > 0 ? (
              <section
                ref={canonicalReviewRef}
                className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/80 p-3 text-amber-700">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">Review record updates before you finish</h2>
                    <p className="mt-1 text-sm text-gray-700">
                      Confirm which answers should update your record for future autofill. Medication changes stay
                      patient-reported so your doctor can review them first.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {data.pendingCanonicalUpdates.map((update) => (
                    <article key={update.id} className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{update.displayLabel}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            update.requiresDoctorReview
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {update.requiresDoctorReview ? 'Doctor review' : 'Update record'}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-gray-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current</p>
                          <p className="mt-1 text-sm text-gray-700">{formatCanonicalValueForReview(update.currentValue)}</p>
                        </div>
                        <div className="rounded-2xl bg-cyan-50/70 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">New answer</p>
                          <p className="mt-1 text-sm text-gray-900">{formatCanonicalValueForReview(update.proposedValue)}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleFinishWithCanonicalUpdates('apply')}
                    disabled={isSaving || isCompleting}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-ceenai-cyan to-ceenai-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Apply updates and finish
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFinishWithCanonicalUpdates('skip')}
                    disabled={isSaving || isCompleting}
                    className="rounded-full border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Finish without record updates
                  </button>
                </div>
              </section>
            ) : null}

            {data.assessment.summary ? (
              <section className="rounded-3xl border border-cyan-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Latest summary for your doctor</h2>
                    <p className="text-sm text-gray-600">
                      Generated{' '}
                      {new Date(data.assessment.summary.generatedAt).toLocaleString(
                        locale,
                        dtOpts({
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {data.assessment.summary.summaryText}
                </p>
              </section>
            ) : null}

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600">
                  {requiredErrors.length > 0 ? (
                    <span>{requiredErrors.length} required item(s) still need attention.</span>
                  ) : (
                    <span>All required questions are ready to submit.</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/patient/appointments')}
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Back to appointments
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveProgress()}
                    disabled={isSaving || isCompleting}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save progress
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCompleteAssessment()}
                    disabled={isSaving || isCompleting}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-ceenai-cyan to-ceenai-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCompleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Complete intake
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
};
