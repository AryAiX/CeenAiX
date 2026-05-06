import { AlertTriangle, ShieldOff, CheckCircle2, MessageSquare, FileText, RotateCcw } from 'lucide-react';
import { flaggedSuspendedDoctors } from '../../data/adminDoctorsData';

interface FlaggedSuspendedTabProps {
  showToast: (msg: string) => void;
}

export default function FlaggedSuspendedTab({ showToast }: FlaggedSuspendedTabProps) {
  const flagged = flaggedSuspendedDoctors.filter(d => d.status === 'flagged');
  const suspended = flaggedSuspendedDoctors.filter(d => d.status === 'suspended');

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl px-5 py-4 flex items-center gap-4" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)' }}>
          <AlertTriangle style={{ width: 22, height: 22, color: '#FB923C' }} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#FB923C', fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{flagged.length}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Flagged — account still active</div>
          </div>
        </div>
        <div className="rounded-xl px-5 py-4 flex items-center gap-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <ShieldOff style={{ width: 22, height: 22, color: '#EF4444' }} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444', fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{suspended.length}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Suspended — platform access blocked</div>
          </div>
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle style={{ width: 14, height: 14, color: '#FB923C' }} />
            <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 700, color: '#FB923C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Flagged ({flagged.length})
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {flagged.map(doc => (
              <CaseCard key={doc.id} doc={doc} showToast={showToast} />
            ))}
          </div>
        </div>
      )}

      {suspended.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldOff style={{ width: 14, height: 14, color: '#EF4444' }} />
            <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Suspended ({suspended.length})
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {suspended.map(doc => (
              <CaseCard key={doc.id} doc={doc} showToast={showToast} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CaseCard({ doc, showToast }: { doc: typeof flaggedSuspendedDoctors[0]; showToast: (msg: string) => void }) {
  const isFlagged = doc.status === 'flagged';
  const borderColor = isFlagged ? '#FB923C' : '#EF4444';
  const statusBg = isFlagged ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#1E293B',
        border: `1px solid ${borderColor}33`,
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: doc.avatarGradient, fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}
          >
            {doc.initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>{doc.name}</span>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 700, background: statusBg, color: borderColor }}
                  >
                    {isFlagged ? 'FLAGGED' : 'SUSPENDED'}
                  </span>
                  {!doc.accountActive && (
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', background: 'rgba(71,85,105,0.3)', color: '#94A3B8' }}
                    >
                      Access Blocked
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                  {doc.specialty} · {doc.clinic}
                </div>
              </div>
              {'daysSuspended' in doc && doc.daysSuspended !== undefined && (
                <div className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span style={{ fontSize: 11, color: '#FCA5A5', fontFamily: 'DM Mono, monospace' }}>
                    Suspended {doc.daysSuspended}d ago
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid #334155' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Reason — flagged by {doc.flaggedBy}
              </div>
              <div style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>{doc.reason}</div>
              <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
                {isFlagged ? 'Flagged' : 'Suspended'}: {doc.flaggedDate}
              </div>
            </div>

            {'complaints' in doc && Array.isArray(doc.complaints) && doc.complaints.length > 0 && (
              <div className="mt-3">
                <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Associated Complaints ({doc.complaints.length})
                </div>
                <div className="flex flex-col gap-2">
                  {doc.complaints.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}
                    >
                      <span style={{ fontSize: 12, color: '#FCD34D', fontFamily: 'Inter, sans-serif' }}>"{c.text}"</span>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono, monospace' }}>{c.patientId}</span>
                        <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{c.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {doc.adminNote && (
              <div className="mt-3 flex items-center gap-2">
                <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Admin Note:</span>
                <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{doc.adminNote}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgba(51,65,85,0.5)' }}>
          {isFlagged ? (
            <>
              <button
                onClick={() => showToast('🚫 Account suspended — access revoked')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'}
              >
                <ShieldOff style={{ width: 13, height: 13 }} />
                Escalate to Suspension
              </button>
              <button
                onClick={() => showToast('✅ Flag cleared — account restored to normal')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.2)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.1)'}
              >
                <CheckCircle2 style={{ width: 13, height: 13 }} />
                Clear Flag
              </button>
            </>
          ) : (
            <button
              onClick={() => showToast('🔄 Reinstatement initiated — doctor notified')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.2)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.1)'}
            >
              <RotateCcw style={{ width: 13, height: 13 }} />
              Reinstate Account
            </button>
          )}
          <button
            onClick={() => showToast('💬 Message sent to doctor')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#3D4F63'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
          >
            <MessageSquare style={{ width: 13, height: 13 }} />
            Message
          </button>
          <button
            onClick={() => showToast('📋 Investigation log opened')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#3D4F63'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
          >
            <FileText style={{ width: 13, height: 13 }} />
            View Investigation Log
          </button>
        </div>
      </div>
    </div>
  );
}
