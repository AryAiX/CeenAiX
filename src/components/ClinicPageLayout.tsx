import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart2,
  Bell,
  CalendarDays,
  DollarSign,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Stethoscope,
  Users,
} from 'lucide-react';
import { OpsShell, type OpsShellNavItem } from './OpsShell';
import { useClinicPortal } from '../hooks/use-clinic-portal';

interface ClinicPageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export const ClinicPageLayout = ({ title, subtitle, actions, children }: ClinicPageLayoutProps) => {
  const { t } = useTranslation('common');
  const { data, loading, error, refetch } = useClinicPortal();

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-slate-900">{t('clinic.errors.loadFailed')}</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {t('clinic.actions.retry')}
          </button>
        </div>
      </div>
    );
  }

  const facilityName =
    data?.facility?.name_en ?? data?.facility?.name ?? t('clinic.facilityFallback');

  const appointmentBadge = data?.appointments.filter(
    (appointment) => appointment.status === 'scheduled' || appointment.status === 'confirmed'
  ).length;

  const navItems: OpsShellNavItem[] = [
    { href: '/clinic/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/clinic/doctors', label: 'Doctors', icon: Stethoscope },
    { href: '/clinic/appointments', label: 'Appointments', icon: CalendarDays, badge: appointmentBadge, badgeTone: 'blue' },
    { href: '/clinic/patients', label: 'Patients', icon: Users },
    { href: '/clinic/pricing', label: 'Pricing & Services', icon: DollarSign },
    { href: '/clinic/messages', label: 'Messages', icon: MessageSquare },
    { href: '/clinic/notifications', label: 'Notifications', icon: Bell },
    { href: '/clinic/analytics', label: 'Analytics', icon: BarChart2, section: 'analytics' },
    { href: '/clinic/settings', label: 'Settings', icon: Settings, section: 'account' },
  ];

  return (
    <OpsShell
      title={title}
      subtitle={subtitle ?? facilityName}
      eyebrow={loading ? t('clinic.loading') : t('clinic.portalEyebrow')}
      navItems={navItems}
      actions={actions}
      accent="emerald"
    >
      {children}
    </OpsShell>
  );
};
