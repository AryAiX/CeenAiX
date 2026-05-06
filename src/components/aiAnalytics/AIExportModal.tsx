import { useState } from 'react';
import { X, Bot } from 'lucide-react';

export default function AIExportModal({ onClose, showToast }: { onClose: () => void; showToast: (msg: string, type?: string) => void }) {
  const [reportType, setReportType] = useState('performance');
  const [dateRange, setDateRange] = useState('month');
  const [format, setFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const reportTypes = [
    { key: 'performance', label: 'AI Performance Summary', desc: 'Usage, satisfaction, accuracy across all portals' },
    { key: 'population', label: 'Population Health Report', desc: 'DHA format — condition prevalence, trends, notifiable diseases' },
    { key: 'safety', label: 'AI Safety & Governance Report', desc: 'DHA format — flags, escalations, bias monitoring' },
    { key: 'cost', label: 'Cost & ROI Report', desc: 'Anthropic API costs, revenue attribution, net margin' },
    { key: 'conversations', label: 'Conversation Analytics', desc: 'Anonymized topic analysis, session metrics' },
    { key: 'full', label: 'Full AI Analytics Export', desc: 'All of the above in one comprehensive report' },
  ];

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 2200);
  };

  const handleDownload = () => {
    onClose();
    showToast('AI analytics report downloaded', 'success');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1E293B', borderRadius: 16, width: 480, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #334155', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bot size={18} color="#7C3AED" />
            <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 17, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Export AI Report</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '22px 26px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Report Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {reportTypes.map(r => (
                <div
                  key={r.key}
                  onClick={() => setReportType(r.key)}
                  style={{ padding: '10px 14px', borderRadius: 9, border: `2px solid ${reportType === r.key ? '#7C3AED' : '#334155'}`, background: reportType === r.key ? 'rgba(124,58,237,0.08)' : '#0F172A', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  <div style={{ color: reportType === r.key ? '#A78BFA' : '#F1F5F9', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ color: '#475569', fontSize: 11 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Date Range</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ k: 'month', l: 'This Month' }, { k: '3m', l: 'Last 3M' }, { k: 'year', l: 'This Year' }, { k: 'custom', l: 'Custom' }].map(r => (
                <button key={r.k} onClick={() => setDateRange(r.k)} style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: `2px solid ${dateRange === r.k ? '#7C3AED' : '#334155'}`, background: dateRange === r.k ? 'rgba(124,58,237,0.08)' : '#0F172A', color: dateRange === r.k ? '#A78BFA' : '#64748B', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{r.l}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Format</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['pdf', 'csv', 'excel'] as const).map(f => (
                <button key={f} onClick={() => setFormat(f)} style={{ flex: 1, padding: '8px', borderRadius: 7, border: `2px solid ${format === f ? '#7C3AED' : '#334155'}`, background: format === f ? 'rgba(124,58,237,0.08)' : '#0F172A', color: format === f ? '#A78BFA' : '#64748B', fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>{f}</button>
              ))}
            </div>
          </div>

          {(reportType === 'population' || reportType === 'safety') && (
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 9, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <Bot size={13} color="#7C3AED" />
                <span style={{ color: '#7C3AED', fontSize: 11, fontWeight: 600 }}>DHA Submission Format</span>
              </div>
              <div style={{ color: '#94A3B8', fontSize: 11, lineHeight: 1.6 }}>Population Health and Safety reports are formatted for DHA submission. Generated quarterly per DHA AI Healthcare Governance Framework 2026.</div>
            </div>
          )}

          {!done ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? 'rgba(124,58,237,0.5)' : '#7C3AED', border: 'none', borderRadius: 9, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}
            >
              {loading ? 'Generating AI analytics report...' : 'Generate Report'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#10B981', fontSize: 13, fontWeight: 500 }}>✅ Report ready — 2.1MB {format.toUpperCase()}</span>
              </div>
              <button
                onClick={handleDownload}
                style={{ width: '100%', padding: '11px', background: '#10B981', border: 'none', borderRadius: 9, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Download Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
