import { useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ChevronUp, MessageSquare, Flame, Shield } from 'lucide-react';
import { PATIENT_TOPICS_TODAY, DOCTOR_AI_USE_CASES } from '../../data/adminAIData';

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#94A3B8', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: '#F1F5F9' }}>{p.value}</div>
      ))}
    </div>
  );
}

type DateFilter = 'today' | 'week' | 'month';
type ConvFilter = 'all' | 'rated' | 'escalated' | 'flagged';

const SAMPLE_CONVERSATIONS = [
  {
    id: 'ANON-20260407-8421',
    language: 'Arabic',
    portal: 'Patient Portal',
    duration: '8.4 min',
    rating: 5,
    outcome: 'Appointment booked',
    outcomeColor: '#10B981',
    severity: 'normal',
    preview: 'My blood pressure reading this morning was 138/88. Should I be worried?',
    aiResponse: 'A reading of 138/88 falls in the Stage 1 Hypertension range (≥130/80 mmHg according to AHA guidelines). While a single elevated reading isn\'t cause for immediate alarm, I\'d recommend monitoring your readings over the next few days and booking an appointment with your doctor for a proper evaluation...',
    followUp: 'Patient booked with Dr. Ahmed Al Rashidi',
  },
  {
    id: 'ANON-20260407-6234',
    language: 'English',
    portal: 'Patient Portal',
    duration: '6.2 min',
    rating: 4,
    outcome: 'Guidance provided',
    outcomeColor: '#0D9488',
    severity: 'normal',
    preview: 'Can I take ibuprofen with my blood pressure medication?',
    aiResponse: 'This is an important safety question. Ibuprofen (and other NSAIDs) can interact with several blood pressure medications including ACE inhibitors, ARBs, and diuretics. The interaction may reduce the effectiveness of your BP medication and, in some cases, affect kidney function...',
    followUp: 'Guidance provided + doctor consultation recommended',
  },
  {
    id: 'ANON-20260407-5182',
    language: 'Arabic',
    portal: 'Patient Portal',
    duration: '4.1 min',
    rating: null,
    outcome: 'Escalated to doctor',
    outcomeColor: '#F59E0B',
    severity: 'escalated',
    preview: 'Patient described chest pain + shortness of breath',
    aiResponse: 'I\'m concerned about the symptoms you\'re describing. Chest pain combined with shortness of breath can indicate several conditions that need immediate medical evaluation. I\'m connecting you with a doctor right now — please do not hang up...',
    followUp: 'Escalated → Dr. Maryam Al Farsi (immediate)',
  },
];

