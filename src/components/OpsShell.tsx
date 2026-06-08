import { useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  LogOut,
  ScanBarcode,
  ShieldCheck,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';

export interface OpsShellNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  badge?: number | string | null;
  badgeTone?: 'blue' | 'amber';
  section?: 'main' | 'analytics' | 'account';
  disabled?: boolean;
}

interface OpsShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  navItems: OpsShellNavItem[];
  actions?: ReactNode;
  children: ReactNode;
  accent?: 'slate' | 'emerald' | 'cyan' | 'violet';
  variant?: 'default' | 'pharmacy';
}

const ACCENT_BAR: Record<NonNullable<OpsShellProps['accent']>, string> = {
  slate: 'from-slate-600 to-slate-800',
  emerald: 'from-emerald-500 to-teal-600',
  cyan: 'from-cyan-500 to-blue-600',
  violet: 'from-violet-500 to-fuchsia-600',
};

export const OpsShell = ({
  title,
  subtitle,
  eyebrow,
  navItems,
  actions,
  children,
  accent = 'slate',
  variant = 'default',
}: OpsShellProps) => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation('common');
  const isArabic = i18n.language.startsWith('ar');
  const [pharmacyCollapsed, setPharmacyCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const displayName =
    profile?.full_name?.trim() || profile?.first_name?.trim() || user?.email?.split('@')[0] || 'CeenAiX';

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/auth/login', { replace: true });
    }
  };

  if (variant === 'pharmacy') {
    const pharmacySections = [
      { id: 'main' as const, title: 'MAIN', items: navItems.filter((item) => (item.section ?? 'main') === 'main') },
      { id: 'analytics' as const, title: 'ANALYTICS', items: navItems.filter((item) => item.section === 'analytics') },
      { id: 'account' as const, title: 'ACCOUNT', items: navItems.filter((item) => item.section === 'account') },
    ].filter((section) => section.items.length > 0);

    const goTo = (href: string, disabled?: boolean) => {
      if (!disabled) {
        navigate(href);
      }
    };

    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <aside
          className={`relative flex h-full shrink-0 flex-col bg-emerald-950 transition-all duration-300 ${
            pharmacyCollapsed ? 'w-[72px]' : 'w-[260px]'
          }`}
        >
          <button
            type="button"
            onClick={() => setPharmacyCollapsed((current) => !current)}
            className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:shadow-md"
            aria-label={pharmacyCollapsed ? 'Expand pharmacy sidebar' : 'Collapse pharmacy sidebar'}
          >
            {pharmacyCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>

          <div className="flex h-16 shrink-0 items-center border-b border-emerald-300/20 px-4">
            {pharmacyCollapsed ? (
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-lg font-bold text-white">
                C
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold text-white">CeenAiX</div>
                <div className="text-[9px] uppercase tracking-[0.3em] text-emerald-300">PHARMACY PORTAL</div>
              </div>
            )}
          </div>

          {!pharmacyCollapsed ? (
            <div className="mx-3 my-3 shrink-0 rounded-xl border border-emerald-300/25 bg-emerald-500/15 p-3">
              <div className="text-[13px] font-bold text-white">Al Shifa Pharmacy</div>
              <div className="text-[11px] text-emerald-100">الشفاء للصيدلة</div>
              <div className="mt-0.5 text-[10px] text-emerald-300">Al Barsha · DHA Licensed ✅</div>
              <div className="mt-2 border-t border-emerald-300/20 pt-2">
                <div className="text-[10px] text-white/70">{displayName} | Head Pharmacist</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-300">Active shift</span>
                  <Wifi className="ml-auto h-3 w-3 text-emerald-300" />
                </div>
              </div>
            </div>
          ) : null}

          <nav className="flex-1 overflow-y-auto py-2">
            {pharmacySections.map((section) => (
              <div key={section.id} className="mb-2">
                {!pharmacyCollapsed ? (
                  <div className="px-4 py-1 text-[9px] uppercase tracking-[0.3em] text-emerald-300/60">
                    {section.title}
                  </div>
                ) : null}

                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.href;
                  const content = (
                    <>
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-emerald-300' : 'text-white/60'}`} />
                      {!pharmacyCollapsed ? (
                        <>
                          <span className={`ml-3 flex-1 text-left text-[13px] ${active ? 'font-semibold text-white' : 'text-white/75'}`}>
                            {item.label}
                          </span>
                          {item.badge ? (
                            <span
                              className={`flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ${
                                item.badgeTone === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
                              }`}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                      {pharmacyCollapsed && item.badge ? (
                        <span
                          className={`absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ${
                            item.badgeTone === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </>
                  );

                  return item.disabled ? (
                    <button
                      key={item.href}
                      type="button"
                      disabled
                      className={`relative flex h-11 w-full items-center px-4 opacity-60 ${
                        pharmacyCollapsed ? 'justify-center px-0' : ''
                      }`}
                    >
                      {content}
                    </button>
                  ) : (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => goTo(item.href, item.disabled)}
                      className={`relative flex h-11 w-full items-center border-l-[3px] transition ${
                        pharmacyCollapsed ? 'justify-center px-0' : 'px-4'
                      } ${
                        active
                          ? 'border-emerald-300 bg-emerald-500/25'
                          : 'border-transparent hover:bg-white/[0.07]'
                      }`}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {!pharmacyCollapsed ? (
            <div className="mx-3 mb-2 shrink-0 rounded-xl border border-emerald-300/15 bg-emerald-500/10 p-3">
              <div className="text-[11px] leading-6 text-white/85">
                <div>Live prescription queue</div>
                <div className="text-[10px] text-emerald-300">DB-bound dispensing and inventory</div>
                <div className="text-[10px] font-semibold text-emerald-400">DHA sync ready</div>
              </div>
            </div>
          ) : null}

          {!pharmacyCollapsed ? (
            <div className="mx-3 mb-3 flex shrink-0 items-center gap-2 rounded-lg border border-emerald-300/15 bg-emerald-500/10 px-3 py-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
              <div>
                <div className="text-[10px] font-semibold text-emerald-300">DHA COMPLIANT ✅</div>
                <div className="text-[9px] text-white/40">DHA-PHARM-2019-003481</div>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className={`flex h-12 shrink-0 items-center border-t border-emerald-300/15 px-4 text-white/40 transition hover:bg-red-500/10 hover:text-red-200 ${
              pharmacyCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!pharmacyCollapsed ? (
              <span className="ml-3 text-[13px]">{t('portalShell.signOut', { defaultValue: 'Sign Out' })}</span>
            ) : null}
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 min-h-16 shrink-0 border-b border-slate-200 bg-white">
            <div className="flex h-16 items-center gap-4 px-6">
              <div className="shrink-0">
                <h1 className="text-[18px] font-bold text-slate-900">{title}</h1>
                <div className="text-[12px] text-slate-400">
                  {subtitle ?? t('opsShell.defaultSubtitle', { defaultValue: 'Live operations' })}
                </div>
              </div>
              <div className="hidden flex-1 justify-center xl:flex">
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[13px]">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="font-medium text-blue-700">
                    {t('opsShell.rxSync', { defaultValue: 'New prescription queue synced from Supabase' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/pharmacy/dispensing')}
                    className="rounded bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                  >
                    {t('opsShell.viewCta', { defaultValue: 'View' })}
                  </button>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-900 transition hover:bg-emerald-100 sm:flex"
                >
                  <ScanBarcode className="h-4 w-4" />
                  <span>{t('opsShell.scanBarcode', { defaultValue: 'Scan Barcode' })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/pharmacy/dispensing')}
                  className="hidden items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700 sm:flex"
                >
                  <ClipboardPlus className="h-4 w-4" />
                  <span>{t('opsShell.newManualRx', { defaultValue: 'New Manual Rx' })}</span>
                </button>
                <button className="relative rounded-lg p-2 transition hover:bg-slate-100">
                  <Bell className="h-5 w-5 text-slate-500" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
                </button>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-xs font-bold text-white">
                    {displayName
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || 'PH'}
                  </div>
                  <span className="hidden text-[13px] font-medium text-slate-700 lg:inline">{displayName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        {showLogoutConfirm ? (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900">Sign Out</h3>
              <p className="mt-2 text-sm text-gray-500">Are you sure you want to sign out?</p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    void handleSignOut();
                  }}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Yes, Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className={`bg-gradient-to-r ${ACCENT_BAR[accent]} text-white`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between gap-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/90 transition hover:bg-white/20"
                aria-label={t('pageHeader.goBack', { defaultValue: 'Go back' })}
              >
                <ArrowLeft className={`h-4 w-4 ${isArabic ? 'rotate-180' : ''}`} />
              </button>
              <div>
                {eyebrow ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-white/80">{subtitle}</p> : null}
              </div>
            </div>
            <div className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-white/70">{profile?.role ?? '—'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t('portalShell.signOut', { defaultValue: 'Sign out' })}</span>
              </button>
              {actions}
            </div>
          </div>
          <nav className={`-mx-1 flex gap-1 overflow-x-auto ${isArabic ? 'flex-row-reverse' : ''}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.href;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={() =>
                    `inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-white text-slate-900 shadow'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900">Sign Out</h3>
            <p className="mt-2 text-sm text-gray-500">Are you sure you want to sign out?</p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  void handleSignOut();
                }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
