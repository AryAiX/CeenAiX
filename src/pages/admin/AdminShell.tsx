import { useMemo, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, BarChart3, Bell, Brain, Building2,
  ChevronRight, CircleDollarSign, ClipboardList, LockKeyhole,
  LogOut, Plug, Search, Settings, Shield, ShieldCheck, Stethoscope,
  Terminal, UserCog, Users, Wrench, type LucideIcon,
} from 'lucide-react';
import {
  useAdminAiAnalytics, useAdminAiDashboard, useAdminCompliance,
  useAdminDashboard, useAdminDiagnostics, useAdminDoctorDirectory,
  useAdminInsurancePartners, useAdminMetrics, useAdminOrganizations,
  useAdminPatientDirectory, useAdminSystemHealth, useAdminUsers,
} from '../../hooks';
import type { AdminComplianceData, AdminDiagnosticsData } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import type {
  AdminAiAnalyticsPayload, AdminAiDashboardPayload,
  AdminDashboardPayload, AdminDoctorRow, AdminInsurancePartnerRow,
  AdminMetricsPayload, AdminPatientRow, AdminSystemHealthPayload,
  AdminUserRow, Organization,
} from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminPage =
  | 'dashboard' | 'patients' | 'doctors' | 'organizations' | 'insurance' | 'clinics'
  | 'ai' | 'integrations' | 'revenue' | 'nabidh' | 'compliance' | 'audit'
  | 'security' | 'system' | 'diagnostics' | 'settings' | 'users';

export interface AdminContext {
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
  refreshOrganizations: () => void;
  refetchDashboard: () => void;
  refetchDoctors: () => void;
  refetchSystemHealth: () => void;
  refetchDiagnostics: () => void;
  refetchAll: () => void;
}

export interface AdminNavItem {
  page: AdminPage; href: string; label: string; icon: LucideIcon;
  badge?: string | number | null; badgeTone?: 'teal' | 'amber' | 'red' | 'blue';
}

