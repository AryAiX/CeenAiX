import {
  Activity, BarChart3, Brain, Building2,
  CircleDollarSign, ClipboardList, LockKeyhole,
  Plug, Settings, Shield, ShieldCheck, Stethoscope,
  Terminal, UserCog, Users, Wrench, type LucideIcon,
} from 'lucide-react';
import {
  useAdminAiAnalytics, useAdminAiDashboard, useAdminCompliance,
  useAdminDashboard, useAdminDiagnostics, useAdminDoctorDirectory,
  useAdminInsurancePartners, useAdminMetrics, useAdminOrganizations,
  useAdminPatientDirectory, useAdminSystemHealth, useAdminUsers,
} from '../../hooks';
import type { AdminComplianceData, AdminDiagnosticsData } from '../../hooks';
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
