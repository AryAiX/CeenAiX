import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileBarChart,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Phone,
  Search,
  Settings,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  approvePreAuthorization,
  useInsurancePortal,
  type InsuranceAiInsight,
  type InsuranceClaim,
  type InsuranceFraudAlert,
  type InsuranceMonthlyClaimsVolumePoint,
  type InsuranceNetworkProvider,
  type InsurancePortalData,
  type InsurancePreAuthorization,
} from '../../hooks';
import { useAuth } from '../../lib/auth-context';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeTone = 'red' | 'amber' | 'blue';
export type PillTone = 'red' | 'amber' | 'emerald' | 'blue' | 'violet' | 'slate';

// ─── Formatters ───────────────────────────────────────────────────────────────

export const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

export const formatCurrency = (value: number | null | undefined) =>
  typeof value === 'number' ? `AED ${value.toLocaleString()}` : 'AED —';

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

export const titleCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

// ─── Constants ────────────────────────────────────────────────────────────────

const pillClasses: Record<PillTone, string> = {
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-slate-100 text-slate-600',
};

export const statusTone = (status: string): PillTone => {
  if (['overdue', 'denied', 'open', 'high'].includes(status)) return 'red';
  if (['review', 'under_review', 'investigating', 'medium'].includes(status)) return 'amber';
  if (['approved', 'resolved', 'ready'].includes(status)) return 'emerald';
  if (['appealed'].includes(status)) return 'violet';
  if (['submitted', 'routine', 'low'].includes(status)) return 'blue';
  return 'slate';
};

const formatSla = (slaDueAt: string) => {
  const deltaMinutes = Math.round((new Date(slaDueAt).getTime() - Date.now()) / 60_000);
  const absolute = Math.abs(deltaMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  return deltaMinutes < 0 ? `${label} overdue` : `${label} remaining`;
};

// ─── Sidebar animations ───────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes badge-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
  @keyframes sla-pulse   { 0%,100%{opacity:1}          50%{opacity:0.4} }
  @keyframes fraud-pulse { 0%,100%{color:#F87171}       50%{color:#FCA5A5} }
  @keyframes status-dot  { 0%,100%{opacity:1}          50%{opacity:0.5} }
`;

// ─── Shared UI primitives ─────────────────────────────────────────────────────

export const StatusPill = ({ children, tone }: { children: ReactNode; tone: PillTone }) => (
  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${pillClasses[tone]}`}>
    {children}
  </span>
);

export const SectionCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
  <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-4">
      <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
    </div>
    <div className="p-5">{children}</div>
  </article>
);

export const KpiCard = ({
  label, value, helper, tone,
}: {
  label: string; value: string | number; helper: string;
  tone: 'blue' | 'emerald' | 'amber' | 'red';
}) => {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }[tone];
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`mb-3 inline-flex rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${toneClass}`}>{label}</div>
      <div className="font-mono text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{helper}</div>
    </article>
  );
};

