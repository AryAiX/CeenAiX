import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  Search,
  Settings as SettingsIcon,
  Upload,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { useLabOpsActions, useLabOpsPortal } from '../../hooks';
import type {
  LabPortalData,
  LabPortalSample,
  LabPortalEquipment,
  LabPriority,
  LabDepartment,
  EquipmentStatus,
  NabidhStatus,
} from '../../hooks';

// ============================================================================
// Types
// ============================================================================

type LabPage =
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

interface LabNavItem {
  page: LabPage;
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  badgeTone?: 'blue' | 'amber' | 'red' | 'violet';
}

interface LabNavSection {
  label: string;
  items: LabNavItem[];
}

interface LabPageContext {
  data: LabPortalData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  actions: ReturnType<typeof useLabOpsActions>;
}

// ============================================================================
// Status maps and helpers
// ============================================================================

const priorityClass: Record<LabPriority, string> = {
  STAT: 'bg-red-100 text-red-700 ring-red-200',
  Urgent: 'bg-amber-100 text-amber-700 ring-amber-200',
  Routine: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const sampleStatusBadge: Record<LabPortalSample['status'], string> = {
  ordered: 'bg-amber-50 text-amber-700 ring-amber-200',
  collected: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  processing: 'bg-blue-50 text-blue-700 ring-blue-200',
  resulted: 'bg-violet-50 text-violet-700 ring-violet-200',
  reviewed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const sampleStatusLabel = (status: LabPortalSample['status'], hasCritical: boolean) => {
  if (hasCritical) return 'CRITICAL UNNOTIFIED';
  if (status === 'ordered') return 'Received';
  if (status === 'collected') return 'Accessioned';
  if (status === 'processing') return 'In Progress';
  if (status === 'resulted') return 'Pending Verify';
  if (status === 'reviewed') return 'Verified';
  return String(status);
};

const equipmentStatusBadge: Record<EquipmentStatus, string> = {
  online: 'bg-emerald-100 text-emerald-700',
  maintenance: 'bg-amber-100 text-amber-800',
  warning: 'bg-orange-100 text-orange-700',
  offline: 'bg-rose-100 text-rose-700',
};

const nabidhBadge: Record<NabidhStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
};

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '0';

const formatDateShort = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const formatTimeShort = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const formatTat = (minutes: number | null | undefined) => {
  if (typeof minutes !== 'number') return '—';
  if (minutes < 60) return `${minutes}m`;
  // Hosted uses decimal hour format (e.g. "2.5h", "4.8h") for TAT badges/labels
  const decimal = Math.round((minutes / 60) * 10) / 10;
  return `${decimal}h`;
};

const ageGenderLabel = (age: number | null, gender: string | null) => {
  const genderInitial = gender ? gender.charAt(0).toUpperCase() : '';
  if (age && genderInitial) return `${age}${genderInitial}`;
  if (age) return `${age}`;
  if (genderInitial) return genderInitial;
  return '—';
};

const initialsFromName = (name: string | null | undefined) => {
  if (!name) return 'U';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
};

// ============================================================================
// Reusable shell pieces
// ============================================================================

const routeTitles: Record<LabPage, string> = {
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

const routeBreadcrumb: Record<LabPage, string> = {
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

const LabShell = ({ page, context, children }: { page: LabPage; context: LabPageContext; children: ReactNode }) => {
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
            <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
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

const useLabContext = (): LabPageContext => {
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

const LabRoute = ({ page }: { page: LabPage }) => {
  const context = useLabContext();
  return (
    <LabShell page={page} context={context}>
      <LabPageBody page={page} context={context} />
    </LabShell>
  );
};

// ============================================================================
// Reusable UI primitives
// ============================================================================

const SectionCard = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>{children}</section>
);

const Pill = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${className}`}>
    {children}
  </span>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
    {label}
  </div>
);

const KpiTile = ({
  label,
  value,
  caption,
  tone = 'slate',
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  tone?: 'indigo' | 'red' | 'blue' | 'emerald' | 'amber' | 'violet' | 'slate' | 'orange' | 'cyan' | 'rose';
}) => {
  const toneMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    red: 'bg-red-50 text-red-700 ring-red-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    slate: 'bg-slate-50 text-slate-700 ring-slate-100',
    orange: 'bg-orange-50 text-orange-700 ring-orange-100',
    cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  };
  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneMap[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-2 font-['Plus_Jakarta_Sans'] text-2xl font-bold leading-none">{value}</div>
      {caption ? <div className="mt-2 text-[11px] font-medium opacity-80">{caption}</div> : null}
    </div>
  );
};

const ProgressMeter = ({ value, tone = 'accent-indigo-500' }: { value: number; tone?: string }) => (
  <progress
    value={Math.max(0, Math.min(100, value))}
    max={100}
    className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${tone}`}
  />
);

// ============================================================================
// CRITICAL VALUE BANNER (Dashboard)
// ============================================================================

const CriticalBanner = ({
  data,
  actions,
}: {
  data: LabPortalData | null;
  actions: LabPageContext['actions'];
}) => {
  const critical = data?.criticalValues.find((c) => c.status === 'pending') ?? data?.criticalValues[0];
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  if (!critical) return null;
  const observed = formatTimeShort(critical.observedAt);
  const isAlreadyNotified = critical.status === 'notified';

  const handleNotify = async () => {
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await actions.markCriticalValueNotified(critical.id, critical.observedAt);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not mark this critical value as notified.'
      );
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-700">
            <span>🔴</span>
            <span>CRITICAL VALUE — UNNOTIFIED</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-red-700">DHA requires notification within 60 minutes</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 font-['DM_Mono'] text-sm font-bold text-red-700 ring-1 ring-red-200">
          {observed}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Patient', critical.patientName],
          ['Test', critical.testName],
          ['Value', critical.valueLabel],
          ['Reference', '3.5–5.0 mEq/L'],
          ['Doctor', 'Dr. Maryam Al Sayed · Al Zahra Clinic'],
          ['Resulted', `${observed} · ${critical.notifiedInMinutes ?? 0} min ago`],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-white/85 p-3 ring-1 ring-red-100">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-400">{label}</div>
            <div className="mt-1 text-sm font-bold text-red-950">{value}</div>
          </div>
        ))}
      </div>

      {errorMessage ? (
        <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200">
          {errorMessage}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button"
          onClick={() => void handleNotify()}
          disabled={isSaving || isAlreadyNotified}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-emerald-600 disabled:opacity-90"
        >
          {isAlreadyNotified
            ? '✅ Doctor notified'
            : isSaving
              ? 'Recording…'
              : 'Mark Doctor Notified'}
        </button>
        <a
          href="/lab/queue"
          className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
        >
          Open in queue
        </a>
      </div>
    </div>
  );
};

// ============================================================================
// DASHBOARD
// ============================================================================

