import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, CrossLinkBanner, LockNote, Chip } from '../primitives';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const models = [
  { id: 'claude-3-5-sonnet', provider: 'Anthropic', modality: 'Text', approved: '2025-12-01', validUntil: '2026-12-01', uses: 'Clinical assist, Summarization' },
  { id: 'gpt-4o', provider: 'Azure OpenAI', modality: 'Text + Vision', approved: '2025-10-15', validUntil: '2026-10-15', uses: 'OCR, Imaging analysis' },
  { id: 'whisper-v3', provider: 'Azure OpenAI', modality: 'Audio', approved: '2025-09-01', validUntil: '2026-09-01', uses: 'Transcription' },
];

const guardrails = [
  { rule: 'Autonomous diagnosis without clinician review', action: 'Block' },
  { rule: 'Prescription generation without prescriber sign-off', action: 'Block' },
  { rule: 'PHI in prompt without explicit approval', action: 'Block' },
  { rule: 'Responses that contradict clinical guidelines', action: 'Warn + Log' },
  { rule: 'Unsupported language output for clinical content', action: 'Block' },
];

export default function AISection() {
  const [defaultProvider, setDefaultProvider] = useState('anthropic');
  const [routingPolicy, setRoutingPolicy] = useState('quality');
  const [clinicalModel, setClinicalModel] = useState('claude-3-5-sonnet');
  const [transcriptionModel, setTranscriptionModel] = useState('whisper-v3');
  const [ocrModel, setOcrModel] = useState('gpt-4o');

  const [humanReviewRate, setHumanReviewRate] = useState(1);
  const [patientDisclosure, setPatientDisclosure] = useState(true);
  const [anomalyThreshold, setAnomalyThreshold] = useState(10);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      <SectionHeader
        title="AI Providers & Routing"
        description="Active AI providers, default model routing, and per-feature model assignments."
        crossLink="/admin/integrations"
        crossLinkLabel="Integration controls"
      />
      <SettingCard title="Default routing policy" scope="All AI features" dirty={dirty}>
        <SelectRow
          label="Routing strategy"
          value={routingPolicy}
          options={[
            { value: 'cost', label: 'Cost-optimized' },
            { value: 'quality', label: 'Quality-optimized' },
            { value: 'regional', label: 'Regional (UAE-prefer)' },
          ]}
          onChange={v => { setRoutingPolicy(v); mark(); }}
        />
        <SelectRow
          label="Default provider"
          value={defaultProvider}
          options={[
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'azure-openai', label: 'Azure OpenAI' },
          ]}
          onChange={v => { setDefaultProvider(v); mark(); }}
        />
      </SettingCard>
      <SettingCard title="Per-feature model assignment" scope="All AI features" dirty={dirty}>
        <SelectRow
          label="Clinical assist"
          value={clinicalModel}
          options={models.map(m => ({ value: m.id, label: m.id }))}
          onChange={v => { setClinicalModel(v); mark(); }}
        />
        <SelectRow
          label="Transcription"
          value={transcriptionModel}
          options={models.map(m => ({ value: m.id, label: m.id }))}
          onChange={v => { setTranscriptionModel(v); mark(); }}
        />
        <SelectRow
          label="OCR & imaging analysis"
          value={ocrModel}
          options={models.map(m => ({ value: m.id, label: m.id }))}
          onChange={v => { setOcrModel(v); mark(); }}
        />
      </SettingCard>

      <SectionHeader
        title="Model Registry & Approvals"
        description="Approved models with their production approval status. New models require full approval workflow before production use."
      />
      <SettingCard title="Approved model registry" scope="Production">
        <div className="space-y-3">
          {models.map(m => (
            <div
              key={m.id}
              className="rounded-lg p-3"
              style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.5)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E2E8F0' }}>{m.id}</span>
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={12} color="#22C55E" />
                  <span style={{ fontSize: 10, color: '#22C55E' }}>Approved</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip label={m.provider} color="blue" />
                <Chip label={m.modality} color="slate" />
                <span style={{ fontSize: 10, color: '#64748B' }}>Valid until {m.validUntil}</span>
              </div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{m.uses}</div>
            </div>
          ))}
        </div>
        <button
          className="mt-3 w-full py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: 'rgba(13,148,136,0.15)', color: '#2DD4BF', border: '1px solid rgba(13,148,136,0.3)' }}
        >
          + Request new model approval
        </button>
      </SettingCard>

      <SectionHeader
        title="Clinical Guardrails"
        description="Prohibited use cases and required human-in-the-loop checkpoints. Changes require clinical safety committee sign-off."
      />
      <SettingCard title="Prohibited use list" scope="Production (locked)" locked>
        <div className="space-y-2">
          {guardrails.map((g, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} color="#EF4444" />
                <span style={{ fontSize: 12, color: '#E2E8F0' }}>{g.rule}</span>
              </div>
              <Chip label={g.action} color={g.action === 'Block' ? 'red' : 'amber'} />
            </div>
          ))}
        </div>
        <LockNote text="Clinical guardrails require clinical:safety:approve to publish to production." />
      </SettingCard>
      <SettingCard title="Red-team status" scope="Production">
        <div className="flex items-center justify-between py-2">
          <div>
            <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>Test pack version</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#94A3B8', marginTop: 2 }}>v2.4.1</div>
          </div>
          <Chip label="Passed — 2026-04-15" color="green" />
        </div>
      </SettingCard>

      <SectionHeader
        title="Prompt & Content Policy"
        description="System prompts, PHI handling in prompts, and output content policies."
      />
      <SettingCard title="PHI in prompts" scope="All AI features" dirty={dirty} locked>
        <LockNote text="PHI handling in AI prompts is a regulatory control. Redaction defaults are locked on; any change requires regulatory:edit and two-person approval." />
        <div className="mt-3">
          <ToggleRow label="PHI redaction before sending to external AI providers" value={true} onChange={() => {}} locked />
          <ToggleRow label="Log all prompts containing PHI markers" value={true} onChange={() => {}} locked />
        </div>
      </SettingCard>

      <SectionHeader
        title="AI Usage Governance"
        description="Token quotas, cost allocation, anomaly thresholds, and patient transparency defaults."
      />
      <SettingCard title="Governance controls" scope="All workspaces" dirty={dirty}>
        <NumberRow label="Human review sampling rate" desc="Percentage of AI clinical note summaries audited by a clinical reviewer." value={humanReviewRate} onChange={v => { setHumanReviewRate(v); mark(); }} min={0} max={100} suffix="%" />
        <NumberRow label="Per-user anomaly threshold" desc="Alert when a user's AI call volume spikes N× above their 30-day baseline." value={anomalyThreshold} onChange={v => { setAnomalyThreshold(v); mark(); }} min={2} suffix="×" />
        <ToggleRow label="Patient transparency disclosure" desc="Disclose AI involvement to patients when AI contributes to clinical output." value={patientDisclosure} onChange={v => { setPatientDisclosure(v); mark(); }} />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} requiresApproval />
    </div>
  );
}
