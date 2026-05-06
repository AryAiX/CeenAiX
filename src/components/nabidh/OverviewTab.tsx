import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { SUBMISSION_TREND, LATENCY_PERCENTILES, RESOURCE_BREAKDOWN } from '../../data/nabidhData';
import { N, Card, SectionHeader } from './NabidhPrimitives';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#0A1628', border: `1px solid ${N.border}` }}>
      <div className="mb-1 font-semibold" style={{ color: N.text2, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: N.text2, fontSize: 10 }}>{p.name}:</span>
          <span style={{ color: N.text1, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function OverviewTab() {
  const [view, setView] = useState<'24h' | '7d'>('24h');

  return (
    <div className="flex flex-col gap-4">
      {/* Submission trend */}
      <Card className="p-5">
        <SectionHeader title="Submission Throughput">
          <div className="flex gap-1">
            {(['24h', '7d'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className="text-[10px] px-2.5 py-1 rounded-lg"
                style={view === v
                  ? { background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }
                  : { background: N.bg1, color: N.text3, border: `1px solid ${N.border}` }}>
                {v}
              </button>
            ))}
          </div>
        </SectionHeader>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={SUBMISSION_TREND} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradAccepted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={N.teal} stopOpacity={0.3} />
                <stop offset="95%" stopColor={N.teal} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#DC2626" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={N.border} vertical={false} />
            <XAxis dataKey="hour" tick={{ fill: N.text3, fontSize: 9, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: N.text3, fontSize: 9, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="accepted" name="Accepted" stroke={N.teal} fill="url(#gradAccepted)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#DC2626" fill="url(#gradRejected)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3">
          {[{ label: 'Accepted', color: N.teal }, { label: 'Rejected', color: '#DC2626' }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-[10px]" style={{ color: N.text3 }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency Percentiles */}
        <Card className="p-5">
          <SectionHeader title="Latency Percentiles (ms)" />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={LATENCY_PERCENTILES} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
              <XAxis type="number" tick={{ fill: N.text3, fontSize: 9, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fill: N.text2, fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} width={28} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}
                label={{ position: 'right', fill: N.text2, fontSize: 9, fontFamily: 'DM Mono, monospace', formatter: (v: number) => `${v}ms` }}>
                {LATENCY_PERCENTILES.map((p, i) => (
                  <Cell key={p.label} fill={i < 3 ? N.teal : i === 3 ? N.warning : '#DC2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 p-2 rounded-lg text-[10px]" style={{ background: 'rgba(217,119,6,0.08)', border: `1px solid rgba(217,119,6,0.2)` }}>
            <span style={{ color: N.warningLight }}>p99 = 1,240 ms</span>
            <span style={{ color: N.text3 }}> · Target: &lt;1,500 ms · </span>
            <span style={{ color: N.successLight }}>Within SLA</span>
          </div>
        </Card>

        {/* Resource type breakdown */}
        <Card className="p-5">
          <SectionHeader title="Submissions by Resource Type (24h)" />
          <div className="space-y-3">
            {RESOURCE_BREAKDOWN.map(r => (
              <div key={r.name}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span style={{ color: N.text2 }}>{r.name}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: N.tealLight, fontFamily: 'DM Mono, monospace' }}>{r.count.toLocaleString()}</span>
                    <span style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>{r.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: N.bg1 }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${r.pct}%`, background: N.teal }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Real-time status row */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold" style={{ color: N.successLight }}>Live Sync Active</span>
          </div>
          {[
            { label: 'Queue depth', value: '208', color: N.warningLight },
            { label: 'Processing rate', value: '247/min', color: N.tealLight },
            { label: 'Error rate (1h)', value: '1.41%', color: N.text2 },
            { label: 'DHA endpoint', value: 'Operational', color: N.successLight },
            { label: 'Last submission', value: '12s ago', color: N.text3 },
          ].map(s => (
            <div key={s.label} className="text-[10px]">
              <span style={{ color: N.text3 }}>{s.label}: </span>
              <span style={{ color: s.color, fontFamily: 'DM Mono, monospace' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
