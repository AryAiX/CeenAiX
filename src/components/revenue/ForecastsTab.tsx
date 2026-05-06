import { useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { Currency, FORECAST, DEFAULT_ASSUMPTIONS, GOALS, formatCurrency } from '../../data/revenueData';
import { T, Card, SectionHeader, DeltaBadge } from './primitives';

export function ForecastsTab({ currency }: { currency: Currency }) {
  const [scenario, setScenario] = useState<'base' | 'best' | 'worst'>('base');
  const [method, setMethod] = useState('ML model');
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);

  return (
    <div className="flex flex-col gap-4">
      {/* Forecast chart */}
      <Card className="p-5">
        <SectionHeader title="Revenue Forecast — Next 12 Months">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Scenario */}
            <div className="flex gap-1 rounded-lg p-0.5" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
              {(['base','best','worst'] as const).map(s => (
                <button key={s} onClick={() => setScenario(s)}
                  className="text-[10px] px-2.5 py-1 rounded-md capitalize transition-all"
                  style={scenario === s ? { background: T.tealBg, color: T.tealLight } : { color: T.text3 }}>
                  {s === 'base' ? 'Base' : s === 'best' ? 'Best case' : 'Worst case'}
                </button>
              ))}
            </div>
            {/* Methodology */}
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="text-[10px] px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: T.bg2, border: `1px solid ${T.border}`, color: T.text2 }}
            >
              {['Linear', 'ARIMA', 'ML model'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </SectionHeader>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={FORECAST} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="fg-actual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.teal} stopOpacity={0.3} />
                <stop offset="95%" stopColor={T.teal} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fg-band" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: T.text3, fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: T.text3, fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false}
              tickFormatter={v => formatCurrency(v, currency)} width={90} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v, currency)}
              contentStyle={{ background: T.bg0, border: `1px solid ${T.border2}`, borderRadius: 10, fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: T.text3, paddingTop: 12 }} />
            {/* Confidence band */}
            <Area type="monotone" dataKey="high" name="High" stroke="none" fill="url(#fg-band)" connectNulls={false} legendType="none" />
            <Area type="monotone" dataKey="low"  name="Low"  stroke="none" fill={T.bg0} connectNulls={false} legendType="none" />
            {/* Actuals */}
            <Area type="monotone" dataKey="actual" name="Actual" stroke={T.teal} fill="url(#fg-actual)" strokeWidth={2} connectNulls={false} />
            {/* Forecast lines */}
            <Line type="monotone" dataKey="mid"  name="Base case"   stroke={T.cyan}    strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="high" name="Best case"   stroke="#059669"  strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="low"  name="Worst case"  stroke={T.warning} strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls={false} />
            <ReferenceLine x="Apr" stroke={T.tealBorder} strokeDasharray="3 2"
              label={{ value: 'Today', fill: T.text3, fontSize: 9, fontFamily: 'DM Mono, monospace' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Assumptions + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editable assumptions */}
        <Card className="p-5">
          <SectionHeader title="Forecast Assumptions">
            <button className="text-[10px] px-3 py-1.5 rounded-lg font-medium"
              style={{ background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }}>
              Recalculate
            </button>
          </SectionHeader>
          <div className="space-y-3">
            {([
              { label: 'New workspace acquisition / mo', key: 'acquisitionRate' as const, suffix: '' },
              { label: 'Avg deal size growth',           key: 'avgDealGrowth'    as const, suffix: '%' },
              { label: 'Churn rate — Pilot',             key: 'churnPilot'       as const, suffix: '%' },
              { label: 'Churn rate — Growth',            key: 'churnGrowth'      as const, suffix: '%' },
              { label: 'Churn rate — Enterprise',        key: 'churnEnterprise'  as const, suffix: '%' },
              { label: 'Expansion rate',                 key: 'expansionRate'    as const, suffix: '%' },
              { label: 'Seasonality factor',             key: 'seasonality'      as const, suffix: '×' },
            ]).map(a => (
              <div key={a.key} className="flex items-center gap-3">
                <span className="text-[11px] flex-1" style={{ color: T.text2 }}>{a.label}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={assumptions[a.key]}
                    onChange={e => setAssumptions({ ...assumptions, [a.key]: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 text-[11px] rounded-lg text-right outline-none"
                    style={{ background: T.bg2, border: `1px solid ${T.border}`, color: T.text1, fontFamily: 'DM Mono, monospace' }}
                  />
                  {a.suffix && <span className="text-[10px]" style={{ color: T.text3 }}>{a.suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Goals & targets */}
        <Card className="p-5">
          <SectionHeader title="Goals & Targets">
            <button className="text-[10px] px-3 py-1.5 rounded-lg font-medium"
              style={{ background: T.bg2, color: T.text2, border: `1px solid ${T.border}` }}>
              Set targets
            </button>
          </SectionHeader>
          <div className="space-y-5">
            {GOALS.map(g => {
              const pct = Math.min(100, Math.round((g.actual / g.target) * 100));
              const overshoot = g.complete && g.actual > g.target;
              return (
                <div key={g.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span style={{ color: T.text2 }}>{g.label}</span>
                    <div className="flex items-center gap-2">
                      <span style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>
                        {formatCurrency(g.actual, currency)} / {formatCurrency(g.target, currency)}
                      </span>
                      {g.complete && (
                        <DeltaBadge delta={((g.actual - g.target) / g.target) * 100} size="xs" />
                      )}
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: T.bg2 }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: g.complete ? (overshoot ? T.success : T.teal) : T.teal }} />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[9px]" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>
                    <span>{pct}% of target</span>
                    {!g.complete && <span>{formatCurrency(g.target - g.actual, currency)} remaining</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Variance table */}
          <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <div className="text-xs font-semibold mb-3" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Monthly Variance</div>
            <table className="w-full text-[10px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['Month','Target','Actual','Variance'].map(h => (
                    <th key={h} className="pb-1.5 text-left font-semibold pr-3" style={{ color: T.text3 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { month:'Jan', target:9_200_000, actual:9_400_000 },
                  { month:'Feb', target:9_600_000, actual:9_840_000 },
                  { month:'Mar', target:10_000_000, actual:10_240_000 },
                  { month:'Apr (MTD)', target:10_400_000, actual:4_872_400 },
                ].map(r => {
                  const delta = ((r.actual - r.target) / r.target) * 100;
                  const complete = r.month !== 'Apr (MTD)';
                  return (
                    <tr key={r.month} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td className="py-1.5 pr-3" style={{ color: T.text2 }}>{r.month}</td>
                      <td className="py-1.5 pr-3" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(r.target, currency)}</td>
                      <td className="py-1.5 pr-3" style={{ color: complete ? T.text1 : T.text3, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(r.actual, currency)}</td>
                      <td className="py-1.5">{complete ? <DeltaBadge delta={delta} size="xs" /> : <span style={{ color: T.text3 }}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
