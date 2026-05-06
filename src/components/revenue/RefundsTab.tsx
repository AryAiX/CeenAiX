import { RotateCcw, Percent, DollarSign, AlertCircle, Shield } from 'lucide-react';
import { Currency, REFUND_KPI, REFUNDS, DISPUTE_KPI, DISPUTES, formatCurrency, formatNum } from '../../data/revenueData';
import { T, Card, SectionHeader, StatusChip, DeltaBadge, TH, TD, TR } from './primitives';

export function RefundsTab({ currency }: { currency: Currency }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Refund KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Refunded',   display: formatCurrency(REFUND_KPI.total.value, currency), delta: REFUND_KPI.total.delta, color: T.error,   icon: RotateCcw   },
          { label: 'Refund Rate',      display: `${REFUND_KPI.rate.value}%`,                      delta: REFUND_KPI.rate.delta,  color: T.warning, icon: Percent     },
          { label: 'Avg Refund',       display: formatCurrency(REFUND_KPI.avg.value, currency),   delta: REFUND_KPI.avg.delta,   color: T.text2,   icon: DollarSign  },
          { label: 'Open Disputes',    display: formatNum(DISPUTE_KPI.open),                      delta: null,                   color: T.error,   icon: AlertCircle, sub: `${formatCurrency(DISPUTE_KPI.atRisk, currency)} at risk` },
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
              {k.delta !== null ? <DeltaBadge delta={k.delta!} size="xs" /> : null}
              {k.sub && <div className="text-[9px] mt-1" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>{k.sub}</div>}
            </Card>
          );
        })}
      </div>

      {/* Refunds list */}
      <Card className="p-5">
        <SectionHeader title="Refunds" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <TH>Refund ID</TH><TH>Original Tx</TH><TH>Workspace</TH><TH>Amount</TH>
                <TH>Reason</TH><TH>Initiated By</TH><TH>Status</TH><TH>Created</TH>
              </tr>
            </thead>
            <tbody>
              {REFUNDS.map(r => (
                <TR key={r.id} onClick={() => {}}>
                  <td className="py-2.5 pr-4">
                    <span className="text-[11px]" style={{ color: T.tealLight, fontFamily: 'DM Mono, monospace' }}>{r.id}</span>
                  </td>
                  <TD mono muted>{r.transaction}</TD>
                  <td className="py-2.5 pr-4 text-xs max-w-[120px] truncate" style={{ color: T.text1 }}>{r.workspace}</td>
                  <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: T.error, fontFamily: 'DM Mono, monospace' }}>
                    {formatCurrency(r.amount, currency)}
                  </td>
                  <TD muted>{r.reason}</TD>
                  <TD muted>{r.by}</TD>
                  <TD><StatusChip status={r.status} /></TD>
                  <TD mono muted>{r.created}</TD>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dispute KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Open Disputes',   val: DISPUTE_KPI.open,    color: T.warning },
          { label: 'Lost Disputes',   val: DISPUTE_KPI.lost,    color: T.error   },
          { label: 'Won Disputes',    val: DISPUTE_KPI.won,     color: T.success },
          { label: 'Dispute Rate',    val: `${DISPUTE_KPI.rate}%`, color: T.text2 },
          { label: 'Total at Risk',   val: formatCurrency(DISPUTE_KPI.atRisk, currency), color: T.error },
        ].map(k => (
          <Card key={k.label} className="p-3 text-center">
            <div className="text-xs font-bold" style={{ color: k.color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{k.val}</div>
            <div className="text-[9px] mt-0.5" style={{ color: T.text3 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Disputes list */}
      <Card className="p-5">
        <SectionHeader title="Disputes & Chargebacks">
          <div className="flex items-center gap-2 text-[10px]" style={{ color: T.text3 }}>
            <Shield size={11} style={{ color: T.warning }} />
            <span>{DISPUTE_KPI.open} open · evidence required</span>
          </div>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <TH>Dispute ID</TH><TH>Transaction</TH><TH>Workspace</TH><TH>Amount</TH>
                <TH>Reason</TH><TH>Stage</TH><TH>Evidence Due</TH><TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {DISPUTES.map(d => (
                <TR key={d.id} onClick={() => {}}>
                  <td className="py-2.5 pr-4">
                    <span className="text-[11px]" style={{ color: T.tealLight, fontFamily: 'DM Mono, monospace' }}>{d.id}</span>
                  </td>
                  <TD mono muted>{d.transaction}</TD>
                  <td className="py-2.5 pr-4 text-xs max-w-[120px] truncate" style={{ color: T.text1 }}>{d.workspace}</td>
                  <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: T.error, fontFamily: 'DM Mono, monospace' }}>
                    {formatCurrency(d.amount, currency)}
                  </td>
                  <TD muted>{d.reason}</TD>
                  <td className="py-2.5 pr-4">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: T.warningBg, color: T.warning }}>
                      {d.stage}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: T.warning, fontFamily: 'DM Mono, monospace' }}>{d.evidenceDue}</td>
                  <TD><StatusChip status={d.status} /></TD>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
