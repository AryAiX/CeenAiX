import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { useIsPhone } from '../../hooks/use-is-phone';
import { useTranslation } from 'react-i18next';
import { fetchAllPages } from '../../lib/supabase-batches';
import { OTHER_REASON, isCountedVisit, isInClinicMonth, summariseClinicVisits, visitReasonBreakdown, type AnalyticsVisit } from '../../lib/clinic-analytics';
import { CLINIC_APPOINTMENT_REASONS, visitReasonLabel } from '../../lib/clinic-booking';
import { formatLocaleCurrency, formatLocaleDigits, resolveLocale, usesArabicEasternNumerals } from '../../lib/i18n-ui';
import { estimatedVisitFee, sumEstimatedFees, type ClinicFeeLink } from '../../lib/clinic-visit-fee';
import { Users, DollarSign, Calendar } from 'lucide-react';

export default function ClinicAnalytics() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [truncated, setTruncated] = useState(false);
  const isPhone = useIsPhone();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [activePatients, setActivePatients] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ key: string; value: number }[]>([]);
  const [doctorPerf, setDoctorPerf] = useState<{ doctorId: string; name: string; specialty: string; appts: number; revenue: number | null; initials: string; gradient: string }[]>([]);
  const [serviceBreakdown, setServiceBreakdown] = useState<{ name: string; pct: number; color: string }[]>([]);
  const [monthlyRevenueTotal, setMonthlyRevenueTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('clinic_portal_members')
        .select('facility_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.facility_id) throw new Error('No clinic facility found.');
      const fId = memberData.facility_id;

      const { data: facilityData } = await supabase
        .from('facilities')
        .select('name')
        .eq('id', fId)
        .maybeSingle();
      setClinicName(facilityData?.name ?? null);

      // QA-226: read every visit in pages (one request stops at 1,000 rows without saying so)
      const { rows: apptRows, truncated: listTruncated } = await fetchAllPages<AnalyticsVisit & { type: string | null; chief_complaint: string | null }>((from, to) =>
        supabase
          .from('appointments')
          .select('id, patient_id, doctor_id, scheduled_at, status, type, chief_complaint')
          .eq('facility_id', fId)
          .eq('is_deleted', false)
          .order('scheduled_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );
      setTruncated(listTruncated);
      // QA-226: cancelled visits did not happen and are left out everywhere
      const appts = apptRows.filter(isCountedVisit);
      const summary = summariseClinicVisits(apptRows);

      setTotalAppointments(summary.totalAppointments);
      setActivePatients(summary.activePatients);

      // months in clinic time (Dubai), not the browser's; named in the UI language when shown
      setMonthlyRevenue(summary.months.map(m => ({ key: m.key, value: m.count })));

      const doctorIds = [...new Set(appts.map(a => a.doctor_id))];

      // QA-227: the clinic's own fees per doctor (Doctors page -> Edit Fee), the same estimate as the
      // Appointments page (QA-195). Nothing is billed in the app, so these are estimates.
      const { data: staffFeeData } = await supabase
        .from('facility_staff')
        .select('doctor_user_id, consultation_fee, telemedicine_fee, follow_up_fee')
        .eq('facility_id', fId);

      const feeLinks = new Map(((staffFeeData ?? []) as ClinicFeeLink[]).map(s => [s.doctor_user_id, s]));
      const feeFor = (a: (typeof appts)[number]) =>
        estimatedVisitFee(feeLinks.get(a.doctor_id), { visitType: a.type ?? 'in_person', reason: a.chief_complaint ?? '' });

      const { data: doctorProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', doctorIds);
      const { data: doctorSpecData } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialization')
        .in('user_id', doctorIds);

      const profileMap = new Map((doctorProfiles ?? []).map(p => [p.user_id, p.full_name]));
      const specMap = new Map((doctorSpecData ?? []).map(d => [d.user_id, d.specialization]));

      // the doctor's own private-practice fee is no longer used as a fallback
      setMonthlyRevenueTotal(
        sumEstimatedFees(
          appts.filter(a => a.status === 'completed' && isInClinicMonth(a.scheduled_at)).map(feeFor)
        )
      );

      const gradients = [
        'from-teal-600 to-blue-600',
        'from-blue-600 to-blue-700',
        'from-emerald-600 to-teal-600',
        'from-slate-600 to-slate-700',
        'from-amber-600 to-orange-600',
      ];

      const perfRows = doctorIds.map((did, idx) => {
        const name = profileMap.get(did) ?? t('clinic.appointments.unknownDoctor');
        const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
        const completedAppts = appts.filter(a => a.doctor_id === did && a.status === 'completed');
        return {
          doctorId: did,
          name,
          specialty: specMap.get(did) ?? t('clinic.appointments.generalPractice'),
          appts: summary.perDoctor.get(did) ?? 0,
          revenue: sumEstimatedFees(completedAppts.map(feeFor)),
          initials,
          gradient: gradients[idx % gradients.length],
        };
      }).sort((a, b) => b.appts - a.appts);

      setDoctorPerf(perfRows);

      // QA-228: standard visit reasons only; what patients typed counts as "Other"
      const colors = ['bg-teal-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];
      const breakdown = visitReasonBreakdown(apptRows, CLINIC_APPOINTMENT_REASONS).map((row, idx) => ({
        name: row.reason,
        pct: row.pct,
        color: row.reason === OTHER_REASON ? 'bg-slate-400' : colors[idx % colors.length],
      }));
      setServiceBreakdown(breakdown);

    } catch (err) {
      // QA-229: plain message in the UI language; the database text stays in the console
      console.warn('[ClinicAnalytics] load failed', err);
      setError(t('clinic.analyticsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.value), 1);
  const lang = i18n.language;
  const A = 'clinic.analyticsPage';
  /** "2,500" in English, Arabic digits in Arabic */
  const num = (value: number) => (usesArabicEasternNumerals(lang) ? formatLocaleDigits(value, lang) : value.toLocaleString('en-US'));
  const percent = (value: number) =>
    new Intl.NumberFormat(resolveLocale(lang), {
      style: 'percent',
      ...(usesArabicEasternNumerals(lang) ? { numberingSystem: 'arab' } : {}),
    }).format(value / 100);
  const monthName = (key: string) =>
    new Intl.DateTimeFormat(resolveLocale(lang), { month: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1))
    );
  const chartSummary = t(`${A}.chartSummary`, {
    list: monthlyRevenue.map(m => `${monthName(m.key)} ${num(m.value)}`).join(', '),
  });
  const maxAppts = Math.max(...doctorPerf.map(d => d.appts), 1);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 h-64 bg-slate-100 rounded-2xl" />
          <div className="lg:col-span-2 h-64 bg-slate-100 rounded-2xl" />
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void fetchData()} className="ms-2 font-semibold underline">{t('clinic.actions.retry')}</button>
        </div>
      ) : null}

      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${A}.title`)}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t(`${A}.subtitle`, { name: clinicName ?? t('clinic.facilityFallback') })}</p>
        {truncated ? (
          <p className="text-xs text-amber-700 mt-1">{t('clinic.analyticsPage.truncated', { value: formatLocaleDigits(20000, i18n.language) })}</p>
        ) : null}
      </div>

      {/* KPIs (QA-229: no "Avg. Rating — Coming soon" placeholder and no growth arrows, nothing measures them) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: 'revenue', label: t('clinic.analyticsPage.estimatedFees'), value: monthlyRevenueTotal === null ? '—' : formatLocaleCurrency(monthlyRevenueTotal, i18n.language), sub: t('clinic.analyticsPage.estimatedFeesSub'), icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50' },
          { key: 'appointments', label: t(`${A}.kpiAppointments`), value: num(totalAppointments), sub: t(`${A}.kpiAppointmentsSub`), icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { key: 'patients', label: t(`${A}.kpiPatients`), value: num(activePatients), sub: t(`${A}.kpiPatientsSub`), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.key} data-testid={`analytics-kpi-${k.key}`} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="mb-3">
                <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}><Icon size={20} className={k.color} aria-hidden="true" /></div>
              </div>
              <div className="font-bold text-slate-900 text-2xl" style={{ fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{k.label}</div>
              <div className="text-xs text-slate-400 font-medium mt-1">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Appointment volume chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${A}.monthlyTitle`)}</div>
              <div className="text-xs text-slate-400 mt-0.5">{t(`${A}.monthlySub`)}</div>
            </div>
          </div>
          {/* QA-229: screen readers get the numbers as one sentence */}
          <div role="img" aria-label={chartSummary} className="flex items-end gap-2 sm:gap-4 h-40">
            {monthlyRevenue.map(m => (
              <div key={m.key} aria-hidden="true" className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-bold text-slate-700" style={{ fontFamily: 'DM Mono, monospace' }}>{num(m.value)}</div>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-400 transition-all"
                  style={{ height: `${Math.max((m.value / maxRevenue) * 120, 4)}px` }}
                />
                <div className="text-xs text-slate-400">{monthName(m.key)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Service breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="font-bold text-slate-800 mb-5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('clinic.analyticsPage.byReason')}</div>
          {serviceBreakdown.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">{t(`${A}.noData`)}</div>
          ) : (
            <div className="space-y-3">
              {serviceBreakdown.map(s => (
                <div key={s.name}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm text-slate-600 truncate">
                      {s.name === OTHER_REASON ? t('clinic.analyticsPage.otherReason') : visitReasonLabel(t, s.name)}
                    </span>
                    <span className="text-sm font-bold text-slate-800 shrink-0" style={{ fontFamily: 'DM Mono, monospace' }}>{percent(s.pct)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Doctor performance */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${A}.doctorPerformance`)}</div>
          <p data-testid="analytics-fees-note" className="mt-1 text-xs text-slate-400">{t('clinic.analyticsPage.feesNote')}</p>
        </div>
        {doctorPerf.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">{t(`${A}.noDoctors`)}</div>
        ) : isPhone ? (
          // QA-249: a card per doctor on phones
          <ul data-testid="clinic-analytics-doctor-cards" className="divide-y divide-slate-100">
            {doctorPerf.map(d => (
              <li key={d.doctorId} className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div aria-hidden="true" className={`w-9 h-9 rounded-xl bg-gradient-to-br ${d.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>{d.initials}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 text-sm">{d.name}</div>
                    <div className="text-xs text-slate-500">{d.specialty}</div>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <dt className="text-slate-400">{t(`${A}.colAppointments`)}</dt>
                    <dd className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{num(d.appts)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">{t(`${A}.colEstimatedFees`)}</dt>
                    <dd className="font-bold text-teal-700 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{d.revenue === null ? '—' : num(d.revenue)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {[t(`${A}.colDoctor`), t(`${A}.colSpecialty`), t(`${A}.colAppointments`), t(`${A}.colEstimatedFees`)].map(h => (
                  <th key={h} scope="col" className="text-start text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {doctorPerf.map(d => (
                <tr key={d.doctorId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div aria-hidden="true" className={`w-9 h-9 rounded-xl bg-gradient-to-br ${d.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>{d.initials}</div>
                      <span className="font-semibold text-slate-800 text-sm">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{d.specialty}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[120px] h-2 bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${(d.appts / maxAppts) * 100}%` }} />
                      </div>
                      <span className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{num(d.appts)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-teal-700 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{d.revenue === null ? '—' : num(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
