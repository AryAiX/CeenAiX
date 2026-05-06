import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  adminInsurers, insuranceClaimsBreakdown, claimsTrendWeekly,
  monthlyStackedClaims,
} from '../../data/adminInsuranceData';

type DateFilter = 'today' | 'week' | 'month' | 'custom';

const INSURER_COLORS: Record<string, string> = {
  daman: '#2563EB',
  axa: '#DC2626',
  adnic: '#0EA5E9',
  thiqa: '#10B981',
  oman: '#64748B',
  orient: '#D97706',
  gig: '#6366F1',
};

function fmt(n: number) {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
}

function CustomTooltipDark({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: '#94A3B8', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{p.dataKey === 'claims' ? p.value.toLocaleString() : fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function InsuranceClaimsTab() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const multiplier = dateFilter === 'today' ? 1 : dateFilter === 'week' ? 6.8 : dateFilter === 'month' ? 28.4 : 1;

  const totalClaims = Math.round(1032 * multiplier);
  const totalValue = Math.round(3854840 * multiplier);
  const autoApproved = Math.round(totalClaims * 0.806);
  const pending = Math.round(totalClaims * 0.121);
  const denied = Math.round(totalClaims * 0.073);

  const dateFilters: { key: DateFilter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Claims Overview
          </div>
          <div style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Platform-wide claims activity across all insurance partners</div>
        </div>
        <div style={{ display: 'flex', gap: 6, background: '#0F172A', borderRadius: 10, padding: 4 }}>
          {dateFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                background: dateFilter === f.key ? '#1E293B' : 'transparent',
                color: dateFilter === f.key ? '#F1F5F9' : '#64748B',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Claims', value: totalClaims.toLocaleString(), sub: 'all insurers', color: '#0D9488' },
          { label: 'Total Value', value: fmt(totalValue), sub: 'billed amount', color: '#2563EB' },
          { label: 'Auto-Approved', value: autoApproved.toLocaleString(), sub: `${((autoApproved / totalClaims) * 100).toFixed(1)}% rate`, color: '#10B981' },
          { label: 'Pending Review', value: pending.toLocaleString(), sub: `${((pending / totalClaims) * 100).toFixed(1)}% of total`, color: '#F59E0B' },
          { label: 'Denied', value: denied.toLocaleString(), sub: `${((denied / totalClaims) * 100).toFixed(1)}% denial rate`, color: '#EF4444' },
        ].map(card => (
          <div key={card.label} style={{ background: '#1E293B', borderRadius: 12, padding: '16px 18px', border: '1px solid #334155' }}>
            <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{card.value}</div>
            <div style={{ color: '#475569', fontSize: 12 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Claims by Insurer</div>
          <div style={{ color: '#475569', fontSize: 12 }}>Sorted by volume</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0F172A' }}>
                {['Insurer', 'Claims', 'Value', 'Auto-Approved', 'Pending', 'Denied', 'Avg. Processing', 'SLA'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#475569', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adminInsurers.map((ins, i) => {
                const claims = Math.round(ins.claimsToday * multiplier);
                const value = Math.round(ins.claimsValueToday * multiplier);
                const auto = Math.round(claims * (ins.autoApprovalRate / 100));
                const pend = Math.round(claims * 0.121);
                const den = Math.round(claims * (ins.denialRate / 100));
                const slaOk = ins.slaStatus === 'compliant';
                return (
                  <tr key={ins.id} style={{ borderBottom: '1px solid #1E293B', background: i % 2 === 0 ? 'transparent' : '#0F172A08' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: INSURER_COLORS[ins.id] || '#64748B', flexShrink: 0 }} />
                        <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 500 }}>{ins.name.split(' ')[0]}</span>
                        {ins.tier === 'premium' && (
                          <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>PREMIUM</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#F1F5F9', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{claims.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{fmt(value)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#10B981', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{auto.toLocaleString()}</span>
                        <span style={{ color: '#475569', fontSize: 11 }}>{ins.autoApprovalRate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#F59E0B', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{pend.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: '#EF4444', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{den.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{ins.avgProcessingHours}h</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: slaOk ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: slaOk ? '#10B981' : '#EF4444',
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
                      }}>
                        {slaOk ? 'Compliant' : 'Breach'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: '#0D9488' + '15', borderTop: '2px solid #0D9488' + '40' }}>
                <td style={{ padding: '12px 16px', color: '#0D9488', fontSize: 13, fontWeight: 700 }}>PLATFORM TOTAL</td>
                <td style={{ padding: '12px 16px', color: '#0D9488', fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{totalClaims.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: '#0D9488', fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmt(totalValue)}</td>
                <td style={{ padding: '12px 16px', color: '#0D9488', fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{autoApproved.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: '#0D9488', fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{pending.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: '#0D9488', fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{denied.toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Claims Composition</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={insuranceClaimsBreakdown}
                dataKey="value"
                nameKey="type"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {insuranceClaimsBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltipDark />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {insuranceClaimsBreakdown.map(e => (
              <div key={e.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                  <span style={{ color: '#94A3B8', fontSize: 12 }}>{e.type}</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: '#F1F5F9', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{Math.round(e.value * multiplier).toLocaleString()}</span>
                  <span style={{ color: '#475569', fontSize: 11, width: 28, textAlign: 'right' }}>{e.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Weekly Claims Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={claimsTrendWeekly}>
              <defs>
                <linearGradient id="claimsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipDark />} />
              <Area type="monotone" dataKey="claims" name="Claims" stroke="#0D9488" strokeWidth={2} fill="url(#claimsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
        <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Monthly Claims Value by Insurer</div>
        <div style={{ color: '#475569', fontSize: 12, marginBottom: 16 }}>Jan – Apr 2026 (stacked, AED)</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyStackedClaims} barSize={42}>
            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
            <Tooltip content={<CustomTooltipDark />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
            {Object.keys(INSURER_COLORS).map(key => (
              <Bar key={key} dataKey={key} name={key.charAt(0).toUpperCase() + key.slice(1)} stackId="a" fill={INSURER_COLORS[key]} radius={key === 'gig' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
