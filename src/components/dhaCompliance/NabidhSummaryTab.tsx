import { ExternalLink, AlertTriangle, Shield, RefreshCw, Users } from 'lucide-react';
import { D, Card, SectionHeader, StatusDot, MonoId } from './DhaCompliancePrimitives';

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function NabidhSummaryTab() {
  const certDays = 39;
  const complianceRate = 99.1;
  const consentCoverage = 91.2;

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* Critical alert: cert expiring */}
      <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(217,119,6,0.08)', border: `1px solid ${D.warningBorder}` }}>
        <AlertTriangle size={14} style={{ color: D.warningLight, flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1">
          <div className="text-xs font-semibold" style={{ color: D.warningLight }}>NABIDH mTLS certificate expires in {certDays} days</div>
          <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>
            Certificate CERT-001 (NABIDH Production mTLS) expires 2026-06-12. Rotate now to avoid service interruption.
          </div>
        </div>
        <button onClick={() => navigate('/admin/integrations/nabidh')}
          className="flex-shrink-0 flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg"
          style={{ background: D.warningBg, color: D.warningLight, border: `1px solid ${D.warningBorder}` }}>
          Rotate certificate <ExternalLink size={9} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Connection & Health */}
        <Card className="p-5">
          <SectionHeader title="Connection & Health">
            <button onClick={() => navigate('/admin/integrations/nabidh')}
              className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
              Open NABIDH page <ExternalLink size={9} />
            </button>
          </SectionHeader>
          <div className="space-y-2.5 text-[10px]">
            {[
              { label: 'Connection status', value: 'Connected', color: D.successLight, icon: true },
              { label: 'mTLS certificate', value: `${certDays} days remaining`, color: D.warningLight },
              { label: '24h compliance rate', value: `${complianceRate}%`, color: complianceRate >= 99 ? D.successLight : D.warningLight },
              { label: 'Submission SLA', value: '< 2h average', color: D.successLight },
              { label: 'FHIR version', value: 'R4', color: D.text2 },
              { label: 'Facility code', value: 'DHA-F-0012847', color: D.tealLight },
              { label: 'DHA profile version', value: 'NABIDH-2024-Q4', color: D.text2 },
              { label: 'Two-person approval rule', value: 'Enabled', color: D.successLight },
            ].map(f => (
              <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                <div className="flex items-center gap-1.5">
                  {f.icon && <StatusDot ok={true} pulse />}
                  <span style={{ color: D.text3 }}>{f.label}</span>
                </div>
                <span style={{ color: f.color, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Consent & rejections */}
        <Card className="p-5">
          <SectionHeader title="Consent & Submissions (24h)" />
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1.5">
                <span style={{ color: D.text3 }}>NABIDH consent coverage (general)</span>
                <span style={{ color: D.text1, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{consentCoverage}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
                <div className="h-full rounded-full" style={{ width: `${consentCoverage}%`, background: D.teal }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1.5">
                <span style={{ color: D.text3 }}>Sensitive category consent coverage</span>
                <span style={{ color: D.warningLight, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>78.4%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
                <div className="h-full rounded-full" style={{ width: '78.4%', background: D.warning }} />
              </div>
              <div className="text-[9px] mt-1" style={{ color: D.warningLight }}>Below DHA target of 85% — see DHA Circular 2026-14</div>
            </div>
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${D.border}` }}>
            <div className="text-[10px] font-semibold mb-2" style={{ color: D.text2 }}>Top rejection categories (24h)</div>
            {[
              { reason: 'Missing required FHIR field', count: 42, pct: 41.2 },
              { reason: 'Invalid Emirates ID format', count: 28, pct: 27.5 },
              { reason: 'Duplicate submission', count: 18, pct: 17.6 },
              { reason: 'Consent not recorded', count: 14, pct: 13.7 },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                <span style={{ color: D.text2 }}>{r.reason}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: D.text3 }}>{r.pct}%</span>
                  <span style={{ color: D.errorLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{r.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="p-5">
        <SectionHeader title="NABIDH Quick Actions" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Open NABIDH page', icon: ExternalLink, action: () => navigate('/admin/integrations/nabidh'), primary: true },
            { label: 'Resolve open rejections', icon: AlertTriangle, action: () => navigate('/admin/integrations/nabidh') },
            { label: 'Rotate certificate', icon: Shield, action: () => navigate('/admin/integrations/nabidh') },
            { label: 'Run consent campaign', icon: Users, action: () => {} },
          ].map(a => {
            const Icon = a.icon;
            return (
              <button key={a.label} onClick={a.action}
                className="flex items-center gap-2 p-3 rounded-xl text-xs transition-all"
                style={a.primary
                  ? { background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }
                  : { background: D.bg1, color: D.text2, border: `1px solid ${D.border}` }}>
                <Icon size={12} /> {a.label}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
