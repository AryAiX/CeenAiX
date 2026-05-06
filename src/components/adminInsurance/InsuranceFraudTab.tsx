import { useState } from 'react';
import { AlertTriangle, Shield, FileText, Lock, ChevronDown, ChevronUp, Brain, TrendingUp, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fraudAlerts, adminInsurers, FraudRisk, FraudType } from '../../data/adminInsuranceData';

function fmt(n: number) {
  if (n >= 1000) return `AED ${(n / 1000).toFixed(1)}K`;
  return `AED ${n.toLocaleString()}`;
}

const RISK_CONFIG: Record<FraudRisk, { color: string; bg: string; border: string; label: string }> = {
  HIGH: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', label: 'High Risk' },
  MEDIUM: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', label: 'Medium Risk' },
  LOW: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', label: 'Low Risk' },
};

const TYPE_LABELS: Record<FraudType, string> = {
  provider: 'Provider Fraud',
  patient: 'Patient Fraud',
  pattern: 'Pattern Analysis',
  duplicate: 'Duplicate Billing',
  phantom: 'Phantom Claims',
};

function CustomTooltipDark({ active, payload, label }: any) {
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

export default function InsuranceFraudTab({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [riskFilter, setRiskFilter] = useState<FraudRisk | 'ALL'>('ALL');
  const [insurerFilter, setInsurerFilter] = useState<string>('ALL');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['f1']));

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = fraudAlerts.filter(a =>
    (riskFilter === 'ALL' || a.risk === riskFilter) &&
    (insurerFilter === 'ALL' || a.insurerId === insurerFilter)
  );

  const totalAtRisk = filtered.reduce((s, a) => s + a.amountAtRisk, 0);
  const totalFrozen = filtered.reduce((s, a) => s + a.claimsFrozen, 0);

  const byInsurerData = adminInsurers
    .filter(ins => ins.fraudAlertsOpen > 0)
    .map(ins => ({ name: ins.name.split(' ')[0], alerts: ins.fraudAlertsOpen, color: ins.fraudHighCount > 0 ? '#EF4444' : '#F59E0B' }));

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Fraud Alerts
          </div>
          <div style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>AI-powered fraud detection across all insurer networks</div>
        </div>
        <button
          onClick={() => showToast('DHA fraud report submitted for all open alerts', 'success')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 9, color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <FileText size={15} />
          Submit DHA Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Open Alerts', value: filtered.length, icon: AlertTriangle, color: '#EF4444' },
          { label: 'Amount at Risk', value: fmt(totalAtRisk), icon: TrendingUp, color: '#F59E0B' },
          { label: 'Claims Frozen', value: totalFrozen.toString(), icon: Lock, color: '#0D9488' },
          { label: 'AI Confidence', value: `${Math.round(filtered.reduce((s, a) => s + a.confidence, 0) / Math.max(filtered.length, 1))}%`, icon: Brain, color: '#7C3AED' },
        ].map(card => (
          <div key={card.label} style={{ background: '#1E293B', borderRadius: 12, padding: '16px 18px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: card.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <card.icon size={20} color={card.color} />
            </div>
            <div>
              <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{card.label}</div>
              <div style={{ color: card.color, fontSize: 20, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 7,
                    border: `1px solid ${riskFilter === r ? (r === 'ALL' ? '#0D9488' : RISK_CONFIG[r]?.color || '#0D9488') : '#334155'}`,
                    background: riskFilter === r ? (r === 'ALL' ? 'rgba(13,148,136,0.12)' : RISK_CONFIG[r]?.bg || 'rgba(13,148,136,0.12)') : 'transparent',
                    color: riskFilter === r ? (r === 'ALL' ? '#0D9488' : RISK_CONFIG[r]?.color || '#0D9488') : '#64748B',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {r === 'ALL' ? 'All Risks' : RISK_CONFIG[r].label}
                </button>
              ))}
            </div>
            <select
              value={insurerFilter}
              onChange={e => setInsurerFilter(e.target.value)}
              style={{ padding: '5px 10px', background: '#1E293B', border: '1px solid #334155', borderRadius: 7, color: '#94A3B8', fontSize: 12, cursor: 'pointer' }}
            >
              <option value="ALL">All Insurers</option>
              {adminInsurers.map(ins => (
                <option key={ins.id} value={ins.id}>{ins.name.split(' ')[0]}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', padding: 48, textAlign: 'center' }}>
              <Shield size={36} color="#334155" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: '#475569', fontSize: 14 }}>No fraud alerts match the current filters</div>
            </div>
          ) : (
            filtered.map(alert => {
              const rc = RISK_CONFIG[alert.risk];
              const isExp = expanded.has(alert.id);
              return (
                <div
                  key={alert.id}
                  style={{ background: '#1E293B', borderRadius: 12, border: `1px solid ${rc.border}`, overflow: 'hidden', transition: 'border-color 0.2s' }}
                >
                  <div
                    style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}
                    onClick={() => toggleExpand(alert.id)}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: rc.color, flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ background: rc.bg, color: rc.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, letterSpacing: '0.04em' }}>{alert.risk}</span>
                        <span style={{ background: 'rgba(100,116,139,0.15)', color: '#94A3B8', fontSize: 11, padding: '2px 8px', borderRadius: 5 }}>{TYPE_LABELS[alert.type]}</span>
                        <span style={{ background: 'rgba(124,58,237,0.12)', color: '#7C3AED', fontSize: 11, padding: '2px 8px', borderRadius: 5 }}>AI: {alert.confidence}%</span>
                        <span style={{ background: 'rgba(100,116,139,0.12)', color: '#64748B', fontSize: 11, padding: '2px 8px', borderRadius: 5 }}>{alert.insurerName}</span>
                      </div>
                      <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{alert.subject}</div>
                      <div style={{ color: '#64748B', fontSize: 12 }}>{alert.subjectDetail}</div>
                      <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                        <span style={{ color: '#EF4444', fontSize: 12 }}>At risk: <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fmt(alert.amountAtRisk)}</span></span>
                        {alert.claimsFrozen > 0 && (
                          <span style={{ color: '#0D9488', fontSize: 12 }}>Frozen: <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{alert.claimsFrozen} claims</span></span>
                        )}
                        <span style={{ color: '#475569', fontSize: 12 }}>{alert.flaggedAt}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{
                        background: alert.status === 'reviewing' ? 'rgba(245,158,11,0.12)' : alert.status === 'new' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                        color: alert.status === 'reviewing' ? '#F59E0B' : alert.status === 'new' ? '#EF4444' : '#10B981',
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, textTransform: 'capitalize',
                      }}>
                        {alert.status}
                      </span>
                      {isExp ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
                    </div>
                  </div>

                  {isExp && (
                    <div style={{ padding: '0 18px 16px 40px', borderTop: `1px solid ${rc.border}` }}>
                      <div style={{ marginTop: 14 }}>
                        <div style={{ color: '#475569', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
                        <div style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6 }}>{alert.description}</div>
                      </div>
                      <div style={{ marginTop: 14, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Brain size={13} color="#7C3AED" />
                          <span style={{ color: '#7C3AED', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>AI Analysis</span>
                        </div>
                        <div style={{ color: '#C4B5FD', fontSize: 12, lineHeight: 1.6 }}>{alert.aiAnalysis}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <button
                          onClick={() => showToast(`Investigation opened for ${alert.subject}`, 'success')}
                          style={{ padding: '7px 14px', background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: 7, color: '#0D9488', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Open Investigation
                        </button>
                        {alert.claimsFrozen === 0 && (
                          <button
                            onClick={() => showToast(`${alert.claimsFrozen || 'Relevant'} claims frozen`, 'success')}
                            style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Freeze Claims
                          </button>
                        )}
                        <button
                          onClick={() => showToast('DHA report submitted', 'success')}
                          style={{ padding: '7px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7, color: '#F59E0B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Report to DHA
                        </button>
                        <button
                          onClick={() => showToast('Alert resolved and cleared', 'success')}
                          style={{ padding: '7px 14px', background: 'rgba(100,116,139,0.12)', border: '1px solid #334155', borderRadius: 7, color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <BarChart2 size={15} color="#0D9488" />
              <span style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>Alerts by Insurer</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={byInsurerData} layout="vertical" barSize={16}>
                <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<CustomTooltipDark />} />
                <Bar dataKey="alerts" name="Alerts" radius={[0, 4, 4, 0]}>
                  {byInsurerData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', padding: '16px 18px' }}>
            <div style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Risk Breakdown</div>
            {(['HIGH', 'MEDIUM', 'LOW'] as FraudRisk[]).map(r => {
              const count = fraudAlerts.filter(a => a.risk === r).length;
              const pct = Math.round((count / fraudAlerts.length) * 100);
              const rc = RISK_CONFIG[r];
              return (
                <div key={r} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: rc.color, fontSize: 12, fontWeight: 600 }}>{rc.label}</span>
                    <span style={{ color: '#F1F5F9', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: rc.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: 'rgba(124,58,237,0.08)', borderRadius: 12, border: '1px solid rgba(124,58,237,0.2)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Brain size={15} color="#7C3AED" />
              <span style={{ color: '#7C3AED', fontSize: 13, fontWeight: 600 }}>AI Detection Engine</span>
            </div>
            <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
              CeenAiX fraud engine analyzes patterns across all claims in real-time using cross-insurer behavioral profiling.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Models Active', value: '7' },
                { label: 'Claims Analyzed Today', value: '1,032' },
                { label: 'Detection Rate', value: '98.4%' },
                { label: 'False Positive Rate', value: '1.2%' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: 11 }}>{m.label}</span>
                  <span style={{ color: '#C4B5FD', fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