export const KpiHostedCard = ({
  label, value, caption, tone,
}: {
  label: string; value: string; caption: ReactNode;
  tone: 'amber' | 'blue' | 'emerald' | 'red' | 'violet' | 'slate';
}) => {
  const toneMap: Record<string, { ring: string; bg: string; text: string }> = {
    amber:   { ring: 'ring-amber-100',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
    blue:    { ring: 'ring-blue-100',    bg: 'bg-blue-50',    text: 'text-blue-700'    },
    emerald: { ring: 'ring-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    red:     { ring: 'ring-red-100',     bg: 'bg-red-50',     text: 'text-red-700'     },
    violet:  { ring: 'ring-violet-100',  bg: 'bg-violet-50',  text: 'text-violet-700'  },
    slate:   { ring: 'ring-slate-100',   bg: 'bg-slate-50',   text: 'text-slate-700'   },
  };
  const t = toneMap[tone];
  return (
    <article className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${t.ring}`}>
      <div className={`mb-2 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${t.bg} ${t.text}`}>{label}</div>
      <div className="font-mono text-2xl font-bold leading-none text-slate-900">{value}</div>
      <div className="mt-2 text-[11px] font-medium leading-tight text-slate-500">{caption}</div>
    </article>
  );
};

// ─── Sidebar sub-components ───────────────────────────────────────────────────

interface SidebarBadgeSpec { count: number; type: 'urgent' | 'amber' | 'info' | 'ai' }

const BADGE_BG: Record<string, string> = {
  urgent: '#DC2626', amber: '#D97706', info: '#2563EB', ai: '#7C3AED',
};

const SidebarBadge = ({ spec, small }: { spec: SidebarBadgeSpec; small?: boolean }) => (
  <span
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: small ? 18 : 20, height: small ? 18 : 20,
      padding: '0 5px', borderRadius: 10,
      background: BADGE_BG[spec.type], color: '#fff',
      fontFamily: 'DM Mono, monospace', fontSize: small ? 9 : 10, fontWeight: 700,
      animation: spec.type === 'urgent' ? 'badge-pulse 2s ease-in-out infinite' : undefined,
      flexShrink: 0,
    }}
    aria-label={`${spec.count} ${spec.type}`}
  >
    {spec.count >= 100 ? '99+' : spec.count}
  </span>
);

const SidebarTooltip = ({ text, visible }: { text: string; visible: boolean }) => (
  <div
    role="tooltip"
    style={{
      position: 'absolute', left: 76, top: '50%', transform: 'translateY(-50%)',
      background: '#1E293B', color: '#fff', borderRadius: 8,
      padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap', zIndex: 200,
      pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      opacity: visible ? 1 : 0, transition: 'opacity 150ms',
    }}
  >
    {text}
    <div style={{
      position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
      borderTop: '4px solid transparent', borderBottom: '4px solid transparent',
      borderRight: '4px solid #1E293B',
    }} />
  </div>
);

const SignOutModal = ({
  open, officerName, officerTitle, officerInitials, payerName,
  pendingPreAuths, slaBreached, onCancel, onConfirm,
}: {
  open: boolean;
  officerName: string;
  officerTitle: string;
  officerInitials: string;
  payerName: string;
  pendingPreAuths: number;
  slaBreached: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: 'rgba(15,45,74,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ width: 400, background: '#fff', borderRadius: 16, boxShadow: '0 24px 48px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div className="flex flex-col items-center px-8 pt-8 pb-6 gap-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#EFF6FF' }}>
            <LogOut style={{ width: 28, height: 28, color: '#1E3A5F' }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Sign Out?</div>
          <div className="w-full rounded-xl p-3 flex items-center gap-3" style={{ background: '#EFF6FF' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1E3A5F, #2563EB)' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{officerInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{officerName}</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{officerTitle}</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{payerName}</div>
            </div>
            <span className="rounded px-2 py-0.5 flex-shrink-0" style={{ fontSize: 9, fontWeight: 700, color: '#1E40AF', background: '#DBEAFE' }}>
              Insurance Portal
            </span>
          </div>
          {(pendingPreAuths > 0 || slaBreached) && (
            <div className="w-full rounded-xl p-3 flex items-start gap-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <AlertTriangle style={{ width: 14, height: 14, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                You have <strong>{pendingPreAuths} pending pre-authorizations</strong>
                {slaBreached ? <> and <strong>1 SLA breach</strong> active</> : null}.
                Make sure these are handled before signing out.
              </span>
            </div>
          )}
          <div className="w-full flex flex-col gap-2">
            <button
              onClick={onCancel}
              className="w-full rounded-xl py-3 transition-colors"
              style={{ background: '#F1F5F9', color: '#475569', fontSize: 13, fontWeight: 600 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; }}
            >
              ← Stay Signed In
            </button>
            <button
              onClick={onConfirm}
              className="w-full rounded-xl py-3 transition-colors"
              style={{ background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#B91C1C'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItemDef {
  id: string;
  href: string;
  label: string;
  Icon: LucideIcon;
  iconSize?: number;
  badge?: SidebarBadgeSpec;
  subLabel?: string;
  subLabelColor?: string;
  subLabelMono?: boolean;
  aiDot?: boolean;
  secondary?: boolean;
}

type NavEntry =
  | { section: string }
  | { divider: true }
  | { item: NavItemDef };

const navEntriesForData = (data: InsurancePortalData | null): NavEntry[] => {
  const overdueCount  = data?.preAuthorizations.filter(p => p.status === 'overdue').length ?? 0;
  const pendingCount  = data?.preAuthorizations.filter(p => p.status === 'review' || p.status === 'overdue').length ?? 0;
  const claimsCount   = data?.claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length ?? 0;
  const fraudCount    = data?.fraudAlerts.filter(a => a.status !== 'resolved').length ?? 0;
  const activeMembers = data?.profile?.activeMembers;

  return [
    { item: { id: 'dashboard', href: '/insurance/dashboard', label: 'Dashboard',         Icon: LayoutDashboard, badge: overdueCount > 0  ? { count: overdueCount,  type: 'urgent' } : undefined } },
    { item: { id: 'preauth',   href: '/insurance/preauth',   label: 'Pre-Authorizations', Icon: ClipboardList,   badge: pendingCount > 0  ? { count: pendingCount,  type: 'amber'  } : undefined } },
    { divider: true },
    { item: { id: 'claims',    href: '/insurance/claims',    label: 'Claims',              Icon: FileText,        badge: claimsCount > 0   ? { count: claimsCount,   type: 'info'   } : undefined } },
    { item: { id: 'members',   href: '/insurance/members',   label: 'Members',             Icon: Users,           subLabel: activeMembers ? `${formatNumber(activeMembers)} active` : '— active', subLabelColor: 'rgba(96,165,250,0.6)', subLabelMono: true } },
    { item: { id: 'wellness',  href: '/insurance/wellness',  label: 'Wellness',            Icon: Heart,           subLabel: 'Member health outreach', subLabelColor: 'rgba(52,211,153,0.7)' } },
    { section: 'INTELLIGENCE' },
    { item: { id: 'fraud',     href: '/insurance/fraud',     label: 'Fraud Detection',     Icon: AlertTriangle,   badge: fraudCount > 0    ? { count: fraudCount,    type: 'urgent' } : undefined } },
    { item: { id: 'analytics', href: '/insurance/analytics', label: 'Risk Analytics',      Icon: BarChart3,       subLabel: 'AI-powered insights',   subLabelColor: 'rgba(167,139,250,0.7)', aiDot: true } },
    { item: { id: 'network',   href: '/insurance/network',   label: 'Network Providers',   Icon: Building2,       subLabel: 'Contracted network',    subLabelColor: 'rgba(96,165,250,0.6)',  subLabelMono: true } },
    { section: 'REPORTING' },
    { item: { id: 'reports',   href: '/insurance/reports',   label: 'Reports',             Icon: FileBarChart,    subLabel: 'DHA format available',  subLabelColor: 'rgba(45,212,191,0.6)' } },
    { divider: true },
    { section: 'ACCOUNT' },
    { item: { id: 'settings',  href: '/insurance/settings',  label: 'Settings',            Icon: Settings, iconSize: 16, secondary: true } },
  ];
};

// ─── InsuranceShell ───────────────────────────────────────────────────────────

const InsuranceShell = ({
  data,
  children,
  loadError,
  onRetry,
}: {
  data: InsurancePortalData | null;
  children: ReactNode;
  loadError?: string | null;
  onRetry?: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  // ── Sidebar state ──
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('insurance-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [showSignOut, setShowSignOut]   = useState(false);
  const [signingOut, setSigningOut]     = useState(false);
  const [hoveredId, setHoveredId]       = useState<string | null>(null);
  const [tooltipId, setTooltipId]       = useState<string | null>(null);
  const timerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Topbar state ──
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAvatar, setShowAvatar]               = useState(false);

  // ── Derived data ──
  const payerName      = data?.profile?.displayName ?? data?.organization?.name ?? 'Insurance payer';
  const officerName    = data?.profile?.officerName ?? 'Claims officer';
  const officerTitle   = data?.profile?.officerTitle ?? 'Claims officer';
  const officerInitials = officerName.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const overduePreAuth = data?.preAuthorizations.find(p => p.status === 'overdue') ?? null;
  const openFraud      = data?.fraudAlerts.filter(a => a.status !== 'resolved').length ?? 0;
  const slaBreached    = (data?.preAuthorizations.filter(p => p.status === 'overdue').length ?? 0) > 0;
  const pendingCount   = data?.preAuthorizations.filter(p => p.status === 'review' || p.status === 'overdue').length ?? 0;
  const claimValue     = data?.claims.reduce((s, c) => s + c.amountAed, 0) ?? 0;

  // ── Active path ──
  const currentPath =
    location.pathname === '/insurance/portal'            ? '/insurance/dashboard' :
    location.pathname === '/insurance/pre-authorizations'? '/insurance/preauth'   :
    location.pathname === '/insurance/risk-analytics'    ? '/insurance/analytics' :
    location.pathname;

  const navEntries = navEntriesForData(data);

  // ── Sidebar helpers ──
  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    setTooltipId(null);
    try { localStorage.setItem('insurance-sidebar-collapsed', String(next)); } catch {}
  };

  const onEnter = useCallback((id: string) => {
    setHoveredId(id);
    if (collapsed) {
      timerRef.current[id] = setTimeout(() => setTooltipId(id), 400);
    }
  }, [collapsed]);

  const onLeave = useCallback((id: string) => {
    setHoveredId(prev => prev === id ? null : prev);
    clearTimeout(timerRef.current[id]);
    delete timerRef.current[id];
    setTooltipId(prev => prev === id ? null : prev);
  }, []);

  const handleSignOut = async () => {
    setShowSignOut(false);
    setSigningOut(true);
    await signOut();
    navigate('/auth/login', { replace: true });
  };

  // ── Mock notifications (Phase 3 will wire to real data) ──
  const notifications = [
    { id: 1, text: 'Pre-auth SLA breach — PCI approval overdue',  time: '2 min ago',  type: 'red'   as const },
    { id: 2, text: 'New fraud alert flagged by AI (HIGH risk)',     time: '18 min ago', type: 'red'   as const },
    { id: 3, text: 'New pre-auth requests submitted',              time: '34 min ago', type: 'amber' as const },
    { id: 4, text: 'AI auto-approved claims today',                time: '1h ago',     type: 'green' as const },
  ];
  const typeColor = { red: '#EF4444', amber: '#F59E0B', green: '#10B981' };

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Sign-out overlay */}
      {signingOut && (
        <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center" style={{ background: '#fff' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #1E3A5F, #0D9488)' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>C</span>
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8' }}>Signing out securely...</div>
        </div>
      )}

      <SignOutModal
        open={showSignOut}
        officerName={officerName}
        officerTitle={officerTitle}
        officerInitials={officerInitials}
        payerName={payerName}
        pendingPreAuths={pendingCount}
        slaBreached={slaBreached}
        onCancel={() => setShowSignOut(false)}
        onConfirm={() => void handleSignOut()}
      />

      <div className="flex h-screen overflow-hidden bg-slate-50">

        {/* ── SIDEBAR ───────────────────────────────────────────── */}
        <aside
          className="flex flex-col flex-shrink-0"
          style={{
            width: collapsed ? 72 : 264,
            height: '100vh', position: 'sticky', top: 0,
            background: '#0F2D4A',
            borderRight: '1px solid rgba(71,85,105,0.3)',
            overflow: 'hidden',
            transition: 'width 280ms cubic-bezier(0.4,0,0.2,1)',
            zIndex: 40,
          }}
        >
          {/* Zone 1 — Logo */}
          <div
            className="flex items-center flex-shrink-0"
            style={{
              height: 64, gap: 10,
              padding: collapsed ? '0' : '0 14px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderBottom: '1px solid rgba(71,85,105,0.3)',
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: collapsed ? 36 : 32, height: collapsed ? 36 : 32,
                borderRadius: collapsed ? 18 : 10,
                background: 'linear-gradient(135deg, #0D9488, #2563EB)',
                transition: 'width 280ms, height 280ms, border-radius 280ms',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: collapsed ? 18 : 16, color: '#fff' }}>C</span>
            </div>
            {!collapsed && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#fff', lineHeight: 1.2 }}>CeenAiX</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '1.5px', lineHeight: 1 }}>
                  Insurance Portal
                </div>
              </div>
            )}
          </div>

          {/* Zone 2 — Company card */}
          <div
            style={{
              margin: '10px 10px 4px', borderRadius: 10,
              background: 'rgba(30,58,95,0.5)', border: '1px solid rgba(96,165,250,0.2)',
              padding: collapsed ? '10px 0' : 12, flexShrink: 0,
            }}
          >
            <div className="flex items-center" style={{ gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <div className="flex items-center justify-center flex-shrink-0"
                style={{ width: 40, height: 40, borderRadius: 20, background: '#fff', border: '1px solid rgba(96,165,250,0.3)' }}>
                <span style={{ fontWeight: 700, fontSize: 20, color: '#0F2D4A' }}>{payerName.charAt(0)}</span>
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{payerName}</div>
                  {data?.profile?.arabicName
                    ? <div style={{ fontSize: 10, color: '#BFDBFE' }}>{data.profile.arabicName}</div>
                    : null}
                </div>
              )}
            </div>

            {!collapsed && (
              <>
                <div style={{ height: 1, background: 'rgba(96,165,250,0.15)', margin: '8px 0' }} />
                {data?.profile?.regulatorName
                  ? <div style={{ fontSize: 9, color: '#93C5FD', letterSpacing: '0.5px', marginBottom: 2 }}>{data.profile.regulatorName}</div>
                  : null}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                  {formatNumber(data?.profile?.activeMembers)} members on CeenAiX
                </div>
                <div style={{ height: 1, background: 'rgba(96,165,250,0.15)', marginBottom: 8 }} />
                <div className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: '#34D399', animation: 'status-dot 2s ease-in-out infinite', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{officerName}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{officerTitle}</div>
                  </div>
                </div>
                {slaBreached && (
                  <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 mt-2"
                    style={{ background: 'rgba(127,29,29,0.5)', border: '1px solid rgba(239,68,68,0.3)', animation: 'sla-pulse 1.5s ease-in-out infinite' }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: '#F87171', flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#FCA5A5' }}>
                      {data?.preAuthorizations.filter(p => p.status === 'overdue').length} SLA Breach Active
                    </span>
                  </div>
                )}
              </>
            )}

            {collapsed && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: '#34D399', animation: 'status-dot 2s ease-in-out infinite' }} />
              </div>
            )}
          </div>

          {/* Zone 3 — Nav */}
          <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E3A5F transparent' }}>
            {navEntries.map((entry, idx) => {
              if ('divider' in entry) {
                return <div key={`d-${idx}`} style={{ height: 1, background: 'rgba(71,85,105,0.2)', margin: collapsed ? '8px auto' : '8px 14px', width: collapsed ? 32 : 'auto' }} />;
              }
              if ('section' in entry) {
                if (collapsed) return null;
                return (
                  <div key={`s-${idx}`}
                    style={{ height: 28, padding: '0 22px', display: 'flex', alignItems: 'center', marginTop: 8, fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    {entry.section}
                  </div>
                );
              }

              const item = entry.item;
              const isActive    = currentPath === item.href;
              const isHovered   = hoveredId === item.id;
              const isFraud     = item.id === 'fraud';
              const isSecondary = item.secondary;
              const iconSz      = item.iconSize ?? 18;

              let bg         = 'transparent';
              let textColor  = '#94A3B8';
              let iconColor  = '#64748B';
              let fontWeight: number | string = 400;
              let borderLeft = '3px solid transparent';
              let boxShadow  = 'none';

              if (isActive && !isSecondary) {
                bg = 'rgba(30,58,95,0.7)'; textColor = '#BFDBFE'; iconColor = '#60A5FA';
                borderLeft = '3px solid #60A5FA'; fontWeight = 700;
                boxShadow = 'inset 2px 0 8px rgba(96,165,250,0.1)';
              } else if (isActive && isSecondary) {
                bg = 'rgba(51,65,85,0.3)'; textColor = '#64748B'; iconColor = '#64748B';
              } else if (isHovered) {
                bg = 'rgba(30,58,95,0.4)'; textColor = '#BFDBFE'; iconColor = '#BFDBFE';
              }

              return (
                <div
                  key={item.id}
                  role="button" tabIndex={0}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  className="relative"
                  style={{
                    height: 44, margin: '1px 8px', borderRadius: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                    padding: collapsed ? '0' : '0 14px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 10,
                    background: bg, borderLeft, boxShadow,
                    transition: 'background 100ms',
                  }}
                  onClick={() => navigate(item.href)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(item.href); }}
                  onMouseEnter={() => onEnter(item.id)}
                  onMouseLeave={() => onLeave(item.id)}
                >
                  <item.Icon
                    style={{
                      width: collapsed ? 22 : iconSz, height: collapsed ? 22 : iconSz,
                      color: iconColor, flexShrink: 0, transition: 'color 100ms',
                      animation: isFraud && !isActive && (item.badge?.count ?? 0) > 0 ? 'fraud-pulse 2s ease-in-out infinite' : undefined,
                    }}
                  />

                  {!collapsed && (
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <div className="flex-1 min-w-0">
                        {item.aiDot && (
                          <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: 2, background: 'rgba(167,139,250,0.6)', marginRight: 4, verticalAlign: 'middle' }} />
                        )}
                        <span style={{ fontSize: 13, fontWeight, color: textColor, transition: 'color 100ms' }}>{item.label}</span>
                        {item.subLabel && (
                          <div style={{ fontFamily: item.subLabelMono ? 'DM Mono, monospace' : undefined, fontSize: 9, color: item.subLabelColor ?? 'rgba(96,165,250,0.6)', marginTop: -1, lineHeight: 1.3 }}>
                            {item.subLabel}
                          </div>
                        )}
                      </div>
                      {item.badge && item.badge.count > 0 && <SidebarBadge spec={item.badge} />}
                      {item.id === 'dashboard' && slaBreached && (
                        <div title="SLA breached" style={{ width: 6, height: 6, borderRadius: 3, background: '#EF4444', animation: 'sla-pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
                      )}
                    </div>
                  )}

                  {collapsed && item.badge && item.badge.count > 0 && (
                    <div style={{ position: 'absolute', top: 4, right: 4 }}>
                      <SidebarBadge spec={item.badge} small />
                    </div>
                  )}

                  {collapsed && <SidebarTooltip text={item.label} visible={tooltipId === item.id} />}
                </div>
              );
            })}
          </div>

          {/* Zone 4 — Footer */}
          <div className="flex-shrink-0" style={{ borderTop: '1px solid rgba(71,85,105,0.3)', padding: 8 }}>
            {!collapsed && (
              <div className="rounded-lg mb-2" style={{ background: 'rgba(30,58,95,0.4)', padding: '10px 12px' }}>
                <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color: '#34D399' }}>
                    {formatCurrency(claimValue)}
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>claims processed</span>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#93C5FD', marginBottom: 6 }}>
                  {formatNumber(data?.profile?.claimsTodayCount ?? 0)} today · {data?.profile?.aiAutoApprovalPercent ?? 0}% auto-approved
                </div>
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: '#34D399', animation: 'status-dot 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 9, color: '#6EE7B7' }}>Live workspace</span>
                </div>
              </div>
            )}

            <button
              onClick={toggleCollapse}
              aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
              className="flex items-center rounded-lg transition-colors w-full"
              style={{ height: 36, padding: collapsed ? '0' : '0 12px', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8, marginBottom: 4, background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,58,95,0.4)'; e.currentTarget.style.color = '#94A3B8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
            >
              {collapsed
                ? <ChevronRight style={{ width: 16, height: 16 }} />
                : <><ChevronLeft style={{ width: 16, height: 16 }} /><span style={{ fontSize: 11 }}>Collapse menu</span></>
              }
            </button>

            <button
              onClick={() => setShowSignOut(true)}
              aria-label="Sign out"
              className="flex items-center rounded-lg transition-colors w-full"
              style={{ height: 40, padding: collapsed ? '0' : '0 12px', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(127,29,29,0.3)'; e.currentTarget.style.color = '#F87171'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
            >
              <LogOut style={{ width: collapsed ? 18 : 16, height: collapsed ? 18 : 16 }} />
              {!collapsed && <span style={{ fontSize: 13 }}>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* ── MAIN AREA ─────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* TopBar */}
          <div
            className="flex items-center px-5 flex-shrink-0 sticky top-0 z-30"
            style={{ height: 60, background: '#ffffff', borderBottom: '1px solid #E2E8F0' }}
          >
            {/* Brand */}
            <div className="flex items-center gap-3 flex-shrink-0" style={{ width: 240 }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D9488 100%)' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>C</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', lineHeight: 1.2 }}>Insurance Portal</div>
                <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1 }}>{payerName}</div>
              </div>
            </div>

            {/* SLA breach centre alert */}
            <div className="flex-1 flex items-center justify-center px-4">
              {overduePreAuth ? (
                <button
                  onClick={() => navigate('/insurance/preauth')}
                  className="flex items-center gap-2.5 rounded-lg px-3.5 py-2 transition-all"
                  style={{ background: '#FFF5F5', border: '1px solid #FCA5A5' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FFF5F5'; }}
                >
                  <AlertOctagon style={{ width: 13, height: 13, color: '#DC2626', flexShrink: 0 }} className="animate-pulse" />
                  <span style={{ fontSize: 12, color: '#991B1B', fontWeight: 700 }}>SLA BREACH:</span>
                  <span style={{ fontSize: 12, color: '#DC2626' }}>
                    {overduePreAuth.externalRef} · {overduePreAuth.procedureName} · {overduePreAuth.patientName}
                  </span>
                  <span className="rounded px-2 py-0.5 flex-shrink-0" style={{ fontSize: 11, background: '#DC2626', color: '#fff', fontWeight: 700 }}>
                    Review
                  </span>
                </button>
              ) : null}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
              >
                <Search style={{ width: 14, height: 14, color: '#64748B' }} />
              </button>

              <button
                onClick={() => {
                  const rows = data?.preAuthorizations ?? [];
                  const header = ['ref','patient','clinician','provider','procedure','priority','status','requested_aed','approved_aed','ai_recommendation','ai_confidence','sla_due_at'];
                  const escape = (v: string | number | null | undefined) => {
                    if (v === null || v === undefined) return '';
                    const s = String(v);
                    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
                  };
                  const body = [header, ...rows.map(row => [
                    row.externalRef, row.patientName, row.clinicianName, row.providerName,
                    row.procedureName, row.priority, row.status,
                    row.requestedAmountAed ?? '', row.approvedAmountAed ?? '',
                    row.aiRecommendation ?? '', row.aiConfidencePercent ?? '', row.slaDueAt ?? '',
                  ])].map(line => line.map(escape).join(',')).join('\n');
                  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `insurance-pre-auths-${new Date().toISOString().slice(0, 10)}.csv`;
                  document.body.appendChild(link); link.click();
                  document.body.removeChild(link); URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12, color: '#475569' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
              >
                <Download style={{ width: 13, height: 13 }} />
                Export
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifications(n => !n); setShowAvatar(false); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center relative transition-colors"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                >
                  <Bell style={{ width: 14, height: 14, color: '#475569' }} />
                  {openFraud > 0 && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444' }} />}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-10 rounded-xl shadow-2xl overflow-hidden z-50"
                    style={{ width: 320, background: '#fff', border: '1px solid #E2E8F0' }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Notifications</span>
                      <button onClick={() => setShowNotifications(false)} className="rounded-md p-1 hover:bg-slate-100">
                        <X style={{ width: 13, height: 13, color: '#94A3B8' }} />
                      </button>
                    </div>
                    {notifications.map(n => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer" style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: typeColor[n.type] }} />
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.4 }}>{n.text}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{n.time}</div>
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-2.5" style={{ borderTop: '1px solid #F1F5F9' }}>
                      <button className="text-center w-full" style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className="relative">
                <button
                  onClick={() => { setShowAvatar(a => !a); setShowNotifications(false); }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#1E3A5F' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{officerInitials || 'IO'}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{officerName.split(' ')[0]}</span>
                  <ChevronDown style={{ width: 11, height: 11, color: '#94A3B8' }} />
                </button>
                {showAvatar && (
                  <div className="absolute right-0 top-10 rounded-xl shadow-2xl overflow-hidden z-50"
                    style={{ width: 200, background: '#fff', border: '1px solid #E2E8F0' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{officerName}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{officerTitle}</div>
                    </div>
                    {[
                      { label: 'Settings', color: '#475569', action: () => { setShowAvatar(false); navigate('/insurance/settings'); } },
                      { label: 'Sign Out', color: '#EF4444', action: () => { setShowAvatar(false); setShowSignOut(true); } },
                    ].map(item => (
                      <button
                        key={item.label}
                        className="flex w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                        style={{ fontSize: 13, color: item.color }}
                        onClick={item.action}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {loadError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                  <p>{loadError}</p>
                  {onRetry ? (
                    <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Retry</button>
                  ) : null}
                </div>
              ) : null}
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default InsuranceShell;

// ─── Shared page components ───────────────────────────────────────────────────

export const PreAuthAlert = ({ item }: { item: InsurancePreAuthorization | null }) => {
  const navigate = useNavigate();
  const [overdueMins, setOverdueMins] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!item || item.status !== 'overdue') return;
    const delta = Math.max(0, Math.round((Date.now() - new Date(item.slaDueAt).getTime()) / 60_000));
    setOverdueMins(delta);
    const interval = setInterval(() => setOverdueMins(m => m + 1), 60_000);
    return () => clearInterval(interval);
  }, [item]);

  if (!item || dismissed) return null;

  return (
    <div
      className="rounded-xl flex items-center gap-4"
      style={{
        background: 'linear-gradient(135deg, #FFF5F5 0%, #FEF2F2 100%)',
        border: '1px solid #FCA5A5',
        padding: '14px 18px',
        boxShadow: '0 1px 4px rgba(220,38,38,0.08)',
      }}
    >
      {/* Left indicator */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#DC2626' }} />
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#DC2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          SLA BREACH
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 4 }}>
            {item.externalRef}
          </span>
          {item.status === 'overdue' && overdueMins > 0 && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#B91C1C' }}>
              +{overdueMins} min past DHA {item.slaDueAt ? '4h' : 'SLA'} limit
            </span>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#7F1D1D', marginBottom: 2 }}>
          {item.procedureName} — {item.patientName}
        </div>
        <div style={{ fontSize: 12, color: '#991B1B' }}>
          {item.clinicianName} · {item.providerName} · {item.priority === 'urgent' ? 'Urgent' : 'Standard'} pre-authorization
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate('/insurance/preauth')}
          className="flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
          style={{ background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#B91C1C'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; }}
        >
          <ClipboardList style={{ width: 14, height: 14 }} />
          Review Now
        </button>
        <button
          className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
          style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 13, fontWeight: 600, border: '1px solid #FCA5A5' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FECACA'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FEE2E2'; }}
        >
          <Phone style={{ width: 13, height: 13 }} />
          Call
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; }}
        >
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  );
};

export const ClaimsTodayCard = ({
  claims, activeMembers,
}: {
  claims: InsuranceClaim[];
  activeMembers: number | null | undefined;
}) => {
  const groups = [
    { key: 'approved', label: 'Auto-approved', count: claims.filter(c => c.status === 'approved').length,                                           amount: claims.filter(c => c.status === 'approved').reduce((s, c) => s + c.amountAed, 0),                                           color: '#10b981', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    { key: 'pending',  label: 'Pending',        count: claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length,           amount: claims.filter(c => c.status === 'submitted' || c.status === 'under_review').reduce((s, c) => s + c.amountAed, 0),           color: '#f59e0b', text: 'text-amber-700',   bg: 'bg-amber-50'   },
    { key: 'denied',   label: 'Denied',         count: claims.filter(c => c.status === 'denied').length,                                             amount: claims.filter(c => c.status === 'denied').reduce((s, c) => s + c.amountAed, 0),                                             color: '#ef4444', text: 'text-red-700',     bg: 'bg-red-50'     },
    { key: 'appealed', label: 'Appealed',        count: claims.filter(c => c.status === 'appealed').length,                                           amount: claims.filter(c => c.status === 'appealed').reduce((s, c) => s + c.amountAed, 0),                                           color: '#8b5cf6', text: 'text-violet-700',  bg: 'bg-violet-50'  },
  ];
  const totalCount = groups.reduce((s, g) => s + g.count, 0);
  const totalAmount = groups.reduce((s, g) => s + g.amount, 0);
  const exposurePerMember = activeMembers && activeMembers > 0 ? Math.round(totalAmount / activeMembers) : 0;
  const circumference = 2 * Math.PI * 42;
  let offset = 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">Claims Today</h2>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900">{formatCurrency(totalAmount)}</div>
          <div className="text-xs text-slate-400">{formatNumber(totalCount)} claims from insurance_claims</div>
        </div>
        <FileText className="h-5 w-5 text-blue-500" />
      </div>
      <div className="mb-5 flex items-center justify-center">
        <svg width="176" height="176" viewBox="0 0 112 112" role="img" aria-label="Claims status breakdown chart">
          <circle cx="56" cy="56" r="42" fill="none" stroke="#e2e8f0" strokeWidth="14" />
          {groups.map(group => {
            const ratio = totalAmount > 0 ? group.amount / totalAmount : 0;
            const dash = ratio * circumference;
            const element = (
              <circle key={group.key} cx="56" cy="56" r="42" fill="none" stroke={group.color} strokeWidth="14"
                strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset}
                strokeLinecap="round" transform="rotate(-90 56 56)" />
            );
            offset += dash;
            return element;
          })}
          <circle cx="56" cy="56" r="29" fill="#ffffff" />
          <text x="56" y="53" textAnchor="middle" className="fill-slate-900 text-[13px] font-bold">{formatNumber(totalCount)}</text>
          <text x="56" y="66" textAnchor="middle" className="fill-slate-400 text-[7px]">claims</text>
        </svg>
      </div>
      <div className="space-y-2">
        {groups.map(group => (
          <div key={group.key} className={`rounded-xl px-3 py-2 ${group.bg}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                <span className={`truncate text-sm font-semibold ${group.text}`}>{group.label}</span>
              </div>
              <div className="text-right">
                <div className={`font-mono text-sm font-bold ${group.text}`}>{formatNumber(group.count)}</div>
                <div className="font-mono text-[11px] text-slate-500">{formatCurrency(group.amount)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Total claim value</span>
          <span className="font-mono font-bold text-slate-800">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">Daman exposure per active member</span>
          <span className="font-mono font-bold text-slate-800">{formatCurrency(exposurePerMember)}</span>
        </div>
      </div>
    </div>
  );
};

export const aiRecBadge = (rec: InsurancePreAuthorization['aiRecommendation']) => {
  if (rec === 'approve') return { label: '✓ AI: APPROVE', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' };
  if (rec === 'review')  return { label: '⚠ AI: REVIEW',  cls: 'bg-amber-100 text-amber-700 ring-amber-200'   };
  if (rec === 'deny')    return { label: '✗ AI: DENY',    cls: 'bg-rose-100 text-rose-700 ring-rose-200'       };
  return { label: '— AI: PENDING', cls: 'bg-slate-100 text-slate-600 ring-slate-200' };
};

export const planTierTone = (label: string | null) => {
  const v = (label ?? '').toLowerCase();
  if (v.includes('gold'))   return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (v.includes('silver')) return 'bg-slate-100 text-slate-700 ring-slate-200';
  if (v.includes('basic'))  return 'bg-blue-50 text-blue-700 ring-blue-200';
  return 'bg-slate-50 text-slate-600 ring-slate-200';
};

export const ageGenderShort = (age: number | null, gender: string | null) => {
  if (age == null && !gender) return '';
  const g = gender ? gender.charAt(0).toUpperCase() : '';
  if (age == null) return g;
  return `${age}${g}`;
};

export const PreAuthHostedTable = ({
  rows, max, onApproved,
}: {
  rows: InsurancePreAuthorization[];
  max?: number;
  onApproved?: () => void;
}) => {
  const navigate = useNavigate();
  const visible = max ? rows.slice(0, max) : rows;
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowError,  setRowError]  = useState<string | null>(null);

  const handleRowApprove = async (row: InsurancePreAuthorization) => {
    setRowError(null);
    setRowBusyId(row.id);
    try {
      await approvePreAuthorization(row.id, row.requestedAmountAed);
      onApproved?.();
    } catch (error) {
      setRowError(error instanceof Error ? error.message : 'Approval failed.');
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100">
      <div className="overflow-x-auto">
        <table className="min-w-[1080px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            <tr>
              <th className="px-3 py-2.5">PA Ref</th>
              <th className="px-3 py-2.5">Patient</th>
              <th className="px-3 py-2.5">Doctor / Clinic</th>
              <th className="px-3 py-2.5">Procedure</th>
              <th className="px-3 py-2.5">Est. Cost</th>
              <th className="px-3 py-2.5">AI Rec</th>
              <th className="px-3 py-2.5">SLA</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visible.map(row => {
              const overdue = row.status === 'overdue';
              const ai = aiRecBadge(row.aiRecommendation);
              const slaLabel = overdue ? 'OVERDUE' : formatSla(row.slaDueAt);
              return (
                <tr key={row.id} className={`align-top ${overdue ? 'bg-red-50/50' : ''}`}>
                  <td className="px-3 py-3">
                    <div className="font-mono text-xs font-bold text-slate-700">{row.externalRef.replace(/^PA-\d+-/, 'PA-')}</div>
                    {overdue ? <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">OVERDUE</span> : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-slate-900">{row.patientName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      {row.planLabel ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${planTierTone(row.planLabel)}`}>{row.planLabel}</span> : null}
                      {ageGenderShort(row.patientAge, row.patientGender) ? <span className="font-mono text-[10px] text-slate-500">{ageGenderShort(row.patientAge, row.patientGender)}</span> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-slate-700">{row.clinicianName}</div>
                    <div className="text-xs text-slate-500">{row.providerName}</div>
                    {row.isCeenaixEprescribed ? <div className="mt-0.5 text-[10px] font-semibold text-emerald-700">CeenAiX ✅</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-slate-900">{row.procedureName}</div>
                    {row.procedureIcdCode ? <div className="font-mono text-[10px] text-slate-500">{row.procedureIcdCode}</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-mono text-sm font-bold text-slate-800">{formatCurrency(row.requestedAmountAed)}</div>
                    {row.coverageLabel ? <div className={`text-[11px] font-semibold ${row.coverageLabel.toLowerCase().includes('not') ? 'text-rose-600' : 'text-emerald-600'}`}>{row.coverageLabel}</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${ai.cls}`}>{ai.label}</span>
                    {row.aiConfidencePercent != null ? <div className="mt-0.5 font-mono text-[10px] text-slate-500">{row.aiConfidencePercent}% confidence</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold ${overdue ? 'text-red-700' : 'text-slate-600'}`}>{slaLabel}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleRowApprove(row)}
                        disabled={rowBusyId === row.id || row.status === 'approved'}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {row.status === 'approved' ? 'Approved' : rowBusyId === row.id ? '…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/insurance/preauth')}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Review
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">No pre-authorizations match this filter.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {rowError ? <p className="px-3 py-2 text-[11px] font-semibold text-rose-600">{rowError}</p> : null}
    </div>
  );
};

export const AiInsightCard = ({ insight }: { insight: InsuranceAiInsight }) => {
  const tone =
    insight.insightType === 'preventive' ? 'border-blue-200 bg-blue-50' :
    insight.insightType === 'cluster_risk' || insight.insightType === 'cluster' ? 'border-amber-200 bg-amber-50' :
    'border-emerald-200 bg-emerald-50';
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="text-sm font-bold text-slate-900">{insight.title}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-700">{insight.description}</p>
      {insight.savingsLabel ? <div className="mt-2 font-mono text-[11px] font-semibold text-slate-600">{insight.savingsLabel}</div> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {insight.primaryActionLabel ? (
          insight.primaryActionUrl
            ? <a href={insight.primaryActionUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-[#1E3A5F] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#27537f]">{insight.primaryActionLabel}</a>
            : <button type="button" disabled className="rounded-lg bg-[#1E3A5F] px-2.5 py-1 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{insight.primaryActionLabel}</button>
        ) : null}
        {insight.secondaryActionLabel ? (
          insight.secondaryActionUrl
            ? <a href={insight.secondaryActionUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">{insight.secondaryActionLabel}</a>
            : <button type="button" disabled className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-60">{insight.secondaryActionLabel}</button>
        ) : null}
      </div>
    </div>
  );
};

export const FraudAlertCard = ({ alert }: { alert: InsuranceFraudAlert }) => {
  const isHigh = alert.severity === 'high';
  return (
    <div className={`rounded-xl border p-3 ${isHigh ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold uppercase ${isHigh ? 'text-red-700' : 'text-amber-700'}`}>
          {isHigh ? '🔴 HIGH' : '🟡 MEDIUM'} ({alert.score}% confidence)
        </span>
      </div>
      <div className="mt-1 text-sm font-bold text-slate-900">{alert.subjectName}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-700">{alert.reason}</div>
      <div className="mt-2 font-mono text-[11px] font-semibold text-slate-600">Amount at risk: {formatCurrency(alert.exposureAmountAed)}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Link to="/insurance/fraud" className="rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-red-700">Investigate</Link>
        <button type="button" disabled className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[10px] font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60">Freeze Claims</button>
      </div>
    </div>
  );
};

export const fraudScoreBadge = (score: 'low' | 'medium' | 'high' | null) => {
  if (score === 'high')   return { label: '🔴 HIGH',    cls: 'text-red-700'     };
  if (score === 'medium') return { label: '🟡 Medium',  cls: 'text-amber-700'   };
  if (score === 'low')    return { label: '🟢 Low',     cls: 'text-emerald-700' };
  return { label: '—', cls: 'text-slate-500' };
};

export const NetworkProvidersTable = ({ rows }: { rows: InsuranceNetworkProvider[] }) => (
  <div className="overflow-hidden rounded-xl border border-slate-100">
    <div className="overflow-x-auto">
      <table className="min-w-[640px] w-full text-sm">
        <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          <tr>
            <th className="px-3 py-2.5">Provider</th>
            <th className="px-3 py-2.5 text-right">Claims</th>
            <th className="px-3 py-2.5 text-right">Avg Value</th>
            <th className="px-3 py-2.5 text-right">Denial %</th>
            <th className="px-3 py-2.5">Fraud Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map(row => {
            const fraud = fraudScoreBadge(row.fraudScore);
            const denialOk = row.denialRatePercent != null && row.denialRatePercent < 5;
            return (
              <tr key={row.id} className="align-top">
                <td className="px-3 py-3">
                  <div className="text-sm font-semibold text-slate-900">{row.providerName}</div>
                  <div className="text-xs text-slate-500">{row.performanceFlag}</div>
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm text-slate-700">{row.claimsCount}</td>
                <td className="px-3 py-3 text-right font-mono text-sm font-bold text-slate-800">{formatCurrency(row.averageCostAed)}</td>
                <td className="px-3 py-3 text-right font-mono text-sm font-bold">
                  <span className={denialOk ? 'text-emerald-700' : 'text-amber-700'}>
                    {row.denialRatePercent ?? row.approvalRatePercent}%{denialOk ? ' ✅' : ' ⚠'}
                  </span>
                </td>
                <td className={`px-3 py-3 font-bold ${fraud.cls}`}>{fraud.label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export const MonthlyVolumeChart = ({ points }: { points: InsuranceMonthlyClaimsVolumePoint[] }) => {
  const maxValue = Math.max(1, ...points.map(p => p.claimsValueAed));
  const maxCount = Math.max(1, ...points.map(p => p.claimsCount));
  const [mode, setMode] = useState<'volume' | 'value' | 'both'>('both');
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(['volume', 'value', 'both'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ${mode === m ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {points.map(p => {
          const valueH = Math.round((p.claimsValueAed / maxValue) * 100);
          const countH = Math.round((p.claimsCount  / maxCount)  * 100);
          return (
            <div key={p.id} className={`flex h-44 flex-col justify-end rounded-xl p-2 ${p.isCurrentMonth ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-slate-50'}`}>
              <div className="flex flex-1 items-end gap-1">
                {(mode === 'volume' || mode === 'both') ? <div className="w-full rounded-t bg-blue-500"   style={{ height: `${countH}%` }} /> : null}
                {(mode === 'value'  || mode === 'both') ? <div className="w-full rounded-t bg-violet-500" style={{ height: `${valueH}%` }} /> : null}
              </div>
              <div className="mt-2 text-center font-mono text-[11px] text-slate-700">{p.monthLabel}</div>
              <div className="text-center font-mono text-[10px] text-slate-500">{(p.claimsValueAed / 1_000_000).toFixed(1)}M</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Shared data hook ─────────────────────────────────────────────────────────

export const useInsurancePageData = () => {
  const query = useInsurancePortal();
  const data = query.data;
  const pendingPreAuths = data?.preAuthorizations.filter(p => p.status === 'review' || p.status === 'overdue') ?? [];
  const overduePreAuth  = pendingPreAuths.find(p => p.status === 'overdue') ?? pendingPreAuths[0] ?? null;
  const claimTotal      = data?.claims.reduce((sum, c) => sum + c.amountAed, 0) ?? 0;
  const approvedClaims  = data?.claims.filter(c => c.status === 'approved') ?? [];
  const openFraud       = data?.fraudAlerts.filter(a => a.status !== 'resolved') ?? [];
  return { ...query, data, pendingPreAuths, overduePreAuth, claimTotal, approvedClaims, openFraud };
};
