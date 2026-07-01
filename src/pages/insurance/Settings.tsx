import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Bot,
  Building2,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Headphones,
  HelpCircle,
  Link2,
  Lock,
  Mail,
  MessageSquare,
  Monitor,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  User,
  Users,
  X,
} from 'lucide-react';
import { setInsuranceSettingEnabled, updatePayerProfile } from '../../hooks';
import InsuranceShell, { useInsurancePageData } from './InsuranceShell';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'success' | 'warning' | 'info' }
interface NavItem { id: string; label: string; icon: string; group: string }

// ─── Navigation items ──────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: 'company-profile',  label: 'Company Profile',        icon: '🏢', group: 'ACCOUNT'        },
  { id: 'my-account',       label: 'My Account',             icon: '👤', group: 'ACCOUNT'        },
  { id: 'security',         label: 'Security & Access',      icon: '🔐', group: 'ACCOUNT'        },
  { id: 'plan-config',      label: 'Plan Configuration',     icon: '📋', group: 'OPERATIONS'     },
  { id: 'preauth-sla',      label: 'Pre-Auth & SLA',         icon: '⚡', group: 'OPERATIONS'     },
  { id: 'ai-automation',    label: 'AI & Automation',        icon: '🤖', group: 'OPERATIONS'     },
  { id: 'fraud-detection',  label: 'Fraud Detection',        icon: '🔍', group: 'OPERATIONS'     },
  { id: 'notifications',    label: 'Notifications',          icon: '🔔', group: 'COMMUNICATIONS' },
  { id: 'email-alerts',     label: 'Email & Alerts',         icon: '📧', group: 'COMMUNICATIONS' },
  { id: 'member-comms',     label: 'Member Communications',  icon: '💬', group: 'COMMUNICATIONS' },
  { id: 'dha-regulatory',   label: 'DHA & Regulatory',       icon: '🏛️', group: 'COMPLIANCE'     },
  { id: 'audit-logging',    label: 'Audit & Logging',        icon: '📊', group: 'COMPLIANCE'     },
  { id: 'data-privacy',     label: 'Data & Privacy',         icon: '🔒', group: 'COMPLIANCE'     },
  { id: 'api-integrations', label: 'API & Integrations',     icon: '🔗', group: 'SYSTEM'         },
  { id: 'display',          label: 'Display Preferences',    icon: '🎨', group: 'SYSTEM'         },
  { id: 'help-support',     label: 'Help & Support',         icon: '❓', group: 'SYSTEM'         },
];

const GROUPS = ['ACCOUNT', 'OPERATIONS', 'COMMUNICATIONS', 'COMPLIANCE', 'SYSTEM'];

// ─── Primitive components ──────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
  lockedColor?: string;
  disabled?: boolean;
}

function Toggle({ checked, onChange, locked, lockedColor = '#F59E0B', disabled }: ToggleProps) {
  const isDisabled = locked || disabled;
  const bg = checked ? (locked ? lockedColor : '#0D9488') : '#CBD5E1';
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={isDisabled}
      onClick={() => !isDisabled && onChange?.(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        background: bg, position: 'relative', flexShrink: 0,
        transition: 'background 200ms', padding: 0,
        opacity: isDisabled && !locked ? 0.5 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: 9, background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 200ms ease',
      }} />
    </button>
  );
}

interface SettingRowProps {
  label: string;
  desc?: string;
  locked?: boolean;
  lockedNote?: string;
  amber?: boolean;
  last?: boolean;
  children: React.ReactNode;
}

function SettingRow({ label, desc, locked, lockedNote, amber, last, children }: SettingRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', gap: 16,
      borderBottom: last ? 'none' : '1px solid #F9FAFB',
      background: amber ? 'rgba(254,243,199,0.3)' : 'transparent',
      minHeight: 52,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{label}</span>
          {locked && <Lock size={12} color="#F59E0B" />}
        </div>
        {desc && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
        {locked && lockedNote && (
          <div style={{ fontSize: 10, color: '#D97706', fontStyle: 'italic', marginTop: 2 }}>{lockedNote}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const,
      letterSpacing: '0.08em', marginBottom: 4, marginTop: 16,
    }}>
      {children}
    </div>
  );
}

interface InfoCardProps {
  color: 'amber' | 'blue' | 'emerald' | 'violet' | 'red';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const INFO_COLORS = {
  amber:   { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  blue:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
  emerald: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  violet:  { bg: '#F5F3FF', border: '#DDD6FE', text: '#4C1D95' },
  red:     { bg: '#FEF2F2', border: '#FECACA', text: '#7F1D1D' },
};

function InfoCard({ color, icon, children }: InfoCardProps) {
  const c = INFO_COLORS[color];
  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: c.text, fontSize: 12, lineHeight: 1.5 }}>
        {icon && <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>}
        <div>{children}</div>
      </div>
    </div>
  );
}

interface SSettingsInputProps {
  value: string | number;
  onChange: (v: string) => void;
  unit?: string;
  width?: number;
  mono?: boolean;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
  changed?: boolean;
}

function SSettingsInput({ value, onChange, unit, width = 80, mono, readOnly, type = 'text', placeholder, changed }: SSettingsInputProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{
          width, height: 36, padding: '0 10px',
          borderRadius: 8, fontSize: 13, outline: 'none',
          fontFamily: mono ? 'DM Mono, monospace' : 'Inter, sans-serif',
          background: '#F8FAFC',
          border: changed ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
          color: readOnly ? '#94A3B8' : '#0F172A',
          cursor: readOnly ? 'not-allowed' : 'text',
          boxSizing: 'border-box' as const,
        }}
      />
      {unit && <span style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{unit}</span>}
    </div>
  );
}

interface SSettingsSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  width?: number;
  changed?: boolean;
}

function SSettingsSelect({ value, onChange, options, width = 160, changed }: SSettingsSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width, height: 36, padding: '0 10px',
        borderRadius: 8, fontSize: 13,
        background: '#F8FAFC', border: changed ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
        color: '#0F172A', outline: 'none', cursor: 'pointer',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

interface SectionCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
  hasChanges?: boolean;
  onSave?: () => void;
  saving?: boolean;
}

function SCard({ id, icon, title, desc, children, hasChanges, onSave, saving }: SectionCardProps) {
  return (
    <div
      id={id}
      style={{
        background: '#fff', border: '1px solid #F1F5F9', borderRadius: 16,
        marginBottom: 24, padding: 24,
        boxShadow: '0 1px 6px rgba(15,45,74,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#F8FAFC',
            border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{title}</div>
            {desc && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{desc}</div>}
          </div>
        </div>
        {hasChanges && (
          <button
            onClick={onSave}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              background: saving ? '#94A3B8' : '#1E3A5F', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              animation: saving ? 'none' : 'savePulse 2s ease-in-out infinite',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {saving ? '...' : '💾 Save'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

interface RadioGroupProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; desc?: string }[];
  name: string;
}

function RadioGroup({ value, onChange, options }: RadioGroupProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map(opt => (
        <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <div
            onClick={() => onChange(opt.value)}
            style={{
              width: 16, height: 16, borderRadius: '50%',
              border: `2px solid ${value === opt.value ? '#0D9488' : '#CBD5E1'}`,
              background: value === opt.value ? '#0D9488' : '#fff',
              flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}
          >
            {value === opt.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
          </div>
          <div onClick={() => onChange(opt.value)}>
            <div style={{ fontSize: 13, color: '#374151', fontWeight: value === opt.value ? 600 : 400 }}>{opt.label}</div>
            {opt.desc && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{opt.desc}</div>}
          </div>
        </label>
      ))}
    </div>
  );
}

interface SmallBtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'navy' | 'teal' | 'amber' | 'red';
}

const BTN_STYLES = {
  default: { bg: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' },
  navy:    { bg: '#1E3A5F', color: '#fff',    border: '1px solid #1E3A5F' },
  teal:    { bg: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4' },
  amber:   { bg: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' },
  red:     { bg: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' },
};

function SmallBtn({ children, onClick, variant = 'default' }: SmallBtnProps) {
  const s = BTN_STYLES[variant];
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
        borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        background: s.bg, color: s.color, border: s.border, whiteSpace: 'nowrap' as const,
      }}
    >
      {children}
    </button>
  );
}

// ─── Section components ────────────────────────────────────────────────────────

interface SectionProps {
  dirty: Record<string, boolean>;
  markDirty: (id: string) => void;
  onSave: (id: string, msg: string) => void;
  saving: string | null;
  /** Real settings from Supabase, keyed by settingKey */
  settings: Record<string, { id: string; enabled: boolean }>;
  onToggleSetting: (settingId: string, nextEnabled: boolean) => void;
  busyId: string | null;
  profileName?: string;
  profileOfficer?: string;
  profileTitle?: string;
  // Lifted state for wired sections
  arabicName?: string;
  setArabicName?: (v: string) => void;
  email?: string;
  setEmail?: (v: string) => void;
  phone?: string;
  setPhone?: (v: string) => void;
  officerName?: string;
  setOfficerName?: (v: string) => void;
  officerTitle?: string;
  setOfficerTitle?: (v: string) => void;
  standardHours?: string;
  setStandardHours?: (v: string) => void;
  urgentHours?: string;
  setUrgentHours?: (v: string) => void;
  aiThreshold?: string;
  setAiThreshold?: (v: string) => void;
}

// ── Company Profile ───────────────────────────────────────────────────────────

function CompanyProfileSection({ dirty, markDirty, onSave, saving, profileName, profileOfficer, profileTitle, arabicName = '', setArabicName, email = '', setEmail, phone = '', setPhone }: SectionProps) {
  const [language, setLanguage] = useState<'english' | 'arabic' | 'both'>('english');
  const companyName = profileName ?? 'Daman National Health Insurance';
  const initials = companyName.charAt(0).toUpperCase();

  return (
    <SCard
      id="company-profile"
      icon={<Building2 size={20} color="#1E3A5F" />}
      title="Company Profile"
      desc="Your organisation's identity on the CeenAiX platform"
      hasChanges={dirty['company-profile']}
      onSave={() => onSave('company-profile', 'Company profile saved')}
      saving={saving === 'company-profile'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottom: '1px solid #F9FAFB', marginBottom: 4 }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, background: '#EFF6FF', border: '2px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 26, color: '#1E3A5F' }}>{initials}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{companyName}</div>
          <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginTop: 2 }}>Logo shown in sidebar, emails, and patient portal</div>
        </div>
        <SmallBtn>📷 Upload Logo</SmallBtn>
      </div>

      <SettingRow label="Company Name (EN)" desc="Contact CeenAiX admin to change company name" locked>
        <SSettingsInput value={companyName} onChange={() => {}} readOnly width={220} />
      </SettingRow>
      <SettingRow label="Company Name (AR)" desc="Displayed in Arabic language interface">
        <SSettingsInput value={arabicName} onChange={v => { setArabicName?.(v); markDirty('company-profile'); }} width={220} changed={dirty['company-profile']} />
      </SettingRow>
      <SettingRow label="License Number" desc="Insurance Authority license number" locked>
        <SSettingsInput value="CBUAE-INS-2006-001847" onChange={() => {}} readOnly mono width={200} />
      </SettingRow>
      <SettingRow label="Primary Contact Email" desc="Used for system notifications and DHA communications">
        <SSettingsInput value={email} onChange={v => { setEmail?.(v); markDirty('company-profile'); }} width={220} type="email" />
      </SettingRow>
      <SettingRow label="Support Phone" desc="Displayed to members on CeenAiX patient portal">
        <SSettingsInput value={phone} onChange={v => { setPhone?.(v); markDirty('company-profile'); }} width={160} />
      </SettingRow>
      <SettingRow label="Contact Person" desc="Primary technical contact for CeenAiX platform issues">
        <div style={{ display: 'flex', gap: 8 }}>
          <SSettingsInput value={profileOfficer ?? 'Mariam Al Khateeb'} onChange={() => markDirty('company-profile')} width={150} />
          <SSettingsInput value={profileTitle ?? 'Senior Claims Officer'} onChange={() => markDirty('company-profile')} width={160} />
        </div>
      </SettingRow>
      <SettingRow label="Portal Language" desc="Default language for portal interface" last>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['english', 'arabic', 'both'] as const).map(l => (
            <button
              key={l}
              onClick={() => { setLanguage(l); markDirty('company-profile'); }}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: language === l ? '#1E3A5F' : '#F8FAFC',
                color: language === l ? '#fff' : '#475569',
                border: language === l ? '1px solid #1E3A5F' : '1px solid #E2E8F0',
              }}
            >{l === 'both' ? 'Both' : l.charAt(0).toUpperCase() + l.slice(1)}</button>
          ))}
        </div>
      </SettingRow>
    </SCard>
  );
}

