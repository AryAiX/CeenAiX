import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Calendar,
  Clock,
  Copy,
  Pill,
  MessageSquare,
  Bot,
  ChevronRight,
  FlaskConical,
  Heart,
  MapPin,
  Minus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Users,
  X,
} from 'lucide-react';
import { MedicationNameDisplay } from '../../components/MedicationNameDisplay';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../lib/auth-context';
import { useMedicationLogs, usePatientDashboard } from '../../hooks';
import {
  dateTimeFormatWithNumerals,
  formatLocaleDecimal,
  formatLocaleDigits,
  formatRelativeTime,
  resolveLocale,
} from '../../lib/i18n-ui';
import { formatMedicationDetailLine } from '../../lib/medication-display';
import { DEFAULT_CARE_CONVERSATION_SUBJECT, getMessagePreviewText } from '../../lib/messaging';

const getDisplayName = (fullName: string | null | undefined, firstName: string | null | undefined, email?: string) => {
  if (firstName?.trim()) {
    return firstName.trim();
  }

  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0] ?? fullName.trim();
  }

  if (email) {
    return email.split('@')[0];
  }

  return '';
};

const AI_HEALTH_TIPS_EN = [
  'Your recent readings have improved compared with last week. Keep your medication and diet routine steady to stay on track for your target.',
  'Staying hydrated helps regulate blood pressure. Aim for at least 8 glasses of water throughout the day.',
  'Even a 20-minute walk after meals can meaningfully lower your post-meal blood sugar levels over time.',
  'Consistent sleep of 7–8 hours per night supports both blood pressure control and metabolic health.',
  'Reducing sodium intake to under 2,300 mg per day can help bring systolic blood pressure down by up to 5 mmHg.',
  'Stress hormones directly raise blood sugar. Short breathing exercises or mindfulness can help manage daily spikes.',
];

