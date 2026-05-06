import { useState } from 'react';
import { AlertTriangle, ChevronRight, CheckCircle, Search, X, ExternalLink } from 'lucide-react';
import { ANOMALY_FEED, AUDIT_ENTRIES } from '../../data/auditLogsData';
import { A, SeverityChip } from './AuditPrimitives';

interface Props {
  onClose: () => void;
  onInvestigate?: (query: string) => void;
  onSelectEntry?: (entryId: string) => void;
}

export function AnomalyPanel({ onClose, onInvestigate, onSelectEntry }: Props) {
  const [anomalies, setAnomalies] = useState(ANOMALY_FEED);

  const acknowledge = (id: string) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'Acknowledged' as const } : a));
  };

  const markFp = (id: string) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'Investigating' as const } : a));
  };

  const openCount = anomalies.filter(a => a.status === 'Open').length;

  return (
    <div className="w-80 flex-shrink-0 flex flex-col" style={{ background: A.bg2, borderLeft: `1px solid ${A.border}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${A.border}` }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} style={{ color: '#F87171' }} />
          <span className="text-sm font-semibold" style={{ color: A.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Anomalies</span>
          {openCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: A.errorBg, color: A.errorLight }}>
              {openCount} open
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ color: A.text3 }}>
          <X size={13} />
        </button>
      </div>

      {/* Summary strip */}
      <div className="px-4 py-2 grid grid-cols-3 gap-1 flex-shrink-0 text-center" style={{ background: A.bg3, borderBottom: `1px solid ${A.border}` }}>
        {[
          { label: 'Open', count: anomalies.filter(a => a.status === 'Open').length, color: '#F87171' },
          { label: 'Investigating', count: anomalies.filter(a => a.status === 'Investigating').length, color: A.warningLight },
          { label: 'Acknowledged', count: anomalies.filter(a => a.status === 'Acknowledged').length, color: A.successLight },
        ].map(s => (
          <div key={s.label}>
            <div className="text-sm font-bold" style={{ color: s.color, fontFamily: 'DM Mono, monospace' }}>{s.count}</div>
            <div className="text-[9px]" style={{ color: A.text3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Anomaly list */}
      <div className="flex-1 overflow-y-auto">
        {anomalies.map(a => {
          const scoreColor = a.score >= 90 ? '#F87171' : a.score >= 70 ? '#FB923C' : A.warningLight;
          const linkedEntry = a.entryId ? AUDIT_ENTRIES.find(e => e.id === a.entryId) : null;
          return (
            <div key={a.id} className="p-3.5 transition-colors" style={{ borderBottom: `1px solid ${A.border}` }}>
              {/* Top row: severity + score + time */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <SeverityChip severity={a.severity} />
                <div className="flex items-center gap-2 ml-auto">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: A.bg1 }}>
                      <div className="h-full rounded-full" style={{ width: `${a.score}%`, background: scoreColor }} />
                    </div>
                    <span className="text-[9px] font-bold" style={{ color: scoreColor, fontFamily: 'DM Mono, monospace' }}>{a.score}</span>
                  </div>
                  <span className="text-[9px]" style={{ color: A.text3 }}>{a.time}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="text-[11px] mb-2.5 leading-snug" style={{ color: A.text1 }}>{a.summary}</div>

              {/* Suggested query */}
              {a.suggestedQuery && (
                <div className="mb-2.5 p-2 rounded-lg" style={{ background: A.bg1, border: `1px solid ${A.border}` }}>
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Suggested filter</div>
                  <div className="text-[9px] break-all" style={{ color: A.tealLight, fontFamily: 'DM Mono, monospace' }}>?{a.suggestedQuery}</div>
                  <button
                    onClick={() => onInvestigate?.(a.suggestedQuery!)}
                    className="mt-1.5 flex items-center gap-1 text-[9px]"
                    style={{ color: A.tealLight }}>
                    <ExternalLink size={8} /> Apply to log view
                  </button>
                </div>
              )}

              {/* Linked entry */}
              {linkedEntry && (
                <button
                  onClick={() => onSelectEntry?.(linkedEntry.id)}
                  className="w-full text-left mb-2.5 p-2 rounded-lg transition-colors"
                  style={{ background: 'rgba(13,148,136,0.06)', border: `1px solid ${A.tealBorder}` }}>
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Linked entry</div>
                  <div className="text-[10px] truncate" style={{ color: A.tealLight }}>{linkedEntry.event}</div>
                  <div className="text-[9px]" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>{linkedEntry.id} · {linkedEntry.timestamp.split(' ')[1]}</div>
                </button>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                {a.status === 'Open' ? (
                  <>
                    <button onClick={() => acknowledge(a.id)} className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg flex-1 justify-center"
                      style={{ background: A.successBg, color: A.successLight, border: `1px solid rgba(5,150,105,0.2)` }}>
                      <CheckCircle size={8} /> Acknowledge
                    </button>
                    <button className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg flex-1 justify-center"
                      style={{ background: A.tealBg, color: A.tealLight, border: `1px solid ${A.tealBorder}` }}>
                      <Search size={8} /> Investigate
                    </button>
                    <button onClick={() => markFp(a.id)} className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg"
                      style={{ background: A.bg1, color: A.text3, border: `1px solid ${A.border}` }}>
                      <X size={8} /> FP
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-[9px] px-2 py-1 rounded-lg"
                    style={{ background: A.bg1, border: `1px solid ${A.border}`, color: a.status === 'Acknowledged' ? A.successLight : A.warningLight }}>
                    {a.status === 'Acknowledged' ? <CheckCircle size={9} /> : <Search size={9} />}
                    {a.status}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${A.border}` }}>
        <button className="w-full flex items-center justify-center gap-1.5 text-[10px] py-2 rounded-lg"
          style={{ background: A.bg1, color: A.text2, border: `1px solid ${A.border}` }}>
          View all anomalies <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}
