import { useState, useEffect } from 'react';
import {
  X, Mail, MessageSquare, ExternalLink, Download,
  RefreshCw, Building2, Shield, AlertTriangle, ShieldOff, Bot,
  CheckCircle2, XCircle, Loader2, Activity
} from 'lucide-react';
import { AdminInsurer, fraudAlerts } from '../../data/adminInsuranceData';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

interface InsurerDetailDrawerProps {
  insurer: AdminInsurer | null;
  onClose: () => void;
  showToast: (msg: string) => void;
}

type DrawerTab = 'overview' | 'claims' | 'fraud' | 'api' | 'notes';

const TABS: { id: DrawerTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'claims', label: 'Claims' },
  { id: 'fraud', label: 'Fraud' },
  { id: 'api', label: 'API & Config' },
  { id: 'notes', label: 'Notes' },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: '#0F172A', border: '1px solid #334155', fontSize: 12 }}>
      {label && <div style={{ color: '#64748B', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: '#F1F5F9' }}>{p.name ? `${p.name}: ` : ''}{p.value != null ? (p.value > 100000 ? `AED ${(p.value / 1000000).toFixed(1)}M` : p.value) : ''}</div>
      ))}
    </div>
  );
};

const monthlyData = [
  { month: 'Jan', value: 14200000 },
  { month: 'Feb', value: 13800000 },
  { month: 'Mar', value: 15200000 },
  { month: 'Apr', value: 3900000 },
];

const apiSparkDaman = [
  { t: '-60m', ms: 412 }, { t: '-50m', ms: 398 }, { t: '-40m', ms: 421 }, { t: '-30m', ms: 390 },
  { t: '-20m', ms: 1847 }, { t: '-10m', ms: 2941 }, { t: 'now', ms: 3247 },
];
const apiSparkHealthy = [
  { t: '-60m', ms: 380 }, { t: '-50m', ms: 374 }, { t: '-40m', ms: 382 }, { t: '-30m', ms: 371 },
  { t: '-20m', ms: 375 }, { t: '-10m', ms: 380 }, { t: 'now', ms: 0 },
];

