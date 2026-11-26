import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Download,
  Eye,
  Lock,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue } from '../../hooks';
import type { PharmacyInventoryBatch, PharmacyInventoryDerivedItem } from '../../hooks';
import { formatLocaleDigits } from '../../lib/i18n-ui';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { clinicTodayKey, formatClinicDate } from '../../lib/clinic-booking-time';
import { PHARMACY_NAV_ITEMS } from './navItems';

type FilterType =
  | 'all'
  | 'in_stock'
  | 'low'
  | 'critical'
  | 'out_of_stock'
  | 'expiring_soon'
  | 'expired'
  | 'controlled'
  | 'dha_formulary';

interface InventoryRow {
  id: string;
  sku: string;
  genericName: string;
  brandName: string;
  strength: string;
  form: string;
  /** QA-266: stored values only (no guesses from the medicine name). */
  atcCode: string | null;
  category: string | null;
  stockQty: number;
  unit: string;
  reorderLevel: number;
  /** QA-265: based on usable stock only. */
  stockStatus: 'in_stock' | 'low' | 'critical' | 'out_of_stock';
  /** QA-265: a usable batch expires within 45 days. */
  expiringSoon: boolean;
  /** QA-265: units past their expiry date (not counted in stockQty). */
  expiredQty: number;
  isControlled: boolean;
  isDHAFormulary: boolean;
  batchCount: number;
  /** QA-269: YYYY-MM-DD of the earliest usable batch; shown as a Dubai date with the year. */
  nextExpiryDate: string | null;
  /** QA-267: the real batches, earliest expiry first. */
  batches: PharmacyInventoryBatch[];
}

const filterLabels: Record<FilterType, string> = {
  all: 'All',
  in_stock: 'In Stock',
  low: 'Low Stock',
  critical: 'Critical',
  out_of_stock: 'Out of Stock',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  controlled: 'Controlled',
  dha_formulary: 'DHA Formulary',
};

const stockConfig: Record<
  InventoryRow['stockStatus'],
  { label: string; pill: string; dot: string; row: string }
> = {
  in_stock: {
    label: 'IN STOCK',
    pill: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    row: 'bg-white',
  },
  low: {
    label: 'LOW STOCK',
    pill: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    row: 'bg-amber-50/30',
  },
  critical: {
    label: 'CRITICAL',
    pill: 'bg-orange-50 text-orange-700',
    dot: 'bg-orange-500',
    row: 'bg-orange-50/30',
  },
  out_of_stock: {
    label: 'OUT OF STOCK',
    pill: 'bg-red-50 text-red-700',
    dot: 'bg-red-500',
    row: 'bg-red-50/40',
  },
};

/** QA-265: expiry is shown next to the stock status, not instead of it. */
const EXPIRING_SOON_PILL = 'bg-yellow-50 text-yellow-800';
const EXPIRED_PILL = 'bg-red-100 text-red-800';

const statusForInventory = (item: PharmacyInventoryDerivedItem): InventoryRow['stockStatus'] => {
  if (item.stock <= 0) return 'out_of_stock';
  if (item.stock < item.reorderPoint) {
    return item.stock <= Math.max(1, Math.floor(item.reorderPoint / 2)) ? 'critical' : 'low';
  }
  return 'in_stock';
};

const BATCH_STATE: Record<PharmacyInventoryBatch['state'], { label: string; pill: string }> = {
  usable: { label: 'USABLE', pill: 'bg-emerald-50 text-emerald-700' },
  expiring_soon: { label: 'EXPIRING SOON', pill: 'bg-yellow-50 text-yellow-800' },
  expired: { label: 'EXPIRED', pill: 'bg-red-100 text-red-800' },
  empty: { label: 'EMPTY', pill: 'bg-slate-100 text-slate-500' },
};

/**
 * QA-268: an email draft the pharmacist sends to their supplier (the system has no suppliers).
 * It names the item as the supplier knows it (SKU, brand, strength, form), not by an internal id.
 */
const reorderMailto = (item: InventoryRow) => {
  const product = [item.genericName, item.strength, item.form].filter(Boolean).join(' ');
  const lines = [
    `Medication: ${product}`,
    item.brandName ? `Brand: ${item.brandName}` : null,
    `SKU: ${item.sku}`,
    `Usable stock: ${item.stockQty} ${item.unit}`,
    `Reorder level: ${item.reorderLevel} ${item.unit}`,
    '',
    'Please arrange a reorder.',
  ].filter((line): line is string => line !== null);
  return `mailto:?subject=${encodeURIComponent(`Reorder request: ${product}`)}&body=${encodeURIComponent(lines.join('\n'))}`;
};

