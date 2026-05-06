import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, CrossLinkBanner, LockNote, Chip } from '../primitives';
import { ShieldCheck, Globe } from 'lucide-react';

const frameworks = [
  { id: 'dha', label: 'DHA (Dubai Health Authority)', region: 'UAE', active: true, locked: true },
  { id: 'nabidh', label: 'NABIDH', region: 'UAE', active: true, locked: true },
  { id: 'pdpl', label: 'UAE PDPL', region: 'UAE', active: true, locked: true },
  { id: 'hipaa', label: 'HIPAA', region: 'Global', active: true, locked: false },
  { id: 'iso27001', label: 'ISO 27001', region: 'Global', active: true, locked: false },
  { id: 'soc2', label: 'SOC 2 Type II', region: 'Global', active: true, locked: false },
  { id: 'gdpr', label: 'GDPR', region: 'EU/Global', active: false, locked: false },
];

const dataCategories = [
  { cat: 'Clinical records (PHI)', residency: 'UAE', locked: true },
  { cat: 'Lab & imaging data', residency: 'UAE', locked: true },
  { cat: 'Insurance & claims', residency: 'UAE', locked: true },
  { cat: 'Audit logs', residency: 'UAE', locked: true },
  { cat: 'Analytics (anonymized)', residency: 'GCC', locked: false },
  { cat: 'Product telemetry', residency: 'Global', locked: false },
];

const retentionCategories = [
  { cat: 'Clinical records', min: '7 years (DHA)', current: 10, locked: true },
  { cat: 'Prescriptions', min: '7 years (DHA)', current: 10, locked: true },
  { cat: 'Audit logs', min: '5 years', current: 7, locked: false },
  { cat: 'Insurance claims', min: '5 years', current: 7, locked: false },
  { cat: 'Session logs', min: '1 year', current: 2, locked: false },
];

