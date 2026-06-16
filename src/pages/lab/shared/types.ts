import type { LucideIcon } from 'lucide-react';
import { useLabOpsActions } from '../../../hooks';
import type { LabPortalData } from '../../../hooks';

export type LabPage =
  | 'dashboard'
  | 'queue'
  | 'orders'
  | 'results'
  | 'qc'
  | 'imaging-queue'
  | 'imaging-orders'
  | 'imaging-reports'
  | 'imaging-equipment'
  | 'equipment'
  | 'nabidh'
  | 'analytics'
  | 'profile'
  | 'settings';

export interface LabNavItem {
  page: LabPage;
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  badgeTone?: 'blue' | 'amber' | 'red' | 'violet';
}

export interface LabNavSection {
  label: string;
  items: LabNavItem[];
}

export interface LabPageContext {
  data: LabPortalData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  actions: ReturnType<typeof useLabOpsActions>;
}
