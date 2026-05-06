import { CheckCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { TATMEEN_STATUS } from '../../data/dhaComplianceData';
import { D, Card, SectionHeader, MonoId, StatusDot, TH, TD, TR } from './DhaCompliancePrimitives';

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function TatmeenTab() {
  const t = TATMEEN_STATUS;

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* Migration banner */}
      <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)' }}>
        <AlertTriangle size={14} style={{ color: D.blueLight, flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1">
          <div className="text-xs font-semibold" style={{ color: D.blueLight }}>Tatmeen API v4.2 migration required by 2026-07-01</div>
          <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>DHA announcement ANN-003. All pharmacy modules must migrate from v4.1 → v4.2. Test environment available now.</div>
        </div>
        <span className="flex-shrink-0 text-[10px] px-2 py-1 rounded-lg" style={{ background: D.blueBg, color: D.blueLight, border: '1px solid rgba(37,99,235,0.3)' }}>58d remaining</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Connection & Health */}
        <Card className="p-5">
          <SectionHeader title="Connection & Health">
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
              <RefreshCw size={9} /> Re-verify
            </button>
          </SectionHeader>
          <div className="space-y-2 text-[10px]">
            {[
              { label: 'Connection status', value: 'Connected', color: D.successLight, dot: true },
              { label: 'mTLS certificate expiry', value: `${t.certExpiry} (${t.certDaysRemaining}d)`, color: D.successLight },
              { label: 'Last submission', value: '2026-05-04 07:58 GST', color: D.text2 },
              { label: 'GS1 serialization coverage', value: `${t.gs1Coverage}%`, color: t.gs1Coverage >= 99 ? D.successLight : D.warningLight },
              { label: '24h submission volume', value: t.volume24h.toLocaleString(), color: D.text2 },
              { label: '24h success rate', value: `${t.successRate24h}%`, color: t.successRate24h >= 99 ? D.successLight : D.warningLight },
              { label: 'API version', value: 'v4.1 (migration pending)', color: D.warningLight },
            ].map(f => (
              <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                <div className="flex items-center gap-1.5">
                  {f.dot && <StatusDot ok pulse />}
                  <span style={{ color: D.text3 }}>{f.label}</span>
                </div>
                <span style={{ color: f.color, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Event type breakdown */}
        <Card className="p-5">
          <SectionHeader title="Event Type Breakdown (24h)" />
          <div className="space-y-3">
            {t.eventTypes.map(ev => (
              <div key={ev.type}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span style={{ color: D.text2 }}>{ev.type}</span>
                  <div className="flex items-center gap-3">
                    <span style={{ color: D.text3 }}>{ev.count.toLocaleString()} events</span>
                    <span style={{ color: ev.successRate >= 99 ? D.successLight : D.warningLight, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>
                      {ev.successRate}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${ev.successRate}%`, background: ev.successRate >= 99 ? D.success : D.warning }} />
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: D.text3 }}>Avg latency {ev.avgLatencyMs}ms</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Pharmacy roster */}
      <Card className="p-5">
        <SectionHeader title={`Connected Pharmacies (${t.pharmacies.length})`}>
          <button onClick={() => navigate('/admin/integrations')}
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
            Manage integrations <ExternalLink size={9} />
          </button>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: D.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                <TH>Pharmacy</TH>
                <TH>Tatmeen ID</TH>
                <TH>24h Submissions</TH>
                <TH>Success Rate</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {t.pharmacies.map(ph => (
                <TR key={ph.id}>
                  <TD>
                    <div className="text-xs font-semibold" style={{ color: D.text1 }}>{ph.name}</div>
                  </TD>
                  <TD><MonoId value={ph.tatmeenId} /></TD>
                  <TD mono>{ph.submissions24h.toLocaleString()}</TD>
                  <TD>
                    <span style={{ color: ph.successRate >= 99 ? D.successLight : D.warningLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
                      {ph.successRate}%
                    </span>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <StatusDot ok={ph.successRate >= 99} />
                      <span style={{ color: ph.successRate >= 99 ? D.successLight : D.warningLight }}>
                        {ph.successRate >= 99 ? 'Healthy' : 'Degraded'}
                      </span>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* GS1 coverage + controlled substance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionHeader title="GS1 Serialization Coverage" />
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span style={{ color: D.text3 }}>Overall GS1 coverage</span>
              <span style={{ color: t.gs1Coverage >= 99 ? D.successLight : D.warningLight, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>
                {t.gs1Coverage}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
              <div className="h-full rounded-full" style={{ width: `${t.gs1Coverage}%`, background: t.gs1Coverage >= 99 ? D.success : D.warning }} />
            </div>
            <div className="text-[9px] mt-1" style={{ color: D.warningLight }}>
              {(100 - t.gs1Coverage).toFixed(1)}% of drugs lack GS1 barcodes — dispensing blocked for these items
            </div>
          </div>
          <div className="p-3 rounded-xl text-[10px]" style={{ background: D.bg1, border: `1px solid ${D.border}` }}>
            <div className="font-semibold mb-1" style={{ color: D.text2 }}>Hard guardrail</div>
            <div style={{ color: D.text3 }}>Tatmeen connectivity check runs before every dispense. Missing GS1 or failed submission returns 403 — pharmacist must resolve before proceeding.</div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Controlled Substance Quota (Daily)" />
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span style={{ color: D.text3 }}>Used today</span>
              <span style={{ color: D.text1, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>
                {TATMEEN_STATUS.eventTypes[1].count} / {Math.round(TATMEEN_STATUS.eventTypes[1].count / 0.68)} prescriptions
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
              <div className="h-full rounded-full" style={{ width: '68%', background: D.teal }} />
            </div>
            <div className="text-[9px] mt-1" style={{ color: D.text3 }}>68% of daily quota used — resets at midnight GST</div>
          </div>
          <div className="space-y-1.5 text-[10px]">
            {[
              { label: 'Schedule 1 (Narcotic)', used: 12, limit: 20, color: '#F87171' },
              { label: 'Schedule 3 (Psychotropic)', used: 28, limit: 50, color: D.warningLight },
              { label: 'Schedule 4 (Controlled)', used: 180, limit: 300, color: D.blueLight },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                <span style={{ color: D.text3 }}>{s.label}</span>
                <span style={{ color: s.color, fontFamily: 'DM Mono, monospace' }}>{s.used} / {s.limit}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
