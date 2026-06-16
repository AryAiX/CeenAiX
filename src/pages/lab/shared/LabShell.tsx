import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  Gauge,
  LogOut,
  Microscope,
  ScanLine,
  Settings as SettingsIcon,
  Upload,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { useLabOpsActions, useLabOpsPortal } from '../../../hooks';
import type { LabPortalData } from '../../../hooks';
import type { LabPage, LabNavItem, LabNavSection, LabPageContext } from './types';
import { formatNumber, initialsFromName } from './helpers';

export const routeTitles: Record<LabPage, string> = {
  dashboard: 'Dashboard',
  queue: 'Queue',
  orders: 'Lab Orders',
  results: 'Results',
  qc: 'Quality Control',
  'imaging-queue': 'Imaging Queue',
  'imaging-orders': 'Imaging Orders',
  'imaging-reports': 'Reports',
  'imaging-equipment': 'Imaging Equipment',
  equipment: 'Lab Equipment & Analyzers',
  nabidh: 'NABIDH Submission Centre',
  analytics: 'Analytics & Reports',
  profile: 'Profile',
  settings: 'Settings',
};

export const routeBreadcrumb: Record<LabPage, string> = {
  dashboard: 'Lab & Radiology Portal',
  queue: 'Lab & Radiology Portal · Laboratory',
  orders: 'Lab & Radiology Portal · Laboratory',
  results: 'Lab & Radiology Portal · Laboratory',
  qc: 'Lab & Radiology Portal · Laboratory',
  'imaging-queue': 'Lab & Radiology Portal · Radiology',
  'imaging-orders': 'Lab & Radiology Portal · Radiology',
  'imaging-reports': 'Lab & Radiology Portal · Radiology',
  'imaging-equipment': 'Lab & Radiology Portal · Radiology',
  equipment: 'Lab & Radiology Portal · Laboratory',
  nabidh: 'Lab & Radiology Portal',
  analytics: 'Lab & Radiology Portal',
  profile: 'Lab & Radiology Portal',
  settings: 'Lab & Radiology Portal',
};

