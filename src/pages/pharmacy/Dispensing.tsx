import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, MessageSquare, Play, Search, X } from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { updatePharmacyDispensingTaskStatus, usePharmacyPrescriptionQueue } from '../../hooks';
import type { PharmacyQueuePrescriptionItem } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { formatLocaleDigits } from '../../lib/i18n-ui';
import { PHARMACY_NAV_ITEMS } from './navItems';
import { inferPrescriptionWorkflowStatus } from './prescription-status';

type FilterType = 'all' | 'new' | 'in_progress' | 'on_hold' | 'dispensed' | 'cancelled';
type SortType = 'newest' | 'oldest' | 'patient' | 'status';

interface PrescriptionListRow {
  id: string;
  taskIds: string[];
  patientName: string;
  patientInitials: string;
  avatarClass: string;
  doctorName: string;
  drugs: string[];
  insurance: string;
  copay: number;
  status: Exclude<FilterType, 'all'>;
  receivedAt: Date;
  receivedTimeAgo: string;
  priority: PharmacyQueuePrescriptionItem['priority'];
  hasAllergyFlag: boolean;
}

const filterLabels: Record<FilterType, string> = {
  all: 'All',
  new: 'New',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  dispensed: 'Dispensed',
  cancelled: 'Cancelled',
};

const sortLabels: Record<SortType, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  patient: 'Patient A-Z',
  status: 'By Status',
};

const statusConfig: Record<
  Exclude<FilterType, 'all'>,
  { label: string; bg: string; text: string; border: string; action: string }
> = {
  new: {
    label: 'NEW',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-l-blue-500',
    action: 'Dispense',
  },
  in_progress: {
    label: 'IN PROGRESS',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-l-teal-500',
    action: 'Continue',
  },
  on_hold: {
    label: 'ON HOLD',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-l-amber-500',
    action: 'Resume',
  },
  dispensed: {
    label: 'DISPENSED',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-l-emerald-500',
    action: 'View',
  },
  cancelled: {
    label: 'CANCELLED',
    bg: 'bg-slate-50',
    text: 'text-slate-500',
    border: 'border-l-slate-300',
    action: 'View',
  },
};

const statusSortOrder: Record<Exclude<FilterType, 'all'>, number> = {
  new: 0,
  in_progress: 1,
  on_hold: 2,
  dispensed: 3,
  cancelled: 4,
};

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

const receivedMeta = (waitMinutes: number) => {
  const receivedAt = new Date(Date.now() - waitMinutes * 60 * 1000);
  const receivedTime = receivedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (waitMinutes < 60) {
    return { receivedAt, receivedTimeAgo: `${waitMinutes} min ago`, receivedTime };
  }

  const hours = Math.floor(waitMinutes / 60);
  const minutes = waitMinutes % 60;
  return { receivedAt, receivedTimeAgo: `${hours}h ${minutes}min ago`, receivedTime };
};

const inferPrescriptionStatus = (items: PharmacyQueuePrescriptionItem[]): PrescriptionListRow['status'] =>
  inferPrescriptionWorkflowStatus(items);

const groupPrescriptionRows = (items: PharmacyQueuePrescriptionItem[]): PrescriptionListRow[] => {
  const groups = new Map<string, PharmacyQueuePrescriptionItem[]>();

  for (const item of items) {
    const existing = groups.get(item.prescriptionId) ?? [];
    existing.push(item);
    groups.set(item.prescriptionId, existing);
  }

  return Array.from(groups.entries()).map(([prescriptionId, group]) => {
    const first = group[0];
    const maxWait = Math.max(...group.map((item) => item.waitMinutes));
    const { receivedAt, receivedTimeAgo } = receivedMeta(maxWait);

    return {
      id: prescriptionId,
      taskIds: group.map((item) => item.id),
      patientName: first.patientName,
      patientInitials: initialsFor(first.patientName),
      avatarClass: avatarClassFor(prescriptionId),
      doctorName: first.prescriber,
      drugs: group.map((item) => item.medication || 'Medication pending'),
      insurance: first.insuranceProvider,
      copay: group.reduce((sum, item) => sum + item.copayAed, 0),
      status: inferPrescriptionStatus(group),
      receivedAt,
      receivedTimeAgo,
      priority: first.priority,
      hasAllergyFlag: group.some((item) => item.allergyFlag),
    };
  });
};

