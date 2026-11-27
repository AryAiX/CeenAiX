import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleDollarSign, CreditCard, Download, FileCheck2, ReceiptText } from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue, usePharmacyUnreadMessages } from '../../hooks';
import { dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';
import { PHARMACY_NAV_ITEMS, pharmacyNavCounts } from './navItems';
import { summarizeRevenue, summarizeRevenueByPayer } from './revenue-figures';
import { clinicDateKey, clinicTodayKey, formatClinicDate, formatClinicTime } from '../../lib/clinic-booking-time';
import { downloadCsv } from '../../lib/csv-export';
import { prescriptionReference } from './prescription-status';

interface RevenuePrescription {
  id: string;
  reference: string;
  patientName: string | null;
  medication: string | null;
  prescriptionId: string | null;
  amount: number;
  insurer: string;
  status: 'paid' | 'review' | 'pending' | 'denied';
  submittedAt: string | null;
  paidAt: string | null;
}

/** QA-282: Dubai date and time for the CSV file, e.g. "2026-11-12 14:05". */
const csvClaimMoment = (value: string) => `${clinicDateKey(value)} ${formatClinicTime(value, 'en')}`;

/** QA-281: Dubai date and time, e.g. "12 Nov 2026 · 14:05". */
const formatClaimMoment = (value: string, language: string) =>
  `${formatClinicDate(value, language)} · ${formatClinicTime(value, language)}`;

const formatCurrency = (value: number, language: string) => {
  const locale = resolveLocale(language);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `AED ${formatLocaleDigits(value, language)}`;
  }
};

