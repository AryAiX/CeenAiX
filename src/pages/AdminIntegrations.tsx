import React, { useState, useMemo } from 'react';
import {
  Link2, Plus, Download, RefreshCw, MoreHorizontal, Search,
  ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle,
  HelpCircle, LayoutGrid, List, AlertCircle, X, Settings,
  Play, Pause, Eye, RotateCcw, FileText, Shield, Trash2,
  Activity, Clock, Zap, TrendingUp, Lock,
} from 'lucide-react';
import AdminPageLayout from '../components/admin/AdminPageLayout';
import {
  INTEGRATIONS,
  CATEGORY_ORDER,
  CATEGORY_COLORS,
  Integration,
  IntegrationCategory,
  IntegrationStatus,
  IntegrationHealth,
  IntegrationEnvironment,
} from '../data/integrationsData';

// ─── Tiny sparkline ────────────────────────────────────────────────────────────
function Spark({ data, color }: { data: { t: number; v: number }[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.v), 1);
  const w = 56, h = 20;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.v / max) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

// ─── Health pill ───────────────────────────────────────────────────────────────
function HealthPill({ health }: { health: IntegrationHealth }) {
  const map: Record<IntegrationHealth, { bg: string; color: string; dot: string; label: string }> = {
    Healthy:  { bg: 'rgba(16,185,129,0.1)',  color: '#34D399', dot: '#34D399', label: 'Healthy'  },
    Degraded: { bg: 'rgba(245,158,11,0.12)', color: '#FCD34D', dot: '#FCD34D', label: 'Degraded' },
    Down:     { bg: 'rgba(239,68,68,0.1)',   color: '#F87171', dot: '#F87171', label: 'Down'     },
    Unknown:  { bg: 'rgba(100,116,139,0.15)',color: '#94A3B8', dot: '#64748B', label: 'Unknown'  },
  };
  const s = map[health];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      <span style={{ fontSize: 10, color: s.color, fontFamily: 'DM Mono, monospace' }}>{s.label}</span>
    </span>
  );
}

// ─── Status chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: IntegrationStatus }) {
  const map: Record<IntegrationStatus, { bg: string; color: string }> = {
    'Active':         { bg: 'rgba(16,185,129,0.1)',  color: '#34D399' },
    'Paused':         { bg: 'rgba(100,116,139,0.15)',color: '#94A3B8' },
    'Error':          { bg: 'rgba(239,68,68,0.1)',   color: '#F87171' },
    'Not configured': { bg: 'rgba(245,158,11,0.1)',  color: '#FCD34D' },
    'Deprecated':     { bg: 'rgba(100,116,139,0.1)', color: '#64748B' },
  };
  const s = map[status];
  return (
    <span className="rounded-full px-2 py-0.5" style={{ background: s.bg, fontSize: 10, color: s.color, fontFamily: 'DM Mono, monospace' }}>
      {status}
    </span>
  );
}

// ─── Env chip ─────────────────────────────────────────────────────────────────
function EnvChip({ env }: { env: IntegrationEnvironment }) {
  const map: Record<IntegrationEnvironment, { bg: string; color: string }> = {
    Production: { bg: 'rgba(13,148,136,0.12)', color: '#2DD4BF' },
    Staging:    { bg: 'rgba(59,130,246,0.12)', color: '#60A5FA' },
    Sandbox:    { bg: 'rgba(100,116,139,0.12)',color: '#94A3B8' },
  };
  const s = map[env];
  return (
    <span className="rounded-full px-2 py-0.5" style={{ background: s.bg, fontSize: 10, color: s.color, fontFamily: 'DM Mono, monospace' }}>
      {env}
    </span>
  );
}

// ─── Integration logo ─────────────────────────────────────────────────────────
function IntegrationLogo({ integration, size = 32 }: { integration: Integration; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg flex-shrink-0 font-bold"
      style={{
        width: size,
        height: size,
        background: `${integration.logoColor}22`,
        border: `1px solid ${integration.logoColor}44`,
        color: integration.logoColor,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: size * 0.44,
      }}
    >
      {integration.logoLetter}
    </div>
  );
}