export interface AdminNavSection { label: string; items: AdminNavItem[]; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const titleCase = (v: string) =>
  v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const formatNumber = (v: number | null | undefined) =>
  typeof v === 'number' ? v.toLocaleString() : '0';

export const formatAed = (v: number | null | undefined) => {
  if (typeof v !== 'number' || Number.isNaN(v)) return 'AED 0';
  if (v >= 1_000_000) return `AED ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `AED ${(v / 1_000).toFixed(0)}K`;
  return `AED ${v.toLocaleString()}`;
};

export const formatDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const todayStamp = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const todayTime = () =>
  `${new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} GST`;

export const degradedServiceCount = (sh: AdminSystemHealthPayload | null) => {
  const s = [...(sh?.services ?? []), ...(sh?.integrations ?? []), ...(sh?.aiServices ?? [])];
  return s.filter((x) => x.status !== 'healthy').length;
};

export const exportRowsToCsv = (rows: Record<string, unknown>[], filename: string) => {
  if (!rows.length) return;
  const cols = Array.from(rows.reduce<Set<string>>((a, r) => { Object.keys(r).forEach((k) => a.add(k)); return a; }, new Set()));
  const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

export const titleForPage = (page: AdminPage): string => ({
  dashboard: 'Platform Dashboard', patients: 'Patients', doctors: 'Doctors',
  organizations: 'Organizations', insurance: 'Insurance Partners', clinics: 'Clinics',
  ai: 'AI Analytics', integrations: 'Integrations', revenue: 'Revenue', nabidh: 'NABIDH',
  compliance: 'DHA Compliance', audit: 'Audit Logs', security: 'Security',
  system: 'System Health', diagnostics: 'Diagnostics', settings: 'Platform Settings',
  users: 'Users',
}[page]);

const compactBadge = (v: number | undefined) => {
  if (typeof v !== 'number' || v <= 0) return undefined;
  return v >= 1000 ? v.toLocaleString() : v;
};

// ─── Nav builder ──────────────────────────────────────────────────────────────

export const buildAdminSections = (context: AdminContext): AdminNavSection[] => {
  const ctx = context.dashboard?.context;
  return [
    { label: 'OVERVIEW', items: [
      { page: 'dashboard', href: '/admin/dashboard', label: 'Dashboard', icon: BarChart3,
        badge: compactBadge(context.dashboard?.issues.length ?? ctx?.open_issues), badgeTone: 'amber' },
    ]},
    { label: 'USERS & ORGANIZATIONS', items: [
      { page: 'users', href: '/admin/users', label: 'Users', icon: UserCog, badge: compactBadge(context.metrics?.totals.users), badgeTone: 'blue' },
      { page: 'patients', href: '/admin/patients', label: 'Patients', icon: Users, badge: compactBadge(ctx?.total_patients), badgeTone: 'teal' },
      { page: 'doctors', href: '/admin/doctors', label: 'Doctors', icon: Stethoscope, badge: compactBadge(ctx?.pending_doctors), badgeTone: 'amber' },
      { page: 'organizations', href: '/admin/organizations', label: 'Organizations', icon: Building2, badge: compactBadge(context.dashboard?.orgsSummary.total ?? context.organizations.length), badgeTone: 'blue' },
      { page: 'clinics', href: '/admin/clinics', label: 'Clinics', icon: Building2, badge: compactBadge(ctx?.orgs_clinics), badgeTone: 'blue' },
      { page: 'insurance', href: '/admin/insurance', label: 'Insurance', icon: ShieldCheck },
    ]},
    { label: 'PLATFORM', items: [
      { page: 'ai', href: '/admin/ai', label: 'AI Analytics', icon: Brain, badge: compactBadge(ctx?.ai_sessions_today), badgeTone: 'teal' },
      { page: 'integrations', href: '/admin/integrations', label: 'Integrations', icon: Plug, badge: degradedServiceCount(context.systemHealth) > 0 ? '⚠️' : undefined, badgeTone: 'amber' },
      { page: 'revenue', href: '/admin/revenue', label: 'Revenue', icon: CircleDollarSign },
      { page: 'nabidh', href: '/admin/nabidh', label: 'NABIDH', icon: Activity },
    ]},
    { label: 'COMPLIANCE & SECURITY', items: [
      { page: 'compliance', href: '/admin/compliance', label: 'DHA Compliance', icon: Shield, badge: compactBadge(context.compliance?.openIncidentCount), badgeTone: 'red' },
      { page: 'audit', href: '/admin/audit', label: 'Audit Logs', icon: ClipboardList },
      { page: 'security', href: '/admin/security', label: 'Security', icon: LockKeyhole, badge: compactBadge(context.compliance?.openIncidentCount), badgeTone: 'amber' },
    ]},
    { label: 'SYSTEM', items: [
      { page: 'diagnostics', href: '/admin/diagnostics', label: 'Diagnostics', icon: Wrench },
      { page: 'system', href: '/admin/system-health', label: 'System Health', icon: Terminal },
      { page: 'settings', href: '/admin/platform-settings', label: 'Platform Settings', icon: Settings },
    ]},
  ];
};

// ─── Context hook ─────────────────────────────────────────────────────────────

export const useAdminContextValue = (
  options: { userSearch?: string; userRole?: string } = {}
): AdminContext => {
  const metrics = useAdminMetrics();
  const users = useAdminUsers({
    search: options.userSearch ?? '',
    role: options.userRole || null,
    limit: 120,
  });
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
  const error = [metrics.error, users.error, organizations.error, compliance.error, systemHealth.error, aiAnalytics.error, diagnostics.error, dashboard.error, doctors.error, patients.error, insurancePartners.error, aiDashboard.error].find(Boolean) ?? null;
  return {
    metrics: metrics.data ?? null, users: users.data ?? [], organizations: organizations.data ?? [],
    compliance: compliance.data ?? null, systemHealth: systemHealth.data ?? null,
    aiAnalytics: aiAnalytics.data ?? null, diagnostics: diagnostics.data ?? null,
    dashboard: dashboard.data ?? null, doctors: doctors.data ?? [], patients: patients.data ?? [],
    insurancePartners: insurancePartners.data ?? [], aiDashboard: aiDashboard.data ?? null,
    loading: metrics.loading || users.loading || organizations.loading || compliance.loading || systemHealth.loading || aiAnalytics.loading || diagnostics.loading || dashboard.loading || doctors.loading || patients.loading || insurancePartners.loading || aiDashboard.loading,
    error,
    refreshOrganizations: organizations.refetch,
    refetchDashboard: dashboard.refetch,
    refetchDoctors: doctors.refetch,
    refetchSystemHealth: systemHealth.refetch,
    refetchDiagnostics: diagnostics.refetch,
    refetchAll: () => { void metrics.refetch(); void users.refetch(); void organizations.refetch(); void compliance.refetch(); void systemHealth.refetch(); void aiAnalytics.refetch(); void diagnostics.refetch(); void dashboard.refetch(); void doctors.refetch(); void patients.refetch(); void insurancePartners.refetch(); void aiDashboard.refetch(); },
  };
};

// ─── Sidebar helpers ──────────────────────────────────────────────────────────

const navTone = (tone: AdminNavItem['badgeTone']) => {
  if (tone === 'red') return 'bg-red-500/15 text-red-300';
  if (tone === 'amber') return 'bg-amber-500/15 text-amber-300';
  if (tone === 'blue') return 'bg-blue-500/15 text-blue-300';
  return 'bg-teal-500/15 text-teal-300';
};

const SidebarSectionHeading = ({ label }: { label: string }) => (
  <div className="px-5 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</div>
);

const SidebarLink = ({ item, current }: { item: AdminNavItem; current: boolean }) => {
  const Icon = item.icon;
  return (
    <NavLink to={item.href} className={({ isActive }) => `mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${isActive || current ? 'bg-teal-500/10 font-semibold text-teal-200 ring-1 ring-teal-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && item.badge !== null && item.badge !== 0 ? (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${navTone(item.badgeTone)}`}>{item.badge}</span>
      ) : null}
    </NavLink>
  );
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

