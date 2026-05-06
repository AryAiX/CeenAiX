import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { patientGrowthData, insuranceDistData, activityByDay, emirateData } from '../../data/adminPatientsData';

const dateRanges = ['This Month', 'Last 3 Months', 'This Year', 'Custom'];

const CustomTooltipDark = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: '#94A3B8', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || '#2DD4BF', fontFamily: 'DM Mono, monospace' }}>
          {p.name}: {p.value?.toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export default function PatientAnalyticsView() {
  const [dateRange, setDateRange] = useState('This Month');

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {dateRanges.map(r => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              fontSize: 12, fontFamily: 'Inter, sans-serif',
              background: dateRange === r ? '#0D9488' : '#1E293B',
              color: dateRange === r ? '#fff' : '#64748B',
              border: `1px solid ${dateRange === r ? '#0D9488' : '#334155'}`,
            }}
          >
            {dateRange === r ? `${r} ●` : r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="col-span-2 rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>
                Patient Registrations — 2026
              </div>
              <div style={{ fontSize: 11, color: '#34D399', marginTop: 2 }}>
                Total: 48,231 · ↑ 12.4% this month
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={patientGrowthData} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipDark />} />
              <Area
                type="monotone" dataKey="patients" name="Registrations"
                stroke="#0D9488" strokeWidth={2.5}
                fill="url(#tealGrad)"
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 16 }}>
            Patients by Insurance
          </div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={insuranceDistData} cx="50%" cy="50%"
                  innerRadius={50} outerRadius={75}
                  dataKey="value" animationDuration={800}
                >
                  {insuranceDistData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#F1F5F9" style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700 }}>
                  48,231
                </text>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col gap-1.5">
              {insuranceDistData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{item.name}</span>
                  </div>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#F1F5F9' }}>
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 16 }}>
            Patient Activity by Day (Last 4 Weeks)
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={activityByDay} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipDark />} />
              <Legend
                iconType="square" iconSize={8}
                wrapperStyle={{ fontSize: 10, color: '#64748B', paddingTop: 8 }}
              />
              <Bar dataKey="logins" name="Logins" fill="rgba(13,148,136,0.75)" radius={[3, 3, 0, 0]} animationDuration={600} />
              <Bar dataKey="ai" name="AI Sessions" fill="rgba(124,58,237,0.55)" radius={[3, 3, 0, 0]} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2 rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 16 }}>
            Patients by Emirates
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={emirateData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="emirate" width={90} tick={{ fontSize: 11, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipDark />} />
              <Bar dataKey="count" name="Patients" fill="#0D9488" radius={[0, 4, 4, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        className="rounded-2xl p-5 flex items-center gap-8"
        style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
      >
        {[
          { label: 'Gender', val: 'Female 52% · Male 48%' },
          { label: 'Average Age', val: '34.7 years' },
          { label: 'Nationality Split', val: 'Emirati 38% · Expat 62%' },
          { label: 'Arabic-language Users', val: '67%' },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#F1F5F9', fontWeight: 600 }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
