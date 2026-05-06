import { useState } from 'react';
import { Plus, X, Clock, Users, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { INCIDENTS } from '../mockData';
import type { Incident, Severity } from '../types';

const SEV_COLORS: Record<Severity, { color: string; bg: string; border: string }> = {
  SEV1: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  SEV2: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  SEV3: { color: '#0891B2', bg: 'rgba(8,145,178,0.1)', border: 'rgba(8,145,178,0.3)' },
  SEV4: { color: '#64748B', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
};

const STATUS_COLORS: Record<string, string> = {
  Investigating: '#EF4444', Identified: '#F59E0B', Monitoring: '#0891B2', Resolved: '#10B981',
};

function IncidentCard({ inc, selected, onClick }: { inc: Incident; selected: boolean; onClick: () => void }) {
  const sev = SEV_COLORS[inc.severity];
  const statusColor = STATUS_COLORS[inc.status] ?? '#64748B';
  const isActive = inc.status !== 'Resolved';
  return (
    <div onClick={onClick} className="rounded-2xl p-4 cursor-pointer transition-all" style={{ background: selected ? 'rgba(13,148,136,0.06)' : '#1E293B', border: `1px solid ${selected ? 'rgba(13,148,136,0.3)' : isActive ? sev.border : 'rgba(51,65,85,0.5)'}`, borderLeftWidth: 4, borderLeftColor: sev.color }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>{inc.severity}</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: `${statusColor}15`, color: statusColor }}>{inc.status}</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#475569' }}>{inc.id}</span>
        </div>
        {isActive && <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0 mt-0.5" style={{ background: sev.color }} />}
      </div>
      <div className="font-bold mb-2" style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{inc.title}</div>
      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>{inc.impact}</div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" style={{ color: '#475569' }} />
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>{inc.started} · {inc.duration}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" style={{ color: '#475569' }} />
          <span style={{ fontSize: 10, color: '#64748B' }}>{inc.commander}</span>
        </div>
      </div>
      {inc.postmortemRequired && !inc.postmortemFiled && inc.status === 'Resolved' && (
        <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="w-3 h-3" style={{ color: '#EF4444' }} />
          <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 600 }}>Postmortem required — not yet filed</span>
        </div>
      )}
    </div>
  );
}

