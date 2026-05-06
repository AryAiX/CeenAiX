import React, { useState } from 'react';
import {
  Layers, Clock, CheckCircle2, AlertTriangle, FileText,
  ChevronRight, X, Phone, MessageSquare, ClipboardList,
  PauseCircle, StopCircle, User, Calendar, Activity, Zap
} from 'lucide-react';
import { imagingStudies, ImagingStudy } from '../../../data/diagnosticsData';

const C = {
  bg: '#0F1117', surface: '#161822', surface2: '#1C1E2A',
  border: 'rgba(255,255,255,0.06)', text: '#F1F5F9',
  muted: 'rgba(255,255,255,0.35)', faint: 'rgba(255,255,255,0.07)',
  violet: '#8B5CF6', indigo: '#6366F1', emerald: '#10B981',
  amber: '#F59E0B', red: '#EF4444', blue: '#3B82F6',
};

const mriStudies = imagingStudies.filter(s => s.modality === 'MRI');

const scanners = [
  {
    id: 'mri-3t',
    name: 'MRI 3T — Siemens Vida',
    model: 'Siemens MAGNETOM Vida 3.0T',
    room: 'Room MRI-2',
    status: 'scanning' as const,
    study: mriStudies.find(s => s.status === 'scanning'),
    fieldStrength: '3.0 Tesla',
    bore: '70cm wide bore',
    gradient: '80 mT/m @ 200 T/m/s',
    slices: ['Brain', 'Neuro', 'Cardiac', 'MSK', 'Abdominal', 'Vascular'],
  },
  {
    id: 'mri-15t',
    name: 'MRI 1.5T — MAGNETOM Sola',
    model: 'Siemens MAGNETOM Sola 1.5T',
    room: 'Room MRI-1',
    status: 'available' as const,
    study: null,
    fieldStrength: '1.5 Tesla',
    bore: '70cm wide bore',
    gradient: '45 mT/m @ 200 T/m/s',
    slices: ['Spine', 'MSK', 'Abdomen', 'Pelvis', 'Chest'],
  },
];

const statusBadge = (s: ImagingStudy) => {
  if (s.status === 'scanning') return { label: '● Scanning', bg: 'rgba(139,92,246,0.2)', color: C.violet };
  if (s.status === 'report_overdue') return { label: '! Overdue', bg: 'rgba(239,68,68,0.15)', color: C.red };
  if (s.status === 'report_pending') return { label: '⏳ Pending', bg: 'rgba(245,158,11,0.15)', color: C.amber };
  if (s.status === 'scheduled') return { label: '⏰ Scheduled', bg: 'rgba(59,130,246,0.12)', color: C.blue };
  return { label: '✓ Done', bg: 'rgba(16,185,129,0.12)', color: C.emerald };
};

