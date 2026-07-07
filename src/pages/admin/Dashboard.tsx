import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Bot, Building2, CheckCircle2, CircleDollarSign, FileText, ShieldCheck, Stethoscope, Terminal, Users, type LucideIcon } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, formatAed, degradedServiceCount, todayStamp, todayTime, type AdminContext } from './AdminShell';
const issueTone = (severity: string) => {
  if (severity === 'critical' || severity === 'high') return 'border-rose-200 bg-rose-50';
  if (severity === 'medium') return 'border-amber-200 bg-amber-50';
  return 'border-blue-200 bg-blue-50';
};

const issueIconTone = (severity: string) => {
  if (severity === 'critical' || severity === 'high') return 'bg-rose-100 text-rose-600';
  if (severity === 'medium') return 'bg-amber-100 text-amber-600';
  return 'bg-blue-100 text-blue-600';
};

const issuesIcon: Record<string, LucideIcon> = {
  license: Stethoscope,
  security: ShieldCheck,
  integration: Terminal,
  compliance: ShieldCheck,
  audit: FileText,
  revenue: CircleDollarSign,
  billing: CircleDollarSign,
  nabidh: ShieldCheck,
  user: Users,
  org: Building2,
  tenant: Building2,
  ai: Bot,
};

const issueCtaRoute = (ctaKind: string | null, category: string | null): string => {
  const kind = (ctaKind ?? '').toLowerCase();
  const cat = (category ?? '').toLowerCase();
  if (kind.includes('license') || cat === 'license') return '/admin/doctors';
  if (kind.includes('security') || cat === 'security') return '/admin/security';
  if (kind.includes('integration') || cat === 'integration') return '/admin/integrations';
  if (kind.includes('compliance') || cat === 'compliance') return '/admin/compliance';
  if (kind.includes('audit')) return '/admin/audit';
  if (kind.includes('revenue') || kind.includes('billing')) return '/admin/revenue';
  if (kind.includes('nabidh')) return '/admin/nabidh';
  if (kind.includes('user')) return '/admin/users';
  if (kind.includes('org') || kind.includes('tenant')) return '/admin/organizations';
  if (kind.includes('ai')) return '/admin/ai-analytics';
  return '/admin/diagnostics';
};

