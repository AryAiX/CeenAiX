import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { SHAFAFIYA_STATUS } from '../../data/dhaComplianceData';
import { D, Card, SectionHeader, StatusDot, TH, TD, TR } from './DhaCompliancePrimitives';

export function ShafafiyaTab() {
  const s = SHAFAFIYA_STATUS;
  const belowTarget = s.codingComplianceRate < 95;

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {belowTarget && (
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: D.warningBg, border: `1px solid ${D.warningBorder}` }}>
          <AlertTriangle size={14} style={{ color: D.warningLight, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: D.warningLight }}>ICD-10 coding compliance below 95% target</div>
            <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>
              Current rate {s.codingComplianceRate}% — uncorrected coding errors are the leading rejection driver. Assign clinical coding review.
            </div>
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '24h Volume', value: s.volume24h.toLocaleString(), sub: 'Claims submitted', color: D.text1 },
          { label: 'Acceptance Rate', value: `${s.successRate24h}%`, sub: 'Last 24h', color: s.successRate24h >= 98 ? D.successLight : D.warningLight },
          { label: 'Avg Turnaround', value: `${s.avgTurnaroundDays}d`, sub: 'End-to-end', color: D.blueLight },
          { label: 'Coding Compliance', value: `${s.codingComplianceRate}%`, sub: 'ICD-10 accuracy', color: belowTarget ? D.warningLight : D.successLight },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <div className="text-[10px] mb-1" style={{ color: D.text3 }}>{k.label}</div>
            <div className="text-xl font-bold mb-0.5" style={{ color: k.color, fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
            <div className="text-[10px]" style={{ color: D.text3 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Payer performance */}
      <Card className="p-5">
        <SectionHeader title="Payer Performance (24h)" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: D.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                <TH>Payer</TH>
                <TH>Submitted</TH>
                <TH>Accepted</TH>
                <TH>Rejected</TH>
                <TH>Acceptance Rate</TH>
                <TH>Avg Payment</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {s.payers.map(p => (
                <TR key={p.name} highlight={p.acceptanceRate < 96}>
                  <TD>
                    <div className="text-xs font-semibold" style={{ color: D.text1 }}>{p.name}</div>
                  </TD>
                  <TD mono>{p.submitted}</TD>
                  <TD>
                    <span style={{ color: D.successLight, fontFamily: 'DM Mono, monospace' }}>{p.accepted}</span>
                  </TD>
                  <TD>
                    <span style={{ color: p.rejected > 30 ? D.errorLight : D.warningLight, fontFamily: 'DM Mono, monospace' }}>{p.rejected}</span>
                  </TD>
                  <TD>
                    <span style={{ color: p.acceptanceRate >= 98 ? D.successLight : p.acceptanceRate >= 96 ? D.warningLight : D.errorLight, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>
                      {p.acceptanceRate}%
                    </span>
                  </TD>
                  <TD mono>{p.avgPaymentDays}d</TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <StatusDot ok={p.acceptanceRate >= 97} />
                      <span style={{ color: p.acceptanceRate >= 97 ? D.successLight : D.warningLight }}>
                        {p.acceptanceRate >= 97 ? 'Good' : 'Watch'}
                      </span>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rejection breakdown */}
        <Card className="p-5">
          <SectionHeader title="Top Rejection Reasons (24h)" />
          <div className="space-y-3">
            {s.topRejectionReasons.map((r, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span style={{ color: D.text2 }}>{r.reason}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: D.text3 }}>{r.pct}%</span>
                    <span style={{ color: D.errorLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{r.count}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: D.error }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* eClaim connectivity */}
        <Card className="p-5">
          <SectionHeader title="eClaim Link Status" />
          <div className="space-y-2 text-[10px]">
            {[
              { label: 'Connection status', value: 'Connected', color: D.successLight, dot: true },
              { label: 'Certificate expiry', value: s.certExpiry, color: D.successLight },
              { label: 'Pre-auth SLA (target 4h)', value: '3.2h avg', color: D.successLight },
              { label: 'Open pre-auth requests', value: '18', color: D.text2 },
              { label: 'Overdue pre-auth (>4h)', value: '2', color: D.warningLight },
              { label: 'DRG version', value: 'AE-DRG v1.1', color: D.text2 },
              { label: 'HAAD/DHA coding standard', value: 'ICD-10-AM 11th Ed.', color: D.text2 },
            ].map(f => (
              <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                <div className="flex items-center gap-1.5">
                  {f.dot && <StatusDot ok pulse />}
                  <span style={{ color: D.text3 }}>{f.label}</span>
                </div>
                <span style={{ color: f.color, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${D.border}` }}>
            <div className="text-[10px] font-semibold mb-2" style={{ color: D.text2 }}>Coding trend (7d)</div>
            <div className="space-y-1.5">
              {[
                { label: 'ICD-10 auto-assigned', pct: 87.2, color: D.teal },
                { label: 'Manually coded', pct: 7.0, color: D.blueLight },
                { label: 'Coding errors (corrected)', pct: 5.8, color: D.warningLight },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-2 text-[10px]">
                  <span className="w-28 flex-shrink-0" style={{ color: D.text3 }}>{c.label}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                  </div>
                  <span className="w-10 text-right" style={{ color: D.text2, fontFamily: 'DM Mono, monospace' }}>{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
