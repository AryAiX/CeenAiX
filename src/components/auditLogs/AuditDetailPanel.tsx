import { useState } from 'react';
import { X, Copy, Eye, EyeOff, Shield, Hash, FileText, Flag, Lock, Download, ChevronRight } from 'lucide-react';
import { AuditEntry, AUDIT_ENTRIES } from '../../data/auditLogsData';
import { A, SeverityChip, CategoryChip, OutcomeChip, PhiBadge, AiBadge, SeverityDot } from './AuditPrimitives';

const TABS = ['Overview', 'Diff', 'Related', 'Chain', 'Compliance', 'Notes'] as const;
type PanelTab = typeof TABS[number];

function DiffBlock({ entry, phiRevealed }: { entry: AuditEntry; phiRevealed: boolean }) {
  if (!entry.diff || entry.diff.length === 0) {
    return (
      <div className="text-[11px] text-center py-8" style={{ color: A.text3 }}>
        No field-level diff available for this event.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="text-[10px] mb-3" style={{ color: A.text3 }}>
        {entry.diff.length} field{entry.diff.length !== 1 ? 's' : ''} changed
      </div>
      {entry.diff.map((d, i) => (
        <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${A.border}` }}>
          <div className="px-3 py-1.5 flex items-center justify-between" style={{ background: A.bg3 }}>
            <span className="text-[10px] font-semibold" style={{ color: A.text2, fontFamily: 'DM Mono, monospace' }}>{d.field}</span>
            {d.phi && <PhiBadge />}
          </div>
          <div className="grid grid-cols-2 divide-x" style={{ borderTop: `1px solid ${A.border}`, borderColor: A.border }}>
            <div className="px-3 py-2">
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: A.error, fontFamily: 'DM Mono, monospace' }}>Before</div>
              <div className="text-[10px] break-all" style={{ color: d.phi && !phiRevealed ? 'transparent' : A.errorLight, fontFamily: 'DM Mono, monospace', textShadow: d.phi && !phiRevealed ? `0 0 6px ${A.errorLight}` : 'none' }}>
                {d.phi && !phiRevealed ? '████████' : (d.oldValue || '—')}
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: A.success, fontFamily: 'DM Mono, monospace' }}>After</div>
              <div className="text-[10px] break-all" style={{ color: d.phi && !phiRevealed ? 'transparent' : A.successLight, fontFamily: 'DM Mono, monospace', textShadow: d.phi && !phiRevealed ? `0 0 6px ${A.successLight}` : 'none' }}>
                {d.phi && !phiRevealed ? '████████' : (d.newValue || '—')}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RelatedTimeline({ entry }: { entry: AuditEntry }) {
  const related = AUDIT_ENTRIES.filter(e => e.correlationId === entry.correlationId);
  const SCOLOR: Record<string, string> = {
    Info: A.tealLight, Notice: A.blueLight, Warning: A.warningLight, Error: A.orangeLight, Critical: '#F87171',
  };
  return (
    <div>
      <div className="text-[10px] mb-3" style={{ color: A.text3 }}>
        {related.length} entr{related.length !== 1 ? 'ies' : 'y'} sharing correlation ID{' '}
        <span style={{ color: A.tealLight, fontFamily: 'DM Mono, monospace' }}>{entry.correlationId}</span>
      </div>
      <div className="relative">
        <div className="absolute left-[11px] top-0 bottom-0 w-px" style={{ background: A.border }} />
        <div className="space-y-3">
          {related.map((e, i) => {
            const color = SCOLOR[e.severity] || A.text3;
            const isThis = e.id === entry.id;
            return (
              <div key={e.id} className="flex gap-3 items-start">
                <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 z-10"
                  style={{ background: isThis ? color : `${color}22`, border: `2px solid ${color}` }}>
                  <SeverityDot severity={e.severity} />
                </div>
                <div className="flex-1 pb-1 min-w-0">
                  <div className={`p-2.5 rounded-xl`}
                    style={{ background: isThis ? `${color}12` : A.bg1, border: `1px solid ${isThis ? `${color}40` : A.border}` }}>
                    {isThis && (
                      <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color, fontFamily: 'DM Mono, monospace' }}>This entry</div>
                    )}
                    <div className="text-[10px] font-semibold leading-snug mb-1" style={{ color: A.text1 }}>{e.event}</div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>{e.timestamp.split(' ')[1]}</span>
                      <span style={{ color: A.text3 }}>{e.actorName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <SeverityChip severity={e.severity} />
                      <CategoryChip category={e.category} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AuditDetailPanel({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const [tab, setTab] = useState<PanelTab>('Overview');
  const [phiRevealed, setPhiRevealed] = useState(false);
  const [note, setNote] = useState('');
  const [noteSubmitted, setNoteSubmitted] = useState(false);

  const hasDiff = entry.diff && entry.diff.length > 0;

  const submitNote = () => {
    if (!note.trim()) return;
    setNoteSubmitted(true);
    setTimeout(() => { setNoteSubmitted(false); setNote(''); }, 2000);
  };

  return (
    <div className="w-[400px] flex-shrink-0 flex flex-col" style={{ background: A.bg2, borderLeft: `1px solid ${A.border}` }}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 flex-shrink-0" style={{ borderBottom: `1px solid ${A.border}` }}>
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: A.bg3, color: A.text3, fontFamily: 'DM Mono, monospace' }}>{entry.id}</span>
            {entry.legalHold && (
              <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Lock size={8} /> Legal hold
              </span>
            )}
          </div>
          <div className="text-xs font-semibold mb-1.5 leading-snug" style={{ color: A.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {entry.event}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <SeverityChip severity={entry.severity} />
            <CategoryChip category={entry.category} />
            <OutcomeChip outcome={entry.outcome} />
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: A.bg1, color: A.text3 }}>
          <X size={14} />
        </button>
      </div>

      {/* Meta row */}
      <div className="px-4 py-2 flex items-center gap-3 flex-shrink-0 flex-wrap" style={{ borderBottom: `1px solid ${A.border}`, background: A.bg3 }}>
        <div className="text-[10px]" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>{entry.timestamp}</div>
        <div className="flex items-center gap-1 text-[10px]">
          <span style={{ color: A.text3 }}>CORR:</span>
          <span style={{ color: A.tealLight, fontFamily: 'DM Mono, monospace' }}>{entry.correlationId}</span>
          <button onClick={() => navigator.clipboard?.writeText(entry.correlationId)}>
            <Copy size={8} style={{ color: A.text3 }} />
          </button>
        </div>
        {entry.phiAccessed && <PhiBadge />}
        {entry.aiModel && <AiBadge model={entry.aiModel} />}
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-shrink-0 overflow-x-auto" style={{ borderBottom: `1px solid ${A.border}` }}>
        {TABS.map(t => {
          const hasDot = t === 'Diff' && hasDiff;
          return (
            <button key={t} onClick={() => setTab(t)}
              className="relative flex-shrink-0 text-[10px] px-3 py-2.5 transition-colors whitespace-nowrap"
              style={{
                color: tab === t ? A.tealLight : A.text3,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: tab === t ? 600 : 400,
                borderBottom: tab === t ? `2px solid ${A.teal}` : '2px solid transparent',
              }}>
              {t}
              {hasDot && (
                <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full" style={{ background: A.orangeLight }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'Overview' && (
          <div className="space-y-5">
            {/* Actor */}
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-2 font-semibold" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Actor</div>
              <div className="p-3 rounded-xl" style={{ background: A.bg1, border: `1px solid ${A.border}` }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: A.tealBg, color: A.tealLight }}>
                    {entry.actorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: A.text1 }}>{entry.actorName}</div>
                    <div className="text-[10px]" style={{ color: A.text3 }}>{entry.actorRole} · {entry.actorType}</div>
                  </div>
                </div>
                {entry.impersonating && (
                  <div className="mb-2 p-2 rounded-lg text-[10px]" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#FB923C' }}>
                    Acting as: <span className="font-semibold">{entry.impersonating}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {[
                    { label: 'Actor ID', value: entry.actorId, mono: true },
                    { label: 'Session', value: entry.sessionId, mono: true },
                    ...(entry.device ? [{ label: 'Device', value: entry.device, mono: false }] : []),
                    ...(entry.browser ? [{ label: 'Browser', value: entry.browser, mono: false }] : []),
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ color: A.text3 }}>{f.label}</div>
                      <div className="truncate" style={{ color: A.text2, fontFamily: f.mono ? 'DM Mono, monospace' : undefined, fontSize: 10 }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resource */}
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-2 font-semibold" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Resource</div>
              <div className="p-3 rounded-xl" style={{ background: A.bg1, border: `1px solid ${A.border}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: A.text1 }}>{entry.resourceType}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: A.tealBg, color: A.tealLight }}>{entry.workspace}</span>
                </div>
                <div className="text-[11px]" style={{ color: A.tealLight, fontFamily: 'DM Mono, monospace' }}>{entry.resourceId}</div>
                {entry.resourceName && (
                  <div className="text-[10px] mt-0.5" style={{ color: A.text3 }}>{entry.resourceName}</div>
                )}
              </div>
            </div>

            {/* Context */}
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-2 font-semibold" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Context</div>
              <div className="space-y-1.5">
                {[
                  { label: 'Source portal', value: entry.portal },
                  { label: 'IP address', value: entry.ip, mono: true },
                  { label: 'Location', value: entry.location },
                  { label: 'Request ID', value: entry.requestId, mono: true },
                  ...(entry.aiModel ? [{ label: 'AI model', value: entry.aiModel, mono: true }] : []),
                ].map(f => (
                  <div key={f.label} className="flex justify-between text-[10px]">
                    <span style={{ color: A.text3 }}>{f.label}</span>
                    <span style={{ color: f.label === 'AI model' ? '#A78BFA' : A.text2, fontFamily: (f as any).mono ? 'DM Mono, monospace' : undefined }}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Justification */}
            {entry.justification && (
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-2 font-semibold" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Justification</div>
                <div className="p-2.5 rounded-xl text-[11px]" style={{ background: A.bg1, border: `1px solid ${A.border}`, color: A.text2, fontStyle: 'italic' }}>
                  "{entry.justification}"
                </div>
              </div>
            )}

            {/* PHI fields */}
            {entry.phiAccessed && (
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-2 font-semibold" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>PHI Fields Accessed</div>
                <div className="p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)' }}>
                  {phiRevealed ? (
                    <div className="space-y-1">
                      {(entry.phiFields || ['Patient name', 'Date of birth', 'Emirates ID', 'Diagnosis codes']).map(f => (
                        <div key={f} className="text-[10px] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#FB923C' }} />
                          <span style={{ color: '#FB923C', fontFamily: 'DM Mono, monospace' }}>{f}</span>
                        </div>
                      ))}
                      <button onClick={() => setPhiRevealed(false)} className="mt-2 flex items-center gap-1.5 text-[10px]"
                        style={{ color: A.text3 }}>
                        <EyeOff size={9} /> Hide PHI fields
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setPhiRevealed(true)} className="flex items-center gap-1.5 text-[10px] w-full"
                      style={{ color: '#FB923C' }}>
                      <Eye size={9} /> Reveal redacted fields (audit:view-phi required · logged)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Anomaly */}
            {entry.anomaly && (
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-2 font-semibold" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Anomaly Detection</div>
                <div className="p-3 rounded-xl" style={{ background: A.errorBg, border: `1px solid rgba(220,38,38,0.25)` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold" style={{ color: A.errorLight }}>Risk score:</span>
                    <span className="text-sm font-bold" style={{ color: '#F87171', fontFamily: 'DM Mono, monospace' }}>{entry.anomaly.score}</span>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: A.bg1 }}>
                      <div className="h-full rounded-full" style={{ width: `${entry.anomaly.score}%`, background: entry.anomaly.score >= 90 ? '#F87171' : '#FB923C' }} />
                    </div>
                  </div>
                  <div className="text-[11px]" style={{ color: A.text2 }}>{entry.anomaly.reason}</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-2 rounded-lg justify-center"
                style={{ background: A.warningBg, color: A.warningLight, border: `1px solid rgba(217,119,6,0.3)` }}>
                <Flag size={10} /> Flag for review
              </button>
              <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-2 rounded-lg justify-center"
                style={{ background: A.bg1, color: A.text2, border: `1px solid ${A.border}` }}>
                <Lock size={10} /> Add to legal hold
              </button>
              <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-2 rounded-lg justify-center"
                style={{ background: A.bg1, color: A.text2, border: `1px solid ${A.border}` }}>
                <FileText size={10} /> Export as PDF
              </button>
              <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-2 rounded-lg justify-center"
                style={{ background: A.tealBg, color: A.tealLight, border: `1px solid ${A.tealBorder}` }}>
                <Download size={10} /> Signed evidence pkg
              </button>
            </div>
          </div>
        )}

        {tab === 'Diff' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Field-level Changes</div>
              {entry.phiAccessed && (
                <button onClick={() => setPhiRevealed(r => !r)} className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg"
                  style={{ background: phiRevealed ? 'rgba(249,115,22,0.12)' : A.bg1, color: phiRevealed ? '#FB923C' : A.text3, border: `1px solid ${phiRevealed ? 'rgba(249,115,22,0.3)' : A.border}` }}>
                  {phiRevealed ? <EyeOff size={9} /> : <Eye size={9} />} {phiRevealed ? 'Hiding PHI' : 'Reveal PHI'}
                </button>
              )}
            </div>
            <DiffBlock entry={entry} phiRevealed={phiRevealed} />
          </div>
        )}

        {tab === 'Related' && <RelatedTimeline entry={entry} />}

        {tab === 'Chain' && (
          <div className="space-y-4">
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Entry Hash (SHA-256)</div>
              <div className="p-2.5 rounded-xl text-[10px] break-all flex items-start gap-2"
                style={{ background: A.bg1, border: `1px solid ${A.border}`, color: A.tealLight, fontFamily: 'DM Mono, monospace' }}>
                <span className="flex-1">{entry.entryHash}</span>
                <button onClick={() => navigator.clipboard?.writeText(entry.entryHash)} className="flex-shrink-0 mt-0.5">
                  <Copy size={10} style={{ color: A.text3 }} />
                </button>
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Previous Entry Hash</div>
              <div className="p-2.5 rounded-xl text-[10px] break-all" style={{ background: A.bg1, border: `1px solid ${A.border}`, color: A.text3, fontFamily: 'DM Mono, monospace' }}>
                {entry.prevHash}
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: A.successBg, border: `1px solid rgba(5,150,105,0.25)` }}>
              <Shield size={14} style={{ color: A.successLight }} />
              <div>
                <div className="text-xs font-semibold" style={{ color: A.successLight }}>Chain integrity verified</div>
                <div className="text-[10px] mt-0.5" style={{ color: A.text3 }}>Hash validated against previous entry · SHA-256 · WORM-locked</div>
              </div>
            </div>
            <button className="w-full text-[10px] py-2 rounded-lg flex items-center justify-center gap-1.5"
              style={{ background: A.tealBg, color: A.tealLight, border: `1px solid ${A.tealBorder}` }}>
              <Hash size={10} /> Recompute & verify this entry
            </button>
          </div>
        )}

        {tab === 'Compliance' && (
          <div className="space-y-4">
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>Applicable Regulations</div>
              <div className="flex flex-wrap gap-2">
                {['HIPAA', 'DHA', 'NABIDH', 'PDPL'].map(r => (
                  <span key={r} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: A.tealBg, color: A.tealLight, border: `1px solid ${A.tealBorder}` }}>{r}</span>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl space-y-2.5" style={{ background: A.bg1, border: `1px solid ${A.border}` }}>
              {[
                { label: 'Retention policy', value: '7 years (DHA minimum)' },
                { label: 'Minimum retention until', value: '2033-05-04' },
                { label: 'Deletion permitted', value: 'No — retention active' },
                { label: 'Legal hold', value: entry.legalHold || 'None active' },
                { label: 'Exportable', value: 'Yes — subject to redaction + permissions' },
                { label: 'PHI classification', value: entry.phiAccessed ? 'Contains PHI' : 'No PHI' },
              ].map(f => (
                <div key={f.label} className="flex justify-between text-[10px]">
                  <span style={{ color: A.text3 }}>{f.label}</span>
                  <span style={{ color: f.label === 'Legal hold' && entry.legalHold ? '#FCD34D' : A.text2 }}>{f.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 text-[10px] py-2 rounded-lg"
                style={{ background: A.bg1, color: A.text2, border: `1px solid ${A.border}` }}>
                <ChevronRight size={10} /> View retention policy
              </button>
            </div>
          </div>
        )}

        {tab === 'Notes' && (
          <div>
            <div className="p-3 rounded-xl mb-4 text-[10px]" style={{ background: A.bg1, border: `1px solid ${A.border}`, color: A.text3 }}>
              Notes are immutable once submitted. Corrections create new versioned entries. Requires <span style={{ color: A.tealLight }}>audit:annotate</span> permission.
            </div>
            {noteSubmitted ? (
              <div className="p-3 rounded-xl text-center text-[11px]" style={{ background: A.successBg, color: A.successLight }}>
                Note submitted and logged.
              </div>
            ) : (
              <>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs outline-none resize-none"
                  placeholder="Add an investigation note…"
                  rows={5}
                  style={{ background: A.bg1, border: `1px solid ${A.border}`, color: A.text1 }} />
                <button onClick={submitNote}
                  disabled={!note.trim()}
                  className="mt-2 w-full text-[10px] py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-40"
                  style={{ background: A.tealBg, color: A.tealLight, border: `1px solid ${A.tealBorder}` }}>
                  Submit Note (immutable)
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
