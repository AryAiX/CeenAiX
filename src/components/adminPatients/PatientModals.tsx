import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { AdminPatient } from '../../data/adminPatientsData';

interface ExportModalProps {
  onClose: () => void;
  showToast: (msg: string) => void;
}

interface StatusModalProps {
  patient: AdminPatient;
  action: 'flag' | 'suspend' | 'deactivate';
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

interface RegisterModalProps {
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function ExportModal({ onClose, showToast }: ExportModalProps) {
  const [scope, setScope] = useState<'all' | 'filter' | 'selected'>('all');
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [fields, setFields] = useState({
    id: true, emiratesId: true, insurance: true,
    regDate: true, lastActive: true, status: true,
    clinical: false, contact: false,
  });
  const [justification, setJustification] = useState('');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const needsJustification = fields.clinical || fields.contact;

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => { setExporting(false); setDone(true); }, 1800);
  };

  const handleDownload = () => {
    showToast('✅ Patient data exported — 48,231 records');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: 440, background: '#1E293B', border: '1px solid #334155' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid #334155' }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>Export Patient Data</div>
          <button onClick={onClose} style={{ color: '#64748B' }} className="hover:text-slate-200 transition-colors">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div>
            <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Scope</div>
            {[
              { val: 'all', label: 'All patients (48,231)' },
              { val: 'filter', label: 'Current filter results' },
              { val: 'selected', label: 'Selected patients only' },
            ].map(o => (
              <label key={o.val} className="flex items-center gap-3 mb-2 cursor-pointer">
                <input type="radio" checked={scope === o.val} onChange={() => setScope(o.val as any)} style={{ accentColor: '#0D9488' }} />
                <span style={{ fontSize: 13, color: '#CBD5E1' }}>{o.label}</span>
              </label>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Format</div>
            <div className="flex gap-2">
              {(['csv', 'excel', 'pdf'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className="px-4 py-2 rounded-lg transition-colors uppercase"
                  style={{
                    fontSize: 11, fontWeight: 700,
                    background: format === f ? '#0D9488' : '#334155',
                    color: format === f ? '#fff' : '#64748B',
                    border: `1px solid ${format === f ? '#0D9488' : '#475569'}`,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Fields to Include</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'id', label: 'Patient ID + Name' },
                { key: 'emiratesId', label: 'Emirates ID (masked)' },
                { key: 'insurance', label: 'Insurance details' },
                { key: 'regDate', label: 'Registration date' },
                { key: 'lastActive', label: 'Last active date' },
                { key: 'status', label: 'Status' },
                { key: 'clinical', label: 'Clinical data (PHI)', phi: true },
                { key: 'contact', label: 'Contact details (PHI)', phi: true },
              ].map(f => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fields[f.key as keyof typeof fields]}
                    onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.checked }))}
                    style={{ accentColor: '#0D9488' }}
                  />
                  <span style={{ fontSize: 12, color: f.phi ? '#FCD34D' : '#CBD5E1' }}>{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          {needsJustification && (
            <div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>Reason for export (required for PHI):</div>
              <textarea
                value={justification}
                onChange={e => setJustification(e.target.value)}
                rows={2}
                style={{
                  width: '100%', background: '#334155', border: '1px solid #475569', borderRadius: 8,
                  color: '#F1F5F9', fontSize: 12, padding: '8px 10px', resize: 'none', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div
                className="flex items-start gap-2 p-3 rounded-lg mt-2"
                style={{ background: 'rgba(180,83,9,0.15)', border: '1px solid rgba(180,83,9,0.3)' }}
              >
                <span style={{ fontSize: 11, color: '#FCD34D' }}>
                  Export of patient health information is logged and audited per UAE PDPL.
                </span>
              </div>
            </div>
          )}

          {done ? (
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-3 rounded-xl transition-colors"
              style={{ background: '#059669', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none' }}
            >
              <Download style={{ width: 16, height: 16 }} />
              Export ready — 2.4MB {format.toUpperCase()} · Download
            </button>
          ) : (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="py-3 rounded-xl transition-all"
              style={{
                background: exporting ? 'rgba(13,148,136,0.4)' : '#0D9488',
                color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: exporting ? 'wait' : 'pointer',
              }}
            >
              {exporting ? 'Preparing 48,231 records...' : 'Generate Export'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatusActionModal({ patient, action, onClose, onConfirm }: StatusModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const config = {
    flag: {
      title: 'Flag Patient Account',
      color: '#FB923C', bg: 'rgba(154,52,18,0.2)',
      reasons: ['Duplicate account', 'Suspicious activity', 'Fraud reported', 'Incorrect data', 'Policy violation', 'Other'],
      impact: 'Patient retains access. Flag visible to admin.',
      btn: '🚩 Flag Account',
    },
    suspend: {
      title: 'Suspend Patient Account',
      color: '#F87171', bg: 'rgba(153,27,27,0.2)',
      reasons: ['Fraudulent activity', 'Policy violation', 'Account compromise', 'Duplicate account', 'Other'],
      impact: 'Patient cannot access portal until reinstated.',
      btn: '🔒 Suspend Account',
    },
    deactivate: {
      title: 'Deactivate Patient Account',
      color: '#94A3B8', bg: 'rgba(51,65,85,0.5)',
      reasons: ['Patient request', 'Inactivity', 'Account migration', 'Other'],
      impact: 'Patient loses portal access. Can be reactivated.',
      btn: '⏸ Deactivate Account',
    },
  }[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: 400, background: '#1E293B', border: '1px solid #334155' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #334155' }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, fontWeight: 700, color: config.color }}>{config.title}</div>
          <button onClick={onClose} style={{ color: '#64748B' }} className="hover:text-slate-200 transition-colors">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div style={{ fontSize: 13, color: '#CBD5E1' }}>
            Patient: <span style={{ fontWeight: 700, color: '#F1F5F9' }}>{patient.name}</span> ({patient.ptId})
          </div>

          <div>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>Reason (required):</div>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{
                width: '100%', background: '#334155', border: '1px solid #475569', borderRadius: 8,
                color: '#F1F5F9', fontSize: 12, padding: '8px 10px', outline: 'none',
              }}
            >
              <option value="">Select reason...</option>
              {config.reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {reason === 'Other' && (
            <div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>Notes (required):</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{
                  width: '100%', background: '#334155', border: '1px solid #475569', borderRadius: 8,
                  color: '#F1F5F9', fontSize: 12, padding: '8px 10px', resize: 'none', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div
            className="p-3 rounded-lg"
            style={{ background: config.bg, border: `1px solid ${config.color}40` }}
          >
            <div style={{ fontSize: 11, color: config.color }}>Impact: {config.impact}</div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl transition-colors"
              style={{ background: '#334155', color: '#94A3B8', border: '1px solid #475569', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              onClick={() => reason && onConfirm(reason)}
              disabled={!reason}
              className="flex-1 py-2.5 rounded-xl transition-all"
              style={{
                background: reason ? config.bg : 'rgba(51,65,85,0.3)',
                color: reason ? config.color : '#475569',
                border: `1px solid ${reason ? config.color + '60' : '#334155'}`,
                fontSize: 13, fontWeight: 700, cursor: reason ? 'pointer' : 'not-allowed',
              }}
            >
              {config.btn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterPatientModal({ onClose, showToast }: RegisterModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', nameAr: '', dob: '', gender: '', nationality: '', emiratesId: '', phone: '', email: '' });
  const [insurance, setInsurance] = useState({ provider: '', policy: '', plan: '', validFrom: '', validTo: '', memberId: '' });

  const handleRegister = () => {
    showToast('✅ Patient registered successfully');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: 560, background: '#1E293B', border: '1px solid #334155' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #334155' }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>Register Patient</div>
          <button onClick={onClose} style={{ color: '#64748B' }} className="hover:text-slate-200 transition-colors">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="flex gap-0 px-6 pt-5 mb-5">
          {['Personal Details', 'Insurance', 'Care Team'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold"
                  style={{
                    fontSize: 12,
                    background: step > i + 1 ? '#0D9488' : step === i + 1 ? '#0D9488' : '#334155',
                    color: step >= i + 1 ? '#fff' : '#64748B',
                  }}
                >
                  {i + 1}
                </div>
                <span style={{ fontSize: 11, color: step === i + 1 ? '#F1F5F9' : '#64748B' }}>{s}</span>
              </div>
              {i < 2 && <div style={{ width: 32, height: 1, background: '#334155', margin: '0 8px' }} />}
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Full Name (EN)', placeholder: 'Full name in English' },
                { key: 'nameAr', label: 'Full Name (AR)', placeholder: 'الاسم بالعربي' },
                { key: 'dob', label: 'Date of Birth', placeholder: 'DD/MM/YYYY' },
                { key: 'gender', label: 'Gender', placeholder: 'Male / Female' },
                { key: 'nationality', label: 'Nationality', placeholder: 'e.g. Emirati' },
                { key: 'emiratesId', label: 'Emirates ID', placeholder: '784-XXXX-XXXXXXX-X' },
                { key: 'phone', label: 'Mobile', placeholder: '+971 XX XXX XXXX' },
                { key: 'email', label: 'Email', placeholder: 'patient@email.com' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{
                      width: '100%', height: 36, background: '#334155', border: '1px solid #475569',
                      borderRadius: 8, color: '#F1F5F9', fontSize: 12, padding: '0 10px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'provider', label: 'Insurance Provider', placeholder: 'e.g. Daman Gold' },
                { key: 'policy', label: 'Policy Number', placeholder: 'Policy #' },
                { key: 'plan', label: 'Plan Type', placeholder: 'Gold / Silver / Basic' },
                { key: 'memberId', label: 'Member ID', placeholder: 'Member ID' },
                { key: 'validFrom', label: 'Valid From', placeholder: 'DD/MM/YYYY' },
                { key: 'validTo', label: 'Valid To', placeholder: 'DD/MM/YYYY' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input
                    value={insurance[f.key as keyof typeof insurance]}
                    onChange={e => setInsurance(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{
                      width: '100%', height: 36, background: '#334155', border: '1px solid #475569',
                      borderRadius: 8, color: '#F1F5F9', fontSize: 12, padding: '0 10px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 4 }}>Primary Doctor (search)</label>
                <input
                  placeholder="Search by name or DHA license..."
                  style={{
                    width: '100%', height: 36, background: '#334155', border: '1px solid #475569',
                    borderRadius: 8, color: '#F1F5F9', fontSize: 12, padding: '0 10px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 4 }}>Organization / Clinic</label>
                <input
                  placeholder="Search organization..."
                  style={{
                    width: '100%', height: 36, background: '#334155', border: '1px solid #475569',
                    borderRadius: 8, color: '#F1F5F9', fontSize: 12, padding: '0 10px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                Optional: pre-load health conditions and allergies after registration.
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-5 py-2.5 rounded-xl transition-colors"
                style={{ background: '#334155', color: '#94A3B8', border: '1px solid #475569', fontSize: 13 }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => step < 3 ? setStep(s => s + 1) : handleRegister()}
              className="flex-1 py-2.5 rounded-xl transition-colors"
              style={{ background: '#0D9488', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none' }}
            >
              {step < 3 ? 'Next →' : 'Register Patient'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
