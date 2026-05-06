import { useState } from 'react';
import { Search, ChevronRight, Circle, Triangle, Square, Activity, BarChart2, AlertCircle, GitBranch, Layers, Bell, CheckCircle, ArrowUp, ArrowDown, GitCommitVertical as GitCommit, User } from 'lucide-react';
import { SERVICES, ERROR_SIGNATURES } from '../mockData';
import type { Service, ServiceStatus } from '../types';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';

const STATUS_CONFIG: Record<ServiceStatus, { color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  'Operational': { color: '#10B981', icon: Circle },
  'Degraded': { color: '#F59E0B', icon: Triangle },
  'Partial outage': { color: '#F97316', icon: Triangle },
  'Major outage': { color: '#EF4444', icon: Square },
};

const CAT_LABELS = { portal: 'Portal', api: 'Core API', integration: 'Integration', infrastructure: 'Infrastructure' };

type SubTab = 'health' | 'performance' | 'errors' | 'dependencies' | 'deploys' | 'alerts';
const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'performance', label: 'Performance', icon: BarChart2 },
  { id: 'errors', label: 'Errors', icon: AlertCircle },
  { id: 'dependencies', label: 'Dependencies', icon: GitBranch },
  { id: 'deploys', label: 'Deploys', icon: Layers },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

function perfData() {
  return Array.from({ length: 24 }, (_, i) => ({
    h: `${String(i).padStart(2, '0')}:00`,
    p50: Math.round(100 + Math.sin(i / 4) * 30 + Math.random() * 20),
    p95: Math.round(160 + Math.sin(i / 4) * 50 + Math.random() * 30),
    vol: Math.round(400 + Math.sin(i / 3) * 150 + Math.random() * 50),
  }));
}

const DEPLOYS_BY_SERVICE: Record<string, { version: string; commit: string; at: string; deployer: string; status: 'Success' | 'Failed' | 'Rolled back'; duration: string }[]> = {
  'insurance-portal': [
    { version: 'v2.4.1', commit: 'a3f9c12', at: '13:50 GST', deployer: 'M. Hassan', status: 'Success', duration: '4m 12s' },
    { version: 'v2.4.0', commit: 'b7d2e44', at: '2026-05-01 09:12', deployer: 'S. Khalil', status: 'Success', duration: '3m 58s' },
    { version: 'v2.3.9', commit: 'c8e1a77', at: '2026-04-28 22:00', deployer: 'M. Hassan', status: 'Rolled back', duration: '2m 44s' },
  ],
};

const ALERTS_BY_SERVICE: Record<string, { id: string; rule: string; severity: string; lastFired: string; status: 'Firing' | 'Resolved' | 'OK'; value: string }[]> = {
  'insurance-portal': [
    { id: 'ALT-1024', rule: 'API latency p95 > 2000ms', severity: 'High', lastFired: '13:22 GST', status: 'Firing', value: 'p95=5100ms' },
    { id: 'ALT-1025', rule: 'Error rate > 1%', severity: 'High', lastFired: '13:22 GST', status: 'Firing', value: '2.40%' },
    { id: 'ALT-1018', rule: 'DB connection pool > 80%', severity: 'Medium', lastFired: '13:40 GST', status: 'Firing', value: '68%' },
  ],
};

const DEPS_BY_SERVICE: Record<string, { name: string; direction: 'upstream' | 'downstream'; status: ServiceStatus; latency: string }[]> = {
  'insurance-portal': [
    { name: 'Billing API', direction: 'upstream', status: 'Operational', latency: '250ms' },
    { name: 'Database (Primary)', direction: 'upstream', status: 'Operational', latency: '41ms' },
    { name: 'Cache (Redis)', direction: 'upstream', status: 'Operational', latency: '2ms' },
    { name: 'Auth & Identity', direction: 'upstream', status: 'Operational', latency: '45ms' },
    { name: 'Patient Portal', direction: 'downstream', status: 'Operational', latency: '—' },
  ],
  default: [
    { name: 'Database (Primary)', direction: 'upstream', status: 'Operational', latency: '41ms' },
    { name: 'Cache (Redis)', direction: 'upstream', status: 'Operational', latency: '2ms' },
    { name: 'Auth & Identity', direction: 'upstream', status: 'Operational', latency: '45ms' },
  ],
};