const formatNumber = (value: number | null | undefined, language: string) =>
  typeof value === 'number' ? formatLocaleDigits(value, language) : '—';

const toInventoryRows = (items: PharmacyInventoryDerivedItem[]): InventoryRow[] =>
  items.map((item) => {
    const genericName = item.genericName || item.name;
    const strength = item.strength ?? '';
    const stockStatus = statusForInventory(item);

    return {
      id: item.id,
      sku: item.sku,
      genericName,
      // QA-266: no brand is shown as no brand (it used to repeat the generic name).
      brandName: item.brandName?.trim() ?? '',
      strength,
      form: item.dosageForm,
      atcCode: item.atcCode?.trim() || null,
      category: item.category?.trim() || null,
      stockQty: item.stock,
      unit: item.unit,
      reorderLevel: item.reorderPoint,
      stockStatus,
      expiringSoon: item.expiringSoon,
      expiredQty: item.expiredStock,
      isControlled: item.isControlled,
      isDHAFormulary: item.isDHAFormulary,
      batchCount: item.batchCount,
      nextExpiryDate: item.nextExpiryDate,
      batches: item.batches,
    };
  });

export const PharmacyInventory = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const { data, loading, error, refetch } = usePharmacyPrescriptionQueue();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSearch(id);
    }
  }, [searchParams]);
  const [exportError, setExportError] = useState<string | null>(null);
  const rows = useMemo(() => toInventoryRows(data?.inventory ?? []), [data?.inventory]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      in_stock: rows.filter((item) => item.stockStatus === 'in_stock').length,
      low: rows.filter((item) => item.stockStatus === 'low').length,
      critical: rows.filter((item) => item.stockStatus === 'critical').length,
      out_of_stock: rows.filter((item) => item.stockStatus === 'out_of_stock').length,
      expiring_soon: rows.filter((item) => item.expiringSoon).length,
      expired: rows.filter((item) => item.expiredQty > 0).length,
      controlled: rows.filter((item) => item.isControlled).length,
      dha_formulary: rows.filter((item) => item.isDHAFormulary).length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesSearch =
        !query ||
        item.id.toLowerCase().includes(query) ||
        item.genericName.toLowerCase().includes(query) ||
        item.brandName.toLowerCase().includes(query) ||
        (item.atcCode ?? '').toLowerCase().includes(query) ||
        (item.category ?? '').toLowerCase().includes(query);
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'controlled'
            ? item.isControlled
            : filter === 'dha_formulary'
              ? item.isDHAFormulary
              : filter === 'expiring_soon'
                ? item.expiringSoon
                : filter === 'expired'
                  ? item.expiredQty > 0
                  : item.stockStatus === filter;

      return matchesSearch && matchesFilter;
    });
  }, [filter, rows, search]);

  const lowOrCritical = counts.low + counts.critical;

  return (
    <OpsShell
      title={t('pharmacy.inventory.title')}
      subtitle={t('pharmacy.inventory.subtitle')}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, {
        prescriptions: data?.pendingPrescriptions || undefined,
        inventory: data?.lowStockAlerts || undefined,
      })}
      accent="emerald"
      variant="pharmacy"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />
        <div className="flex min-h-full flex-col overflow-y-auto bg-slate-50">
        <div className="mx-6 mb-4 mt-5 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-slate-900">Inventory Management</h2>
            <div className="text-[13px] text-slate-400">
              Stock levels ·{' '}
              {data?.profile?.displayName ??
                data?.organization?.name ??
                t('pharmacy.reports.fallbackName', { defaultValue: 'Pharmacy' })}{' '}
              · {formatClinicDate(clinicTodayKey(), uiLang)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setExportError(null);
                try {
                  const header = ['id', 'generic_name', 'brand_name', 'stock_qty', 'reorder_level', 'stock_status', 'next_expiry'];
                  const escape = (v: string | number | null | undefined) => {
                    if (v === null || v === undefined) return '';
                    const s = String(v);
                    return s.includes(',') || s.includes('"') || s.includes('\n')
                      ? `"${s.replace(/"/g, '""')}"`
                      : s;
                  };
                  const body = [
                    header,
                    ...rows.map((row) => [
                      row.id,
                      row.genericName,
                      row.brandName,
                      row.stockQty,
                      row.reorderLevel,
                      row.stockStatus,
                      row.nextExpiryDate,
                    ]),
                  ]
                    .map((line) => line.map(escape).join(','))
                    .join('\n');
                  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  // QA-269: today's date in Dubai, not in UTC.
                  link.download = `pharmacy-inventory-${clinicTodayKey()}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                } catch (err) {
                  setExportError(err instanceof Error ? err.message : 'Export failed.');
                }
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export Stock Report
            </button>
          </div>
        </div>

        {/* QA-268: there is no stock receiving in the portal yet; "Receive Stock" only opened Messages. */}
        <p role="note" className="mx-6 mb-3 text-[12px] text-slate-500">
          Stock and batches are updated by a CeenAiX administrator. Use "Email reorder" to send a reorder request to your supplier.
        </p>

        {exportError ? (
          <div className="mx-6 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {exportError}
          </div>
        ) : null}

        <section className="mx-6 mb-4 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total SKUs', value: rows.length, color: 'text-slate-700', bg: 'bg-slate-50', filterKey: 'all' },
            { label: 'In Stock', value: counts.in_stock, color: 'text-emerald-600', bg: 'bg-emerald-50', filterKey: 'in_stock' },
            { label: 'Low / Critical', value: lowOrCritical, color: 'text-amber-600', bg: 'bg-amber-50', filterKey: 'low' },
            { label: 'Out of Stock', value: counts.out_of_stock, color: 'text-red-700', bg: 'bg-red-50', filterKey: 'out_of_stock' },
            { label: 'Expiring Soon', value: counts.expiring_soon, color: 'text-yellow-800', bg: 'bg-yellow-50', filterKey: 'expiring_soon' },
            // QA-265: items with expired units still on the shelf.
            { label: 'Expired Stock', value: counts.expired, color: 'text-red-800', bg: 'bg-red-50', filterKey: 'expired' },
          ].map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => setFilter(stat.filterKey as FilterType)}
              className={`rounded-xl border px-4 py-3 shadow-sm text-left transition-all cursor-pointer hover:ring-2 hover:ring-emerald-300 ${stat.bg} ${
                filter === stat.filterKey ? 'ring-2 ring-emerald-500 border-emerald-300' : 'border-slate-100'
              }`}
            >
              <div className={`font-mono text-[22px] font-bold ${stat.color}`}>
                {loading ? '…' : formatNumber(stat.value, uiLang)}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">{stat.label}</div>
            </button>
          ))}
        </section>

        <div className="mx-6 mb-4 flex shrink-0 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={search}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('pharmacy.inventory.searchPh', {
                defaultValue: 'Drug name, brand, ATC code, category...',
              })}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 transition-colors focus:border-emerald-400 focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(filterLabels) as FilterType[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilter(key);
                  setSearch('');
                }}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  filter === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filterLabels[key]} ({formatNumber(counts[key], uiLang)})
              </button>
            ))}
          </div>
        </div>

        <section className="mx-6 mb-6 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[1120px]">
              {loading ? <div className="py-12 text-center text-sm text-slate-400">Loading inventory...</div> : null}

              {!loading && filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No items match your search</div>
              ) : null}

              {filtered.map((item, index) => {
                const cfg = stockConfig[item.stockStatus];
                const stockPct =
                  item.reorderLevel > 0
                    ? Math.min(100, (item.stockQty / Math.max(item.reorderLevel * 3, 1)) * 100)
                    : 100;
                const isBatchOpen = expandedBatchId === item.id;

                return (
                  <Fragment key={item.id}>
                    <div
                      className={`grid min-h-16 grid-cols-[2fr_1fr_1fr_100px_160px_160px] items-center border-b border-[#F8FAFC] border-l-4 px-5 py-3.5 transition-colors hover:bg-emerald-50 ${cfg.row} ${index === filtered.length - 1 && !isBatchOpen ? 'border-b-0' : ''}`}
                      style={{
                        borderLeftColor:
                          item.stockStatus === 'out_of_stock'
                            ? '#EF4444'
                            : item.stockStatus === 'critical'
                                ? '#F97316'
                                : item.stockStatus === 'low'
                                  ? '#F59E0B'
                                  : '#22C55E',
                      }}
                    >
                    <div className="pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-800">
                          {item.genericName} {item.strength}
                        </span>
                        {item.isControlled ? (
                          <span className="flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] text-violet-700">
                            <Lock className="h-2 w-2" /> CS
                          </span>
                        ) : null}
                        {item.isDHAFormulary ? (
                          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] text-emerald-700">
                            DHA formulary
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {[item.brandName, item.form, item.atcCode].filter(Boolean).join(' · ')}
                      </div>
                      {item.expiredQty > 0 ? (
                        <div role="note" className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-red-800">
                          <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                          {formatNumber(item.expiredQty, uiLang)} {item.unit} expired · not counted in stock · remove from the shelf
                        </div>
                      ) : null}
                    </div>

                    <div className={`text-xs ${item.category ? 'text-slate-500' : 'text-slate-300'}`}>{item.category ?? '—'}</div>

                    <div>
                      <div
                        className={`font-mono text-[15px] font-bold ${
                          item.stockStatus === 'out_of_stock'
                            ? 'text-red-700'
                            : item.stockStatus === 'low' || item.stockStatus === 'critical'
                              ? 'text-amber-700'
                              : 'text-slate-800'
                        }`}
                      >
                        {formatNumber(item.stockQty, uiLang)}{' '}
                        <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-200">
                        <div
                          className={`h-1.5 rounded-full ${cfg.dot}`}
                          style={{ width: `${stockPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="font-mono text-[12px] text-slate-500">
                      {formatNumber(item.reorderLevel, uiLang)} {item.unit}
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-1">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.pill}`}>
                          {cfg.label}
                        </span>
                        {item.expiringSoon ? (
                          <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${EXPIRING_SOON_PILL}`}>
                            EXPIRING SOON
                          </span>
                        ) : null}
                        {item.expiredQty > 0 ? (
                          <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${EXPIRED_PILL}`}>
                            EXPIRED STOCK
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 font-mono text-[9px] text-slate-400">
                        {item.nextExpiryDate
                          ? formatClinicDate(item.nextExpiryDate, uiLang)
                          : `${item.batchCount} batch${item.batchCount === 1 ? '' : 'es'}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBatchId((current) => (current === item.id ? null : item.id))
                        }
                        aria-expanded={isBatchOpen}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                          isBatchOpen
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Eye className="h-3 w-3" />
                        Batches
                      </button>
                      <a
                        href={reorderMailto(item)}
                        title="Opens an email draft to send to your supplier"
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700"
                      >
                        <ShoppingCart className="h-3 w-3" aria-hidden="true" />
                        Email reorder
                      </a>
                    </div>
                  </div>
                    {isBatchOpen ? (
                      <div className="border-b border-[#F8FAFC] bg-slate-50 px-5 py-4">
                        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">On-hand batches</div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                            <div className="text-[10px] text-slate-400">Current Stock</div>
                            <div className="font-mono text-[15px] font-bold text-slate-800">
                              {formatNumber(item.stockQty, uiLang)} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                            </div>
                          </div>
                          <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                            <div className="text-[10px] text-slate-400">Reorder Level</div>
                            <div className="font-mono text-[15px] font-bold text-slate-800">
                              {formatNumber(item.reorderLevel, uiLang)} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                            </div>
                          </div>
                          <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                            <div className="text-[10px] text-slate-400">Batches</div>
                            <div className="font-mono text-[15px] font-bold text-slate-800">
                              {item.batchCount} <span className="text-[10px] font-normal text-slate-400">batch{item.batchCount === 1 ? '' : 'es'}</span>
                            </div>
                          </div>
                          <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                            <div className="text-[10px] text-slate-400">Next Expiry</div>
                            <div className="font-mono text-[15px] font-bold text-slate-800">
                              {item.nextExpiryDate ? formatClinicDate(item.nextExpiryDate, uiLang) : '—'}
                            </div>
                          </div>
                        </div>
                        {/* QA-267: the batches themselves, earliest expiry first (use that one first). */}
                        {item.batches.length === 0 ? (
                          <p className="mt-3 text-[12px] text-slate-400">No batches recorded for this item.</p>
                        ) : (
                          <table className="mt-3 w-full overflow-hidden rounded-lg bg-white text-start text-[12px] shadow-sm">
                            <caption className="sr-only">Batches of {item.genericName} {item.strength}</caption>
                            <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-start font-semibold">Batch</th>
                                <th scope="col" className="px-3 py-2 text-start font-semibold">Quantity</th>
                                <th scope="col" className="px-3 py-2 text-start font-semibold">Expiry</th>
                                <th scope="col" className="px-3 py-2 text-start font-semibold">Received</th>
                                <th scope="col" className="px-3 py-2 text-start font-semibold">State</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.batches.map((batch) => (
                                <tr key={batch.id} className="border-t border-slate-100">
                                  <td className="px-3 py-2 font-mono text-slate-700">{batch.batchNumber}</td>
                                  <td className="px-3 py-2 font-mono text-slate-700">
                                    {formatNumber(batch.quantity, uiLang)} {item.unit}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-slate-700">
                                    {batch.expiryDate ? formatClinicDate(batch.expiryDate, uiLang) : '—'}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-slate-500">
                                    {batch.receivedAt ? formatClinicDate(batch.receivedAt, uiLang) : '—'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${BATCH_STATE[batch.state].pill}`}>
                                      {BATCH_STATE[batch.state].label}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ) : null}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </OpsShell>
  );
};
