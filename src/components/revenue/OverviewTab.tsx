import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  ChevronRight, CheckCircle, Plus, AlertCircle, RefreshCw, ArrowUpRight,
  Shield, Clock, TrendingUp, DollarSign, AlertTriangle, XCircle, Package,
} from 'lucide-react';
import {
  Currency, REVENUE_TREND, PREV_TREND, SOURCES, WORKSPACES,
  COHORT, COHORT_MONTHS, ACTIVITY, formatCurrency,
} from '../../data/revenueData';
import { T, Card, SectionHeader, DeltaBadge, Sparkline, TierChip, HealthChip, RevenueTooltip, FilterBtn, TH, TD, TR } from './primitives';

const STACK_KEYS = [
  { key: 'subscription',  name: 'Subscriptions',   color: '#0D9488' },
  { key: 'consultations', name: 'Consultations',    color: '#0891B2' },
  { key: 'labRadiology',  name: 'Lab & Radiology',  color: '#059669' },
  { key: 'pharmacy',      name: 'Pharmacy',         color: '#D97706' },
  { key: 'insuranceFees', name: 'Insurance Fees',   color: '#DC2626' },
  { key: 'other',         name: 'Other',            color: '#475569' },
];

export function OverviewTab({ currency }: { currency: Currency }) {
  const [chartMode, setChartMode] = useState<'gross' | 'net' | 'cumulative'>('gross');
  const [showComparison, setShowComparison] = useState(false);
  const [cohortToggle, setCohortToggle] = useState<'revenue' | 'logo' | 'nrr'>('revenue');

  // Build cumulative data
  const chartData = (() => {
    if (chartMode !== 'cumulative') return REVENUE_TREND;
    let cum = 0;
    return REVENUE_TREND.map(d => {
      const total = d.subscription + d.consultations + d.labRadiology + d.pharmacy + d.insuranceFees + d.other;
      cum += total;
      return { ...d, _cum: cum };
    });
  })();

  // Merge prev comparison
  const mergedData = chartData.map((d, i) => ({
    ...d,
    _prev: PREV_TREND[i]?.total ?? 0,
  }));

  const ICON_MAP: Record<string, React.ElementType> = {
    CheckCircle, Plus, AlertCircle, RefreshCw, ArrowUpRight, Shield,
    Clock, TrendingUp, DollarSign, AlertTriangle, XCircle, Package,
  };
  const TYPE_COLOR: Record<string, string> = {
    success: T.success, teal: T.tealLight, error: T.error, warning: T.warning, info: T.blue,
  };

  return (
    <div className="flex gap-4 min-w-0">
      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Revenue trend */}
        <Card className="p-5">
          <SectionHeader title="Revenue Trend">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Granularity */}
              <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                {(['Daily','Weekly','Monthly'] as const).map(g => (
                  <button key={g} className="text-[10px] px-2 py-1 rounded-md transition-all"
                    style={{ background: g === 'Daily' ? T.tealBg : 'transparent', color: g === 'Daily' ? T.tealLight : T.text3 }}>
                    {g}
                  </button>
                ))}
              </div>
              {/* Mode */}
              <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                {(['gross','net','cumulative'] as const).map(m => (
                  <button key={m} onClick={() => setChartMode(m)}
                    className="text-[10px] px-2 py-1 rounded-md capitalize transition-all"
                    style={{ background: chartMode === m ? T.tealBg : 'transparent', color: chartMode === m ? T.tealLight : T.text3 }}>
                    {m}
                  </button>
                ))}
              </div>
              {/* Compare toggle */}
              <button
                onClick={() => setShowComparison(v => !v)}
                className="text-[10px] px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{ background: showComparison ? T.tealBg : T.bg2, color: showComparison ? T.tealLight : T.text3, border: `1px solid ${showComparison ? T.tealBorder : T.border}` }}
              >
                Compare
              </button>
            </div>
          </SectionHeader>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={mergedData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                {STACK_KEYS.map(sk => (
                  <linearGradient key={sk.key} id={`g-${sk.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sk.color} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={sk.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
                <linearGradient id="g-cum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.teal} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.teal} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: T.text3, fontSize: 9, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: T.text3, fontSize: 9, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCurrency(v, currency)} width={86} />
              <Tooltip content={<RevenueTooltip currency={currency} />} />
              {chartMode === 'cumulative'
                ? <Area type="monotone" dataKey="_cum" name="Cumulative" stroke={T.teal} fill="url(#g-cum)" strokeWidth={2} />
                : STACK_KEYS.map(sk => (
                    <Area key={sk.key} type="monotone" dataKey={sk.key} name={sk.name}
                      stackId="1" stroke={sk.color} fill={`url(#g-${sk.key})`} strokeWidth={1.5} />
                  ))
              }
              {showComparison && (
                <Area type="monotone" dataKey="_prev" name="Prev period" stroke={T.text3}
                  fill="none" strokeWidth={1.5} strokeDasharray="5 3" />
              )}
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
            {STACK_KEYS.map(sk => (
              <div key={sk.key} className="flex items-center gap-1.5 text-[10px]" style={{ color: T.text3 }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: sk.color }} />
                {sk.name}
              </div>
            ))}
            {showComparison && (
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: T.text3 }}>
                <span className="w-5 border-t border-dashed" style={{ borderColor: T.text3 }} />
                Prev period
              </div>
            )}
          </div>
        </Card>

        {/* Revenue by source */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <SectionHeader title="Revenue by Source" />
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie data={SOURCES} cx="50%" cy="50%" innerRadius={36} outerRadius={58}
                      dataKey="value" paddingAngle={2} startAngle={90} endAngle={450}>
                      {SOURCES.map(s => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v, currency)}
                      contentStyle={{ background: T.bg0, border: `1px solid ${T.border2}`, borderRadius: 8, fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0">
                {SOURCES.map(s => (
                  <div key={s.name} className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-[10px] flex-1 truncate" style={{ color: T.text2 }}>{s.name}</span>
                    <Sparkline data={s.spark} color={s.color} w={36} h={16} />
                    <DeltaBadge delta={s.growth} size="xs" />
                    <span className="text-[10px] w-8 text-right" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Cohort heatmap */}
          <Card className="p-5">
            <SectionHeader title="Revenue Cohort Retention">
              <div className="flex gap-1">
                {(['revenue','logo','nrr'] as const).map(t => (
                  <button key={t} onClick={() => setCohortToggle(t)}
                    className="text-[9px] px-2 py-0.5 rounded capitalize transition-all"
                    style={{ background: cohortToggle === t ? T.tealBg : 'transparent', color: cohortToggle === t ? T.tealLight : T.text3, border: `1px solid ${cohortToggle === t ? T.tealBorder : T.border}` }}>
                    {t === 'nrr' ? 'NRR' : t}
                  </button>
                ))}
              </div>
            </SectionHeader>
            <div className="overflow-x-auto">
              <table style={{ fontFamily: 'DM Mono, monospace', fontSize: 9 }}>
                <thead>
                  <tr>
                    <th className="text-left pr-2 pb-1 font-normal whitespace-nowrap" style={{ color: T.text3 }}>Cohort</th>
                    {COHORT_MONTHS.slice(0, 8).map((_, i) => (
                      <th key={i} className="pb-1 font-normal text-center w-8" style={{ color: T.text3 }}>M{i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COHORT.slice(0, 8).map((row, ri) => (
                    <tr key={ri}>
                      <td className="pr-2 py-0.5 whitespace-nowrap" style={{ color: T.text3 }}>{COHORT_MONTHS[ri]}</td>
                      {row.slice(0, 8).map((val, ci) => (
                        <td key={ci} className="py-0.5 px-0.5 text-center">
                          <div className="w-7 h-5 rounded flex items-center justify-center font-semibold mx-auto"
                            style={{
                              background: ci === 0 ? T.teal : `rgba(13,148,136,${(val / 100) * 0.7 + 0.05})`,
                              color: val > 55 ? '#fff' : T.text2,
                              fontSize: 8,
                            }}>
                            {val}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[9px]" style={{ color: T.text3 }}>
              <span>Low</span>
              <div className="flex h-2 flex-1 rounded overflow-hidden">
                {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1].map((o, i) => (
                  <div key={i} style={{ flex: 1, background: `rgba(13,148,136,${o})` }} />
                ))}
              </div>
              <span>100%</span>
            </div>
          </Card>
        </div>

        {/* Top workspaces */}
        <Card className="p-5">
          <SectionHeader title="Top Workspaces by Revenue">
            <button className="flex items-center gap-1 text-[10px] font-medium" style={{ color: T.tealLight }}>
              View all <ChevronRight size={11} />
            </button>
          </SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <TH>#</TH><TH>Workspace</TH><TH>Tier</TH><TH>Region</TH>
                  <TH>Revenue</TH><TH>Growth</TH><TH>Users</TH><TH>ARPU</TH><TH>Health</TH>
                </tr>
              </thead>
              <tbody>
                {WORKSPACES.map(w => (
                  <TR key={w.rank} onClick={() => {}}>
                    <TD muted mono>{w.rank}</TD>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                          style={{ background: T.tealBg, color: T.tealLight }}>
                          {w.logo}
                        </div>
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{w.name}</span>
                      </div>
                    </td>
                    <TD><TierChip tier={w.tier} /></TD>
                    <TD muted>{w.region}</TD>
                    <TD mono><span style={{ color: T.text1 }}>{formatCurrency(w.revenue, currency)}</span></TD>
                    <TD><DeltaBadge delta={w.growth} size="xs" /></TD>
                    <TD mono muted>{w.users.toLocaleString()}</TD>
                    <TD mono muted>{formatCurrency(w.arpu, currency)}</TD>
                    <TD><HealthChip health={w.health} /></TD>
                  </TR>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Activity feed (right rail) ── */}
      <div className="w-72 flex-shrink-0 hidden xl:block">
        <Card className="p-4 sticky top-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Financial Activity</span>
            <button className="text-[10px] font-medium" style={{ color: T.tealLight }}>View all</button>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            {ACTIVITY.map(item => {
              const Icon = ICON_MAP[item.icon] ?? DollarSign;
              const color = TYPE_COLOR[item.type] ?? T.text2;
              const pos = item.amount > 0;
              return (
                <div key={item.id} className="flex gap-2.5 p-2.5 rounded-lg transition-colors"
                  style={{ background: T.bg3, border: `1px solid ${T.border}` }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${color}1A` }}>
                    <Icon size={11} style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold leading-tight" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.event}</div>
                    <div className="text-[9px] mt-0.5 truncate" style={{ color: T.text3 }}>{item.detail}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px]" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>{item.time}</span>
                      <span className="text-[10px] font-semibold" style={{ color: pos ? T.success : T.error, fontFamily: 'DM Mono, monospace' }}>
                        {pos ? '+' : ''}{formatCurrency(item.amount, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
