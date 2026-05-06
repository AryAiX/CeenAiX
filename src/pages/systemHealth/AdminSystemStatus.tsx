import { useState, useEffect, useCallback } from 'react';
import {
  Activity, RefreshCw, AlertTriangle, CheckCircle, Clock, Zap, Server, Database,
  Globe, Shield, BarChart2, Layers, AlertCircle, Wrench, FileText, MoreVertical,
  ChevronDown, X, Wifi, WifiOff, Bell
} from 'lucide-react';
import AdminPageLayout from '../../components/admin/AdminPageLayout';
import OverviewTab from './tabs/OverviewTab';
import ServicesTab from './tabs/ServicesTab';
import IntegrationsTab from './tabs/IntegrationsTab';
import InfrastructureTab from './tabs/InfrastructureTab';
import PerformanceTab from './tabs/PerformanceTab';
import CapacityTab from './tabs/CapacityTab';
import ErrorsTab from './tabs/ErrorsTab';
import IncidentsTab from './tabs/IncidentsTab';
import MaintenanceTab from './tabs/MaintenanceTab';
import SlaReportsTab from './tabs/SlaReportsTab';
import { INCIDENTS, MAINTENANCE_WINDOWS } from './mockData';
import type { ServiceStatus } from './types';

type TabId = 'overview' | 'services' | 'integrations' | 'infrastructure' | 'performance' | 'capacity' | 'errors' | 'incidents' | 'maintenance' | 'sla';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'services', label: 'Services', icon: Server },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'infrastructure', label: 'Infrastructure', icon: Database },
  { id: 'performance', label: 'Performance', icon: Zap },
  { id: 'capacity', label: 'Capacity', icon: Layers },
  { id: 'errors', label: 'Errors', icon: AlertCircle },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'sla', label: 'SLA & Reports', icon: FileText },
];

