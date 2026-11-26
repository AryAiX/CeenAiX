import {
  BarChart2,
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
import type { PharmacyQueuePrescriptionItem } from '../../hooks';
import { inferPrescriptionWorkflowStatus } from './prescription-status';

export interface PharmacyNavCounts {
  prescriptions?: number;
  inventory?: number;
  messages?: number;
}

/**
 * QA-273: the menu badges, counted the same way on every pharmacy page (they used to differ from
 * page to page, so a badge changed or vanished while moving around):
 *   - Prescriptions: prescriptions (not medicines) that are new or on hold;
 *   - Inventory: stock alerts (low, out, expiring soon, expired units);
 *   - Messages: unread messages.
 */
export const pharmacyNavCounts = (
  data?: {
    queue?: PharmacyQueuePrescriptionItem[];
    messages?: Array<{ unreadCount: number }>;
    lowStockAlerts?: number;
  } | null
): PharmacyNavCounts => {
  const byPrescription = new Map<string, PharmacyQueuePrescriptionItem[]>();
  for (const item of data?.queue ?? []) {
    byPrescription.set(item.prescriptionId, [...(byPrescription.get(item.prescriptionId) ?? []), item]);
  }
  let waiting = 0;
  for (const group of byPrescription.values()) {
    const status = inferPrescriptionWorkflowStatus(group);
    if (status === 'new' || status === 'on_hold') waiting += 1;
  }
  const unread = (data?.messages ?? []).reduce((sum, item) => sum + (item.unreadCount || 0), 0);
  return {
    prescriptions: waiting || undefined,
    inventory: data?.lowStockAlerts || undefined,
    messages: unread || undefined,
  };
};

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
