import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search, Settings, ChevronDown, ChevronRight, GitCompare, Download, Upload, FileText,
  Clock, AlertTriangle, Info, X, Eye, EyeOff, Check, RefreshCw, MoreVertical,
  Shield, Zap, Globe, Database, Bell, Server, Code2, Flag, BarChart3, Store,
  AlertOctagon, Users, Layers, Building2, Bot
} from 'lucide-react';
import AdminPageLayout from '../../components/admin/AdminPageLayout';
import { Chip, DirtyDot } from './primitives';

// Section components
import GeneralSection from './sections/GeneralSection';
import WorkspacesSection from './sections/WorkspacesSection';
import PortalsSection from './sections/PortalsSection';
import IdentityAccessSection from './sections/IdentityAccessSection';
import AISection from './sections/AISection';
import IntegrationsSection from './sections/IntegrationsSection';
import RegulatorySection from './sections/RegulatorySection';
import BillingSection from './sections/BillingSection';
import NotificationsSection from './sections/NotificationsSection';
import StorageSection from './sections/StorageSection';
import SearchSection from './sections/SearchSection';
import FeatureFlagsSection from './sections/FeatureFlagsSection';
import DeveloperSection from './sections/DeveloperSection';
import EnvironmentsSection from './sections/EnvironmentsSection';
import TelemetrySection from './sections/TelemetrySection';
import MarketplaceSection from './sections/MarketplaceSection';
import DangerZoneSection from './sections/DangerZoneSection';

// ── Types ──────────────────────────────────────────────────────────────────────
type EnvType = 'production' | 'staging' | 'sandbox';

interface SectionItem {
  id: string;
  label: string;
  icon: React.ElementType;
  dirty?: boolean;
}

interface NavGroup {
  label: string;
  items: SectionItem[];
}

