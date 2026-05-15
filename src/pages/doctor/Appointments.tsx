import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Calendar, CalendarCheck, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock, Download, List, MapPin, PlayCircle, Plus, TrendingUp, User, UserX, Video, X } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { useAppointments, useQuery } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import {
  appointmentTypeLabel,
  appointmentStatusLabel,
  dateTimeFormatWithNumerals,
  formatLocaleDigits,
  preVisitStatusLabel,
  resolveLocale,
} from '../../lib/i18n-ui';

type AppointmentViewMode = 'list' | 'calendar';
type AppointmentBodyTab = 'calendar' | 'list' | 'pending' | 'analytics';

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DoctorAppointments: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();
  const uiLang = i18n.language ?? 'en';
  const locale = resolveLocale(uiLang);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(uiLang, options);
  const { user, doctorProfile } = useAuth();
  const {
    data: appointmentsData,
    loading,
    error,
    refetch,
  } = useAppointments({ role: 'doctor', userId: user?.id ?? '' });
  const appointments = useMemo(() => appointmentsData ?? [], [appointmentsData]);
  const isTodayRoute = location.pathname === '/doctor/today';
  const todayDateKey = formatDateKey(new Date());
  const routeAppointments = useMemo(
    () =>
      isTodayRoute
        ? appointments.filter((appointment) => formatDateKey(new Date(appointment.scheduled_at)) === todayDateKey)
        : appointments,
    [appointments, isTodayRoute, todayDateKey]
  );
  const [viewMode, setViewMode] = useState<AppointmentViewMode>('calendar');
  const [activeTab, setActiveTab] = useState<AppointmentBodyTab>('calendar');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [calendarViewType, setCalendarViewType] = useState<'day' | 'week' | 'month'>('week');
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNewApptHint, setShowNewApptHint] = useState<boolean>(false);
  const [exportRange, setExportRange] = useState<'today' | 'week' | 'month'>('today');
  const [exportType, setExportType] = useState<'administrative' | 'personal' | 'billing'>('administrative');
  const [exportSuccess, setExportSuccess] = useState(false);

  const patientIds = useMemo(
    () => Array.from(new Set((routeAppointments ?? []).map((appointment) => appointment.patient_id))),
    [routeAppointments]
  );
  const appointmentIds = useMemo(() => routeAppointments.map((appointment) => appointment.id), [routeAppointments]);

  const { data: patientProfilesData } = useQuery(
    async () => {
      if (patientIds.length === 0) {
        return [];
      }

      const { data, error: patientProfilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', patientIds);

      if (patientProfilesError) throw patientProfilesError;
      return data ?? [];
    },
    [patientIds.join(',')]
  );
  const patientProfiles = useMemo(() => patientProfilesData ?? [], [patientProfilesData]);

  const patientNameById = useMemo(
    () =>
      new Map(
        patientProfiles.map((profile) => [profile.user_id, profile.full_name ?? t('shared.patient')])
      ),
    [patientProfiles, t]
  );
  const { data: preVisitAssessmentData } = useQuery(
    async () => {
      if (appointmentIds.length === 0) {
        return [];
      }

      const { data, error: assessmentsError } = await supabase
        .from('appointment_pre_visit_assessments')
        .select('id, appointment_id, status')
        .in('appointment_id', appointmentIds);

      if (assessmentsError) {
        throw assessmentsError;
      }

      const assessmentIds = (data ?? []).map((assessment) => assessment.id);
      const { data: summaries, error: summariesError } = assessmentIds.length
        ? await supabase
            .from('appointment_pre_visit_summaries')
            .select('assessment_id, summary_text, key_points, risk_flags, pending_questions, generated_at')
            .in('assessment_id', assessmentIds)
        : { data: [], error: null };

      if (summariesError) {
        throw summariesError;
      }

      const summaryByAssessmentId = new Map((summaries ?? []).map((summary) => [summary.assessment_id, summary]));

      return (data ?? []).map((assessment) => ({
        id: assessment.id,
        appointmentId: assessment.appointment_id,
        status: assessment.status,
        summary: summaryByAssessmentId.get(assessment.id) ?? null,
      }));
    },
    [appointmentIds.join(',')]
  );
  const preVisitAssessments = useMemo(
    () => preVisitAssessmentData ?? [],
    [preVisitAssessmentData]
  );
  const preVisitAssessmentByAppointmentId = useMemo(
    () => new Map(preVisitAssessments.map((assessment) => [assessment.appointmentId, assessment])),
    [preVisitAssessments]
  );
  const selectedCalendarDateKey = formatDateKey(selectedCalendarDate);
  const visibleAppointments = useMemo(
    () => {
      if (isTodayRoute) {
        return routeAppointments;
      }

      if (activeTab === 'pending') {
        return routeAppointments.filter((appointment) => ['scheduled', 'confirmed'].includes(appointment.status));
      }

      if (activeTab === 'analytics') {
        return [];
      }

      return viewMode === 'calendar'
        ? routeAppointments.filter(
            (appointment) =>
              formatDateKey(new Date(appointment.scheduled_at)) === selectedCalendarDateKey
          )
        : routeAppointments;
    },
    [activeTab, isTodayRoute, routeAppointments, selectedCalendarDateKey, viewMode]
  );
  const completedTodayCount = useMemo(
    () =>
      routeAppointments.filter((appointment) =>
        ['completed', 'fulfilled', 'finished'].includes((appointment.status ?? '').toLowerCase())
      ).length,
    [routeAppointments]
  );
  const activeTodayCount = useMemo(
    () =>
      routeAppointments.filter((appointment) =>
        ['in_progress', 'checked_in', 'confirmed', 'scheduled'].includes((appointment.status ?? '').toLowerCase())
      ).length,
    [routeAppointments]
  );
  const completedCount = useMemo(
    () => routeAppointments.filter((appointment) => appointment.status === 'completed').length,
    [routeAppointments]
  );
  const cancelledCount = useMemo(
    () => routeAppointments.filter((appointment) => ['cancelled', 'no_show'].includes(appointment.status)).length,
    [routeAppointments]
  );
  const pendingRequestCount = useMemo(
    () => routeAppointments.filter((appointment) => ['scheduled', 'confirmed'].includes(appointment.status)).length,
    [routeAppointments]
  );
  const { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return {
      startOfToday: todayStart,
      endOfToday: todayEnd,
      startOfWeek: weekStart,
      endOfWeek: weekEnd,
      startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }, []);
  const todayAppointmentsForStats = useMemo(
    () =>
      appointments.filter((appointment) => {
        const scheduledAt = new Date(appointment.scheduled_at);
        return scheduledAt >= startOfToday && scheduledAt < endOfToday;
      }),
    [appointments, endOfToday, startOfToday]
  );
  const weekAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const scheduledAt = new Date(appointment.scheduled_at);
        return scheduledAt >= startOfWeek && scheduledAt < endOfWeek;
      }),
    [appointments, endOfWeek, startOfWeek]
  );
  const monthNoShows = useMemo(
    () =>
      appointments.filter((appointment) => {
        const scheduledAt = new Date(appointment.scheduled_at);
        return scheduledAt >= startOfMonth && scheduledAt < endOfMonth && ['no_show', 'cancelled'].includes(appointment.status);
      }).length,
    [appointments, endOfMonth, startOfMonth]
  );
  const todayDone = todayAppointmentsForStats.filter((appointment) => appointment.status === 'completed').length;
  const todayActive = todayAppointmentsForStats.filter((appointment) => ['in_progress', 'checked_in'].includes(appointment.status)).length;
  const todayUpcoming = todayAppointmentsForStats.filter((appointment) => ['scheduled', 'confirmed'].includes(appointment.status)).length;
  const weekDone = weekAppointments.filter((appointment) => appointment.status === 'completed').length;
  const weekRemaining = weekAppointments.filter((appointment) => ['scheduled', 'confirmed', 'checked_in', 'in_progress'].includes(appointment.status)).length;
  const consultationFee = doctorProfile?.consultation_fee ?? 0;
  const weekRevenue = weekDone * consultationFee;
  const todayRemainingRevenue = todayUpcoming * consultationFee;
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        return date;
      }),
    [startOfWeek]
  );
  const weekAppointmentsByDate = useMemo(
    () =>
      weekAppointments.reduce<Map<string, typeof weekAppointments>>((map, appointment) => {
        const key = formatDateKey(new Date(appointment.scheduled_at));
        map.set(key, [...(map.get(key) ?? []), appointment]);
        return map;
      }, new Map()),
    [weekAppointments]
  );
  const appointmentTabs: Array<{ id: AppointmentBodyTab; label: string; icon: typeof CalendarDays }> = [
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'list', label: 'List', icon: List },
    { id: 'pending', label: 'Pending', icon: Bell },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  const handleTabChange = (tab: AppointmentBodyTab) => {
    setActiveTab(tab);
    if (tab === 'calendar') {
      setViewMode('calendar');
    } else if (tab === 'list') {
      setViewMode('list');
    }
  };

  const handleMonthChange = (offset: number) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(nextMonth);
  };

  const exportFilteredAppointments = useMemo(() => {
    if (exportRange === 'today') return appointments.filter((a) => formatDateKey(new Date(a.scheduled_at)) === todayDateKey);
    if (exportRange === 'week') return appointments.filter((a) => { const d = new Date(a.scheduled_at); return d >= startOfWeek && d < endOfWeek; });
    return appointments.filter((a) => { const d = new Date(a.scheduled_at); return d >= startOfMonth && d < endOfMonth; });
  }, [appointments, exportRange, todayDateKey, startOfWeek, endOfWeek, startOfMonth, endOfMonth]);

  const handleExport = () => {
    const rows: string[] = [];
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const esc = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;

    if (exportType === 'administrative') {
      rows.push('Date,Time,Patient Name,Type,Status,Duration (min)');
      for (const a of exportFilteredAppointments) {
        const d = new Date(a.scheduled_at);
        rows.push([fmt(d), fmtTime(d), esc(patientNameById.get(a.patient_id)), esc(a.type), esc(a.status), String(a.duration_minutes)].join(','));
      }
    } else if (exportType === 'personal') {
      rows.push('Date,Time,Patient Name,Type,Status,Duration (min),Reason for Visit,Patient Notes,Pre-Visit Status');
      for (const a of exportFilteredAppointments) {
        const d = new Date(a.scheduled_at);
        const assessment = preVisitAssessmentByAppointmentId.get(a.id);
        rows.push([fmt(d), fmtTime(d), esc(patientNameById.get(a.patient_id)), esc(a.type), esc(a.status), String(a.duration_minutes), esc(a.chief_complaint), esc(a.notes), esc(assessment?.status ?? 'none')].join(','));
      }
    } else {
      rows.push('Date,Patient Name,Status,Consultation Fee (AED),Collected');
      let totalFee = 0;
      let totalCollected = 0;
      for (const a of exportFilteredAppointments) {
        const d = new Date(a.scheduled_at);
        const fee = consultationFee;
        const collected = a.status === 'completed';
        totalFee += fee;
        if (collected) totalCollected += fee;
        rows.push([fmt(d), esc(patientNameById.get(a.patient_id)), esc(a.status), String(fee), collected ? 'Yes' : 'No'].join(','));
      }
      const completedCount = exportFilteredAppointments.filter((a) => a.status === 'completed').length;
      rows.push([',TOTAL,,', String(totalFee), String(completedCount * consultationFee)].join(''));
    }

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ceenaix-appointments-${exportRange}-${exportType}-${todayDateKey}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    window.setTimeout(() => {
      setExportSuccess(false);
      setShowExportModal(false);
    }, 2000);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    setFeedback(null);
    setBusyAppointmentId(appointmentId);

    const { error: cancelError } = await supabase.rpc('cancel_doctor_appointment', {
      p_appointment_id: appointmentId,
    });

    setBusyAppointmentId(null);

    if (cancelError) {
      setFeedback({ type: 'error', message: cancelError.message });
      return;
    }

    setFeedback({ type: 'success', message: t('doctor.appointments.cancelSuccess') });
    refetch();
  };

  return (
    <>
      {!isTodayRoute ? (
        <div className="-mx-6 -mt-5 mb-5 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-slate-900">Appointments</h1>
              <p className="text-[13px] text-slate-400">Al Noor Medical Center — Cardiology Suite</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  title="Select a patient to book an appointment"
                  onClick={() => navigate('/doctor/patients')}
                  onMouseEnter={() => setShowNewApptHint(true)}
                  onMouseLeave={() => setShowNewApptHint(false)}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  New Appointment
                </button>
                {showNewApptHint ? (
                  <div className="absolute top-full mt-1 left-0 z-10 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-md">
                    Select a patient from Patient Records to book
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('pending')}
                className="relative flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-amber-600"
              >
                <Bell className="h-4 w-4" />
                Requests ({formatLocaleDigits(pendingRequestCount, uiLang)})
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-slate-900">Today's Appointments</h1>
          <p className="mt-1 text-sm text-slate-500">Live worklist for completed, active, and upcoming visits today.</p>
        </div>
      )}

      {!isTodayRoute && pendingRequestCount > 0 ? (
        <div className="-mx-6 -mt-5 mb-5 flex flex-col gap-3 border-y-2 border-amber-400 bg-amber-50 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Bell className="h-5 w-5 text-amber-600" />
            <span className="text-[14px] font-bold text-amber-900">
              {formatLocaleDigits(pendingRequestCount, uiLang)} appointment requests need your review
            </span>
            <div className="flex flex-wrap gap-2 lg:ms-4">
              {routeAppointments
                .filter((appointment) => ['scheduled', 'confirmed'].includes(appointment.status))
                .slice(0, 3)
                .map((appointment) => (
                  <span key={appointment.id} className="rounded-full bg-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                    {(patientNameById.get(appointment.patient_id) ?? t('shared.patient')).split(/\s+/)[0]} —{' '}
                    {new Date(appointment.scheduled_at).toLocaleDateString(locale, dtOpts({ month: 'short', day: 'numeric' }))}
                  </span>
                ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleTabChange('pending')}
            className="self-start rounded-lg bg-amber-600 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-amber-700 lg:self-auto"
          >
            Review All Requests →
          </button>
        </div>
      ) : null}

      <div className="space-y-5">
        {!isTodayRoute ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {[
              {
                label: "Today's Appointments",
                value: todayAppointmentsForStats.length,
                sub: `${formatLocaleDigits(todayDone, uiLang)} done · ${formatLocaleDigits(todayActive, uiLang)} active · ${formatLocaleDigits(todayUpcoming, uiLang)} upcoming`,
                icon: CalendarCheck,
                iconClass: 'bg-teal-100 text-teal-600',
                valueClass: 'text-slate-900',
                progress: todayAppointmentsForStats.length > 0 ? (todayDone / todayAppointmentsForStats.length) * 100 : 0,
                onClick: () => navigate('/doctor/today'),
              },
              {
                label: 'This Week',
                value: weekAppointments.length,
                sub: `${formatLocaleDigits(weekDone, uiLang)} done · ${formatLocaleDigits(weekRemaining, uiLang)} remaining`,
                icon: Calendar,
                iconClass: 'bg-blue-100 text-blue-600',
                valueClass: 'text-slate-900',
                onClick: () => handleTabChange('list'),
              },
              {
                label: 'Pending Requests',
                value: pendingRequestCount,
                sub: `${formatLocaleDigits(pendingRequestCount, uiLang)} live from scheduled/confirmed bookings`,
                icon: Bell,
                iconClass: 'bg-amber-100 text-amber-600',
                valueClass: 'text-amber-600',
                urgent: pendingRequestCount > 0,
                onClick: () => handleTabChange('pending'),
              },
              {
                label: 'No-Shows This Month',
                value: monthNoShows,
                sub: `${appointments.length > 0 ? formatLocaleDigits(Math.round((monthNoShows / appointments.length) * 1000) / 10, uiLang) : '0'}% rate · Live status`,
                icon: UserX,
                iconClass: 'bg-red-100 text-red-500',
                valueClass: 'text-red-500',
                onClick: () => handleTabChange('analytics'),
              },
              {
                label: 'Week Revenue',
                value: consultationFee > 0 ? `AED ${formatLocaleDigits(weekRevenue, uiLang)}` : 'AED --',
                sub: consultationFee > 0 ? `AED ${formatLocaleDigits(todayRemainingRevenue, uiLang)} remaining today` : 'Set consultation fee in profile',
                icon: TrendingUp,
                iconClass: 'bg-emerald-100 text-emerald-600',
                valueClass: 'text-emerald-600',
                wide: true,
                onClick: () => navigate('/doctor/earnings'),
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => card.onClick?.()}
                  className={`cursor-pointer rounded-xl border bg-white p-5 text-left transition-transform hover:scale-[1.02] ${
                    card.urgent ? 'animate-pulse border-2 border-amber-200' : 'border-slate-200'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${card.iconClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className={`font-mono font-bold leading-none ${card.wide ? 'text-[24px]' : 'text-[30px]'} ${card.valueClass}`}>
                        {typeof card.value === 'number' ? formatLocaleDigits(card.value, uiLang) : card.value}
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{card.label}</div>
                    </div>
                  </div>
                  <div className="mb-2 text-[11px] text-slate-500">{card.sub}</div>
                  {'progress' in card ? (
                    <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-teal-500" style={{ width: `${card.progress}%` }} />
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-teal-50 p-2 text-teal-600">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scheduled today</p>
                  <p className="text-2xl font-bold text-slate-900">{formatLocaleDigits(routeAppointments.length, uiLang)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed</p>
                  <p className="text-2xl font-bold text-slate-900">{formatLocaleDigits(completedTodayCount, uiLang)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active / upcoming</p>
                  <p className="text-2xl font-bold text-slate-900">{formatLocaleDigits(activeTodayCount, uiLang)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {loading ? (
          <div className="grid gap-6">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t('doctor.appointments.loadError')}
          </div>
        ) : routeAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
            <Calendar className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">
              {isTodayRoute ? 'No appointments today' : t('doctor.appointments.emptyTitle')}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {isTodayRoute
                ? "Today's schedule will appear here once bookings land on the doctor's calendar."
                : t('doctor.appointments.emptyBody')}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {!isTodayRoute ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleMonthChange(-1)}
                      className="rounded-lg p-2 transition-colors hover:bg-slate-100"
                      aria-label={t('doctor.appointments.prevMonth')}
                    >
                      <ChevronLeft className="h-5 w-5 text-slate-400" />
                    </button>
                    <h2 className="text-[16px] font-bold text-slate-800">
                      Week of {startOfWeek.toLocaleDateString(locale, dtOpts({ month: 'short', day: 'numeric' }))} –{' '}
                      {new Date(endOfWeek.getTime() - 1).toLocaleDateString(locale, dtOpts({ month: 'short', day: 'numeric', year: 'numeric' }))}
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleMonthChange(1)}
                      className="rounded-lg p-2 transition-colors hover:bg-slate-100"
                      aria-label={t('doctor.appointments.nextMonth')}
                    >
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarDate(new Date())}
                      className="rounded-lg bg-teal-50 px-3 py-1.5 text-[12px] font-bold text-teal-700"
                    >
                      Today
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto">
                    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => { setCalendarViewType('day'); setViewMode('calendar'); handleTabChange('calendar'); setSelectedCalendarDate(new Date()); }}
                        className={`rounded px-3 py-1.5 text-[12px] font-bold transition-colors ${calendarViewType === 'day' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        📅 Day
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCalendarViewType('week'); setViewMode('calendar'); handleTabChange('calendar'); }}
                        className={`rounded px-3 py-1.5 text-[12px] font-bold transition-colors ${calendarViewType === 'week' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        📆 Week
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCalendarViewType('month'); setViewMode('calendar'); handleTabChange('calendar'); }}
                        className={`rounded px-3 py-1.5 text-[12px] font-bold transition-colors ${calendarViewType === 'month' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        📅 Month
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex overflow-x-auto border-b border-slate-200">
                  {appointmentTabs.map((tab) => {
                    const active = activeTab === tab.id;
                    const labels: Record<AppointmentBodyTab, string> = {
                      calendar: '📅 Calendar',
                      list: '📋 List View',
                      pending: `⏰ Pending (${formatLocaleDigits(pendingRequestCount, uiLang)})`,
                      analytics: '📊 Analytics',
                    };
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabChange(tab.id)}
                        className={`relative whitespace-nowrap px-4 py-3 text-[13px] font-bold transition-colors ${
                          active ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {labels[tab.id]}
                        {active ? <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {!isTodayRoute && activeTab === 'calendar' && calendarViewType === 'week' ? (
              <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid min-w-[980px] grid-cols-7 gap-3">
                  {weekDays.map((date) => {
                    const dateKey = formatDateKey(date);
                    const dayAppointments = weekAppointmentsByDate.get(dateKey) ?? [];
                    const isToday = dateKey === todayDateKey;
                    return (
                      <div
                        key={dateKey}
                        className={`min-h-[360px] rounded-xl border p-3 ${
                          isToday ? 'border-teal-300 bg-teal-50/60' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              {date.toLocaleDateString(locale, dtOpts({ weekday: 'short' }))}
                            </p>
                            <p className="text-lg font-bold text-slate-900">{formatLocaleDigits(date.getDate(), uiLang)}</p>
                          </div>
                          {isToday ? (
                            <span className="rounded-full bg-teal-600 px-2 py-1 text-[10px] font-bold text-white">Today</span>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          {dayAppointments.length > 0 ? (
                            dayAppointments.map((appointment) => (
                              <button
                                key={appointment.id}
                                type="button"
                                onClick={() => navigate(`/doctor/appointments/${appointment.id}`)}
                                className={`w-full rounded-lg border px-3 py-2 text-left transition hover:shadow-sm ${
                                  appointment.status === 'completed'
                                    ? 'border-emerald-200 bg-emerald-50'
                                    : appointment.status === 'in_progress'
                                      ? 'border-teal-200 bg-teal-100'
                                      : (appointment.status as string) === 'checked_in'
                                        ? 'border-blue-200 bg-blue-50'
                                        : 'border-white bg-white'
                                }`}
                              >
                                <p className="font-mono text-[11px] font-bold text-slate-500">
                                  {new Date(appointment.scheduled_at).toLocaleTimeString(locale, dtOpts({ hour: 'numeric', minute: '2-digit' }))}
                                </p>
                                <p className="mt-1 line-clamp-1 text-[12px] font-bold text-slate-900">
                                  {patientNameById.get(appointment.patient_id) ?? t('shared.patient')}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                                  {appointment.chief_complaint ?? appointmentTypeLabel(t, appointment.type)}
                                </p>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <span className="rounded bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                    {appointmentStatusLabel(t, appointment.status)}
                                  </span>
                                  {consultationFee > 0 ? (
                                    <span className="font-mono text-[10px] font-bold text-emerald-600">
                                      AED {formatLocaleDigits(consultationFee, uiLang)}
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-white/60 px-3 py-5 text-center text-[11px] text-slate-400">
                              Available
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {!isTodayRoute && activeTab === 'calendar' && calendarViewType === 'day' ? (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(selectedCalendarDate);
                      prev.setDate(prev.getDate() - 1);
                      setSelectedCalendarDate(prev);
                    }}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous Day
                  </button>
                  <div className="text-center">
                    <p className="text-base font-bold text-slate-800">
                      {selectedCalendarDate.toLocaleDateString(locale, dtOpts({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}
                    </p>
                    {formatDateKey(selectedCalendarDate) === todayDateKey ? (
                      <span className="mt-1 inline-block rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">Today</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Date(selectedCalendarDate);
                      next.setDate(next.getDate() + 1);
                      setSelectedCalendarDate(next);
                    }}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Next Day
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {Array.from({ length: 25 }, (_, i) => {
                    const hour = 8 + Math.floor(i / 2);
                    const minute = i % 2 === 0 ? 0 : 30;
                    if (hour > 20) return null;
                    const slotDate = new Date(selectedCalendarDate);
                    slotDate.setHours(hour, minute, 0, 0);
                    const slotLabel = slotDate.toLocaleTimeString(locale, dtOpts({ hour: 'numeric', minute: '2-digit' }));
                    const slotAppts = routeAppointments.filter((appt) => {
                      const d = new Date(appt.scheduled_at);
                      return (
                        formatDateKey(d) === formatDateKey(selectedCalendarDate) &&
                        d.getHours() === hour &&
                        d.getMinutes() >= minute &&
                        d.getMinutes() < minute + 30
                      );
                    });
                    return (
                      <div key={`${hour}-${minute}`} className="flex gap-3">
                        <div className="w-20 shrink-0 pt-2 text-right font-mono text-[11px] text-slate-400">{slotLabel}</div>
                        <div className="flex-1 border-t border-slate-100 pb-1 pt-1">
                          {slotAppts.length > 0 ? (
                            <div className="space-y-1">
                              {slotAppts.map((appt) => (
                                <button
                                  key={appt.id}
                                  type="button"
                                  onClick={() => navigate(`/doctor/appointments/${appt.id}`)}
                                  className={`w-full rounded-lg border px-3 py-2 text-left transition hover:shadow-sm ${
                                    appt.status === 'completed'
                                      ? 'border-emerald-200 bg-emerald-50'
                                      : appt.status === 'in_progress'
                                        ? 'border-teal-200 bg-teal-100'
                                        : 'border-blue-200 bg-blue-50'
                                  }`}
                                >
                                  <p className="text-[12px] font-bold text-slate-900">
                                    {patientNameById.get(appt.patient_id) ?? t('shared.patient')}
                                  </p>
                                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                                    {appt.chief_complaint ?? appointmentTypeLabel(t, appt.type)}
                                  </p>
                                  <span className="mt-1 inline-block rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                    {appointmentStatusLabel(t, appt.status)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded border border-dashed border-slate-200 px-3 py-1 text-[11px] text-slate-300">
                              Available
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {!isTodayRoute && activeTab === 'calendar' && calendarViewType === 'month' ? (() => {
              const daysInCurrentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
              const firstDayOfCurrentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
              return (
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleMonthChange(-1)}
                      className="rounded-lg p-2 transition-colors hover:bg-slate-100"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-5 w-5 text-slate-400" />
                    </button>
                    <h3 className="text-base font-bold text-slate-800">
                      {currentMonth.toLocaleDateString(locale, dtOpts({ month: 'long', year: 'numeric' }))}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleMonthChange(1)}
                      className="rounded-lg p-2 transition-colors hover:bg-slate-100"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </button>
                  </div>
                  <div className="mb-1 grid grid-cols-7 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDayOfCurrentMonth }, (_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInCurrentMonth }, (_, i) => {
                      const day = i + 1;
                      const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                      const cellKey = formatDateKey(cellDate);
                      const cellCount = appointments.filter((a) => formatDateKey(new Date(a.scheduled_at)) === cellKey).length;
                      const isToday = cellKey === todayDateKey;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setSelectedCalendarDate(cellDate);
                            setCalendarViewType('day');
                          }}
                          className={`relative flex h-16 flex-col items-center rounded-lg p-1.5 text-sm font-semibold transition hover:scale-105 ${
                            isToday ? 'bg-teal-600 text-white hover:bg-teal-700' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{formatLocaleDigits(day, uiLang)}</span>
                          {cellCount > 0 ? (
                            <span className={`mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              isToday ? 'bg-white/30 text-white' : 'bg-teal-100 text-teal-700'
                            }`}>
                              {formatLocaleDigits(cellCount, uiLang)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })() : null}

            {activeTab === 'calendar' && !isTodayRoute ? null : (
              <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {viewMode === 'calendar'
                    ? t('doctor.appointments.headingCal', {
                        date: selectedCalendarDate.toLocaleDateString(
                          locale,
                          dtOpts({
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        ),
                      })
                    : t('doctor.appointments.headingAll')}
                </h3>
                <p className="text-sm text-gray-600">
                  {viewMode === 'calendar' ? t('doctor.appointments.subCal') : t('doctor.appointments.subAll')}
                </p>
              </div>
            </div>

            {activeTab === 'analytics' && !isTodayRoute ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completion rate</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {routeAppointments.length > 0
                      ? `${formatLocaleDigits(Math.round((completedCount / routeAppointments.length) * 100), uiLang)}%`
                      : '0%'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatLocaleDigits(completedCount, uiLang)} completed of {formatLocaleDigits(routeAppointments.length, uiLang)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending workload</p>
                  <p className="mt-3 text-3xl font-bold text-amber-600">
                    {formatLocaleDigits(pendingRequestCount, uiLang)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">Scheduled or confirmed appointments still in the queue.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">No-shows / cancellations</p>
                  <p className="mt-3 text-3xl font-bold text-rose-600">
                    {formatLocaleDigits(cancelledCount, uiLang)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">Live from appointment status values.</p>
                </div>
              </div>
            ) : visibleAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
                <CalendarDays className="mx-auto mb-4 h-10 w-10 text-gray-400" />
                <h3 className="text-xl font-bold text-gray-900">{t('doctor.appointments.noDayTitle')}</h3>
                <p className="mt-2 text-sm text-gray-600">{t('doctor.appointments.noDayBody')}</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {visibleAppointments.map((appointment) => (
                  (() => {
                    const canCancel =
                      ['scheduled', 'confirmed'].includes(appointment.status) &&
                      new Date(appointment.scheduled_at).getTime() > Date.now();
                    const preVisitAssessment = preVisitAssessmentByAppointmentId.get(appointment.id);

                    return (
                      <div
                        key={appointment.id}
                        className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-all duration-200 hover:shadow-xl"
                      >
                        <div
                          className={`p-4 ${
                            appointment.type === 'virtual'
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="shrink-0 rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                                {appointment.type === 'virtual' ? (
                                  <Video className="w-5 h-5 text-white" />
                                ) : (
                                  <MapPin className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-white">
                                  {patientNameById.get(appointment.patient_id) ?? t('shared.patient')}
                                </h3>
                                <p className="text-sm text-white/90">
                                  {appointment.chief_complaint ? (
                                    uiLang.startsWith('ar') ? (
                                      <span dir="ltr" className="block text-start" translate="no">
                                        {appointment.chief_complaint}
                                      </span>
                                    ) : (
                                      appointment.chief_complaint
                                    )
                                  ) : (
                                    t('shared.scheduledConsultation')
                                  )}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-gray-800">
                              {appointmentStatusLabel(t, appointment.status)}
                            </span>
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="grid gap-6 md:grid-cols-3">
                            <div className="flex items-center space-x-3">
                              <div className="rounded-lg bg-blue-100 p-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">{t('doctor.appointments.time')}</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {new Date(appointment.scheduled_at).toLocaleString(
                                    locale,
                                    dtOpts({
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })
                                  )}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="mb-1 text-xs font-medium text-gray-500">{t('doctor.appointments.duration')}</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {t('shared.minutesUnit', {
                                  count: formatLocaleDigits(appointment.duration_minutes, uiLang),
                                })}
                              </p>
                            </div>

                            <div>
                              <p className="mb-1 text-xs font-medium text-gray-500">{t('doctor.appointments.type')}</p>
                              <p className="text-sm font-semibold text-gray-900 capitalize">
                                {appointmentTypeLabel(t, appointment.type)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 md:grid-cols-2">
                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">{t('doctor.appointments.reason')}</p>
                              <p className="mt-2 text-sm text-gray-700">
                                {appointment.chief_complaint ? (
                                  uiLang.startsWith('ar') ? (
                                    <span dir="ltr" className="block text-start" translate="no">
                                      {appointment.chief_complaint}
                                    </span>
                                  ) : (
                                    appointment.chief_complaint
                                  )
                                ) : (
                                  t('doctor.appointments.noReason')
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">{t('doctor.appointments.patientNotes')}</p>
                              <p className="mt-2 text-sm text-gray-700">
                                {appointment.notes ? (
                                  uiLang.startsWith('ar') ? (
                                    <span dir="ltr" className="block text-start" translate="no">
                                      {appointment.notes}
                                    </span>
                                  ) : (
                                    appointment.notes
                                  )
                                ) : (
                                  t('doctor.appointments.noNotes')
                                )}
                              </p>
                            </div>
                          </div>

                          {preVisitAssessment ? (
                            <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
                              <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-cyan-700" />
                                <p className="text-sm font-semibold text-cyan-900">
                                  {t('doctor.appointments.preVisitPrefix')}:{' '}
                                  {preVisitStatusLabel(t, preVisitAssessment.status)}
                                </p>
                              </div>
                              {preVisitAssessment.summary ? (
                                <>
                                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cyan-800">
                                    {t('doctor.appointments.aiSummary')}
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                    {uiLang.startsWith('ar') ? (
                                      <span dir="ltr" className="block text-start" translate="no">
                                        {preVisitAssessment.summary.summary_text}
                                      </span>
                                    ) : (
                                      preVisitAssessment.summary.summary_text
                                    )}
                                  </p>
                                </>
                              ) : (
                                <p className="mt-2 text-sm text-gray-700">{t('doctor.appointments.preVisitPending')}</p>
                              )}
                            </div>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                            <button
                              type="button"
                              onClick={() => navigate(`/doctor/appointments/${appointment.id}`)}
                              className="rounded-xl border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
                            >
                              {t('doctor.appointmentDetail.openDetail')}
                            </button>
                            {canCancel ? (
                              <button
                                type="button"
                                onClick={() => handleCancelAppointment(appointment.id)}
                                disabled={busyAppointmentId === appointment.id}
                                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busyAppointmentId === appointment.id
                                  ? t('doctor.appointments.cancelling')
                                  : t('doctor.appointments.cancel')}
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-4 flex items-center space-x-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>{t('doctor.appointments.footerHint')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ))}
              </div>
            )}
              </>
            )}
          </div>
        )}
      </div>

      {showExportModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => { setShowExportModal(false); setExportSuccess(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                  <Download className="h-5 w-5 text-slate-600" />
                </div>
                <h2 className="text-[17px] font-bold text-slate-900">Export Appointments</h2>
              </div>
              <button
                type="button"
                onClick={() => { setShowExportModal(false); setExportSuccess(false); }}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* Date Range */}
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-900">Date Range</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'today', emoji: '📅', label: 'Today', sub: 'Appointments for today only' },
                    { value: 'week', emoji: '📆', label: 'This Week', sub: 'Current week appointments' },
                    { value: 'month', emoji: '🗓️', label: 'This Month', sub: 'All appointments this month' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExportRange(opt.value)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        exportRange === opt.value
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'
                      }`}
                    >
                      <span className="mb-1 block text-xl">{opt.emoji}</span>
                      <p className={`text-xs font-bold ${exportRange === opt.value ? 'text-teal-700' : 'text-slate-800'}`}>{opt.label}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Type */}
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-900">Export Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'administrative', emoji: '📊', label: 'Administrative', sub: 'Patient, date, time, status, type, duration' },
                    { value: 'personal', emoji: '👤', label: 'Personal Records', sub: 'Full details including reason, notes and pre-visit status' },
                    { value: 'billing', emoji: '💰', label: 'Billing', sub: 'Revenue summary with consultation fees and totals' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExportType(opt.value)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        exportType === opt.value
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'
                      }`}
                    >
                      <span className="mb-1 block text-xl">{opt.emoji}</span>
                      <p className={`text-xs font-bold ${exportType === opt.value ? 'text-teal-700' : 'text-slate-800'}`}>{opt.label}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview count */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                📋 <span className="font-semibold text-slate-800">{exportFilteredAppointments.length}</span> appointment{exportFilteredAppointments.length !== 1 ? 's' : ''} will be exported as CSV
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => { setShowExportModal(false); setExportSuccess(false); }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${
                  exportSuccess ? 'bg-emerald-600' : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {exportSuccess ? (
                  <>✓ Exported!</>
                ) : (
                  <><Download className="h-4 w-4" /> Export CSV</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
