import React, { useState, useRef, useEffect } from 'react';
import { X, Search, AlertTriangle, UserCheck, ChevronRight } from 'lucide-react';
import type { ImpersonationSession } from './ImpersonationBanner';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'Patient' | 'Doctor' | 'Pharmacy' | 'Lab/Radiology' | 'Insurance' | 'Admin';
  workspace: string;
  avatarColor: string;
}

const MOCK_USERS: MockUser[] = [
  { id: 'PT-001', name: 'Parnia Yazdkhasti', email: 'parnia@example.com', role: 'Patient', workspace: 'CeenAiX Production', avatarColor: '#0D9488' },
  { id: 'PT-006', name: 'Aisha Mohammed Al Reem', email: 'aisha@example.com', role: 'Patient', workspace: 'CeenAiX Production', avatarColor: '#0891B2' },
  { id: 'DR-001', name: 'Dr. Ahmed Al Rashidi', email: 'ahmed@alnoor.ae', role: 'Doctor', workspace: 'CeenAiX Production', avatarColor: '#059669' },
  { id: 'DR-002', name: 'Dr. Reem Al Suwaidi', email: 'reem@alnoor.ae', role: 'Doctor', workspace: 'CeenAiX Production', avatarColor: '#7C3AED' },
  { id: 'PH-001', name: 'Pharmacy Staff – Al Shifa', email: 'staff@alshifa.ae', role: 'Pharmacy', workspace: 'CeenAiX Production', avatarColor: '#D97706' },
  { id: 'LAB-001', name: 'Lab Tech – Dubai Medical', email: 'lab@dubaimedical.ae', role: 'Lab/Radiology', workspace: 'CeenAiX Production', avatarColor: '#DC2626' },
  { id: 'INS-001', name: 'Daman Claims Reviewer', email: 'claims@daman.ae', role: 'Insurance', workspace: 'CeenAiX Production', avatarColor: '#0369A1' },
];

const REASONS = [
  'Customer support ticket',
  'Bug investigation',
  'Onboarding assistance',
  'Compliance review',
  'Other',
];

const DURATIONS: { label: string; minutes: number }[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 },
];

const ROLE_COLORS: Record<string, string> = {
  Patient: '#0D9488',
  Doctor: '#0891B2',
  Pharmacy: '#D97706',
  'Lab/Radiology': '#DC2626',
  Insurance: '#0369A1',
  Admin: '#7C3AED',
};

interface Props {
  onClose: () => void;
  onStart: (session: ImpersonationSession) => void;
  isAlreadyImpersonating: boolean;
}

