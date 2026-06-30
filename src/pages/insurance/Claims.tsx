import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Flag,
  LayoutGrid,
  LayoutList,
  Mail,
  MoreVertical,
  Plus,
  Scale,
  Search,
  Shield,
  Stethoscope,
  TrendingUp,
  Upload,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {
  type InsuranceClaim,
  approveClaim,
  bulkApproveClaims,
  bulkDenyClaims,
  denyClaim,
  flagClaimForReview,
  resolveClaimAppeal,
  submitManualClaim,
} from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import InsuranceShell, {
  PreAuthAlert,
  formatCurrency,
  formatDate,
  formatNumber,
  useInsurancePageData,
} from './InsuranceShell';

// ─── Helpers & Constants ──────────────────────────────────────────────────────

type StatusKey =
  | 'PENDING' | 'APPROVED' | 'AUTO_APPROVED'
  | 'DENIED'  | 'APPEALED' | 'FRAUD_FLAGGED' | 'ON_HOLD';

type TabKey = 'all' | 'pending' | 'approved' | 'denied' | 'appealed' | 'flagged';
type ViewMode = 'table' | 'card';
interface Toast { id: number; msg: string; type: 'success' | 'warning' | 'info' }

const STATUS_MAP: Record<StatusKey, { border: string; bg: string; chip: string; chipText: string; text: string }> = {
  AUTO_APPROVED: { border: '#0D9488', bg: '#F0FDFA', chip: '#CCFBF1', chipText: '#0F766E', text: 'Auto-Approved' },
  APPROVED:      { border: '#059669', bg: '#F0FDF4', chip: '#DCFCE7', chipText: '#065F46', text: 'Approved'      },
  PENDING:       { border: '#D97706', bg: '#FFFBEB', chip: '#FEF3C7', chipText: '#92400E', text: 'Pending'       },
  DENIED:        { border: '#DC2626', bg: '#FFF5F5', chip: '#FEE2E2', chipText: '#991B1B', text: 'Denied'        },
  APPEALED:      { border: '#7C3AED', bg: '#F5F3FF', chip: '#EDE9FE', chipText: '#4C1D95', text: 'Appealed'      },
  FRAUD_FLAGGED: { border: '#EA580C', bg: '#FFF7ED', chip: '#FED7AA', chipText: '#9A3412', text: 'Fraud Flagged' },
  ON_HOLD:       { border: '#64748B', bg: '#F8FAFC', chip: '#F1F5F9', chipText: '#475569', text: 'On Hold'       },
};

const PLAN_COLORS: Record<string, { bg: string; color: string }> = {
  Gold:   { bg: '#FEF9C3', color: '#713F12' },
  Silver: { bg: '#F1F5F9', color: '#334155' },
  Basic:  { bg: '#EFF6FF', color: '#1E40AF' },
  Thiqa:  { bg: '#F3E8FF', color: '#581C87' },
};

const DENY_REASONS = [
  'Not covered by plan',
  'No pre-authorization',
  'Duplicate claim',
  'Incomplete documentation',
  'Provider not in network',
  'Limit exceeded',
];

const ICD10_SUGGESTIONS = [
  { code: 'I10',   desc: 'Essential (primary) hypertension'                    },
  { code: 'E11.9', desc: 'Type 2 diabetes mellitus without complications'      },
  { code: 'M54.5', desc: 'Low back pain'                                       },
  { code: 'J06.9', desc: 'Acute upper respiratory infection'                   },
  { code: 'K21.0', desc: 'Gastro-esophageal reflux disease with oesophagitis' },
  { code: 'Z00.00', desc: 'Encounter for general adult medical examination'    },
];

const MOCK_DOCTORS = [
  'Dr. Ahmed Al Rashidi — Cardiology — Al Noor Medical Center',
  'Dr. Fatima Al Zaabi — General Practice — Mediclinic City Hospital',
  'Dr. Mohammed Hasan — Orthopedics — Cleveland Clinic Abu Dhabi',
  'Dr. Layla Al Muhairi — Dermatology — Burjeel Hospital',
  'Dr. Khalid Ibrahim — Ophthalmology — Al Zahra Hospital',
];

const MOCK_PATIENTS = [
  'Parnia Yazdkhasti — DAM-2024-IND-047821 — Gold',
  'Mohammed Al Shamsi — DAM-2024-GRP-112344 — Basic',
  'Hassan Al Mansoori — DAM-2024-IND-098234 — Gold',
  'Noura Al Ketbi — DAM-2024-IND-023451 — Silver',
  'Omar Al Hassan — DAM-2024-IND-071199 — Basic',
];

const CLAIM_TYPES = ['Consultation', 'Lab', 'Radiology', 'Pharmacy', 'Surgery', 'Emergency', 'Physiotherapy', 'Specialist'];

const toStatusKey = (status: InsuranceClaim['status']): StatusKey => {
  if (status === 'submitted' || status === 'under_review') return 'PENDING';
  if (status === 'approved')  return 'APPROVED';
  if (status === 'denied')    return 'DENIED';
  if (status === 'appealed')  return 'APPEALED';
  return 'ON_HOLD';
};

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();

const getShortRef = (ref: string) =>
  ref.replace(/^CLM-\d+-/, '#').replace(/^CLM-/, '#');

const getPlanColor = (tier: string | null) =>
  PLAN_COLORS[tier ?? ''] ?? { bg: '#F8FAFC', color: '#475569' };

const getCopayPct = () => 10;
const getCopayAmt = (c: InsuranceClaim) => Math.round(c.amountAed * 0.1 * 100) / 100;
const getDamanPays = (c: InsuranceClaim) => Math.round(c.amountAed * 0.9 * 100) / 100;

const TAB_FILTERS: Record<TabKey, (sk: StatusKey) => boolean> = {
  all:      ()   => true,
  pending:  sk   => sk === 'PENDING' || sk === 'ON_HOLD',
  approved: sk   => sk === 'APPROVED' || sk === 'AUTO_APPROVED',
  denied:   sk   => sk === 'DENIED',
  appealed: sk   => sk === 'APPEALED',
  flagged:  sk   => sk === 'FRAUD_FLAGGED',
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',      label: 'All Claims'     },
  { key: 'pending',  label: 'Pending Review' },
  { key: 'approved', label: 'Approved'       },
  { key: 'denied',   label: 'Denied'         },
  { key: 'appealed', label: 'Appealed'       },
  { key: 'flagged',  label: 'Flagged'        },
];

