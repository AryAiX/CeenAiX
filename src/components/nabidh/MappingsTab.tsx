import { useState } from 'react';
import { AlertCircle, CheckCircle, CreditCard as Edit2, Plus } from 'lucide-react';
import { MAPPINGS, MappingEntry } from '../../data/nabidhData';
import { N, Card, SectionHeader, StatusChip, TH, TD, TR } from './NabidhPrimitives';

export function MappingsTab() {
  const [selected, setSelected] = useState<MappingEntry | null>(null);

  return (
    <div className="flex gap-4">
      <div className="flex-1 flex flex-col gap-4">
        {/* Schema version notice */}
        <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: N.blueBg, border: `1px solid rgba(37,99,235,0.3)` }}>
          <CheckCircle size={13} style={{ color: N.blueLight, flexShrink: 0 }} />
          <span className="text-xs" style={{ color: N.blueLight }}>NABIDH FHIR R4 schema — DHA specification v2.4 · Last synced 2026-05-03</span>
        </div>

        <Card className="p-5">
          <SectionHeader title="Active Mappings">
            <button className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }}>
              <Plus size={10} /> New Mapping
            </button>
          </SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${N.border}` }}>
                  <TH>ID</TH><TH>Name</TH><TH>Resource</TH><TH>Version</TH><TH>Scope</TH>
                  <TH>Status</TH><TH>Coverage</TH><TH>Errors</TH><TH>Last Updated</TH><TH>Actions</TH>
                </tr>
              </thead>
              <tbody>
                {MAPPINGS.map(m => {
                  const coverage = Math.round((m.mappedFields / m.totalFields) * 100);
                  return (
                    <TR key={m.id} onClick={() => setSelected(m)} highlight={m.validationErrors > 0}>
                      <td className="py-2.5 pr-4">
                        <span className="text-[11px]" style={{ color: N.tealLight, fontFamily: 'DM Mono, monospace' }}>{m.id}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs max-w-[200px]" style={{ color: N.text1 }}>{m.name}</td>
                      <td className="py-2.5 pr-4">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: N.blueBg, color: N.blueLight }}>{m.resourceType}</span>
                      </td>
                      <TD mono muted>{m.version}</TD>
                      <TD muted>{m.workspace}</TD>
                      <TD><StatusChip status={m.status} /></TD>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: N.bg1 }}>
                            <div className="h-full rounded-full" style={{ width: `${coverage}%`, background: coverage === 100 ? N.success : N.teal }} />
                          </div>
                          <span className="text-[10px]" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>{coverage}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        {m.validationErrors > 0
                          ? <span className="flex items-center gap-1 text-[10px]" style={{ color: N.errorLight }}><AlertCircle size={10} /> {m.validationErrors}</span>
                          : <span className="flex items-center gap-1 text-[10px]" style={{ color: N.successLight }}><CheckCircle size={10} /> Clean</span>}
                      </td>
                      <TD mono muted>{m.lastUpdated}</TD>
                      <td className="py-2.5">
                        <button className="text-[9px] px-2 py-0.5 rounded flex items-center gap-1"
                          onClick={e => { e.stopPropagation(); setSelected(m); }}
                          style={{ background: N.tealBg, color: N.tealLight }}>
                          <Edit2 size={8} /> Edit
                        </button>
                      </td>
                    </TR>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0">
          <Card className="p-5 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold" style={{ color: N.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Mapping Detail</div>
              <button onClick={() => setSelected(null)} style={{ color: N.text3, fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'ID', value: selected.id },
                { label: 'Name', value: selected.name },
                { label: 'Resource Type', value: selected.resourceType },
                { label: 'Version', value: selected.version },
                { label: 'Scope', value: selected.workspace },
                { label: 'Mapped Fields', value: `${selected.mappedFields} / ${selected.totalFields}` },
                { label: 'Validation Errors', value: `${selected.validationErrors}` },
                { label: 'Updated By', value: selected.updatedBy },
                { label: 'Last Updated', value: selected.lastUpdated },
              ].map(f => (
                <div key={f.label}>
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>{f.label}</div>
                  <div className="text-xs" style={{ color: N.text1, fontFamily: 'DM Mono, monospace' }}>{f.value}</div>
                </div>
              ))}
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>Status</div>
                <StatusChip status={selected.status} />
              </div>
            </div>
            {selected.status === 'Under Review' && (
              <div className="mt-4 p-3 rounded-lg text-[10px]" style={{ background: N.warningBg, border: `1px solid rgba(217,119,6,0.2)`, color: N.warningLight }}>
                Requires two-person approval before activation. Notify second approver.
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button className="flex-1 text-[10px] py-2 rounded-lg font-semibold"
                style={{ background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }}>
                Edit Mapping
              </button>
              <button className="flex-1 text-[10px] py-2 rounded-lg"
                style={{ background: N.bg1, color: N.text2, border: `1px solid ${N.border}` }}>
                Test Validate
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
