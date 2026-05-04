import { useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Link2,
  LockKeyhole,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Terminal,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  useAdminAiAnalytics,
  useAdminCompliance,
  useAdminDiagnostics,
  useAdminMetrics,
  useAdminOrganizations,
  useAdminSystemHealth,
  useAdminUsers,
} from '../../hooks';
import type { AdminComplianceData, AdminDiagnosticsData } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import type {
  AdminAiAnalyticsPayload,
  AdminAuditEventRow,
  AdminMetricsPayload,
  AdminSystemHealthPayload,
  AdminUserRow,
  Organization,
  ServiceHealthSnapshot,
  UserRole,
} from '../../types';

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
  loading: boolean;
  error: string | null;
}

interface AdminNavItem {
  page: AdminPage;
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  badgeTone?: 'teal' | 'amber' | 'red' | 'blue';
}

interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

const pageTitles: Record<AdminPage, string> = {
  dashboard: 'Dashboard',
  patients: 'Patient Management',
  doctors: 'Doctor Management',
  organizations: 'Organization Management',
  insurance: 'Insurance Network',
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
  users: 'User Management',
};

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '0';

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());

const buildAdminSections = (context: AdminContext): AdminNavSection[] => [
  {
    label: 'OVERVIEW',
    items: [
      {
        page: 'dashboard',
        href: '/admin/dashboard',
        label: 'Dashboard',
        icon: BarChart3,
        badge: context.metrics?.totals.activeIncidents || undefined,
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
        badge: context.metrics?.usersByRole.patient,
        badgeTone: 'teal',
      },
      {
        page: 'doctors',
        href: '/admin/doctors',
        label: 'Doctors',
        icon: Stethoscope,
        badge: context.metrics?.totals.pendingApprovals,
        badgeTone: 'amber',
      },
      {
        page: 'organizations',
        href: '/admin/organizations',
        label: 'Organizations',
        icon: Building2,
        badge: context.organizations.length,
        badgeTone: 'blue',
      },
      { page: 'insurance', href: '/admin/insurance', label: 'Insurance', icon: ShieldCheck },
      { page: 'users', href: '/admin/users', label: 'All Users', icon: Users, badge: context.metrics?.totals.users, badgeTone: 'teal' },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      { page: 'ai', href: '/admin/ai-analytics', label: 'AI Analytics', icon: Bot, badge: context.metrics?.ai.sessions30d, badgeTone: 'teal' },
      { page: 'integrations', href: '/admin/integrations', label: 'Integrations', icon: Link2, badge: degradedServiceCount(context.systemHealth) ? '⚠' : undefined, badgeTone: 'amber' },
      { page: 'revenue', href: '/admin/revenue', label: 'Revenue', icon: CircleDollarSign },
      { page: 'nabidh', href: '/admin/nabidh', label: 'NABIDH', icon: Activity },
    ],
  },
  {
    label: 'COMPLIANCE & SECURITY',
    items: [
      { page: 'compliance', href: '/admin/compliance', label: 'DHA Compliance', icon: ShieldCheck, badge: context.compliance?.openIncidentCount, badgeTone: 'red' },
      { page: 'audit', href: '/admin/audit', label: 'Audit Logs', icon: ClipboardList, badge: context.compliance?.auditEventCount30d, badgeTone: 'teal' },
      { page: 'security', href: '/admin/security', label: 'Security', icon: LockKeyhole, badge: context.compliance?.openIncidentCount, badgeTone: 'amber' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { page: 'system', href: '/admin/system-health', label: 'System Health', icon: Terminal },
      { page: 'diagnostics', href: '/admin/diagnostics', label: 'Diagnostics', icon: Activity, badge: context.diagnostics?.featureFlags.length, badgeTone: 'blue' },
      { page: 'settings', href: '/admin/platform-settings', label: 'Platform Settings', icon: Settings },
    ],
  },
];

const badgeClass = (tone: AdminNavItem['badgeTone']) => {
  if (tone === 'red') return 'bg-red-500/20 text-red-200';
  if (tone === 'amber') return 'bg-amber-500/20 text-amber-200';
  if (tone === 'blue') return 'bg-blue-500/20 text-blue-200';
  return 'bg-teal-500/20 text-teal-200';
};

const degradedServiceCount = (systemHealth: AdminSystemHealthPayload | null) => {
  const services = [
    ...(systemHealth?.services ?? []),
    ...(systemHealth?.integrations ?? []),
    ...(systemHealth?.aiServices ?? []),
  ];
  return services.filter((service) => service.status !== 'healthy').length;
};

const useAdminContext = (): AdminContext => {
  const [roleFilter] = useState<UserRole | ''>('');
  const metrics = useAdminMetrics();
  const users = useAdminUsers({ role: roleFilter || null, limit: 120 });
  const organizations = useAdminOrganizations();
  const compliance = useAdminCompliance();
  const systemHealth = useAdminSystemHealth();
  const aiAnalytics = useAdminAiAnalytics();
  const diagnostics = useAdminDiagnostics();

  const error = [
    metrics.error,
    users.error,
    organizations.error,
    compliance.error,
    systemHealth.error,
    aiAnalytics.error,
    diagnostics.error,
  ].find(Boolean) ?? null;

  return {
    metrics: metrics.data ?? null,
    users: users.data ?? [],
    organizations: organizations.data ?? [],
    compliance: compliance.data ?? null,
    systemHealth: systemHealth.data ?? null,
    aiAnalytics: aiAnalytics.data ?? null,
    diagnostics: diagnostics.data ?? null,
    loading:
      metrics.loading ||
      users.loading ||
      organizations.loading ||
      compliance.loading ||
      systemHealth.loading ||
      aiAnalytics.loading ||
      diagnostics.loading,
    error,
  };
};

const AdminShell = ({ page, context, children }: { page: AdminPage; context: AdminContext; children: ReactNode }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const sections = useMemo(() => buildAdminSections(context), [context]);
  const displayName = profile?.full_name || 'Dr. Parnia Yazdkhasti';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) navigate('/auth/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-['Inter'] text-white">
      <aside className={`flex shrink-0 flex-col bg-slate-950 transition-all duration-300 ${collapsed ? 'w-[76px]' : 'w-[320px]'}`}>
        <div className="flex h-20 items-center border-b border-slate-800 px-5">
          {!collapsed ? (
            <div>
              <div className="font-['Plus_Jakarta_Sans'] text-2xl font-bold">CeenAiX</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.24em] text-teal-400">Super Admin Portal</div>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 font-bold">C</div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Collapse admin sidebar"
          >
            <ChevronLeft className={`h-4 w-4 transition ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {!collapsed ? (
          <div className="mx-4 my-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-xs font-semibold text-teal-300">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-400" /> PRODUCTION
              </span>
              <span>v2.4.1</span>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 font-bold">{initials}</div>
                <div className="min-w-0">
                  <div className="truncate font-['Plus_Jakarta_Sans'] font-bold">{displayName}</div>
                  <div className="text-sm text-teal-300">CEO & Co-Founder · AryAiX LLC</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="rounded-full bg-teal-500/15 px-2 py-1 font-bold text-teal-300">Super Admin · Full Access</span>
                <span className="inline-flex items-center gap-1 text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Active</span>
              </div>
            </div>
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto py-2">
          {sections.map((section) => (
            <div key={section.label} className="mb-5">
              {!collapsed ? (
                <div className="px-5 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{section.label}</div>
              ) : null}
              <div className="space-y-1 px-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const current = location.pathname === item.href || page === item.page;
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={({ isActive }) =>
                        `flex h-11 items-center rounded-xl px-3 text-sm transition ${
                          collapsed ? 'justify-center' : 'gap-3'
                        } ${isActive || current ? 'bg-teal-500/15 text-white ring-1 ring-teal-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed ? <span className="flex-1 truncate font-semibold">{item.label}</span> : null}
                      {!collapsed && item.badge !== undefined && item.badge !== 0 ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClass(item.badgeTone)}`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          {!collapsed ? (
            <div className="mb-3 text-xs text-slate-500">
              <div className="text-emerald-300">● All Systems Operational</div>
              <div className="mt-2">CeenAiX v2.4.1 · Production</div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className={`flex w-full items-center rounded-xl px-3 py-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-200 ${
              collapsed ? 'justify-center' : 'gap-3'
            }`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed ? <span>Sign Out</span> : null}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center gap-4 border-b border-slate-800 bg-slate-900 px-6">
          <div className="min-w-0">
            <div className="text-xs text-slate-500">Admin Portal</div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold">{pageTitles[page]}</h1>
            <p className="text-sm text-slate-400">Wednesday, April 2026 · Production Control</p>
          </div>
          <div className="ml-auto hidden max-w-sm flex-1 items-center rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-500 xl:flex">
            <Search className="mr-2 h-4 w-4" />
            Search users, doctors, organizations, audit logs...
          </div>
          <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 px-3 py-2 text-sm font-bold text-teal-300">
            {formatNumber(context.metrics?.totals.users)} active sessions
          </div>
          <button className="relative rounded-2xl border border-slate-700 p-2 text-slate-300 hover:bg-slate-800">
            <Bell className="h-5 w-5" />
            {context.metrics?.totals.activeIncidents ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                {context.metrics.totals.activeIncidents}
              </span>
            ) : null}
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 font-bold">{initials}</div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {context.error ? (
            <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              Failed to load admin data: {context.error}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
};

const AdminKpi = ({
  label,
  value,
  icon: Icon,
  tone,
  caption,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: string;
  caption?: string;
}) => (
  <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-slate-700">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-2 font-['DM_Mono'] text-3xl font-bold text-white">{value}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {caption ? <p className="mt-3 text-sm text-slate-400">{caption}</p> : null}
  </article>
);

const AdminCard = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}>{children}</section>
);

const StatusBadge = ({ children, tone = 'slate' }: { children: ReactNode; tone?: 'teal' | 'amber' | 'rose' | 'blue' | 'slate' }) => {
  const classes = {
    teal: 'bg-teal-500/15 text-teal-300',
    amber: 'bg-amber-500/15 text-amber-300',
    rose: 'bg-rose-500/15 text-rose-300',
    blue: 'bg-blue-500/15 text-blue-300',
    slate: 'bg-slate-800 text-slate-300',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes[tone]}`}>{children}</span>;
};

const DashboardView = ({ context }: { context: AdminContext }) => {
  const totals = context.metrics?.totals;
  const services = [...(context.systemHealth?.services ?? []), ...(context.systemHealth?.integrations ?? [])].slice(0, 6);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminKpi label="Registered Patients" value={formatNumber(context.metrics?.usersByRole.patient)} icon={Users} tone="bg-teal-500/15 text-teal-300" caption="+12 this month" />
        <AdminKpi label="Verified Doctors" value={formatNumber(context.metrics?.usersByRole.doctor)} icon={Stethoscope} tone="bg-blue-500/15 text-blue-300" caption={`${formatNumber(totals?.pendingApprovals)} pending DHA`} />
        <AdminKpi label="Connected Orgs" value={formatNumber(context.organizations.length)} icon={Building2} tone="bg-violet-500/15 text-violet-300" caption="Hospitals, clinics, labs" />
        <AdminKpi label="AI Sessions" value={formatNumber(context.metrics?.ai.sessions30d)} icon={Bot} tone="bg-purple-500/15 text-purple-300" caption="Last 30 days" />
        <AdminKpi label="Revenue" value={`AED ${formatNumber((totals?.completedConsultsThisMonth ?? 0) * 275)}`} icon={CircleDollarSign} tone="bg-emerald-500/15 text-emerald-300" caption="Month-to-date estimate" />
        <AdminKpi label="Uptime" value={`${services.filter((item) => item.status === 'healthy').length}/${Math.max(services.length, 1)}`} icon={Activity} tone="bg-green-500/15 text-green-300" caption="Live service checks" />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <AdminCard className="xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">UAE Network Map</h2>
            <div className="flex gap-2">
              <button className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white">map</button>
              <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300">satellite</button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {context.organizations.slice(0, 6).map((org) => (
              <div key={org.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{org.name}</h3>
                    <p className="text-sm text-slate-500">{org.city ?? 'UAE'} · {titleCase(org.kind)}</p>
                  </div>
                  <StatusBadge tone={org.status === 'active' ? 'teal' : org.status === 'pending' ? 'amber' : 'rose'}>{org.status}</StatusBadge>
                </div>
                <div className="mt-3 text-sm text-slate-400">{org.seats_used}/{org.seats_allocated} seats · {org.primary_contact_name ?? 'No contact'}</div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard className="xl:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">Live Activity</h2>
            <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300">Pause</button>
          </div>
          <div className="space-y-3">
            {(context.compliance?.recentAuditEvents ?? []).slice(0, 8).map((event) => (
              <div key={event.id} className="rounded-xl bg-slate-950 p-3 text-sm">
                <div className="font-semibold text-slate-200">{titleCase(event.action)}</div>
                <div className="text-slate-500">{event.actor_name ?? 'System'} · {event.table_name} · {formatDate(event.created_at)}</div>
              </div>
            ))}
            {(context.compliance?.recentAuditEvents ?? []).length === 0 ? (
              <div className="rounded-xl bg-slate-950 p-6 text-center text-sm text-slate-500">No audit activity returned yet.</div>
            ) : null}
          </div>
        </AdminCard>
      </div>

      <QuickActions context={context} />
    </div>
  );
};

const QuickActions = ({ context }: { context: AdminContext }) => {
  const actions = [
    { label: 'Verify Doctor', value: `${formatNumber(context.metrics?.totals.pendingApprovals)} pending`, icon: Stethoscope },
    { label: 'Approve Org', value: `${formatNumber(context.organizations.filter((org) => org.status === 'pending').length)} requests`, icon: Building2 },
    { label: 'Platform Revenue', value: `AED ${formatNumber((context.metrics?.totals.completedConsultsThisMonth ?? 0) * 275)}`, icon: CircleDollarSign },
    { label: 'AI Dashboard', value: `${formatNumber(context.aiAnalytics?.sessions.last30Days)} sessions`, icon: Bot },
    { label: 'DHA Compliance', value: `${formatNumber(context.compliance?.auditEventCount30d)} events`, icon: ShieldCheck },
    { label: 'Fraud Review', value: `${formatNumber(context.metrics?.ai.flaggedOutputs30d)} flagged`, icon: AlertTriangle },
    { label: 'Generate Report', value: 'April 2026', icon: FileText },
    { label: 'System Logs', value: `${formatNumber(degradedServiceCount(context.systemHealth))} degraded`, icon: Terminal },
  ];
  return (
    <AdminCard>
      <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Quick Actions</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition hover:border-teal-500/40 hover:bg-slate-900">
              <Icon className="h-5 w-5 text-teal-300" />
              <div className="mt-3 font-semibold text-white">{action.label}</div>
              <div className="text-sm text-slate-500">{action.value}</div>
            </button>
          );
        })}
      </div>
    </AdminCard>
  );
};

