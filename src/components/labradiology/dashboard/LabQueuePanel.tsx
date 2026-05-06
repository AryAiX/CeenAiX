import React, { useState } from 'react';
import { FlaskConical, Phone, MapPin, ChevronRight, AlertTriangle } from 'lucide-react';
import { labSamples, LabSample } from '../../../data/diagnosticsData';

const statusColor = (s: string) => {
  if (s === 'critical') return { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', label: 'CRITICAL' };
  if (s === 'running')  return { bg: 'rgba(99,102,241,0.1)', color: '#6366F1', label: 'Running' };
  if (s === 'resulted') return { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'Resulted' };
  if (s === 'verified') return { bg: 'rgba(16,185,129,0.1)', color: '#10B981', label: 'Verified' };
  return { bg: 'rgba(99,102,241,0.08)', color: '#6366F1', label: 'Received' };
};

const SampleRow: React.FC<{ s: LabSample; onClick: () => void }> = ({ s, onClick }) => {
  const st = statusColor(s.status);
  const isCrit = s.status === 'critical';
  const priColor = s.priority === 'stat' ? '#EF4444' : s.priority === 'urgent' ? '#F59E0B' : '#94A3B8';

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer px-3 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 transition-colors"
      style={{ borderBottom: '1px solid #F1F5F9', borderLeft: `3px solid ${isCrit ? '#EF4444' : priColor}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="font-mono text-xs font-bold" style={{ color: '#94A3B8', fontSize: 10 }}>{s.sampleNum}</span>
          {s.priority === 'stat'   && <span className="px-1 rounded text-xs font-black" style={{ fontSize: 8, background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>STAT</span>}
          {s.priority === 'urgent' && <span className="px-1 rounded text-xs font-black" style={{ fontSize: 8, background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>URGENT</span>}
          {s.tatOverdue && <span style={{ fontSize: 8, color: '#F59E0B', fontWeight: 700 }}>⚠ TAT</span>}
        </div>
        <div className="font-semibold text-slate-800 text-xs mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12 }}>
          {s.patientName} <span className="font-normal text-slate-400" style={{ fontSize: 10 }}>{s.patientAge}{s.patientGender}</span>
        </div>
        {isCrit && s.criticalValues ? (
          <div className="font-black" style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#EF4444' }}>
            {s.criticalValues[0].test}: {s.criticalValues[0].value} {s.criticalValues[0].unit} {s.criticalValues[0].flag}
          </div>
        ) : (
          <div className="text-slate-400 truncate" style={{ fontSize: 10 }}>{s.tests.slice(0, 3).join(' · ')}</div>
        )}
        {s.location && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin style={{ width: 9, height: 9, color: '#94A3B8' }} />
            <span className="text-slate-400" style={{ fontSize: 9 }}>{s.location}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="px-2 py-0.5 rounded-full font-bold" style={{ fontSize: 9, background: st.bg, color: st.color }}>{st.label}</span>
        {isCrit && (
          <button onClick={e => e.stopPropagation()} className="flex items-center gap-1 px-1.5 py-1 rounded-lg font-bold text-white hover:opacity-90"
            style={{ background: '#EF4444', fontSize: 9 }}>
            <Phone style={{ width: 9, height: 9 }} /> Notify
          </button>
        )}
        <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 12, height: 12, color: '#94A3B8' }} />
      </div>
    </div>
  );
};

interface LabQueuePanelProps {
  onSelectSample: (s: LabSample) => void;
}

const LabQueuePanel: React.FC<LabQueuePanelProps> = ({ onSelectSample }) => {
  const critical = labSamples.filter(s => s.status === 'critical');
  const running  = labSamples.filter(s => s.status === 'running');
  const pending  = labSamples.filter(s => s.status === 'pending' || s.status === 'received');
  const resulted = labSamples.filter(s => s.status === 'resulted' || s.status === 'verified');

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl" style={{ background: '#fff', border: '1px solid #E2E8F0', borderTop: '3px solid #4F46E5' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="flex items-center gap-2">
          <FlaskConical style={{ width: 15, height: 15, color: '#4F46E5' }} />
          <span className="font-bold text-indigo-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>Lab Queue</span>
          <span className="px-2 py-0.5 rounded-full font-bold" style={{ fontSize: 10, background: '#EEF2FF', color: '#4F46E5' }}>{labSamples.length}</span>
        </div>
        <button className="px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#4F46E5', fontSize: 11 }}>+ New Sample</button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {critical.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
              <AlertTriangle style={{ width: 10, height: 10, color: '#EF4444' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>CRITICAL — ACTION REQUIRED ({critical.length})</span>
            </div>
            {critical.map(s => <SampleRow key={s.id} s={s} onClick={() => onSelectSample(s)} />)}
          </div>
        )}
        {running.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(99,102,241,0.05)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#6366F1' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Running ({running.length})</span>
            </div>
            {running.map(s => <SampleRow key={s.id} s={s} onClick={() => onSelectSample(s)} />)}
          </div>
        )}
        {pending.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(13,148,136,0.04)', borderBottom: '1px solid rgba(13,148,136,0.08)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#0D9488' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Pending / Received ({pending.length})</span>
            </div>
            {pending.map(s => <SampleRow key={s.id} s={s} onClick={() => onSelectSample(s)} />)}
          </div>
        )}
        {resulted.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(16,185,129,0.04)', borderBottom: '1px solid rgba(16,185,129,0.08)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Resulted / Verified ({resulted.length})</span>
            </div>
            {resulted.map(s => <SampleRow key={s.id} s={s} onClick={() => onSelectSample(s)} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default LabQueuePanel;
