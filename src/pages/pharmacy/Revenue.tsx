import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleDollarSign, CreditCard, Download, FileCheck2, ReceiptText } from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue } from '../../hooks';
import { dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';
import { PHARMACY_NAV_ITEMS } from './navItems';

interface RevenuePrescription {
  id: string;
  patientName: string;
  medication: string;
  amount: number;
  insurer: string;
  status: 'paid' | 'review' | 'pending' | 'denied';
}

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
  const { data, loading } = usePharmacyPrescriptionQueue();
  const rows = useMemo<RevenuePrescription[]>(
    () =>
      (data?.claims ?? []).map((claim) => ({
        id: claim.externalRef,
        patientName: claim.patientName,
        medication: claim.medication,
        amount: claim.amountAed,
        insurer: claim.payerName,
        status: claim.status,
      })),
    [data?.claims]
  );
  const paid = rows.filter((item) => item.status === 'paid');
  const review = rows.filter((item) => item.status === 'review');
  const pending = rows.filter((item) => item.status === 'pending');
  const revenueToday = paid.reduce((sum, item) => sum + item.amount, 0);
  const projected = rows.reduce((sum, item) => sum + item.amount, 0);
  const averageRx = rows.length ? Math.round(projected / rows.length) : 0;
  const insurers = Array.from(new Set(rows.map((row) => row.insurer)));
  const maxChannel = Math.max(...insurers.map((insurer) => rows.filter((item) => item.insurer === insurer).length), 1);
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
              {t('pharmacy.revenue.heading', { defaultValue: 'Revenue' })}
            </h2>
            <div className="text-[13px] text-slate-400">
              {t('pharmacy.revenue.caption', { defaultValue: 'Claims and payments' })} · {pharmacyName} · {todayLabel}
            </div>
          </div>
          <button
            type="button"
            className="flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" /> {t('pharmacy.revenue.exportReport', { defaultValue: 'Export Revenue Report' })}
          </button>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: t('pharmacy.revenue.kpiToday', { defaultValue: 'Revenue Today' }),
              value: formatCurrency(revenueToday, uiLang),
              helper: t('pharmacy.revenue.kpiTodayHelper', {
                count: paid.length,
                defaultValue: `${paid.length} paid prescriptions`,
              }),
              icon: CircleDollarSign,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              label: t('pharmacy.revenue.kpiProjected', { defaultValue: 'Projected Queue Value' }),
              value: formatCurrency(projected, uiLang),
              helper: t('pharmacy.revenue.kpiProjectedHelper', {
                count: rows.length,
                defaultValue: `${rows.length} total prescriptions`,
              }),
              icon: ReceiptText,
              color: 'text-teal-600',
              bg: 'bg-teal-50',
            },
            {
              label: t('pharmacy.revenue.kpiReview', { defaultValue: 'Claims In Review' }),
              value: loading ? '...' : formatLocaleDigits(review.length, uiLang),
              helper: t('pharmacy.revenue.kpiReviewHelper', { defaultValue: 'Insurance follow-up needed' }),
              icon: FileCheck2,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            },
            {
              label: t('pharmacy.revenue.kpiAvg', { defaultValue: 'Average Rx Value' }),
              value: formatCurrency(averageRx, uiLang),
              helper: t('pharmacy.revenue.kpiAvgHelper', {
                count: pending.length,
                defaultValue: `${pending.length} pending payment`,
              }),
              icon: CreditCard,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <article key={kpi.label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${kpi.bg}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div className={`mb-1 font-mono text-[22px] font-bold ${kpi.color}`}>{loading ? '...' : kpi.value}</div>
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
            <div className="space-y-3">
              {insurers.map((insurer) => {
                const count = rows.filter((item) => item.insurer === insurer).length;
                const amount = rows
                  .filter((item) => item.insurer === insurer)
                  .reduce((sum, item) => sum + item.amount, 0);
                return (
                  <div key={insurer}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">{insurer}</span>
                      <span className="font-mono text-slate-500">
                        {loading ? '...' : formatCurrency(amount, uiLang)}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className="h-3 rounded-full bg-emerald-600" style={{ width: `${(count / maxChannel) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
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
            <div className="divide-y divide-slate-100">
              {rows.slice(0, 8).map((row) => (
                <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_100px_90px_90px] items-center gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">{row.patientName}</div>
                    <div className="truncate text-xs text-slate-400">
                      {row.medication} · {row.insurer}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-800">{formatCurrency(row.amount, uiLang)}</div>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      row.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700'
                        : row.status === 'review'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {t(`pharmacy.revenue.status.${row.status}`, { defaultValue: row.status })}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    {t('pharmacy.revenue.view', { defaultValue: 'View' })}
                  </button>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </OpsShell>
  );
};