export default function RegulatorySection() {
  const [crossBorderApproval, setCrossBorderApproval] = useState(true);
  const [legalHold, setLegalHold] = useState(true);
  const [cryptoErasure, setCryptoErasure] = useState(true);
  const [consentReVerify, setConsentReVerify] = useState(true);
  const [phiRevealReason, setPhiRevealReason] = useState(true);
  const [fieldEncryption, setFieldEncryption] = useState(true);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      <CrossLinkBanner
        message="Per-framework detailed controls, NABIDH sync, and inspection history live in DHA Compliance."
        href="/admin/compliance/dha"
        label="Open DHA Compliance"
      />
      <CrossLinkBanner
        message="Audit settings, evidence chain, and SIEM forwarding configuration live in Audit."
        href="/admin/audit"
        label="Open Audit settings"
      />

      <SectionHeader
        title="Regulatory Frameworks Active"
        description="Toggles for active compliance frameworks. UAE regulatory minimums are locked on in production."
      />
      <SettingCard title="Active frameworks" scope="Platform-wide — Production" dirty={dirty}>
        <div className="space-y-0">
          {frameworks.map(f => (
            <div key={f.id} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={13} color={f.active ? '#0D9488' : '#475569'} />
                <div>
                  <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>{f.label}</div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>{f.region}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {f.locked && <Chip label="Mandatory" color="red" />}
                <button
                  onClick={() => !f.locked && mark()}
                  className="relative flex-shrink-0 rounded-full transition-colors"
                  style={{ width: 40, height: 22, background: f.active ? '#0D9488' : 'rgba(51,65,85,0.6)', opacity: f.locked ? 0.8 : 1 }}
                  disabled={f.locked}
                >
                  <div className="absolute top-1 rounded-full bg-white transition-all" style={{ width: 14, height: 14, left: f.active ? 22 : 4 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <LockNote text="UAE-mandated frameworks (DHA, NABIDH, UAE PDPL) cannot be disabled in production." />
      </SettingCard>

      <SectionHeader
        title="Data Residency & Cross-Border"
        description="Where each data category is stored. Clinical data is locked to UAE in production."
      />
      <SettingCard title="Residency by data category" scope="Production (partially locked)" dirty={dirty}>
        <div className="space-y-0">
          {dataCategories.map(d => (
            <div key={d.cat} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
              <div className="flex items-center gap-2">
                <Globe size={12} color="#64748B" />
                <span style={{ fontSize: 13, color: '#E2E8F0' }}>{d.cat}</span>
              </div>
              <div className="flex items-center gap-2">
                {d.locked
                  ? <><Chip label={d.residency} color="teal" /><Chip label="Locked" color="red" /></>
                  : <SelectRow label="" value={d.residency} options={[{ value: 'UAE', label: 'UAE' }, { value: 'GCC', label: 'GCC' }, { value: 'Global', label: 'Global' }]} onChange={() => mark()} />
                }
              </div>
            </div>
          ))}
        </div>
        <ToggleRow label="Cross-border transfer requires approval workflow" value={crossBorderApproval} onChange={v => { setCrossBorderApproval(v); mark(); }} locked />
        <LockNote text="Clinical, lab, and regulatory data residency is locked to UAE in production. Expanding requires DPIA + legal attestation upload." />
      </SettingCard>

      <SectionHeader
        title="Retention Defaults"
        description="Per-category retention periods. Cannot be reduced below regulatory minimums in production."
      />
      <SettingCard title="Retention schedule" scope="All workspaces" dirty={dirty}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {['Category', 'Regulatory Min', 'Platform Default', ''].map(h => (
                  <th key={h} className="text-left pb-3 pr-4" style={{ color: '#64748B', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retentionCategories.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(51,65,85,0.3)' }}>
                  <td className="py-2.5 pr-4" style={{ color: '#E2E8F0' }}>{r.cat}</td>
                  <td className="py-2.5 pr-4" style={{ color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{r.min}</td>
                  <td className="py-2.5 pr-4" style={{ color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{r.current} yr</td>
                  <td className="py-2.5">{r.locked ? <Chip label="Locked" color="red" /> : <Chip label="Editable" color="teal" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ToggleRow label="Legal-hold suspends all disposition" desc="When legal hold is active, no records are disposed regardless of retention schedule." value={legalHold} onChange={v => { setLegalHold(v); mark(); }} />
        <SelectRow
          label="Disposal method"
          value="crypto"
          options={[
            { value: 'crypto', label: 'Cryptographic erasure' },
            { value: 'destruction', label: 'Record destruction with certificate' },
          ]}
          onChange={() => mark()}
        />
      </SettingCard>

      <SectionHeader
        title="Consent Framework Defaults"
        description="Required consents at registration, re-verification cadence, and withdrawal propagation."
      />
      <SettingCard title="Consent controls" scope="All portals" dirty={dirty}>
        <ToggleRow label="Consent re-verification on profile change" desc="Re-prompt consent when patient updates identity or insurance details." value={consentReVerify} onChange={v => { setConsentReVerify(v); mark(); }} />
        <SelectRow
          label="Consent re-verification cadence"
          value="annual"
          options={[
            { value: 'annual', label: 'Annual' },
            { value: 'biannual', label: 'Every 2 years' },
            { value: 'never', label: 'Never (one-time)' },
          ]}
          onChange={() => mark()}
        />
        <ToggleRow label="Withdrawal propagates to all connected systems" desc="When a patient withdraws consent, downstream NABIDH / insurance integrations are notified." value={true} onChange={() => {}} locked />
      </SettingCard>

      <SectionHeader
        title="PHI Handling Defaults"
        description="Field-level encryption, redaction rules, and reveal-PHI permission policy."
      />
      <SettingCard title="PHI policy" scope="All portals" dirty={dirty}>
        <ToggleRow label="Field-level encryption for clinical data" value={fieldEncryption} onChange={() => {}} locked />
        <ToggleRow label="Reason capture required on PHI reveal" desc="Admins must enter a business justification before viewing unredacted PHI." value={phiRevealReason} onChange={v => { setPhiRevealReason(v); mark(); }} />
        <ToggleRow label="PHI redaction in support tickets" desc="PII is automatically redacted when admins export data for support channels." value={true} onChange={() => {}} locked />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} requiresApproval />
    </div>
  );
}
