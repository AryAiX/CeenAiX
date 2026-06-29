import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  approvePreAuthorization,
  useInsurancePortal,
  type InsuranceAiInsight,
  type InsuranceClaim,
  type InsuranceFraudAlert,
  type InsuranceMonthlyClaimsVolumePoint,
  type InsuranceNetworkProvider,
  type InsurancePortalData,
  type InsurancePreAuthorization,
} from '../../hooks';
import { useAuth } from '../../lib/auth-context';
// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeTone = 'red' | 'amber' | 'blue';
export type PillTone = 'red' | 'amber' | 'emerald' | 'blue' | 'violet' | 'slate';

interface InsuranceNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: 'main' | 'intelligence' | 'admin';
  badge?: number;
  badgeTone?: BadgeTone;
  pulse?: boolean;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

export const formatCurrency = (value: number | null | undefined) =>
  typeof value === 'number' ? `AED ${value.toLocaleString()}` : 'AED —';

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

export const titleCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

// ─── Constants ────────────────────────────────────────────────────────────────

const routeTitles: Record<string, string> = {
  '/insurance/portal': 'Insurance Dashboard',
  '/insurance/dashboard': 'Insurance Dashboard',
  '/insurance/preauth': 'Pre-Authorizations',
  '/insurance/pre-authorizations': 'Pre-Authorizations',
  '/insurance/claims': 'Claims',
  '/insurance/members': 'Members',
  '/insurance/fraud': 'Fraud Detection',
  '/insurance/analytics': 'Risk Analytics',
  '/insurance/risk-analytics': 'Risk Analytics',
  '/insurance/network': 'Network Providers',
  '/insurance/reports': 'Reports',
  '/insurance/settings': 'Settings',
};

const badgeClasses: Record<BadgeTone, string> = {
  red: 'border-red-400/30 bg-red-500/15 text-red-300',
  amber: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
  blue: 'border-blue-400/30 bg-blue-500/15 text-blue-300',
};

const pillClasses: Record<PillTone, string> = {
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-slate-100 text-slate-600',
};

export const statusTone = (status: string): PillTone => {
  if (['overdue', 'denied', 'open', 'high'].includes(status)) return 'red';
  if (['review', 'under_review', 'investigating', 'medium'].includes(status)) return 'amber';
  if (['approved', 'resolved', 'ready'].includes(status)) return 'emerald';
  if (['appealed'].includes(status)) return 'violet';
  if (['submitted', 'routine', 'low'].includes(status)) return 'blue';
  return 'slate';
};

const formatSla = (slaDueAt: string) => {
  const deltaMinutes = Math.round((new Date(slaDueAt).getTime() - Date.now()) / 60_000);
  const absolute = Math.abs(deltaMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  return deltaMinutes < 0 ? `${label} overdue` : `${label} remaining`;
};

// ─── Shared UI primitives ─────────────────────────────────────────────────────

export const StatusPill = ({ children, tone }: { children: ReactNode; tone: PillTone }) => (
  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${pillClasses[tone]}`}>
    {children}
  </span>
);

export const SectionCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
  <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-4">
      <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
    </div>
    <div className="p-5">{children}</div>
  </article>
);

export const KpiCard = ({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'blue' | 'emerald' | 'amber' | 'red';
}) => {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`mb-3 inline-flex rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${toneClass}`}>
        {label}
      </div>
      <div className="font-mono text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{helper}</div>
    </article>
  );
};

export const KpiHostedCard = ({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: ReactNode;
  tone: 'amber' | 'blue' | 'emerald' | 'red' | 'violet' | 'slate';
}) => {
  const toneMap: Record<string, { ring: string; bg: string; text: string }> = {
    amber: { ring: 'ring-amber-100', bg: 'bg-amber-50', text: 'text-amber-700' },
    blue: { ring: 'ring-blue-100', bg: 'bg-blue-50', text: 'text-blue-700' },
    emerald: { ring: 'ring-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    red: { ring: 'ring-red-100', bg: 'bg-red-50', text: 'text-red-700' },
    violet: { ring: 'ring-violet-100', bg: 'bg-violet-50', text: 'text-violet-700' },
    slate: { ring: 'ring-slate-100', bg: 'bg-slate-50', text: 'text-slate-700' },
  };
  const t = toneMap[tone];
  return (
    <article className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${t.ring}`}>
      <div className={`mb-2 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${t.bg} ${t.text}`}>
        {label}
      </div>
      <div className="font-mono text-2xl font-bold leading-none text-slate-900">{value}</div>
      <div className="mt-2 text-[11px] font-medium leading-tight text-slate-500">{caption}</div>
    </article>
  );
};

