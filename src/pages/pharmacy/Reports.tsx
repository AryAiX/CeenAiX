import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, FileText, ShieldCheck, TrendingUp } from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue, usePharmacyUnreadMessages } from '../../hooks';
import { formatLocaleDigits, dateTimeFormatWithNumerals } from '../../lib/i18n-ui';
import { PHARMACY_NAV_ITEMS, pharmacyNavCounts } from './navItems';

const formatNumber = (value: number, language: string) => formatLocaleDigits(value, language);

const cleanMedication = (name: string) => name.replace(/\s+\d+\s?(?:mg|iu|mcg|g)\b/i, '').trim();

export const PharmacyReports = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const { data, loading, error, refetch } = usePharmacyPrescriptionQueue();
  const unreadMessages = usePharmacyUnreadMessages();
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
  // QA-285: the real "controlled" flag (the old card counted items named warfarin).
  const controlledInStock = (data?.inventory ?? []).filter((item) => item.isControlled && item.stock > 0).length;
  // QA-285: only a real licence number (it used to fall back to the organization's free-text notes).
  const licenseNumber = data?.profile?.licenseNumber?.trim() || null;
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
      route: '/pharmacy/dispensing',
    },
    {
      label: t('pharmacy.reports.kpiApproval', { defaultValue: 'Insurance approval rate' }),
      value: loading ? '...' : `${formatLocaleDigits(approvalRate, uiLang)}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      route: '/pharmacy/revenue',
    },
  ];

  return (
    <OpsShell
      title={t('pharmacy.reports.title', { defaultValue: 'Reports' })}
      subtitle={`${pharmacyName} · ${t('pharmacy.reports.liveAnalytics', { defaultValue: 'Live analytics' })}`}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, pharmacyNavCounts(data, unreadMessages))}
      accent="emerald"
      variant="pharmacy"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />
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
              onClick={() => {
                const queue = data?.queue ?? [];
                const header = ['rx_id', 'patient_name', 'prescriber', 'medication', 'workflow_status', 'received_at', 'priority'];
                const escape = (v: string | number | null | undefined) => {
                  if (v === null || v === undefined) return '';
                  const s = String(v);
                  return s.includes(',') || s.includes('"') || s.includes('\n')
                    ? `"${s.replace(/"/g, '""')}"`
                    : s;
                };
                const body = [
                  header,
                  ...queue.map((item) => [
                    item.id,
                    item.patientName,
                    item.prescriber,
                    item.medication,
                    item.workflowStatus,
                    item.receivedAt,
                    item.priority,
                  ]),
                ]
                  .map((line) => line.map(escape).join(','))
                  .join('\n');
                const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `pharmacy-dispensing-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              <Download className="h-4 w-4" /> {t('pharmacy.reports.exportLedger', { defaultValue: 'Export Dispensing Ledger' })}
            </button>
            <button
              type="button"
              onClick={() => {
                const queue = data?.queue ?? [];
                const summary = [
                  `DHA Monthly Pharmacy Report — ${monthYear}`,
                  `Pharmacy: ${pharmacyName}`,
                  '',
                  `Total prescriptions handled: ${queue.length}`,
                  `Dispensed: ${queue.filter((item) => item.workflowStatus === 'dispensed').length}`,
                  `On hold: ${queue.filter((item) => item.workflowStatus === 'on_hold').length}`,
                  `Cancelled: ${queue.filter((item) => item.workflowStatus === 'cancelled').length}`,
                  '',
                  'Source: live pharmacy_dispensing_tasks (canonical CeenAiX schema).',
                ];
                const blob = new Blob([summary.join('\n')], {
                  type: 'text/plain;charset=utf-8',
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `dha-monthly-${new Date().toISOString().slice(0, 7)}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
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
              <Link key={kpi.label} to={kpi.route} className="block rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition hover:ring-2 hover:ring-emerald-300 cursor-pointer">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${kpi.bg}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div className={`mb-1 font-mono text-[22px] font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[12px] text-slate-500">{kpi.label}</div>
              </Link>
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

        {/* QA-285: no made-up compliance or DHA figures. The portal does not send anything to DHA and
            keeps no controlled-drugs register; the old card showed "100% Compliant", "Submitted to DHA"
            (= number of tasks), "Last submitted: Today" and counted items named warfarin. */}
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm" aria-labelledby="pharmacy-dha-heading">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <ShieldCheck className="h-5 w-5 text-slate-500" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 id="pharmacy-dha-heading" className="text-[15px] font-bold text-slate-800">
                {t('pharmacy.reports.dhaReportingHeading', { defaultValue: 'DHA Reporting' })}
              </h3>
              <div className="text-xs text-slate-400">
                {pharmacyName} ·{' '}
                {licenseNumber ? (
                  <bdi>{licenseNumber}</bdi>
                ) : (
                  t('pharmacy.reports.licenseNotOnFile', { defaultValue: 'Licence number not on file' })
                )}
              </div>
            </div>
          </div>
          <p role="note" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t('pharmacy.reports.dhaNotRecorded', {
              defaultValue:
                'Submissions to DHA are not recorded in the portal, so this page cannot show what was sent or when.',
            })}
          </p>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                key: 'dispensed',
                label: t('pharmacy.reports.dispensedPrescriptions', { defaultValue: 'Dispensed prescriptions' }),
                value: formatNumber(dispensedIds, uiLang),
              },
              {
                key: 'controlled',
                label: t('pharmacy.reports.controlledInStock', { defaultValue: 'Controlled items in stock' }),
                value: formatNumber(controlledInStock, uiLang),
              },
              {
                key: 'dha',
                label: t('pharmacy.reports.dhaConnection', { defaultValue: 'DHA connection (from profile)' }),
                value: data?.profile?.dhaConnected
                  ? t('pharmacy.reports.dhaConnected', { defaultValue: 'Connected' })
                  : t('pharmacy.reports.dhaNotConnected', { defaultValue: 'Not connected' }),
              },
            ].map((tile) => (
              <div key={tile.key} className="rounded-xl bg-slate-50 p-3" data-testid={`dha-${tile.key}`}>
                <dt className="mb-1 text-xs text-slate-400">{tile.label}</dt>
                <dd className="font-mono text-sm font-bold text-slate-800">{loading && !data ? '…' : tile.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </OpsShell>
  );
};
