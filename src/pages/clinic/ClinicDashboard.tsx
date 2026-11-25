import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, TrendingUp, Clock, AlertCircle, ArrowRight, Stethoscope, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchClinicPatientProfiles } from '../../lib/clinic-patients';
import { useAuth } from '../../lib/auth-context';
import { clinicDayRangeUtc, clinicTodayKey, formatClinicTime } from '../../lib/clinic-booking-time';
import { CLINIC_TIME_ZONE, appointmentStatusLabel, dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';
import { visitReasonLabel } from '../../lib/clinic-booking';
import { doctorsForToday, summariseToday } from '../../lib/clinic-dashboard';
import { useTranslation } from 'react-i18next';
import { fetchAllPages } from '../../lib/supabase-batches';
import { estimatedVisitFee, sumEstimatedFees, type ClinicFeeLink } from '../../lib/clinic-visit-fee';
import { formatLocaleCurrency } from '../../lib/i18n-ui';

const statusConfig: Record<string, { color: string; dot: string }> = {
  completed:    { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  in_progress:  { color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500 animate-pulse' },
  confirmed:    { color: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500' },
  scheduled:    { color: 'bg-slate-50 text-slate-600 border-slate-200',       dot: 'bg-slate-400' },
  no_show:      { color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
  cancelled:    { color: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500' },
};

const breakdownColor: Record<string, string> = {
  completed: 'bg-emerald-500', in_progress: 'bg-blue-500', confirmed: 'bg-teal-500',
  scheduled: 'bg-slate-300', no_show: 'bg-amber-500', cancelled: 'bg-red-400',
};

interface TodayAppointment {
  id: string;
  /** stored timestamp; shown in clinic time in the UI language */
  scheduledAt: string;
  patient: string | null;
  /** stored (English) reason; translated when shown */
  reason: string | null;
  doctor: string | null;
  status: string;
}

interface DoctorRow {
  id: string;
  name: string | null;
  specialty: string | null;
  initials: string;
  appts: number;
  status: string;
}

interface DashboardData {
  todayApptCount: number;
  confirmedCount: number;
  pendingCount: number;
  activeDoctors: number;
  onDutyCount: number;
  pendingApproval: number;
  /** QA-235: estimates from the clinic's own fees; null when no fee is set */
  todayFees: number | null;
  monthFees: number | null;

  todayAppts: TodayAppointment[];
  doctors: DoctorRow[];
  statusBreakdown: { status: string; count: number; share: number; color: string }[];
}

export default function ClinicDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lang = i18n.language;
  const D = 'clinic.dashboardPage';
  // QA-234 / QA-237: today and this month in clinic time (Dubai), in the UI language
  const todayLabel = new Date().toLocaleDateString(
    resolveLocale(lang),
    dateTimeFormatWithNumerals(lang, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: CLINIC_TIME_ZONE })
  );
  const currentMonthLabel = new Date().toLocaleDateString(
    resolveLocale(lang),
    dateTimeFormatWithNumerals(lang, { month: 'long', year: 'numeric', timeZone: CLINIC_TIME_ZONE })
  );
  const num = (value: number) => formatLocaleDigits(value, lang);

  useEffect(() => {
    if (!user?.id) return;
    void fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const { startIso: todayStart, endIso: todayEnd } = clinicDayRangeUtc(clinicTodayKey(now));

      // Get clinic's facility_id
      const { data: memberData, error: memberError } = await supabase
        .from('clinic_portal_members')
        .select('facility_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.facility_id) throw new Error('No clinic facility found for this user.');

      const facilityId = memberData.facility_id;

      // QA-236: the old "NABIDH Sync Active" alert read facilities.settings.nabidh; nothing syncs to NABIDH

      // Today's appointments filtered by facility
      const { data: appts, error: apptsError } = await supabase
        .from('appointments')
        .select('id, status, scheduled_at, chief_complaint, patient_id, doctor_id, type')
        .eq('facility_id', facilityId)
        .gte('scheduled_at', todayStart)
        .lte('scheduled_at', todayEnd)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: true });

      if (apptsError) throw apptsError;

      // QA-234: cancelled visits are not counted as appointments; the breakdown shows every status
      const today = summariseToday(appts ?? []);
      const todayApptCount = today.total;
      const confirmedCount = today.confirmed;
      const pendingCount = today.pending;
      const statusBreakdown = today.breakdown.map(b => ({
        status: b.status,
        count: b.count,
        share: b.share,
        color: breakdownColor[b.status],
      }));

      // Get patient and doctor names
      const patientIds = [...new Set((appts ?? []).map(a => a.patient_id))];
      const doctorIds = [...new Set((appts ?? []).map(a => a.doctor_id))];

      // QA-208: patients only through clinic_patient_profiles (no identity / insurance data)
      const patientProfiles = await fetchClinicPatientProfiles(supabase, patientIds);

      const { data: doctorProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', doctorIds);

      const patientMap = new Map(patientProfiles.map(p => [p.user_id, p.full_name]));
      const doctorMap = new Map((doctorProfiles ?? []).map(d => [d.user_id, d.full_name]));

      // Build today's schedule
      const todayApptRows: TodayAppointment[] = (appts ?? []).slice(0, 6).map(a => ({
        id: a.id,
        scheduledAt: a.scheduled_at,
        patient: patientMap.get(a.patient_id) ?? null,
        reason: a.chief_complaint ?? null,
        doctor: doctorMap.get(a.doctor_id) ?? null,
        status: a.status,
      }));

      // Fetch facility staff
      const { data: facilityStaff, error: staffError } = await supabase
        .from('facility_staff')
        .select('id, doctor_user_id, is_available, is_active, consultation_fee, invitation_status')
        .eq('facility_id', facilityId)
        .eq('is_active', true);

      if (staffError) throw staffError;

      // Pending/invited doctors are always is_active=false, so query separately
      const { data: pendingStaff } = await supabase
        .from('facility_staff')
        .select('id, invitation_status')
        .eq('facility_id', facilityId)
        .in('invitation_status', ['pending', 'invited']);

      const doctorUserIds = (facilityStaff ?? []).map(s => s.doctor_user_id).filter(Boolean);

      // Get doctor names
      let doctorNameMap = new Map<string, string>();
      let doctorSpecMap = new Map<string, string>();

      if (doctorUserIds.length > 0) {
        const { data: nameRows } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', doctorUserIds);
        doctorNameMap = new Map((nameRows ?? []).map(d => [d.user_id, d.full_name ?? '']));

        const { data: specRows } = await supabase
          .from('doctor_profiles')
          .select('user_id, specialization')
          .in('user_id', doctorUserIds);
        doctorSpecMap = new Map((specRows ?? []).map(d => [d.user_id, d.specialization ?? '']));
      }

      const activeDoctors = facilityStaff?.length ?? 0;
      const onDutyCount = facilityStaff?.filter(d => d.is_available).length ?? 0;
      const pendingApproval = (pendingStaff ?? []).filter(d => d.invitation_status === 'pending').length;

      // QA-234: the doctors with the most visits today first (it used to be whichever 4 came first)
      const linkedDoctors = (facilityStaff ?? []).map(d => ({
        ...d,
        doctorUserId: d.doctor_user_id as string,
        name: doctorNameMap.get(d.doctor_user_id) || '',
      }));
      const doctorRows: DoctorRow[] = doctorsForToday(linkedDoctors, today.perDoctor).map(d => {
        const fullName = d.name || null;
        const nameParts = (fullName ?? '').trim().split(' ').filter(Boolean);
        const initials = nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
          : (nameParts[0]?.[0] ?? 'D').toUpperCase();
        return {
          id: d.id,
          name: fullName,
          specialty: doctorSpecMap.get(d.doctor_user_id) || null,
          initials,
          appts: d.appts,
          status: d.is_available ? 'on-duty' : 'off-duty',
        };
      });

      // QA-235: estimated fees, the same estimate as Appointments and Analytics (QA-195 / QA-227): the
      // clinic's own fee for each visit type (telemedicine, follow-up, consultation). Links that are no
      // longer active still count, so past visits of a doctor who left keep their estimate.
      const { data: feeRows } = await supabase
        .from('facility_staff')
        .select('doctor_user_id, consultation_fee, telemedicine_fee, follow_up_fee')
        .eq('facility_id', facilityId);
      const feeLinks = new Map(((feeRows ?? []) as ClinicFeeLink[]).map(link => [link.doctor_user_id, link]));
      const feeFor = (visit: { doctor_id: string; type?: string | null; chief_complaint?: string | null }) =>
        estimatedVisitFee(feeLinks.get(visit.doctor_id), { visitType: visit.type ?? 'in_person', reason: visit.chief_complaint ?? '' });

      const todayFees = sumEstimatedFees((appts ?? []).filter(a => a.status === 'completed').map(feeFor));

      const monthStart = clinicDayRangeUtc(`${clinicTodayKey(now).slice(0, 7)}-01`).startIso;
      // every completed visit this month, in pages (one request stops at 1,000 rows)
      const { rows: monthAppts } = await fetchAllPages<{ id: string; doctor_id: string; type: string | null; chief_complaint: string | null }>((from, to) =>
        supabase
          .from('appointments')
          .select('id, doctor_id, type, chief_complaint')
          .eq('facility_id', facilityId)
          .eq('is_deleted', false)
          .eq('status', 'completed')
          .gte('scheduled_at', monthStart)
          .lte('scheduled_at', todayEnd)
          .order('scheduled_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
      );
      const monthFees = sumEstimatedFees(monthAppts.map(feeFor));

      setData({
        todayApptCount,
        confirmedCount,
        pendingCount,
        activeDoctors,
        onDutyCount,
        pendingApproval,
        todayFees,
        monthFees,
        todayAppts: todayApptRows,
        doctors: doctorRows,
        statusBreakdown,
      });
    } catch (err) {
      // QA-237: plain message in the UI language; the database text stays in the console
      console.warn('[ClinicDashboard] load failed', err);
      setError(t('clinic.dashboardPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 h-64 bg-slate-100 rounded-2xl" />
          <div className="lg:col-span-2 h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void fetchDashboard()} className="ms-2 font-semibold underline">{t('clinic.actions.retry')}</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxRevenue = Math.max(...data.doctors.map(d => d.appts), 1);
  const money = (value: number | null) => (value === null ? '—' : formatLocaleCurrency(value, i18n.language));

  const kpis = [
    {
      key: 'appointments',
      label: t(`${D}.kpiAppointments`),
      value: num(data.todayApptCount),
      sub: t(`${D}.kpiAppointmentsSub`, { confirmed: num(data.confirmedCount), pending: num(data.pendingCount) }),
      icon: Calendar,
      color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200',
    },
    {
      key: 'doctors',
      label: t(`${D}.kpiDoctors`),
      value: num(data.activeDoctors),
      sub: t(`${D}.kpiDoctorsSub`, { onDuty: num(data.onDutyCount), pending: num(data.pendingApproval) }),
      icon: Stethoscope,
      color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
    },
    {
      key: 'today-fees',
      label: t('clinic.dashboardPage.todayFees'),
      value: money(data.todayFees),
      sub: t('clinic.dashboardPage.todayFeesSub'),
      icon: DollarSign,
      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',
    },
    {
      key: 'month-fees',
      label: t('clinic.dashboardPage.monthFees'),
      value: money(data.monthFees),
      sub: t('clinic.dashboardPage.monthFeesSub', { month: currentMonthLabel }),
      icon: TrendingUp,
      color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
    },
  ];

  return (
    <div className="p-6 space-y-6" dir={i18n.dir()}>
      <p data-testid="dashboard-fees-note" className="text-xs text-slate-400">{t('clinic.dashboardPage.feesNote')}</p>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.key} data-testid={`dashboard-kpi-${k.key}`} className={`bg-white rounded-2xl border ${k.border} p-5 shadow-sm`}>
              {/* QA-237: no green chip repeating the line below */}
              <div className="mb-3">
                <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}>
                  <Icon size={20} className={k.color} aria-hidden="true" />
                </div>
              </div>
              <div className="font-bold text-slate-900 text-xl" style={{ fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{k.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Today's appointments */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
                <Calendar size={16} className="text-teal-600" />
              </div>
              <div>
                <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${D}.schedule`)}</div>
                <div className="text-xs text-slate-400">{todayLabel}</div>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/clinic/appointments')} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
              {t(`${D}.viewAll`)} <ArrowRight size={12} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {data.todayAppts.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-400">{t(`${D}.noAppointmentsToday`)}</div>
            ) : (
              data.todayAppts.map((a) => {
                const s = statusConfig[a.status] ?? statusConfig.scheduled;
                return (
                  <div key={a.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="w-14 text-center shrink-0">
                      <div className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{formatClinicTime(a.scheduledAt, lang)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">{a.patient ?? t('clinic.appointments.unknownPatient')}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {visitReasonLabel(t, a.reason ?? 'Consultation')} · {a.doctor ? t('clinic.patientsPage.doctorName', { name: a.doctor }) : t('clinic.appointments.unknownDoctor')}
                      </div>
                    </div>
                    <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                      {appointmentStatusLabel(t, a.status)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Doctors today */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Stethoscope size={16} className="text-blue-600" />
              </div>
              <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${D}.doctorsToday`)}</div>
            </div>
            <button type="button" onClick={() => navigate('/clinic/doctors')} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
              {t(`${D}.manage`)} <ArrowRight size={12} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {data.doctors.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all">
                <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {d.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{d.name ?? t('clinic.appointments.unknownDoctor')}</div>
                  <div className="text-xs text-slate-400">{d.specialty ?? t('clinic.appointments.generalPractice')}</div>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-xs font-bold text-slate-700" style={{ fontFamily: 'DM Mono, monospace' }}>{t(`${D}.visits`, { count: d.appts })}</div>
                  <div className={`text-[10px] font-medium mt-0.5 ${d.status === 'on-duty' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span aria-hidden="true">{d.status === 'on-duty' ? '● ' : '○ '}</span>{d.status === 'on-duty' ? t(`${D}.onDuty`) : t(`${D}.offDuty`)}
                  </div>
                </div>
              </div>
            ))}
            {data.doctors.length === 0 && (
              <div className="text-center py-4 text-sm text-slate-400">{t(`${D}.noDoctors`)}</div>
            )}
          </div>

          {/* Appointments by doctor mini chart */}
          <div className="px-5 pb-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t(`${D}.byDoctor`)}</div>
            {/* QA-237: screen readers get the numbers as one sentence */}
            <div
              className="space-y-2"
              role="img"
              aria-label={t(`${D}.byDoctorSummary`, {
                list: data.doctors.filter(d => d.appts > 0).map(d => `${d.name ?? t('clinic.appointments.unknownDoctor')} ${num(d.appts)}`).join(', '),
              })}
            >
              {data.doctors.filter(d => d.appts > 0).map(d => (
                <div key={d.id} className="flex items-center gap-2" aria-hidden="true">
                  <div className="w-24 text-xs text-slate-500 truncate shrink-0">{(d.name ?? '').split(' ').pop()}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                      style={{ width: `${(d.appts / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-700 shrink-0 text-end" style={{ fontFamily: 'DM Mono, monospace', minWidth: 40 }}>
                    {t(`${D}.visits`, { count: d.appts })}
                  </div>
                </div>
              ))}
              {data.doctors.filter(d => d.appts > 0).length === 0 && (
                <div className="text-xs text-slate-400">{t(`${D}.noVisitsYet`)}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${D}.quickActions`)}</div>
          <div className="space-y-2">
            {[
              { label: t(`${D}.actionBook`), icon: Calendar, color: 'bg-teal-600 hover:bg-teal-700', href: '/clinic/appointments' },
              { label: t(`${D}.actionAddDoctor`), icon: Stethoscope, color: 'bg-blue-600 hover:bg-blue-700', href: '/clinic/doctors' },
              { label: t(`${D}.actionPricing`), icon: DollarSign, color: 'bg-emerald-600 hover:bg-emerald-700', href: '/clinic/pricing' },
              { label: t(`${D}.actionAnalytics`), icon: Activity, color: 'bg-slate-600 hover:bg-slate-700', href: '/clinic/analytics' },
            ].map(a => {
              const Icon = a.icon;
              return (
                <button
                  key={a.href}
                  type="button"
                  onClick={() => navigate(a.href)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 ${a.color} text-white rounded-xl text-sm font-medium transition-colors`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alerts & Notices */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${D}.alerts`)}</div>
          <div className="space-y-3">
            {/* QA-236: these doctors asked to join and wait for the clinic's approval (not a verification) */}
            {data.pendingApproval > 0 ? (
              <div data-testid="dashboard-alert-pending" className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                <Clock size={16} className="text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">{t('clinic.dashboardPage.pendingTitle')}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{t('clinic.dashboardPage.pendingBody', { count: data.pendingApproval })}</div>
                  <button type="button" onClick={() => navigate('/clinic/doctors')} className="mt-1 text-xs font-semibold text-blue-700 underline">
                    {t('clinic.dashboardPage.pendingReview')}
                  </button>
                </div>
              </div>
            ) : null}
            {data.todayApptCount === 0 ? (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">{t(`${D}.noApptsTitle`)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{t(`${D}.noApptsBody`)}</div>
                </div>
              </div>
            ) : null}
            {/* QA-236: no "NABIDH Sync Active" (nothing syncs) and no "All Systems Operational" (nothing is checked) */}
            {data.pendingApproval === 0 && data.todayApptCount > 0 ? (
              <p className="text-sm text-slate-400">{t('clinic.dashboardPage.noAlerts')}</p>
            ) : null}
          </div>
        </div>

        {/* Appointment status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${D}.statusTitle`)}</div>
          <div className="space-y-3">
            {data.statusBreakdown.map(s => (
              <div key={s.status} data-testid={`dashboard-status-${s.status}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">{appointmentStatusLabel(t, s.status)}</span>
                  <span className="text-sm font-bold text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{num(s.count)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${s.color}`}
                    style={{ width: `${s.share * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span data-testid="dashboard-total-today" className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{num(data.todayApptCount)}</span>
            <span className="text-sm text-slate-400 ms-2">{t(`${D}.totalToday`)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
