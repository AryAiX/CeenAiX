import React, { useState } from 'react';
import {
  Cpu, Clock, CheckCircle2, AlertTriangle, FileText,
  ChevronRight, X, Phone, MessageSquare, ClipboardList,
  PauseCircle, StopCircle, User, Activity, Zap, Shield
} from 'lucide-react';
import { imagingStudies, ImagingStudy } from '../../../data/diagnosticsData';

const C = {
  bg: '#0F1117', surface: '#161822', surface2: '#1C1E2A',
  border: 'rgba(255,255,255,0.06)', text: '#F1F5F9',
  muted: 'rgba(255,255,255,0.35)', faint: 'rgba(255,255,255,0.07)',
  blue: '#3B82F6', sky: '#60A5FA', indigo: '#6366F1',
  emerald: '#10B981', amber: '#F59E0B', red: '#EF4444', teal: '#14B8A6',
};

const ctStudies = imagingStudies.filter(s => s.modality === 'CT');

const ctScanners = [
  {
    id: 'ct-256',
    name: 'CT 256-slice — Philips Brilliance',
    model: 'Philips Brilliance iCT 256-slice',
    room: 'Room CT-2',
    status: 'scanning' as const,
    study: ctStudies.find(s => s.status === 'scanning'),
    kvp: '80–140 kVp adaptive',
    rotation: '0.27 sec/rotation',
    coverage: '160 mm/rotation',
    capabilities: ['Cardiac CTA', 'Neuro Perf', 'Chest / Lung', 'Abdo / Pelvis', 'Angio / Vascular', 'Low-dose Protocol'],
  },
  {
    id: 'ct-64',
    name: 'CT 64-slice — Siemens SOMATOM',
    model: 'Siemens SOMATOM Definition AS+ 64',
    room: 'Room CT-1',
    status: 'available' as const,
    study: null,
    kvp: '80–120 kVp',
    rotation: '0.33 sec/rotation',
    coverage: '38.4 mm/rotation',
    capabilities: ['Head / Brain', 'Spine', 'Body', 'Extremities', 'Paediatric'],
  },
];

const statusBadge = (s: ImagingStudy) => {
  if (s.status === 'scanning') return { label: '● Scanning', bg: 'rgba(59,130,246,0.2)', color: C.blue };
  if (s.status === 'report_overdue') return { label: '! Overdue', bg: 'rgba(239,68,68,0.15)', color: C.red };
  if (s.status === 'report_pending') return { label: '⏳ Pending', bg: 'rgba(245,158,11,0.15)', color: C.amber };
  if (s.status === 'scheduled') return { label: '⏰ Scheduled', bg: 'rgba(59,130,246,0.12)', color: C.sky };
  return { label: '✓ Done', bg: 'rgba(16,185,129,0.12)', color: C.emerald };
};

