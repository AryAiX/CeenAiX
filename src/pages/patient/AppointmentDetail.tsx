import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  MapPin,
  MessageSquare,
  Pill,
  Stethoscope,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { usePatientAppointmentDetail } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import {
  appointmentStatusLabel,
  dateTimeFormatWithNumerals,
  preVisitStatusLabel,
  resolveLocale,
} from '../../lib/i18n-ui';
import { supabase } from '../../lib/supabase';
import type { AppointmentStatus } from '../../types';

const ACTIVE_STATUSES = new Set<AppointmentStatus>(['scheduled', 'confirmed', 'in_progress']);
const CANCELLABLE_STATUSES = new Set<AppointmentStatus>(['scheduled', 'confirmed']);

const textList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'label' in item) {
        return String((item as { label?: unknown }).label ?? '');
      }
      return '';
    })
    .filter(Boolean);
};

export const PatientAppointmentDetail = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const { data, loading, error, refetch } = usePatientAppointmentDetail(user?.id, appointmentId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'cancel' | null>(null);

  const locale = resolveLocale(i18n.language);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(i18n.language, options);

  const appointment = data?.appointment ?? null;
  const doctor = data?.doctorProfile ?? null;
  const scheduledAt = appointment ? new Date(appointment.scheduled_at) : null;
  const isUpcoming = useMemo(() => {
    if (!appointment) return false;
    return ACTIVE_STATUSES.has(appointment.status) && new Date(appointment.scheduled_at).getTime() >= Date.now();
  }, [appointment]);
  const isCancellable = appointment
    ? CANCELLABLE_STATUSES.has(appointment.status) && new Date(appointment.scheduled_at).getTime() > Date.now()
    : false;
  const canJoinTelemedicine = appointment
    ? appointment.type === 'virtual' &&
      new Date(appointment.scheduled_at).getTime() - Date.now() <= 10 * 60 * 1000 &&
      Date.now() < new Date(appointment.scheduled_at).getTime() + appointment.duration_minutes * 60_000
    : false;

  const summaryPoints = textList(data?.preVisitSummary?.key_points);
  const riskFlags = textList(data?.preVisitSummary?.risk_flags);

  const messageDoctor = () => {
    if (!appointment) return;
    const date = new Date(appointment.scheduled_at);
    const dateStr = date.toLocaleDateString(locale, dtOpts({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    const timeStr = date.toLocaleTimeString(locale, dtOpts({ hour: 'numeric', minute: '2-digit' }));
    const draft = `${isUpcoming ? 'Regarding' : 'Following up on'} my appointment on ${dateStr} at ${timeStr}: `;
    navigate(`/patient/messages?doctor=${appointment.doctor_id}&draft=${encodeURIComponent(draft)}`);
  };

  const cancelAppointment = async () => {
    if (!appointment) return;
    const confirmed = window.confirm(
      t('patient.appointmentDetail.cancelConfirm', {
        defaultValue: 'Cancel this appointment? This cannot be undone from this screen.',
      })
    );
    if (!confirmed) return;

    setActionError(null);
    setActionSuccess(null);
    setBusyAction('cancel');
    const { error: cancelError } = await supabase.rpc('cancel_patient_appointment', {
      p_appointment_id: appointment.id,
    });
    setBusyAction(null);

    if (cancelError) {
      setActionError(cancelError.message);
      return;
    }

    setActionSuccess(t('patient.appointments.cancelSuccess', { defaultValue: 'Appointment cancelled.' }));
    await refetch();
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        <AlertCircle className="mb-3 h-6 w-6" />
        <p className="font-semibold">{error}</p>
        <button type="button" onClick={() => void refetch()} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700">
          {t('shared.retry', { defaultValue: 'Retry' })}
        </button>
      </div>
    );
  }

  if (!appointment || !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <h1 className="text-xl font-bold text-slate-900">{t('patient.appointmentDetail.notFoundTitle', { defaultValue: 'Appointment not found' })}</h1>
        <p className="mt-2 text-sm text-slate-500">{t('patient.appointmentDetail.notFoundBody', { defaultValue: 'This appointment may have been removed or you may not have access to it.' })}</p>
        <button type="button" onClick={() => navigate('/patient/appointments')} className="mt-6 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
          {t('patient.appointments.title', { defaultValue: 'Appointments' })}
        </button>
      </div>
    );
  }

  const facilityLabel = [doctor?.city, doctor?.address].filter(Boolean).join(' - ') || t('shared.clinicPending', { defaultValue: 'Clinic pending' });

  return (
    <div className="animate-fadeIn space-y-6">
      <button
        type="button"
        onClick={() => navigate('/patient/appointments')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('patient.appointmentDetail.backToAppointments', { defaultValue: 'Back to appointments' })}
      </button>

      {actionError ? (
        <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}
      {actionSuccess ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionSuccess}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                <Calendar className="h-4 w-4" />
                {appointmentStatusLabel(t, appointment.status)}
              </div>
              <h1 className="text-3xl font-bold">{doctor?.fullName ?? t('shared.doctor', { defaultValue: 'Doctor' })}</h1>
              <p className="mt-2 text-teal-50">{doctor?.specialty ?? t('shared.careVisit', { defaultValue: 'Care visit' })}</p>
            </div>
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              {appointment.type === 'virtual'
                ? t('patient.appointments.filterTeleconsult', { defaultValue: 'Teleconsultation' })
                : t('patient.appointments.filterInPerson', { defaultValue: 'In person' })}
            </span>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={Calendar}
                label={t('patient.appointmentDetail.date', { defaultValue: 'Date' })}
                value={scheduledAt?.toLocaleDateString(locale, dtOpts({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })) ?? ''}
              />
              <InfoCard
                icon={Clock}
                label={t('patient.appointmentDetail.time', { defaultValue: 'Time' })}
                value={`${scheduledAt?.toLocaleTimeString(locale, dtOpts({ hour: 'numeric', minute: '2-digit' })) ?? ''} (${t('shared.minutesUnit', { count: appointment.duration_minutes })})`}
              />
              <InfoCard
                icon={MapPin}
                label={t('patient.appointmentDetail.location', { defaultValue: 'Location' })}
                value={appointment.type === 'virtual' ? t('patient.appointments.filterTeleconsult', { defaultValue: 'Teleconsultation' }) : facilityLabel}
              />
              <InfoCard
                icon={Stethoscope}
                label={t('patient.appointments.reason', { defaultValue: 'Reason' })}
                value={appointment.chief_complaint ?? t('shared.notProvided', { defaultValue: 'Not provided' })}
              />
            </div>

            {appointment.notes ? (
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                <h2 className="mb-2 font-bold text-violet-950">{t('patient.appointments.preparationNotes', { defaultValue: 'Preparation notes' })}</h2>
                <p className="whitespace-pre-wrap text-sm text-violet-800">{appointment.notes}</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <h2 className="mb-4 font-bold text-slate-900">{t('patient.appointmentDetail.actions', { defaultValue: 'Actions' })}</h2>
            <div className="space-y-2">
              {appointment.type === 'virtual' ? (
                <ActionButton
                  onClick={() => navigate(`/patient/telemedicine/${appointment.id}`)}
                  disabled={!canJoinTelemedicine}
                  icon={Video}
                  label={canJoinTelemedicine
                    ? t('patient.appointments.joinCall', { defaultValue: 'Join call' })
                    : t('patient.appointments.joinCallDisabled', { defaultValue: 'Join opens near appointment time' })}
                  primary={canJoinTelemedicine}
                />
              ) : null}
              {data.preVisitAssessment ? (
                <ActionButton
                  onClick={() => navigate(`/patient/pre-visit/${data.preVisitAssessment?.id}`)}
                  icon={ClipboardList}
                  label={data.preVisitAssessment.status === 'completed' || data.preVisitAssessment.status === 'reviewed'
                    ? t('patient.appointments.reviewIntake', { defaultValue: 'Review intake' })
                    : t('patient.appointments.continueIntake', { defaultValue: 'Continue intake' })}
                />
              ) : null}
              {isUpcoming ? (
                <ActionButton
                  onClick={() => navigate(`/patient/appointments/book?reschedule=${appointment.id}`)}
                  icon={Calendar}
                  label={t('patient.appointments.reschedule', { defaultValue: 'Reschedule' })}
                />
              ) : null}
              {!['cancelled', 'no_show'].includes(appointment.status) ? (
                <ActionButton
                  onClick={messageDoctor}
                  icon={MessageSquare}
                  label={isUpcoming
                    ? t('patient.messages.messageDoctor', { defaultValue: 'Message doctor' })
                    : t('patient.messages.followUpDoctor', { defaultValue: 'Follow up with doctor' })}
                />
              ) : null}
              {isCancellable ? (
                <ActionButton
                  onClick={() => void cancelAppointment()}
                  disabled={busyAction === 'cancel'}
                  icon={AlertCircle}
                  label={busyAction === 'cancel'
                    ? t('patient.appointmentDetail.cancelling', { defaultValue: 'Cancelling...' })
                    : t('patient.appointments.cancel', { defaultValue: 'Cancel' })}
                  danger
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ClinicalCard title={t('patient.appointmentDetail.preVisit', { defaultValue: 'Pre-visit intake' })} icon={ClipboardList}>
          {data.preVisitAssessment ? (
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">{t('patient.appointments.preVisitPrefix', { defaultValue: 'Status:' })}</span>{' '}
                {preVisitStatusLabel(t, data.preVisitAssessment.status)}
              </p>
              {data.preVisitSummary?.summary_text ? <p>{data.preVisitSummary.summary_text}</p> : null}
              {summaryPoints.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {summaryPoints.slice(0, 4).map((point) => <li key={point}>{point}</li>)}
                </ul>
              ) : null}
              {riskFlags.length > 0 ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-amber-800">
                  {riskFlags.slice(0, 3).join(', ')}
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState>{t('patient.appointmentDetail.noPreVisit', { defaultValue: 'No intake form is attached to this appointment.' })}</EmptyState>
          )}
        </ClinicalCard>

        <ClinicalCard title={t('patient.appointmentDetail.visitNote', { defaultValue: 'Visit note' })} icon={FileText}>
          {data.consultationNote ? (
            <div className="space-y-3 text-sm text-slate-600">
              {[
                [t('doctor.appointmentDetail.assessment', { defaultValue: 'Assessment' }), data.consultationNote.assessment],
                [t('doctor.appointmentDetail.plan', { defaultValue: 'Plan' }), data.consultationNote.plan],
              ].map(([label, value]) => value ? (
                <div key={label}>
                  <h3 className="font-semibold text-slate-900">{label}</h3>
                  <p className="mt-1 whitespace-pre-wrap">{value}</p>
                </div>
              ) : null)}
            </div>
          ) : (
            <EmptyState>{t('patient.appointmentDetail.noVisitNote', { defaultValue: 'Visit notes will appear here after your doctor completes the consultation.' })}</EmptyState>
          )}
        </ClinicalCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ClinicalCard title={t('patient.appointmentDetail.prescriptions', { defaultValue: 'Prescriptions' })} icon={Pill}>
          {data.prescriptions.length > 0 ? (
            <div className="space-y-4">
              {data.prescriptions.map((prescription) => (
                <div key={prescription.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-900">{prescription.status}</span>
                    <span className="text-xs text-slate-400">{new Date(prescription.prescribed_at).toLocaleDateString(locale, dtOpts({ month: 'short', day: 'numeric', year: 'numeric' }))}</span>
                  </div>
                  <div className="space-y-2">
                    {prescription.items.map((item) => (
                      <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <p className="font-semibold text-slate-900">{item.medication_name}</p>
                        <p className="text-slate-500">{[item.dosage, item.frequency, item.duration].filter(Boolean).join(' - ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>{t('patient.appointmentDetail.noPrescriptions', { defaultValue: 'No prescriptions are linked to this appointment yet.' })}</EmptyState>
          )}
        </ClinicalCard>

        <ClinicalCard title={t('patient.appointmentDetail.labOrders', { defaultValue: 'Lab orders' })} icon={FlaskConical}>
          {data.labOrders.length > 0 ? (
            <div className="space-y-4">
              {data.labOrders.map((labOrder) => (
                <div key={labOrder.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-900">{labOrder.lab_order_code ?? t('patient.appointmentDetail.labOrder', { defaultValue: 'Lab order' })}</span>
                    <span className="text-xs font-semibold text-teal-700">{labOrder.status}</span>
                  </div>
                  <div className="space-y-2">
                    {labOrder.items.map((item) => (
                      <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <p className="font-semibold text-slate-900">{item.test_name}</p>
                        <p className="text-slate-500">
                          {item.result_value
                            ? `${item.result_value}${item.result_unit ? ` ${item.result_unit}` : ''}`
                            : t('patient.imaging.resultPending', { defaultValue: 'Pending' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>{t('patient.appointmentDetail.noLabOrders', { defaultValue: 'No lab orders are linked to this appointment yet.' })}</EmptyState>
          )}
        </ClinicalCard>
      </section>
    </div>
  );
};

const InfoCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <div className="rounded-xl border border-slate-100 bg-white p-4">
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
      <Icon className="h-4 w-4" />
      {label}
    </div>
    <p className="font-semibold text-slate-900">{value}</p>
  </div>
);

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  primary = false,
  danger = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
      primary
        ? 'bg-teal-600 text-white hover:bg-teal-700'
        : danger
          ? 'bg-red-50 text-red-700 hover:bg-red-100'
          : 'bg-white text-slate-700 shadow-sm hover:bg-slate-100'
    }`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const ClinicalCard = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) => (
  <div className="rounded-2xl bg-white p-6 shadow-sm">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    </div>
    {children}
  </div>
);

const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
    {children}
  </div>
);
