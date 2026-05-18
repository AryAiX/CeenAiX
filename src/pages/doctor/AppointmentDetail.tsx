import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquare,
  Pill,
  Save,
  TestTube2,
  User,
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { LabTestNameDisplay } from '../../components/LabTestNameDisplay';
import { useDoctorAppointmentDetail } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import {
  appointmentStatusLabel,
  appointmentTypeLabel,
  dateTimeFormatWithNumerals,
  labOrderStatusLabel,
  prescriptionStatusLabel,
  resolveLocale,
} from '../../lib/i18n-ui';
import { formatCanonicalValueForReview } from '../../lib/canonical-record-updates';
import { formatMedicationDetailLine } from '../../lib/medication-display';

interface ConsultationNoteDraft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  doctorApproved: boolean;
}

const EMPTY_NOTE: ConsultationNoteDraft = {
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  doctorApproved: false,
};

const toReviewValue = (value: unknown): Parameters<typeof formatCanonicalValueForReview>[0] =>
  value && typeof value === 'object'
    ? (value as Parameters<typeof formatCanonicalValueForReview>[0])
    : { value: null };

export const DoctorAppointmentDetail: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useDoctorAppointmentDetail(user?.id, appointmentId);
  const locale = resolveLocale(i18n.language);
  const uiLang = i18n.language ?? 'en';
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(uiLang, options);
  const [noteDraft, setNoteDraft] = useState<ConsultationNoteDraft>(EMPTY_NOTE);
  const [hasHydratedNote, setHasHydratedNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [updatingAppointment, setUpdatingAppointment] = useState(false);
  const [reviewingAssessment, setReviewingAssessment] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reset the hydration flag when the route appointmentId changes so SPA
  // navigation between two appointments never shows the previous visit's
  // SOAP draft inside the editor.
  useEffect(() => {
    setHasHydratedNote(false);
    setNoteDraft(EMPTY_NOTE);
    setFeedback(null);
  }, [appointmentId]);

  useEffect(() => {
    if (!data || hasHydratedNote) {
      return;
    }

    setNoteDraft({
      subjective: data.consultationNote?.subjective ?? '',
      objective: data.consultationNote?.objective ?? '',
      assessment: data.consultationNote?.assessment ?? '',
      plan: data.consultationNote?.plan ?? '',
      doctorApproved: data.consultationNote?.doctor_approved ?? false,
    });
    setHasHydratedNote(true);
  }, [data, hasHydratedNote]);

  const patientName = data?.patientProfile?.full_name?.trim() || t('shared.patient');

  const noteCompletion = useMemo(() => {
    if (!data) {
      return 0;
    }

    return [noteDraft.subjective, noteDraft.objective, noteDraft.assessment, noteDraft.plan].filter((value) =>
      value.trim()
    ).length;
  }, [data, noteDraft]);

  const updateAppointmentStatus = async (status: string) => {
    if (!data || !user?.id) {
      return;
    }

    setFeedback(null);
    setUpdatingAppointment(true);

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', data.appointment.id)
      .eq('doctor_id', user.id)
      .eq('is_deleted', false);

    setUpdatingAppointment(false);

    if (updateError) {
      setFeedback({ type: 'error', message: updateError.message });
      return;
    }

    setFeedback({ type: 'success', message: t('doctor.appointmentDetail.statusSaved') });
    refetch();
  };

  const saveConsultationNote = async () => {
    if (!data || !user?.id) {
      return;
    }

    setFeedback(null);
    setSavingNote(true);

    const payload = {
      appointment_id: data.appointment.id,
      doctor_id: user.id,
      subjective: noteDraft.subjective.trim() || null,
      objective: noteDraft.objective.trim() || null,
      assessment: noteDraft.assessment.trim() || null,
      plan: noteDraft.plan.trim() || null,
      doctor_approved: noteDraft.doctorApproved,
      is_deleted: false,
    };

    const operation = data.consultationNote
      ? supabase.from('consultation_notes').update(payload).eq('id', data.consultationNote.id)
      : supabase.from('consultation_notes').insert(payload);

    const { error: noteError } = await operation;

    setSavingNote(false);

    if (noteError) {
      setFeedback({ type: 'error', message: noteError.message });
      return;
    }

    setFeedback({ type: 'success', message: t('doctor.appointmentDetail.noteSaved') });
    refetch();
  };

  const markPreVisitReviewed = async () => {
    if (!data?.preVisitAssessment) {
      return;
    }

    setFeedback(null);
    setReviewingAssessment(true);

    const { error: reviewError } = await supabase
      .from('appointment_pre_visit_assessments')
      .update({
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', data.preVisitAssessment.id)
      .eq('doctor_id', user?.id ?? '');

    setReviewingAssessment(false);

    if (reviewError) {
      setFeedback({ type: 'error', message: reviewError.message });
      return;
    }

    setFeedback({ type: 'success', message: t('doctor.appointmentDetail.preVisitReviewed') });
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Skeleton className="h-[520px] w-full rounded-2xl" />
          <Skeleton className="h-[520px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('doctor.appointmentDetail.titleFallback')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('doctor.appointmentDetail.loadError')}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {error ?? t('doctor.appointmentDetail.notFound')}
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('doctor.appointmentDetail.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{patientName}</p>
      </div>

      <div className="space-y-6">
        {feedback ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-900 to-emerald-800 p-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
                  {t('doctor.appointmentDetail.visitWorkspace')}
                </p>
                <h2 className="mt-2 text-3xl font-bold">{patientName}</h2>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/90">
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {appointmentTypeLabel(t, data.appointment.type)}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {appointmentStatusLabel(t, data.appointment.status)}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {new Date(data.appointment.scheduled_at).toLocaleString(
                      locale,
                      dtOpts({
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/messages?patient=${data.appointment.patient_id}`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{t('doctor.messages.messagePatient')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/doctor/prescriptions/new?patient=${data.appointment.patient_id}&appointment=${data.appointment.id}`)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <Pill className="h-4 w-4" />
                  <span>{t('doctor.appointmentDetail.createPrescription')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/doctor/lab-orders/new?patient=${data.appointment.patient_id}&appointment=${data.appointment.id}`)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <TestTube2 className="h-4 w-4" />
                  <span>{t('doctor.appointmentDetail.createLabOrder')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-4">
            <button
              type="button"
              disabled={updatingAppointment}
              onClick={() => updateAppointmentStatus('in_progress')}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.appointmentDetail.statusInProgress')}
              </p>
            </button>
            <button
              type="button"
              disabled={updatingAppointment}
              onClick={() => updateAppointmentStatus('completed')}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.appointmentDetail.statusCompleted')}
              </p>
            </button>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.appointmentDetail.noteCoverage')}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{noteCompletion}/4</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.appointmentDetail.linkedActions')}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {data.prescriptions.length + data.labOrders.length}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-700" />
                <h3 className="text-xl font-bold text-slate-900">{t('doctor.appointmentDetail.patientContext')}</h3>
              </div>
              <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t('doctor.appointments.reason')}
                  </p>
                  <p className="mt-1 text-slate-900">
                    {data.appointment.chief_complaint?.trim() || t('doctor.appointments.noReason')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t('doctor.appointments.patientNotes')}
                  </p>
                  <p className="mt-1 text-slate-900">
                    {data.appointment.notes?.trim() || t('doctor.appointments.noNotes')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t('doctor.appointmentDetail.patientEmail')}
                  </p>
                  <p className="mt-1 text-slate-900">{data.patientProfile?.email ?? t('doctor.prescriptions.noEmail')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t('doctor.appointmentDetail.bloodType')}
                  </p>
                  <p className="mt-1 text-slate-900">
                    {data.patientExtensionProfile?.blood_type ?? t('doctor.patients.notProvided')}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-cyan-700" />
                  <h3 className="text-xl font-bold text-slate-900">{t('doctor.appointmentDetail.preVisitTitle')}</h3>
                </div>
                {data.preVisitAssessment && data.preVisitAssessment.status !== 'reviewed' ? (
                  <button
                    type="button"
                    onClick={markPreVisitReviewed}
                    disabled={reviewingAssessment}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-60"
                  >
                    {reviewingAssessment ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>{t('doctor.appointmentDetail.markReviewed')}</span>
                  </button>
                ) : null}
              </div>

              {data.preVisitAssessment ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {t('doctor.appointmentDetail.preVisitStatus')}:{' '}
                      <span className="text-cyan-800">{data.preVisitAssessment.status}</span>
                    </p>
                    {data.preVisitSummary ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {data.preVisitSummary.summary_text}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">{t('doctor.appointments.preVisitPending')}</p>
                    )}
                  </div>

                  {data.preVisitAnswers.length > 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{t('doctor.appointmentDetail.preVisitAnswers')}</p>
                      <div className="mt-3 space-y-3">
                        {data.preVisitAnswers.map((answer) => (
                          <div key={answer.id} className="rounded-xl bg-white px-3 py-3">
                            <p className="text-sm font-semibold text-slate-900">{answer.question_label}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {answer.answer_text?.trim() || JSON.stringify(answer.answer_json ?? '') || t('doctor.patientDetail.noneRecorded')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {data.preVisitCanonicalUpdates.length > 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{t('doctor.appointmentDetail.preVisitUpdates')}</p>
                      <div className="mt-3 space-y-3">
                        {data.preVisitCanonicalUpdates.map((update) => (
                          <div key={update.id} className="rounded-xl bg-white px-3 py-3">
                            <p className="text-sm font-semibold text-slate-900">{update.display_label}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {t('doctor.patientDetail.updatedValue')}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {formatCanonicalValueForReview(toReviewValue(update.proposed_value))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {data.reportedMedications.length > 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{t('doctor.patientDetail.reportedMedicationTitle')}</p>
                      <div className="mt-3 space-y-3">
                        {data.reportedMedications.map((item) => (
                          <div key={item.id} className="rounded-xl bg-white px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.medication_name}</p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {formatMedicationDetailLine(t, i18n.language, {
                                    dosage: item.dosage,
                                    frequency: item.frequency,
                                    duration: item.duration,
                                    detail: '',
                                    emptyFallback: t('doctor.patientDetail.noMedicationSummary'),
                                  }) ||
                                    t('doctor.patientDetail.noMedicationSummary')}
                                </p>
                              </div>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {item.review_status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-600">{t('doctor.appointmentDetail.noPreVisit')}</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">{t('doctor.appointmentDetail.relatedOrders')}</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{t('doctor.patientDetail.prescriptions')}</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {data.prescriptions.length > 0 ? (
                      data.prescriptions.map((prescription) => (
                        <div key={prescription.id} className="rounded-xl bg-white px-3 py-3">
                          <p className="font-semibold text-slate-900">
                            {prescriptionStatusLabel(t, prescription.status)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(prescription.prescribed_at).toLocaleDateString(
                              locale,
                              dtOpts({ year: 'numeric', month: 'short', day: 'numeric' })
                            )}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p>{t('doctor.patientDetail.noneRecorded')}</p>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{t('doctor.patientDetail.labOrders')}</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {data.labOrders.length > 0 ? (
                      data.labOrders.map((labOrder) => (
                        <div key={labOrder.id} className="rounded-xl bg-white px-3 py-3">
                          <p className="font-semibold text-slate-900">{labOrderStatusLabel(t, labOrder.status)}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {labOrder.items.map((item) => (
                              <span
                                key={item.id}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                              >
                                <LabTestNameDisplay
                                  canonicalName={item.test_name}
                                  localizedName={item.test_name_ar}
                                  language={uiLang}
                                  variant="compact"
                                  primaryClassName="text-xs font-medium text-slate-700"
                                />
                                {item.lab_test_catalog_suggestion_id ? (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                    {t('doctor.createLabOrder.pendingBadge')}
                                  </span>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>{t('doctor.patientDetail.noneRecorded')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{t('doctor.appointmentDetail.soapTitle')}</h3>
                <p className="text-sm text-slate-600">{t('doctor.appointmentDetail.soapSub')}</p>
              </div>
              <button
                type="button"
                onClick={saveConsultationNote}
                disabled={savingNote}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{savingNote ? t('doctor.appointmentDetail.saving') : t('doctor.appointmentDetail.saveNote')}</span>
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.appointmentDetail.subjective')}
                </span>
                <textarea
                  rows={5}
                  value={noteDraft.subjective}
                  onChange={(event) => setNoteDraft((current) => ({ ...current, subjective: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.appointmentDetail.objective')}
                </span>
                <textarea
                  rows={5}
                  value={noteDraft.objective}
                  onChange={(event) => setNoteDraft((current) => ({ ...current, objective: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.appointmentDetail.assessment')}
                </span>
                <textarea
                  rows={5}
                  value={noteDraft.assessment}
                  onChange={(event) => setNoteDraft((current) => ({ ...current, assessment: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.appointmentDetail.plan')}
                </span>
                <textarea
                  rows={5}
                  value={noteDraft.plan}
                  onChange={(event) => setNoteDraft((current) => ({ ...current, plan: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={noteDraft.doctorApproved}
                  onChange={(event) =>
                    setNoteDraft((current) => ({ ...current, doctorApproved: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{t('doctor.appointmentDetail.approveNote')}</span>
              </label>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
