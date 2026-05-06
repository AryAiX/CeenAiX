import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { revenueData, autoApprovalTrendData, slaComplianceData, adminInsurers } from '../../data/adminInsuranceData';

const INSURER_COLORS: Record<string, string> = {
  daman: '#2563EB', axa: '#DC2626', adnic: '#0EA5E9',
  thiqa: '#10B981', oman: '#94A3B8', orient: '#D97706', gig: '#6366F1',
};

function CustomTooltipDark({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: '#94A3B8', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <span style={{ color: '#F1F5F9', fontWeight: 600 }}>
            {typeof p.value === 'number' && p.value > 10000
              ? `AED ${(p.value / 1000).toFixed(0)}K`
              : typeof p.value === 'number' && p.value < 200
              ? `${p.value}%`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

type Range = '3m' | '6m' | '12m';

export default function InsuranceAnalyticsView() {
  const [range, setRange] = useState<Range>('3m');

  const membersByInsurer = adminInsurers.map(ins => ({
    name: ins.name.split(' ')[0],
    value: ins.membersTotal,
    color: INSURER_COLORS[ins.id] || '#64748B',
  }));
  const totalMembers = membersByInsurer.reduce((s, m) => s + m.value, 0);

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Analytics Dashboard
          </div>
          <div style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Trends and performance metrics across all insurance partners</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={14} color="#64748B" />
          <div style={{ display: 'flex', gap: 4, background: '#0F172A', borderRadius: 8, padding: 3 }}>
            {(['3m', '6m', '12m'] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: range === r ? '#1E293B' : 'transparent', color: range === r ? '#F1F5F9' : '#64748B' }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Platform Revenue</div>
            <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>Monthly revenue by insurer (AED)</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                {Object.entries(INSURER_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`rev-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}K`} />
              <Tooltip content={<CustomTooltipDark />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              {Object.keys(INSURER_COLORS).map(key => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  stroke={INSURER_COLORS[key]}
                  strokeWidth={1.5}
                  fill={`url(#rev-${key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Members by Insurer</div>
            <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>Total: {totalMembers.toLocaleString()} members</div>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={membersByInsurer}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {membersByInsurer.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipDark />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {membersByInsurer.map(m => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: m.color, flexShrink: 0 }} />
                    <span style={{ color: '#94A3B8', fontSize: 12 }}>{m.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: '#F1F5F9', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{m.value.toLocaleString()}</span>
                    <span style={{ color: '#475569', fontSize: 11, width: 32, textAlign: 'right' }}>{((m.value / totalMembers) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={15} color="#0D9488" />
              <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Auto-Approval Rate Trend</span>
            </div>
            <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Monthly improvement across all insurers (%)</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={autoApprovalTrendData}>
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} domain={[70, 96]} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltipDark />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              {Object.keys(INSURER_COLORS).map(key => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  stroke={INSURER_COLORS[key]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>SLA Compliance</div>
            <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>Per-insurer SLA compliance rate (%)</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={slaComplianceData} layout="vertical" barSize={20}>
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} domain={[98, 100]} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="insurer" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<CustomTooltipDark />} />
              <Bar dataKey="compliance" name="SLA %" radius={[0, 6, 6, 0]}>
                {slaComplianceData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '10px 14px', background: '#0F172A', borderRadius: 8 }}>
            <span style={{ color: '#64748B', fontSize: 12 }}>Platform Average</span>
            <span style={{ color: '#10B981', fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>99.96%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
