import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CircleDollarSign, ClipboardList, Layers, Mail, Plug, UserPlus, Users, X } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, formatAed, exportRowsToCsv, type AdminContext } from './AdminShell';
import type { AdminInsurancePartnerRow } from '../../types/database';

type InsuranceFilter = 'all' | 'premium' | 'standard' | 'api_issues' | 'fraud';
/**
 * platform_revenue_label is a display string (e.g. "AED 12,500/mo").
 * No numeric revenue field exists on AdminInsurancePartnerRow yet —
 * this parse is a stopgap until a platform_revenue_aed column is added.
 */
const parseRevenueLabel = (label: string | null): number => {
  const match = label?.match(/AED\s*([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
};

const BreakdownBar = ({ label, count, max }: { label: string; count: number; max: number }) => (
  <div className="mb-2">
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="text-slate-500">{count}</span>
    </div>
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div
        className="h-2 rounded-full bg-blue-500"
        style={{ width: max > 0 ? `${(count / max) * 100}%` : '0%' }}
      />
    </div>
  </div>
);

const InsuranceView = ({ context }: { context: AdminContext }) => {
  const navigate = useNavigate();
  const partners = context.insurancePartners;
  const ctx = context.dashboard?.context;
  const [filter, setFilter] = useState<InsuranceFilter>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showOnboardComingSoon, setShowOnboardComingSoon] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'premium') return partners.filter((p) => p.partner_tier === 'premium');
    if (filter === 'standard') return partners.filter((p) => p.partner_tier === 'standard');
    if (filter === 'api_issues') return partners.filter((p) => p.api_status !== 'healthy');
    if (filter === 'fraud') return partners.filter((p) => (p.fraud_alert_count || 0) > 0);
    return partners;
  }, [partners, filter]);

  const totalMembers = partners.reduce((acc, p) => acc + p.members, 0);
  const totalClaimsToday = partners.reduce((acc, p) => acc + p.claims_today, 0);
  const totalClaimValueToday = partners.reduce((acc, p) => acc + p.claim_value_today_aed, 0);
  const apisHealthy = partners.filter((p) => p.api_status === 'healthy').length;
  const fraudOpen = partners.reduce((acc, p) => acc + (p.fraud_alert_count || 0), 0);
  const monthlyRevenue = partners.reduce((acc, p) => acc + parseRevenueLabel(p.platform_revenue_label), 0);

  const insuredMembersPct =
    ctx?.total_patients && totalMembers
      ? `${((totalMembers / ctx.total_patients) * 100).toFixed(1)}% of all platform patients`
      : `Across ${partners.length} insurer${partners.length !== 1 ? 's' : ''}`;

  const tabs: { key: InsuranceFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'premium', label: 'Premium Partners' },
    { key: 'standard', label: 'Standard Partners' },
    { key: 'api_issues', label: 'API Issues' },
    { key: 'fraud', label: 'Has Fraud Alerts' },
  ];

  const damanWarning = partners.find((p) => p.api_status !== 'healthy');

  const analytics = useMemo(() => {
    const memberBands = [
      { label: 'Under 10K members', count: 0 },
      { label: '10K – 50K members', count: 0 },
      { label: '50K – 200K members', count: 0 },
      { label: '200K+ members', count: 0 },
    ];
    let government = 0;
    let privateCount = 0;
    let slaCompliant = 0;
    let slaBreach = 0;
    const planCounts = new Map<string, number>();

    partners.forEach((p) => {
      if (p.members < 10_000) memberBands[0].count += 1;
      else if (p.members < 50_000) memberBands[1].count += 1;
      else if (p.members < 200_000) memberBands[2].count += 1;
      else memberBands[3].count += 1;

      if (p.is_government) government += 1;
      else privateCount += 1;

      if (p.sla_status === 'compliant') slaCompliant += 1;
      else slaBreach += 1;

      p.plan_pills.forEach((plan) => {
        planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
      });
    });

    const planRows = Array.from(planCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return {
      memberBands,
      ownershipRows: [
        { label: 'Government', count: government },
        { label: 'Private', count: privateCount },
      ],
      slaRows: [
        { label: 'SLA Compliant', count: slaCompliant },
        { label: 'SLA Breach', count: slaBreach },
      ],
      planRows,
    };
  }, [partners]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Insurance Partners"
        subtitle="Manage insurer integrations, claims processing, fraud monitoring, and API health"
      >
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
          {partners.length} Active
        </span>
        <button
          type="button"
          onClick={() => setShowAnalytics(true)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Analytics
        </button>
        <button
          type="button"
          onClick={() =>
            exportRowsToCsv(
              filtered.map((p) => ({
                name: p.insurer_name,
                cbuae_license: p.cbuae_license,
                partner_tier: p.partner_tier,
                api_status: p.api_status,
                members: p.members,
                claims_today: p.claims_today,
                claim_value_today_aed: p.claim_value_today_aed,
                fraud_alert_count: p.fraud_alert_count,
                platform_revenue_label: p.platform_revenue_label ?? '',
              } satisfies Record<string, unknown>)),
              `insurance-partners-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
          disabled={!filtered.length}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => setShowOnboardComingSoon(true)}
          className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Onboard Insurer
        </button>
      </PageHeader>

      {damanWarning ? (
        <Card className="!p-3">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-200">
            <span className="font-semibold text-amber-800">
              {damanWarning.api_warning_label ||
                `${damanWarning.insurer_name} API degraded — ${damanWarning.api_latency_ms ?? '—'}ms avg latency`}
            </span>
            <a
              href={`mailto:?subject=${encodeURIComponent(
                `Insurer integration alert — ${damanWarning.insurer_name}`
              )}&body=${encodeURIComponent(
                `${damanWarning.insurer_name} API is reporting degraded status (${damanWarning.api_status}, latency ${damanWarning.api_latency_ms ?? '—'}ms).\n\nPlease investigate.`
              )}`}
              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white"
            >
              Notify
            </a>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiTile
          label="Active Insurers"
          value={partners.length}
          caption={`${partners.filter((p) => p.partner_tier === 'premium').length} premium · ${partners.filter((p) => p.partner_tier === 'standard').length} standard`}
          icon={Layers}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="Insured Members"
          value={formatNumber(totalMembers)}
          caption={insuredMembersPct}
          icon={Users}
          iconTone="bg-teal-50 text-teal-600 ring-teal-100"
        />
        <KpiTile
          label="Claims Today"
          value={formatNumber(totalClaimsToday)}
          caption={`${formatAed(totalClaimValueToday)} total value`}
          icon={ClipboardList}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="Insurance Revenue/Month"
          value={formatAed(monthlyRevenue)}
          caption={`From API + data services · ${partners.length} insurers`}
          icon={CircleDollarSign}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
        />
        <KpiTile
          label="Open Fraud Alerts"
          value={fraudOpen}
          caption="Investigations in progress"
          icon={AlertTriangle}
          iconTone="bg-rose-50 text-rose-600 ring-rose-100"
        />
        <KpiTile
          label="APIs Healthy"
          value={`${apisHealthy}/${partners.length} ✅`}
          caption={
            damanWarning
              ? `⚠️ ${damanWarning.insurer_name} degraded`
              : 'All operational'
          }
          icon={Plug}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                filter === tab.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((partner) => (
            <InsurancePartnerCard key={partner.id} partner={partner} />
          ))}
        </div>

        <div className="mt-4 text-sm text-slate-500">
          {partners.length} insurance partners · {formatNumber(totalMembers)} insured members · Claims today:{' '}
          {formatAed(totalClaimValueToday)}
        </div>
      </Card>

      {showAnalytics ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowAnalytics(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Insurance Analytics</h2>
                <p className="text-sm text-slate-500">
                  Based on all {formatNumber(partners.length)} insurance partners
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAnalytics(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Member Base Size</h3>
                {analytics.memberBands.map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.memberBands.map((r) => r.count), 1)} />
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">SLA Compliance</h3>
                {analytics.slaRows.map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.slaRows.map((r) => r.count), 1)} />
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Government vs Private</h3>
                {analytics.ownershipRows.map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.ownershipRows.map((r) => r.count), 1)} />
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Plan Types Offered</h3>
                {analytics.planRows.slice(0, 6).map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.planRows.map((r) => r.count), 1)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showOnboardComingSoon ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowOnboardComingSoon(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                <UserPlus className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardComingSoon(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Coming Soon: Insurer Onboarding</h2>
            <p className="mt-2 text-sm text-slate-600">
              Instead of registering an insurance partner directly from here, admins
              will be able to send an invite by email to the insurer's integration
              contact. They complete their own onboarding — API credentials, plan
              setup, CBUAE license details — on their own, with this admin panel
              tracking the invite through to a live partner.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-100">
              <Mail className="h-4 w-4 shrink-0" />
              This needs an email sending capability to be built first — it's tracked
              as its own upcoming feature.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const InsurancePartnerCard = ({ partner }: { partner: AdminInsurancePartnerRow }) => {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-base font-bold text-white">
            {partner.initials}
          </div>
          <div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">{partner.insurer_name}</h3>
            <div className="font-['DM_Mono'] text-[11px] text-slate-500">{partner.cbuae_license}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {partner.partner_tier === 'premium' ? (
                <Pill tone="amber">⭐ Premium Partner</Pill>
              ) : (
                <Pill tone="slate">Standard Partner</Pill>
              )}
              {partner.is_government ? <Pill tone="violet">🏛️ Government</Pill> : null}
              {partner.is_new_partner ? <Pill tone="blue">New</Pill> : null}
            </div>
          </div>
        </div>
        <Pill
          tone={
            partner.api_status === 'healthy' ? 'emerald' : partner.api_status === 'degraded' ? 'amber' : 'rose'
          }
        >
          {partner.api_status === 'healthy'
            ? `✅ ${partner.api_latency_ms ?? 0}ms`
            : partner.api_status === 'degraded'
              ? `⚠️ API ${partner.api_latency_ms ?? 0}ms`
              : `🔥 Down`}
        </Pill>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-2 text-center">
          <div className="font-['DM_Mono'] text-base font-bold text-slate-900">{formatNumber(partner.members)}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Members</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 text-center">
          <div className="font-['DM_Mono'] text-base font-bold text-slate-900">{partner.claims_today}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Claims Today</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 text-center">
          <div className="font-['DM_Mono'] text-base font-bold text-slate-900">
            {formatAed(partner.claim_value_today_aed)}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Value Today</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 text-center">
          <div className="font-['DM_Mono'] text-base font-bold text-slate-900">
            {partner.auto_approval_pct.toFixed(1)}%
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Auto %</div>
        </div>
      </div>

      {partner.plan_pills.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {partner.plan_pills.map((plan) => (
            <Pill key={plan} tone="blue">
              {plan}
            </Pill>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{partner.partner_since}</span>
        <span className="font-bold text-slate-700">{partner.platform_revenue_label}</span>
      </div>

      <div className="mt-3 space-y-1 text-xs">
        {partner.api_warning_label ? (
          <div className="rounded-lg bg-amber-50 px-2 py-1 font-bold text-amber-700 ring-1 ring-amber-200">
            {partner.api_warning_label}
          </div>
        ) : null}
        {partner.sla_breach_label ? (
          <div className="rounded-lg bg-rose-50 px-2 py-1 font-bold text-rose-700 ring-1 ring-rose-200">
            {partner.sla_breach_label}
          </div>
        ) : null}
        {partner.notes ? (
          <div className="rounded-lg bg-slate-50 px-2 py-1 text-slate-700 ring-1 ring-slate-200">{partner.notes}</div>
        ) : null}
        <div
          className={`rounded-lg px-2 py-1 font-bold ring-1 ${
            partner.sla_status === 'compliant'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-rose-50 text-rose-700 ring-rose-200'
          }`}
        >
          {partner.breach_label}
        </div>
      </div>
    </Card>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const AdminInsurance = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Insurance Partners · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="insurance" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : (
        <InsuranceView context={context} />
      )}
    </AdminShell>
  );
};
