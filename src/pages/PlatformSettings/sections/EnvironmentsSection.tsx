import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, SectionFooter, LockNote, Chip } from '../primitives';
import { Server, GitMerge, Download, Upload, AlertTriangle } from 'lucide-react';

const environments = [
  {
    name: 'Production',
    status: 'healthy',
    region: 'UAE (AE-NORTH)',
    configVersion: 'v412',
    lastSync: null,
    seeded: null,
  },
  {
    name: 'Staging',
    status: 'healthy',
    region: 'UAE (AE-NORTH)',
    configVersion: 'v408',
    lastSync: '2026-04-30T14:22:00Z',
    seeded: 'v3.1',
  },
  {
    name: 'Sandbox',
    status: 'healthy',
    region: 'UAE (AE-NORTH)',
    configVersion: 'v395',
    lastSync: '2026-04-28T09:00:00Z',
    seeded: 'v3.0',
  },
];

export default function EnvironmentsSection() {
  const [promotionApprovals, setPromotionApprovals] = useState(2);
  const [diffRequired, setDiffRequired] = useState(true);
  const [autoExportSigned, setAutoExportSigned] = useState(true);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      <SectionHeader
        title="Environment Registry"
        description="Production, Staging, and Sandbox environments. Registry editing requires system:configure and is fully audited."
      />
      <SettingCard title="Registered environments" scope="Platform-wide">
        <div
          className="rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2"
          style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid rgba(13,148,136,0.2)' }}
        >
          <AlertTriangle size={12} color="#0D9488" />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>Environment registry editing requires <span style={{ fontFamily: 'DM Mono, monospace', color: '#2DD4BF' }}>system:configure</span> and is fully audited.</span>
        </div>
        <div className="space-y-2">
          {environments.map(env => (
            <div
              key={env.name}
              className="rounded-lg p-4"
              style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.5)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Server size={14} color="#64748B" />
                  <span style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 600 }}>{env.name}</span>
                  <Chip label={env.status} color="green" />
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{env.configVersion}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div style={{ fontSize: 10, color: '#475569' }}>Region</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{env.region}</div>
                </div>
                {env.lastSync && (
                  <div>
                    <div style={{ fontSize: 10, color: '#475569' }}>Last sync from Production</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{new Date(env.lastSync).toLocaleDateString()}</div>
                  </div>
                )}
                {env.seeded && (
                  <div>
                    <div style={{ fontSize: 10, color: '#475569' }}>Seeded data version</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{env.seeded}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </SettingCard>

      <SectionHeader
        title="Promotion Policy"
        description="Configuration promotion path from Sandbox → Staging → Production."
      />
      <SettingCard title="Promotion gates" scope="All environments" dirty={dirty}>
        <div className="flex items-center gap-3 py-3 mb-3" style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
          <div className="flex items-center gap-2">
            <Chip label="Sandbox" color="slate" />
            <span style={{ color: '#475569', fontSize: 12 }}>→</span>
            <Chip label="Staging" color="blue" />
            <span style={{ color: '#475569', fontSize: 12 }}>→</span>
            <Chip label="Production" color="teal" />
          </div>
        </div>
        <SelectRow
          label="Required approvals per promotion gate"
          value={String(promotionApprovals)}
          options={[
            { value: '1', label: '1 approver' },
            { value: '2', label: '2 approvers (recommended)' },
            { value: '3', label: '3 approvers' },
          ]}
          onChange={v => { setPromotionApprovals(Number(v)); mark(); }}
        />
        <ToggleRow label="Diff review required before production promotion" desc="Admins must review and acknowledge a config diff before promoting to production." value={diffRequired} onChange={v => { setDiffRequired(v); mark(); }} />
        <LockNote text="Production promotions are always fully audited and require password re-entry." />
      </SettingCard>

      <SectionHeader
        title="Configuration Export / Import"
        description="Export signed configuration bundles and import with interactive review and approval."
      />
      <SettingCard title="Export configuration" scope="All environments" description="Exports a signed, encrypted bundle of the full platform configuration.">
        <div className="flex gap-2 mt-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80" style={{ background: 'rgba(13,148,136,0.15)', color: '#2DD4BF', border: '1px solid rgba(13,148,136,0.3)' }}>
            <Download size={13} />
            Export Production config
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80" style={{ background: 'rgba(51,65,85,0.3)', color: '#94A3B8', border: '1px solid rgba(51,65,85,0.5)' }}>
            <Download size={13} />
            Export Staging config
          </button>
        </div>
        <ToggleRow label="Auto-sign export bundles" desc="Exported bundles are cryptographically signed with the platform signing key." value={autoExportSigned} onChange={v => { setAutoExportSigned(v); mark(); }} />
      </SettingCard>
      <SettingCard title="Import configuration" scope="Production requires approval" description="Upload a configuration bundle for review and publish. Always requires interactive review.">
        <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-teal-600 transition-colors" style={{ borderColor: 'rgba(51,65,85,0.6)' }}>
          <Upload size={20} color="#64748B" />
          <span style={{ fontSize: 12, color: '#64748B' }}>Drop a signed .ceenaix-config bundle here, or click to browse</span>
        </div>
        <LockNote text="Configuration import always requires interactive diff review and two-person approval before applying. Auto-import is not permitted." />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} requiresApproval />
    </div>
  );
}