function IncidentDetailPanel({ inc, onClose }: { inc: Incident; onClose: () => void }) {
  const [postmortemOpen, setPostmortemOpen] = useState(false);
  const sev = SEV_COLORS[inc.severity];
  const statusColor = STATUS_COLORS[inc.status] ?? '#64748B';
  return (
    <div className="w-96 flex-shrink-0 flex flex-col border-l overflow-auto" style={{ borderColor: 'rgba(51,65,85,0.4)', background: '#0F172A' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black" style={{ background: sev.bg, color: sev.color }}>{inc.severity}</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#475569' }}>{inc.id}</span>
        </div>
        <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#475569' }} /></button>
      </div>
      <div className="p-4 flex flex-col gap-4 overflow-auto">
        <div>
          <div className="font-bold mb-1" style={{ fontSize: 14, color: '#E2E8F0', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{inc.title}</div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: `${statusColor}15`, color: statusColor }}>{inc.status}</span>
        </div>
        <div className="rounded-xl p-3 space-y-2" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          {[
            { label: 'Commander', value: inc.commander },
            { label: 'Team', value: inc.team },
            { label: 'Started', value: inc.started },
            { label: 'Duration', value: inc.duration },
          ].map(m => (
            <div key={m.label} className="flex items-center justify-between">
              <span style={{ fontSize: 11, color: '#64748B' }}>{m.label}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#CBD5E1' }}>{m.value}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 6 }}>Affected Services</div>
          <div className="flex flex-wrap gap-1.5">
            {inc.affectedServices.map(s => (
              <span key={s} className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }}>{s}</span>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 6 }}>Latest Update</div>
          <div className="rounded-xl p-3" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
            <div style={{ fontSize: 11, color: '#CBD5E1', lineHeight: 1.5 }}>{inc.lastUpdate}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#475569', marginTop: 4 }}>{inc.lastUpdateTime}</div>
          </div>
        </div>
        {/* Timeline */}
        <div>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 6 }}>Timeline</div>
          <div className="space-y-2">
            {[
              { time: inc.started, event: 'Incident opened', type: 'error' },
              { time: inc.lastUpdateTime, event: inc.lastUpdate.substring(0, 60) + '…', type: 'info' },
              ...(inc.status === 'Resolved' ? [{ time: inc.lastUpdateTime, event: 'Incident resolved', type: 'success' }] : []),
            ].map((t, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: t.type === 'error' ? '#EF4444' : t.type === 'success' ? '#10B981' : '#0891B2' }} />
                <div>
                  <div style={{ fontSize: 11, color: '#CBD5E1' }}>{t.event}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#475569' }}>{t.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Actions */}
        {inc.status !== 'Resolved' && (
          <div className="flex flex-col gap-2">
            {['Post update', 'Page on-call', 'Open war room'].map(a => (
              <button key={a} className="w-full py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8', border: '1px solid rgba(51,65,85,0.6)' }}>{a}</button>
            ))}
            <button className="w-full py-2 rounded-lg text-xs font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>Resolve incident</button>
          </div>
        )}
        {inc.status === 'Resolved' && inc.postmortemRequired && !inc.postmortemFiled && (
          <button onClick={() => setPostmortemOpen(true)} className="w-full py-2 rounded-lg text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>Begin postmortem (required)</button>
        )}
        {inc.status === 'Resolved' && inc.postmortemFiled && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
            <span style={{ fontSize: 11, color: '#10B981' }}>Postmortem filed</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateIncidentModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-lg" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.6)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-white" style={{ fontSize: 16, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Create Incident</h2>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#475569' }} /></button>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Title', type: 'input', placeholder: 'Brief description of the incident' },
            { label: 'Initial Summary', type: 'textarea', placeholder: 'What is the customer impact?' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
              {f.type === 'input'
                ? <input placeholder={f.placeholder} className="w-full px-3 py-2 rounded-xl outline-none text-sm" style={{ background: 'rgba(51,65,85,0.4)', color: '#CBD5E1', border: '1px solid rgba(51,65,85,0.6)' }} />
                : <textarea placeholder={f.placeholder} rows={3} className="w-full px-3 py-2 rounded-xl outline-none text-sm resize-none" style={{ background: 'rgba(51,65,85,0.4)', color: '#CBD5E1', border: '1px solid rgba(51,65,85,0.6)' }} />
              }
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Severity</label>
              <select className="w-full px-3 py-2 rounded-xl outline-none text-sm" style={{ background: 'rgba(51,65,85,0.4)', color: '#CBD5E1', border: '1px solid rgba(51,65,85,0.6)' }}>
                {(['SEV1', 'SEV2', 'SEV3', 'SEV4'] as Severity[]).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Commander</label>
              <input placeholder="Assign incident commander" className="w-full px-3 py-2 rounded-xl outline-none text-sm" style={{ background: 'rgba(51,65,85,0.4)', color: '#CBD5E1', border: '1px solid rgba(51,65,65,0.6)' }} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8' }}>Cancel</button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>Create Incident</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IncidentsTab() {
  const [selected, setSelected] = useState<Incident | null>(INCIDENTS[0]);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  const filtered = INCIDENTS.filter(i => {
    if (filter === 'active') return i.status !== 'Resolved';
    if (filter === 'resolved') return i.status === 'Resolved';
    return true;
  });

  return (
    <>
      {showCreate && <CreateIncidentModal onClose={() => setShowCreate(false)} />}
      <div className="flex" style={{ minHeight: 0 }}>
        <div className="flex-1 p-6 overflow-auto" style={{ minWidth: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {(['all', 'active', 'resolved'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize" style={{ background: filter === f ? 'rgba(13,148,136,0.15)' : 'rgba(51,65,85,0.4)', color: filter === f ? '#0D9488' : '#64748B', border: `1px solid ${filter === f ? 'rgba(13,148,136,0.3)' : 'rgba(51,65,85,0.6)'}` }}>{f}</button>
              ))}
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Plus className="w-3.5 h-3.5" /> Create Incident
            </button>
          </div>

          {/* Active incidents */}
          {filter !== 'resolved' && (
            <>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Active</div>
              <div className="space-y-3 mb-5">
                {filtered.filter(i => i.status !== 'Resolved').map(inc => (
                  <IncidentCard key={inc.id} inc={inc} selected={selected?.id === inc.id} onClick={() => setSelected(inc)} />
                ))}
              </div>
            </>
          )}

          {/* Historical */}
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>History</div>
          <div className="space-y-3">
            {filtered.filter(i => i.status === 'Resolved').map(inc => (
              <IncidentCard key={inc.id} inc={inc} selected={selected?.id === inc.id} onClick={() => setSelected(inc)} />
            ))}
          </div>
        </div>

        {selected && <IncidentDetailPanel inc={selected} onClose={() => setSelected(null)} />}
      </div>
    </>
  );
}
