import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, PackageCheck, PauseCircle, ShieldCheck, TrendingUp } from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue, usePharmacyUnreadMessages } from '../../hooks';
import { formatLocaleDigits } from '../../lib/i18n-ui';
import { PHARMACY_NAV_ITEMS, pharmacyNavCounts } from './navItems';
import { summarizeInventoryRisk } from './inventory-status';
import { clinicDateKey, clinicTodayKey, formatClinicTime } from '../../lib/clinic-booking-time';
import { downloadCsv } from '../../lib/csv-export';
import { useIsPhone } from '../../hooks/use-is-phone';
import { prescriptionReference } from './prescription-status';
import {
  formatReportMonth,
  groupReportPrescriptions,
  isDispensedStatus,
  summarizeApproval,
  summarizeMonth,
  topDispensedMedicines,
} from './report-figures';

const formatNumber = (value: number, language: string) => formatLocaleDigits(value, language);


export const PharmacyReports = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const { data, loading, error, refetch } = usePharmacyPrescriptionQueue();
  const unreadMessages = usePharmacyUnreadMessages();
  const isPhone = useIsPhone();
  const queue = useMemo(() => data?.queue ?? [], [data?.queue]);

  // QA-286: prescriptions with the same status as on Dispensing; "this month" is the Dubai month received.
  const prescriptions = useMemo(() => groupReportPrescriptions(queue), [queue]);
  const dispensedIds = prescriptions.filter((prescription) => isDispensedStatus(prescription.status)).length;
  const monthKey = clinicTodayKey().slice(0, 7);
  const month = useMemo(() => summarizeMonth(prescriptions, monthKey), [prescriptions, monthKey]);
  const approval = useMemo(() => summarizeApproval(data?.claims ?? []), [data?.claims]);
  const monthLabel = formatReportMonth(monthKey, uiLang);

  // QA-287: dispensed medicines of this month's prescriptions only.
  const topDrugs = useMemo(() => topDispensedMedicines(prescriptions, monthKey), [prescriptions, monthKey]);

  const maxDrugCount = Math.max(...topDrugs.map((item) => item.count), 1);
  const risk = useMemo(() => summarizeInventoryRisk(data?.inventory ?? []), [data?.inventory]);
  // QA-285: the real "controlled" flag (the old card counted items named warfarin).
  const controlledInStock = (data?.inventory ?? []).filter((item) => item.isControlled && item.stock > 0).length;
  // QA-285: only a real licence number (it used to fall back to the organization's free-text notes).
  const licenseNumber = data?.profile?.licenseNumber?.trim() || null;
  const pharmacyFallback = t('pharmacy.reports.fallbackName', { defaultValue: 'Pharmacy' });
  const pharmacyName = data?.profile?.displayName ?? data?.organization?.name ?? pharmacyFallback;

  const waiting = loading && !data;
  // QA-289: the medicine lines of this month's prescriptions, for the dispensing file.
  const monthLines = useMemo(
    () => prescriptions.filter((prescription) => prescription.monthKey === monthKey).flatMap((prescription) => prescription.items),
    [prescriptions, monthKey]
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const runExport = (build: () => void) => {
    setExportError(null);
    try {
      build();
    } catch (err) {
      console.warn(`[pharmacy] reports export failed: ${err instanceof Error ? err.message : String(err)}`);
      setExportError(t('pharmacy.reports.exportFailed', { defaultValue: 'Could not create the export. Please try again.' }));
    }
  };
  const kpis = [
    {
      key: 'received',
      label: t('pharmacy.reports.kpiReceived', { defaultValue: 'Prescriptions this month' }),
      value: waiting ? '…' : formatNumber(month.received, uiLang),
      helper: t('pharmacy.reports.kpiReceivedHelper', { month: monthLabel, defaultValue: 'Received in {{month}}' }),
      icon: FileText,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      key: 'dispensed',
      label: t('pharmacy.reports.kpiDispensed', { defaultValue: 'Dispensed' }),
      value: waiting ? '…' : formatNumber(month.dispensed, uiLang),
      helper: t('pharmacy.reports.kpiOfThisMonth', { defaultValue: 'Of the prescriptions received this month' }),
      icon: PackageCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      key: 'on-hold',
      label: t('pharmacy.reports.kpiOnHold', { defaultValue: 'On hold' }),
      value: waiting ? '…' : formatNumber(month.onHold, uiLang),
      helper: t('pharmacy.reports.kpiOfThisMonth', { defaultValue: 'Of the prescriptions received this month' }),
      icon: PauseCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      key: 'approval',
      label: t('pharmacy.reports.kpiApproval', { defaultValue: 'Insurance approval rate' }),
      value: waiting
        ? '…'
        : approval.percent === null
          ? '—'
          : t('pharmacy.reports.percent', { value: formatLocaleDigits(approval.percent, uiLang), defaultValue: '{{value}}%' }),
      helper:
        approval.percent === null
          ? t('pharmacy.reports.kpiApprovalNone', { defaultValue: 'No decided claims yet' })
          : t('pharmacy.reports.kpiApprovalHelper', {
              paid: formatNumber(approval.paid, uiLang),
              denied: formatNumber(approval.denied, uiLang),
              defaultValue: 'All claims: {{paid}} paid · {{denied}} denied',
            }),
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ];

  return (
    <OpsShell
      title={t('pharmacy.reports.title', { defaultValue: 'Reports' })}
      subtitle={t('pharmacy.reports.pageCaption', {
        // QA-290: the Dubai month (it was the browser's month), once, in the top bar.
        month: monthLabel,
        pharmacy: pharmacyName,
        defaultValue: '{{month}} · {{pharmacy}}',
      })}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, pharmacyNavCounts(data, unreadMessages))}
      accent="emerald"
      variant="pharmacy"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />
      <div className="min-h-full bg-slate-50 p-4 sm:p-6">
        {/* QA-290: the title and caption are in the top bar only (they were shown twice). */}
        <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap gap-2">
            {/* QA-289: both files through the shared CSV helper (Arabic opens correctly in Excel, no
                formulas can run), for this Dubai month, with Dubai dates. The second one used to be an
                English .txt called "DHA Monthly Report" although nothing is sent to DHA. */}
            <button
              type="button"
              disabled={monthLines.length === 0}
              onClick={() =>
                runExport(() =>
                  downloadCsv(`pharmacy-dispensing-${monthKey}.csv`, [
                    ['prescription', 'medicine', 'patient_name', 'prescriber', 'status', 'received_at_dubai', 'priority'],
                    ...monthLines.map((item) => [
                      prescriptionReference(item.prescriptionId),
                      item.medication,
                      item.patientName,
                      item.prescriber,
                      item.workflowStatus,
                      `${clinicDateKey(item.receivedAt)} ${formatClinicTime(item.receivedAt, 'en')}`,
                      item.priority,
                    ]),
                  ])
                )
              }
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />{' '}
              {t('pharmacy.reports.exportMonthLedger', { defaultValue: 'Export This Month’s Dispensing' })}
            </button>
            <button
              type="button"
              onClick={() =>
                runExport(() =>
                  downloadCsv(`pharmacy-monthly-summary-${monthKey}.csv`, [
                    ['item', 'value'],
                    ['month', monthKey],
                    ['pharmacy', pharmacyName],
                    ['licence_number', licenseNumber ?? ''],
                    ['prescriptions_received', month.received],
                    ['dispensed_or_picked_up', month.dispensed],
                    ['new_or_in_progress', month.open],
                    ['on_hold', month.onHold],
                    ['cancelled', month.cancelled],
                    ['controlled_items_in_stock', controlledInStock],
                    ['claims_paid_all_time', approval.paid],
                    ['claims_denied_all_time', approval.denied],
                    ['insurance_approval_rate_percent', approval.percent ?? ''],
                    ['note', 'Summary from the CeenAiX portal. Not a DHA submission.'],
                  ])
                )
              }
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" aria-hidden="true" />{' '}
              {t('pharmacy.reports.monthlySummary', { defaultValue: 'Monthly Summary (CSV)' })}
            </button>
          </div>
        </div>

        {exportError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {exportError}
          </div>
        ) : null}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            // QA-286: plain cards (they were links to other pages).
            return (
              <article
                key={kpi.key}
                aria-label={kpi.label}
                className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${kpi.bg}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} aria-hidden="true" />
                </div>
                <div className={`mb-1 font-mono text-[22px] font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[12px] text-slate-500">{kpi.label}</div>
                <div className="mt-0.5 text-xs text-slate-400">{kpi.helper}</div>
              </article>
            );
          })}
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-[15px] font-bold text-slate-800">
              {t('pharmacy.reports.statusHeading', { defaultValue: 'Prescriptions This Month by Status' })}
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              {t('pharmacy.reports.kpiReceivedHelper', { month: monthLabel, defaultValue: 'Received in {{month}}' })}
            </p>
            {/* QA-287: only this month's prescriptions, on one scale (claims were mixed in before, and
                "In queue" included cancelled prescriptions). */}
            <ul className="space-y-3">
              {[
                {
                  key: 'dispensed',
                  label: t('pharmacy.reports.statusDispensed', { defaultValue: 'Dispensed or picked up' }),
                  value: month.dispensed,
                  color: 'bg-emerald-500',
                },
                {
                  key: 'open',
                  label: t('pharmacy.reports.statusOpen', { defaultValue: 'New or in progress' }),
                  value: month.open,
                  color: 'bg-blue-500',
                },
                {
                  key: 'on-hold',
                  label: t('pharmacy.reports.kpiOnHold', { defaultValue: 'On hold' }),
                  value: month.onHold,
                  color: 'bg-amber-500',
                },
                {
                  key: 'cancelled',
                  label: t('pharmacy.reports.statusCancelled', { defaultValue: 'Cancelled' }),
                  value: month.cancelled,
                  color: 'bg-slate-400',
                },
              ].map((item) => (
                <li key={item.key} data-testid={`status-${item.key}`}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{item.label}</span>
                    <span className="font-mono text-slate-500">{loading && !data ? '…' : formatNumber(item.value, uiLang)}</span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div
                      data-testid={`status-bar-${item.key}`}
                      className={`h-3 rounded-full ${item.color}`}
                      style={{ width: `${(item.value / Math.max(month.received, 1)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[15px] font-bold text-slate-800">
              {t('pharmacy.reports.riskHeading', { defaultValue: 'Inventory Risk Breakdown' })}
            </h3>
            {/* QA-288: the same counts and names as the Inventory figures. */}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                {
                  key: 'in-stock',
                  label: t('pharmacy.inventory.kpi.inStock', { defaultValue: 'In Stock' }),
                  value: risk.inStock,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
                {
                  key: 'low',
                  label: t('pharmacy.inventory.kpi.lowCritical', { defaultValue: 'Low / Critical' }),
                  value: risk.lowOrCritical,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                },
                {
                  key: 'out',
                  label: t('pharmacy.inventory.kpi.out', { defaultValue: 'Out of Stock' }),
                  value: risk.outOfStock,
                  color: 'text-red-700',
                  bg: 'bg-red-50',
                },
                {
                  key: 'expiring',
                  label: t('pharmacy.inventory.kpi.expiring', { defaultValue: 'Expiring Soon' }),
                  value: risk.expiringSoon,
                  color: 'text-yellow-800',
                  bg: 'bg-yellow-50',
                },
                {
                  key: 'expired',
                  label: t('pharmacy.inventory.kpi.expired', { defaultValue: 'Expired Stock' }),
                  value: risk.expired,
                  color: 'text-red-800',
                  bg: 'bg-red-50',
                },
              ].map((tile) => (
                // Label first for screen readers; the number is shown on top.
                <div
                  key={tile.key}
                  className={`flex flex-col-reverse rounded-xl p-4 ${tile.bg}`}
                  data-testid={`risk-${tile.key}`}
                >
                  <dt className="text-xs text-slate-500">{tile.label}</dt>
                  <dd className={`font-mono text-2xl font-bold ${tile.color}`}>
                    {loading && !data ? '…' : formatNumber(tile.value, uiLang)}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        <section className="mb-5 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-[15px] font-bold text-slate-800">
            {t('pharmacy.reports.topMedicinesHeading', { defaultValue: 'Top Dispensed Medicines This Month' })}
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            {t('pharmacy.reports.topMedicinesCaption', {
              defaultValue: 'Times dispensed, from the prescriptions received this month',
            })}
          </p>
          {topDrugs.length === 0 && !(loading && !data) ? (
            <p className="text-sm text-slate-400">
              {t('pharmacy.reports.topMedicinesEmpty', { defaultValue: 'No medicines dispensed this month yet.' })}
            </p>
          ) : (
            <ul className="space-y-3">
              {topDrugs.map((item) => {
                const bar = (
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(item.count / maxDrugCount) * 100}%` }} />
                  </div>
                );
                const count = (
                  <div className="shrink-0 text-end font-mono text-xs font-bold text-slate-600">{formatNumber(item.count, uiLang)}</div>
                );
                // QA-290: on a phone, the name and count on one line and the bar under them (the
                // 140 px name column cut most names off).
                return isPhone ? (
                  <li key={item.medicine} data-testid="top-medicine" className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 break-words text-xs font-medium text-slate-600">{item.medicine}</div>
                      {count}
                    </div>
                    {bar}
                  </li>
                ) : (
                  <li
                    key={item.medicine}
                    data-testid="top-medicine"
                    className="grid grid-cols-[180px_minmax(0,1fr)_48px] items-center gap-3"
                  >
                    <div className="truncate text-xs font-medium text-slate-600" title={item.medicine}>
                      {item.medicine}
                    </div>
                    {bar}
                    {count}
                  </li>
                );
              })}
            </ul>
          )}
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
