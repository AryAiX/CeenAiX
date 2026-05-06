import { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Download, Loader2, ChevronRight } from 'lucide-react';
import { AdminDoctor } from '../../data/adminDoctorsData';

interface ApproveModalProps {
  doctorName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ApproveModal({ doctorName, onClose, onConfirm }: ApproveModalProps) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onConfirm(); }, 1200);
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
          <CheckCircle2 style={{ width: 20, height: 20, color: '#10B981' }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Approve Doctor</div>
          <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>This will activate the account and grant platform access</div>
        </div>
      </div>
      <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>{doctorName}</div>
        <div style={{ fontSize: 12, color: '#6EE7B7', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
          DHA license verified · All documents complete · Ready to activate
        </div>
      </div>
      <div className="flex flex-col gap-2 mb-5">
        {['Platform access will be granted immediately', 'Doctor will receive welcome email with login credentials', 'Account will be marked as Verified · Active', 'DHA approval timestamp will be logged'].map(item => (
          <div key={item} className="flex items-center gap-2">
            <ChevronRight style={{ width: 12, height: 12, color: '#0D9488' }} />
            <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{item}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}>
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-colors"
          style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: '#0D9488', color: '#fff', border: 'none' }}
          onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.background = '#0F766E')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#0D9488')}
        >
          {loading ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Activating...</> : <><CheckCircle2 style={{ width: 14, height: 14 }} /> Approve & Activate</>}
        </button>
      </div>
    </ModalShell>
  );
}

