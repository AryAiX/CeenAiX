import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Bot, CheckCircle2, CircleDollarSign, Phone, Stethoscope, Zap } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, formatAed, formatDate, exportRowsToCsv, type AdminContext } from './AdminShell';

type AiTab = 'performance' | 'conversations' | 'population' | 'safety' | 'models';
const AiView = ({ context }: { context: AdminContext }) => {
  const ctx = context.aiDashboard?.context ?? context.dashboard?.context ?? null;
  const langs = context.aiDashboard?.languages ?? [];
  const topics = context.aiDashboard?.topics ?? [];
  const portals = context.aiDashboard?.portals ?? [];
  const [tab, setTab] = useState<AiTab>('performance');

  const currentMonthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const prevMonthName = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    .toLocaleDateString(undefined, { month: 'long' });

  const arabicLang = langs.find((l) => l.label.toLowerCase().includes('arabic'));
  const arabicPct = arabicLang ? `${arabicLang.percent.toFixed(0)}% Arabic reflects UAE population` : null;

  const safetyReviewedCount = (ctx?.ai_safety_escalated ?? 0) + (ctx?.ai_safety_resolved ?? 0);
  const safetyPendingCount = Math.max((ctx?.ai_safety_flags_today ?? 0) - safetyReviewedCount, 0);

  const aiServices = context.systemHealth?.aiServices ?? [];

  const tabs: { key: AiTab; label: string }[] = [
    { key: 'performance', label: 'AI Performance' },
    { key: 'conversations', label: 'Conversations' },
    { key: 'population', label: 'Population Health' },
    { key: 'safety', label: 'Safety Monitor' },
    { key: 'models', label: 'Model Management' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="AI Analytics" subtitle="Claude Sonnet · CeenAiX AI v2.4.1 · Production">
        <Pill tone="emerald">
          ✅ All AI systems operational · {ctx?.ai_avg_response_sec?.toFixed(1) ?? '—'}s avg ·{' '}
          {ctx?.ai_uptime_pct?.toFixed(2) ?? '—'}% uptime
        </Pill>
        {/* The AI analytics RPC only returns a single window; the chips
            below are intentionally view-state placeholders until the hook
            supports a date filter. Once it does, the same buttons can set
            local state and refetch — keeping callsites stable. */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Date-window filtering ships when the AI analytics RPC supports a window parameter."
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed"
        >
          today
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Date-window filtering ships when the AI analytics RPC supports a window parameter."
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed"
        >
          week
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Date-window filtering ships when the AI analytics RPC supports a window parameter."
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed"
        >
          month
        </button>
        <button
          type="button"
          onClick={() => {
            const rows: Record<string, unknown>[] = [
              {
                metric: 'sessions_today', value: ctx?.ai_sessions_today ?? '',
                sessions_month: ctx?.ai_sessions_month ?? '',
                sessions_alltime: ctx?.ai_sessions_alltime ?? '',
                active_now: ctx?.ai_active_now ?? '',
                avg_response_sec: ctx?.ai_avg_response_sec ?? '',
                uptime_pct: ctx?.ai_uptime_pct ?? '',
                safety_flags_today: ctx?.ai_safety_flags_today ?? '',
                safety_escalated: ctx?.ai_safety_escalated ?? '',
                safety_resolved: ctx?.ai_safety_resolved ?? '',
              },
              ...langs.map((l) => ({ section: 'language', label: l.label, sessions: l.sessions, percent: l.percent } satisfies Record<string, unknown>)),
              ...topics.map((t) => ({ section: 'topic', label: t.label, sessions: t.sessions ?? '', percent: t.percent } satisfies Record<string, unknown>)),
              ...portals.map((p) => ({ section: 'portal', label: p.label, sessions: p.sessions ?? '' } satisfies Record<string, unknown>)),
            ];
            exportRowsToCsv(rows, `ai-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
          }}
          className="rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          Export AI Report
        </button>
      </PageHeader>

      <Card className="bg-gradient-to-br from-purple-50 to-violet-50 ring-purple-200">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-purple-700">CeenAiX Clinical AI</div>
        <div className="mt-1 text-sm text-slate-600">Powered by Claude Sonnet · Anthropic</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {ctx?.platform_version ? (
            <Pill tone="purple">{ctx.platform_version}</Pill>
          ) : null}
          <Pill tone="emerald">Production</Pill>
          <Pill tone="blue">UAE Region</Pill>
          <Pill tone="violet">FHIR R4</Pill>
        </div>
        <div className="mt-3 text-xs text-slate-500">Last updated: {formatDate(ctx?.updated_at)}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <KpiTile
            label="Active Now"
            value={formatNumber(ctx?.ai_active_now ?? 0)}
            icon={Activity}
            iconTone="bg-emerald-100 text-emerald-700 ring-emerald-200"
          />
          <KpiTile
            label="Avg Response"
            value={`${ctx?.ai_avg_response_sec?.toFixed(1) ?? '—'}s`}
            icon={Zap}
            iconTone="bg-amber-100 text-amber-700 ring-amber-200"
          />
          <KpiTile
            label="Uptime 30d"
            value={`${ctx?.ai_uptime_pct?.toFixed(2) ?? '—'}%`}
            icon={CheckCircle2}
            iconTone="bg-blue-100 text-blue-700 ring-blue-200"
          />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiTile
          label="AI Sessions Today"
          value={formatNumber(ctx?.ai_sessions_today ?? 0)}
          caption={`Active: ${ctx?.ai_active_now ?? 0} sessions`}
          icon={Bot}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
        />
        <KpiTile
          label="This Month"
          value={formatNumber(ctx?.ai_sessions_month ?? 0)}
          caption={`All-time: ${formatNumber(ctx?.ai_sessions_alltime ?? 0)}`}
          icon={Activity}
        />
        <KpiTile
          label="Patient Satisfaction"
          value={`${ctx?.ai_satisfaction?.toFixed(1) ?? '—'} ★`}
          caption={`From ${formatNumber(ctx?.ai_satisfaction_count ?? 0)} ratings`}
          icon={CheckCircle2}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="AI → Appointment"
          value={`${ctx?.ai_to_booking_pct?.toFixed(1) ?? '—'}%`}
          caption={`${formatNumber(ctx?.ai_to_booking_count ?? 0)} bookings today`}
          icon={Phone}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="Safety Flags Today"
          value={ctx?.ai_safety_flags_today ?? 0}
          caption={`${ctx?.ai_safety_escalated ?? 0} escalated · ${ctx?.ai_safety_resolved ?? 0} resolved ✅`}
          icon={AlertTriangle}
          iconTone="bg-amber-50 text-amber-600 ring-amber-100"
        />
        <KpiTile
          label="AI-Driven Revenue"
          value={formatAed(ctx?.ai_revenue_today_aed ?? 0)}
          caption={`Net margin: ${formatAed(ctx?.ai_revenue_net_aed ?? 0)} · ${ctx?.ai_revenue_margin_pct?.toFixed(1) ?? '—'}% margin`}
          icon={CircleDollarSign}
          iconTone="bg-rose-50 text-rose-600 ring-rose-100"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={`rounded-t-xl px-4 py-2 text-sm font-semibold transition ${
              tab === entry.key
                ? 'border-x border-t border-slate-200 bg-white text-slate-900'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'performance' ? (
        <Card>
          <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">AI Session Volume — {currentMonthLabel}</h2>
          <div className="mt-4 grid gap-5 lg:grid-cols-3">
            {portals.map((portal) => (
              <Card key={portal.id} className="!p-4">
                <h3 className="font-bold text-slate-900">{portal.label}</h3>
                <p className="text-xs text-slate-500">{portal.sub_label}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {portal.metric_1_label ? (
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="font-bold text-slate-500">{portal.metric_1_label}</div>
                      <div className="font-['DM_Mono'] text-base font-bold text-slate-900">{portal.metric_1_value}</div>
                    </div>
                  ) : null}
                  {portal.metric_2_label ? (
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="font-bold text-slate-500">{portal.metric_2_label}</div>
                      <div className="font-['DM_Mono'] text-base font-bold text-slate-900">{portal.metric_2_value}</div>
                    </div>
                  ) : null}
                  {portal.metric_3_label ? (
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="font-bold text-slate-500">{portal.metric_3_label}</div>
                      <div className="font-['DM_Mono'] text-base font-bold text-slate-900">{portal.metric_3_value}</div>
                    </div>
                  ) : null}
                  {portal.metric_4_label ? (
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="font-bold text-slate-500">{portal.metric_4_label}</div>
                      <div className="font-['DM_Mono'] text-base font-bold text-slate-900">{portal.metric_4_value}</div>
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === 'conversations' ? (
        <Card>
          <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Session Language — Today</h2>
          <ul className="space-y-3">
            {langs.map((lang) => (
              <li key={lang.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">{lang.label}</div>
                  <div className="font-['DM_Mono'] text-sm font-bold text-slate-700">
                    {formatNumber(lang.sessions)} · {lang.percent.toFixed(0)}%
                  </div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-purple-500"
                    style={{ width: `${Math.min(lang.percent, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          {arabicPct ? (
            <p className="mt-3 text-xs text-slate-500">
              {arabicPct}. AI fully bilingual AR/EN throughout all portals.
            </p>
          ) : null}
        </Card>
      ) : null}

      {tab === 'population' ? (
        <Card>
          <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Top AI Topics Today</h2>
          <ul className="space-y-3">
            {topics.map((topic) => (
              <li key={topic.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">{topic.label}</div>
                  <div className="font-['DM_Mono'] text-sm font-bold text-slate-700">{topic.percent.toFixed(0)}%</div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(topic.percent, 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {tab === 'safety' ? (
        <Card>
          <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Safety Monitor</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiTile
              label="Flags Today"
              value={ctx?.ai_safety_flags_today ?? 0}
              caption={safetyPendingCount > 0 ? `${safetyPendingCount} pending review` : 'All reviewed ✅'}
              icon={AlertTriangle}
              iconTone={
                safetyPendingCount > 0
                  ? 'bg-rose-50 text-rose-600 ring-rose-100'
                  : 'bg-amber-50 text-amber-600 ring-amber-100'
              }
            />
            <KpiTile
              label="Escalated"
              value={ctx?.ai_safety_escalated ?? 0}
              caption="To human doctors"
              icon={Stethoscope}
              iconTone="bg-rose-50 text-rose-600 ring-rose-100"
            />
            <KpiTile
              label="Resolved"
              value={ctx?.ai_safety_resolved ?? 0}
              caption="Within SLA"
              icon={CheckCircle2}
              iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
            />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            All flagged conversations are reviewed by a CeenAiX clinical operations agent within 5 minutes. Critical
            safety events trigger DHA notification per protocol.
          </p>
        </Card>
      ) : null}

      {tab === 'models' ? (
        <Card>
          <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Model Management</h2>
          <ul className="space-y-3">
            {aiServices.length === 0 ? (
              <li className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
                No live model health data available yet.
              </li>
            ) : (
              aiServices.map((service) => (
                <li key={service.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900">{service.service_name}</div>
                    <Pill tone={service.status === 'healthy' ? 'emerald' : service.status === 'degraded' ? 'amber' : 'rose'}>
                      {service.status}
                    </Pill>
                  </div>
                  <div className="text-xs text-slate-500">
                    {service.message ?? `${service.region ?? 'UAE region'} · ${ctx?.platform_version ?? 'version not on file'}`}
                  </div>
                  {service.latency_ms != null ? (
                    <div className="mt-1 text-xs text-slate-400">{Math.round(service.latency_ms)}ms latency</div>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </Card>
      ) : null}
    </div>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const AdminAiAnalytics = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'AI Analytics · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="ai" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : (
        <AiView context={context} />
      )}
    </AdminShell>
  );
};
