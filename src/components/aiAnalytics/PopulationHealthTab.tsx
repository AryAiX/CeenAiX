import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { Heart, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { POPULATION_CONDITIONS, AGE_GENDER_DATA, CONDITION_TRENDS } from '../../data/adminAIData';

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: '#94A3B8', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color || '#F1F5F9', marginBottom: 2 }}>
          {p.name}: <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{typeof p.value === 'number' && p.value > 100 ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

const EMIRATE_DATA = [
  { name: 'Dubai', prevalence: 34.7, patients: 12847, color: '#D97706', x: 300, y: 160 },
  { name: 'Abu Dhabi', prevalence: 32.1, patients: 9241, color: '#F59E0B', x: 140, y: 220 },
  { name: 'Sharjah', prevalence: 28.4, patients: 4821, color: '#0D9488', x: 340, y: 120 },
  { name: 'Ajman', prevalence: 26.7, patients: 2341, color: '#14B8A6', x: 360, y: 100 },
  { name: 'RAK', prevalence: 24.2, patients: 1284, color: '#2DD4BF', x: 380, y: 60 },
  { name: 'Fujairah', prevalence: 21.8, patients: 891, color: '#5EEAD4', x: 420, y: 130 },
  { name: 'UAQ', prevalence: 19.4, patients: 421, color: '#99F6E4', x: 370, y: 80 },
];

function UAEMap({ showToast }: { showToast: (msg: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const hov = EMIRATE_DATA.find(e => e.name === hovered);

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox="0 0 560 320" style={{ width: '100%', maxWidth: 560, height: 'auto', display: 'block', margin: '0 auto' }}>
        <rect width="560" height="320" rx="12" fill="#1a2744" />
        <text x="280" y="290" fill="#334155" fontSize="11" textAnchor="middle">Arabian Gulf</text>
        <path d="M 80 200 L 120 180 L 160 195 L 200 185 L 250 200 L 300 175 L 350 170 L 390 155 L 420 140 L 440 160 L 450 200 L 440 240 L 420 260 L 380 265 L 340 255 L 300 250 L 260 255 L 220 250 L 180 240 L 140 245 L 110 240 L 80 220 Z"
          fill="#1E3A5F" stroke="#334155" strokeWidth="1.5" />
        <path d="M 60 160 L 80 200 L 80 220 L 60 230 L 40 220 L 30 200 L 40 175 Z"
          fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <path d="M 440 160 L 460 140 L 480 120 L 500 110 L 520 130 L 520 180 L 500 200 L 480 210 L 460 200 L 450 200 Z"
          fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <path d="M 240 200 L 250 200 L 260 195 L 300 175 L 340 170 L 340 255 L 300 250 L 260 255 L 240 250 Z"
          fill="#283650" stroke="#334155" strokeWidth="0.5" />

        {EMIRATE_DATA.map(em => {
          const isHov = hovered === em.name;
          const r = Math.max(14, em.prevalence * 0.9);
          return (
            <g key={em.name}>
              <circle
                cx={em.x} cy={em.y}
                r={r}
                fill={em.color}
                fillOpacity={isHov ? 0.9 : 0.65}
                stroke={em.color}
                strokeWidth={isHov ? 2 : 1}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={() => setHovered(em.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => showToast(`${em.name}: ${em.prevalence}% hypertension · ${em.patients.toLocaleString()} patients`)}
              />
              {isHov && (
                <circle cx={em.x} cy={em.y} r={r + 6} fill="none" stroke={em.color} strokeWidth={1} strokeOpacity={0.4}>
                  <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              <text x={em.x} y={em.y + 4} fill="white" fontSize="9" textAnchor="middle" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                {em.prevalence}%
              </text>
              <text x={em.x} y={em.y + r + 12} fill="#94A3B8" fontSize="9" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                {em.name}
              </text>
            </g>
          );
        })}

        {hov && (
          <g>
            <rect x={hov.x > 300 ? hov.x - 160 : hov.x + 10} y={hov.y - 50} width={150} height={70} rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
            <text x={hov.x > 300 ? hov.x - 85 : hov.x + 85} y={hov.y - 30} fill="#F1F5F9" fontSize="11" textAnchor="middle" fontWeight="bold">{hov.name}</text>
            <text x={hov.x > 300 ? hov.x - 85 : hov.x + 85} y={hov.y - 14} fill={hov.color} fontSize="10" textAnchor="middle">{hov.prevalence}% hypertension</text>
            <text x={hov.x > 300 ? hov.x - 85 : hov.x + 85} y={hov.y + 2} fill="#64748B" fontSize="10" textAnchor="middle">{hov.patients.toLocaleString()} patients</text>
          </g>
        )}
      </svg>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8 }}>
        <span style={{ color: '#475569', fontSize: 11 }}>Low (0–20%)</span>
        <div style={{ width: 120, height: 8, borderRadius: 4, background: 'linear-gradient(to right, #99F6E4, #0D9488, #F59E0B, #D97706)' }} />
        <span style={{ color: '#475569', fontSize: 11 }}>High (35%+)</span>
      </div>
    </div>
  );
}

export default function PopulationHealthTab({ showToast }: { showToast: (msg: string) => void }) {
  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Heart size={22} color="#0D9488" />
          <div>
            <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Population Health Intelligence — UAE</div>
            <div style={{ color: '#475569', fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>Derived from AI-analyzed clinical data across 48,231 CeenAiX patients · All data anonymized</div>
          </div>
        </div>
        <button
          onClick={() => showToast('DHA Population Health Report generated', 'success')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: 9, color: '#0D9488', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <FileText size={15} />
          Generate DHA Report
        </button>
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 16 }}>Condition Prevalence by Emirate</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ color: '#64748B', fontSize: 12 }}>Viewing:</span>
            <div style={{ background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: 7, padding: '5px 12px', color: '#0D9488', fontSize: 13, fontWeight: 600 }}>Hypertension</div>
          </div>
        </div>
        <UAEMap showToast={(msg) => showToast(msg)} />
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={15} color="#0D9488" />
          <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Top 10 Conditions — Platform-wide</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0F172A' }}>
                {['Rank', 'Condition', 'ICD-10', 'Patients', 'Prevalence', 'Trend', 'DHA Reportable'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#475569', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POPULATION_CONDITIONS.map((c, i) => (
                <tr key={c.rank} style={{ borderBottom: '1px solid #1E293B', background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)' }}>
                  <td style={{ padding: '11px 16px', color: '#475569', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{c.rank}</td>
                  <td style={{ padding: '11px 16px', color: '#F1F5F9', fontSize: 13, fontWeight: 500 }}>{c.condition}</td>
                  <td style={{ padding: '11px 16px', color: '#7C3AED', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{c.icd}</td>
                  <td style={{ padding: '11px 16px', color: '#F1F5F9', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{c.patients.toLocaleString()}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ color: c.prevalence > 25 ? '#F59E0B' : '#0D9488', fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{c.prevalence}%</span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {c.trend === 'up' ? <TrendingUp size={13} color="#EF4444" /> : c.trend === 'stable' ? <Minus size={13} color="#64748B" /> : <TrendingDown size={13} color="#F59E0B" />}
                      <span style={{ color: c.trend === 'up' ? '#EF4444' : c.trend === 'stable' ? '#64748B' : '#F59E0B', fontSize: 11 }}>
                        {c.trend === 'up' ? `+${c.delta}%` : c.trend === 'stable' ? 'stable' : 'seasonal'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {c.dhaReportable ? (
                      <span style={{ background: 'rgba(13,148,136,0.12)', color: '#0D9488', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>✅ DHA Reportable</span>
                    ) : <span style={{ color: '#334155', fontSize: 12 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: 'rgba(245,158,11,0.06)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)', padding: '16px 18px' }}>
        <div style={{ color: '#64748B', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>DHA Notifiable Diseases Status</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {[
            { label: 'Tuberculosis (A15–A19)', value: '0 cases this month' },
            { label: 'Dengue fever (A90)', value: '289 cases — reported' },
            { label: 'Typhoid (A01)', value: '3 cases — reported' },
            { label: 'Hepatitis A (B15)', value: '7 cases — reported' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>{item.label}</span>
              <span style={{ color: '#10B981', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>✅ {item.value}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#10B981', fontSize: 12, fontWeight: 600 }}>✅ All reportable diseases submitted on time</span>
          <button onClick={() => showToast('DHA submission log opened')} style={{ color: '#0D9488', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>View DHA Submission Log</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Hypertension Patients by Age & Gender</div>
          <div style={{ color: '#475569', fontSize: 12, marginBottom: 14 }}>Age pyramid view</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={AGE_GENDER_DATA} layout="vertical" barSize={12} barGap={2}>
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => Math.abs(v).toString()} />
              <YAxis type="category" dataKey="group" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Bar dataKey="male" name="Male" fill="#1D4ED8" radius={[0, 4, 4, 0]} animationDuration={800} />
              <Bar dataKey="female" name="Female" fill="#DB2777" radius={[0, 4, 4, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>
            <span style={{ color: '#F59E0B', fontSize: 11 }}>Highest prevalence: Males 46–55 (peak)</span>
          </div>
        </div>

        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Condition Incidence Trends — 2026</div>
          <div style={{ color: '#475569', fontSize: 12, marginBottom: 14 }}>Sep 2025 – Apr 2026</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={CONDITION_TRENDS}>
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#94A3B8' }} />
              <Line type="monotone" dataKey="hypertension" name="Hypertension" stroke="#F59E0B" strokeWidth={2} dot={false} animationDuration={800} />
              <Line type="monotone" dataKey="diabetes" name="Diabetes" stroke="#EF4444" strokeWidth={2} dot={false} animationDuration={800} />
              <Line type="monotone" dataKey="obesity" name="Obesity" stroke="#FB923C" strokeWidth={2} dot={false} animationDuration={800} />
              <Line type="monotone" dataKey="anxiety" name="Anxiety" stroke="#7C3AED" strokeWidth={2} dot={false} animationDuration={800} />
              <Line type="monotone" dataKey="vitaminD" name="Vitamin D" stroke="#2563EB" strokeWidth={2.5} dot={false} animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>
            <span style={{ color: '#93C5FD', fontSize: 11 }}>↑ Vitamin D deficiency: +34% since Sep 2025</span>
          </div>
        </div>
      </div>
    </div>
  );
}