interface RejectModalProps {
  doctorName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const REJECT_REASONS = [
  'DHA license number not found in registry',
  'License mismatch — details do not match DHA records',
  'Missing required documents',
  'Fraudulent or altered documents detected',
  'Sanctions or disciplinary record on file',
  'Incomplete application — did not respond to requests',
  'Other',
];

export function RejectModal({ doctorName, onClose, onConfirm }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
          <XCircle style={{ width: 20, height: 20, color: '#EF4444' }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Reject Application</div>
          <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>This action cannot be undone without re-applying</div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>{doctorName}</div>
      <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 12 }}>Select rejection reason (required)</div>
      <div className="flex flex-col gap-2 mb-4">
        {REJECT_REASONS.map(r => (
          <label key={r} className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-xl transition-colors" style={{ background: reason === r ? 'rgba(239,68,68,0.08)' : 'rgba(51,65,85,0.3)', border: `1px solid ${reason === r ? 'rgba(239,68,68,0.3)' : 'rgba(51,65,85,0.5)'}` }}>
            <input type="radio" checked={reason === r} onChange={() => setReason(r)} className="accent-red-500" />
            <span style={{ fontSize: 12, color: reason === r ? '#FCA5A5' : '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{r}</span>
          </label>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Additional notes for the doctor (optional)..."
        rows={3}
        className="w-full rounded-xl px-4 py-3 resize-none mb-4"
        style={{ background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }}
      />
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}>
          Cancel
        </button>
        <button
          onClick={() => reason && onConfirm(reason)}
          disabled={!reason}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-colors"
          style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: reason ? 'rgba(239,68,68,0.8)' : '#334155', color: reason ? '#fff' : '#64748B', border: 'none', opacity: reason ? 1 : 0.5 }}
        >
          <XCircle style={{ width: 14, height: 14 }} /> Reject Application
        </button>
      </div>
    </ModalShell>
  );
}

interface StatusActionModalProps {
  doctor: AdminDoctor;
  action: 'flag' | 'suspend' | 'deactivate';
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const FLAG_REASONS = ['Patient complaints', 'Billing anomaly', 'License concern', 'Professional misconduct', 'Investigation pending', 'Other'];
const SUSPEND_REASONS = ['License expired', 'License revoked by DHA', 'Fraud investigation', 'Patient safety concern', 'Manual suspension', 'Other'];

export function DoctorStatusActionModal({ doctor, action, onClose, onConfirm }: StatusActionModalProps) {
  const [reason, setReason] = useState('');
  const reasons = action === 'flag' ? FLAG_REASONS : SUSPEND_REASONS;
  const isSuspend = action === 'suspend';
  const color = isSuspend ? '#EF4444' : '#FB923C';
  const bgColor = isSuspend ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)';
  const borderColor = isSuspend ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)';

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: bgColor }}>
          <AlertTriangle style={{ width: 20, height: 20, color }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {action === 'flag' ? 'Flag Account' : action === 'suspend' ? 'Suspend Account' : 'Deactivate Account'}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{doctor.name}</div>
        </div>
      </div>
      {isSuspend && (
        <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: 12, color: '#FCA5A5', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
            Suspension will immediately revoke platform access. The doctor will be unable to accept appointments or access patient records.
          </div>
        </div>
      )}
      <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Reason (required)</div>
      <div className="flex flex-col gap-2 mb-4">
        {reasons.map(r => (
          <label key={r} className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-xl" style={{ background: reason === r ? bgColor : 'rgba(51,65,85,0.3)', border: `1px solid ${reason === r ? borderColor : 'rgba(51,65,85,0.5)'}` }}>
            <input type="radio" checked={reason === r} onChange={() => setReason(r)} />
            <span style={{ fontSize: 12, color: reason === r ? color : '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{r}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}>Cancel</button>
        <button
          onClick={() => reason && onConfirm(reason)}
          disabled={!reason}
          className="flex-1 py-2.5 rounded-xl transition-colors"
          style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: reason ? (isSuspend ? 'rgba(239,68,68,0.8)' : 'rgba(249,115,22,0.8)') : '#334155', color: reason ? '#fff' : '#64748B', border: 'none' }}
        >
          Confirm {action.charAt(0).toUpperCase() + action.slice(1)}
        </button>
      </div>
    </ModalShell>
  );
}

interface AddDoctorModalProps {
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function AddDoctorModal({ onClose, showToast }: AddDoctorModalProps) {
  const [step, setStep] = useState(1);
  const [dhaChecking, setDhaChecking] = useState(false);
  const [dhaResult, setDhaResult] = useState<'found' | 'not-found' | null>(null);
  const [licenseNum, setLicenseNum] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', specialty: '', clinic: '' });

  const handleDhaCheck = () => {
    setDhaChecking(true);
    setDhaResult(null);
    setTimeout(() => {
      setDhaResult(licenseNum.startsWith('DHA-') ? 'found' : 'not-found');
      setDhaChecking(false);
    }, 1500);
  };

  const handleSubmit = () => {
    showToast('✅ Doctor application submitted — pending review');
    onClose();
  };

  const STEPS = ['Personal Info', 'DHA Verification', 'Review & Submit'];

  return (
    <ModalShell onClose={onClose} wide>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: 4 }}>Add New Doctor</div>
      <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 20 }}>Invite and verify a new doctor for the platform</div>

      <div className="flex items-center mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: step > i + 1 ? '#0D9488' : step === i + 1 ? '#0D9488' : '#334155',
                  border: `2px solid ${step >= i + 1 ? '#0D9488' : '#334155'}`,
                  fontSize: 13, fontWeight: 700, color: step >= i + 1 ? '#fff' : '#64748B', fontFamily: 'DM Mono, monospace',
                }}
              >
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 10, color: step >= i + 1 ? '#2DD4BF' : '#475569', fontFamily: 'Inter, sans-serif', marginTop: 4, whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-2 mb-4" style={{ background: step > i + 1 ? '#0D9488' : '#334155', minWidth: 32 }} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {([
              { label: 'Full Name', key: 'name', placeholder: 'Dr. First Last' },
              { label: 'Email Address', key: 'email', placeholder: 'doctor@clinic.ae' },
              { label: 'Phone Number', key: 'phone', placeholder: '+971 5X XXX XXXX' },
              { label: 'Specialty', key: 'specialty', placeholder: 'e.g. Cardiology' },
            ] as { label: string; key: keyof typeof form; placeholder: string }[]).map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>{f.label}</div>
                <input
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl"
                  style={{ background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }}
                />
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>Primary Clinic</div>
            <input
              value={form.clinic}
              onChange={e => setForm(p => ({ ...p, clinic: e.target.value }))}
              placeholder="e.g. Al Noor Medical Center"
              className="w-full px-4 py-2.5 rounded-xl"
              style={{ background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
            Enter the doctor's DHA license number to verify against the DHA HAAD registry.
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>DHA License Number</div>
            <div className="flex gap-2">
              <input
                value={licenseNum}
                onChange={e => setLicenseNum(e.target.value)}
                placeholder="DHA-PRAC-YYYY-XXXXXX"
                className="flex-1 px-4 py-2.5 rounded-xl"
                style={{ background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', fontSize: 13, fontFamily: 'DM Mono, monospace', outline: 'none' }}
              />
              <button
                onClick={handleDhaCheck}
                disabled={!licenseNum.trim() || dhaChecking}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors"
                style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: '#0D9488', color: '#fff', border: 'none', flexShrink: 0 }}
              >
                {dhaChecking ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : null}
                {dhaChecking ? 'Checking...' : 'Verify with DHA'}
              </button>
            </div>
          </div>
          {dhaResult && (
            <div
              className="rounded-xl p-4"
              style={{
                background: dhaResult === 'found' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${dhaResult === 'found' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}
            >
              <div className="flex items-center gap-2">
                {dhaResult === 'found' ? <CheckCircle2 style={{ width: 18, height: 18, color: '#10B981' }} /> : <XCircle style={{ width: 18, height: 18, color: '#EF4444' }} />}
                <span style={{ fontSize: 14, fontWeight: 600, color: dhaResult === 'found' ? '#10B981' : '#EF4444', fontFamily: 'Inter, sans-serif' }}>
                  {dhaResult === 'found' ? 'License Found & Valid' : 'License Not Found in DHA Registry'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginTop: 6 }}>
                {dhaResult === 'found'
                  ? 'The license number matches a valid DHA record. You may proceed to submit the application.'
                  : 'No matching record found. Please verify the license number with the doctor and try again.'}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
            <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>Application Summary</div>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Name', value: form.name || '—' },
                { label: 'Email', value: form.email || '—' },
                { label: 'Phone', value: form.phone || '—' },
                { label: 'Specialty', value: form.specialty || '—' },
                { label: 'Clinic', value: form.clinic || '—' },
                { label: 'DHA License', value: licenseNum || '—' },
                { label: 'DHA Verification', value: dhaResult === 'found' ? '✅ Verified' : '⚠️ Not verified' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.2)' }}>
            <div style={{ fontSize: 12, color: '#5EEAD4', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
              The doctor will receive an email with a link to complete their profile and upload required documents before the account can be fully activated.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="px-4 py-2.5 rounded-xl" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}>
            Back
          </button>
        )}
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: 'transparent', color: '#64748B', border: '1px solid #334155' }}>
          Cancel
        </button>
        <div className="flex-1" />
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors"
            style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: '#0D9488', color: '#fff', border: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0F766E'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0D9488'}
          >
            Continue <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors"
            style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: '#0D9488', color: '#fff', border: 'none' }}
          >
            <CheckCircle2 style={{ width: 14, height: 14 }} /> Submit Application
          </button>
        )}
      </div>
    </ModalShell>
  );
}

