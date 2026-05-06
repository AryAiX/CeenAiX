import { BarChart2, CheckCircle, Clock, AlertTriangle, DollarSign, ExternalLink } from 'lucide-react';
import { Currency, INS_KPI, TPA, REJECTION_REASONS, ECLAIM_HEALTH, formatCurrency, formatNum } from '../../data/revenueData';
import { T, Card, SectionHeader, DeltaBadge, TH, TD, TR } from './primitives';

const AGING = [
  { label: '0–30 days',  value: 480000, color: T.teal    },
  { label: '31–60 days', value: 340000, color: '#D97706' },
  { label: '61–90 days', value: 280000, color: '#EF4444' },
  { label: '90+ days',   value: 184000, color: '#7F1D1D' },
];
const TOTAL_AGING = AGING.reduce((s, a) => s + a.value, 0);

export function InsuranceTab({ currency }: { currency: Currency }) {
  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Claims Submitted', display: formatNum(INS_KPI.submitted.value), delta: INS_KPI.submitted.delta, color: T.blue,    icon: BarChart2   },
          { label: 'Claims Paid',      display: formatCurrency(INS_KPI.paid.money, currency), delta: INS_KPI.paid.delta, color: T.success, icon: CheckCircle },
          { label: 'Avg Days to Pay',  display: `${INS_KPI.avgDays.value}d`,        delta: INS_KPI.avgDays.delta,     color: T.cyan,    icon: Clock       },
          { label: 'Rejection Rate',   display: `${INS_KPI.rejection.value}%`,      delta: INS_KPI.rejection.delta,   color: T.error,   icon: AlertTriangle },
          { label: 'Outstanding',      display: formatCurrency(INS_KPI.outstanding.value, currency), delta: INS_KPI.outstanding.delta, color: T.warning, icon: DollarSign },
        ].map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${k.color}1A` }}>
                  <Icon size={14} style={{ color: k.color }} />
                </div>
                <span className="text-[10px]" style={{ color: T.text3 }}>{k.label}</span>
              </div>
              <div className="text-base font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{k.display}</div>
              <DeltaBadge delta={k.delta} size="xs" />
            </Card>
          );
        })}
      </div>

      {/* TPA breakdown */}
      <Card className="p-5">
        <SectionHeader title="TPA / Insurer Breakdown" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <TH>Payer</TH><TH>Submitted</TH><TH>Paid</TH><TH>Rejected</TH><TH>Pending</TH>
                <TH>Avg Days</TH><TH>Rej. Rate</TH><TH>Total Paid</TH><TH>Outstanding</TH>
              </tr>
            </thead>
            <tbody>
              {TPA.map(t => (
                <TR key={t.name} onClick={() => {}}>
                  <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t.name}</td>
                  <TD mono muted>{formatNum(t.sub)}</TD>
                  <TD mono><span style={{ color: T.success }}>{formatNum(t.paid)}</span></TD>
                  <TD mono><span style={{ color: T.error }}>{formatNum(t.rej)}</span></TD>
                  <TD mono><span style={{ color: T.warning }}>{formatNum(t.pend)}</span></TD>
                  <TD mono muted>{t.days}d</TD>
                  <td className="py-2.5 pr-4 text-xs font-semibold" style={{ fontFamily: 'DM Mono, monospace', color: t.rejRate > 15 ? T.error : t.rejRate > 8 ? T.warning : T.success }}>
                    {t.rejRate}%
                  </td>
                  <TD mono><span style={{ color: T.text1 }}>{formatCurrency(t.total, currency)}</span></TD>
                  <TD mono><span style={{ color: T.warning }}>{formatCurrency(t.outstanding, currency)}</span></TD>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Rejection reasons + aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionHeader title="Top Rejection Reasons" />
          <div className="space-y-2.5">
            {REJECTION_REASONS.map(r => (
              <div key={r.reason} className="flex items-center gap-3">
                <div className="text-[10px] w-52 truncate flex-shrink-0" style={{ color: T.text2 }}>{r.reason}</div>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: T.bg2 }}>
                  <div className="h-full rounded-full" style={{
                    width: `${r.pct}%`,
                    background: r.pct > 30 ? T.error : r.pct > 15 ? T.warning : T.teal,
                  }} />
                </div>
                <div className="text-[10px] w-8 text-right" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>{r.count}</div>
                <div className="text-[10px] w-8 text-right" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>{r.pct}%</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          {/* Claims aging */}
          <Card className="p-5">
            <SectionHeader title="Claims Aging" />
            <div className="flex h-3 rounded-full overflow-hidden mb-3 gap-px">
              {AGING.map(a => (
                <div key={a.label} style={{ flex: a.value, background: a.color }} title={a.label} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {AGING.map(a => (
                <div key={a.label} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2 h-2 rounded-sm" style={{ background: a.color }} />
                  <span style={{ color: T.text3 }}>{a.label}</span>
                  <span style={{ color: T.text1, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(a.value, currency)}</span>
                  <span style={{ color: T.text3 }}>{((a.value / TOTAL_AGING) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* eClaim Link health */}
          <Card className="p-5">
            <SectionHeader title="eClaim Link Health">
              <button className="flex items-center gap-1 text-[10px] font-medium" style={{ color: T.tealLight }}>
                View integrations <ExternalLink size={10} />
              </button>
            </SectionHeader>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: T.text3 }}>Submission success rate (7d)</span>
                <span className="font-semibold" style={{ color: T.success, fontFamily: 'DM Mono, monospace' }}>{ECLAIM_HEALTH.successRate}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: T.bg2 }}>
                <div className="h-full rounded-full" style={{ width: `${ECLAIM_HEALTH.successRate}%`, background: T.success }} />
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span style={{ color: T.text3 }}>Avg submission latency</span>
                <span style={{ color: T.text1, fontFamily: 'DM Mono, monospace' }}>{ECLAIM_HEALTH.avgLatency}</span>
              </div>
              <div className="p-2.5 rounded-lg text-[10px]" style={{ background: T.errorBg, border: `1px solid rgba(239,68,68,0.2)` }}>
                <span style={{ color: T.text3 }}>Last error: </span>
                <span style={{ color: T.error }}>{ECLAIM_HEALTH.lastError}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
