import React, { useState } from 'react';
import { CircleDollarSign } from 'lucide-react';

const nav = (href: string) => {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { revenueData } from '../../data/superAdminData';

const tabs = ['Daily', 'Weekly', 'Monthly'] as const;
type Tab = typeof tabs[number];

const darkTooltipStyle = {
  backgroundColor: '#0F172A',
  border: '1px solid rgba(51,65,85,0.8)',
  borderRadius: 8,
  fontSize: 11,
  color: '#CBD5E1',
};

const breakdowns = [
  { label: 'Total Revenue', value: 'AED 847K', color: '#2DD4BF', sub: '+22.4% vs last month' },
  { label: 'AI Services', value: 'AED 287K', color: '#C4B5FD', sub: '33.9% of total' },
  { label: 'Consultations', value: 'AED 394K', color: '#60A5FA', sub: '46.5% of total' },
  { label: 'Lab / Imaging', value: 'AED 166K', color: '#34D399', sub: '19.6% of total' },
];

const RevenueChart: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Daily');

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col w-full h-full cursor-pointer"
      style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
      onClick={() => nav('/admin/revenue')}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}
      >
        <div className="flex items-center gap-2">
          <CircleDollarSign style={{ width: 16, height: 16, color: '#34D399' }} />
          <div>
            <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
              Platform Revenue
            </div>
            <div style={{ fontSize: 10, color: '#64748B' }}>April 2026 · AED 2.5M target</div>
          </div>
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(51,65,85,0.8)' }} onClick={e => e.stopPropagation()}>
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={e => { e.stopPropagation(); setActiveTab(t); }}
              className="px-2.5 py-1 text-xs transition-colors"
              style={{
                background: activeTab === t ? '#0D9488' : 'rgba(30,41,59,0.5)',
                color: activeTab === t ? '#fff' : '#94A3B8',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-2">
        <div className="grid grid-cols-4 gap-3 mb-4">
          {breakdowns.map(b => (
            <div
              key={b.label}
              className="rounded-xl px-3 py-2 transition-all duration-150"
              style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${b.color}44`; e.currentTarget.style.background = 'rgba(30,41,59,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.4)'; e.currentTarget.style.background = 'rgba(15,23,42,0.5)'; }}
            >
              <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: 2 }}>
                {b.label}
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: b.color, lineHeight: 1.2 }}>
                {b.value}
              </div>
              <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{b.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C4B5FD" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#C4B5FD" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="consultGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#475569', fontSize: 9, fontFamily: 'DM Mono, monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={darkTooltipStyle}
                formatter={(value: number) => [`AED ${(value / 1000).toFixed(1)}K`, '']}
                cursor={{ stroke: 'rgba(51,65,85,0.5)', strokeWidth: 1 }}
              />
              <ReferenceLine
                y={357142}
                stroke="rgba(253,224,71,0.3)"
                strokeDasharray="4 4"
                label={{ value: 'Daily target', fill: '#64748B', fontSize: 9, position: 'right' }}
              />
              <Area type="monotone" dataKey="total" stroke="#2DD4BF" strokeWidth={2} fill="url(#totalGrad)" dot={false} />
              <Area type="monotone" dataKey="consultation" stroke="#60A5FA" strokeWidth={1.5} fill="url(#consultGrad)" dot={false} />
              <Area type="monotone" dataKey="ai" stroke="#C4B5FD" strokeWidth={1.5} fill="url(#aiGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center gap-4 px-5 py-2.5" style={{ borderTop: '1px solid rgba(51,65,85,0.5)' }}>
        {[
          { color: '#2DD4BF', label: 'Total' },
          { color: '#60A5FA', label: 'Consultations' },
          { color: '#C4B5FD', label: 'AI Services' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 rounded-full" style={{ background: l.color }} />
            <span style={{ fontSize: 10, color: '#64748B' }}>{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-6 h-0.5 rounded-full" style={{ background: 'rgba(253,224,71,0.4)', borderTop: '1px dashed rgba(253,224,71,0.4)' }} />
          <span style={{ fontSize: 10, color: '#64748B' }}>Daily target</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
