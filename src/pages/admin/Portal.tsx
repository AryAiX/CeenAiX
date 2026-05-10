import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Brain,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Layers,
  LockKeyhole,
  LogOut,
  Phone,
  Plug,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Stethoscope,
  Terminal,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  useAdminAiAnalytics,
  useAdminAiDashboard,
  useAdminCompliance,
  useAdminDashboard,
  useAdminDiagnostics,
  useAdminDoctorDirectory,
  useAdminInsurancePartners,
  useAdminMetrics,
  useAdminOrganizations,
  useAdminPatientDirectory,
  useAdminSystemHealth,
  useAdminUsers,
} from '../../hooks';
import type { AdminComplianceData, AdminDiagnosticsData } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import type {
  AdminAiAnalyticsPayload,
  AdminAiDashboardPayload,
  AdminAuditEventRow,
  AdminDashboardPayload,
  AdminDoctorRow,
  AdminInsurancePartnerRow,
  AdminMetricsPayload,
  AdminPatientRow,
  AdminSystemHealthPayload,
  AdminUserRow,
  Organization,
  ServiceHealthSnapshot,
  UserRole,
} from '../../types';

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type AdminPage =
  | 'dashboard'
  | 'patients'
  | 'doctors'
  | 'organizations'
  | 'insurance'
  | 'ai'
  | 'integrations'
  | 'revenue'
  | 'nabidh'
  | 'compliance'
  | 'audit'
  | 'security'
  | 'system'
  | 'diagnostics'
  | 'settings'
  | 'users';

interface AdminContext {
  metrics: AdminMetricsPayload | null;
  users: AdminUserRow[];
  organizations: Organization[];
  compliance: AdminComplianceData | null;
  systemHealth: AdminSystemHealthPayload | null;
  aiAnalytics: AdminAiAnalyticsPayload | null;
  diagnostics: AdminDiagnosticsData | null;
  dashboard: AdminDashboardPayload | null;
  doctors: AdminDoctorRow[];
  patients: AdminPatientRow[];
  insurancePartners: AdminInsurancePartnerRow[];
  aiDashboard: AdminAiDashboardPayload | null;
  loading: boolean;
  error: string | null;
}

interface AdminNavItem {
  page: AdminPage;
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number | null;
  badgeTone?: 'teal' | 'amber' | 'red' | 'blue';
}

interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '0';

const formatAed = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'AED 0';
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`;
  return `AED ${value.toLocaleString()}`;
};

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

const todayStamp = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const todayTime = () =>
  `${new Date().toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })} GST`;

const compactBadge = (value: number | undefined) => {
  if (typeof value !== 'number' || value <= 0) return undefined;
  if (value >= 1000) return value.toLocaleString();
  return value;
};

const buildAdminSections = (context: AdminContext): AdminNavSection[] => {
  const ctx = context.dashboard?.context;
  return [
    {
      label: 'OVERVIEW',
      items: [
        {
          page: 'dashboard',
          href: '/admin/dashboard',
          label: 'Dashboard',
          icon: BarChart3,
          badge: compactBadge(context.dashboard?.issues.length ?? ctx?.open_issues),
          badgeTone: 'amber',
        },
      ],
    },
    {
      label: 'USERS & ORGANIZATIONS',
      items: [
        {
          page: 'patients',
          href: '/admin/patients',
          label: 'Patients',
          icon: Users,
          badge: compactBadge(ctx?.total_patients),
          badgeTone: 'teal',
        },
        {
          page: 'doctors',
          href: '/admin/doctors',
          label: 'Doctors',
          icon: Stethoscope,
          badge: compactBadge(ctx?.pending_doctors),
          badgeTone: 'amber',
        },
        {
          page: 'organizations',
          href: '/admin/organizations',
          label: 'Organizations',
          icon: Building2,
          badge: compactBadge(context.dashboard?.orgsSummary.total ?? context.organizations.length),
          badgeTone: 'blue',
        },
        {
          page: 'insurance',
          href: '/admin/insurance',
          label: 'Insurance',
          icon: ShieldCheck,
        },
      ],
    },
    {
      label: 'PLATFORM',
      items: [
        {
          page: 'ai',
          href: '/admin/ai',
          label: 'AI Analytics',
          icon: Brain,
          badge: compactBadge(ctx?.ai_sessions_today),
          badgeTone: 'teal',
        },
        {
          page: 'integrations',
          href: '/admin/integrations',
          label: 'Integrations',
          icon: Plug,
          badge: degradedServiceCount(context.systemHealth) > 0 ? '⚠️' : undefined,
          badgeTone: 'amber',
        },
        {
          page: 'revenue',
          href: '/admin/revenue',
          label: 'Revenue',
          icon: CircleDollarSign,
        },
        {
          page: 'nabidh',
          href: '/admin/nabidh',
          label: 'NABIDH',
          icon: Activity,
        },
      ],
    },
    {
      label: 'COMPLIANCE & SECURITY',
      items: [
        {
          page: 'compliance',
          href: '/admin/compliance',
          label: 'DHA Compliance',
          icon: Shield,
          badge: compactBadge(context.compliance?.openIncidentCount),
          badgeTone: 'red',
        },
        {
          page: 'audit',
          href: '/admin/audit',
          label: 'Audit Logs',
          icon: ClipboardList,
        },
        {
          page: 'security',
          href: '/admin/security',
          label: 'Security',
          icon: LockKeyhole,
          badge: compactBadge(context.compliance?.openIncidentCount),
          badgeTone: 'amber',
        },
      ],
    },
    {
      label: 'SYSTEM',
      items: [
        {
          page: 'system',
          href: '/admin/system-health',
          label: 'System Health',
          icon: Terminal,
        },
        {
          page: 'settings',
          href: '/admin/platform-settings',
          label: 'Platform Settings',
          icon: Settings,
        },
      ],
    },
  ];
};

const degradedServiceCount = (systemHealth: AdminSystemHealthPayload | null) => {
  const services = [
    ...(systemHealth?.services ?? []),
    ...(systemHealth?.integrations ?? []),
    ...(systemHealth?.aiServices ?? []),
  ];
  return services.filter((service) => service.status !== 'healthy').length;
};

const useAdminContextValue = (): AdminContext => {
  const [roleFilter] = useState<UserRole | ''>('');
  const metrics = useAdminMetrics();
  const users = useAdminUsers({ role: roleFilter || null, limit: 120 });
  const organizations = useAdminOrganizations();
  const compliance = useAdminCompliance();
  const systemHealth = useAdminSystemHealth();
  const aiAnalytics = useAdminAiAnalytics();
  const diagnostics = useAdminDiagnostics();
  const dashboard = useAdminDashboard();
  const doctors = useAdminDoctorDirectory();
  const patients = useAdminPatientDirectory();
  const insurancePartners = useAdminInsurancePartners();
  const aiDashboard = useAdminAiDashboard();

  const error =
    [
      metrics.error,
      users.error,
      organizations.error,
      compliance.error,
      systemHealth.error,
      aiAnalytics.error,
      diagnostics.error,
      dashboard.error,
      doctors.error,
      patients.error,
      insurancePartners.error,
      aiDashboard.error,
    ].find(Boolean) ?? null;

  return {
    metrics: metrics.data ?? null,
    users: users.data ?? [],
    organizations: organizations.data ?? [],
    compliance: compliance.data ?? null,
    systemHealth: systemHealth.data ?? null,
    aiAnalytics: aiAnalytics.data ?? null,
    diagnostics: diagnostics.data ?? null,
    dashboard: dashboard.data ?? null,
    doctors: doctors.data ?? [],
    patients: patients.data ?? [],
    insurancePartners: insurancePartners.data ?? [],
    aiDashboard: aiDashboard.data ?? null,
    loading:
      metrics.loading ||
      users.loading ||
      organizations.loading ||
      compliance.loading ||
      systemHealth.loading ||
      aiAnalytics.loading ||
      diagnostics.loading ||
      dashboard.loading ||
      doctors.loading ||
      patients.loading ||
      insurancePartners.loading ||
      aiDashboard.loading,
    error,
  };
};

// ---------------------------------------------------------------------------
// Shell (sidebar + header)
// ---------------------------------------------------------------------------

const navTone = (tone: AdminNavItem['badgeTone']) => {
  if (tone === 'red') return 'bg-red-500/15 text-red-300';
  if (tone === 'amber') return 'bg-amber-500/15 text-amber-300';
  if (tone === 'blue') return 'bg-blue-500/15 text-blue-300';
  return 'bg-teal-500/15 text-teal-300';
};

const SidebarSectionHeading = ({ label }: { label: string }) => (
  <div className="px-5 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
    {label}
  </div>
);

const SidebarLink = ({ item, current }: { item: AdminNavItem; current: boolean }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      className={({ isActive }) => {
        const active = isActive || current;
        return `mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${
          active
            ? 'bg-teal-500/10 font-semibold text-teal-200 ring-1 ring-teal-500/20'
            : 'text-slate-400 hover:bg-slate-900 hover:text-white'
        }`;
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && item.badge !== null && item.badge !== 0 ? (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${navTone(item.badgeTone)}`}>
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  );
};

