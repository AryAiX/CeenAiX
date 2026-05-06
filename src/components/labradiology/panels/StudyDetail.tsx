import React from 'react';
import { X, User, ScanLine, CheckCircle2, Clock, Upload, Printer, FileText, AlertTriangle } from 'lucide-react';
import { ImagingStudy } from '../../../data/diagnosticsData';

const SCAN_STAGES = ['Ordered', 'Scheduled', 'Arrived', 'Consent', 'Scanning', 'Complete', 'Reported', 'Verified', 'Released', 'NABIDH'];

const stageIndex = (status: string) => {
  if (status === 'scheduled')      return 1;
  if (status === 'scanning')       return 4;
  if (status === 'complete')       return 5;
  if (status === 'report_pending' || status === 'report_overdue') return 5;
  if (status === 'released')       return 8;
  return 0;
};

const MODALITY_STYLES: Record<string, { bg: string; color: string }> = {
  MRI:   { bg: '#EEF2FF', color: '#4F46E5' },
  CT:    { bg: '#EFF6FF', color: '#1D4ED8' },
  USS:   { bg: '#F0FDFA', color: '#0D9488' },
  XR:    { bg: '#F8FAFC', color: '#475569' },
  PET:   { bg: '#FFFBEB', color: '#B45309' },
  MAMMO: { bg: '#FFF1F2', color: '#BE185D' },
};

interface Props { study: ImagingStudy; onClose: () => void; }