// ── My Account ────────────────────────────────────────────────────────────────

function MyAccountSection({ dirty, markDirty, onSave, saving, officerName = '', setOfficerName, officerTitle = '', setOfficerTitle }: SectionProps) {
  const [mobile, setMobile] = useState('+971 50 XXX XXXX');
  const [defaultView, setDefaultView] = useState('preauth');
  const initials = officerName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SCard
      id="my-account"
      icon={<User size={20} color="#1E3A5F" />}
      title="My Account"
      desc="Your personal portal account settings"
      hasChanges={dirty['my-account']}
      onSave={() => onSave('my-account', 'Account settings saved')}
      saving={saving === 'my-account'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottom: '1px solid #F9FAFB', marginBottom: 4 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: 'linear-gradient(135deg, #1E3A5F, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{initials}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{officerName}</div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{officerTitle}</div>
        </div>
        <SmallBtn>📷 Change Photo</SmallBtn>
      </div>

      <SettingRow label="Full Name">
        <SSettingsInput value={officerName} onChange={v => { setOfficerName?.(v); markDirty('my-account'); }} width={200} />
      </SettingRow>
      <SettingRow label="Job Title">
        <SSettingsInput value={officerTitle} onChange={v => { setOfficerTitle?.(v); markDirty('my-account'); }} width={200} />
      </SettingRow>
      <SettingRow label="Department">
        <SSettingsSelect
          value="claims"
          onChange={() => markDirty('my-account')}
          options={[
            { value: 'claims',     label: 'Claims & Pre-Authorization' },
            { value: 'fraud',      label: 'Fraud & SIU' },
            { value: 'compliance', label: 'Compliance' },
            { value: 'finance',    label: 'Finance' },
            { value: 'it',         label: 'IT' },
          ]}
          width={200}
        />
      </SettingRow>
      <SettingRow label="Employee ID" desc="Assigned by HR — read only" locked>
        <SSettingsInput value="DAM-EMP-2019-00847" onChange={() => {}} readOnly mono width={180} />
      </SettingRow>
      <SettingRow label="Work Email" desc="Managed by IT" locked>
        <SSettingsInput value="mariam.khateeb@daman.ae" onChange={() => {}} readOnly width={220} />
      </SettingRow>
      <SettingRow label="Mobile" desc="Used for SMS alerts and 2FA">
        <SSettingsInput value={mobile} onChange={v => { setMobile(v); markDirty('my-account'); }} width={160} />
      </SettingRow>
      <SettingRow label="Default Dashboard View" desc="What you see when you first log in" last>
        <RadioGroup
          name="default-view"
          value={defaultView}
          onChange={v => { setDefaultView(v); markDirty('my-account'); }}
          options={[
            { value: 'preauth',   label: 'Pre-Authorization Queue' },
            { value: 'claims',    label: 'Claims Dashboard' },
            { value: 'dashboard', label: 'Full Dashboard' },
          ]}
        />
      </SettingRow>
    </SCard>
  );
}

// ── Security & Access ─────────────────────────────────────────────────────────

function SecuritySection({ dirty, markDirty, onSave, saving }: SectionProps) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const pwValid = {
    length:  newPw.length >= 12,
    upper:   /[A-Z]/.test(newPw) && /[a-z]/.test(newPw),
    number:  /\d/.test(newPw),
    special: /[^a-zA-Z0-9]/.test(newPw),
  };

  return (
    <SCard
      id="security"
      icon={<ShieldCheck size={20} color="#1E3A5F" />}
      title="Security & Access"
      desc="Account security and access controls"
      hasChanges={dirty['security']}
      onSave={() => onSave('security', 'Password changed successfully')}
      saving={saving === 'security'}
    >
      <SectionLabel>Change Password</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <input
            type={showCurrent ? 'text' : 'password'}
            placeholder="Current password"
            value={currentPw}
            onChange={e => { setCurrentPw(e.target.value); markDirty('security'); }}
            style={{ width: '100%', height: 36, padding: '0 36px 0 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none', background: '#F8FAFC', boxSizing: 'border-box' }}
          />
          <button onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="password" placeholder="New password" value={newPw} onChange={e => { setNewPw(e.target.value); markDirty('security'); }}
            style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none', background: '#F8FAFC' }} />
          <input type="password" placeholder="Confirm password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); markDirty('security'); }}
            style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none', background: '#F8FAFC' }} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          {[
            { ok: pwValid.length,  label: '12+ characters' },
            { ok: pwValid.upper,   label: 'Upper + lower' },
            { ok: pwValid.number,  label: 'Number' },
            { ok: pwValid.special, label: 'Special char' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: r.ok ? '#059669' : '#CBD5E1' }}>
              <span>{r.ok ? '✅' : '○'}</span> {r.label}
            </div>
          ))}
        </div>
      </div>

      <SettingRow label="Two-Factor Authentication" desc="Required for all insurance portal staff" locked lockedNote="Required by DHA regulations">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 6, padding: '4px 8px' }}>✅ SMS · +971 50 ●●● ●●●●</span>
          <SmallBtn>Manage 2FA</SmallBtn>
        </div>
      </SettingRow>
      <SettingRow label="Auto Logout After Inactivity" desc="Recommended: 30 minutes for security compliance">
        <SSettingsSelect
          value={sessionTimeout}
          onChange={v => { setSessionTimeout(v); markDirty('security'); }}
          options={[
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
            { value: '120', label: '2 hours' },
          ]}
          width={140}
        />
      </SettingRow>

      <SectionLabel>Current Active Sessions</SectionLabel>
      {[
        { device: 'Chrome · Windows 11', location: 'Dubai, UAE', Icon: Monitor, time: 'This session', current: true },
        { device: 'Safari · iPhone 14',  location: 'Dubai, UAE', Icon: Smartphone, time: 'Yesterday 6:30 PM', current: false },
      ].map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i === 0 ? '1px solid #F9FAFB' : 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <s.Icon size={15} color="#64748B" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{s.device} · {s.location}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{s.time}</div>
          </div>
          {s.current
            ? <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#ECFDF5', borderRadius: 6, padding: '3px 8px' }}>🟢 This session</span>
            : <SmallBtn variant="red"><Lock size={11} /> Log Out</SmallBtn>
          }
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        <SmallBtn variant="red">Log Out All Other Sessions</SmallBtn>
      </div>
    </SCard>
  );
}

// ── Plan Configuration ────────────────────────────────────────────────────────