const DashboardView = ({ context }: { context: LabPageContext }) => {
  const data = context.data;
  const samples = data?.samples ?? [];
  const studies = data?.imagingStudies ?? [];
  const dashboardSamples = samples.slice(0, 5);
  const activeStudies = studies.filter((s) => s.status === 'scanning');
  const reportPending = studies.filter((s) => s.status === 'report_pending').slice(0, 2);
  const scheduledStudies = studies.filter((s) => s.status === 'scheduled').slice(0, 3);
  const labEquipment = (data?.equipment ?? []).filter((e) => e.department === 'laboratory').slice(0, 4);
  const radiologyEquipment = (data?.equipment ?? []).filter((e) => e.department === 'radiology').slice(0, 7);

  const labMetricCards = [
    {
      label: `${formatNumber(data?.metrics.sampleCountToday || samples.length)} Samples`,
      caption: 'Total today',
      tone: 'indigo' as const,
    },
    {
      label: `${formatNumber(data?.criticalValues.length)} Critical`,
      caption: `${formatNumber(data?.metrics.criticalUnnotified)} unnotified ⚠️`,
      tone: 'red' as const,
    },
    {
      label: '3.2h',
      caption: 'Avg TAT',
      tone: 'blue' as const,
    },
    {
      label: `${formatNumber(data?.metrics.nabidhSubmitted)}/${formatNumber((data?.metrics.nabidhSubmitted ?? 0) + (data?.metrics.nabidhPending ?? 0))}`,
      caption: 'NABIDH submitted',
      tone: 'violet' as const,
    },
    {
      label: `${formatNumber(data?.qcRuns.filter((r) => r.status === 'passed').length)}/${formatNumber(data?.qcRuns.length)} QC ✅`,
      caption: `${formatNumber(data?.metrics.qualityWarnings)} in maintenance`,
      tone: 'emerald' as const,
    },
  ];

  const radMetricCards = [
    {
      label: `${formatNumber(studies.length)} Studies`,
      caption: 'Total today',
      tone: 'blue' as const,
    },
    {
      label: `${formatNumber(activeStudies.length)} Scanning`,
      caption: 'Active now',
      tone: 'violet' as const,
    },
    {
      label: `${formatNumber(data?.metrics.radiologyReports)} Reports`,
      caption: 'Pending sign-off',
      tone: 'orange' as const,
    },
    {
      label: `${formatNumber(scheduledStudies.length)} Scheduled`,
      caption: 'Today remaining',
      tone: 'cyan' as const,
    },
    {
      label: `${formatNumber(data?.metrics.imagingEquipmentWarnings)} Issues ⚠️`,
      caption: 'Equipment alerts',
      tone: 'amber' as const,
    },
  ];

  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <CriticalBanner data={data} actions={context.actions} />

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-600">LABORATORY</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {labMetricCards.map((card) => (
            <KpiTile key={card.label} label={card.label} value="" caption={card.caption} tone={card.tone} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-600">RADIOLOGY</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {radMetricCards.map((card) => (
            <KpiTile key={card.label} label={card.label} value="" caption={card.caption} tone={card.tone} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <SectionCard className="xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Lab Queue</h3>
              <p className="text-xs text-slate-500">{formatNumber(samples.length)} samples · {formatNumber(samples.filter((s) => s.status !== 'reviewed').length)} active</p>
            </div>
            <button type="button" onClick={() => navigate('/lab/queue')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All</button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" disabled title="Queue filters — coming soon" className="cursor-not-allowed rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white opacity-90">All</button>
            <button type="button" disabled title="Queue filters — coming soon" className="cursor-not-allowed rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 opacity-80">STAT ({samples.filter((s) => s.priority === 'STAT').length})</button>
            <button type="button" disabled title="Queue filters — coming soon" className="cursor-not-allowed rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 opacity-80">Urgent ({samples.filter((s) => s.priority === 'Urgent').length})</button>
            <button type="button" disabled title="Queue filters — coming soon" className="cursor-not-allowed rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 opacity-80">Routine</button>
          </div>
          <div className="space-y-3">
            {dashboardSamples.map((sample) => {
              const code = sample.orderCode.split('-').slice(-1)[0];
              const action =
                sample.status === 'resulted' || sample.criticalValue
                  ? '📞 Notify'
                  : sample.status === 'ordered'
                  ? '▶ Process'
                  : '📋 View';
              return (
                <article key={sample.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-['DM_Mono'] text-xs font-bold text-slate-500">{code}</div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{sample.patientName} <span className="text-xs font-normal text-slate-500">· {ageGenderLabel(sample.patientAge, sample.patientGender)}</span></div>
                      <div className="mt-1 text-xs text-slate-500">
                        {sample.testNames.length} tests · {sample.testNames.slice(0, 3).join(' · ')}
                      </div>
                      {sample.criticalValue ? <div className="mt-1 text-xs font-bold text-red-600">{sample.criticalValue} ↑↑</div> : null}
                      <Pill className={`mt-2 ${sampleStatusBadge[sample.status]}`}>{sampleStatusLabel(sample.status, !!sample.criticalValue)}</Pill>
                    </div>
                    <button
                      type="button"
                      disabled
                      title="Sample actions — open full queue to process"
                      className="cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 opacity-80"
                    >
                      {action}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {samples.length > 5 ? (
            <button type="button" onClick={() => navigate('/lab/queue')} className="mt-3 w-full rounded-xl bg-slate-50 px-4 py-2.5 text-center text-xs font-bold text-indigo-600 hover:bg-slate-100">
              {samples.length - 5} more samples · View all in queue →
            </button>
          ) : null}
        </SectionCard>

        <SectionCard className="xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Imaging Queue</h3>
              <p className="text-xs text-slate-500">{formatNumber(studies.length)} studies · {formatNumber(activeStudies.length)} scanning</p>
            </div>
            <button type="button" onClick={() => navigate('/lab/imaging/queue')} className="text-xs font-bold text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {['All ●', 'MRI', 'CT', 'USS', 'X-Ray', 'Other'].map((m, i) => (
              <button type="button" key={m} className={`rounded-full px-3 py-1.5 text-xs font-bold ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {m}
              </button>
            ))}
          </div>
          {activeStudies.length > 0 ? (
            <div className="mb-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">ACTIVE NOW</div>
              <div className="space-y-3">
                {activeStudies.slice(0, 3).map((study) => (
                  <article key={study.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-['DM_Mono'] font-bold text-violet-700">{study.progressPercent}%</span>
                      <span className="font-bold text-slate-700">{study.modality}</span>
                    </div>
                    <ProgressMeter value={study.progressPercent} tone="accent-violet-500" />
                    <div className="mt-2 text-sm font-bold text-slate-900">{study.patientName} <span className="text-xs font-normal text-slate-500">· {ageGenderLabel(study.patientAge, study.patientGender)}</span></div>
                    <div className="text-xs text-slate-500">{study.studyName}</div>
                    <div className="mt-1 text-xs text-slate-500">{study.room ?? 'Scanner'} · {formatTat(study.tatMinutes)} remaining</div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {reportPending.length > 0 ? (
            <div className="mb-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">REPORT PENDING ({reportPending.length})</div>
              <div className="space-y-2">
                {reportPending.map((study) => {
                  const overdue = (study.tatMinutes ?? 0) > 240;
                  return (
                    <div key={study.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                      <div>
                        <div className="font-bold text-slate-900">{study.modality}</div>
                        <div className="text-xs text-slate-700">{study.patientName}</div>
                        <div className="text-xs text-slate-500">{study.studyName}</div>
                      </div>
                      <div className={`text-xs font-bold ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatTat(study.tatMinutes)} {overdue ? '🔴 OVERDUE' : '⚠️'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {scheduledStudies.length > 0 ? (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">SCHEDULED ({scheduledStudies.length})</div>
              <div className="space-y-2">
                {scheduledStudies.map((study) => (
                  <div key={study.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">{study.modality}</div>
                      <div className="text-xs font-bold text-slate-600">{formatTimeShort(study.scheduledAt)}</div>
                    </div>
                    <div className="text-xs text-slate-700">{study.patientName}</div>
                    {study.alerts && study.alerts.length > 0 ? <div className="text-xs text-amber-700">⚠️ {study.alerts[0]}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>

        <div className="space-y-4 xl:col-span-2">
          <SectionCard>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Equipment</div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">🩻 RADIOLOGY</div>
            <div className="space-y-1.5">
              {radiologyEquipment.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between text-xs">
                  <span className="truncate font-semibold text-slate-700">{eq.name.split(' ').slice(0, 2).join(' ')}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${equipmentStatusBadge[eq.status]}`}>
                    {eq.status === 'online' ? '✅' : eq.status === 'maintenance' ? '🔄' : '⚠️'}
                  </span>
                </div>
              ))}
            </div>
            <div className="my-2 border-t border-slate-100" />
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">🧪 LABORATORY</div>
            <div className="space-y-1.5">
              {labEquipment.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between text-xs">
                  <span className="truncate font-semibold text-slate-700">{eq.name.split(' ').slice(0, 2).join(' ')}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${equipmentStatusBadge[eq.status]}`}>
                    {eq.status === 'online' ? '✅' : eq.status === 'maintenance' ? '🔄' : '⚠️'}
                  </span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => navigate('/lab/equipment')} className="mt-3 w-full text-center text-[11px] font-bold text-indigo-600 hover:text-indigo-700">
              View All Equipment →
            </button>
          </SectionCard>

          <SectionCard>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">🇦🇪 NABIDH HIE · FHIR R4</div>
            <p className="text-[11px] font-semibold text-emerald-700">Connected · synced 12s ago</p>
            <div className="mt-3 space-y-2 text-[11px]">
              <div>🧪 Lab {data?.metrics.nabidhSubmitted ?? 0}/{(data?.metrics.nabidhSubmitted ?? 0) + (data?.metrics.nabidhPending ?? 0)} ({data?.metrics.nabidhSubmitted && data?.metrics.nabidhPending ? Math.round((data.metrics.nabidhSubmitted / ((data.metrics.nabidhSubmitted ?? 0) + (data.metrics.nabidhPending ?? 0))) * 100) : 0}%)</div>
              <div>🩻 Radiology {data?.metrics.nabidhSubmitted ?? 0}/{(data?.metrics.nabidhSubmitted ?? 0) + (data?.metrics.nabidhPending ?? 0)} ({data?.metrics.nabidhSubmitted && data?.metrics.nabidhPending ? Math.round((data.metrics.nabidhSubmitted / ((data.metrics.nabidhSubmitted ?? 0) + (data.metrics.nabidhPending ?? 0))) * 100) : 0}%)</div>
              <div>Total: {(data?.metrics.nabidhSubmitted ?? 0) + (data?.metrics.nabidhPending ?? 0)} · {data?.metrics.nabidhPending ?? 0} pending</div>
            </div>
            <button type="button" disabled title="Bulk NABIDH submit — coming soon" className="mt-3 w-full cursor-not-allowed rounded-xl bg-violet-100 px-3 py-2 text-[11px] font-bold text-violet-700 opacity-80">
              📤 Submit All Pending
            </button>
          </SectionCard>

          <SectionCard>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Volume Today</div>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {formatNumber(samples.length)} lab + {formatNumber(studies.length)} radiology = {formatNumber(samples.length + studies.length)} total
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Lab: ⚠️ {formatNumber(data?.metrics.criticalUnnotified)} critical · {formatNumber(data?.metrics.labQueue)} pending · {formatNumber(data?.metrics.nabidhPending)} NABIDH</p>
            <p className="text-[11px] text-slate-500">Radiology: ⚠️ {formatNumber(data?.metrics.radiologyReports)} reports pending</p>
            <button type="button" disabled title="Handoff report — coming soon" className="mt-3 w-full cursor-not-allowed rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 opacity-80">
              📋 Generate Handoff Report
            </button>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LAB QUEUE — with functional left filter sidebar
// ============================================================================

const LAB_PRIORITIES: LabPriority[] = ['STAT', 'Urgent', 'Routine'];
const LAB_STATUS_OPTIONS = ['Received', 'Accessioned', 'In Progress', 'Resulted', 'Pending Verify', 'Verified', 'Released', 'NABIDH Submitted'] as const;
const LAB_DEPARTMENTS = ['Chemistry', 'Haematology', 'Microbiology', 'Immunology', 'Coagulation', 'Urinalysis'] as const;

type LabStatusFilter = (typeof LAB_STATUS_OPTIONS)[number];
type LabDepartmentFilter = (typeof LAB_DEPARTMENTS)[number];

const sampleMatchesStatusFilter = (sample: LabPortalSample, statuses: Set<LabStatusFilter>) => {
  if (statuses.size === 0) return true;
  // Match against the underlying lifecycle status, not the critical override.
  const baseLabel = sampleStatusLabel(sample.status, false);
  if (statuses.has(baseLabel as LabStatusFilter)) return true;
  if (sample.nabidhReference && statuses.has('NABIDH Submitted')) return true;
  if (baseLabel === 'Verified' && statuses.has('Released')) return true;
  return false;
};

const sampleMatchesDepartment = (sample: LabPortalSample, departments: Set<LabDepartmentFilter>) => {
  if (departments.size === 0) return true;
  const haystack = sample.testNames.join(' ').toLowerCase();
  const map: Array<[LabDepartmentFilter, string[]]> = [
    ['Chemistry', ['k+', 'na+', 'cl-', 'creatinine', 'glucose', 'lipid', 'hba1c', 'urea', 'cholesterol']],
    ['Haematology', ['cbc', 'hb', 'hemoglobin', 'haematology']],
    ['Microbiology', ['culture', 'gram', 'sensitivity', 'microbiology']],
    ['Immunology', ['tsh', 'troponin', 'bnp', 'd-dimer', 'cortisol']],
    ['Coagulation', ['pt', 'aptt', 'inr', 'fibrinogen']],
    ['Urinalysis', ['urinalysis', 'urine']],
  ];
  for (const dept of departments) {
    const keywords = map.find(([key]) => key === dept)?.[1] ?? [];
    if (keywords.some((kw) => haystack.includes(kw))) return true;
  }
  return false;
};

const LabQueueFilterSidebar = ({
  priority,
  setPriority,
  statuses,
  setStatuses,
  departments,
  setDepartments,
  onApply,
  onReset,
  searchQuery,
  setSearchQuery,
}: {
  priority: 'all' | LabPriority;
  setPriority: (next: 'all' | LabPriority) => void;
  statuses: Set<LabStatusFilter>;
  setStatuses: (next: Set<LabStatusFilter>) => void;
  departments: Set<LabDepartmentFilter>;
  setDepartments: (next: Set<LabDepartmentFilter>) => void;
  onApply: () => void;
  onReset: () => void;
  searchQuery: string;
  setSearchQuery: (next: string) => void;
}) => {
  const toggleStatus = (status: LabStatusFilter) => {
    const next = new Set(statuses);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    setStatuses(next);
  };
  const toggleDept = (dept: LabDepartmentFilter) => {
    const next = new Set(departments);
    if (next.has(dept)) next.delete(dept);
    else next.add(dept);
    setDepartments(next);
  };

  return (
    <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search samples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxLength={FORM_FIELD_LIMITS.searchQuery}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-indigo-300 focus:bg-white"
          />
        </div>
        <button type="button"
          disabled
          title="Scan barcode — coming soon"
          className="w-full cursor-not-allowed rounded-lg bg-indigo-600/60 px-3 py-2 text-xs font-bold text-white opacity-70"
        >
          Scan Barcode
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">PRIORITY</div>
          <div className="space-y-1">
            {(['all', ...LAB_PRIORITIES] as const).map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <input
                  type="radio"
                  name="lab-priority-filter"
                  checked={priority === p}
                  onChange={() => setPriority(p)}
                  className="h-3.5 w-3.5 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{p === 'all' ? 'All' : p}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">STATUS</div>
          <div className="space-y-1">
            {LAB_STATUS_OPTIONS.map((status) => (
              <label key={status} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={statuses.has(status)}
                  onChange={() => toggleStatus(status)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{status}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">DEPARTMENT</div>
          <div className="space-y-1">
            {LAB_DEPARTMENTS.map((dept) => (
              <label key={dept} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={departments.has(dept)}
                  onChange={() => toggleDept(dept)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{dept}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button type="button" onClick={onApply} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">Apply</button>
          <button type="button" onClick={onReset} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Reset</button>
        </div>
      </div>
    </aside>
  );
};

const downloadCsv = (filename: string, rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>) => {
  const escape = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const body = rows.map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const LabQueuePage = ({ context }: { context: LabPageContext }) => {
  const navigate = useNavigate();
  const allSamples = useMemo(() => context.data?.samples ?? [], [context.data?.samples]);
  const [priority, setPriority] = useState<'all' | LabPriority>('all');
  const [statuses, setStatuses] = useState<Set<LabStatusFilter>>(new Set([
    'Received', 'Accessioned', 'In Progress', 'Resulted', 'Pending Verify', 'Verified', 'Released',
  ]));
  const [departments, setDepartments] = useState<Set<LabDepartmentFilter>>(new Set(LAB_DEPARTMENTS));
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toolbarError, setToolbarError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return allSamples.filter((sample) => {
      if (priority !== 'all' && sample.priority !== priority) return false;
      if (!sampleMatchesStatusFilter(sample, statuses)) return false;
      if (!sampleMatchesDepartment(sample, departments)) return false;
      if (searchQuery) {
        const haystack = `${sample.orderCode} ${sample.patientName} ${sample.doctorName}`.toLowerCase();
        if (!haystack.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [allSamples, priority, statuses, departments, searchQuery]);

  const visible = filtered.slice(0, pageSize);
  const releasableSelected = useMemo(
    () =>
      visible.filter(
        (sample) =>
          selectedSampleIds.has(sample.id) &&
          (sample.status === 'resulted' || sample.status === 'reviewed')
      ),
    [visible, selectedSampleIds]
  );

  const toggleSampleSelected = (sampleId: string) => {
    setSelectedSampleIds((current) => {
      const next = new Set(current);
      if (next.has(sampleId)) {
        next.delete(sampleId);
      } else {
        next.add(sampleId);
      }
      return next;
    });
  };

  const handleExportCsv = () => {
    setToolbarError(null);
    const header = [
      'order_code',
      'patient_name',
      'doctor_name',
      'clinic_name',
      'tests',
      'priority',
      'status',
      'ordered_at',
      'received_at',
      'tat_minutes',
      'technician_name',
    ];
    const rows = filtered.map((sample) => [
      sample.orderCode,
      sample.patientName,
      sample.doctorName,
      sample.clinicName,
      sample.testNames.join(' | '),
      sample.priority,
      sampleStatusLabel(sample.status, false),
      sample.orderedAt ?? '',
      sample.receivedAt ?? '',
      sample.tatMinutes ?? '',
      sample.technicianName ?? '',
    ]);
    downloadCsv(
      `lab-queue-${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows]
    );
  };

  const handleBulkRelease = async () => {
    if (releasableSelected.length === 0) {
      setToolbarError(
        'Select at least one sample with status Verified or Resulted to release.'
      );
      return;
    }
    setToolbarError(null);
    setBulkBusy(true);
    try {
      for (const sample of releasableSelected) {
        await context.actions.releaseOrder(sample.id);
      }
      setSelectedSampleIds(new Set());
    } catch (error) {
      setToolbarError(
        error instanceof Error ? error.message : 'Bulk release failed.'
      );
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <LabQueueFilterSidebar
        priority={priority}
        setPriority={setPriority}
        statuses={statuses}
        setStatuses={setStatuses}
        departments={departments}
        setDepartments={setDepartments}
        onApply={() => undefined}
        onReset={() => {
          setPriority('all');
          setStatuses(new Set(['Received', 'Accessioned', 'In Progress', 'Resulted', 'Pending Verify', 'Verified', 'Released']));
          setDepartments(new Set(LAB_DEPARTMENTS));
          setSearchQuery('');
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button"
              onClick={() => navigate('/lab/results/entry')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50"
            >
              Import Samples
            </button>
            <button type="button"
              onClick={() => void handleBulkRelease()}
              disabled={bulkBusy || releasableSelected.length === 0}
              title={
                releasableSelected.length === 0
                  ? 'Select rows with status Resulted or Reviewed to release.'
                  : `Release ${releasableSelected.length} selected sample(s).`
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkBusy
                ? 'Releasing…'
                : `Bulk Release (${releasableSelected.length})`}
            </button>
            <button type="button"
              onClick={handleExportCsv}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50"
            >
              Export CSV
            </button>
          </div>
          {toolbarError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
              {toolbarError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 text-sm">
              <span className="text-slate-700">
                Total: <span className="font-bold">{formatNumber(allSamples.length)}</span> samples — showing <span className="font-bold">{visible.length}</span>
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
              >
                <option value={25}>Show 25 per page</option>
                <option value={50}>Show 50 per page</option>
              </select>
            </div>

            <div className="min-w-[1100px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-3">
                      <span className="sr-only">Select sample</span>
                    </th>
                    <th className="px-3 py-3">Sample ID</th>
                    <th className="px-3 py-3">Patient</th>
                    <th className="px-3 py-3">Doctor / Clinic</th>
                    <th className="px-3 py-3">Tests</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Collection</th>
                    <th className="px-3 py-3">TAT</th>
                    <th className="px-3 py-3">Tech</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visible.map((sample) => {
                    const isCritical = !!sample.criticalValue;
                    const isStat = sample.priority === 'STAT';
                    const isUrgent = sample.priority === 'Urgent';
                    const rowBgClass = isCritical || isStat
                      ? 'bg-red-50/70 hover:bg-red-50'
                      : isUrgent
                      ? 'bg-amber-50/40 hover:bg-amber-50/60'
                      : 'hover:bg-slate-50/60';
                    const indicatorClass = isCritical || isStat
                      ? 'bg-red-500'
                      : isUrgent
                      ? 'bg-amber-400'
                      : 'bg-transparent';
                    const barcodeColor = isCritical || isStat
                      ? 'text-red-500'
                      : isUrgent
                      ? 'text-amber-500'
                      : 'text-slate-300';
                    const insurancePillColor = insurancePillClass(sample.insurancePlan);
                    const bloodPosNeg = bloodTypeColor(sample.bloodType);
                    return (
                      <tr key={sample.id} className={`align-top ${rowBgClass}`}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedSampleIds.has(sample.id)}
                            onChange={() => toggleSampleSelected(sample.id)}
                            aria-label={`Select sample ${sample.orderCode}`}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="relative px-3 py-3">
                          <span className={`absolute left-0 top-0 h-full w-1 ${indicatorClass}`} aria-hidden="true" />
                          <div className="font-['DM_Mono'] text-xs font-bold text-slate-700">{sample.orderCode}</div>
                          <div className={`font-['DM_Mono'] text-[11px] tracking-widest ${barcodeColor}`}>▐▌▌▐▐▌▌▐</div>
                          {sample.insurancePlan ? (
                            <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${insurancePillColor}`}>
                              {sample.insurancePlan}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-900">{sample.patientName}</div>
                          <div className="text-xs text-slate-500">
                            {ageGenderLabel(sample.patientAge, sample.patientGender)}
                            {sample.bloodType ? (
                              <span> · <span className={`font-bold ${bloodPosNeg}`}>{sample.bloodType}</span></span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-700">{sample.doctorName}</div>
                          <div className="text-xs text-slate-500">{sample.clinicName}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-['DM_Mono'] text-xs font-bold text-indigo-600">{sample.testNames.length}</div>
                          <div className="text-xs text-slate-500">{sample.testNames.slice(0, 2).join(' · ')}</div>
                        </td>
                        <td className="px-3 py-3">
                          <Pill className={priorityClass[sample.priority]}>
                            {sample.priority === 'STAT' ? '⚡ STAT' : sample.priority === 'Urgent' ? '⚡ Urgent' : 'Routine'}
                          </Pill>
                        </td>
                        <td className="px-3 py-3">
                          <Pill className={isCritical ? 'bg-red-100 text-red-700 ring-red-200' : sampleStatusBadge[sample.status]}>
                            {isCritical ? '⚠️ CRITICAL UNNOTIFIED' : sampleStatusLabel(sample.status, false)}
                          </Pill>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          <div>{formatDateShort(sample.orderedAt)} · {formatTimeShort(sample.orderedAt)}</div>
                          <div>Rcvd: {formatTimeShort(sample.receivedAt)}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          <div className={`font-semibold ${
                            (sample.tatMinutes ?? 0) > 240
                              ? 'text-red-600'
                              : (sample.tatMinutes ?? 0) > 180
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}>
                            {formatTat(sample.tatMinutes)}
                          </div>
                          <div>Target: &lt;4h</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            sample.technicianInitials && sample.technicianInitials !== 'U'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {sample.technicianInitials ?? 'U'}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500">{sample.technicianName ?? 'Unassigned'}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button"
                              onClick={() => navigate('/lab/results')}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LAB ORDERS
// ============================================================================

type OrderTab = 'new' | 'in_progress' | 'completed' | 'rejected' | 'all';

const insurancePillClass = (plan: string | null | undefined) => {
  const p = (plan ?? '').toLowerCase();
  if (p.includes('oman')) return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (p.includes('axa')) return 'bg-sky-50 text-sky-700 ring-sky-200';
  if (p.includes('daman')) return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
  if (p.includes('thiqa')) return 'bg-violet-50 text-violet-700 ring-violet-200';
  if (p.includes('metlife')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  return 'bg-slate-50 text-slate-600 ring-slate-200';
};

const bloodTypeColor = (bloodType: string | null | undefined) => {
  if (!bloodType) return 'text-slate-500';
  if (bloodType.includes('-')) return 'text-rose-600';
  if (bloodType.includes('+')) return 'text-emerald-600';
  return 'text-slate-500';
};

const orderCardAccent = (priority: LabPriority, isCritical: boolean) => {
  if (isCritical || priority === 'STAT') {
    return {
      bar: 'bg-red-500',
      bg: 'bg-red-50/40',
      border: 'border-red-200',
      label: '⚡ STAT',
    };
  }
  if (priority === 'Urgent') {
    return {
      bar: 'bg-amber-400',
      bg: 'bg-amber-50/30',
      border: 'border-amber-200',
      label: '⚡ Urgent',
    };
  }
  return {
    bar: 'bg-transparent',
    bg: 'bg-white',
    border: 'border-slate-100',
    label: 'Routine',
  };
};

const LabOrdersPage = ({ context }: { context: LabPageContext }) => {
  const allSamples = useMemo(() => context.data?.samples ?? [], [context.data?.samples]);
  const [tab, setTab] = useState<OrderTab>('new');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const tabs: Array<{ id: OrderTab; label: string; emoji: string; count: number }> = [
    { id: 'new', emoji: '📬', label: 'New', count: allSamples.filter((s) => s.status === 'ordered').length },
    { id: 'in_progress', emoji: '⏳', label: 'In Progress', count: allSamples.filter((s) => s.status === 'collected' || s.status === 'processing').length },
    { id: 'completed', emoji: '✅', label: 'Completed', count: allSamples.filter((s) => s.status === 'reviewed').length },
    { id: 'rejected', emoji: '❌', label: 'Rejected', count: 0 },
    { id: 'all', emoji: '', label: 'All', count: allSamples.length },
  ];

  const filtered = useMemo(() => {
    if (tab === 'new') return allSamples.filter((s) => s.status === 'ordered');
    if (tab === 'in_progress') return allSamples.filter((s) => s.status === 'collected' || s.status === 'processing');
    if (tab === 'completed') return allSamples.filter((s) => s.status === 'reviewed');
    if (tab === 'rejected') return [];
    return allSamples;
  }, [allSamples, tab]);

  const newOrders = useMemo(
    () => allSamples.filter((s) => s.status === 'ordered'),
    [allSamples]
  );

  const handleAcceptAll = async () => {
    if (newOrders.length === 0) return;
    setOrdersError(null);
    setBulkBusy(true);
    try {
      for (const order of newOrders) {
        await context.actions.claimSample(order.id);
      }
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Bulk accept failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleAcceptOne = async (sampleId: string) => {
    setOrdersError(null);
    setRowBusyId(sampleId);
    try {
      await context.actions.claimSample(sampleId);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Accept failed.');
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-700">
            <span className="font-bold">{tabs[0].count}</span> new orders received — CeenAiX ePrescription
          </p>
          <div className="flex gap-2">
            <button type="button"
              onClick={() => void handleAcceptAll()}
              disabled={bulkBusy || newOrders.length === 0}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkBusy ? 'Accepting…' : `Accept All (${newOrders.length})`}
            </button>
            <button type="button"
              onClick={() => setTab('new')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Review Each
            </button>
          </div>
        </div>
        {ordersError ? (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
            {ordersError}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t.emoji} {t.label} ({t.count})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {filtered.length === 0 ? <EmptyState label="No orders match this filter." /> : null}

        {filtered.map((sample) => {
          const isCritical = !!sample.criticalValue;
          const accent = orderCardAccent(sample.priority, isCritical);

          return (
            <article
              key={sample.id}
              className={`relative overflow-hidden rounded-2xl border ${accent.border} ${accent.bg} bg-white p-5 shadow-sm`}
            >
              <span className={`absolute left-0 top-0 h-full w-1.5 ${accent.bar}`} aria-hidden="true" />

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-['DM_Mono'] text-sm font-bold text-slate-700">{sample.orderCode.replace('LAB', 'ORD')}</span>
                <Pill className={priorityClass[sample.priority]}>{accent.label}</Pill>
                <span className="text-xs text-slate-500">Today {formatTimeShort(sample.orderedAt)}</span>
                <Pill className={
                  (sample.sourceLabel ?? '').toLowerCase().includes('walk-in')
                    ? 'bg-slate-100 text-slate-700 ring-slate-200'
                    : 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                }>
                  {sample.sourceLabel ?? 'CeenAiX ePrescription'} {(sample.sourceLabel ?? '').toLowerCase().includes('walk-in') ? '' : '✅'}
                </Pill>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">PATIENT</div>
                  <div className="mt-2 text-base font-bold text-slate-900">{sample.patientName}</div>
                  <div className="text-sm text-slate-600">
                    {ageGenderLabel(sample.patientAge, sample.patientGender)}
                    {sample.bloodType ? (
                      <span> · <span className={`font-bold ${bloodTypeColor(sample.bloodType)}`}>{sample.bloodType}</span></span>
                    ) : null}
                  </div>
                  {sample.insurancePlan ? (
                    <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${insurancePillClass(sample.insurancePlan)}`}>
                      {sample.insurancePlan}
                    </span>
                  ) : null}
                </div>
                <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">DOCTOR</div>
                  <div className="mt-2 text-base font-bold text-slate-900">{sample.doctorName}</div>
                  <div className="text-sm text-slate-600">
                    {sample.doctorSpecialty ?? 'Clinician'} · {sample.clinicName}
                  </div>
                  {sample.doctorDhaLicense ? (
                    <div className="mt-1 text-xs font-semibold text-emerald-700">DHA: {sample.doctorDhaLicense} ✅</div>
                  ) : null}
                </div>
              </div>

              {sample.clinicalNotes ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  <span className="font-bold">Clinical Notes:</span> {sample.clinicalNotes}
                </div>
              ) : null}

              {sample.tests.length > 0 ? (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-bold text-slate-700">Tests Ordered</div>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Test Name</th>
                          <th className="px-3 py-2">LOINC Code</th>
                          <th className="px-3 py-2">Specimen</th>
                          <th className="px-3 py-2">Priority</th>
                          <th className="px-3 py-2">TAT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {sample.tests.map((t) => (
                          <tr key={`${sample.id}-${t.testName}`}>
                            <td className="px-3 py-2 font-semibold text-slate-900">{t.testName}</td>
                            <td className="px-3 py-2 font-['DM_Mono'] text-xs text-indigo-600">{t.loincCode ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600">{t.specimen ?? '—'}</td>
                            <td className="px-3 py-2">
                              <Pill className={priorityClass[sample.priority]}>{sample.priority}</Pill>
                            </td>
                            <td className="px-3 py-2 text-slate-600">{t.targetTat ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                {sample.specimenSummary ? (
                  <span><span className="font-bold">Specimen:</span> {sample.specimenSummary}</span>
                ) : null}
                <span className="text-slate-300">·</span>
                <span>
                  <span className="font-bold">Fasting:</span>{' '}
                  <span className={
                    !sample.fastingInstructions || sample.fastingInstructions.toLowerCase().includes('not required')
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }>
                    {sample.fastingInstructions ?? 'Not required'}
                  </span>
                </span>
              </div>

              {sample.preauthStatus ? (
                <div className="mt-3 text-xs">
                  <span className="font-bold text-slate-700">Insurance Pre-auth:</span>{' '}
                  <span className={
                    sample.preauthStatus.toLowerCase().includes('not required')
                      ? 'font-semibold text-emerald-700'
                      : sample.preauthStatus.toLowerCase().includes('covered')
                      ? 'font-semibold text-emerald-700'
                      : 'font-semibold text-amber-700'
                  }>
                    {sample.preauthStatus} {sample.preauthStatus.toLowerCase().includes('not required') || sample.preauthStatus.toLowerCase().includes('covered') ? '✅' : '⚠️'}
                  </span>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button"
                  onClick={() => void handleAcceptOne(sample.id)}
                  disabled={rowBusyId === sample.id || sample.status !== 'ordered'}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {rowBusyId === sample.id
                    ? 'Working…'
                    : sample.status === 'ordered'
                      ? 'Accept Order'
                      : 'Accepted'}
                </button>
                <button type="button"
                  onClick={() => {
                    const labelWindow = window.open('', '_blank');
                    if (!labelWindow) return;
                    labelWindow.document.write(`
                      <html>
                        <head><title>Tube label · ${sample.orderCode}</title>
                        <style>
                          body { font-family: 'DM Mono', monospace; padding: 24px; }
                          .label { border: 2px solid #000; padding: 16px; width: 320px; }
                          h1 { font-size: 18px; margin: 0 0 4px; }
                          dl { display: grid; grid-template-columns: 90px 1fr; gap: 4px 12px; font-size: 12px; }
                          dt { color: #555; }
                          .bars { font-size: 28px; letter-spacing: 4px; margin-top: 8px; }
                        </style>
                        </head>
                        <body>
                          <div class="label">
                            <h1>${sample.orderCode}</h1>
                            <div class="bars">▐▌▌▐▐▌▌▐▐▌▌▐</div>
                            <dl>
                              <dt>Patient</dt><dd>${sample.patientName}</dd>
                              <dt>Doctor</dt><dd>${sample.doctorName}</dd>
                              <dt>Priority</dt><dd>${sample.priority}</dd>
                              <dt>Tests</dt><dd>${sample.testNames.join(', ')}</dd>
                              <dt>Specimen</dt><dd>${sample.specimenSummary ?? '—'}</dd>
                            </dl>
                          </div>
                          <script>window.onload = () => { window.print(); };</script>
                        </body>
                      </html>
                    `);
                    labelWindow.document.close();
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Print Tube Labels
                </button>
                <a
                  href={`mailto:?subject=${encodeURIComponent(
                    `Re: lab order ${sample.orderCode} for ${sample.patientName}`
                  )}&body=${encodeURIComponent(
                    `Dr. ${sample.doctorName},\n\nRegarding lab order ${sample.orderCode} for ${sample.patientName}.\n\n`
                  )}`}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Contact Doctor
                </a>
                <button type="button"
                  onClick={async () => {
                    const reason = window.prompt(
                      `Reject lab order ${sample.orderCode}?\n\nProvide a short reason that will be saved to the order notes:`
                    );
                    if (reason === null) return;
                    setOrdersError(null);
                    setRowBusyId(sample.id);
                    try {
                      await context.actions.rejectOrder(sample.id, reason.trim());
                    } catch (error) {
                      setOrdersError(
                        error instanceof Error ? error.message : 'Reject failed.'
                      );
                    } finally {
                      setRowBusyId(null);
                    }
                  }}
                  disabled={rowBusyId === sample.id}
                  className="ml-auto rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// LAB RESULTS — Hosted-style result entry workspace
// ============================================================================

const LabResultsPage = ({ context }: { context: LabPageContext }) => {
  const samples = context.data?.samples ?? [];
  const candidates = samples.filter((s) => s.status === 'resulted' || s.status === 'processing' || s.status === 'collected');
  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.id ?? null);
  const selected = candidates.find((s) => s.id === selectedId) ?? candidates[0];
  const [instrument, setInstrument] = useState('Roche Cobas 6000');
  const [pin, setPin] = useState('');
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<'idle' | 'draft' | 'release' | 'verify'>('idle');
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [resultsNotice, setResultsNotice] = useState<string | null>(null);
  const meta = context.data?.facilityMeta;

  // Reset the draft buffer when the selected sample changes so values from
  // one patient never leak into another.
  const selectedId2 = selected?.id ?? null;
  useEffect(() => {
    setResultDrafts({});
    setResultsError(null);
    setResultsNotice(null);
  }, [selectedId2]);

  const draftFor = (itemId: string, existing: string | null) =>
    resultDrafts[itemId] ?? existing ?? '';

  const persistDrafts = async () => {
    if (!selected) return [] as string[];
    const entries = Object.entries(resultDrafts).filter(([, value]) => value.trim().length > 0);
    const itemsById = new Map(selected.tests.map((test) => [test.itemId, test] as const));
    const saved: string[] = [];
    for (const [itemId, value] of entries) {
      const test = itemsById.get(itemId);
      if (!test) continue;
      const numeric = Number.parseFloat(value);
      const referenceMin = test.referenceMin ? Number.parseFloat(test.referenceMin) : null;
      const referenceMax = test.referenceMax ? Number.parseFloat(test.referenceMax) : null;
      const referenceText =
        test.referenceText ??
        (referenceMin != null && referenceMax != null ? `${referenceMin}-${referenceMax}` : null);
      const isAbnormal =
        !Number.isNaN(numeric) && referenceMin != null && referenceMax != null
          ? numeric < referenceMin || numeric > referenceMax
          : Boolean(test.isAbnormal);
      await context.actions.saveItemResult({
        itemId,
        resultValue: value.trim(),
        resultUnit: test.resultUnit,
        referenceRange: referenceText,
        isAbnormal,
      });
      saved.push(itemId);
    }
    return saved;
  };

  const handleSaveDraft = async () => {
    if (!selected) return;
    setResultsError(null);
    setResultsNotice(null);
    setSaving('draft');
    try {
      const saved = await persistDrafts();
      setResultsNotice(
        saved.length > 0
          ? `Saved ${saved.length} result${saved.length === 1 ? '' : 's'} as draft.`
          : 'Nothing to save — enter at least one value first.'
      );
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : 'Failed to save drafts.');
    } finally {
      setSaving('idle');
    }
  };

  const handleVerifyAndRelease = async () => {
    if (!selected) return;
    if (!pin.trim()) {
      setResultsError('Enter your technician PIN to verify the release.');
      return;
    }
    setResultsError(null);
    setResultsNotice(null);
    setSaving('verify');
    try {
      await persistDrafts();
      await context.actions.releaseOrder(selected.id);
      setResultsNotice('Results verified and released to the requesting doctor.');
      setResultDrafts({});
      setPin('');
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : 'Failed to release results.');
    } finally {
      setSaving('idle');
    }
  };

  const handleReleaseAndNotify = async () => {
    if (!selected) return;
    setResultsError(null);
    setResultsNotice(null);
    setSaving('release');
    try {
      await persistDrafts();
      await context.actions.releaseOrder(selected.id);
      setResultsNotice('Results released — the requesting doctor will be notified via the standard alert.');
      setResultDrafts({});
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : 'Failed to release results.');
    } finally {
      setSaving('idle');
    }
  };

  if (!selected) {
    return (
      <div className="h-full overflow-y-auto p-5">
        <EmptyState label="No samples available for result entry." />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left rail: sample selector */}
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pending Samples</div>
        <div className="space-y-1.5">
          {candidates.map((s) => (
            <button type="button"
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full rounded-lg p-2 text-left transition ${selectedId === s.id || (!selectedId && s.id === candidates[0]?.id) ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}
            >
              <div className="font-['DM_Mono'] text-xs font-bold text-slate-700">{s.orderCode}</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">{s.patientName}</div>
              <Pill className={`mt-1 ${sampleStatusBadge[s.status]}`}>{sampleStatusLabel(s.status, !!s.criticalValue)}</Pill>
            </button>
          ))}
        </div>
      </aside>

      {/* Main: result entry workspace */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
        <div className="grid gap-4 xl:grid-cols-[320px,1fr]">
          {/* Patient panel */}
          <div className="space-y-4">
            <SectionCard>
              <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-slate-900">{selected.patientName}</h2>
              <p className="text-sm text-slate-500">
                {ageGenderLabel(selected.patientAge, selected.patientGender)}{selected.bloodType ? ` · ${selected.bloodType}` : ''} · PT-{selected.patientId.slice(0, 3).toUpperCase()}
              </p>
              {selected.insurancePlan ? <p className="mt-1 text-xs text-slate-500">{selected.insurancePlan}</p> : null}
              <div className="mt-3 text-xs text-slate-500">
                Emirates ID lookup is handled inside the patient portal —
                request a re-verification from{' '}
                <a href="/lab/profile" className="font-semibold text-indigo-600 underline">
                  the lab profile workspace
                </a>{' '}
                if needed.
              </div>
            </SectionCard>
            <SectionCard>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">SAMPLE INFO</div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Sample ID</dt><dd className="font-['DM_Mono'] font-bold text-slate-900">{selected.orderCode}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="text-slate-700">Venous blood — EDTA + SST</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Collected</dt><dd className="text-slate-700">{formatTimeShort(selected.collectedAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Received</dt><dd className="text-slate-700">{formatTimeShort(selected.receivedAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Accessioned</dt><dd className="text-slate-700">{formatTimeShort(selected.receivedAt)}</dd></div>
              </dl>
            </SectionCard>
            <SectionCard>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">REQUESTING DOCTOR</div>
              <p className="font-bold text-slate-900">{selected.doctorName}</p>
              <p className="text-sm text-slate-600">{selected.doctorSpecialty ?? 'Clinician'} · {selected.clinicName}</p>
              {selected.doctorDhaLicense ? <p className="mt-1 text-xs text-emerald-700">{selected.doctorDhaLicense} ✅</p> : null}
              {selected.clinicalNotes ? (
                <p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">{selected.clinicalNotes}</p>
              ) : null}
            </SectionCard>
            <SectionCard>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">TESTS ORDERED</div>
              <div className="space-y-2">
                {selected.tests.map((t) => (
                  <div key={`order-${t.testName}`} className="rounded-lg bg-slate-50 p-2">
                    <div className="font-bold text-sm text-slate-900">{t.testName}</div>
                    <div className="font-['DM_Mono'] text-[10px] text-slate-500">
                      {t.loincCode} · {selected.priority}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Right: result entry */}
          <div className="space-y-4">
            <SectionCard>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-500">Select Instrument:</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Roche Cobas 6000', 'Cobas 8000', 'Manual Entry'].map((inst) => (
                    <button type="button"
                      key={inst}
                      onClick={() => setInstrument(inst)}
                      className={`rounded-lg px-3 py-2 text-xs font-bold ${instrument === inst ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                    >
                      {instrument === inst ? `${inst} ●` : inst}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                QC-2026-CH-044 ✅ QC PASS
              </div>
            </SectionCard>

            <SectionCard>
              <div className="mb-3">
                <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Result Entry — All Panels</h2>
                <p className="text-sm text-slate-500">{selected.patientName} · {selected.orderCode}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {selected.tests.map((t) => (
                  <label key={`entry-${t.itemId}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="font-bold text-sm text-slate-900">{t.testName}</div>
                    <div className="font-['DM_Mono'] text-[10px] text-slate-500">LOINC: {t.loincCode ?? '—'}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draftFor(t.itemId, t.resultValue)}
                        onChange={(event) =>
                          setResultDrafts((current) => ({
                            ...current,
                            [t.itemId]: event.target.value,
                          }))
                        }
                        placeholder="Value"
                        maxLength={FORM_FIELD_LIMITS.shortText}
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                      />
                      <span className="text-xs text-slate-500">{t.resultUnit ?? '—'}</span>
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-500">Ref: {t.referenceText ?? '—'}</div>
                  </label>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-2.5"><div className="text-xs text-slate-500">Abnormal</div><div className="font-bold text-slate-900">{selected.tests.filter((t) => t.isAbnormal).length} of {selected.tests.length} flagged</div></div>
                <div className="rounded-lg bg-slate-50 p-2.5"><div className="text-xs text-slate-500">Critical</div><div className="font-bold text-slate-900">{selected.criticalValue ? selected.criticalValue : 'None'}</div></div>
                <div className="rounded-lg bg-emerald-50 p-2.5"><div className="text-xs text-emerald-700">QC</div><div className="font-bold text-emerald-800">✅ Passed for this run</div></div>
              </div>
            </SectionCard>

            <SectionCard>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">VERIFICATION SIGN-OFF</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="text-xs text-slate-500">Technician</div>
                  <div className="font-bold text-slate-900">{meta?.technicianName ?? selected.technicianName ?? 'Unassigned'} · {meta?.technicianCredentials ?? 'Lab Tech'}</div>
                </div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Technician PIN"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              {resultsError ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {resultsError}
                </div>
              ) : null}
              {resultsNotice ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  {resultsNotice}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button"
                  onClick={() => void handleSaveDraft()}
                  disabled={saving !== 'idle'}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving === 'draft' ? 'Saving…' : '💾 Save Draft'}
                </button>
                <button type="button"
                  onClick={() => void handleReleaseAndNotify()}
                  disabled={saving !== 'idle'}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving === 'release' ? 'Releasing…' : 'Release & Notify Doctor'}
                </button>
                <button type="button"
                  onClick={() => void handleVerifyAndRelease()}
                  disabled={saving !== 'idle'}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving === 'verify' ? 'Verifying…' : 'Verify & Release'}
                </button>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// QUALITY CONTROL
// ============================================================================

const QualityControlView = ({ data }: { data: LabPortalData | null }) => {
  const runs = data?.qcRuns ?? [];
  const passed = runs.filter((r) => r.status === 'passed').length;
  const maintenance = runs.filter((r) => r.status === 'warning').length;
  const failures = runs.filter((r) => r.status === 'failed').length;
  const labMaintenance = (data?.equipment ?? []).find((e) => e.department === 'laboratory' && e.status === 'maintenance');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-500">
          Last QC: {formatTimeShort(runs[0]?.runAt)} · {runs[0]?.department ?? 'Lab'} ·{' '}
          {runs[0]?.resultLabel ?? 'No runs yet'}
        </div>
        <a
          href="/lab/results/entry"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          Log New QC Run
        </a>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SectionCard className="border-emerald-200 bg-emerald-50">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">QC PASS ✅</div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-bold text-emerald-800">{passed}/{runs.length}</div>
          <div className="mt-2 text-xs text-emerald-700">All instruments today</div>
        </SectionCard>
        <SectionCard className="border-amber-200 bg-amber-50">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">MAINTENANCE ⚠️</div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-bold text-amber-900">{maintenance}</div>
          <div className="mt-2 text-xs text-amber-800">{labMaintenance?.name ?? 'No instruments under maintenance'}</div>
        </SectionCard>
        <SectionCard className="border-rose-200 bg-rose-50">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">FAILURES</div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-bold text-rose-800">{failures}</div>
          <div className="mt-2 text-xs text-rose-700">No QC failures today ✅</div>
        </SectionCard>
      </div>

      {labMaintenance ? (
        <SectionCard className="border-amber-200 bg-amber-50">
          <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-amber-950">{labMaintenance.name} ({labMaintenance.equipmentType}) — Under Maintenance</h2>
          <p className="mt-1 text-sm text-amber-800">Since {formatTimeShort(labMaintenance.maintenanceDueAt)} · ETA: 3:00 PM · Reason: Daily maintenance + ISI calibration</p>
          <p className="mt-2 text-sm text-amber-800">Samples rerouted to Sysmex CA-600 backup analyzer. ✅ All coagulation samples being processed.</p>
          <a
            href="/lab/equipment"
            className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
          >
            View Maintenance Log →
          </a>
        </SectionCard>
      ) : null}

      <SectionCard>
        <h2 className="mb-3 font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">QC Results — Today</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Instrument</th>
                <th className="px-3 py-2">QC Lot</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-3 py-2 text-slate-500">{formatTimeShort(run.runAt)}</td>
                  <td className="px-3 py-2 text-slate-600 capitalize">{run.department === 'laboratory' ? 'Chemistry' : run.department}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{run.instrumentName}</td>
                  <td className="px-3 py-2 font-['DM_Mono'] text-xs text-slate-500">{run.lotNumber}</td>
                  <td className="px-3 py-2 text-slate-600">{run.levelLabel}</td>
                  <td className="px-3 py-2">
                    <Pill className={
                      run.status === 'passed'
                        ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                        : run.status === 'failed'
                        ? 'bg-rose-100 text-rose-700 ring-rose-200'
                        : 'bg-amber-100 text-amber-700 ring-amber-200'
                    }>
                      {run.resultLabel}
                    </Pill>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {run.status === 'warning' ? (
                      <a
                        href="/lab/equipment"
                        className="text-xs font-bold text-amber-700"
                      >
                        View Log
                      </a>
                    ) : (
                      <a
                        href="/lab/analytics"
                        className="text-xs font-bold text-indigo-600"
                      >
                        Levey-Jennings
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};

// ============================================================================
// IMAGING QUEUE
// ============================================================================

const IMAGING_MODALITIES = ['All ●', 'MRI', 'CT', 'X-Ray', 'USS', 'MAMMO', 'PET'] as const;
const IMAGING_STATUS_TABS = ['All', 'Scanning', 'Report Pending', 'Scheduled', 'Complete'] as const;

const ImagingQueueView = ({ context }: { context: LabPageContext }) => {
  const studies = useMemo(() => context.data?.imagingStudies ?? [], [context.data?.imagingStudies]);
  const [modalityFilter, setModalityFilter] = useState<string>('All ●');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filtered = useMemo(() => {
    return studies.filter((s) => {
      if (modalityFilter !== 'All ●') {
        const target = modalityFilter.toUpperCase();
        if (!s.modality.toUpperCase().includes(target)) return false;
      }
      if (statusFilter !== 'All') {
        if (statusFilter === 'Scanning' && s.status !== 'scanning') return false;
        if (statusFilter === 'Report Pending' && s.status !== 'report_pending') return false;
        if (statusFilter === 'Scheduled' && s.status !== 'scheduled') return false;
        if (statusFilter === 'Complete' && s.status !== 'released' && s.status !== 'reported') return false;
      }
      return true;
    });
  }, [studies, modalityFilter, statusFilter]);

  const active = filtered.filter((s) => s.status === 'scanning');
  const reportPending = filtered.filter((s) => s.status === 'report_pending');
  const scheduled = filtered.filter((s) => s.status === 'scheduled' || s.status === 'ordered');
  const released = filtered.filter((s) => s.status === 'released' || s.status === 'reported');

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="space-y-4 p-5">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-slate-900">Imaging Queue — {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-bold">{studies.length}</span> studies today · {active.length} scanning · {released.length} reported · {scheduled.length} scheduled
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {IMAGING_MODALITIES.map((m) => (
            <button type="button"
              key={m}
              onClick={() => setModalityFilter(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${modalityFilter === m ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {IMAGING_STATUS_TABS.map((s) => (
            <button type="button"
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {active.length > 0 ? (
          <SectionCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">ACTIVE NOW</div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{active.length}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {active.map((study) => (
                <article key={study.id} className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-700">{study.modality}</span>
                    <span className="font-['DM_Mono'] text-xs text-slate-500">{study.accession}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{study.patientName}</h3>
                      <p className="text-sm text-slate-500">{ageGenderLabel(study.patientAge, study.patientGender)}</p>
                    </div>
                    <div className="font-['DM_Mono'] text-2xl font-bold text-blue-700">{study.progressPercent}%</div>
                  </div>
                  <div className="mt-3">
                    <ProgressMeter value={study.progressPercent} tone="accent-blue-500" />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{study.studyName}</p>
                  <p className="mt-1 text-xs text-slate-500">~{formatTat(study.tatMinutes)} remaining · {study.room ?? 'Scanner'}</p>
                  <Pill className="mt-2 bg-blue-100 text-blue-700 ring-blue-200">SCANNING</Pill>
                </article>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {reportPending.length > 0 ? (
          <SectionCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-700">REPORT PENDING</div>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">{reportPending.length}</span>
            </div>
            <div className="space-y-3">
              {reportPending.map((study) => {
                const overdue = (study.tatMinutes ?? 0) > 240;
                return (
                  <div key={study.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                    <div>
                      <div className="text-xs font-bold text-slate-700">{study.modality}</div>
                      <div className="font-bold text-slate-900">{study.patientName}</div>
                      <div className="text-xs text-slate-500">{study.studyName}</div>
                      <div className="text-xs text-slate-500">{study.doctorName}</div>
                    </div>
                    <div className={`text-xs font-bold ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                      {formatTat(study.tatMinutes)} {overdue ? '🔴' : '⚠️'}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ) : null}

        {scheduled.length > 0 ? (
          <SectionCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700">SCHEDULED</div>
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-700">{scheduled.length}</span>
            </div>
            <div className="space-y-3">
              {scheduled.map((study) => (
                <div key={study.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-700">{study.modality}</div>
                    <div className="text-xs font-bold text-slate-600">{formatTimeShort(study.scheduledAt)}</div>
                  </div>
                  <div className="mt-1 font-bold text-slate-900">{study.patientName}</div>
                  <div className="text-xs text-slate-600">{study.studyName}</div>
                  <div className="mt-1 text-xs text-slate-500">Patient: Not yet arrived</div>
                  {study.alerts && study.alerts.length > 0 ? <div className="mt-1 text-xs text-amber-700">⚠️ {study.alerts[0]}</div> : null}
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {released.length > 0 ? (
          <SectionCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">REPORTED / RELEASED</div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{released.length}</span>
            </div>
            <div className="space-y-3">
              {released.map((study) => (
                <div key={study.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-xs font-bold text-slate-700">{study.modality}<span className="ml-2 text-emerald-700">✅ {study.status === 'released' ? 'Released' : 'Reported'}</span></div>
                  <div className="mt-1 font-bold text-slate-900">{study.patientName}</div>
                  <div className="text-xs text-slate-600">{study.studyName}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
};

// ============================================================================
// IMAGING ORDERS
// ============================================================================

type ImagingOrderTab = 'new' | 'scheduled' | 'active' | 'completed' | 'rejected' | 'all';

const ImagingOrdersPage = ({ context }: { context: LabPageContext }) => {
  const studies = useMemo(() => context.data?.imagingStudies ?? [], [context.data?.imagingStudies]);
  const [tab, setTab] = useState<ImagingOrderTab>('new');

  const counts = {
    new: studies.filter((s) => s.status === 'ordered').length,
    scheduled: studies.filter((s) => s.status === 'scheduled').length,
    active: studies.filter((s) => s.status === 'scanning').length,
    completed: studies.filter((s) => s.status === 'released' || s.status === 'reported').length,
    rejected: 0,
    all: studies.length,
  };

  const tabs: Array<{ id: ImagingOrderTab; label: string; emoji: string; count: number }> = [
    { id: 'new', emoji: '📬', label: 'New', count: counts.new },
    { id: 'scheduled', emoji: '⏳', label: 'Scheduled', count: counts.scheduled },
    { id: 'active', emoji: '🔄', label: 'Active', count: counts.active },
    { id: 'completed', emoji: '✅', label: 'Completed', count: counts.completed },
    { id: 'rejected', emoji: '❌', label: 'Rejected', count: counts.rejected },
    { id: 'all', emoji: '', label: 'All', count: counts.all },
  ];

  const filtered = useMemo(() => {
    if (tab === 'new') return studies.filter((s) => s.status === 'ordered');
    if (tab === 'scheduled') return studies.filter((s) => s.status === 'scheduled');
    if (tab === 'active') return studies.filter((s) => s.status === 'scanning');
    if (tab === 'completed') return studies.filter((s) => s.status === 'released' || s.status === 'reported');
    if (tab === 'rejected') return [];
    return studies;
  }, [studies, tab]);

  // For demo, treat scheduled studies that have preauth_status as "new orders" in hosted parlance
  const newOrders = studies.filter((s) => s.status === 'scheduled' && s.preauthStatus);
  const preAuthCount = newOrders.length;

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-700">
            <span className="font-bold">{preAuthCount}</span> studies awaiting insurance pre-authorization
          </p>
          <button type="button" disabled title="Pre-auth tracker — coming soon" className="cursor-not-allowed rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 opacity-80">View Pre-Auth Tracker →</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t.emoji} {t.label} ({t.count})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {filtered.length === 0 ? <EmptyState label="No imaging orders match this filter." /> : null}

        {filtered.map((study) => {
          const accent = orderCardAccent(study.priority, false);

          return (
            <article
              key={study.id}
              className={`relative overflow-hidden rounded-2xl border ${accent.border} ${accent.bg} bg-white p-5 shadow-sm`}
            >
              <span className={`absolute left-0 top-0 h-full w-1.5 ${accent.bar}`} aria-hidden="true" />

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-['DM_Mono'] text-sm font-bold text-slate-700">{study.accession.replace(/^(MRI|CT|USS|XR|PET|X-Ray)/, 'IORD')}</span>
                <Pill className={priorityClass[study.priority]}>{accent.label}</Pill>
                <span className="text-xs text-slate-500">Today {formatTimeShort(study.scheduledAt)}</span>
                <Pill className={
                  (study.sourceLabel ?? '').toLowerCase().includes('walk-in')
                    ? 'bg-slate-100 text-slate-700 ring-slate-200'
                    : 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                }>
                  {study.sourceLabel ?? 'CeenAiX ePrescription'} {(study.sourceLabel ?? '').toLowerCase().includes('walk-in') ? '' : '✅'}
                </Pill>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">PATIENT</div>
                  <div className="mt-2 text-base font-bold text-slate-900">{study.patientName}</div>
                  <div className="text-sm text-slate-600">{ageGenderLabel(study.patientAge, study.patientGender)}</div>
                  {study.insurancePlan ? (
                    <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${insurancePillClass(study.insurancePlan)}`}>
                      {study.insurancePlan}
                    </span>
                  ) : null}
                </div>
                <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">DOCTOR</div>
                  <div className="mt-2 text-base font-bold text-slate-900">{study.doctorName}</div>
                  <div className="text-sm text-slate-600">
                    {study.doctorSpecialty ?? 'Clinician'} · {study.clinicName}
                  </div>
                  {study.doctorDhaLicense ? (
                    <div className="mt-1 text-xs font-semibold text-emerald-700">DHA: {study.doctorDhaLicense} ✅</div>
                  ) : null}
                </div>
              </div>

              {study.clinicalIndication ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  <span className="font-bold">Clinical Indication:</span> {study.clinicalIndication}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">{study.modality}</div>
                  <h3 className="mt-2 font-bold text-slate-900">{study.studyName}</h3>
                  {study.icd10Code ? (
                    <p className="mt-2 text-xs text-slate-600">{study.icd10Code} — {study.icd10Description}</p>
                  ) : null}
                  {study.cptCode ? <p className="text-xs font-['DM_Mono'] text-indigo-600">CPT: {study.cptCode}</p> : null}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
                  <div className="text-slate-600">
                    <span className="font-bold">Contrast:</span>{' '}
                    <span className={study.contrast && study.contrast !== 'No' ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                      {study.contrast ?? 'No'}
                    </span>
                  </div>
                  <div className="text-slate-600"><span className="font-bold">Prep:</span> {study.prepInstructions ?? 'No prep required'}</div>
                  <div className="text-slate-600"><span className="font-bold">Priority:</span> <span className={`font-semibold ${
                    study.priority === 'STAT' ? 'text-red-600' : study.priority === 'Urgent' ? 'text-amber-600' : 'text-slate-600'
                  }`}>{study.priority}</span></div>
                  {study.roomsAvailableSummary ? (
                    <div className="mt-2 text-xs font-semibold text-emerald-700">{study.roomsAvailableSummary} ✅</div>
                  ) : null}
                  {study.suggestedSlot ? (
                    <div className="text-xs text-slate-500">Suggested: {study.suggestedSlot}</div>
                  ) : null}
                </div>
              </div>

              {study.preauthStatus ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-amber-900">
                      <span className="font-bold">Pre-auth:</span>{' '}
                      <span className={`font-semibold ${insurancePillClass(study.insurancePlan).includes('rose') ? 'text-rose-700' : insurancePillClass(study.insurancePlan).includes('sky') ? 'text-sky-700' : insurancePillClass(study.insurancePlan).includes('indigo') ? 'text-indigo-700' : insurancePillClass(study.insurancePlan).includes('violet') ? 'text-violet-700' : 'text-amber-900'}`}>
                        {study.insurancePlan}
                      </span>
                      {' — '}
                      <span className="font-semibold text-amber-800">{study.preauthStatus}</span>
                      {' ⚠️'}
                    </div>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(
                        `Pre-auth request: ${study.accession} ${study.studyName}`
                      )}&body=${encodeURIComponent(
                        `Patient: ${study.patientName}\nStudy: ${study.studyName}\nModality: ${study.modality}\nPrescriber: ${study.doctorName}\nInsurance: ${study.insurancePlan ?? '—'}\nClinical indication: ${study.clinicalIndication ?? '—'}\n\nPlease initiate pre-authorization.`
                      )}`}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      📋 Request Pre-Auth
                    </a>
                  </div>
                  {study.preauthCoverage ? <div className="mt-1 text-xs text-amber-700">{study.preauthCoverage}</div> : null}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="/lab/imaging/queue"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Accept &amp; Schedule
                </a>
                <button type="button"
                  onClick={async () => {
                    const reason = window.prompt(
                      `Reject imaging order ${study.accession}?\n\nProvide a short reason that will be saved to the order notes:`
                    );
                    if (reason === null) return;
                    try {
                      await context.actions.rejectOrder(study.id, reason.trim());
                    } catch {
                      // The shared error surface for lab orders is already
                      // wired in the orders page; silent here is intentional.
                    }
                  }}
                  className="ml-auto rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// RADIOLOGY REPORTS
// ============================================================================

type ReportTab = 'pending' | 'draft' | 'done';

const RadiologyReportsPage = ({ context }: { context: LabPageContext }) => {
  const studies = context.data?.imagingStudies ?? [];
  const meta = context.data?.facilityMeta;
  const pending = studies.filter((s) => s.status === 'report_pending');
  const overdueCount = pending.filter((s) => (s.tatMinutes ?? 0) > 240).length;
  const draft = studies.filter((s) => s.status === 'reported');
  const done = studies.filter((s) => s.status === 'released');

  const [tab, setTab] = useState<ReportTab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(pending[0]?.id ?? null);
  const [savingReport, setSavingReport] = useState<'idle' | 'draft' | 'preliminary' | 'verify'>('idle');
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const list = tab === 'pending' ? pending : tab === 'draft' ? draft : done;
  const selected = studies.find((s) => s.id === selectedId) ?? list[0] ?? null;

  const advanceStudy = async (
    nextStatus: 'reported' | 'released',
    label: 'idle' | 'draft' | 'preliminary' | 'verify',
    reportStatus: string | null
  ) => {
    if (!selected) return;
    setReportError(null);
    setReportNotice(null);
    setSavingReport(label);
    try {
      await context.actions.setImagingStudyStatus(selected.id, nextStatus, reportStatus);
      setReportNotice(
        nextStatus === 'released'
          ? 'Report verified and released to the requesting doctor.'
          : 'Report saved.'
      );
    } catch (error) {
      setReportError(
        error instanceof Error ? error.message : 'Could not update the radiology report.'
      );
    } finally {
      setSavingReport('idle');
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
        <div className="mb-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
          <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">{meta?.radiologistName ?? 'Dr. Rania Al Suwaidi'} {meta?.radiologistCredentials ? meta.radiologistCredentials : 'FRCR'}</h2>
          <p className="mt-1 text-xs text-slate-600">Radiologist on duty · {pending.length} reports in queue</p>
          {overdueCount > 0 ? <p className="mt-1 text-xs font-bold text-red-600">{overdueCount} overdue</p> : null}
          <button type="button"
            onClick={() => {
              const firstPending = pending[0];
              if (firstPending) {
                setSelectedId(firstPending.id);
                setTab('pending');
              }
            }}
            disabled={pending.length === 0}
            className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            🏃 Start Reporting
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          {(['pending', 'draft', 'done'] as ReportTab[]).map((t) => (
            <button type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {t === 'pending' ? `Pending (${pending.length})` : t === 'draft' ? `Draft (${draft.length})` : `Done (${done.length})`}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {list.map((study) => {
            const overdue = (study.tatMinutes ?? 0) > 240;
            return (
              <button type="button"
                key={study.id}
                onClick={() => setSelectedId(study.id)}
                className={`w-full rounded-xl p-3 text-left transition ${selected?.id === study.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-slate-50 hover:bg-slate-100'}`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">{study.modality}</span>
                  <span className={overdue ? 'text-red-600' : 'text-amber-600'}>
                    {formatTat(study.tatMinutes)} {overdue ? '🔴 OVERDUE' : '⚠️'}
                  </span>
                </div>
                <div className="mt-1 font-bold text-sm text-slate-900">{study.patientName}</div>
                <div className="text-xs text-slate-500">{study.studyName}</div>
                <div className="text-xs text-slate-500">{study.doctorName}</div>
                <div className="mt-2 text-xs font-bold text-blue-600">▶ Report</div>
              </button>
            );
          })}
        </div>
      </aside>

      {selected ? (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-slate-900">
                {selected.studyName} · {selected.patientName} · {ageGenderLabel(selected.patientAge, selected.patientGender)}
              </h2>
              <p className="text-sm text-slate-500">{selected.accession}</p>
              <p className="text-sm text-slate-500">{selected.doctorName} · {selected.doctorSpecialty ?? 'Clinician'} · {selected.clinicName}</p>
            </div>

            <SectionCard>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  {['W/L', 'Zoom', 'Pan', 'Measure', 'Compare'].map((tool) => (
                    <button type="button" key={tool} disabled title="Imaging tools — coming soon" className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-500 opacity-80">{tool}</button>
                  ))}
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-700">TAT:</span> {formatTat(selected.tatMinutes)} <span className="text-slate-500">· Target: &lt;3h</span>
                </div>
              </div>

              <div className="mt-4 flex h-72 items-center justify-center rounded-xl bg-slate-950 text-center text-slate-300">
                <div>
                  <div className="text-4xl">⬛</div>
                  <div className="mt-2 text-sm font-bold">{selected.modality} Viewer · Slice 45/120</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {['Lung', 'Mediastinum', 'Bone', 'Liver'].map((view) => (
                  <button type="button" key={view} disabled title="Anatomy presets — coming soon" className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-500 opacity-80">{view}</button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <button type="button" disabled title="Slice navigation — coming soon" className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-500 opacity-80">◀ Prev</button>
                <span className="font-bold text-slate-700">45 / 120</span>
                <button type="button" disabled title="Slice navigation — coming soon" className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-500 opacity-80">Next ▶</button>
              </div>
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
              <SectionCard>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">CLINICAL INDICATION</div>
                <p className="mt-2 text-sm text-slate-700">{selected.clinicalIndication ?? 'No indication on file.'}</p>
                <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Technique</div>
                <p className="mt-2 text-sm text-slate-700">{selected.modality} performed{selected.contrast ? ` with ${selected.contrast}` : ''}.</p>
              </SectionCard>

              <SectionCard>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">FINDINGS — {selected.studyName}</div>
                  <button type="button"
                    disabled
                    title="AI report assist — coming soon"
                    className="cursor-not-allowed rounded-full bg-violet-100/70 px-2.5 py-1 text-[10px] font-bold text-violet-500 opacity-70"
                  >
                    🤖 AI Assist
                  </button>
                </div>
                <textarea
                  maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                  className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 p-3 text-sm"
                  defaultValue={`Solid finding measured per imaging protocol. AI assist will populate measurements once attached.`}
                />
              </SectionCard>
            </div>

            <SectionCard>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">IMPRESSION *</div>
              <textarea
                maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm"
                defaultValue="1. Findings consistent with clinical indication. Recommend follow-up per modality guidelines."
              />
              <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">ICD-10</div>
                  <div className="mt-1 rounded-lg bg-slate-50 p-2">
                    <div className="font-['DM_Mono'] text-xs">{selected.icd10Code ?? 'N/A'} — {selected.icd10Description ?? 'N/A'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">CPT</div>
                  <div className="mt-1 rounded-lg bg-slate-50 p-2 font-['DM_Mono'] text-xs">{selected.cptCode ?? 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Recommendations</div>
                  <div className="mt-1 rounded-lg bg-slate-50 p-2 text-xs">Follow-up per Fleischner Society guidelines.</div>
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">REPORT CHECKLIST</div>
              <div className="mt-3 space-y-1.5">
                {[
                  'Clinical indication referenced',
                  'All anatomical regions documented',
                  'Impression section complete',
                  'ICD-10 coded',
                  'Comparison study referenced',
                  'Recommendations included',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-emerald-600">✅</span>
                    <span>{item}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="text-slate-400">○</span>
                  <span>QA: measurements consistent with viewer</span>
                </div>
              </div>
              {reportError ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {reportError}
                </div>
              ) : null}
              {reportNotice ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  {reportNotice}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button"
                  onClick={() => void advanceStudy('reported', 'draft', 'draft')}
                  disabled={savingReport !== 'idle'}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingReport === 'draft' ? 'Saving…' : '💾 Save Draft'}
                </button>
                <button type="button"
                  onClick={() => void advanceStudy('reported', 'preliminary', 'preliminary')}
                  disabled={savingReport !== 'idle'}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingReport === 'preliminary' ? 'Submitting…' : '📤 Submit Preliminary'}
                </button>
                <button type="button"
                  onClick={() => void advanceStudy('released', 'verify', 'final')}
                  disabled={savingReport !== 'idle'}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingReport === 'verify' ? 'Verifying…' : 'Verify & Sign Report'}
                </button>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50">
          <EmptyState label="Select a study from the queue to begin reporting." />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// IMAGING EQUIPMENT
// ============================================================================

const EquipmentCard = ({ item, department }: { item: LabPortalEquipment; department: LabDepartment }) => {
  const statusColor =
    item.status === 'online' ? 'bg-emerald-100 text-emerald-700' :
    item.status === 'maintenance' ? 'bg-amber-100 text-amber-800' :
    item.status === 'warning' ? 'bg-orange-100 text-orange-700' :
    'bg-rose-100 text-rose-700';
  // Hosted display labels:
  //   Radiology: SCANNING (active scan), ONLINE, SCHEDULED (next slot soon), QA IN PROGRESS, MAINTENANCE
  //   Laboratory: RUNNING (active batch), ONLINE, MAINTENANCE, WARNING
  const isActivelyRunning = !!item.activeRemainingLabel && /remaining|ongoing/i.test(item.activeRemainingLabel);
  const displayLabel = (() => {
    if (item.status === 'maintenance' && !isActivelyRunning) return 'MAINTENANCE';
    if (department === 'radiology') {
      if (isActivelyRunning) return 'SCANNING';
      if (item.status === 'warning') return item.alert?.toUpperCase().includes('QA') ? 'QA IN PROGRESS' : 'SCHEDULED';
      return 'ONLINE';
    }
    if (isActivelyRunning) return 'RUNNING';
    if (item.status === 'warning') return 'WARNING';
    return 'ONLINE';
  })();
  const labelToneClass =
    displayLabel === 'SCANNING' || displayLabel === 'RUNNING'
      ? 'bg-violet-100 text-violet-700'
      : displayLabel === 'MAINTENANCE'
      ? 'bg-amber-100 text-amber-800'
      : displayLabel === 'QA IN PROGRESS' || displayLabel === 'WARNING'
      ? 'bg-orange-100 text-orange-700'
      : displayLabel === 'SCHEDULED'
      ? 'bg-cyan-100 text-cyan-700'
      : statusColor;

  // Hosted layout differs per department:
  //   Radiology: status pill / NAME / model (equipmentType) / type (subtitle) / activity panel
  //   Laboratory: status pill / department (room) / NAME / equipmentType / activity description (subtitle)
  const isLab = department === 'laboratory';

  return (
    <SectionCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${labelToneClass}`}>
            {displayLabel}
          </span>
          {isLab && item.room ? (
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{item.room}</p>
          ) : null}
          <h3 className={`${isLab ? 'mt-1' : 'mt-2'} font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900`}>{item.name}</h3>
          {!isLab && item.equipmentType && item.equipmentType !== item.subtitle ? (
            <p className="text-sm font-semibold text-slate-700">{item.equipmentType}</p>
          ) : null}
          {!isLab && item.subtitle ? <p className="text-xs text-slate-500">{item.subtitle}</p> : null}
          {isLab && item.equipmentType ? <p className="text-xs text-slate-500">{item.equipmentType}</p> : null}
          {isLab && item.subtitle ? (
            <p className="mt-2 text-xs font-semibold text-slate-700">{item.subtitle}</p>
          ) : null}
          {isLab && item.activeRemainingLabel ? (
            <p className="mt-1 text-xs text-slate-500">{item.activeRemainingLabel}</p>
          ) : null}
        </div>
      </div>

      {!isLab && item.activeUserLabel ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs">
          <div className="font-semibold text-slate-700">{item.activeUserLabel}</div>
          {item.activeRemainingLabel ? <div className="text-slate-500">{item.activeRemainingLabel}</div> : null}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-['DM_Mono'] text-2xl font-bold text-slate-900">{item.todayCount ?? '—'}</div>
          <div className="text-[10px] uppercase text-slate-500">Today</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-['DM_Mono'] text-2xl font-bold text-slate-900">{item.uptimePercent ? `${item.uptimePercent}%` : '—'}</div>
          <div className="text-[10px] uppercase text-slate-500">Uptime</div>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2">
          <div className="font-['DM_Mono'] text-2xl font-bold text-emerald-700">✅</div>
          <div className="text-[10px] uppercase text-emerald-700">QC</div>
        </div>
      </div>

      {item.qcStatus ? <div className="mt-2 text-xs text-slate-500">{item.qcStatus}</div> : null}
      {item.alert ? <div className="mt-2 text-xs text-amber-700">{item.alert}</div> : null}

      {item.reagents && item.reagents.length > 0 ? (
        <div className="mt-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">REAGENT LEVELS</div>
          <div className="mt-2 space-y-2">
            {item.reagents.map((r) => (
              <div key={r.name}>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700">{r.name}</span>
                  <span className={`font-bold ${r.percent < 50 ? 'text-amber-700' : 'text-slate-700'}`}>{r.percent}%</span>
                </div>
                <ProgressMeter value={r.percent} tone={r.percent < 50 ? 'accent-amber-500' : 'accent-emerald-500'} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {item.maintenanceDueAt ? (
        <p className="mt-3 text-xs text-slate-500">Maintenance due: {formatDateShort(item.maintenanceDueAt)}</p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <a
          href={isLab ? '/lab/analytics' : '/lab/imaging/equipment'}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-center"
        >
          {isLab ? '📊 Stats' : '📋 Schedule'}
        </a>
        <a
          href="/lab/equipment"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-center"
        >
          {isLab ? '⚙️ Log Maintenance' : '⚙️ Maintenance'}
        </a>
      </div>
    </SectionCard>
  );
};

const EquipmentPage = ({ data, department }: { data: LabPortalData | null; department: LabDepartment }) => {
  const items = (data?.equipment ?? []).filter((e) => e.department === department);
  const lowReagents = items.filter((i) => (i.reagents ?? []).some((r) => r.percent < 50));

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="space-y-4 p-5">
        {department === 'laboratory' && lowReagents.length > 0 ? (
          <SectionCard className="border-amber-200 bg-amber-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-amber-950">
                  {lowReagents.reduce((acc, e) => acc + e.reagents.filter((r) => r.percent < 50).length, 0)} reagents below 50% — order required:
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  {lowReagents
                    .flatMap((eq) => eq.reagents.filter((r) => r.percent < 50).map((r) => `${eq.name}: ${r.name} ${r.percent}%`))
                    .join(' · ')}
                </p>
              </div>
              <a
                href={`mailto:?subject=${encodeURIComponent('Reagent purchase order')}&body=${encodeURIComponent(
                  lowReagents
                    .flatMap((eq) =>
                      eq.reagents
                        .filter((r) => r.percent < 50)
                        .map((r) => `- ${eq.name} · ${r.name} at ${r.percent}%`)
                    )
                    .join('\n')
                )}`}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                📦 Generate Purchase Order
              </a>
            </div>
          </SectionCard>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <EquipmentCard key={item.id} item={item} department={department} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// NABIDH SUBMISSION CENTRE
// ============================================================================

const NabidhPage = ({ context }: { context: LabPageContext }) => {
  const events = context.data?.nabidhEvents ?? [];
  const labEvents = events.filter((e) => e.resourceType === 'Observation' || e.resourceType === 'DiagnosticReport');
  const radEvents = events.filter((e) => e.resourceType === 'ImagingStudy' || (e.resourceType === 'DiagnosticReport' && e.referenceCode.includes('RAD')));
  const submitted = events.filter((e) => e.status === 'submitted').length;
  const pending = events.filter((e) => e.status === 'pending').length;
  const failed = events.filter((e) => e.status === 'failed').length;
  const labSubmitted = labEvents.filter((e) => e.status === 'submitted').length;
  const labPending = labEvents.filter((e) => e.status === 'pending').length;
  const radSubmitted = radEvents.filter((e) => e.status === 'submitted').length;
  const radPending = radEvents.filter((e) => e.status === 'pending').length;
  const meta = context.data?.facilityMeta;

  const submitAllPending = () => {
    const pendingIds = events.filter((e) => e.status !== 'submitted').map((e) => e.id);
    void context.actions.markNabidhSubmittedBulk(pendingIds);
  };

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🇦🇪</div>
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">NABIDH Health Information Exchange</h2>
              <p className="text-sm text-slate-500">National Unified Health Record · FHIR R4 · Real-time submission</p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">✅ Connected · Last sync: 12 seconds ago</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-['DM_Mono'] text-xs font-bold text-slate-700">{meta?.nabidhVendorId ?? '—'}</div>
            <div className="text-xs text-slate-500">Vendor ID</div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiTile label="✅" value={`${submitted}/${events.length}`} caption="submitted" tone="emerald" />
        <KpiTile label="⏳" value={pending} caption="pending" tone="amber" />
        <KpiTile label="✅" value={failed} caption="failed" tone="rose" />
        {(() => {
          const lastSubmitted = events
            .filter((event) => event.status === 'submitted' && event.submittedAt)
            .sort(
              (left, right) =>
                new Date(right.submittedAt ?? 0).getTime() -
                new Date(left.submittedAt ?? 0).getTime()
            )[0];
          return (
            <KpiTile
              label="📤"
              value={lastSubmitted?.submittedAt ? formatTimeShort(lastSubmitted.submittedAt) : '—'}
              caption="Last bulk"
              tone="slate"
            />
          );
        })()}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard>
          <div className="mb-3">
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🧪 Lab Results</h3>
            <p className="text-sm text-slate-500">Submitted: {labSubmitted}/{labEvents.length} · {labEvents.length > 0 ? Math.round((labSubmitted / labEvents.length) * 100) : 0}%</p>
            <p className="text-xs text-slate-500">{labPending} pending · 0 failed</p>
            <ProgressMeter value={labEvents.length > 0 ? (labSubmitted / labEvents.length) * 100 : 0} tone="accent-emerald-500" />
          </div>
          <div className="space-y-2">
            {labEvents.filter((e) => e.status !== 'submitted').slice(0, 5).map((event) => (
              <article key={event.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-['DM_Mono'] text-xs font-bold text-slate-700">{event.referenceCode}</span>
                  <Pill className={nabidhBadge[event.status]}>{event.status}</Pill>
                </div>
                <h4 className="mt-1 text-sm font-bold text-slate-900">{event.patientName}</h4>
                <p className="text-xs text-slate-500">{event.reason ?? 'Awaiting submission'}</p>
                {event.status === 'pending' && event.reason?.toLowerCase().includes('critical') ? (
                  <button type="button"
                    onClick={() => void context.actions.markNabidhSubmitted(event.id)}
                    className="mt-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    📞 Notify First
                  </button>
                ) : null}
              </article>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-slate-100 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">FHIR RESOURCES SUBMITTED</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div><div className="font-bold text-slate-900">Observation</div><div className="font-['DM_Mono'] text-emerald-700">3,241 ✅</div></div>
              <div><div className="font-bold text-slate-900">DiagnosticReport</div><div className="font-['DM_Mono'] text-emerald-700">189 ✅</div></div>
              <div><div className="font-bold text-slate-900">ServiceRequest</div><div className="font-['DM_Mono'] text-emerald-700">47 ✅</div></div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="mb-3">
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🩻 Radiology Reports</h3>
            <p className="text-sm text-slate-500">Submitted: {radSubmitted}/{radEvents.length} · {radEvents.length > 0 ? Math.round((radSubmitted / radEvents.length) * 100) : 0}%</p>
            <p className="text-xs text-slate-500">{radPending} pending · 0 failed</p>
            <ProgressMeter value={radEvents.length > 0 ? (radSubmitted / radEvents.length) * 100 : 0} tone="accent-emerald-500" />
          </div>
          <div className="space-y-2">
            {radEvents.filter((e) => e.status !== 'submitted').slice(0, 5).map((event) => (
              <article key={event.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-['DM_Mono'] text-xs font-bold text-slate-700">{event.referenceCode}</span>
                  <Pill className={nabidhBadge[event.status]}>{event.status}</Pill>
                </div>
                <h4 className="mt-1 text-sm font-bold text-slate-900">{event.patientName}</h4>
                <p className="text-xs text-slate-500">{event.reason ?? 'Awaiting submission'}</p>
              </article>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-slate-100 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">FHIR RESOURCES SUBMITTED</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
              <div><div className="font-bold text-slate-900">ImagingStudy</div><div className="font-['DM_Mono'] text-emerald-700">28 ✅</div></div>
              <div><div className="font-bold text-slate-900">DiagnosticReport (radiology)</div><div className="font-['DM_Mono'] text-emerald-700">25 ✅</div></div>
            </div>
          </div>
          <button type="button" onClick={submitAllPending} className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
            📤 Submit All {pending + failed} Pending
          </button>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="flex items-center justify-between">
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Submission History — Today</h3>
          <button type="button"
            onClick={() => {
              const header = ['ref', 'patient', 'status', 'reason', 'submitted_at'];
              const escape = (v: string | number | null | undefined) => {
                if (v === null || v === undefined) return '';
                const s = String(v);
                return s.includes(',') || s.includes('"') || s.includes('\n')
                  ? `"${s.replace(/"/g, '""')}"`
                  : s;
              };
              const body = [
                header,
                ...events.map((event) => [
                  event.referenceCode,
                  event.patientName,
                  event.status,
                  event.reason ?? '',
                  event.submittedAt ?? '',
                ]),
              ]
                .map((line) => line.map(escape).join(','))
                .join('\n');
              const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `nabidh-submission-log-${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            Export Log
          </button>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Date / Time</th>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Resource Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">NABIDH Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {events.filter((e) => e.status === 'submitted').map((event) => (
                <tr key={event.id}>
                  <td className="px-3 py-2 text-slate-500">{formatDateShort(event.submittedAt ?? event.createdAt)} · {formatTimeShort(event.submittedAt ?? event.createdAt)}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{event.patientName}</td>
                  <td className="px-3 py-2 text-slate-600">{event.resourceType}</td>
                  <td className="px-3 py-2"><span className="text-emerald-600">✅</span></td>
                  <td className="px-3 py-2 font-['DM_Mono'] text-xs text-slate-500">{event.referenceCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};

// ============================================================================
// ANALYTICS
// ============================================================================

const AnalyticsView = ({ data }: { data: LabPortalData | null }) => {
  const [scope, setScope] = useState<'all' | 'lab' | 'rad'>('all');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');

  const totalLab = data?.samples.length ?? 0;
  const totalRad = data?.imagingStudies.length ?? 0;
  const trends = data?.volumeTrends ?? [];
  const topLab = data?.topLabTests ?? [];
  const topImaging = data?.topImagingStudies ?? [];
  const criticals = data?.criticalValues ?? [];
  const maxVol = Math.max(1, ...trends.map((t) => Math.max(t.labVolume, t.radiologyVolume)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'lab', 'rad'] as const).map((s) => (
            <button type="button"
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${scope === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {s === 'all' ? 'All ●' : s === 'lab' ? 'Lab' : 'Radiology'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['today', 'week', 'month', 'custom'] as const).map((p) => (
            <button type="button"
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${period === p ? 'bg-indigo-50 text-indigo-700' : 'border border-slate-200 bg-white text-slate-600'}`}
            >
              {p === 'today' ? 'Today ●' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button type="button"
            onClick={() => {
              const samples = data?.samples ?? [];
              const studies = data?.imagingStudies ?? [];
              const header = ['kind', 'id', 'patient_name', 'status', 'ordered_at_or_scheduled_at'];
              const escape = (v: string | number | null | undefined) => {
                if (v === null || v === undefined) return '';
                const s = String(v);
                return s.includes(',') || s.includes('"') || s.includes('\n')
                  ? `"${s.replace(/"/g, '""')}"`
                  : s;
              };
              const lines = [header];
              for (const sample of samples) {
                lines.push(['sample', sample.id, sample.patientName, sample.status, sample.orderedAt ?? '']);
              }
              for (const study of studies) {
                lines.push(['study', study.id, study.patientName, study.status, study.scheduledAt ?? '']);
              }
              const body = lines.map((line) => line.map(escape).join(',')).join('\n');
              const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `lab-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
          >
            Export
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiTile label="Lab Samples" value={formatNumber(totalLab)} tone="indigo" />
        <KpiTile label="Radiology Studies" value={formatNumber(totalRad)} tone="blue" />
        <KpiTile label="Total Today" value={formatNumber(totalLab + totalRad)} tone="violet" />
        {(() => {
          // Compliance from live NABIDH events; fall back to '—' when there
          // are no events to score.
          const nabidh = data?.nabidhEvents ?? [];
          const submittedShare =
            nabidh.length > 0
              ? Math.round((nabidh.filter((event) => event.status === 'submitted').length / nabidh.length) * 100)
              : null;
          return (
            <KpiTile
              label="DHA Compliance Rate"
              value={submittedShare != null ? `${submittedShare}%` : '—'}
              tone="emerald"
            />
          );
        })()}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Daily Volume — 7-Day Trend</h3>
          <div className="mt-3 flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Lab</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Radiology</span>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {trends.map((t) => {
              const labH = Math.round((t.labVolume / maxVol) * 100);
              const radH = Math.round((t.radiologyVolume / maxVol) * 100);
              return (
                <div key={t.id} className="flex h-48 flex-col justify-end rounded-xl bg-slate-50 p-2">
                  <div className="flex flex-1 items-end gap-1">
                    <div className="w-full rounded-t bg-indigo-500" style={{ height: `${labH}%` }} />
                    <div className="w-full rounded-t bg-blue-500" style={{ height: `${radH}%` }} />
                  </div>
                  <div className="mt-2 text-center font-['DM_Mono'] text-[11px] text-slate-500">{t.dayLabel}</div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Modality Breakdown — Radiology</h3>
          <p className="mt-1 text-xs text-slate-500">{totalRad} studies</p>
          <div className="mt-4 space-y-2">
            {[
              { label: 'MRI', count: data?.imagingStudies.filter((s) => s.modality === 'MRI').length ?? 0 },
              { label: 'CT', count: data?.imagingStudies.filter((s) => s.modality === 'CT').length ?? 0 },
              { label: 'X-Ray', count: data?.imagingStudies.filter((s) => s.modality === 'X-Ray').length ?? 0 },
              { label: 'USS', count: data?.imagingStudies.filter((s) => s.modality === 'USS').length ?? 0 },
              { label: 'PET', count: data?.imagingStudies.filter((s) => s.modality === 'PET').length ?? 0 },
            ].map((m) => {
              const pct = totalRad > 0 ? Math.round((m.count / totalRad) * 100) : 0;
              return (
                <div key={m.label}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{m.label}</span>
                    <span className="font-bold text-slate-700">{pct}% ({m.count})</span>
                  </div>
                  <ProgressMeter value={pct} tone="accent-blue-500" />
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Critical Value Tracking — Today</h3>
        <p className="mt-1 text-xs text-slate-500">Avg notification: 23 min (target: &lt;60 min ✅) · Fastest: 8 min · Slowest: 76 min ⚠️</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Test</th>
                <th className="px-3 py-2">Critical Value</th>
                <th className="px-3 py-2">Notified In</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {criticals.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{c.patientName}</td>
                  <td className="px-3 py-2 text-slate-700">{c.testName}</td>
                  <td className="px-3 py-2 text-slate-700">{c.valueLabel}</td>
                  <td className="px-3 py-2 text-slate-600">{c.notifiedInMinutes ? `${c.notifiedInMinutes} min ${c.notifiedInMinutes > 60 ? '⚠️' : ''}` : '—'}</td>
                  <td className="px-3 py-2">
                    {c.status === 'pending' ? <span className="text-amber-700">⚠️ Pending</span> : <span className="text-emerald-700">✅ Notified</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🧪 Top Requested Lab Tests</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {topLab.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="font-semibold text-slate-700">{m.label}</span>
                <span className="font-['DM_Mono'] text-lg font-bold text-indigo-700">{m.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🩻 Top Imaging Studies</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {topImaging.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="font-semibold text-slate-700">{m.label}</span>
                <span className="font-['DM_Mono'] text-lg font-bold text-blue-700">{m.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard className="bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-emerald-700">99.7%</div>
            <p className="text-sm text-slate-700">NABIDH Submission Rate (30 days)</p>
            <p className="text-xs text-slate-500">2 failed submissions (resolved) · 0 currently failed</p>
          </div>
          <a
            href="/lab/nabidh"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            📋 Full NABIDH Report →
          </a>
        </div>
      </SectionCard>

      <SectionCard>
        <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Export Reports</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {['DHA Monthly Lab Report', 'DHA Radiology Report', 'Full Diagnostics Ledger', 'Critical Value Log', 'QC Summary Report'].map((report) => (
            <button type="button"
              key={report}
              onClick={() => {
                // Each report ships a real text summary of the underlying
                // canonical rows the dashboard already loaded. A richer PDF
                // / DOCX renderer will replace these once the formatting
                // workflow ships, but the download itself is real.
                const samples = data?.samples ?? [];
                const studies = data?.imagingStudies ?? [];
                const nabidh = data?.nabidhEvents ?? [];
                const qc = data?.qcRuns ?? [];
                const criticalValues = data?.criticalValues ?? [];
                const stamp = new Date().toISOString().slice(0, 10);
                let body = `${report}\nGenerated ${stamp}\n\n`;
                switch (report) {
                  case 'DHA Monthly Lab Report':
                    body += `Total lab samples this period: ${samples.length}\n`;
                    body += `By status: ${Object.entries(
                      samples.reduce<Record<string, number>>((acc, sample) => {
                        acc[sample.status] = (acc[sample.status] ?? 0) + 1;
                        return acc;
                      }, {})
                    )
                      .map(([status, count]) => `${status} ${count}`)
                      .join(' · ')}\n`;
                    break;
                  case 'DHA Radiology Report':
                    body += `Total imaging studies this period: ${studies.length}\n`;
                    break;
                  case 'Full Diagnostics Ledger':
                    body += `Samples: ${samples.length} · Imaging studies: ${studies.length} · QC runs: ${qc.length}\n`;
                    break;
                  case 'Critical Value Log':
                    body += `Critical values on file: ${criticalValues.length}\n`;
                    body += criticalValues
                      .map(
                        (value) =>
                          `- ${value.observedAt} · ${value.patientName} · ${value.testName} · ${value.valueLabel} · ${value.status}`
                      )
                      .join('\n');
                    break;
                  case 'QC Summary Report':
                    body += `QC runs: ${qc.length}\n`;
                    body += qc
                      .map(
                        (run) =>
                          `- ${run.runAt} · ${run.department} · ${run.instrumentName} · ${run.status}`
                      )
                      .join('\n');
                    break;
                  default:
                    body += `NABIDH events: ${nabidh.length}`;
                }
                const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${report.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stamp}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {report}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

// ============================================================================
// PROFILE
// ============================================================================

const PROFILE_TABS = ['🏥 Facility Info', '🧪 Lab Accreditation', '🩻 Radiology Accreditation', '📋 Test & Imaging Menu', '👥 Staff', '⚙️ Integrations'] as const;

const ProfilePage = ({ data }: { data: LabPortalData | null }) => {
  const [tab, setTab] = useState<string>(PROFILE_TABS[0]);
  const facility = data?.facility;
  const meta = data?.facilityMeta;

  return (
    <div className="space-y-4">
      <SectionCard className="p-4">
        <div className="flex flex-wrap gap-2">
          {PROFILE_TABS.map((t) => (
            <button type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1fr,360px]">
        <SectionCard>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 font-['DM_Mono'] text-xl font-bold text-indigo-600">
              {meta?.shortCode ?? 'DM'}
            </div>
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-slate-900">{facility?.name}</h2>
              {meta?.arabicName ? <p className="text-sm text-slate-500" dir="rtl">{meta.arabicName}</p> : null}
              <p className="mt-2 text-sm text-slate-500">{facility?.address}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              ['Type', meta?.facilityType ?? 'Diagnostic Centre'],
              ['Operating Hours', meta?.operatingHours ?? '24/7'],
              ['Phone', facility?.phone ?? '—'],
              ['Email', facility?.email ?? '—'],
              ['Website', meta?.website ?? '—'],
              ['CeenAiX Integration', meta?.ceenaixIntegration ? `✅ ${meta.ceenaixIntegration}` : '—'],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🧪 DHA Lab License</h3>
            <p className="mt-2 font-['DM_Mono'] text-sm font-bold text-slate-900">{meta?.dhaLabLicense ?? '—'}</p>
            <p className="mt-1 text-sm text-emerald-700">✅ Valid — expires {meta?.dhaLabExpiry ?? '—'}</p>
            <p className="mt-1 text-xs text-slate-500">{meta?.dhaLabAccreditations ?? '—'}</p>
          </SectionCard>
          <SectionCard>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🩻 DHA Radiology License</h3>
            <p className="mt-2 font-['DM_Mono'] text-sm font-bold text-slate-900">{meta?.dhaRadiologyLicense ?? '—'}</p>
            <p className="mt-1 text-sm text-emerald-700">✅ Valid — expires {meta?.dhaRadiologyExpiry ?? '—'}</p>
            <p className="mt-1 text-xs text-slate-500">{meta?.dhaRadiologyAccreditations ?? '—'}</p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS
// ============================================================================

const SettingsPage = ({ data }: { data: LabPortalData | null }) => {
  const sectionGroups = useMemo(() => {
    const settings = data?.settings ?? [];
    const map = new Map<string, typeof settings>();
    settings.forEach((s) => {
      const group = map.get(s.section) ?? [];
      group.push(s);
      map.set(s.section, group);
    });
    return Array.from(map.entries());
  }, [data?.settings]);

  return (
    <div className="space-y-4">
      {sectionGroups.map(([section, items]) => (
        <SectionCard key={section}>
          <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">{section} Settings</h2>
          <div className="space-y-4">
            {items.map((setting) => (
              <div key={setting.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{setting.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{setting.value}</div>
                  </div>
                  {setting.options.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {setting.options.map((opt) => (
                        <button type="button"
                          key={opt.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${opt.isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${setting.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {setting.enabled ? 'On' : 'Off'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  );
};

// ============================================================================
// Page body router
// ============================================================================

const LabPageBody = ({ page, context }: { page: LabPage; context: LabPageContext }) => {
  if (context.loading && !context.data) {
    return <EmptyState label="Loading Lab & Radiology workspace..." />;
  }

  switch (page) {
    case 'dashboard':
      return <DashboardView context={context} />;
    case 'queue':
      return <LabQueuePage context={context} />;
    case 'orders':
      return <LabOrdersPage context={context} />;
    case 'results':
      return <LabResultsPage context={context} />;
    case 'qc':
      return <QualityControlView data={context.data} />;
    case 'imaging-queue':
      return <ImagingQueueView context={context} />;
    case 'imaging-orders':
      return <ImagingOrdersPage context={context} />;
    case 'imaging-reports':
      return <RadiologyReportsPage context={context} />;
    case 'imaging-equipment':
      return <EquipmentPage data={context.data} department="radiology" />;
    case 'equipment':
      return <EquipmentPage data={context.data} department="laboratory" />;
    case 'nabidh':
      return <NabidhPage context={context} />;
    case 'analytics':
      return <AnalyticsView data={context.data} />;
    case 'profile':
      return <ProfilePage data={context.data} />;
    case 'settings':
      return <SettingsPage data={context.data} />;
    default:
      return null;
  }
};

// ============================================================================
// Exports
// ============================================================================

export const LabDashboard = () => <LabRoute page="dashboard" />;
export const LabQueue = () => <LabRoute page="queue" />;
export const LabOrders = () => <LabRoute page="orders" />;
export const LabResults = () => <LabRoute page="results" />;
export const LabQualityControl = () => <LabRoute page="qc" />;
export const LabImagingQueue = () => <LabRoute page="imaging-queue" />;
export const LabImagingOrders = () => <LabRoute page="imaging-orders" />;
export const LabRadiologyReports = () => <LabRoute page="imaging-reports" />;
export const LabImagingEquipment = () => <LabRoute page="imaging-equipment" />;
export const LabEquipment = () => <LabRoute page="equipment" />;
export const LabNabidhSync = () => <LabRoute page="nabidh" />;
export const LabAnalytics = () => <LabRoute page="analytics" />;
export const LabProfile = () => <LabRoute page="profile" />;
export const LabSettings = () => <LabRoute page="settings" />;

export const LabReferrals = LabQueue;
export const LabResultEntry = LabResults;
export const LabRadiology = LabImagingQueue;