const StudyDetail: React.FC<Props> = ({ study, onClose }) => {
  const isScanning  = study.status === 'scanning';
  const isPending   = study.status === 'report_pending' || study.status === 'report_overdue';
  const isOverdue   = study.status === 'report_overdue';
  const stage = stageIndex(study.status);
  const ms = MODALITY_STYLES[study.modality] || { bg: '#F1F5F9', color: '#64748B' };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col shadow-2xl" style={{ width: 440, background: '#fff', borderLeft: '1px solid #E2E8F0' }}>
      {/* Header */}
      <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0', background: isOverdue ? '#FFF1F2' : '#EFF6FF' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ScanLine style={{ width: 15, height: 15, color: isOverdue ? '#EF4444' : '#1D4ED8' }} />
              <span className="font-black text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>Study Details</span>
              <span className="px-2 py-0.5 rounded-md font-black" style={{ fontSize: 9, background: ms.bg, color: ms.color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{study.modality}</span>
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: isOverdue ? '#EF4444' : '#1D4ED8', marginTop: 2 }}>{study.accession}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/60 transition-colors">
            <X style={{ width: 16, height: 16, color: '#64748B' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Overdue alert */}
        {isOverdue && (
          <div className="mx-4 mt-4 rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }} />
            <div>
              <div className="font-black text-red-700" style={{ fontSize: 12 }}>TAT Overdue — {study.reportPendingHours}h (target 4h)</div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>Radiologist: {study.radiologist}</div>
            </div>
          </div>
        )}

        {/* Pipeline */}
        <div className="mx-4 mt-4 overflow-x-auto">
          <div className="flex items-center gap-0" style={{ minWidth: 380 }}>
            {SCAN_STAGES.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                    background: i < stage ? '#1D4ED8' : i === stage ? '#3B82F6' : '#F1F5F9',
                    border: i === stage ? '2px solid #1D4ED8' : 'none',
                  }}>
                    {i < stage && <CheckCircle2 style={{ width: 10, height: 10, color: '#fff' }} />}
                  </div>
                  <div style={{ fontSize: 7, color: i <= stage ? '#1D4ED8' : '#94A3B8', marginTop: 3, textAlign: 'center', maxWidth: 36 }}>{s}</div>
                </div>
                {i < SCAN_STAGES.length - 1 && (
                  <div className="flex-1 h-0.5 mb-4" style={{ background: i < stage ? '#1D4ED8' : '#F1F5F9' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Scanning progress */}
        {isScanning && study.sequences && (
          <div className="mx-4 mt-4 rounded-xl p-4" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold" style={{ fontSize: 13, color: '#7C3AED' }}>Scan Progress</span>
              <div className="text-center">
                {study.scanProgressPct !== undefined && (
                  <svg width={48} height={48}>
                    <circle cx={24} cy={24} r={18} fill="none" stroke="#EDE9FE" strokeWidth={4} />
                    <circle cx={24} cy={24} r={18} fill="none" stroke="#8B5CF6" strokeWidth={4}
                      strokeDasharray={`${2 * Math.PI * 18 * study.scanProgressPct / 100} ${2 * Math.PI * 18}`}
                      strokeLinecap="round" transform="rotate(-90 24 24)" />
                    <text x={24} y={28} textAnchor="middle" style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 700, fill: '#7C3AED' }}>{study.scanProgressPct}%</text>
                  </svg>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              {study.sequences.map(seq => (
                <div key={seq.name} className="flex items-center gap-2.5">
                  <span style={{
                    fontSize: 11,
                    color: seq.status === 'done' ? '#10B981' : seq.status === 'active' ? '#8B5CF6' : '#94A3B8',
                  }}>
                    {seq.status === 'done' ? '✓' : seq.status === 'active' ? '▶' : '○'}
                  </span>
                  <span style={{ fontSize: 11, color: seq.status === 'done' ? '#64748B' : seq.status === 'active' ? '#6D28D9' : '#94A3B8', fontWeight: seq.status === 'active' ? 600 : 400 }}>
                    {seq.name}
                  </span>
                  <span className="ml-auto" style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{seq.duration}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)' }}>
              <Clock style={{ width: 11, height: 11, color: '#8B5CF6' }} />
              <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>~{study.scanRemaining} min remaining</span>
            </div>
          </div>
        )}

        {/* Patient */}
        <div className="mx-4 mt-4 rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
              <User style={{ width: 16, height: 16, color: '#1D4ED8' }} />
            </div>
            <div>
              <div className="font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>{study.patientName}</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{study.patientAge}{study.patientGender} · {study.patientId}</div>
            </div>
            {study.insurance && <span className="ml-auto font-semibold" style={{ fontSize: 11, color: '#1D4ED8' }}>{study.insurance}</span>}
          </div>
          {study.conditions && study.conditions.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
              {study.conditions.map(c => (
                <span key={c} className="px-2 py-0.5 rounded-full" style={{ fontSize: 9, background: '#F1F5F9', color: '#64748B' }}>{c}</span>
              ))}
            </div>
          )}
        </div>

        {/* Study info grid */}
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          {[
            { label: 'Study Type',  value: study.studyType },
            { label: 'Scanner',     value: study.scanner || '—' },
            { label: 'Protocol',    value: study.protocol || '—' },
            { label: 'Contrast',    value: study.contrast || 'None' },
            { label: 'Technologist',value: study.technologist || '—' },
            { label: 'Radiologist', value: study.radiologist || '—' },
            { label: 'Doctor',      value: study.doctor },
            { label: 'Specialty',   value: study.doctorSpecialty || '—' },
          ].map(r => (
            <div key={r.label} className="rounded-lg p-2.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>{r.label}</div>
              <div className="truncate" style={{ fontSize: 11, color: '#1E293B', fontWeight: 500 }}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* Previous study */}
        {study.previousStudy && (
          <div className="mx-4 mt-3 rounded-xl p-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <div className="font-semibold text-blue-800 mb-1" style={{ fontSize: 11 }}>Previous Study — {study.previousStudy.date}</div>
            <div style={{ fontSize: 11, color: '#1D4ED8' }}>{study.previousStudy.finding}</div>
            <div style={{ fontSize: 10, color: '#64748B' }}>{study.previousStudy.facility}</div>
          </div>
        )}

        {/* Clinical notes */}
        {study.clinicalNotes && (
          <div className="mx-4 mt-3 mb-4 rounded-xl p-3" style={{ background: '#FAFAFA', border: '1px solid #E2E8F0' }}>
            <div className="font-semibold text-slate-600 mb-1" style={{ fontSize: 11 }}>Clinical Notes</div>
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{study.clinicalNotes}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid #E2E8F0', background: '#FAFAFA' }}>
        {(isPending || isOverdue) && (
          <button className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 text-white"
            style={{ background: 'linear-gradient(135deg, #1E40AF, #1D4ED8)', fontSize: 13, boxShadow: '0 4px 14px rgba(29,78,216,0.3)' }}>
            <FileText style={{ width: 14, height: 14 }} /> Open in Reporting Workstation
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

export default StudyDetail;
