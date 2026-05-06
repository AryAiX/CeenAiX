import React, { useState } from 'react';
import { SectionHeader, LockNote, Chip } from '../primitives';
import { AlertTriangle, Trash2, RotateCcw, KeyRound, X, Eye } from 'lucide-react';

interface DangerAction {
  id: string;
  title: string;
  desc: string;
  blastRadius: string[];
  icon: React.ElementType;
  level: 'critical' | 'extreme';
  available: boolean;
}

const actions: DangerAction[] = [
  {
    id: 'decommission',
    title: 'Decommission Environment',
    desc: 'Permanently decommission a Staging or Sandbox environment. Production decommission requires executive override.',
    blastRadius: [
      'All data in the environment is irreversibly destroyed after export window',
      'All active sessions in that environment are terminated immediately',
      'All connected workspaces lose access',
      'Cannot be undone after confirmation window',
    ],
    icon: Trash2,
    level: 'extreme',
    available: true,
  },
  {
    id: 'reset',
    title: 'Reset Platform Configuration to Baseline',
    desc: 'Reverts all non-regulatory settings to platform baseline. Regulatory minimums are preserved.',
    blastRadius: [
      'All custom branding, locale, and general settings reset',
      'Feature flags reset to default state',
      'Workspace tier limits reset to baseline',
      'Notification and template customizations lost',
      'Regulatory minimums (DHA, NABIDH, UAE PDPL) are NOT reset',
    ],
    icon: RotateCcw,
    level: 'critical',
    available: true,
  },
  {
    id: 'rotation',
    title: 'Initiate Platform-Wide Key Rotation',
    desc: 'Cascade rotation of all platform-level keys, secrets, certificates, and signing keys.',
    blastRadius: [
      'Active sessions may be invalidated depending on key types rotated',
      'Webhook signatures will change — connected systems must update',
      'Integration API keys rotated — workspace admins will be notified',
      'Estimated 15–30 minute elevated error rate during rotation',
    ],
    icon: KeyRound,
    level: 'critical',
    available: true,
  },
];

function DangerCard({ action }: { action: DangerAction }) {
  const [showBlast, setShowBlast] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const Icon = action.icon;

  const reset = () => { setConfirmStep(0); setConfirmText(''); setShowBlast(false); };

  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      style={{ background: '#1E293B', border: `1px solid ${action.level === 'extreme' ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}` }}
    >
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <Icon size={15} color="#EF4444" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white" style={{ fontSize: 13 }}>{action.title}</span>
                <Chip label={action.level === 'extreme' ? 'EXTREME RISK' : 'CRITICAL'} color="red" />
              </div>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>{action.desc}</p>
            </div>
          </div>
          <button
            onClick={() => setShowBlast(!showBlast)}
            className="flex items-center gap-1 text-xs flex-shrink-0 hover:opacity-80"
            style={{ color: '#64748B' }}
          >
            <Eye size={12} />
            Blast radius
          </button>
        </div>

        {showBlast && (
          <div className="mt-4 rounded-lg px-4 py-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={12} color="#EF4444" />
              <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>Blast radius</span>
            </div>
            <ul className="space-y-1">
              {action.blastRadius.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span style={{ color: '#EF4444', fontSize: 11, marginTop: 1 }}>·</span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        {confirmStep === 0 && (
          <button
            onClick={() => setConfirmStep(1)}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            {action.title}
          </button>
        )}

        {confirmStep === 1 && (
          <div className="space-y-3">
            <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 12, color: '#E2E8F0' }}>
                Type <strong style={{ fontFamily: 'DM Mono, monospace', color: '#EF4444' }}>CONFIRM</strong> to proceed. This action requires password re-entry and two-person approval.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM"
                className="mt-2 w-full rounded-lg px-3 py-2 text-xs"
                style={{ background: '#0F172A', border: '1px solid rgba(239,68,68,0.4)', color: '#E2E8F0', fontFamily: 'DM Mono, monospace' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={confirmText !== 'CONFIRM'}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-opacity"
                style={{
                  background: confirmText === 'CONFIRM' ? '#EF4444' : 'rgba(239,68,68,0.15)',
                  color: confirmText === 'CONFIRM' ? '#fff' : '#EF4444',
                  opacity: confirmText === 'CONFIRM' ? 1 : 0.5,
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                Proceed to approval
              </button>
              <button onClick={reset} className="px-4 py-2 rounded-lg text-xs font-medium hover:opacity-80" style={{ color: '#94A3B8', border: '1px solid rgba(51,65,85,0.5)' }}>
                <X size={12} className="inline mr-1" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DangerZoneSection() {
  return (
    <div>
      <div
        className="rounded-xl px-5 py-4 mb-6 flex items-start gap-3"
        style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}
        role="alert"
      >
        <AlertTriangle size={16} color="#EF4444" className="flex-shrink-0 mt-0.5" />
        <div>
          <div style={{ fontSize: 13, color: '#EF4444', fontWeight: 700, marginBottom: 3 }}>Danger Zone</div>
          <p style={{ fontSize: 12, color: '#94A3B8' }}>
            These actions are irreversible or carry significant operational and regulatory risk. All Danger Zone operations
            require multi-step confirmation, password re-entry, two-person approval, and write critical audit entries.
            Production Danger Zone actions are rate-limited and subject to active freeze-window checks.
          </p>
        </div>
      </div>

      <SectionHeader title="Danger Zone Actions" description="Each action shows a blast-radius preview before confirmation is possible." />

      {actions.map(a => <DangerCard key={a.id} action={a} />)}

      <LockNote text="All Danger Zone actions are immutably logged. Self-modification protections prevent admins from weakening their own audit trail." />
    </div>
  );
}
