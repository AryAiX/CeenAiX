import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Download,
  Eye,
  Lock,
  Plus,
  Search,
  ShoppingCart,
} from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue } from '../../hooks';
import type { PharmacyInventoryDerivedItem } from '../../hooks';
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
  genericName: string;
  brandName: string;
  strength: string;
  form: string;
  atcCode: string;
  category: string;
  stockQty: number;
  unit: string;
  reorderLevel: number;
  daysSupply: number | null;
  stockStatus: Exclude<FilterType, 'all' | 'controlled' | 'dha_formulary'>;
  isControlled: boolean;
  isDHAFormulary: boolean;
  affectedPrescriptions: string[];
  batchCount: number;
  nextExpiry: string | null;
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
  expiring_soon: {
    label: 'EXPIRING SOON',
    pill: 'bg-yellow-50 text-yellow-800',
    dot: 'bg-yellow-500',
    row: 'bg-yellow-50/40',
  },
  expired: {
    label: 'EXPIRED',
    pill: 'bg-slate-100 text-slate-500',
    dot: 'bg-slate-400',
    row: 'bg-slate-50',
  },
};

const categoryForMedication = (name: string) => {
  if (/atorvastatin|rosuvastatin/i.test(name)) return 'Statin';
  if (/metformin/i.test(name)) return 'Biguanide';
  if (/bisoprolol/i.test(name)) return 'Beta Blocker';
  if (/warfarin|aspirin/i.test(name)) return 'Anticoagulant';
  if (/furosemide|spironolactone/i.test(name)) return 'Diuretic';
  if (/amlodipine/i.test(name)) return 'Calcium Channel Blocker';
  if (/losartan/i.test(name)) return 'ARB';
  if (/omeprazole/i.test(name)) return 'PPI';
  return 'General';
};

const atcForMedication = (name: string) => {
  if (/atorvastatin/i.test(name)) return 'C10AA05';
  if (/metformin/i.test(name)) return 'A10BA02';
  if (/bisoprolol/i.test(name)) return 'C07AB07';
  if (/warfarin/i.test(name)) return 'B01AA03';
  if (/furosemide/i.test(name)) return 'C03CA01';
  if (/spironolactone/i.test(name)) return 'C03DA01';
  if (/amlodipine/i.test(name)) return 'C08CA01';
  if (/losartan/i.test(name)) return 'C09CA01';
  if (/rosuvastatin/i.test(name)) return 'C10AA07';
  if (/aspirin/i.test(name)) return 'B01AC06';
  return 'RX-CUSTOM';
};

const strengthForMedication = (name: string) => {
  const match = name.match(/\b\d+\s?(?:mg|iu|mcg|g)\b/i);
  return match?.[0] ?? '';
};

const cleanMedicationName = (name: string) => name.replace(/\s+\d+\s?(?:mg|iu|mcg|g)\b/i, '').trim();

const statusForInventory = (item: PharmacyInventoryDerivedItem): InventoryRow['stockStatus'] => {
  if (item.status === 'out') return 'out_of_stock';
  if (item.status === 'near_expiry') return 'expiring_soon';
  if (item.status === 'low') return item.stock <= Math.max(1, Math.floor(item.reorderPoint / 2)) ? 'critical' : 'low';
  return 'in_stock';
};

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

const toInventoryRows = (items: PharmacyInventoryDerivedItem[]): InventoryRow[] =>
  items.map((item) => {
    const genericName = item.genericName || cleanMedicationName(item.name);
    const strength = item.strength ?? strengthForMedication(item.name);
    const stockStatus = statusForInventory(item);
    const daysSupply =
      item.stock <= 0 ? 0 : stockStatus === 'in_stock' ? Math.max(7, Math.round(item.stock / 2)) : Math.max(1, Math.round(item.stock / 3));

    return {
      id: item.id,
      genericName,
      brandName: item.brandName || genericName,
      strength,
      form: item.dosageForm || 'Tablets',
      atcCode: item.atcCode ?? atcForMedication(genericName),
      category: item.category ?? categoryForMedication(genericName),
      stockQty: item.stock,
      unit: item.unit,
      reorderLevel: item.reorderPoint,
      daysSupply,
      stockStatus,
      isControlled: item.isControlled,
      isDHAFormulary: item.isDHAFormulary,
      affectedPrescriptions: stockStatus === 'out_of_stock' ? ['1 prescription on hold'] : [],
      batchCount: item.batchCount,
      nextExpiry: item.expiryMonth,
    };
  });

