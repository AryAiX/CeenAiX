import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatLocaleCurrency, formatLocaleDigits } from '../../lib/i18n-ui';
import {
  LayoutDashboard, Stethoscope, CalendarDays, DollarSign, Settings,
  ChevronLeft, ChevronRight, LogOut, Users, BarChart2, Building2,
  MessageSquare, Bell
} from 'lucide-react';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import type { ClinicPortalMeta } from './ClinicPortal';
import ClinicSignOutDialog from './ClinicSignOutDialog';

interface ClinicSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: string;
  meta: ClinicPortalMeta;
}

interface NavItem {
  id: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  badgeColor?: string;
  section?: 'overview' | 'management' | 'insights' | 'account';
}

function buildNavItems(meta: ClinicPortalMeta): NavItem[] {
  return [
    { id: 'dashboard',     icon: LayoutDashboard, href: '/clinic/dashboard',     section: 'overview' },
    { id: 'doctors',       icon: Stethoscope,     href: '/clinic/doctors',       badge: meta.pendingDoctors,      badgeColor: 'bg-amber-500' },
    { id: 'appointments',  icon: CalendarDays,    href: '/clinic/appointments',  badge: meta.todayApptCount,      badgeColor: 'bg-teal-500' },
    { id: 'patients',      icon: Users,           href: '/clinic/patients',      section: 'management' },
    { id: 'pricing',       icon: DollarSign,      href: '/clinic/pricing' },
    { id: 'messages',      icon: MessageSquare,   href: '/clinic/messages',      badge: meta.unreadMessages,      badgeColor: 'bg-blue-500' },
    { id: 'notifications', icon: Bell,            href: '/clinic/notifications', badge: meta.unreadNotifications, badgeColor: 'bg-red-500' },
    { id: 'analytics',     icon: BarChart2,       href: '/clinic/analytics',     section: 'insights' },
    { id: 'settings',      icon: Settings,        href: '/clinic/settings',      section: 'account' },
  ];
}