// ─── Integration card ─────────────────────────────────────────────────────────
function IntegrationCard({ integration, onConfigure }: { integration: Integration; onConfigure: (id: string) => void }) {
  const [paused, setPaused] = useState(integration.status === 'Paused');
  const [showMenu, setShowMenu] = useState(false);
  const hasError = integration.health === 'Down' || integration.status === 'Error';
  const hasWarning = integration.health === 'Degraded' || !!integration.credExpiry || !!integration.certExpiry;
  const sparkColor = hasError ? '#F87171' : hasWarning ? '#FCD34D' : '#2DD4BF';

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden relative transition-all duration-200"
      style={{
        background: '#1E293B',
        border: `1px solid ${hasError ? 'rgba(239,68,68,0.5)' : hasWarning ? 'rgba(245,158,11,0.4)' : 'rgba(51,65,85,0.5)'}`,
        borderTop: `3px solid ${hasError ? '#EF4444' : hasWarning ? '#F59E0B' : 'rgba(51,65,85,0.5)'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = hasError ? 'rgba(239,68,68,0.7)' : hasWarning ? 'rgba(245,158,11,0.6)' : 'rgba(71,85,105,0.7)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = hasError ? 'rgba(239,68,68,0.5)' : hasWarning ? 'rgba(245,158,11,0.4)' : 'rgba(51,65,85,0.5)'; }}
      aria-label={`${integration.name} — ${integration.category} — ${integration.environment} — ${integration.health}`}
    >
      {/* Action required badge */}
      {integration.actionRequired && (
        <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: hasError ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', borderBottom: hasError ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle style={{ width: 11, height: 11, color: hasError ? '#F87171' : '#FCD34D', flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: hasError ? '#F87171' : '#FCD34D' }}>{integration.actionRequired}</span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start gap-2.5">
          <IntegrationLogo integration={integration} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>
                {integration.name}
              </span>
              {integration.required && (
                <span className="rounded-full px-1.5 py-0.5" style={{ fontSize: 9, background: 'rgba(13,148,136,0.15)', color: '#2DD4BF', fontFamily: 'DM Mono, monospace' }}>
                  Required
                </span>
              )}
            </div>
            <div className="mt-0.5" style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
              {integration.vendor}
            </div>
          </div>
          <EnvChip env={integration.environment} />
        </div>

        {/* Health + sparkline */}
        <div className="flex items-center justify-between">
          <HealthPill health={integration.health} />
          <Spark data={integration.spark} color={sparkColor} />
        </div>

        {/* Metrics strip */}
        <div className="rounded-lg px-3 py-2 flex flex-col gap-1" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="flex justify-between">
            <span style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace' }}>Last sync</span>
            <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{integration.lastSync}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace' }}>Throughput 24h</span>
            <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{integration.throughput24h}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace' }}>Error rate 1h</span>
            <span style={{ fontSize: 10, color: integration.errorRate1h === '0.0%' || integration.errorRate1h === '0.1%' ? '#34D399' : integration.errorRate1h === '100%' ? '#F87171' : '#FCD34D', fontFamily: 'DM Mono, monospace' }}>
              {integration.errorRate1h}
            </span>
          </div>
        </div>

        {/* Bottom action row */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setPaused(p => !p)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors text-xs font-medium flex-shrink-0"
            style={{ background: paused ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.12)', color: paused ? '#34D399' : '#94A3B8', border: `1px solid ${paused ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}` }}
          >
            {paused ? <Play style={{ width: 11, height: 11 }} /> : <Pause style={{ width: 11, height: 11 }} />}
            <span style={{ fontSize: 11 }}>{paused ? 'Resume' : 'Pause'}</span>
          </button>
          <button
            onClick={() => onConfigure(integration.id)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors"
            style={{ background: 'rgba(13,148,136,0.12)', color: '#2DD4BF', border: '1px solid rgba(13,148,136,0.2)', fontSize: 11, fontWeight: 600 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(13,148,136,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(13,148,136,0.12)'; }}
          >
            <Settings style={{ width: 11, height: 11 }} />
            Configure
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(m => !m)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(51,65,85,0.4)', color: '#64748B' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'rgba(71,85,105,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'rgba(51,65,85,0.4)'; }}
            >
              <MoreHorizontal style={{ width: 13, height: 13 }} />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 bottom-8 rounded-xl overflow-hidden z-20 min-w-44"
                style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
              >
                {[
                  { icon: Activity, label: 'Test connection' },
                  { icon: RotateCcw, label: 'Rotate credentials' },
                  { icon: FileText, label: 'View logs' },
                  { icon: Eye, label: 'View documentation' },
                  { icon: Trash2, label: 'Remove', danger: true },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 transition-colors"
                    style={{ fontSize: 12, color: item.danger ? '#F87171' : '#94A3B8' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <item.icon style={{ width: 13, height: 13, flexShrink: 0 }} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function TableRow({ integration, onConfigure, selected, onSelect }: {
  integration: Integration;
  onConfigure: (id: string) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <tr
      className="group cursor-pointer"
      style={{ borderBottom: '1px solid rgba(51,65,85,0.3)', background: selected ? 'rgba(13,148,136,0.06)' : 'transparent' }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(30,41,59,0.4)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
      onClick={() => onConfigure(integration.id)}
    >
      <td className="px-4 py-3 w-8" onClick={e => { e.stopPropagation(); onSelect(integration.id); }}>
        <input type="checkbox" checked={selected} onChange={() => onSelect(integration.id)} className="w-3.5 h-3.5 accent-teal-500 cursor-pointer" />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <IntegrationLogo integration={integration} size={28} />
          <div>
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{integration.name}</span>
              {integration.required && <span style={{ fontSize: 9, color: '#2DD4BF', background: 'rgba(13,148,136,0.15)', borderRadius: 999, padding: '1px 6px', fontFamily: 'DM Mono, monospace' }}>Required</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, background: `${CATEGORY_COLORS[integration.category]}22`, color: CATEGORY_COLORS[integration.category], fontFamily: 'DM Mono, monospace' }}>
          {integration.category}
        </span>
      </td>
      <td className="px-3 py-3 max-w-40">
        <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }} className="truncate block">{integration.vendor}</span>
      </td>
      <td className="px-3 py-3"><EnvChip env={integration.environment} /></td>
      <td className="px-3 py-3"><StatusChip status={integration.status} /></td>
      <td className="px-3 py-3"><HealthPill health={integration.health} /></td>
      <td className="px-3 py-3">
        <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{integration.lastSync}</span>
      </td>
      <td className="px-3 py-3">
        <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{integration.throughput24h}</span>
      </td>
      <td className="px-3 py-3">
        <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: integration.errorRate1h === '100%' ? '#F87171' : integration.errorRate1h === '0.0%' ? '#34D399' : '#FCD34D' }}>
          {integration.errorRate1h}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(13,148,136,0.2)', color: '#2DD4BF', fontSize: 9 }}>
            {integration.ownerInitials}
          </div>
          <span style={{ fontSize: 11, color: '#64748B' }}>{integration.owner.split(' ')[0]}</span>
        </div>
      </td>
      <td className="px-3 py-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button onClick={() => onConfigure(integration.id)} className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-teal-400 transition-colors" title="Configure">
            <Settings style={{ width: 12, height: 12 }} />
          </button>
          <button className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-blue-400 transition-colors" title="Test">
            <Activity style={{ width: 12, height: 12 }} />
          </button>
          <button className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors" title="Logs">
            <FileText style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── KPI strip ────────────────────────────────────────────────────────────────
function KpiStrip({ integrations }: { integrations: Integration[] }) {
  const total = integrations.length;
  const active = integrations.filter(i => i.status === 'Active').length;
  const healthy = integrations.filter(i => i.health === 'Healthy').length;
  const degraded = integrations.filter(i => i.health === 'Degraded').length;
  const down = integrations.filter(i => i.health === 'Down').length;
  const expiring = integrations.filter(i => i.certExpiry || i.credExpiry).length;
  const totalEvents = '127,450 AI · 3,841 DHA · 11,204 NABIDH';

  const cards = [
    {
      icon: Link2,
      iconColor: '#2DD4BF',
      label: 'Total Integrations',
      value: `${active} / ${total}`,
      sub: `${active} active`,
    },
    {
      icon: Activity,
      iconColor: healthy === total ? '#34D399' : down > 0 ? '#F87171' : '#FCD34D',
      label: 'Health Overview',
      value: `${healthy} healthy`,
      sub: `${degraded} degraded · ${down} down`,
      isBars: true,
      healthy, degraded, down, total,
    },
    {
      icon: TrendingUp,
      iconColor: '#60A5FA',
      label: 'Events last 24h',
      value: '238.4K',
      sub: totalEvents,
    },
    {
      icon: Shield,
      iconColor: expiring > 0 ? '#FCD34D' : '#34D399',
      label: 'Compliance',
      value: `${total - expiring} / ${total} valid`,
      sub: expiring > 0 ? `${expiring} expiring soon` : 'All credentials valid',
      warning: expiring > 0,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-2xl px-5 py-4 flex flex-col gap-2" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
            <div className="flex items-center gap-2">
              <Icon style={{ width: 14, height: 14, color: card.iconColor, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{card.label}</span>
            </div>
            <div className="font-bold" style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, color: '#F1F5F9' }}>
              {card.value}
            </div>
            {card.isBars ? (
              <div className="flex gap-1 h-1.5">
                {[
                  { v: card.healthy!, c: '#34D399' },
                  { v: card.degraded!, c: '#FCD34D' },
                  { v: card.down!, c: '#F87171' },
                ].map((b, i) => (
                  b.v > 0 && (
                    <div key={i} className="h-full rounded-full" style={{ width: `${(b.v / card.total!) * 100}%`, background: b.c }} />
                  )
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: card.warning ? '#FCD34D' : '#475569', fontFamily: 'Inter, sans-serif' }}>
                {card.sub}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Overall health chip ──────────────────────────────────────────────────────
function OverallHealthChip({ integrations }: { integrations: Integration[] }) {
  const down = integrations.filter(i => i.health === 'Down').length;
  const degraded = integrations.filter(i => i.health === 'Degraded').length;

  if (down > 0) return (
    <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 cursor-pointer" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
      <XCircle style={{ width: 13, height: 13, color: '#F87171' }} />
      <span style={{ fontSize: 11, color: '#F87171', fontFamily: 'DM Mono, monospace' }}>Outage — {down} down</span>
    </span>
  );
  if (degraded > 0) return (
    <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 cursor-pointer" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
      <AlertTriangle style={{ width: 13, height: 13, color: '#FCD34D' }} />
      <span style={{ fontSize: 11, color: '#FCD34D', fontFamily: 'DM Mono, monospace' }}>Degraded — {degraded} affected</span>
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 cursor-pointer" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
      <CheckCircle style={{ width: 13, height: 13, color: '#34D399' }} />
      <span style={{ fontSize: 11, color: '#34D399', fontFamily: 'DM Mono, monospace' }}>Operational</span>
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminIntegrations({ onNavigateDetail }: { onNavigateDetail?: (id: string) => void }) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory[]>([]);
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus[]>([]);
  const [healthFilter, setHealthFilter] = useState<IntegrationHealth[]>([]);
  const [envFilter, setEnvFilter] = useState<IntegrationEnvironment[]>([]);
  const [actionOnly, setActionOnly] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [sortCol, setSortCol] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const navigate = (id: string) => {
    const path = `/admin/integrations/${id}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleConfigure = onNavigateDetail ?? navigate;

  const filtered = useMemo(() => {
    return INTEGRATIONS.filter(i => {
      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.vendor.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter.length && !categoryFilter.includes(i.category)) return false;
      if (statusFilter.length && !statusFilter.includes(i.status)) return false;
      if (healthFilter.length && !healthFilter.includes(i.health)) return false;
      if (envFilter.length && !envFilter.includes(i.environment)) return false;
      if (actionOnly && !i.actionRequired) return false;
      return true;
    });
  }, [search, categoryFilter, statusFilter, healthFilter, envFilter, actionOnly]);

  const grouped = useMemo(() => {
    const map = new Map<IntegrationCategory, Integration[]>();
    CATEGORY_ORDER.forEach(cat => map.set(cat, []));
    filtered.forEach(i => {
      const list = map.get(i.category);
      if (list) list.push(i);
    });
    return map;
  }, [filtered]);

  const actionRequiredList = INTEGRATIONS.filter(i => i.actionRequired && i.health === 'Down');
  const expiringSoonList = INTEGRATIONS.filter(i => i.credExpiry || i.certExpiry);

  const toggleSection = (cat: string) => {
    setCollapsedSections(prev => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleCategoryFilter = (cat: IntegrationCategory) => {
    setCategoryFilter(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = sortCol === 'name' ? a.name : sortCol === 'health' ? a.health : a.lastSync;
      const bVal = sortCol === 'name' ? b.name : sortCol === 'health' ? b.health : b.lastSync;
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filtered, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
  };

  return (
    <AdminPageLayout activeSection="integrations">
      <div className="flex flex-col min-h-full" style={{ background: '#0F172A' }}>

        {/* Header */}
        <div className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between flex-wrap gap-3" style={{ background: '#0F172A', borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
          <div>
            <h1 className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20 }}>Integrations</h1>
            <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
              Connect, monitor, and govern every external system CeenAiX depends on.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OverallHealthChip integrations={INTEGRATIONS} />
            <button
              className="flex items-center gap-2 rounded-xl px-4 py-2 font-semibold transition-colors"
              style={{ background: '#0D9488', color: '#fff', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0F766E'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0D9488'; }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add integration
            </button>
            <div className="relative">
              <button
                onClick={() => setShowHeaderMenu(m => !m)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: 'rgba(51,65,85,0.5)', color: '#64748B' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; }}
              >
                <MoreHorizontal style={{ width: 16, height: 16 }} />
              </button>
              {showHeaderMenu && (
                <div className="absolute right-0 top-10 rounded-xl overflow-hidden z-50 min-w-52" style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  {[
                    { icon: Download, label: 'Export inventory (CSV)' },
                    { icon: Download, label: 'Export inventory (JSON)' },
                    { icon: FileText, label: 'View integration audit log' },
                    { icon: RefreshCw, label: 'Refresh all health checks' },
                  ].map(item => (
                    <button key={item.label} onClick={() => setShowHeaderMenu(false)} className="w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors" style={{ fontSize: 12, color: '#94A3B8' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.4)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <item.icon style={{ width: 13, height: 13 }} /> {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 py-5 flex flex-col gap-5">
          {/* Alert banners */}
          {actionRequiredList.length > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle style={{ width: 14, height: 14, color: '#F87171', flexShrink: 0, marginTop: 1 }} />
              <div className="flex-1">
                <div style={{ fontSize: 12, fontWeight: 600, color: '#F87171', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Action Required</div>
                <div style={{ fontSize: 11, color: '#FDA4A4', marginTop: 2 }}>
                  {actionRequiredList.map(i => i.actionRequired).join(' · ')}
                </div>
              </div>
            </div>
          )}
          {expiringSoonList.length > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Clock style={{ width: 14, height: 14, color: '#FCD34D', flexShrink: 0, marginTop: 1 }} />
              <div className="flex-1">
                <div style={{ fontSize: 12, fontWeight: 600, color: '#FCD34D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Expiring Soon</div>
                <div style={{ fontSize: 11, color: '#FDE68A', marginTop: 2 }}>
                  {expiringSoonList.map(i => `${i.name} — ${i.credExpiry ?? i.certExpiry}`).join(' · ')}
                </div>
              </div>
            </div>
          )}

          {/* KPI strip */}
          <KpiStrip integrations={INTEGRATIONS} />

          {/* Filter bar */}
          <div className="rounded-2xl px-5 py-3 flex flex-wrap items-center gap-3" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-shrink-0" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.5)', minWidth: 200 }}>
              <Search style={{ width: 13, height: 13, color: '#475569', flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search integrations…"
                className="bg-transparent outline-none flex-1"
                style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300">
                  <X style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>

            {/* Category chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORY_ORDER.filter(cat => INTEGRATIONS.some(i => i.category === cat)).map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategoryFilter(cat)}
                  className="rounded-full px-2.5 py-1 transition-all"
                  style={{
                    fontSize: 10,
                    fontFamily: 'DM Mono, monospace',
                    background: categoryFilter.includes(cat) ? `${CATEGORY_COLORS[cat]}22` : 'rgba(51,65,85,0.3)',
                    color: categoryFilter.includes(cat) ? CATEGORY_COLORS[cat] : '#64748B',
                    border: `1px solid ${categoryFilter.includes(cat) ? CATEGORY_COLORS[cat] + '44' : 'transparent'}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Action only toggle */}
            <label className="flex items-center gap-2 cursor-pointer ml-auto">
              <div
                className="w-8 h-4 rounded-full transition-colors flex items-center"
                style={{ background: actionOnly ? '#0D9488' : 'rgba(51,65,85,0.6)', padding: 2 }}
                onClick={() => setActionOnly(a => !a)}
              >
                <div className="w-3 h-3 rounded-full bg-white transition-transform" style={{ transform: actionOnly ? 'translateX(16px)' : 'translateX(0)' }} />
              </div>
              <span style={{ fontSize: 11, color: actionOnly ? '#2DD4BF' : '#64748B', fontFamily: 'Inter, sans-serif' }}>Action only</span>
            </label>

            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(51,65,85,0.5)' }}>
              {[
                { mode: 'grid' as const, Icon: LayoutGrid },
                { mode: 'table' as const, Icon: List },
              ].map(({ mode, Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="w-8 h-8 flex items-center justify-center transition-colors"
                  style={{ background: viewMode === mode ? '#0D9488' : 'rgba(15,23,42,0.4)', color: viewMode === mode ? '#fff' : '#64748B' }}
                >
                  <Icon style={{ width: 13, height: 13 }} />
                </button>
              ))}
            </div>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-3" style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.25)' }}>
              <span style={{ fontSize: 12, color: '#2DD4BF', fontFamily: 'DM Mono, monospace' }}>{selected.size} selected</span>
              {[
                { icon: Pause, label: 'Pause selected' },
                { icon: Activity, label: 'Test selected' },
                { icon: RefreshCw, label: 'Refresh health' },
                { icon: Download, label: 'Export selected' },
              ].map(a => (
                <button key={a.label} onClick={() => setSelected(new Set())} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors" style={{ fontSize: 11, background: 'rgba(51,65,85,0.4)', color: '#94A3B8' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#CBD5E1'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; }}>
                  <a.icon style={{ width: 11, height: 11 }} /> {a.label}
                </button>
              ))}
              <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-500 hover:text-slate-300 transition-colors">
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          )}

          {/* Grid view */}
          {viewMode === 'grid' && (
            <div className="flex flex-col gap-6">
              {CATEGORY_ORDER.map(cat => {
                const items = grouped.get(cat) ?? [];
                if (!items.length) return null;
                const catColor = CATEGORY_COLORS[cat];
                const collapsed = collapsedSections.has(cat);
                return (
                  <div key={cat}>
                    <button
                      onClick={() => toggleSection(cat)}
                      className="flex items-center gap-3 mb-3 w-full group"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: catColor }} />
                      <span className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, color: '#CBD5E1' }}>{cat}</span>
                      <span style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono, monospace' }}>{items.length} integration{items.length !== 1 ? 's' : ''}</span>
                      <div className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors">
                        {collapsed ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronUp style={{ width: 14, height: 14 }} />}
                      </div>
                    </button>
                    {!collapsed && (
                      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                        {items.map(i => (
                          <IntegrationCard key={i.id} integration={i} onConfigure={handleConfigure} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Table view */}
          {viewMode === 'table' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(51,65,85,0.5)', background: 'rgba(15,23,42,0.5)' }}>
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" className="w-3.5 h-3.5 accent-teal-500" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(i => i.id)) : new Set())} />
                    </th>
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'category', label: 'Category' },
                      { key: 'vendor', label: 'Vendor / Standard' },
                      { key: 'env', label: 'Environment' },
                      { key: 'status', label: 'Status' },
                      { key: 'health', label: 'Health' },
                      { key: 'lastSync', label: 'Last sync' },
                      { key: 'throughput', label: 'Throughput 24h' },
                      { key: 'errorRate', label: 'Error rate 1h' },
                      { key: 'owner', label: 'Owner' },
                      { key: 'actions', label: '' },
                    ].map(col => (
                      <th
                        key={col.key}
                        className="px-3 py-3 text-left cursor-pointer select-none"
                        style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                        onClick={() => col.key !== 'actions' && handleSort(col.key)}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {sortCol === col.key && (sortAsc ? <ChevronUp style={{ width: 10, height: 10 }} /> : <ChevronDown style={{ width: 10, height: 10 }} />)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedFiltered.map(i => (
                    <TableRow
                      key={i.id}
                      integration={i}
                      onConfigure={handleConfigure}
                      selected={selected.has(i.id)}
                      onSelect={toggleSelect}
                    />
                  ))}
                </tbody>
              </table>
              {!sortedFiltered.length && (
                <div className="py-16 text-center" style={{ color: '#475569', fontSize: 13 }}>
                  No integrations match the current filters.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminPageLayout>
  );
}
