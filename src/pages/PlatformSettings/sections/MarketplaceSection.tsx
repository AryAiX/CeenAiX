import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, SectionFooter, LockNote, Chip } from '../primitives';

export default function MarketplaceSection() {
  const [catalogPilot, setCatalogPilot] = useState(false);
  const [catalogGrowth, setCatalogGrowth] = useState(true);
  const [catalogEnterprise, setCatalogEnterprise] = useState(true);
  const [clinicalConnectorApproval, setClinicalConnectorApproval] = useState(true);
  const [submissionReview, setSubmissionReview] = useState('manual');
  const [vendorRenewal, setVendorRenewal] = useState('annual');
  const [subprocessorDisclosure, setSubprocessorDisclosure] = useState(true);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  const requiredArtifacts = [
    'Security review report',
    'Compliance review (DHA / HIPAA attestation)',
    'BAA / DPA executed',
    'Data flow diagram',
    'Penetration test summary',
  ];

  return (
    <div>
      <SectionHeader
        title="Connector Marketplace"
        description="Catalog visibility per workspace tier and default availability of new connectors."
      />
      <SettingCard title="Catalog visibility by tier" scope="Workspace marketplace" dirty={dirty}>
        <ToggleRow label="Marketplace visible — Pilot tier" desc="Pilot workspaces have limited connector access." value={catalogPilot} onChange={v => { setCatalogPilot(v); mark(); }} />
        <ToggleRow label="Marketplace visible — Growth tier" value={catalogGrowth} onChange={v => { setCatalogGrowth(v); mark(); }} />
        <ToggleRow label="Marketplace visible — Enterprise tier" value={catalogEnterprise} onChange={v => { setCatalogEnterprise(v); mark(); }} />
        <ToggleRow
          label="Clinical-data connectors require manual approval"
          desc="Any connector that accesses clinical data requires explicit platform approval before workspace activation."
          value={clinicalConnectorApproval}
          onChange={() => {}}
          locked
        />
      </SettingCard>

      <SectionHeader
        title="App Approval Workflow"
        description="Steps and required artifacts for third-party app and connector submissions."
      />
      <SettingCard title="Submission requirements" scope="All third-party apps" dirty={dirty}>
        <SelectRow
          label="Review type"
          value={submissionReview}
          options={[
            { value: 'manual', label: 'Manual review (required for clinical apps)' },
            { value: 'auto-nonclinical', label: 'Auto-approve non-clinical apps' },
          ]}
          onChange={v => { setSubmissionReview(v); mark(); }}
        />
        <div className="mt-3">
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Required artifacts for clinical-data apps:</div>
          <div className="space-y-1.5">
            {requiredArtifacts.map(a => (
              <div key={a} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.4)' }}>
                <div className="rounded-full" style={{ width: 6, height: 6, background: '#0D9488', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#E2E8F0' }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
        <LockNote text="Clinical-data app approvals require platform:settings:edit:marketplace and sign-off from compliance." />
      </SettingCard>

      <SectionHeader
        title="Vendor Risk Policy"
        description="Vendor risk classification, renewal cadence, and sub-processor disclosure requirements."
      />
      <SettingCard title="Vendor governance" scope="All third-party vendors" dirty={dirty}>
        <SelectRow
          label="Vendor risk renewal cadence"
          value={vendorRenewal}
          options={[
            { value: 'annual', label: 'Annual' },
            { value: 'biannual', label: 'Every 2 years' },
          ]}
          onChange={v => { setVendorRenewal(v); mark(); }}
        />
        <ToggleRow
          label="Sub-processor disclosure required"
          desc="Vendors must disclose all sub-processors before approval."
          value={subprocessorDisclosure}
          onChange={v => { setSubprocessorDisclosure(v); mark(); }}
        />
        <div className="mt-3 py-2" style={{ borderTop: '1px solid rgba(51,65,85,0.3)' }}>
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>Risk classification tiers:</div>
          <div className="flex flex-wrap gap-2">
            <Chip label="Critical (PHI access)" color="red" />
            <Chip label="High (infrastructure)" color="amber" />
            <Chip label="Medium (analytics)" color="blue" />
            <Chip label="Low (utilities)" color="slate" />
          </div>
        </div>
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} />
    </div>
  );
}
