import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Clock, FileText, MessageSquare, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { pendingVerificationDoctors } from '../../data/adminDoctorsData';

interface VerificationQueueProps {
  onApprove: (doctorId: string, name: string) => void;
  onReject: (doctorId: string, name: string) => void;
  showToast: (msg: string) => void;
}

const DOC_LABELS: Record<string, string> = {
  emiratesId: 'Emirates ID',
  dhaLicense: 'DHA License',
  medicalDegree: 'Medical Degree',
  specialtyCert: 'Specialty Certificate',
  passport: 'Passport',
  photo: 'Professional Photo',
};

const DHA_STATUS = {
  found: { label: 'Found & Valid', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '✅' },
  'not-found': { label: 'Not Found in DHA', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: '❌' },
  checking: { label: 'Checking...', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '🔍' },
};

const READINESS_CONFIG = {
  ready: { label: 'Ready to Approve', color: '#10B981', bg: 'rgba(16,185,129,0.1)', borderColor: '#10B981' },
  incomplete: { label: 'Incomplete Documents', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', borderColor: '#F59E0B' },
  mismatch: { label: 'DHA Mismatch — Do Not Approve', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', borderColor: '#EF4444' },
};

export default function VerificationQueue({ onApprove, onReject, showToast }: VerificationQueueProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['pv1']));
  const [requestingInfo, setRequestingInfo] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState('');

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const readyCount = pendingVerificationDoctors.filter(d => d.readiness === 'ready').length;

  const handleBulkApprove = () => {
    showToast(`✅ ${readyCount} ready applications queued for approval`);
  };

  const handleRequestInfo = (id: string) => {
    if (requestingInfo === id && infoMsg.trim()) {
      showToast('📋 Info request sent to doctor');
      setRequestingInfo(null);
      setInfoMsg('');
    } else {
      setRequestingInfo(id);
      setInfoMsg('');
    }
  };

  return (
    <div>
      <div
        className="flex items-center justify-between px-5 py-3 rounded-xl mb-5"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 style={{ width: 18, height: 18, color: '#10B981' }} />
          <div>
            <span style={{ fontSize: 14, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F5F9' }}>
              {readyCount} application{readyCount !== 1 ? 's' : ''} ready to approve
            </span>
            <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginLeft: 8 }}>
              DHA verified · all documents complete
            </span>
          </div>
        </div>
        <button
          onClick={handleBulkApprove}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: '#0D9488', color: '#fff', border: 'none' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0F766E'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0D9488'}
        >
          <CheckCircle2 style={{ width: 14, height: 14 }} />
          Bulk Approve Ready
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {pendingVerificationDoctors.map(doc => {
          const isExp = expanded.has(doc.id);
          const rCfg = READINESS_CONFIG[doc.readiness as keyof typeof READINESS_CONFIG];
          const dhaCfg = DHA_STATUS[doc.dhaApiStatus];

          return (
            <div
              key={doc.id}
              className="rounded-2xl overflow-hidden"
              style={{
                background: '#1E293B',
                border: `1px solid ${rCfg.borderColor}33`,
                borderLeft: `4px solid ${rCfg.borderColor}`,
              }}
            >
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => toggleExpand(doc.id)}
              >
                <div
                  className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: doc.avatarGradient, fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}
                >
                  {doc.initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>{doc.name}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{doc.dhaLicense}</span>
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: rCfg.bg, color: rCfg.color }}
                    >
                      {rCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                      {doc.specialty} · {doc.clinic}
                    </span>
                    <span className="flex items-center gap-1" style={{ fontSize: 11, color: doc.waitingColor, fontFamily: 'DM Mono, monospace' }}>
                      <Clock style={{ width: 10, height: 10 }} />
                      Waiting {doc.waitingTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{ background: dhaCfg.bg, border: `1px solid ${dhaCfg.color}33` }}
                  >
                    {doc.dhaApiStatus === 'checking' ? (
                      <Loader2 style={{ width: 12, height: 12, color: dhaCfg.color }} className="animate-spin" />
                    ) : (
                      <span style={{ fontSize: 12 }}>{dhaCfg.icon}</span>
                    )}
                    <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: dhaCfg.color }}>
                      DHA: {dhaCfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-28 h-1.5 rounded-full overflow-hidden"
                      style={{ background: '#334155' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(doc.docsComplete / doc.docsTotal) * 100}%`,
                          background: rCfg.borderColor,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'DM Mono, monospace' }}>
                      {doc.docsComplete}/{doc.docsTotal}
                    </span>
                  </div>

                  {isExp ? (
                    <ChevronUp style={{ width: 16, height: 16, color: '#475569' }} />
                  ) : (
                    <ChevronDown style={{ width: 16, height: 16, color: '#475569' }} />
                  )}
                </div>
              </div>

              {isExp && (
                <div
                  className="px-5 pb-5"
                  style={{ borderTop: '1px solid rgba(51,65,85,0.5)' }}
                >
                  <div className="pt-4 grid grid-cols-2 gap-6">
                    <div>
                      <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                        Document Checklist
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(doc.docs).map(([key, ok]) => (
                          <div
                            key={key}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                            style={{
                              background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              border: `1px solid ${ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            }}
                          >
                            {ok ? (
                              <CheckCircle2 style={{ width: 12, height: 12, color: '#10B981', flexShrink: 0 }} />
                            ) : (
                              <XCircle style={{ width: 12, height: 12, color: '#EF4444', flexShrink: 0 }} />
                            )}
                            <span style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: ok ? '#6EE7B7' : '#FCA5A5' }}>
                              {DOC_LABELS[key]}
                            </span>
                          </div>
                        ))}
                      </div>

                      {doc.applicationNote ? (
                        <div
                          className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg"
                          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                        >
                          <AlertTriangle style={{ width: 13, height: 13, color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 12, color: '#FCD34D', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                            {doc.applicationNote}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                        DHA Verification
                      </div>
                      <div
                        className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: dhaCfg.bg, border: `1px solid ${dhaCfg.color}33` }}
                      >
                        <span style={{ fontSize: 20, lineHeight: 1 }}>{dhaCfg.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: dhaCfg.color, fontFamily: 'Inter, sans-serif' }}>
                            {dhaCfg.label}
                          </div>
                          {doc.dhaApiStatus === 'found' && (
                            <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                              License {doc.dhaLicense} verified in DHA HAAD registry
                            </div>
                          )}
                          {doc.dhaApiStatus === 'not-found' && (
                            <div style={{ fontSize: 12, color: '#FCA5A5', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                              No match found. Doctor must resubmit with correct license number.
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', marginTop: 8 }}>
                        Submitted: <span style={{ color: '#94A3B8' }}>{doc.submittedDate}</span>
                      </div>
                    </div>
                  </div>

                  {requestingInfo === doc.id && (
                    <div className="mt-4">
                      <textarea
                        value={infoMsg}
                        onChange={e => setInfoMsg(e.target.value)}
                        placeholder="Describe what information or documents are required..."
                        className="w-full rounded-xl px-4 py-3 resize-none"
                        rows={3}
                        style={{
                          background: '#0F172A', border: '1px solid #334155',
                          color: '#F1F5F9', fontSize: 13, fontFamily: 'Inter, sans-serif',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-4">
                    {doc.readiness !== 'mismatch' && (
                      <button
                        onClick={() => onApprove(doc.id, doc.name)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                        style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: '#0D9488', color: '#fff', border: 'none' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0F766E'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0D9488'}
                      >
                        <CheckCircle2 style={{ width: 14, height: 14 }} />
                        Approve & Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleRequestInfo(doc.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                      style={{
                        fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                        background: requestingInfo === doc.id && infoMsg.trim() ? '#2563EB' : '#334155',
                        color: requestingInfo === doc.id && infoMsg.trim() ? '#fff' : '#CBD5E1',
                        border: '1px solid #475569',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                    >
                      <FileText style={{ width: 14, height: 14 }} />
                      {requestingInfo === doc.id && infoMsg.trim() ? 'Send Request' : 'Request More Info'}
                    </button>
                    <button
                      onClick={() => onReject(doc.id, doc.name)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                      style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'}
                    >
                      <XCircle style={{ width: 14, height: 14 }} />
                      Reject Application
                    </button>
                    <button
                      onClick={() => showToast('💬 Message sent to doctor')}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ml-auto"
                      style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                    >
                      <MessageSquare style={{ width: 13, height: 13 }} />
                      Message
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