// ── Navigation definition ─────────────────────────────────────────────────────
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'General',
    items: [
      { id: 'platform-identity', label: 'Platform identity', icon: Building2 },
      { id: 'branding', label: 'Branding & theming', icon: Globe },
      { id: 'locales', label: 'Locales & regions', icon: Globe },
      { id: 'time-date', label: 'Time, date & calendar', icon: Clock },
      { id: 'currency', label: 'Currency & formatting', icon: BarChart3 },
      { id: 'communication', label: 'Communication tone', icon: Bell },
      { id: 'maintenance', label: 'Maintenance & freeze', icon: Server },
    ],
  },
  {
    label: 'Workspaces',
    items: [
      { id: 'workspace-defaults', label: 'Workspace defaults', icon: Layers },
      { id: 'workspace-lifecycle', label: 'Workspace lifecycle', icon: RefreshCw },
      { id: 'workspace-tiers', label: 'Tiers & limits', icon: BarChart3 },
      { id: 'tenant-isolation', label: 'Tenant isolation policy', icon: Shield },
    ],
  },
  {
    label: 'Portals',
    items: [
      { id: 'patient-portal', label: 'Patient Portal', icon: Users },
      { id: 'doctor-portal', label: 'Doctor Portal', icon: Users },
      { id: 'pharmacy-portal', label: 'Pharmacy Portal', icon: Users },
      { id: 'lab-portal', label: 'Lab & Radiology Portal', icon: Users },
      { id: 'insurance-portal', label: 'Insurance Portal', icon: Users },
      { id: 'admin-portal', label: 'Super Admin defaults', icon: Users },
      { id: 'public-site', label: 'Public site defaults', icon: Globe },
    ],
  },
  {
    label: 'Identity & Access',
    items: [
      { id: 'auth-baseline', label: 'Authentication baseline', icon: Shield },
      { id: 'session-policy', label: 'Session policy', icon: Clock },
      { id: 'sso-idp', label: 'SSO & identity providers', icon: Shield },
      { id: 'role-inheritance', label: 'Role inheritance', icon: Users },
    ],
  },
  {
    label: 'AI & Clinical Intelligence',
    items: [
      { id: 'ai-providers', label: 'AI providers & routing', icon: Bot },
      { id: 'model-registry', label: 'Model registry', icon: Bot },
      { id: 'clinical-guardrails', label: 'Clinical guardrails', icon: Shield },
      { id: 'prompt-policy', label: 'Prompt & content policy', icon: FileText },
      { id: 'ai-governance', label: 'AI usage governance', icon: BarChart3 },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { id: 'integration-defaults', label: 'Integration defaults', icon: Zap },
      { id: 'webhook-eventbus', label: 'Webhook & event bus', icon: Zap },
      { id: 'network-policy', label: 'Outbound network policy', icon: Globe },
    ],
  },
  {
    label: 'Regulatory & Compliance',
    items: [
      { id: 'frameworks', label: 'Regulatory frameworks', icon: Shield },
      { id: 'data-residency', label: 'Data residency', icon: Database },
      { id: 'retention', label: 'Retention defaults', icon: Clock },
      { id: 'consent', label: 'Consent framework', icon: FileText },
      { id: 'phi-handling', label: 'PHI handling defaults', icon: Shield },
      { id: 'audit-chain', label: 'Audit & evidence chain', icon: FileText },
    ],
  },
  {
    label: 'Billing & Revenue',
    items: [
      { id: 'pricing-plans', label: 'Pricing & plans', icon: BarChart3 },
      { id: 'tax-invoicing', label: 'Tax & invoicing', icon: FileText },
      { id: 'payouts', label: 'Payouts defaults', icon: BarChart3 },
      { id: 'dunning', label: 'Dunning defaults', icon: Bell },
      { id: 'fx', label: 'Currency & FX', icon: Globe },
    ],
  },
  {
    label: 'Notifications & Communications',
    items: [
      { id: 'notif-channels', label: 'Notification channels', icon: Bell },
      { id: 'sender-identities', label: 'Sender identities', icon: Bell },
      { id: 'quiet-hours', label: 'Quiet hours & throttles', icon: Clock },
      { id: 'templates', label: 'Templates library', icon: FileText },
    ],
  },
  {
    label: 'Files, Storage & Imaging',
    items: [
      { id: 'upload-limits', label: 'Upload limits & types', icon: Database },
      { id: 'storage-policy', label: 'Object storage policy', icon: Database },
      { id: 'dicom', label: 'DICOM imaging defaults', icon: Database },
      { id: 'doc-retention', label: 'Document retention', icon: FileText },
    ],
  },
  {
    label: 'Search & Indexing',
    items: [
      { id: 'index-scope', label: 'Indexing scope', icon: Search },
      { id: 'index-refresh', label: 'Index refresh policy', icon: RefreshCw },
      { id: 'search-redaction', label: 'Search redaction', icon: EyeOff },
    ],
  },
  {
    label: 'Feature Flags & Experiments',
    items: [
      { id: 'flag-registry', label: 'Feature flag registry', icon: Flag },
      { id: 'experiments', label: 'Experiment program', icon: Flag },
      { id: 'rollout-policy', label: 'Rollout policy', icon: Flag },
    ],
  },
  {
    label: 'Developer & API',
    items: [
      { id: 'api-keys', label: 'API keys & OAuth', icon: Code2 },
      { id: 'rate-limits', label: 'Rate limits', icon: BarChart3 },
      { id: 'api-docs', label: 'API documentation', icon: FileText },
      { id: 'sandbox', label: 'Sandbox provisioning', icon: Server },
    ],
  },
  {
    label: 'Environments',
    items: [
      { id: 'env-registry', label: 'Environment registry', icon: Server },
      { id: 'promotion-policy', label: 'Promotion policy', icon: GitCompare },
      { id: 'config-export', label: 'Config export/import', icon: Download },
    ],
  },
  {
    label: 'Telemetry',
    items: [
      { id: 'metrics-logs', label: 'Metrics, logs & traces', icon: BarChart3 },
      { id: 'analytics', label: 'Anonymized analytics', icon: BarChart3 },
      { id: 'customer-telemetry', label: 'Customer telemetry', icon: Bell },
    ],
  },
  {
    label: 'Marketplace & Apps',
    items: [
      { id: 'marketplace-catalog', label: 'Connector marketplace', icon: Store },
      { id: 'app-approval', label: 'App approval workflow', icon: Check },
      { id: 'vendor-risk', label: 'Vendor risk policy', icon: Shield },
    ],
  },
  {
    label: 'Danger Zone',
    items: [
      { id: 'danger', label: 'Danger Zone', icon: AlertOctagon },
    ],
  },
];

