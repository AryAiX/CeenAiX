import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Copy,
  FileText,
  MapPin,
  MessageSquare,
  Plus,
  Sparkles,
  User,
  Video,
  X,
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { useAppointments, usePatientPreVisitAssessments, useQuery } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import {
  appointmentStatusLabel,
  dateTimeFormatWithNumerals,
  preVisitStatusLabel,
  resolveLocale,
} from '../../lib/i18n-ui';
import { supabase } from '../../lib/supabase';
import type { Appointment, AppointmentStatus } from '../../types';

interface DoctorAppointmentProfile {
  userId: string;
  fullName: string;
  specialty: string | null;
  city: string | null;
  address: string | null;
}

type StatusFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';
type TypeFilter = 'all' | 'in_person' | 'virtual';

const UPCOMING_STATUSES = new Set<AppointmentStatus>(['scheduled', 'confirmed', 'in_progress']);
const COMPLETED_STATUSES = new Set<AppointmentStatus>(['completed']);
const CANCELLED_STATUSES = new Set<AppointmentStatus>(['cancelled', 'no_show']);

function buildIcsFile(appointment: Appointment, doctorName: string, location: string): string {
  const start = new Date(appointment.scheduled_at);
  const end = new Date(start.getTime() + appointment.duration_minutes * 60_000);
  const toIcs = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escape = (s: string) => s.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CeenAiX//Appointments//EN',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@ceenaix`,
    `DTSTAMP:${toIcs(new Date())}`,
    `DTSTART:${toIcs(start)}`,
    `DTEND:${toIcs(end)}`,
    `SUMMARY:${escape(`Appointment with ${doctorName}`)}`,
    `LOCATION:${escape(location)}`,
    `DESCRIPTION:${escape(appointment.chief_complaint ?? 'Scheduled consultation')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadIcs(appointment: Appointment, doctorName: string, location: string) {
  const blob = new Blob([buildIcsFile(appointment, doctorName, location)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-${appointment.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const PatientAppointments: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation('common');
  const locale = resolveLocale(i18n.language);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(i18n.language, options);
  const { user } = useAuth();
  const {
    data: appointmentsData,
    loading,
    error,
    refetch,
  } = useAppointments({ role: 'patient', userId: user?.id ?? '' });
  const appointments = useMemo(() => appointmentsData ?? [], [appointmentsData]);
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [directionsAppointmentId, setDirectionsAppointmentId] = useState<string | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const { data: preVisitAssessmentsData } = usePatientPreVisitAssessments(user?.id);
  const preVisitAssessments = useMemo(
    () => preVisitAssessmentsData ?? [],
    [preVisitAssessmentsData]
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [specialtyQuery, setSpecialtyQuery] = useState('');
  const [providerQuery, setProviderQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isPastExpanded, setIsPastExpanded] = useState(false);
  const [selectedPastId, setSelectedPastId] = useState<string | null>(null);

  const doctorIds = useMemo(
    () => Array.from(new Set(appointments.map((appointment) => appointment.doctor_id))),
    [appointments]
  );

  const {
    data: doctorProfilesData,
    loading: doctorProfilesLoading,
    error: doctorProfilesError,
  } = useQuery<DoctorAppointmentProfile[]>(
    async () => {
      if (doctorIds.length === 0) {
        return [];
      }

      const [{ data: userProfiles, error: userProfilesError }, { data: doctorProfilesData, error: doctorProfilesDataError }] =
        await Promise.all([
          supabase.from('user_profiles').select('user_id, full_name, city, address').in('user_id', doctorIds),
          supabase.from('doctor_profiles').select('user_id, specialization').in('user_id', doctorIds),
        ]);

      if (userProfilesError) {
        throw userProfilesError;
      }

      if (doctorProfilesDataError) {
        throw doctorProfilesDataError;
      }

      const doctorProfileById = new Map(
        (doctorProfilesData ?? []).map((doctorProfile) => [doctorProfile.user_id, doctorProfile])
      );

      return (userProfiles ?? []).map((userProfile) => ({
        userId: userProfile.user_id,
        fullName: userProfile.full_name ?? t('shared.doctor'),
        specialty: doctorProfileById.get(userProfile.user_id)?.specialization ?? null,
        city: userProfile.city ?? null,
        address: userProfile.address ?? null,
      }));
    },
    [doctorIds.join(',')]
  );
  const doctorProfiles = useMemo(() => doctorProfilesData ?? [], [doctorProfilesData]);

  const doctorProfileById = useMemo(
    () => new Map(doctorProfiles.map((doctorProfile) => [doctorProfile.userId, doctorProfile])),
    [doctorProfiles]
  );
  const preVisitAssessmentByAppointmentId = useMemo(
    () => new Map(preVisitAssessments.map((assessment) => [assessment.appointmentId, assessment])),
    [preVisitAssessments]
  );

  const isUpcoming = (appointment: Appointment) =>
    UPCOMING_STATUSES.has(appointment.status) &&
    new Date(appointment.scheduled_at).getTime() >= Date.now();

  const filteredAppointments = useMemo(() => {
    const normalizedSpecialty = specialtyQuery.trim().toLowerCase();
    const normalizedProvider = providerQuery.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    return appointments.filter((appointment) => {
      const scheduledTs = new Date(appointment.scheduled_at).getTime();

      if (statusFilter !== 'all') {
        if (statusFilter === 'upcoming' && !isUpcoming(appointment)) return false;
        if (statusFilter === 'completed' && !COMPLETED_STATUSES.has(appointment.status)) return false;
        if (statusFilter === 'cancelled' && !CANCELLED_STATUSES.has(appointment.status)) return false;
      }

      if (typeFilter !== 'all' && appointment.type !== typeFilter) return false;

      if (fromTs !== null && scheduledTs < fromTs) return false;
      if (toTs !== null && scheduledTs > toTs) return false;

      if (normalizedSpecialty || normalizedProvider) {
        const profile = doctorProfileById.get(appointment.doctor_id);
        const specialty = (profile?.specialty ?? '').toLowerCase();
        const name = (profile?.fullName ?? '').toLowerCase();
        if (normalizedSpecialty && !specialty.includes(normalizedSpecialty)) return false;
        if (normalizedProvider && !name.includes(normalizedProvider)) return false;
      }

      return true;
    });
  }, [appointments, statusFilter, typeFilter, specialtyQuery, providerQuery, dateFrom, dateTo, doctorProfileById]);

  const upcomingAppointments = useMemo(
    () => filteredAppointments.filter(isUpcoming),
    [filteredAppointments]
  );

  const pastAppointments = useMemo(
    () =>
      filteredAppointments.filter((appointment) => !isUpcoming(appointment)),
    [filteredAppointments]
  );

  const appointmentDaysInMonth = useMemo(() => {
    const days = new Set<number>();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    for (const appointment of appointments) {
      const d = new Date(appointment.scheduled_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        days.add(d.getDate());
      }
    }
    return days;
  }, [appointments, calendarMonth]);

  const nextTeleconsult = useMemo(() => {
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;
    return upcomingAppointments
      .filter((appointment) => appointment.type === 'virtual')
      .filter((appointment) => {
        const ts = new Date(appointment.scheduled_at).getTime();
        return ts >= now && ts <= horizon;
      })
      .sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      )[0] ?? null;
  }, [upcomingAppointments]);

  const [teleconsultCountdown, setTeleconsultCountdown] = useState('');
  useEffect(() => {
    if (!nextTeleconsult) {
      setTeleconsultCountdown('');
      return;
    }
    const update = () => {
      const diff = new Date(nextTeleconsult.scheduled_at).getTime() - Date.now();
      if (diff <= 0) {
        setTeleconsultCountdown(t('patient.appointments.teleconsultBannerStartingNow'));
        return;
      }
      const totalMinutes = Math.floor(diff / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setTeleconsultCountdown(`${hours}h ${minutes}m`);
      } else {
        setTeleconsultCountdown(`${totalMinutes}m ${seconds}s`);
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [nextTeleconsult, t]);

  const handleCancelAppointment = async (appointmentId: string, reason?: string) => {
    void reason;
    setFeedback(null);
    setBusyAppointmentId(appointmentId);

    const { error: updateError } = await supabase.rpc('cancel_patient_appointment', {
      p_appointment_id: appointmentId,
    });

    setBusyAppointmentId(null);

    if (updateError) {
      setFeedback({ type: 'error', message: updateError.message });
      return;
    }

    setFeedback({ type: 'success', message: t('patient.appointments.cancelSuccess') });
    refetch();
  };

  const resetCancelModal = () => {
    setShowCancelModal(false);
    setCancellingAppointmentId(null);
    setCancelReason('');
    setCancelCustomReason('');
  };

  const resetDirectionsModal = () => {
    setShowDirectionsModal(false);
    setDirectionsAppointmentId(null);
    setAddressCopied(false);
  };

  const isWithin10Min = (appointment: Appointment) => {
    const diff = new Date(appointment.scheduled_at).getTime() - Date.now();
    return diff <= 10 * 60 * 1000 && diff > -appointment.duration_minutes * 60 * 1000;
  };

  const getDoctorInitials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';

  const renderAppointmentCard = (appointment: Appointment) => {
    const doctorProfile = doctorProfileById.get(appointment.doctor_id);
    const clinicName = doctorProfile?.city ?? t('shared.clinicPending');
    const clinicAddress = doctorProfile?.address ?? '';
    const upcoming = isUpcoming(appointment);
    const preVisitAssessment = preVisitAssessmentByAppointmentId.get(appointment.id);
    const isTeleconsult = appointment.type === 'virtual';
    const canJoin = isTeleconsult && isWithin10Min(appointment);
    const typeBadge = isTeleconsult
      ? 'bg-violet-100 text-violet-700 border-violet-300'
      : 'bg-teal-100 text-teal-700 border-teal-300';
    const statusBadge = upcoming
      ? 'bg-green-100 text-green-700 border-green-300'
      : 'bg-amber-100 text-amber-700 border-amber-300';
    const borderAccent = upcoming ? 'border-teal-600' : 'border-slate-300';

    return (
      <div
        key={appointment.id}
        className={`bg-white rounded-lg border-l-4 ${borderAccent} p-6 shadow-sm hover:shadow-md transition-all`}
      >
        <div className="flex gap-4">
          <div
            className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
              upcoming
                ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
            aria-hidden
          >
            {doctorProfile ? getDoctorInitials(doctorProfile.fullName) : <User className="h-6 w-6" />}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {doctorProfile?.fullName ?? t('shared.doctor')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {doctorProfile?.specialty ?? t('shared.careVisit')}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${typeBadge}`}>
                  {isTeleconsult && <Video className="w-3 h-3 inline mr-1" />}
                  {isTeleconsult
                    ? t('patient.appointments.filterTeleconsult')
                    : t('patient.appointments.filterInPerson')}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge}`}>
                  {appointmentStatusLabel(t, appointment.status)}
                </span>
              </div>
            </div>

            {clinicName ? (
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{clinicName}</span>
                {clinicAddress ? (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{clinicAddress}</span>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span className="text-lg font-serif font-semibold text-gray-900">
                  {new Date(appointment.scheduled_at).toLocaleDateString(
                    locale,
                    dtOpts({ month: 'long', day: '2-digit', year: 'numeric' })
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <span className="text-lg font-serif font-semibold text-gray-900">
                  {new Date(appointment.scheduled_at).toLocaleTimeString(
                    locale,
                    dtOpts({ hour: 'numeric', minute: '2-digit' })
                  )}
                </span>
                <span className="text-xs text-gray-500">
                  {t('shared.minutesUnit', { count: appointment.duration_minutes })}
                </span>
              </div>
            </div>

            {appointment.chief_complaint ? (
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t('patient.appointments.reason')}
                </p>
                <p className="mt-1 text-sm text-slate-700">{appointment.chief_complaint}</p>
              </div>
            ) : null}

            {appointment.notes ? (
              <div className="mb-4 p-4 bg-violet-50 border border-violet-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-violet-900 text-sm mb-1">
                      {t('patient.appointments.preparationNotes')}
                    </h4>
                    <p className="text-sm text-violet-800 whitespace-pre-wrap">{appointment.notes}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {preVisitAssessment ? (
              <div className="mb-4 rounded-lg border border-teal-100 bg-teal-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-teal-700" />
                    <p className="text-sm font-semibold text-teal-900">
                      {t('patient.appointments.preVisitPrefix')}{' '}
                      {preVisitStatusLabel(t, preVisitAssessment.status)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/patient/pre-visit/${preVisitAssessment.id}`)}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 shadow-sm transition hover:shadow"
                  >
                    {preVisitAssessment.status === 'completed' || preVisitAssessment.status === 'reviewed'
                      ? t('patient.appointments.reviewIntake')
                      : t('patient.appointments.continueIntake')}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {isTeleconsult && upcoming ? (
                <button
                  type="button"
                  disabled={!canJoin}
                  onClick={() =>
                    canJoin ? navigate(`/patient/telemedicine/${appointment.id}`) : undefined
                  }
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    canJoin
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Video className="w-4 h-4 inline mr-2" />
                  {canJoin
                    ? t('patient.appointments.joinCall')
                    : t('patient.appointments.joinCallDisabled')}
                </button>
              ) : null}

              {upcoming ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(`/patient/appointments/book?reschedule=${appointment.id}`)}
                    disabled={busyAppointmentId === appointment.id}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-60"
                  >
                    {t('patient.appointments.reschedule')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCancellingAppointmentId(appointment.id);
                      setShowCancelModal(true);
                    }}
                    disabled={busyAppointmentId === appointment.id}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-60"
                  >
                    {t('patient.appointments.cancel')}
                  </button>
                </>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  downloadIcs(
                    appointment,
                    doctorProfile?.fullName ?? t('shared.doctor'),
                    [clinicName, clinicAddress].filter(Boolean).join(', ')
                  )
                }
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                {t('patient.appointments.addToCalendar')}
              </button>

              {!isTeleconsult && (clinicAddress || clinicName) ? (
                <button
                  type="button"
                  onClick={() => {
                    setDirectionsAppointmentId(appointment.id);
                    setShowDirectionsModal(true);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  <MapPin className="w-4 h-4 inline mr-2" />
                  {t('patient.appointments.getDirections')}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => navigate(`/patient/messages?doctor=${appointment.doctor_id}`)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                {upcoming ? t('patient.messages.messageDoctor') : t('patient.messages.followUpDoctor')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDirectionsModal = () => {
    if (!showDirectionsModal || !directionsAppointmentId) return null;

    const directionsDoctor = doctorProfileById.get(directionsAppointmentId);
    const address = [directionsDoctor?.address, directionsDoctor?.city].filter(Boolean).join(', ');
    const clinicLabel = directionsDoctor?.city ?? t('shared.clinicPending');
    const encodedAddress = encodeURIComponent(address);

    const navApps: Array<{
      name: string;
      icon: React.ReactNode;
      onClick: () => void;
    }> = [
      {
        name: 'Google Maps',
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6">
            <path
              fill="#4285F4"
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            />
          </svg>
        ),
        onClick: () =>
          window.open(
            `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
            '_blank',
            'noopener,noreferrer'
          ),
      },
      {
        name: 'Waze',
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6">
            <path
              fill="#33CCFF"
              d="M20.54 6.63C19.08 3.24 15.79 1 12.06 1 6.56 1 2.06 5.5 2.06 11c0 2.12.67 4.08 1.8 5.69L2 22l5.5-1.73A9.94 9.94 0 0 0 12.06 21c5.5 0 9.94-4.5 9.94-10 0-1.61-.39-3.13-1.46-4.37z"
            />
          </svg>
        ),
        onClick: () =>
          window.open(
            `https://waze.com/ul?q=${encodedAddress}`,
            '_blank',
            'noopener,noreferrer'
          ),
      },
      {
        name: 'Apple Maps',
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6">
            <path
              fill="#000000"
              d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
            />
          </svg>
        ),
        onClick: () =>
          window.open(
            `https://maps.apple.com/?q=${encodedAddress}`,
            '_blank',
            'noopener,noreferrer'
          ),
      },
      {
        name: addressCopied ? '✓ Copied!' : 'Copy Address',
        icon: <Copy className="w-6 h-6 text-slate-600" />,
        onClick: () => {
          navigator.clipboard.writeText(address).then(() => {
            setAddressCopied(true);
            window.setTimeout(() => setAddressCopied(false), 2000);
          });
        },
      },
    ];

    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={resetDirectionsModal}
      >
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-teal-600" />
              <h2 className="text-lg font-semibold text-gray-900">Get Directions</h2>
            </div>
            <button
              type="button"
              onClick={resetDirectionsModal}
              aria-label="Close"
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Location summary */}
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <MapPin className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 text-sm">{clinicLabel}</p>
                {address ? (
                  <p className="text-sm text-slate-600 mt-0.5">{address}</p>
                ) : null}
              </div>
            </div>

            {/* Navigation app grid */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Choose your navigation app
              </p>
              <div className="grid grid-cols-2 gap-3">
                {navApps.map((app) => (
                  <button
                    key={app.name}
                    type="button"
                    onClick={app.onClick}
                    className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center text-sm font-medium text-gray-700 transition-all hover:border-teal-400 hover:bg-teal-50/40 hover:shadow-sm"
                  >
                    {app.icon}
                    <span className="text-xs leading-tight">{app.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5">
            <button
              type="button"
              onClick={resetDirectionsModal}
              className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const CANCEL_REASONS = [
    'Schedule conflict',
    'Feeling better',
    'Found another doctor',
    'Personal reasons',
    'Other',
  ] as const;

  const renderCancelModal = () => {
    if (!showCancelModal || !cancellingAppointmentId) return null;

    const appointment = appointments.find((a) => a.id === cancellingAppointmentId);
    if (!appointment) return null;

    const doctorProfile = doctorProfileById.get(appointment.doctor_id);
    const doctorName = doctorProfile?.fullName ?? t('shared.doctor');
    const appointmentDate = new Date(appointment.scheduled_at);
    const isBusy = busyAppointmentId === cancellingAppointmentId;
    const canConfirm =
      cancelReason !== '' &&
      (cancelReason !== 'Other' || cancelCustomReason.trim() !== '');

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">Cancel Appointment</h2>
            </div>
            <button
              type="button"
              onClick={resetCancelModal}
              aria-label="Close"
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Appointment summary */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="font-semibold text-slate-900">{doctorName}</p>
              <p className="text-sm text-slate-600 mt-1">
                {appointmentDate.toLocaleDateString(
                  locale,
                  dtOpts({ month: 'long', day: '2-digit', year: 'numeric' })
                )}
                {' · '}
                {appointmentDate.toLocaleTimeString(
                  locale,
                  dtOpts({ hour: 'numeric', minute: '2-digit' })
                )}
              </p>
            </div>

            {/* Reason grid */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Reason for cancellation</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors ${
                      cancelReason === reason
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-teal-300 hover:bg-teal-50/40'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional details textarea */}
            <textarea
              value={cancelCustomReason}
              onChange={(e) => setCancelCustomReason(e.target.value)}
              placeholder="Add additional details (optional)..."
              required={cancelReason === 'Other'}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />

            {/* 24h warning */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              ⚠️ Cancelling within 24 hours of your appointment may incur a cancellation fee.
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6">
            <button
              type="button"
              onClick={resetCancelModal}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Keep Appointment
            </button>
            <button
              type="button"
              disabled={!canConfirm || isBusy}
              onClick={async () => {
                const reason = cancelReason === 'Other' ? cancelCustomReason.trim() : cancelReason;
                await handleCancelAppointment(cancellingAppointmentId, reason);
                resetCancelModal();
              }}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isBusy ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Cancelling…
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const statusOptions: Array<{ value: StatusFilter; labelKey: string }> = [
    { value: 'all', labelKey: 'patient.appointments.filterAll' },
    { value: 'upcoming', labelKey: 'patient.appointments.filterUpcoming' },
    { value: 'completed', labelKey: 'patient.appointments.filterCompleted' },
    { value: 'cancelled', labelKey: 'patient.appointments.filterCancelled' },
  ];

  const typeOptions: Array<{ value: TypeFilter; labelKey: string }> = [
    { value: 'all', labelKey: 'patient.appointments.filterAll' },
    { value: 'in_person', labelKey: 'patient.appointments.filterInPerson' },
    { value: 'virtual', labelKey: 'patient.appointments.filterTeleconsult' },
  ];

  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  ).getDay();

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date();
  const isTodayVisible =
    today.getFullYear() === calendarMonth.getFullYear() &&
    today.getMonth() === calendarMonth.getMonth();

  const renderFilterPanel = () => (
    <aside className="hidden lg:block w-[280px] flex-shrink-0 bg-white border border-slate-200 rounded-xl p-6 space-y-6 h-fit sticky top-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">{t('patient.appointments.filterStatus')}</h3>
        <div className="space-y-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-teal-100 text-teal-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">{t('patient.appointments.filterType')}</h3>
        <div className="space-y-2">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTypeFilter(opt.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === opt.value
                  ? 'bg-teal-100 text-teal-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-semibold text-gray-900 mb-3 block">
          {t('patient.appointments.filterSpecialty')}
        </label>
        <input
          type="text"
          value={specialtyQuery}
          onChange={(event) => setSpecialtyQuery(event.target.value)}
          placeholder={t('patient.appointments.searchSpecialtyPh')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="font-semibold text-gray-900 mb-3 block">
          {t('patient.appointments.filterProvider')}
        </label>
        <input
          type="text"
          value={providerQuery}
          onChange={(event) => setProviderQuery(event.target.value)}
          placeholder={t('patient.appointments.searchProviderPh')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {t('patient.appointments.filterCalendar')}
        </h3>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                )
              }
              className="p-1 hover:bg-gray-200 rounded"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {calendarMonth.toLocaleDateString(locale, dtOpts({ month: 'long', year: 'numeric' }))}
            </span>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                )
              }
              className="p-1 hover:bg-gray-200 rounded"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((day, i) => (
              <div key={i} className="text-xs font-medium text-gray-500 mb-1">
                {day}
              </div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const hasAppointment = appointmentDaysInMonth.has(day);
              const isToday = isTodayVisible && today.getDate() === day;
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => {
                    const selected = new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth(),
                      day
                    );
                    const iso = selected.toISOString().slice(0, 10);
                    setDateFrom(iso);
                    setDateTo(iso);
                  }}
                  className={`relative w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                    isToday ? 'bg-teal-600 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day}
                  {hasAppointment ? (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-600 rounded-full" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          {t('patient.appointments.filterDateRange')}
        </h3>
        <div className="space-y-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
    </aside>
  );

  const renderPastTable = () => (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setIsPastExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-gray-900">
            {t('patient.appointments.pastTitle')}
          </h3>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-600">
            {pastAppointments.length}
          </span>
        </div>
        {isPastExpanded ? (
          <ChevronUp className="w-6 h-6 text-gray-600" />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {isPastExpanded ? (
        <div className="border-t border-gray-200">
          {pastAppointments.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              {t('patient.appointments.noPastBody')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      {t('patient.appointments.date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      {t('shared.doctor')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      {t('patient.appointments.location')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      {t('patient.appointments.filterType')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      {t('patient.appointments.reason')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      {t('patient.appointments.filterStatus')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pastAppointments.map((appointment) => {
                    const doctorProfile = doctorProfileById.get(appointment.doctor_id);
                    const typeColor =
                      appointment.type === 'virtual' ? 'text-violet-700' : 'text-teal-700';
                    return (
                      <React.Fragment key={appointment.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(appointment.scheduled_at).toLocaleDateString(
                              locale,
                              dtOpts({ month: 'short', day: '2-digit', year: 'numeric' })
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                {doctorProfile ? getDoctorInitials(doctorProfile.fullName) : '?'}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {doctorProfile?.fullName ?? t('shared.doctor')}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {doctorProfile?.specialty ?? t('shared.careVisit')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {doctorProfile?.city ?? t('shared.clinicPending')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-medium ${typeColor}`}>
                              {appointment.type === 'virtual'
                                ? t('patient.appointments.filterTeleconsult')
                                : t('patient.appointments.filterInPerson')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPastId(
                                  selectedPastId === appointment.id ? null : appointment.id
                                )
                              }
                              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                            >
                              <FileText className="w-4 h-4" />
                              {appointment.chief_complaint ?? t('shared.scheduledConsultation')}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded">
                              {appointmentStatusLabel(t, appointment.status)}
                            </span>
                          </td>
                        </tr>
                        {selectedPastId === appointment.id && appointment.notes ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h5 className="font-semibold text-violet-900 mb-1">
                                      {t('patient.appointments.preparationNotes')}
                                    </h5>
                                    <p className="text-sm text-violet-800 whitespace-pre-wrap">
                                      {appointment.notes}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  const showSuccessBanner = searchParams.get('booked') === '1';
  const showRescheduledBanner = searchParams.get('rescheduled') === '1';
  const showPreVisitCompletedBanner = searchParams.get('previsit') === 'completed';
  const isLoadingPage = loading || doctorProfilesLoading;
  const totalFilteredEmpty =
    !isLoadingPage && upcomingAppointments.length === 0 && pastAppointments.length === 0;
  const hasAnyAppointments = appointments.length > 0;

  return (
    <>
      <div className="flex items-start justify-between gap-4 animate-fadeIn">
        <div>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            {t('patient.appointments.title')}
          </h1>
          <p className="mt-2 text-[15px] text-slate-400">{t('patient.appointments.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/patient/appointments/book')}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all duration-300 hover:bg-teal-700 hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          <span>{t('patient.appointments.book')}</span>
        </button>
      </div>

      {nextTeleconsult ? (
        <div className="mt-6 bg-teal-600 text-white p-4 rounded-lg border-4 border-teal-400 animate-pulse-border">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {t('patient.appointments.teleconsultBannerTitle', {
                    doctor:
                      doctorProfileById.get(nextTeleconsult.doctor_id)?.fullName ??
                      t('shared.doctor'),
                  })}
                </h3>
                <p className="text-teal-100">
                  {t('patient.appointments.teleconsultBannerStartsIn', {
                    time: teleconsultCountdown,
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/patient/telemedicine/${nextTeleconsult.id}`)}
              className="px-6 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:bg-teal-50 transition-colors"
            >
              {t('patient.appointments.joinWaitingRoom')}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        {showSuccessBanner ? (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t('patient.appointments.bannerBooked')}
          </div>
        ) : null}

        {showRescheduledBanner ? (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t('patient.appointments.bannerRescheduled')}
          </div>
        ) : null}

        {showPreVisitCompletedBanner ? (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t('patient.appointments.bannerPreVisit')}
          </div>
        ) : null}

        {feedback ? (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-red-100 bg-red-50 text-red-600'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {error || doctorProfilesError ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t('patient.appointments.loadError')}
          </div>
        ) : null}

        <div className="flex flex-col lg:flex-row gap-6">
          {renderFilterPanel()}

          <div className="flex-1 min-w-0">
            {isLoadingPage ? (
              <div className="space-y-6">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            ) : !hasAnyAppointments ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
                  <Calendar className="h-8 w-8 text-teal-600" />
                </div>
                <h2 className="font-playfair text-xl font-bold text-slate-900">
                  {t('patient.appointments.emptyTitle')}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {t('patient.appointments.emptyBody')}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/patient/appointments/book')}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all duration-300 hover:bg-teal-700 hover:shadow-xl"
                >
                  <Plus className="h-5 w-5" />
                  <span>{t('patient.appointments.book')}</span>
                </button>
              </div>
            ) : totalFilteredEmpty ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
                <AlertCircle className="mx-auto mb-4 h-8 w-8 text-slate-300" />
                <h2 className="font-playfair text-xl font-bold text-slate-900">
                  {t('patient.appointments.noResultsFilters')}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {t('patient.appointments.noResultsFiltersSub')}
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-slideUp" style={{ animationDelay: '80ms' }}>
                <section>
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <h2 className="font-playfair text-2xl md:text-3xl font-bold text-slate-900">
                        {t('patient.appointments.upcomingTitle')}
                      </h2>
                      <span className="rounded-full bg-teal-600 px-3 py-1 text-sm font-semibold text-white shadow-sm">
                        {upcomingAppointments.length}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {t('patient.appointments.upcomingSub')}
                    </p>
                  </div>

                  {upcomingAppointments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                      <AlertCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                      <p className="font-semibold text-slate-900">
                        {t('patient.appointments.noUpcomingTitle')}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {t('patient.appointments.noUpcomingBody')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingAppointments.map(renderAppointmentCard)}
                    </div>
                  )}
                </section>

                {renderPastTable()}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgb(45, 212, 191); }
          50% { border-color: rgb(20, 184, 166); }
        }
        .animate-pulse-border { animation: pulse-border 2s ease-in-out infinite; }
      `}</style>

      {renderDirectionsModal()}
      {renderCancelModal()}
    </>
  );
};