export const Card = ({ children, className = '', shadow = true }: { children: ReactNode; className?: string; shadow?: boolean }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${shadow ? 'shadow-sm' : ''} ${className}`}>{children}</section>
);

export const Pill = ({ children, tone = 'slate', className = '' }: { children: ReactNode; tone?: 'teal' | 'amber' | 'rose' | 'blue' | 'slate' | 'emerald' | 'purple' | 'violet'; className?: string }) => {
  const tones = { teal: 'bg-teal-50 text-teal-700 ring-teal-200', amber: 'bg-amber-50 text-amber-700 ring-amber-200', rose: 'bg-rose-50 text-rose-700 ring-rose-200', blue: 'bg-blue-50 text-blue-700 ring-blue-200', slate: 'bg-slate-100 text-slate-700 ring-slate-200', emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200', purple: 'bg-purple-50 text-purple-700 ring-purple-200', violet: 'bg-violet-50 text-violet-700 ring-violet-200' };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${tones[tone]} ${className}`}>{children}</span>;
};

export const PageHeader = ({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
    {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
  </div>
);

export const KpiTile = ({ label, value, caption, trend, icon: Icon, iconTone = 'bg-teal-50 text-teal-600 ring-teal-100' }: { label: string; value: string | number; caption?: string; trend?: string; icon?: LucideIcon; iconTone?: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-2 font-['DM_Mono'] text-3xl font-bold text-slate-900">{value}</p>
      </div>
      {Icon ? <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${iconTone}`}><Icon className="h-5 w-5" /></div> : null}
    </div>
    {caption ? <p className="mt-3 text-sm text-slate-500">{caption}</p> : null}
    {trend ? <p className="mt-1 text-xs font-bold text-emerald-600">{trend}</p> : null}
  </div>
);

// ─── AdminShell component ─────────────────────────────────────────────────────

const AdminShell = ({ page, context, children }: { page: AdminPage; context: AdminContext; children: ReactNode }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sections = useMemo(() => buildAdminSections(context), [context]);
  const ctx = context.dashboard?.context;
  const displayName = ctx?.super_admin_name || profile?.full_name || 'Admin';
  const roleLabel = ctx?.super_admin_role_label || 'Super Admin';
  const initials = displayName.split(' ').map((p: string) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const handleSignOut = async () => { const { error } = await signOut(); if (!error) navigate('/auth/login', { replace: true }); };

  return (
    <div className="flex min-h-screen bg-slate-50 font-['Inter'] text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col bg-[#0f1f3a] text-white shadow-lg lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 font-bold">C</div>
          <div>
            <div className="font-['Plus_Jakarta_Sans'] text-base font-bold leading-tight">CeenAiX</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">Super Admin Portal</div>
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 text-teal-300"><span className="h-2 w-2 animate-pulse rounded-full bg-teal-400" />{ctx?.environment_label || 'PRODUCTION'}</span>
            <span className="text-slate-300">{ctx?.platform_version || 'v2.4.1'}</span>
          </div>
          <div className="rounded-xl bg-black/20 p-3 ring-1 ring-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 text-sm font-bold">{initials}</div>
              <div className="min-w-0"><div className="truncate text-sm font-bold">{displayName}</div><div className="truncate text-[11px] text-slate-300">{roleLabel}</div></div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
              <span className="rounded-full bg-teal-500/15 px-2 py-1 text-teal-300">Super Admin · Full Access</span>
              <span className="inline-flex items-center gap-1 text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto pb-3">
          {sections.map((section) => (
            <div key={section.label}>
              <SidebarSectionHeading label={section.label} />
              <div className="space-y-0.5">
                {section.items.map((item) => <SidebarLink key={item.href} item={item} current={location.pathname === item.href || page === item.page} />)}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-3">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> All Systems Operational</div>
          <div className="mb-3 text-[11px] text-slate-400">CeenAiX {ctx?.platform_version || 'v2.4.1'} · {ctx?.environment_label || 'Production'}</div>
          <button type="button" onClick={() => void handleSignOut()} className="flex w-full items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-slate-500">
            Admin Portal <ChevronRight className="h-3.5 w-3.5" /> <span className="truncate font-semibold text-slate-700">{titleForPage(page)}</span>
          </div>
          <div className="ml-4 hidden max-w-md flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 lg:flex">
            <Search className="mr-2 h-4 w-4" /><input placeholder="Search users, doctors, organizations, audit logs..." className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 md:inline">{formatNumber(ctx?.active_sessions ?? context.metrics?.totals.users ?? 0)} active sessions</span>
            {context.dashboard?.issues.length ? <span className="hidden rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 md:inline">{context.dashboard.issues.length} issues detected</span> : null}
            <button type="button" onClick={() => navigate('/admin/audit')} className="relative rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100" aria-label="Open audit log">
              <Bell className="h-4 w-4" />
              {context.dashboard?.issues.length ? <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{context.dashboard.issues.length}</span> : null}
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 text-sm font-bold text-white">{initials}</div>
          </div>
        </header>
        <nav className="lg:hidden flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
          {sections.flatMap((s) => s.items).map((item) => {
            const Icon = item.icon; const active = location.pathname === item.href || page === item.page;
            return (
              <button key={item.href} type="button" onClick={() => navigate(item.href)} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${active ? 'bg-[#0f1f3a] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}>
                <Icon className="h-4 w-4 shrink-0" /><span>{item.label}</span>
                {item.badge ? <span className="rounded-full bg-teal-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{item.badge}</span> : null}
              </button>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {context.error ? (
            <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Failed to load admin data: {context.error}
              <button type="button" onClick={() => context.refetchAll()} className="ml-2 font-semibold underline">Retry</button>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminShell;