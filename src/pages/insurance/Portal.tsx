import { type ReactNode, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
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

type BadgeTone = 'red' | 'amber' | 'blue';
type PillTone = 'red' | 'amber' | 'emerald' | 'blue' | 'violet' | 'slate';

interface InsuranceNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: 'main' | 'intelligence' | 'admin';
  badge?: number;
  badgeTone?: BadgeTone;
  pulse?: boolean;
}

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

const formatCurrency = (value: number | null | undefined) =>
  typeof value === 'number' ? `AED ${value.toLocaleString()}` : 'AED —';

const titleCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

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

const statusTone = (status: string): PillTone => {
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

const StatusPill = ({ children, tone }: { children: ReactNode; tone: PillTone }) => (
  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${pillClasses[tone]}`}>
    {children}
  </span>
);

const SectionCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
  <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-4">
      <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
    </div>
    <div className="p-5">{children}</div>
  </article>
);

const KpiCard = ({ label, value, helper, tone }: { label: string; value: string | number; helper: string; tone: 'blue' | 'emerald' | 'amber' | 'red' }) => {
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

const navItemsForData = (data: InsurancePortalData | null): InsuranceNavItem[] => {
  const overduePreAuths = data?.preAuthorizations.filter((item) => item.status === 'overdue').length ?? 0;
  const pendingPreAuths = data?.preAuthorizations.filter((item) => item.status === 'review' || item.status === 'overdue').length ?? 0;
  const openClaims = data?.claims.filter((item) => item.status === 'submitted' || item.status === 'under_review').length ?? 0;
  const openFraud = data?.fraudAlerts.filter((item) => item.status !== 'resolved').length ?? 0;

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

const InsuranceShell = ({ data, children }: { data: InsurancePortalData | null; children: ReactNode }) => {
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
  const urgentPreAuth = data?.preAuthorizations.find((item) => item.status === 'overdue') ?? data?.preAuthorizations[0] ?? null;
  const openFraud = data?.fraudAlerts.filter((item) => item.status !== 'resolved').length ?? 0;
  const claimValue = data?.claims.reduce((sum, claim) => sum + claim.amountAed, 0) ?? 0;

  const signOutAndLeave = async () => {
    await signOut();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className={`flex shrink-0 flex-col bg-[#0F2D4A] transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
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
            <div className="mb-1 text-[9px] text-white/40">{formatNumber(data?.profile?.activeMembers)} active members · CeenAiX</div>
            <div className="text-[9px] text-white/45">
              {officerName} · {data?.profile?.officerTitle ?? 'Claims officer'}
            </div>
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto py-3">
          {navSections.map((section) => (
            <div key={section.id} className="mb-5">
              {!collapsed ? <div className="mb-1 px-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[#4A7AA8]">{section.title}</div> : null}
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
                          <span className={`flex-1 text-left text-[13px] ${active ? 'font-semibold text-[#E2F0FF]' : 'text-[#93C5E8]'}`}>{item.label}</span>
                          {item.badge ? (
                            <span className={`flex h-[18px] min-w-5 items-center justify-center rounded-full border px-1.5 font-mono text-[10px] font-bold ${badgeClass} ${item.pulse ? 'animate-pulse' : ''}`}>
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

        {!collapsed ? (
          <div className="mx-3 mb-3 rounded-xl border border-white/[0.05] bg-black/20 p-3">
            <div className="mb-1 font-mono text-[10px] text-[#93C5E8]">{formatCurrency(claimValue)} claims · current seed period</div>
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
              {data?.preAuthorizations.filter((item) => item.status === 'review' || item.status === 'overdue').length ?? 0} pre-auths pending review
            </div>
          </div>
        ) : null}

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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
                <span className="text-xs font-semibold text-red-600">{urgentPreAuth.status === 'overdue' ? '1 pre-auth SLA OVERDUE' : 'Pre-auth pending'}</span>
                <span className="truncate text-xs text-red-900">
                  — {urgentPreAuth.externalRef} · {urgentPreAuth.procedureName} · {urgentPreAuth.patientName}
                </span>
                <span className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white">Review Now</span>
              </button>
            ) : null}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button className="hidden items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 transition hover:bg-red-100 md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-600">{openFraud} Fraud Alerts</span>
            </button>
            <button className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 transition hover:bg-slate-200 md:flex">
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs text-slate-500">Export</span>
            </button>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 transition hover:bg-slate-200">
              <Bell className="h-4 w-4 text-slate-600" />
              {urgentPreAuth ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" /> : null}
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 transition hover:bg-slate-200">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E3A5F] text-xs font-bold text-white">{officerInitials || 'IO'}</div>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
};

const PreAuthAlert = ({ item }: { item: InsurancePreAuthorization | null }) => {
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
            <div className="mt-1 text-sm text-red-900">DHA requires response within the configured SLA window for urgent pre-authorizations</div>
            <div className="mt-2 text-xs text-red-800">
              {item.externalRef} · {item.procedureName} — {item.patientName}
            </div>
          </div>
        </div>
        <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Review urgent case</button>
      </div>
    </section>
  );
};

const ClaimsTodayCard = ({ claims, activeMembers }: { claims: InsuranceClaim[]; activeMembers: number | null | undefined }) => {
  const groups = [
    {
      key: 'approved',
      label: 'Auto-approved',
      count: claims.filter((claim) => claim.status === 'approved').length,
      amount: claims.filter((claim) => claim.status === 'approved').reduce((sum, claim) => sum + claim.amountAed, 0),
      color: '#10b981',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      key: 'pending',
      label: 'Pending',
      count: claims.filter((claim) => claim.status === 'submitted' || claim.status === 'under_review').length,
      amount: claims
        .filter((claim) => claim.status === 'submitted' || claim.status === 'under_review')
        .reduce((sum, claim) => sum + claim.amountAed, 0),
      color: '#f59e0b',
      text: 'text-amber-700',
      bg: 'bg-amber-50',
    },
    {
      key: 'denied',
      label: 'Denied',
      count: claims.filter((claim) => claim.status === 'denied').length,
      amount: claims.filter((claim) => claim.status === 'denied').reduce((sum, claim) => sum + claim.amountAed, 0),
      color: '#ef4444',
      text: 'text-red-700',
      bg: 'bg-red-50',
    },
    {
      key: 'appealed',
      label: 'Appealed',
      count: claims.filter((claim) => claim.status === 'appealed').length,
      amount: claims.filter((claim) => claim.status === 'appealed').reduce((sum, claim) => sum + claim.amountAed, 0),
      color: '#8b5cf6',
      text: 'text-violet-700',
      bg: 'bg-violet-50',
    },
  ];
  const totalCount = groups.reduce((sum, group) => sum + group.count, 0);
  const totalAmount = groups.reduce((sum, group) => sum + group.amount, 0);
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
              <circle
                key={group.key}
                cx="56"
                cy="56"
                r="42"
                fill="none"
                stroke={group.color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                transform="rotate(-90 56 56)"
              />
            );
            offset += dash;
            return element;
          })}
          <circle cx="56" cy="56" r="29" fill="#ffffff" />
          <text x="56" y="53" textAnchor="middle" className="fill-slate-900 text-[13px] font-bold">
            {formatNumber(totalCount)}
          </text>
          <text x="56" y="66" textAnchor="middle" className="fill-slate-400 text-[7px]">
            claims
          </text>
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

// ============================================================================
// Hosted-style helpers (parity with bolt reference)
// ============================================================================

const KpiHostedCard = ({
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

const aiRecBadge = (rec: InsurancePreAuthorization['aiRecommendation']) => {
  if (rec === 'approve') return { label: '✓ AI: APPROVE', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' };
  if (rec === 'review') return { label: '⚠ AI: REVIEW', cls: 'bg-amber-100 text-amber-700 ring-amber-200' };
  if (rec === 'deny') return { label: '✗ AI: DENY', cls: 'bg-rose-100 text-rose-700 ring-rose-200' };
  return { label: '— AI: PENDING', cls: 'bg-slate-100 text-slate-600 ring-slate-200' };
};

const planTierTone = (label: string | null) => {
  const v = (label ?? '').toLowerCase();
  if (v.includes('gold')) return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (v.includes('silver')) return 'bg-slate-100 text-slate-700 ring-slate-200';
  if (v.includes('basic')) return 'bg-blue-50 text-blue-700 ring-blue-200';
  return 'bg-slate-50 text-slate-600 ring-slate-200';
};

const ageGenderShort = (age: number | null, gender: string | null) => {
  if (age == null && !gender) return '';
  const g = gender ? gender.charAt(0).toUpperCase() : '';
  if (age == null) return g;
  return `${age}${g}`;
};

const PreAuthHostedTable = ({ rows, max }: { rows: InsurancePreAuthorization[]; max?: number }) => {
  const visible = max ? rows.slice(0, max) : rows;
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
                      <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
                        OVERDUE
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-slate-900">{row.patientName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      {row.planLabel ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${planTierTone(row.planLabel)}`}>
                          {row.planLabel}
                        </span>
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
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${ai.cls}`}>
                      {ai.label}
                    </span>
                    {row.aiConfidencePercent != null ? (
                      <div className="mt-0.5 font-mono text-[10px] text-slate-500">{row.aiConfidencePercent}% confidence</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold ${overdue ? 'text-red-700' : 'text-slate-600'}`}>{slaLabel}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700">Approve</button>
                      <button className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">Review</button>
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
    </div>
  );
};

const AiInsightCard = ({ insight }: { insight: InsuranceAiInsight }) => {
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
          <button className="rounded-lg bg-[#1E3A5F] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#27537f]">
            {insight.primaryActionLabel}
          </button>
        ) : null}
        {insight.secondaryActionLabel ? (
          <button className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
            {insight.secondaryActionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
};

const FraudAlertCard = ({ alert }: { alert: InsuranceFraudAlert }) => {
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
        <button className="rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-red-700">Investigate</button>
        <button className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100">Freeze Claims</button>
      </div>
    </div>
  );
};

const fraudScoreBadge = (score: 'low' | 'medium' | 'high' | null) => {
  if (score === 'high') return { label: '🔴 HIGH', cls: 'text-red-700' };
  if (score === 'medium') return { label: '🟡 Medium', cls: 'text-amber-700' };
  if (score === 'low') return { label: '🟢 Low', cls: 'text-emerald-700' };
  return { label: '—', cls: 'text-slate-500' };
};

const NetworkProvidersTable = ({ rows }: { rows: InsuranceNetworkProvider[] }) => (
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

const MonthlyVolumeChart = ({ points }: { points: InsuranceMonthlyClaimsVolumePoint[] }) => {
  const maxValue = Math.max(1, ...points.map((p) => p.claimsValueAed));
  const maxCount = Math.max(1, ...points.map((p) => p.claimsCount));
  const [mode, setMode] = useState<'volume' | 'value' | 'both'>('both');
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(['volume', 'value', 'both'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ${
              mode === m ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
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
                {(mode === 'volume' || mode === 'both') ? (
                  <div className="w-full rounded-t bg-blue-500" style={{ height: `${countH}%` }} />
                ) : null}
                {(mode === 'value' || mode === 'both') ? (
                  <div className="w-full rounded-t bg-violet-500" style={{ height: `${valueH}%` }} />
                ) : null}
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

const useInsurancePageData = () => {
  const query = useInsurancePortal();
  const data = query.data;
  const pendingPreAuths = data?.preAuthorizations.filter((item) => item.status === 'review' || item.status === 'overdue') ?? [];
  const overduePreAuth = pendingPreAuths.find((item) => item.status === 'overdue') ?? pendingPreAuths[0] ?? null;
  const claimTotal = data?.claims.reduce((sum, claim) => sum + claim.amountAed, 0) ?? 0;
  const approvedClaims = data?.claims.filter((claim) => claim.status === 'approved') ?? [];
  const openFraud = data?.fraudAlerts.filter((item) => item.status !== 'resolved') ?? [];

  return {
    ...query,
    data,
    pendingPreAuths,
    overduePreAuth,
    claimTotal,
    approvedClaims,
    openFraud,
  };
};

export const InsurancePortal = () => {
  const navigate = useNavigate();
  const { data, loading, overduePreAuth, openFraud } = useInsurancePageData();
  const profile = data?.profile ?? null;
  const preAuths = useMemo(() => data?.preAuthorizations ?? [], [data?.preAuthorizations]);
  const fraudAlerts = data?.fraudAlerts ?? [];
  const aiInsights = data?.aiInsights ?? [];
  const monthlyVolume = data?.monthlyClaimsVolume ?? [];
  const pendingPreAuths = preAuths.filter((p) => p.status === 'review' || p.status === 'overdue');
  const urgentPending = preAuths.filter((p) => p.priority === 'urgent' && p.status !== 'approved' && p.status !== 'denied').length;
  const standardPending = pendingPreAuths.length - urgentPending;
  const aiHigh = fraudAlerts.filter((a) => a.severity === 'high' && a.status !== 'resolved').length;
  const aiMedium = fraudAlerts.filter((a) => a.severity === 'medium' && a.status !== 'resolved').length;
  const aiBulkApproveCount = preAuths.filter((p) => p.aiRecommendation === 'approve' && p.aiConfidencePercent != null && p.aiConfidencePercent >= 95 && p.status !== 'approved').length;

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
    <InsuranceShell data={data}>
      <PreAuthAlert item={overduePreAuth} />

      {/* Hosted-style 6-tile KPI grid */}
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
              <div className="text-amber-700">{profile?.slaTargetUrgentHours ?? 4}h urgent ⚠️ ({preAuths.filter((p) => p.status === 'overdue').length} breach)</div>
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

      {/* Pre-Auth Queue + Right-rail (Claims Today, AI Insights) */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">Pre-Authorization Queue</h2>
                <p className="mt-0.5 text-xs text-slate-400">{pendingPreAuths.length} pending · DHA response required</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
                  Bulk Approve AI Recommended ({aiBulkApproveCount})
                </button>
                <button onClick={() => navigate('/insurance/preauth')} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  View All →
                </button>
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
              <PreAuthHostedTable rows={filtered} max={5} />
              {filtered.length > 5 ? (
                <button onClick={() => navigate('/insurance/preauth')} className="mt-3 w-full rounded-lg bg-slate-50 px-4 py-2 text-xs font-bold text-[#1E3A5F] hover:bg-slate-100">
                  Show {filtered.length - 5} more pre-auths →
                </button>
              ) : null}
            </div>
          </article>

          {/* Claims Volume Chart */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">Claims Volume &amp; Value — {monthlyVolume[0]?.year ?? new Date().getFullYear()}</h2>
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
              <button onClick={() => navigate('/insurance/fraud')} className="text-xs font-bold text-[#1E3A5F] hover:text-[#27537f]">View All →</button>
            </div>
            <div className="space-y-3 p-5">
              {openFraud.filter((a) => a.severity === 'high').slice(0, 2).map((alert) => (
                <FraudAlertCard key={alert.id} alert={alert} />
              ))}
              {aiMedium > 0 ? (
                <button onClick={() => navigate('/insurance/fraud')} className="block w-full rounded-lg bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-700 ring-1 ring-amber-100 hover:bg-amber-100">
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
              <button onClick={() => navigate('/insurance/network')} className="text-xs font-bold text-[#1E3A5F] hover:text-[#27537f]">View All →</button>
            </div>
            <div className="p-5">
              <NetworkProvidersTable rows={data?.networkProviders ?? []} />
            </div>
          </article>
        </div>
      </section>

      {/* Bottom action button row */}
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

export const InsurancePreAuthorizations = () => {
  const { data, overduePreAuth } = useInsurancePageData();
  const preAuths = useMemo(() => data?.preAuthorizations ?? [], [data?.preAuthorizations]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'review' | 'deny' | 'overdue' | 'approved'>('all');
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

  const aiBulkApprove = preAuths.filter((p) => p.aiRecommendation === 'approve' && (p.aiConfidencePercent ?? 0) >= 95).length;

  const filterTabs: Array<{ id: typeof filter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: preAuths.length },
    { id: 'urgent', label: 'Urgent', count: preAuths.filter((p) => p.priority === 'urgent').length },
    { id: 'review', label: 'AI: Review', count: preAuths.filter((p) => p.aiRecommendation === 'review').length },
    { id: 'deny', label: 'AI: Deny', count: preAuths.filter((p) => p.aiRecommendation === 'deny').length },
    { id: 'overdue', label: 'Overdue', count: preAuths.filter((p) => p.status === 'overdue').length },
    { id: 'approved', label: 'Approved', count: preAuths.filter((p) => p.status === 'approved').length },
  ];

  return (
    <InsuranceShell data={data}>
      <PreAuthAlert item={overduePreAuth} />
      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Pre-Authorizations</h2>
            <p className="mt-0.5 text-xs text-slate-400">Review urgent, high, and routine authorization requests</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
              Bulk Approve AI Recommended ({aiBulkApprove})
            </button>
            <button className="rounded-lg bg-[#1E3A5F] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#27537f]">
              Run AI triage
            </button>
          </div>
        </div>
        <div className="border-b border-slate-100 px-5 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
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
          <PreAuthHostedTable rows={filtered} />
        </div>
      </article>
    </InsuranceShell>
  );
};

export const InsuranceClaims = () => {
  const { data, loading, claimTotal } = useInsurancePageData();
  const claims = useMemo(() => data?.claims ?? [], [data?.claims]);
  const profile = data?.profile;
  const submitted = claims.filter((claim) => claim.status === 'submitted').length;
  const review = claims.filter((claim) => claim.status === 'under_review').length;
  const approved = claims.filter((claim) => claim.status === 'approved').length;
  const denied = claims.filter((claim) => claim.status === 'denied').length;
  const appealed = claims.filter((claim) => claim.status === 'appealed').length;

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
    <InsuranceShell data={data}>
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
                          {claim.planTier ? <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${planTierTone(claim.planTier)}`}>{claim.planTier}</span> : null}
                          {claim.planName}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700">{claim.providerName}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{claim.claimType ?? '—'}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-bold text-slate-800">{formatCurrency(claim.amountAed)}</td>
                      <td className="px-3 py-3">
                        <StatusPill tone={statusTone(claim.status)}>{titleCase(claim.status.replace('_', ' '))}</StatusPill>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{formatDate(claim.submittedAt)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">No claims match this filter.</td></tr>
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

export const InsuranceMembers = () => {
  const { data, loading } = useInsurancePageData();
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
        (m) => m.patientName.toLowerCase().includes(q) || m.externalMemberId.toLowerCase().includes(q) || m.planName.toLowerCase().includes(q),
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
    <InsuranceShell data={data}>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiHostedCard label="Active Members" value={loading ? '...' : formatNumber(profile?.activeMembers ?? members.length)} caption="On CeenAiX platform" tone="blue" />
        {tiers.map((tier) => (
          <article key={tier.label} className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100`}>
            <div className={`mb-2 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${tier.tone}`}>{tier.label}</div>
            <div className="font-mono text-2xl font-bold text-slate-900">{tier.count != null ? formatNumber(tier.count) : '—'}</div>
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
                <div className={`h-2 rounded-full ${member.utilizationPercent >= 75 ? 'bg-red-500' : member.utilizationPercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, member.utilizationPercent)}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span className="font-mono">{member.utilizationPercent}% utilization</span>
                <span>{member.claimCount} claims YTD</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No members match.</div>
          ) : null}
        </div>
      </article>
    </InsuranceShell>
  );
};

export const InsuranceFraudDetection = () => {
  const { data, loading, openFraud } = useInsurancePageData();
  const alerts = data?.fraudAlerts ?? [];
  const high = alerts.filter((a) => a.severity === 'high' && a.status !== 'resolved').length;
  const medium = alerts.filter((a) => a.severity === 'medium' && a.status !== 'resolved').length;
  const low = alerts.filter((a) => a.severity === 'low' && a.status !== 'resolved').length;
  const exposure = openFraud.reduce((sum, a) => sum + a.exposureAmountAed, 0);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const filtered = severityFilter === 'all' ? alerts : alerts.filter((a) => a.severity === severityFilter);

  return (
    <InsuranceShell data={data}>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiHostedCard label="High Risk" value={loading ? '...' : formatNumber(high)} caption="Investigation required" tone="red" />
        <KpiHostedCard label="Medium Risk" value={loading ? '...' : formatNumber(medium)} caption="Watchlist" tone="amber" />
        <KpiHostedCard label="Low Risk" value={loading ? '...' : formatNumber(low)} caption="Monitored only" tone="blue" />
        <KpiHostedCard label="Total Exposure" value={loading ? '...' : formatCurrency(exposure)} caption="Open alert exposure" tone="violet" />
      </section>
      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Fraud Detection</h2>
            <p className="mt-0.5 text-xs text-slate-400">AI flagged providers and claim patterns · {alerts.length} total alerts</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'high', 'medium', 'low'] as const).map((tone) => (
              <button
                key={tone}
                onClick={() => setSeverityFilter(tone)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize ${severityFilter === tone ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {tone === 'all' ? 'All' : tone}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 lg:grid-cols-2">
          {filtered.map((alert) => (
            <FraudAlertCard key={alert.id} alert={alert} />
          ))}
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No fraud alerts.</div>
          ) : null}
        </div>
      </article>
    </InsuranceShell>
  );
};

export const InsuranceRiskAnalytics = () => {
  const { data } = useInsurancePageData();
  const maxLossRatio = Math.max(...(data?.riskSegments.map((item) => item.lossRatioPercent) ?? [1]), 1);
  const savingsFound = data?.fraudAlerts.reduce((sum, alert) => sum + alert.exposureAmountAed, 0) ?? 0;
  const averageLossRatio = data?.riskSegments.length
    ? Math.round(data.riskSegments.reduce((sum, item) => sum + item.lossRatioPercent, 0) / data.riskSegments.length)
    : 0;

  return (
    <InsuranceShell data={data}>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Risk Analytics" subtitle="Plan utilization and cost trend signals">
          <div className="space-y-4">
            {(data?.riskSegments ?? []).map((segment) => (
              <div key={segment.id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold text-slate-600">{segment.segmentName}</span>
                  <span className="font-mono text-slate-500">{segment.utilizationPercent}% utilization</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-[#1E3A5F]" style={{ width: `${Math.min(100, (segment.lossRatioPercent / maxLossRatio) * 100)}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-slate-400">{segment.forecastNote}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Loss Ratio Forecast" subtitle="Current seeded period">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Medical loss" value={`${averageLossRatio}%`} helper="Average risk segment loss ratio" tone="amber" />
            <KpiCard label="Savings found" value={formatCurrency(savingsFound)} helper="Open fraud alert exposure" tone="emerald" />
          </div>
        </SectionCard>
      </section>
    </InsuranceShell>
  );
};

export const InsuranceNetworkProviders = () => {
  const { data, loading } = useInsurancePageData();
  const providers = data?.networkProviders ?? [];
  const totalClaims = providers.reduce((sum, p) => sum + p.claimsCount, 0);
  const avgApproval = providers.length ? Math.round(providers.reduce((sum, p) => sum + p.approvalRatePercent, 0) / providers.length) : 0;
  const flaggedFraud = providers.filter((p) => p.fraudScore === 'high' || p.fraudScore === 'medium').length;
  const [search, setSearch] = useState('');
  const filtered = providers.filter(
    (p) => !search.trim() || p.providerName.toLowerCase().includes(search.toLowerCase()) || p.specialty.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <InsuranceShell data={data}>
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

export const InsuranceReports = () => {
  const { data, loading, claimTotal, openFraud } = useInsurancePageData();
  const reports = data?.reportRuns ?? [];
  const fraudExposure = openFraud.reduce((sum, alert) => sum + alert.exposureAmountAed, 0);
  const ready = reports.filter((r) => r.status === 'ready').length;
  const running = reports.filter((r) => r.status === 'running').length;
  const failed = reports.filter((r) => r.status === 'failed').length;

  const grouped: Record<string, typeof reports> = {};
  reports.forEach((r) => {
    const lower = r.reportName.toLowerCase();
    let cat = 'Operational';
    if (lower.includes('dha') || lower.includes('regulator') || lower.includes('compliance')) cat = 'Regulatory';
    else if (lower.includes('finance') || lower.includes('claim') || lower.includes('budget')) cat = 'Financial';
    else if (lower.includes('utiliz') || lower.includes('member') || lower.includes('cohort')) cat = 'Utilization';
    else if (lower.includes('fraud') || lower.includes('risk')) cat = 'Risk & Fraud';
    grouped[cat] = grouped[cat] ?? [];
    grouped[cat].push(r);
  });

  return (
    <InsuranceShell data={data}>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiHostedCard label="Total Reports" value={loading ? '...' : formatNumber(reports.length)} caption="Across all categories" tone="blue" />
        <KpiHostedCard label="Ready to Download" value={loading ? '...' : formatNumber(ready)} caption={`${running} running · ${failed} failed`} tone="emerald" />
        <KpiHostedCard label="Claims Value" value={loading ? '...' : formatCurrency(claimTotal)} caption="Current period" tone="violet" />
        <KpiHostedCard label="Fraud Exposure" value={loading ? '...' : formatCurrency(fraudExposure)} caption="Open investigations" tone="red" />
      </section>
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, items]) => (
          <article key={category} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">{category} Reports</h2>
                <p className="mt-0.5 text-xs text-slate-400">{items.length} report{items.length === 1 ? '' : 's'} in this category</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((report) => (
                <div key={report.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{report.reportName}</div>
                    <div className="text-xs text-slate-400">
                      <StatusPill tone={statusTone(report.status)}>{titleCase(report.status)}</StatusPill>
                      <span className="ml-2">{report.periodLabel}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={report.status !== 'ready'}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A5F] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#27537f] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
        {reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No report runs available yet.
          </div>
        ) : null}
      </div>
    </InsuranceShell>
  );
};

export const InsuranceSettings = () => {
  const { data } = useInsurancePageData();
  const settings = data?.settings ?? [];
  const profile = data?.profile;

  const grouped: Record<string, typeof settings> = {};
  settings.forEach((s) => {
    const k = s.settingKey.toLowerCase();
    let cat = 'General';
    if (k.includes('ai') || k.includes('auto')) cat = 'AI & Automation';
    else if (k.includes('alert') || k.includes('notif')) cat = 'Alerts & Notifications';
    else if (k.includes('compliance') || k.includes('dha') || k.includes('audit')) cat = 'Compliance & Audit';
    else if (k.includes('fraud') || k.includes('risk')) cat = 'Fraud & Risk';
    grouped[cat] = grouped[cat] ?? [];
    grouped[cat].push(s);
  });

  return (
    <InsuranceShell data={data}>
      {profile ? (
        <article className="rounded-2xl border border-slate-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">{profile.displayName}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {profile.regulatorName}
                {profile.arabicName ? <span className="ml-2 text-slate-400">· {profile.arabicName}</span> : null}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Officer: <span className="font-semibold">{profile.officerName}</span> · {profile.officerTitle}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 text-xs ring-1 ring-violet-100">
              <div className="font-bold text-slate-700">SLA Targets</div>
              <div className="mt-1 text-slate-500">
                Standard: <span className="font-mono font-bold">{profile.slaTargetStandardHours ?? '—'}h</span>
              </div>
              <div className="text-slate-500">
                Urgent: <span className="font-mono font-bold">{profile.slaTargetUrgentHours ?? '—'}h</span>
              </div>
            </div>
          </div>
        </article>
      ) : null}
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, items]) => (
          <article key={category} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-[15px] font-bold text-slate-900">{category}</h3>
              <p className="mt-0.5 text-xs text-slate-400">{items.length} preference{items.length === 1 ? '' : 's'}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{setting.title}</div>
                    <div className="text-xs text-slate-500">{setting.description}</div>
                  </div>
                  <div className={`relative h-6 w-12 shrink-0 rounded-full transition ${setting.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${setting.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
        {settings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No settings configured.
          </div>
        ) : null}
      </div>
    </InsuranceShell>
  );
};
