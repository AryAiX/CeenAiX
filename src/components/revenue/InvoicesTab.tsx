import { FileText, AlertCircle, CheckCircle, Clock, Filter, Send, Download } from 'lucide-react';
import { Currency, INVOICES, KPI, formatCurrency } from '../../data/revenueData';
import { T, Card, SectionHeader, StatusChip, TH, TD, TR } from './primitives';

const AGING = [
  { label: '0–30 days',  value: 412000, count: 28, color: T.teal    },
  { label: '31–60 days', value: 228000, count: 14, color: '#D97706' },
  { label: '61–90 days', value: 164000, count: 8,  color: '#EF4444' },
  { label: '90+ days',   value: 88400,  count: 4,  color: '#7F1D1D' },
];
const TOTAL_AGING = AGING.reduce((s, a) => s + a.value, 0);

const DUNNING = [
  { name: 'Sequence A — Standard',       active: 12, opens: 68, clicks: 24, step: 'Step 2/4' },
  { name: 'Sequence B — Enterprise',     active: 4,  opens: 82, clicks: 41, step: 'Step 1/3' },
  { name: 'Sequence C — Final reminder', active: 3,  opens: 44, clicks: 12, step: 'Step 3/3' },
];

export function InvoicesTab({ currency }: { currency: Currency }) {
  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Outstanding', value: formatCurrency(KPI.receivables.total, currency), icon: FileText, color: T.teal },
          { label: 'Overdue >30d', value: formatCurrency(480400, currency), icon: AlertCircle, color: T.error },
          { label: 'Collected (Period)', value: formatCurrency(3_284_000, currency), icon: CheckCircle, color: '#059669' },
          { label: 'Avg Days to Pay', value: '14.2 days', icon: Clock, color: T.cyan },
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
              <div className="text-base font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{k.value}</div>
            </Card>
          );
        })}
      </div>

      {/* Aging */}
      <Card className="p-5">
        <SectionHeader title="Accounts Receivable Aging" />
        <div className="flex h-3 rounded-full overflow-hidden mb-3 gap-px">
          {AGING.map(a => (
            <div key={a.label} style={{ flex: a.value, background: a.color }} title={`${a.label}: ${formatCurrency(a.value, currency)}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {AGING.map(a => (
            <div key={a.label} className="flex items-center gap-2 text-[10px]">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: a.color }} />
              <span style={{ color: T.text3 }}>{a.label}</span>
              <span style={{ color: T.text1, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(a.value, currency)}</span>
              <span style={{ color: T.text3 }}>({a.count} inv.)</span>
              <span style={{ color: T.text3 }}>{((a.value / TOTAL_AGING) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Invoice list */}
      <Card className="p-5">
        <SectionHeader title="Invoice List">
          <button className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg"
            style={{ background: T.bg2, color: T.text2, border: `1px solid ${T.border}` }}>
            <Filter size={11} /> Filter
          </button>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <TH>Invoice #</TH><TH>Issued</TH><TH>Due</TH><TH>Customer</TH>
                <TH>Amount</TH><TH>Balance</TH><TH>Status</TH><TH>Last Action</TH>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map(inv => (
                <TR key={inv.id} onClick={() => {}} highlight={inv.status === 'Overdue'}>
                  <td className="py-2.5 pr-4">
                    <span className="text-[11px]" style={{ color: T.tealLight, fontFamily: 'DM Mono, monospace' }}>{inv.id}</span>
                  </td>
                  <TD mono muted>{inv.issued}</TD>
                  <td className="py-2.5 pr-4 text-xs" style={{ color: inv.status === 'Overdue' ? T.error : T.text3, fontFamily: 'DM Mono, monospace' }}>{inv.due}</td>
                  <td className="py-2.5 pr-4 text-xs max-w-[140px] truncate" style={{ color: T.text1 }}>{inv.customer}</td>
                  <TD mono><span style={{ color: T.text1 }}>{formatCurrency(inv.amount, currency)}</span></TD>
                  <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: inv.balance > 0 ? T.error : T.success, fontFamily: 'DM Mono, monospace' }}>
                    {formatCurrency(inv.balance, currency)}
                  </td>
                  <TD><StatusChip status={inv.status} /></TD>
                  <TD muted>{inv.lastAction}</TD>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dunning campaigns */}
      <Card className="p-5">
        <SectionHeader title="Dunning Campaigns">
          <button className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-medium"
            style={{ background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }}>
            Configure dunning
          </button>
        </SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DUNNING.map(d => (
            <div key={d.name} className="p-3 rounded-xl" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs font-medium" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{d.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: T.text3 }}>{d.active} active · {d.step}</div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: T.successBg, color: T.success }}>Active</span>
              </div>
              <div className="flex gap-3">
                {[{ label: 'Opens', value: d.opens, icon: Send }, { label: 'Clicks', value: d.clicks, icon: Download }].map(m => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="flex-1 text-center p-2 rounded-lg" style={{ background: T.bg1 }}>
                      <div className="text-base font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{m.value}%</div>
                      <div className="text-[9px] flex items-center justify-center gap-1" style={{ color: T.text3 }}>
                        <Icon size={9} /> {m.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
