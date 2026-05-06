import { ExternalLink, ShieldCheck, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { SERVICES } from '../mockData';
import type { ServiceStatus } from '../types';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const STATUS_COLORS: Record<ServiceStatus, string> = {
  'Operational': '#10B981',
  'Degraded': '#F59E0B',
  'Partial outage': '#F97316',
  'Major outage': '#EF4444',
};

const INTEGRATION_ROUTES: Record<string, string> = {
  'nabidh': '/admin/integrations/nabidh',
  'dha-sheryan': '/admin/integrations/dha',
  'fhir': '/admin/integrations/fhir',
  'payment': '/admin/integrations/payment',
};

const INTEGRATION_EVENTS = [
  { type: 'success', msg: 'NABIDH: 3,412 records submitted successfully', time: '14:00' },
  { type: 'info', msg: 'DHA Sheryan: certificate renewed — expires 2026-11-15', time: '12:55' },
  { type: 'warning', msg: 'Payment gateway: response time >300ms for 8 requests', time: '11:30' },
  { type: 'success', msg: 'FHIR R4: CapabilityStatement refreshed', time: '10:00' },
  { type: 'info', msg: 'HL7: new message profile activated — v2.5.1 ADT^A04', time: '09:15' },
  { type: 'success', msg: 'SMS provider: rate limit headroom 94%', time: '08:00' },
];

function throughputData() {
  return Array.from({ length: 12 }, (_, i) => ({
    h: `${String(i * 2).padStart(2, '0')}:00`,
    nabidh: Math.round(280 + Math.sin(i / 2) * 40 + Math.random() * 20),
    dha: Math.round(90 + Math.sin(i / 3) * 20 + Math.random() * 10),
    fhir: Math.round(170 + Math.sin(i / 2.5) * 30 + Math.random() * 15),
    hl7: Math.round(65 + Math.sin(i / 3) * 15 + Math.random() * 8),
  }));
}

const THROUGHPUT_DATA = throughputData();

function certDaysLeft(expiry: string): number {
  const exp = new Date(expiry);
  const now = new Date('2026-05-04');
  return Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function IntegrationsTab() {
  const integrations = SERVICES.filter(s => s.category === 'integration');

  return (
    <div className="p-6 space-y-6">
      {/* Integration cards */}
      <div>
        <h3 className="font-bold mb-3" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Integration Health</h3>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {integrations.map(svc => {
            const color = STATUS_COLORS[svc.status];
            const certDays = svc.certExpiry ? certDaysLeft(svc.certExpiry) : null;
            const certColor = certDays !== null ? (certDays < 7 ? '#EF4444' : certDays < 30 ? '#F59E0B' : '#10B981') : null;
            return (
              <div key={svc.id} className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: '#1E293B', border: `1px solid ${svc.status === 'Operational' ? 'rgba(51,65,85,0.5)' : color + '44'}`, borderTopWidth: svc.status === 'Operational' ? 1 : 3, borderTopColor: svc.status === 'Operational' ? 'rgba(51,65,85,0.5)' : color }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold" style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{svc.name}</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>v{svc.version} · {svc.owner}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span style={{ fontSize: 10, color, fontWeight: 600 }}>{svc.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {svc.throughput && (
                    <div className="rounded-lg p-2" style={{ background: 'rgba(51,65,85,0.3)' }}>
                      <div style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>Throughput</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#CBD5E1' }}>{svc.throughput}</div>
                    </div>
                  )}
                  {svc.successRate && (
                    <div className="rounded-lg p-2" style={{ background: 'rgba(51,65,85,0.3)' }}>
                      <div style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>Success (24h)</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#10B981' }}>{svc.successRate}</div>
                    </div>
                  )}
                  <div className="rounded-lg p-2" style={{ background: 'rgba(51,65,85,0.3)' }}>
                    <div style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>Avg Latency</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#CBD5E1' }}>{svc.latencyP50}</div>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: 'rgba(51,65,85,0.3)' }}>
                    <div style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>Uptime 24h</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#10B981' }}>{svc.uptime24h}</div>
                  </div>
                </div>
                {certDays !== null && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: `${certColor}10`, border: `1px solid ${certColor}30` }}>
                    <ShieldCheck className="w-3 h-3" style={{ color: certColor }} />
                    <span style={{ fontSize: 10, color: certColor }}>Cert expires in <strong>{certDays}d</strong> — {svc.certExpiry}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: '#475569' }}>Last exchange: just now</span>
                  {INTEGRATION_ROUTES[svc.id] && (
                    <button onClick={() => { window.history.pushState({}, '', INTEGRATION_ROUTES[svc.id]); window.dispatchEvent(new PopStateEvent('popstate')); }} className="flex items-center gap-1 text-[10px] font-medium" style={{ color: '#0D9488' }}>
                      Full detail <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-integration throughput */}
      <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
        <h3 className="font-bold mb-4" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cross-Integration Throughput (24h)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={THROUGHPUT_DATA}>
            <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'DM Mono, monospace' }} />
            <YAxis tick={{ fontSize: 9, fill: '#475569' }} unit="/h" />
            <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} />
            <Area type="monotone" dataKey="nabidh" stackId="1" stroke="#0D9488" fill="#0D948820" strokeWidth={1.5} name="NABIDH" />
            <Area type="monotone" dataKey="fhir" stackId="1" stroke="#0891B2" fill="#0891B220" strokeWidth={1.5} name="FHIR" />
            <Area type="monotone" dataKey="dha" stackId="1" stroke="#10B981" fill="#10B98120" strokeWidth={1.5} name="DHA Sheryan" />
            <Area type="monotone" dataKey="hl7" stackId="1" stroke="#F59E0B" fill="#F59E0B20" strokeWidth={1.5} name="HL7" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Integration events */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
          <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Integration Events</h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          {INTEGRATION_EVENTS.map((e, i) => {
            const color = e.type === 'success' ? '#10B981' : e.type === 'warning' ? '#F59E0B' : '#0891B2';
            return (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                <span style={{ fontSize: 12, color: '#CBD5E1', flex: 1 }}>{e.msg}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569', flexShrink: 0 }}>{e.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
