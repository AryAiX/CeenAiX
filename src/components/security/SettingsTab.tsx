import { useState } from 'react';
import { Shield, Bell, Key, Lock, Globe, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { S, SCard, SectionHeader, SStatusDot } from './SecurityPrimitives';

const NOTIFICATION_CHANNELS = [
  { channel: 'Email (security@ceenaix.ae)', events: ['Critical threats', 'SLA breaches', 'Cert expiry'], enabled: true },
  { channel: 'Slack #security-alerts', events: ['All Critical', 'New incidents'], enabled: true },
  { channel: 'PagerDuty on-call', events: ['Critical only'], enabled: true },
  { channel: 'SMS (CISO +971-xx)', events: ['Critical only (00:00–06:00)'], enabled: false },
];

type ToggleKey =
  | 'mfaEnforceAdmin' | 'mfaEnforceDoctor' | 'mfaEnforcePatient'
  | 'sessionInvalidateOnIpChange' | 'deviceTrustAdmin'
  | 'dlpPhiInPrompts' | 'dlpBulkExport' | 'dlpCreditCard'
  | 'breakGlassRequireApproval' | 'secretAutoRotation'
  | 'vulnAutoAssign' | 'threatAutoMitigate';

type ToggleState = Record<ToggleKey, boolean>;

const INITIAL_TOGGLES: ToggleState = {
  mfaEnforceAdmin: true,
  mfaEnforceDoctor: true,
  mfaEnforcePatient: false,
  sessionInvalidateOnIpChange: true,
  deviceTrustAdmin: false,
  dlpPhiInPrompts: true,
  dlpBulkExport: true,
  dlpCreditCard: true,
  breakGlassRequireApproval: true,
  secretAutoRotation: false,
  vulnAutoAssign: true,
  threatAutoMitigate: false,
};

function SettingToggle({ label, description, value, onChange, warn }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void; warn?: boolean }) {
  return (
    <div className="flex items-start justify-between py-3" style={{ borderBottom: `1px solid ${S.border}` }}>
      <div className="flex-1 pr-4">
        <div className="text-xs font-semibold" style={{ color: S.text1 }}>{label}</div>
        {description && <div className="text-[10px] mt-0.5" style={{ color: S.text3 }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="flex-shrink-0 w-9 h-5 rounded-full relative transition-all"
        style={{ background: value ? S.tealLight : S.bg3, border: `1px solid ${value ? S.tealBorder : S.border}` }}>
        <div className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all"
          style={{ left: value ? '18px' : '2px', background: value ? S.bg2 : S.text3 }} />
      </button>
      {warn && !value && (
        <AlertTriangle size={12} style={{ color: S.warningLight, marginLeft: 8, flexShrink: 0, marginTop: 2 }} />
      )}
    </div>
  );
}

function NumberInput({ label, description, value, unit }: { label: string; description?: string; value: number | string; unit?: string }) {
  return (
    <div className="flex items-start justify-between py-3" style={{ borderBottom: `1px solid ${S.border}` }}>
      <div className="flex-1 pr-4">
        <div className="text-xs font-semibold" style={{ color: S.text1 }}>{label}</div>
        {description && <div className="text-[10px] mt-0.5" style={{ color: S.text3 }}>{description}</div>}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="px-2.5 py-1 rounded-lg text-[10px]"
          style={{ background: S.bg1, border: `1px solid ${S.border}`, color: S.tealLight, fontFamily: 'DM Mono, monospace' }}>
          {value}
        </div>
        {unit && <span className="text-[10px]" style={{ color: S.text3 }}>{unit}</span>}
      </div>
    </div>
  );
}

export function SettingsTab() {
  const [toggles, setToggles] = useState<ToggleState>(INITIAL_TOGGLES);
  const [saved, setSaved] = useState(false);

  const toggle = (key: ToggleKey) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* Save bar */}
      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: S.bg2, border: `1px solid ${S.border}` }}>
        <div className="flex items-center gap-2">
          {saved ? (
            <><CheckCircle size={12} style={{ color: S.successLight }} /><span className="text-[10px]" style={{ color: S.successLight }}>Changes saved</span></>
          ) : (
            <><Shield size={12} style={{ color: S.text3 }} /><span className="text-[10px]" style={{ color: S.text3 }}>Security settings — changes require MFA confirmation and are fully audit-logged</span></>
          )}
        </div>
        <button onClick={handleSave} className="text-[10px] px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
          Save changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Identity & MFA */}
        <SCard className="p-5">
          <SectionHeader title="Identity & MFA">
            <Users size={12} style={{ color: S.tealLight }} />
          </SectionHeader>
          <div>
            <SettingToggle label="Enforce MFA — Admin portal" description="All admin users must enroll MFA before accessing the portal" value={toggles.mfaEnforceAdmin} onChange={() => toggle('mfaEnforceAdmin')} />
            <SettingToggle label="Enforce MFA — Doctor portal" description="Required for all clinical staff" value={toggles.mfaEnforceDoctor} onChange={() => toggle('mfaEnforceDoctor')} />
            <SettingToggle label="Enforce MFA — Patient portal" description="Currently risk-based — enforce for all" value={toggles.mfaEnforcePatient} onChange={() => toggle('mfaEnforcePatient')} warn />
            <SettingToggle label="Invalidate sessions on IP change" description="Force re-authentication when IP changes mid-session" value={toggles.sessionInvalidateOnIpChange} onChange={() => toggle('sessionInvalidateOnIpChange')} />
            <SettingToggle label="Device trust — Admin portal" description="Allow only enrolled devices for admin access" value={toggles.deviceTrustAdmin} onChange={() => toggle('deviceTrustAdmin')} warn />
            <NumberInput label="Admin session timeout" description="Maximum idle time before session invalidation" value={4} unit="hours" />
            <NumberInput label="Account lockout threshold" description="Failed login attempts before lockout" value={10} unit="attempts in 15m" />
            <NumberInput label="Password minimum length — Admin" value={14} unit="chars" />
          </div>
        </SCard>

        {/* Data Protection */}
        <SCard className="p-5">
          <SectionHeader title="Data Loss Prevention">
            <Lock size={12} style={{ color: S.tealLight }} />
          </SectionHeader>
          <div>
            <SettingToggle label="Block PHI in AI prompts/responses" description="Real-time DLP scanner on all AI inference paths" value={toggles.dlpPhiInPrompts} onChange={() => toggle('dlpPhiInPrompts')} />
            <SettingToggle label="Block bulk export > 100 records" description="Alert security team and require approval" value={toggles.dlpBulkExport} onChange={() => toggle('dlpBulkExport')} />
            <SettingToggle label="Redact credit card in support chat" description="Auto-redact PCI-scope data from all support channels" value={toggles.dlpCreditCard} onChange={() => toggle('dlpCreditCard')} />
            <SettingToggle label="Break-glass requires dual approval" description="Two-person integrity for emergency PHI access" value={toggles.breakGlassRequireApproval} onChange={() => toggle('breakGlassRequireApproval')} warn />
            <NumberInput label="PHI redaction in logs" description="Auto-redact patient identifiers from all log streams" value="Enabled" />
            <NumberInput label="Data residency enforcement" description="Block data leaving UAE region except where permitted" value="UAE strict" />
          </div>
        </SCard>

        {/* Secrets & Keys */}
        <SCard className="p-5">
          <SectionHeader title="Secrets & Key Management">
            <Key size={12} style={{ color: S.tealLight }} />
          </SectionHeader>
          <div>
            <SettingToggle label="Automatic secret rotation" description="Rotate secrets at defined intervals without manual action" value={toggles.secretAutoRotation} onChange={() => toggle('secretAutoRotation')} warn />
            <NumberInput label="Default rotation period" description="Applied to all secrets without explicit policy" value={90} unit="days" />
            <NumberInput label="KMS key rotation — AES keys" value={180} unit="days" />
            <NumberInput label="KMS key rotation — RSA keys" value={365} unit="days" />
            <NumberInput label="Secret reveal audit window" description="How long reveal-secret events are retained in audit log" value={7} unit="years" />
          </div>
        </SCard>

        {/* Threat & Vulnerability */}
        <SCard className="p-5">
          <SectionHeader title="Threat & Vulnerability Response">
            <Bell size={12} style={{ color: S.tealLight }} />
          </SectionHeader>
          <div>
            <SettingToggle label="Auto-assign vulnerabilities" description="Automatically assign new vulns to team based on CVSS" value={toggles.vulnAutoAssign} onChange={() => toggle('vulnAutoAssign')} />
            <SettingToggle label="Auto-mitigate known-bad IPs" description="Automatically block IPs in threat intelligence feeds" value={toggles.threatAutoMitigate} onChange={() => toggle('threatAutoMitigate')} />
            <NumberInput label="SAST scan — on every PR" value="Enabled" />
            <NumberInput label="SCA scan — on every build" value="Enabled" />
            <NumberInput label="DAST scan frequency" value="Weekly" />
            <NumberInput label="Pentest frequency" description="External penetration testing schedule" value="Quarterly" />
          </div>
        </SCard>
      </div>

      {/* Notifications */}
      <SCard className="p-5">
        <SectionHeader title="Security Notifications">
          <button className="text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
            Add channel
          </button>
        </SectionHeader>
        <div className="space-y-2">
          {NOTIFICATION_CHANNELS.map(c => (
            <div key={c.channel} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: S.bg1, border: `1px solid ${c.enabled ? S.tealBorder : S.border}` }}>
              <div className="flex items-center gap-3">
                <SStatusDot ok={c.enabled} />
                <div>
                  <div className="text-xs font-semibold" style={{ color: S.text1 }}>{c.channel}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: S.text3 }}>{c.events.join(' · ')}</div>
                </div>
              </div>
              <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.bg2, color: S.text3, border: `1px solid ${S.border}` }}>
                Configure
              </button>
            </div>
          ))}
        </div>
      </SCard>

      {/* Danger zone */}
      <SCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={14} style={{ color: S.errorLight }} />
          <span className="text-sm font-semibold" style={{ color: S.errorLight }}>Danger Zone</span>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Revoke all active sessions', description: 'Immediately invalidate all user sessions across all portals. Users must re-authenticate.', buttonText: 'Revoke all sessions' },
            { label: 'Emergency access lockdown', description: 'Block all non-admin access to the platform. Use only in active breach scenarios.', buttonText: 'Lock platform' },
            { label: 'Rotate all secrets immediately', description: 'Force immediate rotation of all secrets. This will temporarily disrupt dependent services.', buttonText: 'Rotate all secrets' },
          ].map(a => (
            <div key={a.label} className="flex items-start justify-between p-3 rounded-xl"
              style={{ background: S.errorBg, border: `1px solid ${S.errorBorder}` }}>
              <div>
                <div className="text-xs font-semibold" style={{ color: S.errorLight }}>{a.label}</div>
                <div className="text-[10px] mt-0.5" style={{ color: S.text3 }}>{a.description}</div>
              </div>
              <button className="flex-shrink-0 ml-4 text-[9px] px-2.5 py-1 rounded-lg font-semibold"
                style={{ background: S.errorBg, color: S.errorLight, border: `1px solid ${S.errorBorder}` }}>
                {a.buttonText}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[9px] p-2 rounded" style={{ background: S.bg2, color: S.text3 }}>
          All danger zone actions require two-person approval from CISO + one Director-level principal, and are permanently audit-logged with reason capture.
        </div>
      </SCard>
    </div>
  );
}