const ClinicSidebar: React.FC<ClinicSidebarProps> = ({ isCollapsed, onToggleCollapse, activeTab, meta }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const P = 'clinic.portalPage';
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navItems = buildNavItems(meta);
  const facilityName = meta.facilityName || t('clinic.facilityFallback');

  const facilityInitials = facilityName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'CL';

  return (
    <aside className={`${isCollapsed ? 'w-[72px]' : 'w-[260px]'} bg-[#0A1628] flex flex-col transition-all duration-300 shadow-2xl shrink-0 h-full`}>
      {/* Header */}
      <div className="h-[72px] flex items-center justify-between px-4 border-b border-white/[0.06]">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
                <Building2 size={16} className="text-white" aria-hidden="true" />
              </div>
              <div>
                <div className="text-white font-bold text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>CeenAiX</div>
                <div className="text-teal-400 text-[10px] uppercase tracking-wide">{t(`${P}.portalLabel`)}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={t(`${P}.collapse`)}
              aria-expanded="true"
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} className="text-slate-400 rtl:rotate-180" aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={t(`${P}.expand`)}
            aria-expanded="false"
            className="mx-auto p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
              <Building2 size={16} className="text-white" aria-hidden="true" />
            </div>
          </button>
        )}
      </div>

      {/* Clinic card */}
      {!isCollapsed && (
        <div className="px-4 py-3">
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {facilityInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-[13px] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{facilityName}</div>
                <div className="text-teal-400 text-[11px] truncate">{meta.facilityAddress || t(`${P}.portalLabel`)}</div>
                {/* QA-238: it showed "DHA Licensed ✓" for every clinic; now only when CeenAiX recorded it */}
                {meta.dhaLicensed ? (
                  <div data-testid="clinic-dha-badge" className="mt-1 inline-flex items-center px-2 py-0.5 bg-emerald-900/50 rounded text-emerald-300 text-[9px] font-medium">
                    {t('clinic.portalPage.dhaLicensed')} ✓
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav aria-label={t(`${P}.menuLabel`)} className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const showSection = item.section && (index === 0 || navItems[index - 1].section !== item.section);
          const isActive = activeTab === item.id;
          const label = t(`${P}.titles.${item.id}`);
          const badge = item.badge ?? 0;

          return (
            <React.Fragment key={item.id}>
              {!isCollapsed && showSection && (
                <div className="px-3 pt-4 pb-1">
                  <p className="text-slate-500 text-[9px] uppercase tracking-wider font-semibold">{t(`${P}.sections.${item.section}`)}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate(item.href)}
                aria-current={isActive ? 'page' : undefined}
                // QA-241: when collapsed only the icon shows, so the label is given here
                aria-label={isCollapsed ? (badge > 0 ? `${label} (${formatLocaleDigits(badge, lang)})` : label) : undefined}
                title={isCollapsed ? label : undefined}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="shrink-0" aria-hidden="true" />
                  {!isCollapsed && <span className="font-medium text-[13px]" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</span>}
                </div>
                {/* QA-220: `item.badge && …` printed a stray "0" when the count was zero */}
                {!isCollapsed && badge > 0 ? (
                  <span data-testid={`clinic-nav-badge-${item.id}`} className={`${item.badgeColor} text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center`}>
                    {badge > 99 ? `${formatLocaleDigits(99, lang)}+` : formatLocaleDigits(badge, lang)}
                  </span>
                ) : null}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Bottom stats + sign out */}
      {!isCollapsed && (
        <div className="border-t border-white/[0.06] p-3.5 space-y-2.5">
          <p className="text-slate-500 text-[9px] uppercase tracking-wider font-semibold px-2">{t(`${P}.today`)}</p>
          <div className="space-y-2 text-[12px]">
            {[
              {
                key: 'appointments',
                label: t(`${P}.todayAppointments`, { count: meta.todayApptCount }),
                value: t(`${P}.todayConfirmed`, { value: formatLocaleDigits(meta.todayConfirmedCount, lang) }),
                color: 'text-teal-400',
              },
              // QA-239: an estimate from the clinic's own fees (nothing is billed), like the Dashboard
              { key: 'fees', label: t('clinic.portalPage.todayFees'), value: meta.todayFees === null ? '—' : formatLocaleCurrency(meta.todayFees, lang), color: 'text-emerald-400' },
              { key: 'pending', label: t(`${P}.pendingApprovals`), value: t(`${P}.pendingDoctors`, { count: meta.pendingDoctors }), color: 'text-amber-400' },
            ].map(s => (
              <div key={s.key} data-testid={`clinic-today-${s.key}`} className="flex items-center justify-between gap-2 px-2">
                <span className="text-slate-400">{s.label}</span>
                <span className={`font-mono font-semibold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
          {/* QA-242: also here, because the Messages page has no top bar */}
          <div data-testid="clinic-sidebar-language" className="flex items-center justify-between gap-2 px-2 pt-1">
            <span className="text-slate-400 text-[12px]">{t('nav.language')}</span>
            <LanguageSwitcher dense variant="dark" />
          </div>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
          >
            <LogOut size={16} className="rtl:rotate-180" aria-hidden="true" />
            <span className="text-[13px]" style={{ fontFamily: 'Inter, sans-serif' }}>{t(`${P}.signOut`)}</span>
          </button>
        </div>
      )}

      {isCollapsed && (
        <>
          {/* QA-248: the collapsed menu had no way to sign out */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            aria-label={t(`${P}.signOut`)}
            title={t(`${P}.signOut`)}
            data-testid="clinic-sidebar-signout-collapsed"
            className="p-4 border-t border-white/[0.06] text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
          >
            <LogOut size={18} className="mx-auto rtl:rotate-180" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={t(`${P}.expand`)}
            className="p-4 border-t border-white/[0.06] hover:bg-white/5 transition-colors"
          >
            <ChevronRight size={18} className="text-slate-400 mx-auto rtl:rotate-180" aria-hidden="true" />
          </button>
        </>
      )}

      <ClinicSignOutDialog open={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} />
    </aside>
  );
};

export default ClinicSidebar;
