import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, LockNote, CrossLinkBanner } from '../primitives';

export default function TelemetrySection() {
  const [metricRetention, setMetricRetention] = useState(90);
  const [logRetention, setLogRetention] = useState(365);
  const [traceSampling, setTraceSampling] = useState(5);
  const [productAnalytics, setProductAnalytics] = useState(true);
  const [piiInEvents, setPiiInEvents] = useState(false);
  const [patientOptIn, setPatientOptIn] = useState(false);
  const [wsOptOut, setWsOptOut] = useState(true);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      <CrossLinkBanner
        message="SIEM forwarding and evidence chain configuration live in Audit settings."
        href="/admin/audit"
        label="Open Audit settings"
      />

      <SectionHeader
        title="Metrics, Logs & Traces"
        description="Retention defaults, PHI-redacted log channels, and trace sampling rates."
      />
      <SettingCard title="Retention & sampling" scope="Platform infrastructure" dirty={dirty}>
        <NumberRow label="Metric retention" value={metricRetention} onChange={v => { setMetricRetention(v); mark(); }} min={7} suffix="days" />
        <NumberRow label="Log retention (PHI-redacted channels)" value={logRetention} onChange={v => { setLogRetention(v); mark(); }} min={90} suffix="days" />
        <NumberRow label="Trace sampling rate" desc="Percentage of requests traced end-to-end." value={traceSampling} onChange={v => { setTraceSampling(v); mark(); }} min={1} max={100} suffix="%" />
        <ToggleRow label="PHI-allowed log channels encrypted at rest" value={true} onChange={() => {}} locked />
        <ToggleRow label="Log residency locked to UAE" value={true} onChange={() => {}} locked />
      </SettingCard>

      <SectionHeader
        title="Anonymized Analytics"
        description="Product analytics for improving the platform. PII is never allowed in analytics events."
      />
      <SettingCard title="Product analytics" scope="All portals" dirty={dirty}>
        <ToggleRow label="Product analytics enabled" desc="Collect anonymized usage events to improve the platform." value={productAnalytics} onChange={v => { setProductAnalytics(v); mark(); }} />
        <ToggleRow label="PII allowed in analytics events" desc="Always locked off. Only opaque workspace and session IDs are used." value={piiInEvents} onChange={() => {}} locked />
      </SettingCard>

      <SectionHeader
        title="Customer Telemetry Consent"
        description="Patient-side and workspace-side telemetry opt-in/out, aligned with UAE PDPL."
      />
      <SettingCard title="Patient telemetry" scope="Patient Portal" dirty={dirty}>
        <ToggleRow
          label="Patient-side telemetry"
          desc="UAE PDPL requires opt-in. Off by default; patients can enable in their settings."
          value={patientOptIn}
          onChange={v => { setPatientOptIn(v); mark(); }}
        />
        <SelectRow
          label="Default for new UAE patients"
          value="opt-out"
          options={[
            { value: 'opt-out', label: 'Opt-out (UAE PDPL default)' },
            { value: 'opt-in', label: 'Opt-in' },
          ]}
          onChange={() => mark()}
        />
      </SettingCard>
      <SettingCard title="Workspace telemetry" scope="Admin & Workspace" dirty={dirty}>
        <ToggleRow label="Workspace-level telemetry" desc="Workspace admins can opt out of usage telemetry." value={wsOptOut} onChange={v => { setWsOptOut(v); mark(); }} />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} />
    </div>
  );
}
