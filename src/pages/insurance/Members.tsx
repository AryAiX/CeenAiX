import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import InsuranceShell, {
  KpiHostedCard,
  StatusPill,
  formatNumber,
  statusTone,
  useInsurancePageData,
} from './InsuranceShell';

export const InsuranceMembers = () => {
  const { data, loading, error, refetch } = useInsurancePageData();
  const members = useMemo(() => data?.members ?? [], [data?.members]);
  const profile = data?.profile;
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const filtered = useMemo(() => {
    let rows = members;
    if (riskFilter !== 'all') rows = rows.filter((m) => m.riskLevel === riskFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (m) =>
          m.patientName.toLowerCase().includes(q) ||
          m.externalMemberId.toLowerCase().includes(q) ||
          m.planName.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [members, riskFilter, search]);

  const tiers: Array<{ label: string; count: number | null; tone: string }> = [
    { label: 'Gold Tier', count: profile?.membersGold ?? null, tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
    { label: 'Silver Tier', count: profile?.membersSilver ?? null, tone: 'bg-slate-50 text-slate-700 ring-slate-200' },
    { label: 'Basic Tier', count: profile?.membersBasic ?? null, tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  ];

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiHostedCard
          label="Active Members"
          value={loading ? '...' : formatNumber(profile?.activeMembers ?? members.length)}
          caption="On CeenAiX platform"
          tone="blue"
        />
        {tiers.map((tier) => (
          <article key={tier.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className={`mb-2 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${tier.tone}`}>
              {tier.label}
            </div>
            <div className="font-mono text-2xl font-bold text-slate-900">
              {tier.count != null ? formatNumber(tier.count) : '—'}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">members</div>
          </article>
        ))}
      </section>

      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Members</h2>
            <p className="mt-0.5 text-xs text-slate-400">Active plan members and utilization risk</p>
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
                placeholder="Search by name, member ID, or plan..."
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'high', 'medium', 'low'] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => setRiskFilter(tone)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize ${riskFilter === tone ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {tone === 'all' ? 'All' : `${tone} risk`}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 xl:grid-cols-2">
          {filtered.map((member) => (
            <div key={member.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{member.patientName}</div>
                  <div className="text-xs text-slate-500">
                    <span className="font-mono">{member.externalMemberId}</span> · {member.planName}
                  </div>
                </div>
                <StatusPill tone={statusTone(member.riskLevel)}>{member.riskLevel} risk</StatusPill>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div
                  className={`h-2 rounded-full ${member.utilizationPercent >= 75 ? 'bg-red-500' : member.utilizationPercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, member.utilizationPercent)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span className="font-mono">{member.utilizationPercent}% utilization</span>
                <span>{member.claimCount} claims YTD</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No members match.
            </div>
          ) : null}
        </div>
      </article>
    </InsuranceShell>
  );
};

export default InsuranceMembers;