import { useState } from 'react';
import { NABIDH_CONFIG } from '../../data/nabidhData';
import { N, Card, SectionHeader } from './NabidhPrimitives';

export function ConfigTab() {
  const [config, setConfig] = useState(NABIDH_CONFIG);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Danger banner */}
      <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: N.warningBg, border: `1px solid rgba(217,119,6,0.3)` }}>
        <div className="text-[10px]" style={{ color: N.warningLight }}>
          <span className="font-semibold">Configuration changes require nabidh:configure permission</span> and are subject to two-person approval for production environment. All changes are audit-logged.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Connection settings */}
        <Card className="p-5">
          <SectionHeader title="Connection Settings" />
          <div className="space-y-4">
            {[
              { label: 'FHIR Base URL', value: config.baseUrl, key: 'baseUrl' },
              { label: 'Facility Code', value: config.facilityCode, key: 'facilityCode' },
              { label: 'FHIR Version', value: config.fhirVersion, key: 'fhirVersion' },
              { label: 'Environment', value: config.environment, key: 'environment' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[9px] uppercase tracking-wider block mb-1.5" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>{f.label}</label>
                <input readOnly value={f.value} className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: N.bg1, border: `1px solid ${N.border}`, color: N.text2, fontFamily: 'DM Mono, monospace' }} />
              </div>
            ))}
          </div>
        </Card>

        {/* Retry policy */}
        <Card className="p-5">
          <SectionHeader title="Retry Policy" />
          <div className="space-y-4">
            <div>
              <label className="text-[9px] uppercase tracking-wider block mb-1.5" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>Max Attempts</label>
              <input type="number" value={config.retryPolicy.maxAttempts}
                onChange={e => setConfig(c => ({ ...c, retryPolicy: { ...c.retryPolicy, maxAttempts: +e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: N.bg1, border: `1px solid ${N.border}`, color: N.text1, fontFamily: 'DM Mono, monospace' }} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider block mb-1.5" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>Timeout (seconds)</label>
              <input type="number" value={config.retryPolicy.timeoutSeconds}
                onChange={e => setConfig(c => ({ ...c, retryPolicy: { ...c.retryPolicy, timeoutSeconds: +e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: N.bg1, border: `1px solid ${N.border}`, color: N.text1, fontFamily: 'DM Mono, monospace' }} />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider block mb-1.5" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>Backoff Sequence (seconds)</label>
              <div className="flex gap-2 flex-wrap">
                {config.retryPolicy.backoffSeconds.map((v, i) => (
                  <div key={i} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: N.bg1, border: `1px solid ${N.border}`, color: N.tealLight, fontFamily: 'DM Mono, monospace' }}>{v}s</div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Rate limits */}
        <Card className="p-5">
          <SectionHeader title="Rate Limits" />
          <div className="space-y-4">
            {[
              { label: 'Requests per minute', value: config.rateLimits.requestsPerMinute },
              { label: 'Requests per hour', value: config.rateLimits.requestsPerHour },
              { label: 'Burst size', value: config.rateLimits.burstSize },
            ].map(f => (
              <div key={f.label}>
                <label className="text-[9px] uppercase tracking-wider block mb-1.5" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>{f.label}</label>
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: N.bg1, border: `1px solid ${N.border}`, color: N.tealLight, fontFamily: 'DM Mono, monospace' }}>{f.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* PHI & Security */}
        <Card className="p-5">
          <SectionHeader title="PHI & Security Settings" />
          <div className="space-y-4">
            {[
              { label: 'PHI Redaction Enabled', value: config.phiRedaction.enabled, desc: 'Redact PHI from logs and UI by default' },
              { label: 'Dual Approval for PHI Reveal', value: config.phiRedaction.revealRequiresDualApproval, desc: 'Require two-person sign-off to reveal PHI' },
              { label: 'Log All PHI Reveals', value: config.phiRedaction.logAllReveals, desc: 'Audit log every PHI access event' },
            ].map(f => (
              <div key={f.label} className="flex items-center justify-between p-3 rounded-lg" style={{ background: N.bg1, border: `1px solid ${N.border}` }}>
                <div>
                  <div className="text-xs font-semibold" style={{ color: N.text1 }}>{f.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: N.text3 }}>{f.desc}</div>
                </div>
                <div className="w-8 h-4 rounded-full flex-shrink-0 flex items-center px-0.5 transition-colors"
                  style={{ background: f.value ? N.teal : N.bg3, justifyContent: f.value ? 'flex-end' : 'flex-start' }}>
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alert thresholds */}
      <Card className="p-5">
        <SectionHeader title="Alert Thresholds" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(config.alertThresholds).map(([key, value]) => (
            <div key={key} className="p-3 rounded-lg" style={{ background: N.bg1, border: `1px solid ${N.border}` }}>
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="text-sm font-semibold" style={{ color: key.includes('Critical') ? N.errorLight : N.warningLight, fontFamily: 'DM Mono, monospace' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <button className="text-xs px-4 py-2 rounded-lg" style={{ background: N.bg2, color: N.text2, border: `1px solid ${N.border}` }}>
          Discard Changes
        </button>
        <button onClick={handleSave} className="text-xs px-4 py-2 rounded-lg font-semibold transition-all"
          style={{ background: saved ? N.successBg : N.tealBg, color: saved ? N.successLight : N.tealLight, border: `1px solid ${saved ? 'rgba(5,150,105,0.3)' : N.tealBorder}` }}>
          {saved ? 'Saved!' : 'Save Changes (requires approval)'}
        </button>
      </div>
    </div>
  );
}
