import { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  Heart,
  Search,
  Send,
  TrendingUp,
  X,
} from 'lucide-react';
import InsuranceShell, {
  KpiHostedCard,
  StatusPill,
  formatNumber,
  statusTone,
  useInsurancePageData,
} from './InsuranceShell';
import { WellnessCampaignModal } from './WellnessCampaignModal';
import {
  flagMemberForReview,
  logWellnessOutreach,
  type InsuranceMember,
} from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';

// ─── Local types ──────────────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'success' | 'warning' | 'info' }
type RiskFilterKey = 'all' | 'high' | 'medium' | 'low';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOAST_COLORS: Record<Toast['type'], { border: string; color: string; bg: string }> = {
  success: { border: '#6EE7B7', color: '#065F46', bg: '#F0FDF4' },
  warning: { border: '#FCA5A5', color: '#991B1B', bg: '#FFF5F5' },
  info:    { border: '#93C5FD', color: '#1E40AF', bg: '#EFF6FF' },
};

const RISK_FILTER_PILLS: { key: RiskFilterKey; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'high',   label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low',    label: 'Low' },
];

const RISK_PILL_ACTIVE: Record<string, string> = {
  high:   'bg-red-600 text-white border-red-600',
  medium: 'bg-amber-500 text-white border-amber-500',
  low:    'bg-emerald-500 text-white border-emerald-500',
  all:    'bg-slate-700 text-white border-slate-700',
};

// ─── AI Recommendation card data ──────────────────────────────────────────────

interface RecommendationDef {
  riskKey: 'high' | 'medium' | 'low';
  title: string;
  description: (count: number) => string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
}

const RECOMMENDATIONS: RecommendationDef[] = [
  {
    riskKey: 'high',
    title: 'Proactive Care Outreach',
    description: (n) =>
      `${n} high-risk member${n !== 1 ? 's' : ''} identified. Proactive care coordination and outreach can significantly reduce hospitalization and emergency claims.`,
    iconColor: '#DC2626',
    badgeBg: '#FEE2E2',
    badgeText: '#991B1B',
  },
  {
    riskKey: 'medium',
    title: 'Preventive Health Programme',
    description: (n) =>
      `${n} medium-risk member${n !== 1 ? 's' : ''} could benefit from preventive screenings and lifestyle coaching to avoid escalation to high risk.`,
    iconColor: '#F59E0B',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
  },
  {
    riskKey: 'low',
    title: 'Wellness Maintenance',
    description: (n) =>
      `${n} low-risk member${n !== 1 ? 's' : ''} are well-managed. Regular wellness reminders and annual check-up nudges help maintain their healthy status.`,
    iconColor: '#10B981',
    badgeBg: '#D1FAE5',
    badgeText: '#065F46',
  },
];

// ─── InsuranceWellness ────────────────────────────────────────────────────────

