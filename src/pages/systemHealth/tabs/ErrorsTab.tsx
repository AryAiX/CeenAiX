import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, Users, Bug } from 'lucide-react';
import { ERROR_SIGNATURES } from '../mockData';
import type { ErrorSignature } from '../types';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const SEV_COLORS = { critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#0891B2' } as const;
const STATUS_COLORS: Record<ErrorSignature['status'], string> = {
  New: '#EF4444', Investigating: '#F59E0B', Acknowledged: '#0891B2', Resolved: '#10B981', Ignored: '#475569',
};

function errRateData() {
  return Array.from({ length: 24 }, (_, i) => ({
    h: `${String(i).padStart(2, '0')}:00`,
    critical: Math.round(i >= 13 && i <= 15 ? 80 + Math.random() * 20 : Math.random() * 2),
    high: Math.round(i >= 13 && i <= 15 ? 200 + Math.random() * 50 : Math.random() * 5),
    medium: Math.round(5 + Math.random() * 8),
    low: Math.round(10 + Math.random() * 15),
  }));
}
const ERR_DATA = errRateData();
const DEPLOYS = [13]; // deploy at hour 13 causing spike

function ErrorDetailPanel({ err, onClose }: { err: ErrorSignature; onClose: () => void }) {
  const color = SEV_COLORS[err.severity];
  return (
    <div className="w-96 flex-shrink-0 flex flex-col border-l overflow-auto" style={{ borderColor: 'rgba(51,65,85,0.4)', background: '#0F172A' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: `${color}20`, color }}>{err.severity}</span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{err.id}</span>
        </div>
        <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#475569' }} /></button>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <div>
          <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600, marginBottom: 4 }}>{err.signature}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>Service: {err.service}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Occurrences', value: err.occurrences.toLocaleString(), icon: Bug },
            { label: 'Affected Users', value: err.affectedUsers.toString(), icon: Users },
            { label: 'First Seen', value: err.firstSeen, icon: Clock },
            { label: 'Last Seen', value: err.lastSeen, icon: Clock },
          ].map(m => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="rounded-lg p-2.5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ fontSize: 9, color: '#475569', marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#CBD5E1' }}>{m.value}</div>
              </div>
            );
          })}
        </div>
        {/* Stack trace */}
        <div>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 6 }}>Stack Trace (PHI-redacted)</div>
          <div className="rounded-lg p-3 overflow-x-auto" style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.5)' }}>
            <pre style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{`Error: ${err.signature.split(' — ')[0]}
  at ConnectionPool.acquire (/app/db/pool.ts:142)
  at InsuranceRepository.getCoverage (/app/repositories/insurance.ts:87)
  at InsuranceService.fetchCoverage (/app/services/insurance.ts:234)
  at /app/api/insurance/coverage.ts:56
  at Layer.handle [as handle_request] (express:95)
  at next (express:137)
  at Route.dispatch (express:112)`}</pre>
          </div>
        </div>
        {/* Actions */}
        <div className="flex flex-col gap-2">
          {[
            { label: 'Assign', color: '#0891B2' },
            { label: 'Acknowledge', color: '#F59E0B' },
            { label: err.status === 'Resolved' ? 'Reopen' : 'Mark Resolved', color: '#10B981' },
            { label: 'Ignore', color: '#475569' },
          ].map(a => (
            <button key={a.label} className="w-full py-2 rounded-lg text-xs font-semibold" style={{ background: `${a.color}15`, color: a.color, border: `1px solid ${a.color}30` }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ErrorsTab() {
  const [selected, setSelected] = useState<ErrorSignature | null>(null);

  return (
    <div className="flex" style={{ minHeight: 0 }}>
      <div className="flex-1 p-6 overflow-auto" style={{ minWidth: 0 }}>
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Total Errors', value: '6,195', color: '#EF4444' },
            { label: 'Unique Signatures', value: String(ERROR_SIGNATURES.length), color: '#F59E0B' },
            { label: 'New (first seen)', value: '1', color: '#EF4444' },
            { label: 'Affected Users', value: '345', color: '#F97316' },
            { label: 'Error Budget', value: '78%', color: '#F59E0B' },
          ].map(k => (
            <div key={k.label} className="rounded-xl p-3" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, color: k.color, fontWeight: 700 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Error rate chart */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <h3 className="font-bold mb-4" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Error Rate by Severity (24h)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={ERR_DATA}>
              <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'DM Mono, monospace' }} interval={5} />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
              <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="critical" stackId="1" stroke="#EF4444" fill="#EF444420" strokeWidth={1} name="Critical" />
              <Area type="monotone" dataKey="high" stackId="1" stroke="#F97316" fill="#F9731620" strokeWidth={1} name="High" />
              <Area type="monotone" dataKey="medium" stackId="1" stroke="#F59E0B" fill="#F59E0B15" strokeWidth={1} name="Medium" />
              <Area type="monotone" dataKey="low" stackId="1" stroke="#0891B2" fill="#0891B210" strokeWidth={1} name="Low" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>Vertical spike at 13:00 correlates with v2.4.1 deploy + insurance portal incident</div>
        </div>

        {/* Error table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
            <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Error Signatures</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
            <div className="grid px-5 py-2" style={{ gridTemplateColumns: '1fr 100px 80px 80px 80px 100px 80px' }}>
              {['Signature', 'Service', 'Occurrences', 'Users', 'Severity', 'Status', ''].map(h => (
                <span key={h} style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {ERROR_SIGNATURES.map(err => {
              const sevColor = SEV_COLORS[err.severity];
              const statusColor = STATUS_COLORS[err.status];
              return (
                <div key={err.id} onClick={() => setSelected(err)} className="grid items-center px-5 py-3 gap-2 cursor-pointer hover:bg-slate-700/10 transition-colors" style={{ gridTemplateColumns: '1fr 100px 80px 80px 80px 100px 80px', background: selected?.id === err.id ? 'rgba(13,148,136,0.05)' : '' }}>
                  <div className="min-w-0">
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#CBD5E1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{err.signature}</div>
                    <div style={{ fontSize: 9, color: '#475569' }}>{err.id} · first: {err.firstSeen}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{err.service}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#CBD5E1' }}>{err.occurrences.toLocaleString()}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#94A3B8' }}>{err.affectedUsers}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold w-fit" style={{ background: `${sevColor}15`, color: sevColor }}>{err.severity}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold w-fit" style={{ background: `${statusColor}15`, color: statusColor }}>{err.status}</span>
                  <span style={{ fontSize: 10, color: '#0D9488', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setSelected(err); }}>View</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected && <ErrorDetailPanel err={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