// ─── Nav helpers ──────────────────────────────────────────────────────────────

const navItemsForData = (data: InsurancePortalData | null): InsuranceNavItem[] => {
  const overduePreAuths =
    data?.preAuthorizations.filter((item) => item.status === 'overdue').length ?? 0;
  const pendingPreAuths =
    data?.preAuthorizations.filter(
      (item) => item.status === 'review' || item.status === 'overdue',
    ).length ?? 0;
  const openClaims =
    data?.claims.filter(
      (item) => item.status === 'submitted' || item.status === 'under_review',
    ).length ?? 0;
  const openFraud =
    data?.fraudAlerts.filter((item) => item.status !== 'resolved').length ?? 0;

  return [
    { href: '/insurance/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'main', badge: overduePreAuths || undefined, badgeTone: 'red', pulse: overduePreAuths > 0 },
    { href: '/insurance/preauth', label: 'Pre-Authorizations', icon: ClipboardList, section: 'main', badge: pendingPreAuths || undefined, badgeTone: 'amber', pulse: pendingPreAuths > 0 },
    { href: '/insurance/claims', label: 'Claims', icon: FileText, section: 'main', badge: openClaims || undefined, badgeTone: 'blue' },
    { href: '/insurance/members', label: 'Members', icon: Users, section: 'main' },
    { href: '/insurance/fraud', label: 'Fraud Detection', icon: AlertOctagon, section: 'intelligence', badge: openFraud || undefined, badgeTone: 'red', pulse: openFraud > 0 },
    { href: '/insurance/analytics', label: 'Risk Analytics', icon: BarChart3, section: 'intelligence' },
    { href: '/insurance/network', label: 'Network Providers', icon: Building2, section: 'intelligence' },
    { href: '/insurance/reports', label: 'Reports', icon: BookOpen, section: 'admin' },
    { href: '/insurance/settings', label: 'Settings', icon: Settings, section: 'admin' },
  ];
};

// ─── InsuranceShell ───────────────────────────────────────────────────────────

const InsuranceShell = ({
  data,
  children,
  loadError,
  onRetry,
}: {
  data: InsurancePortalData | null;
  children: ReactNode;
  loadError?: string | null;
  onRetry?: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const currentPath =
    location.pathname === '/insurance/portal'
      ? '/insurance/dashboard'
      : location.pathname === '/insurance/pre-authorizations'
        ? '/insurance/preauth'
        : location.pathname === '/insurance/risk-analytics'
          ? '/insurance/analytics'
          : location.pathname;

  const title = routeTitles[location.pathname] ?? 'Insurance Dashboard';
  const navItems = navItemsForData(data);
  const navSections = [
    { id: 'main', title: 'MAIN', items: navItems.filter((item) => item.section === 'main') },
    { id: 'intelligence', title: 'INTELLIGENCE', items: navItems.filter((item) => item.section === 'intelligence') },
    { id: 'admin', title: 'ADMIN', items: navItems.filter((item) => item.section === 'admin') },
  ];

  const payerName = data?.profile?.displayName ?? data?.organization?.name ?? 'Insurance payer';
  const officerName = data?.profile?.officerName ?? 'Claims officer';
  const officerInitials = officerName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const urgentPreAuth =
    data?.preAuthorizations.find((item) => item.status === 'overdue') ??
    data?.preAuthorizations[0] ??
    null;
  const openFraud =
    data?.fraudAlerts.filter((item) => item.status !== 'resolved').length ?? 0;
  const claimValue =
    data?.claims.reduce((sum, claim) => sum + claim.amountAed, 0) ?? 0;

  const signOutAndLeave = async () => {
    await signOut();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`flex shrink-0 flex-col bg-[#0F2D4A] transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-4">
          {!collapsed ? (
            <div>
              <div className="text-lg font-bold text-white">CeenAiX</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#7BAFD4]">Insurance Portal</div>
            </div>
          ) : (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A5F] to-teal-600 text-lg font-bold text-white">
              C
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[#7BAFD4] transition hover:bg-white/10"
            aria-label={collapsed ? 'Expand insurance sidebar' : 'Collapse insurance sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Payer card */}
        {!collapsed ? (
          <div className="mx-3 my-3 rounded-xl border border-[#1E3A5F]/80 bg-[#1E3A5F]/60 p-3">
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-[#1E3A5F] text-sm font-bold text-white">
                {payerName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-bold leading-tight text-white">{payerName}</div>
                <div className="text-[10px] text-[#93C5E8]">{data?.organization?.city ?? 'UAE'}</div>
              </div>
            </div>
            <div className="mb-1 text-[9px] text-blue-400">{data?.profile?.regulatorName ?? 'Regulator pending'}</div>
            <div className="mb-1 text-[9px] text-white/40">
              {formatNumber(data?.profile?.activeMembers)} active members · CeenAiX
            </div>
            <div className="text-[9px] text-white/45">
              {officerName} · {data?.profile?.officerTitle ?? 'Claims officer'}
            </div>
          </div>
        ) : null}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navSections.map((section) => (
            <div key={section.id} className="mb-5">
              {!collapsed ? (
                <div className="mb-1 px-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[#4A7AA8]">
                  {section.title}
                </div>
              ) : null}
              <div className="flex flex-col gap-0.5 px-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = currentPath === item.href;
                  const badgeClass = item.badgeTone ? badgeClasses[item.badgeTone] : '';
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className={`flex h-[39px] items-center rounded-xl border-l-[3px] transition-all duration-150 ${
                        collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
                      } ${active ? 'border-teal-300 bg-[#1E3A5F]/70' : 'border-transparent hover:bg-white/[0.05]'}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-teal-300' : 'text-[#7BAFD4]'}`} />
                      {!collapsed ? (
                        <>
                          <span className={`flex-1 text-left text-[13px] ${active ? 'font-semibold text-[#E2F0FF]' : 'text-[#93C5E8]'}`}>
                            {item.label}
                          </span>
                          {item.badge ? (
                            <span
                              className={`flex h-[18px] min-w-5 items-center justify-center rounded-full border px-1.5 font-mono text-[10px] font-bold ${badgeClass} ${item.pulse ? 'animate-pulse' : ''}`}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Status footer */}
        {!collapsed ? (
          <div className="mx-3 mb-3 rounded-xl border border-white/[0.05] bg-black/20 p-3">
            <div className="mb-1 font-mono text-[10px] text-[#93C5E8]">
              {formatCurrency(claimValue)} claims · live workspace total
            </div>
            <div className="mb-1.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] text-red-300">{openFraud} fraud alerts open</span>
            </div>
            <div className="mb-1.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-[9px] text-amber-200">
                {data?.preAuthorizations.filter((item) => item.status === 'overdue').length ?? 0} pre-auth overdue
              </span>
            </div>
            <div className="text-[9px] text-white/40">
              {data?.preAuthorizations.filter(
                (item) => item.status === 'review' || item.status === 'overdue',
              ).length ?? 0}{' '}
              pre-auths pending review
            </div>
          </div>
        ) : null}

        {/* Sign out */}
        <div className="px-2 pb-3">
          <button
            type="button"
            onClick={() => void signOutAndLeave()}
            className={`flex h-[38px] w-full items-center rounded-xl text-red-300 transition hover:bg-red-500/10 ${collapsed ? 'justify-center' : 'gap-2.5 px-3'}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed ? <span className="text-[13px]">Sign Out</span> : null}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-5">
          <div className="flex min-w-0 shrink-0 items-center gap-3 lg:basis-[280px]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1E3A5F] text-base font-bold text-white">
              {payerName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[17px] font-bold leading-tight text-slate-900">{title}</div>
              <div className="truncate text-[13px] text-slate-400">
                {payerName} · {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="hidden flex-1 justify-center px-6 xl:flex">
            {urgentPreAuth ? (
              <button
                type="button"
                onClick={() => navigate('/insurance/preauth')}
                className="flex max-w-xl items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 transition hover:bg-red-100"
              >
                <AlertOctagon className="h-[15px] w-[15px] shrink-0 animate-pulse text-red-600" />
                <span className="text-xs font-semibold text-red-600">
                  {urgentPreAuth.status === 'overdue' ? '1 pre-auth SLA OVERDUE' : 'Pre-auth pending'}
                </span>
                <span className="truncate text-xs text-red-900">
                  — {urgentPreAuth.externalRef} · {urgentPreAuth.procedureName} · {urgentPreAuth.patientName}
                </span>
                <span className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                  Review Now
                </span>
              </button>
            ) : null}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/insurance/fraud')}
              className="hidden items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 transition hover:bg-red-100 md:flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-600">{openFraud} Fraud Alerts</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const rows = data?.preAuthorizations ?? [];
                const header = ['ref','patient','clinician','provider','procedure','priority','status','requested_aed','approved_aed','ai_recommendation','ai_confidence','sla_due_at'];
                const escape = (v: string | number | null | undefined) => {
                  if (v === null || v === undefined) return '';
                  const s = String(v);
                  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
                };
                const body = [header, ...rows.map((row) => [
                  row.externalRef, row.patientName, row.clinicianName, row.providerName,
                  row.procedureName, row.priority, row.status,
                  row.requestedAmountAed ?? '', row.approvedAmountAed ?? '',
                  row.aiRecommendation ?? '', row.aiConfidencePercent ?? '', row.slaDueAt ?? '',
                ])].map((line) => line.map(escape).join(',')).join('\n');
                const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `insurance-pre-auths-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 transition hover:bg-slate-200 md:flex"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs text-slate-500">Export</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/insurance/preauth')}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
              aria-label="Open pending pre-authorizations"
            >
              <Bell className="h-4 w-4 text-slate-600" />
              {urgentPreAuth ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" /> : null}
            </button>
            <button
              type="button"
              onClick={() => navigate('/insurance/settings')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 transition hover:bg-slate-200"
              aria-label="Open insurance settings"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E3A5F] text-xs font-bold text-white">
                {officerInitials || 'IO'}
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            {loadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                <p>{loadError}</p>
                {onRetry ? (
                  <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">
                    Retry
                  </button>
                ) : null}
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default InsuranceShell;

// ─── Shared page components ───────────────────────────────────────────────────

export const PreAuthAlert = ({ item }: { item: InsurancePreAuthorization | null }) => {
  const navigate = useNavigate();
  if (!item) return null;
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-red-600" />
          <div>
            <div className="text-[13px] font-bold uppercase tracking-wide text-red-700">
              {item.status === 'overdue' ? 'Pre-auth SLA breached' : 'Pre-auth requires review'}
            </div>
            <div className="mt-1 text-sm text-red-900">
              DHA requires response within the configured SLA window for urgent pre-authorizations
            </div>
            <div className="mt-2 text-xs text-red-800">
              {item.externalRef} · {item.procedureName} — {item.patientName}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/insurance/preauth')}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Review urgent case
        </button>
      </div>
    </section>
  );
};

export const ClaimsTodayCard = ({
  claims,
  activeMembers,
}: {
  claims: InsuranceClaim[];
  activeMembers: number | null | undefined;
}) => {
  const groups = [
    { key: 'approved', label: 'Auto-approved', count: claims.filter((c) => c.status === 'approved').length, amount: claims.filter((c) => c.status === 'approved').reduce((s, c) => s + c.amountAed, 0), color: '#10b981', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    { key: 'pending', label: 'Pending', count: claims.filter((c) => c.status === 'submitted' || c.status === 'under_review').length, amount: claims.filter((c) => c.status === 'submitted' || c.status === 'under_review').reduce((s, c) => s + c.amountAed, 0), color: '#f59e0b', text: 'text-amber-700', bg: 'bg-amber-50' },
    { key: 'denied', label: 'Denied', count: claims.filter((c) => c.status === 'denied').length, amount: claims.filter((c) => c.status === 'denied').reduce((s, c) => s + c.amountAed, 0), color: '#ef4444', text: 'text-red-700', bg: 'bg-red-50' },
    { key: 'appealed', label: 'Appealed', count: claims.filter((c) => c.status === 'appealed').length, amount: claims.filter((c) => c.status === 'appealed').reduce((s, c) => s + c.amountAed, 0), color: '#8b5cf6', text: 'text-violet-700', bg: 'bg-violet-50' },
  ];
  const totalCount = groups.reduce((s, g) => s + g.count, 0);
  const totalAmount = groups.reduce((s, g) => s + g.amount, 0);
  const exposurePerMember = activeMembers && activeMembers > 0 ? Math.round(totalAmount / activeMembers) : 0;
  const circumference = 2 * Math.PI * 42;
  let offset = 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">Claims Today</h2>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900">{formatCurrency(totalAmount)}</div>
          <div className="text-xs text-slate-400">{formatNumber(totalCount)} claims from insurance_claims</div>
        </div>
        <FileText className="h-5 w-5 text-blue-500" />
      </div>
      <div className="mb-5 flex items-center justify-center">
        <svg width="176" height="176" viewBox="0 0 112 112" role="img" aria-label="Claims status breakdown chart">
          <circle cx="56" cy="56" r="42" fill="none" stroke="#e2e8f0" strokeWidth="14" />
          {groups.map((group) => {
            const ratio = totalAmount > 0 ? group.amount / totalAmount : 0;
            const dash = ratio * circumference;
            const element = (
              <circle key={group.key} cx="56" cy="56" r="42" fill="none" stroke={group.color} strokeWidth="14"
                strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset}
                strokeLinecap="round" transform="rotate(-90 56 56)" />
            );
            offset += dash;
            return element;
          })}
          <circle cx="56" cy="56" r="29" fill="#ffffff" />
          <text x="56" y="53" textAnchor="middle" className="fill-slate-900 text-[13px] font-bold">{formatNumber(totalCount)}</text>
          <text x="56" y="66" textAnchor="middle" className="fill-slate-400 text-[7px]">claims</text>
        </svg>
      </div>
      <div className="space-y-2">
        {groups.map((group) => (
          <div key={group.key} className={`rounded-xl px-3 py-2 ${group.bg}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                <span className={`truncate text-sm font-semibold ${group.text}`}>{group.label}</span>
              </div>
              <div className="text-right">
                <div className={`font-mono text-sm font-bold ${group.text}`}>{formatNumber(group.count)}</div>
                <div className="font-mono text-[11px] text-slate-500">{formatCurrency(group.amount)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Total claim value</span>
          <span className="font-mono font-bold text-slate-800">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">Daman exposure per active member</span>
          <span className="font-mono font-bold text-slate-800">{formatCurrency(exposurePerMember)}</span>
        </div>
      </div>
    </div>
  );
};

export const aiRecBadge = (rec: InsurancePreAuthorization['aiRecommendation']) => {
  if (rec === 'approve') return { label: '✓ AI: APPROVE', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' };
  if (rec === 'review') return { label: '⚠ AI: REVIEW', cls: 'bg-amber-100 text-amber-700 ring-amber-200' };
  if (rec === 'deny') return { label: '✗ AI: DENY', cls: 'bg-rose-100 text-rose-700 ring-rose-200' };
  return { label: '— AI: PENDING', cls: 'bg-slate-100 text-slate-600 ring-slate-200' };
};

export const planTierTone = (label: string | null) => {
  const v = (label ?? '').toLowerCase();
  if (v.includes('gold')) return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (v.includes('silver')) return 'bg-slate-100 text-slate-700 ring-slate-200';
  if (v.includes('basic')) return 'bg-blue-50 text-blue-700 ring-blue-200';
  return 'bg-slate-50 text-slate-600 ring-slate-200';
};

export const ageGenderShort = (age: number | null, gender: string | null) => {
  if (age == null && !gender) return '';
  const g = gender ? gender.charAt(0).toUpperCase() : '';
  if (age == null) return g;
  return `${age}${g}`;
};

export const PreAuthHostedTable = ({
  rows,
  max,
  onApproved,
}: {
  rows: InsurancePreAuthorization[];
  max?: number;
  onApproved?: () => void;
}) => {
  const navigate = useNavigate();
  const visible = max ? rows.slice(0, max) : rows;
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const handleRowApprove = async (row: InsurancePreAuthorization) => {
    setRowError(null);
    setRowBusyId(row.id);
    try {
      await approvePreAuthorization(row.id, row.requestedAmountAed);
      onApproved?.();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : 'Approval failed.');
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100">
      <div className="overflow-x-auto">
        <table className="min-w-[1080px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            <tr>
              <th className="px-3 py-2.5">PA Ref</th>
              <th className="px-3 py-2.5">Patient</th>
              <th className="px-3 py-2.5">Doctor / Clinic</th>
              <th className="px-3 py-2.5">Procedure</th>
              <th className="px-3 py-2.5">Est. Cost</th>
              <th className="px-3 py-2.5">AI Rec</th>
              <th className="px-3 py-2.5">SLA</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visible.map((row) => {
              const overdue = row.status === 'overdue';
              const ai = aiRecBadge(row.aiRecommendation);
              const slaLabel = overdue ? 'OVERDUE' : formatSla(row.slaDueAt);
              return (
                <tr key={row.id} className={`align-top ${overdue ? 'bg-red-50/50' : ''}`}>
                  <td className="px-3 py-3">
                    <div className="font-mono text-xs font-bold text-slate-700">{row.externalRef.replace(/^PA-\d+-/, 'PA-')}</div>
                    {overdue ? (
                      <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">OVERDUE</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-slate-900">{row.patientName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      {row.planLabel ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${planTierTone(row.planLabel)}`}>{row.planLabel}</span>
                      ) : null}
                      {ageGenderShort(row.patientAge, row.patientGender) ? (
                        <span className="font-mono text-[10px] text-slate-500">{ageGenderShort(row.patientAge, row.patientGender)}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-slate-700">{row.clinicianName}</div>
                    <div className="text-xs text-slate-500">{row.providerName}</div>
                    {row.isCeenaixEprescribed ? (
                      <div className="mt-0.5 text-[10px] font-semibold text-emerald-700">CeenAiX ✅</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-slate-900">{row.procedureName}</div>
                    {row.procedureIcdCode ? (
                      <div className="font-mono text-[10px] text-slate-500">{row.procedureIcdCode}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-mono text-sm font-bold text-slate-800">{formatCurrency(row.requestedAmountAed)}</div>
                    {row.coverageLabel ? (
                      <div className={`text-[11px] font-semibold ${row.coverageLabel.toLowerCase().includes('not') ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {row.coverageLabel}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${ai.cls}`}>{ai.label}</span>
                    {row.aiConfidencePercent != null ? (
                      <div className="mt-0.5 font-mono text-[10px] text-slate-500">{row.aiConfidencePercent}% confidence</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold ${overdue ? 'text-red-700' : 'text-slate-600'}`}>{slaLabel}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleRowApprove(row)}
                        disabled={rowBusyId === row.id || row.status === 'approved'}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {row.status === 'approved' ? 'Approved' : rowBusyId === row.id ? '…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/insurance/preauth')}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Review
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">No pre-authorizations match this filter.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {rowError ? <p className="px-3 py-2 text-[11px] font-semibold text-rose-600">{rowError}</p> : null}
    </div>
  );
};

export const AiInsightCard = ({ insight }: { insight: InsuranceAiInsight }) => {
  const tone =
    insight.insightType === 'preventive'
      ? 'border-blue-200 bg-blue-50'
      : insight.insightType === 'cluster_risk' || insight.insightType === 'cluster'
        ? 'border-amber-200 bg-amber-50'
        : 'border-emerald-200 bg-emerald-50';
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="text-sm font-bold text-slate-900">{insight.title}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-700">{insight.description}</p>
      {insight.savingsLabel ? (
        <div className="mt-2 font-mono text-[11px] font-semibold text-slate-600">{insight.savingsLabel}</div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {insight.primaryActionLabel ? (
          insight.primaryActionUrl ? (
            <a href={insight.primaryActionUrl} target="_blank" rel="noreferrer"
              className="rounded-lg bg-[#1E3A5F] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#27537f]">
              {insight.primaryActionLabel}
            </a>
          ) : (
            <button type="button" disabled
              className="rounded-lg bg-[#1E3A5F] px-2.5 py-1 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {insight.primaryActionLabel}
            </button>
          )
        ) : null}
        {insight.secondaryActionLabel ? (
          insight.secondaryActionUrl ? (
            <a href={insight.secondaryActionUrl} target="_blank" rel="noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
              {insight.secondaryActionLabel}
            </a>
          ) : (
            <button type="button" disabled
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-60">
              {insight.secondaryActionLabel}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
};

export const FraudAlertCard = ({ alert }: { alert: InsuranceFraudAlert }) => {
  const isHigh = alert.severity === 'high';
  return (
    <div className={`rounded-xl border p-3 ${isHigh ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold uppercase ${isHigh ? 'text-red-700' : 'text-amber-700'}`}>
          {isHigh ? '🔴 HIGH' : '🟡 MEDIUM'} ({alert.score}% confidence)
        </span>
      </div>
      <div className="mt-1 text-sm font-bold text-slate-900">{alert.subjectName}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-700">{alert.reason}</div>
      <div className="mt-2 font-mono text-[11px] font-semibold text-slate-600">
        Amount at risk: {formatCurrency(alert.exposureAmountAed)}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Link to="/insurance/fraud"
          className="rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-red-700">
          Investigate
        </Link>
        <button type="button" disabled
          className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[10px] font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60">
          Freeze Claims
        </button>
      </div>
    </div>
  );
};

export const fraudScoreBadge = (score: 'low' | 'medium' | 'high' | null) => {
  if (score === 'high') return { label: '🔴 HIGH', cls: 'text-red-700' };
  if (score === 'medium') return { label: '🟡 Medium', cls: 'text-amber-700' };
  if (score === 'low') return { label: '🟢 Low', cls: 'text-emerald-700' };
  return { label: '—', cls: 'text-slate-500' };
};

export const NetworkProvidersTable = ({ rows }: { rows: InsuranceNetworkProvider[] }) => (
  <div className="overflow-hidden rounded-xl border border-slate-100">
    <div className="overflow-x-auto">
      <table className="min-w-[640px] w-full text-sm">
        <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          <tr>
            <th className="px-3 py-2.5">Provider</th>
            <th className="px-3 py-2.5 text-right">Claims</th>
            <th className="px-3 py-2.5 text-right">Avg Value</th>
            <th className="px-3 py-2.5 text-right">Denial %</th>
            <th className="px-3 py-2.5">Fraud Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => {
            const fraud = fraudScoreBadge(row.fraudScore);
            const denialOk = row.denialRatePercent != null && row.denialRatePercent < 5;
            return (
              <tr key={row.id} className="align-top">
                <td className="px-3 py-3">
                  <div className="text-sm font-semibold text-slate-900">{row.providerName}</div>
                  <div className="text-xs text-slate-500">{row.performanceFlag}</div>
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm text-slate-700">{row.claimsCount}</td>
                <td className="px-3 py-3 text-right font-mono text-sm font-bold text-slate-800">{formatCurrency(row.averageCostAed)}</td>
                <td className="px-3 py-3 text-right font-mono text-sm font-bold">
                  <span className={denialOk ? 'text-emerald-700' : 'text-amber-700'}>
                    {row.denialRatePercent ?? row.approvalRatePercent}%{denialOk ? ' ✅' : ' ⚠'}
                  </span>
                </td>
                <td className={`px-3 py-3 font-bold ${fraud.cls}`}>{fraud.label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export const MonthlyVolumeChart = ({ points }: { points: InsuranceMonthlyClaimsVolumePoint[] }) => {
  const maxValue = Math.max(1, ...points.map((p) => p.claimsValueAed));
  const maxCount = Math.max(1, ...points.map((p) => p.claimsCount));
  const [mode, setMode] = useState<'volume' | 'value' | 'both'>('both');
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(['volume', 'value', 'both'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ${mode === m ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {points.map((p) => {
          const valueH = Math.round((p.claimsValueAed / maxValue) * 100);
          const countH = Math.round((p.claimsCount / maxCount) * 100);
          return (
            <div key={p.id} className={`flex h-44 flex-col justify-end rounded-xl p-2 ${p.isCurrentMonth ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-slate-50'}`}>
              <div className="flex flex-1 items-end gap-1">
                {(mode === 'volume' || mode === 'both') ? <div className="w-full rounded-t bg-blue-500" style={{ height: `${countH}%` }} /> : null}
                {(mode === 'value' || mode === 'both') ? <div className="w-full rounded-t bg-violet-500" style={{ height: `${valueH}%` }} /> : null}
              </div>
              <div className="mt-2 text-center font-mono text-[11px] text-slate-700">{p.monthLabel}</div>
              <div className="text-center font-mono text-[10px] text-slate-500">{(p.claimsValueAed / 1_000_000).toFixed(1)}M</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Shared data hook ─────────────────────────────────────────────────────────

export const useInsurancePageData = () => {
  const query = useInsurancePortal();
  const data = query.data;
  const pendingPreAuths =
    data?.preAuthorizations.filter(
      (item) => item.status === 'review' || item.status === 'overdue',
    ) ?? [];
  const overduePreAuth =
    pendingPreAuths.find((item) => item.status === 'overdue') ?? pendingPreAuths[0] ?? null;
  const claimTotal = data?.claims.reduce((sum, claim) => sum + claim.amountAed, 0) ?? 0;
  const approvedClaims = data?.claims.filter((claim) => claim.status === 'approved') ?? [];
  const openFraud = data?.fraudAlerts.filter((item) => item.status !== 'resolved') ?? [];

  return { ...query, data, pendingPreAuths, overduePreAuth, claimTotal, approvedClaims, openFraud };
};