const HOLD_REASONS = [
  { value: 'out_of_stock', label: '🔴 Out of Stock' },
  { value: 'insurance_issue', label: '🛡️ Insurance Issue' },
  { value: 'allergy_concern', label: '⚠️ Allergy Concern' },
  { value: 'doctor_clarification', label: '📋 Doctor Clarification Needed' },
  { value: 'substitution_required', label: '🔄 Substitution Required' },
  { value: 'incomplete_prescription', label: '📄 Incomplete Prescription' },
  { value: 'patient_not_reachable', label: '👤 Patient Not Reachable' },
  { value: 'other', label: '🔧 Other' },
];

export const PharmacyDispensing = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, loading, error, refetch } = usePharmacyPrescriptionQueue();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [holdModalRow, setHoldModalRow] = useState<PrescriptionListRow | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [holdNote, setHoldNote] = useState('');
  const [viewModalRow, setViewModalRow] = useState<PrescriptionListRow | null>(null);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSearch(id);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  type RowStatus = Exclude<FilterType, 'all'>;
  const nextStatusFor = (status: RowStatus): RowStatus | null => {
    switch (status) {
      case 'new':
        return 'in_progress';
      case 'in_progress':
        return 'dispensed';
      case 'on_hold':
        return 'in_progress';
      default:
        return null;
    }
  };

  const handleOnHold = async (row: PrescriptionListRow) => {
    setActionError(null);
    setBusyId(row.id);
    try {
      await Promise.all(
        row.taskIds.map((taskId) =>
          updatePharmacyDispensingTaskStatus(taskId, 'on_hold', {
            holdReasonCode: holdReason,
            holdNote,
          })
        )
      );
      refetch();
      setHoldModalRow(null);
      setHoldReason('');
      setHoldNote('');
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not update prescription status.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRowAction = async (row: PrescriptionListRow, status: RowStatus) => {
    if (status === 'dispensed' || status === 'cancelled') {
      return;
    }
    const nextStatus = nextStatusFor(status);
    if (!nextStatus) return;
    setActionError(null);
    setBusyId(row.id);
    try {
      const workflowStatus: Parameters<typeof updatePharmacyDispensingTaskStatus>[1] =
        nextStatus === 'in_progress'
          ? 'in_progress'
          : nextStatus === 'dispensed'
            ? 'dispensed'
            : 'on_hold';
      await Promise.all(row.taskIds.map((taskId) => updatePharmacyDispensingTaskStatus(taskId, workflowStatus)));
      refetch();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not update prescription status.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const rows = useMemo(() => groupPrescriptionRows(data?.queue ?? []), [data?.queue]);
  const counts = useMemo(
    () => ({
      all: rows.length,
      new: rows.filter((row) => row.status === 'new').length,
      in_progress: rows.filter((row) => row.status === 'in_progress').length,
      on_hold: rows.filter((row) => row.status === 'on_hold').length,
      dispensed: rows.filter((row) => row.status === 'dispensed').length,
      cancelled: rows.filter((row) => row.status === 'cancelled').length,
    }),
    [rows]
  );

  const sorted = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const matchesFilter = filter === 'all' || row.status === filter;
      const matchesSearch =
        !query ||
        row.patientName.toLowerCase().includes(query) ||
        row.id.toLowerCase().includes(query) ||
        row.doctorName.toLowerCase().includes(query) ||
        row.drugs.some((drug) => drug.toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sort === 'patient') {
        return a.patientName.localeCompare(b.patientName);
      }

      if (sort === 'status') {
        return statusSortOrder[a.status] - statusSortOrder[b.status];
      }

      if (sort === 'oldest') {
        return a.receivedAt.getTime() - b.receivedAt.getTime();
      }

      return b.receivedAt.getTime() - a.receivedAt.getTime();
    });
  }, [filter, rows, search, sort]);

  return (
    <OpsShell
      title="Prescriptions"
      subtitle={`${data?.profile?.displayName ?? data?.organization?.name ?? 'Pharmacy'} · Live dispensing queue`}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, {
        prescriptions: counts.new + counts.on_hold || undefined,
        inventory: data?.lowStockAlerts || undefined,
        messages: counts.on_hold || undefined,
      })}
      accent="emerald"
      variant="pharmacy"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />
        <div className="flex min-h-full flex-col overflow-y-auto bg-slate-50">
        {actionError ? (
          <div
            role="alert"
            className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {actionError}
          </div>
        ) : null}
        <div className="mx-6 mb-4 mt-5 flex shrink-0 items-center justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-slate-900">Prescriptions</h2>
            <div className="text-[13px] text-slate-400">
              All prescriptions today · {data?.profile?.displayName ?? data?.organization?.name ?? 'Pharmacy'}
            </div>
          </div>
        </div>

        <div className="mx-6 mb-4 flex shrink-0 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('pharmacy.dispensing.searchPh', {
                defaultValue: 'Patient name, Rx number, doctor...',
              })}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
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

          <div className="relative ml-auto" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setShowSortMenu((current) => !current)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 transition-colors hover:bg-slate-50"
            >
              Sort: {sortLabels[sort]}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showSortMenu ? (
              <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {(Object.keys(sortLabels) as SortType[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSort(key);
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                      sort === key ? 'font-semibold text-emerald-600' : 'text-slate-600'
                    }`}
                  >
                    {sortLabels[key]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mx-6 mb-6 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[1120px]">
              <div className="grid grid-cols-[90px_1fr_0.9fr_0.9fr_90px_110px_160px] border-b border-slate-100 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
                <div>Received</div>
                <div>Patient</div>
                <div>Doctor</div>
                <div>Drugs</div>
                <div>Insurance</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {!loading && sorted.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No prescriptions match your search</div>
              ) : null}

              {loading ? (
                <div className="py-12 text-center text-sm text-slate-400">Loading prescriptions...</div>
              ) : null}

              {sorted.map((row, index) => {
                const cfg = statusConfig[row.status];
                const received = row.receivedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                return (
                  <div
                    key={row.id}
                    className={`grid min-h-16 grid-cols-[90px_1fr_0.9fr_0.9fr_90px_110px_160px] items-center border-l-4 px-5 py-3 transition-colors hover:bg-emerald-50 ${cfg.border}`}
                    style={{
                      borderBottom: index < sorted.length - 1 ? '1px solid #F8FAFC' : undefined,
                    }}
                  >
                    <div>
                      <div className="font-mono text-[11px] text-slate-600">{received}</div>
                      <div className="text-[10px] text-slate-400">{row.receivedTimeAgo}</div>
                    </div>

                    <div className="flex items-center gap-2 pr-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ${row.avatarClass}`}>
                        {row.patientInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-slate-800">
                          {row.patientName}
                          {row.hasAllergyFlag ? <span className="ml-1 text-[9px] text-red-500">⚠️</span> : null}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">{row.id.slice(0, 8)} · live</div>
                      </div>
                    </div>

                    <div className="pr-3">
                      <div className="truncate text-[12px] text-slate-700">{row.doctorName}</div>
                      <div className="truncate text-[11px] text-slate-400">CeenAiX care team</div>
                    </div>

                    <div className="pr-3 min-w-0">
                      <div className="truncate text-[12px] text-slate-600" title={row.drugs.join(', ')}>
                        {row.drugs.map(drug => drug.length > 20 ? drug.slice(0, 20) + '…' : drug).join(', ') || '—'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">RX-{row.id.slice(0, 8).toUpperCase()}</div>
                    </div>

                    <div>
                      <div className="truncate text-[11px] text-slate-600">{row.insurance}</div>
                      <div className="font-mono text-[11px] font-bold text-emerald-600">AED {formatNumber(row.copay, uiLang)}</div>
                    </div>

                    <div>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      {row.status === 'dispensed' ? (
                        <div className="mt-0.5 font-mono text-[9px] text-slate-400">Complete</div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (row.status === 'dispensed' || row.status === 'cancelled') {
                            setViewModalRow(row);
                          } else {
                            void handleRowAction(row, row.status);
                          }
                        }}
                        disabled={busyId === row.id && row.status !== 'dispensed' && row.status !== 'cancelled'}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          row.status === 'dispensed'
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : row.status === 'on_hold'
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {row.status !== 'dispensed' && row.status !== 'cancelled' ? <Play className="h-3 w-3" /> : null}
                        {busyId === row.id ? '…' : cfg.action}
                      </button>
                      {(row.status === 'new' || row.status === 'in_progress') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setHoldModalRow(row);
                            setHoldReason('');
                            setHoldNote('');
                          }}
                          disabled={busyId === row.id}
                          title="Put on hold"
                          className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-amber-600 border border-amber-300 bg-amber-50 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Hold
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => navigate('/pharmacy/messages')}
                        aria-label="Message the prescribing clinician"
                        title="Open pharmacy messages"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {holdModalRow ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Put Prescription On Hold</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {holdModalRow.patientName} · {holdModalRow.drugs.slice(0, 2).join(', ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHoldModalRow(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason for Hold <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {HOLD_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      type="button"
                      onClick={() => setHoldReason(reason.value)}
                      className={`rounded-lg border px-4 py-2.5 text-left text-sm transition ${
                        holdReason === reason.value
                          ? 'border-amber-400 bg-amber-50 font-semibold text-amber-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Additional Notes <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={holdNote}
                  onChange={(e) => setHoldNote(e.target.value)}
                  rows={3}
                  placeholder="Add any additional details..."
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setHoldModalRow(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!holdReason || busyId === holdModalRow.id}
                onClick={() => void handleOnHold(holdModalRow)}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === holdModalRow.id ? 'Saving...' : 'Confirm Hold'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      {viewModalRow ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold text-white ${viewModalRow.avatarClass}`}>
                  {viewModalRow.patientInitials}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{viewModalRow.patientName}</h2>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">RX-{viewModalRow.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  viewModalRow.status === 'dispensed'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {viewModalRow.status === 'dispensed' ? 'DISPENSED ✅' : 'CANCELLED'}
                </span>
                <button
                  type="button"
                  onClick={() => setViewModalRow(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 px-6 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Patient</div>
                  <div className="text-sm font-semibold text-slate-800">{viewModalRow.patientName}</div>
                  {viewModalRow.hasAllergyFlag ? (
                    <div className="mt-1 text-[11px] text-red-600">⚠️ Allergy flag on record</div>
                  ) : null}
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Doctor</div>
                  <div className="text-sm font-semibold text-slate-800">{viewModalRow.doctorName}</div>
                  <div className="text-[11px] text-slate-400">CeenAiX care team</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Pharmacy</div>
                  <div className="text-sm font-semibold text-slate-800">{data?.profile?.displayName ?? data?.organization?.name ?? 'Pharmacy'}</div>
                  <div className="text-[11px] text-slate-400">{data?.profile?.licenseNumber ?? 'DHA Licensed'}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">DHA Reference</div>
                  <div className="font-mono text-sm font-bold text-slate-800">DHA-{viewModalRow.id.slice(0, 8).toUpperCase()}</div>
                  <div className="text-[11px] text-emerald-600">Ready for DHA reporting ✅</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 px-4 py-3">
                <div className="mb-2 text-[10px] uppercase tracking-wide text-slate-400">Medications</div>
                <div className="space-y-1">
                  {viewModalRow.drugs.map((drug, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {drug}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Insurance</div>
                  <div className="text-sm font-semibold text-slate-800">{viewModalRow.insurance}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Copay</div>
                  <div className="font-mono text-sm font-bold text-emerald-600">AED {formatNumber(viewModalRow.copay, uiLang)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Priority</div>
                  <div className="text-sm font-semibold text-slate-800">{viewModalRow.priority.toUpperCase()}</div>
                </div>
              </div>

              {viewModalRow.status === 'dispensed' ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  ✅ Medication dispensed successfully. Patient has been notified for pickup.
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  ❌ This prescription was cancelled.
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewModalRow(null)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </OpsShell>
  );
};