export default function ImpersonateUserModal({ onClose, onStart, isAlreadyImpersonating }: Props) {
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [reason, setReason] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [confirmed, setConfirmed] = useState(false);
  const [step, setStep] = useState<'search' | 'confirm'>('search');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const filtered = MOCK_USERS.filter(u =>
    !query ||
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase()) ||
    u.id.toLowerCase().includes(query.toLowerCase()) ||
    u.role.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20);

  const canProceed = selectedUser && reason && confirmed;

  const handleStart = () => {
    if (!selectedUser || !reason) return;
    const session: ImpersonationSession = {
      userId: selectedUser.id,
      userName: selectedUser.name,
      userRole: selectedUser.role,
      reason,
      referenceId,
      startedAt: new Date(),
      durationMinutes,
      sessionId: `IMP-${Date.now()}`,
      actorId: 'SUPER-ADMIN-001',
    };
    onStart(session);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)' }} />
      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col"
        style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.8)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Impersonate User"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(51,65,85,0.6)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
              <UserCheck className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
                Impersonate User
              </div>
              <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'DM Mono, monospace' }}>
                SUPER_ADMIN · users:impersonate
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(51,65,85,0.6)', color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.6)'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl flex items-start gap-3 flex-shrink-0" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
          <p style={{ fontSize: 11, color: '#FCD34D', lineHeight: 1.6 }}>
            All actions you take will be logged under your identity. PHI access during impersonation is fully audited and reviewable by compliance officers.
          </p>
        </div>

        {isAlreadyImpersonating ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
            <p className="text-center" style={{ color: '#94A3B8', fontSize: 13 }}>
              You are already impersonating a user. End the current session first.
            </p>
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl text-sm font-semibold" style={{ background: '#0D9488', color: '#fff' }}>
              Close
            </button>
          </div>
        ) : step === 'search' ? (
          <>
            {/* Search */}
            <div className="px-6 mt-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, email, role, or user ID…"
                  className="w-full rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none"
                  style={{
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(51,65,85,0.6)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 13,
                  }}
                  onKeyDown={e => e.key === 'Escape' && onClose()}
                />
              </div>
            </div>

            {/* User List */}
            <div className="mx-6 mt-3 rounded-xl overflow-hidden flex-1 min-h-0" style={{ border: '1px solid rgba(51,65,85,0.5)', maxHeight: 220, overflowY: 'auto' }}>
              {filtered.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-3 border-b transition-colors"
                  style={{ borderColor: 'rgba(51,65,85,0.3)', background: selectedUser?.id === user.id ? 'rgba(13,148,136,0.1)' : 'transparent' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: user.avatarColor }}
                  >
                    {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 500, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {user.name}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        style={{ background: `${ROLE_COLORS[user.role]}22`, color: ROLE_COLORS[user.role] }}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569', marginTop: 1 }}>
                      {user.id} · {user.email}
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedUser(user); setStep('confirm'); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
                    style={{ background: 'rgba(13,148,136,0.2)', color: '#5EEAD4' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(13,148,136,0.35)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(13,148,136,0.2)'; }}
                  >
                    Impersonate
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="py-6 text-center" style={{ color: '#475569', fontSize: 12 }}>
                  No users match "{query}"
                </div>
              )}
            </div>

            <div className="h-4 flex-shrink-0" />
          </>
        ) : selectedUser ? (
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {/* Selected user recap */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)' }}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: selectedUser.avatarColor }}
              >
                {selectedUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 600 }}>{selectedUser.name}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>{selectedUser.id}</div>
              </div>
              <button onClick={() => { setSelectedUser(null); setStep('search'); }} style={{ color: '#64748B', fontSize: 11 }}>
                Change
              </button>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#94A3B8' }}>
                Reason <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 focus:outline-none"
                style={{
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(51,65,85,0.6)',
                  color: reason ? '#E2E8F0' : '#475569',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 13,
                }}
              >
                <option value="" style={{ background: '#1E293B' }}>Select a reason…</option>
                {REASONS.map(r => <option key={r} value={r} style={{ background: '#1E293B' }}>{r}</option>)}
              </select>
            </div>

            {/* Reference ID */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#94A3B8' }}>
                Reference ID <span style={{ color: '#475569' }}>(ticket #, bug ID)</span>
              </label>
              <input
                value={referenceId}
                onChange={e => setReferenceId(e.target.value)}
                placeholder="TKT-12345"
                className="w-full rounded-xl px-3 py-2.5 focus:outline-none"
                style={{
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(51,65,85,0.6)',
                  color: '#E2E8F0',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 12,
                }}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#94A3B8' }}>Duration</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d.minutes}
                    onClick={() => setDurationMinutes(d.minutes)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: durationMinutes === d.minutes ? '#0D9488' : 'rgba(51,65,85,0.4)',
                      color: durationMinutes === d.minutes ? '#fff' : '#94A3B8',
                      border: `1px solid ${durationMinutes === d.minutes ? '#0D9488' : 'rgba(51,65,85,0.6)'}`,
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <div
                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                style={{ background: confirmed ? '#0D9488' : 'transparent', border: `2px solid ${confirmed ? '#0D9488' : '#475569'}` }}
                onClick={() => setConfirmed(p => !p)}
              >
                {confirmed && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <input type="checkbox" className="sr-only" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              <span style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>
                I confirm I have a legitimate business reason and understand all actions will be fully audited under my identity.
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3 pt-1 pb-2">
              <button
                onClick={() => { setStep('search'); setSelectedUser(null); }}
                className="flex-1 py-3 rounded-xl font-semibold transition-colors"
                style={{ background: 'rgba(51,65,85,0.6)', color: '#CBD5E1', fontSize: 13 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.9)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.6)'; }}
              >
                Back
              </button>
              <button
                onClick={handleStart}
                disabled={!canProceed}
                className="flex-1 py-3 rounded-xl font-semibold transition-all"
                style={{
                  background: canProceed ? '#F59E0B' : 'rgba(51,65,85,0.4)',
                  color: canProceed ? '#000' : '#475569',
                  fontSize: 13,
                  cursor: canProceed ? 'pointer' : 'not-allowed',
                }}
              >
                Start Impersonation
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
