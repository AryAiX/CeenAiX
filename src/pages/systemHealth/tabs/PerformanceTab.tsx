import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

function perfData(count = 24, spikeAt?: number) {
  return Array.from({ length: count }, (_, i) => ({
    h: `${String(i).padStart(2, '0')}:00`,
    p50: Math.round(120 + Math.sin(i / 4) * 30 + (spikeAt && i === spikeAt ? 1800 : 0) + Math.random() * 15),
    p95: Math.round(200 + Math.sin(i / 4) * 50 + (spikeAt && i === spikeAt ? 4000 : 0) + Math.random() * 25),
    p99: Math.round(280 + Math.sin(i / 4) * 70 + (spikeAt && i === spikeAt ? 5500 : 0) + Math.random() * 35),
    rps: Math.round(800 + Math.sin(i / 3) * 200 + Math.random() * 80),
    users: Math.round(1400 + Math.sin(i / 3) * 300 + Math.random() * 100),
  }));
}

const DATA = perfData(24, 13);

const SLOW_ENDPOINTS = [
  { path: 'POST /api/insurance/claims/submit', p95: '4800ms', vol: '2.1k/h', portal: 'Insurance' },
  { path: 'GET /api/insurance/coverage/:id', p95: '3200ms', vol: '8.4k/h', portal: 'Insurance' },
  { path: 'POST /api/nabidh/submit', p95: '1200ms', vol: '3.4k/h', portal: 'NABIDH' },
  { path: 'GET /api/dicom/study/:uid', p95: '1100ms', vol: '120/h', portal: 'Lab & Radiology' },
  { path: 'POST /api/payments/process', p95: '890ms', vol: '340/h', portal: 'Billing' },
  { path: 'GET /api/patient/records/:id', p95: '720ms', vol: '12k/h', portal: 'Patient' },
  { path: 'GET /api/appointments/calendar', p95: '540ms', vol: '18k/h', portal: 'Doctor' },
];

const VITALS = [
  { portal: 'Patient Portal', lcp: '1.8s', inp: '42ms', cls: '0.02', lcpOk: true, inpOk: true, clsOk: true },
  { portal: 'Doctor Portal', lcp: '2.1s', inp: '55ms', cls: '0.01', lcpOk: true, inpOk: true, clsOk: true },
  { portal: 'Insurance Portal', lcp: '4.2s', inp: '120ms', cls: '0.08', lcpOk: false, inpOk: false, clsOk: true },
  { portal: 'Pharmacy Portal', lcp: '1.9s', inp: '38ms', cls: '0.00', lcpOk: true, inpOk: true, clsOk: true },
  { portal: 'Lab & Radiology', lcp: '2.4s', inp: '60ms', cls: '0.03', lcpOk: true, inpOk: true, clsOk: true },
];

const SYNTH_CHECKS = [
  { name: 'Patient Login Flow', success: '100%', latency: '890ms', status: 'Pass' },
  { name: 'Doctor — Create Consultation', success: '100%', latency: '1.2s', status: 'Pass' },
  { name: 'NABIDH Submission Round-trip', success: '99.2%', latency: '1.8s', status: 'Pass' },
  { name: 'Pharmacy Dispense Workflow', success: '100%', latency: '1.1s', status: 'Pass' },
  { name: 'Insurance Claim Submit', success: '94.8%', latency: '4.9s', status: 'Degraded' },
  { name: 'Payment Flow (test mode)', success: '100%', latency: '620ms', status: 'Pass' },
];

export default function PerformanceTab({ timeRange }: { timeRange: string }) {
  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Latency chart */}
        <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <h3 className="font-bold mb-4" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Latency Distribution (24h)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={DATA}>
              <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'DM Mono, monospace' }} interval={5} />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} unit="ms" />
              <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} />
              <ReferenceLine y={200} stroke="#EF444450" strokeDasharray="4 4" label={{ value: 'SLA', fill: '#EF444480', fontSize: 9 }} />
              <Line type="monotone" dataKey="p50" stroke="#10B981" strokeWidth={1.5} dot={false} name="p50" />
              <Line type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="p95" />
              <Line type="monotone" dataKey="p99" stroke="#EF4444" strokeWidth={1.5} dot={false} name="p99" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* RPS chart */}
        <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <h3 className="font-bold mb-4" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Requests/sec & Active Users (24h)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={DATA}>
              <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'DM Mono, monospace' }} interval={5} />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
              <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="users" stroke="#0D9488" fill="#0D948820" strokeWidth={1.5} name="Active Users" />
              <Area type="monotone" dataKey="rps" stroke="#0891B2" fill="#0891B215" strokeWidth={1.5} name="RPS" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Slow endpoints */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
          <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Slowest Endpoints (p95)</h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          <div className="grid px-5 py-2" style={{ gridTemplateColumns: '1fr 80px 80px 100px 80px' }}>
            {['Endpoint', 'Portal', 'p95', 'Volume', ''].map(h => (
              <span key={h} style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>
          {SLOW_ENDPOINTS.map((ep, i) => {
            const ms = parseInt(ep.p95);
            const color = ms > 2000 ? '#EF4444' : ms > 800 ? '#F59E0B' : '#10B981';
            return (
              <div key={i} className="grid items-center px-5 py-2.5 gap-2 hover:bg-slate-700/10 transition-colors" style={{ gridTemplateColumns: '1fr 80px 80px 100px 80px' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#CBD5E1' }}>{ep.path}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium w-fit" style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }}>{ep.portal}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color }}>{ep.p95}</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>{ep.vol}</span>
                <button style={{ fontSize: 10, color: '#0D9488' }}>Open trace</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Core Web Vitals */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
            <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Core Web Vitals</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
            {VITALS.map((v, i) => (
              <div key={i} className="grid items-center px-5 py-2.5 gap-3" style={{ gridTemplateColumns: '1fr 60px 60px 60px' }}>
                <span style={{ fontSize: 12, color: '#CBD5E1' }}>{v.portal}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: v.lcpOk ? '#10B981' : '#EF4444' }}>{v.lcp}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: v.inpOk ? '#10B981' : '#EF4444' }}>{v.inp}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: v.clsOk ? '#10B981' : '#EF4444' }}>{v.cls}</span>
              </div>
            ))}
            <div className="grid px-5 py-1.5" style={{ gridTemplateColumns: '1fr 60px 60px 60px' }}>
              <span />
              {['LCP', 'INP', 'CLS'].map(l => <span key={l} style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono, monospace' }}>{l}</span>)}
            </div>
          </div>
        </div>

        {/* Synthetic checks */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
            <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Synthetic Monitoring</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
            {SYNTH_CHECKS.map((c, i) => {
              const ok = c.status === 'Pass';
              return (
                <div key={i} className="flex items-center justify-between px-5 py-2.5 gap-3">
                  <span style={{ fontSize: 12, color: '#CBD5E1' }}>{c.name}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: parseFloat(c.success) < 99 ? '#F59E0B' : '#10B981' }}>{c.success}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{c.latency}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: ok ? '#10B981' : '#F59E0B' }}>{c.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