const buildNavSections = (data: LabPortalData | null): LabNavSection[] => [
  {
    label: 'OVERVIEW',
    items: [
      {
        page: 'dashboard',
        href: '/lab/dashboard',
        label: 'Dashboard',
        icon: Activity,
        badge: data?.metrics.criticalUnnotified || undefined,
        badgeTone: 'red',
      },
    ],
  },
  {
    label: 'LABORATORY',
    items: [
      { page: 'queue', href: '/lab/queue', label: 'Lab Queue', icon: FlaskConical, badge: data?.metrics.labQueue || undefined, badgeTone: 'blue' },
      { page: 'orders', href: '/lab/orders', label: 'Lab Orders', icon: ClipboardList, badge: data?.metrics.labOrders || undefined, badgeTone: 'blue' },
      { page: 'results', href: '/lab/results', label: 'Lab Results', icon: ClipboardCheck, badge: data?.metrics.labResults || undefined, badgeTone: 'amber' },
      { page: 'qc', href: '/lab/qc', label: 'Quality Control', icon: Microscope, badge: data?.metrics.qualityWarnings ? '⚠' : undefined, badgeTone: 'amber' },
    ],
  },
  {
    label: 'RADIOLOGY',
    items: [
      { page: 'imaging-queue', href: '/lab/imaging/queue', label: 'Imaging Queue', icon: ScanLine, badge: data?.metrics.imagingQueue || undefined, badgeTone: 'blue' },
      { page: 'imaging-orders', href: '/lab/imaging/orders', label: 'Imaging Orders', icon: ClipboardList, badge: data?.metrics.imagingOrders || undefined, badgeTone: 'blue' },
      { page: 'imaging-reports', href: '/lab/imaging/reports', label: 'Radiology Reports', icon: FileText, badge: data?.metrics.radiologyReports || undefined, badgeTone: 'amber' },
      { page: 'imaging-equipment', href: '/lab/imaging/equipment', label: 'Imaging Equipment', icon: Wrench, badge: data?.metrics.imagingEquipmentWarnings ? '⚠' : undefined, badgeTone: 'amber' },
    ],
  },
  {
    label: 'SHARED',
    items: [
      { page: 'equipment', href: '/lab/equipment', label: 'Lab Equipment', icon: Gauge, badge: data?.metrics.labEquipmentWarnings ? '⚠' : undefined, badgeTone: 'amber' },
      { page: 'nabidh', href: '/lab/nabidh', label: 'NABIDH Sync', icon: Upload, badge: data?.metrics.nabidhPending || undefined, badgeTone: 'violet' },
      { page: 'analytics', href: '/lab/analytics', label: 'Analytics', icon: Activity },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { page: 'profile', href: '/lab/profile', label: 'Profile', icon: UserRound },
      { page: 'settings', href: '/lab/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

const badgeClass = (tone: LabNavItem['badgeTone']) => {
  if (tone === 'red') return 'bg-red-500 text-white';
  if (tone === 'amber') return 'bg-amber-500 text-white';
  if (tone === 'violet') return 'bg-violet-500 text-white';
  return 'bg-blue-500 text-white';
};

const PageHeader = ({ page, context }: { page: LabPage; context: LabPageContext }) => {
  const navigate = useNavigate();
  const facility = context.data?.facility;
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        {page.startsWith('imaging') ? <ScanLine className="h-5 w-5" /> : <FlaskConical className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{routeBreadcrumb[page]}</div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">{routeTitles[page]}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button type="button"
          onClick={() => navigate('/lab/dashboard')}
          className={`hidden rounded-xl border px-3 py-2 text-xs font-bold sm:inline-flex ${
            page === 'dashboard'
              ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        <button type="button"
          onClick={() => navigate('/lab/queue')}
          className={`hidden rounded-xl border px-3 py-2 text-xs font-bold sm:inline-flex ${
            page === 'queue' || page === 'orders' || page === 'results' || page === 'qc'
              ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Lab Only
        </button>
        <button type="button"
          onClick={() => navigate('/lab/imaging/queue')}
          className={`hidden rounded-xl border px-3 py-2 text-xs font-bold sm:inline-flex ${
            page.startsWith('imaging')
              ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Radiology Only
        </button>
        <button type="button"
          onClick={() => navigate('/lab/results/entry')}
          className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          Scan Sample / Study
        </button>
        <button type="button"
          onClick={() => navigate('/lab/queue')}
          className="relative rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Open lab queue"
        >
          <Bell className="h-4 w-4" />
          {context.data?.metrics.criticalUnnotified ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {context.data.metrics.criticalUnnotified}
            </span>
          ) : null}
        </button>
        <button type="button"
          onClick={() => navigate('/lab/profile')}
          className="h-9 w-9 rounded-full bg-slate-200 text-center font-['DM_Mono'] text-xs font-bold leading-9 text-slate-700"
          aria-label="Open lab profile"
        >
          {context.data?.facilityMeta?.shortCode ?? initialsFromName(facility?.name ?? null)}
        </button>
      </div>
    </header>
  );
};

export const LabShell = ({ page, context, children }: { page: LabPage; context: LabPageContext; children: ReactNode }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const sections = useMemo(() => buildNavSections(context.data), [context.data]);
  const facility = context.data?.facility;
  const meta = context.data?.facilityMeta;
  const displayName = profile?.full_name || profile?.first_name || 'Lab operator';

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) navigate('/auth/login', { replace: true });
  };

  // Layouts where the page should fill the main area without padding (queue, results editor, etc.)
  const fullBleedPages: LabPage[] = ['queue', 'orders', 'imaging-queue', 'imaging-orders', 'imaging-equipment', 'equipment', 'imaging-reports', 'results'];
  const isFullBleed = fullBleedPages.includes(page);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden bg-[#0f2d4a] text-white transition-all duration-300 ${
          collapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-200">
            <FlaskConical className="h-5 w-5" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="font-['Plus_Jakarta_Sans'] text-base font-bold leading-tight">CeenAiX</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-200">Lab & Radiology Portal</div>
            </div>
          ) : null}
          <button type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="ml-auto rounded-lg p-1 text-indigo-200 transition hover:bg-white/10"
            aria-label="Collapse lab sidebar"
          >
            <ChevronLeft className={`h-4 w-4 transition ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {!collapsed ? (
          <div className="mx-3 my-3 rounded-xl border border-white/5 bg-black/20 p-3">
            <div className="text-[13px] font-bold leading-snug">{facility?.name ?? 'Lab facility not assigned'}</div>
            {meta?.arabicName ? (
              <div className="text-[11px] text-indigo-100" dir="rtl">{meta.arabicName}</div>
            ) : null}
            {facility?.address || facility?.city ? (
              <div className="text-[10px] text-indigo-200/90">
                {[facility?.address, facility?.city].filter(Boolean).join(' · ')} · DHA Licensed ✅
              </div>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">DHA Lab ✅</span>
              <span className="rounded bg-blue-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-100">DHA Radiology ✅</span>
            </div>
            <div className="mt-2 text-[10px] text-indigo-200">{displayName} · Day Shift</div>
          </div>
        ) : null}

        <nav className="flex-1 space-y-3 overflow-y-auto px-2 pb-2">
          {sections.map((section) => (
            <div key={section.label}>
              {!collapsed ? (
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-300/80">
                  {section.label}
                </div>
              ) : null}
              <div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href || (page === item.page && location.pathname.startsWith('/lab/'));
                  return (
                    <button type="button"
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-all ${
                        isActive
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                      } ${collapsed ? 'justify-center' : ''}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed ? <span className="flex-1 text-xs font-medium">{item.label}</span> : null}
                      {!collapsed && item.badge !== undefined && item.badge !== 0 ? (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badgeClass(item.badgeTone)}`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-2 pb-3 pt-2">
          {!collapsed ? (
            <div className="mx-1 mb-3 rounded-xl border border-white/5 bg-black/20 p-3 text-[11px] text-indigo-100">
              <div>
                <span className="font-['DM_Mono'] text-white">{formatNumber(context.data?.metrics.sampleCountToday)}</span> samples ·{' '}
                <span className="font-['DM_Mono'] text-white">{formatNumber(context.data?.metrics.completedToday)}</span> complete
              </div>
              <div>
                <span className="font-['DM_Mono'] text-white">{formatNumber(context.data?.metrics.studyCountToday)}</span> studies ·{' '}
                <span className="font-['DM_Mono'] text-white">{formatNumber(context.data?.metrics.radiologyReports)}</span> reported
              </div>
              <div className="text-red-200">{formatNumber(context.data?.metrics.criticalUnnotified)} critical unnotified</div>
              <div className="text-violet-200">{formatNumber(context.data?.metrics.nabidhPending)} NABIDH pending</div>
              <div className="mt-1 text-[10px] text-indigo-300/70">v2.4.1 · Production</div>
            </div>
          ) : null}
          <button type="button"
            onClick={() => void handleSignOut()}
            className={`flex w-full items-center rounded-xl px-3 py-2 text-red-200 transition hover:bg-red-500/10 ${
              collapsed ? 'justify-center' : 'gap-3'
            }`}
            style={collapsed ? undefined : { background: 'rgba(239, 68, 68, 0.1)' }}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed ? <span className="text-sm font-semibold">Sign Out</span> : null}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageHeader page={page} context={context} />

        <main className="flex-1 overflow-hidden">
          {context.error ? (
            <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
              Failed to load lab operations data: {context.error}
            </div>
          ) : null}
          {isFullBleed ? (
            <div className="h-full">{children}</div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="flex min-h-full flex-col gap-4 bg-slate-50 p-5">{children}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export const useLabContext = (): LabPageContext => {
  const { user } = useAuth();
  const query = useLabOpsPortal(user?.id ?? null);
  const actions = useLabOpsActions(query.refetch);
  return {
    data: query.data ?? null,
    loading: query.loading,
    error: query.error,
    refresh: query.refetch,
    actions,
  };
};
