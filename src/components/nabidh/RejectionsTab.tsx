import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { REJECTION_ERRORS } from '../../data/nabidhData';
import { N, Card, SectionHeader, SeverityChip, TH, TD, TR } from './NabidhPrimitives';

const totalRejections = REJECTION_ERRORS.reduce((s, e) => s + e.count, 0);

export function RejectionsTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <Card className="p-5">
        <SectionHeader title="Rejection Distribution (24h)" />
        <div className="flex h-4 rounded-full overflow-hidden mb-3 gap-px">
          {REJECTION_ERRORS.map(e => (
            <div key={e.id} title={`${e.code}: ${e.count}`}
              style={{
                flex: e.count,
                background: e.severity === 'Critical' ? '#DC2626' : e.severity === 'High' ? '#F97316' : e.severity === 'Medium' ? N.warning : N.teal,
              }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {REJECTION_ERRORS.map(e => (
            <div key={e.id} className="flex items-center gap-1.5 text-[10px]">
              <span className="w-2 h-2 rounded-sm" style={{
                background: e.severity === 'Critical' ? '#DC2626' : e.severity === 'High' ? '#F97316' : e.severity === 'Medium' ? N.warning : N.teal,
              }} />
              <span style={{ color: N.text3 }}>{e.code}</span>
              <span style={{ color: N.text1, fontFamily: 'DM Mono, monospace' }}>{e.count}</span>
              <span style={{ color: N.text3 }}>({e.pct}%)</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Error list */}
      <Card className="p-5">
        <SectionHeader title={`Error Codes (${totalRejections} rejections)`}>
          <div className="text-[10px] px-2.5 py-1 rounded-lg" style={{ background: N.errorBg, color: N.errorLight, border: `1px solid rgba(220,38,38,0.2)` }}>
            <AlertTriangle size={9} className="inline mr-1" />
            3 Critical · Evidence required
          </div>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${N.border}` }}>
                <TH>Error Code</TH><TH>Message</TH><TH>Severity</TH><TH>Count</TH>
                <TH>%</TH><TH>Workspaces</TH><TH>Auto-Resolve</TH><TH>Last Seen</TH><TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {REJECTION_ERRORS.map(e => (
                <TR key={e.id} highlight={e.severity === 'Critical'}>
                  <td className="py-2.5 pr-4">
                    <span className="text-[11px]" style={{ color: N.tealLight, fontFamily: 'DM Mono, monospace' }}>{e.code}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs max-w-[220px]" style={{ color: N.text1 }}>{e.message}</td>
                  <TD><SeverityChip severity={e.severity} /></TD>
                  <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: e.severity === 'Critical' ? N.errorLight : N.text2, fontFamily: 'DM Mono, monospace' }}>{e.count}</td>
                  <TD mono muted>{e.pct}%</TD>
                  <TD mono muted>{e.affectedWorkspaces}</TD>
                  <td className="py-2.5 pr-4">
                    {e.autoResolvable
                      ? <span className="flex items-center gap-1 text-[10px]" style={{ color: N.successLight }}><CheckCircle size={10} /> Auto</span>
                      : <span className="text-[10px]" style={{ color: N.text3 }}>Manual</span>}
                  </td>
                  <TD mono muted>{e.lastSeen.split(' ')[1]}</TD>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: N.tealBg, color: N.tealLight }}>Resolve</button>
                      <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: N.bg1, color: N.text3, border: `1px solid ${N.border}` }}>Details</button>
                    </div>
                  </td>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Resolution guide */}
      <Card className="p-5">
        <SectionHeader title="Resolution Recommendations" />
        <div className="space-y-3">
          {REJECTION_ERRORS.filter(e => e.severity === 'Critical' || e.severity === 'High').map(e => (
            <div key={e.id} className="p-3 rounded-xl" style={{ background: N.bg1, border: `1px solid ${e.severity === 'Critical' ? 'rgba(220,38,38,0.3)' : 'rgba(249,115,22,0.2)'}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <SeverityChip severity={e.severity} />
                  <span className="text-xs font-semibold" style={{ color: N.text1, fontFamily: 'DM Mono, monospace' }}>{e.code}</span>
                </div>
                <span className="text-[10px]" style={{ color: N.text3 }}>{e.count} occurrences · {e.affectedWorkspaces} workspaces</span>
              </div>
              <div className="text-xs mb-1" style={{ color: N.text2 }}>{e.message}</div>
              {e.resolution && (
                <div className="text-[10px] flex items-start gap-1.5" style={{ color: N.tealLight }}>
                  <RefreshCw size={9} className="flex-shrink-0 mt-0.5" />
                  {e.resolution}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
