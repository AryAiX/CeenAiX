import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Plus, Filter } from 'lucide-react';
import {
  Currency, SUB_KPI, MRR_WATERFALL, PLAN_BREAKDOWN, SUBSCRIPTIONS, FUNNEL, formatCurrency,
} from '../../data/revenueData';
import { T, Card, SectionHeader, DeltaBadge, TierChip, StatusChip, SimpleTooltip, TH, TD, TR } from './primitives';

function SubKpiCard({ label, value, delta, color, icon: Icon }: {
  label: string; value: string; delta: number; color: string; icon: React.ElementType;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}1A` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[10px]" style={{ color: T.text3 }}>{label}</span>
      </div>
      <div className="text-base font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{value}</div>
      <DeltaBadge delta={delta} size="xs" />
    </Card>
  );
}

const BAR_COLORS: Record<string, string> = {
  base: T.teal, positive: '#059669', negative: '#DC2626', total: T.cyan,
};

export function SubscriptionsTab({ currency }: { currency: Currency }) {
  const [statusFilter, setStatusFilter] = useState('All');
  const statuses = ['All', 'Active', 'Trial', 'Past due', 'Canceled', 'Paused'];

  const filtered = statusFilter === 'All'
    ? SUBSCRIPTIONS
    : SUBSCRIPTIONS.filter(s => s.status === statusFilter);

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SubKpiCard label="MRR" value={formatCurrency(SUB_KPI.mrr.value, currency)} delta={SUB_KPI.mrr.delta} color={T.teal} icon={RefreshCw} />
        <SubKpiCard label="New MRR" value={formatCurrency(SUB_KPI.newMrr.value, currency)} delta={SUB_KPI.newMrr.delta} color="#059669" icon={Plus} />
        <SubKpiCard label="Expansion MRR" value={formatCurrency(SUB_KPI.expansionMrr.value, currency)} delta={SUB_KPI.expansionMrr.delta} color={T.cyan} icon={TrendingUp} />
        <SubKpiCard label="Churned MRR" value={formatCurrency(SUB_KPI.churnedMrr.value, currency)} delta={SUB_KPI.churnedMrr.delta} color={T.error} icon={TrendingDown} />
      </div>

      {/* Waterfall + Plan breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MRR Waterfall */}
        <Card className="p-5">
          <SectionHeader title="MRR Movement" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MRR_WATERFALL} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: T.text3, fontSize: 9, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.text3, fontSize: 9, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCurrency(Math.abs(v), currency)} width={82} />
              <Tooltip content={(props: any) => <SimpleTooltip {...props} currency={currency} />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: T.text3, fontSize: 8, fontFamily: 'DM Mono, monospace', formatter: (v: number) => formatCurrency(v, currency) }}>
                {MRR_WATERFALL.map(d => (
                  <Cell key={d.label} fill={BAR_COLORS[d.type]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-3 flex-wrap">
            {Object.entries({ Base: 'base', New: 'positive', Negative: 'negative', Total: 'total' }).map(([label, type]) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px]" style={{ color: T.text3 }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BAR_COLORS[type] }} />
                {label}
              </div>
            ))}
          </div>
        </Card>

        {/* Plan Breakdown */}
        <Card className="p-5">
          <SectionHeader title="Plan Breakdown" />
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <TH>Plan</TH><TH>Active</TH><TH>MRR</TH><TH>% Total</TH><TH>Avg Length</TH><TH>Churn</TH>
              </tr>
            </thead>
            <tbody>
              {PLAN_BREAKDOWN.map(p => (
                <TR key={p.plan}>
                  <TD><TierChip tier={p.tier} /></TD>
                  <TD mono><span style={{ color: T.text1 }}>{p.active}</span></TD>
                  <TD mono><span style={{ color: T.text1 }}>{formatCurrency(p.mrr, currency)}</span></TD>
                  <TD mono muted>{p.pct}%</TD>
                  <TD mono muted>{p.avgLen}mo</TD>
                  <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: p.churn > 10 ? T.error : p.churn > 5 ? T.warning : T.success, fontFamily: 'DM Mono, monospace' }}>
                    {p.churn}%
                  </td>
                </TR>
              ))}
            </tbody>
          </table>

          {/* Trial conversion funnel */}
          <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <div className="text-xs font-semibold mb-3" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Trial Conversion Funnel</div>
            {FUNNEL.map((f, i) => (
              <div key={f.stage} className="mb-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span style={{ color: T.text2 }}>{f.stage}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: T.text1, fontFamily: 'DM Mono, monospace' }}>{f.count.toLocaleString()}</span>
                    <DeltaBadge delta={f.delta} size="xs" />
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: T.bg2 }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${f.pct}%`, background: i === 0 ? T.teal : i === 1 ? T.cyan : i === 2 ? '#059669' : T.success }} />
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>{f.pct}%</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Subscription list */}
      <Card className="p-5">
        <SectionHeader title="Subscriptions">
          <div className="flex items-center gap-2 flex-wrap">
            {statuses.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="text-[10px] px-2.5 py-1 rounded-lg transition-all"
                style={statusFilter === s
                  ? { background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }
                  : { background: T.bg2, color: T.text3, border: `1px solid ${T.border}` }
                }>
                {s}
              </button>
            ))}
            <button className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: T.bg2, color: T.text2, border: `1px solid ${T.border}` }}>
              <Filter size={10} /> More filters
            </button>
          </div>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <TH>Workspace</TH><TH>Plan</TH><TH>Status</TH><TH>MRR</TH>
                <TH>Cycle</TH><TH>Next Renewal</TH><TH>Started</TH><TH>LTV</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <TR key={s.id} onClick={() => {}}>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: T.tealBg, color: T.tealLight }}>{s.logo}</div>
                      <span className="text-xs" style={{ color: T.text1 }}>{s.workspace}</span>
                    </div>
                  </td>
                  <TD><TierChip tier={s.plan} /></TD>
                  <TD><StatusChip status={s.status} /></TD>
                  <TD mono><span style={{ color: T.text1 }}>{formatCurrency(s.mrr, currency)}</span></TD>
                  <TD muted>{s.cycle}</TD>
                  <TD mono muted>{s.renewal}</TD>
                  <TD mono muted>{s.started}</TD>
                  <TD mono><span style={{ color: T.tealLight }}>{formatCurrency(s.ltv, currency)}</span></TD>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 text-[10px]" style={{ borderTop: `1px solid ${T.border}`, color: T.text3 }}>
          <span>Showing {filtered.length} of {SUBSCRIPTIONS.length} subscriptions</span>
          <div className="flex gap-1">
            {['←','1','2','3','→'].map(p => (
              <button key={p} className="w-6 h-6 rounded flex items-center justify-center"
                style={{ background: p === '1' ? T.tealBg : T.bg2, color: p === '1' ? T.tealLight : T.text3, border: `1px solid ${p === '1' ? T.tealBorder : T.border}`, fontSize: 10 }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
