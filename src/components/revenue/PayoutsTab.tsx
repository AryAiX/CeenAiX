import { Send, Clock, CheckCircle, AlertCircle, XCircle, Download } from 'lucide-react';
import { Currency, PAYOUT_KPI, PAYOUTS, formatCurrency } from '../../data/revenueData';
import { T, Card, SectionHeader, StatusChip, TH, TD, TR } from './primitives';

export function PayoutsTab({ currency }: { currency: Currency }) {
  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Payouts',  value: PAYOUT_KPI.pending.value,   count: PAYOUT_KPI.pending.count,   color: T.warning,  icon: Clock       },
          { label: 'In Transit',       value: PAYOUT_KPI.inTransit.value,  count: PAYOUT_KPI.inTransit.count,  color: T.blue,     icon: Send        },
          { label: 'Paid (Period)',     value: PAYOUT_KPI.paid.value,       count: PAYOUT_KPI.paid.count,       color: T.success,  icon: CheckCircle },
          { label: 'Failed Payouts',   value: PAYOUT_KPI.failed.value,     count: PAYOUT_KPI.failed.count,     color: T.error,    icon: AlertCircle },
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
              <div className="text-base font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{formatCurrency(k.value, currency)}</div>
              <div className="text-[10px] mt-1" style={{ color: k.color, fontFamily: 'DM Mono, monospace' }}>{k.count} payouts</div>
            </Card>
          );
        })}
      </div>

      {/* Upcoming payouts calendar strip */}
      <Card className="p-5">
        <SectionHeader title="Upcoming Payout Schedule">
          <div className="flex gap-1">
            {['List', 'Calendar'].map(v => (
              <button key={v} className="text-[10px] px-2.5 py-1 rounded-lg"
                style={v === 'List' ? { background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }
                  : { background: T.bg2, color: T.text3, border: `1px solid ${T.border}` }}>
                {v}
              </button>
            ))}
          </div>
        </SectionHeader>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 7 }, (_, i) => {
            const day = i + 8;
            const amount = [48200, 0, 62400, 0, 28800, 0, 94200][i];
            return (
              <div key={i} className="flex-shrink-0 flex flex-col items-center p-3 rounded-xl w-20"
                style={{ background: amount > 0 ? T.tealBg : T.bg2, border: `1px solid ${amount > 0 ? T.tealBorder : T.border}` }}>
                <div className="text-[9px] mb-1" style={{ color: T.text3 }}>Apr</div>
                <div className="text-lg font-bold" style={{ color: amount > 0 ? T.tealLight : T.text3, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{day}</div>
                {amount > 0 && (
                  <div className="text-[9px] mt-1 text-center font-semibold" style={{ color: T.teal, fontFamily: 'DM Mono, monospace' }}>
                    {formatCurrency(amount, currency)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Payout list */}
      <Card className="p-5">
        <SectionHeader title="Payout History" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <TH>Payout ID</TH><TH>Workspace</TH><TH>Bank</TH><TH>Amount</TH>
                <TH>Status</TH><TH>Initiated</TH><TH>Expected Arrival</TH><TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {PAYOUTS.map(p => (
                <TR key={p.id} onClick={() => {}}>
                  <td className="py-2.5 pr-4">
                    <span className="text-[11px]" style={{ color: T.tealLight, fontFamily: 'DM Mono, monospace' }}>{p.id}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs max-w-[140px] truncate" style={{ color: T.text1 }}>{p.workspace}</td>
                  <TD mono muted>{p.bank}</TD>
                  <TD mono><span style={{ color: T.text1 }}>{formatCurrency(p.amount, currency)}</span></TD>
                  <TD><StatusChip status={p.status} /></TD>
                  <TD mono muted>{p.initiated}</TD>
                  <TD mono muted>{p.arrival}</TD>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: T.tealBg, color: T.tealLight }}>Statement</button>
                      {p.status === 'Failed' && (
                        <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: T.errorBg, color: T.error }}>Retry</button>
                      )}
                      <button style={{ color: T.text3 }}><Download size={11} /></button>
                    </div>
                  </td>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
