import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import type { ClinicPortalMeta } from './ClinicPortal';

interface ClinicTopBarProps {
  title: string;
  subtitle?: string;
  meta: ClinicPortalMeta;
}

const KNOWN_ROLES = ['clinic_admin', 'clinic_manager', 'clinic_receptionist'];

export default function ClinicTopBar({ title, subtitle, meta }: ClinicTopBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userInitials = meta.userName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'CL';
  // QA-240: "Clinic admin" instead of the stored value "Clinic_admin"
  const roleLabel = t(`clinic.portalPage.roles.${meta.userRole && KNOWN_ROLES.includes(meta.userRole) ? meta.userRole : 'staff'}`);
  const bellLabel =
    meta.unreadNotifications > 0
      ? t('clinic.portalPage.notificationsUnread', { count: meta.unreadNotifications })
      : t('clinic.portalPage.notificationsLabel');

  return (
    <div className="h-[64px] bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-3 sm:px-6 shrink-0">
      <div className="min-w-0">
        <h1 className="truncate font-bold text-slate-900 text-lg leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</h1>
        {subtitle && <p className="truncate text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {/* QA-240: the search box did nothing when you typed, and the name had a dropdown arrow with no
          menu; both are gone */}
      <div className="flex items-center gap-3">
        {/* QA-242: EN / عربي, like the doctor and patient portals */}
        <LanguageSwitcher dense variant="light" />
        <button
          type="button"
          onClick={() => navigate('/clinic/notifications')}
          aria-label={bellLabel}
          data-testid="clinic-topbar-bell"
          className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell size={18} className="text-slate-500" aria-hidden="true" />
          {meta.unreadNotifications > 0 && (
            <span aria-hidden="true" className="absolute top-1 end-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
          <div aria-hidden="true" className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">{userInitials}</div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">{meta.userName || roleLabel}</div>
            <div data-testid="clinic-topbar-role" className="text-[10px] text-slate-400">{roleLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
