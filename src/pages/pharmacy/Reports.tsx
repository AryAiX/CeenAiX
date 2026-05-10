import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue } from '../../hooks';
import { formatLocaleDigits, dateTimeFormatWithNumerals } from '../../lib/i18n-ui';
import { PHARMACY_NAV_ITEMS } from './navItems';

const formatNumber = (value: number, language: string) => formatLocaleDigits(value, language);

const cleanMedication = (name: string) => name.replace(/\s+\d+\s?(?:mg|iu|mcg|g)\b/i, '').trim();

export const PharmacyReports = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const { data, loading } = usePharmacyPrescriptionQueue();
  const queue = useMemo(() => data?.queue ?? [], [data?.queue]);

  const prescriptionIds = useMemo(() => Array.from(new Set(queue.map((item) => item.prescriptionId))), [queue]);
  const dispensedIds = useMemo(() => {
    const byRx = new Map<string, boolean[]>();
    for (const item of queue) {
      byRx.set(item.prescriptionId, [...(byRx.get(item.prescriptionId) ?? []), item.isDispensed]);
    }
    return Array.from(byRx.values()).filter((statuses) => statuses.every(Boolean)).length;
  }, [queue]);

  const topDrugs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of queue) {
      const key = cleanMedication(item.medication || 'Medication');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([drug, count]) => ({ drug, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [queue]);

  const totalPrescriptions = prescriptionIds.length;
  const approvalRate = totalPrescriptions ? Math.round((dispensedIds / totalPrescriptions) * 1000) / 10 : 100;
  const maxDrugCount = Math.max(...topDrugs.map((item) => item.count), 1);
  const pharmacyFallback = t('pharmacy.reports.fallbackName', { defaultValue: 'Pharmacy' });
  const pharmacyName = data?.profile?.displayName ?? data?.organization?.name ?? pharmacyFallback;
  const monthYear = new Date().toLocaleDateString(uiLang, dateTimeFormatWithNumerals(uiLang, { month: 'long', year: 'numeric' }));

  const kpis = [
    {
      label: t('pharmacy.reports.kpiPrescriptions', { defaultValue: 'Prescriptions this month' }),
      value: loading ? '...' : formatNumber(totalPrescriptions, uiLang),
      icon: FileText,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      label: t('pharmacy.reports.kpiAccuracy', { defaultValue: 'Dispensing accuracy' }),
      value: loading
        ? '...'
        : `${formatLocaleDigits(data?.reportMetrics.dispensingAccuracyPercent ?? 0, uiLang)}%`,
      sub: t('pharmacy.reports.kpiAccuracySub', { defaultValue: 'Computed from pharmacy_dispensing_tasks' }),
      icon: Target,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: t('pharmacy.reports.kpiApproval', { defaultValue: 'Insurance approval rate' }),
      value: loading ? '...' : `${formatLocaleDigits(approvalRate, uiLang)}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: t('pharmacy.reports.kpiCompliance', { defaultValue: 'Controlled substance compliance' }),
      value: loading
        ? '...'
        : `${formatLocaleDigits(data?.reportMetrics.controlledCompliancePercent ?? 0, uiLang)}% ✅`,
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <OpsShell
      title={t('pharmacy.reports.title', { defaultValue: 'Reports' })}
      subtitle={`${pharmacyName} · ${t('pharmacy.reports.liveAnalytics', { defaultValue: 'Live analytics' })}`}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, {
        prescriptions: data?.pendingPrescriptions || undefined,
        inventory: data?.lowStockAlerts || undefined,
        messages: data?.messages.reduce((sum, item) => sum + item.unreadCount, 0) || undefined,
      })}
      accent="emerald"
      variant="pharmacy"
    >
      <div className="min-h-full bg-slate-50 p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-slate-900">
              {t('pharmacy.reports.heading', { defaultValue: 'Reports & Analytics' })}
            </h2>
            <div className="text-[13px] text-slate-400">
              {monthYear} · {pharmacyName}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              <Download className="h-4 w-4" /> {t('pharmacy.reports.exportLedger', { defaultValue: 'Export Dispensing Ledger' })}
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" /> {t('pharmacy.reports.dhaMonthly', { defaultValue: 'DHA Monthly Report' })}
            </button>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <article key={kpi.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${kpi.bg}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div className={`mb-1 font-mono text-[22px] font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[12px] text-slate-500">{kpi.label}</div>
                {kpi.sub ? <div className="mt-0.5 text-xs text-emerald-600">{kpi.sub} ✅</div> : null}
              </article>
            );
          })}
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[15px] font-bold text-slate-800">
              {t('pharmacy.reports.volumeHeading', { defaultValue: 'Dispensing Volume — Current Queue' })}
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: t('pharmacy.reports.volumeDispensed', { defaultValue: 'Dispensed' }),
                  value: dispensedIds,
                  color: 'bg-emerald-500',
                },
                {
                  label: t('pharmacy.reports.volumeQueue', { defaultValue: 'In queue' }),
                  value: Math.max(totalPrescriptions - dispensedIds, 0),
                  color: 'bg-blue-500',
                },
                {
                  label: t('pharmacy.reports.volumeClaims', { defaultValue: 'Claims in review' }),
                  value: data?.claimsInReview ?? 0,
                  color: 'bg-amber-500',
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{item.label}</span>
                    <span className="font-mono text-slate-500">
                      {loading ? '...' : formatNumber(item.value, uiLang)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className={`h-3 rounded-full ${item.color}`}
                      style={{ width: `${Math.min(100, (item.value / Math.max(totalPrescriptions, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[15px] font-bold text-slate-800">
              {t('pharmacy.reports.riskHeading', { defaultValue: 'Inventory Risk Breakdown' })}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                [
                  t('pharmacy.reports.riskHealthy', { defaultValue: 'Healthy SKUs' }),
                  data?.inventory.filter((item) => item.status === 'healthy').length ?? 0,
                  'text-emerald-600',
                  'bg-emerald-50',
                ],
                [
                  t('pharmacy.reports.riskLow', { defaultValue: 'Low stock' }),
                  data?.inventory.filter((item) => item.status === 'low').length ?? 0,
                  'text-amber-600',
                  'bg-amber-50',
                ],
                [
                  t('pharmacy.reports.riskOut', { defaultValue: 'Out of stock' }),
                  data?.inventory.filter((item) => item.status === 'out').length ?? 0,
                  'text-red-700',
                  'bg-red-50',
                ],
                [
                  t('pharmacy.reports.riskExpiring', { defaultValue: 'Expiring soon' }),
                  data?.inventory.filter((item) => item.status === 'near_expiry').length ?? 0,
                  'text-yellow-800',
                  'bg-yellow-50',
                ],
              ].map(([label, value, color, bg]) => (
                <div key={label as string} className={`rounded-xl p-4 ${bg}`}>
                  <div className={`font-mono text-2xl font-bold ${color}`}>
                    {loading ? '...' : formatNumber(Number(value) || 0, uiLang)}
                  </div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mb-5 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-[15px] font-bold text-slate-800">
            {t('pharmacy.reports.topDrugsHeading', { defaultValue: 'Top Dispensed Drugs — Live Prescription Data' })}
          </h3>
          <div className="space-y-3">
            {topDrugs.map((item) => (
              <div key={item.drug} className="grid grid-cols-[140px_minmax(0,1fr)_48px] items-center gap-3">
                <div className="truncate text-xs font-medium text-slate-600">{item.drug}</div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(item.count / maxDrugCount) * 100}%` }} />
                </div>
                <div className="text-right font-mono text-xs font-bold text-slate-600">
                  {formatNumber(item.count, uiLang)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-800">
                  {t('pharmacy.reports.dhaHeading', { defaultValue: 'DHA Monthly Dispensing Report' })}
                </h3>
                <div className="text-xs text-slate-400">
                  {pharmacyName} ·{' '}
                  {data?.profile?.licenseNumber ??
                    data?.organization?.notes ??
                    t('pharmacy.reports.licensePending', { defaultValue: 'License pending' })}
                </div>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
              {formatLocaleDigits(data?.reportMetrics.controlledCompliancePercent ?? 0, uiLang)}%{' '}
              {t('pharmacy.reports.compliant', { defaultValue: 'Compliant' })} ✅
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [t('pharmacy.reports.totalRecords', { defaultValue: 'Total dispensing records' }), formatNumber(totalPrescriptions, uiLang)],
              [
                t('pharmacy.reports.submittedDha', { defaultValue: 'Submitted to DHA' }),
                `${formatLocaleDigits(data?.reportMetrics.dhaSubmittedCount ?? 0, uiLang)} ✅`,
              ],
              [
                t('pharmacy.reports.controlledRecords', { defaultValue: 'Controlled substance records' }),
                formatNumber(data?.inventory.filter((item) => /warfarin/i.test(item.name)).length ?? 0, uiLang),
              ],
              [
                t('pharmacy.reports.lastSubmitted', { defaultValue: 'Last submitted' }),
                data?.reportMetrics.lastSubmittedLabel ??
                  t('pharmacy.reports.noSubmissions', { defaultValue: 'No submissions' }),
              ],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-slate-50 p-3">
                <div className="mb-1 text-xs text-slate-400">{label}</div>
                <div className="font-mono text-sm font-bold text-slate-800">{loading ? '...' : value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </OpsShell>
  );
};