function PlanConfigSection({ dirty, markDirty, onSave, saving }: SectionProps) {
  const [activePlan, setActivePlan] = useState<'gold' | 'silver' | 'basic' | 'thiqa'>('gold');
  const [copays, setCopays] = useState({ gp: '10', specialist: '10', emergency: '0', lab: '10', radiology: '10', pharmaGeneric: '10', pharmaBrand: '20', physio: '10', mental: '10', dental: '50', tele: '10' });
  const [covered, setCovered] = useState({ gp: true, specialist: true, emergency: true, lab: true, radiology: true, pharmaGeneric: true, pharmaBrand: true, physio: true, mental: true, dentalEmergency: true, dentalCosmetic: false, optical: false, fertility: false, cosmetic: false, tele: true, altMed: false });
  const [annualLimit, setAnnualLimit] = useState('500000');
  const [showConfirm, setShowConfirm] = useState(false);

  const PLANS = [
    { id: 'gold',   label: 'Daman Gold',   members: 2847, limit: 'AED 500,000',   copay: '10%', color: '#D97706' },
    { id: 'silver', label: 'Daman Silver', members: 3104, limit: 'AED 150,000',   copay: '30%', color: '#64748B' },
    { id: 'basic',  label: 'Daman Basic',  members: 1896, limit: 'AED 75,000',    copay: '20%', color: '#0284C7' },
    { id: 'thiqa',  label: 'Thiqa',        members: 400,  limit: 'AED 1,000,000', copay: '0%',  color: '#059669' },
  ] as const;

  const COPAY_ROWS = [
    { key: 'gp' as const,           label: 'General Consultation',    locked: false },
    { key: 'specialist' as const,   label: 'Specialist Consultation', locked: false },
    { key: 'emergency' as const,    label: 'Emergency',               locked: true, note: 'Emergency must be 0% per UAE law' },
    { key: 'lab' as const,          label: 'Lab Tests',               locked: false },
    { key: 'radiology' as const,    label: 'Radiology / Imaging',     locked: false },
    { key: 'pharmaGeneric' as const, label: 'Pharmacy — Generic',     locked: false },
    { key: 'pharmaBrand' as const,  label: 'Pharmacy — Brand',        locked: false },
    { key: 'physio' as const,       label: 'Physiotherapy',           locked: false },
    { key: 'mental' as const,       label: 'Mental Health',           locked: false },
    { key: 'dental' as const,       label: 'Dental (emergency)',      locked: false },
    { key: 'tele' as const,         label: 'Teleconsultation',        locked: false },
  ];

  const COVERED_ROWS: { key: keyof typeof covered; label: string; locked?: boolean; lockNote?: string }[] = [
    { key: 'gp',            label: 'General Practice' },
    { key: 'specialist',    label: 'Specialist Consultations' },
    { key: 'emergency',     label: 'Emergency Care',          locked: true, lockNote: 'Mandatory by UAE law' },
    { key: 'lab',           label: 'Lab Tests' },
    { key: 'radiology',     label: 'Radiology' },
    { key: 'pharmaGeneric', label: 'Pharmacy (generic)' },
    { key: 'pharmaBrand',   label: 'Pharmacy (brand)' },
    { key: 'physio',        label: 'Physiotherapy' },
    { key: 'mental',        label: 'Mental Health' },
    { key: 'dentalEmergency', label: 'Dental (emergency only)' },
    { key: 'dentalCosmetic',  label: 'Dental (cosmetic)', locked: true, lockNote: 'Cosmetic dental excluded per policy' },
    { key: 'optical',       label: 'Optical' },
    { key: 'fertility',     label: 'Fertility Treatment',    locked: true, lockNote: 'Excluded per policy' },
    { key: 'cosmetic',      label: 'Cosmetic Procedures',   locked: true, lockNote: 'Cosmetic exclusion — cannot be enabled' },
    { key: 'tele',          label: 'Teleconsultation' },
    { key: 'altMed',        label: 'Alternative Medicine' },
  ];

  const currentPlan = PLANS.find(p => p.id === activePlan)!;

  return (
    <SCard
      id="plan-config"
      icon={<CreditCard size={20} color="#1E3A5F" />}
      title="Plan Configuration"
      desc="Manage insurance plan coverage rules on CeenAiX"
      hasChanges={dirty['plan-config']}
      onSave={() => setShowConfirm(true)}
      saving={saving === 'plan-config'}
    >
      <InfoCard color="amber" icon={<AlertTriangle size={14} />}>
        <strong>Plan configuration affects all 8,247 members.</strong> Changes take effect immediately. Contact CeenAiX admin before making coverage changes.
      </InfoCard>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #F1F5F9', paddingBottom: 0 }}>
        {PLANS.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePlan(p.id)}
            style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: activePlan === p.id ? 700 : 500,
              color: activePlan === p.id ? '#1E3A5F' : '#64748B',
              borderBottom: activePlan === p.id ? '2px solid #1E3A5F' : '2px solid transparent',
              marginBottom: -1,
            }}
          >{p.label}</button>
        ))}
      </div>

      <div style={{ padding: '14px 16px', borderRadius: 10, background: '#F0F9FF', border: '1px solid #BAE6FD', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 11, color: '#94A3B8' }}>PLAN</div><div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{currentPlan.label}</div></div>
        <div><div style={{ fontSize: 11, color: '#94A3B8' }}>MEMBERS</div><div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{currentPlan.members.toLocaleString()}</div></div>
        <div><div style={{ fontSize: 11, color: '#94A3B8' }}>ANNUAL LIMIT</div><div style={{ fontSize: 16, fontWeight: 800, color: '#059669', fontFamily: 'DM Mono, monospace' }}>{currentPlan.limit}</div></div>
        <div><div style={{ fontSize: 11, color: '#94A3B8' }}>BASE CO-PAY</div><div style={{ fontSize: 16, fontWeight: 800, color: '#0D9488', fontFamily: 'DM Mono, monospace' }}>{currentPlan.copay}</div></div>
        <div><div style={{ fontSize: 11, color: '#94A3B8' }}>STATUS</div><div style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>✅ Active</div></div>
      </div>

      <SectionLabel>Co-pay Rates by Service Type</SectionLabel>
      {COPAY_ROWS.map(row => (
        <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{row.label}</span>
            {row.locked && <Lock size={11} color="#F59E0B" />}
            {row.locked && row.note && <span style={{ fontSize: 10, color: '#D97706', fontStyle: 'italic' }}>{row.note}</span>}
          </div>
          <SSettingsInput
            value={copays[row.key]}
            onChange={v => { setCopays(prev => ({ ...prev, [row.key]: v })); markDirty('plan-config'); }}
            unit="%" width={60} mono readOnly={row.locked}
          />
        </div>
      ))}

      <SectionLabel>Benefit Limits</SectionLabel>
      <SettingRow label="Annual Limit (AED)" desc={`Change affects all ${currentPlan.members.toLocaleString()} ${currentPlan.label} members`}>
        <SSettingsInput value={annualLimit} onChange={v => { setAnnualLimit(v); markDirty('plan-config'); }} mono width={120} unit="AED" />
      </SettingRow>

      <SectionLabel>Pre-Auth Requirements</SectionLabel>
      {[
        { label: 'MRI / CT Imaging — PA required',  value: true,  note: 'MRI/CT pre-auth required per DHA' },
        { label: 'Elective Surgery — PA required',   value: true,  note: '' },
        { label: 'Emergency Procedures — PA required', value: false, note: 'Emergency care proceeds without PA' },
      ].map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{r.label}</span>
              <Lock size={11} color="#F59E0B" />
            </div>
            {r.note && <div style={{ fontSize: 11, color: '#D97706', fontStyle: 'italic', marginTop: 2 }}>{r.note}</div>}
          </div>
          <Toggle checked={r.value} locked lockedColor={r.value ? '#F59E0B' : '#CBD5E1'} />
        </div>
      ))}

      <SectionLabel>Covered Services</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {COVERED_ROWS.map(r => (
          <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: r.locked && !covered[r.key] ? 'rgba(254,243,199,0.2)' : '#F9FAFB' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: '#374151' }}>
                {r.label}
                {r.locked && <Lock size={10} color="#F59E0B" />}
              </div>
              {r.lockNote && <div style={{ fontSize: 10, color: '#D97706', fontStyle: 'italic' }}>{r.lockNote}</div>}
            </div>
            <Toggle
              checked={covered[r.key]}
              locked={r.locked}
              lockedColor={covered[r.key] ? '#F59E0B' : '#CBD5E1'}
              onChange={v => { setCovered(prev => ({ ...prev, [r.key]: v })); markDirty('plan-config'); }}
            />
          </div>
        ))}
      </div>

      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 380, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Confirm Plan Changes</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
              Saving will affect <strong>{currentPlan.members.toLocaleString()} {currentPlan.label} members</strong>. Are you sure?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '10px 0', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { setShowConfirm(false); onSave('plan-config', `${currentPlan.label} plan configuration saved`); }} style={{ flex: 1, padding: '10px 0', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>✅ Confirm Save</button>
            </div>
          </div>
        </div>
      )}
    </SCard>
  );
}

// ── Pre-Auth & SLA ────────────────────────────────────────────────────────────