export const PharmacyRevenue = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const { data, loading, error, refetch } = usePharmacyPrescriptionQueue();
  const unreadMessages = usePharmacyUnreadMessages();
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const [exportError, setExportError] = useState<string | null>(null);
  const rows = useMemo<RevenuePrescription[]>(
    () =>
      (data?.claims ?? []).map((claim) => ({
        id: claim.id,
        reference: claim.externalRef,
        patientName: claim.patientName,
        medication: claim.medication,
        prescriptionId: claim.prescriptionId,
        amount: claim.amountAed,
        insurer: claim.payerName,
        status: claim.status,
        submittedAt: claim.submittedAt,
        paidAt: claim.paidAt,
      })),
    [data?.claims]
  );
  // QA-279: figures by what they say (Dubai dates); see summarizeRevenue.
  const figures = useMemo(
    () => summarizeRevenue(rows.map((row) => ({ amountAed: row.amount, status: row.status, paidAt: row.paidAt })), clinicTodayKey()),
    [rows]
  );
  // QA-280: bars by money (paid, then outstanding); denied claims are not revenue.
  const payers = useMemo(() => summarizeRevenueByPayer(data?.claims ?? []), [data?.claims]);
  const maxPayerTotal = Math.max(...payers.map((payer) => payer.paid + payer.outstanding), 1);
  const pharmacyFallback = t('pharmacy.revenue.fallbackName', { defaultValue: 'Pharmacy' });
  const pharmacyName = data?.profile?.displayName ?? data?.organization?.name ?? pharmacyFallback;
  const todayLabel = new Date().toLocaleDateString(uiLang, dateTimeFormatWithNumerals(uiLang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }));

  return (
    <OpsShell
      title={t('pharmacy.revenue.title', { defaultValue: 'Revenue' })}
      subtitle={t('pharmacy.revenue.subtitle', { defaultValue: 'Claims and dispensing revenue' })}
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
              {t('pharmacy.revenue.heading', { defaultValue: 'Revenue' })}
            </h2>
            <div className="text-[13px] text-slate-400">
              {t('pharmacy.revenue.caption', { defaultValue: 'Claims and payments' })} · {pharmacyName} · {todayLabel}
            </div>
          </div>
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => {
              setExportError(null);
              try {
                // QA-282: the shared CSV helper (Arabic opens correctly in Excel, no formulas can run),
                // with the prescription and the Dubai submitted / paid date and time, and a Dubai file date.
                downloadCsv(`pharmacy-revenue-${clinicTodayKey()}.csv`, [
                  [
                    'claim_reference',
                    'prescription',
                    'patient_name',
                    'medication',
                    'payer',
                    'amount_aed',
                    'status',
                    'submitted_at_dubai',
                    'paid_at_dubai',
                  ],
                  ...rows.map((row) => [
                    row.reference,
                    row.prescriptionId ? prescriptionReference(row.prescriptionId) : '',
                    row.patientName,
                    row.medication,
                    row.insurer,
                    row.amount,
                    row.status,
                    row.submittedAt ? csvClaimMoment(row.submittedAt) : '',
                    row.paidAt ? csvClaimMoment(row.paidAt) : '',
                  ]),
                ]);
              } catch (err) {
                console.warn(`[pharmacy] revenue export failed: ${err instanceof Error ? err.message : String(err)}`);
                setExportError(
                  t('pharmacy.revenue.exportFailed', { defaultValue: 'Could not create the export. Please try again.' })
                );
              }
            }}
            className="flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> {t('pharmacy.revenue.exportReport', { defaultValue: 'Export Revenue Report' })}
          </button>
        </div>

        {exportError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {exportError}
          </div>
        ) : null}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              key: 'paid-today',
              label: t('pharmacy.revenue.kpiPaidToday', { defaultValue: 'Paid Today' }),
              value: formatCurrency(figures.paidToday.amount, uiLang),
              helper: t('pharmacy.revenue.kpiPaidTodayHelper', {
                count: figures.paidToday.count,
                defaultValue: '{{count}} claims paid today',
              }),
              icon: CircleDollarSign,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              key: 'paid-month',
              label: t('pharmacy.revenue.kpiPaidMonth', { defaultValue: 'Paid This Month' }),
              value: formatCurrency(figures.paidThisMonth.amount, uiLang),
              helper: figures.paidThisMonth.count
                ? t('pharmacy.revenue.kpiPaidMonthHelper', {
                    amount: formatCurrency(figures.paidThisMonth.average, uiLang),
                    defaultValue: 'Average paid claim: {{amount}}',
                  })
                : t('pharmacy.revenue.kpiPaidMonthNone', { defaultValue: 'No claims paid this month' }),
              icon: CreditCard,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              key: 'outstanding',
              label: t('pharmacy.revenue.kpiOutstanding', { defaultValue: 'Outstanding' }),
              value: formatCurrency(figures.outstanding.amount, uiLang),
              helper: t('pharmacy.revenue.kpiOutstandingHelper', {
                count: figures.outstanding.count,
                review: formatLocaleDigits(figures.outstanding.inReview, uiLang),
                defaultValue: '{{count}} claims · {{review}} in review',
              }),
              icon: FileCheck2,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            },
            {
              key: 'denied',
              label: t('pharmacy.revenue.kpiDenied', { defaultValue: 'Denied' }),
              value: formatCurrency(figures.denied.amount, uiLang),
              helper: t('pharmacy.revenue.kpiDeniedHelper', {
                count: figures.denied.count,
                defaultValue: '{{count}} claims',
              }),
              icon: ReceiptText,
              color: 'text-red-600',
              bg: 'bg-red-50',
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            // QA-279: plain cards (three of them linked back to this same page).
            return (
              <article
                key={kpi.key}
                aria-label={kpi.label}
                className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${kpi.bg}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} aria-hidden="true" />
                </div>
                <div className={`mb-1 font-mono text-[22px] font-bold ${kpi.color}`}>{loading && !data ? '…' : kpi.value}</div>
                <div className="text-[12px] text-slate-500">{kpi.label}</div>
                <div className="mt-0.5 text-xs text-slate-400">{kpi.helper}</div>
              </article>
            );
          })}
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.35fr]">
          <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[15px] font-bold text-slate-800">
              {t('pharmacy.revenue.byPayerHeading', { defaultValue: 'Revenue By Payer' })}
            </h3>
            <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-500" aria-hidden="true">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                {t('pharmacy.revenue.byPayerPaidLegend', { defaultValue: 'Paid' })}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                {t('pharmacy.revenue.byPayerOutstandingLegend', { defaultValue: 'Outstanding' })}
              </span>
            </div>
            {loading && !data ? (
              <p className="text-sm text-slate-400">…</p>
            ) : payers.length === 0 ? (
              <p className="text-sm text-slate-400">
                {t('pharmacy.revenue.byPayerEmpty', { defaultValue: 'No paid or outstanding claims yet.' })}
              </p>
            ) : (
              <ul className="space-y-3">
                {payers.map((payer) => (
                  <li key={payer.payer} data-testid="payer-row">
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-medium text-slate-600">{payer.payer}</span>
                      <span className="shrink-0 font-mono text-slate-700">
                        <span className="sr-only">{t('pharmacy.revenue.byPayerPaidLegend', { defaultValue: 'Paid' })}: </span>
                        {formatCurrency(payer.paid, uiLang)}
                      </span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                      <div
                        data-testid="payer-bar-paid"
                        className="h-3 bg-emerald-600"
                        style={{ width: `${(payer.paid / maxPayerTotal) * 100}%` }}
                      />
                      <div
                        data-testid="payer-bar-outstanding"
                        className="h-3 bg-amber-300"
                        style={{ width: `${(payer.outstanding / maxPayerTotal) * 100}%` }}
                      />
                    </div>
                    {payer.outstanding > 0 ? (
                      <div className="mt-1 text-[11px] text-slate-400">
                        {t('pharmacy.revenue.byPayerOutstanding', {
                          amount: formatCurrency(payer.outstanding, uiLang),
                          defaultValue: 'Outstanding: {{amount}}',
                        })}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-[15px] font-bold text-slate-800">
                {t('pharmacy.revenue.ledgerHeading', { defaultValue: 'Recent Revenue Ledger' })}
              </h3>
              <div className="text-xs text-slate-400">
                {t('pharmacy.revenue.ledgerSubtitle', { defaultValue: 'Generated from pharmacy_claims records' })}
              </div>
            </div>
            {rows.length === 0 && !loading ? (
              <p className="px-5 py-6 text-sm text-slate-400">
                {t('pharmacy.revenue.ledgerEmpty', { defaultValue: 'No claims yet.' })}
              </p>
            ) : null}
            <ul className="divide-y divide-slate-100">
              {rows.slice(0, visibleCount).map((row) => {
                const open = selectedClaimId === row.id;
                const detailsId = `claim-details-${row.id}`;
                const notRecorded = t('pharmacy.revenue.notRecorded', { defaultValue: 'Not recorded' });
                return (
                  <li key={row.id} data-testid="ledger-row">
                    <div className="grid grid-cols-[minmax(0,1fr)_100px_90px_90px] items-center gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <div
                          className={`truncate text-sm font-semibold ${row.patientName ? 'text-slate-800' : 'italic text-slate-500'}`}
                        >
                          {row.patientName ??
                            t('pharmacy.revenue.notLinked', { defaultValue: 'Not linked to a prescription' })}
                        </div>
                        <div className="truncate text-xs text-slate-400">
                          {row.medication ? `${row.medication} · ${row.insurer}` : row.insurer}
                        </div>
                        {row.submittedAt ? (
                          <div className="truncate text-[11px] text-slate-400">
                            {t('pharmacy.revenue.submittedOn', {
                              date: formatClinicDate(row.submittedAt, uiLang),
                              defaultValue: 'Submitted {{date}}',
                            })}
                          </div>
                        ) : null}
                      </div>
                      <div className="font-mono text-sm font-bold text-slate-800">{formatCurrency(row.amount, uiLang)}</div>
                      <span
                        className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase rtl:tracking-normal ${
                          row.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : row.status === 'review'
                              ? 'bg-amber-50 text-amber-700'
                              : row.status === 'denied'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {t(`pharmacy.revenue.status.${row.status}`, { defaultValue: row.status })}
                      </span>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={detailsId}
                        aria-label={t(open ? 'pharmacy.revenue.hideClaim' : 'pharmacy.revenue.viewClaim', {
                          reference: row.reference,
                          defaultValue: open ? 'Hide claim {{reference}}' : 'View claim {{reference}}',
                        })}
                        onClick={() => setSelectedClaimId((current) => (current === row.id ? null : row.id))}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        {open
                          ? t('pharmacy.revenue.hide', { defaultValue: 'Hide' })
                          : t('pharmacy.revenue.view', { defaultValue: 'View' })}
                      </button>
                    </div>
                    {open ? (
                      // QA-281: the claim's details, right under its row (it used to repeat the row at the bottom).
                      <dl
                        id={detailsId}
                        data-testid="claim-details"
                        className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm sm:grid-cols-2"
                      >
                        {[
                          [t('pharmacy.revenue.detailClaim', { defaultValue: 'Claim reference' }), row.reference],
                          [
                            t('pharmacy.revenue.detailPrescription', { defaultValue: 'Prescription' }),
                            row.prescriptionId
                              ? prescriptionReference(row.prescriptionId)
                              : t('pharmacy.revenue.notLinked', { defaultValue: 'Not linked to a prescription' }),
                          ],
                          [t('pharmacy.revenue.detailPatient', { defaultValue: 'Patient' }), row.patientName ?? notRecorded],
                          [t('pharmacy.revenue.detailMedication', { defaultValue: 'Medicine' }), row.medication ?? notRecorded],
                          [t('pharmacy.revenue.detailPayer', { defaultValue: 'Payer' }), row.insurer],
                          [t('pharmacy.revenue.detailAmount', { defaultValue: 'Amount' }), formatCurrency(row.amount, uiLang)],
                          [
                            t('pharmacy.revenue.detailStatus', { defaultValue: 'Status' }),
                            t(`pharmacy.revenue.status.${row.status}`, { defaultValue: row.status }),
                          ],
                          [
                            t('pharmacy.revenue.detailSubmitted', { defaultValue: 'Submitted' }),
                            row.submittedAt ? formatClaimMoment(row.submittedAt, uiLang) : notRecorded,
                          ],
                          [
                            t('pharmacy.revenue.detailPaid', { defaultValue: 'Paid' }),
                            row.paidAt
                              ? formatClaimMoment(row.paidAt, uiLang)
                              : row.status === 'paid'
                                ? notRecorded
                                : t('pharmacy.revenue.notPaidYet', { defaultValue: 'Not paid' }),
                          ],
                        ].map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs text-slate-400">{label}</dt>
                            <dd className="break-words font-medium text-slate-800">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {rows.length > visibleCount ? (
              <div className="border-t border-slate-100 px-5 py-3 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((current) => current + 8)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  {t('pharmacy.revenue.showMore', {
                    count: rows.length - visibleCount,
                    defaultValue: 'Show more ({{count}} remaining)',
                  })}
                </button>
              </div>
            ) : null}
          </article>
        </section>
      </div>
    </OpsShell>
  );
};
