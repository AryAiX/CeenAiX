import { useState } from 'react';
import { Search, Filter, Copy, Eye, EyeOff, XCircle, Activity } from 'lucide-react';
import { Currency, TRANSACTIONS, formatCurrency } from '../../data/revenueData';
import { T, Card, SectionHeader, StatusChip, TH, TD, TR, FilterBtn } from './primitives';

function RiskBar({ score }: { score: number }) {
  const color = score < 30 ? T.success : score < 60 ? T.warning : T.error;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: T.bg2 }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[10px] font-semibold" style={{ color, fontFamily: 'DM Mono, monospace' }}>{score}</span>
    </div>
  );
}

function TxDetailPanel({ tx, currency, onClose }: { tx: typeof TRANSACTIONS[0]; currency: Currency; onClose: () => void }) {
  const [showPhi, setShowPhi] = useState(false);
  const rows = [
    { label: 'Transaction ID', value: <span className="flex items-center gap-1">
        <span style={{ color: T.tealLight, fontFamily: 'DM Mono, monospace' }}>{tx.id}</span>
        <button style={{ color: T.text3 }}><Copy size={10} /></button>
      </span> },
    { label: 'Status',         value: <StatusChip status={tx.status} /> },
    { label: 'Type',           value: <span style={{ color: T.text1 }}>{tx.type}</span> },
    { label: 'Amount',         value: <span style={{ color: T.text1, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(tx.amount, currency)}</span> },
    { label: 'Net Amount',     value: <span style={{ color: T.success, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(tx.net, currency)}</span> },
    { label: 'Platform Fee',   value: <span style={{ color: T.error, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(tx.amount - tx.net, currency)}</span> },
    { label: 'Workspace',      value: <span style={{ color: T.text1 }}>{tx.workspace}</span> },
    { label: 'Payment Method', value: <span style={{ color: T.text2, fontFamily: 'DM Mono, monospace' }}>{tx.method}</span> },
    { label: 'Created',        value: <span style={{ color: T.text2, fontFamily: 'DM Mono, monospace' }}>{tx.ts}</span> },
  ];

  return (
    <Card className="p-4 sticky top-4" style={{ width: 300, flexShrink: 0 }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Transaction Details</span>
        <button onClick={onClose} style={{ color: T.text3 }}><XCircle size={15} /></button>
      </div>
      <div className="space-y-2.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between gap-3 text-xs">
            <span style={{ color: T.text3, flexShrink: 0 }}>{r.label}</span>
            {r.value}
          </div>
        ))}
        {/* PHI row */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <span style={{ color: T.text3, flexShrink: 0 }}>Customer (PHI)</span>
          <div className="flex items-center gap-1.5">
            <span style={{ color: T.text2, fontFamily: 'DM Mono, monospace' }}>
              {showPhi ? 'Ahmed Al Rashidi' : '•••••••'}
            </span>
            <button onClick={() => setShowPhi(v => !v)} style={{ color: T.text3 }}>
              {showPhi ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          </div>
        </div>
        {/* Risk */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <span style={{ color: T.text3 }}>Risk Score</span>
          <RiskBar score={tx.risk} />
        </div>
      </div>

      {/* State timeline */}
      <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
        <div className="text-[10px] font-semibold mb-2" style={{ color: T.text2 }}>Timeline</div>
        {[
          { ts: tx.ts, event: 'Transaction created', color: T.teal },
          { ts: tx.ts, event: 'Payment authorized',  color: T.success },
          { ts: tx.ts, event: 'Settled',             color: T.success },
        ].map((t, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full mt-0.5" style={{ background: t.color }} />
              {i < 2 && <div className="w-px flex-1 mt-1" style={{ background: T.border }} />}
            </div>
            <div className="pb-2">
              <div className="text-[10px]" style={{ color: T.text1 }}>{t.event}</div>
              <div className="text-[9px]" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>{t.ts}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 mt-2 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
        <button className="w-full text-[11px] py-2 rounded-lg font-medium"
          style={{ background: T.errorBg, color: T.error, border: `1px solid rgba(239,68,68,0.2)` }}>
          Issue Refund
        </button>
        <button className="w-full text-[11px] py-2 rounded-lg font-medium"
          style={{ background: T.bg2, color: T.text2, border: `1px solid ${T.border}` }}>
          Download Receipt
        </button>
      </div>
    </Card>
  );
}

export function TransactionsTab({ currency }: { currency: Currency }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof TRANSACTIONS[0] | null>(null);
  const [live, setLive] = useState(false);
  const [typeFilter, setTypeFilter] = useState('All');

  const types = ['All','Consultation','Lab test','Pharmacy','Subscription','Insurance fee','Imaging'];

  const filtered = TRANSACTIONS.filter(t => {
    const matchSearch = !search || t.id.toLowerCase().includes(search.toLowerCase()) || t.workspace.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'All' || t.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="flex gap-4 min-w-0">
      <div className="flex-1 min-w-0">
        <Card className="p-5">
          <SectionHeader title="Transactions">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Live toggle */}
              <button onClick={() => setLive(v => !v)}
                className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-medium transition-all"
                style={live
                  ? { background: T.successBg, color: T.success, border: `1px solid rgba(52,211,153,0.25)` }
                  : { background: T.bg2, color: T.text3, border: `1px solid ${T.border}` }}>
                <Activity size={10} className={live ? 'animate-pulse' : ''} />
                {live ? 'Live' : 'Live tail'}
              </button>
              {/* Search */}
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.text3 }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search transactions…"
                  className="pl-7 pr-3 h-7 rounded-lg text-[11px] outline-none w-44"
                  style={{ background: T.bg2, border: `1px solid ${T.border}`, color: T.text1, fontFamily: 'DM Mono, monospace' }}
                />
              </div>
              <FilterBtn><Filter size={11} /> Filter</FilterBtn>
            </div>
          </SectionHeader>

          {/* Type filter pills */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {types.map(tp => (
              <button key={tp} onClick={() => setTypeFilter(tp)}
                className="text-[10px] px-2.5 py-1 rounded-lg whitespace-nowrap transition-all flex-shrink-0"
                style={typeFilter === tp
                  ? { background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }
                  : { background: T.bg2, color: T.text3, border: `1px solid ${T.border}` }}>
                {tp}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <TH>Tx ID</TH><TH>Created</TH><TH>Type</TH><TH>Workspace</TH>
                  <TH>Amount</TH><TH>Net</TH><TH>Method</TH><TH>Status</TH><TH>Risk</TH>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <TR key={t.id} onClick={() => setSelected(t)}>
                    <td className="py-2.5 pr-4">
                      <button className="text-[11px] hover:underline" style={{ color: T.tealLight, fontFamily: 'DM Mono, monospace' }}>{t.id}</button>
                    </td>
                    <TD mono muted>{t.ts.split(' · ')[0]}</TD>
                    <TD>{t.type}</TD>
                    <td className="py-2.5 pr-4 text-xs" style={{ color: T.text1, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.workspace}</td>
                    <TD mono><span style={{ color: T.text1 }}>{formatCurrency(t.amount, currency)}</span></TD>
                    <TD mono muted>{formatCurrency(t.net, currency)}</TD>
                    <TD mono muted>{t.method}</TD>
                    <TD><StatusChip status={t.status} /></TD>
                    <td className="py-2.5 pr-4"><RiskBar score={t.risk} /></td>
                  </TR>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 text-[10px]" style={{ borderTop: `1px solid ${T.border}`, color: T.text3 }}>
            <span>{filtered.length} transactions</span>
            <div className="flex gap-1">
              {['←','1','2','3','4','→'].map(p => (
                <button key={p} className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ background: p === '1' ? T.tealBg : T.bg2, color: p === '1' ? T.tealLight : T.text3, border: `1px solid ${p === '1' ? T.tealBorder : T.border}`, fontSize: 10 }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {selected && (
        <TxDetailPanel tx={selected} currency={currency} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
