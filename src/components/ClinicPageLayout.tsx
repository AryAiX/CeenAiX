import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { OpsShell } from './OpsShell';
import { useClinicPortal } from '../hooks/use-clinic-portal';
import { CLINIC_NAV_ITEMS } from '../pages/clinic/navItems';
import type { ClinicPortalRole } from '../types/clinic-portal';

interface ClinicPageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export const ClinicPageLayout = ({ title, subtitle, actions, children }: ClinicPageLayoutProps) => {
  const { t } = useTranslation('common');
  const { data, loading, error, refetch } = useClinicPortal();

  const role = (data?.portal_role ?? 'clinic_manager') as ClinicPortalRole;

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

  const navItems = CLINIC_NAV_ITEMS(t, role, {
    appointments: data?.appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed').length,
  }).map((item) => ({
    ...item,
    href: item.href,
    label: item.label,
    icon: item.icon,
    section: item.section === 'insights' ? ('analytics' as const) : item.section === 'account' ? ('account' as const) : ('main' as const),
    badge: item.badge,
    badgeTone: 'blue' as const,
    disabled: item.adminOnly && role !== 'clinic_admin',
  }));

  const filteredNav = navItems.filter((item) => !item.disabled);

  return (
    <OpsShell
      title={title}
      subtitle={subtitle ?? facilityName}
      eyebrow={loading ? t('clinic.loading') : t('clinic.portalEyebrow')}
      navItems={filteredNav}
      actions={actions}
      accent="emerald"
      variant="pharmacy"
    >
      {children}
    </OpsShell>
  );
};
