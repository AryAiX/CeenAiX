import { useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, BarChart, Bar, ReferenceLine,
} from 'recharts';
import { Heart, Stethoscope, Shield, Star, TrendingUp } from 'lucide-react';
import {
  HOURLY_SESSIONS_TODAY, AI_LANGUAGE_BREAKDOWN, RESPONSE_TIME_TREND,
  SATISFACTION_7DAY, AI_REVENUE, AI_PATIENT_PERFORMANCE,
  AI_DOCTOR_PERFORMANCE, AI_INSURANCE_PERFORMANCE,
} from '../../data/adminAIData';

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: '#94A3B8', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color || '#F1F5F9', marginBottom: 2 }}>
          {p.name}: <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

type ViewFilter = 'hourly' | 'daily' | 'weekly';
type PortalFilter = 'all' | 'patient' | 'doctor' | 'insurance';

function fmtAED(n: number) {
  if (n >= 1000) return `AED ${(n / 1000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
}

export default function AIPerformanceTab() {
  const [viewFilter, setViewFilter] = useState<ViewFilter>('hourly');
  const [portalFilter, setPortalFilter] = useState<PortalFilter>('all');

  const chartData = HOURLY_SESSIONS_TODAY.map(d => ({
    ...d,
    total: d.patient + d.doctor + (d.insurance ?? 0),
  }));

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>AI Session Volume — April 2026</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', gap: 4, background: '#0F172A', borderRadius: 8, padding: 3 }}>
                  {(['hourly', 'daily', 'weekly'] as ViewFilter[]).map(v => (
                    <button key={v} onClick={() => setViewFilter(v)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: viewFilter === v ? '#334155' : 'transparent', color: viewFilter === v ? '#F1F5F9' : '#64748B', textTransform: 'capitalize' }}>{v}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, background: '#0F172A', borderRadius: 8, padding: 3 }}>
                  {(['all', 'patient', 'doctor', 'insurance'] as PortalFilter[]).map(f => (
                    <button key={f} onClick={() => setPortalFilter(f)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: portalFilter === f ? '#334155' : 'transparent', color: portalFilter === f ? '#F1F5F9' : '#64748B', textTransform: 'capitalize' }}>{f}</button>
                  ))}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="doctorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="insuranceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                {(portalFilter === 'all' || portalFilter === 'patient') && (
                  <Area type="monotone" dataKey="patient" name="Patient AI" stroke="#0D9488" strokeWidth={2} fill="url(#patientGrad)" animationDuration={800} />
                )}
                {(portalFilter === 'all' || portalFilter === 'doctor') && (
                  <Area type="monotone" dataKey="doctor" name="Doctor AI" stroke="#1D4ED8" strokeWidth={2} fill="url(#doctorGrad)" animationDuration={800} />
                )}
                {(portalFilter === 'all' || portalFilter === 'insurance') && (
                  <Area type="monotone" dataKey="insurance" name="Insurance AI" stroke="#D97706" strokeWidth={2} fill="url(#insuranceGrad)" animationDuration={800} />
                )}
                {portalFilter === 'all' && (
                  <Line type="monotone" dataKey="total" name="Total" stroke="#7C3AED" strokeWidth={2} dot={false} animationDuration={800} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <span style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 10, padding: '3px 8px', borderRadius: 5, fontWeight: 600 }}>Peak: 1,247 · 9–10 AM</span>
              <span style={{ color: '#475569', fontSize: 11 }}>Current time: 2:07 PM · 247 active sessions</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', borderLeft: '4px solid #0D9488', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Heart size={14} color="#0D9488" />
                <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>Patient Health Assistant</span>
              </div>
              <div style={{ color: '#0D9488', fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>6,847 sessions today · 76.8%</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Satisfaction', value: `${AI_PATIENT_PERFORMANCE.patientSatisfaction}★`, color: '#F59E0B' },
                  { label: 'Booking rate', value: `${AI_PATIENT_PERFORMANCE.bookingConversion}%`, color: '#0D9488' },
                  { label: 'Avg duration', value: `${AI_PATIENT_PERFORMANCE.avgDurationPatient} min`, color: '#94A3B8' },
                  { label: 'Accuracy', value: `${AI_PATIENT_PERFORMANCE.symptomAccuracy}%`, color: '#10B981' },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ color: '#475569', fontSize: 10, marginBottom: 2 }}>{m.label}</div>
                    <div style={{ color: m.color, fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ color: '#475569', fontSize: 11, marginTop: 10 }}>Top: Appointment booking: 2,891 sessions</div>
            </div>

            <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', borderLeft: '4px solid #1D4ED8', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Stethoscope size={14} color="#1D4ED8" />
                <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>Doctor Clinical Support</span>
              </div>
              <div style={{ color: '#2563EB', fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>1,841 sessions today · 20.6%</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'SOAP acceptance', value: `${AI_DOCTOR_PERFORMANCE.soapAcceptanceRate}%`, color: '#0D9488' },
                  { label: 'ICD-10 accuracy', value: `${AI_DOCTOR_PERFORMANCE.icd10Accuracy}%`, color: '#10B981' },
                  { label: 'Time saved', value: `${AI_DOCTOR_PERFORMANCE.avgTimeSavedMin} min`, color: '#7C3AED' },
                  { label: 'Daily usage', value: `${AI_DOCTOR_PERFORMANCE.dailyUsageRate}%`, color: '#60A5FA' },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ color: '#475569', fontSize: 10, marginBottom: 2 }}>{m.label}</div>
                    <div style={{ color: m.color, fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', borderLeft: '4px solid #D97706', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Shield size={14} color="#D97706" />
                <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>Insurance Pre-Auth AI</span>
              </div>
              <div style={{ color: '#D97706', fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>233 sessions today · 2.6%</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Rec. accuracy', value: `${AI_INSURANCE_PERFORMANCE.preAuthAccuracy}%`, color: '#10B981' },
                  { label: 'Fraud TP rate', value: `${AI_INSURANCE_PERFORMANCE.fraudTruePositive}%`, color: '#FB923C' },
                  { label: 'False positive', value: `${AI_INSURANCE_PERFORMANCE.falsePositiveRate}%`, color: '#F59E0B' },
                  { label: 'Processing', value: `${AI_INSURANCE_PERFORMANCE.aiProcessingSeconds}s`, color: '#0D9488' },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ color: '#475569', fontSize: 10, marginBottom: 2 }}>{m.label}</div>
                    <div style={{ color: m.color, fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ color: '#475569', fontSize: 11, marginTop: 10 }}>
                vs human: <span style={{ textDecoration: 'line-through' }}>4.2 hours</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
            <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Session Language — Today</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PieChart width={180} height={180}>
                <Pie data={AI_LANGUAGE_BREAKDOWN} dataKey="pct" nameKey="language" cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2}>
                  {AI_LANGUAGE_BREAKDOWN.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
              {AI_LANGUAGE_BREAKDOWN.map(l => (
                <div key={l.language} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                    <span style={{ color: '#94A3B8', fontSize: 12 }}>{l.flag} {l.language}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: '#F1F5F9', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{l.sessions.toLocaleString()}</span>
                    <span style={{ color: '#475569', fontSize: 11, width: 28, textAlign: 'right' }}>{l.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, color: '#475569', fontSize: 11, fontStyle: 'italic', lineHeight: 1.5 }}>
              62% Arabic reflects UAE population. AI fully bilingual AR/EN throughout all portals.
            </div>
          </div>

          <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>API Response Time</div>
              <div style={{ color: '#0D9488', fontSize: 20, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>2.3s</div>
            </div>
            <div style={{ color: '#475569', fontSize: 12, marginBottom: 10 }}>avg response · Target: &lt;3s ✅</div>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={RESPONSE_TIME_TREND}>
                <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 5]} tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <ReferenceLine y={3} stroke="#10B981" strokeDasharray="4 4" strokeOpacity={0.4} />
                <Line type="monotone" dataKey="ms" name="Response (s)" stroke="#0D9488" strokeWidth={2} dot={{ fill: '#0D9488', r: 3 }} animationDuration={600} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              {[
                { label: 'Patient AI', value: '2.1s' }, { label: 'Doctor AI', value: '2.8s' },
                { label: 'Insurance AI', value: '1.9s' }, { label: 'Anthropic API', value: '1.2s' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569', fontSize: 11 }}>{m.label}</span>
                  <span style={{ color: '#0D9488', fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>AI Satisfaction Score — Last 7 Days</div>
          <div style={{ color: '#475569', fontSize: 12, marginBottom: 14 }}>Patient satisfaction (out of 5.0)</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={SATISFACTION_7DAY} barSize={28}>
              <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[4.0, 5.0]} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <ReferenceLine y={4.5} stroke="#0D9488" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Bar dataKey="score" name="Score" fill="#7C3AED" fillOpacity={0.8} radius={[4, 4, 0, 0]} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={15} color="#10B981" />
            <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>AI Revenue Attribution</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', borderRadius: 8, border: '1px solid #334155' }}>
            {[
              { label: 'AI-driven bookings', value: fmtAED(AI_REVENUE.aiDrivenBookings), pct: '73%', color: '#10B981', border: true },
              { label: 'AI subscription fee', value: fmtAED(AI_REVENUE.subscriptionFee), pct: '14.6%', color: '#10B981', border: true },
              { label: 'Insurance AI fee', value: fmtAED(AI_REVENUE.insuranceAIFee), pct: '12.2%', color: '#10B981', border: true },
              { label: 'Gross AI revenue', value: fmtAED(AI_REVENUE.grossRevenue), pct: '100%', color: '#10B981', border: true, bold: true },
              { label: 'Anthropic API cost', value: `– ${fmtAED(AI_REVENUE.anthropicCost)}`, pct: '–6.4%', color: '#EF4444', border: true },
              { label: 'Net AI margin', value: fmtAED(AI_REVENUE.netMargin), pct: `${AI_REVENUE.netMarginPct}%`, color: '#10B981', border: false, bold: true },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: row.border ? '1px solid #334155' : 'none', background: row.bold ? 'rgba(13,148,136,0.06)' : 'transparent' }}>
                <span style={{ color: row.bold ? '#F1F5F9' : '#94A3B8', fontSize: 13, fontWeight: row.bold ? 600 : 400 }}>{row.label}</span>
                <div style={{ display: 'flex', gap: 20 }}>
                  <span style={{ color: row.color, fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: row.bold ? 700 : 500 }}>{row.value}</span>
                  <span style={{ color: '#475569', fontSize: 11, width: 36, textAlign: 'right' }}>{row.pct}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