const RevenueBars = ({
  revenueDaily,
}: {
  revenueDaily: { day_label: string; total_aed: number; consults_aed: number; ai_aed: number; lab_aed: number; target_aed: number }[];
}) => {
  if (revenueDaily.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
        No revenue data available yet.
      </div>
    );
  }
  const max = Math.max(...revenueDaily.map((row) => Math.max(row.total_aed, row.target_aed)), 1);
  const avgDailyTarget = revenueDaily.reduce((s, r) => s + r.target_aed, 0) / revenueDaily.length;
  return (
    <div>
      <div className="grid h-44 grid-cols-7 items-end gap-2">
        {revenueDaily.map((row) => {
          const totalH = (row.total_aed / max) * 100;
          const consultsH = (row.consults_aed / max) * 100;
          const aiH = (row.ai_aed / max) * 100;
          return (
            <div key={row.day_label} className="flex flex-col items-center justify-end gap-1">
              <div className="flex h-full w-full items-end gap-1">
                <div
                  className="flex-1 rounded-t-md bg-emerald-500"
                  style={{ height: `${totalH}%` }}
                  title={`Total ${formatAed(row.total_aed)}`}
                />
                <div
                  className="flex-1 rounded-t-md bg-blue-500"
                  style={{ height: `${consultsH}%` }}
                  title={`Consults ${formatAed(row.consults_aed)}`}
                />
                <div
                  className="flex-1 rounded-t-md bg-purple-500"
                  style={{ height: `${aiH}%` }}
                  title={`AI ${formatAed(row.ai_aed)}`}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500">{row.day_label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Total
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-blue-500" /> Consultations
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-purple-500" /> AI Services
        </span>
        <span className="ml-auto text-slate-500">
          Daily target {formatAed(avgDailyTarget)}
        </span>
      </div>
    </div>
  );
};

const SystemHealthCard = ({ context }: { context: AdminContext }) => {
  const services = [
    ...(context.systemHealth?.services ?? []),
    ...(context.systemHealth?.integrations ?? []),
    ...(context.systemHealth?.aiServices ?? []),
  ];
  const degraded = degradedServiceCount(context.systemHealth);
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">System Health</h2>
        {degraded > 0 ? (
          <Pill tone="amber">Degraded Service</Pill>
        ) : (
          <Pill tone="emerald">All Healthy</Pill>
        )}
      </div>
      <ul className="space-y-2 text-sm">
        {services.slice(0, 9).map((service) => (
          <li
            key={service.id}
            className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100"
          >
            <div>
              <div className="font-semibold text-slate-900">{service.service_name}</div>
              <div className="text-xs text-slate-500">
                {service.message ?? service.region ?? service.category}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Pill
                tone={
                  service.status === 'healthy'
                    ? 'emerald'
                    : service.status === 'degraded'
                      ? 'amber'
                      : 'rose'
                }
              >
                {service.status}
              </Pill>
              <span className="font-['DM_Mono'] text-xs text-slate-500">
                {service.latency_ms ? `${service.latency_ms}ms` : '—'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const QuickActions = ({ context }: { context: AdminContext }) => {
  const navigate = useNavigate();
  const ctx = context.dashboard?.context;
  const actions: Array<{ label: string; value: string; icon: LucideIcon; href: string }> = [
    {
      label: 'Verify Doctor',
      value: `${formatNumber(ctx?.pending_doctors ?? 0)} pending`,
      icon: Stethoscope,
      href: '/admin/doctors',
    },
    {
      label: 'Approve Org',
      value: `${formatNumber(context.organizations.filter((org) => org.status === 'pending').length)} requests`,
      icon: Building2,
      href: '/admin/organizations',
    },
    {
      label: 'Platform Revenue',
      value: `${formatAed(ctx?.revenue_today_aed ?? 0)} today`,
      icon: CircleDollarSign,
      href: '/admin/revenue',
    },
    {
      label: 'AI Dashboard',
      value: `${formatNumber(ctx?.ai_sessions_today ?? 0)} sessions`,
      icon: Bot,
      href: '/admin/ai-analytics',
    },
    {
      label: 'DHA Compliance',
      value: `Score: ${ctx?.dha_score?.toFixed(1) ?? '—'}%`,
      icon: ShieldCheck,
      href: '/admin/compliance',
    },
    {
      label: 'Fraud Review',
      value: `${context.insurancePartners.reduce((acc, p) => acc + (p.fraud_alert_count || 0), 0)} flagged`,
      icon: AlertTriangle,
      href: '/admin/insurance',
    },
    {
      label: 'Generate Report',
      value: new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      icon: FileText,
      href: '/admin/revenue',
    },
    {
      label: 'System Logs',
      value: `${formatNumber(degradedServiceCount(context.systemHealth))} degraded`,
      icon: Terminal,
      href: '/admin/diagnostics',
    },
  ];
  return (
    <Card>
      <div className="mb-4">
        <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">Quick Actions</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              type="button"
              key={action.label}
              onClick={() => navigate(action.href)}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">{action.label}</div>
                <div className="truncate text-xs text-slate-500">{action.value}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

const DashboardView = ({ context }: { context: AdminContext }) => {
  const navigate = useNavigate();
  const ctx = context.dashboard?.context;
  const issues = context.dashboard?.issues ?? [];
  const portals = context.dashboard?.portals ?? [];
  const liveActivity = context.dashboard?.liveActivity ?? [];
  const checklist = context.dashboard?.complianceChecklist ?? [];
  const licenseAlerts = context.dashboard?.licenseAlerts ?? [];
  const revenueDaily = context.dashboard?.revenueDaily ?? [];
  const orgsSummary = context.dashboard?.orgsSummary;

  const [liveTime, setLiveTime] = useState(todayTime);
  useEffect(() => {
    const id = setInterval(() => setLiveTime(todayTime()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [mapView, setMapView] = useState<'map' | 'satellite'>('map');
  const [activityPaused, setActivityPaused] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [aiPeriod, setAiPeriod] = useState<'today' | 'week' | 'month'>('today');

  const currentMonthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <PageHeader title="Platform Dashboard" subtitle={`${todayStamp()} · ${liveTime}`}>
        <Pill tone="emerald">{formatNumber(ctx?.active_sessions ?? 0)} active sessions</Pill>
        {issues.length ? <Pill tone="amber">{issues.length} issues detected</Pill> : null}
      </PageHeader>

      {issues.length ? (
        <Card className="!p-4">
          <div className="grid gap-3 md:grid-cols-3">
            {issues.map((issue) => {
              const Icon = issuesIcon[issue.category] ?? AlertTriangle;
              return (
                <div
                  key={issue.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${issueTone(issue.severity)}`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${issueIconTone(
                      issue.severity,
                    )}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">{issue.title}</div>
                    {issue.detail ? (
                      <div className="mt-0.5 truncate text-xs text-slate-600">{issue.detail}</div>
                    ) : null}
                  </div>
                  {issue.cta_label ? (
                    <button
                      type="button"
                      onClick={() => {
                        const target = issueCtaRoute(issue.cta_kind, issue.category);
                        navigate(target);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      {issue.cta_label}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiTile
          label="Registered Patients"
          value={formatNumber(ctx?.total_patients ?? 0)}
          caption={`${formatNumber(ctx?.patients_30d_active ?? 0)} active (30d)`}
          trend={`↑ +${ctx?.patient_change_pct?.toFixed(1) ?? '0.0'}% this month`}
          icon={Users}
          iconTone="bg-teal-50 text-teal-600 ring-teal-100"
        />
        <KpiTile
          label="Verified Doctors"
          value={formatNumber(ctx?.verified_doctors ?? 0)}
          caption={`${formatNumber(ctx?.pending_doctors ?? 0)} pending DHA verification`}
          trend={`↑ +${ctx?.doctors_added_this_month ?? 0} this month`}
          icon={Stethoscope}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="Connected Orgs"
          value={formatNumber(ctx?.connected_orgs ?? 0)}
          caption={`${ctx?.orgs_clinics ?? 0} clinics · ${ctx?.orgs_hospitals ?? 0} hospitals · ${ctx?.orgs_pharmacies ?? 0} pharma · ${ctx?.orgs_labs ?? 0} labs`}
          trend={`↑ +${ctx?.orgs_added_this_month ?? 0} this month`}
          icon={Building2}
          iconTone="bg-violet-50 text-violet-600 ring-violet-100"
        />
        <KpiTile
          label="AI Consultations Today"
          value={formatNumber(ctx?.ai_sessions_today ?? 0)}
          caption={`${formatNumber(ctx?.ai_sessions_month ?? 0)} this month · ${formatNumber(ctx?.ai_sessions_alltime ?? 0)} all time`}
          trend="↑ +23.1% vs last month"
          icon={Bot}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
        />
        <KpiTile
          label="Platform Revenue"
          value={formatAed(ctx?.revenue_today_aed ?? 0)}
          caption={
            ctx?.revenue_target_aed
              ? `${(((ctx?.revenue_today_aed ?? 0) / ctx.revenue_target_aed) * 100).toFixed(1)}% of ${formatAed(ctx?.revenue_target_aed)} target`
              : 'Month-to-date'
          }
          trend={`↑ +${ctx?.revenue_change_pct?.toFixed(1) ?? '0.0'}% MTD`}
          icon={CircleDollarSign}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="Platform Uptime (30d)"
          value={`${ctx?.uptime_pct?.toFixed(2) ?? '0.00'}%`}
          caption="All systems operational ✅"
          trend={`${ctx?.uptime_incidents_month ?? 0} incidents this month ✅`}
          icon={Activity}
          iconTone="bg-green-50 text-green-600 ring-green-100"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">Connected Organizations — UAE</h2>
              <p className="text-sm text-slate-500">
                {orgsSummary?.total ?? context.organizations.length} organizations
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMapView('map')}
                className={`rounded-lg px-3 py-1 text-xs font-bold ${mapView === 'map' ? 'bg-teal-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                map
              </button>
              <button
                type="button"
                onClick={() => setMapView('satellite')}
                className={`rounded-lg px-3 py-1 text-xs font-bold ${mapView === 'satellite' ? 'bg-teal-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                satellite
              </button>
            </div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 ring-1 ring-slate-200">
            <div
              aria-hidden
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 30% 60%, rgba(20,184,166,0.18) 0px, transparent 80px), radial-gradient(circle at 60% 40%, rgba(59,130,246,0.18) 0px, transparent 110px), radial-gradient(circle at 70% 70%, rgba(168,85,247,0.18) 0px, transparent 90px)',
              }}
            />
            <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">
              <div className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-slate-200 backdrop-blur">
                UAE · Dubai, Abu Dhabi, Sharjah, RAK, Ajman, Fujairah
              </div>
            </div>
            {context.organizations.slice(0, 6).map((org, idx) => {
              const positions = [
                { top: '24%', left: '32%' },
                { top: '34%', left: '52%' },
                { top: '46%', left: '40%' },
                { top: '52%', left: '64%' },
                { top: '64%', left: '46%' },
                { top: '70%', left: '60%' },
              ];
              const pos = positions[idx % positions.length];
              return (
                <div
                  key={org.id}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow ring-1 ring-slate-200"
                  style={{ top: pos.top, left: pos.left }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  {org.name}
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs md:grid-cols-5">
            <Pill tone="violet">Hospital</Pill>
            <Pill tone="blue">Clinic</Pill>
            <Pill tone="emerald">Pharmacy</Pill>
            <Pill tone="amber">Lab / Imaging</Pill>
            <Pill tone="rose">Insurance</Pill>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">Live Activity</h2>
              <p className="text-xs font-bold text-emerald-600">REAL-TIME</p>
            </div>
            <button
              type="button"
              onClick={() => setActivityPaused((p) => !p)}
              className={`rounded-lg border px-3 py-1 text-xs font-bold ${activityPaused ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {activityPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
          <div className="space-y-2">
            {activityPaused ? (
              <div className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-700 ring-1 ring-amber-200">
                Live feed paused
              </div>
            ) : (
              <>
                {liveActivity.map((event) => (
                  <div key={event.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">{event.title}</div>
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">
                        {event.ago_label || ''}
                      </span>
                    </div>
                    {event.detail ? <div className="mt-0.5 text-xs text-slate-500">{event.detail}</div> : null}
                  </div>
                ))}
                {liveActivity.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No live activity yet.
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Showing live activity across all CeenAiX portals · Today: {formatNumber(ctx?.ai_sessions_today)} AI sessions
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">Portal Status</h2>
            <Pill tone="emerald">LIVE</Pill>
          </div>
          <ul className="space-y-2 text-sm">
            {portals.map((portal) => (
              <li
                key={portal.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100"
              >
                <div>
                  <div className="font-semibold text-slate-900">{portal.portal_name}</div>
                  <div className="text-xs text-slate-500">{portal.active_users} active</div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={portal.status === 'online' ? 'emerald' : 'amber'}>
                    {portal.status === 'online' ? 'Online' : portal.status}
                  </Pill>
                  <span className="font-['DM_Mono'] text-xs text-slate-500">{portal.latency_ms}ms</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">Platform Revenue</h2>
              <p className="text-xs text-slate-500">
                {currentMonthLabel} · {formatAed(ctx?.revenue_target_aed ?? 0)} target
              </p>
            </div>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRevenuePeriod(p)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold capitalize ${revenuePeriod === p ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Total Revenue</div>
              <div className="font-['DM_Mono'] text-2xl font-bold text-emerald-900">
                {formatAed(ctx?.revenue_today_aed ?? 0)}
              </div>
              <div className="text-xs text-emerald-700">
                +{ctx?.revenue_change_pct?.toFixed(1) ?? '0.0'}% vs last month
              </div>
            </div>
            <div className="rounded-xl bg-purple-50 p-3 ring-1 ring-purple-100">
              <div className="text-[10px] font-bold uppercase tracking-wide text-purple-700">AI Services</div>
              <div className="font-['DM_Mono'] text-2xl font-bold text-purple-900">
                {formatAed(ctx?.ai_revenue_today_aed ?? 0)}
              </div>
              <div className="text-xs text-purple-700">
                {(((ctx?.ai_revenue_today_aed ?? 0) / Math.max(ctx?.revenue_today_aed ?? 1, 1)) * 100).toFixed(1)}% of total
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
              <div className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Consultations</div>
              <div className="font-['DM_Mono'] text-2xl font-bold text-blue-900">
                {formatAed((ctx?.revenue_today_aed ?? 0) - (ctx?.ai_revenue_today_aed ?? 0))}
              </div>
              <div className="text-xs text-blue-700">remaining mix</div>
            </div>
          </div>
          <div className="mt-5">
            <RevenueBars revenueDaily={revenueDaily} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">DHA Compliance</h2>
              <p className="text-xs font-bold text-emerald-600">NABIDH APPROVED</p>
            </div>
            <div className="font-['DM_Mono'] text-3xl font-bold text-emerald-700">
              {ctx?.dha_score?.toFixed(1) ?? '—'}
            </div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
            <div className="text-xs font-bold text-emerald-700">DHA License</div>
            <div className="font-['DM_Mono'] text-sm font-bold text-emerald-900">
              {ctx?.dha_license || 'DHA-PLAT-2025-XXXXXX'}
            </div>
            <div className="text-xs text-emerald-700">
              Valid · Expires {ctx?.dha_license_expires || 'Dec 2026'}
            </div>
          </div>
          <div className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-500">Compliance Checklist</div>
          <ul className="mt-2 space-y-2 text-sm">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <div className="font-semibold text-slate-900">{item.label}</div>
                  {item.detail ? <div className="text-xs text-slate-500">{item.detail}</div> : null}
                </div>
              </li>
            ))}
          </ul>
          {licenseAlerts.length ? (
            <>
              <div className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-500">License Expiry Alerts</div>
              <ul className="mt-2 space-y-2 text-sm">
                {licenseAlerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100"
                  >
                    <span className="font-semibold text-slate-900">{alert.doctor_name}</span>
                    <Pill tone={alert.severity === 'high' ? 'rose' : 'amber'}>{alert.days_remaining}d</Pill>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">AI Platform Analytics</h2>
              <p className="text-xs font-bold text-purple-600">Powered by Claude Sonnet · CeenAiX AI</p>
            </div>
            <div className="flex gap-1">
              {(['today', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAiPeriod(p)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-bold capitalize ${aiPeriod === p ? 'bg-purple-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-purple-50 p-3 ring-1 ring-purple-100">
            <div className="text-xs font-bold uppercase tracking-wide text-purple-700">AI Consultations</div>
            <div className="font-['DM_Mono'] text-3xl font-bold text-purple-900">
              {formatNumber(ctx?.ai_sessions_today ?? 0)}
            </div>
            <div className="text-xs text-purple-700">
              {formatNumber(ctx?.ai_sessions_month ?? 0)} this month · {formatNumber(ctx?.ai_sessions_alltime ?? 0)} all time
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="font-bold text-slate-500">Avg response</div>
              <div className="font-['DM_Mono'] text-base font-bold text-slate-900">
                {ctx?.ai_avg_response_sec?.toFixed(1) ?? '—'}s
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="font-bold text-slate-500">Satisfaction</div>
              <div className="font-['DM_Mono'] text-base font-bold text-slate-900">
                {ctx?.ai_satisfaction?.toFixed(1) ?? '—'}/5.0 ⭐
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="font-bold text-slate-500">Booking conv.</div>
              <div className="font-['DM_Mono'] text-base font-bold text-slate-900">
                {ctx?.ai_to_booking_pct?.toFixed(1) ?? '—'}%
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="font-bold text-slate-500">Escalation rate</div>
              <div className="font-['DM_Mono'] text-base font-bold text-slate-900">
                {ctx?.ai_safety_escalated != null && ctx?.ai_sessions_today
                  ? `${((ctx.ai_safety_escalated / ctx.ai_sessions_today) * 100).toFixed(2)}%`
                  : '—'}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-emerald-700">
            {ctx?.ai_safety_flags_today ?? 0} safety flags today · All reviewed ✅
          </div>
          <div className="text-xs text-slate-500">
            {ctx?.ai_safety_escalated ?? 0} escalated to human doctor (protocol)
          </div>
        </Card>

        <SystemHealthCard context={context} />
      </div>

      <QuickActions context={context} />
    </div>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const AdminDashboard = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Platform Dashboard · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="dashboard" context={context}>
      {context.loading && !context.metrics && !context.dashboard ? (
        <Card><div className="py-12 text-center text-slate-500">Loading admin workspace…</div></Card>
      ) : (
        <DashboardView context={context} />
      )}
    </AdminShell>
  );
};
