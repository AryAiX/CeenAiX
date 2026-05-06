import { useState } from 'react';
import { Copy, Flag, AlertTriangle, FileText, Plus } from 'lucide-react';
import { AuditEntry } from '../../data/auditLogsData';
import {
  A, SeverityDot, CategoryChip, OutcomeChip, PhiBadge, AiBadge, AnomalyBadge,
  TH, TR, CopyableId,
} from './AuditPrimitives';
import { AuditDetailPanel } from './AuditDetailPanel';

interface Props {
  entries: AuditEntry[];
  liveTail: boolean;
  onCreateIncident?: (ids: string[]) => void;
}

export function AuditTableView({ entries, liveTail, onCreateIncident }: Props) {
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setCheckedIds(prev => prev.size === entries.length ? new Set() : new Set(entries.map(e => e.id)));
  };

  return (
    <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Bulk actions bar */}
        {checkedIds.size > 0 && (
          <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 flex-wrap" style={{ background: A.tealBg, borderBottom: `1px solid ${A.tealBorder}` }}>
            <span className="text-xs font-semibold" style={{ color: A.tealLight }}>{checkedIds.size} selected</span>
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: A.bg2, color: A.text2, border: `1px solid ${A.border}` }}>
              <FileText size={9} /> Export selected
            </button>
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: A.warningBg, color: A.warningLight, border: `1px solid rgba(217,119,6,0.3)` }}>
              <Flag size={9} /> Flag for review
            </button>
            <button onClick={() => onCreateIncident?.(Array.from(checkedIds))}
              className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: A.errorBg, color: A.errorLight, border: `1px solid rgba(220,38,38,0.3)` }}>
              <Plus size={9} /> Create incident
            </button>
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: A.bg2, color: A.text2, border: `1px solid ${A.border}` }}>
              <AlertTriangle size={9} /> Acknowledge anomalies
            </button>
            <button onClick={() => setCheckedIds(new Set())} className="ml-auto text-[10px]" style={{ color: A.text3 }}>Clear</button>
          </div>
        )}

        {/* Live tail strip */}
        {liveTail && (
          <div className="flex items-center gap-2 px-4 py-1.5" style={{ background: 'rgba(5,150,105,0.08)', borderBottom: `1px solid rgba(5,150,105,0.2)` }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-semibold" style={{ color: A.successLight }}>Live tail active — streaming new entries</span>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead style={{ background: '#0A1628', position: 'sticky', top: 0, zIndex: 5 }}>
              <tr style={{ borderBottom: `1px solid ${A.border}` }}>
                <th className="py-2 pr-2 pl-4 w-8">
                  <input type="checkbox"
                    checked={checkedIds.size === entries.length && entries.length > 0}
                    onChange={toggleAll}
                    className="w-3 h-3" style={{ accentColor: A.teal }} />
                </th>
                <TH>Time</TH>
                <TH>Sev</TH>
                <TH>Category</TH>
                <TH>Event</TH>
                <TH>Actor</TH>
                <TH>Resource</TH>
                <TH>Workspace</TH>
                <TH>Portal</TH>
                <TH>Location</TH>
                <TH>Outcome</TH>
                <TH>IP</TH>
                <TH>Correlation</TH>
                <TH>Flags</TH>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const isChecked = checkedIds.has(entry.id);
                const isSelected = selected?.id === entry.id;
                return (
                  <TR key={entry.id}
                    onClick={() => setSelected(selected?.id === entry.id ? null : entry)}
                    highlight={entry.severity === 'Critical' || !!entry.anomaly}
                    selected={isSelected}>
                    <td className="py-2 pr-2 pl-4" onClick={e => toggleCheck(entry.id, e)}>
                      <input type="checkbox" checked={isChecked} readOnly className="w-3 h-3" style={{ accentColor: A.teal }} />
                    </td>

                    <td className="py-2 pr-3 whitespace-nowrap">
                      <div className="text-[10px]" style={{ color: A.text2, fontFamily: 'DM Mono, monospace' }}>{entry.timestamp.split(' ')[1]}</div>
                      <div className="text-[9px]" style={{ color: A.text3 }}>{entry.timestamp.split(' ')[0]}</div>
                    </td>

                    <td className="py-2 pr-3">
                      <SeverityDot severity={entry.severity} />
                    </td>

                    <td className="py-2 pr-3">
                      <CategoryChip category={entry.category} />
                    </td>

                    <td className="py-2 pr-3" style={{ maxWidth: 200 }}>
                      <div className="text-xs truncate" style={{ color: A.text1 }} title={entry.event}>{entry.event}</div>
                      {entry.legalHold && (
                        <div className="text-[9px] mt-0.5" style={{ color: '#FCD34D' }}>Legal hold</div>
                      )}
                    </td>

                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                          style={{ background: A.tealBg, color: A.tealLight }}>
                          {entry.actorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] truncate" style={{ color: A.text1, maxWidth: 110 }}>{entry.actorName}</div>
                          {entry.impersonating && (
                            <div className="text-[9px]" style={{ color: '#FB923C' }}>as {entry.impersonating.split('(')[0].trim()}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2 pr-3">
                      <div className="text-[10px]" style={{ color: A.text2 }}>{entry.resourceType}</div>
                      <div className="text-[9px]" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>{entry.resourceId}</div>
                    </td>

                    <td className="py-2 pr-3" style={{ maxWidth: 120 }}>
                      <div className="text-[10px] truncate" style={{ color: A.text3 }}>{entry.workspace}</div>
                    </td>

                    <td className="py-2 pr-3">
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: A.bg1, color: A.text3, border: `1px solid ${A.border}`, whiteSpace: 'nowrap' }}>{entry.portal}</span>
                    </td>

                    <td className="py-2 pr-3 whitespace-nowrap">
                      <div className="text-[10px]" style={{ color: A.text3 }}>{entry.location}</div>
                    </td>

                    <td className="py-2 pr-3">
                      <OutcomeChip outcome={entry.outcome} />
                    </td>

                    <td className="py-2 pr-3">
                      <div className="text-[10px] whitespace-nowrap" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>{entry.ip}</div>
                    </td>

                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1">
                        <CopyableId value={entry.correlationId} />
                        <button onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(entry.correlationId); }}>
                          <Copy size={9} style={{ color: A.text3 }} />
                        </button>
                      </div>
                    </td>

                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {entry.phiAccessed && <PhiBadge />}
                        {entry.aiModel && <AiBadge model={entry.aiModel} />}
                        {entry.anomaly && <AnomalyBadge score={entry.anomaly.score} reason={entry.anomaly.reason} />}
                        {entry.flagged && <Flag size={10} style={{ color: A.warningLight }} />}
                      </div>
                    </td>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${A.border}` }}>
          <span className="text-[10px]" style={{ color: A.text3 }}>Showing {entries.length} of 284,920 entries</span>
          <div className="flex items-center gap-1">
            {['←', '1', '2', '3', '...', '24', '→'].map((p, idx) => (
              <button key={idx} className="min-w-[24px] h-6 rounded px-1 text-[10px]"
                style={{ background: p === '1' ? A.tealBg : A.bg2, color: p === '1' ? A.tealLight : A.text3, border: `1px solid ${p === '1' ? A.tealBorder : A.border}` }}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span style={{ color: A.text3 }}>Jump to date:</span>
            <input type="date" className="px-2 py-1 rounded text-[10px] outline-none"
              style={{ background: A.bg1, border: `1px solid ${A.border}`, color: A.text2 }} />
          </div>
        </div>
      </div>

      {selected && (
        <AuditDetailPanel entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