export const PharmacyInventory = () => {
  const { t } = useTranslation('common');
  const { data, loading } = usePharmacyPrescriptionQueue();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const rows = useMemo(() => toInventoryRows(data?.inventory ?? []), [data?.inventory]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      in_stock: rows.filter((item) => item.stockStatus === 'in_stock').length,
      low: rows.filter((item) => item.stockStatus === 'low').length,
      critical: rows.filter((item) => item.stockStatus === 'critical').length,
      out_of_stock: rows.filter((item) => item.stockStatus === 'out_of_stock').length,
      expiring_soon: rows.filter((item) => item.stockStatus === 'expiring_soon').length,
      expired: rows.filter((item) => item.stockStatus === 'expired').length,
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
        item.genericName.toLowerCase().includes(query) ||
        item.brandName.toLowerCase().includes(query) ||
        item.atcCode.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'controlled'
            ? item.isControlled
            : filter === 'dha_formulary'
              ? item.isDHAFormulary
              : item.stockStatus === filter;

      return matchesSearch && matchesFilter;
    });
  }, [filter, rows, search]);

  const lowOrCritical = counts.low + counts.critical;

  const handleExportCSV = () => {
    const headers = [
      'Drug Name',
      'Brand',
      'Strength',
      'Form',
      'ATC Code',
      'Category',
      'Stock Qty',
      'Unit',
      'Reorder Level',
      'Days Supply',
      'Status',
      'Controlled',
      'DHA Formulary',
      'Next Expiry',
    ];

    const csvRows = filtered.map((item) => [
      item.genericName,
      item.brandName,
      item.strength,
      item.form,
      item.atcCode,
      item.category,
      item.stockQty,
      item.unit,
      item.reorderLevel,
      item.daysSupply ?? '—',
      stockConfig[item.stockStatus].label,
      item.isControlled ? 'Yes' : 'No',
      item.isDHAFormulary ? 'Yes' : 'No',
      item.nextExpiry ?? '—',
    ]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
      <div className="flex min-h-full flex-col overflow-y-auto bg-slate-50">
        <div className="mx-6 mb-4 mt-5 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-slate-900">Inventory Management</h2>
            <div className="text-[13px] text-slate-400">
              Stock levels · {data?.profile?.displayName ?? data?.organization?.name ?? 'Pharmacy'} · {new Date().toLocaleDateString()}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export Stock Report
            </button>
            <button
              type="button"
              onClick={() => setShowReceiveModal(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Receive Stock
            </button>
          </div>
        </div>

        <section className="mx-6 mb-4 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Total SKUs', value: rows.length, color: 'text-slate-700', bg: 'bg-slate-50', filterKey: 'all' },
            { label: 'In Stock', value: counts.in_stock, color: 'text-emerald-600', bg: 'bg-emerald-50', filterKey: 'in_stock' },
            { label: 'Low / Critical', value: lowOrCritical, color: 'text-amber-600', bg: 'bg-amber-50', filterKey: 'low' },
            { label: 'Out of Stock', value: counts.out_of_stock, color: 'text-red-700', bg: 'bg-red-50', filterKey: 'out_of_stock' },
            { label: 'Expiring Soon', value: counts.expiring_soon, color: 'text-yellow-800', bg: 'bg-yellow-50', filterKey: 'expiring_soon' },
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
                {loading ? '…' : formatNumber(stat.value)}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">{stat.label}</div>
            </button>
          ))}
        </section>

        <div className="mx-6 mb-4 flex shrink-0 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Drug name, brand, ATC code, category..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 transition-colors focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(filterLabels) as FilterType[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  filter === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filterLabels[key]} ({formatNumber(counts[key])})
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

                return (
                  <div
                    key={item.id}
                    className={`grid min-h-16 grid-cols-[2fr_1fr_1fr_80px_100px_120px_160px] items-center border-l-4 px-5 py-3.5 transition-colors hover:bg-emerald-50 ${cfg.row}`}
                    style={{
                      borderBottom: index < filtered.length - 1 ? '1px solid #F8FAFC' : undefined,
                      borderLeftColor:
                        item.stockStatus === 'out_of_stock'
                          ? '#EF4444'
                          : item.stockStatus === 'expiring_soon'
                            ? '#EAB308'
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
                            DHA ✓
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {item.brandName} · {item.form} · {item.atcCode}
                      </div>
                      {item.affectedPrescriptions.length > 0 ? (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-red-700">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Affects: {item.affectedPrescriptions.join(', ')}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-xs text-slate-500">{item.category}</div>

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
                        {formatNumber(item.stockQty)}{' '}
                        <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-200">
                        <div
                          className={`h-1.5 rounded-full ${cfg.dot}`}
                          style={{ width: `${stockPct}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      {item.daysSupply != null ? (
                        <span
                          className={`font-mono text-[13px] font-bold ${
                            item.daysSupply < 5 ? 'text-red-700' : 'text-amber-700'
                          }`}
                        >
                          {item.daysSupply}d
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>

                    <div className="font-mono text-[12px] text-slate-500">
                      {formatNumber(item.reorderLevel)} {item.unit}
                    </div>

                    <div>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.pill}`}>
                        {cfg.label}
                      </span>
                      <div className="mt-0.5 font-mono text-[9px] text-slate-400">
                        {item.nextExpiry ?? `${item.batchCount} batch${item.batchCount === 1 ? '' : 'es'}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-200"
                      >
                        <Eye className="h-3 w-3" />
                        Batches
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        Order
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {showReceiveModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-[16px] font-bold text-slate-900">Receive Stock</h3>
            <p className="mb-4 text-[13px] text-slate-500">
              To receive new stock, please contact your supplier or pharmacist in charge to process a stock delivery. Once confirmed, stock levels will be updated in the system.
            </p>
            <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">
              Pharmacist in Charge: {data?.profile?.pharmacistInCharge ?? 'Not assigned'}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </OpsShell>
  );
};
