import React from 'react';
import { X, User, MapPin, Phone, Upload, Printer, CheckCircle2, FlaskConical } from 'lucide-react';
import { LabSample } from '../../../data/diagnosticsData';

const STAGES = ['Received', 'Accessioned', 'In Progress', 'Resulted', 'Verified', 'Released', 'NABIDH'];

const stageIndex = (status: string) => {
  if (status === 'received')  return 1;
  if (status === 'running')   return 2;
  if (status === 'resulted')  return 3;
  if (status === 'verified')  return 4;
  if (status === 'critical')  return 2;
  return 0;
};

interface Props { sample: LabSample; onClose: () => void; }

const LabSampleDetail: React.FC<Props> = ({ sample, onClose }) => {
  const isCrit = sample.status === 'critical';
  const stage = stageIndex(sample.status);
  const pct = sample.totalTests && sample.completedTests !== undefined
    ? Math.round((sample.completedTests / sample.totalTests) * 100) : null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col shadow-2xl" style={{ width: 420, background: '#fff', borderLeft: '1px solid #E2E8F0' }}>
      {/* Header */}
      <div className="px-5 py-4 flex-shrink-0 relative" style={{ borderBottom: '1px solid #E2E8F0', background: isCrit ? '#FFF1F2' : '#EEF2FF' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical style={{ width: 15, height: 15, color: isCrit ? '#EF4444' : '#4F46E5' }} />
              <span className="font-black text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>Sample Details</span>
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: isCrit ? '#EF4444' : '#4F46E5', marginTop: 2 }}>
              #{sample.sampleNum} · {sample.department}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/60 transition-colors">
            <X style={{ width: 16, height: 16, color: '#64748B' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Critical alert */}
        {isCrit && sample.criticalValues && (
          <div className="mx-4 mt-4 rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
              <span className="font-black uppercase tracking-wider" style={{ fontSize: 10, color: '#EF4444', fontFamily: 'DM Mono, monospace' }}>Critical Value — Action Required</span>
            </div>
            {sample.criticalValues.map(cv => (
              <div key={cv.test} className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="font-black" style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, color: '#EF4444' }}>{cv.value} <span style={{ fontSize: 13 }}>{cv.unit}</span> {cv.flag}</div>
                <div className="text-slate-700 font-semibold" style={{ fontSize: 12, marginTop: 2 }}>{cv.test}</div>
                {cv.refRange && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>Reference: {cv.refRange}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Pipeline */}
        <div className="mx-4 mt-4">
          <div className="flex items-center gap-0">
            {STAGES.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                    background: i < stage ? '#4F46E5' : i === stage ? '#6366F1' : '#F1F5F9',
                    border: i === stage ? '2px solid #4F46E5' : 'none',
                  }}>
                    {i < stage && <CheckCircle2 style={{ width: 10, height: 10, color: '#fff' }} />}
                  </div>
                  <div style={{ fontSize: 7, color: i <= stage ? '#4F46E5' : '#94A3B8', marginTop: 3, textAlign: 'center', maxWidth: 44 }}>{s}</div>
                </div>
                {i < STAGES.length - 1 && (
                  <div className="flex-1 h-0.5 mb-4" style={{ background: i < stage ? '#4F46E5' : '#F1F5F9' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Patient */}
        <div className="mx-4 mt-4 rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EEF2FF' }}>
              <User style={{ width: 18, height: 18, color: '#4F46E5' }} />
            </div>
            <div>
              <div className="font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>{sample.patientName}</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{sample.patientAge}{sample.patientGender} · {sample.patientId}</div>
            </div>
          </div>
          {(sample.location || sample.insurance) && (
            <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
              {sample.location && <div className="flex items-center gap-1.5"><MapPin style={{ width: 11, height: 11, color: '#0D9488' }} /><span style={{ fontSize: 11, color: '#475569' }}>{sample.location}</span></div>}
              {sample.insurance && <span style={{ fontSize: 11, color: '#4F46E5', fontWeight: 600 }}>{sample.insurance}</span>}
            </div>
          )}
        </div>

        {/* Info grid */}
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          {[
            { label: 'Department',      value: sample.department },
            { label: 'Sample Type',     value: sample.sampleType },
            { label: 'Received',        value: sample.receivedTime },
            { label: 'Resulted',        value: sample.resultTime || '—' },
            { label: 'TAT',             value: sample.tat ? `${sample.tat}${sample.tatTarget ? ` / ${sample.tatTarget}` : ''}` : '—', warn: sample.tatOverdue },
            { label: 'Analyzer',        value: sample.analyzer || '—' },
            { label: 'Ordering Doctor', value: sample.doctor || '—' },
            { label: 'Priority',        value: sample.priority?.toUpperCase() || 'Routine' },
          ].map(r => (
            <div key={r.label} className="rounded-lg p-2.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: r.warn ? '#EF4444' : '#1E293B', fontWeight: 500 }}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* Tests */}
        <div className="mx-4 mt-3 mb-4 rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-800" style={{ fontSize: 13 }}>Tests Ordered</span>
            {pct !== null && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#4F46E5' }}>{sample.completedTests}/{sample.totalTests} · {pct}%</span>}
          </div>
          {pct !== null && (
            <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: '#EEF2FF' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4F46E5, #6366F1)', transition: 'width 1s ease' }} />
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {sample.tests.map((t, i) => {
              const done = sample.completedTests !== undefined && i < sample.completedTests;
              return (
                <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ fontSize: 11, background: done ? 'rgba(16,185,129,0.08)' : '#F1F5F9', color: done ? '#10B981' : '#64748B', border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : '#E2E8F0'}` }}>
                  {done && <CheckCircle2 style={{ width: 10, height: 10 }} />}{t}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid #E2E8F0', background: '#FAFAFA' }}>
        {isCrit && (
          <button className="w-full py-3 rounded-xl font-black flex items-center justify-center gap-2.5 hover:opacity-90 text-white"
            style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)', fontSize: 13, boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}>
            <Phone style={{ width: 15, height: 15 }} /> Notify Doctor Immediately
          </button>
        )}
        {sample.status === 'resulted' && (
          <button className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 text-white"
            style={{ background: 'linear-gradient(135deg, #4338CA, #4F46E5)', fontSize: 13, boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
            <CheckCircle2 style={{ width: 14, height: 14 }} /> Verify Results
          </button>
        )}
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
            style={{ background: '#F1F5F9', color: '#64748B', fontSize: 12, border: '1px solid #E2E8F0' }}>
            <Upload style={{ width: 13, height: 13 }} /> NABIDH
          </button>
          <button className="flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
            style={{ background: '#F1F5F9', color: '#64748B', fontSize: 12, border: '1px solid #E2E8F0' }}>
            <Printer style={{ width: 13, height: 13 }} /> Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabSampleDetail;