function ServiceDetailPanel({ svc }: { svc: Service }) {
  const [subTab, setSubTab] = useState<SubTab>('health');
  const cfg = STATUS_CONFIG[svc.status];
  const data = perfData();
  const deploys = DEPLOYS_BY_SERVICE[svc.id] || DEPLOYS_BY_SERVICE['insurance-portal'].slice(0, 1);
  const alerts = ALERTS_BY_SERVICE[svc.id] || [];
  const deps = DEPS_BY_SERVICE[svc.id] || DEPS_BY_SERVICE['default'];
  const svcErrors = ERROR_SIGNATURES.filter(e => e.service === svc.name);

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white" style={{ fontSize: 16, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{svc.name}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#0D9488', background: 'rgba(13,148,136,0.1)', padding: '2px 6px', borderRadius: 4 }}>{svc.version}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>Production</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                <span style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{svc.status}</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748B' }}>Owner: {svc.owner}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>Uptime 24h: <span style={{ fontFamily: 'DM Mono, monospace', color: '#10B981' }}>{svc.uptime24h}</span></span>
              {svc.lastIncident && <span style={{ fontSize: 11, color: '#F59E0B' }}>Last incident: {svc.lastIncident}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {['Runbook', 'Health check', 'Page on-call'].map(action => (
              <button key={action} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-slate-700/50" style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8', border: '1px solid rgba(51,65,85,0.6)' }}>{action}</button>
            ))}
            {svc.status !== 'Operational' && (
              <button className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>Restart</button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b px-5 overflow-x-auto" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
        {SUB_TABS.map(t => {
          const Icon = t.icon;
          const hasBadge = (t.id === 'errors' && svcErrors.length > 0) || (t.id === 'alerts' && alerts.some(a => a.status === 'Firing'));
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)} className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0" style={{ color: subTab === t.id ? '#0D9488' : '#64748B', borderBottomColor: subTab === t.id ? '#0D9488' : 'transparent' }}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
              {hasBadge && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444' }} />}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div className="p-5">
        {subTab === 'health' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Uptime (24h)', value: svc.uptime24h, color: '#10B981' },
                { label: 'p95 Latency', value: svc.latencyP95, color: '#0D9488' },
                { label: 'Error Rate', value: svc.errorRate, color: parseFloat(svc.errorRate) > 0.1 ? '#F59E0B' : '#10B981' },
                { label: 'p50 Latency', value: svc.latencyP50, color: '#0D9488' },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-3" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
                  <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, color: m.color, fontWeight: 700 }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, fontWeight: 600 }}>Status Timeline (24h)</div>
              <div className="flex gap-0.5 h-6">
                {Array.from({ length: 96 }, (_, i) => {
                  const isIssue = svc.id === 'insurance-portal' && i >= 52 && i <= 62;
                  return <div key={i} className="flex-1 rounded-sm" style={{ background: isIssue ? '#F59E0B' : '#10B981' }} title={isIssue ? 'Degraded' : 'Operational'} />;
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#374151' }}>24h ago</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#374151' }}>Now</span>
              </div>
            </div>
          </div>
        )}

        {subTab === 'performance' && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, fontWeight: 600 }}>Latency p50 / p95 (24h)</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data}>
                  <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'DM Mono, monospace' }} interval={5} />
                  <YAxis tick={{ fontSize: 9, fill: '#475569' }} unit="ms" />
                  <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="p50" stroke="#10B981" strokeWidth={1.5} dot={false} name="p50" />
                  <Line type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="p95" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, fontWeight: 600 }}>Request Volume (24h)</div>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={data}>
                  <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'DM Mono, monospace' }} interval={5} />
                  <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
                  <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="vol" stroke="#0D9488" fill="rgba(13,148,136,0.15)" strokeWidth={1.5} dot={false} name="Req/min" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8, fontWeight: 600 }}>Slowest Endpoints</div>
              <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
                {[
                  { path: 'POST /api/claims/submit', p95: '4800ms', vol: '2.1k/h' },
                  { path: 'GET /api/insurance/coverage', p95: '3200ms', vol: '8.4k/h' },
                  { path: 'POST /api/preauth/request', p95: '2900ms', vol: '1.3k/h' },
                  { path: 'GET /api/patient/summary', p95: '890ms', vol: '12k/h' },
                  { path: 'GET /api/appointments/list', p95: '420ms', vol: '18k/h' },
                ].map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-2 gap-3">
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#CBD5E1' }}>{e.path}</span>
                    <div className="flex items-center gap-3">
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: i < 2 ? '#EF4444' : '#F59E0B' }}>{e.p95}</span>
                      <span style={{ fontSize: 10, color: '#475569' }}>{e.vol}</span>
                      <button style={{ fontSize: 10, color: '#0D9488' }}>Open trace</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {subTab === 'errors' && (
          <div className="space-y-4">
            {svcErrors.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
                <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#10B981' }} />
                <div style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>No active error signatures</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>This service has no unresolved errors in the selected range.</div>
              </div>
            ) : (
              svcErrors.map(err => {
                const sevColor = err.severity === 'high' ? '#EF4444' : err.severity === 'medium' ? '#F59E0B' : '#0891B2';
                return (
                  <div key={err.id} className="rounded-xl p-4" style={{ background: '#1E293B', border: `1px solid ${sevColor}33` }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: `${sevColor}15`, color: sevColor }}>{err.severity}</span>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#475569' }}>{err.id}</span>
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#CBD5E1' }}>{err.signature}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: err.status === 'Resolved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: err.status === 'Resolved' ? '#10B981' : '#F59E0B' }}>{err.status}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-[10px]">
                      <div><div style={{ color: '#475569' }}>Occurrences</div><div style={{ fontFamily: 'DM Mono, monospace', color: '#CBD5E1' }}>{err.occurrences.toLocaleString()}</div></div>
                      <div><div style={{ color: '#475569' }}>Affected users</div><div style={{ fontFamily: 'DM Mono, monospace', color: '#CBD5E1' }}>{err.affectedUsers}</div></div>
                      <div><div style={{ color: '#475569' }}>First seen</div><div style={{ fontFamily: 'DM Mono, monospace', color: '#CBD5E1' }}>{err.firstSeen}</div></div>
                      <div><div style={{ color: '#475569' }}>Last seen</div><div style={{ fontFamily: 'DM Mono, monospace', color: '#CBD5E1' }}>{err.lastSeen}</div></div>
                    </div>
                    <div className="mt-3 p-2.5 rounded-lg text-[10px]" style={{ background: 'rgba(51,65,85,0.3)', fontFamily: 'DM Mono, monospace', color: '#94A3B8' }}>
                      {/* PHI redacted stack trace placeholder */}
                      at ConnectionPool.acquire (pool.js:148:12){'\n'}
                      at InsuranceAPI.handleClaim (claims.js:89:4){'\n'}
                      [PHI-REDACTED] · reveal requires audit:view-phi permission
                    </div>
                    <div className="flex gap-2 mt-3">
                      {['Assign', 'Acknowledge', 'View in error tracker'].map(a => (
                        <button key={a} className="px-2.5 py-1 rounded-lg text-[10px]" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8', border: '1px solid rgba(51,65,85,0.6)' }}>{a}</button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {subTab === 'dependencies' && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>Dependency Map — {svc.name}</div>
              </div>
              <div className="p-5 space-y-2">
                {/* Upstream */}
                <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Upstream (this service depends on)</div>
                {deps.filter(d => d.direction === 'upstream').map(dep => {
                  const depCfg = STATUS_CONFIG[dep.status];
                  const DepIcon = depCfg.icon;
                  return (
                    <div key={dep.name} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(51,65,85,0.3)', border: '1px solid rgba(51,65,85,0.4)' }}>
                      <div className="flex items-center gap-2">
                        <ArrowUp className="w-3 h-3" style={{ color: '#64748B' }} />
                        <DepIcon className="w-3 h-3" style={{ color: depCfg.color, fill: depCfg.color }} />
                        <span style={{ fontSize: 12, color: '#CBD5E1' }}>{dep.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>{dep.latency}</span>
                        <span style={{ fontSize: 10, color: depCfg.color }}>{dep.status}</span>
                      </div>
                    </div>
                  );
                })}
                {/* Downstream */}
                {deps.filter(d => d.direction === 'downstream').length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, marginTop: 12 }}>Downstream (depends on this service)</div>
                    {deps.filter(d => d.direction === 'downstream').map(dep => {
                      const depCfg = STATUS_CONFIG[dep.status];
                      const DepIcon = depCfg.icon;
                      return (
                        <div key={dep.name} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(51,65,85,0.3)', border: '1px solid rgba(51,65,85,0.4)' }}>
                          <div className="flex items-center gap-2">
                            <ArrowDown className="w-3 h-3" style={{ color: '#64748B' }} />
                            <DepIcon className="w-3 h-3" style={{ color: depCfg.color, fill: depCfg.color }} />
                            <span style={{ fontSize: 12, color: '#CBD5E1' }}>{dep.name}</span>
                          </div>
                          <span style={{ fontSize: 10, color: depCfg.color }}>{dep.status}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, marginBottom: 4 }}>Blast radius</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>
                If <strong style={{ color: '#CBD5E1' }}>{svc.name}</strong> goes offline: {deps.filter(d => d.direction === 'downstream').map(d => d.name).join(', ') || 'No downstream portals directly affected'} would be impacted. Clinical workflows involving insurance claim submission and pre-authorisation would stall.
              </div>
            </div>
          </div>
        )}

        {subTab === 'deploys' && (
          <div className="rounded-xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>Deploy History</div>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
              {deploys.map((d, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#0D9488' }}>{d.version}</span>
                      <div className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3" style={{ color: '#475569' }} />
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>{d.commit}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ background: d.status === 'Success' ? 'rgba(16,185,129,0.1)' : d.status === 'Failed' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: d.status === 'Success' ? '#10B981' : d.status === 'Failed' ? '#EF4444' : '#F59E0B' }}>{d.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" style={{ color: '#475569' }} />
                        <span style={{ fontSize: 10, color: '#64748B' }}>{d.deployer}</span>
                      </div>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>{d.at}</span>
                      <span style={{ fontSize: 10, color: '#475569' }}>{d.duration}</span>
                      <button style={{ fontSize: 10, color: '#0D9488' }}>View diff</button>
                      {d.status !== 'Rolled back' && (
                        <button style={{ fontSize: 10, color: '#F59E0B' }}>Rollback</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {subTab === 'alerts' && (
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
                <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#10B981' }} />
                <div style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>No active alerts</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>All configured alert rules are in OK state.</div>
              </div>
            ) : (
              alerts.map(alert => {
                const sevColor = alert.severity === 'Critical' ? '#EF4444' : alert.severity === 'High' ? '#F97316' : '#F59E0B';
                const statusColor = alert.status === 'Firing' ? sevColor : alert.status === 'Resolved' ? '#10B981' : '#10B981';
                return (
                  <div key={alert.id} className="rounded-xl p-4" style={{ background: '#1E293B', border: `1px solid ${alert.status === 'Firing' ? `${sevColor}44` : 'rgba(51,65,85,0.5)'}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: `${sevColor}15`, color: sevColor }}>{alert.severity}</span>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#475569' }}>{alert.id}</span>
                          {alert.status === 'Firing' && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sevColor }} />}
                        </div>
                        <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600 }}>{alert.rule}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: sevColor, marginTop: 2 }}>{alert.value}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: `${statusColor}15`, color: statusColor }}>{alert.status}</span>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#475569', marginTop: 4 }}>Last: {alert.lastFired}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div className="rounded-xl p-3" style={{ background: 'rgba(51,65,85,0.2)', border: '1px solid rgba(51,65,85,0.4)' }}>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8, fontWeight: 600 }}>On-call rotation — {svc.owner}</div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(13,148,136,0.2)', color: '#0D9488' }}>AH</div>
                <div>
                  <div style={{ fontSize: 11, color: '#CBD5E1' }}>Ahmed Hassan — Primary</div>
                  <div style={{ fontSize: 10, color: '#475569' }}>On-call until 08:00 GST</div>
                </div>
                <button className="ml-auto px-3 py-1 rounded-lg text-[10px]" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>Page now</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicesTab() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Service>(SERVICES[4]); // Insurance Portal (Degraded) as default

  const filtered = SERVICES.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || s.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="flex" style={{ height: 'calc(100vh - 220px)', minHeight: 500 }}>
      {/* Left rail */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
        {/* Filters */}
        <div className="p-3 border-b flex flex-col gap-2" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…" className="w-full pl-8 pr-3 py-2 rounded-lg outline-none text-xs" style={{ background: 'rgba(51,65,85,0.4)', color: '#CBD5E1', border: '1px solid rgba(51,65,85,0.6)' }} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'portal', 'api', 'integration', 'infrastructure'] as const).map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)} className="px-2 py-1 rounded-md text-[9px] font-semibold capitalize" style={{ background: categoryFilter === c ? 'rgba(13,148,136,0.2)' : 'rgba(51,65,85,0.4)', color: categoryFilter === c ? '#0D9488' : '#64748B' }}>
                {c === 'all' ? 'All' : CAT_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['all', 'Operational', 'Degraded'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className="px-2 py-1 rounded-md text-[9px] font-semibold" style={{ background: statusFilter === s ? 'rgba(13,148,136,0.2)' : 'rgba(51,65,85,0.4)', color: statusFilter === s ? '#0D9488' : '#64748B' }}>{s}</button>
            ))}
          </div>
        </div>
        {/* Service list */}
        <div className="flex-1 overflow-auto">
          {filtered.map(svc => {
            const cfg = STATUS_CONFIG[svc.status];
            const StatusIcon = cfg.icon;
            return (
              <button key={svc.id} onClick={() => setSelected(svc)} className="w-full px-3 py-2.5 text-left border-b transition-colors flex items-center gap-2.5" style={{ borderColor: 'rgba(51,65,85,0.3)', background: selected.id === svc.id ? 'rgba(13,148,136,0.08)' : 'transparent' }}>
                <StatusIcon className="w-3 h-3 flex-shrink-0" style={{ color: cfg.color, fill: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: selected.id === svc.id ? 600 : 400 }}>{svc.name}</div>
                  <div style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace' }}>{svc.latencyP95} p95 · {svc.errorRate} err</div>
                </div>
                <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: selected.id === svc.id ? '#0D9488' : '#374151' }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <ServiceDetailPanel svc={selected} />
    </div>
  );
}
