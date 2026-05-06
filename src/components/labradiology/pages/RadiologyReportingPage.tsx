import React, { useState } from 'react';
import {
  ScanLine, FileText, AlertTriangle, CheckCircle2, Clock,
  ChevronRight, Save, Send, PenLine, Layers, BarChart3,
  User, Stethoscope, ZoomIn, ZoomOut, Move, Ruler, RotateCcw,
  BookOpen, Activity
} from 'lucide-react';
import { imagingStudies } from '../../../data/diagnosticsData';

const PENDING_REPORTS = imagingStudies
  .filter(s => s.status === 'report_pending' || s.status === 'report_overdue')
  .sort((a, b) => (b.reportPendingHours || 0) - (a.reportPendingHours || 0));

const MODALITY_STYLE: Record<string, { bg: string; color: string }> = {
  MRI: { bg: '#EEF2FF', color: '#4F46E5' },
  CT:  { bg: '#EFF6FF', color: '#1D4ED8' },
  USS: { bg: '#F0FDFA', color: '#0D9488' },
  XR:  { bg: '#F8FAFC', color: '#475569' },
};

const QC_ITEMS = [
  { label: 'All required sections filled', done: false },
  { label: 'ICD-10 code added', done: false },
  { label: 'Clinical context referenced', done: false },
  { label: 'Impression section complete', done: false },
  { label: 'Radiologist PIN signed', done: false },
];