const titleForPage = (page: AdminPage): string => {
  const map: Record<AdminPage, string> = {
    dashboard: 'Platform Dashboard',
    patients: 'Patients',
    doctors: 'Doctors',
    organizations: 'Organizations',
    insurance: 'Insurance Partners',
    ai: 'AI Analytics',
    integrations: 'Integrations',
    revenue: 'Revenue',
    nabidh: 'NABIDH',
    compliance: 'DHA Compliance',
    audit: 'Audit Logs',
    security: 'Security',
    system: 'System Health',
    diagnostics: 'Diagnostics',
    settings: 'Platform Settings',
    users: 'Users',
  };
  return map[page];
};

const AdminShell = ({
  page,
  context,
  children,
}: {
  page: AdminPage;
  context: AdminContext;
  children: ReactNode;
}) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sections = useMemo(() => buildAdminSections(context), [context]);
  const ctx = context.dashboard?.context;
  const displayName = ctx?.super_admin_name || profile?.full_name || 'Dr. Parnia Yazdkhasti';
  const roleLabel = ctx?.super_admin_role_label || 'CEO & Co-Founder · AryAiX LLC';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) navigate('/auth/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-['Inter'] text-slate-900">
      <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col bg-[#0f1f3a] text-white shadow-lg">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 font-bold">
            C
          </div>
          <div>
            <div className="font-['Plus_Jakarta_Sans'] text-base font-bold leading-tight">CeenAiX</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">
              Super Admin Portal
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 text-teal-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-teal-400" />
              {ctx?.environment_label || 'PRODUCTION'}
            </span>
            <span className="text-slate-300">{ctx?.platform_version || 'v2.4.1'}</span>
          </div>

          <div className="rounded-xl bg-black/20 p-3 ring-1 ring-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 text-sm font-bold">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{displayName}</div>
                <div className="truncate text-[11px] text-slate-300">{roleLabel}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
              <span className="rounded-full bg-teal-500/15 px-2 py-1 text-teal-300">
                Super Admin · Full Access
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pb-3">
          {sections.map((section) => (
            <div key={section.label}>
              <SidebarSectionHeading label={section.label} />
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    current={location.pathname === item.href || page === item.page}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> All Systems Operational
          </div>
          <div className="mb-3 text-[11px] text-slate-400">
            CeenAiX {ctx?.platform_version || 'v2.4.1'} · {ctx?.environment_label || 'Production'}
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            Admin Portal <ChevronRight className="h-3.5 w-3.5" />{' '}
            <span className="font-semibold text-slate-700">{titleForPage(page)}</span>
          </div>
          <div className="ml-4 hidden max-w-md flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 lg:flex">
            <Search className="mr-2 h-4 w-4" />
            <input
              placeholder="Search users, doctors, organizations, audit logs..."
              className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 md:inline">
              {formatNumber(ctx?.active_sessions ?? context.metrics?.totals.users ?? 0)} active sessions
            </span>
            {context.dashboard?.issues.length ? (
              <span className="hidden rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 md:inline">
                {context.dashboard.issues.length} issues detected
              </span>
            ) : null}
            <button className="relative rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-4 w-4" />
              {context.dashboard?.issues.length ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {context.dashboard.issues.length}
                </span>
              ) : null}
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 text-sm font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-5">
          {context.error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Failed to load admin data: {context.error}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const Card = ({
  children,
  className = '',
  shadow = true,
}: {
  children: ReactNode;
  className?: string;
  shadow?: boolean;
}) => (
  <section
    className={`rounded-2xl border border-slate-200 bg-white p-5 ${shadow ? 'shadow-sm' : ''} ${className}`}
  >
    {children}
  </section>
);

const Pill = ({
  children,
  tone = 'slate',
  className = '',
}: {
  children: ReactNode;
  tone?: 'teal' | 'amber' | 'rose' | 'blue' | 'slate' | 'emerald' | 'purple' | 'violet';
  className?: string;
}) => {
  const tones = {
    teal: 'bg-teal-50 text-teal-700 ring-teal-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    purple: 'bg-purple-50 text-purple-700 ring-purple-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

const PageHeader = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) => (
  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
    {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
  </div>
);

const KpiTile = ({
  label,
  value,
  caption,
  trend,
  icon: Icon,
  iconTone = 'bg-teal-50 text-teal-600 ring-teal-100',
}: {
  label: string;
  value: string | number;
  caption?: string;
  trend?: string;
  icon?: LucideIcon;
  iconTone?: string;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-2 font-['DM_Mono'] text-3xl font-bold text-slate-900">{value}</p>
      </div>
      {Icon ? (
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${iconTone}`}>
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
    </div>
    {caption ? <p className="mt-3 text-sm text-slate-500">{caption}</p> : null}
    {trend ? <p className="mt-1 text-xs font-bold text-emerald-600">{trend}</p> : null}
  </div>
);

// ---------------------------------------------------------------------------
// Dashboard view
// ---------------------------------------------------------------------------

const issuesIcon: Record<string, LucideIcon> = {
  license: AlertTriangle,
  security: LockKeyhole,
  integration: Plug,
};

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
          Daily target {formatAed(revenueDaily[0]?.target_aed ?? 0)}
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
  const ctx = context.dashboard?.context;
  const actions = [
    {
      label: 'Verify Doctor',
      value: `${formatNumber(ctx?.pending_doctors ?? 0)} pending`,
      icon: Stethoscope,
    },
    {
      label: 'Approve Org',
      value: `${formatNumber(context.organizations.filter((org) => org.status === 'pending').length)} requests`,
      icon: Building2,
    },
    {
      label: 'Platform Revenue',
      value: `${formatAed(ctx?.revenue_today_aed ?? 0)} today`,
      icon: CircleDollarSign,
    },
    { label: 'AI Dashboard', value: `${formatNumber(ctx?.ai_sessions_today ?? 0)} sessions`, icon: Bot },
    { label: 'DHA Compliance', value: `Score: ${ctx?.dha_score?.toFixed(1) ?? '—'}%`, icon: ShieldCheck },
    {
      label: 'Fraud Review',
      value: `${context.insurancePartners.reduce((acc, p) => acc + p.fraud_alert_count, 0)} flagged`,
      icon: AlertTriangle,
    },
    { label: 'Generate Report', value: 'April 2026', icon: FileText },
    {
      label: 'System Logs',
      value: `${formatNumber(degradedServiceCount(context.systemHealth))} degraded`,
      icon: Terminal,
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
              key={action.label}
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
  const ctx = context.dashboard?.context;
  const issues = context.dashboard?.issues ?? [];
  const portals = context.dashboard?.portals ?? [];
  const liveActivity = context.dashboard?.liveActivity ?? [];
  const checklist = context.dashboard?.complianceChecklist ?? [];
  const licenseAlerts = context.dashboard?.licenseAlerts ?? [];
  const revenueDaily = context.dashboard?.revenueDaily ?? [];
  const orgsSummary = context.dashboard?.orgsSummary;

  return (
    <div className="space-y-5">
      <PageHeader title="Platform Dashboard" subtitle={`${todayStamp()} · ${todayTime()}`}>
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
                    <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100">
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
              <button className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-bold text-white">map</button>
              <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">
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
            <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">
              Pause
            </button>
          </div>
          <div className="space-y-2">
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
                April 2026 · {formatAed(ctx?.revenue_target_aed ?? 0)} target
              </p>
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Daily</button>
              <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                Weekly
              </button>
              <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                Monthly
              </button>
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
              <button className="rounded-lg bg-purple-600 px-2 py-1 text-[11px] font-bold text-white">Today</button>
              <button className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600">Week</button>
              <button className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600">Month</button>
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
              <div className="font-['DM_Mono'] text-base font-bold text-slate-900">0.03%</div>
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

// ---------------------------------------------------------------------------
// Patients view
// ---------------------------------------------------------------------------

type PatientFilter = 'all' | 'active' | 'inactive' | 'flagged' | 'suspended';

const PatientsView = ({ context }: { context: AdminContext }) => {
  const ctx = context.dashboard?.context;
  const patients = context.patients;
  const [filter, setFilter] = useState<PatientFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let rows = patients;
    if (filter !== 'all') {
      rows = rows.filter((p) => p.status_label === filter);
    }
    if (search.trim()) {
      const haystack = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.full_name.toLowerCase().includes(haystack) ||
          p.patient_code.toLowerCase().includes(haystack) ||
          (p.insurance_plan ?? '').toLowerCase().includes(haystack) ||
          (p.city ?? '').toLowerCase().includes(haystack),
      );
    }
    return rows;
  }, [patients, filter, search]);

  const tabs: { key: PatientFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: ctx?.total_patients ?? patients.length },
    {
      key: 'active',
      label: 'Active',
      count: ctx?.patients_30d_active ?? patients.filter((p) => p.status_label === 'active').length,
    },
    { key: 'inactive', label: 'Inactive', count: patients.filter((p) => p.status_label === 'inactive').length },
    {
      key: 'flagged',
      label: 'Flagged',
      count: ctx?.patients_flagged ?? patients.filter((p) => p.status_label === 'flagged').length,
    },
    {
      key: 'suspended',
      label: 'Suspended',
      count: ctx?.patients_suspended ?? patients.filter((p) => p.status_label === 'suspended').length,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Patients" subtitle="Platform-wide patient management">
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Analytics
        </button>
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Export
        </button>
        <button className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          Register Patient
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          label="Total Patients"
          value={formatNumber(ctx?.total_patients ?? 0)}
          trend={`↑ +${ctx?.patient_change_pct?.toFixed(1) ?? '0.0'}% vs last month`}
          icon={Users}
          iconTone="bg-teal-50 text-teal-600 ring-teal-100"
        />
        <KpiTile
          label="Active (30 days)"
          value={formatNumber(ctx?.patients_30d_active ?? 0)}
          caption={
            ctx?.total_patients
              ? `${(((ctx?.patients_30d_active ?? 0) / ctx.total_patients) * 100).toFixed(1)}% of total`
              : ''
          }
          icon={Activity}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="New This Month"
          value={formatNumber(ctx?.patients_new_month ?? 0)}
          trend="↑ +12.4% vs March"
          icon={CheckCircle2}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="Pending Verification"
          value="0"
          caption="All patients auto-verified ✅"
          icon={ShieldCheck}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
        />
        <KpiTile
          label="Flagged / Suspended"
          value={`${(ctx?.patients_flagged ?? 0) + (ctx?.patients_suspended ?? 0)}`}
          caption={`${ctx?.patients_flagged ?? 0} flagged · ${ctx?.patients_suspended ?? 0} suspended`}
          icon={AlertTriangle}
          iconTone="bg-rose-50 text-rose-600 ring-rose-100"
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  filter === tab.key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label} <span className="opacity-70">({formatNumber(tab.count)})</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <option>Insurance: All</option>
            </select>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <option>Region: All UAE</option>
            </select>
            <button className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              More Filters
            </button>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <option>Sort: Newest</option>
            </select>
          </div>
        </div>

        <div className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, PT-ID, insurance, location..."
            className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">PT ID</th>
                <th className="px-3 py-2">Emirates ID</th>
                <th className="px-3 py-2">Insurance</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Joined / Last Active / Risk</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-xs font-bold text-white">
                        {row.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {row.full_name}
                          {row.badge_emoji ? <span className="ml-1">{row.badge_emoji}</span> : null}
                          {row.badge_label ? (
                            <span className="ml-1 text-[10px] font-bold text-amber-600">{row.badge_label}</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.age ? `${row.age}` : ''}
                          {row.gender ? `${row.gender === 'female' ? 'F' : 'M'}` : ''}
                          {row.blood_type ? ` · ${row.blood_type}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-['DM_Mono'] text-xs font-bold text-slate-700">{row.patient_code}</td>
                  <td className="px-3 py-3 font-['DM_Mono'] text-xs text-slate-500">{row.emirates_id_masked}</td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-slate-700">{row.insurance_plan ?? '—'}</div>
                    <div className="text-xs text-slate-500">{row.insurance_member_id_masked ?? ''}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{row.city ?? '—'}</td>
                  <td className="px-3 py-3 text-xs">
                    <div className="text-slate-500">{row.joined_label ?? '—'}</div>
                    <div className="font-semibold text-slate-700">{row.last_active_label ?? '—'}</div>
                    <Pill
                      tone={
                        row.risk_level === 'critical'
                          ? 'rose'
                          : row.risk_level === 'high'
                            ? 'amber'
                            : row.risk_level === 'medium'
                              ? 'blue'
                              : 'emerald'
                      }
                    >
                      {row.risk_level}
                    </Pill>
                  </td>
                  <td className="px-3 py-3">
                    <Pill
                      tone={
                        row.status_label === 'active'
                          ? 'emerald'
                          : row.status_label === 'inactive'
                            ? 'slate'
                            : row.status_label === 'flagged'
                              ? 'amber'
                              : 'rose'
                      }
                    >
                      {row.status_label === 'active'
                        ? '✅ Active'
                        : row.status_label === 'inactive'
                          ? '⏸ Inactive'
                          : row.status_label === 'flagged'
                            ? '🚩 Flagged'
                            : '🔒 Suspended'}
                    </Pill>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-400">⋯</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No patients match the current filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {filtered.length} of {formatNumber(ctx?.total_patients ?? patients.length)} patients
          </span>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">1</button>
            <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700">2</button>
            <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700">…</button>
            <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700">1,930</button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Doctors view
// ---------------------------------------------------------------------------

type DoctorFilter = 'all' | 'pending' | 'expiring' | 'flagged';

const DoctorsView = ({ context }: { context: AdminContext }) => {
  const ctx = context.dashboard?.context;
  const doctors = context.doctors;
  const [filter, setFilter] = useState<DoctorFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let rows = doctors;
    if (filter === 'pending') rows = rows.filter((d) => d.status_label === 'pending');
    else if (filter === 'expiring') rows = rows.filter((d) => d.status_label === 'expiring');
    else if (filter === 'flagged')
      rows = rows.filter((d) => d.status_label === 'flagged' || d.status_label === 'suspended');
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (d) =>
          d.full_name.toLowerCase().includes(q) ||
          (d.specialty ?? '').toLowerCase().includes(q) ||
          (d.clinic_name ?? '').toLowerCase().includes(q) ||
          (d.dha_license ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [doctors, filter, search]);

  const expiring = doctors.filter((d) => d.status_label === 'expiring');
  const expiredOrSuspended = doctors.filter((d) => d.status_label === 'suspended');
  const pending = doctors.filter((d) => d.status_label === 'pending');

  const tabs: { key: DoctorFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All Doctors', count: doctors.length },
    { key: 'pending', label: 'Pending Verification', count: pending.length },
    { key: 'expiring', label: 'License Alerts', count: expiring.length },
    {
      key: 'flagged',
      label: 'Flagged / Suspended',
      count: doctors.filter((d) => d.status_label === 'flagged' || d.status_label === 'suspended').length,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Doctors" subtitle="DHA license verification & platform-wide doctor management">
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Analytics
        </button>
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Export
        </button>
        <button className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          Add Doctor
        </button>
      </PageHeader>

      <Card className="!p-4">
        <div className="grid gap-2 md:grid-cols-3">
          {expiredOrSuspended.length ? (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <span className="font-semibold text-rose-700">
                {expiredOrSuspended.length} license expired — account auto-suspended
              </span>
            </div>
          ) : null}
          {expiring.length ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-700">
                {expiring.length} licenses expiring in &lt;30 days — reminders not sent
              </span>
            </div>
          ) : null}
          {pending.length ? (
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-700">
                {pending.length} applications pending verification · ready to approve
              </span>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiTile
          label="Verified Doctors"
          value={formatNumber(ctx?.verified_doctors ?? 0)}
          trend={`↑ +${ctx?.doctors_added_this_month ?? 0} this month`}
          icon={Stethoscope}
        />
        <KpiTile
          label="Pending Verification"
          value={formatNumber(ctx?.pending_doctors ?? pending.length)}
          caption="Ready to approve"
          icon={ClipboardList}
          iconTone="bg-amber-50 text-amber-600 ring-amber-100"
        />
        <KpiTile
          label="Active Now"
          value={formatNumber(ctx?.doctors_active_now ?? 0)}
          caption="In sessions"
          icon={Activity}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="License Alerts"
          value={formatNumber(ctx?.doctor_license_alerts ?? expiring.length)}
          caption={`${expiring.length} upcoming · ${expiredOrSuspended.length} expired`}
          icon={AlertTriangle}
          iconTone="bg-rose-50 text-rose-600 ring-rose-100"
        />
        <KpiTile
          label="Platform Fees (MTD)"
          value={formatAed(ctx?.doctor_fees_mtd_aed ?? 0)}
          caption="From verified doctors · 8% fee"
          icon={CircleDollarSign}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="Avg Doctor Rating"
          value={`${ctx?.doctor_avg_rating?.toFixed(1) ?? '—'} ★`}
          caption="Verified reviews"
          icon={CheckCircle2}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  filter === tab.key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label} <span className="opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <option>Specialty: All</option>
            </select>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <option>License: All</option>
            </select>
          </div>
        </div>

        <div className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, DHA license, specialty, clinic..."
            className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2">Doctor</th>
                <th className="px-3 py-2">DHA License</th>
                <th className="px-3 py-2">Specialty</th>
                <th className="px-3 py-2">Clinic</th>
                <th className="px-3 py-2">Consults · Rating · Expiry</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
                        {row.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {row.full_name}
                          {row.badge_emoji ? <span className="ml-1">{row.badge_emoji}</span> : null}
                          {row.badge_label ? (
                            <span className="ml-1 text-[10px] font-bold text-amber-600">{row.badge_label}</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.age ? `${row.age}${row.gender === 'female' ? 'F' : row.gender === 'male' ? 'M' : ''}` : ''}
                          {row.nationality ? ` · ${row.nationality}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-['DM_Mono'] text-xs font-bold text-slate-700">{row.dha_license}</div>
                    <Pill tone={row.dha_verified ? 'emerald' : 'amber'}>
                      {row.dha_verified ? '✅ DHA Verified' : '⏳ Pending'}
                    </Pill>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-900">{row.specialty ?? '—'}</div>
                    {row.specialty_sub ? <div className="text-xs text-slate-500">{row.specialty_sub}</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-700">{row.clinic_name ?? '—'}</div>
                    <div className="text-xs text-slate-500">{row.city ?? ''}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div className="font-bold text-slate-700">
                      {formatNumber(row.consults_lifetime)} ·{' '}
                      <span className="text-slate-500">{row.consults_recent_label}</span>
                    </div>
                    <div className="text-slate-700">
                      {row.rating ? `${row.rating.toFixed(1)} (${row.rating_count})` : '—'}
                    </div>
                    <div className="text-slate-500">{row.license_expires_label}</div>
                    {row.reminder_status ? (
                      <div className="text-[11px] text-slate-500">{row.reminder_status}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <Pill
                      tone={
                        row.status_label === 'verified'
                          ? 'emerald'
                          : row.status_label === 'expiring'
                            ? 'amber'
                            : row.status_label === 'flagged'
                              ? 'amber'
                              : row.status_label === 'suspended'
                                ? 'rose'
                                : 'slate'
                      }
                    >
                      {row.status_label === 'verified'
                        ? '✅ Verified'
                        : row.status_label === 'expiring'
                          ? '⚠️ Expiring'
                          : row.status_label === 'flagged'
                            ? '🚩 Flagged'
                            : row.status_label === 'suspended'
                              ? '⛔ Suspended'
                              : '⏳ Pending'}
                    </Pill>
                  </td>
                  <td className="px-3 py-3">
                    {row.status_label === 'pending' ? (
                      <div className="flex gap-1">
                        <button className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">OK</button>
                        <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700">
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">⋯</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No doctors match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Showing {filtered.length} of {doctors.length} doctors
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Organizations view
// ---------------------------------------------------------------------------

type OrgKindFilter = 'all' | 'hospital' | 'clinic' | 'pharmacy' | 'lab' | 'insurance';

const OrganizationsView = ({ context }: { context: AdminContext }) => {
  const orgs = context.organizations;
  const orgsSummary = context.dashboard?.orgsSummary;
  const [filterKind, setFilterKind] = useState<OrgKindFilter>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let rows = orgs;
    if (filterKind !== 'all') rows = rows.filter((o) => o.kind === filterKind);
    if (statusFilter !== 'all') rows = rows.filter((o) => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.city ?? '').toLowerCase().includes(q) ||
          (o.slug ?? '').toLowerCase().includes(q) ||
          (o.notes ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [orgs, filterKind, statusFilter, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organization Management"
        subtitle="Manage all healthcare organizations on the CeenAiX platform"
      />

      <div className="grid gap-5 lg:grid-cols-[260px,1fr]">
        <Card>
          <h3 className="mb-3 font-['Plus_Jakarta_Sans'] text-base font-bold">Filters</h3>
          <div className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <Search className="mr-2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Type</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  { key: 'hospital', label: 'Hospital' },
                  { key: 'clinic', label: 'Clinic' },
                  { key: 'pharmacy', label: 'Pharmacy' },
                  { key: 'lab', label: 'Laboratory' },
                  { key: 'insurance', label: 'Insurance' },
                ] as const
              ).map((kind) => (
                <button
                  key={kind.key}
                  onClick={() => setFilterKind((current) => (current === kind.key ? 'all' : kind.key))}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    filterKind === kind.key
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {kind.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {['active', 'pending', 'suspended', 'archived'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter((current) => (current === status ? 'all' : status))}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    statusFilter === status
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {titleCase(status)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              setFilterKind('all');
              setStatusFilter('all');
              setSearch('');
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear All Filters
          </button>
        </Card>

        <div className="space-y-4">
          <Card className="!p-4">
            <div className="grid gap-2 text-sm sm:grid-cols-3 xl:grid-cols-5">
              <span>
                <span className="font-bold text-slate-900">Hospitals:</span> {orgsSummary?.hospitals ?? 0}
              </span>
              <span>
                <span className="font-bold text-slate-900">Clinics:</span> {orgsSummary?.clinics ?? 0}
              </span>
              <span>
                <span className="font-bold text-slate-900">Pharmacies:</span> {orgsSummary?.pharmacies ?? 0}
              </span>
              <span>
                <span className="font-bold text-slate-900">Labs:</span> {orgsSummary?.labs ?? 0}
              </span>
              <span>
                <span className="font-bold text-slate-900">Total:</span> {orgsSummary?.total ?? orgs.length}
              </span>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((org) => (
              <OrganizationCard key={org.id} org={org} />
            ))}
            {filtered.length === 0 ? (
              <Card className="md:col-span-2 xl:col-span-3">
                <div className="py-12 text-center text-slate-500">No organizations match your filters.</div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const OrganizationCard = ({ org }: { org: Organization }) => {
  const dha = org.notes?.match(/DHA-[A-Z]-\d{4}-\d{3,}/)?.[0] ?? '—';
  const nabidh = org.notes?.toLowerCase().includes('nabidh connected') ? 'connected' : 'disconnected';
  const kindTone =
    org.kind === 'hospital'
      ? 'violet'
      : org.kind === 'pharmacy'
        ? 'emerald'
        : org.kind === 'lab'
          ? 'amber'
          : org.kind === 'insurance'
            ? 'rose'
            : 'blue';
  return (
    <Card>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">{org.name}</h3>
          <div className="font-['DM_Mono'] text-[11px] text-slate-500">{dha}</div>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Pill tone={kindTone}>{titleCase(org.kind)}</Pill>
        <Pill tone="slate">{org.city ?? 'UAE'}</Pill>
        <Pill
          tone={
            org.status === 'active'
              ? 'emerald'
              : org.status === 'pending'
                ? 'amber'
                : org.status === 'suspended'
                  ? 'rose'
                  : 'slate'
          }
        >
          {titleCase(org.status)}
        </Pill>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-slate-50 p-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Active Users</dt>
          <dd className="font-['DM_Mono'] text-base font-bold text-slate-900">{org.seats_used}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Monthly Trans.</dt>
          <dd className="font-['DM_Mono'] text-base font-bold text-slate-900">
            {org.kind === 'hospital'
              ? '12,470'
              : org.kind === 'pharmacy'
                ? '8,920'
                : org.kind === 'lab'
                  ? '11,230'
                  : org.kind === 'clinic'
                    ? '0'
                    : '5,200'}
          </dd>
        </div>
        <div className="col-span-2 rounded-xl bg-slate-50 p-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">NABIDH Status</dt>
          <dd className="font-bold text-emerald-700">
            {nabidh === 'connected' ? '✅ connected' : '❌ disconnected'}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <button className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50">View</button>
        <button className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50">Edit</button>
        <button className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50">Billing</button>
        <button className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50">Audit</button>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Insurance view
// ---------------------------------------------------------------------------

type InsuranceFilter = 'all' | 'premium' | 'standard' | 'api_issues' | 'fraud';

const InsuranceView = ({ context }: { context: AdminContext }) => {
  const partners = context.insurancePartners;
  const [filter, setFilter] = useState<InsuranceFilter>('all');

  const filtered = useMemo(() => {
    if (filter === 'premium') return partners.filter((p) => p.partner_tier === 'premium');
    if (filter === 'standard') return partners.filter((p) => p.partner_tier === 'standard');
    if (filter === 'api_issues') return partners.filter((p) => p.api_status !== 'healthy');
    if (filter === 'fraud') return partners.filter((p) => p.fraud_alert_count > 0);
    return partners;
  }, [partners, filter]);

  const totalMembers = partners.reduce((acc, p) => acc + p.members, 0);
  const totalClaimsToday = partners.reduce((acc, p) => acc + p.claims_today, 0);
  const totalClaimValueToday = partners.reduce((acc, p) => acc + p.claim_value_today_aed, 0);
  const apisHealthy = partners.filter((p) => p.api_status === 'healthy').length;
  const fraudOpen = partners.reduce((acc, p) => acc + p.fraud_alert_count, 0);
  const monthlyRevenue = partners.reduce((acc, p) => {
    const match = p.platform_revenue_label?.match(/AED\s*([\d,]+)/);
    return acc + (match ? parseInt(match[1].replace(/,/g, ''), 10) : 0);
  }, 0);

  const tabs: { key: InsuranceFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'premium', label: 'Premium Partners' },
    { key: 'standard', label: 'Standard Partners' },
    { key: 'api_issues', label: 'API Issues' },
    { key: 'fraud', label: 'Has Fraud Alerts' },
  ];

  const damanWarning = partners.find((p) => p.api_status !== 'healthy');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Insurance Partners"
        subtitle="Manage insurer integrations, claims processing, fraud monitoring, and API health"
      >
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
          {partners.length} Active
        </span>
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Analytics
        </button>
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Export
        </button>
        <button className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          Onboard Insurer
        </button>
      </PageHeader>

      {damanWarning ? (
        <Card className="!p-3">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-200">
            <span className="font-semibold text-amber-800">
              {damanWarning.api_warning_label ||
                `${damanWarning.insurer_name} API degraded — ${damanWarning.api_latency_ms}ms avg response since 1:20 PM`}
            </span>
            <button className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white">Notify</button>
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
          caption="60.2% of all platform patients"
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
            partners.find((p) => p.api_status !== 'healthy')?.insurer_name
              ? `⚠️ ${partners.find((p) => p.api_status !== 'healthy')?.insurer_name} degraded`
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
          {partners.length} insurance partners · {formatNumber(totalMembers)} insured members · Monthly claims:{' '}
          {formatAed(totalClaimValueToday * 30)}
        </div>
      </Card>
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

// ---------------------------------------------------------------------------
// AI Analytics view
// ---------------------------------------------------------------------------

type AiTab = 'performance' | 'conversations' | 'population' | 'safety' | 'models';

const AiView = ({ context }: { context: AdminContext }) => {
  const ctx = context.aiDashboard?.context ?? context.dashboard?.context ?? null;
  const langs = context.aiDashboard?.languages ?? [];
  const topics = context.aiDashboard?.topics ?? [];
  const portals = context.aiDashboard?.portals ?? [];
  const [tab, setTab] = useState<AiTab>('performance');

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
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          today
        </button>
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          week
        </button>
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          month
        </button>
        <button className="rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700">
          Export AI Report
        </button>
      </PageHeader>

      <Card className="bg-gradient-to-br from-purple-50 to-violet-50 ring-purple-200">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-purple-700">CeenAiX Clinical AI</div>
        <div className="mt-1 text-sm text-slate-600">Powered by Claude Sonnet · Anthropic</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Pill tone="purple">{ctx?.platform_version || 'v2.4.1'}</Pill>
          <Pill tone="emerald">Production</Pill>
          <Pill tone="blue">UAE Region</Pill>
          <Pill tone="violet">FHIR R4</Pill>
        </div>
        <div className="mt-3 text-xs text-slate-500">Last updated: {formatDate(ctx?.updated_at)}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Sessions Today"
            value={formatNumber(ctx?.ai_sessions_today ?? 0)}
            icon={Bot}
            iconTone="bg-purple-100 text-purple-700 ring-purple-200"
          />
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
          trend="↑ +23.1% vs yesterday"
          icon={Bot}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
        />
        <KpiTile
          label="This Month"
          value={formatNumber(ctx?.ai_sessions_month ?? 0)}
          caption={`All-time: ${formatNumber(ctx?.ai_sessions_alltime ?? 0)}`}
          trend="↑ +22.7% vs March"
          icon={Activity}
        />
        <KpiTile
          label="Patient Satisfaction"
          value={`${ctx?.ai_satisfaction?.toFixed(1) ?? '—'} ★`}
          caption={`From ${formatNumber(ctx?.ai_satisfaction_count ?? 0)} ratings`}
          trend="↑ +0.2 vs last month"
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
          <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">AI Session Volume — April 2026</h2>
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
          <p className="mt-3 text-xs text-slate-500">
            62% Arabic reflects UAE population. AI fully bilingual AR/EN throughout all portals.
          </p>
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
              caption="All reviewed ✅"
              icon={AlertTriangle}
              iconTone="bg-amber-50 text-amber-600 ring-amber-100"
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
            <li className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">Claude Sonnet (Anthropic)</div>
                <Pill tone="emerald">Active</Pill>
              </div>
              <div className="text-xs text-slate-500">
                Primary model · {ctx?.platform_version || 'v2.4.1'} · UAE region
              </div>
            </li>
            <li className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">Claude Haiku (Fallback)</div>
                <Pill tone="slate">Standby</Pill>
              </div>
              <div className="text-xs text-slate-500">Triggers on Anthropic API timeout &gt; 10s</div>
            </li>
          </ul>
        </Card>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Other views (system, integrations, nabidh, compliance/audit/security, revenue, settings, users)
// ---------------------------------------------------------------------------

const ServicesView = ({
  context,
  mode,
}: {
  context: AdminContext;
  mode: 'system' | 'integrations' | 'nabidh';
}) => {
  const services =
    mode === 'integrations'
      ? context.systemHealth?.integrations ?? []
      : mode === 'nabidh'
        ? (context.systemHealth?.integrations ?? []).filter(
            (service) =>
              service.service_name.toLowerCase().includes('nabidh') ||
              service.message?.toLowerCase().includes('nabidh'),
          )
        : [...(context.systemHealth?.services ?? []), ...(context.systemHealth?.aiServices ?? [])];

  return (
    <div className="space-y-5">
      <PageHeader
        title={mode === 'integrations' ? 'Integrations' : mode === 'nabidh' ? 'NABIDH' : 'System Health'}
        subtitle="Latest service health snapshots"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
        {services.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <div className="py-12 text-center text-slate-500">No service checks returned for this category.</div>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

const ServiceCard = ({ service }: { service: ServiceHealthSnapshot }) => (
  <Card>
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">{service.service_name}</h3>
        <p className="text-xs text-slate-500">
          {service.region ?? 'UAE'} · {titleCase(service.category)}
        </p>
      </div>
      <Pill tone={service.status === 'healthy' ? 'emerald' : service.status === 'degraded' ? 'amber' : 'rose'}>
        {service.status}
      </Pill>
    </div>
    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Latency</div>
      <div className="font-['DM_Mono'] text-2xl font-bold text-slate-900">{service.latency_ms ?? 0}ms</div>
    </div>
    <p className="mt-3 text-sm text-slate-500">{service.message ?? 'No current incidents reported.'}</p>
  </Card>
);

const ComplianceView = ({
  context,
  mode,
}: {
  context: AdminContext;
  mode: 'compliance' | 'audit' | 'security';
}) => {
  if (mode === 'audit') return <AuditTable events={context.compliance?.recentAuditEvents ?? []} />;
  const incidents = context.compliance?.incidents ?? [];
  const checklist = context.dashboard?.complianceChecklist ?? [];
  return (
    <div className="space-y-5">
      <PageHeader
        title={mode === 'security' ? 'Security' : 'DHA Compliance'}
        subtitle={mode === 'security' ? 'Security incidents & access events' : 'DHA / NABIDH compliance register'}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiTile
          label="Open Incidents"
          value={formatNumber(context.compliance?.openIncidentCount)}
          icon={AlertTriangle}
          iconTone="bg-rose-50 text-rose-600 ring-rose-100"
        />
        <KpiTile
          label="Audit Events 30d"
          value={formatNumber(context.compliance?.auditEventCount30d)}
          icon={ClipboardList}
          iconTone="bg-teal-50 text-teal-600 ring-teal-100"
        />
        <KpiTile
          label="DHA Score"
          value={`${context.dashboard?.context?.dha_score?.toFixed(1) ?? '97.4'}%`}
          icon={ShieldCheck}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="High-Severity Flags"
          value={formatNumber(incidents.filter((i) => i.severity === 'critical' || i.severity === 'high').length)}
          icon={LockKeyhole}
          iconTone="bg-amber-50 text-amber-600 ring-amber-100"
        />
      </div>
      {mode === 'compliance' ? (
        <Card>
          <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Compliance Checklist</h2>
          <ul className="space-y-2 text-sm">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <div className="font-semibold text-slate-900">{item.label}</div>
                  {item.detail ? <div className="text-xs text-slate-500">{item.detail}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card>
        <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">
          {mode === 'security' ? 'Security Events' : 'Incidents Register'}
        </h2>
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div key={incident.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{incident.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{incident.summary}</p>
                </div>
                <div className="flex gap-2">
                  <Pill tone={incident.severity === 'critical' || incident.severity === 'high' ? 'rose' : 'amber'}>
                    {incident.severity}
                  </Pill>
                  <Pill tone={incident.status === 'closed' ? 'emerald' : 'amber'}>{incident.status}</Pill>
                </div>
              </div>
            </div>
          ))}
          {incidents.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              No incidents recorded in the current window.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
};

const AuditTable = ({ events }: { events: AdminAuditEventRow[] }) => (
  <div className="space-y-5">
    <PageHeader title="Audit Logs" subtitle="Append-only audit trail across the platform (7yr retention)" />
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Table</th>
              <th className="px-3 py-2">Record</th>
              <th className="px-3 py-2">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-3 py-2 font-semibold text-slate-900">{event.actor_name ?? 'System'}</td>
                <td className="px-3 py-2 text-slate-700">{titleCase(event.action)}</td>
                <td className="px-3 py-2 text-slate-500">{event.table_name}</td>
                <td className="px-3 py-2 font-['DM_Mono'] text-xs text-slate-500">{event.record_id ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500">{formatDate(event.created_at)}</td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-slate-500">
                  No audit events found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

const RevenueView = ({ context }: { context: AdminContext }) => {
  const ctx = context.dashboard?.context;
  const series = context.dashboard?.revenueDaily ?? [];
  return (
    <div className="space-y-5">
      <PageHeader title="Platform Revenue" subtitle="April 2026 · platform-wide revenue performance" />
      <div className="grid gap-4 md:grid-cols-3">
        <KpiTile
          label="Today"
          value={formatAed(ctx?.revenue_today_aed ?? 0)}
          caption={`Target ${formatAed(ctx?.revenue_target_aed ?? 0)}`}
          icon={CircleDollarSign}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="AI Revenue"
          value={formatAed(ctx?.ai_revenue_today_aed ?? 0)}
          caption={`Net margin ${formatAed(ctx?.ai_revenue_net_aed ?? 0)}`}
          icon={Bot}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
        />
        <KpiTile
          label="Margin %"
          value={`${ctx?.ai_revenue_margin_pct?.toFixed(1) ?? '0.0'}%`}
          caption="AI services margin"
          icon={Activity}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
      </div>
      <Card>
        <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Daily Revenue Trend</h2>
        <RevenueBars revenueDaily={series} />
      </Card>
    </div>
  );
};

const SettingsView = ({ context }: { context: AdminContext }) => (
  <div className="space-y-5">
    <PageHeader title="Platform Settings" subtitle="Feature flags, environment configuration, and runtime settings" />
    <div className="grid gap-4 md:grid-cols-2">
      {(context.diagnostics?.featureFlags ?? []).map((flag) => (
        <Card key={flag.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{flag.environment}</div>
              <h3 className="mt-1 font-semibold text-slate-900">{flag.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{flag.description ?? flag.key}</p>
            </div>
            <Pill tone={flag.is_enabled ? 'emerald' : 'slate'}>{flag.is_enabled ? 'On' : 'Off'}</Pill>
          </div>
          <div className="mt-3 text-xs text-slate-500">Rollout: {flag.rollout_percent}%</div>
        </Card>
      ))}
      {context.diagnostics?.featureFlags.length === 0 ? (
        <Card className="md:col-span-2">
          <div className="py-12 text-center text-slate-500">No feature flags defined yet.</div>
        </Card>
      ) : null}
    </div>
  </div>
);

const DiagnosticsView = ({ context }: { context: AdminContext }) => {
  const services = [
    ...(context.systemHealth?.services ?? []),
    ...(context.systemHealth?.integrations ?? []),
    ...(context.systemHealth?.aiServices ?? []),
  ];
  return (
    <div className="space-y-5">
      <PageHeader title="Diagnostics" subtitle="Runtime diagnostics, feature flags, service checks" />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiTile label="Feature Flags" value={formatNumber(context.diagnostics?.featureFlags.length)} icon={Settings} />
        <KpiTile
          label="Platform Settings"
          value={formatNumber(context.diagnostics?.platformSettings.length)}
          icon={Terminal}
        />
        <KpiTile label="Service Checks" value={formatNumber(services.length)} icon={Activity} />
        <KpiTile
          label="Degraded"
          value={formatNumber(degradedServiceCount(context.systemHealth))}
          icon={AlertTriangle}
          iconTone="bg-amber-50 text-amber-600 ring-amber-100"
        />
      </div>
      <Card>
        <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Service health</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </Card>
    </div>
  );
};

const UsersView = ({ context, role }: { context: AdminContext; role?: UserRole }) => {
  const [search, setSearch] = useState('');
  const rows = context.users.filter((user) => {
    const matchesRole = role ? user.role === role : true;
    const haystack = `${user.full_name} ${user.email ?? ''} ${user.phone ?? ''}`.toLowerCase();
    return matchesRole && haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <PageHeader title="All Platform Users" subtitle={`${formatNumber(rows.length)} users match the current view`} />
      <Card>
        <div className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, phone"
            className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2">Last Login</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.user_id}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{row.full_name || '—'}</td>
                  <td className="px-3 py-2">
                    <Pill tone="blue">{row.role}</Pill>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.email ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{row.city ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(row.created_at)}</td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(row.last_sign_in_at)}</td>
                  <td className="px-3 py-2">
                    <Pill tone={row.profile_completed ? 'emerald' : 'amber'}>
                      {row.profile_completed ? 'Active' : 'Onboarding'}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Body & route exports
// ---------------------------------------------------------------------------

const AdminBody = ({ page, context }: { page: AdminPage; context: AdminContext }) => {
  if (context.loading && !context.metrics && !context.dashboard) {
    return (
      <Card>
        <div className="py-12 text-center text-slate-500">Loading admin workspace…</div>
      </Card>
    );
  }
  if (page === 'dashboard') return <DashboardView context={context} />;
  if (page === 'patients') return <PatientsView context={context} />;
  if (page === 'doctors') return <DoctorsView context={context} />;
  if (page === 'organizations') return <OrganizationsView context={context} />;
  if (page === 'insurance') return <InsuranceView context={context} />;
  if (page === 'ai') return <AiView context={context} />;
  if (page === 'integrations') return <ServicesView context={context} mode="integrations" />;
  if (page === 'system') return <ServicesView context={context} mode="system" />;
  if (page === 'nabidh') return <ServicesView context={context} mode="nabidh" />;
  if (page === 'compliance' || page === 'audit' || page === 'security')
    return <ComplianceView context={context} mode={page} />;
  if (page === 'revenue') return <RevenueView context={context} />;
  if (page === 'diagnostics') return <DiagnosticsView context={context} />;
  if (page === 'users') return <UsersView context={context} />;
  return <SettingsView context={context} />;
};

const AdminRoute = ({ page }: { page: AdminPage }) => {
  const context = useAdminContextValue();
  useEffect(() => {
    document.title = `${titleForPage(page)} · CeenAiX Admin`;
  }, [page]);
  return (
    <AdminShell page={page} context={context}>
      <AdminBody page={page} context={context} />
    </AdminShell>
  );
};

export const AdminDashboard = () => <AdminRoute page="dashboard" />;
export const AdminPatients = () => <AdminRoute page="patients" />;
export const AdminDoctors = () => <AdminRoute page="doctors" />;
export const AdminOrganizations = () => <AdminRoute page="organizations" />;
export const AdminInsurance = () => <AdminRoute page="insurance" />;
export const AdminAiAnalytics = () => <AdminRoute page="ai" />;
export const AdminIntegrations = () => <AdminRoute page="integrations" />;
export const AdminRevenue = () => <AdminRoute page="revenue" />;
export const AdminNabidh = () => <AdminRoute page="nabidh" />;
export const AdminCompliance = () => <AdminRoute page="compliance" />;
export const AdminAudit = () => <AdminRoute page="audit" />;
export const AdminSecurity = () => <AdminRoute page="security" />;
export const AdminSystemHealth = () => <AdminRoute page="system" />;
export const AdminPlatformSettings = () => <AdminRoute page="settings" />;
export const AdminUsers = () => <AdminRoute page="users" />;
export const AdminDiagnostics = () => <AdminRoute page="diagnostics" />;