const TOAST_COLORS: Record<Toast['type'], { bg: string; border: string; color: string }> = {
  success: { bg: '#F0FDF4', border: '#86EFAC', color: '#065F46' },
  warning: { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF' },
};

// ─── AppealReviewModal ────────────────────────────────────────────────────────

const AppealReviewModal = ({
  claim, onClose, onUphold, onDismiss,
}: {
  claim: InsuranceClaim;
  onClose: () => void;
  onUphold: (id: string) => void;
  onDismiss: (id: string, reason: string) => void;
}) => {
  const [notes, setNotes] = useState('Reviewing supporting documentation submitted with the appeal.');
  const [dismissReason, setDismissReason] = useState('');
  const [showDismiss, setShowDismiss] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const damanPays = getDamanPays(claim);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleUphold = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await resolveClaimAppeal(claim.id, 'approved', notes.trim() || null);
      onUphold(claim.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to uphold appeal. Please try again.');
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!dismissReason.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await resolveClaimAppeal(claim.id, 'denied', notes.trim() || null, dismissReason);
      onDismiss(claim.id, dismissReason);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to dismiss appeal. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center"
      style={{ background: 'rgba(15,45,74,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl overflow-hidden flex flex-col"
        style={{ width: 600, maxHeight: '88vh', background: '#fff', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '16px 20px', background: '#5B21B6', borderBottom: '1px solid #6D28D9' }}>
          <div className="flex items-center gap-2">
            <Scale style={{ width: 16, height: 16, color: '#DDD6FE' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Appeal Review</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#C4B5FD' }}>{claim.externalRef}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#DDD6FE' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rounded-xl p-4" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                ['Patient', claim.patientName],
                ['Provider', claim.providerName],
                ['Appeal Amount', formatCurrency(damanPays)],
                ['Status', 'Under Review'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: '#8B5CF6', marginBottom: 1 }}>{k}</div>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#4C1D95' }}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#8B5CF6', marginBottom: 4 }}>Appeal Reason</div>
              <p style={{ fontSize: 12, color: '#4C1D95', lineHeight: 1.6, fontStyle: 'italic' }}>
                "Appeal submitted by {claim.providerName} — clinical documentation under review."
              </p>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: '#FFF5F5', border: '1px solid #FCA5A5' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', marginBottom: 6 }}>ORIGINAL DENIAL</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 1 }}>Claim</div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#DC2626' }}>{claim.externalRef}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 1 }}>Amount denied</div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 800, color: '#DC2626' }}>{formatCurrency(damanPays)}</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#991B1B' }}>Claim denied — reason on file. Review documentation attached to this appeal.</p>
          </div>

          <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 8 }}>SUPPORTING DOCUMENTS</div>
            {["Doctor's letter confirming clinical episode", "SOAP notes (submitted with appeal)", "Patient's written appeal letter"].map(doc => (
              <div key={doc} className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 style={{ width: 11, height: 11, color: '#059669', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#334155' }}>{doc}</span>
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Medical Director Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full rounded-lg px-3 py-2 resize-none outline-none"
              style={{ fontSize: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }} />
          </div>

          {showDismiss && (
            <div className="rounded-xl p-4" style={{ background: '#FFF5F5', border: '1px solid #FCA5A5' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#991B1B', display: 'block', marginBottom: 4 }}>
                Dismissal Reason (required)
              </label>
              <textarea value={dismissReason} onChange={e => setDismissReason(e.target.value)} rows={2}
                placeholder="Explain why the appeal is dismissed..."
                className="w-full rounded-lg px-3 py-2 resize-none outline-none mb-2"
                style={{ fontSize: 12, background: '#fff', border: '1px solid #FCA5A5', color: '#0F172A' }} />
              <div className="rounded-lg p-2 flex items-start gap-2" style={{ background: '#FEE2E2' }}>
                <AlertTriangle style={{ width: 11, height: 11, color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: '#991B1B' }}>Patient has right to external review under UAE Insurance Law.</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0" style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9' }}>
          {actionError && (
            <div className="rounded-lg px-3 py-2 mb-2" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 12 }}>
              {actionError}
            </div>
          )}
          <button onClick={() => void handleUphold()} disabled={submitting}
            className="w-full rounded-xl py-3 flex items-center justify-center gap-2 mb-2 transition-colors"
            style={{ background: submitting ? '#94A3B8' : '#059669', color: '#fff', fontSize: 14, fontWeight: 700 }}>
            <CheckCircle2 style={{ width: 15, height: 15 }} />
            {submitting ? 'Processing...' : `Uphold Appeal — Approve ${formatCurrency(damanPays)}`}
          </button>
          {!showDismiss ? (
            <button onClick={() => setShowDismiss(true)}
              className="w-full rounded-xl py-2.5 transition-colors"
              style={{ background: 'transparent', color: '#DC2626', border: '1px solid #FCA5A5', fontSize: 13, fontWeight: 600 }}>
              <XCircle style={{ width: 13, height: 13, display: 'inline', marginRight: 6 }} />
              Dismiss Appeal — Maintain Denial
            </button>
          ) : (
            <button onClick={() => void handleDismiss()}
              disabled={!dismissReason.trim() || submitting}
              className="w-full rounded-xl py-2.5 transition-colors"
              style={{ background: !dismissReason.trim() ? '#F1F5F9' : '#DC2626', color: !dismissReason.trim() ? '#94A3B8' : '#fff', fontSize: 13, fontWeight: 700 }}>
              Confirm Dismissal
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── EOBExportModal ───────────────────────────────────────────────────────────

const EOBExportModal = ({
  totalClaims, totalValue, approvedClaims, selectedClaims, onClose, onToast,
}: {
  totalClaims: number; totalValue: number; approvedClaims: number; selectedClaims: number;
  onClose: () => void;
  onToast: (msg: string, type: Toast['type']) => void;
}) => {
  const [scope, setScope]         = useState<'all' | 'approved' | 'selected'>('all');
  const [recipient, setRecipient] = useState<'providers' | 'patients' | 'both' | 'download'>('providers');
  const [format, setFormat]       = useState<'pdf_individual' | 'pdf_batch' | 'csv' | 'dha_xml'>('pdf_individual');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [done, setDone]             = useState(false);

  const scopeCount = scope === 'all' ? totalClaims : scope === 'approved' ? approvedClaims : selectedClaims;

  const handleGenerate = () => {
    setGenerating(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setGenerating(false);
          setDone(true);
          onToast(`EOB batch ready — ${scopeCount} claims · 47.2 MB ZIP`, 'info');
          return 100;
        }
        return p + 8;
      });
    }, 200);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center"
      style={{ background: 'rgba(15,45,74,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl overflow-hidden flex flex-col"
        style={{ width: 480, maxHeight: '85vh', background: '#fff', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '16px 20px', background: '#1E3A5F', borderBottom: '1px solid #2D4A6F' }}>
          <div className="flex items-center gap-2">
            <FileText style={{ width: 16, height: 16, color: '#93C5FD' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Export Explanation of Benefits</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Generate EOBs for claims in selected range</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Scope */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scope</div>
            <div className="space-y-2">
              {([
                ['all',      `All claims (${totalClaims}) — ${formatCurrency(totalValue)}`],
                ['approved', `Approved claims only (${approvedClaims})`],
                ['selected', `Selected claims only (${selectedClaims})`],
              ] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" checked={scope === val} onChange={() => setScope(val)} style={{ accentColor: '#1E3A5F' }} />
                  <span style={{ fontSize: 13, color: '#334155' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Recipient */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipient</div>
            <div className="space-y-2">
              {([
                ['patients',  'Patients only (send to patient emails)'],
                ['providers', 'Providers only (send to clinic billing emails)'],
                ['both',      'Both patients and providers'],
                ['download',  'Download ZIP only (no email)'],
              ] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" checked={recipient === val} onChange={() => setRecipient(val)} style={{ accentColor: '#1E3A5F' }} />
                  <span style={{ fontSize: 13, color: '#334155' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Format</div>
            <div className="space-y-2">
              {([
                ['pdf_individual', 'PDF (individual EOBs)'],
                ['pdf_batch',      'PDF (batch single file)'],
                ['csv',            'CSV (raw claims data)'],
                ['dha_xml',        'DHA eClaims format (XML)'],
              ] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" checked={format === val} onChange={() => setFormat(val)} style={{ accentColor: '#1E3A5F' }} />
                  <span style={{ fontSize: 13, color: '#334155' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg p-3" style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
            <div className="flex items-start gap-2">
              <CheckCircle2 style={{ width: 13, height: 13, color: '#0D9488', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: '#065F46', lineHeight: 1.5 }}>
                EOBs are in DHA eClaims v3.2 format ✅ Retained for 10 years per UAE Medical Records Law.
              </p>
            </div>
          </div>

          {generating && (
            <div className="rounded-lg p-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 12, color: '#1E40AF', marginBottom: 6 }}>Generating {scopeCount} EOBs...</div>
              <div className="rounded-full" style={{ height: 6, background: '#DBEAFE' }}>
                <div className="rounded-full transition-all" style={{ height: 6, width: `${progress}%`, background: '#0D9488' }} />
              </div>
            </div>
          )}

          {done && (
            <div className="rounded-lg p-3" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 style={{ width: 14, height: 14, color: '#059669' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>Download ready — 47.2 MB ZIP</span>
              </div>
              <button onClick={() => { onToast('EOB ZIP downloaded', 'success'); onClose(); }}
                className="w-full rounded-lg py-2 flex items-center justify-center gap-2"
                style={{ background: '#059669', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                <Download style={{ width: 13, height: 13 }} /> Download ZIP Now
              </button>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex gap-2" style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9' }}>
          {!done ? (
            <>
              <button onClick={handleGenerate} disabled={generating}
                className="flex-1 rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors"
                style={{ background: generating ? '#94A3B8' : '#1E3A5F', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                <Download style={{ width: 14, height: 14 }} />
                {generating ? 'Generating...' : 'Download ZIP Now'}
              </button>
              <button onClick={() => { onToast('EOB batch scheduled for 8 PM tonight', 'info'); onClose(); }}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 transition-colors"
                style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 12 }}>
                <Mail style={{ width: 13, height: 13 }} /> Schedule email
              </button>
            </>
          ) : (
            <button onClick={onClose} className="flex-1 rounded-xl py-2.5"
              style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13 }}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ManualClaimModal ─────────────────────────────────────────────────────────

const ManualClaimModal = ({
  onClose, onToast,
}: {
  onClose: () => void;
  onToast: (msg: string, type: Toast['type']) => void;
}) => {
  const [step, setStep] = useState(0);

  // Step 1
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [claimType, setClaimType] = useState('Consultation');

  // Step 2
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [icd10Search, setIcd10Search] = useState('');
  const [selectedIcd10, setSelectedIcd10] = useState<{ code: string; desc: string } | null>(null);
  const [cpt, setCpt] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [showDoctorDrop, setShowDoctorDrop] = useState(false);
  const [showIcdDrop, setShowIcdDrop] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);

  // Step 3
  const [aiChecking, setAiChecking] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [aiResult, setAiResult] = useState<'eligible' | 'flag' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const gross = parseFloat(grossAmount) || 0;
  const copay = Math.round(gross * 0.1);
  const damanPays = gross - copay;

  const step1Valid = !!selectedPatient && !!serviceDate && !!claimType;
  const step2Valid = !!selectedDoctor && !!selectedIcd10 && gross > 0;

  const stepLabels = ['Patient & Policy', 'Service Details', 'Review & Submit'];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleNext = () => {
    if (step === 1) {
      setAiChecking(true);
      setTimeout(() => {
        setAiChecking(false);
        setAiDone(true);
        setAiResult(gross > 5000 ? 'flag' : 'eligible');
      }, 1600);
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedDoctor) return;
    setSubmitting(true);
    setActionError(null);
    const patientParts = selectedPatient.split(' — ');
    const doctorParts  = selectedDoctor.split(' — ');
    const tierLabel    = patientParts[2] ?? '';
    try {
      await submitManualClaim({
        patientName:        patientParts[0] ?? '',
        planName:           tierLabel,
        planTier:           tierLabel.toLowerCase(),
        providerName:       doctorParts[2] ?? '',
        doctorName:         doctorParts[0] ?? '',
        claimType,
        amountAed:          gross,
        diagnosisIcdCode:   selectedIcd10?.code ?? null,
        cptCode:            cpt.trim() || null,
        aiEligibilityResult: aiResult,
      });
      onToast('Manual claim submitted for review', 'success');
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit claim. Please try again.');
      setSubmitting(false);
    }
  };

  const filteredPatients = MOCK_PATIENTS.filter(
    p => !patientSearch || p.toLowerCase().includes(patientSearch.toLowerCase()),
  );

  const filteredDoctors = MOCK_DOCTORS.filter(
    d => !doctorSearch || d.toLowerCase().includes(doctorSearch.toLowerCase()),
  );

  const filteredIcd = ICD10_SUGGESTIONS.filter(
    s => !icd10Search || s.code.toLowerCase().includes(icd10Search.toLowerCase()) || s.desc.toLowerCase().includes(icd10Search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center"
      style={{ background: 'rgba(15,45,74,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl overflow-hidden flex flex-col"
        style={{ width: 600, maxHeight: '90vh', background: '#fff', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '16px 20px', background: '#1E3A5F', borderBottom: '1px solid #2D4A6F' }}>
          <div className="flex items-center gap-2">
            <FileText style={{ width: 16, height: 16, color: '#93C5FD' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Submit Manual Claim</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>New claim entry — CeenAiX AI eligibility check</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex-shrink-0 flex items-center gap-0"
          style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 24, height: 24, background: i < step ? '#059669' : i === step ? '#1E3A5F' : '#E2E8F0', color: i <= step ? '#fff' : '#94A3B8', fontSize: 11, fontWeight: 700 }}>
                  {i < step ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : i + 1}
                </div>
                <span style={{ fontSize: 12, fontWeight: i === step ? 700 : 400, color: i === step ? '#1E3A5F' : i < step ? '#059669' : '#94A3B8' }}>
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div style={{ flex: 1, height: 1, background: i < step ? '#059669' : '#E2E8F0', margin: '0 8px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {step === 0 && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>PATIENT SEARCH</label>
                <div className="relative">
                  <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
                  <input value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
                    placeholder="Search by name or policy number..."
                    className="w-full rounded-lg outline-none"
                    style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }} />
                </div>
                {patientSearch && !selectedPatient && filteredPatients.length > 0 && (
                  <div className="rounded-lg overflow-hidden mt-1" style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    {filteredPatients.map(p => (
                      <button key={p} onClick={() => { setSelectedPatient(p); setPatientSearch(p.split(' — ')[0] ?? ''); }}
                        className="w-full text-left transition-colors"
                        style={{ padding: '9px 12px', fontSize: 12, color: '#0F172A', background: '#fff', borderBottom: '1px solid #F1F5F9', display: 'block' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
                        <div style={{ fontWeight: 600 }}>{p.split(' — ')[0]}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{p.split(' — ').slice(1).join(' · ')}</div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedPatient && (
                  <div className="rounded-lg p-3 mt-2 flex items-center gap-2"
                    style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                    <CheckCircle2 style={{ width: 13, height: 13, color: '#059669', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>{selectedPatient.split(' — ')[0]}</div>
                      <div style={{ fontSize: 11, color: '#6EE7B7' }}>{selectedPatient.split(' — ').slice(1).join(' · ')}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>SERVICE DATE</label>
                  <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)}
                    className="w-full rounded-lg outline-none"
                    style={{ padding: '8px 12px', fontSize: 13, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>CLAIM TYPE</label>
                  <select value={claimType} onChange={e => setClaimType(e.target.value)}
                    className="w-full rounded-lg outline-none appearance-none"
                    style={{ padding: '8px 12px', fontSize: 13, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}>
                    {CLAIM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="relative">
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>PROVIDER / DOCTOR</label>
                <div className="relative">
                  <Stethoscope style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
                  <input value={doctorSearch}
                    onChange={e => { setDoctorSearch(e.target.value); setSelectedDoctor(null); setShowDoctorDrop(true); }}
                    onFocus={() => setShowDoctorDrop(true)}
                    placeholder="Search CeenAiX doctors..."
                    className="w-full rounded-lg outline-none"
                    style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }} />
                </div>
                {showDoctorDrop && !selectedDoctor && (
                  <div className="rounded-lg overflow-hidden mt-1"
                    style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', position: 'absolute', width: '100%', zIndex: 10, background: '#fff' }}>
                    {filteredDoctors.map(d => (
                      <button key={d} onClick={() => { setSelectedDoctor(d); setDoctorSearch(d.split(' — ')[0] ?? ''); setShowDoctorDrop(false); }}
                        className="w-full text-left"
                        style={{ padding: '8px 12px', fontSize: 12, color: '#0F172A', borderBottom: '1px solid #F1F5F9', display: 'block', background: '#fff' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
                        <div style={{ fontWeight: 600 }}>{d.split(' — ')[0]}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{d.split(' — ').slice(1).join(' · ')}</div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedDoctor && (
                  <div className="rounded-lg p-2.5 mt-2 flex items-center gap-2"
                    style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <CheckCircle2 style={{ width: 12, height: 12, color: '#2563EB', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#1E40AF', fontWeight: 600 }}>{selectedDoctor}</span>
                  </div>
                )}
              </div>

              <div className="relative">
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>ICD-10 DIAGNOSIS CODE</label>
                <div className="relative">
                  <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
                  <input value={icd10Search}
                    onChange={e => { setIcd10Search(e.target.value); setSelectedIcd10(null); setShowIcdDrop(true); }}
                    onFocus={() => setShowIcdDrop(true)}
                    placeholder="Search ICD-10 codes..."
                    className="w-full rounded-lg outline-none"
                    style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }} />
                </div>
                {showIcdDrop && !selectedIcd10 && (
                  <div className="rounded-lg overflow-hidden mt-1"
                    style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', position: 'absolute', width: '100%', zIndex: 10, background: '#fff' }}>
                    {filteredIcd.map(s => (
                      <button key={s.code} onClick={() => { setSelectedIcd10(s); setIcd10Search(`${s.code} — ${s.desc}`); setShowIcdDrop(false); }}
                        className="w-full text-left"
                        style={{ padding: '8px 12px', fontSize: 12, color: '#0F172A', borderBottom: '1px solid #F1F5F9', display: 'block', background: '#fff' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#2563EB', marginRight: 8 }}>{s.code}</span>
                        <span style={{ color: '#475569' }}>{s.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>CPT CODE (optional)</label>
                  <input value={cpt} onChange={e => setCpt(e.target.value)} placeholder="e.g. 99213"
                    className="w-full rounded-lg outline-none"
                    style={{ padding: '8px 12px', fontSize: 13, fontFamily: 'DM Mono, monospace', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>GROSS AMOUNT (AED)</label>
                  <input type="number" value={grossAmount} onChange={e => setGrossAmount(e.target.value)} placeholder="0.00" min="0"
                    className="w-full rounded-lg outline-none"
                    style={{ padding: '8px 12px', fontSize: 13, fontFamily: 'DM Mono, monospace', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }} />
                </div>
              </div>

              {gross > 0 && (
                <div className="rounded-lg p-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#065F46', marginBottom: 6 }}>CALCULATED SPLIT (10% co-pay)</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Gross', gross], ['Co-pay (patient)', copay], ['Daman pays', damanPays]].map(([label, val]) => (
                      <div key={String(label)}>
                        <div style={{ fontSize: 9, color: '#6EE7B7', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: '#065F46' }}>AED {Number(val).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>SUPPORTING DOCUMENTS</label>
                <div onClick={() => setFileUploaded(true)}
                  className="rounded-lg cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors"
                  style={{ padding: '20px', border: `2px dashed ${fileUploaded ? '#059669' : '#CBD5E1'}`, background: fileUploaded ? '#F0FDF4' : '#F8FAFC' }}>
                  {fileUploaded ? (
                    <>
                      <CheckCircle2 style={{ width: 18, height: 18, color: '#059669' }} />
                      <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>3 files attached</span>
                    </>
                  ) : (
                    <>
                      <Upload style={{ width: 18, height: 18, color: '#94A3B8' }} />
                      <span style={{ fontSize: 12, color: '#64748B' }}>Click to upload referral, SOAP notes, lab results</span>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-xl p-4" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', marginBottom: 10 }}>CLAIM SUMMARY</div>
                <div className="grid grid-cols-2 gap-y-3">
                  {[
                    ['Patient',       selectedPatient?.split(' — ')[0] ?? '—'],
                    ['Service Date',  serviceDate],
                    ['Claim Type',    claimType],
                    ['Doctor',        selectedDoctor?.split(' — ')[0] ?? '—'],
                    ['Diagnosis',     selectedIcd10 ? `${selectedIcd10.code} — ${selectedIcd10.desc}` : '—'],
                    ['Gross Amount',  `AED ${gross.toLocaleString()}`],
                    ['Co-pay (10%)',  `AED ${copay.toLocaleString()}`],
                    ['Daman Pays',    `AED ${damanPays.toLocaleString()}`],
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <div style={{ fontSize: 10, color: '#93C5FD', marginBottom: 1 }}>{k}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {aiChecking && (
                <div className="rounded-lg p-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: 12, color: '#1E40AF', marginBottom: 6 }}>CeenAiX eligibility check running...</div>
                  <div className="rounded-full overflow-hidden" style={{ height: 4, background: '#DBEAFE' }}>
                    <div className="rounded-full" style={{ height: 4, width: '60%', background: '#2563EB', animation: 'pulse 1s infinite' }} />
                  </div>
                </div>
              )}
              {aiDone && aiResult === 'eligible' && (
                <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                  <CheckCircle2 style={{ width: 14, height: 14, color: '#059669', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>AI Check: Eligible</div>
                    <p style={{ fontSize: 11, color: '#6EE7B7', marginTop: 2 }}>Policy active · Service covered · No duplicate detected · PA not required</p>
                  </div>
                </div>
              )}
              {aiDone && aiResult === 'flag' && (
                <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>AI Check: Pre-Authorization Required</div>
                    <p style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>Amount exceeds AED 5,000 — claim routed for manual review.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex-shrink-0 flex gap-2" style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 transition-colors"
              style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 12 }}>
              <ChevronLeft style={{ width: 13, height: 13 }} /> Back
            </button>
          )}
          {step < 2 && (
            <button onClick={handleNext}
              disabled={(step === 0 && !step1Valid) || (step === 1 && !step2Valid)}
              className="flex-1 rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors"
              style={{
                background: (step === 0 && !step1Valid) || (step === 1 && !step2Valid) ? '#E2E8F0' : '#1E3A5F',
                color:      (step === 0 && !step1Valid) || (step === 1 && !step2Valid) ? '#94A3B8' : '#fff',
                fontSize: 13, fontWeight: 700,
              }}>
              Next <ChevronRight style={{ width: 13, height: 13 }} />
            </button>
          )}
          {step === 2 && actionError && (
            <div className="rounded-lg px-3 py-2" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 12 }}>
              {actionError}
            </div>
          )}
          {step === 2 && (
            <button onClick={() => void handleSubmit()} disabled={submitting || aiChecking}
              className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
              style={{ background: submitting || aiChecking ? '#94A3B8' : '#1E3A5F', color: '#fff', fontSize: 14, fontWeight: 700, minHeight: 48 }}>
              <FileText style={{ width: 15, height: 15 }} />
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ClaimDetailDrawer ────────────────────────────────────────────────────────

const ClaimDetailDrawer = ({
  claim, allClaims, onClose, onDecision, onToast, onNavigate,
}: {
  claim: InsuranceClaim;
  allClaims: InsuranceClaim[];
  onClose: () => void;
  onDecision: (id: string, decision: 'approved' | 'denied', note: string) => void;
  onToast: (msg: string, type: Toast['type']) => void;
  onNavigate: (c: InsuranceClaim) => void;
}) => {
  const [decideNote, setDecideNote] = useState('');
  const [denyReason, setDenyReason] = useState(DENY_REASONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<'approved' | 'denied' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentIdx = allClaims.findIndex(c => c.id === claim.id);
  const prevClaim  = currentIdx > 0 ? allClaims[currentIdx - 1] : null;
  const nextClaim  = currentIdx < allClaims.length - 1 ? allClaims[currentIdx + 1] : null;

  const copayAmt  = getCopayAmt(claim);
  const damanPays = getDamanPays(claim);
  const initials  = getInitials(claim.patientName);
  const plan      = getPlanColor(claim.planTier);
  const isPending = claim.status === 'submitted' || claim.status === 'under_review';
  const isApproved = claim.status === 'approved';
  const isDenied   = claim.status === 'denied';
  const eobReady   = isApproved || isDenied || success !== null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    onToast(`Copied ${label}`, 'info');
  };

  const handleApprove = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await approveClaim(claim.id, decideNote.trim() || null);
      setSuccess('approved');
      onDecision(claim.id, 'approved', decideNote || 'Approved by claims officer');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve claim. Please try again.');
      setSubmitting(false);
    }
  };

  const handleDeny = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await denyClaim(claim.id, denyReason);
      setSuccess('denied');
      onDecision(claim.id, 'denied', denyReason);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to deny claim. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full"
      style={{ width: 640, background: '#fff', borderLeft: '1px solid #E2E8F0', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0"
        style={{ padding: '14px 20px', background: '#0F2D4A', borderBottom: '1px solid #1E3A5F' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#93C5FD' }}>{claim.externalRef}</span>
            {claim.planTier && (
              <span className="rounded px-2 py-0.5"
                style={{ background: plan.bg, color: plan.color, fontSize: 10, fontWeight: 700 }}>
                {claim.planTier}
              </span>
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
            {claim.claimType ?? 'Medical Claim'}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{claim.providerName}</div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Claim Summary */}
        <div className="rounded-xl p-4" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Claim Summary</p>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            {[
              ['Claim ID',   claim.externalRef, true ],
              ['Submitted',  formatDate(claim.submittedAt), false],
              ['Type',       claim.claimType ?? '—', false],
              ['Method',     'Manual Review', false],
            ].map(([label, value, copyable]) => (
              <div key={label as string}>
                <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>{label as string}</div>
                <div className="flex items-center gap-1">
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>{value as string}</span>
                  {(copyable as boolean) && (
                    <button onClick={() => copyToClipboard(value as string, 'Claim ID')}
                      style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <Copy style={{ width: 10, height: 10 }} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Patient & Policy */}
        <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <User style={{ width: 12, height: 12, color: '#2563EB' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Patient &amp; Policy</span>
          </div>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563EB, #0D9488)' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{initials}</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{claim.patientName}</div>
              {claim.planTier && (
                <span className="rounded px-2 py-0.5 inline-block mt-1"
                  style={{ background: plan.bg, color: plan.color, fontSize: 10, fontWeight: 700 }}>
                  Daman {claim.planTier}
                </span>
              )}
              {claim.planName && (
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{claim.planName}</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-y-2.5">
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 1 }}>Policy Reference</div>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#334155' }}>—</span>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 1 }}>Co-pay Rate</div>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#334155' }}>{getCopayPct()}%</span>
            </div>
          </div>
        </div>

        {/* Provider & Service */}
        <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <Stethoscope style={{ width: 12, height: 12, color: '#0D9488' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Provider &amp; Service</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{claim.providerName}</div>
          <div className="rounded-lg p-3" style={{ background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{claim.claimType ?? 'Medical Service'}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Submitted {formatDate(claim.submittedAt)}</div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <DollarSign style={{ width: 12, height: 12, color: '#059669' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Financial Breakdown</span>
          </div>
          <div className="space-y-1.5 mb-3">
            <div className="flex justify-between">
              <span style={{ fontSize: 12, color: '#64748B' }}>Gross amount</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{formatCurrency(claim.amountAed)}</span>
            </div>
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 6 }} className="flex justify-between">
              <span style={{ fontSize: 12, color: '#64748B' }}>
                Daman {claim.planTier ?? ''} coverage ({100 - getCopayPct()}%)
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#059669' }}>−{formatCurrency(damanPays)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ fontSize: 12, color: '#64748B' }}>Patient co-pay ({getCopayPct()}%)</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#D97706' }}>{formatCurrency(copayAmt)}</span>
            </div>
            <div style={{ borderTop: '2px solid #E2E8F0', paddingTop: 8, marginTop: 4 }}>
              <div className="flex justify-between mb-1">
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>DAMAN LIABILITY</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 800, color: '#059669' }}>{formatCurrency(damanPays)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>PATIENT LIABILITY</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: '#D97706' }}>{formatCurrency(copayAmt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* EOB */}
        <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <FileText style={{ width: 12, height: 12, color: '#2563EB' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Explanation of Benefits</span>
          </div>
          {eobReady ? (
            <>
              <div className="rounded-lg p-3 mb-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#1E40AF', textAlign: 'center', marginBottom: 6 }}>DAMAN NATIONAL HEALTH INSURANCE</div>
                <div style={{ fontSize: 10, color: '#64748B', textAlign: 'center', marginBottom: 8 }}>Explanation of Benefits</div>
                <div className="grid grid-cols-2 gap-1" style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#475569' }}>
                  <span>Patient:</span><span>{claim.patientName}</span>
                  <span>Date of service:</span><span>{formatDate(claim.submittedAt)}</span>
                  <span>Provider:</span><span>{claim.providerName}</span>
                  <span>Billed:</span><span style={{ color: '#0F172A', fontWeight: 700 }}>{formatCurrency(claim.amountAed)}</span>
                  <span>Daman pays:</span><span style={{ color: '#059669', fontWeight: 700 }}>{formatCurrency(damanPays)}</span>
                  <span>Patient owes:</span><span style={{ color: '#D97706', fontWeight: 700 }}>{formatCurrency(copayAmt)}</span>
                </div>
                <div className="mt-3 text-center" style={{ fontSize: 11, fontWeight: 700, color: (isDenied || success === 'denied') ? '#DC2626' : '#059669' }}>
                  {(isDenied || success === 'denied') ? 'Claim denied ❌' : 'Claim approved ✅'}
                </div>
              </div>
              <button onClick={() => onToast(`EOB downloading — ${getShortRef(claim.externalRef)}`, 'info')}
                className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 mb-2 transition-colors"
                style={{ background: '#1E3A5F', color: '#fff', fontSize: 13, fontWeight: 700 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0F2D4A'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1E3A5F'; }}>
                Download EOB PDF
              </button>
              <button onClick={() => onToast(`EOB emailed to patient · ${getShortRef(claim.externalRef)}`, 'success')}
                className="w-full rounded-lg py-2 flex items-center justify-center gap-2 transition-colors"
                style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 12 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}>
                Email EOB to Patient
              </button>
            </>
          ) : (
            <div className="rounded-lg p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>EOB not yet generated — awaiting decision</span>
            </div>
          )}
        </div>

        {/* Decision (pending only) */}
        {isPending && !success && (
          <div className="rounded-xl p-4" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
            <div className="flex items-center gap-1.5 mb-3">
              <CheckCircle2 style={{ width: 12, height: 12, color: '#059669' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Make Decision</span>
            </div>
            <textarea value={decideNote} onChange={e => setDecideNote(e.target.value)} rows={2}
              placeholder="Optional approval note..."
              className="w-full rounded-lg px-3 py-2 resize-none outline-none mb-2"
              style={{ fontSize: 12, background: '#fff', border: '1px solid #86EFAC', color: '#0F172A' }} />
            {actionError && (
              <div className="rounded-lg px-3 py-2 mb-2" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 12 }}>
                {actionError}
              </div>
            )}
            <button onClick={() => void handleApprove()} disabled={submitting}
              className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 mb-2 transition-colors"
              style={{ background: submitting ? '#94A3B8' : '#059669', color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              {submitting ? 'Processing...' : `Approve — ${formatCurrency(damanPays)} to ${claim.providerName}`}
            </button>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select value={denyReason} onChange={e => setDenyReason(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 outline-none appearance-none"
                  style={{ fontSize: 12, background: '#FFF5F5', border: '1px solid #FCA5A5', color: '#991B1B' }}>
                  {DENY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={() => void handleDeny()} disabled={submitting}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 transition-colors flex-shrink-0"
                style={{ background: submitting ? '#94A3B8' : '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', fontSize: 12, fontWeight: 700 }}>
                <XCircle style={{ width: 12, height: 12 }} /> Deny
              </button>
            </div>
          </div>
        )}

        {success === 'approved' && (
          <div className="rounded-xl p-6 text-center" style={{ background: '#ECFDF5', border: '1px solid #6EE7B7' }}>
            <p className="text-4xl mb-2">✅</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#065F46' }}>Claim approved!</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>EOB generated — payment queued in tonight's batch</p>
          </div>
        )}
        {success === 'denied' && (
          <div className="rounded-xl p-6 text-center" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <p className="text-4xl mb-2">❌</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>Claim denied</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Denial EOB generated and sent to patient & provider</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between flex-shrink-0"
        style={{ padding: '10px 20px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => onToast(`EOB downloading — ${getShortRef(claim.externalRef)}`, 'info')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
            style={{ background: '#F1F5F9', color: '#475569', fontSize: 11, border: '1px solid #E2E8F0' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; }}>
            <FileText style={{ width: 11, height: 11 }} /> EOB
          </button>
          <button onClick={() => {
              flagClaimForReview(claim.id).then(() => {
                onToast(`${getShortRef(claim.externalRef)} flagged for investigation`, 'warning');
              }).catch((err: unknown) => {
                onToast(err instanceof Error ? err.message : 'Failed to flag claim', 'warning');
              });
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
            style={{ background: '#FFF7ED', color: '#EA580C', fontSize: 11, border: '1px solid #FED7AA' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEE7C7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFF7ED'; }}>
            <Flag style={{ width: 11, height: 11 }} /> Flag
          </button>
          <div className="flex items-center gap-1" style={{ fontSize: 10, color: '#94A3B8' }}>
            <Shield style={{ width: 10, height: 10 }} /> DHA auditable
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => prevClaim && onNavigate(prevClaim)} disabled={!prevClaim}
            className="flex items-center gap-0.5 px-2 py-1 rounded transition-colors"
            style={{ fontSize: 11, color: prevClaim ? '#2563EB' : '#CBD5E1' }}>
            <ChevronLeft style={{ width: 12, height: 12 }} /> Prev
          </button>
          <span style={{ fontSize: 10, color: '#CBD5E1' }}>|</span>
          <button onClick={() => nextClaim && onNavigate(nextClaim)} disabled={!nextClaim}
            className="flex items-center gap-0.5 px-2 py-1 rounded transition-colors"
            style={{ fontSize: 11, color: nextClaim ? '#2563EB' : '#CBD5E1' }}>
            Next <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

export const InsuranceClaims = () => {
  const { data, loading, error, claimTotal, refetch, overduePreAuth } = useInsurancePageData();
  const claims  = data?.claims ?? [];
  const profile = data?.profile ?? null;

  // UI state
  const [drawerClaim,  setDrawerClaim]  = useState<InsuranceClaim | null>(null);
  const [appealClaim,  setAppealClaim]  = useState<InsuranceClaim | null>(null);
  const [showEob,      setShowEob]      = useState(false);
  const [showManual,   setShowManual]   = useState(false);
  const [tab,          setTab]          = useState<TabKey>('all');
  const [view,         setView]         = useState<ViewMode>('table');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [openMenuId,   setOpenMenuId]   = useState<string | null>(null);
  const [toasts,       setToasts]       = useState<Toast[]>([]);

  const toast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  // Filtered
  const filtered = useMemo(() => {
    let rows = claims.filter(c => TAB_FILTERS[tab](toStatusKey(c.status)));
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(c =>
        c.patientName.toLowerCase().includes(q) ||
        c.externalRef.toLowerCase().includes(q)  ||
        c.providerName.toLowerCase().includes(q) ||
        (c.claimType ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [claims, tab, search]);

  const paginated  = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const tabCount = (key: TabKey) =>
    claims.filter(c => TAB_FILTERS[key](toStatusKey(c.status))).length;

  // Stat counts
  const approvedCount = tabCount('approved');
  const pendingCount  = tabCount('pending');
  const deniedCount   = tabCount('denied');
  const appealedCount = tabCount('appealed');

  // Total values for footer
  const totalValue    = filtered.reduce((s, c) => s + c.amountAed, 0);
  const totalDaman    = filtered.reduce((s, c) => s + getDamanPays(c), 0);

  // Selection
  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelectedIds(prev => prev.size === paginated.length ? new Set() : new Set(paginated.map(c => c.id)));

  // Decisions
  const applyDecision = useCallback((id: string, decision: 'approved' | 'denied', note: string) => {
    void refetchRef.current();
    toast(
      decision === 'approved' ? `Claim approved — ${note}` : `Claim denied — ${note}`,
      decision === 'approved' ? 'success' : 'warning',
    );
    if (drawerClaim?.id === id) setDrawerClaim(null);
  }, [drawerClaim, toast]);

  const applyUphold = useCallback((_id: string) => {
    void refetchRef.current();
    toast('Appeal upheld — claim approved', 'success');
    setAppealClaim(null);
  }, [toast]);

  const applyDismiss = useCallback((_id: string, reason: string) => {
    void refetchRef.current();
    toast(`Appeal dismissed — ${reason}`, 'warning');
    setAppealClaim(null);
  }, [toast]);

  const bulkApprove = async () => {
    const ids = Array.from(selectedIds);
    try {
      await bulkApproveClaims(ids);
      await refetchRef.current();
      toast(`${ids.length} claims approved in bulk`, 'success');
      setSelectedIds(new Set());
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk approval failed — please retry', 'warning');
    }
  };

  const bulkDeny = async () => {
    const ids = Array.from(selectedIds);
    try {
      await bulkDenyClaims(ids);
      await refetchRef.current();
      toast(`${ids.length} claims denied`, 'warning');
      setSelectedIds(new Set());
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk denial failed — please retry', 'warning');
    }
  };

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <PreAuthAlert item={overduePreAuth} />

      {/* Stat strip */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {[
          { label: 'Total Claims',    value: formatNumber(claims.length), sub: `${formatCurrency(claimTotal)} gross`,            accent: '#1E3A5F', icon: <FileText    style={{ width: 16, height: 16, color: '#1E3A5F' }} /> },
          { label: 'Auto-Approved',   value: approvedCount,               sub: profile?.aiAutoApprovalPercent != null ? `${profile.aiAutoApprovalPercent}% auto-rate` : 'AI processed', accent: '#0D9488', icon: <CheckCircle2 style={{ width: 16, height: 16, color: '#0D9488' }} /> },
          { label: 'Pending Review',  value: pendingCount,                sub: `${formatCurrency(claims.filter(c => c.status === 'submitted' || c.status === 'under_review').reduce((s,c) => s + c.amountAed, 0))} on hold`, accent: '#D97706', icon: <Clock        style={{ width: 16, height: 16, color: '#D97706' }} /> },
          { label: 'Denied',          value: deniedCount,                 sub: claims.length > 0 ? `${Math.round(deniedCount / claims.length * 100)}% denial rate` : '0%',             accent: '#DC2626', icon: <XCircle      style={{ width: 16, height: 16, color: '#DC2626' }} /> },
          { label: 'Under Appeal',    value: appealedCount,               sub: `${formatCurrency(claims.filter(c => c.status === 'appealed').reduce((s,c) => s + getDamanPays(c), 0))} contested`, accent: '#7C3AED', icon: <Scale        style={{ width: 16, height: 16, color: '#7C3AED' }} /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl flex items-center gap-3"
            style={{ background: '#fff', border: '1px solid #E2E8F0', borderLeft: `3px solid ${s.accent}`, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ width: 36, height: 36, background: s.accent + '15' }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: 10, color: s.accent, fontWeight: 600, marginTop: 1 }}>{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Pending banner */}
      {tab === 'pending' && pendingCount > 0 && (
        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
          <AlertTriangle style={{ width: 15, height: 15, color: '#D97706', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#92400E', fontWeight: 600 }}>
            {pendingCount} claims require human review. SLA deadline approaching for {Math.min(pendingCount, 7)} claims.
          </span>
        </div>
      )}

      {/* Table + optional drawer */}
      <div className="flex gap-0 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

            {/* Page header */}
            <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Claims Worklist</h2>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>Claims oversight and payment decisions</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowEob(true)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12, color: '#475569' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}>
                  <Download style={{ width: 13, height: 13 }} /> Export EOB Batch
                </button>
                <button onClick={() => setShowManual(true)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
                  style={{ background: '#1E3A5F', color: '#fff', fontSize: 12, fontWeight: 600 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#0F2D4A'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1E3A5F'; }}>
                  <Plus style={{ width: 13, height: 13 }} /> Manual Claim
                </button>
              </div>
            </div>

            {/* Filter row */}
            <div className="flex items-center gap-2 flex-wrap"
              style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
              <div className="relative flex-1" style={{ minWidth: 220 }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#94A3B8' }} />
                <input value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by patient, claim ID, provider..."
                  maxLength={FORM_FIELD_LIMITS.searchQuery}
                  className="w-full rounded-lg outline-none"
                  style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, fontSize: 12, background: '#fff', border: '1px solid #E2E8F0', color: '#0F172A' }} />
              </div>
              <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                style={{ fontSize: 12, color: '#475569', background: '#fff', border: '1px solid #E2E8F0' }}>
                <Filter style={{ width: 12, height: 12 }} /> Filters
              </button>
              <div className="ml-auto flex items-center gap-1 rounded-lg p-1"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                {(['table', 'card'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)} className="rounded-md p-1.5 transition-all"
                    style={{ background: view === v ? '#fff' : 'transparent', color: view === v ? '#2563EB' : '#94A3B8', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                    {v === 'table' ? <LayoutList style={{ width: 14, height: 14 }} /> : <LayoutGrid style={{ width: 14, height: 14 }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex overflow-x-auto"
              style={{ borderBottom: '1px solid #F1F5F9', padding: '0 16px' }}>
              {TABS.map(t => (
                <button key={t.key}
                  onClick={() => { setTab(t.key); setPage(1); setSelectedIds(new Set()); }}
                  className="flex items-center gap-1.5 py-3 px-3 flex-shrink-0 transition-colors"
                  style={{
                    fontSize: 12, fontWeight: tab === t.key ? 700 : 400,
                    color: tab === t.key ? '#1E3A5F' : '#64748B',
                    borderBottom: tab === t.key ? '2px solid #1E3A5F' : '2px solid transparent',
                    marginBottom: -1,
                  }}>
                  {t.label}
                  <span className="rounded-full px-1.5 py-0.5"
                    style={{ fontSize: 10, fontWeight: 700, background: tab === t.key ? '#EFF6FF' : '#F1F5F9', color: tab === t.key ? '#1E3A5F' : '#94A3B8' }}>
                    {tabCount(t.key)}
                  </span>
                </button>
              ))}
            </div>

            {/* TABLE VIEW */}
            {view === 'table' && (
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                      <th style={{ width: 36, padding: '10px 12px' }}>
                        <input type="checkbox"
                          checked={paginated.length > 0 && selectedIds.size === paginated.length}
                          onChange={toggleAll} style={{ accentColor: '#1E3A5F' }} />
                      </th>
                      {['Claim ID', 'Submitted', 'Patient & Plan', 'Provider', 'Service', 'Gross', 'Co-pay', 'Daman Pays', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textAlign: 'left', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ padding: '48px 12px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                          {loading ? 'Loading claims...' : 'No claims match this filter.'}
                        </td>
                      </tr>
                    ) : paginated.map(claim => {
                      const sk       = toStatusKey(claim.status);
                      const s        = STATUS_MAP[sk];
                      const plan     = getPlanColor(claim.planTier);
                      const isSelected = selectedIds.has(claim.id);
                      const copayAmt = getCopayAmt(claim);
                      const damanPay = getDamanPays(claim);
                      const isAppealed = sk === 'APPEALED';
                      const isPendingRow = sk === 'PENDING' || sk === 'ON_HOLD';
                      return (
                        <tr key={claim.id}
                          style={{ borderBottom: '1px solid #F8FAFC', background: isSelected ? '#EFF6FF' : s.bg, borderLeft: `3px solid ${s.border}`, cursor: 'pointer' }}
                          onClick={() => setDrawerClaim(claim)}>
                          <td style={{ padding: '10px 12px' }}
                            onClick={e => { e.stopPropagation(); toggleSelect(claim.id); }}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(claim.id)} style={{ accentColor: '#1E3A5F' }} />
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <div className="flex items-center gap-1.5">
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: '#2563EB' }}>
                                {getShortRef(claim.externalRef)}
                              </span>
                              <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(claim.externalRef).catch(() => {}); toast('Claim ID copied', 'info'); }}
                                style={{ color: '#CBD5E1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <Copy style={{ width: 10, height: 10 }} />
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: 11, color: '#475569' }}>{formatDate(claim.submittedAt)}</div>
                          </td>
                          <td style={{ padding: '10px 12px', minWidth: 160 }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ width: 22, height: 22, background: '#1E3A5F', color: '#fff', fontSize: 9, fontWeight: 700 }}>
                                {getInitials(claim.patientName)}
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{claim.patientName}</span>
                            </div>
                            {claim.planTier && (
                              <span className="rounded px-1.5 py-0.5"
                                style={{ fontSize: 9, fontWeight: 700, background: plan.bg, color: plan.color }}>
                                Daman {claim.planTier}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', minWidth: 140 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{claim.providerName}</div>
                          </td>
                          <td style={{ padding: '10px 12px', minWidth: 120 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{claim.claimType ?? '—'}</div>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                              {formatCurrency(claim.amountAed)}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#D97706' }}>
                              {formatCurrency(copayAmt)}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#059669' }}>
                              {formatCurrency(damanPay)}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full px-2 py-0.5"
                                style={{ fontSize: 10, fontWeight: 700, background: s.chip, color: s.chipText }}>
                                {s.text}
                              </span>
                              {sk === 'FRAUD_FLAGGED' && <AlertOctagon style={{ width: 12, height: 12, color: '#EA580C' }} />}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setDrawerClaim(claim)}
                                className="rounded p-1 transition-colors"
                                style={{ color: '#2563EB', background: '#EFF6FF' }}
                                title="View details">
                                <Eye style={{ width: 12, height: 12 }} />
                              </button>
                              {isPendingRow && (
                                <>
                                  <button onClick={e => {
                                    e.stopPropagation();
                                    approveClaim(claim.id).then(() => {
                                      void refetchRef.current();
                                      toast(`Claim ${getShortRef(claim.externalRef)} approved`, 'success');
                                    }).catch((err: unknown) => {
                                      toast(err instanceof Error ? err.message : 'Approval failed', 'warning');
                                    });
                                  }}
                                    className="rounded p-1 transition-colors"
                                    style={{ color: '#059669', background: '#F0FDF4' }}
                                    title="Quick Approve">
                                    <CheckCircle2 style={{ width: 12, height: 12 }} />
                                  </button>
                                  <button onClick={e => {
                                    e.stopPropagation();
                                    denyClaim(claim.id, DENY_REASONS[0]!).then(() => {
                                      void refetchRef.current();
                                      toast(`Claim ${getShortRef(claim.externalRef)} denied`, 'warning');
                                    }).catch((err: unknown) => {
                                      toast(err instanceof Error ? err.message : 'Denial failed', 'warning');
                                    });
                                  }}
                                    className="rounded p-1 transition-colors"
                                    style={{ color: '#DC2626', background: '#FFF5F5' }}
                                    title="Quick Deny">
                                    <XCircle style={{ width: 12, height: 12 }} />
                                  </button>
                                </>
                              )}
                              {isAppealed && (
                                <button onClick={() => setAppealClaim(claim)}
                                  className="rounded p-1 transition-colors"
                                  style={{ color: '#7C3AED', background: '#F5F3FF' }}
                                  title="Review appeal">
                                  <Scale style={{ width: 12, height: 12 }} />
                                </button>
                              )}
                              <div className="relative">
                                <button onClick={() => setOpenMenuId(openMenuId === claim.id ? null : claim.id)}
                                  className="rounded p-1"
                                  style={{ color: '#94A3B8', background: 'transparent' }}>
                                  <MoreVertical style={{ width: 12, height: 12 }} />
                                </button>
                                {openMenuId === claim.id && (
                                  <div className="absolute right-0 rounded-xl overflow-hidden z-50"
                                    style={{ top: '100%', width: 180, background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                                    {[
                                      { label: 'View Details',   icon: <Eye style={{ width: 12, height: 12 }} />,          action: () => { setDrawerClaim(claim);     setOpenMenuId(null); } },
                                      { label: 'Download EOB',   icon: <Download style={{ width: 12, height: 12 }} />,     action: () => { toast(`EOB downloaded for ${getShortRef(claim.externalRef)}`, 'success'); setOpenMenuId(null); } },
                                      { label: 'Copy Claim Ref', icon: <Copy style={{ width: 12, height: 12 }} />,          action: () => { navigator.clipboard.writeText(claim.externalRef).catch(() => {}); toast('Claim ID copied', 'info'); setOpenMenuId(null); } },
                                      ...(isPendingRow ? [
                                        { label: 'Quick Approve', icon: <CheckCircle2 style={{ width: 12, height: 12 }} />, action: () => {
                                          setOpenMenuId(null);
                                          approveClaim(claim.id).then(() => {
                                            void refetchRef.current();
                                            toast(`Claim ${getShortRef(claim.externalRef)} approved`, 'success');
                                          }).catch((err: unknown) => {
                                            toast(err instanceof Error ? err.message : 'Approval failed', 'warning');
                                          });
                                        }},
                                        { label: 'Quick Deny', icon: <XCircle style={{ width: 12, height: 12 }} />, action: () => {
                                          setOpenMenuId(null);
                                          denyClaim(claim.id, DENY_REASONS[0]!).then(() => {
                                            void refetchRef.current();
                                            toast(`Claim ${getShortRef(claim.externalRef)} denied`, 'warning');
                                          }).catch((err: unknown) => {
                                            toast(err instanceof Error ? err.message : 'Denial failed', 'warning');
                                          });
                                        }},
                                      ] : []),
                                      ...(isAppealed ? [
                                        { label: 'Review Appeal', icon: <Scale style={{ width: 12, height: 12 }} />,        action: () => { setAppealClaim(claim); setOpenMenuId(null); } },
                                      ] : []),
                                      { label: 'Flag for Review', icon: <Shield style={{ width: 12, height: 12 }} />,      action: () => { toast(`${getShortRef(claim.externalRef)} flagged for review`, 'warning'); setOpenMenuId(null); } },
                                    ].map(item => (
                                      <button key={item.label} onClick={item.action}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                                        style={{ fontSize: 12, color: '#334155', borderBottom: '1px solid #F8FAFC', background: '#fff' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
                                        {item.icon} {item.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CARD VIEW */}
            {view === 'card' && (
              <div className="grid gap-3 p-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {paginated.map(claim => {
                  const sk   = toStatusKey(claim.status);
                  const s    = STATUS_MAP[sk];
                  const plan = getPlanColor(claim.planTier);
                  return (
                    <div key={claim.id} onClick={() => setDrawerClaim(claim)}
                      className="rounded-xl cursor-pointer transition-shadow"
                      style={{ background: s.bg, border: `1px solid ${s.border}30`, borderLeft: `3px solid ${s.border}`, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}>
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: '#2563EB' }}>
                          {getShortRef(claim.externalRef)}
                        </span>
                        <span className="rounded-full px-2 py-0.5" style={{ fontSize: 9, fontWeight: 700, background: s.chip, color: s.chipText }}>{s.text}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{claim.patientName}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>{claim.claimType ?? '—'}</div>
                      <div className="flex items-center justify-between">
                        {claim.planTier && (
                          <span className="rounded px-1.5 py-0.5" style={{ fontSize: 9, fontWeight: 700, background: plan.bg, color: plan.color }}>
                            Daman {claim.planTier}
                          </span>
                        )}
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 800, color: '#059669' }}>
                          {formatCurrency(getDamanPays(claim))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table footer / Pagination */}
            <div className="flex items-center justify-between"
              style={{ padding: '12px 16px', borderTop: '1px solid #F1F5F9', background: '#FAFAFA' }}>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Showing{' '}
                <span style={{ fontWeight: 700, color: '#0F172A' }}>
                  {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)}
                </span>{' '}
                of{' '}
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{filtered.length}</span> claims
                <span style={{ fontFamily: 'DM Mono, monospace', color: '#94A3B8', marginLeft: 8 }}>
                  · {formatCurrency(totalValue)} gross · {formatCurrency(totalDaman)} Daman
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: page === 1 ? '#CBD5E1' : '#475569', background: '#fff', border: '1px solid #E2E8F0' }}>
                  <ChevronLeft style={{ width: 13, height: 13 }} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span style={{ fontSize: 12, color: '#CBD5E1', padding: '0 2px' }}>…</span>
                      )}
                      <button onClick={() => setPage(p)}
                        className="rounded-lg px-2.5 py-1.5 transition-colors"
                        style={{ fontSize: 12, fontWeight: p === page ? 700 : 400, background: p === page ? '#1E3A5F' : '#fff', color: p === page ? '#fff' : '#475569', border: '1px solid #E2E8F0', minWidth: 32 }}>
                        {p}
                      </button>
                    </span>
                  ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: page === totalPages ? '#CBD5E1' : '#475569', background: '#fff', border: '1px solid #E2E8F0' }}>
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detail drawer */}
        {drawerClaim && (
          <div className="flex-shrink-0 overflow-hidden" style={{ width: 640, borderLeft: '1px solid #E2E8F0' }}>
            <ClaimDetailDrawer
              claim={drawerClaim}
              allClaims={filtered}
              onClose={() => setDrawerClaim(null)}
              onDecision={applyDecision}
              onToast={toast}
              onNavigate={setDrawerClaim}
            />
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 right-0 z-[500] flex items-center justify-between"
          style={{ left: 264, padding: '12px 24px', background: '#1E3A5F', borderTop: '1px solid #2D4A6F', boxShadow: '0 -4px 20px rgba(0,0,0,0.25)' }}>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-full"
              style={{ width: 24, height: 24, background: '#0D9488', color: '#fff', fontSize: 11, fontWeight: 700 }}>
              {selectedIds.size}
            </div>
            <span style={{ fontSize: 13, color: '#E2E8F0' }}>claims selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void bulkApprove()}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 transition-colors"
              style={{ background: '#059669', color: '#fff', fontSize: 12, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#047857'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#059669'; }}>
              <CheckCircle2 style={{ width: 13, height: 13 }} /> Approve Selected
            </button>
            <button onClick={() => void bulkDeny()}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 transition-colors"
              style={{ background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#B91C1C'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#DC2626'; }}>
              <XCircle style={{ width: 13, height: 13 }} /> Deny Selected
            </button>
            <button onClick={() => setShowEob(true)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#E2E8F0', fontSize: 12, border: '1px solid rgba(255,255,255,0.2)' }}>
              <Download style={{ width: 13, height: 13 }} /> Export EOBs
            </button>
            <button onClick={() => { toast(`EOBs emailed for ${selectedIds.size} claims`, 'info'); setSelectedIds(new Set()); }}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#E2E8F0', fontSize: 12, border: '1px solid rgba(255,255,255,0.2)' }}>
              <TrendingUp style={{ width: 13, height: 13 }} /> Email EOBs
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              style={{ background: 'transparent', color: '#94A3B8', fontSize: 12, padding: '6px 12px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Click-away for context menus */}
      {openMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
      )}

      {/* Modals */}
      {appealClaim && (
        <AppealReviewModal
          claim={appealClaim}
          onClose={() => setAppealClaim(null)}
          onUphold={applyUphold}
          onDismiss={applyDismiss}
        />
      )}
      {showEob && (
        <EOBExportModal
          totalClaims={claims.length}
          totalValue={claimTotal}
          approvedClaims={approvedCount}
          selectedClaims={selectedIds.size}
          onClose={() => setShowEob(false)}
          onToast={toast}
        />
      )}
      {showManual && (
        <ManualClaimModal
          onClose={() => setShowManual(false)}
          onToast={toast}
        />
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[700] flex flex-col gap-2" style={{ pointerEvents: 'none' }}>
        {toasts.map(t => {
          const c = TOAST_COLORS[t.type];
          return (
            <div key={t.id} className="rounded-xl flex items-center gap-2"
              style={{ padding: '10px 16px', minWidth: 280, maxWidth: 380, pointerEvents: 'auto', background: c.bg, border: `1px solid ${c.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              {t.type === 'success' && <CheckCircle2 style={{ width: 14, height: 14, color: '#059669', flexShrink: 0 }} />}
              {t.type === 'warning' && <AlertTriangle style={{ width: 14, height: 14, color: '#D97706', flexShrink: 0 }} />}
              {t.type === 'info'    && <FileText     style={{ width: 14, height: 14, color: '#2563EB',  flexShrink: 0 }} />}
              <span style={{ fontSize: 12, color: '#0F172A', fontWeight: 500 }}>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </InsuranceShell>
  );
};

export default InsuranceClaims;
