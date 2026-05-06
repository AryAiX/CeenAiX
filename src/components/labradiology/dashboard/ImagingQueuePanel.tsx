import React, { useState } from 'react';
import { ScanLine, ChevronRight, AlertTriangle, FileText, Clock, Activity } from 'lucide-react';
import { imagingStudies, ImagingStudy } from '../../../data/diagnosticsData';

const MODALITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  MRI:   { bg: '#EEF2FF', color: '#4F46E5', label: 'MRI' },
  CT:    { bg: '#EFF6FF', color: '#1D4ED8', label: 'CT' },
  USS:   { bg: '#F0FDFA', color: '#0D9488', label: 'USS' },
  XR:    { bg: '#F8FAFC', color: '#475569', label: 'X-Ray' },
  PET:   { bg: '#FFFBEB', color: '#B45309', label: 'PET-CT' },
  MAMMO: { bg: '#FFF1F2', color: '#BE185D', label: 'MAMMO' },
  FLUORO:{ bg: '#F5F3FF', color: '#7C3AED', label: 'ECHO' },
};

type ModalityFilter = 'All' | 'MRI' | 'CT' | 'USS' | 'XR' | 'Other';

const ModalityBadge: React.FC<{ modality: string }> = ({ modality }) => {
  const s = MODALITY_STYLES[modality] || { bg: '#F1F5F9', color: '#64748B', label: modality };
  return (
    <span className="px-1.5 py-0.5 rounded font-black" style={{ fontSize: 8, background: s.bg, color: s.color, fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.03em' }}>
      {s.label}
    </span>
  );
};

const ProgressRing: React.FC<{ pct: number; size?: number }> = ({ pct, size = 36 }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (pct / 100);
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDE9FE" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#8B5CF6" strokeWidth={4}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 3.5} textAnchor="middle" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, fill: '#7C3AED' }}>{pct}%</text>
    </svg>
  );
};

const StudyRow: React.FC<{ study: ImagingStudy; onClick: () => void }> = ({ study, onClick }) => {
  const isScanning     = study.status === 'scanning';
  const isPending      = study.status === 'report_pending';
  const isOverdue      = study.status === 'report_overdue';
  const isScheduled    = study.status === 'scheduled';

  return (
    <div onClick={onClick} className="group cursor-pointer flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors"
      style={{ borderBottom: '1px solid #F1F5F9', borderLeft: `3px solid ${isScanning ? '#8B5CF6' : isOverdue ? '#EF4444' : isPending ? '#F59E0B' : '#3B82F6'}` }}>
      {isScanning && study.scanProgressPct !== undefined
        ? <ProgressRing pct={study.scanProgressPct} />
        : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: isOverdue ? 'rgba(239,68,68,0.1)' : isPending ? 'rgba(245,158,11,0.08)' : '#EFF6FF' }}>
            <ScanLine style={{ width: 14, height: 14, color: isOverdue ? '#EF4444' : isPending ? '#F59E0B' : '#1D4ED8' }} />
          </div>
        )
      }

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <ModalityBadge modality={study.modality} />
          <span className="font-mono" style={{ fontSize: 9, color: '#94A3B8' }}>{study.accession}</span>
          {isOverdue && <span className="flex items-center gap-0.5" style={{ fontSize: 8, color: '#EF4444', fontWeight: 700 }}><AlertTriangle style={{ width: 8, height: 8 }} /> TAT {study.reportPendingHours}h</span>}
          {study.fdgAlert && <span style={{ fontSize: 8, color: '#B45309', fontWeight: 700 }}>FDG ⚠</span>}
          {study.contrastAlert && <span style={{ fontSize: 8, color: '#0D9488', fontWeight: 700 }}>Contrast ⚠</span>}
        </div>
        <div className="font-semibold text-slate-800 text-xs" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12 }}>
          {study.patientName} <span className="font-normal text-slate-400" style={{ fontSize: 10 }}>{study.patientAge}{study.patientGender}</span>
        </div>
        <div className="text-slate-500 truncate" style={{ fontSize: 10 }}>{study.studyType}</div>
        {isScanning && study.scanRemaining && (
          <div className="flex items-center gap-1 mt-0.5">
            <Activity style={{ width: 9, height: 9, color: '#8B5CF6' }} />
            <span style={{ fontSize: 9, color: '#8B5CF6', fontWeight: 600 }}>~{study.scanRemaining} min remaining</span>
          </div>
        )}
        {isScheduled && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock style={{ width: 9, height: 9, color: '#64748B' }} />
            <span style={{ fontSize: 9, color: '#64748B' }}>{study.scheduledTime} · {study.scheduledTimeRelative}</span>
            {study.patientArrived && <span style={{ fontSize: 8, color: '#10B981', fontWeight: 600 }}>Arrived ✓</span>}
          </div>
        )}
        {(isPending || isOverdue) && (
          <div className="flex items-center gap-1 mt-0.5">
            <FileText style={{ width: 9, height: 9, color: isOverdue ? '#EF4444' : '#F59E0B' }} />
            <span style={{ fontSize: 9, color: isOverdue ? '#EF4444' : '#F59E0B', fontWeight: 600 }}>
              Pending {study.reportPendingHours}h · Queue #{study.queuePosition}
            </span>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className="px-2 py-0.5 rounded-full font-bold" style={{
          fontSize: 9,
          background: isScanning ? '#F5F3FF' : isOverdue ? 'rgba(239,68,68,0.1)' : isPending ? 'rgba(245,158,11,0.1)' : '#EFF6FF',
          color: isScanning ? '#8B5CF6' : isOverdue ? '#EF4444' : isPending ? '#F59E0B' : '#1D4ED8',
        }}>
          {isScanning ? 'Scanning' : isOverdue ? 'Overdue' : isPending ? 'Pending' : 'Scheduled'}
        </span>
        {(isPending || isOverdue) && (
          <button onClick={e => e.stopPropagation()} className="px-2 py-1 rounded-lg font-semibold text-white hover:opacity-90"
            style={{ background: '#1D4ED8', fontSize: 9 }}>
            Report
          </button>
        )}
        <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 12, height: 12, color: '#94A3B8' }} />
      </div>
    </div>
  );
};

