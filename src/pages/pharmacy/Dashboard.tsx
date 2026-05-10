import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock,
  MessageSquare,
  Pill,
  Shield,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue } from '../../hooks';
import type { PharmacyQueuePrescriptionItem } from '../../hooks/use-pharmacy-prescription-queue';
import { formatLocaleDigits } from '../../lib/i18n-ui';
import { PHARMACY_NAV_ITEMS } from './navItems';

const formatNumber = (value: number | null | undefined, language: string) =>
  typeof value === 'number' ? formatLocaleDigits(value, language) : '—';

const avatarClasses = [
  'bg-rose-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-emerald-600',
  'bg-indigo-500',
  'bg-fuchsia-500',
];

const initialsFor = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`
      : (parts[0] ?? 'PX').replace(/[^a-z0-9]/gi, '').slice(0, 2);

  return initials.padEnd(2, 'X').toUpperCase();
};

const avatarClassFor = (seed: string) => {
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatarClasses[hash % avatarClasses.length];
};

const statusConfig: Record<
  PharmacyQueuePrescriptionItem['status'],
  { label: string; bg: string; text: string; border: string }
> = {
  verifying: {
    label: 'NEW',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-l-blue-500',
  },
  ready: {
    label: 'ON HOLD',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-l-amber-500',
  },
  counseling: {
    label: 'DONE',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-l-emerald-500',
  },
};

interface PharmacyKpi {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone: 'emerald' | 'blue' | 'amber';
}

interface PharmacyDashboardPrescription {
  id: string;
  patientName: string;
  patientInitials: string;
  avatarClass: string;
  prescriber: string;
  medications: string[];
  waitMinutes: number;
  quantity: number | null;
  priority: PharmacyQueuePrescriptionItem['priority'];
  status: PharmacyQueuePrescriptionItem['status'];
  isDispensed: boolean;
  isOnHold: boolean;
}

const groupPrescriptionItems = (items: PharmacyQueuePrescriptionItem[]): PharmacyDashboardPrescription[] => {
  const grouped = new Map<string, PharmacyQueuePrescriptionItem[]>();

  for (const item of items) {
    const existing = grouped.get(item.prescriptionId) ?? [];
    existing.push(item);
    grouped.set(item.prescriptionId, existing);
  }

  return Array.from(grouped.entries()).map(([prescriptionId, group]) => {
    const first = group[0];
    const isDispensed = group.every((item) => item.isDispensed);
    const isOnHold = !isDispensed && group.some((item) => item.quantity === 0);

    return {
      id: prescriptionId,
      patientName: first.patientName,
      patientInitials: initialsFor(first.patientName),
      avatarClass: avatarClassFor(prescriptionId),
      prescriber: first.prescriber,
      medications: group.map((item) => item.medication || 'Medication pending'),
      waitMinutes: Math.max(...group.map((item) => item.waitMinutes)),
      quantity: group.reduce<number | null>((sum, item) => {
        if (sum == null && item.quantity == null) {
          return null;
        }

        return (sum ?? 0) + (item.quantity ?? 0);
      }, null),
      priority: first.priority,
      status: isDispensed ? 'counseling' : isOnHold ? 'ready' : 'verifying',
      isDispensed,
      isOnHold,
    };
  });
};

export const PharmacyDashboard = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const { data, loading } = usePharmacyPrescriptionQueue();
  const [showDispensed, setShowDispensed] = useState(false);

  const prescriptionGroups = useMemo(() => groupPrescriptionItems(data?.queue ?? []), [data?.queue]);
  const inQueue = useMemo(
    () => prescriptionGroups.filter((prescription) => !prescription.isDispensed && !prescription.isOnHold),
    [prescriptionGroups]
  );
  const onHoldPrescriptions = useMemo(
    () => prescriptionGroups.filter((prescription) => prescription.isOnHold),
    [prescriptionGroups]
  );
  const activePrescriptions = useMemo(
    () => prescriptionGroups.filter((prescription) => !prescription.isDispensed),
    [prescriptionGroups]
  );
  const dispensedPrescriptions = useMemo(
    () => prescriptionGroups.filter((prescription) => prescription.isDispensed),
    [prescriptionGroups]
  );
  const stockAlerts = useMemo(
    () =>
      data?.inventory
        .filter((item) => item.status === 'low' || item.status === 'out' || item.status === 'near_expiry')
        .map((item) => ({
          id: item.id,
          item: item.name,
          quantity: item.stock,
          sku: item.sku,
          severity: item.status,
          expiryMonth: item.expiryMonth,
        }))
        .sort((a, b) => {
          const order = ['atorvastatin', 'metformin', 'bisoprolol', 'warfarin'];
          const aIndex = order.findIndex((name) => a.item.toLowerCase().includes(name));
          const bIndex = order.findIndex((name) => b.item.toLowerCase().includes(name));
          return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
        }) ?? [],
    [data?.inventory]
  );
  const onHold = onHoldPrescriptions.length;
  const prescriptionsToday = prescriptionGroups.length;
  const paidRevenue = data?.claims
    .filter((claim) => claim.status === 'paid')
    .reduce((sum, claim) => sum + claim.amountAed, 0) ?? 0;
  const stockAlertSummary =
    stockAlerts.length > 0
      ? stockAlerts
          .slice(0, 4)
          .map((alert) => {
            if (alert.severity === 'out') {
              return `${alert.item}${/atorvastatin/i.test(alert.item) && !/20mg/i.test(alert.item) ? ' 20mg' : ''} OUT OF STOCK`;
            }

            if (alert.severity === 'near_expiry') {
              return `${alert.item} EXPIRING ${alert.expiryMonth ?? ''}`;
            }

            return `${alert.item} LOW`;
          })
          .join(' · ')
      : 'All critical SKUs are currently covered by live prescription demand.';
  const oldestQueueItem = inQueue.reduce<PharmacyDashboardPrescription | null>(
    (oldest, item) => (!oldest || item.waitMinutes > oldest.waitMinutes ? item : oldest),
    null
  );

  const kpis = useMemo<PharmacyKpi[]>(
    () => [
      {
        label: 'Prescriptions Today',
        value: prescriptionsToday,
        helper: `${formatNumber(dispensedPrescriptions.length, uiLang)} dispensed · ${formatNumber(inQueue.length, uiLang)} in queue · ${formatNumber(onHold, uiLang)} on hold`,
        icon: Pill,
        tone: 'emerald',
      },
      {
        label: 'In Queue',
        value: inQueue.length,
        helper: oldestQueueItem
          ? `Oldest: ${oldestQueueItem.waitMinutes} min wait (${oldestQueueItem.patientName})`
          : 'No active wait time',
        icon: Clock,
        tone: 'blue',
      },
      {
        label: 'Stock Alerts',
        value: stockAlerts.length,
        helper: `${stockAlerts.filter((item) => item.severity === 'out').length} out of stock · ${stockAlerts.filter((item) => item.severity === 'low').length} low · ${stockAlerts.filter((item) => item.severity === 'near_expiry').length} expiring`,
        icon: AlertTriangle,
        tone: 'amber',
      },
      {
        label: 'Revenue Today',
        value: `AED ${formatNumber(paidRevenue, uiLang)}`,
        helper: `${formatNumber(data?.claims.filter((claim) => claim.status === 'paid').length ?? 0, uiLang)} paid claims from pharmacy_claims`,
        icon: CircleDollarSign,
        tone: 'emerald',
      },
      {
        label: 'DHA Status',
        value: data?.profile?.dhaConnected ? 'Compliant ✅' : 'Needs review',
        helper: `${formatNumber(data?.reportMetrics.dhaSubmittedCount ?? 0, uiLang)} dispensing records ready for DHA reporting`,
        icon: ShieldCheck,
        tone: 'emerald',
      },
    ],
    [data?.claims, data?.profile?.dhaConnected, data?.reportMetrics.dhaSubmittedCount, dispensedPrescriptions.length, inQueue.length, oldestQueueItem, onHold, paidRevenue, prescriptionsToday, stockAlerts, uiLang]
  );

  return (
    <OpsShell
      title={t('pharmacy.dashboard.title')}
      subtitle={t('pharmacy.dashboard.subtitle')}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, {
        prescriptions: inQueue.length || undefined,
        inventory: stockAlerts.length || undefined,
        messages: onHold || undefined,
      })}
      accent="emerald"
      variant="pharmacy"
    >
      <div className="flex min-h-full flex-col overflow-y-auto bg-slate-50">
        <div className="mx-6 mt-5 flex shrink-0 items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <span className="text-[13px] font-semibold text-amber-800">
              {formatNumber(stockAlerts.length, uiLang)} stock alerts require attention:{' '}
            </span>
            <span className="text-[12px] text-amber-700">{stockAlertSummary}</span>
          </div>
          <Link
            to="/pharmacy/inventory"
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-amber-700"
          >
            View Inventory
          </Link>
        </div>

        <section className="mx-6 mt-4 grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const toneClass =
              kpi.tone === 'blue'
                ? 'border-blue-300 text-blue-600 bg-blue-50'
                : kpi.tone === 'amber'
                  ? 'border-slate-100 text-amber-600 bg-amber-50'
                  : 'border-slate-100 text-emerald-600 bg-emerald-50';

            return (
              <article
                key={kpi.label}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  kpi.tone === 'blue' ? 'border-blue-300' : 'border-slate-100'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${toneClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {kpi.tone === 'blue' || kpi.tone === 'amber' ? (
                    <span className={`mt-1 h-2 w-2 rounded-full ${kpi.tone === 'blue' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  ) : null}
                </div>
                <div
                  className={`font-mono font-bold ${
                    kpi.tone === 'blue'
                      ? 'text-blue-600'
                      : kpi.tone === 'amber'
                        ? 'text-amber-600'
                        : 'text-slate-900'
                  } ${typeof kpi.value === 'string' && kpi.value.length > 8 ? 'text-[16px]' : 'text-[30px]'}`}
                >
                  {loading ? '…' : typeof kpi.value === 'number' ? formatNumber(kpi.value, uiLang) : kpi.value}
                </div>
                <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">{kpi.label}</div>
                <div className="text-[11px] text-slate-400">{kpi.helper}</div>
                {kpi.label === 'Prescriptions Today' ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{
                        width:
                          prescriptionsToday > 0
                            ? `${Math.min(100, (dispensedPrescriptions.length / Math.max(1, prescriptionsToday)) * 100)}%`
                            : '0%',
                      }}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        <section className="mx-6 mt-4 rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">Prescription Queue</h2>
              <div className="text-[12px] text-slate-400">Pending dispensing — sorted by wait time</div>
            </div>
            <Link to="/pharmacy/dispensing" className="text-[13px] font-medium text-emerald-600 hover:text-emerald-700">
              View All →
            </Link>
          </div>

          {activePrescriptions.slice(0, 8).map((item) => {
            const cfg = statusConfig[item.status];
            return (
              <Link
                key={item.id}
                to="/pharmacy/dispensing"
                className={`flex min-h-20 items-center gap-4 border-b border-slate-50 border-l-4 px-5 transition hover:bg-emerald-50 ${cfg.border}`}
              >
                <div className="w-[90px] shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="flex w-[220px] shrink-0 items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${item.avatarClass}`}>
                    {item.patientInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-slate-800">{item.patientName}</div>
                    <div className="truncate font-mono text-[10px] text-slate-400">{item.id.slice(0, 8)} · live Rx</div>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] text-slate-600">{item.prescriber}</div>
                  <div className="truncate text-[12px] text-slate-500">{item.medications.join(' + ') || 'Medication pending'}</div>
                  <div className="font-mono text-[10px] text-slate-300">{item.waitMinutes} min wait · Qty {item.quantity ?? '—'}</div>
                </div>

                <div className="w-[150px] shrink-0">
                  <div className="text-[11px] text-slate-600">Insurance review</div>
                  <div className="font-mono text-[10px] text-slate-400">{item.priority.toUpperCase()} priority</div>
                </div>

                <div className="shrink-0">
                  <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white">
                    Dispense
                  </span>
                </div>
              </Link>
            );
          })}

          {!loading && activePrescriptions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">Nothing in the queue right now.</div>
          ) : null}

          <button
            type="button"
            onClick={() => setShowDispensed((current) => !current)}
            className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3 text-left transition hover:bg-slate-50"
          >
            <span className="text-[13px] font-medium text-slate-500">{formatNumber(dispensedPrescriptions.length, uiLang)} dispensed prescriptions today</span>
            {showDispensed ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showDispensed
            ? dispensedPrescriptions.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex min-h-16 items-center gap-4 border-b border-slate-50 border-l-4 border-l-emerald-500 bg-emerald-50/30 px-5"
                >
                  <div className="w-[90px] shrink-0">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">DONE ✅</span>
                  </div>
                  <div className="flex w-[220px] shrink-0 items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold text-white ${item.avatarClass}`}>
                      {item.patientInitials}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-slate-600">{item.patientName}</div>
                      <div className="font-mono text-[10px] text-slate-400">DHA record ready</div>
                    </div>
                  </div>
                  <div className="flex-1 text-[11px] text-slate-400">{item.medications.join(' · ')}</div>
                  <div className="text-[11px] font-medium text-emerald-600">Dispensed ✅</div>
                </div>
              ))
            : null}
        </section>

        <section className="mx-6 mb-6 mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h3 className="text-[14px] font-bold text-slate-800">Stock Alerts</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {stockAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border-l-[3px] px-5 py-3.5 ${
                    alert.severity === 'out'
                      ? 'border-l-red-500 bg-red-50'
                      : alert.severity === 'near_expiry'
                        ? 'border-l-orange-500 bg-orange-50'
                        : 'border-l-amber-500 bg-amber-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-slate-800">{alert.item}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">{alert.sku} · {formatNumber(alert.quantity, uiLang)} units tracked</div>
                      <div className={`mt-0.5 text-[11px] ${alert.severity === 'out' ? 'text-red-600' : 'text-amber-700'}`}>
                        {alert.severity === 'out' ? 'Out of stock based on live queue demand' : 'Below reorder threshold'}
                      </div>
                    </div>
                    <Link
                      to="/pharmacy/inventory"
                      className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold ${
                        alert.severity === 'out'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {alert.severity === 'out' ? 'Order Urgently' : 'Order Now'}
                    </Link>
                  </div>
                </div>
              ))}
              {!loading && stockAlerts.length === 0 ? (
                <div className="p-5 text-sm text-emerald-700">
                  <Shield className="mr-2 inline h-4 w-4" />
                  All critical SKUs are covered by current live data.
                </div>
              ) : null}
            </div>
          </article>

          <article className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-500" />
                <h3 className="text-[14px] font-bold text-slate-800">Messages</h3>
              </div>
              <span className="text-[12px] font-medium text-emerald-600">View All →</span>
            </div>
            <div className="divide-y divide-slate-50">
              <div className="bg-amber-50 px-5 py-4">
                <div className="mb-0.5 text-[12px] font-semibold text-slate-700">Pharmacy → Doctor</div>
                <div className="mb-1 text-[12px] text-slate-500">
                  {onHold > 0
                    ? `${onHold} prescription${onHold === 1 ? '' : 's'} require follow-up before dispensing.`
                    : 'No active substitution queries in live queue.'}
                </div>
                <div className="mb-2 text-[11px] italic text-amber-600">
                  {onHold > 0 ? 'Awaiting response...' : 'Clear'}
                </div>
                <span className="rounded-md bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                  Follow Up
                </span>
              </div>
              <div className="px-5 py-4">
                <div className="mb-0.5 text-[12px] font-semibold text-slate-700">Patient notifications</div>
                <div className="mb-1 text-[12px] text-slate-500">Dispensing queue is synced with patient medication plans.</div>
                <div className="text-[11px] italic text-emerald-600">Ready for app notifications</div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </OpsShell>
  );
};
