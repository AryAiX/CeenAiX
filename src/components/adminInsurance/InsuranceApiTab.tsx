import { useState } from 'react';
import { RefreshCw, Zap, Activity, CheckCircle2, AlertTriangle, XCircle, Webhook, Clock, RotateCcw } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { adminInsurers, apiSparklineData, webhookLog } from '../../data/adminInsuranceData';

function CustomTooltipDark({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
      <span style={{ color: '#F1F5F9' }}>{payload[0].value}ms</span>
    </div>
  );
}

function ApiSparkline({ insurerId, baseline }: { insurerId: string; baseline: number }) {
  const data = apiSparklineData[insurerId as keyof typeof apiSparklineData] || [];
  return (
    <ResponsiveContainer width="100%" height={36}>
      <BarChart data={data} barSize={6} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
        <Tooltip content={<CustomTooltipDark />} />
        <Bar dataKey="ms" radius={[2, 2, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.ms > baseline * 1.5 ? '#EF4444' : entry.ms > baseline ? '#F59E0B' : '#10B981'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function InsuranceApiTab({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [testing, setTesting] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const handleTest = (insurerId: string) => {
    setTesting(prev => new Set([...prev, insurerId]));
    setTimeout(() => {
      setTesting(prev => { const n = new Set(prev); n.delete(insurerId); return n; });
      showToast(`API test completed for ${adminInsurers.find(i => i.id === insurerId)?.name.split(' ')[0]}`, 'success');
    }, 1500);
  };

  const handleRefreshAll = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); showToast('All API statuses refreshed', 'success'); }, 2000);
  };

  const statusIcon = (status: string) => {
    if (status === 'healthy') return <CheckCircle2 size={14} color="#10B981" />;
    if (status === 'degraded') return <AlertTriangle size={14} color="#F59E0B" />;
    return <XCircle size={14} color="#EF4444" />;
  };

  const statusColor = (status: string) => status === 'healthy' ? '#10B981' : status === 'degraded' ? '#F59E0B' : '#EF4444';
  const statusBg = (status: string) => status === 'healthy' ? 'rgba(16,185,129,0.08)' : status === 'degraded' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)';

  const healthyCount = adminInsurers.filter(i => i.apiStatus === 'healthy').length;
  const degradedCount = adminInsurers.filter(i => i.apiStatus === 'degraded').length;

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            API & Integrations
          </div>
          <div style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Real-time health monitoring for all insurer API connections</div>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: 9, color: '#0D9488', fontSize: 13, fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.7 : 1 }}
        >
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Endpoints', value: '7', icon: Activity, color: '#0D9488' },
          { label: 'Healthy', value: `${healthyCount}`, icon: CheckCircle2, color: '#10B981' },
          { label: 'Degraded', value: `${degradedCount}`, icon: AlertTriangle, color: '#F59E0B' },
          { label: 'Avg Response', value: `${Math.round(adminInsurers.reduce((s, i) => s + i.apiResponseMs, 0) / adminInsurers.length)}ms`, icon: Zap, color: '#2563EB' },
        ].map(card => (
          <div key={card.label} style={{ background: '#1E293B', borderRadius: 12, padding: '16px 18px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: card.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <card.icon size={20} color={card.color} />
            </div>
            <div>
              <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{card.label}</div>
              <div style={{ color: card.color, fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        {adminInsurers.map(ins => {
          const isTesting = testing.has(ins.id);
          const isDegraded = ins.apiStatus === 'degraded';
          return (
            <div key={ins.id} style={{ background: '#1E293B', borderRadius: 12, border: `1px solid ${isDegraded ? 'rgba(245,158,11,0.3)' : '#334155'}`, padding: '16px 18px', transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: ins.avatarGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{ins.initials}</span>
                  </div>
                  <div>
                    <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>{ins.name.split(' ')[0]}{ins.name.split(' ')[1] && ins.name.split(' ').length <= 2 ? ` ${ins.name.split(' ')[1]}` : ''}</div>
                    <div style={{ color: '#475569', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{ins.apiEndpoint}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: statusBg(ins.apiStatus), padding: '4px 10px', borderRadius: 6 }}>
                  {statusIcon(ins.apiStatus)}
                  <span style={{ color: statusColor(ins.apiStatus), fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{ins.apiStatus}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>Response</div>
                  <div style={{ color: isDegraded ? '#F59E0B' : '#10B981', fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{ins.apiResponseMs}ms</div>
                </div>
                <div>
                  <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>Baseline</div>
                  <div style={{ color: '#64748B', fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{ins.apiBaselineMs}ms</div>
                </div>
                <div>
                  <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>Delta</div>
                  <div style={{ color: ins.apiResponseMs > ins.apiBaselineMs ? '#EF4444' : '#10B981', fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                    {ins.apiResponseMs > ins.apiBaselineMs ? '+' : ''}{ins.apiResponseMs - ins.apiBaselineMs}ms
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#475569', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Response Trend (last 60 min)</div>
                <ApiSparkline insurerId={ins.id} baseline={ins.apiBaselineMs} />
              </div>

              {isDegraded && ins.apiDegradedSince && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 7, padding: '8px 10px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={12} color="#F59E0B" />
                    <span style={{ color: '#F59E0B', fontSize: 11 }}>Degraded since {ins.apiDegradedSince}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleTest(ins.id)}
                  disabled={isTesting}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: 7, color: '#0D9488', fontSize: 12, fontWeight: 600, cursor: isTesting ? 'not-allowed' : 'pointer', opacity: isTesting ? 0.7 : 1 }}
                >
                  {isTesting ? <RotateCcw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={12} />}
                  {isTesting ? 'Testing...' : 'Test'}
                </button>
                {isDegraded && (
                  <button
                    onClick={() => showToast(`Reconnect initiated for ${ins.name.split(' ')[0]}`, 'success')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7, color: '#F59E0B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Webhook size={15} color="#0D9488" />
            <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15 }}>Webhook Activity</span>
            <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 2px rgba(16,185,129,0.25)' }} />
          </div>
          <div style={{ padding: '4px 0' }}>
            {webhookLog.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px', borderBottom: i < webhookLog.length - 1 ? '1px solid #1E293B' : 'none' }}>
                <span style={{ color: '#475569', fontSize: 11, fontFamily: "'DM Mono', monospace", width: 52, flexShrink: 0 }}>{entry.time}</span>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: entry.ok ? '#10B981' : '#EF4444', flexShrink: 0 }} />
                <span style={{ color: '#94A3B8', fontSize: 12, flex: 1 }}>{entry.event}</span>
                <span style={{ color: '#64748B', fontSize: 11, width: 50, flexShrink: 0 }}>{entry.insurer}</span>
                <span style={{ color: entry.ok ? '#10B981' : '#EF4444', fontSize: 11, fontFamily: "'DM Mono', monospace', monospace", width: 40, textAlign: 'right' }}>{entry.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#1E293B', borderRadius: 14, border: '1px solid #334155', padding: '18px 20px' }}>
          <div style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Integration Features</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', borderRadius: 9, border: '1px solid #334155' }}>
            {[
              { label: 'Pre-authorization', description: 'Real-time PA submission & approval', supported: 7 },
              { label: 'Eligibility Verification', description: 'Live member eligibility check', supported: 7 },
              { label: 'Claims Submission', description: 'HL7 FHIR-compliant claim routing', supported: 7 },
              { label: 'EOB Retrieval', description: 'Explanation of Benefits auto-fetch', supported: 6 },
              { label: 'Member Sync', description: 'Scheduled member data sync', supported: 5 },
              { label: 'NABIDH Push', description: 'HIE record push on claim approval', supported: 7 },
              { label: 'Remittance Advice', description: 'Payment reconciliation via RA', supported: 4 },
            ].map((feat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: i < 6 ? '1px solid #334155' : 'none', background: 'transparent' }}>
                <div>
                  <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 500 }}>{feat.label}</div>
                  <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>{feat.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ color: feat.supported === 7 ? '#10B981' : '#F59E0B', fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{feat.supported}/7</span>
                  {feat.supported === 7
                    ? <CheckCircle2 size={14} color="#10B981" />
                    : <AlertTriangle size={14} color="#F59E0B" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
