import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import type { LabPriority, LabPortalSample } from '../../hooks';
import type { LabPageContext } from './shared/types';
import {
  sampleStatusLabel,
  formatNumber,
  formatDateShort,
  formatTimeShort,
  formatTat,
  ageGenderLabel,
  priorityClass,
  sampleStatusBadge,
  insurancePillClass,
  bloodTypeColor,
} from './shared/helpers';
import { Pill } from './shared/ui';

const LAB_PRIORITIES: LabPriority[] = ['STAT', 'Urgent', 'Routine'];
const LAB_LIFECYCLE_STATUSES = ['Received', 'Accessioned', 'In Progress', 'Pending Verify', 'Verified / Released'] as const;
const LAB_STATUS_OPTIONS = [...LAB_LIFECYCLE_STATUSES, 'NABIDH Submitted'] as const;
const LAB_DEPARTMENTS = ['Chemistry', 'Haematology', 'Microbiology', 'Immunology', 'Coagulation', 'Urinalysis'] as const;

type LabStatusFilter = (typeof LAB_STATUS_OPTIONS)[number];
type LabDepartmentFilter = (typeof LAB_DEPARTMENTS)[number];

const sampleMatchesStatusFilter = (sample: LabPortalSample, statuses: Set<LabStatusFilter>) => {
  if (statuses.size === 0) return true;
  // Match against the underlying lifecycle status, not the critical override.
  const baseLabel = sampleStatusLabel(sample.status, false);
  const lifecycleLabel = baseLabel === 'Verified' ? 'Verified / Released' : baseLabel;
  if (statuses.has(lifecycleLabel as LabStatusFilter)) return true;
  if (sample.nabidhReference && statuses.has('NABIDH Submitted')) return true;
  return false;
};

const sampleMatchesDepartment = (sample: LabPortalSample, departments: Set<LabDepartmentFilter>) => {
  if (departments.size === 0) return true;
  const haystack = sample.testNames.join(' ').toLowerCase();
  const map: Array<[LabDepartmentFilter, string[]]> = [
    ['Chemistry', ['k+', 'na+', 'cl-', 'creatinine', 'glucose', 'lipid', 'hba1c', 'urea', 'cholesterol']],
    ['Haematology', ['cbc', 'hb', 'hemoglobin', 'haematology']],
    ['Microbiology', ['culture', 'gram', 'sensitivity', 'microbiology']],
    ['Immunology', ['tsh', 'troponin', 'bnp', 'd-dimer', 'cortisol']],
    ['Coagulation', ['pt', 'aptt', 'inr', 'fibrinogen']],
    ['Urinalysis', ['urinalysis', 'urine']],
  ];
  for (const dept of departments) {
    const keywords = map.find(([key]) => key === dept)?.[1] ?? [];
    if (keywords.some((kw) => haystack.includes(kw))) return true;
  }
  return false;
};

