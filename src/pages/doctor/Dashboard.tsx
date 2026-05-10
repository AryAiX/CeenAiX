import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Calendar,
  CalendarCheck,
  CheckCircle2,
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
  TrendingUp,
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
  formatLocaleDigits,
  formatRelativeTime,
  resolveLocale,
} from '../../lib/i18n-ui';

const getDisplayName = (fullName: string | null | undefined, firstName: string | null | undefined) => {
  if (fullName?.trim()) return fullName.trim();
  if (firstName?.trim()) return firstName.trim();
  return '';
};

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const locale = resolveLocale(uiLang);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(uiLang, options);
  const { doctorProfile, profile, user } = useAuth();
  const { data, loading, error } = useDoctorDashboard(user?.id);

  const displayName = getDisplayName(profile?.full_name, profile?.first_name) || t('shared.doctor');
  const doctorName = /^dr\.?/i.test(displayName) ? displayName : uiLang.startsWith('ar') ? `د. ${displayName}` : `Dr. ${displayName}`;
  const doctorLocation = profile?.city?.trim() || (uiLang.startsWith('ar') ? 'دبي، الإمارات' : 'Dubai, UAE');
  const doctorFacility = profile?.address?.trim() || doctorLocation;
  const doctorLicense = doctorProfile?.license_number?.trim() || (uiLang.startsWith('ar') ? 'الترخيص قيد الإضافة' : 'License pending');
  const isArabic = uiLang.startsWith('ar');
  const hour = new Date().getHours();
  const greetingEn = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingAr = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const localCopy = useMemo(
    () =>
      isArabic
        ? {
            criticalTitle: 'نتيجة حرجة',
            unacknowledged: 'غير معتمد',
            criticalHigh: 'حرج جداً',
            noCriticalStatus: 'كل النتائج الحرجة تمت مراجعتها',
            noCriticalBody: 'لا توجد نتائج مختبر حرجة غير معتمدة لهذا الطبيب حالياً.',
            reference: 'المرجع',
            openLabResults: 'فتح طلبات المختبر',
            acknowledgeResult: 'اعتماد النتيجة',
            unavailable: 'غير متاح حالياً',
            greeting: greetingAr,
            daySummary: 'تم إنجاز {{done}} من {{total}} مواعيد',
            finishEstimate: 'الانتهاء المتوقع: {{time}}',
            activeConsultation: 'استشارة جارية',
            nextPatient: 'المريض التالي',
            openWorkspace: 'فتح مساحة الاستشارة',
            soapNotes: 'ملاحظات SOAP',
            prescribe: 'وصفة',
            orderLab: 'طلب مختبر',
            totalPatients: 'إجمالي المرضى',
            todayAppts: 'مواعيد اليوم',
            pendingReviews: 'مراجعات معلقة',
            unreadMessages: 'رسائل غير مقروءة',
            criticalLabs: 'نتائج حرجة',
            dhaStatus: 'حالة ترخيص DHA',
            completed: 'مكتمل',
            remaining: 'متبقٍ',
            inProgress: 'قيد التنفيذ',
            todaySchedule: 'مواعيد اليوم',
            todayScheduleSub: 'المواعيد المكتملة والجارية والقادمة لهذا اليوم.',
            viewFullSchedule: 'عرض الجدول الكامل',
            openAppointment: 'فتح الموعد',
            noTodaySchedule: 'ستظهر مواعيد اليوم هنا عند دخول الحجوزات في جدول الطبيب.',
            recentLabs: 'نتائج المختبر',
            viewAllLabs: 'عرض كل النتائج',
            noLabs: 'لا توجد نتائج مختبر حديثة لهذا الطبيب بعد.',
            recentMessages: 'الرسائل',
            viewAllMessages: 'عرض الكل',
            noMessages: 'لا توجد رسائل حديثة بعد.',
            aiTitle: 'رؤى سريرية بالذكاء الاصطناعي',
            aiBody: 'سيتم تفعيل الرؤى السريرية للطبيب بعد اكتمال مساحة الذكاء الاصطناعي الطبية.',
            comingSoon: 'قريباً',
            noChiefComplaint: 'استشارة مجدولة',
            statusOk: 'صالح',
            statusPending: 'قيد المراجعة',
          }
        : {
            criticalTitle: 'CRITICAL RESULT',
            unacknowledged: 'Unacknowledged',
            criticalHigh: 'Critical high',
            noCriticalStatus: 'All critical results reviewed',
            noCriticalBody: 'There are no unacknowledged critical lab results for this doctor right now.',
            reference: 'Reference',
            openLabResults: 'Open lab orders',
            acknowledgeResult: 'Acknowledge result',
            unavailable: 'Not available yet',
            greeting: greetingEn,
            daySummary: '{{done}} of {{total}} appointments done',
            finishEstimate: 'Finish est.: {{time}}',
            activeConsultation: 'Live Consultation',
            nextPatient: 'Next Patient',
            openWorkspace: 'Open Consultation Workspace',
            soapNotes: 'SOAP Notes',
            prescribe: 'Prescribe',
            orderLab: 'Order Lab',
            totalPatients: 'Total Patients',
            todayAppts: "Today's Appointments",
            pendingReviews: 'Pending Reviews',
            unreadMessages: 'Unread Messages',
            criticalLabs: 'Critical Labs',
            dhaStatus: 'DHA License Status',
            completed: 'completed',
            remaining: 'remaining',
            inProgress: 'in progress',
            todaySchedule: "Today's Appointments",
            todayScheduleSub: 'Completed, active, and upcoming visits for today.',
            viewFullSchedule: 'View full schedule',
            openAppointment: 'Open',
            noTodaySchedule: "Today's schedule will appear here once bookings land on the doctor's calendar.",
            recentLabs: 'Lab Results',
            viewAllLabs: 'View all lab results',
            noLabs: 'No recent lab results for this doctor yet.',
            recentMessages: 'Messages',
            viewAllMessages: 'View all',
            noMessages: 'No recent messages yet.',
            aiTitle: 'AI Clinical Insights',
            aiBody: 'Doctor-facing clinical AI insights will be enabled after the clinical workspace is finalized.',
            comingSoon: 'Coming soon',
            noChiefComplaint: 'Scheduled consultation',
            statusOk: 'Valid',
            statusPending: 'Pending',
          },
    [isArabic, greetingAr, greetingEn]
  );
  const completedTodayAppointments = data?.completedTodayAppointments ?? 0;
  const todayAppointments = data?.todayAppointments ?? 0;
  const remainingTodayAppointments = data?.remainingTodayAppointments ?? 0;
  const inProgressAppointments = data?.inProgressAppointments ?? 0;
  const activeConsultation = data?.activeConsultation ?? null;
  const nextAppointment = data?.nextAppointment ?? null;
  const featuredAppointment = activeConsultation ?? nextAppointment;
  const todaySchedule = data?.todaySchedule ?? [];
  const criticalResult = data?.criticalResults[0] ?? null;
  const recentLabResults = data?.recentLabResults ?? [];
  const recentMessages = data?.recentMessages ?? [];
  const appointmentProgress = todayAppointments > 0 ? Math.round((completedTodayAppointments / todayAppointments) * 100) : 0;
  const metricCards = [
    {
      icon: CalendarCheck,
      label: 'Appointments Today',
      value: formatLocaleDigits(todayAppointments, uiLang),
      sub: `${formatLocaleDigits(completedTodayAppointments, uiLang)} done · ${formatLocaleDigits(inProgressAppointments, uiLang)} in progress · ${formatLocaleDigits(remainingTodayAppointments, uiLang)} remaining`,
      color: 'teal',
      progress: appointmentProgress,
    },
    {
      icon: PenLine,
      label: 'Prescriptions Written',
      value: formatLocaleDigits(data?.prescriptionsToday ?? 0, uiLang),
      sub: 'Today · live from prescriptions',
      color: 'purple',
      badge: (data?.pendingReviews ?? 0) > 0 ? 'Review' : undefined,
    },
    {
      icon: FlaskConical,
      label: 'Lab Orders Today',
      value: formatLocaleDigits(data?.labOrdersToday ?? 0, uiLang),
      sub: `${formatLocaleDigits(data?.criticalResults.length ?? 0, uiLang)} critical pending · ${formatLocaleDigits(recentLabResults.length, uiLang)} recent results`,
      color: 'indigo',
      critical: (data?.criticalResults.length ?? 0) > 0,
    },
    {
      icon: MessageSquare,
      label: 'Unread Messages',
      value: formatLocaleDigits(data?.unreadMessages ?? 0, uiLang),
      sub: `${formatLocaleDigits(recentMessages.length, uiLang)} recent patient threads`,
      color: 'blue',
    },
    {
      icon: CircleDollarSign,
      label: 'Revenue Today',
      value: data?.estimatedRevenueToday !== null && data?.estimatedRevenueToday !== undefined
        ? `AED ${formatLocaleDigits(data.estimatedRevenueToday, uiLang)}`
        : 'AED --',
      sub: doctorProfile?.consultation_fee
        ? `AED ${formatLocaleDigits(doctorProfile.consultation_fee, uiLang)} per booked visit`
        : 'Add consultation fee to estimate',
      color: 'emerald',
      progress: appointmentProgress,
    },
    {
      icon: Users,
      label: localCopy.dhaStatus,
      value: doctorProfile?.dha_license_verified ? localCopy.statusOk : localCopy.statusPending,
      sub: doctorLicense,
      color: doctorProfile?.dha_license_verified ? 'emerald' : 'slate',
      extraSub: doctorProfile?.dha_license_verified ? 'Verified provider profile' : 'Verification pending',
    },
  ];
  const quickActions = [
    { icon: ClipboardList, label: 'Write Prescription', color: 'purple', onClick: () => navigate('/doctor/prescribe') },
    { icon: TestTube, label: 'Order Lab Test', color: 'indigo', badge: (data?.criticalResults.length ?? 0) > 0 ? `${data?.criticalResults.length} critical` : undefined, onClick: () => navigate('/doctor/labs') },
    { icon: Calendar, label: 'Block Time Off', color: 'slate', onClick: () => navigate('/doctor/schedule') },
    { icon: Send, label: 'Send Referral', color: 'teal', onClick: () => navigate('/doctor/messages') },
    { icon: FileText, label: 'Write Certificate', color: 'blue', onClick: () => navigate('/doctor/patients') },
    { icon: Bot, label: 'Ask Clinical AI', color: 'indigo', onClick: () => navigate('/ai-chat') },
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
  const formatDurationFromStart = (value: string, fallbackMinutes: number | null) => {
    const startDate = new Date(value);
    const startedAt = startDate.getTime();
    const now = new Date();
    const isSameLocalDay =
      startDate.getFullYear() === now.getFullYear() &&
      startDate.getMonth() === now.getMonth() &&
      startDate.getDate() === now.getDate();

    if (!Number.isNaN(startedAt) && Date.now() >= startedAt && isSameLocalDay) {
      const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return fallbackMinutes ? `${fallbackMinutes} min` : '--';
  };
  const lastTodayAppointment = todaySchedule.length > 0 ? todaySchedule[todaySchedule.length - 1] : null;
  // Avoid the hard-coded "~4:00 PM" fallback that misled doctors when their
  // schedule was empty for the day. Render an em-dash instead.
  const finishEstimate = lastTodayAppointment ? `~${formatDoctorTime(lastTodayAppointment.scheduledAt)}` : '—';
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
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('doctor.dashboard.loadError')}
        </div>
      ) : null}

      {criticalResult ? (
        <div className="mb-6 w-full animate-pulse-ring rounded-xl border-2 border-red-600 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="shrink-0">
                <AlertTriangle className="h-8 w-8 animate-pulse text-red-600" />
              </div>
              <div className="flex-1">
                <div className="mb-2">
                  <h3 className="mb-1 text-sm font-bold text-red-700">🔴 {localCopy.criticalTitle}</h3>
                  <p className="font-mono text-xs text-red-500">
                    {localCopy.unacknowledged}: {formatRelativeTime(t, criticalResult.resultedAt)}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-red-900">
                    {criticalResult.patientName} — {criticalResult.testName}
                  </h4>
                  <div className="flex items-baseline space-x-3">
                    <span className="font-mono text-3xl font-bold text-red-700">
                      {[criticalResult.resultValue, criticalResult.resultUnit].filter(Boolean).join(' ')}
                    </span>
                    <span className="text-xs text-slate-600">
                      {localCopy.reference}: {criticalResult.referenceRange ?? '-'}
                    </span>
                    <span className="rounded bg-red-600 px-2 py-1 text-[11px] font-bold text-white">
                      CRITICAL HIGH ↑↑
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Resulted {formatDoctorTime(criticalResult.resultedAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col space-y-2">
              <button
                type="button"
                onClick={() => navigate('/doctor/labs')}
                className="whitespace-nowrap rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                🏥 View Lab Result
              </button>
              <button
                type="button"
                disabled
                title={localCopy.unavailable}
                className="whitespace-nowrap rounded-lg bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-700 opacity-60"
              >
                ✅ {localCopy.acknowledgeResult}
              </button>
            </div>
          </div>
          <div className="mt-3 border-t border-red-200 pt-3">
            <p className="text-[11px] italic text-red-500">
              ⚠️ UAE DHA requires acknowledgment of critical lab values within 1 hour.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-[28px] font-bold text-slate-900">
            {localCopy.greeting}, {doctorName}. 🏥
          </h1>
          <p className="text-sm text-slate-400">
            {new Date().toLocaleDateString(locale, dtOpts({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} · {doctorFacility}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          {loading ? (
            <Skeleton className="h-12 w-52" />
          ) : (
            <div className="flex items-center space-x-6">
              <div>
                <p className="font-mono text-xl font-bold text-teal-600">
                  {formatLocaleDigits(completedTodayAppointments, uiLang)} of {formatLocaleDigits(todayAppointments, uiLang)}
                </p>
                <p className="text-xs text-slate-500">appointments done</p>
              </div>
              <div className="w-32">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-teal-600 transition-all duration-600" style={{ width: `${appointmentProgress}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{localCopy.finishEstimate.replace('{{time}}', finishEstimate)}</p>
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
              <div className="mb-3 flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  ● {activeConsultation ? 'LIVE CONSULTATION' : 'NEXT PATIENT'}
                </span>
              </div>
              <h2 className="mb-2 text-[22px] font-bold text-white">
                {featuredAppointment.patientName}
              </h2>
              <div className="mb-3 flex items-center space-x-4 text-[13px] text-white/70">
                <span>
                  {[featuredAppointment.patientAgeGender, featuredAppointment.bloodType, featuredAppointment.insuranceName]
                    .filter(Boolean)
                    .join(' · ') || appointmentTypeLabel(t, featuredAppointment.type)}
                </span>
                <span className="text-teal-300">
                  ❤️ {featuredAppointment.conditions[0] ?? renderComplaint(featuredAppointment.chiefComplaint, localCopy.noChiefComplaint)}
                </span>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {featuredAppointment.allergies.slice(0, 1).map((allergy) => (
                  <span key={allergy} className="rounded bg-amber-500 px-2 py-1 text-[10px] font-bold text-white">
                    ⚠️ {allergy}
                  </span>
                ))}
                <span className="rounded bg-blue-800/50 px-2 py-1 text-[10px] font-bold text-blue-300">
                  💊 {formatLocaleDigits(featuredAppointment.medications.length, uiLang)} active medications
                </span>
                <span className="rounded bg-slate-600 px-2 py-1 text-[10px] text-white/60">
                  📋 {featuredAppointment.lastVisitAt ? `Last visit: ${formatRelativeTime(t, featuredAppointment.lastVisitAt)}` : `${formatLocaleDigits(featuredAppointment.visitCount, uiLang)} total visits`}
                </span>
              </div>
              <div className="text-white">
                <p className="mb-1 text-xs text-white/40">Session started: {formatDoctorTime(featuredAppointment.scheduledAt)}</p>
                <p className="font-mono text-2xl font-bold">
                  Duration: {formatDurationFromStart(featuredAppointment.scheduledAt, featuredAppointment.durationMinutes)}
                </p>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={() => navigate(`/doctor/appointments/${featuredAppointment.id}`)}
                className="flex items-center justify-center space-x-2 rounded-2xl bg-white px-6 py-4 text-[15px] font-bold text-[#0A1628] shadow-xl transition-all hover:scale-105 hover:bg-slate-50"
              >
                <PlayCircle className="h-5 w-5" />
                <span>{localCopy.openWorkspace}</span>
              </button>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/appointments/${featuredAppointment.id}`)}
                  className="flex-1 rounded-lg bg-white/20 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/30"
                >
                  📋 {localCopy.soapNotes}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/prescribe?patient=${featuredAppointment.patientId}&appointment=${featuredAppointment.id}`)}
                  className="flex-1 rounded-lg bg-white/20 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/30"
                >
                  💊 {localCopy.prescribe}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/lab-orders/new?patient=${featuredAppointment.patientId}&appointment=${featuredAppointment.id}`)}
                  className="flex-1 rounded-lg bg-white/20 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/30"
                >
                  🔬 {localCopy.orderLab}
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

          return (
          <div
            key={card.label}
            className={`cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-all hover:scale-[1.015] hover:shadow-xl ${
              card.critical ? 'animate-pulse ring-2 ring-red-500' : ''
            }`}
            onClick={() => {
              if (card.label === 'Appointments Today') {
                navigate('/doctor/today');
              }
            }}
          >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${color.bg}`}>
              <Icon className={`h-6 w-6 ${color.icon}`} />
            </div>
            {loading ? (
              <Skeleton className="mt-4 h-8 w-24" />
            ) : (
              <>
                <h3 className={`mb-1 font-mono text-2xl font-bold ${color.text}`}>{card.value}</h3>
                <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">{card.label}</p>
                <p className="text-[11px] text-slate-500">{card.sub}</p>
                {'progress' in card && card.progress !== undefined ? (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${color.bar} transition-all duration-600`} style={{ width: `${card.progress}%` }} />
                  </div>
                ) : null}
                {'extraSub' in card && card.extraSub ? (
                  <p className="mt-1 text-[11px] font-medium text-emerald-600">{card.extraSub}</p>
                ) : null}
                {'badge' in card && card.badge ? <p className="mt-1 text-[11px] font-medium text-amber-600">{card.badge}</p> : null}
              </>
            )}
          </div>
          );
        })}
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-md">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-slate-900">{localCopy.todaySchedule}</h2>
            <p className="text-[13px] text-slate-400">
              {new Date().toLocaleDateString(locale, dtOpts({ weekday: 'long', day: 'numeric', month: 'long' }))}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="font-mono text-[13px] font-bold text-teal-600">
              {formatLocaleDigits(completedTodayAppointments, uiLang)}/{formatLocaleDigits(todayAppointments, uiLang)} complete
            </span>
            <button type="button" onClick={() => navigate('/doctor/today')} className="text-xs font-medium text-teal-600 hover:underline">
              View Full Schedule →
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
                onClick={() => navigate(`/doctor/appointments/${appointment.id}`)}
                className={`group cursor-pointer px-5 py-4 transition-colors hover:bg-slate-50 ${
                  appointment.status === 'in_progress' ? 'bg-teal-50' : criticalResult?.patientId === appointment.patientId ? 'bg-red-50' : ''
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-center space-x-4 lg:space-x-6">
                    <div className="w-20 shrink-0 text-right">
                      <p className="font-mono text-[13px] font-bold text-slate-700">{formatDoctorTime(appointment.scheduledAt)}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {appointment.durationMinutes ? `${formatLocaleDigits(appointment.durationMinutes, uiLang)} min` : formatShortDate(appointment.scheduledAt)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-slate-900">{appointment.patientName}</h3>
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
                  <div className="flex items-center justify-end space-x-3">
                    {appointment.status === 'completed' ? (
                      <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-[10px] font-semibold text-emerald-700">✅ Completed</span>
                    ) : null}
                    {appointment.status === 'in_progress' ? (
                      <>
                        <span className="flex items-center space-x-1 rounded-lg bg-teal-100 px-3 py-1.5 text-[10px] font-semibold text-teal-700">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-600" />
                          <span>In Progress</span>
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/doctor/appointments/${appointment.id}`);
                          }}
                          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                        >
                          ▶ Open
                        </button>
                      </>
                    ) : null}
                    {['scheduled', 'confirmed'].includes(appointment.status) ? (
                      <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-[10px] font-semibold text-blue-700">⏰ Upcoming</span>
                    ) : null}
                    {criticalResult?.patientId === appointment.patientId ? (
                      <span className="rounded-lg bg-red-100 px-3 py-1.5 text-[10px] font-semibold text-red-700">🔴 Critical</span>
                    ) : null}
                    <ChevronRight className="h-5 w-5 text-slate-400 transition-colors group-hover:text-teal-600" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              <p className="font-semibold text-gray-900">{localCopy.todaySchedule}</p>
              <p className="mt-2 text-sm text-gray-600">{localCopy.noTodaySchedule}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 border-l-4 border-l-red-600 bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                <FlaskConical className="h-3 w-3 text-red-500" />
              </div>
              <h3 className="text-sm font-bold">{localCopy.recentLabs}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-xs font-bold text-red-500">
                {formatLocaleDigits(data?.criticalResults.length ?? 0, uiLang)} critical · {formatLocaleDigits(recentLabResults.length, uiLang)} recent
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
              recentLabResults.map((result) => (
                <div
                  key={result.id}
                  className={`px-4 py-3.5 transition-colors hover:bg-slate-50 ${
                    result.labOrderStatus === 'resulted' ? 'bg-red-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 shrink-0">
                      {result.labOrderStatus === 'resulted' ? (
                        <AlertTriangle className="h-4 w-4 animate-pulse text-red-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`mb-0.5 text-sm font-bold ${result.labOrderStatus === 'resulted' ? 'text-red-900' : 'text-slate-900'}`}>
                        {result.patientName}
                      </p>
                      <p className={`mb-0.5 font-mono text-[13px] font-bold ${result.labOrderStatus === 'resulted' ? 'text-red-700' : 'text-slate-600'}`}>
                        {result.testName} — {[result.resultValue, result.resultUnit].filter(Boolean).join(' ')}
                      </p>
                      <p className={`text-[11px] ${result.labOrderStatus === 'resulted' ? 'text-red-500' : 'text-emerald-600'}`}>
                        Ref: {result.referenceRange ?? '-'} · {formatRelativeTime(t, result.resultedAt)}
                      </p>
                    </div>
                    {result.labOrderStatus === 'resulted' ? (
                      <button
                        type="button"
                        onClick={() => navigate('/doctor/labs')}
                        className="rounded bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-red-700"
                      >
                        {t('doctor.patients.acknowledge', { defaultValue: 'Acknowledge' })}
                      </button>
                    ) : (
                      <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
                        ✅ {t('shared.labOrderStatus.reviewed', { defaultValue: 'Reviewed' })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-5 text-sm text-slate-500">{localCopy.noLabs}</div>
            )}
          </div>
          <div className="border-t border-slate-200 px-6 py-3">
            <button type="button" onClick={() => navigate('/doctor/labs')} className="text-xs font-medium text-teal-600 hover:underline">
              View All Lab Results →
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold">{localCopy.recentMessages}</h3>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-blue-500">{formatLocaleDigits(data?.unreadMessages ?? 0, uiLang)} unread</span>
              <button type="button" onClick={() => navigate('/doctor/messages')} className="text-xs font-medium text-teal-600 hover:underline">
                View All →
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
                  className="w-full cursor-pointer px-4 py-3.5 text-left transition-colors hover:bg-blue-50/30"
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-xs font-bold text-white">
                        {message.patientName
                          .split(/\s+/)
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      {!message.readAt ? <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-blue-500" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-[13px] font-bold text-slate-900">{message.patientName}</p>
                      <p className="mb-1 truncate text-xs text-slate-500">{message.body}</p>
                      <p className="font-mono text-[10px] text-slate-400">{formatRelativeTime(t, message.sentAt)}</p>
                    </div>
                    <span className="rounded bg-teal-600 px-2 py-1 text-[10px] font-semibold text-white">Reply</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-5 text-sm text-slate-500">{localCopy.noMessages}</div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 border-l-4 border-l-indigo-600 bg-white p-6 shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                <Sparkles className="h-4 w-4 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{localCopy.aiTitle}</p>
                <p className="mt-2 text-sm text-slate-600">{localCopy.aiBody}</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-3">
                    <TrendingUp className="mb-2 h-4 w-4 text-indigo-600" />
                    <p className="text-[11px] font-bold text-slate-900">Pattern</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                      {recentLabResults[0]?.testName ?? 'Live lab trends'} ready for review.
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3">
                    <Activity className="mb-2 h-4 w-4 text-amber-500" />
                    <p className="text-[11px] font-bold text-amber-900">Interaction</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-amber-700">
                      {featuredAppointment?.allergies[0] ?? 'No active allergy warning'}.
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
                    <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-500" />
                    <p className="text-[11px] font-bold text-emerald-900">Next Step</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-emerald-700">
                      {featuredAppointment ? `Prepare plan for ${featuredAppointment.patientName}.` : 'Select a patient.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  title={localCopy.unavailable}
                  className="mt-4 rounded-xl bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700 opacity-60 disabled:cursor-not-allowed"
                >
                  {localCopy.comingSoon}
                </button>
              </div>
            </div>
      </div>

      <div className="mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">QUICK ACTIONS</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const color = cardColorClasses[action.color as keyof typeof cardColorClasses];
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`flex flex-col items-center justify-center space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:scale-105 hover:shadow-md ${
                  quickActionColors[action.color as keyof typeof quickActionColors]
                }`}
              >
                <Icon className={`h-6 w-6 ${color.icon}`} />
                <span className="text-center text-xs font-bold text-slate-700">{action.label}</span>
                {action.badge ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-600">
                    {action.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
