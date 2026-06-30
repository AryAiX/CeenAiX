import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Brain,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileCheck,
  FileText,
  Filter,
  LayoutGrid,
  LayoutList,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  Stethoscope,
  User,
  XCircle,
  X,
} from 'lucide-react';
import {
  approvePreAuthorization,
  bulkApprovePreAuthorizations,
  denyPreAuthorization,
  requestPreAuthInfo,
} from '../../hooks';
import type { InsurancePreAuthorization } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import InsuranceShell, {
  PreAuthAlert,
  formatCurrency,
  useInsurancePageData,
} from './InsuranceShell';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const slaRemainingMins = (slaDueAt: string) =>
  Math.round((new Date(slaDueAt).getTime() - Date.now()) / 60_000);

const priorityDisplay = (p: InsurancePreAuthorization): 'OVERDUE' | 'URGENT' | 'STANDARD' => {
  if (p.status === 'overdue') return 'OVERDUE';
  if (p.priority === 'urgent') return 'URGENT';
  return 'STANDARD';
};

const aiRecUpper = (rec: string | null): 'APPROVE' | 'DENY' | 'REVIEW' => {
  if (rec === 'approve') return 'APPROVE';
  if (rec === 'deny') return 'DENY';
  return 'REVIEW';
};

const parseCoverage = (label: string | null): number => {
  if (!label) return 0;
  if (label.toLowerCase().includes('not')) return 0;
  const m = label.match(/(\d+)/);
  return m ? parseInt(m[1]) : 80;
};

const PRIORITY_ORDER: Record<string, number> = { OVERDUE: 0, URGENT: 1, STANDARD: 2 };

const priorityAccent: Record<string, string> = {
  OVERDUE: '#DC2626', URGENT: '#D97706', STANDARD: '#64748B',
};

const aiColors: Record<string, { bg: string; color: string; border: string; label: string }> = {
  APPROVE: { bg: '#DCFCE7', color: '#065F46', border: '#86EFAC', label: '✓ Approve' },
  DENY:    { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: '✗ Deny'    },
  REVIEW:  { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: '⚠ Review'  },
};

const planColors: Record<string, { bg: string; color: string }> = {
  Gold:   { bg: '#FEF9C3', color: '#713F12' },
  Silver: { bg: '#F1F5F9', color: '#334155' },
  Basic:  { bg: '#EFF6FF', color: '#1E40AF' },
  Thiqa:  { bg: '#F3E8FF', color: '#581C87' },
};

const getPlanColor = (label: string | null) =>
  planColors[label ?? ''] ?? { bg: '#F8FAFC', color: '#475569' };

const DENY_REASONS = [
  'Not clinically indicated',
  'Excluded benefit under plan',
  'Step-therapy not completed',
  'Missing required documentation',
  'Experimental / investigational procedure',
  'Duplicate request',
  'Other',
];

const INFO_ITEMS = [
  'Echocardiography report',
  'Stress test / nuclear imaging',
  'Previous imaging (CT/MRI)',
  'Specialist referral letter',
  'Lab results (HbA1c, CBC, LFT)',
  'Conservative care documentation',
  'Surgical risk assessment',
  'STS risk score',
];

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'success' | 'warning' | 'info' }