export const InsuranceWellness = () => {
  const { data, error, refetch } = useInsurancePageData();
  const members: InsuranceMember[] = useMemo(() => data?.members ?? [], [data?.members]);

  // Table state
  const [search,      setSearch]      = useState('');
  const [riskFilter,  setRiskFilter]  = useState<RiskFilterKey>('all');
  const [modalAudience, setModalAudience] = useState<string | null>(null);
  const showModal = modalAudience !== null;
  const [toasts,      setToasts]      = useState<Toast[]>([]);

  // Toast helper
  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  // Derived counts
  const highCount   = useMemo(() => members.filter(m => m.riskLevel === 'high').length,   [members]);
  const mediumCount = useMemo(() => members.filter(m => m.riskLevel === 'medium').length, [members]);
  const lowCount    = useMemo(() => members.filter(m => m.riskLevel === 'low').length,    [members]);

  // Filtered table rows
  const filtered = useMemo(() => {
    let list = [...members];
    if (riskFilter !== 'all') list = list.filter(m => m.riskLevel === riskFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.patientName.toLowerCase().includes(q) ||
        m.externalMemberId.toLowerCase().includes(q) ||
        m.planName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [members, riskFilter, search]);

  // Action handlers
  const handleFlag = useCallback(async (member: InsuranceMember) => {
    try {
      await flagMemberForReview(member.id, 'Flagged for care review');
      void refetch();
      addToast(`${member.patientName} flagged for care review`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to flag member', 'warning');
    }
  }, [refetch, addToast]);

  const handleOutreach = useCallback(async (member: InsuranceMember) => {
    try {
      await logWellnessOutreach({
        audience: 'single_member',
        recipientCount: 1,
        channels: ['sms', 'email'],
        messageEn: 'Health check-up reminder from your insurance provider.',
        memberId: member.id,
        subjectEn: 'Health Check-Up Reminder',
      });
      void refetch();
      addToast(`Wellness outreach logged for ${member.patientName}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to log outreach', 'warning');
    }
  }, [refetch, addToast]);

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>

      {/* ── SECTION 1 — KPI Strip ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiHostedCard
          label="Active Members"
          value={formatNumber(data?.profile?.activeMembers)}
          caption="On CeenAiX platform"
          tone="blue"
        />
        <KpiHostedCard
          label="High Risk Members"
          value={formatNumber(highCount)}
          caption="Require proactive outreach"
          tone="red"
        />
        <KpiHostedCard
          label="Medium Risk Members"
          value={formatNumber(mediumCount)}
          caption="Preventive care recommended"
          tone="amber"
        />
        <KpiHostedCard
          label="Campaigns Logged"
          value="0"
          caption="Phase 4 will wire campaign history"
          tone="emerald"
        />
      </div>

      {/* ── SECTION 2 — Campaign Launcher ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div
          className="px-6 py-4 flex items-start gap-5"
          style={{ background: 'linear-gradient(135deg, #0F2D4A 0%, #1E3A5F 100%)' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <Send size={22} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white mb-0.5">Wellness Campaign</h2>
            <p className="text-sm text-blue-200 leading-relaxed">
              Send targeted health outreach to your members — annual checkups, chronic disease management, preventive
              care programmes, and benefit expiry reminders.
            </p>
          </div>
          <button
            onClick={() => setModalAudience('all')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all hover:opacity-90"
            style={{ backgroundColor: '#0D9488' }}
          >
            <Send size={15} />
            Send Campaign
          </button>
        </div>
        <div className="px-6 py-3 flex items-center gap-6 border-t border-slate-100">
          {[
            { label: 'Total Portfolio', value: formatNumber(members.length), color: '#1E3A5F' },
            { label: 'High Risk',       value: formatNumber(highCount),      color: '#DC2626' },
            { label: 'Medium Risk',     value: formatNumber(mediumCount),    color: '#F59E0B' },
            { label: 'Low Risk',        value: formatNumber(lowCount),       color: '#10B981' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="font-mono text-base font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-xs text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 3 — Member Risk Table ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}
        >
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Member Risk Overview</h2>
            <p className="text-xs text-slate-400 mt-0.5">Filterable by risk level and name</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono font-bold text-slate-700">{filtered.length}</span> of {members.length} members
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative" style={{ width: 240 }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
              placeholder="Search members or ID…"
              className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none"
            />
          </div>

          {/* Risk pills */}
          <div className="flex items-center gap-1">
            {RISK_FILTER_PILLS.map(pill => {
              const active = riskFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => setRiskFilter(pill.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    active
                      ? (RISK_PILL_ACTIVE[pill.key] ?? 'bg-slate-700 text-white border-slate-700')
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {(search || riskFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setRiskFilter('all'); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50"
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        {members.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Heart size={36} className="text-slate-300" />
            <p className="text-sm text-slate-400">No members data available yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Search size={28} className="text-slate-300" />
            <p className="text-sm text-slate-400">No members match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100" style={{ backgroundColor: '#F8FAFC' }}>
                  {['Member Name', 'Plan', 'Risk Level', 'Utilization %', 'Claim Count', 'Actions'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => (
                  <tr
                    key={member.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    {/* Member Name */}
                    <td className="px-4 py-3" style={{ minWidth: 200 }}>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{member.patientName}</p>
                        <p
                          className="text-xs text-slate-400"
                          style={{ fontFamily: 'DM Mono, monospace' }}
                        >
                          {member.externalMemberId}
                        </p>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-slate-700">{member.planName}</span>
                    </td>

                    {/* Risk Level */}
                    <td className="px-4 py-3">
                      <StatusPill tone={statusTone(member.riskLevel)}>
                        {member.riskLevel}
                      </StatusPill>
                    </td>

                    {/* Utilization % */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(member.utilizationPercent, 100)}%`,
                              backgroundColor:
                                member.utilizationPercent >= 100 ? '#DC2626'
                                : member.utilizationPercent >= 80 ? '#F97316'
                                : member.utilizationPercent >= 60 ? '#F59E0B'
                                : '#10B981',
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-bold"
                          style={{ fontFamily: 'DM Mono, monospace', minWidth: 36 }}
                        >
                          {member.utilizationPercent}%
                        </span>
                      </div>
                    </td>

                    {/* Claim Count */}
                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-bold text-slate-700"
                        style={{ fontFamily: 'DM Mono, monospace' }}
                      >
                        {member.claimCount}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 pr-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void handleFlag(member)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{
                            background: '#FFFBEB',
                            color: '#92400E',
                            border: '1px solid #FDE68A',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FEF3C7'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#FFFBEB'; }}
                        >
                          <AlertTriangle size={11} />
                          Flag
                        </button>
                        <button
                          onClick={() => void handleOutreach(member)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{
                            background: '#EFF6FF',
                            color: '#1E3A5F',
                            border: '1px solid #BFDBFE',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                        >
                          <Send size={11} />
                          Outreach
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 4 — AI Recommendations Panel ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#F5F3FF' }}
          >
            <Brain size={16} color="#7C3AED" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">AI Wellness Recommendations</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Derived from live member risk data — click Send Campaign to launch outreach
            </p>
          </div>
          <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 uppercase tracking-wide">
            AI-generated
          </span>
        </div>

        <div className="p-5 space-y-3">
          {members.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <Heart size={32} className="text-slate-300" />
              <p className="text-sm text-slate-400">No member data to generate recommendations.</p>
            </div>
          ) : (
            RECOMMENDATIONS.map(rec => {
              const count =
                rec.riskKey === 'high'   ? highCount
                : rec.riskKey === 'medium' ? mediumCount
                : lowCount;
              return (
                <div
                  key={rec.riskKey}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 hover:shadow-sm transition-all"
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${rec.iconColor}18` }}
                  >
                    <TrendingUp size={18} color={rec.iconColor} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-slate-800">{rec.title}</p>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{ background: rec.badgeBg, color: rec.badgeText }}
                      >
                        {rec.riskKey}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{rec.description(count)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      <span className="font-mono">{count}</span> member{count !== 1 ? 's' : ''} in this group
                    </p>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => setModalAudience(rec.riskKey === 'high' ? 'high_risk'
                      : rec.riskKey === 'medium' ? 'medium_risk' : 'low_risk')}
                    disabled={count === 0}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#0F2D4A' }}
                  >
                    <Send size={12} />
                    Send Campaign
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Wellness Campaign Modal ── */}
      {showModal && (
        <WellnessCampaignModal
          members={members}
          initialAudience={modalAudience ?? 'all'}
          onClose={() => setModalAudience(null)}
          onSend={count => {
            setModalAudience(null);
            void refetch();
            addToast(`Wellness campaign logged for ${count} member${count !== 1 ? 's' : ''}`, 'success');
          }}
          onError={msg => {
            addToast(msg, 'warning');
          }}
        />
      )}

      {/* ── Toasts ── */}
      <div className="fixed bottom-6 right-6 z-[500] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }}>
        {toasts.map(t => {
          const c = TOAST_COLORS[t.type];
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto"
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.color,
                fontSize: 13,
                fontWeight: 600,
                boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>

    </InsuranceShell>
  );
};

export default InsuranceWellness;