const CTScannerCard: React.FC<{ scanner: typeof ctScanners[0]; onViewStudy: (s: ImagingStudy) => void }> = ({ scanner, onViewStudy }) => {
  const isScanning = scanner.status === 'scanning';
  const study = scanner.study;
  const accent = isScanning ? C.blue : C.emerald;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `2px solid ${accent}` }}>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}`, background: `${accent}08` }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>
              <Cpu className="w-4 h-4" style={{ color: accent }} />
              {scanner.name}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Mono, monospace' }}>{scanner.model}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="px-2.5 py-1 rounded-full font-bold" style={{ fontSize: 10, background: isScanning ? `${C.blue}20` : `${C.emerald}15`, color: isScanning ? C.blue : C.emerald, border: `1px solid ${isScanning ? `${C.blue}30` : `${C.emerald}25`}` }}>
              {isScanning ? '● SCANNING' : '● ONLINE · READY'}
            </span>
            <div style={{ fontSize: 10, color: C.muted }}>{scanner.room}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            { k: 'kVp Range', v: scanner.kvp },
            { k: 'Rotation', v: scanner.rotation },
            { k: 'Coverage', v: scanner.coverage },
          ].map(({ k, v }) => (
            <div key={k} className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.muted, fontFamily: 'DM Mono, monospace' }}>{k}</div>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 600, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {isScanning && study ? (
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.blue }} />
            <span className="font-bold uppercase tracking-wider" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: C.blue }}>Currently Scanning</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>{study.patientName}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.muted }}>{study.accession} · {study.patientAge}{study.patientGender}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{study.studyType}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{study.doctor}{study.doctorSpecialty && ` · ${study.doctorSpecialty}`}</div>
              {study.protocol && (
                <div className="mt-1.5 px-2 py-1 rounded-lg inline-block" style={{ background: `${C.blue}12`, border: `1px solid ${C.blue}20`, fontSize: 10, color: C.sky }}>
                  {study.protocol}
                </div>
              )}
              {study.contrast && study.contrast !== 'None' && (
                <div className="mt-1 px-2 py-1 rounded-lg inline-block ml-1" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 10, color: C.amber }}>
                  IV: {study.contrast}
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className="relative" style={{ width: 72, height: 72 }}>
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke={C.blue} strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - (study.scanProgressPct || 62) / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color: C.sky }}>{study.scanProgressPct}%</span>
                  <span style={{ fontSize: 9, color: C.muted }}>{study.scanRemaining}m left</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: `${C.blue}15` }}>
              <div className="h-full rounded-full" style={{ width: `${study.scanProgressPct}%`, background: `linear-gradient(90deg, ${C.blue}, ${C.sky})`, transition: 'width 0.6s ease' }} />
            </div>
            <div className="flex justify-between mt-1" style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace' }}>
              <span>{study.scanElapsed}m elapsed</span>
              <span>~{study.scanRemaining}m remaining</span>
            </div>
          </div>

          {study.previousStudy && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
              <div style={{ fontSize: 10, color: C.sky, fontWeight: 600, marginBottom: 4 }}>Prior Study Reference</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{study.previousStudy.date} — {study.previousStudy.finding}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{study.previousStudy.facility}</div>
            </div>
          )}

          {study.clinicalNotes && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Clinical Notes</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{study.clinicalNotes}</div>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 hover:opacity-80" style={{ background: `${C.blue}20`, color: C.sky, border: `1px solid ${C.blue}30`, fontSize: 12 }}>
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
            <div style={{ fontSize: 11, color: C.muted }}>Next scheduled: CT Abdomen — Mariam Al Suwaidi at 2:45 PM</div>
          </div>
        </div>
      )}

      <div className="px-5 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="uppercase tracking-widest mb-2" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: C.muted }}>Capabilities</div>
        <div className="flex flex-wrap gap-1.5">
          {scanner.capabilities.map(s => (
            <span key={s} className="px-2 py-0.5 rounded-lg" style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: `1px solid ${C.border}` }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const CTStudyRow: React.FC<{ study: ImagingStudy; onClick: () => void }> = ({ study, onClick }) => {
  const badge = statusBadge(study);
  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all"
      style={{ borderBottom: `1px solid ${C.border}` }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.background = `${C.blue}08`)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{study.accession}</div>
          <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ fontSize: 9, background: badge.bg, color: badge.color }}>{badge.label}</span>
          {study.contrastAlert && (
            <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ fontSize: 9, background: 'rgba(245,158,11,0.15)', color: C.amber }}>IV Contrast</span>
          )}
        </div>
        <div className="font-semibold text-white" style={{ fontSize: 13 }}>{study.patientName}</div>
        <div className="truncate" style={{ fontSize: 11, color: C.muted }}>{study.studyType}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{study.doctor}{study.doctorSpecialty && ` · ${study.doctorSpecialty}`}</div>
      </div>
      <div className="flex-shrink-0 text-right space-y-1">
        {study.status === 'scanning' && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.sky }}>{study.scanProgressPct}% · {study.scanRemaining}m left</div>}
        {(study.status === 'report_pending' || study.status === 'report_overdue') && (
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: study.status === 'report_overdue' ? C.red : C.amber }}>{study.reportPendingHours}h pending</div>
            <div style={{ fontSize: 10, color: C.muted }}>Queue {study.queuePosition}/9</div>
          </div>
        )}
        {study.status === 'scheduled' && (
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.sky }}>{study.scheduledTime}</div>
            {study.scheduledTimeRelative && <div style={{ fontSize: 10, color: C.muted }}>{study.scheduledTimeRelative}</div>}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>{study.scanner || 'CT Suite'}</div>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.15)' }} />
    </div>
  );
};

const CTScanPage: React.FC = () => {
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null);

  const scanning  = ctStudies.filter(s => s.status === 'scanning');
  const pending   = ctStudies.filter(s => s.status === 'report_pending' || s.status === 'report_overdue');
  const scheduled = ctStudies.filter(s => s.status === 'scheduled');

  const kpis = [
    { v: String(ctStudies.length), label: 'Total CT Today', sub: 'All protocols', accent: C.blue },
    { v: String(scanning.length), label: 'Scanning Now', sub: scanning.map(s => s.patientName.split(' ')[0]).join(', ') || '—', accent: C.blue, pulse: true },
    { v: String(pending.length), label: 'Reports Pending', sub: 'Dr. Rania on duty', accent: C.amber },
    { v: String(scheduled.length), label: 'Scheduled', sub: scheduled[0] ? `Next: ${scheduled[0].scheduledTime}` : '—', accent: C.sky },
    { v: '2', label: 'Scanners', sub: '2 online · 0 offline', accent: C.emerald },
  ];

  return (
    <div className="flex-1 overflow-auto" style={{ background: C.bg }}>
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${C.blue}20`, border: `1px solid ${C.blue}30` }}>
            <Cpu className="w-4 h-4" style={{ color: C.blue }} />
          </div>
          <div>
            <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16 }}>Computed Tomography</div>
            <div style={{ fontSize: 11, color: C.muted }}>Dubai Medical & Imaging Centre · Healthcare City</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Shield className="w-3 h-3" style={{ color: C.amber }} />
              <span style={{ fontSize: 10, color: C.amber, fontFamily: 'DM Mono, monospace' }}>Radiation Safety Protocol Active</span>
            </div>
            <span className="px-2.5 py-1 rounded-full font-bold" style={{ fontSize: 10, background: `${C.blue}15`, color: C.sky, border: `1px solid ${C.blue}25`, fontFamily: 'DM Mono, monospace' }}>
              DHA-RAD-2016-001247
            </span>
          </div>
        </div>

        <div className="flex gap-3 mb-5">
          {kpis.map(k => (
            <div key={k.label} className="flex-1 px-4 py-3.5 rounded-2xl transition-transform hover:scale-[1.01]" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="font-bold leading-none mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, color: k.accent }}>
                {k.v}
                {(k as any).pulse && <span className="inline-block w-2 h-2 rounded-full ml-1.5 animate-pulse align-middle" style={{ background: k.accent, marginBottom: 2 }} />}
              </div>
              <div className="font-medium text-white/80" style={{ fontSize: 11 }}>{k.label}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          {ctScanners.map(s => (
            <CTScannerCard key={s.id} scanner={s} onViewStudy={setSelectedStudy} />
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>All CT Studies Today</div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: C.muted }}>{ctStudies.length} studies</span>
              <button className="px-3 py-1.5 rounded-xl font-bold hover:opacity-80 transition-opacity" style={{ background: `${C.blue}20`, color: C.sky, border: `1px solid ${C.blue}30`, fontSize: 11 }}>
                + New CT Order
              </button>
            </div>
          </div>

          {scanning.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-5 py-2" style={{ background: `${C.blue}08`, borderBottom: `1px solid ${C.blue}15` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.blue }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, color: C.sky, textTransform: 'uppercase', letterSpacing: '0.1em' }}>SCANNING NOW ({scanning.length})</span>
              </div>
              {scanning.map(s => <CTStudyRow key={s.id} study={s} onClick={() => setSelectedStudy(s)} />)}
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-5 py-2" style={{ background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid rgba(245,158,11,0.12)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.amber }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.1em' }}>REPORT PENDING ({pending.length})</span>
              </div>
              {pending.map(s => <CTStudyRow key={s.id} study={s} onClick={() => setSelectedStudy(s)} />)}
            </div>
          )}

          {scheduled.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-5 py-2" style={{ background: `${C.blue}05`, borderBottom: `1px solid ${C.blue}10` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.sky }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, color: C.sky, textTransform: 'uppercase', letterSpacing: '0.1em' }}>SCHEDULED ({scheduled.length})</span>
              </div>
              {scheduled.map(s => <CTStudyRow key={s.id} study={s} onClick={() => setSelectedStudy(s)} />)}
            </div>
          )}

          {ctStudies.length === 0 && (
            <div className="px-5 py-10 text-center" style={{ color: C.muted }}>No CT studies today</div>
          )}
        </div>
      </div>

      {selectedStudy && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={() => setSelectedStudy(null)} />
          <CTDetailPanel study={selectedStudy} onClose={() => setSelectedStudy(null)} />
        </>
      )}
    </div>
  );
};

