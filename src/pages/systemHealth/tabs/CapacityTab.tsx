import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { CAPACITY_GAUGES } from '../mockData';

function CircleGauge({ pct, warning, critical, size = 80 }: { pct: number; warning: number; critical: number; size?: number }) {
  const color = pct >= critical ? '#EF4444' : pct >= warning ? '#F59E0B' : '#10B981';
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={12} fontFamily="DM Mono, monospace" fontWeight="700">{pct}%</text>
    </svg>
  );
}

function forecastData(base: number, growth = 1.02) {
  return Array.from({ length: 30 }, (_, i) => ({
    day: `D-${30 - i}`,
    actual: i < 25 ? Math.round(base * Math.pow(growth, i) + (Math.random() - 0.5) * base * 0.05) : null,
    forecast: i >= 22 ? Math.round(base * Math.pow(growth, i)) : null,
    capacity: 100,
  }));
}

const FORECAST = forecastData(38, 1.008);

export default function CapacityTab() {
  return (
    <div className="p-6 space-y-6">
      {/* Capacity gauges */}
      <div>
        <h3 className="font-bold mb-4" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Capacity Utilization</h3>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {CAPACITY_GAUGES.map(g => {
            const pct = Math.round((g.used / g.total) * 100);
            const color = pct >= g.critical ? '#EF4444' : pct >= g.warning ? '#F59E0B' : '#10B981';
            return (
              <div key={g.label} className="rounded-2xl p-4 flex flex-col items-center gap-3" style={{ background: '#1E293B', border: `1px solid ${pct >= g.critical ? 'rgba(239,68,68,0.3)' : pct >= g.warning ? 'rgba(245,158,11,0.3)' : 'rgba(51,65,85,0.5)'}` }}>
                <CircleGauge pct={pct} warning={g.warning} critical={g.critical} />
                <div className="text-center">
                  <div className="font-semibold" style={{ fontSize: 12, color: '#CBD5E1' }}>{g.label}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{g.used} / {g.total} {g.unit}</div>
                  {g.runway && <div style={{ fontSize: 10, color: color, marginTop: 2 }}>Runway: {g.runway}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast chart */}
      <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>DB Storage Growth Forecast (30d)</h3>
          <div className="flex gap-2">
            {['Base', 'High-growth', 'Spike'].map(s => (
              <button key={s} className="px-2.5 py-1 rounded-lg text-[10px] font-medium" style={{ background: s === 'Base' ? 'rgba(13,148,136,0.15)' : 'rgba(51,65,85,0.4)', color: s === 'Base' ? '#0D9488' : '#64748B', border: `1px solid ${s === 'Base' ? 'rgba(13,148,136,0.3)' : 'rgba(51,65,85,0.6)'}` }}>{s}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={FORECAST}>
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'DM Mono, monospace' }} interval={4} />
            <YAxis tick={{ fontSize: 9, fill: '#475569' }} unit="%" domain={[0, 110]} />
            <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} />
            <ReferenceLine y={70} stroke="#F59E0B50" strokeDasharray="4 4" label={{ value: 'Warning 70%', fill: '#F59E0B80', fontSize: 9 }} />
            <ReferenceLine y={85} stroke="#EF444450" strokeDasharray="4 4" label={{ value: 'Critical 85%', fill: '#EF444480', fontSize: 9 }} />
            <Area type="monotone" dataKey="actual" stroke="#0D9488" fill="#0D948818" strokeWidth={1.5} name="Actual" connectNulls={false} />
            <Area type="monotone" dataKey="forecast" stroke="#F59E0B" fill="#F59E0B10" strokeWidth={1.5} strokeDasharray="5 3" name="Forecast" connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Auto-scaling */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
          <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Auto-scaling Activity</h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          {[
            { time: '13:30', svc: 'Background Workers', event: 'Scale-out', from: 16, to: 18, trigger: 'Queue depth > 120' },
            { time: '11:00', svc: 'API Gateway', event: 'Scale-out', from: 4, to: 6, trigger: 'RPS > 900' },
            { time: '09:30', svc: 'API Gateway', event: 'Scale-in', from: 6, to: 4, trigger: 'RPS < 600 for 10m' },
            { time: '08:00', svc: 'Background Workers', event: 'Scale-in', from: 20, to: 16, trigger: 'Queue depth < 50 for 15m' },
          ].map((e, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 gap-3">
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>{e.time}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: e.event === 'Scale-out' ? 'rgba(16,185,129,0.1)' : 'rgba(8,145,178,0.1)', color: e.event === 'Scale-out' ? '#10B981' : '#0891B2' }}>{e.event}</span>
                <span style={{ fontSize: 12, color: '#CBD5E1' }}>{e.svc}</span>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#94A3B8' }}>{e.from} → {e.to} instances</div>
                <div style={{ fontSize: 10, color: '#475569' }}>{e.trigger}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