export default function InsurerDetailDrawer({ insurer, onClose, showToast }: InsurerDetailDrawerProps) {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<DrawerTab>('overview');
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<{ text: string; ts: string }[]>([]);
  const [testingApi, setTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [features, setFeatures] = useState({
    ePrescription: true, preAuth: true, directClaims: true,
    realtimeEligibility: true, fraudScoring: true, memberSync: true,
  });

  useEffect(() => {
    if (insurer) { setTimeout(() => setVisible(true), 10); setTab('overview'); setTestResult(null); }
    else setVisible(false);
  }, [insurer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!insurer) return null;

  const insurerFraud = fraudAlerts.filter(f => f.insurerId === insurer.id);
  const isDegraded = insurer.apiStatus === 'degraded';
  const apiColor = isDegraded ? '#FCD34D' : '#34D399';
  const apiBg = isDegraded ? 'rgba(120,53,15,0.2)' : 'rgba(5,150,105,0.06)';

  const handleTestApi = () => {
    setTestingApi(true);
    setTestResult(null);
    setTimeout(() => {
      setTestingApi(false);
      setTestResult(isDegraded ? `API Response: ${insurer.apiResponseMs}ms ⚠️` : `API Response: ${insurer.apiResponseMs}ms ✅`);
    }, 1500);
  };

  const handleSaveNote = () => {
    if (!note.trim()) return;
    setNotes(prev => [{ text: note.trim(), ts: 'Just now' }, ...prev]);
    setNote('');
    showToast('✅ Admin note added to ' + insurer.name.split(' ')[0] + ' profile');
  };

  const coverageData = insurer.plans.map(p => ({
    name: p.name,
    value: p.members,
    color: p.color,
  }));

  const sparkData = insurer.id === 'daman' ? apiSparkDaman : apiSparkHealthy.map((d, i) => ({
    ...d,
    ms: i === 6 ? insurer.apiResponseMs : Math.round(insurer.apiResponseMs * (0.9 + Math.random() * 0.2)),
  }));

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: 580,
          background: '#0F172A',
          borderLeft: '1px solid #334155',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms ease-out',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Insurance Partner</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{insurer.name}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: '#475569' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 px-5 flex-shrink-0" style={{ borderBottom: '1px solid #334155', paddingTop: 8 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2.5 rounded-t-lg transition-colors"
              style={{
                fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                color: tab === t.id ? '#2DD4BF' : '#64748B',
                borderBottom: tab === t.id ? '2px solid #0D9488' : '2px solid transparent',
              }}
            >
              {t.label}
              {t.id === 'fraud' && insurer.fraudAlertsOpen > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, background: 'rgba(234,88,12,0.2)', color: '#FB923C' }}>
                  {insurer.fraudAlertsOpen}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === 'overview' && (
            <div className="flex flex-col gap-5">
              <div className="rounded-xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: insurer.avatarGradient, fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace' }}
                  >
                    {insurer.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{insurer.name}</div>
                    {insurer.nameAr && <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif', direction: 'rtl' }}>{insurer.nameAr}</div>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-md" style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', background: 'rgba(37,99,235,0.15)', color: '#93C5FD' }}>
                        {insurer.license}
                      </span>
                      {insurer.tier === 'premium' && (
                        <span className="px-2 py-0.5 rounded-md" style={{ fontSize: 10, background: 'rgba(120,53,15,0.5)', color: '#FCD34D' }}>⭐ Premium Partner</span>
                      )}
                      <span className="px-2 py-0.5 rounded-md" style={{ fontSize: 10, background: 'rgba(5,150,105,0.15)', color: '#34D399' }}>UAE Insurance Authority ✅</span>
                      <span className="px-2 py-0.5 rounded-md" style={{ fontSize: 10, background: 'rgba(5,150,105,0.15)', color: '#34D399' }}>DHA Approved Network ✅</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}>Partner Details</div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  {[
                    { label: 'License #', value: insurer.license },
                    { label: 'Partner Since', value: insurer.partnerSince },
                    { label: 'Partnership Tier', value: insurer.tier === 'premium' ? 'Premium' : 'Standard' },
                    { label: 'Contract Renewal', value: insurer.contractRenewal || '—' },
                    { label: 'Primary Contact', value: insurer.primaryContact || '—' },
                    { label: 'Technical Contact', value: insurer.technicalContact || '—' },
                    { label: 'API Endpoint', value: insurer.apiEndpoint || '—' },
                  ].map(r => (
                    <div key={r.label}>
                      <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: r.label.includes('License') || r.label.includes('API') ? 'DM Mono, monospace' : 'Inter, sans-serif', marginTop: 1 }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                  <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>Member Coverage</div>
                  <div className="flex items-center gap-3">
                    <ResponsiveContainer width={90} height={90}>
                      <PieChart>
                        <Pie data={coverageData} cx="50%" cy="50%" innerRadius={24} outerRadius={40} dataKey="value" strokeWidth={0}>
                          {coverageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1">
                      {insurer.plans.map(p => (
                        <div key={p.name} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                          <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{p.name}: {p.members.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                  <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>Performance</div>
                  {[
                    { label: 'Auto-approval rate', value: `${insurer.autoApprovalRate}%`, color: insurer.autoApprovalRate >= 80 ? '#34D399' : '#FCD34D' },
                    { label: 'Avg processing', value: `${insurer.avgProcessingHours}h`, color: '#2DD4BF' },
                    { label: 'Denial rate', value: `${insurer.denialRate}%`, color: insurer.denialRate > 5 ? '#FCD34D' : '#34D399' },
                    { label: 'Appeals rate', value: `${insurer.appealRate}%`, color: '#94A3B8' },
                  ].map(m => (
                    <div key={m.label} className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{m.label}</span>
                      <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: m.color }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div className="flex items-start gap-2">
                  <Bot style={{ width: 14, height: 14, color: '#A78BFA', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#A78BFA', fontFamily: 'Inter, sans-serif', fontWeight: 600, marginBottom: 4 }}>AI Insight</div>
                    <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
                      {insurer.id === 'daman'
                        ? 'Daman Basic plan has highest denial rate (9.2%) — primarily pre-auth non-compliance. Recommend targeted provider education campaign.'
                        : insurer.autoApprovalRate < 80
                        ? `${insurer.name.split(' ')[0]} auto-approval rate (${insurer.autoApprovalRate}%) is below platform average (81.3%). Review denial reasons to identify improvement opportunities.`
                        : `${insurer.name.split(' ')[0]} is performing above platform average with ${insurer.autoApprovalRate}% auto-approval. API health is excellent.`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 12, color: '#34D399', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>✅ Active Partnership</span>
                <div className="flex-1" />
                {['Edit Partnership', 'Send Notification', 'Suspend'].map(btn => (
                  <button
                    key={btn}
                    onClick={() => showToast(`✅ ${btn} action triggered`)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors"
                    style={{
                      fontSize: 12, fontFamily: 'Inter, sans-serif',
                      background: btn === 'Suspend' ? 'rgba(120,53,15,0.3)' : '#334155',
                      color: btn === 'Suspend' ? '#FCD34D' : '#94A3B8',
                      border: '1px solid #475569',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'claims' && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Claims Today', value: insurer.claimsToday.toString(), sub: `AED ${(insurer.claimsValueToday / 1000000).toFixed(2)}M`, color: '#2DD4BF' },
                  { label: 'This Month', value: insurer.claimsMonthly.toLocaleString(), sub: `AED ${(insurer.claimsValueMonthly / 1000000).toFixed(1)}M`, color: '#60A5FA' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'DM Mono, monospace' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: '#6EE7B7', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginBottom: 14 }}>Monthly Claims Value (AED)</div>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="clGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0D9488" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#0D9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000000}M`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" stroke="#0D9488" fill="url(#clGrad)" strokeWidth={2} name="Value" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {insurer.slaBreachesToday > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(153,27,27,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle style={{ width: 14, height: 14, color: '#EF4444' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', fontFamily: 'Inter, sans-serif' }}>ACTIVE BREACH — {insurer.slaBreachRef}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#FCA5A5', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                    PCI pre-auth · Mohammed Ibrahim · Daman Gold · 17 minutes past 4-hour DHA limit
                  </div>
                  <button onClick={() => showToast('📋 Escalation sent to Daman')} className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ fontSize: 12, background: 'rgba(153,27,27,0.3)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)', fontFamily: 'Inter, sans-serif' }}>
                    Escalate to {insurer.name.split(' ')[0]}
                  </button>
                </div>
              )}

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>SLA Performance Today</div>
                <div style={{ fontSize: 14, color: insurer.slaBreachesToday > 0 ? '#FCD34D' : '#34D399', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                  {insurer.slaBreachesToday > 0 ? '99.7% SLA compliance (1 breach)' : '100% SLA compliance'}
                </div>
              </div>
            </div>
          )}

          {tab === 'fraud' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#FB923C', fontFamily: 'Inter, sans-serif' }}>
                  {insurerFraud.length > 0 ? `${insurerFraud.length} active investigations · ${insurer.fraudHighCount} HIGH` : '0 fraud alerts — clean ✅'}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                  AI fraud detection: 94 flags raised · 89 resolved (30 days)
                </div>
              </div>

              {insurerFraud.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 style={{ width: 40, height: 40, color: '#10B981', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 14, color: '#34D399', fontFamily: 'Inter, sans-serif' }}>No active fraud alerts</div>
                </div>
              ) : (
                insurerFraud.map(f => (
                  <div
                    key={f.id}
                    className="rounded-xl p-4"
                    style={{
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderLeft: `4px solid ${f.risk === 'HIGH' ? '#DC2626' : f.risk === 'MEDIUM' ? '#EA580C' : '#F59E0B'}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          fontSize: 10, fontWeight: 700,
                          background: f.risk === 'HIGH' ? 'rgba(153,27,27,0.3)' : f.risk === 'MEDIUM' ? 'rgba(154,52,18,0.3)' : 'rgba(120,53,15,0.3)',
                          color: f.risk === 'HIGH' ? '#FCA5A5' : f.risk === 'MEDIUM' ? '#FDBA74' : '#FDE68A',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        {f.risk === 'HIGH' ? '🔴 HIGH RISK' : f.risk === 'MEDIUM' ? '⚠️ MEDIUM RISK' : '🟡 LOW RISK'}
                      </span>
                      <span style={{ fontSize: 10, color: '#A78BFA', fontFamily: 'DM Mono, monospace' }}>{f.confidence}% confidence</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>{f.subject}</div>
                    <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.15)' }}>
                      <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>{f.description}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: f.risk === 'HIGH' ? '#FCA5A5' : '#FDBA74', fontFamily: 'DM Mono, monospace', marginBottom: 8 }}>
                      AED {f.amountAtRisk.toLocaleString()} at risk
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['Investigate', 'Freeze Claims', 'Report to DHA'].map(a => (
                        <button key={a} onClick={() => showToast(`✅ ${a} — ${f.id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#3D4F63'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}

              <button onClick={() => showToast('📋 DHA fraud report submitted')} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl transition-colors mt-2" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: 'rgba(13,148,136,0.1)', color: '#2DD4BF', border: '1px solid rgba(13,148,136,0.3)' }}>
                📤 Submit Fraud Report to DHA
              </button>
              <div style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>Last DHA fraud report: 31 Mar 2026</div>
            </div>
          )}

          {tab === 'api' && (
            <div className="flex flex-col gap-5">
              <div className="rounded-xl p-4" style={{ background: apiBg, border: `1px solid ${apiColor}33` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: apiColor, fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>
                  {isDegraded ? '⚠️ API DEGRADED' : '✅ API HEALTHY'}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Current Response</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: apiColor, fontFamily: 'DM Mono, monospace' }}>{insurer.apiResponseMs.toLocaleString()}ms</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Baseline</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>&lt;{insurer.apiBaselineMs}ms</div>
                  </div>
                  {isDegraded && insurer.apiDegradedSince && (
                    <>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Degraded Since</div>
                        <div style={{ fontSize: 13, color: '#FCD34D', fontFamily: 'DM Mono, monospace' }}>{insurer.apiDegradedSince}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Duration</div>
                        <div style={{ fontSize: 13, color: '#FCD34D', fontFamily: 'DM Mono, monospace' }}>47 minutes</div>
                      </div>
                    </>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={sparkData} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
                    <Bar dataKey="ms" radius={[2, 2, 0, 0]}>
                      {sparkData.map((entry, i) => (
                        <Cell key={i} fill={entry.ms > insurer.apiBaselineMs * 1.5 ? '#F59E0B' : '#0D9488'} />
                      ))}
                    </Bar>
                    <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {isDegraded && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(120,53,15,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div style={{ fontSize: 12, color: '#FCD34D', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                    ⚠️ Claims processing slowed · 42 claims in queue<br />
                    ⚠️ 1 SLA breach attributed to degraded API<br />
                    ✅ Failsafe active — claims queued for retry
                  </div>
                </div>
              )}

              {testResult && (
                <div className="rounded-xl p-3" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                  <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: testResult.includes('⚠️') ? '#FCD34D' : '#34D399' }}>
                    Test Result: {testResult}
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button onClick={handleTestApi} disabled={testingApi} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: 'rgba(13,148,136,0.1)', color: '#2DD4BF', border: '1px solid rgba(13,148,136,0.3)' }}>
                  {testingApi ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <RefreshCw style={{ width: 13, height: 13 }} />}
                  {testingApi ? 'Testing...' : 'Test API Now'}
                </button>
                {isDegraded && <button onClick={() => showToast('📞 Daman IT alerted')} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: 'rgba(120,53,15,0.3)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.3)' }}>Alert {insurer.name.split(' ')[0]} IT</button>}
                <button onClick={() => showToast('📋 API log opened')} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}>View API Logs</button>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>API Configuration</div>
                {[
                  { label: 'Endpoint', value: `https://${insurer.apiEndpoint}` },
                  { label: 'Auth', value: 'OAuth 2.0 · Token refresh: 1h' },
                  { label: 'Webhook URL', value: `https://api.ceenaix.com/webhooks/${insurer.id}` },
                  { label: 'Timeout', value: '30 seconds' },
                ].map(r => (
                  <div key={r.label} className="mb-2">
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'DM Mono, monospace' }}>{r.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>Feature Toggles</div>
                {(Object.entries(features) as [keyof typeof features, boolean][]).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                    <button
                      onClick={() => setFeatures(p => ({ ...p, [key]: !val }))}
                      className="w-10 h-5 rounded-full transition-colors"
                      style={{ background: val ? '#0D9488' : '#334155', position: 'relative' }}
                    >
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: val ? '22px' : '2px' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'notes' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 mb-2">
                {['⭐ Premium', 'Primary Partner', 'API Watch', 'High Volume'].map(label => (
                  <button key={label} onClick={() => showToast(`✅ Label "${label}" toggled`)} className="px-2.5 py-1.5 rounded-lg" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add an internal note about this insurance partner..."
                  rows={4}
                  className="w-full rounded-xl px-4 py-3 resize-none"
                  style={{ background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }}
                />
                <button
                  onClick={handleSaveNote}
                  className="mt-2 px-4 py-2 rounded-lg"
                  style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: note.trim() ? '#0D9488' : '#334155', color: note.trim() ? '#fff' : '#64748B', border: 'none' }}
                  disabled={!note.trim()}
                >
                  Save Note
                </button>
              </div>
              {notes.map((n, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                  <div style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>{n.text}</div>
                  <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', marginTop: 6 }}>You · {n.ts}</div>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-center py-8">
                  <div style={{ fontSize: 13, color: '#475569', fontFamily: 'Inter, sans-serif' }}>No notes yet</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex-shrink-0 flex items-center gap-2" style={{ borderTop: '1px solid #334155' }}>
          {['Email', 'Message', 'Test API'].map(btn => (
            <button key={btn} onClick={() => { if (btn === 'Test API') handleTestApi(); else showToast(`✅ ${btn} action`); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', background: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#1E293B'}
            >
              {btn}
            </button>
          ))}
          <button onClick={() => showToast('🔗 Opening insurance portal...')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: '#0D9488', color: '#fff', border: 'none', marginLeft: 'auto' }}>
            <ExternalLink style={{ width: 13, height: 13 }} /> Open Portal
          </button>
        </div>
      </div>
    </>
  );
}