const CTDetailPanel: React.FC<{ study: ImagingStudy; onClose: () => void }> = ({ study, onClose }) => {
  const isScanning = study.status === 'scanning';
  const isReport   = study.status === 'report_pending' || study.status === 'report_overdue';

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col" style={{ width: 420, background: '#161822', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: `${C.blue}08` }}>
        <div>
          <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>CT Study Detail</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.sky }}>{study.accession}</div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="p-4 rounded-xl" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
          <div className="font-bold text-white" style={{ fontSize: 14 }}>{study.patientName}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.muted }}>
            {study.patientAge}{study.patientGender} · {study.patientId}{study.patientBloodGroup && ` · ${study.patientBloodGroup}`}
          </div>
          {study.insurance && <div className="mt-1" style={{ fontSize: 11, color: C.sky }}>{study.insurance}</div>}
          {study.contrastAlert && (
            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.amber }} />
              <span style={{ fontSize: 11, color: C.amber }}>IV Contrast Required — Verify Renal Function</span>
            </div>
          )}
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

        {isScanning && (
          <div className="p-4 rounded-xl" style={{ background: `${C.blue}08`, border: `1px solid ${C.blue}20` }}>
            <div className="flex items-center gap-4 mb-3">
              <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="30" fill="none" stroke={`${C.blue}15`} strokeWidth="8" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke={C.blue} strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - (study.scanProgressPct || 62) / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color: C.sky }}>{study.scanProgressPct}%</span>
                </div>
              </div>
              <div>
                <div style={{ color: C.sky, fontSize: 13, fontWeight: 600 }}>Acquisition In Progress</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: C.muted }}>{study.scanElapsed}m elapsed · ~{study.scanRemaining}m remaining</div>
                <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: `${C.blue}15`, width: 160 }}>
                  <div className="h-full rounded-full" style={{ width: `${study.scanProgressPct}%`, background: `linear-gradient(90deg, ${C.blue}, ${C.sky})` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {study.previousStudy && (
          <div className="p-3 rounded-xl" style={{ background: `${C.blue}06`, border: `1px solid ${C.blue}15` }}>
            <div className="font-semibold mb-1.5" style={{ fontSize: 11, color: C.sky }}>Prior Study</div>
            <div style={{ fontSize: 12, color: C.text }}>{study.previousStudy.date} — {study.previousStudy.finding}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{study.previousStudy.facility}</div>
          </div>
        )}

        {study.clinicalNotes && (
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
            <div className="font-semibold mb-1.5" style={{ fontSize: 11, color: C.muted }}>Clinical Notes</div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{study.clinicalNotes}</div>
          </div>
        )}

        {isReport && (
          <div className="p-3 rounded-xl" style={{ background: study.status === 'report_overdue' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${study.status === 'report_overdue' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
            <div className="font-semibold mb-1" style={{ fontSize: 12, color: study.status === 'report_overdue' ? C.red : C.amber }}>
              {study.status === 'report_overdue' ? '! TAT Overdue' : 'TAT Status'}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>Scanned {study.reportPendingHours}h ago · Target &lt;3h{study.tatOverdue && ' — OVERDUE'}</div>
            {study.queuePosition && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Queue: {study.queuePosition}/9 · {study.radiologist}</div>}
          </div>
        )}

        {study.status === 'scheduled' && study.contrastAlert && (
          <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="font-semibold mb-1.5" style={{ fontSize: 11, color: C.amber }}>Pre-scan Checklist</div>
            {[
              'Verify renal function (eGFR ≥30)',
              'Confirm no contrast allergy',
              'IV access secured',
              'Patient hydration adequate',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 mb-1" style={{ fontSize: 11, color: C.muted }}>
                <div className="w-3.5 h-3.5 rounded border flex-shrink-0" style={{ borderColor: 'rgba(245,158,11,0.4)' }} />
                {item}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {isScanning && (
          <>
            <button className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-80" style={{ background: `${C.blue}20`, color: C.sky, border: `1px solid ${C.blue}30`, fontSize: 13 }}>
              <ClipboardList className="w-4 h-4" /> View Full Protocol
            </button>
            <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(255,255,255,0.05)', color: C.muted, fontSize: 13, border: `1px solid ${C.border}` }}>
              <MessageSquare className="w-4 h-4" /> Message Doctor
            </button>
            <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(245,158,11,0.1)', color: C.amber, fontSize: 13, border: '1px solid rgba(245,158,11,0.2)' }}>
              <PauseCircle className="w-4 h-4" /> Pause Study
            </button>
            <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(239,68,68,0.06)', color: C.red, fontSize: 13, border: '1px solid rgba(239,68,68,0.15)' }}>
              <StopCircle className="w-4 h-4" /> Emergency Stop
            </button>
          </>
        )}
        {isReport && (
          <>
            <button className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90" style={{ background: C.amber, color: '#0F1117', fontSize: 13 }}>
              <FileText className="w-4 h-4" /> Open for Reporting
            </button>
            <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(245,158,11,0.1)', color: C.amber, fontSize: 13, border: '1px solid rgba(245,158,11,0.2)' }}>
              <Phone className="w-4 h-4" /> Alert Radiologist
            </button>
            <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(255,255,255,0.05)', color: C.muted, fontSize: 13, border: `1px solid ${C.border}` }}>
              <MessageSquare className="w-4 h-4" /> Message Doctor
            </button>
          </>
        )}
        {study.status === 'scheduled' && (
          <>
            <button className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-80" style={{ background: `${C.blue}20`, color: C.sky, border: `1px solid ${C.blue}30`, fontSize: 13 }}>
              <User className="w-4 h-4" /> Confirm Patient Arrival
            </button>
            {study.contrastAlert && (
              <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(245,158,11,0.1)', color: C.amber, fontSize: 13, border: '1px solid rgba(245,158,11,0.2)' }}>
                <Activity className="w-4 h-4" /> Review Contrast Pre-check
              </button>
            )}
            <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-80" style={{ background: 'rgba(255,255,255,0.05)', color: C.muted, fontSize: 13, border: `1px solid ${C.border}` }}>
              <MessageSquare className="w-4 h-4" /> Message Doctor
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CTScanPage;
