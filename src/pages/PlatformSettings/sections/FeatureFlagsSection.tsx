import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, LockNote, Chip } from '../primitives';
import { Flag, FlaskConical, AlertTriangle } from 'lucide-react';

const flags = [
  { key: 'patient.ai-symptom-checker', desc: 'AI symptom checker on patient portal', prod: true, staging: true, sandbox: true, rollout: 100, stale: false },
  { key: 'doctor.ai-scribe', desc: 'AI clinical note dictation and auto-fill', prod: false, staging: true, sandbox: true, rollout: 0, stale: false },
  { key: 'pharmacy.refill-auto-approve', desc: 'Auto-approve refills within policy', prod: true, staging: true, sandbox: true, rollout: 80, stale: false },
  { key: 'lab.critical-alert-sms', desc: 'SMS notification for critical lab values', prod: true, staging: true, sandbox: true, rollout: 100, stale: false },
  { key: 'insurance.real-time-eligibility', desc: 'Real-time eligibility check at booking', prod: false, staging: false, sandbox: true, rollout: 0, stale: true },
  { key: 'admin.new-revenue-dashboard', desc: 'New revenue analytics dashboard', prod: false, staging: true, sandbox: true, rollout: 0, stale: false },
];

const experiments = [
  { name: 'Appointment booking v2', hypothesis: 'Simplified flow reduces drop-off by 15%', status: 'running', owner: 'Product' },
  { name: 'AI triage widget', hypothesis: 'AI triage increases appointment completion', status: 'paused', owner: 'Clinical AI' },
];

export default function FeatureFlagsSection() {
  const [rolloutStrategy, setRolloutStrategy] = useState('gradual');
  const [soakDays, setSoakDays] = useState(3);
  const [staleThreshold, setStaleThreshold] = useState(30);
  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      <SectionHeader
        title="Feature Flag Registry"
        description="All platform feature flags with per-environment state, rollout percentage, and audience targeting."
      />
      <SettingCard title="Flag registry" scope="All environments" dirty={dirty}>
        <div className="space-y-2">
          {flags.map(f => (
            <div
              key={f.key}
              className="rounded-lg p-3"
              style={{ background: '#0F172A', border: `1px solid ${f.stale ? 'rgba(245,158,11,0.3)' : 'rgba(51,65,85,0.5)'}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Flag size={12} color={f.prod ? '#0D9488' : '#475569'} className="mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#E2E8F0' }}>{f.key}</div>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>{f.desc}</div>
                  </div>
                </div>
                {f.stale && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <AlertTriangle size={11} color="#F59E0B" />
                    <span style={{ fontSize: 10, color: '#F59E0B' }}>Stale</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Chip label={`Prod: ${f.prod ? 'ON' : 'OFF'}`} color={f.prod ? 'teal' : 'slate'} />
                <Chip label={`Staging: ${f.staging ? 'ON' : 'OFF'}`} color={f.staging ? 'blue' : 'slate'} />
                <Chip label={`Sandbox: ${f.sandbox ? 'ON' : 'OFF'}`} color="slate" />
                {f.rollout > 0 && f.rollout < 100 && (
                  <Chip label={`${f.rollout}% rollout`} color="amber" />
                )}
              </div>
            </div>
          ))}
        </div>
        <LockNote text="Production flag toggles require platform:settings:edit:flags and two-person approval." />
      </SettingCard>

      <SectionHeader
        title="Experiment Program"
        description="Active and paused experiments. Clinical experiments require IRB-equivalent review."
      />
      <SettingCard title="Active experiments" scope="Platform-wide">
        <div className="space-y-2">
          {experiments.map(e => (
            <div key={e.name} className="flex items-center justify-between px-3 py-3 rounded-lg" style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.5)' }}>
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical size={12} color="#60A5FA" />
                  <span style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 500 }}>{e.name}</span>
                </div>
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{e.hypothesis}</div>
              </div>
              <div className="flex items-center gap-2">
                <Chip label={e.status} color={e.status === 'running' ? 'green' : 'amber'} />
                <span style={{ fontSize: 10, color: '#475569' }}>{e.owner}</span>
              </div>
            </div>
          ))}
        </div>
      </SettingCard>

      <SectionHeader
        title="Rollout Policy"
        description="Default rollout strategy, kill-switch behavior, and required pre-production soak time."
      />
      <SettingCard title="Rollout defaults" scope="Platform-wide" dirty={dirty}>
        <SelectRow
          label="Default rollout strategy"
          value={rolloutStrategy}
          options={[
            { value: 'gradual', label: 'Gradual (percentage-based)' },
            { value: 'instant', label: 'Instant (100% on enable)' },
          ]}
          onChange={v => { setRolloutStrategy(v); mark(); }}
        />
        <NumberRow label="Required pre-production soak period" desc="Minimum days a flag must be active in staging before production promotion." value={soakDays} onChange={v => { setSoakDays(v); mark(); }} min={0} suffix="days" />
        <NumberRow label="Stale flag threshold" desc="Flags not modified in this many days are flagged for cleanup review." value={staleThreshold} onChange={v => { setStaleThreshold(v); mark(); }} min={7} suffix="days" />
        <ToggleRow label="Kill-switch via environment variable override" desc="Allow emergency disable of any flag via deployment-time env var, bypassing database state." value={true} onChange={() => {}} />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} />
    </div>
  );
}
