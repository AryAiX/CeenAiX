import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, CrossLinkBanner, LockNote } from '../primitives';

export default function IntegrationsSection() {
  const [retryCount, setRetryCount] = useState(3);
  const [timeout, setTimeout] = useState(30);
  const [certRotation, setCertRotation] = useState(30);
  const [signingAlgo, setSigningAlgo] = useState('hmac-sha256');
  const [secretRotation, setSecretRotation] = useState(90);
  const [maxPayload, setMaxPayload] = useState(1);
  const [replayProtection, setReplayProtection] = useState(true);
  const [ipAllowlist, setIpAllowlist] = useState(true);
  const [mtlsRequired, setMtlsRequired] = useState(true);
  const [regionalEgress, setRegionalEgress] = useState(true);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  const allowedDomains = ['*.dha.gov.ae', '*.nabidh.ae', '*.tatmeen.ae', '*.haad.ae', 'api.stripe.com', 'api.anthropic.com'];

  return (
    <div>
      <CrossLinkBanner
        message="Per-integration configuration, connection health, and individual API credentials live in Integrations."
        href="/admin/integrations"
        label="Open Integrations"
      />

      <SectionHeader
        title="Integration Defaults"
        description="Default retry, timeout, certificate, and dead-letter behavior across all integrations."
      />
      <SettingCard title="Retry & timeout policy" scope="All integrations" dirty={dirty}>
        <NumberRow label="Default retry count" value={retryCount} onChange={v => { setRetryCount(v); mark(); }} min={0} max={10} suffix="attempts" />
        <NumberRow label="Default request timeout" value={timeout} onChange={v => { setTimeout(v); mark(); }} min={5} suffix="seconds" />
        <NumberRow label="Certificate rotation grace window" desc="Days before expiry that rotation alerts are triggered." value={certRotation} onChange={v => { setCertRotation(v); mark(); }} min={7} suffix="days" />
      </SettingCard>

      <SectionHeader
        title="Webhook & Event Bus"
        description="Internal event bus topics, webhook signing, and inbound/outbound webhook configuration."
      />
      <SettingCard title="Webhook signing" scope="All webhooks" dirty={dirty}>
        <SelectRow
          label="Signing algorithm"
          value={signingAlgo}
          options={[
            { value: 'hmac-sha256', label: 'HMAC-SHA256' },
            { value: 'hmac-sha512', label: 'HMAC-SHA512' },
            { value: 'rsa-pss', label: 'RSA-PSS' },
          ]}
          onChange={v => { setSigningAlgo(v); mark(); }}
        />
        <NumberRow label="Secret rotation cadence" value={secretRotation} onChange={v => { setSecretRotation(v); mark(); }} min={30} suffix="days" />
        <ToggleRow label="Inbound replay protection" desc="Reject webhook deliveries with duplicate event IDs within 5-minute window." value={replayProtection} onChange={v => { setReplayProtection(v); mark(); }} />
        <ToggleRow label="Inbound IP allowlist enforcement" desc="Only accept webhooks from known sender IP ranges." value={ipAllowlist} onChange={v => { setIpAllowlist(v); mark(); }} />
        <NumberRow label="Max outbound payload size" value={maxPayload} onChange={v => { setMaxPayload(v); mark(); }} min={0} suffix="MB" />
      </SettingCard>

      <SectionHeader
        title="Outbound Network Policy"
        description="Egress domain allowlist, mTLS requirements, and regional egress pinning."
      />
      <SettingCard title="Egress controls" scope="Production" dirty={dirty}>
        <ToggleRow label="mTLS required for clinical data integrations" value={mtlsRequired} onChange={() => {}} locked />
        <ToggleRow label="Region-pinned egress for clinical data" desc="Clinical data integrations must egress through UAE-region nodes." value={regionalEgress} onChange={() => {}} locked />
      </SettingCard>
      <SettingCard title="Allowed egress domains" scope="Production" description="Clinical data integrations are limited to these approved destinations.">
        <div className="space-y-1.5 mb-3">
          {allowedDomains.map(d => (
            <div key={d} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.5)' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#94A3B8' }}>{d}</span>
              <button className="text-xs hover:opacity-80" style={{ color: '#EF4444' }}>Remove</button>
            </div>
          ))}
        </div>
        <button className="w-full py-2 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity" style={{ background: 'rgba(13,148,136,0.1)', color: '#2DD4BF', border: '1px solid rgba(13,148,136,0.25)' }}>
          + Add allowed domain
        </button>
        <LockNote text="Domain additions for clinical-data integrations require platform:settings:edit:integrations and two-person approval." />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} />
    </div>
  );
}
