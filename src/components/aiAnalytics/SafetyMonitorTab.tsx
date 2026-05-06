import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ShieldCheck, AlertTriangle, AlertOctagon, FileText, CheckCircle2 } from 'lucide-react';
import { SAFETY_FLAGS_TODAY, ESCALATION_TREND_7D, BIAS_METRICS, AI_SAFETY_TODAY } from '../../data/adminAIData';

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#94A3B8', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => <div key={p.dataKey} style={{ color: '#F1F5F9' }}>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</div>)}
    </div>
  );
}

type FlagFilter = 'all' | 'escalated' | 'resolved' | 'false-positive';

const severityConfig = {
  escalated: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: AlertTriangle, label: 'Escalated' },
  resolved: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', icon: CheckCircle2, label: 'Resolved' },
  'false-positive': { color: '#64748B', bg: 'rgba(100,116,139,0.08)', icon: ShieldCheck, label: 'False Positive' },
};

const escalationSparkData = ESCALATION_TREND_7D.map((v, i) => ({ day: `D${i + 1}`, rate: v }));

export default function SafetyMonitorTab({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('all');

  const filtered = SAFETY_FLAGS_TODAY.filter(f => flagFilter === 'all' || f.severity === flagFilter);
  const counts = { all: SAFETY_FLAGS_TODAY.length, escalated: SAFETY_FLAGS_TODAY.filter(f => f.severity === 'escalated').length, resolved: SAFETY_FLAGS_TODAY.filter(f => f.severity === 'resolved').length, 'false-positive': SAFETY_FLAGS_TODAY.filter(f => f.severity === 'false-positive').length };

  const biasGroups = [
    { category: 'Gender', items: [{ label: 'Male', value: 4.61 }, { label: 'Female', value: 4.59 }] },
    { category: 'Age', items: [{ label: '18–35', value: 4.63 }, { label: '36–55', value: 4.58 }, { label: '55+', value: 4.47 }] },
    { category: 'Nationality', items: [{ label: 'Emirati', value: 4.62 }, { label: 'Expat Arab', value: 4.61 }, { label: 'Expat Other', value: 4.54 }] },
  ];

  const biasChartData = BIAS_METRICS.map(m => ({ ...m, name: m.group }));

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={22} color="#10B981" />
          <div>
            <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Safety & Clinical Governance</div>
            <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>All AI outputs are monitored for clinical safety, DHA compliance, and patient wellbeing.</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#10B981', fontSize: 13, fontWeight: 600 }}>✅ 0 DHA safety events today</div>
          <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>12 flags reviewed · 3 escalated · 9 resolved</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          {
            title: 'AI → Human Escalation Rate', value: '3.1%', color: '#F59E0B', border: '#10B981',
            sub: '277 escalations today', note: 'Target: <5% ✅',
          },
          {
            title: 'Safety Flags Today', value: '12', color: '#F1F5F9', border: '#10B981',
            sub: '3 escalated · 4 sensitive · 89 filtered', note: 'None critical ✅',
          },
          {
            title: 'False Safety Rate', value: '0.02%', color: '#10B981', border: '#10B981',
            sub: '2 false triggers in 8,921 sessions', note: '✅ Well within <0.1%',
          },
          {
            title: 'Symptom Assessment Accuracy', value: '89.4%', color: '#10B981', border: '#10B981',
            sub: 'Validated against doctor diagnosis', note: '↑ +1.2% this month',
          },
        ].map(card => (
          <div key={card.title} style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', borderLeft: `4px solid ${card.border}`, padding: '16px 18px' }}>
            <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{card.title}</div>
            <div style={{ color: card.color, fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>{card.value}</div>
            <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>{card.sub}</div>
            <div style={{ color: '#10B981', fontSize: 11 }}>{card.note}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOctagon size={15} color="#F59E0B" />
            <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Safety Events Log — Today</span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#0F172A', borderRadius: 8, padding: 3 }}>
            {([
              { key: 'all', label: `All (${counts.all})` },
              { key: 'escalated', label: `Escalated (${counts.escalated})` },
              { key: 'resolved', label: `Resolved (${counts.resolved})` },
              { key: 'false-positive', label: `False Pos (${counts['false-positive']})` },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFlagFilter(f.key as FlagFilter)}
                style={{ padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, background: flagFilter === f.key ? '#334155' : 'transparent', color: flagFilter === f.key ? '#F1F5F9' : '#64748B', whiteSpace: 'nowrap' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(flag => {
            const cfg = severityConfig[flag.severity as keyof typeof severityConfig];
            const Icon = cfg.icon;
            return (
              <div key={flag.id} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: cfg.bg, borderRadius: 10, border: `1px solid ${flag.severity === 'escalated' ? 'rgba(245,158,11,0.2)' : '#334155'}` }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Icon size={16} color={cfg.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ color: '#475569', fontSize: 10, fontFamily: "'DM Mono', monospace" }}>{flag.session}</span>
                    <span style={{ background: cfg.color + '20', color: cfg.color, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{cfg.label}</span>
                  </div>
                  <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{flag.title}</div>
                  <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.5, marginBottom: 4 }}>{flag.description}</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: '#475569', fontSize: 10 }}>{flag.time} · {flag.language} · {flag.portal}</span>
                    <span style={{ color: '#10B981', fontSize: 10 }}>✅ {flag.outcome}</span>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <button
                    onClick={() => showToast(`Session ${flag.session} review opened`)}
                    style={{ padding: '5px 10px', background: 'rgba(100,116,139,0.15)', border: '1px solid #334155', borderRadius: 6, color: '#94A3B8', fontSize: 11, cursor: 'pointer' }}
                  >
                    Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid #334155' }}>
          <div style={{ color: '#475569', fontSize: 11 }}>Safety log retained for 90 days per DHA clinical governance requirements.</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => showToast('Safety log exported', 'success')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: 7, color: '#94A3B8', fontSize: 12, cursor: 'pointer' }}>
              <FileText size={12} /> Export Log
            </button>
            <button onClick={() => showToast('DHA AI Safety Report submitted', 'success')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: 7, color: '#0D9488', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <FileText size={12} /> Submit DHA AI Safety Report
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
        <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>AI Bias & Fairness Monitoring</div>
        <div style={{ color: '#475569', fontSize: 12, marginBottom: 16 }}>Ensuring equal AI quality across all demographics</div>

        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={biasChartData} barSize={22}>
            <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[4.3, 4.7]} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<DarkTooltip />} />
            <ReferenceLine y={4.5} stroke="#0D9488" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Target 4.5', fill: '#0D9488', fontSize: 10 }} />
            <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]} animationDuration={800}>
              {biasChartData.map((entry, i) => (
                <Cell key={i} fill={entry.score < 4.5 ? '#D97706' : entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
          <div style={{ color: '#F59E0B', fontSize: 11, marginBottom: 4 }}>⚠️ Patients 55+ score slightly below threshold (4.47)</div>
          <div style={{ color: '#94A3B8', fontSize: 11 }}>Recommendation: Improve AI for elderly Arabic speakers — larger text, simpler language prompts.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
          {[
            { lang: 'Arabic', acc: '91.2%', color: '#0D9488' },
            { lang: 'English', acc: '93.4%', color: '#10B981' },
            { lang: 'Hindi', acc: '87.4%', color: '#F59E0B', note: 'Improvement scheduled' },
          ].map(l => (
            <div key={l.lang} style={{ background: '#0F172A', borderRadius: 9, padding: '11px 14px', border: '1px solid #334155' }}>
              <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>{l.lang} Accuracy</div>
              <div style={{ color: l.color, fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{l.acc}</div>
              {l.note && <div style={{ color: '#64748B', fontSize: 10, marginTop: 4 }}>{l.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