function PreAuthSlaSection({ dirty, markDirty, onSave, saving, urgentHours = '4', setUrgentHours, standardHours = '8', setStandardHours }: SectionProps) {
  const [highTarget, setHighTarget] = useState('4');
  const [bulkThreshold, setBulkThreshold] = useState('90');
  const [responseWindow, setResponseWindow] = useState('3');
  const [validityDays, setValidityDays] = useState('30');
  const [escalateAfter, setEscalateAfter] = useState('2');
  const [queueOrder, setQueueOrder] = useState('urgency');
  const [emailEscalation, setEmailEscalation] = useState(true);
  const [smsEscalation, setSmsEscalation] = useState(false);

  return (
    <SCard
      id="preauth-sla"
      icon={<ClipboardList size={20} color="#1E3A5F" />}
      title="Pre-Auth & SLA"
      desc="Configure SLA targets and pre-authorization workflow"
      hasChanges={dirty['preauth-sla']}
      onSave={() => onSave('preauth-sla', 'Pre-auth SLA settings saved')}
      saving={saving === 'preauth-sla'}
    >
      <div style={{ padding: '14px 16px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Lock size={13} color="#F59E0B" />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#92400E', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>DHA Mandated SLA Targets — Cannot Be Changed</span>
        </div>
        {[
          { type: 'Urgent pre-auth', time: '4 hours',  note: 'DHA Insurance Law Art. 34' },
          { type: 'High priority',   time: '8 hours',  note: 'DHA mandate' },
          { type: 'Standard',        time: '24 hours', note: 'DHA mandate' },
          { type: 'Emergency',       time: 'Immediate', note: 'No PA required' },
        ].map(r => (
          <div key={r.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(253,230,138,0.5)' }}>
            <span style={{ fontSize: 12, color: '#92400E' }}>{r.type}</span>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E', fontFamily: 'DM Mono, monospace' }}>{r.time}</span>
              <span style={{ fontSize: 11, color: '#B45309' }}>{r.note}</span>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: '#92400E', fontStyle: 'italic', marginTop: 8 }}>These SLA targets are set by UAE DHA regulation and cannot be modified.</div>
      </div>

      <SectionLabel>Daman Internal Targets</SectionLabel>
      <SettingRow label="Urgent (internal goal)" desc="DHA limit: 4h — buffer ensures compliance">
        <SSettingsInput value={urgentHours} onChange={v => { setUrgentHours?.(v); markDirty('preauth-sla'); }} unit="hours" mono width={60} />
      </SettingRow>
      <SettingRow label="High Priority" desc="DHA limit: 8h">
        <SSettingsInput value={highTarget} onChange={v => { setHighTarget(v); markDirty('preauth-sla'); }} unit="hours" mono width={60} />
      </SettingRow>
      <SettingRow label="Standard" desc="DHA limit: 24h">
        <SSettingsInput value={standardHours} onChange={v => { setStandardHours?.(v); markDirty('preauth-sla'); }} unit="hours" mono width={60} />
      </SettingRow>
      <InfoCard color="emerald">Buffer time protects against SLA breaches and DHA penalties.</InfoCard>

      <SectionLabel>Breach Response Actions</SectionLabel>
      {[
        { label: 'Alert in portal top bar',             locked: true },
        { label: 'Push notification to claims team',    locked: true },
        { label: 'Auto-log in DHA compliance record',   locked: true },
        { label: 'Email alert to department head',      locked: false, checked: emailEscalation, onChange: (v: boolean) => { setEmailEscalation(v); markDirty('preauth-sla'); } },
        { label: 'SMS alert to medical director',       locked: false, checked: smsEscalation,   onChange: (v: boolean) => { setSmsEscalation(v); markDirty('preauth-sla'); } },
      ].map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#374151' }}>{r.label}</span>
            {r.locked && <Lock size={11} color="#F59E0B" />}
          </div>
          <Toggle
            checked={r.locked ? true : (r.checked ?? false)}
            locked={r.locked}
            onChange={r.onChange ?? (() => {})}
          />
        </div>
      ))}
      <SettingRow label="Auto-escalation threshold" desc="Escalate to medical director if not resolved within:">
        <SSettingsInput value={escalateAfter} onChange={v => { setEscalateAfter(v); markDirty('preauth-sla'); }} unit="hours overdue" mono width={60} />
      </SettingRow>

      <SectionLabel>Pre-Auth Workflow</SectionLabel>
      <SettingRow label="Queue Order" desc="How PA requests are sorted in the queue">
        <RadioGroup
          name="queue-order"
          value={queueOrder}
          onChange={v => { setQueueOrder(v); markDirty('preauth-sla'); }}
          options={[
            { value: 'urgency', label: 'Urgency (SLA remaining)' },
            { value: 'time',    label: 'Submission time (FIFO)' },
            { value: 'risk',    label: 'Risk level (high-cost first)' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Bulk Approve AI Threshold" desc="Allow bulk approve when AI confidence ≥ this value">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <SSettingsInput value={bulkThreshold} onChange={v => { setBulkThreshold(v); markDirty('preauth-sla'); }} unit="%" mono width={70} changed={dirty['preauth-sla']} />
          {Number(bulkThreshold) < 85 && (
            <div style={{ fontSize: 11, color: '#D97706', fontStyle: 'italic', textAlign: 'right' }}>⚠️ Below 85% not recommended</div>
          )}
        </div>
      </SettingRow>
      <SettingRow label="Info Request Response Window" desc="Doctor must respond to information requests within:">
        <SSettingsInput value={responseWindow} onChange={v => { setResponseWindow(v); markDirty('preauth-sla'); }} unit="business days" mono width={60} />
      </SettingRow>
      <SettingRow label="Approved PA Validity" desc="Standard validity period for approved pre-authorizations" last>
        <SSettingsInput value={validityDays} onChange={v => { setValidityDays(v); markDirty('preauth-sla'); }} unit="days" mono width={60} />
      </SettingRow>
    </SCard>
  );
}

// ── AI & Automation ───────────────────────────────────────────────────────────

function AIAutomationSection({ dirty, markDirty, onSave, saving, settings, onToggleSetting, busyId, aiThreshold = '95', setAiThreshold }: SectionProps) {
  const [showRecs, setShowRecs] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [showReasoning, setShowReasoning] = useState(true);
  const [autoDenyThreshold, setAutoDenyThreshold] = useState('99');
  const [autoDenyReason, setAutoDenyReason] = useState(true);
  const [fraudSensitivity, setFraudSensitivity] = useState('medium');
  const [fraudFreezeThreshold, setFraudFreezeThreshold] = useState('90');
  const [fraudEscalateAfter, setFraudEscalateAfter] = useState('24');
  const [aiDropAlert, setAiDropAlert] = useState('85');
  const [fpRateAlert, setFpRateAlert] = useState('8');
  const [monthlyReport, setMonthlyReport] = useState(true);

  const approvalPct = Math.max(0, Math.min(100, (Number(aiThreshold) - 80) / 20 * 100));

  // If there's a real "ai_auto_approve" setting in Supabase, use it; otherwise fall back to local state
  const aiAutoApproveSetting = settings['ai_auto_approve'];

  return (
    <SCard
      id="ai-automation"
      icon={<Bot size={20} color="#7C3AED" />}
      title="AI & Automation"
      desc="Configure CeenAiX AI behaviour for your portal"
      hasChanges={dirty['ai-automation']}
      onSave={() => onSave('ai-automation', `AI threshold updated — ${aiThreshold}% confidence required`)}
      saving={saving === 'ai-automation'}
    >
      <div style={{ padding: '14px 16px', borderRadius: 10, background: '#F5F3FF', border: '1px solid #DDD6FE', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Bot size={20} color="#7C3AED" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95' }}>CeenAiX AI · claude-sonnet-4 · Production</div>
          <div style={{ fontSize: 12, color: '#6D28D9' }}>AI is active and processing all claims and pre-auths</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginTop: 2 }}>✅ Operational · 99.98% uptime</div>
        </div>
      </div>

      <SectionLabel>AI Recommendations</SectionLabel>
      <SettingRow label="Enable AI recommendations on pre-auth" desc="Show ✅ AI: APPROVE / ⚠️ AI: REVIEW / ❌ AI: DENY badges">
        <Toggle checked={showRecs} onChange={v => { setShowRecs(v); markDirty('ai-automation'); }} />
      </SettingRow>
      <SettingRow label="Show AI confidence score" desc="Display confidence % (e.g., 98%) on badges">
        <Toggle checked={showConfidence} onChange={v => { setShowConfidence(v); markDirty('ai-automation'); }} />
      </SettingRow>
      <SettingRow label="Show AI reasoning tooltip" desc="Hover on badge shows full AI reasoning">
        <Toggle checked={showReasoning} onChange={v => { setShowReasoning(v); markDirty('ai-automation'); }} />
      </SettingRow>

      <SectionLabel>Automated Claim Processing</SectionLabel>
      {aiAutoApproveSetting ? (
        <SettingRow label="Auto-approve enabled" desc="Claims where AI confidence meets threshold are auto-approved">
          <Toggle
            checked={aiAutoApproveSetting.enabled}
            disabled={busyId === aiAutoApproveSetting.id}
            onChange={v => onToggleSetting(aiAutoApproveSetting.id, v)}
          />
        </SettingRow>
      ) : null}
      <SettingRow label="Auto-approve threshold" desc="Claims where AI confidence ≥ this are auto-approved">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', minWidth: 160 }}>
          <SSettingsInput value={aiThreshold} onChange={v => { setAiThreshold?.(v); markDirty('ai-automation'); }} unit="%" mono width={70} changed={dirty['ai-automation']} />
          <div style={{ width: 160, background: '#E2E8F0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${approvalPct}%`, background: '#0D9488', borderRadius: 4, transition: 'width 0.2s' }} />
          </div>
          <div style={{ fontSize: 10, color: '#0D9488', fontFamily: 'DM Mono, monospace' }}>At {aiThreshold}%: ~{Math.round(approvalPct * 0.78 + 20)}% claims auto-approved</div>
          {Number(aiThreshold) < 85 && (
            <div style={{ fontSize: 11, color: '#D97706', fontStyle: 'italic', textAlign: 'right' }}>⚠️ Below 85% significantly increases false positives</div>
          )}
        </div>
      </SettingRow>
      <SettingRow label="Auto-deny threshold" desc="Only deny automatically when AI is near-certain (e.g., clear plan exclusions)">
        <SSettingsInput value={autoDenyThreshold} onChange={v => { setAutoDenyThreshold(v); markDirty('ai-automation'); }} unit="%" mono width={70} />
      </SettingRow>
      <SettingRow label="Auto-denials include AI reasoning in EOB">
        <Toggle checked={autoDenyReason} onChange={v => { setAutoDenyReason(v); markDirty('ai-automation'); }} />
      </SettingRow>

      <SectionLabel>AI Fraud Detection</SectionLabel>
      <SettingRow label="Fraud detection" desc="Required for Daman compliance" locked lockedNote="Required for Daman compliance">
        <Toggle checked={true} locked />
      </SettingRow>
      <SettingRow label="Fraud detection sensitivity">
        <RadioGroup
          name="fraud-sensitivity"
          value={fraudSensitivity}
          onChange={v => { setFraudSensitivity(v); markDirty('ai-automation'); }}
          options={[
            { value: 'low',    label: 'Low — fewer alerts, lower false positives' },
            { value: 'medium', label: 'Medium — balanced (recommended)' },
            { value: 'high',   label: 'High — more alerts, higher false positive rate' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Auto-freeze threshold" desc="Claims automatically frozen pending review">
        <SSettingsInput value={fraudFreezeThreshold} onChange={v => { setFraudFreezeThreshold(v); markDirty('ai-automation'); }} unit="%" mono width={70} />
      </SettingRow>
      <SettingRow label="Fraud alert escalation" desc="If not reviewed by investigator within:">
        <SSettingsInput value={fraudEscalateAfter} onChange={v => { setFraudEscalateAfter(v); markDirty('ai-automation'); }} unit="hours" mono width={70} />
      </SettingRow>

      <SectionLabel>AI Performance Alerts</SectionLabel>
      <SettingRow label="Alert when AI accuracy drops below" desc="True positive rate">
        <SSettingsInput value={aiDropAlert} onChange={v => { setAiDropAlert(v); markDirty('ai-automation'); }} unit="%" mono width={70} />
      </SettingRow>
      <SettingRow label="Alert when false positive rate exceeds" desc="Higher = AI triggering too many alerts">
        <SSettingsInput value={fpRateAlert} onChange={v => { setFpRateAlert(v); markDirty('ai-automation'); }} unit="%" mono width={70} />
      </SettingRow>
      <SettingRow label="Monthly AI performance report" desc="Auto-generated first of month → sent to your email" last>
        <Toggle checked={monthlyReport} onChange={v => { setMonthlyReport(v); markDirty('ai-automation'); }} />
      </SettingRow>
    </SCard>
  );
}

// ── Fraud Detection ───────────────────────────────────────────────────────────

function FraudDetectionSection({ dirty, markDirty, onSave, saving, settings, onToggleSetting, busyId }: SectionProps) {
  const [claimsPerDay, setClaimsPerDay] = useState('20');
  const [valueVariance, setValueVariance] = useState('10');
  const [nabidhMatchRate, setNabidhMatchRate] = useState('70');
  const [dupDays, setDupDays] = useState('30');
  const [dupMultiDays, setDupMultiDays] = useState('7');
  const [upcodeRate, setUpcodeRate] = useState('40');
  const [afterHours, setAfterHours] = useState(true);
  const [dhaNotify, setDhaNotify] = useState('confidence');
  const [dhaReminder, setDhaReminder] = useState('48');

  // Wire real Supabase settings by known keys
  const fraudAlertSetting = settings['fraud_detection_alerts'];

  return (
    <SCard
      id="fraud-detection"
      icon={<AlertTriangle size={20} color="#DC2626" />}
      title="Fraud Detection"
      desc="Configure fraud monitoring rules and thresholds"
      hasChanges={dirty['fraud-detection']}
      onSave={() => onSave('fraud-detection', 'Fraud detection settings saved')}
      saving={saving === 'fraud-detection'}
    >
      {fraudAlertSetting && (
        <SettingRow label="Fraud detection alerts" desc={`Live alerts — ${fraudAlertSetting.enabled ? 'enabled' : 'disabled'}`}>
          <Toggle
            checked={fraudAlertSetting.enabled}
            disabled={busyId === fraudAlertSetting.id}
            onChange={v => onToggleSetting(fraudAlertSetting.id, v)}
          />
        </SettingRow>
      )}

      <SectionLabel>Anomalous Volume Detection</SectionLabel>
      <SettingRow label="Flag provider if claims/day exceeds" desc="Network avg: 6/day · Absolute max: ~15/day">
        <SSettingsInput value={claimsPerDay} onChange={v => { setClaimsPerDay(v); markDirty('fraud-detection'); }} unit="claims/day" mono width={70} />
      </SettingRow>
      <SettingRow label="Flag if claim value variance below" desc="Identical amounts = billing fraud signal">
        <SSettingsInput value={valueVariance} onChange={v => { setValueVariance(v); markDirty('fraud-detection'); }} unit="%" mono width={70} />
      </SettingRow>

      <SectionLabel>Nabidh Verification Thresholds</SectionLabel>
      <SettingRow label="Flag provider if Nabidh match rate below" desc="Network avg: 91.4% · <70% = strong fraud indicator">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <SSettingsInput value={nabidhMatchRate} onChange={v => { setNabidhMatchRate(v); markDirty('fraud-detection'); }} unit="%" mono width={70} />
          <div style={{ fontSize: 10, color: '#EF4444', fontStyle: 'italic', background: '#FEF2F2', padding: '3px 8px', borderRadius: 4 }}>Dr. Khalid Ibrahim: 0% → auto-escalated</div>
        </div>
      </SettingRow>

      <SectionLabel>Duplicate Detection</SectionLabel>
      <SettingRow label="Flag same procedure, same patient within" desc="Same CPT + same patient = duplicate">
        <SSettingsInput value={dupDays} onChange={v => { setDupDays(v); markDirty('fraud-detection'); }} unit="days" mono width={70} />
      </SettingRow>
      <SettingRow label="Flag same procedure, multiple providers within" desc="Catches coordinated billing rings">
        <SSettingsInput value={dupMultiDays} onChange={v => { setDupMultiDays(v); markDirty('fraud-detection'); }} unit="days" mono width={70} />
      </SettingRow>

      <SectionLabel>Billing Patterns</SectionLabel>
      <SettingRow label="Flag if CPT 99215 rate exceeds" desc="Network avg: 18% · >40% = systematic upcoding">
        <SSettingsInput value={upcodeRate} onChange={v => { setUpcodeRate(v); markDirty('fraud-detection'); }} unit="%" mono width={70} />
      </SettingRow>
      <SettingRow label="Flag out-of-hours claims" desc="Claims between 11 PM and 6 AM if >50% from provider">
        <Toggle checked={afterHours} onChange={v => { setAfterHours(v); markDirty('fraud-detection'); }} />
      </SettingRow>

      <SectionLabel>DHA Fraud Reporting</SectionLabel>
      <SettingRow label="Auto-notify DHA for HIGH-confidence cases">
        <RadioGroup
          name="dha-fraud"
          value={dhaNotify}
          onChange={v => { setDhaNotify(v); markDirty('fraud-detection'); }}
          options={[
            { value: 'never',      label: 'Never (manual only)' },
            { value: 'confidence', label: 'When AI confidence >90% (recommended)' },
            { value: 'always',     label: 'Always (for all flagged cases)' },
          ]}
        />
      </SettingRow>
      <SettingRow label="DHA submission deadline reminder" desc="Remind before DHA fraud reporting deadline" last>
        <SSettingsInput value={dhaReminder} onChange={v => { setDhaReminder(v); markDirty('fraud-detection'); }} unit="hours before" mono width={70} />
      </SettingRow>
    </SCard>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────

type Channel = 'app' | 'push' | 'email' | 'sms';
interface NotifRow { label: string; locked?: boolean; lockNote?: string; app: boolean; push: boolean; email: boolean; sms: boolean }

function NotificationsSection({ dirty, markDirty, onSave, saving, settings, onToggleSetting, busyId }: SectionProps) {
  const [pushOn, setPushOn] = useState(true);
  const [emailOn, setEmailOn] = useState(true);
  const [smsOn, setSmsOn] = useState(true);
  const [quietEnabled, setQuietEnabled] = useState(true);
  const [quietFrom, setQuietFrom] = useState('22:00');
  const [quietTo, setQuietTo] = useState('07:00');
  const [notifs, setNotifs] = useState<Record<string, NotifRow>>({
    pa_new:      { label: 'New PA received',              app: true,  push: true,  email: false, sms: false },
    pa_urgent:   { label: 'Urgent PA (4h SLA)',           app: true,  push: true,  email: true,  sms: true  },
    pa_breach:   { label: 'SLA breach',                   app: true,  push: true,  email: true,  sms: true,  locked: true, lockNote: 'SLA alerts always delivered' },
    pa_decision: { label: 'PA approved/denied',           app: true,  push: false, email: false, sms: false },
    pa_info:     { label: 'Info request response',        app: true,  push: true,  email: true,  sms: false },
    clm_new:     { label: 'New claim submitted',          app: true,  push: false, email: false, sms: false },
    clm_pending: { label: 'Claim pending review',         app: true,  push: true,  email: false, sms: false },
    clm_appeal:  { label: 'Claim appealed',               app: true,  push: true,  email: true,  sms: false },
    clm_bulk:    { label: 'Bulk approval complete',       app: true,  push: true,  email: true,  sms: false },
    clm_eob:     { label: 'EOB batch complete',           app: true,  push: true,  email: true,  sms: false },
    frd_new:     { label: 'NEW fraud alert',              app: true,  push: true,  email: true,  sms: true,  locked: true, lockNote: 'Fraud alerts always delivered on all channels' },
    frd_high:    { label: 'HIGH fraud alert',             app: true,  push: true,  email: true,  sms: true  },
    frd_resolve: { label: 'Fraud case resolved',          app: true,  push: true,  email: true,  sms: false },
    frd_freeze:  { label: 'Claims frozen by AI',          app: true,  push: true,  email: true,  sms: false },
    mbr_near:    { label: 'Member near benefit limit',    app: true,  push: false, email: true,  sms: false },
    mbr_exhaust: { label: 'Member limit exhausted',       app: true,  push: true,  email: true,  sms: false },
    mbr_crit:    { label: 'Critical risk member alert',   app: true,  push: true,  email: true,  sms: false },
    rpt_done:    { label: 'Report generated',             app: true,  push: false, email: false, sms: false },
    rpt_fail:    { label: 'Scheduled report failure',     app: true,  push: true,  email: true,  sms: false },
    dha_due:     { label: 'DHA submission due',           app: true,  push: true,  email: true,  sms: false },
    sys_maint:   { label: 'System maintenance',           app: true,  push: true,  email: true,  sms: false },
    prv_cred:    { label: 'Provider credentialing ready', app: true,  push: true,  email: true,  sms: false },
  });

  function toggleCell(id: string, ch: Channel) {
    const row = notifs[id];
    if (row.locked) return;
    setNotifs(prev => ({ ...prev, [id]: { ...prev[id], [ch]: !prev[id][ch] } }));
    markDirty('notifications');
  }

  const SECTION_ROWS: { label: string; ids: string[] }[] = [
    { label: 'PRE-AUTHORIZATION', ids: ['pa_new', 'pa_urgent', 'pa_breach', 'pa_decision', 'pa_info'] },
    { label: 'CLAIMS',            ids: ['clm_new', 'clm_pending', 'clm_appeal', 'clm_bulk', 'clm_eob'] },
    { label: 'FRAUD',             ids: ['frd_new', 'frd_high', 'frd_resolve', 'frd_freeze'] },
    { label: 'MEMBERS',           ids: ['mbr_near', 'mbr_exhaust', 'mbr_crit'] },
    { label: 'REPORTS & SYSTEM',  ids: ['rpt_done', 'rpt_fail', 'dha_due', 'sys_maint', 'prv_cred'] },
  ];

  const channels: { key: Channel; label: string }[] = [
    { key: 'app',   label: 'In-App' },
    { key: 'push',  label: 'Push' },
    { key: 'email', label: 'Email' },
    { key: 'sms',   label: 'SMS' },
  ];

  // Wire real Supabase notification setting if present
  const notifSetting = settings['notifications_enabled'];

  return (
    <SCard
      id="notifications"
      icon={<Bell size={20} color="#1E3A5F" />}
      title="Notifications"
      desc="Control which events trigger alerts and how you receive them"
      hasChanges={dirty['notifications']}
      onSave={() => onSave('notifications', 'Notification preferences saved')}
      saving={saving === 'notifications'}
    >
      <SectionLabel>Notification Channels</SectionLabel>
      {notifSetting && (
        <SettingRow label="Notifications enabled" desc="Master switch for all notification delivery">
          <Toggle checked={notifSetting.enabled} disabled={busyId === notifSetting.id} onChange={v => onToggleSetting(notifSetting.id, v)} />
        </SettingRow>
      )}
      {[
        { Icon: Bell, label: 'In-App Notifications', desc: 'Portal notification bell', on: true, locked: true, sub: undefined, onChange: undefined },
        { Icon: Smartphone, label: 'Push Notifications', desc: 'Mobile push alerts', on: pushOn, sub: '3 devices configured', onChange: (v: boolean) => { setPushOn(v); markDirty('notifications'); } },
        { Icon: Mail, label: 'Email Alerts', desc: 'mariam.khateeb@daman.ae', on: emailOn, sub: 'Summary: Immediate for urgent, daily digest for others', onChange: (v: boolean) => { setEmailOn(v); markDirty('notifications'); } },
        { Icon: MessageSquare, label: 'SMS Alerts', desc: '+971 50 XXX XXXX', on: smsOn, sub: 'Only for: SLA breaches + HIGH fraud alerts', onChange: (v: boolean) => { setSmsOn(v); markDirty('notifications'); } },
      ].map((ch, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F9FAFB' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ch.Icon size={15} color="#64748B" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{ch.label}</span>
              {ch.locked && <Lock size={11} color="#F59E0B" />}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{ch.desc}</div>
            {ch.sub && <div style={{ fontSize: 10, color: '#0D9488', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>{ch.sub}</div>}
          </div>
          <Toggle checked={ch.on} locked={ch.locked} onChange={ch.onChange} />
        </div>
      ))}

      <div style={{ marginTop: 20, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>Event</th>
              {channels.map(c => (
                <th key={c.key} style={{ textAlign: 'center', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#94A3B8', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTION_ROWS.map(sec => (
              <React.Fragment key={sec.label}>
                <tr>
                  <td colSpan={5} style={{ padding: '10px 12px 4px', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', background: '#FAFAFA' }}>
                    {sec.label}
                  </td>
                </tr>
                {sec.ids.map((id) => {
                  const row = notifs[id];
                  return (
                    <tr key={id} style={{ borderBottom: '1px solid #F9FAFB', background: row.locked ? 'rgba(254,243,199,0.2)' : '#fff' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: '#374151' }}>{row.label}</span>
                          {row.locked && <Lock size={10} color="#F59E0B" />}
                        </div>
                        {row.lockNote && <div style={{ fontSize: 10, color: '#D97706', fontStyle: 'italic', marginTop: 1 }}>{row.lockNote}</div>}
                      </td>
                      {channels.map(c => (
                        <td key={c.key} style={{ textAlign: 'center', padding: '8px 10px' }}>
                          <input
                            type="checkbox"
                            checked={row[c.key]}
                            disabled={row.locked}
                            onChange={() => toggleCell(id, c.key)}
                            style={{ width: 15, height: 15, accentColor: '#0D9488', cursor: row.locked ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <SectionLabel>Quiet Hours</SectionLabel>
      <SettingRow label="Suppress non-urgent notifications" desc="Urgent alerts (SLA breaches, HIGH fraud) override quiet hours">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Toggle checked={quietEnabled} onChange={v => { setQuietEnabled(v); markDirty('notifications'); }} />
          {quietEnabled && (
            <>
              <span style={{ fontSize: 12, color: '#64748B' }}>From</span>
              <input type="time" value={quietFrom} onChange={e => { setQuietFrom(e.target.value); markDirty('notifications'); }}
                style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} />
              <span style={{ fontSize: 12, color: '#64748B' }}>to</span>
              <input type="time" value={quietTo} onChange={e => { setQuietTo(e.target.value); markDirty('notifications'); }}
                style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} />
            </>
          )}
        </div>
      </SettingRow>
    </SCard>
  );
}

// ── Email & Alerts ────────────────────────────────────────────────────────────

function EmailAlertsSection({ dirty, markDirty, onSave, saving }: SectionProps) {
  const [slaCc, setSlaCc] = useState('manager@daman.ae');
  const [fraudCc, setFraudCc] = useState('fraud@daman.ae, cso@daman.ae');
  const [dhaCc, setDhaCc] = useState('compliance@daman.ae');
  const [dailyDigest, setDailyDigest] = useState(true);
  const [dailyTime, setDailyTime] = useState('08:00');
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [weeklyDay, setWeeklyDay] = useState('Monday');
  const [weeklyTime, setWeeklyTime] = useState('07:00');
  const [emailLang, setEmailLang] = useState<'english' | 'arabic' | 'both'>('english');
  const [dailyClaimsAlert, setDailyClaimsAlert] = useState('2000000');
  const [budgetPct, setBudgetPct] = useState('90');
  const [singleClaimAlert, setSingleClaimAlert] = useState('50000');

  return (
    <SCard
      id="email-alerts"
      icon={<Mail size={20} color="#1E3A5F" />}
      title="Email & Alerts"
      desc="Configure email delivery preferences and alert thresholds"
      hasChanges={dirty['email-alerts']}
      onSave={() => onSave('email-alerts', 'Email alert settings saved')}
      saving={saving === 'email-alerts'}
    >
      <SettingRow label="Primary Email" locked desc="Managed by IT">
        <SSettingsInput value="mariam.khateeb@daman.ae" onChange={() => {}} readOnly width={220} />
      </SettingRow>

      <SectionLabel>CC Recipients</SectionLabel>
      <SettingRow label="SLA Breaches CC">
        <SSettingsInput value={slaCc} onChange={v => { setSlaCc(v); markDirty('email-alerts'); }} width={220} />
      </SettingRow>
      <SettingRow label="Fraud HIGH CC">
        <SSettingsInput value={fraudCc} onChange={v => { setFraudCc(v); markDirty('email-alerts'); }} width={220} />
      </SettingRow>
      <SettingRow label="DHA Reports CC">
        <SSettingsInput value={dhaCc} onChange={v => { setDhaCc(v); markDirty('email-alerts'); }} width={220} />
      </SettingRow>

      <SectionLabel>Email Digest</SectionLabel>
      <SettingRow label="Daily Digest" desc="PA queue summary, claims overview, pending actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Toggle checked={dailyDigest} onChange={v => { setDailyDigest(v); markDirty('email-alerts'); }} />
          {dailyDigest && <input type="time" value={dailyTime} onChange={e => { setDailyTime(e.target.value); markDirty('email-alerts'); }}
            style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} />}
        </div>
      </SettingRow>
      <SettingRow label="Weekly Digest" desc="Full week summary and performance metrics">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Toggle checked={weeklyDigest} onChange={v => { setWeeklyDigest(v); markDirty('email-alerts'); }} />
          {weeklyDigest && (
            <>
              <select value={weeklyDay} onChange={e => { setWeeklyDay(e.target.value); markDirty('email-alerts'); }}
                style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input type="time" value={weeklyTime} onChange={e => { setWeeklyTime(e.target.value); markDirty('email-alerts'); }}
                style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} />
            </>
          )}
        </div>
      </SettingRow>

      <SectionLabel>Email Language</SectionLabel>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['english', 'arabic', 'both'] as const).map(l => (
          <button key={l} onClick={() => { setEmailLang(l); markDirty('email-alerts'); }}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: emailLang === l ? '#1E3A5F' : '#F8FAFC', color: emailLang === l ? '#fff' : '#475569', border: emailLang === l ? '1px solid #1E3A5F' : '1px solid #E2E8F0' }}>
            {l === 'both' ? 'Bilingual' : l.charAt(0).toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>

      <SectionLabel>Financial Alert Rules</SectionLabel>
      <SettingRow label="Alert when daily claims exceed">
        <SSettingsInput value={dailyClaimsAlert} onChange={v => { setDailyClaimsAlert(v); markDirty('email-alerts'); }} unit="AED" mono width={110} />
      </SettingRow>
      <SettingRow label="Alert when monthly spend exceeds % of budget" desc="Alert when this % of monthly budget is reached">
        <SSettingsInput value={budgetPct} onChange={v => { setBudgetPct(v); markDirty('email-alerts'); }} unit="%" mono width={70} />
      </SettingRow>
      <SettingRow label="Alert when single claim exceeds" desc="High-value claims get individual email alerts" last>
        <SSettingsInput value={singleClaimAlert} onChange={v => { setSingleClaimAlert(v); markDirty('email-alerts'); }} unit="AED" mono width={100} />
      </SettingRow>
    </SCard>
  );
}

// ── Member Communications ─────────────────────────────────────────────────────

function MemberCommsSection({ dirty, markDirty, onSave, saving }: SectionProps) {
  const [paApprovedNotif, setPaApprovedNotif] = useState(true);
  const [claimApprovedNotif, setClaimApprovedNotif] = useState(true);
  const [benefitAlertOn, setBenefitAlertOn] = useState(true);
  const [aiOutreach, setAiOutreach] = useState(true);
  const [campaignLang, setCampaignLang] = useState<'arabic' | 'english' | 'both'>('both');
  const [campaignConsent, setCampaignConsent] = useState(true);

  return (
    <SCard
      id="member-comms"
      icon={<Users size={20} color="#1E3A5F" />}
      title="Member Communications"
      desc="Configure automated messages sent to members"
      hasChanges={dirty['member-comms']}
      onSave={() => onSave('member-comms', 'Member communication settings saved')}
      saving={saving === 'member-comms'}
    >
      <InfoCard color="blue">
        ℹ️ All member communications via CeenAiX must comply with UAE PDPL (Federal Law No. 45/2021) and DHA communication guidelines. All messages are logged.
      </InfoCard>

      <SectionLabel>Automated Member Notifications</SectionLabel>
      <SettingRow label="PA approved notification" desc="Patient notified when PA approved">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Toggle checked={paApprovedNotif} onChange={v => { setPaApprovedNotif(v); markDirty('member-comms'); }} />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>App · Email</span>
        </div>
      </SettingRow>
      <SettingRow label="PA denied notification" locked lockedNote="Members must be notified of PA denials with appeal rights per UAE Insurance Law Art. 22" desc="Legally required — includes appeal rights">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Toggle checked={true} locked />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>App · Email · SMS</span>
        </div>
      </SettingRow>
      <SettingRow label="Claim approved" desc="Member notified when claim is paid">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Toggle checked={claimApprovedNotif} onChange={v => { setClaimApprovedNotif(v); markDirty('member-comms'); }} />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>App only</span>
        </div>
      </SettingRow>
      <SettingRow label="Benefit limit alerts" desc="Trigger at 75%, 85%, 95%, 100%">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Toggle checked={benefitAlertOn} onChange={v => { setBenefitAlertOn(v); markDirty('member-comms'); }} />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>App · Email</span>
        </div>
      </SettingRow>
      <SettingRow label="Benefit limit exhausted" locked lockedNote="Required by UAE Insurance Law" desc="Member notified when annual limit is reached">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Toggle checked={true} locked />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>App · Email · SMS</span>
        </div>
      </SettingRow>

      <SectionLabel>Wellness Campaigns</SectionLabel>
      <SettingRow label="AI-suggested outreach" desc="CeenAiX AI identifies members for wellness outreach and suggests campaigns">
        <Toggle checked={aiOutreach} onChange={v => { setAiOutreach(v); markDirty('member-comms'); }} />
      </SettingRow>
      <SettingRow label="Campaign language">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['arabic', 'english', 'both'] as const).map(l => (
            <button key={l} onClick={() => { setCampaignLang(l); markDirty('member-comms'); }}
              style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: campaignLang === l ? '#1E3A5F' : '#F8FAFC', color: campaignLang === l ? '#fff' : '#475569', border: campaignLang === l ? '1px solid #1E3A5F' : '1px solid #E2E8F0' }}>
              {l === 'both' ? 'Arabic + English' : l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Campaign consent required" desc="Members must have opted in to receive wellness messages">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <Toggle checked={campaignConsent} onChange={v => { setCampaignConsent(v); markDirty('member-comms'); }} />
          <span style={{ fontSize: 10, color: '#0D9488', fontFamily: 'DM Mono, monospace' }}>6,891 / 8,247 opted in (83.6%)</span>
        </div>
      </SettingRow>
      <SettingRow label="Unsubscribe link" locked lockedNote="Always included per UAE PDPL requirements" last>
        <Toggle checked={true} locked />
      </SettingRow>

      <SectionLabel>Template Management</SectionLabel>
      <SmallBtn variant="navy">✏️ Edit Templates</SmallBtn>
    </SCard>
  );
}

// ── DHA & Regulatory ──────────────────────────────────────────────────────────

function DhaRegulatorySection({ dirty, markDirty, onSave, saving }: SectionProps) {
  const [autoMonthly, setAutoMonthly] = useState(true);
  const [autoQuarterlyClaims, setAutoQuarterlyClaims] = useState(false);
  const [autoQuarterlyFraud, setAutoQuarterlyFraud] = useState(false);
  const [dhaContact, setDhaContact] = useState('compliance@daman.ae');
  const [submissionConfirm, setSubmissionConfirm] = useState(true);
  const [reminderDays1, setReminderDays1] = useState('7');
  const [reminderDays2, setReminderDays2] = useState('2');
  const [denialRateAlert, setDenialRateAlert] = useState('8');
  const [autoApprovalFloor, setAutoApprovalFloor] = useState('60');

  return (
    <SCard
      id="dha-regulatory"
      icon={<ShieldCheck size={20} color="#1E3A5F" />}
      title="DHA & Regulatory"
      desc="DHA compliance configuration and regulatory settings"
      hasChanges={dirty['dha-regulatory']}
      onSave={() => onSave('dha-regulatory', 'DHA regulatory settings saved')}
      saving={saving === 'dha-regulatory'}
    >
      <div style={{ padding: '14px 16px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#065F46', marginBottom: 6 }}>✅ CONNECTED TO DHA SHERYAN</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#059669', marginBottom: 8 }}>
          <span>License: <strong style={{ fontFamily: 'DM Mono, monospace' }}>CBUAE-INS-2006-001847 ✅</strong></span>
          <span>DHA API: <strong>✅ Active · Last verified: Today 2:07 PM</strong></span>
        </div>
        <SmallBtn variant="teal">Test DHA Connection</SmallBtn>
      </div>

      <SectionLabel>DHA Submission Configuration</SectionLabel>
      <SettingRow label="Auto-submit monthly SLA report" desc="Runs 1st of each month automatically">
        <Toggle checked={autoMonthly} onChange={v => { setAutoMonthly(v); markDirty('dha-regulatory'); }} />
      </SettingRow>
      <SettingRow label="Auto-submit quarterly claims return" desc="Manual review recommended before submission">
        <Toggle checked={autoQuarterlyClaims} onChange={v => { setAutoQuarterlyClaims(v); markDirty('dha-regulatory'); }} />
      </SettingRow>
      <SettingRow label="Auto-submit quarterly fraud report" desc="Compliance team reviews first — manual by default">
        <Toggle checked={autoQuarterlyFraud} onChange={v => { setAutoQuarterlyFraud(v); markDirty('dha-regulatory'); }} />
      </SettingRow>
      {!autoQuarterlyClaims && !autoQuarterlyFraud && (
        <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', padding: '4px 0 12px' }}>
          Non-auto reports sent to My Reports for manual review before DHA submission.
        </div>
      )}
      <SettingRow label="DHA submission contact email" desc="Receives all DHA-related notifications and confirmations">
        <SSettingsInput value={dhaContact} onChange={v => { setDhaContact(v); markDirty('dha-regulatory'); }} width={220} />
      </SettingRow>
      <SettingRow label="Require DHA receipt confirmation" desc="Require DHA receipt confirmation before marking submitted">
        <Toggle checked={submissionConfirm} onChange={v => { setSubmissionConfirm(v); markDirty('dha-regulatory'); }} />
      </SettingRow>

      <SectionLabel>Regulatory Deadlines</SectionLabel>
      <SettingRow label="First reminder before DHA deadline">
        <SSettingsInput value={reminderDays1} onChange={v => { setReminderDays1(v); markDirty('dha-regulatory'); }} unit="days before" mono width={60} />
      </SettingRow>
      <SettingRow label="Second reminder">
        <SSettingsInput value={reminderDays2} onChange={v => { setReminderDays2(v); markDirty('dha-regulatory'); }} unit="days before" mono width={60} />
      </SettingRow>

      <SectionLabel>Compliance Monitoring</SectionLabel>
      <SettingRow label="Alert when SLA breach occurs" locked lockedNote="Immediate alert — always on">
        <Toggle checked={true} locked />
      </SettingRow>
      <SettingRow label="Alert when denial rate exceeds" desc="DHA investigates insurers with >8% denial rate">
        <SSettingsInput value={denialRateAlert} onChange={v => { setDenialRateAlert(v); markDirty('dha-regulatory'); }} unit="%" mono width={70} />
      </SettingRow>
      <SettingRow label="Alert when auto-approval rate drops below" desc="May indicate AI configuration issue" last>
        <SSettingsInput value={autoApprovalFloor} onChange={v => { setAutoApprovalFloor(v); markDirty('dha-regulatory'); }} unit="%" mono width={70} />
      </SettingRow>
    </SCard>
  );
}

// ── Audit & Logging ───────────────────────────────────────────────────────────

function AuditLoggingSection({ dirty, markDirty, onSave, saving }: SectionProps) {
  const [stdRetention, setStdRetention] = useState('90');

  return (
    <SCard
      id="audit-logging"
      icon={<ClipboardCheck size={20} color="#1E3A5F" />}
      title="Audit & Logging"
      desc="Configure audit trail and activity logging"
      hasChanges={dirty['audit-logging']}
      onSave={() => onSave('audit-logging', 'Audit settings saved')}
      saving={saving === 'audit-logging'}
    >
      <InfoCard color="amber" icon={<Lock size={13} />}>
        All audit logging settings are locked per DHA Insurance Law. Logging cannot be disabled.
      </InfoCard>

      {[
        'All PA decisions logged',
        'All claim decisions logged',
        'All fraud actions logged',
        'User login/logout logged',
        'Data access logged',
        'Config changes logged',
      ].map((label, i, arr) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
            <Lock size={11} color="#F59E0B" />
          </div>
          <Toggle checked={true} locked />
        </div>
      ))}

      <SectionLabel>Log Retention</SectionLabel>
      <SettingRow label="Standard logs retention" desc="Minimum 90 days required">
        <SSettingsInput value={stdRetention} onChange={v => { setStdRetention(v); markDirty('audit-logging'); }} unit="days" mono width={70} />
      </SettingRow>
      <SettingRow label="DHA-required logs" desc="DHA minimum: 7 years" locked>
        <SSettingsInput value="7 years" onChange={() => {}} readOnly mono width={90} />
      </SettingRow>
      <SettingRow label="Fraud investigation logs" desc="UAE Insurance Law requirement" locked last>
        <SSettingsInput value="10 years" onChange={() => {}} readOnly mono width={90} />
      </SettingRow>
      <InfoCard color="amber">DHA minimum retention: 7 years. Reducing below this value is not permitted.</InfoCard>

      <SectionLabel>Audit Log Access</SectionLabel>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SmallBtn>📋 View My Activity Log</SmallBtn>
        <SmallBtn>📋 View Team Activity Log</SmallBtn>
        <SmallBtn>📤 Export Audit Log</SmallBtn>
      </div>
    </SCard>
  );
}

// ── Data & Privacy ────────────────────────────────────────────────────────────

function DataPrivacySection({ dirty, markDirty, onSave, saving }: SectionProps) {
  const [anonResearch, setAnonResearch] = useState(false);
  const [timerReveal, setTimerReveal] = useState(true);
  const [managerApproval, setManagerApproval] = useState(false);
  const [allStaffAccess, setAllStaffAccess] = useState(false);
  const [exportJustification, setExportJustification] = useState(true);
  const [exportManagerApproval, setExportManagerApproval] = useState(false);

  return (
    <SCard
      id="data-privacy"
      icon={<Lock size={20} color="#1E3A5F" />}
      title="Data & Privacy"
      desc="Data handling, privacy, and PDPL compliance"
      hasChanges={dirty['data-privacy']}
      onSave={() => onSave('data-privacy', 'Data & privacy settings saved')}
      saving={saving === 'data-privacy'}
    >
      <SectionLabel>Data Location</SectionLabel>
      <div style={{ padding: '12px 16px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>✅ All data stored in UAE (AWS AE-EAST-1)</div>
        <div style={{ fontSize: 12, color: '#059669' }}>Member PHI never leaves UAE jurisdiction ✅</div>
        <div style={{ fontSize: 12, color: '#059669' }}>Nabidh integration: UAE HIE only ✅</div>
      </div>

      <SectionLabel>CeenAiX Data Access</SectionLabel>
      {['Claims processing', 'Pre-authorization', 'Fraud detection', 'Member portal display'].map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F9FAFB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
            <Lock size={10} color="#F59E0B" />
            <span style={{ fontSize: 10, color: '#D97706' }}>Required</span>
          </div>
          <Toggle checked={true} locked />
        </div>
      ))}
      <SettingRow label="Anonymized research participation" desc="Allow CeenAiX to use anonymized data for UAE population health research">
        <Toggle checked={anonResearch} onChange={v => { setAnonResearch(v); markDirty('data-privacy'); }} />
      </SettingRow>
      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>
        Daman-CeenAiX DPA v2.1 · Signed: Jan 2024 — <span style={{ color: '#0D9488', cursor: 'pointer', textDecoration: 'underline' }}>View Agreement</span>
      </div>

      <SectionLabel>Member PHI Access Controls</SectionLabel>
      <SettingRow label="Emirates ID reveal — 30-second timer" desc="ID hidden by default, shows for 30 seconds when revealed">
        <Toggle checked={timerReveal} onChange={v => { setTimerReveal(v); markDirty('data-privacy'); }} />
      </SettingRow>
      <SettingRow label="Emirates ID reveal — manager approval" desc="Add extra approval step for sensitive access">
        <Toggle checked={managerApproval} onChange={v => { setManagerApproval(v); markDirty('data-privacy'); }} />
      </SettingRow>
      <SettingRow label="Member health data — all portal staff" desc="Recommended OFF — limit to claims officers and medical directors">
        <Toggle checked={allStaffAccess} onChange={v => { setAllStaffAccess(v); markDirty('data-privacy'); }} />
      </SettingRow>
      <InfoCard color="blue">PHI access logged per UAE PDPL Federal Law 45/2021</InfoCard>

      <SectionLabel>Export Permissions</SectionLabel>
      <SettingRow label="PHI in exports — justification note required">
        <Toggle checked={exportJustification} onChange={v => { setExportJustification(v); markDirty('data-privacy'); }} />
      </SettingRow>
      <SettingRow label="PHI in exports — audit log entry required" locked>
        <Toggle checked={true} locked />
      </SettingRow>
      <SettingRow label="PHI in exports — manager approval" desc="Enable for extra control" last>
        <Toggle checked={exportManagerApproval} onChange={v => { setExportManagerApproval(v); markDirty('data-privacy'); }} />
      </SettingRow>
    </SCard>
  );
}

// ── API & Integrations ────────────────────────────────────────────────────────

function ApiIntegrationsSection({ dirty: _dirty }: SectionProps) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1200));
    setTesting(false);
    setTestResult('✅ DHA connection tested — 0.41s response');
  }

  return (
    <SCard
      id="api-integrations"
      icon={<Link2 size={20} color="#1E3A5F" />}
      title="API & Integrations"
      desc="API connection status and webhook configuration"
    >
      <SectionLabel>CeenAiX API Connection</SectionLabel>
      <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>Connected · 0.42s avg</span>
        </div>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>
          API Key:&nbsp;
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
            {showKey ? 'ck_live_daman_a8f2k9b3m1x7y4z6' : 'ck_live_daman_●●●●●●●●●●●●●●●●'}
          </span>
          &nbsp;<button onClick={() => setShowKey(!showKey)} style={{ fontSize: 11, color: '#0D9488', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            {showKey ? 'Hide' : 'Reveal'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>
          <span>Rate limit: <strong style={{ fontFamily: 'DM Mono, monospace' }}>1,000 req/hour</strong></span>
          <span>Used today: <strong style={{ fontFamily: 'DM Mono, monospace', color: '#059669' }}>34%</strong></span>
          <span>Last event: <strong style={{ fontFamily: 'DM Mono, monospace' }}>Today 2:07 PM</strong></span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SmallBtn>🔄 Rotate Key</SmallBtn>
          <SmallBtn>⚙️ Manage Webhooks</SmallBtn>
        </div>
      </div>

      <SectionLabel>Shafafiya (DHA Claims)</SectionLabel>
      <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>⚠️ DEGRADED — 3.2s response (normal &lt;0.8s)</div>
        <div style={{ fontSize: 12, color: '#B45309', marginBottom: 8 }}>Since: Today 1:20 PM · Daman IT notified</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SmallBtn variant="amber">📞 Contact Daman IT</SmallBtn>
          <button
            onClick={() => void handleTestConnection()}
            disabled={testing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: testing ? 'not-allowed' : 'pointer', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}
          >
            <RefreshCw size={12} style={{ animation: testing ? 'spin 1s linear infinite' : 'none' }} /> Test Connection
          </button>
        </div>
        {testResult && <div style={{ fontSize: 12, color: '#059669', marginTop: 8 }}>{testResult}</div>}
      </div>

      <SectionLabel>Nabidh HIE</SectionLabel>
      <div style={{ padding: '12px 16px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>✅ NABIDH Connected · 0.29s</div>
        <div style={{ fontSize: 12, color: '#059669' }}>Last sync: 12 seconds ago</div>
      </div>
    </SCard>
  );
}

// ── Display Preferences ───────────────────────────────────────────────────────

function DisplayPrefsSection({ dirty, markDirty, onSave, saving }: SectionProps) {
  const [currency, setCurrency] = useState('standard');
  const [dateFormat, setDateFormat] = useState('ddmmyyyy');
  const [timeFormat, setTimeFormat] = useState('12');
  const [rowsPerPage, setRowsPerPage] = useState('25');
  const [sidebarState, setSidebarState] = useState('remember');
  const [defaultView, setDefaultView] = useState('preauth');
  const [density, setDensity] = useState('standard');

  return (
    <SCard
      id="display"
      icon={<Monitor size={20} color="#1E3A5F" />}
      title="Display Preferences"
      desc="Customize how the portal looks and behaves"
      hasChanges={dirty['display']}
      onSave={() => onSave('display', 'Display preferences saved')}
      saving={saving === 'display'}
    >
      <SettingRow label="Currency Display">
        <RadioGroup name="currency" value={currency} onChange={v => { setCurrency(v); markDirty('display'); }} options={[
          { value: 'standard',    label: 'AED 1,247,840 (standard)' },
          { value: 'abbreviated', label: 'AED 1.2M (abbreviated for large values)' },
        ]} />
      </SettingRow>
      <SettingRow label="Date Format">
        <RadioGroup name="date" value={dateFormat} onChange={v => { setDateFormat(v); markDirty('display'); }} options={[
          { value: 'ddmmyyyy', label: 'DD/MM/YYYY (UAE standard)' },
          { value: 'mmddyyyy', label: 'MM/DD/YYYY (US format)' },
          { value: 'iso',      label: 'YYYY-MM-DD (ISO 8601)' },
        ]} />
      </SettingRow>
      <SettingRow label="Time Format">
        <RadioGroup name="time" value={timeFormat} onChange={v => { setTimeFormat(v); markDirty('display'); }} options={[
          { value: '12', label: '12-hour (AM/PM)' },
          { value: '24', label: '24-hour' },
        ]} />
      </SettingRow>
      <SettingRow label="Items Per Page (Tables)">
        <SSettingsSelect value={rowsPerPage} onChange={v => { setRowsPerPage(v); markDirty('display'); }} options={[
          { value: '15', label: '15 rows' }, { value: '25', label: '25 rows' },
          { value: '50', label: '50 rows' }, { value: '100', label: '100 rows' },
        ]} width={130} />
      </SettingRow>
      <SettingRow label="Sidebar State">
        <RadioGroup name="sidebar" value={sidebarState} onChange={v => { setSidebarState(v); markDirty('display'); }} options={[
          { value: 'remember',  label: 'Remember last state' },
          { value: 'expanded',  label: 'Always expanded' },
          { value: 'collapsed', label: 'Always collapsed' },
        ]} />
      </SettingRow>
      <SettingRow label="Dashboard Default View">
        <RadioGroup name="default-view-disp" value={defaultView} onChange={v => { setDefaultView(v); markDirty('display'); }} options={[
          { value: 'preauth',   label: 'Pre-Authorization Queue' },
          { value: 'claims',    label: 'Claims Dashboard' },
          { value: 'analytics', label: 'Full Analytics Overview' },
        ]} />
      </SettingRow>
      <SettingRow label="Table Density" last>
        <RadioGroup name="density" value={density} onChange={v => { setDensity(v); markDirty('display'); }} options={[
          { value: 'comfortable', label: 'Comfortable (72px rows)' },
          { value: 'standard',    label: 'Standard (56px rows — current)' },
          { value: 'compact',     label: 'Compact (44px rows, dense)' },
        ]} />
      </SettingRow>
    </SCard>
  );
}

// ── Help & Support ────────────────────────────────────────────────────────────

function HelpSupportSection(_props: SectionProps) {
  return (
    <SCard
      id="help-support"
      icon={<HelpCircle size={20} color="#1E3A5F" />}
      title="Help & Support"
      desc="Contact CeenAiX support and access documentation"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          {
            Icon: Headphones, iconBg: '#F0FDFA', iconColor: '#0D9488',
            title: 'CeenAiX Tech Support',
            desc: 'For platform bugs, API issues, access problems',
            contact: 'support@ceenaix.com',
            hours: 'Sun–Thu 8AM–8PM · Response: <4 hours',
            actions: [{ label: '💬 Chat Now', variant: 'teal' as const }, { label: '📧 Email', variant: 'default' as const }],
          },
          {
            Icon: ShieldCheck, iconBg: '#EFF6FF', iconColor: '#1E3A5F',
            title: 'DHA Sheryan Support',
            desc: 'For DHA regulatory and submission questions',
            contact: 'sheryan@dha.gov.ae | 800-DHA-GOV',
            hours: 'Available 24/7 for emergencies',
            actions: [{ label: '🔗 Sheryan Portal', variant: 'navy' as const }],
          },
          {
            Icon: Building2, iconBg: '#EFF6FF', iconColor: '#2563EB',
            title: 'Daman IT Helpdesk',
            desc: 'For account, Shafafiya API, credentials',
            contact: 'it@daman.ae | +971 4 XXX XXXX',
            hours: 'Sun–Thu 8AM–5PM',
            actions: [{ label: '📧 Email IT', variant: 'default' as const }],
          },
        ].map((card, i) => (
          <div key={i} style={{ padding: 16, borderRadius: 12, border: '1px solid #F1F5F9', background: '#FAFAFA' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <card.Icon size={18} color={card.iconColor} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{card.title}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6, lineHeight: 1.4 }}>{card.desc}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 2 }}>{card.contact}</div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 10 }}>{card.hours}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {card.actions.map((a, j) => (
                <SmallBtn key={j} variant={a.variant}>{a.label}</SmallBtn>
              ))}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Resources</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {[
          { label: '📄 CeenAiX Insurance Portal Guide', color: '#0D9488' },
          { label: '📄 DHA Insurance Regulations 2026',  color: '#0D9488' },
          { label: '📄 UAE PDPL Compliance Guide',        color: '#0D9488' },
          { label: '🎥 Video Tutorials',                  color: '#7C3AED' },
          { label: "📋 Changelog — What's New",           color: '#64748B' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: r.color, cursor: 'pointer' }}>
            {r.label}<ExternalLink size={11} />
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
        <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>CeenAiX Insurance Portal v2.4.1</div>
        <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>Last updated: 2 April 2026</div>
        <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>UAE Insurance Authority compliance: ✅ Current</div>
      </div>
    </SCard>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

// Need React for JSX in this file
import React from 'react';

export const InsuranceSettings = () => {
  const { data, error, refetch } = useInsurancePageData();
  const supabaseSettings = data?.settings ?? [];
  const profile = data?.profile ?? null;

  // Lifted state for wired settings sections (initialised from real profile data)
  const [arabicName, setArabicName] = useState(profile?.arabicName ?? '');
  const [email, setEmail] = useState(profile?.contactEmail ?? '');
  const [phone, setPhone] = useState(profile?.contactPhone ?? '');
  const [officerName, setOfficerName] = useState(profile?.officerName ?? '');
  const [officerTitle, setOfficerTitle] = useState(profile?.officerTitle ?? '');
  const [standardHours, setStandardHours] = useState(String(profile?.slaTargetStandardHours ?? 8));
  const [urgentHours, setUrgentHours] = useState(String(profile?.slaTargetUrgentHours ?? 4));
  const [aiThreshold, setAiThreshold] = useState(String(profile?.aiConfidenceThresholdPct ?? 95));

  // ── Real Supabase toggle logic (from stub) ────────────────────────────────
  const [busyId, setBusyId] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const handleToggleSetting = async (settingId: string, nextEnabled: boolean) => {
    setSettingsError(null);
    setBusyId(settingId);
    try {
      await setInsuranceSettingEnabled(settingId, nextEnabled);
      refetch();
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Could not update insurance setting.');
    } finally {
      setBusyId(null);
    }
  };

  // Build a keyed lookup: settingKey → { id, enabled }
  const settingsMap: Record<string, { id: string; enabled: boolean }> = {};
  supabaseSettings.forEach(s => { settingsMap[s.settingKey] = { id: s.id, enabled: s.enabled }; });

  // ── Left-nav dirty / save state ───────────────────────────────────────────
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('company-profile');
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const dirtyCount = Object.values(dirty).filter(Boolean).length;

  // Scroll-spy
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      entries => {
        let best: { id: string; ratio: number } | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const ratio = entry.intersectionRatio;
            if (!best || ratio > best.ratio) best = { id: entry.target.id, ratio };
          }
        }
        if (best) setActiveSection(best.id);
      },
      { root: contentRef.current, threshold: [0.2, 0.5, 0.8], rootMargin: '-80px 0px -60% 0px' }
    );
    NAV_ITEMS.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  function markDirty(id: string) {
    setDirty(prev => ({ ...prev, [id]: true }));
  }

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  async function handleSave(sectionId: string, msg: string) {
    setSaving(sectionId);
    try {
      if (sectionId === 'company-profile') {
        await updatePayerProfile({
          arabicName: arabicName.trim() || null,
          contactEmail: email.trim() || null,
          contactPhone: phone.trim() || null,
        });
      } else if (sectionId === 'my-account') {
        await updatePayerProfile({
          officerName: officerName.trim() || null,
          officerTitle: officerTitle.trim() || null,
        });
      } else if (sectionId === 'preauth-sla') {
        await updatePayerProfile({
          slaStandardHours: Number(standardHours) || null,
          slaUrgentHours: Number(urgentHours) || null,
        });
      } else if (sectionId === 'ai-automation') {
        await updatePayerProfile({
          aiConfidenceThresholdPct: Number(aiThreshold) || null,
        });
      } else {
        await new Promise(r => setTimeout(r, 400));
        setDirty(prev => ({ ...prev, [sectionId]: false }));
        addToast(`✅ ${msg} (local only — sync coming soon)`, 'info');
        return;
      }
      void refetch();
      setDirty(prev => ({ ...prev, [sectionId]: false }));
      addToast(`✅ ${msg}`, 'success');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : `Failed to save ${msg}`,
        'warning',
      );
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveAll() {
    const dirtySections = Object.entries(dirty)
      .filter(([, v]) => v)
      .map(([k]) => k);
    for (const sec of dirtySections) {
      await handleSave(sec, sec.replace(/-/g, ' '));
    }
    addToast('✅ All changes saved', 'success');
  }

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el && contentRef.current) {
      contentRef.current.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' });
    }
    setActiveSection(id);
  }

  const filteredNav = searchQuery
    ? NAV_ITEMS.filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : NAV_ITEMS;

  const sectionProps: SectionProps = {
    dirty, markDirty, onSave: handleSave, saving,
    settings: settingsMap, onToggleSetting: (id, v) => void handleToggleSetting(id, v),
    busyId,
    profileName: profile?.displayName,
    profileOfficer: profile?.officerName,
    profileTitle: profile?.officerTitle,
    arabicName, setArabicName,
    email, setEmail,
    phone, setPhone,
    officerName, setOfficerName,
    officerTitle, setOfficerTitle,
    standardHours, setStandardHours,
    urgentHours, setUrgentHours,
    aiThreshold, setAiThreshold,
  };

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      {/* Supabase settings error banner */}
      {settingsError && (
        <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} />
          {settingsError}
        </div>
      )}

      {/* 2-column layout: left nav + right content */}
      <div style={{ display: 'flex', gap: 0, minHeight: 0 }}>

        {/* ── Settings left nav ────────────────────────────────────────── */}
        <div style={{ width: 220, flexShrink: 0, marginRight: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 16, padding: '12px 0 16px', boxShadow: '0 1px 6px rgba(15,45,74,0.06)', position: 'sticky', top: 0 }}>
            <div style={{ padding: '0 12px 8px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={12} color="#94A3B8" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', height: 32, padding: '0 10px 0 26px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none', background: '#F8FAFC', boxSizing: 'border-box' as const }}
                />
              </div>
            </div>
            {(searchQuery ? [''] : GROUPS).map(group => {
              const items = filteredNav.filter(n => !searchQuery ? n.group === group : true);
              if (items.length === 0) return null;
              return (
                <div key={group || 'search'}>
                  {!searchQuery && (
                    <div style={{ padding: '8px 16px 4px', fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{group}</div>
                  )}
                  {items.map(item => {
                    const isActive = activeSection === item.id;
                    const hasDirt = dirty[item.id];
                    return (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        style={{
                          width: 'calc(100% - 16px)', display: 'flex', alignItems: 'center', gap: 8,
                          height: 38, padding: '0 12px', margin: '1px 8px',
                          borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left' as const,
                          background: isActive ? 'rgba(30,58,95,0.08)' : 'transparent',
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{item.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? '#1E3A5F' : '#64748B', flex: 1 }}>{item.label}</span>
                        {hasDirt && <div style={{ width: 6, height: 6, borderRadius: 3, background: '#F59E0B', flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sections ────────────────────────────────────────────────── */}
        <div ref={contentRef} style={{ flex: 1, minWidth: 0 }}>
          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
            <Settings size={22} color="#64748B" />
            <div>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Settings</div>
              <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>Configure your insurance portal experience</div>
            </div>
          </div>

          <CompanyProfileSection {...sectionProps} />
          <MyAccountSection {...sectionProps} />
          <SecuritySection {...sectionProps} />
          <PlanConfigSection {...sectionProps} />
          <PreAuthSlaSection {...sectionProps} />
          <AIAutomationSection {...sectionProps} />
          <FraudDetectionSection {...sectionProps} />
          <NotificationsSection {...sectionProps} />
          <EmailAlertsSection {...sectionProps} />
          <MemberCommsSection {...sectionProps} />
          <DhaRegulatorySection {...sectionProps} />
          <AuditLoggingSection {...sectionProps} />
          <DataPrivacySection {...sectionProps} />
          <ApiIntegrationsSection {...sectionProps} />
          <DisplayPrefsSection {...sectionProps} />
          <HelpSupportSection {...sectionProps} />

          <div style={{ height: 80 }} />
        </div>
      </div>

      {/* Fixed Save All button */}
      {dirtyCount > 0 && (
        <button
          onClick={() => void handleSaveAll()}
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 100,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', background: '#1E3A5F', color: '#fff',
            border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(30,58,95,0.4)',
            animation: 'saveGlow 2s ease-in-out infinite',
          }}
        >
          <Save size={16} />
          Save All Changes
          <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '2px 6px' }}>
            {dirtyCount} section{dirtyCount !== 1 ? 's' : ''}
          </span>
        </button>
      )}

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 90, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 200 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
              background: t.type === 'success' ? '#ECFDF5' : t.type === 'warning' ? '#FFFBEB' : '#EFF6FF',
              border: `1px solid ${t.type === 'success' ? '#6EE7B7' : t.type === 'warning' ? '#FDE68A' : '#BFDBFE'}`,
              borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: 340,
            }}
          >
            {t.type === 'success' ? <CheckCircle size={14} color="#059669" /> : <AlertCircle size={14} color="#D97706" />}
            <span style={{ fontSize: 13, color: '#0F172A', flex: 1 }}>{t.msg}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes saveGlow {
          0%, 100% { box-shadow: 0 4px 20px rgba(30,58,95,0.4); }
          50%       { box-shadow: 0 4px 28px rgba(30,58,95,0.7); }
        }
        @keyframes savePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(13,148,136,0); }
          50%       { box-shadow: 0 0 0 4px rgba(13,148,136,0.3); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </InsuranceShell>
  );
};

export default InsuranceSettings;
