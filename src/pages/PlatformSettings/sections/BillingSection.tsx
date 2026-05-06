import React, { useState } from 'react';
import { SectionHeader, SettingCard, ToggleRow, SelectRow, NumberRow, SectionFooter, CrossLinkBanner, LockNote, Chip } from '../primitives';

const plans = [
  { name: 'Pilot', price: 'AED 2,500/mo', users: 50, status: 'active' },
  { name: 'Growth', price: 'AED 12,000/mo', users: 500, status: 'active' },
  { name: 'Enterprise', price: 'Custom', users: null, status: 'active' },
];

export default function BillingSection() {
  const [vatUae, setVatUae] = useState('100123456700003');
  const [vatRate, setVatRate] = useState(5);
  const [bilingualInvoice, setBilingualInvoice] = useState(true);
  const [eInvoicing, setEInvoicing] = useState(true);
  const [sequentialInvoice, setSequentialInvoice] = useState(true);

  const [payoutSchedule, setPayoutSchedule] = useState('weekly');
  const [payoutThreshold, setPayoutThreshold] = useState(500);
  const [payoutCurrency, setPayoutCurrency] = useState('AED');

  const [dunningDay1, setDunningDay1] = useState(1);
  const [dunningDay2, setDunningDay2] = useState(7);
  const [dunningDay3, setDunningDay3] = useState(14);
  const [suspendAt, setSuspendAt] = useState(30);

  const [fxProvider, setFxProvider] = useState('ecb');
  const [fxRefresh, setFxRefresh] = useState('daily');

  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);

  return (
    <div>
      <CrossLinkBanner
        message="Detailed invoice history, payout reports, and subscription management live in Revenue."
        href="/admin/revenue"
        label="Open Revenue"
      />

      <SectionHeader
        title="Pricing & Plans"
        description="Active subscription plans and their pricing. Production changes require two-person approval."
      />
      <SettingCard title="Active plans" scope="Platform-wide" dirty={dirty}>
        <div className="space-y-2 mb-3">
          {plans.map(p => (
            <div key={p.name} className="flex items-center justify-between px-3 py-3 rounded-lg" style={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.5)' }}>
              <div>
                <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{p.users ? `Up to ${p.users} users` : 'Custom limits'}</div>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{p.price}</span>
                <Chip label={p.status} color="green" />
                <button className="text-xs hover:opacity-80" style={{ color: '#0D9488' }}>Edit</button>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full py-2 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity" style={{ background: 'rgba(13,148,136,0.1)', color: '#2DD4BF', border: '1px solid rgba(13,148,136,0.25)' }}>
          + Create plan
        </button>
        <LockNote text="Plan price changes on production require password re-entry and two-person approval." />
      </SettingCard>

      <SectionHeader
        title="Tax & Invoicing Defaults"
        description="VAT registration, tax rates, and invoice template configuration per region."
      />
      <SettingCard title="UAE tax configuration" scope="UAE" dirty={dirty}>
        <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
          <div>
            <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>VAT registration number</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>UAE Federal Tax Authority</div>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#94A3B8' }}>{vatUae}</span>
        </div>
        <NumberRow label="VAT rate" value={vatRate} onChange={v => { setVatRate(v); mark(); }} min={0} suffix="%" />
        <ToggleRow label="Bilingual invoice (EN + AR)" desc="Required for UAE regulatory compliance." value={bilingualInvoice} onChange={() => {}} locked />
        <ToggleRow label="e-Invoicing (FTA-compliant XML)" desc="Generate FTA-compliant e-invoice format for UAE transactions." value={eInvoicing} onChange={v => { setEInvoicing(v); mark(); }} />
        <ToggleRow label="Sequential invoice numbering" desc="Locked per UAE regulatory requirements." value={sequentialInvoice} onChange={() => {}} locked />
      </SettingCard>

      <SectionHeader
        title="Payouts Defaults"
        description="Doctor and pharmacy payout schedule, thresholds, and currency conversion."
      />
      <SettingCard title="Payout configuration" scope="Payouts" dirty={dirty}>
        <SelectRow
          label="Default payout schedule"
          value={payoutSchedule}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
          onChange={v => { setPayoutSchedule(v); mark(); }}
        />
        <NumberRow label="Minimum payout threshold" value={payoutThreshold} onChange={v => { setPayoutThreshold(v); mark(); }} min={0} suffix="AED" />
        <SelectRow
          label="Payout currency"
          value={payoutCurrency}
          options={[
            { value: 'AED', label: 'AED' },
            { value: 'USD', label: 'USD' },
          ]}
          onChange={v => { setPayoutCurrency(v); mark(); }}
        />
      </SettingCard>

      <SectionHeader
        title="Dunning Defaults"
        description="Payment reminder cadence and suspension thresholds."
      />
      <SettingCard title="Dunning sequence" scope="Subscriptions" dirty={dirty}>
        <NumberRow label="First reminder" desc="Days after invoice due date." value={dunningDay1} onChange={v => { setDunningDay1(v); mark(); }} min={1} suffix="days overdue" />
        <NumberRow label="Second reminder" value={dunningDay2} onChange={v => { setDunningDay2(v); mark(); }} min={1} suffix="days overdue" />
        <NumberRow label="Final notice" value={dunningDay3} onChange={v => { setDunningDay3(v); mark(); }} min={1} suffix="days overdue" />
        <NumberRow label="Suspend workspace at" value={suspendAt} onChange={v => { setSuspendAt(v); mark(); }} min={7} suffix="days overdue" />
      </SettingCard>

      <SectionHeader
        title="Currency & FX"
        description="FX provider configuration and rate refresh schedule."
      />
      <SettingCard title="FX configuration" scope="Billing, Revenue" dirty={dirty}>
        <SelectRow
          label="FX provider"
          value={fxProvider}
          options={[
            { value: 'ecb', label: 'European Central Bank (free)' },
            { value: 'openexchangerates', label: 'Open Exchange Rates' },
            { value: 'xe', label: 'XE.com' },
          ]}
          onChange={v => { setFxProvider(v); mark(); }}
        />
        <SelectRow
          label="Rate refresh schedule"
          value={fxRefresh}
          options={[
            { value: 'realtime', label: 'Real-time' },
            { value: 'hourly', label: 'Hourly' },
            { value: 'daily', label: 'Daily' },
          ]}
          onChange={v => { setFxRefresh(v); mark(); }}
        />
      </SettingCard>

      <SectionFooter dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)} requiresApproval />
    </div>
  );
}
