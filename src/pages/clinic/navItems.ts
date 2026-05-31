import {
  BarChart2,
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  MessageSquare,
  Settings as SettingsIcon,
  Stethoscope,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import type { ClinicPortalRole } from '../../types/clinic-portal';

export interface ClinicNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: 'main' | 'insights' | 'account';
  adminOnly?: boolean;
  badge?: number;
}

export const CLINIC_NAV_ITEMS = (
  t: TFunction,
  role: ClinicPortalRole,
  counts: { appointments?: number; messages?: number } = {},
): ClinicNavItem[] => {
  const items: ClinicNavItem[] = [
    {
      href: '/clinic/dashboard',
      label: t('clinic.nav.dashboard'),
      icon: LayoutDashboard,
      section: 'main',
    },
    {
      href: '/clinic/doctors',
      label: t('clinic.nav.doctors'),
      icon: Stethoscope,
      section: 'main',
    },
    {
      href: '/clinic/appointments',
      label: t('clinic.nav.appointments'),
      icon: CalendarDays,
      section: 'main',
      badge: counts.appointments,
    },
    {
      href: '/clinic/patients',
      label: t('clinic.nav.patients'),
      icon: Users,
      section: 'main',
    },
    {
      href: '/clinic/services',
      label: t('clinic.nav.services'),
      icon: Tags,
      section: 'main',
    },
    {
      href: '/clinic/pricing',
      label: t('clinic.nav.pricing'),
      icon: Tags,
      section: 'main',
    },
    {
      href: '/clinic/schedule',
      label: t('clinic.nav.schedule'),
      icon: CalendarDays,
      section: 'main',
    },
    {
      href: '/clinic/messages',
      label: t('clinic.nav.messages'),
      icon: MessageSquare,
      section: 'main',
      badge: counts.messages,
    },
    {
      href: '/clinic/analytics',
      label: t('clinic.nav.analytics'),
      icon: BarChart2,
      section: 'insights',
    },
    {
      href: '/clinic/billing',
      label: t('clinic.nav.billing'),
      icon: CircleDollarSign,
      section: 'insights',
      adminOnly: true,
    },
    {
      href: '/clinic/settings',
      label: t('clinic.nav.settings'),
      icon: SettingsIcon,
      section: 'account',
    },
  ];

  if (role !== 'clinic_admin') {
    return items.filter((item) => !item.adminOnly);
  }
  return items;
};
