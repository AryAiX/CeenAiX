import React from 'react';
import { Bot } from 'lucide-react';

const nav = (href: string) => {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { aiBarData } from '../../data/superAdminData';

const langData = [
  { lang: 'Arabic', pct: 62, color: '#2DD4BF' },
  { lang: 'English', pct: 34, color: '#60A5FA' },
  { lang: 'Other', pct: 4, color: '#475569' },
];

const topicsData = [
  { topic: 'Symptom assessment', pct: 34 },
  { topic: 'Medication query', pct: 22 },
  { topic: 'Appointment booking', pct: 19 },
  { topic: 'Lab result interpretation', pct: 15 },
  { topic: 'Other', pct: 10 },
];

const topicColors = ['#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#475569'];

const darkTooltipStyle = {
  backgroundColor: '#0F172A',
  border: '1px solid rgba(51,65,85,0.8)',
  borderRadius: 8,
  fontSize: 11,
  color: '#CBD5E1',
};

const AIMetricsPanel: React.FC = () => (
  <div
    className="rounded-2xl overflow-hidden cursor-pointer"
    style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
    onClick={() => nav('/admin/ai')}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(196,181,253,0.3)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; }}
  >
    {/* Header */}
    <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
          <Bot style={{ width: 16, height: 16, color: '#C4B5FD' }} />
        </div>
        <div>
          <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
            AI Platform Analytics
          </div>
          <div style={{ fontSize: 10, color: '#A78BFA' }}>Powered by Claude Sonnet · CeenAiX AI</div>
        </div>
      </div>
      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(51,65,85,0.8)' }} onClick={e => e.stopPropagation()}>
        {['Today', 'Week', 'Month'].map((t, i) => (
          <button key={t} className="px-2.5 py-1 text-xs transition-colors" style={{ background: i === 0 ? '#7C3AED' : 'rgba(30,41,59,0.5)', color: i === 0 ? '#fff' : '#94A3B8' }}>
            {t}
          </button>
        ))}
      </div>
    </div>

    {/* Horizontal body — 4 sections */}
    <div className="grid grid-cols-4 divide-x" style={{ divideColor: 'rgba(51,65,85,0.5)' }}>

      {/* Section 1 — big number + mini stats */}
      <div className="px-5 py-4 flex flex-col justify-between" style={{ borderRight: '1px solid rgba(51,65,85,0.5)' }}>
        <div>
          <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace', marginBottom: 4 }}>
            AI CONSULTATIONS
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 30, fontWeight: 700, color: '#C4B5FD', lineHeight: 1 }}>8,921</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#94A3B8', marginTop: 2 }}>127,450 this month</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>1,247,891 all time</div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
          {[
            { label: 'Avg response', value: '2.3s', color: '#34D399' },
            { label: 'Satisfaction', value: '4.6 / 5', color: '#FCD34D' },
            { label: 'Booking conv.', value: '34.7%', color: '#2DD4BF' },
            { label: 'Escalation', value: '0.03%', color: '#34D399' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>{m.label}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 — bar chart */}
      <div className="px-5 py-4 flex flex-col" style={{ borderRight: '1px solid rgba(51,65,85,0.5)' }}>
        <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace', marginBottom: 8 }}>
          SESSIONS PER DAY
        </div>
        <div className="flex-1" style={{ minHeight: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aiBarData} margin={{ top: 4, right: 0, left: -32, bottom: 0 }} barSize={14}>
              <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={darkTooltipStyle} cursor={{ fill: 'rgba(51,65,85,0.3)' }} />
              <Bar dataKey="sessions" radius={[3, 3, 0, 0]} animationDuration={600}>
                {aiBarData.map((_, i) => (
                  <Cell key={i} fill={i === aiBarData.length - 1 ? '#C4B5FD' : 'rgba(124,58,237,0.5)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 3 — language breakdown */}
      <div className="px-5 py-4" style={{ borderRight: '1px solid rgba(51,65,85,0.5)' }}>
        <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace', marginBottom: 10 }}>
          AI USAGE BY LANGUAGE
        </div>
        <div className="flex flex-col gap-3">
          {langData.map(l => (
            <div key={l.lang}>
              <div className="flex justify-between mb-1.5">
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{l.lang}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: l.color }}>{l.pct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(51,65,85,0.8)' }}>
                <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${l.pct}%`, background: l.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4 — top topics + safety */}
      <div className="px-5 py-4">
        <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace', marginBottom: 10 }}>
          TOP AI TOPICS TODAY
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {topicsData.map((t, i) => (
            <div key={t.topic} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: topicColors[i] }} />
              <span style={{ fontSize: 11, color: '#94A3B8', flex: 1 }} className="truncate">{t.topic}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: topicColors[i], flexShrink: 0 }}>{t.pct}%</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>12 safety flags today · All reviewed</div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>3 escalated to human doctor (protocol)</div>
        </div>
      </div>

    </div>
  </div>
);

export default AIMetricsPanel;
