import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { AuditEntry } from '../../data/auditLogsData';
import { A, SeverityDot, CategoryChip, OutcomeChip, PhiBadge, AiBadge, AnomalyBadge, SeverityChip } from './AuditPrimitives';
import { AuditDetailPanel } from './AuditDetailPanel';

const SEVERITY_COLORS: Record<string, string> = {
  Info: A.tealLight,
  Notice: A.blueLight,
  Warning: A.warningLight,
  Error: A.orangeLight,
  Critical: '#F87171',
};

function formatRelTime(ts: string): string {
  const [, time] = ts.split(' ');
  return time;
}

function CorrelationGroup({ corrId, groupEntries, onSelect, selectedId }: {
  corrId: string;
  groupEntries: AuditEntry[];
  onSelect: (e: AuditEntry) => void;
  selectedId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasCritical = groupEntries.some(e => e.severity === 'Critical');
  const hasAnomaly = groupEntries.some(e => !!e.anomaly);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(x => !x)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] transition-colors"
        style={{ background: expanded ? A.tealBg : A.bg2, border: `1px solid ${expanded ? A.tealBorder : A.border}` }}>
        {expanded ? <ChevronDown size={11} style={{ color: A.tealLight }} /> : <ChevronRight size={11} style={{ color: A.text3 }} />}
        <span style={{ color: A.tealLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{corrId}</span>
        <span style={{ color: A.text3 }}>{groupEntries.length} event{groupEntries.length !== 1 ? 's' : ''}</span>
        {hasCritical && <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-1" style={{ background: A.errorBg, color: '#F87171' }}>Critical</span>}
        {hasAnomaly && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: A.warningBg, color: A.warningLight }}>Anomaly</span>}
        <span className="ml-auto text-[9px]" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>
          {formatRelTime(groupEntries[groupEntries.length - 1].timestamp)} → {formatRelTime(groupEntries[0].timestamp)}
        </span>
      </button>

      {expanded && (
        <div className="ml-4 mt-1 relative">
          <div className="absolute left-[10px] top-0 bottom-0 w-px" style={{ background: A.border }} />
          {groupEntries.map((entry, i) => {
            const color = SEVERITY_COLORS[entry.severity] || A.text3;
            const isSelected = selectedId === entry.id;
            return (
              <div key={entry.id} className={`flex gap-3 items-start ${i > 0 ? 'mt-2' : ''}`}>
                {/* Node */}
                <div className="flex-shrink-0 z-10 flex flex-col items-center" style={{ width: 22 }}>
                  <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center`}
                    style={{
                      background: isSelected ? color : `${color}22`,
                      border: `2px solid ${color}`,
                      boxShadow: entry.severity === 'Critical' ? `0 0 6px ${color}60` : undefined,
                    }}>
                    <SeverityDot severity={entry.severity} />
                  </div>
                </div>

                {/* Card */}
                <div
                  className="flex-1 min-w-0 pb-2 cursor-pointer group"
                  onClick={() => onSelect(entry)}>
                  <div className="p-3 rounded-xl transition-all"
                    style={{
                      background: isSelected ? `${color}12` : A.bg2,
                      border: `1px solid ${isSelected ? `${color}40` : A.border}`,
                    }}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold leading-snug truncate" style={{ color: A.text1 }} title={entry.event}>
                          {entry.event}
                        </div>
                        <div className="text-[9px] mt-0.5" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>
                          {entry.timestamp.split(' ')[1]} · {entry.actorName}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <SeverityChip severity={entry.severity} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <CategoryChip category={entry.category} />
                      <OutcomeChip outcome={entry.outcome} />
                      {entry.phiAccessed && <PhiBadge />}
                      {entry.aiModel && <AiBadge model={entry.aiModel} />}
                      {entry.anomaly && <AnomalyBadge score={entry.anomaly.score} reason={entry.anomaly.reason} />}
                    </div>

                    {entry.anomaly && (
                      <div className="mt-2 p-2 rounded-lg text-[10px]" style={{ background: A.errorBg, color: A.errorLight }}>
                        {entry.anomaly.reason}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[9px]">
                      <span style={{ color: A.text3 }}>{entry.workspace} · {entry.portal}</span>
                      <span style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>{entry.ip}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AuditTimelineView({ entries }: { entries: AuditEntry[] }) {
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [groupMode, setGroupMode] = useState<'None' | 'Correlation' | 'Actor' | 'Portal'>('Correlation');

  // Build groups
  const buildGroups = (): Record<string, AuditEntry[]> => {
    if (groupMode === 'None') return { 'All Events': entries };
    return entries.reduce<Record<string, AuditEntry[]>>((acc, e) => {
      const k = groupMode === 'Correlation' ? e.correlationId
        : groupMode === 'Actor' ? e.actorName
        : e.portal;
      if (!acc[k]) acc[k] = [];
      acc[k].push(e);
      return acc;
    }, {});
  };

  const groups = buildGroups();

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Controls */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2 text-[10px]">
            <span style={{ color: A.text3 }}>Group by:</span>
            {(['Correlation', 'Actor', 'Portal', 'None'] as const).map(m => (
              <button key={m} onClick={() => setGroupMode(m)} className="px-2.5 py-1 rounded-lg"
                style={groupMode === m
                  ? { background: A.tealBg, color: A.tealLight, border: `1px solid ${A.tealBorder}` }
                  : { background: A.bg2, color: A.text3, border: `1px solid ${A.border}` }}>
                {m}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 ml-auto">
            {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
              <div key={sev} className="flex items-center gap-1.5 text-[10px]" style={{ color: A.text3 }}>
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                {sev}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        {groupMode === 'Correlation' ? (
          <div className="space-y-1">
            {Object.entries(groups).map(([corrId, gEntries]) => (
              <CorrelationGroup
                key={corrId}
                corrId={corrId}
                groupEntries={gEntries}
                onSelect={e => setSelected(selected?.id === e.id ? null : e)}
                selectedId={selected?.id || null}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([groupName, gEntries]) => (
              <div key={groupName}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[11px] font-semibold px-3 py-1 rounded-full"
                    style={{ background: A.tealBg, color: A.tealLight, border: `1px solid ${A.tealBorder}`, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {groupName}
                  </div>
                  <div className="text-[10px]" style={{ color: A.text3 }}>{gEntries.length} events</div>
                </div>
                <div className="relative ml-3">
                  <div className="absolute left-[10px] top-0 bottom-0 w-px" style={{ background: A.border }} />
                  <div className="space-y-2">
                    {gEntries.map(entry => {
                      const color = SEVERITY_COLORS[entry.severity] || A.text3;
                      const isSelected = selected?.id === entry.id;
                      return (
                        <div key={entry.id} className="flex gap-3 items-start">
                          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 z-10"
                            style={{ background: isSelected ? color : `${color}22`, border: `2px solid ${color}` }}>
                            <SeverityDot severity={entry.severity} />
                          </div>
                          <div className="flex-1 min-w-0 pb-1 cursor-pointer"
                            onClick={() => setSelected(selected?.id === entry.id ? null : entry)}>
                            <div className="p-3 rounded-xl transition-all"
                              style={{ background: isSelected ? `${color}12` : A.bg2, border: `1px solid ${isSelected ? `${color}40` : A.border}` }}>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="text-[11px] font-semibold leading-snug" style={{ color: A.text1 }}>{entry.event}</div>
                                <SeverityChip severity={entry.severity} />
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                <CategoryChip category={entry.category} />
                                <OutcomeChip outcome={entry.outcome} />
                                {entry.phiAccessed && <PhiBadge />}
                                {entry.anomaly && <AnomalyBadge score={entry.anomaly.score} reason={entry.anomaly.reason} />}
                              </div>
                              <div className="text-[9px]" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>
                                {entry.timestamp.split(' ')[1]} · {entry.actorName} · {entry.workspace}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <AuditDetailPanel entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
