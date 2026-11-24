import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Calendar,
  CalendarCheck,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  MessageSquare,
  PenLine,
  PlayCircle,
  Send,
  Sparkles,
  TestTube,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../../components/Skeleton';
import { useDoctorDashboard } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import {
  appointmentTypeLabel,
  dateTimeFormatWithNumerals,
  formatLocaleCurrency,
  formatLocaleDigits,
  formatRelativeTime,
  CLINIC_TIME_ZONE,
  isSameCalendarDayInTimeZone,
  resolveLocale,
  usesArabicEasternNumerals,
} from '../../lib/i18n-ui';
import { formatElapsed, splitMinutes, visitTiming } from '../../lib/doctor-visit-timing';

const getDisplayName = (fullName: string | null | undefined, firstName: string | null | undefined) => {
  if (fullName?.trim()) return fullName.trim();
  if (firstName?.trim()) return firstName.trim();
  return '';
};

// QA-185: which page each number card opens (cards without a target are not clickable).
const CARD_TARGETS: Record<string, string | undefined> = {
  'appointments-today': '/doctor/today',
  'prescriptions-today': '/doctor/prescriptions',
  'lab-orders-today': '/doctor/lab-orders',
  'unread-messages': '/doctor/messages',
  'revenue-today': '/doctor/earnings',
};

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const locale = resolveLocale(uiLang);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(uiLang, options);
  const { doctorProfile, profile, user } = useAuth();
  const { data, loading, error, refetch } = useDoctorDashboard(user?.id);

  const displayName = getDisplayName(profile?.full_name, profile?.first_name) || t('shared.doctor');
  const doctorName = /^(dr\.?|د\.)\s/i.test(displayName) ? displayName : t('doctor.dashboard.ui.doctorName', { name: displayName });
  // QA-184: the header shows the doctor's city, never the personal address from the profile.
  const doctorCity = profile?.city?.trim() || '';
  const doctorLicense = doctorProfile?.license_number?.trim() || t('doctor.dashboard.ui.licencePending');
  // QA-185: greeting by the clinic's clock (Dubai), not the device's.
  const clinicHour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: CLINIC_TIME_ZONE }).format(new Date())
  );
  const greeting = t(`doctor.dashboard.ui.greeting.${clinicHour < 12 ? 'morning' : clinicHour < 18 ? 'afternoon' : 'evening'}`);
  const completedTodayAppointments = data?.completedTodayAppointments ?? 0;
  const todayAppointments = data?.todayAppointments ?? 0;
  const remainingTodayAppointments = data?.remainingTodayAppointments ?? 0;
  const inProgressAppointments = data?.inProgressAppointments ?? 0;
  const activeConsultation = data?.activeConsultation ?? null;
  const nextAppointment = data?.nextAppointment ?? null;
  const featuredAppointment = activeConsultation ?? nextAppointment;
  // QA-183: a clock for the patient card: every second during a live visit, otherwise every 30 s.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), activeConsultation ? 1000 : 30000);
    return () => window.clearInterval(timer);
  }, [activeConsultation]);
  const todaySchedule = data?.todaySchedule ?? [];
  const criticalResult = data?.criticalResults[0] ?? null;
  const criticalCount = data?.criticalResults.length ?? 0;
  // QA-180: open the exact lab order (Lab Referrals highlights it).
  const openLabOrder = (labOrderId: string) => navigate('/doctor/lab-orders', { state: { focusLabOrderId: labOrderId } });
  const recentLabResults = data?.recentLabResults ?? [];
  const recentMessages = data?.recentMessages ?? [];
  const consultationFee = doctorProfile?.consultation_fee ?? 0;
  const appointmentProgress = todayAppointments > 0 ? Math.round((completedTodayAppointments / todayAppointments) * 100) : 0;
  const metricCards = [
    {
      id: 'appointments-today',
      icon: CalendarCheck,
      label: t('doctor.dashboard.ui.cards.appointmentsToday'),
      value: formatLocaleDigits(todayAppointments, uiLang),
      sub: t('doctor.dashboard.ui.cards.appointmentsSub', {
        done: formatLocaleDigits(completedTodayAppointments, uiLang),
        inProgress: formatLocaleDigits(inProgressAppointments, uiLang),
        remaining: formatLocaleDigits(remainingTodayAppointments, uiLang),
      }),
      color: 'teal',
      progress: appointmentProgress,
    },
    {
      id: 'prescriptions-today',
      icon: PenLine,
      label: t('doctor.dashboard.ui.cards.prescriptionsWritten'),
      value: formatLocaleDigits(data?.prescriptionsToday ?? 0, uiLang),
      sub: t('doctor.dashboard.ui.cards.today'),
      color: 'purple',
    },
    {
      id: 'lab-orders-today',
      icon: FlaskConical,
      label: t('doctor.dashboard.ui.cards.labOrdersToday'),
      value: formatLocaleDigits(data?.labOrdersToday ?? 0, uiLang),
      sub: t('doctor.dashboard.labs.counts', {
        critical: formatLocaleDigits(criticalCount, uiLang),
        recent: formatLocaleDigits(recentLabResults.length, uiLang),
      }),
      color: 'indigo',
      critical: criticalCount > 0,
    },
    {
      id: 'unread-messages',
      icon: MessageSquare,
      label: t('doctor.dashboard.ui.cards.unreadMessages'),
      value: formatLocaleDigits(data?.unreadMessages ?? 0, uiLang),
      sub: t('doctor.dashboard.ui.cards.messagesToday', { value: formatLocaleDigits(recentMessages.length, uiLang) }),
      color: 'blue',
    },
    {
      id: 'revenue-today',
      icon: CircleDollarSign,
      // QA-184: same estimate as the Earnings page (QA-158 / QA-159): completed visits x fee,
      // labelled as an estimate, in the UI money format; booked visits give the projection.
      label: t('doctor.earnings.earnedTodayEstimate'),
      value: consultationFee > 0 ? formatLocaleCurrency(completedTodayAppointments * consultationFee, uiLang) : '—',
      sub:
        consultationFee > 0
          ? t('doctor.dashboard.cards.projectedToday', {
              value: formatLocaleCurrency(todayAppointments * consultationFee, uiLang),
            })
          : t('doctor.earnings.feeMissing'),
      color: 'emerald',
      progress: appointmentProgress,
    },
    {
      id: 'dha-status',
      icon: Users,
      label: t('doctor.dashboard.ui.cards.dhaStatus'),
      value: doctorProfile?.dha_license_verified ? t('doctor.settings.verified') : t('doctor.settings.pending'),
      sub: doctorLicense,
      color: doctorProfile?.dha_license_verified ? 'emerald' : 'slate',
      extraSub: doctorProfile?.dha_license_verified ? t('doctor.dashboard.ui.cards.verifiedSub') : t('doctor.dashboard.ui.cards.pendingSub'),
    },
  ];
  const quickActions = [
    { icon: ClipboardList, label: t('doctor.dashboard.ui.quick.writePrescription'), color: 'purple', onClick: () => navigate('/doctor/prescribe') },
    // QA-184: opens a new lab order (it used to open the lab list); critical results have their own banner.
    { icon: TestTube, label: t('doctor.dashboard.ui.quick.orderLabTest'), color: 'indigo', onClick: () => navigate('/doctor/lab-orders/new') },
    { icon: Calendar, label: t('doctor.dashboard.ui.quick.blockTime'), color: 'slate', onClick: () => navigate('/doctor/schedule') },
    { icon: Send, label: t('doctor.dashboard.ui.quick.messagePatient'), color: 'teal', onClick: () => navigate('/doctor/messages') },
    { icon: FileText, label: t('doctor.dashboard.ui.quick.patientRecords'), color: 'blue', onClick: () => navigate('/doctor/patients') },
    {
      icon: Bot,
      label: t('doctor.dashboard.ui.quick.openConsultation'),
      color: 'indigo',
      onClick: () =>
        featuredAppointment
          ? navigate(`/doctor/appointments/${featuredAppointment.id}`)
          : navigate('/doctor/appointments'),
    },
  ];

  const renderComplaint = (value: string | null | undefined, emptyLabel: string) => {
    if (!value?.trim()) {
      return emptyLabel;
    }

    return uiLang.startsWith('ar') ? (
      <span dir="ltr" className="block text-start" translate="no">
        {value}
      </span>
    ) : (
      value
    );
  };

  const formatDoctorTime = (value: string) =>
    new Date(value).toLocaleTimeString(locale, dtOpts({ hour: 'numeric', minute: '2-digit' }));
  const formatShortDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, dtOpts({ day: 'numeric', month: 'short' }));
  // QA-183: what the big patient card says about time (see doctor-visit-timing.ts).
  const toLocaleDigitString = (value: string) =>
    usesArabicEasternNumerals(uiLang) ? value.replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]) : value;
  const featuredTiming = featuredAppointment
    ? visitTiming(featuredAppointment.scheduledAt, now, Boolean(activeConsultation))
    : null;
  const featuredStartLine = (() => {
    if (!featuredAppointment) return '';
    const time = formatDoctorTime(featuredAppointment.scheduledAt);
    if (activeConsultation) return t('doctor.dashboard.hero.scheduledStart', { time });
    return isSameCalendarDayInTimeZone(featuredAppointment.scheduledAt, new Date(now))
      ? t('doctor.dashboard.hero.startsAt', { time })
      : t('doctor.dashboard.hero.startsOn', { date: formatShortDate(featuredAppointment.scheduledAt), time });
  })();
  const featuredTimingText = (() => {
    if (!featuredTiming) return '';
    switch (featuredTiming.kind) {
      case 'elapsed':
        return toLocaleDigitString(formatElapsed(featuredTiming.seconds));
      case 'inProgress':
        return t('doctor.dashboard.hero.inProgress');
      case 'startsIn': {
        const { hours, minutes } = splitMinutes(featuredTiming.minutes);
        return hours > 0
          ? t('doctor.dashboard.hero.inHoursMinutes', {
              hours: formatLocaleDigits(hours, uiLang),
              minutes: formatLocaleDigits(minutes, uiLang),
            })
          : t('doctor.dashboard.hero.inMinutes', { value: formatLocaleDigits(minutes, uiLang) });
      }
      case 'late':
        return featuredTiming.minutes === 0
          ? t('doctor.dashboard.hero.dueNow')
          : t('doctor.dashboard.hero.late', { value: formatLocaleDigits(featuredTiming.minutes, uiLang) });
    }
  })();
  const lastTodayAppointment = todaySchedule.length > 0 ? todaySchedule[todaySchedule.length - 1] : null;
  // Avoid the hard-coded "~4:00 PM" fallback that misled doctors when their
  // schedule was empty for the day. Render an em-dash instead.
  const finishEstimate = lastTodayAppointment ? formatDoctorTime(lastTodayAppointment.scheduledAt) : '—';
  const cardColorClasses = {
    teal: { bg: 'bg-teal-100', icon: 'text-teal-600', text: 'text-teal-600', bar: 'bg-teal-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600', text: 'text-purple-600', bar: 'bg-purple-600' },
    indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-600', bar: 'bg-indigo-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', text: 'text-blue-600', bar: 'bg-blue-600' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-600', bar: 'bg-emerald-600' },
    slate: { bg: 'bg-slate-100', icon: 'text-slate-600', text: 'text-slate-600', bar: 'bg-slate-600' },
  };
  const quickActionColors = {
    purple: 'hover:bg-purple-50 hover:border-purple-300',
    indigo: 'hover:bg-indigo-50 hover:border-indigo-300',
    slate: 'hover:bg-slate-50 hover:border-slate-300',
    teal: 'hover:bg-teal-50 hover:border-teal-300',
    blue: 'hover:bg-blue-50 hover:border-blue-300',
  };
  return (
    <div>
      {error ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          <p>{t('doctor.dashboard.loadError')}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 font-semibold text-amber-900 underline"
          >
            {t('shared.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : null}

      {criticalResult ? (
        // QA-180: only results that are really critical (QA-142 rule) and not reviewed yet.
        <div
          className="mb-6 w-full animate-pulse-ring rounded-xl border-2 border-red-600 bg-red-50 p-4"
          role="alert"
          data-testid="critical-result-banner"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <AlertTriangle className="h-8 w-8 animate-pulse text-red-600" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="mb-2">
                  <h3 className="mb-1 text-sm font-bold uppercase text-red-700">{t('doctor.dashboard.critical.title')}</h3>
                  <p className="font-mono text-xs text-red-500">
                    {t('doctor.dashboard.critical.notReviewed', { time: formatRelativeTime(t, criticalResult.resultedAt) })}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-red-900">
                    {criticalResult.patientName} — {criticalResult.testName}
                  </h4>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-mono text-3xl font-bold text-red-700">
                      <bdi>{[criticalResult.resultValue, criticalResult.resultUnit].filter(Boolean).join(' ')}</bdi>
                    </span>
                    <span className="text-xs text-slate-600">
                      {t('doctor.dashboard.critical.reference')}: <bdi>{criticalResult.referenceRange ?? '—'}</bdi>
                    </span>
                    <span className="rounded bg-red-600 px-2 py-1 text-[11px] font-bold text-white" data-testid="critical-direction">
                      {t(`doctor.dashboard.critical.direction.${criticalResult.direction ?? 'none'}`)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t('doctor.dashboard.critical.resultedAt', { time: formatDoctorTime(criticalResult.resultedAt) })}
                  </p>
                  {criticalCount > 1 ? (
                    <p className="text-xs font-semibold text-red-700">
                      {t('doctor.dashboard.critical.more', {
                        count: criticalCount - 1,
                        value: formatLocaleDigits(criticalCount - 1, uiLang),
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                onClick={() => openLabOrder(criticalResult.labOrderId)}
                className="whitespace-nowrap rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                {t('doctor.dashboard.critical.open')}
              </button>
            </div>
          </div>
          <div className="mt-3 border-t border-red-200 pt-3">
            <p className="text-[11px] text-red-600">{t('doctor.dashboard.critical.howToClear')}</p>
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-[28px] font-bold text-slate-900">
            {t('doctor.dashboard.ui.greetingLine', { greeting, name: doctorName })}
          </h1>
          <p className="text-sm text-slate-400">
            {[
              new Date().toLocaleDateString(
                locale,
                dtOpts({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: CLINIC_TIME_ZONE })
              ),
              doctorCity,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          {loading ? (
            <Skeleton className="h-12 w-52" />
          ) : (
            <div className="flex items-center gap-6">
              <div>
                <p className="font-mono text-xl font-bold text-teal-600">
                  {t('doctor.dashboard.ui.doneOfTotal', {
                    done: formatLocaleDigits(completedTodayAppointments, uiLang),
                    total: formatLocaleDigits(todayAppointments, uiLang),
                  })}
                </p>
                <p className="text-xs text-slate-500">{t('doctor.dashboard.ui.appointmentsDone')}</p>
              </div>
              <div className="w-32">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-teal-600 transition-all duration-600" style={{ width: `${appointmentProgress}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{t('doctor.dashboard.ui.finishEstimate', { time: finishEstimate })}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative mb-6 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0A1628] to-teal-600 p-7 shadow-2xl">
        <div className="absolute inset-0 bg-teal-500/10 animate-pulse-slow" />
        {loading ? (
          <div className="relative">
            <Skeleton className="h-40 w-full rounded-2xl bg-white/10" />
          </div>
        ) : featuredAppointment ? (
          <div className="relative flex items-center justify-between gap-6">
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  ● {activeConsultation ? t('doctor.dashboard.hero.live') : t('doctor.dashboard.hero.next')}
                </span>
              </div>
              <h2 className="mb-2 text-[22px] font-bold text-white">
                {featuredAppointment.patientName}
              </h2>
              <div className="mb-3 flex flex-wrap items-center gap-4 text-[13px] text-white/70">
                <span>
                  {[featuredAppointment.patientAgeGender, featuredAppointment.bloodType, featuredAppointment.insuranceName]
                    .filter(Boolean)
                    .join(' · ') || appointmentTypeLabel(t, featuredAppointment.type)}
                </span>
                <span className="text-teal-300">
                  ❤️ {featuredAppointment.conditions[0] ?? renderComplaint(featuredAppointment.chiefComplaint, t('doctor.dashboard.ui.noChiefComplaint'))}
                </span>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {featuredAppointment.allergies.slice(0, 1).map((allergy) => (
                  <span key={allergy} className="rounded bg-amber-500 px-2 py-1 text-[10px] font-bold text-white">
                    ⚠️ {allergy}
                  </span>
                ))}
                <span className="rounded bg-blue-800/50 px-2 py-1 text-[10px] font-bold text-blue-300">
                  💊{' '}
                  {t('doctor.dashboard.ui.activeMedications', {
                    count: featuredAppointment.medications.length,
                    value: formatLocaleDigits(featuredAppointment.medications.length, uiLang),
                  })}
                </span>
                <span className="rounded bg-slate-600 px-2 py-1 text-[10px] text-white/60">
                  📋{' '}
                  {featuredAppointment.lastVisitAt
                    ? t('doctor.dashboard.ui.lastVisit', { time: formatRelativeTime(t, featuredAppointment.lastVisitAt) })
                    : t('doctor.dashboard.ui.totalVisits', {
                        count: featuredAppointment.visitCount,
                        value: formatLocaleDigits(featuredAppointment.visitCount, uiLang),
                      })}
                </span>
              </div>
              <div className="text-white">
                <p className="mb-1 text-xs text-white/60" data-testid="hero-start">{featuredStartLine}</p>
                <p className="font-mono text-2xl font-bold" data-testid="hero-timing" aria-live="off">
                  {featuredTimingText}
                </p>
                {activeConsultation && featuredTiming?.kind === 'elapsed' ? (
                  <p className="mt-1 text-[11px] text-white/50">{t('doctor.dashboard.hero.elapsedNote')}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate(`/doctor/appointments/${featuredAppointment.id}`)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-[15px] font-bold text-[#0A1628] shadow-xl transition-all hover:scale-105 hover:bg-slate-50"
              >
                <PlayCircle className="h-5 w-5" aria-hidden="true" />
                <span>{t('doctor.dashboard.ui.openWorkspace')}</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/appointments/${featuredAppointment.id}`)}
                  className="flex-1 rounded-lg bg-white/20 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/30"
                >
                  📋 {t('doctor.dashboard.ui.soapNotes')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/prescribe?patient=${featuredAppointment.patientId}&appointment=${featuredAppointment.id}`)}
                  className="flex-1 rounded-lg bg-white/20 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/30"
                >
                  💊 {t('doctor.dashboard.ui.prescribe')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/lab-orders/new?patient=${featuredAppointment.patientId}&appointment=${featuredAppointment.id}`)}
                  className="flex-1 rounded-lg bg-white/20 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/30"
                >
                  🔬 {t('doctor.dashboard.ui.orderLab')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white">
            <Clock className="mx-auto h-8 w-8 text-white/60" />
            <p className="mt-3 font-semibold">{t('doctor.dashboard.noUpcomingTitle')}</p>
            <p className="mt-2 text-sm text-white/70">{t('doctor.dashboard.noUpcomingBody')}</p>
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const color = cardColorClasses[card.color as keyof typeof cardColorClasses];

          const cardTarget = CARD_TARGETS[card.id];
          // QA-185: cards that open a page are real buttons (keyboard and screen readers).
          const CardElement = cardTarget ? 'button' : 'div';
          return (
          <CardElement
            key={card.id}
            {...(cardTarget ? { type: 'button' as const, onClick: () => navigate(cardTarget) } : {})}
            data-testid={`metric-${card.id}`}
            className={`w-full rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-md transition-all ${
              card.critical ? 'animate-pulse ring-2 ring-red-500' : ''
            } ${cardTarget ? 'cursor-pointer hover:scale-[1.015] hover:shadow-xl' : ''}`}
          >
            <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${color.bg}`}>
              <Icon className={`h-6 w-6 ${color.icon}`} aria-hidden="true" />
            </span>
            {loading ? (
              <Skeleton className="mt-4 h-8 w-24" />
            ) : (
              <>
                <span className={`mb-1 block font-mono text-2xl font-bold ${color.text}`}>{card.value}</span>
                <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">{card.label}</span>
                <span className="block text-[11px] text-slate-500">{card.sub}</span>
                {'progress' in card && card.progress !== undefined ? (
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-slate-100">
                    <span className={`block h-full rounded-full ${color.bar} transition-all duration-600`} style={{ width: `${card.progress}%` }} />
                  </span>
                ) : null}
                {'extraSub' in card && card.extraSub ? (
                  <span className="mt-1 block text-[11px] font-medium text-emerald-600">{card.extraSub}</span>
                ) : null}
              </>
            )}
          </CardElement>
          );
        })}
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-md">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-slate-900">{t('doctor.dashboard.ui.schedule.title')}</h2>
            <p className="text-[13px] text-slate-400">
              {new Date().toLocaleDateString(
                locale,
                dtOpts({ weekday: 'long', day: 'numeric', month: 'long', timeZone: CLINIC_TIME_ZONE })
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[13px] font-bold text-teal-600">
              {t('doctor.dashboard.ui.schedule.complete', {
                done: formatLocaleDigits(completedTodayAppointments, uiLang),
                total: formatLocaleDigits(todayAppointments, uiLang),
              })}
            </span>
            <button type="button" onClick={() => navigate('/doctor/today')} className="text-xs font-medium text-teal-600 hover:underline">
              {t('doctor.dashboard.ui.schedule.viewFull')}
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : todaySchedule.length > 0 ? (
            todaySchedule.map((appointment) => (
              <div
                key={appointment.id}
                // QA-185: the row opens the appointment; reachable with the keyboard too.
                role="link"
                tabIndex={0}
                aria-label={t('doctor.dashboard.ui.schedule.openAppointment', { name: appointment.patientName })}
                onClick={() => navigate(`/doctor/appointments/${appointment.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/doctor/appointments/${appointment.id}`);
                  }
                }}
                className={`group cursor-pointer px-5 py-4 transition-colors hover:bg-slate-50 ${
                  appointment.status === 'in_progress' ? 'bg-teal-50' : criticalResult?.patientId === appointment.patientId ? 'bg-red-50' : ''
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
                    <div className="w-20 shrink-0 text-end">
                      <p className="font-mono text-[13px] font-bold text-slate-700">{formatDoctorTime(appointment.scheduledAt)}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {appointment.durationMinutes
                          ? t('doctor.dashboard.ui.schedule.minutes', { value: formatLocaleDigits(appointment.durationMinutes, uiLang) })
                          : formatShortDate(appointment.scheduledAt)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{appointment.patientName}</p>
                      <p className="truncate text-xs text-slate-400">
                        {renderComplaint(appointment.chiefComplaint, appointmentTypeLabel(t, appointment.type))}
                      </p>
                    </div>
                    {appointment.insuranceName ? (
                      <div className="hidden rounded bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 xl:block">
                        {appointment.insuranceName}
                      </div>
                    ) : null}
                    {appointment.flags.length > 0 ? (
                      <div className="hidden max-w-[260px] truncate text-xs xl:block">
                        {appointment.flags.join(' · ')}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    {appointment.status === 'completed' ? (
                      <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-[10px] font-semibold text-emerald-700">✅ {t('doctor.dashboard.ui.schedule.status.completed')}</span>
                    ) : null}
                    {appointment.status === 'in_progress' ? (
                      <>
                        <span className="flex items-center gap-1 rounded-lg bg-teal-100 px-3 py-1.5 text-[10px] font-semibold text-teal-700">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-600" />
                          <span>{t('doctor.dashboard.ui.schedule.status.inProgress')}</span>
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/doctor/appointments/${appointment.id}`);
                          }}
                          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                        >
                          {t('doctor.dashboard.ui.schedule.open')}
                        </button>
                      </>
                    ) : null}
                    {['scheduled', 'confirmed'].includes(appointment.status) ? (
                      <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-[10px] font-semibold text-blue-700">⏰ {t('doctor.dashboard.ui.schedule.status.upcoming')}</span>
                    ) : null}
                    {criticalResult?.patientId === appointment.patientId ? (
                      <span className="rounded-lg bg-red-100 px-3 py-1.5 text-[10px] font-semibold text-red-700">🔴 {t('doctor.dashboard.labs.severity.critical')}</span>
                    ) : null}
                    <ChevronRight className="h-5 w-5 text-slate-400 transition-colors group-hover:text-teal-600 rtl:rotate-180" aria-hidden="true" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              <p className="font-semibold text-gray-900">{t('doctor.dashboard.ui.schedule.title')}</p>
              <p className="mt-2 text-sm text-gray-600">{t('doctor.dashboard.ui.schedule.empty')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 border-s-4 border-s-red-600 bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                <FlaskConical className="h-3 w-3 text-red-500" />
              </div>
              <h3 className="text-sm font-bold">{t('doctor.dashboard.ui.labsTitle')}</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-xs font-bold text-red-500">
                {t('doctor.dashboard.labs.counts', {
                  critical: formatLocaleDigits(criticalCount, uiLang),
                  recent: formatLocaleDigits(recentLabResults.length, uiLang),
                })}
              </span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : recentLabResults.length > 0 ? (
              recentLabResults.map((result) => {
                const needsReview = result.labOrderStatus !== 'reviewed';
                const urgent = result.severity === 'critical' && needsReview;
                return (
                  <div
                    key={result.id}
                    className={`px-4 py-3.5 transition-colors hover:bg-slate-50 ${urgent ? 'bg-red-50' : ''}`}
                    data-testid="dashboard-lab-result"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {result.severity === 'critical' ? (
                          <AlertTriangle className={`h-4 w-4 text-red-600 ${urgent ? 'animate-pulse' : ''}`} aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`mb-0.5 text-sm font-bold ${urgent ? 'text-red-900' : 'text-slate-900'}`}>{result.patientName}</p>
                        <p className={`mb-0.5 font-mono text-[13px] font-bold ${result.severity === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>
                          {result.testName} — <bdi>{[result.resultValue, result.resultUnit].filter(Boolean).join(' ')}</bdi>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          <span
                            className={`me-2 rounded px-1.5 py-0.5 font-semibold ${
                              result.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t(`doctor.dashboard.labs.severity.${result.severity}`)}
                          </span>
                          {t('doctor.dashboard.critical.reference')}: <bdi>{result.referenceRange ?? '—'}</bdi> ·{' '}
                          {formatRelativeTime(t, result.resultedAt)}
                        </p>
                      </div>
                      {needsReview ? (
                        <button
                          type="button"
                          onClick={() => openLabOrder(result.labOrderId)}
                          className={`rounded px-3 py-1.5 text-[11px] font-bold text-white transition-colors ${
                            urgent ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          {t('doctor.dashboard.labs.review')}
                        </button>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
                          {t('shared.labOrderStatus.reviewed', { defaultValue: 'Reviewed' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-5 text-sm text-slate-500">{t('doctor.dashboard.ui.labsEmpty')}</div>
            )}
          </div>
          <div className="border-t border-slate-200 px-6 py-3">
            <button type="button" onClick={() => navigate('/doctor/lab-orders')} className="text-xs font-medium text-teal-600 hover:underline">
              {t('doctor.dashboard.labs.viewAll')}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <h3 className="text-sm font-bold">{t('doctor.dashboard.ui.messages.title')}</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-blue-500">
                {t('doctor.dashboard.ui.messages.unread', { value: formatLocaleDigits(data?.unreadMessages ?? 0, uiLang) })}
              </span>
              <button type="button" onClick={() => navigate('/doctor/messages')} className="text-xs font-medium text-teal-600 hover:underline">
                {t('doctor.dashboard.ui.messages.viewAll')}
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : recentMessages.length > 0 ? (
              recentMessages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => navigate(`/doctor/messages/${message.conversationId}`)}
                  className="w-full cursor-pointer px-4 py-3.5 text-start transition-colors hover:bg-blue-50/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-xs font-bold text-white">
                        {message.patientName
                          .split(/\s+/)
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      {!message.readAt ? <div className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-blue-500" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-[13px] font-bold text-slate-900">{message.patientName}</p>
                      <p className="mb-1 truncate text-xs text-slate-500">{message.body}</p>
                      <p className="font-mono text-[10px] text-slate-400">{formatRelativeTime(t, message.sentAt)}</p>
                    </div>
                    <span className="rounded bg-teal-600 px-2 py-1 text-[10px] font-semibold text-white">{t('doctor.dashboard.ui.messages.reply')}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-5 text-sm text-slate-500">{t('doctor.dashboard.ui.messages.empty')}</div>
            )}
          </div>
        </div>
      </div>

      {/* QA-182: this card used to show three fixed sentences dressed up as AI insights
          ("Pattern", "Interaction: <first allergy>", "Next step: prepare plan for ...") with no AI
          behind them. A doctor could read an allergy as a drug interaction warning, so it is now
          an honest "Coming soon" card. */}
      <div
        className="mb-6 rounded-2xl border border-slate-200 border-s-4 border-s-indigo-600 bg-white p-6 shadow-md"
        data-testid="ai-insights-coming-soon"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50">
            <Sparkles className="h-4 w-4 text-violet-600" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">{t('doctor.dashboard.aiInsights.title')}</p>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {t('doctor.dashboard.aiInsights.badge')}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{t('doctor.dashboard.aiInsights.body')}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('doctor.dashboard.ui.quick.title')}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const color = cardColorClasses[action.color as keyof typeof cardColorClasses];
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:scale-105 hover:shadow-md ${
                  quickActionColors[action.color as keyof typeof quickActionColors]
                }`}
              >
                <Icon className={`h-6 w-6 ${color.icon}`} aria-hidden="true" />
                <span className="text-center text-xs font-bold text-slate-700">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