const RadiologyReportingPage: React.FC = () => {
  const [activeStudyId, setActiveStudyId] = useState(PENDING_REPORTS[1]?.id || PENDING_REPORTS[0]?.id);
  const [reportTab, setReportTab] = useState<'findings' | 'history' | 'technique'>('findings');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [saved, setSaved] = useState(false);
  const [findings, setFindings] = useState({
    lungs: '',
    rll: 'Nodule measuring ___ mm (previously 6mm June 2025) located in the posterior basal segment.',
    pleura: '',
    mediastinum: '',
    impression: '',
    recommendations: 'Follow-up CT in 3 months recommended per Fleischner Society guidelines.',
  });

  const study = PENDING_REPORTS.find(s => s.id === activeStudyId) || PENDING_REPORTS[0];
  const ms = MODALITY_STYLE[study?.modality || 'CT'] || { bg: '#F1F5F9', color: '#64748B' };

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: '#F8FAFC' }}>

      {/* LEFT — Worklist */}
      <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: 300, background: '#fff', borderRight: '1px solid #E2E8F0' }}>
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-2">
            <FileText style={{ width: 14, height: 14, color: '#1D4ED8' }} />
            <span className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>Report Worklist</span>
            <span className="ml-auto px-2 py-0.5 rounded-full font-bold" style={{ fontSize: 10, background: '#FEF3C7', color: '#B45309' }}>{PENDING_REPORTS.length}</span>
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Dr. Rania Al Suwaidi FRCR · On duty</div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {PENDING_REPORTS.map((s, idx) => {
            const sms = MODALITY_STYLE[s.modality] || { bg: '#F1F5F9', color: '#64748B' };
            const isActive = s.id === activeStudyId;
            const isOverdue = s.status === 'report_overdue';
            return (
              <div
                key={s.id}
                onClick={() => setActiveStudyId(s.id)}
                className="px-4 py-3 cursor-pointer transition-colors"
                style={{
                  borderBottom: '1px solid #F1F5F9',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  borderLeft: `3px solid ${isActive ? '#1D4ED8' : isOverdue ? '#EF4444' : 'transparent'}`,
                }}
                onMouseEnter={e => !isActive && (e.currentTarget.style.background = '#F8FAFC')}
                onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 rounded font-black" style={{ fontSize: 8, background: sms.bg, color: sms.color }}>
                    {s.modality}
                  </span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8' }}>#{idx + 1}</span>
                  {isOverdue && (
                    <span className="flex items-center gap-0.5 ml-auto" style={{ fontSize: 9, color: '#EF4444', fontWeight: 700 }}>
                      <AlertTriangle style={{ width: 9, height: 9 }} />{s.reportPendingHours}h
                    </span>
                  )}
                  {!isOverdue && (
                    <span className="ml-auto" style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{s.reportPendingHours}h</span>
                  )}
                </div>
                <div className="font-semibold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12 }}>{s.patientName}</div>
                <div className="text-slate-500 truncate" style={{ fontSize: 10 }}>{s.studyType}</div>
                <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 1 }}>
                  {s.doctor} · {s.doctorSpecialty || 'General'}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setActiveStudyId(s.id); }}
                  className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold w-full justify-center"
                  style={{ background: isActive ? '#1D4ED8' : '#EFF6FF', color: isActive ? '#fff' : '#1D4ED8', fontSize: 10 }}
                >
                  <PenLine style={{ width: 10, height: 10 }} /> {isActive ? 'Reporting' : 'Report'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER — Report Editor */}
      {study && (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#1E293B', minWidth: 0 }}>
          {/* Study header */}
          <div className="flex-shrink-0 px-5 py-3" style={{ background: '#0F172A', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded-md font-black" style={{ fontSize: 10, background: ms.bg, color: ms.color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{study.modality}</span>
              <div>
                <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
                  {study.studyType} · {study.patientName}
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#3B82F6' }}>{study.accession}</div>
              </div>
              <div className="ml-4">
                <div style={{ fontSize: 10, color: '#94A3B8' }}>Doctor: <span style={{ color: '#CBD5E1' }}>{study.doctor}</span></div>
                {study.doctorSpecialty && <div style={{ fontSize: 10, color: '#94A3B8' }}>Dept: <span style={{ color: '#CBD5E1' }}>{study.doctorSpecialty}</span></div>}
              </div>
            </div>
            {study.clinicalNotes && (
              <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(29,78,216,0.12)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <span style={{ fontSize: 10, color: '#93C5FD' }}><strong>Clinical Notes:</strong> {study.clinicalNotes}</span>
              </div>
            )}
            {study.previousStudy && (
              <div className="mt-1.5 px-3 py-1.5 rounded-lg flex items-center gap-2" style={{ background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(59,130,246,0.1)' }}>
                <BookOpen style={{ width: 11, height: 11, color: '#60A5FA' }} />
                <span style={{ fontSize: 10, color: '#93C5FD' }}>
                  Previous {study.previousStudy.date}: {study.previousStudy.finding}
                </span>
                <button className="ml-auto" style={{ fontSize: 10, color: '#60A5FA', fontWeight: 600 }}>Compare Studies →</button>
              </div>
            )}
          </div>

          {/* DICOM viewer area */}
          <div className="flex-shrink-0 relative flex items-center justify-center" style={{ height: 260, background: '#0A0E1A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Simulated CT scan */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative" style={{ width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(ellipse at 40% 45%, #1E293B 0%, #0F172A 40%, #050810 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="absolute" style={{ width: 80, height: 90, left: 75, top: 60, borderRadius: '40% 45% 45% 40% / 35% 35% 50% 50%', background: 'radial-gradient(ellipse, #1E3A5F 0%, #0D2040 60%, #050D1A 100%)', opacity: 0.9 }} />
                <div className="absolute" style={{ width: 70, height: 80, left: 80, top: 65, borderRadius: '40% 45% 45% 40% / 35% 35% 50% 50%', background: 'radial-gradient(ellipse, #253858 0%, #162840 80%)', opacity: 0.7 }} />
                <div className="absolute" style={{ width: 7, height: 7, right: 62, top: 108, borderRadius: '50%', background: '#2A4870', border: '1px solid rgba(59,130,246,0.4)', boxShadow: '0 0 6px rgba(59,130,246,0.3)' }} />
              </div>
            </div>

            {/* Viewer tools */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {[
                { Icon: ZoomIn, label: 'Zoom In' }, { Icon: ZoomOut, label: 'Zoom Out' },
                { Icon: Move, label: 'Pan' }, { Icon: Ruler, label: 'Measure' }, { Icon: RotateCcw, label: 'Reset' },
              ].map(({ Icon, label }) => (
                <button key={label} title={label} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Icon style={{ width: 12, height: 12, color: '#94A3B8' }} />
                </button>
              ))}
            </div>

            {/* Slice navigator */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
              <button className="text-slate-400 hover:text-white px-2 py-1 rounded" style={{ fontSize: 11 }}>◀ Prev</button>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#94A3B8' }}>Slice 45 / 120</span>
              <button className="text-slate-400 hover:text-white px-2 py-1 rounded" style={{ fontSize: 11 }}>Next ▶</button>
            </div>

            {/* Window/Level indicator */}
            <div className="absolute top-3 right-3 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontSize: 9, color: '#64748B', fontFamily: 'DM Mono, monospace' }}>W:400 / L:40 · CT Chest</span>
            </div>
          </div>

          {/* Report template */}
          <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'none' }}>
            {/* Tabs */}
            <div className="flex gap-1 mb-4">
              {([['findings', 'CT Findings'], ['history', 'Clinical History'], ['technique', 'Technique']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setReportTab(id)}
                  className="px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={{ fontSize: 11, background: reportTab === id ? '#1D4ED8' : 'rgba(255,255,255,0.05)', color: reportTab === id ? '#fff' : '#94A3B8', border: `1px solid ${reportTab === id ? '#1D4ED8' : 'rgba(255,255,255,0.08)'}` }}>
                  {label}
                </button>
              ))}
            </div>

            {reportTab === 'findings' && (
              <div className="space-y-3">
                {[
                  { key: 'lungs' as const, label: 'LUNGS AND AIRWAYS', placeholder: 'Describe lungs and airways...' },
                  { key: 'rll' as const, label: 'RIGHT LOWER LOBE', placeholder: '' },
                  { key: 'pleura' as const, label: 'PLEURA', placeholder: 'No pleural effusion or pneumothorax...' },
                  { key: 'mediastinum' as const, label: 'HEART AND MEDIASTINUM', placeholder: 'Heart size, mediastinal contours...' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{f.label}:</label>
                    <textarea
                      value={findings[f.key]}
                      onChange={e => setFindings(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={3}
                      className="w-full resize-none focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#CBD5E1', fontSize: 12, lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                ))}

                {/* Impression */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', fontFamily: 'DM Mono, monospace', display: 'block', marginBottom: 4 }}>IMPRESSION:</label>
                  <textarea
                    value={findings.impression}
                    onChange={e => setFindings(prev => ({ ...prev, impression: e.target.value }))}
                    placeholder="Key diagnostic conclusion and summary..."
                    rows={4}
                    className="w-full resize-none focus:outline-none"
                    style={{ background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '10px 12px', color: '#93C5FD', fontSize: 12, lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}
                  />
                </div>

                {/* ICD-10 */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>ICD-10 Coding</span>
                    <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ fontSize: 8, background: 'rgba(139,92,246,0.2)', color: '#A78BFA' }}>AI Suggested</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-1 rounded-lg font-mono font-bold" style={{ fontSize: 11, background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.2)' }}>R91.8</span>
                    <span style={{ fontSize: 11, color: '#CBD5E1' }}>Other nonspecific lung findings</span>
                    <button className="ml-auto" style={{ fontSize: 10, color: '#EF4444' }}>Remove</button>
                  </div>
                  <button className="flex items-center gap-1 text-blue-400 hover:text-blue-300" style={{ fontSize: 10 }}>+ Add code</button>
                </div>

                {/* Recommendations */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>RECOMMENDATIONS:</label>
                  <textarea
                    value={findings.recommendations}
                    onChange={e => setFindings(prev => ({ ...prev, recommendations: e.target.value }))}
                    rows={2}
                    className="w-full resize-none focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#CBD5E1', fontSize: 12, lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
              </div>
            )}

            {reportTab === 'history' && (
              <div className="text-slate-400 py-4" style={{ fontSize: 12 }}>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="font-bold text-slate-300 mb-2" style={{ fontSize: 13 }}>Clinical History</div>
                  <div style={{ lineHeight: 1.7 }}>{study?.clinicalNotes || 'No clinical history provided.'}</div>
                  {study?.previousStudy && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="font-bold text-slate-300 mb-1" style={{ fontSize: 12 }}>Previous Studies</div>
                      <div>{study.previousStudy.date}: {study.previousStudy.finding} — {study.previousStudy.facility}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {reportTab === 'technique' && (
              <div className="rounded-xl p-4 text-slate-400" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, lineHeight: 1.7 }}>
                <div className="font-bold text-slate-300 mb-2" style={{ fontSize: 13 }}>Technique</div>
                {study?.modality === 'CT' && 'CT of the chest was performed using a low-dose protocol on the Philips Brilliance 256-slice CT scanner. Images acquired from the lung apices to the bases in a single breath-hold. No intravenous contrast administered.'}
                {study?.modality === 'MRI' && `MRI of the ${study.studyType} was performed using the ${study.scanner || 'Siemens MRI scanner'} at ${study.scanner?.includes('3T') ? '3T' : '1.5T'}. Standard protocol sequences were acquired.`}
              </div>
            )}
          </div>

          {/* Report actions */}
          <div className="flex-shrink-0 px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0F172A' }}>
            <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all hover:bg-slate-700"
              style={{ background: 'rgba(255,255,255,0.07)', color: '#94A3B8', fontSize: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Save style={{ width: 13, height: 13 }} />
              {saved ? 'Saved ✓' : 'Save Draft'}
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#FCD34D', fontSize: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
              <Send style={{ width: 13, height: 13 }} />
              Submit Preliminary
            </button>
            <button onClick={() => setShowPinModal(true)}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #1E40AF, #1D4ED8)', fontSize: 13, boxShadow: '0 4px 14px rgba(29,78,216,0.35)' }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              Verify & Sign Report
            </button>
          </div>
        </div>
      )}

      {/* RIGHT — Clinical context */}
      <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: 280, background: '#fff', borderLeft: '1px solid #E2E8F0' }}>
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Clinical Context</div>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>NABIDH patient record</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ scrollbarWidth: 'none' }}>
          {/* Patient from NABIDH */}
          {study && (
            <div className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center gap-2 mb-2">
                <User style={{ width: 12, height: 12, color: '#1D4ED8' }} />
                <span className="font-semibold text-slate-700" style={{ fontSize: 12 }}>{study.patientName}</span>
              </div>
              {study.conditions && study.conditions.map(c => (
                <div key={c} className="flex items-center gap-1.5 mb-1">
                  <span style={{ fontSize: 9, color: '#94A3B8' }}>•</span>
                  <span style={{ fontSize: 11, color: '#475569' }}>{c}</span>
                </div>
              ))}
              {study.patientBloodGroup && (
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>Blood: {study.patientBloodGroup}</div>
              )}
            </div>
          )}

          {/* Measurement tools */}
          {study?.previousStudy && (
            <div className="rounded-xl p-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div className="flex items-center gap-2 mb-2">
                <Ruler style={{ width: 12, height: 12, color: '#1D4ED8' }} />
                <span className="font-semibold text-blue-800" style={{ fontSize: 12 }}>Nodule Tracking</span>
              </div>
              <div className="space-y-1.5 mb-2">
                <div className="flex justify-between">
                  <span style={{ fontSize: 10, color: '#64748B' }}>Current (today)</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#1E293B', fontWeight: 700 }}>___ mm</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 10, color: '#64748B' }}>Previous (Jun 2025)</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#1E293B', fontWeight: 700 }}>6 mm</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 10, color: '#64748B' }}>Change</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>+/- ___ mm</span>
                </div>
              </div>
              <button className="w-full py-1.5 rounded-lg font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                style={{ background: 'rgba(29,78,216,0.08)', fontSize: 11, border: '1px solid rgba(29,78,216,0.15)' }}>
                Log Measurement
              </button>
            </div>
          )}

          {/* QC checklist */}
          <div className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity style={{ width: 12, height: 12, color: '#64748B' }} />
              <span className="font-semibold text-slate-700" style={{ fontSize: 12 }}>Report Quality Check</span>
            </div>
            {QC_ITEMS.map(item => (
              <div key={item.label} className="flex items-center gap-2 mb-1.5">
                <span style={{ fontSize: 11, color: item.done ? '#10B981' : '#D1D5DB' }}>{item.done ? '✓' : '○'}</span>
                <span style={{ fontSize: 10, color: item.done ? '#475569' : '#94A3B8' }}>{item.label}</span>
              </div>
            ))}
            <div className="mt-3 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)' }}>
                <AlertTriangle style={{ width: 11, height: 11, color: '#F59E0B' }} />
                <span style={{ fontSize: 10, color: '#B45309' }}>Complete all sections to release</span>
              </div>
            </div>
          </div>

          {/* Ordering doctor */}
          {study && (
            <div className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center gap-2 mb-1">
                <Stethoscope style={{ width: 12, height: 12, color: '#64748B' }} />
                <span className="font-semibold text-slate-700" style={{ fontSize: 12 }}>Ordering Doctor</span>
              </div>
              <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 600 }}>{study.doctor}</div>
              {study.doctorSpecialty && <div style={{ fontSize: 10, color: '#94A3B8' }}>{study.doctorSpecialty}</div>}
            </div>
          )}
        </div>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.7)' }}>
          <div className="rounded-2xl shadow-2xl p-6 w-80" style={{ background: '#fff' }}>
            <div className="font-black text-slate-900 mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16 }}>Radiologist Sign-Off</div>
            <div className="text-slate-500 mb-4" style={{ fontSize: 12 }}>Enter your PIN to verify and release this report</div>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full px-4 py-3 rounded-xl mb-4 text-center font-mono text-xl focus:outline-none"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', letterSpacing: '0.3em' }}
              maxLength={6}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowPinModal(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold hover:bg-slate-100"
                style={{ background: '#F1F5F9', color: '#64748B', fontSize: 13, border: '1px solid #E2E8F0' }}>
                Cancel
              </button>
              <button onClick={() => { setShowPinModal(false); setPin(''); }}
                className="flex-1 py-2.5 rounded-xl font-bold text-white hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1E40AF, #1D4ED8)', fontSize: 13 }}>
                Sign & Release
              </button>
            </div>
            <div className="text-center mt-3" style={{ fontSize: 10, color: '#94A3B8' }}>
              Report PDF · Doctor notification · NABIDH submission
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadiologyReportingPage;