// Map section IDs to parent group
const SECTION_TO_COMPONENT: Record<string, string> = {};
NAV_GROUPS.forEach(g => {
  g.items.forEach(item => {
    SECTION_TO_COMPONENT[item.id] = g.label;
  });
});

const RECENTLY_CHANGED = ['ai-providers', 'data-residency', 'frameworks', 'workspace-tiers', 'flag-registry'];

// ── Pending changes strip ─────────────────────────────────────────────────────
function PendingChangesStrip({ count, onReview, onDiscard }: { count: number; onReview: () => void; onDiscard: () => void }) {
  if (count === 0) return null;
  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-2.5"
      style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.25)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex items-center gap-2">
        <DirtyDot />
        <span style={{ fontSize: 12, color: '#E2E8F0' }}>
          <strong style={{ color: '#F59E0B' }}>{count}</strong> unsaved change{count !== 1 ? 's' : ''} across sections
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onDiscard} className="px-3 py-1 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: '#94A3B8', border: '1px solid rgba(51,65,85,0.5)' }}>
          Discard all
        </button>
        <button onClick={onReview} className="px-3 py-1 rounded-lg text-xs font-bold text-white hover:opacity-90 transition-opacity" style={{ background: '#F59E0B' }}>
          Review changes
        </button>
      </div>
    </div>
  );
}

