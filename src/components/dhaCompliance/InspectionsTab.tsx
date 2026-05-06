import { useState } from 'react';
import { AlertTriangle, Calendar, ChevronDown, ChevronRight, FileText, CheckCircle } from 'lucide-react';
import { INSPECTIONS, type Inspection, type InspectionFinding } from '../../data/dhaComplianceData';
import { D, Card, SectionHeader, FindingChip, CapaChip, DaysChip, MonoId, TH, TD, TR } from './DhaCompliancePrimitives';

function InspectionCard({ ins, expanded, onToggle }: {
  ins: Inspection;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [selectedFinding, setSelectedFinding] = useState<InspectionFinding | null>(null);
  const outcomeColor = ins.outcome === 'Pass' ? D.successLight : ins.outcome === 'Conditional' ? D.warningLight : ins.outcome === 'Fail' ? D.errorLight : D.text3;
  const outcomeBg = ins.outcome === 'Pass' ? D.successBg : ins.outcome === 'Conditional' ? D.warningBg : ins.outcome === 'Fail' ? D.errorBg : D.bg1;

  return (
    <Card>
      <button onClick={onToggle} className="w-full text-left p-5" style={{ cursor: 'pointer' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: D.bg1, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
                {ins.type}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: outcomeBg, color: outcomeColor }}>
                {ins.outcome}
              </span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: D.bg1, color: D.text3 }}>
                {ins.status}
              </span>
            </div>
            <div className="text-sm font-semibold mb-1" style={{ color: D.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {ins.scope}
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5" style={{ color: D.text3 }}>
                <Calendar size={10} />
                {ins.date}
              </div>
              {ins.inspectors.length > 0 && (
                <span style={{ color: D.text3 }}>{ins.inspectors[0]}{ins.inspectors.length > 1 ? ` +${ins.inspectors.length - 1}` : ''}</span>
              )}
              {ins.findings.length > 0 && (
                <span style={{ color: ins.findings.some(f => f.severity === 'Critical' || f.severity === 'Major') ? D.warningLight : D.text3 }}>
                  {ins.findings.length} finding{ins.findings.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <MonoId value={ins.id} />
            {expanded ? <ChevronDown size={14} style={{ color: D.text3 }} /> : <ChevronRight size={14} style={{ color: D.text3 }} />}
          </div>
        </div>
      </button>

      {expanded && ins.findings.length > 0 && (
        <div className="border-t" style={{ borderColor: D.border }}>
          <div className="flex gap-0">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: D.bg3 }}>
                  <tr>
                    <TH>ID</TH>
                    <TH>Severity</TH>
                    <TH>Category</TH>
                    <TH>Description</TH>
                    <TH>Regulatory Ref</TH>
                    <TH>CAPA</TH>
                    <TH>Due</TH>
                    <TH>Owner</TH>
                  </tr>
                </thead>
                <tbody>
                  {ins.findings.map(f => (
                    <TR key={f.id}
                      onClick={() => setSelectedFinding(selectedFinding?.id === f.id ? null : f)}
                      highlight={f.severity === 'Critical'}>
                      <TD><MonoId value={f.id} /></TD>
                      <TD><FindingChip severity={f.severity} /></TD>
                      <TD>{f.category}</TD>
                      <TD>
                        <div className="max-w-xs text-xs" style={{ color: D.text1 }}>{f.description}</div>
                      </TD>
                      <TD>
                        <span style={{ color: D.blueLight, fontSize: 10 }}>{f.regulatoryRef}</span>
                      </TD>
                      <TD>
                        {f.capaStatus ? <CapaChip status={f.capaStatus} /> : <span style={{ color: D.text3 }}>—</span>}
                      </TD>
                      <TD>
                        {f.daysRemaining !== undefined ? <DaysChip days={f.daysRemaining} /> : '—'}
                      </TD>
                      <TD>{f.owner || '—'}</TD>
                    </TR>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedFinding && (
              <div className="w-72 flex-shrink-0 border-l p-4" style={{ borderColor: D.border, background: D.bg1 }}>
                <div className="flex items-center gap-2 mb-3">
                  <MonoId value={selectedFinding.id} />
                  <FindingChip severity={selectedFinding.severity} />
                </div>
                <div className="text-xs font-semibold mb-2" style={{ color: D.text1 }}>{selectedFinding.description}</div>
                <div className="space-y-2 text-[10px]">
                  {[
                    { label: 'Category', value: selectedFinding.category },
                    { label: 'Regulatory ref', value: selectedFinding.regulatoryRef },
                    { label: 'CAPA required', value: selectedFinding.capaRequired ? 'Yes' : 'No' },
                    ...(selectedFinding.capaStatus ? [{ label: 'CAPA status', value: selectedFinding.capaStatus }] : []),
                    ...(selectedFinding.owner ? [{ label: 'Owner', value: selectedFinding.owner }] : []),
                    ...(selectedFinding.dueDate ? [{ label: 'Due date', value: selectedFinding.dueDate }] : []),
                  ].map(f => (
                    <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                      <span style={{ color: D.text3 }}>{f.label}</span>
                      <span style={{ color: D.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
                    </div>
                  ))}
                </div>
                {selectedFinding.capaRequired && selectedFinding.capaStatus && (
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 text-[10px] py-1.5 rounded-lg" style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
                      Update CAPA
                    </button>
                    <button className="flex-1 text-[10px] py-1.5 rounded-lg" style={{ background: D.bg1, color: D.text2, border: `1px solid ${D.border}` }}>
                      View evidence
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {expanded && ins.findings.length === 0 && (
        <div className="px-5 pb-5 flex items-center gap-2">
          <CheckCircle size={14} style={{ color: D.successLight }} />
          <span className="text-[10px]" style={{ color: D.successLight }}>No findings recorded for this inspection</span>
        </div>
      )}
    </Card>
  );
}

export function InspectionsTab() {
  const [expandedId, setExpandedId] = useState<string | null>('INS-001');
  const openFindings = INSPECTIONS.flatMap(i => i.findings.filter(f => f.capaRequired && f.capaStatus && f.capaStatus !== 'Closed'));

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* Open findings alert */}
      {openFindings.length > 0 && (
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: D.warningBg, border: `1px solid ${D.warningBorder}` }}>
          <AlertTriangle size={14} style={{ color: D.warningLight, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: D.warningLight }}>
              {openFindings.length} open finding{openFindings.length > 1 ? 's' : ''} with active CAPA
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>
              All CAPA items must be evidenced and closed before the next scheduled inspection (2026-07-14).
            </div>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Inspections', value: INSPECTIONS.length.toString(), color: D.text1 },
          { label: 'Open Findings', value: openFindings.length.toString(), color: openFindings.length > 0 ? D.warningLight : D.successLight },
          { label: 'Next Inspection', value: '2026-07-14', color: D.blueLight },
          { label: 'Readiness Score', value: '82%', color: D.warningLight },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <div className="text-[10px] mb-1" style={{ color: D.text3 }}>{k.label}</div>
            <div className="text-xl font-bold" style={{ color: k.color, fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Inspection cards */}
      <div className="flex flex-col gap-3">
        {INSPECTIONS.map(ins => (
          <InspectionCard
            key={ins.id}
            ins={ins}
            expanded={expandedId === ins.id}
            onToggle={() => setExpandedId(expandedId === ins.id ? null : ins.id)}
          />
        ))}
      </div>

      {/* CAPA summary */}
      <Card className="p-5">
        <SectionHeader title="CAPA Tracker">
          <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
            <FileText size={9} /> Export CAPA report
          </button>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: D.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                <TH>Finding</TH>
                <TH>Severity</TH>
                <TH>CAPA Status</TH>
                <TH>Due</TH>
                <TH>Owner</TH>
                <TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {INSPECTIONS.flatMap(i => i.findings.filter(f => f.capaRequired)).map(f => (
                <TR key={f.id}>
                  <TD>
                    <div>
                      <MonoId value={f.id} />
                      <div className="text-[10px] mt-0.5 max-w-xs" style={{ color: D.text2 }}>{f.description.slice(0, 60)}…</div>
                    </div>
                  </TD>
                  <TD><FindingChip severity={f.severity} /></TD>
                  <TD>{f.capaStatus ? <CapaChip status={f.capaStatus} /> : '—'}</TD>
                  <TD>{f.daysRemaining !== undefined ? <DaysChip days={f.daysRemaining} /> : '—'}</TD>
                  <TD>{f.owner || '—'}</TD>
                  <td className="py-2 pr-3">
                    <button className="text-[9px] px-2 py-0.5 rounded"
                      style={{ background: D.tealBg, color: D.tealLight }}>
                      Update
                    </button>
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
