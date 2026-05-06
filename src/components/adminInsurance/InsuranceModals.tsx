import { useState } from 'react';
import { X, Building2, Globe, Key, Shield, FileText, ChevronRight, Check } from 'lucide-react';

function ModalShell({ onClose, children, width = 560 }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#1E293B', borderRadius: 16, width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #334155', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        {children}
      </div>
    </div>
  );
}

const ONBOARD_STEPS = ['Company Details', 'API Configuration', 'Plans & Coverage'];

export function OnboardInsurerModal({ onClose, showToast }: { onClose: () => void; showToast: (msg: string, type?: string) => void }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', nameAr: '', license: '', tier: 'standard', primaryContact: '', email: '',
    apiEndpoint: '', apiKey: '', testPassed: false,
    plans: [{ name: '', type: 'standard' }],
    contractRenewal: '', notes: '',
  });

  const set = (key: string, val: string | boolean) => setForm(f => ({ ...f, [key]: val }));

  const handleTestApi = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      set('testPassed', true);
      showToast('API connection test passed', 'success');
    }, 1800);
  };

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
      showToast(`${form.name || 'New insurer'} onboarded successfully`, 'success');
    }, 1500);
  };

  return (
    <ModalShell onClose={onClose} width={600}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Onboard New Insurer</div>
          <div style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Step {step + 1} of 3 — {ONBOARD_STEPS[step]}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ padding: '20px 28px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {ONBOARD_STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                  background: i < step ? '#0D9488' : i === step ? 'rgba(13,148,136,0.2)' : '#334155',
                  border: i === step ? '2px solid #0D9488' : '2px solid transparent',
                  color: i < step ? '#fff' : i === step ? '#0D9488' : '#475569',
                }}>
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span style={{ color: i === step ? '#F1F5F9' : '#475569', fontSize: 12, fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 1, background: i < step ? '#0D9488' : '#334155', margin: '0 12px' }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#0F172A', borderRadius: 10, border: '1px solid #334155', marginBottom: 4 }}>
              <Building2 size={16} color="#0D9488" />
              <span style={{ color: '#94A3B8', fontSize: 13 }}>Enter the insurance company's DHA-licensed details</span>
            </div>
            {[
              { key: 'name', label: 'Company Name (English)', placeholder: 'e.g. AXA Gulf Insurance' },
              { key: 'nameAr', label: 'Company Name (Arabic)', placeholder: 'e.g. أكسا الخليج' },
              { key: 'license', label: 'CBUAE License Number', placeholder: 'CBUAE-INS-YYYY-XXXXXX' },
              { key: 'primaryContact', label: 'Primary Contact Name', placeholder: 'e.g. Ahmed Al Mansoori' },
              { key: 'email', label: 'Contact Email', placeholder: 'e.g. claims@insurer.ae' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>{field.label}</label>
                <input
                  type="text"
                  value={(form as any)[field.key]}
                  onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  style={{ width: '100%', padding: '10px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Partner Tier</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['standard', 'premium'].map(t => (
                  <button
                    key={t}
                    onClick={() => set('tier', t)}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `2px solid ${form.tier === t ? '#0D9488' : '#334155'}`, background: form.tier === t ? 'rgba(13,148,136,0.1)' : '#0F172A', color: form.tier === t ? '#0D9488' : '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#0F172A', borderRadius: 10, border: '1px solid #334155', marginBottom: 4 }}>
              <Globe size={16} color="#0D9488" />
              <span style={{ color: '#94A3B8', fontSize: 13 }}>Configure the insurer's API endpoint and authentication</span>
            </div>
            {[
              { key: 'apiEndpoint', label: 'API Base URL', placeholder: 'https://api.insurer.ae/ceenaix/v1' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>{field.label}</label>
                <input
                  type="text"
                  value={(form as any)[field.key]}
                  onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  style={{ width: '100%', padding: '10px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Key size={12} />API Key / Bearer Token</span>
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={e => set('apiKey', e.target.value)}
                placeholder="Paste API key here — stored encrypted"
                style={{ width: '100%', padding: '10px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ color: '#475569', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Shield size={11} /> Stored with AES-256 encryption. Never logged.
              </div>
            </div>
            <button
              onClick={handleTestApi}
              disabled={loading || !form.apiEndpoint}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', background: form.testPassed ? 'rgba(16,185,129,0.12)' : 'rgba(13,148,136,0.1)', border: `1px solid ${form.testPassed ? '#10B981' : 'rgba(13,148,136,0.3)'}`, borderRadius: 9, color: form.testPassed ? '#10B981' : '#0D9488', fontSize: 13, fontWeight: 600, cursor: loading || !form.apiEndpoint ? 'not-allowed' : 'pointer', opacity: !form.apiEndpoint ? 0.5 : 1 }}
            >
              {form.testPassed ? <><Check size={15} /> API Connection Verified</> : loading ? 'Testing connection...' : 'Test API Connection'}
            </button>
            <div>
              <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Contract Renewal Date</label>
              <input
                type="date"
                value={form.contractRenewal}
                onChange={e => set('contractRenewal', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#0F172A', borderRadius: 10, border: '1px solid #334155', marginBottom: 4 }}>
              <FileText size={16} color="#0D9488" />
              <span style={{ color: '#94A3B8', fontSize: 13 }}>Define plans and any additional notes for this partner</span>
            </div>
            <div>
              <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 10 }}>Health Insurance Plans</label>
              <div style={{ background: '#0F172A', borderRadius: 9, border: '1px solid #334155', padding: '14px 16px' }}>
                <div style={{ color: '#64748B', fontSize: 12, marginBottom: 10 }}>Plan names will be configured after onboarding via the insurer portal</div>
                {['Basic', 'Standard', 'Enhanced', 'Gold', 'Platinum'].map(plan => (
                  <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <input type="checkbox" id={`plan-${plan}`} style={{ accentColor: '#0D9488' }} />
                    <label htmlFor={`plan-${plan}`} style={{ color: '#94A3B8', fontSize: 12, cursor: 'pointer' }}>{plan}</label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Admin Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any onboarding notes, special agreements, or integration requirements..."
                rows={4}
                style={{ width: '100%', padding: '10px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ color: '#0D9488', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Ready to onboard</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  `Company: ${form.name || '(not entered)'}`,
                  `License: ${form.license || '(not entered)'}`,
                  `Tier: ${form.tier}`,
                  `API: ${form.apiEndpoint || '(not configured)'}`,
                  `API Test: ${form.testPassed ? 'Passed' : 'Not tested'}`,
                ].map((line, i) => (
                  <div key={i} style={{ color: '#94A3B8', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 28px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
          style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #334155', borderRadius: 8, color: '#94A3B8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        <button
          onClick={() => step < 2 ? setStep(s => s + 1) : handleSubmit()}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px', background: '#0D9488', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {step < 2 ? <><span>Continue</span><ChevronRight size={15} /></> : loading ? 'Onboarding...' : 'Complete Onboarding'}
        </button>
      </div>
    </ModalShell>
  );
}

export function ExportInsuranceModal({ onClose, showToast }: { onClose: () => void; showToast: (msg: string, type?: string) => void }) {
  const [format, setFormat] = useState<'csv' | 'pdf' | 'xlsx'>('pdf');
  const [reportType, setReportType] = useState('claims-summary');
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { key: 'claims-summary', label: 'Claims Summary Report', desc: 'All claims by insurer — totals, values, approval rates' },
    { key: 'fraud-report', label: 'DHA Fraud Report', desc: 'Fraud alerts formatted for DHA submission' },
    { key: 'api-health', label: 'API Health Report', desc: 'Uptime and response time metrics for all integrations' },
    { key: 'partner-overview', label: 'Partner Overview', desc: 'All 7 insurers — KPIs, SLA, revenue, compliance' },
    { key: 'financial', label: 'Financial Statement', desc: 'Platform revenue breakdown by insurer — month to date' },
  ];

  const handleExport = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
      showToast(`${reportTypes.find(r => r.key === reportType)?.label} exported as ${format.toUpperCase()}`, 'success');
    }, 1500);
  };

  return (
    <ModalShell onClose={onClose} width={520}>
      <div style={{ padding: '22px 26px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 17, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Export Insurance Report</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={20} /></button>
      </div>

      <div style={{ padding: '22px 26px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Report Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reportTypes.map(r => (
              <div
                key={r.key}
                onClick={() => setReportType(r.key)}
                style={{ padding: '11px 14px', borderRadius: 9, border: `2px solid ${reportType === r.key ? '#0D9488' : '#334155'}`, background: reportType === r.key ? 'rgba(13,148,136,0.08)' : '#0F172A', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <div style={{ color: reportType === r.key ? '#0D9488' : '#F1F5F9', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                <div style={{ color: '#475569', fontSize: 11 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Export Format</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['pdf', 'xlsx', 'csv'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `2px solid ${format === f ? '#0D9488' : '#334155'}`, background: format === f ? 'rgba(13,148,136,0.1)' : '#0F172A', color: format === f ? '#0D9488' : '#64748B', fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 26px', borderTop: '1px solid #334155', display: 'flex', gap: 10 }}>
        <button
          onClick={onClose}
          style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #334155', borderRadius: 8, color: '#94A3B8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={handleExport}
          disabled={loading}
          style={{ flex: 2, padding: '10px', background: '#0D9488', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Generating...' : `Export as ${format.toUpperCase()}`}
        </button>
      </div>
    </ModalShell>
  );
}
