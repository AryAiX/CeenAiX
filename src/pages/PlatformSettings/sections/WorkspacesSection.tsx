import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, LockNote } from '../primitives';

export default function WorkspacesSection() {
  const [defaultTier, setDefaultTier] = useState('pilot');
  const [defaultRegion, setDefaultRegion] = useState('uae');
  const [nabidh, setNabidh] = useState(true);
  const [tatmeen, setTatmeen] = useState(true);
  const [inheritBranding, setInheritBranding] = useState(true);

  const [trialDays, setTrialDays] = useState(30);
  const [graceDays, setGraceDays] = useState(14);
  const [exportWindowDays, setExportWindowDays] = useState(90);
  const [archivalDays, setArchivalDays] = useState(30);

  const [crossWsSearch, setCrossWsSearch] = useState(false);
  const [crossWsExport, setCrossWsExport] = useState(false);
  const [perTenantKms, setPerTenantKms] = useState(false);

  const [applyToExisting, setApplyToExisting] = useState(false);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  const tierMatrix = [
    { tier: 'Pilot', users: 50, patients: 1000, storage: '50 GB', api: '1k/day', ai: '500k tokens/mo' },
    { tier: 'Growth', users: 500, patients: 25000, storage: '500 GB', api: '10k/day', ai: '5M tokens/mo' },
    { tier: 'Enterprise', users: 'Unlimited', patients: 'Unlimited', storage: '5 TB', api: '100k/day', ai: '50M tokens/mo' },
  ];

  return (
    <div>
      <SectionHeader
        title="Workspace Defaults"
        description="Default settings applied to every new workspace on creation."
      />
      <SettingCard title="Creation defaults" scope="New workspaces" dirty={dirty}>
        <SelectRow
          label="Default tier on creation"
          value={defaultTier}
          options={[
            { value: 'pilot', label: 'Pilot' },
            { value: 'growth', label: 'Growth' },
            { value: 'enterprise', label: 'Enterprise' },
          ]}
          onChange={v => { setDefaultTier(v); mark(); }}
        />
        <SelectRow
          label="Default region binding"
          value={defaultRegion}
          options={[
            { value: 'uae', label: 'UAE' },
            { value: 'ksa', label: 'KSA' },
            { value: 'gcc', label: 'GCC Multi-region' },
          ]}
          onChange={v => { setDefaultRegion(v); mark(); }}
        />
        <ToggleRow label="Inherit platform branding" desc="New workspaces inherit platform branding by default; can be overridden if whitelabeling is enabled." value={inheritBranding} onChange={v => { setInheritBranding(v); mark(); }} />
      </SettingCard>
      <SettingCard title="Default integrations at creation" scope="New workspaces" dirty={dirty}>
        <ToggleRow label="NABIDH" desc="Enable NABIDH integration for all new UAE workspaces." value={nabidh} onChange={v => { setNabidh(v); mark(); }} />
        <ToggleRow label="Tatmeen" desc="Enable Tatmeen pharmacy integration." value={tatmeen} onChange={v => { setTatmeen(v); mark(); }} />
        <ToggleRow label="Apply changes to existing workspaces" desc="When enabled, existing workspaces will have these defaults applied on next sync." value={applyToExisting} onChange={v => { setApplyToExisting(v); mark(); }} />
      </SettingCard>

      <SectionHeader
        title="Workspace Lifecycle"
        description="Trial periods, suspension, archival, and data export windows."
      />
      <SettingCard title="Trial & grace periods" scope="Platform-wide" dirty={dirty}>
        <NumberRow label="Trial duration" value={trialDays} onChange={v => { setTrialDays(v); mark(); }} min={1} suffix="days" />
        <NumberRow label="Grace period (unpaid)" desc="Days before suspension after payment failure." value={graceDays} onChange={v => { setGraceDays(v); mark(); }} min={0} suffix="days" />
        <NumberRow label="Archival schedule" desc="Days after suspension before data archival begins." value={archivalDays} onChange={v => { setArchivalDays(v); mark(); }} min={1} suffix="days" />
        <NumberRow label="Data export window post-archival" desc="Window after archival for workspace owner to export data." value={exportWindowDays} onChange={v => { setExportWindowDays(v); mark(); }} min={30} suffix="days" />
      </SettingCard>
      <SettingCard title="Hard-delete policy" scope="Clinical records" locked>
        <div className="py-2">
          <div style={{ fontSize: 13, color: '#E2E8F0' }}>Clinical records minimum retention</div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>7 years (DHA minimum)</div>
        </div>
        <LockNote text="Minimum retention cannot be reduced below DHA and HIPAA regulatory minimums in production." />
      </SettingCard>

      <SectionHeader
        title="Workspace Tiers & Limits"
        description="Per-tier matrix of resource limits and SLA. Production changes require two-person approval."
      />
      <SettingCard title="Tier matrix" scope="All workspaces" requiresApproval dirty={dirty}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['Tier', 'Max Users', 'Max Patients', 'Storage', 'API Rate', 'AI Quota'].map(h => (
                  <th key={h} className="text-left pb-3 pr-4" style={{ color: '#64748B', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tierMatrix.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(51,65,85,0.3)' }}>
                  <td className="py-2.5 pr-4 font-medium" style={{ color: '#E2E8F0' }}>{row.tier}</td>
                  <td className="py-2.5 pr-4" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{row.users}</td>
                  <td className="py-2.5 pr-4" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{row.patients}</td>
                  <td className="py-2.5 pr-4" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{row.storage}</td>
                  <td className="py-2.5 pr-4" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{row.api}</td>
                  <td className="py-2.5" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{row.ai}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <LockNote text="Tier limit reductions on production require password re-entry and two-person approval." />
      </SettingCard>

      <SectionHeader
        title="Tenant Isolation Policy"
        description="Cross-workspace data access, search, export, and encryption key policies."
      />
      <SettingCard title="Cross-workspace controls" scope="Production (locked)" dirty={dirty}>
        <ToggleRow label="Cross-workspace search" desc="Locked off in production by default. Requires system:configure to enable." value={crossWsSearch} onChange={v => { setCrossWsSearch(v); mark(); }} locked />
        <ToggleRow label="Cross-workspace data export" desc="Allow super admins to export data across workspace boundaries." value={crossWsExport} onChange={v => { setCrossWsExport(v); mark(); }} />
        <ToggleRow label="Per-workspace KMS keys" desc="Provision tenant-scoped encryption keys for each workspace. Increases isolation." value={perTenantKms} onChange={v => { setPerTenantKms(v); mark(); }} />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} requiresApproval />
    </div>
  );
}