// ── Action banners ────────────────────────────────────────────────────────────
function ActionBanners() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const banners = [
    {
      id: 'cert-expired',
      type: 'red' as const,
      msg: 'Action required: 2 platform-level certificates expire within 14 days. Initiate rotation in Security → Keys & Secrets.',
      link: '/admin/security',
      linkLabel: 'Go to Security',
    },
    {
      id: 'drift',
      type: 'amber' as const,
      msg: 'Configuration drift detected: Staging is 4 versions behind Production.',
      link: null,
      linkLabel: null,
    },
    {
      id: 'recent',
      type: 'neutral' as const,
      msg: 'Configuration updated: v412 — AI Providers routing — published by Dr. Al-Rashidi 2h ago.',
      link: null,
      linkLabel: null,
    },
  ].filter(b => !dismissed.includes(b.id));

  const bgColors = { red: 'rgba(239,68,68,0.08)', amber: 'rgba(245,158,11,0.08)', neutral: 'rgba(51,65,85,0.4)' };
  const borderColors = { red: 'rgba(239,68,68,0.2)', amber: 'rgba(245,158,11,0.2)', neutral: 'rgba(51,65,85,0.5)' };
  const textColors = { red: '#94A3B8', amber: '#94A3B8', neutral: '#64748B' };
  const iconColors = { red: '#EF4444', amber: '#F59E0B', neutral: '#64748B' };

  return (
    <div className="px-6 pt-4 space-y-2">
      {banners.map(b => (
        <div
          key={b.id}
          className="flex items-center justify-between px-4 py-2.5 rounded-xl gap-3"
          style={{ background: bgColors[b.type], border: `1px solid ${borderColors[b.type]}` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {b.type === 'red' && <AlertTriangle size={13} color={iconColors[b.type]} className="flex-shrink-0" />}
            {b.type === 'amber' && <Info size={13} color={iconColors[b.type]} className="flex-shrink-0" />}
            {b.type === 'neutral' && <Check size={13} color={iconColors[b.type]} className="flex-shrink-0" />}
            <span style={{ fontSize: 12, color: textColors[b.type] }} className="truncate">{b.msg}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {b.link && (
              <a
                href={b.link}
                onClick={e => { e.preventDefault(); window.history.pushState({}, '', b.link!); window.dispatchEvent(new PopStateEvent('popstate')); }}
                className="text-xs font-medium hover:opacity-80"
                style={{ color: '#0D9488' }}
              >
                {b.linkLabel}
              </a>
            )}
            <button onClick={() => setDismissed(p => [...p, b.id])} className="hover:opacity-70 transition-opacity">
              <X size={13} color="#64748B" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Environment chip ──────────────────────────────────────────────────────────
function EnvChip({ env, onChange }: { env: EnvType; onChange: (e: EnvType) => void }) {
  const [open, setOpen] = useState(false);
  const colors: Record<EnvType, string> = { production: '#EF4444', staging: '#F59E0B', sandbox: '#60A5FA' };
  const labels: Record<EnvType, string> = { production: 'Production', staging: 'Staging', sandbox: 'Sandbox' };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-80"
        style={{ background: `${colors[env]}1a`, color: colors[env], border: `1px solid ${colors[env]}40` }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: colors[env] }} />
        {labels[env]}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div
          className="absolute top-full mt-1 right-0 rounded-xl overflow-hidden z-50"
          style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.6)', minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          {(['production', 'staging', 'sandbox'] as EnvType[]).map(e => (
            <button
              key={e}
              onClick={() => { onChange(e); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-slate-700 transition-colors text-left"
              style={{ color: colors[e] }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: colors[e] }} />
              {labels[e]}
              {env === e && <Check size={11} className="ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlatformSettingsPage() {
  const [activeSection, setActiveSection] = useState('platform-identity');
  const [env, setEnv] = useState<EnvType>('production');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingCount] = useState(3);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => { initial[g.label] = true; });
    return initial;
  });
  const [kebabOpen, setKebabOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to top when section changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  // Resolve which component to render based on the active section's group
  const activeGroup = SECTION_TO_COMPONENT[activeSection] ?? 'General';

  const SectionContent = useMemo(() => {
    if (activeGroup === 'General') return <GeneralSection />;
    if (activeGroup === 'Workspaces') return <WorkspacesSection />;
    if (activeGroup === 'Portals') return <PortalsSection />;
    if (activeGroup === 'Identity & Access') return <IdentityAccessSection />;
    if (activeGroup === 'AI & Clinical Intelligence') return <AISection />;
    if (activeGroup === 'Integrations') return <IntegrationsSection />;
    if (activeGroup === 'Regulatory & Compliance') return <RegulatorySection />;
    if (activeGroup === 'Billing & Revenue') return <BillingSection />;
    if (activeGroup === 'Notifications & Communications') return <NotificationsSection />;
    if (activeGroup === 'Files, Storage & Imaging') return <StorageSection />;
    if (activeGroup === 'Search & Indexing') return <SearchSection />;
    if (activeGroup === 'Feature Flags & Experiments') return <FeatureFlagsSection />;
    if (activeGroup === 'Developer & API') return <DeveloperSection />;
    if (activeGroup === 'Environments') return <EnvironmentsSection />;
    if (activeGroup === 'Telemetry') return <TelemetrySection />;
    if (activeGroup === 'Marketplace & Apps') return <MarketplaceSection />;
    if (activeGroup === 'Danger Zone') return <DangerZoneSection />;
    return <GeneralSection />;
  }, [activeGroup]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return NAV_GROUPS;
    const q = searchQuery.toLowerCase();
    return NAV_GROUPS.map(g => ({
      ...g,
      items: g.items.filter(i => i.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)),
    })).filter(g => g.items.length > 0);
  }, [searchQuery]);

  const navItem = (item: SectionItem, group: NavGroup) => {
    const isActive = activeSection === item.id;
    const isDanger = group.label === 'Danger Zone';
    return (
      <button
        key={item.id}
        onClick={() => setActiveSection(item.id)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors hover:bg-slate-800"
        style={{
          background: isActive ? 'rgba(13,148,136,0.15)' : 'transparent',
          color: isDanger ? '#EF4444' : isActive ? '#2DD4BF' : '#94A3B8',
        }}
      >
        <item.icon size={13} className="flex-shrink-0" />
        <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
        {item.dirty && <DirtyDot />}
        {RECENTLY_CHANGED.includes(item.id) && !item.dirty && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#0D9488' }} />
        )}
      </button>
    );
  };

  return (
    <AdminPageLayout activeSection="platform-settings">
      <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0F172A' }}>
        {/* ── Page header ── */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 24 }}>
                Platform Settings
              </h1>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
                Govern how CeenAiX behaves across all workspaces, portals, and regions.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Config version */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.5)' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#E2E8F0' }}>v412</span>
                <span style={{ fontSize: 10, color: '#475569' }}>·</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>2h ago by Al-Rashidi</span>
                <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>AR</span>
                </div>
              </div>

              {/* Environment selector */}
              <EnvChip env={env} onChange={setEnv} />

              {/* View change history */}
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-slate-700"
                style={{ color: '#94A3B8', border: '1px solid rgba(51,65,85,0.5)' }}
              >
                <Clock size={12} />
                Change history
              </button>

              {/* Kebab menu */}
              <div className="relative">
                <button
                  onClick={() => setKebabOpen(!kebabOpen)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-700"
                  style={{ border: '1px solid rgba(51,65,85,0.5)' }}
                >
                  <MoreVertical size={14} color="#94A3B8" />
                </button>
                {kebabOpen && (
                  <div
                    className="absolute top-full mt-1 right-0 rounded-xl overflow-hidden z-50"
                    style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.6)', minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                  >
                    {[
                      { label: 'Compare environments', icon: GitCompare },
                      { label: 'Export configuration', icon: Download },
                      { label: 'Import configuration', icon: Upload },
                      { label: 'Open audit log', icon: FileText },
                      { label: 'Schedule config freeze', icon: Clock },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => setKebabOpen(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-slate-700 transition-colors text-left"
                        style={{ color: '#94A3B8' }}
                      >
                        <item.icon size={13} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Production warning */}
          {env === 'production' && (
            <div
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              role="alert"
            >
              <AlertTriangle size={12} color="#EF4444" />
              <span style={{ fontSize: 11, color: '#EF4444' }}>
                You are editing <strong>Production</strong>. Changes require password re-entry and two-person approval for sensitive sections.
              </span>
            </div>
          )}
        </div>

        {/* ── Pending changes strip ── */}
        <PendingChangesStrip count={pendingCount} onReview={() => {}} onDiscard={() => {}} />

        {/* ── Action banners ── */}
        <ActionBanners />

        {/* ── Two-column layout ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left rail */}
          <div
            className="flex flex-col flex-shrink-0 overflow-y-auto"
            style={{ width: 268, background: '#0A1628', borderRight: '1px solid rgba(30,41,59,0.8)' }}
          >
            {/* Recently changed */}
            <div className="px-3 pt-3 pb-2">
              <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Recently changed
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RECENTLY_CHANGED.slice(0, 5).map(sid => {
                  const group = NAV_GROUPS.find(g => g.items.some(i => i.id === sid));
                  const item = group?.items.find(i => i.id === sid);
                  if (!item) return null;
                  return (
                    <button
                      key={sid}
                      onClick={() => setActiveSection(sid)}
                      className="px-2 py-0.5 rounded text-xs hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(13,148,136,0.12)', color: '#2DD4BF', fontSize: 10 }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <div className="px-3 pb-3">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
                <input
                  type="text"
                  placeholder="Jump to section..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg pl-7 pr-3 py-1.5 text-xs outline-none"
                  style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', color: '#E2E8F0' }}
                />
              </div>
            </div>

            {/* Nav groups */}
            <div className="flex-1 px-2 pb-6 space-y-1">
              {filteredGroups.map(group => {
                const isDanger = group.label === 'Danger Zone';
                const isExpanded = searchQuery.trim() ? true : expandedGroups[group.label] !== false;
                return (
                  <div key={group.label}>
                    <button
                      onClick={() => setExpandedGroups(p => ({ ...p, [group.label]: !isExpanded }))}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800 transition-colors"
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: isDanger ? '#EF4444' : '#475569',
                        }}
                      >
                        {group.label}
                      </span>
                      <ChevronRight
                        size={11}
                        style={{ color: '#475569', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                      />
                    </button>
                    {isExpanded && (
                      <div className="space-y-0.5 mt-0.5">
                        {group.items.map(item => navItem(item, group))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right pane */}
          <div ref={contentRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6">
              {SectionContent}
            </div>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