const ScannerCard: React.FC<{ scanner: typeof scanners[0]; onViewStudy: (s: ImagingStudy) => void }> = ({ scanner, onViewStudy }) => {
  const isScanning  = scanner.status === 'scanning';
  const study       = scanner.study;
  const accent      = isScanning ? C.violet : C.emerald;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `2px solid ${accent}` }}>
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}`, background: `${accent}08` }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>
              <Layers className="w-4 h-4" style={{ color: accent }} />
              {scanner.name}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Mono, monospace' }}>{scanner.model}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="px-2.5 py-1 rounded-full font-bold" style={{ fontSize: 10, background: isScanning ? `${C.violet}20` : `${C.emerald}15`, color: isScanning ? C.violet : C.emerald, border: `1px solid ${isScanning ? `${C.violet}30` : `${C.emerald}25`}` }}>
              {isScanning ? '● SCANNING' : '● ONLINE · READY'}
            </span>
            <div style={{ fontSize: 10, color: C.muted }}>{scanner.room}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            { k: 'Field Strength', v: scanner.fieldStrength },
            { k: 'Bore', v: scanner.bore },
            { k: 'Gradient', v: scanner.gradient },
          ].map(({ k, v }) => (
            <div key={k} className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.muted, fontFamily: 'DM Mono, monospace' }}>{k}</div>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 600, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active study or status */}
      {isScanning && study ? (
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.violet }} />
            <span className="font-bold uppercase tracking-wider" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: C.violet }}>Currently Scanning</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>{study.patientName}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.muted }}>{study.accession} · {study.patientAge}{study.patientGender}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{study.studyType}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{study.doctor}{study.doctorSpecialty && ` · ${study.doctorSpecialty}`}</div>
              {study.protocol && (
                <div className="mt-1.5 px-2 py-1 rounded-lg inline-block" style={{ background: `${C.violet}12`, border: `1px solid ${C.violet}20`, fontSize: 10, color: C.violet }}>
                  {study.protocol}
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className="relative" style={{ width: 72, height: 72 }}>
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke={C.violet} strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - (study.scanProgressPct || 55) / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color: '#A78BFA' }}>{study.scanProgressPct}%</span>
                  <span style={{ fontSize: 9, color: C.muted }}>{study.scanRemaining}m left</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: `${C.violet}15` }}>
              <div className="h-full rounded-full" style={{ width: `${study.scanProgressPct}%`, background: `linear-gradient(90deg, ${C.violet}, #A78BFA)`, transition: 'width 0.6s ease' }} />
            </div>
            <div className="flex justify-between mt-1" style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace' }}>
              <span>{study.scanElapsed}m elapsed</span>
              <span>~{study.scanRemaining}m remaining</span>
            </div>
          </div>

          {/* Sequences */}
          {study.sequences && (
            <div className="mt-3 space-y-1.5">
              {study.sequences.map(seq => (
                <div key={seq.name} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                  {seq.status === 'done'   ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.emerald }} /> :
                   seq.status === 'active' ? <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin flex-shrink-0" /> :
                   <div className="w-3.5 h-3.5 rounded-full border flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />}
                  <span style={{ flex: 1, color: seq.status === 'done' ? C.emerald : seq.status === 'active' ? '#A78BFA' : C.muted, fontWeight: seq.status === 'active' ? 600 : 400 }}>{seq.name}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', fontFamily: 'DM Mono, monospace' }}>{seq.duration}</span>
                </div>
              ))}
            </div>
          )}

          {study.clinicalNotes && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
              <div style={{ fontSize: 10, color: C.blue, fontWeight: 600, marginBottom: 4 }}>Clinical Notes</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{study.clinicalNotes}</div>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 hover:opacity-80" style={{ background: `${C.violet}20`, color: C.violet, border: `1px solid ${C.violet}30`, fontSize: 12 }}>
              <ClipboardList className="w-3.5 h-3.5" /> Protocol
            </button>
            <button className="flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-1.5 hover:opacity-80" style={{ background: 'rgba(245,158,11,0.1)', color: C.amber, border: '1px solid rgba(245,158,11,0.2)', fontSize: 12 }}>
              <PauseCircle className="w-3.5 h-3.5" /> Pause
            </button>
            <button className="py-2 px-3 rounded-xl font-medium flex items-center gap-1.5 hover:opacity-80" style={{ background: 'rgba(239,68,68,0.08)', color: C.red, border: '1px solid rgba(239,68,68,0.15)', fontSize: 12 }}>
              <StopCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${C.emerald}12`, border: `1px solid ${C.emerald}20` }}>
            <CheckCircle2 className="w-6 h-6" style={{ color: C.emerald }} />
          </div>
          <div>
            <div className="font-semibold text-white" style={{ fontSize: 13 }}>Available — Ready for Next Patient</div>
            <div style={{ fontSize: 11, color: C.muted }}>Next scheduled: MRI Knee — Yousuf Al Zaabi at 2:30 PM</div>
          </div>
        </div>
      )}

      {/* Capabilities */}
      <div className="px-5 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="uppercase tracking-widest mb-2" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: C.muted }}>Capabilities</div>
        <div className="flex flex-wrap gap-1.5">
          {scanner.slices.map(s => (
            <span key={s} className="px-2 py-0.5 rounded-lg" style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: `1px solid ${C.border}` }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const MRIStudyRow: React.FC<{ study: ImagingStudy; onClick: () => void }> = ({ study, onClick }) => {
  const badge = statusBadge(study);
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all" style={{ borderBottom: `1px solid ${C.border}` }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{study.accession}</div>
          <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ fontSize: 9, background: badge.bg, color: badge.color }}>{badge.label}</span>
        </div>
        <div className="font-semibold text-white" style={{ fontSize: 13 }}>{study.patientName}</div>
        <div className="truncate" style={{ fontSize: 11, color: C.muted }}>{study.studyType}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{study.doctor}{study.doctorSpecialty && ` · ${study.doctorSpecialty}`}</div>
      </div>
      <div className="flex-shrink-0 text-right space-y-1">
        {study.status === 'scanning' && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.violet }}>{study.scanProgressPct}% · {study.scanRemaining}m left</div>}
        {(study.status === 'report_pending' || study.status === 'report_overdue') && (
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: study.status === 'report_overdue' ? C.red : C.amber }}>{study.reportPendingHours}h pending</div>
            <div style={{ fontSize: 10, color: C.muted }}>Queue {study.queuePosition}/9</div>
          </div>
        )}
        {study.status === 'scheduled' && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.blue }}>{study.scheduledTime}</div>}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>{study.scanner || 'MRI Suite'}</div>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.15)' }} />
    </div>
  );
};

const MRIPage: React.FC = () => {
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null);

  const scanning  = mriStudies.filter(s => s.status === 'scanning');
  const pending   = mriStudies.filter(s => s.status === 'report_pending' || s.status === 'report_overdue');
  const scheduled = mriStudies.filter(s => s.status === 'scheduled');
  const complete  = mriStudies.filter(s => s.status === 'complete' || s.status === 'released');

  const kpis = [
    { v: String(mriStudies.length), label: 'Total MRI Today', sub: 'All modalities', accent: C.violet },
    { v: String(scanning.length), label: 'Scanning Now', sub: scanning.map(s => s.patientName.split(' ')[0]).join(', ') || '—', accent: C.violet, pulse: true },
    { v: String(pending.length), label: 'Reports Pending', sub: 'Dr. Rania on duty', accent: C.amber },
    { v: String(scheduled.length), label: 'Scheduled', sub: scheduled[0] ? `Next: ${scheduled[0].scheduledTime}` : '—', accent: C.blue },
    { v: '2', label: 'Scanners', sub: '2 online · 0 offline', accent: C.emerald },
  ];

  return (
    <div className="flex-1 overflow-auto" style={{ background: C.bg }}>
      {/* KPI row */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${C.violet}20`, border: `1px solid ${C.violet}30` }}>
            <Layers className="w-4 h-4" style={{ color: C.violet }} />
          </div>
          <div>
            <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16 }}>Magnetic Resonance Imaging</div>
            <div style={{ fontSize: 11, color: C.muted }}>Dubai Medical & Imaging Centre · Healthcare City</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full font-bold" style={{ fontSize: 10, background: 'rgba(139,92,246,0.15)', color: C.violet, border: `1px solid ${C.violet}25`, fontFamily: 'DM Mono, monospace' }}>
              DHA-RAD-2016-001247
            </span>
          </div>
        </div>

        <div className="flex gap-3 mb-5">
          {kpis.map(k => (
            <div key={k.label} className="flex-1 px-4 py-3.5 rounded-2xl transition-transform hover:scale-[1.01]" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="font-bold text-white leading-none mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, color: k.accent }}>
                {k.v}
                {(k as any).pulse && <span className="inline-block w-2 h-2 rounded-full ml-1.5 animate-pulse align-middle" style={{ background: k.accent, marginBottom: 2 }} />}
              </div>
              <div className="font-medium text-white/80" style={{ fontSize: 11 }}>{k.label}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Two scanner cards */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {scanners.map(s => (
            <ScannerCard key={s.id} scanner={s} onViewStudy={setSelectedStudy} />
          ))}
        </div>

        {/* Studies table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>All MRI Studies Today</div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: C.muted }}>{mriStudies.length} studies</span>
              <button className="px-3 py-1.5 rounded-xl font-bold hover:opacity-80 transition-opacity" style={{ background: `${C.violet}20`, color: C.violet, border: `1px solid ${C.violet}30`, fontSize: 11 }}>
                + New MRI Order
              </button>
            </div>
          </div>

          {scanning.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-5 py-2" style={{ background: `${C.violet}08`, borderBottom: `1px solid ${C.violet}15` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.violet }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, color: C.violet, textTransform: 'uppercase', letterSpacing: '0.1em' }}>SCANNING NOW ({scanning.length})</span>
              </div>
              {scanning.map(s => <MRIStudyRow key={s.id} study={s} onClick={() => setSelectedStudy(s)} />)}
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-5 py-2" style={{ background: 'rgba(245,158,11,0.05)', borderBottom: 'rgba(245,158,11,0.12) 1px solid' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.amber }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.1em' }}>REPORT PENDING ({pending.length})</span>
              </div>
              {pending.map(s => <MRIStudyRow key={s.id} study={s} onClick={() => setSelectedStudy(s)} />)}
            </div>
          )}

          {scheduled.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-5 py-2" style={{ background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.blue }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.1em' }}>SCHEDULED ({scheduled.length})</span>
              </div>
              {scheduled.map(s => <MRIStudyRow key={s.id} study={s} onClick={() => setSelectedStudy(s)} />)}
            </div>
          )}

          {mriStudies.length === 0 && (
            <div className="px-5 py-10 text-center" style={{ color: C.muted }}>No MRI studies today</div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedStudy && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={() => setSelectedStudy(null)} />
          <MRIDetailPanel study={selectedStudy} onClose={() => setSelectedStudy(null)} />
        </>
      )}
    </div>
  );
};

const MRIDetailPanel: React.FC<{ study: ImagingStudy; onClose: () => void }> = ({ study, onClose }) => {
  const isScanning = study.status === 'scanning';
  const isReport   = study.status === 'report_pending' || study.status === 'report_overdue';

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col" style={{ width: 420, background: '#161822', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(139,92,246,0.08)' }}>
        <div>
          <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>MRI Study Detail</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.violet }}>{study.accession}</div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="p-4 rounded-xl" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
          <div className="font-bold text-white" style={{ fontSize: 14 }}>{study.patientName}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.muted }}>
            {study.patientAge}{study.patientGender} · {study.patientId}{study.patientBloodGroup && ` · ${study.patientBloodGroup}`}
          </div>
          {study.insurance && <div className="mt-1" style={{ fontSize: 11, color: C.blue }}>{study.insurance}</div>}
          {study.conditions?.map(c => <div key={c} style={{ fontSize: 11, color: C.teal || '#14B8A6' }}>• {c}</div>)}
        </div>

        <div className="space-y-2">
          {[
            ['Study', study.studyType],
            study.scanner ? ['Scanner', study.scanner] : null,
            study.room ? ['Room', study.room] : null,
            study.protocol ? ['Protocol', study.protocol] : null,
            study.contrast ? ['Contrast', study.contrast] : null,
            study.technologist ? ['Technologist', study.technologist] : null,
            ['Ordering Doctor', `${study.doctor}${study.doctorSpecialty ? ' · ' + study.doctorSpecialty : ''}`],
          ].filter(Boolean).map(([k, v]) => (
            <div key={k as string} className="flex justify-between gap-4" style={{ fontSize: 12 }}>
              <span style={{ color: C.muted, flexShrink: 0 }}>{k as string}</span>
              <span style={{ color: C.text, textAlign: 'right' }}>{v as string}</span>
            </div>
          ))}
        </div>

        {isScanning && study.sequences && (
          <div className="p-4 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative" style={{ width: 64, height: 64, flexShrink: 0 }}>
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke={C.violet} strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - (study.scanProgressPct || 55) / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color: '#A78BFA' }}>{study.scanProgressPct}%</span>
                </div>
              </div>
              <div>
                <div style={{ color: '#A78BFA', fontSize: 13, fontWeight: 600 }}>In Progress</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.muted }}>{study.scanElapsed}m elapsed · {study.scanRemaining}m remaining</div>
              </div>
            </div>
            <div className="space-y-2">
              {study.sequences.map(seq => (
                <div key={seq.name} className="flex items-center gap-2" style={{ fontSize: 12, color: seq.status === 'done' ? C.emerald : seq.status === 'active' ? '#A78BFA' : C.muted }}>
                  {seq.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : seq.status === 'active' ? <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin flex-shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />}
                  <span className="flex-1">{seq.name}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', fontFamily: 'DM Mono, monospace' }}>{seq.duration}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {study.clinicalNotes && (
          <div className="p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="font-semibold mb-1.5" style={{ fontSize: 11, color: C.blue }}>Clinical Notes</div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{study.clinicalNotes}</div>
          </div>
        )}

        {isReport && (
          <div className="p-3 rounded-xl" style={{ background: study.status === 'report_overdue' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${study.status === 'report_overdue' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
            <div className="font-semibold mb-1" style={{ fontSize: 12, color: study.status === 'report_overdue' ? C.red : C.amber }}>{study.status === 'report_overdue' ? '🔴 TAT Overdue' : '⏱ TAT Status'}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Scanned {study.reportPendingHours}h ago · Target &lt;4h{study.tatOverdue && ' — OVERDUE'}</div>
            {study.queuePosition && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Queue: {study.queuePosition}/9 · {study.radiologist}</div>}
          </div>
        )}
      </div>

      <div className="p-4 space-y-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {isScanning && <>
          <button className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-80" style={{ background: `${C.violet}20`, color: C.violet, border: `1px solid ${C.violet}30`, fontSize: 13 }}><ClipboardList className="w-4 h-4" /> View Full Protocol</button>
          <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(255,255,255,0.05)', color: C.muted, fontSize: 13, border: `1px solid ${C.border}` }}><MessageSquare className="w-4 h-4" /> Message Doctor</button>
          <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(245,158,11,0.1)', color: C.amber, fontSize: 13, border: '1px solid rgba(245,158,11,0.2)' }}><PauseCircle className="w-4 h-4" /> Pause Study</button>
          <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(239,68,68,0.06)', color: C.red, fontSize: 13, border: '1px solid rgba(239,68,68,0.15)' }}><StopCircle className="w-4 h-4" /> Emergency Stop</button>
        </>}
        {isReport && <>
          <button className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90" style={{ background: C.amber, color: '#0F1117', fontSize: 13 }}><FileText className="w-4 h-4" /> Open for Reporting</button>
          <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(245,158,11,0.1)', color: C.amber, fontSize: 13, border: '1px solid rgba(245,158,11,0.2)' }}><Phone className="w-4 h-4" /> Alert Radiologist</button>
          <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(255,255,255,0.05)', color: C.muted, fontSize: 13, border: `1px solid ${C.border}` }}><MessageSquare className="w-4 h-4" /> Message Doctor</button>
        </>}
        {study.status === 'scheduled' && <>
          <button className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-80" style={{ background: `${C.blue}20`, color: C.blue, border: `1px solid ${C.blue}30`, fontSize: 13 }}><User className="w-4 h-4" /> Confirm Patient Arrival</button>
          <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(255,255,255,0.05)', color: C.muted, fontSize: 13, border: `1px solid ${C.border}` }}><MessageSquare className="w-4 h-4" /> Message Doctor</button>
        </>}
      </div>
    </div>
  );
};

export default MRIPage;
