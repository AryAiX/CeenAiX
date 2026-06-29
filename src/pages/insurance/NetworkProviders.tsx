import { useState } from 'react';
import { Search } from 'lucide-react';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import InsuranceShell, {
  KpiHostedCard,
  NetworkProvidersTable,
  formatNumber,
  useInsurancePageData,
} from './InsuranceShell';

export const InsuranceNetworkProviders = () => {
  const { data, loading, error, refetch } = useInsurancePageData();
  const providers = data?.networkProviders ?? [];
  const totalClaims = providers.reduce((sum, p) => sum + p.claimsCount, 0);
  const avgApproval = providers.length
    ? Math.round(providers.reduce((sum, p) => sum + p.approvalRatePercent, 0) / providers.length)
    : 0;
  const flaggedFraud = providers.filter(
    (p) => p.fraudScore === 'high' || p.fraudScore === 'medium',
  ).length;
  const [search, setSearch] = useState('');

  const filtered = providers.filter(
    (p) =>
      !search.trim() ||
      p.providerName.toLowerCase().includes(search.toLowerCase()) ||
      p.specialty.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiHostedCard label="In-Network Providers" value={loading ? '...' : formatNumber(providers.length)} caption="Contracted facilities" tone="blue" />
        <KpiHostedCard label="Total Claims" value={loading ? '...' : formatNumber(totalClaims)} caption="This month" tone="emerald" />
        <KpiHostedCard label="Avg Approval Rate" value={loading ? '...' : `${avgApproval}%`} caption="Across network" tone="violet" />
        <KpiHostedCard label="Flagged for Review" value={loading ? '...' : formatNumber(flaggedFraud)} caption="Fraud / denial outliers" tone="red" />
      </section>

      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Network Providers</h2>
            <p className="mt-0.5 text-xs text-slate-400">Provider performance, approvals, and cost outliers</p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
              placeholder="Search provider or specialty..."
            />
          </div>
        </div>
        <div className="p-5">
          <NetworkProvidersTable rows={filtered} />
        </div>
      </article>
    </InsuranceShell>
  );
};

export default InsuranceNetworkProviders;