import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, CrossLinkBanner, Chip } from '../primitives';

const rateLimits = [
  { tier: 'Pilot', rpm: 100, rph: 1000, burst: 20 },
  { tier: 'Growth', rpm: 1000, rph: 20000, burst: 200 },
  { tier: 'Enterprise', rpm: 10000, rph: 500000, burst: 2000 },
];

export default function DeveloperSection() {
  const [keyTtl, setKeyTtl] = useState(90);
  const [keyRotation, setKeyRotation] = useState(90);
  const [oauthApproval, setOauthApproval] = useState('manual');
  const [apiVersion, setApiVersion] = useState('v2');
  const [autoSandbox, setAutoSandbox] = useState(true);
  const [sandboxResetDays, setSandboxResetDays] = useState(7);
  const [docsPubPolicy, setDocsPubPolicy] = useState('immediate');

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      <CrossLinkBanner
        message="Per-integration OAuth clients and API key management live in Integrations."
        href="/admin/integrations"
        label="Open Integrations"
      />

      <SectionHeader
        title="API Keys & OAuth Defaults"
        description="Default key TTL, rotation cadence, and OAuth client registration policy."
      />
      <SettingCard title="API key policy" scope="All workspaces" dirty={dirty}>
        <NumberRow label="Default API key TTL" value={keyTtl} onChange={v => { setKeyTtl(v); mark(); }} min={1} suffix="days" />
        <NumberRow label="Rotation cadence" desc="Notify workspace admins to rotate keys after this period." value={keyRotation} onChange={v => { setKeyRotation(v); mark(); }} min={30} suffix="days" />
        <SelectRow
          label="OAuth client registration approval"
          value={oauthApproval}
          options={[
            { value: 'manual', label: 'Manual review required' },
            { value: 'auto-internal', label: 'Auto-approve (internal clients only)' },
          ]}
          onChange={v => { setOauthApproval(v); mark(); }}
        />
      </SettingCard>

      <SectionHeader
        title="Rate Limits"
        description="Per-tier rate limit matrix. Per-route overrides are configurable in Integrations."
      />
      <SettingCard title="Rate limit matrix" scope="All API consumers" dirty={dirty}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {['Tier', 'Requests/min', 'Requests/hour', 'Burst allowance'].map(h => (
                  <th key={h} className="text-left pb-3 pr-4" style={{ color: '#64748B', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rateLimits.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(51,65,85,0.3)' }}>
                  <td className="py-2.5 pr-4 font-medium" style={{ color: '#E2E8F0' }}>{r.tier}</td>
                  <td className="py-2.5 pr-4" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{r.rpm}</td>
                  <td className="py-2.5 pr-4" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{r.rph}</td>
                  <td className="py-2.5" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{r.burst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingCard>

      <SectionHeader
        title="Public API Documentation"
        description="API versioning policy, deprecation schedule, and documentation publication."
      />
      <SettingCard title="API versioning" scope="Public API" dirty={dirty}>
        <SelectRow
          label="Current stable version"
          value={apiVersion}
          options={[
            { value: 'v1', label: 'v1 (deprecated)' },
            { value: 'v2', label: 'v2 (stable)' },
            { value: 'v3-beta', label: 'v3-beta' },
          ]}
          onChange={v => { setApiVersion(v); mark(); }}
        />
        <SelectRow
          label="Changelog publication"
          value={docsPubPolicy}
          options={[
            { value: 'immediate', label: 'Publish immediately on release' },
            { value: 'manual', label: 'Manual publish' },
          ]}
          onChange={v => { setDocsPubPolicy(v); mark(); }}
        />
        <div className="flex items-center justify-between py-3 border-t" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          <div>
            <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>v1 sunset date</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Sunset notifications sent 90 days before</div>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#F59E0B' }}>2026-12-31</span>
        </div>
      </SettingCard>

      <SectionHeader
        title="Sandbox Provisioning"
        description="Auto-provisioning of developer sandbox workspaces with synthetic, PHI-free data."
      />
      <SettingCard title="Sandbox configuration" scope="Developer tier" dirty={dirty}>
        <ToggleRow label="Auto-provision sandbox workspace for developers" value={autoSandbox} onChange={v => { setAutoSandbox(v); mark(); }} />
        <NumberRow label="Sandbox reset cadence" desc="Automatically reset to baseline seed data every N days." value={sandboxResetDays} onChange={v => { setSandboxResetDays(v); mark(); }} min={1} suffix="days" />
        <ToggleRow label="PHI-free synthetic data generators only" desc="Sandbox data generation is restricted to non-PHI synthetic generators." value={true} onChange={() => {}} locked />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} />
    </div>
  );
}
