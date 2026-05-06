import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Lock, LogOut, Fingerprint, AlertCircle, X } from 'lucide-react';
import { SUPER_ADMIN_USER, PLATFORM_INFO } from '../../data/superAdminData';

interface Props {
  lockedAt: Date;
  onUnlock: (password: string) => 'success' | 'fail' | 'expired';
  onDismiss: () => void;
  onSignOut: () => void;
  impersonationExpiredWhileLocked?: boolean;
}

const CORRECT_PASSWORD = 'admin123'; // demo only

export default function LockScreenOverlay({ lockedAt, onUnlock, onDismiss, onSignOut, impersonationExpiredWhileLocked }: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const lockedDuration = Math.floor((now - lockedAt.getTime()) / 1000);
  const lockedStr = lockedDuration < 60
    ? `${lockedDuration}s ago`
    : `${Math.floor(lockedDuration / 60)}m ago`;

  const currentTime = new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const handleUnlock = () => {
    if (!password) return;
    const result = onUnlock(password);
    if (result === 'success') {
      setError('');
    } else if (result === 'expired') {
      setError('Session expired — please sign in again.');
    } else {
      const newCount = failCount + 1;
      setFailCount(newCount);
      if (newCount >= 5) {
        onSignOut();
      } else {
        setError(`Incorrect password. ${5 - newCount} attempt${5 - newCount !== 1 ? 's' : ''} remaining.`);
      }
    }
    setPassword('');
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(20px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Screen locked. Enter your password to continue."
    >
      {/* Screen reader announcement */}
      <div role="alert" aria-live="assertive" className="sr-only">
        Screen locked. Enter your password to continue.
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden flex flex-col items-center"
        style={{
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(51,65,85,0.8)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Top accent */}
        <div className="w-full h-1" style={{ background: 'linear-gradient(90deg, #0D9488, #0891B2)' }} />

        <div className="px-8 py-8 w-full flex flex-col items-center relative">
          <button
            onClick={onDismiss}
            className="absolute top-0 right-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: '#475569' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.5)'; e.currentTarget.style.color = '#94A3B8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
            title="Dismiss lock screen"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Lock icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)' }}
          >
            <Lock className="w-7 h-7" style={{ color: '#0D9488' }} />
          </div>

          {/* Avatar + Name */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg mb-3"
            style={{ background: 'linear-gradient(135deg, #0D9488, #0891B2)' }}
          >
            {SUPER_ADMIN_USER.initials}
          </div>
          <div
            className="font-bold text-white text-center mb-1"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 17 }}
          >
            {SUPER_ADMIN_USER.name}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>
            {SUPER_ADMIN_USER.email}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569', marginBottom: 20 }}>
            {PLATFORM_INFO.name} · {SUPER_ADMIN_USER.role}
          </div>

          {/* Impersonation expired notice */}
          {impersonationExpiredWhileLocked && (
            <div
              className="w-full flex items-start gap-2 px-3 py-2 rounded-xl mb-4"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
              <p style={{ fontSize: 11, color: '#FCD34D', lineHeight: 1.5 }}>
                Your impersonation session ended while locked.
              </p>
            </div>
          )}

          {/* Password input */}
          <div className="relative w-full mb-3">
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="Enter password"
              autoComplete="current-password"
              className="w-full rounded-xl px-4 py-3 pr-12 text-white focus:outline-none"
              style={{
                background: 'rgba(30,41,59,0.8)',
                border: error ? '1px solid #EF4444' : '1px solid rgba(51,65,85,0.6)',
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: '#475569' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#475569'; }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="w-full flex items-center gap-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#EF4444' }} />
              <span style={{ fontSize: 11, color: '#FCA5A5' }}>{error}</span>
            </div>
          )}

          {/* Unlock button */}
          <button
            onClick={handleUnlock}
            disabled={!password}
            className="w-full py-3 rounded-xl font-semibold transition-all mb-3"
            style={{
              background: password ? 'linear-gradient(135deg, #0D9488, #0891B2)' : 'rgba(51,65,85,0.4)',
              color: password ? '#fff' : '#475569',
              fontSize: 14,
              cursor: password ? 'pointer' : 'not-allowed',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            Unlock
          </button>

          {/* Biometric (placeholder) */}
          <button
            onClick={() => setError('Biometric not configured for this session.')}
            className="flex items-center gap-2 py-2 px-4 rounded-xl w-full justify-center mb-5 transition-colors"
            style={{ background: 'rgba(51,65,85,0.3)', color: '#94A3B8', fontSize: 12 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.3)'; }}
          >
            <Fingerprint className="w-4 h-4" />
            Use biometric
          </button>

          {/* Sign in as different user */}
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 text-xs transition-colors"
            style={{ color: '#475569' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#475569'; }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign in as a different user
          </button>
        </div>

        {/* Footer */}
        <div
          className="w-full flex items-center justify-between px-6 py-3"
          style={{ background: 'rgba(15,23,42,0.6)', borderTop: '1px solid rgba(51,65,85,0.3)' }}
        >
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#334155' }}>
            {currentTime}
          </span>
          <span style={{ fontSize: 11, color: '#334155', fontFamily: 'Inter, sans-serif' }}>
            Locked {lockedStr}
          </span>
        </div>
      </div>
    </div>
  );
}
