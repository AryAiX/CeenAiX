import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter } from '../primitives';

export default function SearchSection() {
  const [indexPatients, setIndexPatients] = useState(true);
  const [indexClinicians, setIndexClinicians] = useState(true);
  const [indexAppts, setIndexAppts] = useState(true);
  const [indexRx, setIndexRx] = useState(true);
  const [indexClaims, setIndexClaims] = useState(true);
  const [indexDocs, setIndexDocs] = useState(true);

  const [refreshPolicy, setRefreshPolicy] = useState('near-realtime');
  const [snippetLen, setSnippetLen] = useState(160);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      <SectionHeader
        title="Indexing Scope"
        description="Control which entities are indexed for platform-wide search."
      />
      <SettingCard title="Indexed entities" scope="All portals" dirty={dirty}>
        <ToggleRow label="Patients" value={indexPatients} onChange={v => { setIndexPatients(v); mark(); }} />
        <ToggleRow label="Clinicians" value={indexClinicians} onChange={v => { setIndexClinicians(v); mark(); }} />
        <ToggleRow label="Appointments" value={indexAppts} onChange={v => { setIndexAppts(v); mark(); }} />
        <ToggleRow label="Prescriptions" value={indexRx} onChange={v => { setIndexRx(v); mark(); }} />
        <ToggleRow label="Insurance claims" value={indexClaims} onChange={v => { setIndexClaims(v); mark(); }} />
        <ToggleRow label="Documents (public fields only)" value={indexDocs} onChange={v => { setIndexDocs(v); mark(); }} />
        <ToggleRow label="Audit log (public action fields only)" value={true} onChange={() => {}} />
      </SettingCard>

      <SectionHeader
        title="Index Refresh Policy"
        description="How frequently indexes are updated for each entity type."
      />
      <SettingCard title="Refresh configuration" scope="All entities" dirty={dirty}>
        <SelectRow
          label="Default refresh policy"
          value={refreshPolicy}
          options={[
            { value: 'realtime', label: 'Real-time (on write)' },
            { value: 'near-realtime', label: 'Near-real-time (~5s)' },
            { value: 'scheduled', label: 'Scheduled (every 15 min)' },
          ]}
          onChange={v => { setRefreshPolicy(v); mark(); }}
        />
      </SettingCard>

      <SectionHeader
        title="Search Redaction"
        description="PHI/PII redaction in search snippets and result length limits."
      />
      <SettingCard title="Redaction policy" scope="All portals" dirty={dirty}>
        <ToggleRow label="PHI redaction in search results" desc="Restrict PHI fields in search snippets based on the viewing user's role." value={true} onChange={() => {}} locked />
        <ToggleRow label="PII redaction in search snippets" value={true} onChange={() => {}} locked />
        <NumberRow label="Search snippet length limit" value={snippetLen} onChange={v => { setSnippetLen(v); mark(); }} min={60} suffix="characters" />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} />
    </div>
  );
}