interface ImagingQueuePanelProps {
  onSelectStudy: (s: ImagingStudy) => void;
}

const ImagingQueuePanel: React.FC<ImagingQueuePanelProps> = ({ onSelectStudy }) => {
  const [filter, setFilter] = useState<ModalityFilter>('All');

  const filtered = filter === 'All'
    ? imagingStudies
    : filter === 'Other'
    ? imagingStudies.filter(s => !['MRI','CT','USS','XR'].includes(s.modality))
    : imagingStudies.filter(s => s.modality === filter);

  const scanning  = filtered.filter(s => s.status === 'scanning');
  const pending   = filtered.filter(s => s.status === 'report_pending' || s.status === 'report_overdue')
    .sort((a, b) => (b.reportPendingHours || 0) - (a.reportPendingHours || 0));
  const scheduled = filtered.filter(s => s.status === 'scheduled');

  const modalityCount = (m: string) => imagingStudies.filter(s => s.modality === m).length;

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl" style={{ background: '#fff', border: '1px solid #E2E8F0', borderTop: '3px solid #1D4ED8' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="flex items-center gap-2">
          <ScanLine style={{ width: 15, height: 15, color: '#1D4ED8' }} />
          <span className="font-bold text-blue-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>Imaging Queue</span>
          <span className="px-2 py-0.5 rounded-full font-bold" style={{ fontSize: 10, background: '#EFF6FF', color: '#1D4ED8' }}>{imagingStudies.length}</span>
        </div>
      </div>

      <div className="flex gap-1.5 px-3 py-2 flex-shrink-0 flex-wrap" style={{ borderBottom: '1px solid #F1F5F9' }}>
        {(['All', 'MRI', 'CT', 'USS', 'XR', 'Other'] as ModalityFilter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-2.5 py-1 rounded-lg font-semibold transition-all"
            style={{ fontSize: 10, background: filter === f ? '#1D4ED8' : '#F8FAFC', color: filter === f ? '#fff' : '#64748B', border: `1px solid ${filter === f ? '#1D4ED8' : '#E2E8F0'}` }}>
            {f} {f !== 'All' && f !== 'Other' ? `(${modalityCount(f)})` : ''}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {scanning.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(139,92,246,0.06)', borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#8B5CF6' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Active Now ({scanning.length})</span>
            </div>
            {scanning.map(s => <StudyRow key={s.id} study={s} onClick={() => onSelectStudy(s)} />)}
          </div>
        )}
        {pending.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid rgba(245,158,11,0.08)' }}>
              <AlertTriangle style={{ width: 10, height: 10, color: '#F59E0B' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Report Pending ({pending.length})</span>
            </div>
            {pending.map(s => <StudyRow key={s.id} study={s} onClick={() => onSelectStudy(s)} />)}
          </div>
        )}
        {scheduled.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(29,78,216,0.04)', borderBottom: '1px solid rgba(29,78,216,0.07)' }}>
              <Clock style={{ width: 10, height: 10, color: '#1D4ED8' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Scheduled Today ({scheduled.length})</span>
            </div>
            {scheduled.map(s => <StudyRow key={s.id} study={s} onClick={() => onSelectStudy(s)} />)}
          </div>
        )}

        {/* Modality stats strip */}
        <div className="px-3 py-3 flex gap-3 flex-wrap" style={{ borderTop: '1px solid #F1F5F9', background: '#FAFAFA' }}>
          {Object.entries({ MRI: 'MRI', CT: 'CT', USS: 'USS', XR: 'X-Ray', PET: 'PET' }).map(([k, label]) => (
            <div key={k} className="text-center">
              <div className="font-black" style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: '#1E293B' }}>{modalityCount(k)}</div>
              <div style={{ fontSize: 9, color: '#94A3B8' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImagingQueuePanel;
