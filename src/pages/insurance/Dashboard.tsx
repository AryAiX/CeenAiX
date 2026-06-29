import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Sparkles,
  Users,
} from 'lucide-react';
import { bulkApprovePreAuthorizations } from '../../hooks';
import InsuranceShell, {
  AiInsightCard,
  ClaimsTodayCard,
  FraudAlertCard,
  KpiHostedCard,
  MonthlyVolumeChart,
  NetworkProvidersTable,
  PreAuthAlert,
  PreAuthHostedTable,
  formatCurrency,
  formatNumber,
  useInsurancePageData,
} from './InsuranceShell';

export const InsuranceDashboard = () => {
  const navigate = useNavigate();
  const { data, loading, error, overduePreAuth, openFraud, refetch } = useInsurancePageData();
  const profile = data?.profile ?? null;
  const preAuths = useMemo(() => data?.preAuthorizations ?? [], [data?.preAuthorizations]);
  const fraudAlerts = data?.fraudAlerts ?? [];
  const aiInsights = data?.aiInsights ?? [];
  const monthlyVolume = data?.monthlyClaimsVolume ?? [];
  const pendingPreAuths = preAuths.filter((p) => p.status === 'review' || p.status === 'overdue');
  const urgentPending = pendingPreAuths.filter((p) => p.priority === 'urgent').length;
  const standardPending = pendingPreAuths.length - urgentPending;
  const aiHigh = fraudAlerts.filter((a) => a.severity === 'high' && a.status !== 'resolved').length;
  const aiMedium = fraudAlerts.filter((a) => a.severity === 'medium' && a.status !== 'resolved').length;

  const aiBulkApprove = useMemo(
    () =>
      preAuths.filter(
        (p) =>
          p.aiRecommendation === 'approve' &&
          p.aiConfidencePercent != null &&
          p.aiConfidencePercent >= 95 &&
          p.status !== 'approved',
      ),
    [preAuths],
  );
  const aiBulkApproveCount = aiBulkApprove.length;
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const handleBulkApprove = async () => {
    if (aiBulkApprove.length === 0) return;
    setBulkError(null);
    setBulkBusy(true);
    try {
      await bulkApprovePreAuthorizations(
        aiBulkApprove.map((row) => ({ id: row.id, requestedAmountAed: row.requestedAmountAed })),
      );
      refetch();
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Bulk approval failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  const [filter, setFilter] = useState<'all' | 'urgent' | 'review' | 'deny' | 'overdue'>('all');
  const filtered = useMemo(() => {
    if (filter === 'urgent') return preAuths.filter((p) => p.priority === 'urgent');
    if (filter === 'review') return preAuths.filter((p) => p.aiRecommendation === 'review');
    if (filter === 'deny') return preAuths.filter((p) => p.aiRecommendation === 'deny');
    if (filter === 'overdue') return preAuths.filter((p) => p.status === 'overdue');
    return preAuths;
  }, [preAuths, filter]);

  const filterTabs: Array<{ id: typeof filter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: preAuths.length },
    { id: 'urgent', label: 'Urgent', count: preAuths.filter((p) => p.priority === 'urgent').length },
    { id: 'review', label: 'AI: Review', count: preAuths.filter((p) => p.aiRecommendation === 'review').length },
    { id: 'deny', label: 'AI: Deny', count: preAuths.filter((p) => p.aiRecommendation === 'deny').length },
    { id: 'overdue', label: 'Overdue', count: preAuths.filter((p) => p.status === 'overdue').length },
  ];

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <PreAuthAlert item={overduePreAuth} />

      {/* KPI grid */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiHostedCard
          label="Pending Pre-Authorizations"
          value={loading ? '...' : formatNumber(pendingPreAuths.length)}
          caption={
            <>
              <span className="font-bold text-amber-700">{urgentPending} urgent</span>
              <span className="text-slate-400"> ({profile?.slaTargetUrgentHours ?? 4}h)</span>
              <span className="text-slate-400"> · </span>
              <span>{standardPending} standard</span>
            </>
          }
          tone="amber"
        />
        <KpiHostedCard
          label="Claims Submitted Today"
          value={loading ? '...' : formatNumber(profile?.claimsTodayCount)}
          caption={
            <>
              <div className="font-mono font-bold text-slate-700">{formatCurrency(profile?.claimsTodayTotalAed)}</div>
              {profile?.aiAutoApprovalPercent != null ? (
                <div>{profile.aiAutoApprovalPercent}% auto-approved</div>
              ) : null}
            </>
          }
          tone="blue"
        />
        <KpiHostedCard
          label="AI Auto-Approval Rate"
          value={loading ? '...' : `${profile?.aiAutoApprovalPercent ?? 0}%`}
          caption={
            <>
              <div>
                {formatNumber(profile?.claimsTodayApprovedCount)} of {formatNumber(profile?.claimsTodayCount)} claims today
              </div>
              {profile?.aiAutoApprovalChangePercent != null ? (
                <div className="text-emerald-700">↑ +{profile.aiAutoApprovalChangePercent}% vs last week</div>
              ) : null}
            </>
          }
          tone="emerald"
        />
        <KpiHostedCard
          label="Active Fraud Alerts"
          value={loading ? '...' : formatNumber(openFraud.length)}
          caption={
            <>
              <span className="font-bold text-red-700">{aiHigh} HIGH risk</span>
              <span className="text-slate-400"> · </span>
              <span>{aiMedium} medium</span>
            </>
          }
          tone="red"
        />
        <KpiHostedCard
          label="Avg Processing Time"
          value={loading ? '...' : `${profile?.avgProcessingHours ?? 0}h`}
          caption={
            <>
              <div>DHA target: {profile?.slaTargetStandardHours ?? 8}h standard ✅</div>
              <div className="text-amber-700">
                {profile?.slaTargetUrgentHours ?? 4}h urgent ⚠️ ({preAuths.filter((p) => p.status === 'overdue').length} breach)
              </div>
            </>
          }
          tone="violet"
        />
        <KpiHostedCard
          label="Active Members on CeenAiX"
          value={loading ? '...' : formatNumber(profile?.activeMembers)}
          caption={
            <>
              Gold {formatNumber(profile?.membersGold)}
              <span className="text-slate-400"> · </span>
              Silver {formatNumber(profile?.membersSilver)}
              <span className="text-slate-400"> · </span>
              Basic {formatNumber(profile?.membersBasic)}
            </>
          }
          tone="slate"
        />
      </section>

      {/* Pre-Auth Queue + Right rail */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">Pre-Authorization Queue</h2>
                <p className="mt-0.5 text-xs text-slate-400">{pendingPreAuths.length} pending · DHA response required</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleBulkApprove()}
                    disabled={bulkBusy || aiBulkApproveCount === 0}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkBusy ? 'Approving…' : `Bulk Approve AI Recommended (${aiBulkApproveCount})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/insurance/preauth')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    View All →
                  </button>
                </div>
                {bulkError ? <p className="text-[11px] font-semibold text-rose-600">{bulkError}</p> : null}
              </div>
            </div>
            <div className="border-b border-slate-100 px-5 py-3">
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
            <div className="p-5">
              <PreAuthHostedTable rows={filtered} max={5} onApproved={refetch} />
              {filtered.length > 5 ? (
                <button
                  onClick={() => navigate('/insurance/preauth')}
                  className="mt-3 w-full rounded-lg bg-slate-50 px-4 py-2 text-xs font-bold text-[#1E3A5F] hover:bg-slate-100"
                >
                  Show {filtered.length - 5} more pre-auths →
                </button>
              ) : null}
            </div>
          </article>

          {/* Claims Volume Chart */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">
                  Claims Volume &amp; Value — {monthlyVolume[0]?.year ?? new Date().getFullYear()}
                </h2>
                <p className="text-xs text-slate-400">Monthly claims trend</p>
              </div>
            </div>
            <MonthlyVolumeChart points={monthlyVolume} />
            {profile?.claimsMtdAed != null && profile?.claimsBudgetAed != null ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs">
                <div className="text-slate-700">
                  April on-track: <span className="font-mono font-bold">{formatCurrency(profile.claimsMtdAed)}</span> /{' '}
                  <span className="font-mono font-bold">{formatCurrency(profile.claimsBudgetAed)} budget</span>{' '}
                  ({profile.claimsBudgetPct ?? 0}%)
                </div>
                {profile.priorMonthGrowthPercent != null ? (
                  <div className="mt-1 text-emerald-700">↑ March was {profile.priorMonthGrowthPercent}% over previous month</div>
                ) : null}
              </div>
            ) : null}
          </article>
        </div>

        {/* Right rail */}
        <div className="space-y-5 xl:col-span-2">
          <ClaimsTodayCard claims={data?.claims ?? []} activeMembers={profile?.activeMembers} />

          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-900">
                  <Sparkles className="h-4 w-4 text-violet-500" /> AI Risk Intelligence
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">Powered by CeenAiX AI · Risk management insights</p>
              </div>
            </div>
            <div className="space-y-3 p-5">
              {aiInsights.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  No AI insights available.
                </div>
              ) : null}
              {aiInsights.map((insight) => (
                <AiInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">Fraud Alerts</h2>
                <p className="mt-0.5 text-xs text-slate-400">{openFraud.length} active · AI-flagged</p>
              </div>
              <button
                onClick={() => navigate('/insurance/fraud')}
                className="text-xs font-bold text-[#1E3A5F] hover:text-[#27537f]"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3 p-5">
              {openFraud.filter((a) => a.severity === 'high').slice(0, 2).map((alert) => (
                <FraudAlertCard key={alert.id} alert={alert} />
              ))}
              {aiMedium > 0 ? (
                <button
                  onClick={() => navigate('/insurance/fraud')}
                  className="block w-full rounded-lg bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-700 ring-1 ring-amber-100 hover:bg-amber-100"
                >
                  {aiMedium} medium risk alerts →
                </button>
              ) : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">Top Network Providers</h2>
                <p className="mt-0.5 text-xs text-slate-400">By claims volume this month</p>
              </div>
              <button
                onClick={() => navigate('/insurance/network')}
                className="text-xs font-bold text-[#1E3A5F] hover:text-[#27537f]"
              >
                View All →
              </button>
            </div>
            <div className="p-5">
              <NetworkProvidersTable rows={data?.networkProviders ?? []} />
            </div>
          </article>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Review Pre-Auths', icon: ClipboardList, href: '/insurance/preauth' },
          { label: 'Bulk Approve', icon: CheckCircle2, href: '/insurance/preauth' },
          { label: 'Review Fraud', icon: AlertTriangle, href: '/insurance/fraud' },
          { label: 'Generate Report', icon: FileText, href: '/insurance/reports' },
          { label: 'Member Search', icon: Users, href: '/insurance/members' },
          { label: 'Provider Query', icon: Building2, href: '/insurance/network' },
        ].map((btn) => {
          const Icon = btn.icon;
          return (
            <button
              key={btn.label}
              onClick={() => navigate(btn.href)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#1E3A5F] hover:bg-slate-50"
            >
              <Icon className="h-4 w-4 text-[#1E3A5F]" />
              <span>{btn.label}</span>
            </button>
          );
        })}
      </section>
    </InsuranceShell>
  );
};

export default InsuranceDashboard;