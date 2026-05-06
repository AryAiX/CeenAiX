import { useState } from 'react';
import { Monitor, Server, Globe, Database, ArrowRight, Circle, Triangle, Square } from 'lucide-react';
import { SERVICES, LIVE_FEED } from '../mockData';
import type { Service, ServiceStatus } from '../types';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts';

interface Props {
  timeRange: string;
  onTabChange: (tab: string) => void;
}

const STATUS_DOT: Record<ServiceStatus, { color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  'Operational': { color: '#10B981', icon: Circle },
  'Degraded': { color: '#F59E0B', icon: Triangle },
  'Partial outage': { color: '#F97316', icon: Triangle },
  'Major outage': { color: '#EF4444', icon: Square },
};

function MiniSparkline({ data }: { data: number[] }) {
  const min = Math.min(...data), max = Math.max(...data);
  const W = 56, H = 18;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min + 1)) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline fill="none" stroke="#0D9488" strokeWidth="1.5" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function ServiceCard({ svc, onClick }: { svc: Service; onClick: () => void }) {
  const cfg = STATUS_DOT[svc.status];
  const isOk = svc.status === 'Operational';
  const StatusIcon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-3 text-left transition-all hover:scale-[1.01] flex flex-col gap-2"
      style={{
        background: '#1E293B',
        border: `1px solid ${isOk ? 'rgba(51,65,85,0.5)' : cfg.color + '44'}`,
        borderTopWidth: isOk ? 1 : 3,
        borderTopColor: isOk ? 'rgba(51,65,85,0.5)' : cfg.color,
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{svc.name}</span>
        <StatusIcon className="w-3 h-3 flex-shrink-0" style={{ color: cfg.color, fill: cfg.color }} />
      </div>
      {!isOk && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit" style={{ background: `${cfg.color}20`, color: cfg.color }}>Action required</span>
      )}
      <div className="flex items-end justify-between">
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>{svc.uptime24h}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>p95: {svc.latencyP95}</div>
        </div>
        <MiniSparkline data={svc.sparkline} />
      </div>
    </button>
  );
}

const FEED_COLORS = { success: '#10B981', info: '#0891B2', warning: '#F59E0B', error: '#EF4444' } as const;

function activeUsersData() {
  const portals = ['Patient', 'Doctor', 'Pharmacy', 'Lab/Radiology', 'Insurance'];
  const colors = ['#0D9488', '#10B981', '#0891B2', '#8B5CF6', '#F59E0B'];
  const base = [320, 180, 60, 40, 25];
  const data = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const workdayFactor = hour >= 8 && hour <= 18 ? 1 + Math.sin((hour - 8) / 10 * Math.PI) * 0.6 : 0.15;
    const row: Record<string, number | string> = { h: `${String(hour).padStart(2, '0')}:00` };
    portals.forEach((p, j) => {
      row[p] = Math.max(0, Math.round(base[j] * workdayFactor + Math.random() * base[j] * 0.2));
    });
    return row;
  });
  return { data, portals, colors };
}

const ACTIVE_USERS = activeUsersData();

function reqVolumeData() {
  return Array.from({ length: 24 }, (_, i) => ({
    h: `${String(i).padStart(2, '0')}:00`,
    requests: Math.round(800 + Math.sin(i / 3) * 200 + Math.random() * 100),
    errors: Math.round(2 + (i >= 13 && i <= 15 ? 80 : 0) + Math.random() * 3),
  }));
}

function latencyData() {
  return Array.from({ length: 24 }, (_, i) => ({
    h: `${String(i).padStart(2, '0')}:00`,
    p50: Math.round(130 + Math.sin(i / 4) * 30 + (i >= 13 && i <= 15 ? 2800 : 0)),
    p95: Math.round(200 + Math.sin(i / 4) * 50 + (i >= 13 && i <= 15 ? 4500 : 0)),
    p99: Math.round(280 + Math.sin(i / 4) * 70 + (i >= 13 && i <= 15 ? 5800 : 0)),
  }));
}

const REQ_DATA = reqVolumeData();
const LAT_DATA = latencyData();

const RECENT_DEPLOYS = [
  { service: 'Patient Portal', version: 'v2.4.1', commit: 'a3f9c12', at: '13:50 GST', deployer: 'M. Hassan', status: 'Success' },
  { service: 'Doctor Portal', version: 'v2.4.1', commit: 'a3f9c12', at: '12:40 GST', deployer: 'M. Hassan', status: 'Success' },
  { service: 'Pharmacy Portal', version: 'v2.3.8', commit: 'b7d2e44', at: '2026-04-30 09:12', deployer: 'S. Khalil', status: 'Success' },
  { service: 'Auth & Identity', version: 'v3.1.0', commit: 'c8e1a77', at: '2026-04-29 22:00', deployer: 'O. Siddiqui', status: 'Success' },
];

