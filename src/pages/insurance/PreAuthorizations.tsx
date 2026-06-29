import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { bulkApprovePreAuthorizations } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import InsuranceShell, {
  PreAuthAlert,
  PreAuthHostedTable,
  useInsurancePageData,
} from './InsuranceShell';

export const InsurancePreAuthorizations = () => {
  const { data, error, overduePreAuth, refetch } = useInsurancePageData();
  const preAuths = useMemo(() => data?.preAuthorizations ?? [], [data?.preAuthorizations]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'review' | 'deny' | 'overdue' | 'approved'>('all');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let rows = preAuths;
    if (filter === 'urgent') rows = rows.filter((p) => p.priority === 'urgent');
    else if (filter === 'review') rows = rows.filter((p) => p.aiRecommendation === 'review');
    else if (filter === 'deny') rows = rows.filter((p) => p.aiRecommendation === 'deny');
    else if (filter === 'overdue') rows = rows.filter((p) => p.status === 'overdue');
    else if (filter === 'approved') rows = rows.filter((p) => p.status === 'approved');
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.externalRef.toLowerCase().includes(q) ||
          p.patientName.toLowerCase().includes(q) ||
          p.providerName.toLowerCase().includes(q) ||
          p.procedureName.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [preAuths, filter, search]);

  const aiBulkApproveRows = useMemo(
    () =>
      preAuths.filter(
        (p) =>
          p.aiRecommendation === 'approve' &&
          (p.aiConfidencePercent ?? 0) >= 95 &&
          p.status !== 'approved',
      ),
    [preAuths],
  );
  const aiBulkApprove = aiBulkApproveRows.length;

  const handleBulkApprove = async () => {
    if (aiBulkApproveRows.length === 0) return;
    setBulkError(null);
    setBulkBusy(true);
    try {
      await bulkApprovePreAuthorizations(
        aiBulkApproveRows.map((row) => ({ id: row.id, requestedAmountAed: row.requestedAmountAed })),
      );
      refetch();
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Bulk approval failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleRunAiTriage = () => {
    setFilter('review');
  };

  const filterTabs: Array<{ id: typeof filter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: preAuths.length },
    { id: 'urgent', label: 'Urgent', count: preAuths.filter((p) => p.priority === 'urgent').length },
    { id: 'review', label: 'AI: Review', count: preAuths.filter((p) => p.aiRecommendation === 'review').length },
    { id: 'deny', label: 'AI: Deny', count: preAuths.filter((p) => p.aiRecommendation === 'deny').length },
    { id: 'overdue', label: 'Overdue', count: preAuths.filter((p) => p.status === 'overdue').length },
    { id: 'approved', label: 'Approved', count: preAuths.filter((p) => p.status === 'approved').length },
  ];

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <PreAuthAlert item={overduePreAuth} />
      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Pre-Authorizations</h2>
            <p className="mt-0.5 text-xs text-slate-400">Review urgent, high, and routine authorization requests</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleBulkApprove()}
                disabled={bulkBusy || aiBulkApprove === 0}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkBusy ? 'Approving…' : `Bulk Approve AI Recommended (${aiBulkApprove})`}
              </button>
              <button
                type="button"
                onClick={handleRunAiTriage}
                className="rounded-lg bg-[#1E3A5F] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#27537f]"
              >
                Run AI triage
              </button>
            </div>
            {bulkError ? <p className="text-[11px] font-semibold text-rose-600">{bulkError}</p> : null}
          </div>
        </div>
        <div className="border-b border-slate-100 px-5 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                maxLength={FORM_FIELD_LIMITS.searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                placeholder="Search request, member, provider, procedure..."
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${filter === tab.id ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {tab.label} <span className="opacity-70">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5">
          <PreAuthHostedTable rows={filtered} onApproved={refetch} />
        </div>
      </article>
    </InsuranceShell>
  );
};

export default InsurancePreAuthorizations;