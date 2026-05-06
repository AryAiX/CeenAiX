import React, { useState } from 'react';
import { Upload, FlaskConical, ScanLine, CheckCircle2, AlertTriangle, Clock, RefreshCw, FileText } from 'lucide-react';

const LAB_PENDING = [
  { id: 'LS-002847', patient: 'Ibrahim Al Marzouqi', test: 'K+ Panel · Renal Function', time: '1:58 PM', resource: 'Observation', status: 'failed' },
  { id: 'LS-003241', patient: 'Mohammed Al Shamsi', test: 'Troponin · BNP', time: '2:05 PM', resource: 'DiagnosticReport', status: 'pending' },
  { id: 'LS-003412', patient: 'Noura Al Khoury', test: 'Beta-HCG · TSH', time: '2:01 PM', resource: 'Observation', status: 'pending' },
  { id: 'LS-003701', patient: 'Hessa Al Nuaimi', test: 'TSH · Free T4', time: '—', resource: 'Observation', status: 'queued' },
  { id: 'LS-003812', patient: 'Saeed Al Mansoori', test: 'HbA1c · Glucose', time: '—', resource: 'DiagnosticReport', status: 'queued' },
];

const RAD_PENDING = [
  { id: 'MRI-20260407-002', patient: 'Aisha Al Mansoori', study: 'Lumbar Spine MRI', resource: 'ImagingStudy', status: 'pending' },
  { id: 'CT-20260407-001', patient: 'Hassan Al Mansoori', study: 'CT Chest', resource: 'DiagnosticReport', status: 'pending' },
  { id: 'USS-20260407-002', patient: 'Layla Al Rasheed', study: 'Abdominal USS', resource: 'ImagingStudy', status: 'queued' },
];

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = {
    submitted: { bg: 'rgba(16,185,129,0.1)', color: '#10B981', label: 'Submitted ✓' },
    pending:   { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'Pending' },
    failed:    { bg: 'rgba(239,68,68,0.1)',  color: '#EF4444', label: 'Failed ✗' },
    queued:    { bg: 'rgba(148,163,184,0.1)', color: '#94A3B8', label: 'Queued' },
  }[status] || { bg: '#F1F5F9', color: '#64748B', label: status };
  return <span className="px-2 py-0.5 rounded-full font-bold" style={{ fontSize: 9, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
};

const ResourceBadge: React.FC<{ resource: string }> = ({ resource }) => (
  <span className="px-1.5 py-0.5 rounded font-mono font-bold" style={{ fontSize: 8, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.15)' }}>
    FHIR: {resource}
  </span>
);

const NABIDHPage: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitAll = () => {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 2000);
  };

  const labSubmitted = 42;
  const labTotal = 47;
  const radSubmitted = 25;
  const radTotal = 28;
  const total = labTotal + radTotal;
  const totalSubmitted = labSubmitted + radSubmitted;
  const totalPending = total - totalSubmitted;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5" style={{ background: '#F8FAFC', scrollbarWidth: 'none' }}>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <Upload style={{ width: 20, height: 20, color: '#7C3AED' }} />
          <h1 className="font-black text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20 }}>
            NABIDH Submission Centre
          </h1>
        </div>
        <div className="text-slate-500" style={{ fontSize: 12 }}>
          Lab & Radiology Portal › NABIDH · Dubai Health Authority HIE Integration · FHIR R4
        </div>
      </div>

      {/* Overview strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Today', value: total, sub: 'Lab + Radiology', color: '#7C3AED', icon: FileText },
          { label: 'Submitted', value: totalSubmitted, sub: `${Math.round(totalSubmitted / total * 100)}% success rate`, color: '#10B981', icon: CheckCircle2 },
          { label: 'Pending', value: totalPending, sub: 'Awaiting submission', color: '#F59E0B', icon: Clock },
          { label: 'Failed', value: 1, sub: 'Require resubmission', color: '#EF4444', icon: AlertTriangle },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E2E8F0', borderLeft: `3px solid ${card.color}` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                  <Icon style={{ width: 15, height: 15, color: card.color }} />
                </div>
              </div>
              <div className="font-black" style={{ fontFamily: 'DM Mono, monospace', fontSize: 26, color: card.color }}>{card.value}</div>
              <div className="font-semibold text-slate-700" style={{ fontSize: 12 }}>{card.label}</div>
              <div className="text-slate-400" style={{ fontSize: 10 }}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Main submit button */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, #5B21B6, #7C3AED)', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-black text-white mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16 }}>
              {submitted ? 'All Pending Submissions Sent ✓' : `${totalPending} Pending Submissions`}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              {submitted ? 'NABIDH HIE updated successfully' : 'Lab results (5) + Radiology reports (3) ready to submit'}
            </div>
          </div>
          <button
            onClick={handleSubmitAll}
            disabled={submitting || submitted}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', fontSize: 13 }}>
            {submitting ? <RefreshCw style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> : <Upload style={{ width: 15, height: 15 }} />}
            {submitting ? 'Submitting...' : submitted ? 'Submitted ✓' : 'Submit All Pending'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.8)' }} />
              <span className="font-bold text-white" style={{ fontSize: 11 }}>Laboratory</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-full rounded-full" style={{ width: `${(labSubmitted / labTotal) * 100}%`, background: '#fff' }} />
            </div>
            <div className="flex justify-between">
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{labSubmitted}/{labTotal} submitted</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{Math.round(labSubmitted / labTotal * 100)}%</span>
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2 mb-2">
              <ScanLine style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.8)' }} />
              <span className="font-bold text-white" style={{ fontSize: 11 }}>Radiology</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-full rounded-full" style={{ width: `${(radSubmitted / radTotal) * 100}%`, background: '#fff' }} />
            </div>
            <div className="flex justify-between">
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{radSubmitted}/{radTotal} submitted</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{Math.round(radSubmitted / radTotal * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Lab pending */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', borderTop: '3px solid #4F46E5' }}>
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <FlaskConical style={{ width: 14, height: 14, color: '#4F46E5' }} />
            <span className="font-bold text-indigo-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Lab Results</span>
            <span className="ml-auto font-black" style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#4F46E5' }}>{labSubmitted}/{labTotal}</span>
          </div>

          {/* FHIR resources legend */}
          <div className="px-5 py-2 flex gap-3" style={{ borderBottom: '1px solid #F8FAFC', background: '#FAFAFA' }}>
            <span style={{ fontSize: 9, color: '#94A3B8' }}>FHIR Resources:</span>
            {['Observation', 'DiagnosticReport', 'Patient', 'Encounter'].map(r => (
              <span key={r} className="font-mono font-bold" style={{ fontSize: 8, color: '#8B5CF6' }}>{r}</span>
            ))}
          </div>

          <div>
            {LAB_PENDING.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #F8FAFC' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8' }}>{item.id}</span>
                    <ResourceBadge resource={item.resource} />
                  </div>
                  <div className="font-semibold text-slate-800" style={{ fontSize: 12 }}>{item.patient}</div>
                  <div className="text-slate-400 truncate" style={{ fontSize: 10 }}>{item.test}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={item.status} />
                  {item.status !== 'queued' && (
                    <button className="text-xs px-2 py-0.5 rounded-lg font-semibold hover:opacity-80" style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 9 }}>
                      {item.status === 'failed' ? 'Retry' : 'Submit'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radiology pending */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', borderTop: '3px solid #1D4ED8' }}>
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <ScanLine style={{ width: 14, height: 14, color: '#1D4ED8' }} />
            <span className="font-bold text-blue-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Radiology Reports</span>
            <span className="ml-auto font-black" style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#1D4ED8' }}>{radSubmitted}/{radTotal}</span>
          </div>

          <div className="px-5 py-2 flex gap-3" style={{ borderBottom: '1px solid #F8FAFC', background: '#FAFAFA' }}>
            <span style={{ fontSize: 9, color: '#94A3B8' }}>FHIR Resources:</span>
            {['ImagingStudy', 'DiagnosticReport', 'Patient'].map(r => (
              <span key={r} className="font-mono font-bold" style={{ fontSize: 8, color: '#8B5CF6' }}>{r}</span>
            ))}
          </div>

          <div>
            {RAD_PENDING.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #F8FAFC' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8' }}>{item.id}</span>
                    <ResourceBadge resource={item.resource} />
                  </div>
                  <div className="font-semibold text-slate-800" style={{ fontSize: 12 }}>{item.patient}</div>
                  <div className="text-slate-400 truncate" style={{ fontSize: 10 }}>{item.study}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={item.status} />
                  <button className="text-xs px-2 py-0.5 rounded-lg font-semibold hover:opacity-80" style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 9 }}>Submit</button>
                </div>
              </div>
            ))}

            {/* Already submitted summary */}
            <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.04)', borderBottom: '1px solid #F8FAFC' }}>
              <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981', flexShrink: 0 }} />
              <div>
                <div className="font-semibold text-slate-700" style={{ fontSize: 12 }}>25 reports already submitted today</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>Successfully transmitted to NABIDH HIE</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NABIDHPage;