const STATUS_CONFIG: Record<ServiceStatus, { color: string; bg: string; border: string }> = {
  'Operational': { color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  'Degraded': { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  'Partial outage': { color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
  'Major outage': { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
};

const TIME_RANGES = ['Last 1h', 'Last 6h', 'Last 24h', 'Last 7d', 'Last 30d', 'Last 90d'];
const ENVIRONMENTS = ['Production', 'Staging', 'Sandbox'];

function KpiSparkline({ data, color, fill }: { data: number[]; color: string; fill?: boolean }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 80, H = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return [x, y] as [number, number];
  });
  const polyline = pts.map(p => p.join(',')).join(' ');
  const area = `M ${pts[0][0]},${H} ` + pts.map(p => `L ${p[0]},${p[1]}`).join(' ') + ` L ${pts[pts.length - 1][0]},${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {fill && <path d={area} fill={color} fillOpacity={0.15} />}
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" points={polyline} />
    </svg>
  );
}

function KpiCard({ label, value, delta, sub, color, icon: Icon, warning, sparkData }: {
  label: string; value: string; delta?: string; sub?: string; color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  warning?: boolean; sparkData?: number[];
}) {
  return (
    <div className="rounded-2xl px-4 py-4 flex flex-col gap-1" style={{ background: '#1E293B', border: `1px solid ${warning ? 'rgba(245,158,11,0.3)' : 'rgba(51,65,85,0.5)'}` }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="font-bold text-white" style={{ fontSize: 22, fontFamily: 'DM Mono, monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748B' }}>{sub}</div>}
      <div className="flex items-end justify-between mt-1">
        {delta ? (
          <div style={{ fontSize: 10, color: delta.startsWith('+') ? '#EF4444' : '#10B981', fontFamily: 'DM Mono, monospace' }}>{delta} vs prev</div>
        ) : <div />}
        {sparkData && <KpiSparkline data={sparkData} color={color} fill />}
      </div>
    </div>
  );
}

export default function AdminSystemStatus() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [timeRange, setTimeRange] = useState('Last 24h');
  const [environment, setEnvironment] = useState('Production');
  const [streamStatus, setStreamStatus] = useState<'live' | 'reconnecting' | 'lost'>('live');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showKebab, setShowKebab] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);

  const overallStatus: ServiceStatus = 'Degraded';
  const statusCfg = STATUS_CONFIG[overallStatus];

  const refresh = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const activeIncidents = INCIDENTS.filter(i => i.status !== 'Resolved');
  const upcomingMaintenance = MAINTENANCE_WINDOWS.filter(m => m.status === 'upcoming');

  const alerts = [
    ...activeIncidents.map(i => ({
      id: `inc-${i.id}`,
      severity: i.severity === 'SEV1' ? 'critical' : i.severity === 'SEV2' ? 'high' : 'medium',
      headline: `${i.severity}: ${i.title}`,
      services: i.affectedServices.join(', '),
      started: i.started,
      color: i.severity === 'SEV1' ? '#EF4444' : i.severity === 'SEV2' ? '#F59E0B' : '#0891B2',
      bg: i.severity === 'SEV1' ? 'rgba(239,68,68,0.08)' : i.severity === 'SEV2' ? 'rgba(245,158,11,0.08)' : 'rgba(8,145,178,0.08)',
      border: i.severity === 'SEV1' ? 'rgba(239,68,68,0.3)' : i.severity === 'SEV2' ? 'rgba(245,158,11,0.3)' : 'rgba(8,145,178,0.3)',
    })),
  ].filter(a => !dismissedAlerts.includes(a.id));

  const streamDot = streamStatus === 'live'
    ? 'bg-emerald-400 animate-pulse'
    : streamStatus === 'reconnecting'
    ? 'bg-amber-400 animate-pulse'
    : 'bg-red-400';

  const streamIcon = streamStatus === 'live' ? Wifi : WifiOff;
  const StreamIcon = streamIcon;

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Dubai' });

  return (
    <AdminPageLayout activeSection="system-status">
      <div className="flex flex-col min-h-full" style={{ background: '#0F172A' }}>

        {/* Critical alerts strip */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-1 px-6 pt-4">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: alert.bg, border: `1px solid ${alert.border}` }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: alert.color }} />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold" style={{ fontSize: 12, color: alert.color }}>{alert.headline}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 8 }}>Affected: {alert.services}</span>
                  <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'DM Mono, monospace', marginLeft: 8 }}>{alert.started}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setActiveTab('incidents')} style={{ fontSize: 11, color: alert.color, background: `${alert.color}18`, padding: '2px 10px', borderRadius: 6, border: `1px solid ${alert.color}40` }}>Open incident</button>
                  <button onClick={() => setDismissedAlerts(p => [...p, alert.id])} style={{ color: '#475569' }}><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            {alerts.length > 3 && (
              <button onClick={() => setActiveTab('incidents')} style={{ fontSize: 11, color: '#64748B', textAlign: 'right', padding: '2px 4px' }}>View all ({alerts.length}) active alerts</button>
            )}
          </div>
        )}

        {/* Page header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 gap-4 flex-wrap">
          <div>
            <h1 className="font-bold text-white mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 22 }}>System Health</h1>
            <p style={{ fontSize: 13, color: '#64748B' }}>Live operational status of CeenAiX services, integrations, and infrastructure.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Overall status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusCfg.color }} />
              <span className="font-bold" style={{ fontSize: 12, color: statusCfg.color }}>{overallStatus}</span>
            </div>
            {/* Stream status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(51,65,85,0.4)' }}>
              <div className={`w-1.5 h-1.5 rounded-full ${streamDot}`} />
              <StreamIcon className="w-3 h-3" style={{ color: '#64748B' }} />
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>
                {streamStatus === 'live' ? `Live · ${formatTime(lastUpdated)}` : streamStatus === 'reconnecting' ? 'Reconnecting…' : 'Stream lost'}
              </span>
            </div>
            {/* Time range */}
            <div className="relative">
              <button onClick={() => setShowTimeDropdown(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8', border: '1px solid rgba(51,65,85,0.6)' }}>
                <Clock className="w-3.5 h-3.5" /> {timeRange} <ChevronDown className="w-3 h-3" />
              </button>
              {showTimeDropdown && (
                <div className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.8)', minWidth: 140 }}>
                  {TIME_RANGES.map(r => (
                    <button key={r} onClick={() => { setTimeRange(r); setShowTimeDropdown(false); }} className="w-full px-4 py-2 text-left hover:bg-slate-700/50 transition-colors" style={{ fontSize: 12, color: r === timeRange ? '#0D9488' : '#94A3B8' }}>{r}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Environment */}
            <div className="relative">
              <button onClick={() => setShowEnvDropdown(p => !p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: environment === 'Production' ? '#10B981' : environment === 'Staging' ? '#F59E0B' : '#64748B', border: '1px solid rgba(51,65,85,0.6)' }}>
                <Shield className="w-3.5 h-3.5" /> {environment} <ChevronDown className="w-3 h-3" />
              </button>
              {showEnvDropdown && (
                <div className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.8)', minWidth: 130 }}>
                  {ENVIRONMENTS.map(e => (
                    <button key={e} onClick={() => { setEnvironment(e); setShowEnvDropdown(false); }} className="w-full px-4 py-2 text-left hover:bg-slate-700/50 transition-colors" style={{ fontSize: 12, color: e === environment ? '#0D9488' : '#94A3B8' }}>{e}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors hover:bg-slate-700/50" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8', border: '1px solid rgba(51,65,85,0.6)' }}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            {/* Kebab */}
            <div className="relative">
              <button onClick={() => setShowKebab(p => !p)} className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors hover:bg-slate-700/50" style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(51,65,85,0.6)', color: '#64748B' }}>
                <MoreVertical className="w-4 h-4" />
              </button>
              {showKebab && (
                <div className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.8)', minWidth: 210 }}>
                  {['Subscribe to status updates', 'Open public status page', 'View postmortems', 'Configure alert rules', 'Export SLA report'].map(item => (
                    <button key={item} onClick={() => setShowKebab(false)} className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 hover:bg-slate-700/50 transition-colors" style={{ fontSize: 12, color: '#94A3B8' }}>
                      <Bell className="w-3.5 h-3.5 opacity-50" /> {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 px-6 pb-4">
          <KpiCard label="Uptime" value="99.92%" sub="SLA: 99.95% — At risk" color="#F59E0B" icon={CheckCircle} warning sparkData={[100,100,100,99.99,100,100,99.98,100,100,99.95,99.92,99.92]} />
          <KpiCard label="Active Incidents" value={activeIncidents.length.toString()} sub={`Highest: ${activeIncidents[0]?.severity ?? '—'}`} delta="+1" color="#F59E0B" icon={AlertTriangle} warning={activeIncidents.length > 0} sparkData={[0,0,1,0,0,0,1,2,1,1,2,activeIncidents.length]} />
          <KpiCard label="Error Rate (5m)" value="2.41%" sub="↑ vs 0.02% baseline" color="#EF4444" icon={AlertCircle} warning sparkData={[0.02,0.03,0.02,0.04,0.03,0.08,0.4,1.2,2.1,2.3,2.41,2.41]} />
          <KpiCard label="API Latency p95" value="5.1s" sub="Insurance Portal spike" color="#F59E0B" icon={Zap} warning sparkData={[0.21,0.19,0.22,0.20,0.24,0.8,2.1,4.2,5.1,5.0,5.1,5.1]} />
          <KpiCard label="Active Users" value="1,847" sub="↑ 12% vs 1h ago" color="#0D9488" icon={Activity} sparkData={[420,380,350,520,890,1240,1580,1820,1847,1820,1847,1847]} />
          <KpiCard label="Queue Depth" value="142" sub="Oldest: 4m 12s" color="#10B981" icon={BarChart2} sparkData={[20,18,24,30,42,88,120,138,142,140,142,142]} />
        </div>

        {/* Tabs */}
        <div className="px-6 border-b flex overflow-x-auto" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0"
                style={{
                  color: active ? '#0D9488' : '#64748B',
                  borderBottomColor: active ? '#0D9488' : 'transparent',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === 'incidents' && activeIncidents.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>{activeIncidents.length}</span>
                )}
                {tab.id === 'maintenance' && upcomingMaintenance.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(8,145,178,0.2)', color: '#0891B2' }}>{upcomingMaintenance.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'overview' && <OverviewTab timeRange={timeRange} onTabChange={setActiveTab} />}
          {activeTab === 'services' && <ServicesTab />}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'infrastructure' && <InfrastructureTab />}
          {activeTab === 'performance' && <PerformanceTab timeRange={timeRange} />}
          {activeTab === 'capacity' && <CapacityTab />}
          {activeTab === 'errors' && <ErrorsTab />}
          {activeTab === 'incidents' && <IncidentsTab />}
          {activeTab === 'maintenance' && <MaintenanceTab />}
          {activeTab === 'sla' && <SlaReportsTab />}
        </div>
      </div>
    </AdminPageLayout>
  );
}
