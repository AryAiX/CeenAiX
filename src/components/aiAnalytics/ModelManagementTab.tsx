import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Bot, Lock, Wrench, FileText, ChevronRight, Star, AlertTriangle, X } from 'lucide-react';
import { DEPLOYMENT_HISTORY, API_COST_HISTORY, AI_MODEL_INFO } from '../../data/adminAIData';

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px', fontSize: 11 }}>
      <div style={{ color: '#94A3B8', marginBottom: 3 }}>{label}</div>
      <div style={{ color: '#F1F5F9' }}>{payload[0]?.value ? `AED ${(payload[0].value / 1000).toFixed(1)}K` : ''}</div>
    </div>
  );
}

function ChangelogModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1E293B', borderRadius: 16, width: 560, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #334155', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 17, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>CeenAiX AI v2.4.1 Changelog</div>
            <div style={{ color: '#7C3AED', fontSize: 12, marginTop: 2 }}>Released 2 April 2026 · Claude Sonnet</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            {
              icon: '✨', label: 'NEW FEATURES', color: '#7C3AED',
              items: [
                'AI-powered SOAP note drafting (doctor portal)',
                'Holter monitor integration for cardiac patients',
                'Pharmacy substitution quick-approve (admin AI)',
                'Population health heatmap (admin analytics)',
              ],
            },
            {
              icon: '⚡', label: 'IMPROVEMENTS', color: '#0D9488',
              items: [
                'Arabic language model accuracy: 89.2% → 91.2%',
                'Response time: 2.8s → 2.3s (avg)',
                'Elderly patient AI language simplification',
              ],
            },
            {
              icon: '🔧', label: 'BUG FIXES', color: '#F59E0B',
              items: [
                'Fixed: BP query false escalation trigger',
                'Fixed: ICD-10 suggestion for Arabic diagnoses',
              ],
            },
            {
              icon: '📋', label: 'COMPLIANCE UPDATES', color: '#10B981',
              items: [
                'DHA AI governance reporting v2 format',
                'UAE PDPL data handling update',
              ],
            },
          ].map(section => (
            <div key={section.label}>
              <div style={{ color: section.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{section.icon} {section.label}</div>
              {section.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: section.color, flexShrink: 0, marginTop: 1 }}>•</span>
                  <span style={{ color: '#94A3B8', fontSize: 13 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ModelManagementTab({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [showChangelog, setShowChangelog] = useState(false);
  const [promptUnlocking, setPromptUnlocking] = useState<string | null>(null);

  const handleViewPrompt = (slot: string) => {
    setPromptUnlocking(slot);
    setTimeout(() => {
      setPromptUnlocking(null);
      showToast('System prompt viewed — access logged', 'success');
    }, 1500);
  };

  const handleEditPrompt = () => {
    showToast('⚠️ System prompt edit requires CTO co-approval — request sent to Dr. Tooraj Helmi', 'info');
  };

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #2E1065 100%)', borderRadius: 16, border: '1px solid rgba(109,40,217,0.3)', padding: '24px 28px', boxShadow: '0 0 40px rgba(124,58,237,0.12)' }}>
        <div style={{ display: 'flex', gap: 28 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ position: 'relative' }}>
                <Bot size={36} color="#A78BFA" />
                <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '1.5px solid rgba(167,139,250,0.3)', animation: 'ping 2s ease-out infinite' }} />
              </div>
              <div>
                <div style={{ color: '#64748B', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>Active Model</div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 20, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>CeenAiX Clinical AI</div>
                <div style={{ color: '#C4B5FD', fontSize: 13 }}>Powered by Claude Sonnet · Anthropic</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Model ID', value: AI_MODEL_INFO.modelId },
                { label: 'CeenAiX Wrapper', value: AI_MODEL_INFO.ceenaixVersion },
                { label: 'Deployed', value: AI_MODEL_INFO.lastUpdated },
                { label: 'Environment', value: 'Production — UAE region' },
                { label: 'API Endpoint', value: AI_MODEL_INFO.apiEndpoint },
                { label: 'Context Window', value: AI_MODEL_INFO.contextWindow },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ color: '#7C3AED', fontSize: 10, marginBottom: 2 }}>{row.label}</div>
                  <div style={{ color: '#E9D5FF', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ color: '#C4B5FD', fontSize: 12 }}>Languages: {AI_MODEL_INFO.languages}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: 260 }}>
            {[
              { label: 'Sessions Today', value: '8,921', color: 'white' },
              { label: 'Active Now', value: '247', color: '#C4B5FD' },
              { label: 'Avg Response', value: '2.3s', color: '#99F6E4' },
              { label: 'Uptime 30d', value: '99.98%', color: '#A7F3D0' },
            ].map(m => (
              <div key={m.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ color: m.color, fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{m.value}</div>
                <div style={{ color: '#6D28D9', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {[
            { label: 'HIPAA Equivalent ✅', color: '#A78BFA' },
            { label: 'DHA Compliant ✅', color: '#0D9488' },
            { label: 'Data stays in UAE ✅', color: '#60A5FA' },
            { label: 'No training on patient data ✅', color: '#10B981' },
          ].map(b => (
            <span key={b.label} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${b.color}30`, borderRadius: 6, padding: '4px 10px', color: b.color, fontSize: 11, fontWeight: 500 }}>{b.label}</span>
          ))}
        </div>
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={15} color="#7C3AED" />
          <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Deployment History</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0F172A' }}>
              {['Version', 'Deployed', 'Changes', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#475569', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEPLOYMENT_HISTORY.map((d, i) => (
              <tr key={d.version} style={{ borderBottom: i < DEPLOYMENT_HISTORY.length - 1 ? '1px solid #334155' : 'none' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: d.status === 'production' ? '#A78BFA' : '#475569', fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{d.version}</span>
                    {d.status === 'production' && <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>CURRENT</span>}
                    {d.hotfix && <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>🔧 HOTFIX</span>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{d.date}</td>
                <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, maxWidth: 280 }}>{d.changes}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: d.status === 'production' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: d.status === 'production' ? '#10B981' : '#64748B', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, textTransform: 'capitalize' }}>
                      {d.status === 'production' ? '✅ Production' : '⬛ Replaced'}
                    </span>
                    {d.status === 'production' && (
                      <button onClick={() => setShowChangelog(true)} style={{ color: '#7C3AED', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Changelog</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
        <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>AI System Prompts</div>
        <div style={{ color: '#475569', fontSize: 12, marginBottom: 14 }}>Clinical instructions sent to Claude on every session</div>

        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <AlertTriangle size={13} color="#F59E0B" />
            <span style={{ color: '#F59E0B', fontSize: 12, fontWeight: 600 }}>Access Restricted</span>
          </div>
          <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6 }}>System prompts contain proprietary clinical logic. View access requires CEO approval. Changes require dual approval (CEO + CTO).</div>
          <div style={{ color: '#64748B', fontSize: 11, marginTop: 6 }}>
            Current approvers: Dr. Parnia Yazdkhasti (you) ✅ + Dr. Tooraj Helmi (CTO) required for changes
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { slot: 'patient', label: 'Patient Health Assistant', version: 'v2.4.1', tokens: '1,847 tokens', date: '2 Apr 2026 · Dr. Parnia + Dr. Tooraj' },
            { slot: 'doctor', label: 'Doctor Clinical Support', version: 'v2.4.1', tokens: '2,341 tokens', date: '2 Apr 2026 · Dr. Parnia + Dr. Tooraj' },
            { slot: 'insurance', label: 'Insurance Pre-Auth Intelligence', version: 'v2.4.1', tokens: '1,124 tokens', date: '2 Apr 2026 · Dr. Parnia + Dr. Tooraj' },
          ].map(slot => (
            <div key={slot.slot} style={{ background: '#0F172A', borderRadius: 10, border: '1px solid #334155', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={16} color="#7C3AED" />
                <div>
                  <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 500 }}>{slot.label} — {slot.version}</div>
                  <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace" }}>{slot.tokens}</span> · Last modified: {slot.date}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleViewPrompt(slot.slot)}
                  disabled={promptUnlocking === slot.slot}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 7, color: '#A78BFA', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  <Lock size={11} />
                  {promptUnlocking === slot.slot ? 'Authenticating...' : 'View Prompt'}
                </button>
                <button
                  onClick={handleEditPrompt}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 7, color: '#0D9488', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  <Wrench size={11} />
                  Propose Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AlertTriangle size={15} color="#F59E0B" />
          <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Anthropic API Cost Monitoring</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Today', value: 'AED 612', color: '#F1F5F9' },
            { label: 'This Month', value: 'AED 18,400', color: '#94A3B8' },
            { label: 'Last Month', value: 'AED 15,247', color: '#64748B', sub: '↑ +20.7%' },
            { label: 'Projected', value: 'AED 26,800', color: '#F59E0B', sub: 'Over budget' },
          ].map(m => (
            <div key={m.label} style={{ background: '#0F172A', borderRadius: 9, padding: '12px 14px', border: '1px solid #334155' }}>
              <div style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>{m.label}</div>
              <div style={{ color: m.color, fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{m.value}</div>
              {m.sub && <div style={{ color: '#F59E0B', fontSize: 10, marginTop: 3 }}>{m.sub}</div>}
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 9, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ color: '#F59E0B', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>⚠️ Month projection AED 26,800 exceeds budget AED 25,000</div>
          <div style={{ color: '#94A3B8', fontSize: 11 }}>Reason: +22.7% session growth this month</div>
          <div style={{ color: '#94A3B8', fontSize: 11 }}>Recommendation: Increase budget or optimize token usage</div>
          <button onClick={() => showToast('AI cost optimization tips opened')} style={{ color: '#F59E0B', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: 4, padding: 0 }}>View Optimization Tips</button>
        </div>

        <div style={{ color: '#64748B', fontSize: 12, marginBottom: 8 }}>Cost by portal:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Patient AI', value: 'AED 10,847/mo', pct: '64%', color: '#0D9488' },
            { label: 'Doctor AI', value: 'AED 5,291/mo', pct: '29%', color: '#1D4ED8' },
            { label: 'Insurance AI', value: 'AED 1,284/mo', pct: '7%', color: '#D97706' },
          ].map(p => (
            <div key={p.label} style={{ background: '#0F172A', borderRadius: 8, padding: '10px 12px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#64748B', fontSize: 11, marginBottom: 2 }}>{p.label}</div>
                <div style={{ color: p.color, fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{p.value}</div>
              </div>
              <span style={{ color: '#475569', fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{p.pct}</span>
            </div>
          ))}
        </div>

        <div style={{ color: '#64748B', fontSize: 12, marginBottom: 8 }}>Cost trend — 2026:</div>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={API_COST_HISTORY}>
            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}K`} />
            <Tooltip content={<DarkTooltip />} />
            <Line type="monotone" dataKey="cost" name="Cost (AED)" stroke="#0D9488" strokeWidth={2} dot={{ fill: '#0D9488', r: 3 }} animationDuration={800} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
      <style>{`@keyframes ping { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.8); opacity: 0; } }`}</style>
    </div>
  );
}