const UsersView = ({ context, role }: { context: AdminContext; role?: UserRole }) => {
  const [search, setSearch] = useState('');
  const rows = context.users.filter((user) => {
    const roleMatches = role ? user.role === role : true;
    const haystack = `${user.full_name} ${user.email ?? ''} ${user.phone ?? ''}`.toLowerCase();
    return roleMatches && haystack.includes(search.toLowerCase());
  });
  return (
    <div className="space-y-5">
      <AdminCard>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold">{role ? `${titleCase(role)} Directory` : 'All Platform Users'}</h2>
            <p className="text-sm text-slate-500">{formatNumber(rows.length)} users match the current view</p>
          </div>
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-500">
            <Search className="mr-2 h-4 w-4" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, phone"
              className="bg-transparent text-slate-200 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>
      </AdminCard>
      <AdminCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-3">User</th>
                <th>Role</th>
                <th>Email</th>
                <th>City</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.user_id}>
                  <td className="py-3 font-semibold text-white">{row.full_name || '—'}</td>
                  <td><StatusBadge tone="blue">{row.role}</StatusBadge></td>
                  <td className="text-slate-400">{row.email ?? '—'}</td>
                  <td className="text-slate-400">{row.city ?? '—'}</td>
                  <td><StatusBadge tone={row.profile_completed ? 'teal' : 'amber'}>{row.profile_completed ? 'Active' : 'Onboarding'}</StatusBadge></td>
                  <td className="text-slate-400">{formatDate(row.created_at)}</td>
                  <td className="text-slate-400">{formatDate(row.last_sign_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
};

const OrganizationsView = ({ context, kind }: { context: AdminContext; kind?: Organization['kind'] }) => {
  const orgs = kind ? context.organizations.filter((org) => org.kind === kind) : context.organizations;
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {orgs.map((org) => (
        <AdminCard key={org.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-300">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">{org.name}</h3>
                <p className="text-sm text-slate-500">{org.city ?? 'UAE'} · {titleCase(org.kind)}</p>
              </div>
            </div>
            <StatusBadge tone={org.status === 'active' ? 'teal' : org.status === 'pending' ? 'amber' : 'rose'}>{org.status}</StatusBadge>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-950 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Contact</dt>
              <dd className="mt-1 text-slate-200">{org.primary_contact_name ?? '—'}</dd>
            </div>
            <div className="rounded-xl bg-slate-950 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Seats</dt>
              <dd className="mt-1 font-['DM_Mono'] text-slate-200">{org.seats_used}/{org.seats_allocated}</dd>
            </div>
            <div className="col-span-2 rounded-xl bg-slate-950 p-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Contract</dt>
              <dd className="mt-1 text-slate-200">{formatDate(org.contract_started_at)} → {formatDate(org.contract_ends_at)}</dd>
            </div>
          </dl>
        </AdminCard>
      ))}
    </div>
  );
};

const ServicesView = ({ context, mode }: { context: AdminContext; mode: 'system' | 'integrations' | 'nabidh' }) => {
  const services =
    mode === 'integrations'
      ? context.systemHealth?.integrations ?? []
      : mode === 'nabidh'
        ? (context.systemHealth?.integrations ?? []).filter((service) => service.service_name.toLowerCase().includes('nabidh') || service.message?.toLowerCase().includes('nabidh'))
        : [...(context.systemHealth?.services ?? []), ...(context.systemHealth?.aiServices ?? [])];

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
      {services.length === 0 ? (
        <AdminCard className="md:col-span-2 xl:col-span-3">
          <div className="py-10 text-center text-slate-500">No service checks returned for this category.</div>
        </AdminCard>
      ) : null}
    </div>
  );
};

const ServiceCard = ({ service }: { service: ServiceHealthSnapshot }) => (
  <AdminCard>
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">{service.service_name}</h3>
        <p className="text-sm text-slate-500">{service.region ?? 'UAE'} · {titleCase(service.category)}</p>
      </div>
      <StatusBadge tone={service.status === 'healthy' ? 'teal' : service.status === 'degraded' ? 'amber' : 'rose'}>{service.status}</StatusBadge>
    </div>
    <div className="mt-5 rounded-xl bg-slate-950 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">Latency</div>
      <div className="mt-1 font-['DM_Mono'] text-2xl font-bold">{service.latency_ms ?? 0}ms</div>
    </div>
    <p className="mt-4 text-sm text-slate-400">{service.message ?? 'No current incidents reported.'}</p>
  </AdminCard>
);

const ComplianceView = ({ context, mode }: { context: AdminContext; mode: 'compliance' | 'audit' | 'security' }) => {
  if (mode === 'audit') return <AuditTable events={context.compliance?.recentAuditEvents ?? []} />;
  const incidents = context.compliance?.incidents ?? [];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <AdminKpi label="Open Incidents" value={formatNumber(context.compliance?.openIncidentCount)} icon={AlertTriangle} tone="bg-rose-500/15 text-rose-300" />
        <AdminKpi label="Audit Events" value={formatNumber(context.compliance?.auditEventCount30d)} icon={ClipboardList} tone="bg-teal-500/15 text-teal-300" />
        <AdminKpi label="DHA Score" value="97.4%" icon={ShieldCheck} tone="bg-blue-500/15 text-blue-300" />
        <AdminKpi label="Security Flags" value={formatNumber(incidents.filter((incident) => incident.severity === 'critical' || incident.severity === 'high').length)} icon={LockKeyhole} tone="bg-amber-500/15 text-amber-300" />
      </div>
      <AdminCard>
        <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">{mode === 'security' ? 'Security Events' : 'DHA Compliance Register'}</h2>
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div key={incident.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold text-white">{incident.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{incident.summary}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge tone={incident.severity === 'critical' || incident.severity === 'high' ? 'rose' : 'amber'}>{incident.severity}</StatusBadge>
                  <StatusBadge tone={incident.status === 'closed' ? 'teal' : 'amber'}>{incident.status}</StatusBadge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
};

const AuditTable = ({ events }: { events: AdminAuditEventRow[] }) => (
  <AdminCard>
    <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Audit Logs</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-3">Actor</th>
            <th>Action</th>
            <th>Table</th>
            <th>Record</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {events.map((event) => (
            <tr key={event.id}>
              <td className="py-3 font-semibold text-white">{event.actor_name ?? 'System'}</td>
              <td className="text-slate-300">{titleCase(event.action)}</td>
              <td className="text-slate-400">{event.table_name}</td>
              <td className="font-['DM_Mono'] text-xs text-slate-500">{event.record_id ?? '—'}</td>
              <td className="text-slate-400">{formatDate(event.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </AdminCard>
);

const AiView = ({ context }: { context: AdminContext }) => (
  <div className="space-y-5">
    <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-950 to-slate-900 p-6">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">CeenAiX Clinical AI</div>
      <h2 className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-bold">AI Analytics & Safety Monitor</h2>
      <p className="mt-2 text-slate-300">Usage, safety signals, model operations, and portal-specific performance from live AI tables.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-4">
      <AdminKpi label="7 Day Sessions" value={formatNumber(context.aiAnalytics?.sessions.last7Days)} icon={Bot} tone="bg-purple-500/15 text-purple-300" />
      <AdminKpi label="30 Day Sessions" value={formatNumber(context.aiAnalytics?.sessions.last30Days)} icon={Activity} tone="bg-teal-500/15 text-teal-300" />
      <AdminKpi label="Messages" value={formatNumber(context.aiAnalytics?.messages.last30Days)} icon={FileText} tone="bg-blue-500/15 text-blue-300" />
      <AdminKpi label="Flagged" value={formatNumber(context.aiAnalytics?.safety.flaggedLast30Days)} icon={AlertTriangle} tone="bg-rose-500/15 text-rose-300" />
    </div>
  </div>
);

const RevenueView = ({ context }: { context: AdminContext }) => {
  const completed = context.metrics?.totals.completedConsultsThisMonth ?? 0;
  const revenue = completed * 275;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <AdminKpi label="Month Revenue" value={`AED ${formatNumber(revenue)}`} icon={CircleDollarSign} tone="bg-emerald-500/15 text-emerald-300" />
        <AdminKpi label="Completed Consults" value={formatNumber(completed)} icon={CheckCircle2} tone="bg-teal-500/15 text-teal-300" />
        <AdminKpi label="Avg Value" value="AED 275" icon={BarChart3} tone="bg-blue-500/15 text-blue-300" />
      </div>
      <AdminCard>
        <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Revenue Trend</h2>
        <div className="grid h-64 items-end gap-3 md:grid-cols-7">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <div key={day} className="flex flex-col items-center gap-2">
              <div className={`w-full rounded-t-xl bg-emerald-500 ${index > 4 ? 'h-24' : index > 2 ? 'h-40' : 'h-32'}`} />
              <span className="text-xs text-slate-500">{day}</span>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
};

const SettingsView = ({ context }: { context: AdminContext }) => (
  <div className="grid gap-5 md:grid-cols-2">
    {(context.diagnostics?.featureFlags ?? []).map((flag) => (
      <AdminCard key={flag.id}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{flag.environment}</div>
            <h3 className="mt-1 font-semibold">{flag.name}</h3>
            <p className="mt-1 text-sm text-slate-400">{flag.description ?? flag.key}</p>
          </div>
          <StatusBadge tone={flag.is_enabled ? 'teal' : 'slate'}>{flag.is_enabled ? 'On' : 'Off'}</StatusBadge>
        </div>
        <div className="mt-4 text-sm text-slate-500">Rollout: {flag.rollout_percent}%</div>
      </AdminCard>
    ))}
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
      <div className="grid gap-4 md:grid-cols-4">
        <AdminKpi label="Feature Flags" value={formatNumber(context.diagnostics?.featureFlags.length)} icon={Settings} tone="bg-blue-500/15 text-blue-300" />
        <AdminKpi label="Platform Settings" value={formatNumber(context.diagnostics?.platformSettings.length)} icon={Terminal} tone="bg-teal-500/15 text-teal-300" />
        <AdminKpi label="Service Checks" value={formatNumber(services.length)} icon={Activity} tone="bg-emerald-500/15 text-emerald-300" />
        <AdminKpi label="Degraded" value={formatNumber(degradedServiceCount(context.systemHealth))} icon={AlertTriangle} tone="bg-amber-500/15 text-amber-300" />
      </div>
      <AdminCard>
        <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Runtime Diagnostics</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((service) => (
            <div key={service.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{service.service_name}</h3>
                  <p className="text-sm text-slate-500">{service.service_key} · {service.region ?? 'Global'}</p>
                </div>
                <StatusBadge tone={service.status === 'healthy' ? 'teal' : service.status === 'degraded' ? 'amber' : 'rose'}>{service.status}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
};

const AdminBody = ({ page, context }: { page: AdminPage; context: AdminContext }) => {
  if (context.loading && !context.metrics) {
    return <AdminCard><div className="py-10 text-center text-slate-500">Loading Platform Admin workspace...</div></AdminCard>;
  }
  if (page === 'dashboard') return <DashboardView context={context} />;
  if (page === 'patients') return <UsersView context={context} role="patient" />;
  if (page === 'doctors') return <UsersView context={context} role="doctor" />;
  if (page === 'users') return <UsersView context={context} />;
  if (page === 'organizations') return <OrganizationsView context={context} />;
  if (page === 'insurance') return <OrganizationsView context={context} kind="insurance" />;
  if (page === 'ai') return <AiView context={context} />;
  if (page === 'integrations') return <ServicesView context={context} mode="integrations" />;
  if (page === 'system') return <ServicesView context={context} mode="system" />;
  if (page === 'nabidh') return <ServicesView context={context} mode="nabidh" />;
  if (page === 'compliance' || page === 'audit' || page === 'security') return <ComplianceView context={context} mode={page} />;
  if (page === 'revenue') return <RevenueView context={context} />;
  if (page === 'diagnostics') return <DiagnosticsView context={context} />;
  return <SettingsView context={context} />;
};

const AdminRoute = ({ page }: { page: AdminPage }) => {
  const context = useAdminContext();
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
