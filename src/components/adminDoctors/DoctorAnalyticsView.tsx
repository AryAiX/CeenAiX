import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend
} from 'recharts';
import {
  doctorGrowthData, specialtyDistData, licenseExpiryDistData,
  consultationVolumeData
} from '../../data/adminDoctorsData';

const RANGES = ['Last 30 days', 'Last 90 days', 'This Year', 'All Time'];

const CustomTooltipDark = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string; color?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: '#0F172A', border: '1px solid #334155', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
      {label && <div style={{ color: '#64748B', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          {p.color && <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />}
          <span style={{ color: '#CBD5E1' }}>{p.name ? `${p.name}: ` : ''}{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function DoctorAnalyticsView() {
  const [range, setRange] = useState('This Year');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Doctors Analytics</h2>
          <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Platform-wide doctor metrics and license intelligence</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#1E293B', border: '1px solid #334155' }}>
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded-lg transition-colors"
              style={{
                fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                background: range === r ? '#0D9488' : 'transparent',
                color: range === r ? '#fff' : '#64748B',
                border: 'none',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>Doctor Growth</div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>Verified vs Rejected applications</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={doctorGrowthData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barGap={4}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipDark />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }} iconSize={8} iconType="circle" />
              <Bar dataKey="verified" name="Verified" fill="#0D9488" radius={[3, 3, 0, 0]} />
              <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>Specialty Distribution</div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>847 verified doctors by specialty</div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={specialtyDistData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" strokeWidth={0}>
                  {specialtyDistData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltipDark />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {specialtyDistData.map(d => (
                <div key={d.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>Top Consultations This Month</div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>By consultation volume</div>
          <div className="flex flex-col gap-3">
            {consultationVolumeData.map((d, i) => (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{d.name.replace('Dr. ', '')}</span>
                  <span style={{ fontSize: 12, color: d.color, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{d.value}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#334155' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(d.value / consultationVolumeData[0].value) * 100}%`, background: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>License Expiry Distribution</div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>847 licenses by expiry window</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={licenseExpiryDistData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="range" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltipDark />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Doctors">
                {licenseExpiryDistData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-5">
        {[
          { label: 'Avg Consultations / Doctor', value: '43', sub: 'per month', color: '#2DD4BF' },
          { label: 'Avg Rating', value: '4.6 ★', sub: 'across 847 doctors', color: '#F59E0B' },
          { label: 'Platform Fee Revenue', value: 'AED 39.9K', sub: 'this month', color: '#60A5FA' },
          { label: 'Renewal Response Rate', value: '67%', sub: 'doctors responded', color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