const LabQueueFilterSidebar = ({
  priority,
  setPriority,
  statuses,
  setStatuses,
  departments,
  setDepartments,
  onReset,
  searchQuery,
  setSearchQuery,
}: {
  priority: 'all' | LabPriority;
  setPriority: (next: 'all' | LabPriority) => void;
  statuses: Set<LabStatusFilter>;
  setStatuses: (next: Set<LabStatusFilter>) => void;
  departments: Set<LabDepartmentFilter>;
  setDepartments: (next: Set<LabDepartmentFilter>) => void;
  onReset: () => void;
  searchQuery: string;
  setSearchQuery: (next: string) => void;
}) => {
  const toggleStatus = (status: LabStatusFilter) => {
    const next = new Set(statuses);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    setStatuses(next);
  };
  const toggleDept = (dept: LabDepartmentFilter) => {
    const next = new Set(departments);
    if (next.has(dept)) next.delete(dept);
    else next.add(dept);
    setDepartments(next);
  };

  return (
    <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search samples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxLength={FORM_FIELD_LIMITS.searchQuery}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-indigo-300 focus:bg-white"
          />
        </div>
        <button type="button"
          disabled
          title="Scan barcode — coming soon"
          className="w-full cursor-not-allowed rounded-lg bg-indigo-600/60 px-3 py-2 text-xs font-bold text-white opacity-70"
        >
          Scan Barcode
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">PRIORITY</div>
          <div className="space-y-1">
            {(['all', ...LAB_PRIORITIES] as const).map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <input
                  type="radio"
                  name="lab-priority-filter"
                  checked={priority === p}
                  onChange={() => setPriority(p)}
                  className="h-3.5 w-3.5 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{p === 'all' ? 'All' : p}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">STATUS</div>
          <div className="space-y-1">
            {LAB_LIFECYCLE_STATUSES.map((status) => (
              <label key={status} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={statuses.has(status)}
                  onChange={() => toggleStatus(status)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{status}</span>
              </label>
            ))}
          </div>
          <div className="my-3 border-t border-slate-100" />
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">OTHER FILTERS</div>
          <div className="space-y-1">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={statuses.has('NABIDH Submitted')}
                onChange={() => toggleStatus('NABIDH Submitted')}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>NABIDH Submitted</span>
            </label>
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">DEPARTMENT</div>
          <div className="space-y-1">
            {LAB_DEPARTMENTS.map((dept) => (
              <label key={dept} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={departments.has(dept)}
                  onChange={() => toggleDept(dept)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{dept}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button type="button" onClick={onReset} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Reset</button>
        </div>
      </div>
    </aside>
  );
};

const downloadCsv = (filename: string, rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>) => {
  const escape = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const body = rows.map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const LabQueuePage = ({ context }: { context: LabPageContext }) => {
  const navigate = useNavigate();
  const allSamples = useMemo(() => context.data?.samples ?? [], [context.data?.samples]);
  const [priority, setPriority] = useState<'all' | LabPriority>('all');
  const [statuses, setStatuses] = useState<Set<LabStatusFilter>>(new Set([
    'Received', 'Accessioned', 'In Progress', 'Pending Verify', 'Verified / Released',
  ]));
  const [departments, setDepartments] = useState<Set<LabDepartmentFilter>>(new Set(LAB_DEPARTMENTS));
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toolbarError, setToolbarError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return allSamples.filter((sample) => {
      if (priority !== 'all' && sample.priority !== priority) return false;
      if (!sampleMatchesStatusFilter(sample, statuses)) return false;
      if (!sampleMatchesDepartment(sample, departments)) return false;
      if (searchQuery) {
        const haystack = `${sample.orderCode} ${sample.patientName} ${sample.doctorName}`.toLowerCase();
        if (!haystack.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [allSamples, priority, statuses, departments, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [priority, statuses, departments, searchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const releasableSelected = useMemo(
    () =>
      filtered.filter(
        (sample) =>
          selectedSampleIds.has(sample.id) &&
          (sample.status === 'resulted' || sample.status === 'reviewed')
      ),
    [filtered, selectedSampleIds]
  );

  const toggleSampleSelected = (sampleId: string) => {
    setSelectedSampleIds((current) => {
      const next = new Set(current);
      if (next.has(sampleId)) {
        next.delete(sampleId);
      } else {
        next.add(sampleId);
      }
      return next;
    });
  };

  const handleExportCsv = () => {
    setToolbarError(null);
    const header = [
      'order_code',
      'patient_name',
      'doctor_name',
      'clinic_name',
      'tests',
      'priority',
      'status',
      'ordered_at',
      'received_at',
      'tat_minutes',
      'technician_name',
    ];
    const rows = filtered.map((sample) => [
      sample.orderCode,
      sample.patientName,
      sample.doctorName,
      sample.clinicName,
      sample.testNames.join(' | '),
      sample.priority,
      sampleStatusLabel(sample.status, false),
      sample.orderedAt ?? '',
      sample.receivedAt ?? '',
      sample.tatMinutes ?? '',
      sample.technicianName ?? '',
    ]);
    downloadCsv(
      `lab-queue-${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows]
    );
  };

  const handleBulkRelease = async () => {
    if (releasableSelected.length === 0) {
      setToolbarError(
        'Select at least one sample with status Verified or Resulted to release.'
      );
      return;
    }
    setToolbarError(null);
    setBulkBusy(true);
    try {
      for (const sample of releasableSelected) {
        await context.actions.releaseOrder(sample.id);
      }
      setSelectedSampleIds(new Set());
    } catch (error) {
      setToolbarError(
        error instanceof Error ? error.message : 'Bulk release failed.'
      );
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <LabQueueFilterSidebar
        priority={priority}
        setPriority={setPriority}
        statuses={statuses}
        setStatuses={setStatuses}
        departments={departments}
        setDepartments={setDepartments}
        onReset={() => {
          setPriority('all');
          setStatuses(new Set(['Received', 'Accessioned', 'In Progress', 'Pending Verify', 'Verified / Released']));
          setDepartments(new Set(LAB_DEPARTMENTS));
          setSearchQuery('');
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button"
              onClick={() => navigate('/lab/results/entry')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50"
            >
              Import Samples
            </button>
            <button type="button"
              onClick={() => void handleBulkRelease()}
              disabled={bulkBusy || releasableSelected.length === 0}
              title={
                releasableSelected.length === 0
                  ? 'Select rows with status Resulted or Reviewed to release.'
                  : `Release ${releasableSelected.length} selected sample(s).`
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkBusy
                ? 'Releasing…'
                : `Bulk Release (${releasableSelected.length})`}
            </button>
            <button type="button"
              onClick={handleExportCsv}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50"
            >
              Export CSV
            </button>
          </div>
          {toolbarError ? (
            <div
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700"
            >
              {toolbarError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 text-sm">
              <span className="text-slate-700">
                Showing <span className="font-bold">{filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}</span> of <span className="font-bold">{formatNumber(filtered.length)}</span> matching samples
                <span className="text-slate-400"> · {formatNumber(allSamples.length)} total</span>
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                >
                  <option value={25}>Show 25 per page</option>
                  <option value={50}>Show 50 per page</option>
                </select>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Prev
                </button>
                <span className="text-xs font-bold text-slate-500">Page {safePage} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            </div>

            <div className="min-w-[1100px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-3">
                      <span className="sr-only">Select sample</span>
                    </th>
                    <th className="px-3 py-3">Sample ID</th>
                    <th className="px-3 py-3">Patient</th>
                    <th className="px-3 py-3">Doctor / Clinic</th>
                    <th className="px-3 py-3">Tests</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Collection</th>
                    <th className="px-3 py-3">TAT</th>
                    <th className="px-3 py-3">Tech</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-12 text-center text-sm text-slate-500">
                        No samples match your current filters.
                        <span className="mt-1 block text-xs text-slate-400">Try adjusting or resetting the filters in the sidebar.</span>
                      </td>
                    </tr>
                  ) : visible.map((sample) => {
                    const isCritical = !!sample.criticalValue;
                    const isStat = sample.priority === 'STAT';
                    const isUrgent = sample.priority === 'Urgent';
                    const rowBgClass = isCritical || isStat
                      ? 'bg-red-50/70 hover:bg-red-50'
                      : isUrgent
                      ? 'bg-amber-50/40 hover:bg-amber-50/60'
                      : 'hover:bg-slate-50/60';
                    const indicatorClass = isCritical || isStat
                      ? 'bg-red-500'
                      : isUrgent
                      ? 'bg-amber-400'
                      : 'bg-transparent';
                    const barcodeColor = isCritical || isStat
                      ? 'text-red-500'
                      : isUrgent
                      ? 'text-amber-500'
                      : 'text-slate-300';
                    const insurancePillColor = insurancePillClass(sample.insurancePlan);
                    const bloodPosNeg = bloodTypeColor(sample.bloodType);
                    return (
                      <tr key={sample.id} className={`align-top ${rowBgClass}`}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedSampleIds.has(sample.id)}
                            onChange={() => toggleSampleSelected(sample.id)}
                            aria-label={`Select sample ${sample.orderCode}`}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="relative px-3 py-3">
                          <span className={`absolute left-0 top-0 h-full w-1 ${indicatorClass}`} aria-hidden="true" />
                          <div className="font-['DM_Mono'] text-xs font-bold text-slate-700">{sample.orderCode}</div>
                          <div className={`font-['DM_Mono'] text-[11px] tracking-widest ${barcodeColor}`}>▐▌▌▐▐▌▌▐</div>
                          {sample.insurancePlan ? (
                            <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${insurancePillColor}`}>
                              {sample.insurancePlan}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-900">{sample.patientName}</div>
                          <div className="text-xs text-slate-500">
                            {ageGenderLabel(sample.patientAge, sample.patientGender)}
                            {sample.bloodType ? (
                              <span> · <span className={`font-bold ${bloodPosNeg}`}>{sample.bloodType}</span></span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-700">{sample.doctorName}</div>
                          <div className="text-xs text-slate-500">{sample.clinicName}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-['DM_Mono'] text-xs font-bold text-indigo-600">{sample.testNames.length}</div>
                          <div className="text-xs text-slate-500">{sample.testNames.slice(0, 2).join(' · ')}</div>
                        </td>
                        <td className="px-3 py-3">
                          <Pill className={priorityClass[sample.priority]}>
                            {sample.priority === 'STAT' ? '⚡ STAT' : sample.priority === 'Urgent' ? '⚡ Urgent' : 'Routine'}
                          </Pill>
                        </td>
                        <td className="px-3 py-3">
                          <Pill className={isCritical ? 'bg-red-100 text-red-700 ring-red-200' : sampleStatusBadge[sample.status]}>
                            {isCritical ? '⚠️ CRITICAL UNNOTIFIED' : sampleStatusLabel(sample.status, false)}
                          </Pill>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          <div>{formatDateShort(sample.orderedAt)} · {formatTimeShort(sample.orderedAt)}</div>
                          <div>Rcvd: {formatTimeShort(sample.receivedAt)}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          <div className={`font-semibold ${
                            (sample.tatMinutes ?? 0) > 240
                              ? 'text-red-600'
                              : (sample.tatMinutes ?? 0) > 180
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}>
                            {formatTat(sample.tatMinutes)}
                          </div>
                          <div>Target: &lt;4h</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            sample.technicianInitials && sample.technicianInitials !== 'U'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {sample.technicianInitials ?? 'U'}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500">{sample.technicianName ?? 'Unassigned'}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button"
                              onClick={() => navigate(`/lab/results?orderId=${sample.id}`)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
