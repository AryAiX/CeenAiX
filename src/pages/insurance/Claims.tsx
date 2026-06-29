import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { type InsuranceClaim } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import InsuranceShell, {
  KpiHostedCard,
  StatusPill,
  formatCurrency,
  formatDate,
  formatNumber,
  planTierTone,
  statusTone,
  titleCase,
  useInsurancePageData,
} from './InsuranceShell';

export const InsuranceClaims = () => {
  const { data, loading, error, claimTotal, refetch } = useInsurancePageData();
  const claims = useMemo(() => data?.claims ?? [], [data?.claims]);
  const profile = data?.profile;
  const submitted = claims.filter((c) => c.status === 'submitted').length;
  const review = claims.filter((c) => c.status === 'under_review').length;
  const approved = claims.filter((c) => c.status === 'approved').length;
  const denied = claims.filter((c) => c.status === 'denied').length;
  const appealed = claims.filter((c) => c.status === 'appealed').length;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InsuranceClaim['status']>('all');

  const filtered = useMemo(() => {
    let rows = claims;
    if (statusFilter !== 'all') rows = rows.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.externalRef.toLowerCase().includes(q) ||
          c.patientName.toLowerCase().includes(q) ||
          c.providerName.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [claims, statusFilter, search]);

  const tabs: Array<{ id: typeof statusFilter; label: string; count: number; tone: string }> = [
    { id: 'all', label: 'All', count: claims.length, tone: 'bg-slate-100 text-slate-700' },
    { id: 'submitted', label: 'Submitted', count: submitted, tone: 'bg-blue-100 text-blue-700' },
    { id: 'under_review', label: 'Under Review', count: review, tone: 'bg-amber-100 text-amber-700' },
    { id: 'approved', label: 'Approved', count: approved, tone: 'bg-emerald-100 text-emerald-700' },
    { id: 'denied', label: 'Denied', count: denied, tone: 'bg-rose-100 text-rose-700' },
    { id: 'appealed', label: 'Appealed', count: appealed, tone: 'bg-violet-100 text-violet-700' },
  ];

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiHostedCard label="Total Value" value={loading ? '...' : formatCurrency(claimTotal)} caption={`${formatNumber(claims.length)} claims this period`} tone="blue" />
        <KpiHostedCard label="Auto-Approved" value={loading ? '...' : formatNumber(approved)} caption={profile?.aiAutoApprovalPercent != null ? `${profile.aiAutoApprovalPercent}% auto-rate` : 'AI auto-approved'} tone="emerald" />
        <KpiHostedCard label="Pending" value={loading ? '...' : formatNumber(submitted + review)} caption={`${review} under review · ${submitted} submitted`} tone="amber" />
        <KpiHostedCard label="Denied" value={loading ? '...' : formatNumber(denied)} caption="Awaiting appeal window" tone="red" />
        <KpiHostedCard label="Appealed" value={loading ? '...' : formatNumber(appealed)} caption="Re-adjudication queue" tone="violet" />
      </section>

      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Claims Worklist</h2>
            <p className="mt-0.5 text-xs text-slate-400">Claims oversight and payment decisions</p>
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
                placeholder="Search claim ref, member, or provider..."
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusFilter === tab.id ? 'bg-[#1E3A5F] text-white' : `${tab.tone} hover:opacity-80`}`}
                >
                  {tab.label} <span className="opacity-70">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <div className="overflow-x-auto">
              <table className="min-w-[840px] w-full text-sm">
                <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5">Claim Ref</th>
                    <th className="px-3 py-2.5">Member</th>
                    <th className="px-3 py-2.5">Provider</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map((claim) => (
                    <tr key={claim.id}>
                      <td className="px-3 py-3 font-mono text-xs font-bold text-slate-700">{claim.externalRef}</td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold text-slate-900">{claim.patientName}</div>
                        <div className="text-[11px] text-slate-500">
                          {claim.planTier ? (
                            <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${planTierTone(claim.planTier)}`}>
                              {claim.planTier}
                            </span>
                          ) : null}
                          {claim.planName}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">{claim.providerName}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{claim.claimType ?? '—'}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-bold text-slate-800">{formatCurrency(claim.amountAed)}</td>
                      <td className="px-3 py-3">
                        <StatusPill tone={statusTone(claim.status)}>
                          {titleCase(claim.status.replace('_', ' '))}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{formatDate(claim.submittedAt)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">No claims match this filter.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </article>
    </InsuranceShell>
  );
};

export default InsuranceClaims;