import React, { useState, useEffect, useRef } from 'react';
import { Shield, Clock, X, ChevronRight, AlertTriangle } from 'lucide-react';

export interface ImpersonationSession {
  userId: string;
  userName: string;
  userRole: string;
  reason: string;
  referenceId: string;
  startedAt: Date;
  durationMinutes: number;
  sessionId: string;
  actorId: string;
}

interface Props {
  session: ImpersonationSession;
  onEnd: () => void;
  onExtend: () => void;
}

const AUDIT_TRAIL_MOCK = [
  { id: '1', action: 'Viewed patient profile', route: '/patient/dashboard', time: '0s ago' },
  { id: '2', action: 'Opened medical records', route: '/patient/health', time: '12s ago' },
];

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatRelative(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  return `${m}m ago`;
}

const ImpersonationBanner: React.FC<Props> = ({ session, onEnd, onExtend }) => {
  const [showAudit, setShowAudit] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [, forceUpdate] = useState(0);
  const announcedRef = useRef<Set<string>>(new Set());

  const expiryMs = session.startedAt.getTime() + session.durationMinutes * 60 * 1000;
  const remainingMs = expiryMs - Date.now();
  const warningSoon = remainingMs < 60 * 1000;

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
      const rem = expiryMs - Date.now();
      // announce at 5m, 1m, 30s
      for (const threshold of [5 * 60 * 1000, 60 * 1000, 30 * 1000]) {
        if (rem <= threshold && rem > threshold - 1000 && !announcedRef.current.has(String(threshold))) {
          announcedRef.current.add(String(threshold));
          // screen reader announcement would fire here
        }
      }
      if (rem <= 0) {
        onEnd();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryMs, onEnd]);

  return (
    <>
      {/* Live region for screen reader announcements */}
      <div role="alert" aria-live="assertive" className="sr-only">
        Impersonating {session.userName}, {session.userRole}. Session started {formatRelative(session.startedAt)}.
      </div>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: warningSoon
            ? 'linear-gradient(90deg, #7C2D12, #92400E)'
            : 'linear-gradient(90deg, #78350F, #92400E)',
          borderBottom: `2px solid ${warningSoon ? '#EF4444' : '#F59E0B'}`,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Shield className="w-4 h-4 flex-shrink-0" style={{ color: warningSoon ? '#FCA5A5' : '#FCD34D' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: warningSoon ? '#FCA5A5' : '#FDE68A', fontWeight: 600 }}>
            IMPERSONATING
          </span>
          <span style={{ fontSize: 12, color: '#FDE68A', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {session.userName}
          </span>
          <span
            className="px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(255,255,255,0.1)', fontSize: 10, color: '#FCD34D', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
          >
            {session.userRole}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(253,230,138,0.7)', fontFamily: 'Inter, sans-serif' }}>
            · started {formatRelative(session.startedAt)}
          </span>
          <div className="flex items-center gap-1 ml-1">
            <Clock className="w-3 h-3" style={{ color: warningSoon ? '#FCA5A5' : '#FCD34D' }} />
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: warningSoon ? '#FCA5A5' : '#FCD34D', fontWeight: 600 }}>
              ends in {formatDuration(remainingMs)}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowAudit(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#FDE68A', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          >
            View Audit Trail
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-colors"
            style={{ background: '#EF4444', color: '#fff', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#EF4444'; }}
          >
            End Impersonation
          </button>
        </div>
      </div>

      {/* Audit Trail Side Panel */}
      {showAudit && (
        <div
          className="fixed inset-0 z-[100] flex justify-end"
          style={{ paddingTop: 44 }}
          onClick={() => setShowAudit(false)}
        >
          <div
            className="w-80 h-full flex flex-col"
            style={{ background: '#0F172A', borderLeft: '1px solid rgba(51,65,85,0.8)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.6)' }}>
              <span className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>
                Impersonation Audit Trail
              </span>
              <button onClick={() => setShowAudit(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>
                SESSION {session.sessionId}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                Reason: {session.reason}
              </div>
              {session.referenceId && (
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B', marginTop: 1 }}>
                  Ref: {session.referenceId}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {AUDIT_TRAIL_MOCK.map(item => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#F59E0B' }} />
                  <div>
                    <div style={{ fontSize: 12, color: '#CBD5E1' }}>{item.action}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>{item.route}</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* End Confirm Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ paddingTop: 44 }}>
          <div className="absolute inset-0" style={{ background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowEndConfirm(false)} />
          <div
            className="relative rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.8)' }}
          >
            <div className="px-6 pt-6 pb-5">
              <div className="w-10 h-10 rounded-xl bg-red-900/30 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-bold text-white mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>
                End Impersonation Session?
              </h3>
              <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
                You will be returned to your Super Admin session. All actions taken will remain in the audit log.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold transition-colors"
                style={{ background: 'rgba(51,65,85,0.6)', color: '#CBD5E1', fontSize: 13 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.9)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.6)'; }}
              >
                Keep Session
              </button>
              <button
                onClick={() => { setShowEndConfirm(false); onEnd(); }}
                className="flex-1 py-2.5 rounded-xl font-semibold transition-colors"
                style={{ background: '#EF4444', color: '#fff', fontSize: 13 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#EF4444'; }}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend modal when warning soon */}
      {warningSoon && remainingMs > 0 && (
        <div
          className="fixed bottom-4 right-4 z-[200] rounded-xl shadow-2xl overflow-hidden"
          style={{ background: '#1E293B', border: '1px solid #F59E0B', width: 280 }}
        >
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span style={{ fontSize: 12, color: '#FCD34D', fontWeight: 600 }}>Session expiring soon</span>
            </div>
            <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>
              Impersonation ends in {formatDuration(remainingMs)}.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onEnd}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(51,65,85,0.6)', color: '#CBD5E1' }}
              >
                End Now
              </button>
              <button
                onClick={onExtend}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: '#F59E0B', color: '#000' }}
              >
                Extend
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImpersonationBanner;