interface ExportDoctorsModalProps {
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function ExportDoctorsModal({ onClose, showToast }: ExportDoctorsModalProps) {
  const [format, setFormat] = useState('Excel');
  const [scope, setScope] = useState('All verified doctors');
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState({ name: true, license: true, specialty: true, expiry: true, clinic: true, contact: false, revenue: false });

  const handleExport = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); showToast(`📤 Exporting ${scope} as ${format}...`); onClose(); }, 1400);
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: 4 }}>Export Doctor Registry</div>
      <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 20 }}>Export complies with UAE PDPL data handling requirements</div>

      <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Export Scope</div>
      <div className="flex flex-col gap-2 mb-4">
        {['All verified doctors', 'Pending verification only', 'License expiry alerts', 'Flagged & suspended only', 'Full registry (all statuses)'].map(s => (
          <label key={s} className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-xl" style={{ background: scope === s ? 'rgba(13,148,136,0.08)' : 'rgba(51,65,85,0.3)', border: `1px solid ${scope === s ? 'rgba(13,148,136,0.3)' : 'rgba(51,65,85,0.5)'}` }}>
            <input type="radio" checked={scope === s} onChange={() => setScope(s)} className="accent-teal-500" />
            <span style={{ fontSize: 12, color: scope === s ? '#2DD4BF' : '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{s}</span>
          </label>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Format</div>
      <div className="flex gap-2 mb-4">
        {['CSV', 'Excel', 'PDF (DHA Report)'].map(f => (
          <button key={f} onClick={() => setFormat(f)} className="flex-1 py-2 rounded-xl transition-colors" style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: format === f ? 'rgba(13,148,136,0.15)' : '#334155', color: format === f ? '#2DD4BF' : '#64748B', border: `1px solid ${format === f ? 'rgba(13,148,136,0.4)' : '#475569'}` }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Fields to Include</div>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {(Object.keys(fields) as (keyof typeof fields)[]).map(k => (
          <label key={k} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fields[k]} onChange={e => setFields(p => ({ ...p, [k]: e.target.checked }))} className="accent-teal-500 rounded" />
            <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}>Cancel</button>
        <button onClick={handleExport} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: '#0D9488', color: '#fff', border: 'none' }}>
          {loading ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Exporting...</> : <><Download style={{ width: 14, height: 14 }} /> Export</>}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div
        className="relative w-full overflow-y-auto"
        style={{
          maxWidth: wide ? 560 : 480,
          maxHeight: '90vh',
          background: '#1E293B',
          border: '1px solid #334155',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors" style={{ color: '#475569' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
        {children}
      </div>
    </div>
  );
}
