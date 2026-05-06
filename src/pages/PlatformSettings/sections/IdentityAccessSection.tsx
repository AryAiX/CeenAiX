import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, CrossLinkBanner, LockNote } from '../primitives';

export default function IdentityAccessSection() {
  const [minPassLen, setMinPassLen] = useState(12);
  const [breachCheck, setBreachCheck] = useState(true);
  const [passHistory, setPassHistory] = useState(5);
  const [passMaxAge, setPassMaxAge] = useState(180);
  const [mfaAdmin, setMfaAdmin] = useState(true);
  const [mfaClinician, setMfaClinician] = useState(true);
  const [mfaPatient, setMfaPatient] = useState(false);
  const [stepUpNewDevice, setStepUpNewDevice] = useState(true);
  const [stepUpNewCountry, setStepUpNewCountry] = useState(true);
  const [bruteForce, setBruteForce] = useState(5);

  const [adminSession, setAdminSession] = useState(480);
  const [clinicianSession, setClinicianSession] = useState(480);
  const [patientSession, setPatientSession] = useState(60);
  const [idleTimeout, setIdleTimeout] = useState(30);
  const [concurrentSessions, setConcurrentSessions] = useState(3);
  const [sessionType, setSessionType] = useState('sliding');

  const [uaePassEnabled, setUaePassEnabled] = useState(true);
  const [entraEnabled, setEntraEnabled] = useState(true);
  const [googleWsEnabled, setGoogleWsEnabled] = useState(false);
  const [customSaml, setCustomSaml] = useState(false);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      <CrossLinkBanner
        message="Detailed authentication policies, MFA configuration, and IdP setup live in the Security command center."
        href="/admin/security"
        label="Open Security → Authentication"
      />

      <SectionHeader
        title="Authentication Baseline"
        description="Minimum password policies and MFA requirements enforced across all portals and workspaces."
      />
      <SettingCard title="Password policy" scope="All portals" dirty={dirty}>
        <NumberRow label="Minimum password length" value={minPassLen} onChange={v => { setMinPassLen(v); mark(); }} min={8} suffix="characters" />
        <ToggleRow label="Breached-password check (HaveIBeenPwned)" desc="Block known compromised passwords at sign-up and password change." value={breachCheck} onChange={v => { setBreachCheck(v); mark(); }} />
        <NumberRow label="Password history" desc="Prevent reuse of the last N passwords." value={passHistory} onChange={v => { setPassHistory(v); mark(); }} min={0} suffix="previous" />
        <NumberRow label="Maximum password age" desc="Force rotation after this many days. 0 = never." value={passMaxAge} onChange={v => { setPassMaxAge(v); mark(); }} min={0} suffix="days" />
      </SettingCard>
      <SettingCard title="MFA requirement matrix" scope="All portals" dirty={dirty}>
        <ToggleRow label="MFA required — Super Admins" desc="Cannot be disabled for production admin accounts." value={mfaAdmin} onChange={() => {}} locked />
        <ToggleRow label="MFA required — Clinical staff" value={mfaClinician} onChange={v => { setMfaClinician(v); mark(); }} />
        <ToggleRow label="MFA required — Patients" desc="Optional by default; workspace may require." value={mfaPatient} onChange={v => { setMfaPatient(v); mark(); }} />
      </SettingCard>
      <SettingCard title="Step-up triggers" scope="All portals" dirty={dirty}>
        <ToggleRow label="New device detection" desc="Require re-authentication on first sign-in from a new device." value={stepUpNewDevice} onChange={v => { setStepUpNewDevice(v); mark(); }} />
        <ToggleRow label="New country detection" desc="Require step-up when sign-in originates from a new country." value={stepUpNewCountry} onChange={v => { setStepUpNewCountry(v); mark(); }} />
        <NumberRow label="Brute-force lockout threshold" desc="Account locked after N consecutive failures." value={bruteForce} onChange={v => { setBruteForce(v); mark(); }} min={3} suffix="attempts" />
      </SettingCard>

      <SectionHeader
        title="Session Policy"
        description="Default session lengths, idle timeouts, and concurrent session limits."
      />
      <SettingCard title="Session lengths by role" scope="All portals" dirty={dirty}>
        <NumberRow label="Super Admin session" value={adminSession} onChange={v => { setAdminSession(v); mark(); }} min={30} suffix="minutes" />
        <NumberRow label="Clinician session" value={clinicianSession} onChange={v => { setClinicianSession(v); mark(); }} min={30} suffix="minutes" />
        <NumberRow label="Patient session" value={patientSession} onChange={v => { setPatientSession(v); mark(); }} min={10} suffix="minutes" />
        <NumberRow label="Idle timeout (all roles)" desc="Session ends after N minutes of inactivity." value={idleTimeout} onChange={v => { setIdleTimeout(v); mark(); }} min={5} suffix="minutes" />
        <NumberRow label="Max concurrent sessions" value={concurrentSessions} onChange={v => { setConcurrentSessions(v); mark(); }} min={1} suffix="sessions" />
        <SelectRow
          label="Session expiry type"
          value={sessionType}
          options={[
            { value: 'sliding', label: 'Sliding (reset on activity)' },
            { value: 'fixed', label: 'Fixed (expires at creation + TTL)' },
          ]}
          onChange={v => { setSessionType(v); mark(); }}
        />
      </SettingCard>

      <SectionHeader
        title="SSO & Identity Providers"
        description="Pre-approved IdPs available to workspaces. Per-IdP configuration lives in the Security command center."
      />
      <SettingCard title="Available identity providers" scope="Workspace-configurable" dirty={dirty}>
        <ToggleRow label="UAE Pass" desc="Enables UAE Pass integration for UAE workspace sign-in and patient verification." value={uaePassEnabled} onChange={v => { setUaePassEnabled(v); mark(); }} />
        <ToggleRow label="Microsoft Entra ID (Azure AD)" value={entraEnabled} onChange={v => { setEntraEnabled(v); mark(); }} />
        <ToggleRow label="Google Workspace" value={googleWsEnabled} onChange={v => { setGoogleWsEnabled(v); mark(); }} />
        <ToggleRow label="Custom SAML / OIDC" desc="Allow workspaces to bring their own identity provider." value={customSaml} onChange={v => { setCustomSaml(v); mark(); }} />
      </SettingCard>

      <SectionHeader
        title="Role Inheritance & Defaults"
        description="Default roles for new users and role inheritance map."
      />
      <SettingCard title="Default role grants" scope="Platform-wide" dirty={dirty}>
        <SelectRow
          label="Default role — new admins"
          value="admin-viewer"
          options={[
            { value: 'admin-viewer', label: 'Admin Viewer (read-only)' },
            { value: 'admin-editor', label: 'Admin Editor' },
          ]}
          onChange={() => mark()}
        />
        <SelectRow
          label="Default role — new clinicians"
          value="clinician-base"
          options={[
            { value: 'clinician-base', label: 'Clinician (base)' },
            { value: 'clinician-senior', label: 'Senior Clinician' },
          ]}
          onChange={() => mark()}
        />
        <ToggleRow label="Privileged role grants require approval" desc="Roles with elevated permissions require approval workflow." value={true} onChange={() => {}} locked />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} />
    </div>
  );
}