export default function OverviewTab({ onTabChange }: Props) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const portals = SERVICES.filter(s => s.category === 'portal');
  const apis = SERVICES.filter(s => s.category === 'api');
  const integrations = SERVICES.filter(s => s.category === 'integration');
  const infra = SERVICES.filter(s => s.category === 'infrastructure');

  const groups = [
    { id: 'portals', label: 'Portals', icon: Monitor, services: portals },
    { id: 'apis', label: 'Core APIs', icon: Server, services: apis },
    { id: 'integrations', label: 'Critical Integrations', icon: Globe, services: integrations },
    { id: 'infrastructure', label: 'Infrastructure', icon: Database, services: infra },
  ];

  return (
    <div className="flex gap-0" style={{ minHeight: 0 }}>
      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto" style={{ minWidth: 0 }}>
        {/* Service status grid */}
        {groups.map(group => {
          const Icon = group.icon;
          const hasIssue = group.services.some(s => s.status !== 'Operational');
          return (
            <div key={group.id} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: '#64748B' }} />
                  <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{group.label}</h3>
                  {hasIssue && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>Degraded</span>}
                </div>
                <button onClick={() => onTabChange(group.id === 'portals' || group.id === 'apis' ? 'services' : group.id === 'integrations' ? 'integrations' : 'infrastructure')} className="flex items-center gap-1 text-[10px] font-medium" style={{ color: '#0D9488' }}>
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {group.services.map(svc => (
                  <ServiceCard key={svc.id} svc={svc} onClick={() => onTabChange('services')} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Active users by portal */}
        <div className="rounded-2xl p-5 mb-4" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Active Users by Portal (24h)</h3>
            <div className="flex items-center gap-3">
              {ACTIVE_USERS.portals.map((p, i) => (
                <div key={p} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: ACTIVE_USERS.colors[i] }} />
                  <span style={{ fontSize: 9, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={ACTIVE_USERS.data}>
              <defs>
                {ACTIVE_USERS.portals.map((p, i) => (
                  <linearGradient key={p} id={`auGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACTIVE_USERS.colors[i]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ACTIVE_USERS.colors[i]} stopOpacity={0.03} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'DM Mono, monospace' }} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
              <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} />
              {ACTIVE_USERS.portals.map((p, i) => (
                <Area key={p} type="monotone" dataKey={p} stackId="1" stroke={ACTIVE_USERS.colors[i]} strokeWidth={1.5} fill={`url(#auGrad${i})`} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Charts */}
        <div className="rounded-2xl p-5 mb-4" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <h3 className="font-bold mb-4" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Request Volume & Error Rate (24h)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={REQ_DATA}>
              <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'DM Mono, monospace' }} interval={3} />
              <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#475569' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#EF4444' }} />
              <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#0D9488" strokeWidth={1.5} dot={false} name="Requests/min" />
              <Line yAxisId="right" type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={1.5} dot={false} name="Errors/min" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5 mb-4" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <h3 className="font-bold mb-4" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Latency Distribution (p50 / p95 / p99)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={LAT_DATA}>
              <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'DM Mono, monospace' }} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} unit="ms" />
              <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="p50" stroke="#10B981" strokeWidth={1.5} dot={false} name="p50" />
              <Line type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="p95" />
              <Line type="monotone" dataKey="p99" stroke="#EF4444" strokeWidth={1.5} dot={false} name="p99" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent deploys */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
            <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Recent Deploys</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
            {RECENT_DEPLOYS.map((d, i) => (
              <div key={i} className="grid items-center px-5 py-2.5 gap-2" style={{ gridTemplateColumns: '1fr 80px 80px 120px 100px 80px 80px' }}>
                <span style={{ fontSize: 12, color: '#CBD5E1' }}>{d.service}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#0D9488' }}>{d.version}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>{d.commit}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>{d.at}</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{d.deployer}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold w-fit" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>{d.status}</span>
                <button style={{ fontSize: 10, color: '#0D9488' }}>View diff</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live activity rail */}
      <div className="w-72 flex-shrink-0 border-l p-4 overflow-auto" style={{ borderColor: 'rgba(51,65,85,0.4)', background: '#0F172A' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold" style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Activity</h3>
          <button style={{ fontSize: 10, color: '#0D9488' }}>View all</button>
        </div>
        <div className="flex flex-col gap-2">
          {LIVE_FEED.map(item => {
            const color = FEED_COLORS[item.type as keyof typeof FEED_COLORS] ?? '#64748B';
            return (
              <div key={item.id} className="rounded-xl p-3" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.4)' }}>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 11, color: '#CBD5E1', lineHeight: 1.4 }}>{item.msg}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span style={{ fontSize: 9, color: '#475569' }}>{item.service}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#374151' }}>{item.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