export default function ConversationsTab() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [convFilter, setConvFilter] = useState<ConvFilter>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const topicsData = PATIENT_TOPICS_TODAY.map(t => ({ ...t, name: t.topic }));

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>What are patients asking CeenAiX AI?</div>
          <div style={{ color: '#475569', fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>Anonymized conversation intelligence · No personal data</div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#0F172A', borderRadius: 8, padding: 3 }}>
          {(['today', 'week', 'month'] as DateFilter[]).map(f => (
            <button key={f} onClick={() => setDateFilter(f)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: dateFilter === f ? '#1E293B' : 'transparent', color: dateFilter === f ? '#F1F5F9' : '#64748B', textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <MessageSquare size={15} color="#7C3AED" />
            <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Patient AI — Top Topics Today</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topicsData} layout="vertical" barSize={16}>
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="topic" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} width={160} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="sessions" name="Sessions" fill="#7C3AED" fillOpacity={0.8} radius={[0, 4, 4, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '9px 12px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={13} color="#F59E0B" />
            <span style={{ color: '#F59E0B', fontSize: 11 }}>Trending today: Blood pressure queries +34% vs same time last week</span>
          </div>
        </div>

        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Doctor AI — Use Cases Today</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PieChart width={160} height={160}>
              <Pie data={DOCTOR_AI_USE_CASES} dataKey="pct" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={2}>
                {DOCTOR_AI_USE_CASES.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
            </PieChart>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {DOCTOR_AI_USE_CASES.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span style={{ color: '#94A3B8', fontSize: 11 }}>{d.name}</span>
                </div>
                <span style={{ color: '#F1F5F9', fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
        <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Conversation Quality Analysis</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Avg Session Length', value: '8.4 min', sub: 'Patient · 3.1 min Doctor · 1.8 min Insurance', color: '#7C3AED' },
            { label: 'Questions Per Session', value: '7.3 avg', sub: 'Range: 1–34 questions', color: '#0D9488' },
            { label: 'Resolution Rate', value: '87.4%', sub: '↑ +2.1% vs last week', color: '#10B981' },
            { label: 'Escalation Rate', value: '3.1%', sub: '277 escalations today', color: '#F59E0B' },
          ].map(m => (
            <div key={m.label} style={{ background: '#0F172A', borderRadius: 10, padding: '14px 16px', border: '1px solid #334155' }}>
              <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>{m.label}</div>
              <div style={{ color: m.color, fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{m.value}</div>
              <div style={{ color: '#475569', fontSize: 11 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Sample AI Conversations (Anonymized)</div>
            <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>Review actual AI conversations to ensure quality</div>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#0F172A', borderRadius: 8, padding: 3 }}>
            {(['all', 'rated', 'escalated', 'flagged'] as ConvFilter[]).map(f => (
              <button key={f} onClick={() => setConvFilter(f)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, background: convFilter === f ? '#334155' : 'transparent', color: convFilter === f ? '#F1F5F9' : '#64748B', textTransform: 'capitalize' }}>{f === 'rated' ? '★ High rated' : f}</button>
            ))}
          </div>
        </div>

        <div style={{ background: 'rgba(30,64,175,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 9, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Shield size={13} color="#60A5FA" />
            <span style={{ color: '#93C5FD', fontSize: 11 }}>All patient identifiers removed. Emirates ID, names, and contact details are never stored in AI logs. Conversations retained for 30 days, then permanently deleted per UAE PDPL.</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SAMPLE_CONVERSATIONS.filter(c => {
            if (convFilter === 'all') return true;
            if (convFilter === 'rated') return c.rating === 5;
            if (convFilter === 'escalated') return c.severity === 'escalated';
            if (convFilter === 'flagged') return c.severity === 'escalated';
            return true;
          }).map(conv => {
            const isExp = expanded.has(conv.id);
            return (
              <div
                key={conv.id}
                style={{
                  background: conv.severity === 'escalated' ? 'rgba(245,158,11,0.04)' : '#0F172A',
                  borderRadius: 10,
                  border: `1px solid ${conv.severity === 'escalated' ? 'rgba(245,158,11,0.25)' : '#334155'}`,
                  borderLeft: `4px solid ${conv.severity === 'escalated' ? '#F59E0B' : '#334155'}`,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  onClick={() => toggle(conv.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#475569', fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Session: {conv.id}</span>
                      <span style={{ color: '#475569', fontSize: 10 }}>· {conv.language} · {conv.portal} · {conv.duration}</span>
                      {conv.rating && <span style={{ color: '#F59E0B', fontSize: 10 }}>{'★'.repeat(conv.rating)}</span>}
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: 12 }}>"{conv.preview}"</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ background: conv.outcomeColor + '20', color: conv.outcomeColor, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5 }}>{conv.outcome}</span>
                    {isExp ? <ChevronUp size={14} color="#64748B" /> : <ChevronDown size={14} color="#64748B" />}
                  </div>
                </div>

                {isExp && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid #334155' }}>
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ maxWidth: '70%', background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ color: '#64748B', fontSize: 10, marginBottom: 4 }}>[Anonymous Patient]</div>
                          <div style={{ color: '#5EEAD4', fontSize: 12, lineHeight: 1.6 }}>"{conv.preview}"</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{ maxWidth: '75%', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ color: '#7C3AED', fontSize: 10, marginBottom: 4 }}>[CeenAiX AI]</div>
                          <div style={{ color: '#C4B5FD', fontSize: 12, lineHeight: 1.6 }}>{conv.aiResponse}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ color: '#475569', fontSize: 11 }}>Outcome: {conv.followUp}</span>
                      <span style={{ color: '#10B981', fontSize: 11 }}>AI disclaimer shown: ✅</span>
                      <span style={{ color: '#10B981', fontSize: 11 }}>Reviewed for safety: ✅</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button style={{ marginTop: 12, color: '#7C3AED', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Load 10 more samples →
        </button>
      </div>
    </div>
  );
}
