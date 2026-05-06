import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, LockNote } from '../primitives';

export default function StorageSection() {
  const [patientMaxMb, setPatientMaxMb] = useState(50);
  const [clinicianMaxMb, setClinicianMaxMb] = useState(500);
  const [malwareScan, setMalwareScan] = useState(true);

  const [storageRegion, setStorageRegion] = useState('uae');
  const [encryption, setEncryption] = useState(true);
  const [versioning, setVersioning] = useState(true);
  const [coldThreshold, setColdThreshold] = useState(90);

  const [dicomGateway, setDicomGateway] = useState('dimse');
  const [anonOnShare, setAnonOnShare] = useState(true);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  const allowedTypes = ['PDF', 'PNG', 'JPEG', 'HEIC', 'MP4', 'MOV', 'DICOM'];

  return (
    <div>
      <SectionHeader
        title="Upload Limits & Types"
        description="Per-portal file size limits, allowed file types, and malware scan policy."
      />
      <SettingCard title="Upload policy" scope="All portals" dirty={dirty}>
        <NumberRow label="Patient max upload size" value={patientMaxMb} onChange={v => { setPatientMaxMb(v); mark(); }} min={1} suffix="MB" />
        <NumberRow label="Clinician max upload size" value={clinicianMaxMb} onChange={v => { setClinicianMaxMb(v); mark(); }} min={1} suffix="MB" />
        <ToggleRow label="Malware scan on upload" desc="All uploaded files are scanned before storage." value={malwareScan} onChange={v => { setMalwareScan(v); mark(); }} locked />
      </SettingCard>
      <SettingCard title="Allowed file types" scope="Patient Portal" dirty={dirty}>
        <div className="flex flex-wrap gap-2 py-2">
          {allowedTypes.map(t => (
            <span key={t} className="px-2 py-1 rounded" style={{ background: 'rgba(13,148,136,0.15)', color: '#2DD4BF', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>
              {t}
            </span>
          ))}
          <button className="px-2 py-1 rounded text-xs hover:opacity-80" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8' }}>+ Add</button>
        </div>
      </SettingCard>

      <SectionHeader
        title="Object Storage Policy"
        description="Storage region, encryption, versioning, and lifecycle management."
      />
      <SettingCard title="Storage configuration" scope="Platform-wide" dirty={dirty}>
        <SelectRow
          label="Primary storage region"
          value={storageRegion}
          options={[
            { value: 'uae', label: 'UAE (default)' },
            { value: 'uae-dr', label: 'UAE + DR (GCC)' },
          ]}
          onChange={v => { setStorageRegion(v); mark(); }}
        />
        <ToggleRow label="Encryption at rest" desc="All objects encrypted at rest. Cannot be disabled for PHI buckets." value={encryption} onChange={() => {}} locked />
        <ToggleRow label="Object versioning" desc="Keep all versions of clinical and document objects." value={versioning} onChange={v => { setVersioning(v); mark(); }} />
        <ToggleRow label="PHI bucket / public asset bucket separation" desc="Clinical data is never stored in a publicly accessible bucket." value={true} onChange={() => {}} locked />
        <NumberRow label="Move to cold storage after" desc="Days since last access before object moves to cold storage tier." value={coldThreshold} onChange={v => { setColdThreshold(v); mark(); }} min={30} suffix="days" />
      </SettingCard>

      <SectionHeader
        title="DICOM Imaging Defaults"
        description="DICOM gateway configuration, supported modalities, and anonymization policy."
      />
      <SettingCard title="DICOM configuration" scope="Lab & Radiology Portal" dirty={dirty}>
        <SelectRow
          label="Gateway protocol"
          value={dicomGateway}
          options={[
            { value: 'dimse', label: 'DIMSE (traditional DICOM)' },
            { value: 'dicomweb', label: 'DICOMweb (REST)' },
            { value: 'both', label: 'DIMSE + DICOMweb' },
          ]}
          onChange={v => { setDicomGateway(v); mark(); }}
        />
        <ToggleRow label="Anonymize on external share" desc="Strip PHI from DICOM metadata when sharing with external parties." value={anonOnShare} onChange={v => { setAnonOnShare(v); mark(); }} />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} />
    </div>
  );
}
