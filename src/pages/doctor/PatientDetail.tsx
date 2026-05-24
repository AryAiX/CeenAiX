import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ClipboardList,
  HeartPulse,
  Loader2,
  MessageSquare,
  Pill,
  TestTube2,
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { LabTestNameDisplay } from '../../components/LabTestNameDisplay';
import { MedicationNameDisplay } from '../../components/MedicationNameDisplay';
import { useDoctorPatientDetail } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import {
  appointmentStatusLabel,
  dateTimeFormatWithNumerals,
  labOrderStatusLabel,
  prescriptionStatusLabel,
  resolveLocale,
} from '../../lib/i18n-ui';
import { formatCanonicalValueForReview } from '../../lib/canonical-record-updates';
import { formatMedicationDetailLine } from '../../lib/medication-display';

const UPCOMING_STATUSES = new Set(['scheduled', 'confirmed', 'in_progress']);

const formatNullableText = (value: string | null | undefined, fallback: string) =>
  value?.trim() ? value : fallback;

const toReviewValue = (value: unknown): Parameters<typeof formatCanonicalValueForReview>[0] =>
  value && typeof value === 'object'
    ? (value as Parameters<typeof formatCanonicalValueForReview>[0])
    : { value: null };

export const DoctorPatientDetail: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useDoctorPatientDetail(user?.id, patientId);
  const locale = resolveLocale(i18n.language);
  const uiLang = i18n.language ?? 'en';
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(uiLang, options);
  const [reviewingMedicationId, setReviewingMedicationId] = useState<string | null>(null);
  const [showAllAppointments, setShowAllAppointments] = useState<boolean>(false);
  const [showAllPrescriptions, setShowAllPrescriptions] = useState<boolean>(false);
  const [showAllLabOrders, setShowAllLabOrders] = useState<boolean>(false);

  const appointments = useMemo(() => data?.appointments ?? [], [data?.appointments]);
  const nextAppointment = useMemo(
    () =>
      appointments.find(
        (appointment) =>
          UPCOMING_STATUSES.has(appointment.status) &&
          (appointment.status === 'in_progress' || new Date(appointment.scheduled_at).getTime() >= Date.now())
      ) ?? null,
    [appointments]
  );
  const latestAppointment = appointments[0] ?? null;

  if (loading) {
    return (
      <>
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('doctor.patientDetail.titleFallback')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('doctor.patientDetail.loadError')}</p>
        </div>
        <div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-700" role="alert">
            <p>{error ?? t('doctor.patientDetail.notFound')}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 font-semibold text-amber-900 underline"
            >
              {t('shared.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        </div>
      </>
    );
  }

  const patientName = data.patientProfile?.full_name?.trim() || t('shared.patient');
  const patientEmail = data.patientProfile?.email ?? t('doctor.patients.notProvided');
  const patientPhone = data.patientProfile?.phone ?? t('doctor.patients.notProvided');
  const patientCity = data.patientProfile?.city ?? t('doctor.patients.notProvided');
  const totalAppointments = appointments.length;
  const activeMedicationCount = data.reportedMedications.filter((item) => item.is_current).length;

  const markMedicationReviewed = async (medicationId: string) => {
    setReviewingMedicationId(medicationId);
    await supabase.rpc('mark_doctor_reported_medications_reviewed', {
      p_medication_ids: [medicationId],
    });
    setReviewingMedicationId(null);
    refetch();
  };

  const getUpdateStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'dismissed':
        return 'bg-slate-100 text-slate-500 border border-slate-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border border-red-200';
      default:
        return 'bg-blue-100 text-blue-700 border border-blue-200';
    }
  };

  const getUpdateStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return '✅ Applied';
      case 'pending':
        return '⏳ Pending Review';
      case 'dismissed':
        return '🚫 Dismissed';
      case 'rejected':
        return '❌ Rejected';
      default:
        return status;
    }
  };

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => navigate('/doctor/patients')}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Patients
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{patientName}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('doctor.patientDetail.subtitle')}</p>
      </div>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-900 to-emerald-800 p-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
                  {t('doctor.patientDetail.profileLabel')}
                </p>
                <h2 className="mt-2 text-3xl font-bold">{patientName}</h2>
                <div className="mt-4 grid gap-3 text-sm text-white/85 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Email</p>
                    <p className="mt-0.5">{patientEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Phone</p>
                    <p className="mt-0.5">{patientPhone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">City</p>
                    <p className="mt-0.5">{patientCity}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Blood Type</p>
                    <p className="mt-0.5">{formatNullableText(data.patientExtensionProfile?.blood_type, t('doctor.patients.notProvided'))}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">🚨 Emergency Contact</p>
                    <p className="mt-0.5">{formatNullableText(data.patientExtensionProfile?.emergency_contact_name, t('doctor.patients.notProvided'))}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">🚨 Emergency Phone</p>
                    <p className="mt-0.5">{formatNullableText(data.patientExtensionProfile?.emergency_contact_phone, t('doctor.patients.notProvided'))}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/messages?patient=${patientId}`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{t('doctor.messages.messagePatient')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/prescriptions/new?patient=${patientId}`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <Pill className="h-4 w-4" />
                  <span>{t('doctor.patientDetail.createPrescription')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/lab-orders/new?patient=${patientId}`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <TestTube2 className="h-4 w-4" />
                  <span>{t('doctor.patientDetail.createLabOrder')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.patientDetail.totalAppointments')}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{totalAppointments}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.patientDetail.nextAppointment')}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {nextAppointment
                  ? new Date(nextAppointment.scheduled_at).toLocaleString(
                      locale,
                      dtOpts({
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    )
                  : t('doctor.patients.noFutureVisits')}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.patientDetail.reportedMeds')}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{activeMedicationCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.patientDetail.recordUpdates')}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{data.canonicalUpdates.length}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t('doctor.patientDetail.appointments')}</h3>
                  <p className="text-sm text-slate-600">{t('doctor.patientDetail.appointmentsSub')}</p>
                </div>
                {latestAppointment ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/doctor/appointments/${latestAppointment.id}`)}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    {t('doctor.patientDetail.openLatest')}
                  </button>
                ) : null}
              </div>

              <div className="space-y-4">
                {(showAllAppointments ? appointments : appointments.slice(0, 6)).map((appointment) => (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => navigate(`/doctor/appointments/${appointment.id}`)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(appointment.scheduled_at).toLocaleString(
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
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatNullableText(appointment.chief_complaint, t('doctor.appointments.noReason'))}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {appointmentStatusLabel(t, appointment.status)}
                      </span>
                    </div>
                  </button>
                ))}
                {appointments.length > 6 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllAppointments((prev) => !prev)}
                    className="mt-2 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    {showAllAppointments
                      ? `Show Less ↑`
                      : `Show All ${appointments.length} Appointments ↓`}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-cyan-700" />
                <h3 className="text-xl font-bold text-slate-900">{t('doctor.patientDetail.chart')}</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">{t('doctor.patientDetail.conditions')}</h4>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {data.medicalConditions.length > 0 ? (
                      data.medicalConditions.map((condition) => (
                        <div key={condition.id} className="rounded-xl bg-white px-3 py-2">
                          <p className="font-medium text-slate-900">{condition.condition_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{condition.status}</p>
                        </div>
                      ))
                    ) : (
                      <p>{t('doctor.patientDetail.noneRecorded')}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">{t('doctor.patientDetail.allergies')}</h4>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {data.allergies.length > 0 ? (
                      data.allergies.map((allergy) => (
                        <div key={allergy.id} className="rounded-xl bg-white px-3 py-2">
                          <p className="font-medium text-slate-900">{allergy.allergen}</p>
                          <p className="mt-1 text-xs text-slate-500">{allergy.severity}</p>
                        </div>
                      ))
                    ) : (
                      <p>{t('doctor.patientDetail.noneRecorded')}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">{t('doctor.patientDetail.vaccinations')}</h4>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {data.vaccinations.length > 0 ? (
                      data.vaccinations.map((vaccination) => (
                        <div key={vaccination.id} className="rounded-xl bg-white px-3 py-2">
                          <p className="font-medium text-slate-900">{vaccination.vaccine_name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {vaccination.administered_date
                              ? new Date(vaccination.administered_date).toLocaleDateString(
                                  locale,
                                  dtOpts({ year: 'numeric', month: 'short', day: 'numeric' })
                                )
                              : t('doctor.patientDetail.dateUnknown')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p>{t('doctor.patientDetail.noneRecorded')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">{t('doctor.patientDetail.prescriptions')}</h3>
                  <button
                    type="button"
                    onClick={() => navigate(`/doctor/prescriptions/new?patient=${patientId}`)}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    {t('doctor.patientDetail.add')}
                  </button>
                </div>
                <div className="space-y-4">
                  {data.prescriptions.length > 0 ? (
                    (showAllPrescriptions ? data.prescriptions : data.prescriptions.slice(0, 4)).map((prescription) => (
                      <div key={prescription.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {new Date(prescription.prescribed_at).toLocaleDateString(
                              locale,
                              dtOpts({ year: 'numeric', month: 'short', day: 'numeric' })
                            )}
                          </p>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {prescriptionStatusLabel(t, prescription.status)}
                          </span>
                        </div>
                        <div className="mt-3 space-y-3">
                          {prescription.items.map((item) => (
                            <div key={item.id} className="rounded-xl bg-white px-3 py-3">
                              <MedicationNameDisplay
                                canonicalName={item.medication_name}
                                localizedName={item.medication_name_ar}
                                language={uiLang}
                                primaryClassName="font-semibold text-slate-900"
                                secondaryClassName="mt-0.5 text-xs text-slate-500"
                              />
                              {item.medication_catalog_suggestion_id ? (
                                <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                                  {t('doctor.createPrescription.pendingBadge')}
                                </p>
                              ) : null}
                              <p className="mt-1 text-xs text-slate-500">
                                {formatMedicationDetailLine(t, uiLang, {
                                  dosage: item.dosage,
                                  frequency: item.frequency,
                                  duration: item.duration,
                                  detail: '',
                                  emptyFallback: t('doctor.prescriptions.noMedicationDetail'),
                                }) ||
                                  t('doctor.prescriptions.noMedicationDetail')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600">{t('doctor.patientDetail.noneRecorded')}</p>
                  )}
                  {data.prescriptions.length > 4 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllPrescriptions((prev) => !prev)}
                      className="mt-2 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      {showAllPrescriptions
                        ? `Show Less ↑`
                        : `Show All ${data.prescriptions.length} Prescriptions ↓`}
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">{t('doctor.patientDetail.labOrders')}</h3>
                  <button
                    type="button"
                    onClick={() => navigate(`/doctor/lab-orders/new?patient=${patientId}`)}
                    className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
                  >
                    {t('doctor.patientDetail.add')}
                  </button>
                </div>
                <div className="space-y-4">
                  {data.labOrders.length > 0 ? (
                    (showAllLabOrders ? data.labOrders : data.labOrders.slice(0, 4)).map((labOrder) => (
                      <div key={labOrder.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {new Date(labOrder.ordered_at).toLocaleDateString(
                              locale,
                              dtOpts({ year: 'numeric', month: 'short', day: 'numeric' })
                            )}
                          </p>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {labOrderStatusLabel(t, labOrder.status)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {labOrder.items.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
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
                    <p className="text-sm text-slate-600">{t('doctor.patientDetail.noneRecorded')}</p>
                  )}
                  {data.labOrders.length > 4 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllLabOrders((prev) => !prev)}
                      className="mt-2 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      {showAllLabOrders
                        ? `Show Less ↑`
                        : `Show All ${data.labOrders.length} Lab Orders ↓`}
                    </button>
                  ) : null}
                </div>
              </section>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-rose-600" />
                <h3 className="text-xl font-bold text-slate-900">{t('doctor.patientDetail.reportedMedicationTitle')}</h3>
              </div>
              <div className="space-y-3">
                {data.reportedMedications.length > 0 ? (
                  data.reportedMedications.map((medication) => (
                    <div key={medication.id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{medication.medication_name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatMedicationDetailLine(t, uiLang, {
                              dosage: medication.dosage,
                              frequency: medication.frequency,
                              duration: medication.duration,
                              detail: '',
                              emptyFallback: t('doctor.patientDetail.noMedicationSummary'),
                            }) || t('doctor.patientDetail.noMedicationSummary')}
                          </p>
                          {medication.instructions ? (
                            <p className="mt-2 text-sm text-slate-500">{medication.instructions}</p>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {medication.review_status}
                        </span>
                      </div>
                      {medication.review_status !== 'reviewed' ? (
                        <button
                          type="button"
                          onClick={() => markMedicationReviewed(medication.id)}
                          disabled={reviewingMedicationId === medication.id}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          {reviewingMedicationId === medication.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          <span>{t('doctor.patientDetail.markMedicationReviewed')}</span>
                        </button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">{t('doctor.patientDetail.noneRecorded')}</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-700" />
                <h3 className="text-xl font-bold text-slate-900">{t('doctor.patientDetail.updateHistory')}</h3>
              </div>
              <div className="space-y-3">
                {data.canonicalUpdates.length > 0 ? (
                  data.canonicalUpdates.map((update) => (
                    <div key={update.id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getUpdateStatusBadge(update.status)}`}>
                          {getUpdateStatusLabel(update.status)}
                        </span>
                        {update.requires_doctor_review ? (
                          <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            ⚠️ Requires Doctor Review
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{update.display_label}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('doctor.patientDetail.previousValue')}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatCanonicalValueForReview(toReviewValue(update.current_value))}
                      </p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('doctor.patientDetail.updatedValue')}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatCanonicalValueForReview(toReviewValue(update.proposed_value))}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">{t('doctor.patientDetail.noneRecorded')}</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