const AI_HEALTH_TIPS_AR = [
  'تحسنت قراءاتك الأخيرة مقارنة بالأسبوع الماضي. حافظ على روتين الدواء والغذاء للوصول إلى الهدف في الأشهر المقبلة.',
  'يساعد شرب كميات كافية من الماء في تنظيم ضغط الدم. احرص على تناول 8 أكواب على مدار اليوم.',
  'المشي لمدة 20 دقيقة بعد الوجبات يقلل بشكل ملحوظ من مستوى السكر في الدم بعد الأكل.',
  'النوم المنتظم من 7 إلى 8 ساعات يوميًا يدعم صحة ضغط الدم والتمثيل الغذائي.',
  'تقليل تناول الصوديوم إلى أقل من 2300 ملغ يوميًا قد يخفض الضغط الانقباضي بمقدار 5 ملم زئبق.',
  'هرمونات التوتر ترفع نسبة السكر في الدم مباشرة. تمارين التنفس أو التأمل تساعد في التحكم بالارتفاعات اليومية.',
];

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('common');
  const locale = resolveLocale(i18n.language);
  const dtOpts = useCallback(
    (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(i18n.language, options),
    [i18n.language]
  );
  const { profile, user } = useAuth();
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = usePatientDashboard(user?.id, i18n.language);

  const {
    takenItemIds,
    error: medicationLogError,
    markTaken: markMedicationTaken,
  } = useMedicationLogs(user?.id);

  const handleMarkTaken = async (medicationId: string) => {
    await markMedicationTaken(medicationId);
  };

  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [bpModalOpen, setBpModalOpen] = useState(false);
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');

  const [aiTipIndex, setAiTipIndex] = useState(0);

  const handleRefreshTip = () => {
    setAiTipIndex((prev) => {
      const tips = isArabic ? AI_HEALTH_TIPS_AR : AI_HEALTH_TIPS_EN;
      let next = Math.floor(Math.random() * tips.length);
      if (next === prev && tips.length > 1) next = (prev + 1) % tips.length;
      return next;
    });
  };

  const handleBpSave = () => {
    setBpModalOpen(false);
    setBpSystolic('');
    setBpDiastolic('');
  };

  const displayName =
    getDisplayName(profile?.full_name, profile?.first_name, user?.email) || t('patient.dashboard.greetingFallback');
  const nextAppointment = dashboardData?.nextAppointment ?? null;
  const medications = dashboardData?.medications ?? [];
  const displayedMedications = medications.slice(0, 3);
  const recentMessages = dashboardData?.recentMessages ?? [];
  const careTeam = dashboardData?.careTeam ?? [];
  const insurance = dashboardData?.insurance ?? null;
  const latestHba1c = dashboardData?.latestHba1c ?? null;
  const previousHba1c = dashboardData?.previousHba1c ?? null;
  const hba1cHistory = dashboardData?.hba1cHistory ?? [];
  const latestBloodPressure = dashboardData?.latestBloodPressure ?? null;
  const bloodPressureHistory = dashboardData?.bloodPressureHistory ?? [];
  const labsSummary = dashboardData?.labsSummary ?? {
    latestResultCount: 0,
    latestStatus: 'none' as const,
    latestRecordedAt: null,
  };
  const isArabic = i18n.language.startsWith('ar');
  const hour = new Date().getHours();
  const greetingEn = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingAr = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء الخير';
  const localCopy = useMemo(
    () =>
      isArabic
        ? {
            greeting: greetingAr,
            dateLocation: 'دبي، الإمارات',
            healthScore: 'مؤشر الصحة',
            adherence: 'الالتزام',
            adherenceSub: 'هذا الشهر',
            scoreState: 'جيد',
            hba1c: 'HbA1c',
            bloodPressure: 'ضغط الدم',
            lastLabs: 'آخر الفحوصات',
            medicationsLabel: 'الأدوية',
            prediabetic: 'ما قبل السكري',
            attention: 'تحتاج مراجعة',
            improving: 'يتحسن',
            controlled: 'مسيطر عليه',
            stable: 'مستقر',
            normal: 'طبيعي',
            testsCount: '6 فحوصات',
            todayBadge: 'اليوم',
            mainMedicationsTitle: 'أدوية اليوم',
            takenOf: 'تم أخذ {{taken}} من {{total}}',
            askMore: 'اسأل أكثر',
            quickActions: 'إجراءات سريعة',
            nextDays: '{{count}} أيام',
            insuranceActive: 'نشط',
            insuranceTitle: 'التأمين',
            annualLimitUsed: 'المستخدم من الحد السنوي',
            remaining: 'متبقٍ',
            viewFullDetails: 'عرض التفاصيل الكاملة ←',
            messagesTitle: 'الرسائل',
            newMessages: '{{count}} جديدة',
            newMessage: '+ رسالة جديدة',
            aiTipTitle: 'نصيحة صحية من الذكاء الاصطناعي',
            details: 'التفاصيل',
            directions: 'الاتجاهات',
            bookApptShort: 'حجز موعد',
            messageShort: 'رسالة',
            labsShort: 'نتائج المختبر',
            aiAssistantShort: 'مساعد AI',
            noRecent: 'لا نشاط حديث بعد',
            noMessages: 'لا رسائل جديدة',
            medicationsTitle: 'أدوية اليوم',
            recentTitle: 'النشاط الحديث',
            shortcutsTitle: 'اختصارات سريعة',
            careTeamTitle: 'فريق الرعاية',
            careTeamCount: '{{count}} أطباء',
            nextLabel: 'التالي',
            lastLabel: 'آخر زيارة',
            noCareTeam: 'سيظهر أعضاء فريق الرعاية بعد مواعيدك ورسائلك مع الأطباء.',
            locationPending: 'سيظهر الموقع داخل تفاصيل الموعد',
            unavailable: 'غير متاح حالياً',
          }
        : {
            greeting: greetingEn,
            dateLocation: 'Dubai, UAE',
            healthScore: 'Health Score',
            adherence: 'Adherence',
            adherenceSub: 'This month',
            scoreState: 'Good',
            hba1c: 'HbA1c Trend',
            bloodPressure: 'Blood Pressure Log',
            lastLabs: 'Last Labs',
            medicationsLabel: 'Medications',
            prediabetic: 'Pre-diabetic',
            attention: 'Needs review',
            improving: 'Improving',
            controlled: 'Controlled',
            stable: 'Stable',
            normal: 'Normal',
            testsCount: '6 tests',
            todayBadge: 'Today',
            mainMedicationsTitle: "Today's Medications",
            takenOf: '{{taken}} of {{total}} taken',
            askMore: 'Ask More',
            quickActions: 'Quick Actions',
            nextDays: '{{count}} days',
            insuranceActive: 'Active',
            insuranceTitle: 'Insurance',
            annualLimitUsed: 'Annual Limit Used',
            remaining: 'remaining',
            viewFullDetails: 'View full details →',
            messagesTitle: 'Messages',
            newMessages: '{{count}} new',
            newMessage: '+ New Message',
            aiTipTitle: 'AI Health Tip',
            details: 'Details',
            directions: 'Directions',
            bookApptShort: 'Book Appt',
            messageShort: 'Message',
            labsShort: 'Lab Results',
            aiAssistantShort: 'AI Assistant',
            noRecent: 'No recent activity yet',
            noMessages: 'No new messages',
            medicationsTitle: "Today's Medications",
            recentTitle: 'Recent Activity',
            shortcutsTitle: 'Quick Shortcuts',
            careTeamTitle: 'My Care Team',
            careTeamCount: '{{count}} doctors',
            nextLabel: 'Next',
            lastLabel: 'Last',
            noCareTeam: 'Your care team will appear here once you have doctor appointments or message threads.',
            locationPending: 'Location available in appointment details',
            unavailable: 'Not available yet',
          },
    [isArabic, greetingAr, greetingEn]
  );
  const todayLabel = new Date().toLocaleDateString(
    locale,
    dtOpts({
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );
  const healthScoreValue = dashboardData?.healthScore ?? (profile?.profile_completed ? 78 : 64);
  const adherenceValue = dashboardData?.adherencePercentage ?? (medications.length > 0 ? 87 : 72);
  const takenCount = medications.filter((medication) => medication.isDispensed || takenItemIds.has(medication.id)).length;
  const insuranceProgress =
    insurance?.annualLimit && insurance.annualLimit > 0
      ? Math.min(100, Math.round(((insurance.annualLimitUsed ?? 0) / insurance.annualLimit) * 100))
      : 0;
  const latestHba1cDelta =
    latestHba1c && previousHba1c ? Number((latestHba1c.value - previousHba1c.value).toFixed(1)) : null;
  const nextAppointmentCountdown = nextAppointment
    ? Math.max(
        0,
        Math.ceil((new Date(nextAppointment.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : 0;
  const quickActions = useMemo(
    () => [
      {
        icon: Calendar,
        label: localCopy.bookApptShort,
        colorClass: 'text-teal-600 bg-teal-50 hover:bg-teal-100',
        action: () => navigate('/patient/appointments'),
      },
      {
        icon: MessageSquare,
        label: localCopy.messageShort,
        colorClass: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
        action: () => navigate('/patient/messages'),
      },
      {
        icon: FlaskConical,
        label: localCopy.labsShort,
        colorClass: 'text-violet-600 bg-violet-50 hover:bg-violet-100',
        action: () => navigate('/patient/lab-results'),
      },
      {
        icon: Bot,
        label: localCopy.aiAssistantShort,
        colorClass: 'text-slate-600 bg-slate-50 hover:bg-slate-100',
        action: () => navigate('/patient/ai-chat'),
      },
    ],
    [localCopy.aiAssistantShort, localCopy.bookApptShort, localCopy.labsShort, localCopy.messageShort, navigate]
  );
  const statsCards = useMemo(
    () => [
      {
        icon: Activity,
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
        label: localCopy.hba1c,
        value: latestHba1c ? `${formatLocaleDecimal(latestHba1c.value, i18n.language)}%` : 'N/A',
        badge: latestHba1c
          ? latestHba1c.value >= 6.5
            ? localCopy.prediabetic
            : localCopy.normal
          : localCopy.normal,
        badgeColor: 'bg-amber-50 text-amber-700',
        trend: latestHba1cDelta !== null && latestHba1cDelta <= 0 ? ('down' as const) : ('up' as const),
        trendLabel:
          latestHba1cDelta !== null
            ? `${latestHba1cDelta > 0 ? '+' : ''}${formatLocaleDecimal(Math.abs(latestHba1cDelta), i18n.language)}% ${
                isArabic ? 'عن السابق' : 'vs last'
              }`
            : isArabic
              ? 'لا توجد مقارنة سابقة'
              : 'No prior comparison',
      },
      {
        icon: Heart,
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-500',
        label: localCopy.bloodPressure,
        value: latestBloodPressure
          ? `${formatLocaleDigits(latestBloodPressure.systolic, i18n.language)}/${formatLocaleDigits(
              latestBloodPressure.diastolic,
              i18n.language
            )}`
          : 'N/A',
        badge:
          latestBloodPressure &&
          latestBloodPressure.systolic <= 130 &&
          latestBloodPressure.diastolic <= 85
            ? localCopy.controlled
            : localCopy.attention,
        badgeColor: 'bg-emerald-50 text-emerald-700',
        trend: 'stable' as const,
        trendLabel: localCopy.stable,
      },
      {
        icon: FlaskConical,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        label: localCopy.lastLabs,
        value:
          labsSummary.latestStatus === 'attention'
            ? localCopy.attention
            : labsSummary.latestStatus === 'normal'
              ? localCopy.normal
              : 'N/A',
        badge:
          labsSummary.latestResultCount > 0
            ? isArabic
              ? `${formatLocaleDigits(labsSummary.latestResultCount, i18n.language)} فحوصات`
              : `${formatLocaleDigits(labsSummary.latestResultCount, i18n.language)} tests`
            : localCopy.testsCount,
        badgeColor: 'bg-blue-50 text-blue-700',
        trend: 'stable' as const,
        trendLabel: labsSummary.latestRecordedAt
          ? new Date(labsSummary.latestRecordedAt).toLocaleDateString(
              locale,
              dtOpts({ month: 'short', day: 'numeric', year: 'numeric' })
            )
          : (isArabic ? 'لا توجد نتائج بعد' : 'No results yet'),
      },
      {
        icon: Pill,
        iconBg: 'bg-teal-50',
        iconColor: 'text-teal-600',
        label: localCopy.medicationsLabel,
        // Show "0" instead of "0/1" when the patient has zero medications;
        // forcing a denominator of 1 made an empty list look like a missed
        // dose tracker.
        value:
          medications.length > 0
            ? `${formatLocaleDigits(takenCount, i18n.language)}/${formatLocaleDigits(medications.length, i18n.language)}`
            : formatLocaleDigits(0, i18n.language),
        badge: localCopy.todayBadge,
        badgeColor: 'bg-teal-50 text-teal-700',
        trend: 'up' as const,
        trendLabel: isArabic ? 'تم أخذها' : 'taken',
      },
    ],
    [
      dtOpts,
      i18n.language,
      isArabic,
      labsSummary.latestRecordedAt,
      labsSummary.latestResultCount,
      labsSummary.latestStatus,
      latestBloodPressure,
      latestHba1c,
      latestHba1cDelta,
      localCopy,
      locale,
      medications.length,
      takenCount,
    ]
  );
  const aiTip = (isArabic ? AI_HEALTH_TIPS_AR : AI_HEALTH_TIPS_EN)[aiTipIndex] ?? '';
  const hba1cChartPoints = hba1cHistory.slice(-6).map((point) => point.value);
  const hba1cLinePath = buildLinePath(hba1cChartPoints, 600, 160, 5.5, 8.5);
  const hba1cAreaPath = buildAreaPath(hba1cChartPoints, 600, 160, 5.5, 8.5);
  const systolicChartPath = buildLinePath(
    bloodPressureHistory.slice(-7).map((point) => point.systolic),
    600,
    150,
    100,
    150
  );
  const diastolicChartPath = buildLinePath(
    bloodPressureHistory.slice(-7).map((point) => point.diastolic),
    600,
    150,
    60,
    100
  );
  const formatCompactDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, dtOpts({ month: 'short', day: 'numeric', year: 'numeric' }));
  const genericConversationSubjects = new Set([DEFAULT_CARE_CONVERSATION_SUBJECT.toLowerCase(), 'محادثة رعاية']);

  return (
    <>
      {dashboardError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          <p>{t('patient.dashboard.loadError')}</p>
          <p className="mt-1 text-xs text-amber-900/80">{dashboardError}</p>
          <button
            type="button"
            onClick={() => void refetchDashboard()}
            className="mt-2 font-semibold text-amber-900 underline"
          >
            {t('shared.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : null}

      {medicationLogError ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {t('patient.prescriptions.medicationLogError', {
            defaultValue: 'We could not save that medication update: {{message}}',
            message: medicationLogError,
          })}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{localCopy.greeting},</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900">{displayName}</h1>
          <p className="mt-1 text-xs text-slate-400">
            {todayLabel} · {profile?.city?.trim() || localCopy.dateLocation}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-100 bg-white px-5 py-3 text-center shadow-sm">
            <p className="text-xs font-medium tracking-wide text-slate-400">{localCopy.healthScore}</p>
            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold text-teal-600">{formatLocaleDigits(healthScoreValue, i18n.language)}</span>
              <span className="text-sm text-slate-400">/100</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-emerald-600">{localCopy.scoreState}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-5 py-3 text-center shadow-sm">
            <p className="text-xs font-medium tracking-wide text-slate-400">{localCopy.adherence}</p>
            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold text-slate-800">{formatLocaleDigits(adherenceValue, i18n.language)}</span>
              <span className="text-sm text-slate-400">%</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-emerald-600">{localCopy.adherenceSub}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statsCards.map((card) => (
          <StatCard
            key={card.label}
            icon={<card.icon className={`h-5 w-5 ${card.iconColor}`} />}
            iconBg={card.iconBg}
            label={card.label}
            value={card.value}
            badge={card.badge}
            badgeColor={card.badgeColor}
            trend={card.trend}
            trendLabel={card.trendLabel}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
                  <Pill className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{localCopy.mainMedicationsTitle}</h2>
                  <p className="text-xs text-slate-400">
                    {localCopy.takenOf
                      .replace('{{taken}}', formatLocaleDigits(takenCount, i18n.language))
                      .replace('{{total}}', formatLocaleDigits(medications.length, i18n.language))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all duration-500"
                      style={{
                        width: `${medications.length > 0 ? (takenCount / medications.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-teal-600">
                    {formatLocaleDigits(
                      medications.length > 0 ? Math.round((takenCount / medications.length) * 100) : 0,
                      i18n.language
                    )}
                    %
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/patient/prescriptions')}
                  className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  {t('patient.dashboard.viewAll')} <ChevronRight className="h-3 w-3 rtl:rotate-180" />
                </button>
              </div>
            </div>

            <div className="min-h-[12.5rem] divide-y divide-slate-50">
              {dashboardLoading ? (
                <>
                  <div className="px-6 py-4"><Skeleton className="h-14 w-full rounded-xl" /></div>
                  <div className="px-6 py-4"><Skeleton className="h-14 w-full rounded-xl" /></div>
                  <div className="px-6 py-4"><Skeleton className="h-14 w-full rounded-xl" /></div>
                </>
              ) : medications.length > 0 ? (
                displayedMedications.map((medication) => {
                  const isTaken = medication.isDispensed || takenItemIds.has(medication.id);
                  return (
                    <div key={medication.id} className="flex items-center gap-3 px-6 py-4">
                      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${isTaken ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">
                          <MedicationNameDisplay
                            canonicalName={medication.medicationName}
                            localizedName={medication.medicationNameAr}
                            language={i18n.language ?? 'en'}
                            primaryClassName="inline"
                            secondaryClassName="inline ml-1 text-xs font-normal text-slate-500"
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatMedicationDetailLine(t, i18n.language, {
                            dosage: medication.dosage,
                            frequency: medication.frequency,
                            duration: medication.duration,
                            detail: medication.detail,
                            frequencyFromVocab: medication.frequencyFromVocab ?? undefined,
                            durationFromVocab: medication.durationFromVocab ?? undefined,
                          })}
                        </p>
                      </div>
                      {isTaken ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          </div>
                          {isArabic ? 'تم التناول' : 'Taken'}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleMarkTaken(medication.id)}
                          className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {isArabic ? 'تأكيد' : 'Mark Taken'}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="px-6 py-8 text-center">
                  <Pill className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  <p className="font-semibold text-slate-900">{t('patient.dashboard.noMedTitle')}</p>
                  <p className="mt-1 text-sm text-slate-500">{t('patient.dashboard.noMedBody')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">{localCopy.hba1c}</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isArabic ? 'آخر 6 أشهر · الهدف: أقل من 6.5%' : 'Last 6 months · Target: <6.5%'}
                </p>
              </div>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {latestHba1cDelta !== null && latestHba1cDelta <= 0 ? `${localCopy.improving} ↓` : localCopy.stable}
              </span>
            </div>
            <div className="h-44 rounded-xl bg-gradient-to-b from-teal-50 to-white p-4">
              <svg viewBox="0 0 600 160" className="h-full w-full">
                {hba1cAreaPath ? <path d={hba1cAreaPath} fill="url(#hba1c-fill)" /> : null}
                {hba1cLinePath ? <path d={hba1cLinePath} fill="none" stroke="#0D9488" strokeWidth="3" /> : null}
                <defs>
                  <linearGradient id="hba1c-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="20" y1="76" x2="580" y2="76" stroke="#f59e0b" strokeDasharray="4 4" />
              </svg>
            </div>
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-xs text-amber-800">
                {latestHba1c
                  ? isArabic
                    ? `آخر قراءة هي ${formatLocaleDecimal(latestHba1c.value, i18n.language)}${latestHba1c.unit ?? '%'}${
                        latestHba1cDelta !== null && latestHba1cDelta <= 0
                          ? ' مع تحسن مقارنة بالقراءة السابقة.'
                          : '.'
                      }`
                    : `Latest reading is ${formatLocaleDecimal(latestHba1c.value, i18n.language)}${
                        latestHba1c.unit ?? '%'
                      }${latestHba1cDelta !== null && latestHba1cDelta <= 0 ? ', improving versus the previous result.' : '.'}`
                  : isArabic
                    ? 'لا توجد نتائج HbA1c كافية حتى الآن لعرض اتجاه تاريخي.'
                    : 'Not enough HbA1c results yet to show a historical trend.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">{localCopy.bloodPressure}</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isArabic ? 'آخر 7 أيام · متابعة منزلية' : 'Last 7 days · home monitoring'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="inline-block h-0.5 w-3 rounded bg-rose-500" />
                  {isArabic ? 'انقباضي' : 'Systolic'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="inline-block h-0.5 w-3 rounded bg-blue-500" />
                  {isArabic ? 'انبساطي' : 'Diastolic'}
                </div>
              </div>
            </div>
            <div className="h-40 rounded-xl bg-slate-50 p-4">
              <svg viewBox="0 0 600 150" className="h-full w-full">
                {systolicChartPath ? <path d={systolicChartPath} fill="none" stroke="#f43f5e" strokeWidth="3" /> : null}
                {diastolicChartPath ? <path d={diastolicChartPath} fill="none" stroke="#3b82f6" strokeWidth="3" /> : null}
                <line x1="20" y1="70" x2="580" y2="70" stroke="#f59e0b" strokeDasharray="4 4" />
              </svg>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
              <span className="text-xs font-semibold text-emerald-600">
                {latestBloodPressure && latestBloodPressure.systolic <= 130 && latestBloodPressure.diastolic <= 85
                  ? isArabic
                    ? 'آخر قراءة ضمن النطاق المتحكم به'
                    : 'Latest reading is within the controlled range'
                  : isArabic
                    ? 'آخر قراءة تحتاج متابعة'
                    : 'Latest reading needs follow-up'}
              </span>
              <button
                type="button"
                onClick={() => setBpModalOpen(true)}
                className="rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-600 transition-colors hover:bg-teal-50"
              >
                {isArabic ? '+ إضافة قراءة' : '+ Add Reading'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
                  <Users className="h-4 w-4 text-slate-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">{localCopy.careTeamTitle}</h2>
              </div>
              <span className="text-xs text-slate-400">
                {localCopy.careTeamCount.replace('{{count}}', formatLocaleDigits(careTeam.length, i18n.language))}
              </span>
            </div>

            {dashboardLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ) : careTeam.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {careTeam.map((member) => (
                  <div
                    key={member.doctorId}
                    className="rounded-xl border border-slate-100 p-4 transition-all hover:border-teal-200 hover:shadow-sm"
                  >
                    <div className="mb-3 flex flex-col items-center text-center">
                      <div className="relative mb-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-teal-600 text-sm font-bold text-white">
                          {member.doctorName
                            .split(' ')
                            .map((part) => part[0] ?? '')
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{member.doctorName}</p>
                      <span className="mt-0.5 text-xs font-medium text-teal-600">
                        {member.specialty ?? t('shared.careVisit')}
                      </span>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {member.doctorCity || localCopy.locationPending}
                      </p>
                    </div>
                    {member.nextAppointmentAt || member.lastAppointmentAt ? (
                      <p className="mb-3 border-t border-slate-50 pt-2 text-center text-xs text-slate-500">
                        {member.nextAppointmentAt ? (
                          <>
                            {localCopy.nextLabel}:{' '}
                            <span className="font-medium text-teal-600">
                              {formatCompactDate(member.nextAppointmentAt)}
                            </span>
                          </>
                        ) : (
                          <>
                            {localCopy.lastLabel}:{' '}
                            <span className="font-medium text-slate-600">
                              {formatCompactDate(member.lastAppointmentAt!)}
                            </span>
                          </>
                        )}
                      </p>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/patient/messages?doctor=${member.doctorId}`)}
                        className="flex items-center justify-center gap-1 rounded-lg bg-teal-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {localCopy.messageShort}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/patient/appointments/book?doctor=${member.doctorId}`)}
                        className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <Calendar className="h-3 w-3" />
                        {localCopy.bookApptShort}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{localCopy.noCareTeam}</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
                  <Calendar className="h-4 w-4 text-teal-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">{t('patient.dashboard.nextAppointment')}</h2>
              </div>
              <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                {localCopy.nextDays.replace('{{count}}', formatLocaleDigits(nextAppointmentCountdown, i18n.language))}
              </span>
            </div>

            {dashboardLoading ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : nextAppointment ? (
              <>
                <div className="mb-4">
                  <p className="text-lg font-bold text-slate-900">
                    {new Date(nextAppointment.scheduledAt).toLocaleDateString(
                      locale,
                      dtOpts({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    )}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-teal-600">
                    <Clock className="mr-1 inline h-3.5 w-3.5 rtl:mr-0 rtl:ml-1" />
                    {new Date(nextAppointment.scheduledAt).toLocaleTimeString(
                      locale,
                      dtOpts({ hour: 'numeric', minute: '2-digit' })
                    )}
                  </p>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-teal-600 text-sm font-bold text-white">
                    {nextAppointment.doctorName
                      .split(' ')
                      .map((part) => part[0] ?? '')
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{nextAppointment.doctorName}</p>
                    <p className="text-xs font-medium text-teal-600">{nextAppointment.specialty ?? t('shared.careVisit')}</p>
                    <p className="text-xs text-slate-400">{nextAppointment.doctorCity || (isArabic ? 'الموقع سيظهر قريباً' : 'Location available in appointment details')}</p>
                  </div>
                </div>

                <div className="mb-4 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {nextAppointment.doctorCity || profile?.city?.trim() || localCopy.dateLocation}
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    {insurance?.isActive
                      ? isArabic
                        ? 'يشمله التأمين'
                        : 'Covered by insurance'
                      : isArabic
                        ? 'قد يتطلب موافقة مسبقة'
                        : 'Coverage requires confirmation'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDirectionsModal(true)}
                    className="rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    {localCopy.directions}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetailsModal(true)}
                    className="rounded-lg bg-teal-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    {localCopy.details}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{t('patient.dashboard.noUpcomingBody')}</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">{localCopy.messagesTitle}</h2>
              </div>
              <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                {localCopy.newMessages.replace(
                  '{{count}}',
                  formatLocaleDigits(dashboardData?.unreadMessagesCount ?? 0, i18n.language)
                )}
              </span>
            </div>

            <div className="mb-4 space-y-2">
              {dashboardLoading ? (
                <>
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </>
              ) : recentMessages.length > 0 ? (
                recentMessages.map((msg) => (
                  (() => {
                    const normalizedSubject = msg.subject?.trim().toLowerCase() ?? '';
                    const messageTitle =
                      !normalizedSubject || genericConversationSubjects.has(normalizedSubject)
                        ? msg.senderName
                        : msg.subject ?? msg.senderName;
                    const messagePreview = getMessagePreviewText(msg.body || '').trim() || localCopy.noMessages;

                    return (
                      <div
                        key={msg.id}
                        className={`cursor-pointer rounded-xl p-3 transition-colors ${
                          !msg.isRead
                            ? 'bg-teal-50 border border-teal-100 hover:bg-teal-100'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => navigate(`/patient/messages/${msg.conversationId}`)}
                      >
                        <div className="mb-0.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!msg.isRead ? (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                            ) : null}
                            <p className={`truncate text-xs ${!msg.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                              {messageTitle}
                            </p>
                          </div>
                          <span className={`ml-2 shrink-0 text-xs ${!msg.isRead ? 'font-semibold text-teal-600' : 'text-slate-400'}`}>
                            {formatRelativeTime(t, msg.sentAt)}
                          </span>
                        </div>
                        <p className={`line-clamp-2 text-xs ${!msg.isRead ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                          {messagePreview}
                        </p>
                      </div>
                    );
                  })()
                ))
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">{localCopy.noMessages}</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/patient/messages')}
              className="w-full rounded-lg border border-teal-200 py-2 text-xs font-semibold text-teal-600 transition-colors hover:bg-teal-50"
            >
              {localCopy.newMessage}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">{localCopy.insuranceTitle}</h2>
              </div>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {insurance?.isActive ? localCopy.insuranceActive : (isArabic ? 'منتهي' : 'Expired')}
              </span>
            </div>

            <div className="mb-4 rounded-xl bg-gradient-to-br from-slate-800 to-teal-700 p-4">
              <p className="text-sm font-bold text-white">
                {insurance?.providerCompany
                  ? insurance.providerCompany.toUpperCase()
                  : (isArabic ? 'لا يوجد مزوّد تأمين' : 'No insurer on file')}
              </p>
              <p className="mt-0.5 text-xs text-teal-200">{insurance?.planName ?? (isArabic ? 'لا توجد خطة مرتبطة' : 'No linked plan yet')}</p>
              <p className="mt-3 text-xs text-white/70">{profile?.full_name ?? user?.email ?? displayName}</p>
              <p className="text-xs text-white/50">{insurance?.policyNumber ?? (isArabic ? 'رقم الوثيقة سيظهر هنا' : 'Policy number will appear here')}</p>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-slate-500">{localCopy.annualLimitUsed}</span>
                <span className="font-semibold text-slate-700">
                  {insurance && insurance.annualLimit !== null
                    ? `AED ${Math.round(insurance.annualLimitUsed ?? 0).toLocaleString(locale)} / ${Math.round(
                        insurance.annualLimit
                      ).toLocaleString(locale)}`
                    : (isArabic ? 'لا توجد بيانات حد سنوي' : 'No annual limit data')}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${insuranceProgress}%` }} />
              </div>
              <p className="mt-1.5 text-xs font-medium text-emerald-600">
                {insurance && insurance.remainingAmount !== null
                  ? `AED ${Math.round(insurance.remainingAmount).toLocaleString(locale)} ${localCopy.remaining}`
                  : (isArabic ? 'لا توجد قيمة متبقية متاحة' : 'No remaining value available')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/patient/insurance')}
              className="w-full text-center text-xs font-semibold text-teal-600 transition-colors hover:text-teal-700"
            >
              {localCopy.viewFullDetails}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">{localCopy.quickActions}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.action}
                  className={`flex flex-col items-center gap-2 rounded-xl py-4 text-xs font-semibold transition-colors ${action.colorClass}`}
                >
                  <action.icon className="h-5 w-5" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                <Bot className="h-4 w-4 text-teal-600" />
              </div>
              <div className="flex-1">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-teal-600">{localCopy.aiTipTitle}</p>
                <p className="text-xs leading-relaxed text-slate-600">{aiTip}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/patient/ai-chat')}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    {localCopy.askMore}
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshTip}
                    title={isArabic ? 'نصيحة أخرى' : 'Another tip'}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showDetailsModal && nextAppointment ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {isArabic ? 'تفاصيل الموعد' : 'Appointment Details'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-teal-600 text-white font-semibold text-lg">
                  {nextAppointment.doctorName.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{nextAppointment.doctorName}</p>
                  <p className="text-sm text-teal-600">{nextAppointment.specialty ?? (isArabic ? 'زيارة رعاية' : 'Care Visit')}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{nextAppointment.doctorCity || (isArabic ? 'الموقع سيظهر قريباً' : 'Location available in appointment details')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-teal-50 border border-teal-100 p-3">
                  <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-1">
                    {isArabic ? 'التاريخ' : 'Date'}
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {new Date(nextAppointment.scheduledAt).toLocaleDateString(locale, dtOpts({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}
                  </p>
                </div>
                <div className="rounded-lg bg-teal-50 border border-teal-100 p-3">
                  <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-1">
                    {isArabic ? 'الوقت' : 'Time'}
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {new Date(nextAppointment.scheduledAt).toLocaleTimeString(locale, dtOpts({ hour: 'numeric', minute: '2-digit' }))}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                  {isArabic ? 'نوع الموعد' : 'Appointment Type'}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {nextAppointment.type === 'virtual'
                    ? (isArabic ? '🎥 استشارة عن بُعد' : '🎥 Virtual Teleconsult')
                    : (isArabic ? '🏥 حضوري' : '🏥 In-Person Visit')}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">
                  {isArabic ? 'التأمين' : 'Insurance'}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {insurance?.isActive
                    ? (isArabic ? '✅ يشمله التأمين' : '✅ Covered by insurance')
                    : (isArabic ? '⚠️ قد يتطلب موافقة مسبقة' : '⚠️ Coverage requires confirmation')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
              >
                {isArabic ? 'إغلاق' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => { navigate('/patient/appointments'); setShowDetailsModal(false); }}
                className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {isArabic ? 'عرض كل المواعيد' : 'View All Appointments'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      {showDirectionsModal && nextAppointment ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => { setShowDirectionsModal(false); setAddressCopied(false); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {isArabic ? 'الاتجاهات' : 'Get Directions'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => { setShowDirectionsModal(false); setAddressCopied(false); }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <MapPin className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{nextAppointment.doctorName}</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {nextAppointment.doctorCity || profile?.city?.trim() || 'Dubai, UAE'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  {isArabic ? 'اختر تطبيق الملاحة' : 'Choose your navigation app'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      name: 'Google Maps',
                      icon: <svg viewBox="0 0 24 24" className="w-6 h-6"><path fill="#4285F4" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>,
                      onClick: () => {
                        const loc = nextAppointment.doctorCity || profile?.city?.trim() || 'Dubai, UAE';
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`, '_blank', 'noopener,noreferrer');
                      },
                    },
                    {
                      name: 'Waze',
                      icon: <svg viewBox="0 0 24 24" className="w-6 h-6"><path fill="#33CCFF" d="M20.54 6.63C19.08 3.24 15.79 1 12.06 1 6.56 1 2.06 5.5 2.06 11c0 2.12.67 4.08 1.8 5.69L2 22l5.5-1.73A9.94 9.94 0 0 0 12.06 21c5.5 0 9.94-4.5 9.94-10 0-1.61-.39-3.13-1.46-4.37z" /></svg>,
                      onClick: () => {
                        const loc = nextAppointment.doctorCity || profile?.city?.trim() || 'Dubai, UAE';
                        window.open(`https://waze.com/ul?q=${encodeURIComponent(loc)}`, '_blank', 'noopener,noreferrer');
                      },
                    },
                    {
                      name: 'Apple Maps',
                      icon: <svg viewBox="0 0 24 24" className="w-6 h-6"><path fill="#000000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>,
                      onClick: () => {
                        const loc = nextAppointment.doctorCity || profile?.city?.trim() || 'Dubai, UAE';
                        window.open(`https://maps.apple.com/?q=${encodeURIComponent(loc)}`, '_blank', 'noopener,noreferrer');
                      },
                    },
                    {
                      name: addressCopied ? '✓ Copied!' : 'Copy Address',
                      icon: <Copy className="w-6 h-6 text-slate-600" />,
                      onClick: () => {
                        const loc = nextAppointment.doctorCity || profile?.city?.trim() || 'Dubai, UAE';
                        navigator.clipboard.writeText(loc).then(() => {
                          setAddressCopied(true);
                          window.setTimeout(() => setAddressCopied(false), 2000);
                        });
                      },
                    },
                  ].map((app) => (
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

            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => { setShowDirectionsModal(false); setAddressCopied(false); }}
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-sm"
              >
                {isArabic ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      {bpModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setBpModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                  <Heart className="h-4 w-4 text-rose-500" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isArabic ? 'إضافة قراءة ضغط الدم' : 'Add Blood Pressure Reading'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setBpModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {isArabic ? 'الضغط الانقباضي (mmHg)' : 'Systolic (mmHg)'}
                </label>
                <input
                  type="number"
                  min={60}
                  max={250}
                  placeholder={isArabic ? 'مثال: 120' : 'e.g. 120'}
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {isArabic ? 'الضغط الانبساطي (mmHg)' : 'Diastolic (mmHg)'}
                </label>
                <input
                  type="number"
                  min={40}
                  max={150}
                  placeholder={isArabic ? 'مثال: 80' : 'e.g. 80'}
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setBpModalOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleBpSave}
                disabled={!bpSystolic || !bpDiastolic}
                className="flex-1 rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isArabic ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

function StatCard({
  icon,
  iconBg,
  label,
  value,
  badge,
  badgeColor,
  trend,
  trendLabel,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  badge: string;
  badgeColor: string;
  trend: 'up' | 'down' | 'stable';
  trendLabel: string;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'down' ? 'text-emerald-600' : trend === 'up' ? 'text-teal-600' : 'text-slate-500';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
        <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${badgeColor}`}>{badge}</span>
      </div>
      <p className="mb-0.5 text-xl font-bold text-slate-900">{value}</p>
      <p className="mb-2 text-xs font-medium text-slate-400">{label}</p>
      <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
        <TrendIcon className="h-3 w-3" />
        {trendLabel}
      </div>
    </div>
  );
}

function buildLinePath(
  values: number[],
  width: number,
  height: number,
  minDomain: number,
  maxDomain: number
) {
  if (values.length === 0) {
    return '';
  }

  const leftPad = 20;
  const rightPad = 20;
  const topPad = 12;
  const bottomPad = 18;
  const drawableWidth = width - leftPad - rightPad;
  const drawableHeight = height - topPad - bottomPad;
  const safeRange = maxDomain - minDomain || 1;

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? leftPad + drawableWidth / 2
          : leftPad + (index / (values.length - 1)) * drawableWidth;
      const normalized = (value - minDomain) / safeRange;
      const y = height - bottomPad - normalized * drawableHeight;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildAreaPath(
  values: number[],
  width: number,
  height: number,
  minDomain: number,
  maxDomain: number
) {
  const linePath = buildLinePath(values, width, height, minDomain, maxDomain);

  if (!linePath) {
    return '';
  }

  const leftPad = 20;
  const rightPad = 20;
  const bottomPad = 18;
  const baselineY = height - bottomPad;
  const lastX = values.length === 1 ? width / 2 : width - rightPad;

  return `${linePath} L${lastX.toFixed(2)} ${baselineY.toFixed(2)} L${leftPad} ${baselineY.toFixed(2)} Z`;
}
