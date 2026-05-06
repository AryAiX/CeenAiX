import { useState } from 'react';
import { Plus, X, Calendar, List, Clock, Shield } from 'lucide-react';
import { MAINTENANCE_WINDOWS } from '../mockData';
import type { MaintenanceWindow } from '../types';

const STATUS_CONFIG = {
  upcoming: { color: '#0891B2', bg: 'rgba(8,145,178,0.1)', border: 'rgba(8,145,178,0.3)', label: 'Upcoming' },
  'in-progress': { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', label: 'In Progress' },
  completed: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', label: 'Completed' },
};

const CHANGE_CALENDAR = [
  { type: 'deploy', date: '2026-05-05 02:00', item: 'DB maintenance window · Infrastructure', impact: 'Low' },
  { type: 'maintenance', date: '2026-05-05 02:00', item: 'Database index rebuild · Clinical Records', impact: 'Low' },
  { type: 'cert', date: '2026-05-10 00:00', item: 'NABIDH certificate rotation', impact: 'Medium' },
  { type: 'deploy', date: '2026-05-12 10:00', item: 'v2.5.0 → All Portals (staged)', impact: 'Medium' },
  { type: 'license', date: '2026-05-15', item: 'DHA Platform License review', impact: 'Info' },
  { type: 'audit', date: '2026-05-20', item: 'DHA internal audit window — change freeze', impact: 'High' },
];

const FREEZE_WINDOWS = [
  { name: 'DHA Audit Window', start: '2026-05-20', end: '2026-05-24', reason: 'DHA annual audit', active: false },
  { name: 'Year-end Financial Close', start: '2026-12-28', end: '2027-01-02', reason: 'Financial reporting', active: false },
];

function MaintenanceCard({ mw }: { mw: MaintenanceWindow }) {
  const cfg = STATUS_CONFIG[mw.status];
  return (
    <div className="rounded-2xl p-4" style={{ background: '#1E293B', border: `1px solid ${mw.status === 'upcoming' ? cfg.border : 'rgba(51,65,85,0.5)'}` }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-bold mb-1" style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{mw.title}</div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          {mw.customerFacing && <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Customer-facing</span>}
        </div>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>{mw.id}</span>
      </div>
      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" style={{ color: '#475569' }} />
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>{mw.start} → {mw.end}</span>
        </div>
        <div style={{ fontSize: 11, color: '#64748B' }}>Impact: {mw.impact}</div>
        <div style={{ fontSize: 11, color: '#64748B' }}>Owner: {mw.owner}</div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {mw.services.map(s => (
          <span key={s} className="px-2 py-0.5 rounded-full text-[9px]" style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function CreateMaintenanceModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-lg max-h-screen overflow-auto" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.6)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-white" style={{ fontSize: 16, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Schedule Maintenance Window</h2>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#475569' }} /></button>
        </div>
        <div className="space-y-4">
          {['Title', 'Impact Statement'].map(f => (
            <div key={f}>
              <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f}</label>
              <input placeholder={f} className="w-full px-3 py-2 rounded-xl outline-none text-sm" style={{ background: 'rgba(51,65,85,0.4)', color: '#CBD5E1', border: '1px solid rgba(51,65,85,0.6)' }} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {['Start (GST)', 'End (GST)'].map(f => (
              <div key={f}>
                <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f}</label>
                <input type="datetime-local" className="w-full px-3 py-2 rounded-xl outline-none text-sm" style={{ background: 'rgba(51,65,85,0.4)', color: '#CBD5E1', border: '1px solid rgba(51,65,85,0.6)' }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-4 rounded-full" style={{ background: 'rgba(51,65,85,0.6)' }}><div className="w-3 h-3 rounded-full bg-slate-400 mt-0.5 ml-0.5" /></div>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>Customer-facing</span>
            </label>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div style={{ fontSize: 11, color: '#F59E0B' }}>Production windows require multi-admin approval. DHA/NABIDH-impacting windows will trigger a compliance notification reminder.</div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8' }}>Cancel</button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(8,145,178,0.15)', color: '#0891B2', border: '1px solid rgba(8,145,178,0.3)' }}>Submit for Approval</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaintenanceTab() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      {showCreate && <CreateMaintenanceModal onClose={() => setShowCreate(false)} />}
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('list')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: view === 'list' ? 'rgba(13,148,136,0.15)' : 'rgba(51,65,85,0.4)', color: view === 'list' ? '#0D9488' : '#64748B' }}>
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => setView('calendar')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: view === 'calendar' ? 'rgba(13,148,136,0.15)' : 'rgba(51,65,85,0.4)', color: view === 'calendar' ? '#0D9488' : '#64748B' }}>
              <Calendar className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(8,145,178,0.1)', color: '#0891B2', border: '1px solid rgba(8,145,178,0.3)' }}>
            <Plus className="w-3.5 h-3.5" /> Schedule Maintenance
          </button>
        </div>

        {/* Maintenance cards */}
        <div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Upcoming</div>
          <div className="grid gap-3 md:grid-cols-2">
            {MAINTENANCE_WINDOWS.filter(m => m.status === 'upcoming').map(mw => <MaintenanceCard key={mw.id} mw={mw} />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Recent</div>
          <div className="grid gap-3 md:grid-cols-2">
            {MAINTENANCE_WINDOWS.filter(m => m.status === 'completed').map(mw => <MaintenanceCard key={mw.id} mw={mw} />)}
          </div>
        </div>

        {/* Change calendar */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
            <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Change Calendar</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
            {CHANGE_CALENDAR.map((e, i) => {
              const colors = { deploy: '#0D9488', maintenance: '#0891B2', cert: '#F59E0B', license: '#94A3B8', audit: '#EF4444' };
              const color = colors[e.type as keyof typeof colors] ?? '#64748B';
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569', flexShrink: 0, minWidth: 140 }}>{e.date}</span>
                  <span style={{ fontSize: 12, color: '#CBD5E1', flex: 1 }}>{e.item}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0" style={{ background: `${color}15`, color }}>{e.impact}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Freeze windows */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
            <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Change Freeze Windows</h3>
            <button className="text-xs font-medium" style={{ color: '#0D9488' }}>+ Add freeze</button>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
            {FREEZE_WINDOWS.map((fw, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600 }}>{fw.name}</div>
                  <div style={{ fontSize: 10, color: '#475569' }}>{fw.reason}</div>
                </div>
                <div className="text-right">
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>{fw.start} → {fw.end}</div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }}>Inactive</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
