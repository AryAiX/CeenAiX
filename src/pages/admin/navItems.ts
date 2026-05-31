import {
  Activity,
  BrainCircuit,
  Building2,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  Terminal,
  Users,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import type { OpsShellNavItem } from '../../components/OpsShell';

export const ADMIN_NAV_ITEMS = (t: TFunction): OpsShellNavItem[] => [
  { href: '/admin/dashboard', label: t('admin.dashboard.title'), icon: LayoutDashboard },
  { href: '/admin/users', label: t('admin.users.title'), icon: Users },
  { href: '/admin/clinics', label: t('admin.clinics.title'), icon: Stethoscope },
  { href: '/admin/organizations', label: t('admin.organizations.title'), icon: Building2 },
  { href: '/admin/compliance', label: t('admin.compliance.title'), icon: ShieldCheck },
  { href: '/admin/system-health', label: t('admin.systemHealth.title'), icon: Activity },
  { href: '/admin/ai-analytics', label: t('admin.aiAnalytics.title'), icon: BrainCircuit },
  { href: '/admin/diagnostics', label: t('admin.diagnostics.title'), icon: Terminal },
];
