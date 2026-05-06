import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, LockNote } from '../primitives';

export default function PortalsSection() {
  const [selfReg, setSelfReg] = useState(true);
  const [uaePass, setUaePass] = useState(true);
  const [idVerLevel, setIdVerLevel] = useState('strong');
  const [appts, setAppts] = useState(true);
  const [tele, setTele] = useState(true);
  const [rx, setRx] = useState(true);
  const [labOrders, setLabOrders] = useState(true);
  const [secureMsg, setSecureMsg] = useState(true);
  const [familyAccounts, setFamilyAccounts] = useState(true);
  const [aiSymptom, setAiSymptom] = useState(true);
  const [patientTimeout, setPatientTimeout] = useState(30);

  const [sheryan, setSheryan] = useState(true);
  const [aiClinicalAssist, setAiClinicalAssist] = useState(true);
  const [teleRecording, setTeleRecording] = useState(false);

  const [tatmeen, setTatmeen] = useState(true);
  const [controlledSubstance, setControlledSubstance] = useState(true);
  const [refillHandling, setRefillHandling] = useState('auto');

  const [dicomGateway, setDicomGateway] = useState(true);
  const [sensitiveResultDelay, setSensitiveResultDelay] = useState(false);
  const [criticalAlert, setCriticalAlert] = useState(true);

  const [preAuth, setPreAuth] = useState(true);
  const [claimMode, setClaimMode] = useState('realtime');
  const [eligibilityFreq, setEligibilityFreq] = useState('realtime');

  const [adminLanding, setAdminLanding] = useState('dashboard');
  const [density, setDensity] = useState('comfortable');
  const [pageSize, setPageSize] = useState('50');

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      {/* Patient Portal */}
      <SectionHeader title="Patient Portal Defaults" description="Platform-level defaults for the patient-facing portal." />
      <SettingCard title="Registration & identity" scope="Patient Portal" dirty={dirty}>
        <ToggleRow label="Self-registration enabled" value={selfReg} onChange={v => { setSelfReg(v); mark(); }} />
        <ToggleRow label="UAE Pass binding at registration" desc="Requires UAE Pass identity verification for UAE patients." value={uaePass} onChange={v => { setUaePass(v); mark(); }} />
        <SelectRow
          label="Identity verification level"
          value={idVerLevel}
          options={[
            { value: 'basic', label: 'Basic' },
            { value: 'strong', label: 'Strong' },
            { value: 'kyc', label: 'Full KYC' },
          ]}
          onChange={v => { setIdVerLevel(v); mark(); }}
        />
        <NumberRow label="Patient session timeout" value={patientTimeout} onChange={v => { setPatientTimeout(v); mark(); }} min={5} suffix="minutes" />
      </SettingCard>
      <SettingCard title="Patient feature toggles" scope="Patient Portal" dirty={dirty}>
        <ToggleRow label="Appointments" value={appts} onChange={v => { setAppts(v); mark(); }} />
        <ToggleRow label="Telemedicine" value={tele} onChange={v => { setTele(v); mark(); }} />
        <ToggleRow label="Prescriptions" value={rx} onChange={v => { setRx(v); mark(); }} />
        <ToggleRow label="Lab orders" value={labOrders} onChange={v => { setLabOrders(v); mark(); }} />
        <ToggleRow label="Secure messaging" value={secureMsg} onChange={v => { setSecureMsg(v); mark(); }} />
        <ToggleRow label="Family accounts & dependents" value={familyAccounts} onChange={v => { setFamilyAccounts(v); mark(); }} />
        <ToggleRow label="AI symptom assistant" desc="Disabling hides the AI assistant entry point from patients." value={aiSymptom} onChange={v => { setAiSymptom(v); mark(); }} />
      </SettingCard>

      {/* Doctor Portal */}
      <SectionHeader title="Doctor Portal Defaults" description="Platform-level defaults for the clinician-facing portal." />
      <SettingCard title="License & scope" scope="Doctor Portal" dirty={dirty}>
        <ToggleRow label="Require Sheryan license verification on activation" desc="Locked on for production. Clinicians must have valid DHA Sheryan license." value={sheryan} onChange={() => {}} locked />
        <ToggleRow label="AI clinical assist (default on)" desc="ClinicalAI features are enabled by default for all new doctors." value={aiClinicalAssist} onChange={v => { setAiClinicalAssist(v); mark(); }} />
        <ToggleRow label="Telemedicine session recording" desc="When enabled, sessions are recorded by default (patient consent captured)." value={teleRecording} onChange={v => { setTeleRecording(v); mark(); }} />
      </SettingCard>

      {/* Pharmacy Portal */}
      <SectionHeader title="Pharmacy Portal Defaults" description="Defaults for pharmacy operations and compliance." />
      <SettingCard title="Pharmacy compliance" scope="Pharmacy Portal" dirty={dirty}>
        <ToggleRow label="Tatmeen required event types" desc="Locked on for production. All Tatmeen events are mandatory." value={tatmeen} onChange={() => {}} locked />
        <ToggleRow label="Controlled substance handling" desc="Requires explicit pharmacist sign-off for controlled substances." value={controlledSubstance} onChange={v => { setControlledSubstance(v); mark(); }} />
        <SelectRow
          label="Refill request handling"
          value={refillHandling}
          options={[
            { value: 'auto', label: 'Auto-approve within policy' },
            { value: 'manual', label: 'Manual review required' },
            { value: 'doctor', label: 'Route to prescribing doctor' },
          ]}
          onChange={v => { setRefillHandling(v); mark(); }}
        />
      </SettingCard>

      {/* Lab & Radiology Portal */}
      <SectionHeader title="Lab & Radiology Portal Defaults" description="DICOM, result release, and critical alerting defaults." />
      <SettingCard title="Lab & imaging defaults" scope="Lab & Radiology Portal" dirty={dirty}>
        <ToggleRow label="DICOM gateway enabled" value={dicomGateway} onChange={v => { setDicomGateway(v); mark(); }} />
        <ToggleRow label="Delay release of sensitive results" desc="Adds a hold period for oncology and infectious disease results." value={sensitiveResultDelay} onChange={v => { setSensitiveResultDelay(v); mark(); }} />
        <ToggleRow label="Critical-result alerting" desc="Immediately notifies ordering clinician and on-call for critical values." value={criticalAlert} onChange={v => { setCriticalAlert(v); mark(); }} />
      </SettingCard>

      {/* Insurance Portal */}
      <SectionHeader title="Insurance Portal Defaults" description="Pre-authorization, claim submission, and payer onboarding defaults." />
      <SettingCard title="Insurance defaults" scope="Insurance Portal" dirty={dirty}>
        <ToggleRow label="Pre-authorization required" desc="Default on; workspaces may reduce requirement scope for specific payers." value={preAuth} onChange={v => { setPreAuth(v); mark(); }} />
        <SelectRow
          label="Claim submission mode"
          value={claimMode}
          options={[
            { value: 'realtime', label: 'Real-time' },
            { value: 'batched', label: 'Batched (end of day)' },
          ]}
          onChange={v => { setClaimMode(v); mark(); }}
        />
        <SelectRow
          label="Eligibility verification"
          value={eligibilityFreq}
          options={[
            { value: 'realtime', label: 'Real-time (on appointment booking)' },
            { value: 'daily', label: 'Daily batch' },
          ]}
          onChange={v => { setEligibilityFreq(v); mark(); }}
        />
      </SettingCard>

      {/* Super Admin Defaults */}
      <SectionHeader title="Super Admin Defaults" description="Defaults for the Super Admin portal experience." />
      <SettingCard title="Admin portal experience" scope="Super Admin" dirty={dirty}>
        <SelectRow
          label="Default landing page"
          value={adminLanding}
          options={[
            { value: 'dashboard', label: 'Dashboard' },
            { value: 'workspaces', label: 'Workspaces' },
            { value: 'system-status', label: 'System Status' },
          ]}
          onChange={v => { setAdminLanding(v); mark(); }}
        />
        <SelectRow
          label="Default density"
          value={density}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
          onChange={v => { setDensity(v); mark(); }}
        />
        <SelectRow
          label="Default table page size"
          value={pageSize}
          options={[
            { value: '25', label: '25 rows' },
            { value: '50', label: '50 rows' },
            { value: '100', label: '100 rows' },
          ]}
          onChange={v => { setPageSize(v); mark(); }}
        />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} />
    </div>
  );
}
