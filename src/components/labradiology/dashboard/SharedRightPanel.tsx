import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Upload, Activity, Clock, ClipboardList, ScanLine, FlaskConical, AlertTriangle, Cpu } from 'lucide-react';
import { equipmentItems, tatData, volumeData } from '../../../data/diagnosticsData';

const statusDot = (status: string) => {
  if (status === 'running' || status === 'scanning') return '#8B5CF6';
  if (status === 'online') return '#10B981';
  if (status === 'maintenance') return '#EF4444';
  if (status === 'partial') return '#F59E0B';
  return '#3B82F6';
};

const EquipmentRow: React.FC<{ name: string; status: string; info: string }> = ({ name, status, info }) => {
  const dot = statusDot(status);
  const isRunning = status === 'running' || status === 'scanning';
  return (
    <div className="flex items-center gap-2 py-1.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'animate-pulse' : ''}`} style={{ background: dot }} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-700 truncate" style={{ fontSize: 11 }}>{name}</div>
        <div className="text-slate-400 truncate" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace' }}>{info}</div>
      </div>
    </div>
  );
};

const SharedRightPanel: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

      {/* Equipment Status */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <Cpu style={{ width: 14, height: 14, color: '#64748B' }} />
          <span className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Equipment</span>
        </div>
        <div className="px-4 py-2">
          <div className="flex items-center gap-1.5 mb-2">
            <ScanLine style={{ width: 10, height: 10, color: '#1D4ED8' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace' }}>Radiology</span>
          </div>
          {equipmentItems.radiology.slice(0, 5).map(e => <EquipmentRow key={e.name} {...e} />)}
          <div className="flex items-center gap-1.5 mt-3 mb-2">
            <FlaskConical style={{ width: 10, height: 10, color: '#4F46E5' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace' }}>Laboratory</span>
          </div>
          {equipmentItems.lab.map(e => <EquipmentRow key={e.name} {...e} />)}
        </div>
      </div>

      {/* TAT Monitor */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <Clock style={{ width: 14, height: 14, color: '#64748B' }} />
          <span className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>TAT Monitor</span>
          <span className="ml-auto flex items-center gap-1 text-xs" style={{ fontSize: 9, color: '#EF4444' }}>
            <AlertTriangle style={{ width: 10, height: 10 }} /> MRI 4.8h vs 4h target
          </span>
        </div>
        <div className="px-2 py-2" style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tatData} barSize={12} barGap={2} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="dept" tick={{ fontSize: 8, fill: '#94A3B8', fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 10 }}
                formatter={(v: number) => [`${v}h`, 'TAT']}
              />
              <Bar dataKey="value" fill="#4F46E5" radius={[3, 3, 0, 0]}
                label={false}
                shape={(props: Record<string, unknown>) => {
                  const { x, y, width, height, value, index } = props as { x: number; y: number; width: number; height: number; value: number; index: number };
                  const d = tatData[index as number];
                  const color = d.type === 'lab' ? '#4F46E5' : '#1D4ED8';
                  const warn = value > d.target;
                  return (
                    <rect key={index} x={x} y={y} width={width} height={height} fill={warn ? '#EF4444' : color} rx={2} />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-3 px-4 pb-2">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: '#4F46E5' }} /><span style={{ fontSize: 9, color: '#64748B' }}>Lab</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: '#1D4ED8' }} /><span style={{ fontSize: 9, color: '#64748B' }}>Radiology</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: '#EF4444' }} /><span style={{ fontSize: 9, color: '#64748B' }}>Over target</span></div>
        </div>
      </div>

      {/* NABIDH */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <Upload style={{ width: 14, height: 14, color: '#7C3AED' }} />
          <span className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>NABIDH Status</span>
        </div>
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical style={{ width: 11, height: 11, color: '#4F46E5' }} />
              <span style={{ fontSize: 11, color: '#475569' }}>Lab Results</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 60, background: '#F1F5F9' }}>
                <div className="h-full rounded-full" style={{ width: `${(42 / 47) * 100}%`, background: '#4F46E5' }} />
              </div>
              <span className="font-bold" style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#4F46E5' }}>42/47</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine style={{ width: 11, height: 11, color: '#1D4ED8' }} />
              <span style={{ fontSize: 11, color: '#475569' }}>Radiology Reports</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 60, background: '#F1F5F9' }}>
                <div className="h-full rounded-full" style={{ width: `${(25 / 28) * 100}%`, background: '#1D4ED8' }} />
              </div>
              <span className="font-bold" style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#1D4ED8' }}>25/28</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1.5" style={{ borderTop: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1E293B' }}>Total</span>
            <span className="font-black" style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#7C3AED' }}>67/75</span>
          </div>
          <button className="w-full py-2 rounded-lg font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#7C3AED', fontSize: 12 }}>
            Submit All Pending (8)
          </button>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="flex items-center gap-2">
            <Activity style={{ width: 14, height: 14, color: '#64748B' }} />
            <span className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Volume Today</span>
          </div>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>281 total</span>
        </div>
        <div className="px-2 py-2" style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volumeData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="labGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="radGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 10 }} />
              <Area type="monotone" dataKey="lab" stroke="#4F46E5" strokeWidth={2} fill="url(#labGrad)" name="Lab" />
              <Area type="monotone" dataKey="rad" stroke="#1D4ED8" strokeWidth={2} fill="url(#radGrad)" name="Radiology" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-3 px-4 pb-2">
          <div className="flex items-center gap-1"><span className="w-2 h-0.5 inline-block rounded" style={{ background: '#4F46E5' }} /><span style={{ fontSize: 9, color: '#64748B' }}>Lab 234</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-0.5 inline-block rounded" style={{ background: '#1D4ED8' }} /><span style={{ fontSize: 9, color: '#64748B' }}>Radiology 47</span></div>
        </div>
      </div>

      {/* Shift Handoff */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', borderLeft: '3px solid #F59E0B' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <ClipboardList style={{ width: 14, height: 14, color: '#F59E0B' }} />
          <span className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Shift Handoff</span>
          <span className="ml-auto px-2 py-0.5 rounded-full font-bold animate-pulse" style={{ fontSize: 9, background: 'rgba(245,158,11,0.15)', color: '#B45309' }}>53 min left</span>
        </div>
        <div className="px-4 py-3 space-y-1.5">
          {[
            { label: 'Lab: 1 critical value unnotified', ok: false },
            { label: 'Lab: Siemens BCS XP maintenance note', ok: false },
            { label: 'Radiology: 9 reports pending sign-off', ok: false },
            { label: 'Radiology: MRI TAT exceeded', ok: false },
            { label: 'NABIDH: 8 submissions pending', ok: false },
            { label: 'All STAT samples resulted', ok: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: item.ok ? '#10B981' : '#EF4444' }}>{item.ok ? '✓' : '○'}</span>
              <span style={{ fontSize: 10, color: item.ok ? '#64748B' : '#1E293B' }}>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-3">
          <button className="w-full py-2 rounded-lg font-bold transition-all hover:opacity-90"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#B45309', fontSize: 12, border: '1px solid rgba(245,158,11,0.25)' }}>
            Generate Handoff Report
          </button>
        </div>
      </div>

    </div>
  );
};

export default SharedRightPanel;
