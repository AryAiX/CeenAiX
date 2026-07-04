import {
  BarChart2,
  Bell,
  CircleDollarSign,
  ClipboardList,
  MessageSquare,
  Package,
  Pill,
  Settings as SettingsIcon,
  Store,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import type { OpsShellNavItem } from '../../components/OpsShell';

interface PharmacyNavCounts {
  prescriptions?: number;
  inventory?: number;
  messages?: number;
}

export const PHARMACY_NAV_ITEMS = (t: TFunction, counts: PharmacyNavCounts = {}): OpsShellNavItem[] => [
  {
    href: '/pharmacy/dashboard',
    label: 'Dashboard',
    icon: Pill,
    section: 'main',
    badge: counts.prescriptions,
    badgeTone: 'blue',
  },
  {
    href: '/pharmacy/dispensing',
    label: 'Prescriptions',
    icon: ClipboardList,
    section: 'main',
    badge: counts.prescriptions,
    badgeTone: 'blue',
  },
  {
    href: '/pharmacy/inventory',
    label: t('pharmacy.inventory.title'),
    icon: Package,
    section: 'main',
    badge: counts.inventory,
    badgeTone: 'amber',
  },
  {
    href: '/pharmacy/messages',
    label: 'Messages',
    icon: MessageSquare,
    section: 'main',
    badge: counts.messages,
    badgeTone: 'amber',
  },
  {
    href: '/pharmacy/reports',
    label: 'Reports',
    icon: BarChart2,
    section: 'analytics',
  },
  {
    href: '/pharmacy/revenue',
    label: 'Revenue',
    icon: CircleDollarSign,
    section: 'analytics',
  },
  {
    href: '/pharmacy/notifications',
    label: 'Notifications',
    icon: Bell,
    section: 'account',
  },
  {
    href: '/pharmacy/profile',
    label: 'My Pharmacy',
    icon: Store,
    section: 'account',
  },
  {
    href: '/pharmacy/settings',
    label: 'Settings',
    icon: SettingsIcon,
    section: 'account',
  },
];
