import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, TextRow, NumberRow, SectionFooter, LockNote, Chip } from '../primitives';

export default function GeneralSection() {
  const [platformName, setPlatformName] = useState('CeenAiX');
  const [tagline, setTagline] = useState('Healthcare Intelligence Platform');
  const [supportEmail, setSupportEmail] = useState('info@aryaix.com');
  const [supportPhone, setSupportPhone] = useState('+971 4 000 0000');
  const [websiteUrl, setWebsiteUrl] = useState('https://ceenaix.com');

  const [defaultTheme, setDefaultTheme] = useState('dark');
  const [allowWhitelabel, setAllowWhitelabel] = useState(true);
  const [overrideLogo, setOverrideLogo] = useState(true);
  const [overrideAccent, setOverrideAccent] = useState(true);
  const [overrideSenderName, setOverrideSenderName] = useState(false);

  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [arabicEnabled, setArabicEnabled] = useState(true);
  const [persianEnabled, setPersianEnabled] = useState(false);
  const [rtlArabic, setRtlArabic] = useState(true);

  const [timezone, setTimezone] = useState('Asia/Dubai');
  const [firstDay, setFirstDay] = useState('saturday');
  const [hijriDisplay, setHijriDisplay] = useState(true);
  const [gregorianDefault, setGregorianDefault] = useState(true);

  const [defaultCurrency, setDefaultCurrency] = useState('AED');
  const [aedEnabled, setAedEnabled] = useState(true);
  const [usdEnabled, setUsdEnabled] = useState(true);
  const [eurEnabled, setEurEnabled] = useState(false);
  const [sarEnabled, setSarEnabled] = useState(true);
  const [numeralSystem, setNumeralSystem] = useState('western');

  const [defaultTone, setDefaultTone] = useState('professional');
  const [readingLevel, setReadingLevel] = useState('grade8');
  const [profanityFilter, setProfanityFilter] = useState(true);
  const [clinicalSanitizer, setClinicalSanitizer] = useState(true);
  const [machineTranslate, setMachineTranslate] = useState(false);

  const [maintenanceLead, setMaintenanceLead] = useState(48);
  const [ramadanFreeze, setRamadanFreeze] = useState(true);
  const [dhaAuditFreeze, setDhaAuditFreeze] = useState(true);

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);
  const handleSave = () => setDirty(false);
  const handleDiscard = () => setDirty(false);

  return (
    <div>
      {/* Platform Identity */}
      <SectionHeader
        title="Platform Identity"
        description="Core identity, legal entity, and public-facing contact details for the CeenAiX platform."
      />
      <SettingCard title="Platform name & tagline" scope="All portals" dirty={dirty}>
        <TextRow label="Platform name" value={platformName} onChange={v => { setPlatformName(v); mark(); }} />
        <TextRow label="Tagline" value={tagline} onChange={v => { setTagline(v); mark(); }} />
        <TextRow label="Support email" value={supportEmail} onChange={v => { setSupportEmail(v); mark(); }} placeholder="info@aryaix.com" />
        <TextRow label="Support phone" value={supportPhone} onChange={v => { setSupportPhone(v); mark(); }} />
        <TextRow label="Public website URL" value={websiteUrl} onChange={v => { setWebsiteUrl(v); mark(); }} />
      </SettingCard>

      <SettingCard title="Legal entity — UAE" scope="UAE region" locked description="Legal entity name, address, and registration numbers for UAE operations.">
        <div className="py-3 border-b last:border-0" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>Legal entity</div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>AryAiX FZ-LLC</div>
        </div>
        <div className="py-3 border-b last:border-0" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>Trade license</div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>CN-1234567</div>
        </div>
        <div className="py-3" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>Registered address</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>DIFC, Gate District, Dubai, UAE</div>
        </div>
        <LockNote text="Legal entity details require legal:edit permission to modify. Changes are fully audited." />
      </SettingCard>

      <SettingCard title="Logo & brand assets" scope="All portals" description="Upload primary, monochrome, favicon, OG image, and app store icon assets.">
        <div className="grid grid-cols-2 gap-3">
          {['Primary logo', 'Monochrome logo', 'Favicon', 'Open Graph image'].map(name => (
            <div key={name} className="rounded-lg p-3 flex flex-col items-center justify-center gap-2 border border-dashed cursor-pointer hover:border-teal-600 transition-colors" style={{ borderColor: 'rgba(51,65,85,0.6)', background: '#0F172A', minHeight: 72 }}>
              <span style={{ fontSize: 10, color: '#64748B' }}>{name}</span>
              <button className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(13,148,136,0.15)', color: '#2DD4BF' }}>Upload</button>
            </div>
          ))}
        </div>
      </SettingCard>

      {/* Branding & Theming */}
      <SectionHeader
        title="Branding & Theming"
        description="Default visual presentation for authenticated and unauthenticated users across all portals."
      />
      <SettingCard title="Default theme" scope="Unauthenticated visitors" dirty={false}>
        <div className="flex gap-2 mb-4">
          {[
            { id: 'dark', label: 'Dark' },
            { id: 'light', label: 'Light' },
            { id: 'system', label: 'System' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setDefaultTheme(t.id); mark(); }}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: defaultTheme === t.id ? '#0D9488' : 'rgba(51,65,85,0.3)',
                color: defaultTheme === t.id ? '#fff' : '#94A3B8',
                border: `1px solid ${defaultTheme === t.id ? '#0D9488' : 'rgba(51,65,85,0.5)'}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </SettingCard>
      <SettingCard title="Workspace whitelabeling" scope="Workspace-level" inheritance="Workspace-overrideable" dirty={dirty}>
        <ToggleRow label="Allow workspaces to whitelabel" desc="Master toggle for workspace-level branding overrides." value={allowWhitelabel} onChange={v => { setAllowWhitelabel(v); mark(); }} />
        {allowWhitelabel && (
          <div className="mt-3 pl-4" style={{ borderLeft: '2px solid rgba(13,148,136,0.3)' }}>
            <p style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Fields workspaces can override:</p>
            <ToggleRow label="Logo" value={overrideLogo} onChange={v => { setOverrideLogo(v); mark(); }} />
            <ToggleRow label="Accent color" value={overrideAccent} onChange={v => { setOverrideAccent(v); mark(); }} />
            <ToggleRow label="Sender display name" value={overrideSenderName} onChange={v => { setOverrideSenderName(v); mark(); }} />
          </div>
        )}
      </SettingCard>

      {/* Locales & Regions */}
      <SectionHeader
        title="Locales & Regions"
        description="Supported languages, regional toggles, and compliance framework bindings per region."
      />
      <SettingCard title="Supported languages" scope="All portals" dirty={dirty}>
        <ToggleRow label="English" desc="Default language — cannot be disabled." value={true} onChange={() => {}} locked />
        <ToggleRow label="العربية (Arabic)" desc="Enables RTL layout and Arabic locale formatting." value={arabicEnabled} onChange={v => { setArabicEnabled(v); mark(); }} />
        <ToggleRow label="فارسی (Persian)" value={persianEnabled} onChange={v => { setPersianEnabled(v); mark(); }} />
        <ToggleRow label="RTL default for Arabic and Persian" desc="Locked on per accessibility and regulatory requirements." value={rtlArabic} onChange={() => {}} locked />
      </SettingCard>
      <SettingCard title="Regions enabled" scope="Platform-wide" dirty={dirty}>
        <div className="grid grid-cols-2 gap-y-0">
          {[
            { id: 'uae', label: 'UAE', locked: true },
            { id: 'ksa', label: 'KSA' },
            { id: 'bh', label: 'Bahrain' },
            { id: 'qa', label: 'Qatar' },
            { id: 'kw', label: 'Kuwait' },
            { id: 'om', label: 'Oman' },
          ].map(r => (
            <ToggleRow key={r.id} label={r.label} value={r.id === 'uae'} onChange={() => mark()} locked={r.locked} />
          ))}
        </div>
      </SettingCard>

      {/* Time, Date & Calendar */}
      <SectionHeader
        title="Time, Date & Calendar"
        description="Default timezone, calendar systems, working week, and public holiday configuration."
      />
      <SettingCard title="Timezone & week" scope="All portals" defaultValue="Asia/Dubai" dirty={dirty}>
        <SelectRow
          label="Default time zone"
          value={timezone}
          options={[
            { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
            { value: 'Asia/Riyadh', label: 'Asia/Riyadh (UTC+3)' },
            { value: 'UTC', label: 'UTC' },
          ]}
          onChange={v => { setTimezone(v); mark(); }}
        />
        <SelectRow
          label="First day of week"
          value={firstDay}
          options={[
            { value: 'saturday', label: 'Saturday' },
            { value: 'sunday', label: 'Sunday' },
            { value: 'monday', label: 'Monday' },
          ]}
          onChange={v => { setFirstDay(v); mark(); }}
        />
      </SettingCard>
      <SettingCard title="Calendar systems" scope="Patient-facing" dirty={dirty}>
        <ToggleRow label="Gregorian (default)" value={gregorianDefault} onChange={() => {}} locked />
        <ToggleRow label="Hijri display option" desc="Show Hijri dates alongside Gregorian for patient-facing content." value={hijriDisplay} onChange={v => { setHijriDisplay(v); mark(); }} />
      </SettingCard>

      {/* Currency & Formatting */}
      <SectionHeader
        title="Currency & Formatting"
        description="Default and supported currencies, FX configuration, and numeral system preferences."
      />
      <SettingCard title="Default & supported currencies" scope="Billing, Revenue" defaultValue="AED" dirty={dirty}>
        <SelectRow
          label="Default currency"
          value={defaultCurrency}
          options={[
            { value: 'AED', label: 'AED — UAE Dirham' },
            { value: 'USD', label: 'USD — US Dollar' },
            { value: 'EUR', label: 'EUR — Euro' },
          ]}
          onChange={v => { setDefaultCurrency(v); mark(); }}
        />
        <ToggleRow label="AED" value={aedEnabled} onChange={() => {}} locked />
        <ToggleRow label="USD" value={usdEnabled} onChange={v => { setUsdEnabled(v); mark(); }} />
        <ToggleRow label="EUR" value={eurEnabled} onChange={v => { setEurEnabled(v); mark(); }} />
        <ToggleRow label="SAR" value={sarEnabled} onChange={v => { setSarEnabled(v); mark(); }} />
      </SettingCard>
      <SettingCard title="Numeral system" scope="All portals" dirty={dirty}>
        <SelectRow
          label="Default numeral system"
          desc="Admin default; patients can override in their settings."
          value={numeralSystem}
          options={[
            { value: 'western', label: 'Western digits (0–9)' },
            { value: 'arabic-indic', label: 'Arabic-Indic digits (٠–٩)' },
          ]}
          onChange={v => { setNumeralSystem(v); mark(); }}
        />
      </SettingCard>

      {/* Communication Tone */}
      <SectionHeader
        title="Communication Tone & Language"
        description="Default tone, reading level, and content safety rules for system-generated content."
      />
      <SettingCard title="Tone defaults" scope="All communications" dirty={dirty}>
        <SelectRow
          label="Patient-facing tone"
          value={defaultTone}
          options={[
            { value: 'professional', label: 'Professional' },
            { value: 'warm', label: 'Warm' },
            { value: 'concise', label: 'Concise' },
          ]}
          onChange={v => { setDefaultTone(v); mark(); }}
        />
        <SelectRow
          label="Target reading level"
          desc="For patient-facing content. Clinical content is exempt."
          value={readingLevel}
          options={[
            { value: 'grade6', label: 'Grade 6 (accessible)' },
            { value: 'grade8', label: 'Grade 8 (standard)' },
            { value: 'grade10', label: 'Grade 10 (advanced)' },
          ]}
          onChange={v => { setReadingLevel(v); mark(); }}
        />
        <ToggleRow label="Profanity filter" value={profanityFilter} onChange={v => { setProfanityFilter(v); mark(); }} />
        <ToggleRow label="Clinical language sanitizer" desc="Removes casual or non-standard clinical terminology in outputs." value={clinicalSanitizer} onChange={v => { setClinicalSanitizer(v); mark(); }} />
        <ToggleRow label="Allow machine translation of clinical content" desc="When disabled, clinical content is never auto-translated. Keeps accuracy." value={machineTranslate} onChange={v => { setMachineTranslate(v); mark(); }} />
      </SettingCard>

      {/* Maintenance & Freeze Windows */}
      <SectionHeader
        title="Maintenance & Freeze Windows"
        description="Maintenance announcement policies and scheduled configuration freeze windows."
      />
      <SettingCard title="Maintenance policy" scope="Platform-wide" dirty={dirty}>
        <NumberRow
          label="Announcement lead time"
          desc="Hours before a maintenance window that notifications are sent."
          value={maintenanceLead}
          onChange={v => { setMaintenanceLead(v); mark(); }}
          min={1}
          suffix="hours"
        />
        <ToggleRow label="Ramadan freeze window" desc="Block production publishes during Ramadan by default." value={ramadanFreeze} onChange={v => { setRamadanFreeze(v); mark(); }} />
        <ToggleRow label="DHA audit freeze window" desc="Block production publishes during active DHA inspections." value={dhaAuditFreeze} onChange={v => { setDhaAuditFreeze(v); mark(); }} />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
}