const TOAST_COLORS: Record<Toast['type'], { border: string; color: string; bg: string }> = {
  success: { border: '#6EE7B7', color: '#065F46', bg: '#F0FDF4' },
  warning: { border: '#FCA5A5', color: '#991B1B', bg: '#FFF5F5' },
  info:    { border: '#93C5FD', color: '#1E40AF', bg: '#EFF6FF' },
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard = ({
  label, value, sub, accent, icon,
}: {
  label: string; value: string | number; sub?: string;
  accent: string; icon: React.ReactNode;
}) => (
  <div
    className="rounded-xl flex items-center gap-3"
    style={{ background: '#fff', border: '1px solid #E2E8F0', borderLeft: `3px solid ${accent}`, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
  >
    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: accent + '18' }}>
      {icon}
    </div>
    <div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: accent, fontWeight: 600, marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

// ─── SLA Chip ─────────────────────────────────────────────────────────────────

const SlaChip = ({ mins, slaHours }: { mins: number; slaHours: number }) => {
  const isOverdue = mins < 0;
  const pct = isOverdue ? 0 : Math.min(100, (mins / (slaHours * 60)) * 100);
  const color = isOverdue ? '#DC2626' : pct < 20 ? '#D97706' : '#059669';
  const absH = Math.abs(Math.floor(mins / 60));
  const absM = Math.abs(mins % 60);
  return (
    <div style={{ minWidth: 80 }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color, marginBottom: 3 }}>
        {isOverdue ? `+${absH}h ${absM}m` : `${absH}h ${absM}m`}
      </div>
      <div className="rounded-full" style={{ height: 3, background: '#F1F5F9', width: 72 }}>
        <div className="rounded-full" style={{ height: 3, width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
};

// ─── Bulk Approve Modal ───────────────────────────────────────────────────────

const BulkApproveModal = ({
  candidates, onClose, onConfirm,
}: {
  candidates: InsurancePreAuthorization[];
  onClose: () => void;
  onConfirm: (ids: string[]) => Promise<void>;
}) => {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(candidates.filter(c => c.aiRecommendation === 'approve').map(c => c.id)),
  );
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelected(prev => prev.size === candidates.length ? new Set() : new Set(candidates.map(c => c.id)));

  const handleConfirm = async () => {
    setSubmitting(true);
    try { await onConfirm(Array.from(selected)); }
    finally { setSubmitting(false); }
  };

  const totalLiability = candidates
    .filter(c => selected.has(c.id))
    .reduce((s, c) => s + c.requestedAmountAed, 0);

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl overflow-hidden flex flex-col"
        style={{ width: 620, maxHeight: '85vh', background: '#fff', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '18px 22px', background: '#0F172A', borderBottom: '1px solid #1E293B' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#059669' }}>
              <CheckCircle2 style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Bulk Approve Pre-Authorizations</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                {candidates.length} AI-recommended approvals pending
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Warning */}
        <div className="flex-shrink-0 flex items-start gap-2.5 mx-5 mt-4 rounded-lg p-3"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <AlertTriangle style={{ width: 14, height: 14, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>
            Bulk approval applies your authorization to all selected requests simultaneously.
            Review each case before confirming. All decisions are final and audited per DHA guidelines.
          </p>
        </div>

        {/* Select all bar */}
        <div className="flex items-center justify-between flex-shrink-0 mx-5 mt-3 rounded-lg px-3 py-2"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selected.size === candidates.length} onChange={toggleAll}
              style={{ accentColor: '#059669' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Select all ({candidates.length})</span>
          </label>
          <div className="flex items-center gap-1.5">
            <Brain style={{ width: 11, height: 11, color: '#059669' }} />
            <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
              {candidates.filter(c => c.aiRecommendation === 'approve').length} AI-recommended
            </span>
          </div>
        </div>

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto mx-5 mt-2 space-y-1.5">
          {candidates.map(pa => {
            const isSelected = selected.has(pa.id);
            const isAiApprove = pa.aiRecommendation === 'approve';
            const conf = pa.aiConfidencePercent;
            return (
              <label key={pa.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors"
                style={{ background: isSelected ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${isSelected ? '#86EFAC' : '#E2E8F0'}` }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggle(pa.id)}
                  style={{ accentColor: '#059669', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{pa.externalRef}</span>
                    {isAiApprove && conf != null && (
                      <span className="rounded px-1.5 py-0.5" style={{ background: '#DCFCE7', color: '#065F46', fontSize: 10, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
                        AI {conf}%
                      </span>
                    )}
                    {!isAiApprove && (
                      <span className="rounded px-1.5 py-0.5" style={{ background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
                        AI REVIEW
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>
                    {pa.patientName} · {pa.procedureName}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#059669' }}>
                    {formatCurrency(pa.requestedAmountAed)}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Note */}
        <div className="flex-shrink-0 mx-5 mt-3">
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            placeholder="Optional bulk approval note..."
            className="w-full rounded-lg px-3 py-2 resize-none outline-none"
            style={{ fontSize: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '14px 22px', borderTop: '1px solid #F1F5F9', marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{selected.size} selected · Total liability:</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              {formatCurrency(totalLiability)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 transition-colors"
              style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 600 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}>
              Cancel
            </button>
            <button onClick={() => void handleConfirm()} disabled={selected.size === 0 || submitting}
              className="flex items-center gap-2 rounded-lg px-5 py-2 transition-colors"
              style={{ background: selected.size === 0 || submitting ? '#94A3B8' : '#059669', color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              {submitting ? 'Approving...' : `Approve ${selected.size}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Pre-Auth Detail Panel ────────────────────────────────────────────────────

type DecisionMode = 'none' | 'approve' | 'deny' | 'info';

const PreAuthDetailPanel = ({
  pa, onClose, onApproved, onDenied, onInfoRequested,
}: {
  pa: InsurancePreAuthorization;
  onClose: () => void;
  onApproved: () => void;
  onDenied: (id: string) => void;
  onInfoRequested: () => void;
}) => {
  const [mode, setMode]               = useState<DecisionMode>('none');
  const [validity, setValidity]       = useState('30');
  const [approveNote, setApproveNote] = useState('');
  const [denyReason, setDenyReason]   = useState(DENY_REASONS[0]);
  const [denyNote, setDenyNote]       = useState('');
  const [infoItems, setInfoItems]     = useState<string[]>([]);
  const [infoNote, setInfoNote]       = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState<'approved' | 'denied' | 'info' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const changeMode = (next: DecisionMode) => {
    setActionError(null);
    setMode(next);
  };

  const ai      = aiColors[aiRecUpper(pa.aiRecommendation)];
  const slaHrs  = pa.priority === 'urgent' || pa.status === 'overdue' ? 4 : 8;
  const slaMins = slaRemainingMins(pa.slaDueAt);
  const covPct  = parseCoverage(pa.coverageLabel);
  const accent  = priorityAccent[priorityDisplay(pa)];

  const toggleInfo = (item: string) =>
    setInfoItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);

  const handleApprove = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await approvePreAuthorization(
        pa.id,
        pa.requestedAmountAed,
        approveNote.trim() || null,
        parseInt(validity, 10),
      );
      setSuccess('approved');
      setTimeout(() => { onApproved(); onClose(); }, 1400);
    } catch (err) {
      setSubmitting(false);
      setActionError(err instanceof Error ? err.message : 'Approval failed. Please try again.');
    }
  };

  const handleDeny = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await denyPreAuthorization(pa.id, denyReason, denyNote.trim() || null);
      setSuccess('denied');
      setTimeout(() => { onDenied(pa.id); onClose(); }, 1200);
    } catch (err) {
      setSubmitting(false);
      setActionError(err instanceof Error ? err.message : 'Denial failed. Please try again.');
    }
  };

  const handleInfoRequest = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await requestPreAuthInfo(pa.id, infoItems, infoNote.trim() || null);
      setSuccess('info');
      onInfoRequested();
    } catch (err) {
      setSubmitting(false);
      setActionError(err instanceof Error ? err.message : 'Info request failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full"
      style={{ width: 680, background: '#fff', borderLeft: '1px solid #E2E8F0', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0"
        style={{ padding: '18px 22px 16px', borderBottom: '1px solid #E2E8F0', background: '#0F172A' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>
              {pa.externalRef}
            </span>
            {pa.planLabel && (
              <span className="rounded px-2 py-0.5"
                style={{ ...getPlanColor(pa.planLabel), fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
                {pa.planLabel}
              </span>
            )}
            <span className="rounded px-2 py-0.5"
              style={{ fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono, monospace', background: accent + '22', color: accent }}>
              {priorityDisplay(pa)}
            </span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{pa.procedureName}</div>
          {pa.procedureIcdCode && (
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{pa.procedureIcdCode}</div>
          )}
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 flex-shrink-0 transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}>
          <X style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '18px 22px' }}>

        {/* SLA + AI row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex justify-between mb-1">
              <span style={{ fontSize: 11, color: '#94A3B8' }}>SLA remaining</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: slaMins < 0 ? '#DC2626' : slaMins < 120 ? '#D97706' : '#059669' }}>
                {slaMins < 0 ? `+${Math.abs(Math.floor(slaMins / 60))}h overdue` : `${Math.floor(slaMins / 60)}h ${Math.abs(slaMins % 60)}m left`}
              </span>
            </div>
            <div className="w-full rounded-full" style={{ height: 5, background: '#F1F5F9' }}>
              <div className="rounded-full" style={{
                height: 5,
                width: `${slaMins < 0 ? 0 : Math.min(100, (slaMins / (slaHrs * 60)) * 100)}%`,
                background: slaMins < 0 ? '#DC2626' : slaMins < 120 ? '#D97706' : '#059669',
              }} />
            </div>
          </div>
          <div className="rounded-lg p-3 flex items-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{ background: ai.bg, border: `1px solid ${ai.border}`, color: ai.color, fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700 }}>
              <Brain style={{ width: 11, height: 11 }} />
              AI: {aiRecUpper(pa.aiRecommendation)} · {pa.aiConfidencePercent ?? '—'}%
            </span>
          </div>
        </div>

        {/* Patient + Provider */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <User style={{ width: 12, height: 12, color: '#2563EB' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{pa.patientName}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              {pa.patientGender ? (pa.patientGender.toLowerCase() === 'm' ? 'Male' : 'Female') : '—'}
              {pa.patientAge != null ? `, ${pa.patientAge} yrs` : ''}
            </div>
            {pa.planLabel && (
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                Daman {pa.planLabel}
              </div>
            )}
          </div>
          <div className="rounded-lg p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Stethoscope style={{ width: 12, height: 12, color: '#0D9488' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provider</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{pa.clinicianName}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>{pa.providerName}</div>
            {pa.isCeenaixEprescribed && (
              <div style={{ fontSize: 10, color: '#059669', marginTop: 2, fontWeight: 600 }}>CeenAiX ✅ e-prescribed</div>
            )}
          </div>
        </div>

        {/* Financials */}
        <div className="rounded-lg p-3 mb-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financials</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>Requested</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                {formatCurrency(pa.requestedAmountAed)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>Coverage</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 800, color: covPct > 0 ? '#059669' : '#DC2626' }}>
                {pa.coverageLabel ?? (covPct > 0 ? `${covPct}%` : 'Not covered')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>Insurance Liability</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 800, color: '#2563EB' }}>
                {formatCurrency(Math.round(pa.requestedAmountAed * covPct / 100))}
              </div>
            </div>
          </div>
        </div>

        {/* Decision section */}
        {success === 'approved' && (
          <div className="rounded-xl p-6 text-center" style={{ background: '#ECFDF5', border: '1px solid #6EE7B7' }}>
            <p className="text-4xl mb-2">✅</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#065F46' }}>Pre-authorization approved!</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Doctor and patient notified via CeenAiX</p>
          </div>
        )}
        {success === 'denied' && (
          <div className="rounded-xl p-6 text-center" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <p className="text-4xl mb-2">❌</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>Pre-authorization denied</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Denial letter queued per DHA regulations</p>
          </div>
        )}
        {success === 'info' && (
          <div className="rounded-xl p-6 text-center" style={{ background: '#EFF6FF', border: '1px solid #93C5FD' }}>
            <MessageSquare style={{ width: 22, height: 22, color: '#2563EB', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1E40AF' }}>Information Request Sent</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{pa.clinicianName} notified via CeenAiX · SLA paused</p>
          </div>
        )}

        {!success && mode === 'none' && (
          <div className="flex gap-2">
            <button onClick={() => changeMode('approve')}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 transition-colors"
              style={{ background: '#059669', color: '#fff', fontSize: 13, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#047857'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#059669'; }}>
              <CheckCircle2 style={{ width: 15, height: 15 }} /> Approve
            </button>
            <button onClick={() => changeMode('deny')}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 transition-colors"
              style={{ background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#B91C1C'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; }}>
              <XCircle style={{ width: 15, height: 15 }} /> Deny
            </button>
            <button onClick={() => changeMode('info')}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 transition-colors"
              style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 600 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}>
              <MessageSquare style={{ width: 15, height: 15 }} /> Request Info
            </button>
          </div>
        )}

        {!success && mode === 'approve' && (
          <div className="rounded-xl p-4" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 style={{ width: 14, height: 14, color: '#059669' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>Approve Pre-Authorization</span>
              </div>
              <button onClick={() => changeMode('none')} style={{ fontSize: 11, color: '#94A3B8' }}>Cancel</button>
            </div>
            <div className="mb-3">
              <label style={{ fontSize: 11, color: '#065F46', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Authorization Validity (days)
              </label>
              <select value={validity} onChange={e => setValidity(e.target.value)}
                className="w-full rounded-lg px-3 py-2 outline-none"
                style={{ fontSize: 12, background: '#fff', border: '1px solid #86EFAC', color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>
                {['7','14','30','60','90','180'].map(v => <option key={v} value={v}>{v} days</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label style={{ fontSize: 11, color: '#065F46', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Approval Note (optional)
              </label>
              <textarea value={approveNote} onChange={e => setApproveNote(e.target.value)} rows={3}
                placeholder="Add clinical approval notes..."
                className="w-full rounded-lg px-3 py-2 resize-none outline-none"
                style={{ fontSize: 12, background: '#fff', border: '1px solid #86EFAC', color: '#0F172A' }} />
            </div>
            {actionError && mode === 'approve' && (
              <div className="rounded-lg px-3 py-2 mb-2" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', fontSize: 12, color: '#991B1B' }}>
                {actionError}
              </div>
            )}
            <button onClick={() => void handleApprove()} disabled={submitting}
              className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
              style={{ background: submitting ? '#94A3B8' : '#059669', color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              {submitting ? 'Processing...' : 'Confirm Approval'}
            </button>
          </div>
        )}

        {!success && mode === 'deny' && (
          <div className="rounded-xl p-4" style={{ background: '#FFF5F5', border: '1px solid #FCA5A5' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <XCircle style={{ width: 14, height: 14, color: '#DC2626' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>Deny Pre-Authorization</span>
              </div>
              <button onClick={() => changeMode('none')} style={{ fontSize: 11, color: '#94A3B8' }}>Cancel</button>
            </div>
            <div className="mb-3">
              <label style={{ fontSize: 11, color: '#991B1B', fontWeight: 600, display: 'block', marginBottom: 4 }}>Denial Reason</label>
              <div className="relative">
                <select value={denyReason} onChange={e => setDenyReason(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 outline-none appearance-none pr-8"
                  style={{ fontSize: 12, background: '#fff', border: '1px solid #FCA5A5', color: '#0F172A' }}>
                  {DENY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>
            <div className="mb-3">
              <label style={{ fontSize: 11, color: '#991B1B', fontWeight: 600, display: 'block', marginBottom: 4 }}>Additional Notes</label>
              <textarea value={denyNote} onChange={e => setDenyNote(e.target.value)} rows={3}
                placeholder="Clinical rationale for denial..."
                className="w-full rounded-lg px-3 py-2 resize-none outline-none"
                style={{ fontSize: 12, background: '#fff', border: '1px solid #FCA5A5', color: '#0F172A' }} />
            </div>
            <div className="rounded-lg p-2.5 mb-3 flex items-start gap-2" style={{ background: '#FEE2E2' }}>
              <AlertTriangle style={{ width: 12, height: 12, color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: '#991B1B' }}>
                A denial letter will be automatically generated and sent to the provider and patient.
              </span>
            </div>
            {actionError && mode === 'deny' && (
              <div className="rounded-lg px-3 py-2 mb-2" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', fontSize: 12, color: '#991B1B' }}>
                {actionError}
              </div>
            )}
            <button onClick={() => void handleDeny()} disabled={submitting}
              className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
              style={{ background: submitting ? '#94A3B8' : '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <XCircle style={{ width: 14, height: 14 }} />
              {submitting ? 'Processing...' : 'Confirm Denial'}
            </button>
          </div>
        )}

        {!success && mode === 'info' && (
          <div className="rounded-xl p-4" style={{ background: '#EFF6FF', border: '1px solid #93C5FD' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare style={{ width: 14, height: 14, color: '#2563EB' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>Request Additional Information</span>
              </div>
              <button onClick={() => changeMode('none')} style={{ fontSize: 11, color: '#94A3B8' }}>Cancel</button>
            </div>
            <div className="mb-3">
              <label style={{ fontSize: 11, color: '#1E40AF', fontWeight: 600, display: 'block', marginBottom: 6 }}>Documents required</label>
              <div className="space-y-1.5">
                {INFO_ITEMS.map(item => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={infoItems.includes(item)} onChange={() => toggleInfo(item)}
                      className="rounded" style={{ accentColor: '#2563EB' }} />
                    <span style={{ fontSize: 12, color: '#334155' }}>{item}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <textarea value={infoNote} onChange={e => setInfoNote(e.target.value)} rows={2}
                placeholder="Additional instructions to the provider..."
                className="w-full rounded-lg px-3 py-2 resize-none outline-none"
                style={{ fontSize: 12, background: '#fff', border: '1px solid #93C5FD', color: '#0F172A' }} />
            </div>
            <div className="rounded-lg px-3 py-2 mb-3 flex items-center gap-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <span style={{ fontSize: 11, color: '#92400E' }}>SLA clock paused while awaiting information per DHA protocol</span>
            </div>
            {actionError && mode === 'info' && (
              <div className="rounded-lg px-3 py-2 mb-2" style={{ background: '#DBEAFE', border: '1px solid #93C5FD', fontSize: 12, color: '#1E40AF' }}>
                {actionError}
              </div>
            )}
            <button onClick={() => void handleInfoRequest()} disabled={submitting || infoItems.length === 0}
              className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
              style={{ background: submitting || infoItems.length === 0 ? '#94A3B8' : '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <MessageSquare style={{ width: 14, height: 14 }} />
              {submitting ? 'Sending...' : `Send Request (${infoItems.length} items)`}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between flex-shrink-0"
        style={{ padding: '12px 22px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
        <div className="flex items-center gap-2">
          <Shield style={{ width: 12, height: 12, color: '#94A3B8' }} />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>All decisions are logged and auditable per DHA guidelines</span>
        </div>
        <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{pa.externalRef}</span>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = 'pending' | 'processed' | 'all';
type SortKey = 'priority' | 'sla' | 'cost';

export const InsurancePreAuthorizations = () => {
  const { data, error, overduePreAuth, refetch } = useInsurancePageData();
  const preAuths = useMemo(() => data?.preAuthorizations ?? [], [data?.preAuthorizations]);

  // ── UI state ──
  const [selectedPanel, setSelectedPanel] = useState<InsurancePreAuthorization | null>(null);
  const [activeTab,  setActiveTab]  = useState<TabKey>('pending');
  const [viewMode,   setViewMode]   = useState<'table' | 'card'>('table');
  const [search,     setSearch]     = useState('');
  const [sortKey,    setSortKey]    = useState<SortKey>('priority');
  const [filterAi,   setFilterAi]   = useState<string>('ALL');
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [showBulk,   setShowBulk]   = useState(false);
  const [toasts,     setToasts]     = useState<Toast[]>([]);
  const [bulkError,  setBulkError]  = useState<string | null>(null);

  const toast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Derived sets ──
  const pendingRows   = useMemo(() =>
    preAuths.filter(p => p.status !== 'approved' && p.status !== 'denied'), [preAuths]);
  const processedRows = useMemo(() =>
    preAuths.filter(p => p.status === 'approved' || p.status === 'denied'), [preAuths]);

  const aiBulkApproveRows = useMemo(() =>
    pendingRows.filter(p => p.aiRecommendation === 'approve' && (p.aiConfidencePercent ?? 0) >= 95),
    [pendingRows],
  );

  // ── Display records ──
  const displayRecords = useMemo(() => {
    let base = activeTab === 'pending' ? pendingRows : activeTab === 'processed' ? processedRows : preAuths;
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(p =>
        p.patientName.toLowerCase().includes(q) ||
        p.externalRef.toLowerCase().includes(q) ||
        p.procedureName.toLowerCase().includes(q) ||
        p.clinicianName.toLowerCase().includes(q),
      );
    }
    if (filterAi !== 'ALL') base = base.filter(p => aiRecUpper(p.aiRecommendation) === filterAi);
    if (filterPlan !== 'ALL') base = base.filter(p => p.planLabel === filterPlan);
    return [...base].sort((a, b) => {
      if (sortKey === 'priority') return PRIORITY_ORDER[priorityDisplay(a)] - PRIORITY_ORDER[priorityDisplay(b)];
      if (sortKey === 'sla') return slaRemainingMins(a.slaDueAt) - slaRemainingMins(b.slaDueAt);
      if (sortKey === 'cost') return b.requestedAmountAed - a.requestedAmountAed;
      return 0;
    });
  }, [preAuths, pendingRows, processedRows, activeTab, search, filterAi, filterPlan, sortKey]);

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const handleBulkConfirm = async (ids: string[]) => {
    setBulkError(null);
    try {
      await bulkApprovePreAuthorizations(
        ids.map(id => {
          const row = preAuths.find(p => p.id === id);
          return { id, requestedAmountAed: row?.requestedAmountAed ?? 0 };
        }),
      );
      refetchRef.current();
      setShowBulk(false);
      toast(`${ids.length} pre-authorizations approved in bulk`, 'success');
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk approval failed.');
      throw err;
    }
  };

  const handleDenied = (_id: string) => {
    void refetch();
    toast('Pre-authorization denied — denial letter queued', 'warning');
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'pending',   label: 'Pending Review',  count: pendingRows.length   },
    { key: 'processed', label: 'Processed',        count: processedRows.length },
    { key: 'all',       label: 'All',              count: preAuths.length      },
  ];

  const overdueCount = preAuths.filter(p => p.status === 'overdue').length;
  const totalExposure = pendingRows.reduce((s, p) => s + p.requestedAmountAed, 0);

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <PreAuthAlert item={overduePreAuth} />

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Pending Review"
          value={pendingRows.length}
          sub={`${preAuths.filter(p => p.status === 'overdue' || p.priority === 'urgent').length} urgent`}
          accent="#DC2626"
          icon={<Clock style={{ width: 16, height: 16, color: '#DC2626' }} />}
        />
        <StatCard
          label="AI Recommended Approve"
          value={aiBulkApproveRows.length}
          sub="Ready for bulk action"
          accent="#059669"
          icon={<Brain style={{ width: 16, height: 16, color: '#059669' }} />}
        />
        <StatCard
          label="Processed Today"
          value={processedRows.length}
          sub="Approved + denied"
          accent="#2563EB"
          icon={<CheckCircle style={{ width: 16, height: 16, color: '#2563EB' }} />}
        />
        <StatCard
          label="Total Exposure"
          value={`AED ${(totalExposure / 1000).toFixed(0)}K`}
          sub="Pending decisions"
          accent="#D97706"
          icon={<AlertOctagon style={{ width: 16, height: 16, color: '#D97706' }} />}
        />
      </div>

      {/* Table + optional slide-out panel */}
      <div className="flex gap-0 min-w-0">
        <div className="flex-1 min-w-0">

          {/* Filter card */}
          <div className="rounded-xl mb-4" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {/* Page header row */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Pre-Authorizations</h2>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                  Review urgent and routine authorization requests · {overdueCount > 0 ? `${overdueCount} SLA breach` : 'All SLAs on track'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void refetch()}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12, color: '#475569' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                >
                  <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12, color: '#475569' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                >
                  <Download style={{ width: 12, height: 12 }} /> Export
                </button>
                <button
                  onClick={() => setShowBulk(true)}
                  className="flex items-center gap-2 rounded-lg px-4 py-1.5 transition-colors"
                  style={{ background: '#059669', color: '#fff', fontSize: 12, fontWeight: 700 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#047857'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#059669'; }}
                >
                  <CheckCircle2 style={{ width: 13, height: 13 }} />
                  Bulk Approve
                  <span className="rounded-full px-1.5 py-0.5"
                    style={{ background: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>
                    {aiBulkApproveRows.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 px-3 py-2.5 transition-colors relative"
                  style={{
                    fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
                    color: activeTab === tab.key ? '#0F172A' : '#64748B',
                    borderBottom: activeTab === tab.key ? '2px solid #0F172A' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                  <span className="rounded-full px-1.5 py-0.5"
                    style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700,
                      background: activeTab === tab.key ? '#0F172A' : '#F1F5F9',
                      color: activeTab === tab.key ? '#fff' : '#64748B' }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Filters bar */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="relative flex-1" style={{ maxWidth: 300 }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
                <input type="text" placeholder="Search patient, PA ref, procedure..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  maxLength={FORM_FIELD_LIMITS.searchQuery}
                  className="w-full rounded-lg outline-none"
                  style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, fontSize: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }} />
              </div>

              {/* AI filter */}
              <div className="relative">
                <select value={filterAi} onChange={e => setFilterAi(e.target.value)}
                  className="rounded-lg outline-none appearance-none pr-7 pl-3 py-1.5"
                  style={{ fontSize: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569' }}>
                  <option value="ALL">All AI Recs</option>
                  <option value="APPROVE">AI: Approve</option>
                  <option value="REVIEW">AI: Review</option>
                  <option value="DENY">AI: Deny</option>
                </select>
                <ChevronDown style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 11, height: 11, color: '#94A3B8', pointerEvents: 'none' }} />
              </div>

              {/* Plan filter */}
              <div className="relative">
                <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                  className="rounded-lg outline-none appearance-none pr-7 pl-3 py-1.5"
                  style={{ fontSize: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569' }}>
                  <option value="ALL">All Plans</option>
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Basic">Basic</option>
                  <option value="Thiqa">Thiqa</option>
                </select>
                <ChevronDown style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 11, height: 11, color: '#94A3B8', pointerEvents: 'none' }} />
              </div>

              {/* Sort */}
              <div className="relative">
                <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                  className="rounded-lg outline-none appearance-none pr-7 pl-3 py-1.5"
                  style={{ fontSize: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569' }}>
                  <option value="priority">Sort: Priority</option>
                  <option value="sla">Sort: SLA Urgency</option>
                  <option value="cost">Sort: Cost (High)</option>
                </select>
                <ChevronDown style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 11, height: 11, color: '#94A3B8', pointerEvents: 'none' }} />
              </div>

              <div className="ml-auto flex items-center gap-1 rounded-lg p-1" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                {(['table', 'card'] as const).map(v => (
                  <button key={v} onClick={() => setViewMode(v)} className="rounded-md p-1.5 transition-all"
                    style={{ background: viewMode === v ? '#fff' : 'transparent', color: viewMode === v ? '#0F172A' : '#94A3B8', boxShadow: viewMode === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                    {v === 'table' ? <LayoutList style={{ width: 13, height: 13 }} /> : <LayoutGrid style={{ width: 13, height: 13 }} />}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1" style={{ fontSize: 11, color: '#94A3B8' }}>
                <Filter style={{ width: 11, height: 11 }} />
                {displayRecords.length} results
              </div>
            </div>
          </div>

          {bulkError && (
            <div className="mb-3 rounded-lg px-4 py-2" style={{ background: '#FFF5F5', border: '1px solid #FCA5A5', fontSize: 12, color: '#991B1B' }}>
              {bulkError}
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="grid" style={{ gridTemplateColumns: '100px 160px 1fr 120px 110px 120px 90px 110px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '0 16px' }}>
                {['PA Ref', 'Patient', 'Procedure', 'Plan · Doctor', 'AI Rec', 'Cost', 'SLA', 'Actions'].map(col => (
                  <div key={col} className="py-2.5" style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {col}
                  </div>
                ))}
              </div>

              {displayRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <FileCheck style={{ width: 32, height: 32, color: '#E2E8F0', marginBottom: 12 }} />
                  <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>No pre-authorizations match your filters</p>
                </div>
              ) : displayRecords.map((pa, idx) => {
                const prio   = priorityDisplay(pa);
                const accent = priorityAccent[prio];
                const ai     = aiColors[aiRecUpper(pa.aiRecommendation)];
                const plan   = getPlanColor(pa.planLabel);
                const slaMins = slaRemainingMins(pa.slaDueAt);
                const slaHrs  = pa.priority === 'urgent' || pa.status === 'overdue' ? 4 : 8;
                const isProcessed = pa.status === 'approved' || pa.status === 'denied';
                return (
                  <div
                    key={pa.id}
                    onClick={() => setSelectedPanel(pa)}
                    className="grid cursor-pointer transition-colors"
                    style={{
                      gridTemplateColumns: '100px 160px 1fr 120px 110px 120px 90px 110px',
                      padding: '0 16px',
                      borderBottom: idx < displayRecords.length - 1 ? '1px solid #F8FAFC' : 'none',
                      background: prio === 'OVERDUE' ? 'rgba(254,226,226,0.25)' : 'transparent',
                      borderLeft: `3px solid ${accent}`,
                      alignItems: 'center',
                      minHeight: 56,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = prio === 'OVERDUE' ? 'rgba(254,226,226,0.45)' : '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = prio === 'OVERDUE' ? 'rgba(254,226,226,0.25)' : 'transparent'; }}
                  >
                    {/* PA Ref */}
                    <div style={{ paddingRight: 8 }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700, color: accent }}>{prio}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
                        {pa.externalRef.replace(/^PA-\d+-/, '#')}
                      </div>
                    </div>

                    {/* Patient */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{pa.patientName}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {pa.planLabel && (
                          <span className="rounded-full px-2 py-0.5" style={{ fontSize: 9, fontWeight: 700, background: plan.bg, color: plan.color }}>
                            {pa.planLabel}
                          </span>
                        )}
                        {pa.patientAge != null && (
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8' }}>
                            {pa.patientAge}{pa.patientGender ?? ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Procedure */}
                    <div style={{ paddingRight: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', lineHeight: 1.3 }}>{pa.procedureName}</div>
                      {pa.procedureIcdCode && (
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8', marginTop: 2 }}>{pa.procedureIcdCode}</div>
                      )}
                    </div>

                    {/* Plan · Doctor */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', lineHeight: 1.2 }}>{pa.clinicianName}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{pa.providerName}</div>
                    </div>

                    {/* AI Rec */}
                    <div>
                      <div className="rounded-lg px-2 py-1 inline-flex items-center gap-1"
                        style={{ background: ai.bg, border: `1px solid ${ai.border}`, fontSize: 10, fontWeight: 700, color: ai.color }}>
                        <Brain style={{ width: 9, height: 9 }} />
                        {aiRecUpper(pa.aiRecommendation)}
                      </div>
                      {pa.aiConfidencePercent != null && (
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8', marginTop: 3 }}>
                          {pa.aiConfidencePercent}% conf.
                        </div>
                      )}
                    </div>

                    {/* Cost */}
                    <div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                        AED {(pa.requestedAmountAed / 1000).toFixed(0)}K
                      </div>
                      {pa.coverageLabel && (
                        <div style={{ fontSize: 9, color: pa.coverageLabel.toLowerCase().includes('not') ? '#DC2626' : '#059669', marginTop: 1, fontWeight: 600 }}>
                          {pa.coverageLabel}
                        </div>
                      )}
                    </div>

                    {/* SLA */}
                    <div>
                      {isProcessed ? (
                        <span className="rounded px-1.5 py-0.5 inline-block"
                          style={{ background: pa.status === 'denied' ? '#FEE2E2' : '#DCFCE7', color: pa.status === 'denied' ? '#991B1B' : '#065F46', fontSize: 10, fontWeight: 700 }}>
                          {pa.status === 'denied' ? 'DENIED' : 'APPROVED'}
                        </span>
                      ) : (
                        <SlaChip mins={slaMins} slaHours={slaHrs} />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {!isProcessed && (
                        <>
                          <button onClick={() => setSelectedPanel(pa)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                            style={{ border: '1px solid #BBF7D0', color: '#059669' }} title="Approve"
                            onMouseEnter={e => { e.currentTarget.style.background = '#DCFCE7'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <CheckCircle2 style={{ width: 12, height: 12 }} />
                          </button>
                          <button onClick={() => setSelectedPanel(pa)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                            style={{ border: '1px solid #FECACA', color: '#DC2626' }} title="Deny"
                            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <XCircle style={{ width: 12, height: 12 }} />
                          </button>
                        </>
                      )}
                      <button onClick={() => setSelectedPanel(pa)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ border: '1px solid #BFDBFE', color: '#2563EB' }} title="Full review"
                        onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <FileText style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CARD VIEW */}
          {viewMode === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayRecords.map(pa => {
                const prio   = priorityDisplay(pa);
                const accent = priorityAccent[prio];
                const ai     = aiColors[aiRecUpper(pa.aiRecommendation)];
                const plan   = getPlanColor(pa.planLabel);
                const slaMins = slaRemainingMins(pa.slaDueAt);
                const slaHrs  = pa.priority === 'urgent' || pa.status === 'overdue' ? 4 : 8;
                const isProcessed = pa.status === 'approved' || pa.status === 'denied';
                return (
                  <div key={pa.id} onClick={() => setSelectedPanel(pa)}
                    className="rounded-xl cursor-pointer transition-all"
                    style={{ background: '#fff', border: '1px solid #E2E8F0', borderLeft: `3px solid ${accent}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700, color: accent }}>{prio}</span>
                        {pa.planLabel && (
                          <span className="rounded px-1.5 py-0.5" style={{ background: plan.bg, color: plan.color, fontSize: 10, fontWeight: 700 }}>{pa.planLabel}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2, lineHeight: 1.3 }}>{pa.procedureName}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{pa.patientName}{pa.patientAge != null ? ` · ${pa.patientAge}${pa.patientGender ?? ''}` : ''}</div>
                    </div>
                    <div style={{ padding: '10px 14px' }}>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="rounded px-2 py-0.5 inline-flex items-center gap-1"
                          style={{ background: ai.bg, color: ai.color, fontSize: 10, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
                          <Brain style={{ width: 9, height: 9 }} />
                          {aiRecUpper(pa.aiRecommendation)} {pa.aiConfidencePercent != null ? `${pa.aiConfidencePercent}%` : ''}
                        </span>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                          AED {(pa.requestedAmountAed / 1000).toFixed(0)}K
                        </span>
                      </div>
                      {isProcessed ? (
                        <span className="rounded px-1.5 py-0.5" style={{ background: pa.status === 'denied' ? '#FEE2E2' : '#DCFCE7', color: pa.status === 'denied' ? '#991B1B' : '#065F46', fontSize: 10, fontWeight: 700 }}>
                          {pa.status === 'denied' ? 'DENIED' : 'APPROVED'}
                        </span>
                      ) : (
                        <SlaChip mins={slaMins} slaHours={slaHrs} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Slide-out detail panel */}
        {selectedPanel && (
          <div className="flex-shrink-0 overflow-hidden transition-all" style={{ width: 680, borderLeft: '1px solid #E2E8F0' }}>
            <PreAuthDetailPanel
              pa={selectedPanel}
              onClose={() => setSelectedPanel(null)}
              onApproved={() => { void refetch(); toast('Pre-authorization approved successfully', 'success'); setSelectedPanel(null); }}
              onDenied={handleDenied}
              onInfoRequested={() => { void refetch(); toast('Information request sent to provider', 'info'); }}
            />
          </div>
        )}
      </div>

      {/* Bulk Approve Modal */}
      {showBulk && (
        <BulkApproveModal
          candidates={aiBulkApproveRows}
          onClose={() => setShowBulk(false)}
          onConfirm={handleBulkConfirm}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[500] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }}>
        {toasts.map(t => {
          const c = TOAST_COLORS[t.type];
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', pointerEvents: 'auto' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </InsuranceShell>
  );
};

export default InsurancePreAuthorizations;
