import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, CrossLinkBanner, Chip } from '../primitives';

const channels = [
  { id: 'in-app', label: 'In-app', active: true },
  { id: 'email', label: 'Email', active: true },
  { id: 'sms', label: 'SMS', active: true },
  { id: 'push', label: 'Push (mobile)', active: true },
  { id: 'whatsapp', label: 'WhatsApp Business', active: false },
  { id: 'voice', label: 'Voice / IVR', active: false },
  { id: 'webhook', label: 'Webhook (external)', active: true },
];

export default function NotificationsSection() {
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [criticalOverride, setCriticalOverride] = useState(true);
  const [maxMsgsPerMin, setMaxMsgsPerMin] = useState(10);
  const [emailDomain, setEmailDomain] = useState('mail.ceenaix.com');
  const [smsSenderId, setSmsSenderId] = useState('CEENAIX');

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      <CrossLinkBanner
        message="SMS gateway, email provider, and WhatsApp Business account configuration live in Integrations."
        href="/admin/integrations"
        label="Open Integrations"
      />

      <SectionHeader
        title="Notification Channels"
        description="Active notification delivery channels and their status."
      />
      <SettingCard title="Active channels" scope="All portals" dirty={dirty}>
        {channels.map(c => (
          <ToggleRow key={c.id} label={c.label} value={c.active} onChange={() => mark()} />
        ))}
      </SettingCard>

      <SectionHeader
        title="Sender Identities"
        description="Email sender domains, SMS sender IDs, and push notification identifiers."
      />
      <SettingCard title="Email sender domain" scope="Email" dirty={dirty}>
        <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          <div>
            <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>Primary sender domain</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>All transactional and clinical emails</div>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#94A3B8' }}>{emailDomain}</span>
            <Chip label="SPF ✓" color="green" />
            <Chip label="DKIM ✓" color="green" />
            <Chip label="DMARC ✓" color="green" />
          </div>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>SMS sender ID (UAE TRA registered)</div>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#94A3B8' }}>{smsSenderId}</span>
        </div>
      </SettingCard>

      <SectionHeader
        title="Quiet Hours & Global Throttles"
        description="Default quiet hours and per-channel global message rate limits."
      />
      <SettingCard title="Quiet hours" scope="All channels" defaultValue="22:00–07:00 Asia/Dubai" dirty={dirty}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 4 }}>Quiet hours start</label>
            <input
              type="time"
              value={quietStart}
              onChange={e => { setQuietStart(e.target.value); mark(); }}
              className="w-full rounded-lg px-3 py-1.5 text-xs"
              style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.6)', color: '#E2E8F0' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 4 }}>Quiet hours end</label>
            <input
              type="time"
              value={quietEnd}
              onChange={e => { setQuietEnd(e.target.value); mark(); }}
              className="w-full rounded-lg px-3 py-1.5 text-xs"
              style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.6)', color: '#E2E8F0' }}
            />
          </div>
        </div>
        <ToggleRow label="Critical events override quiet hours" desc="Clinical alerts and emergency notifications bypass quiet hours." value={criticalOverride} onChange={v => { setCriticalOverride(v); mark(); }} />
        <NumberRow label="Max messages per channel per minute per user" value={maxMsgsPerMin} onChange={v => { setMaxMsgsPerMin(v); mark(); }} min={1} suffix="msgs/min" />
      </SettingCard>

      <SectionHeader
        title="Templates Library"
        description="System-generated notification and communication templates."
      />
      <SettingCard title="Template registry" scope="All portals" description="Managing all system-generated templates. Required clinical disclaimers are locked at template level.">
        <div className="space-y-2">
          {[
            { key: 'appt.confirmed', name: 'Appointment Confirmed', type: 'Transactional', status: 'Deployed' },
            { key: 'appt.reminder', name: 'Appointment Reminder', type: 'Transactional', status: 'Deployed' },
            { key: 'rx.ready', name: 'Prescription Ready', type: 'Clinical', status: 'Deployed' },
            { key: 'lab.result', name: 'Lab Result Available', type: 'Clinical', status: 'Deployed' },
            { key: 'auth.otp', name: 'OTP / MFA Code', type: 'Auth', status: 'Deployed' },
            { key: 'billing.invoice', name: 'Invoice Issued', type: 'Billing', status: 'Deployed' },
          ].map(t => (
            <div key={t.key} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.5)' }}>
              <div>
                <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 500 }}>{t.name}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>{t.key}</div>
              </div>
              <div className="flex items-center gap-2">
                <Chip label={t.type} color={t.type === 'Clinical' ? 'teal' : t.type === 'Auth' ? 'blue' : 'slate'} />
                <Chip label={t.status} color="green" />
                <button style={{ fontSize: 11, color: '#0D9488' }}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} />
    </div>
  );
}
