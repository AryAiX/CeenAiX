import { AlertTriangle, XCircle, Clock, Send, Mail, RefreshCw } from 'lucide-react';
import { mockDoctors } from '../../data/adminDoctorsData';

interface LicenseAlertsTabProps {
  showToast: (msg: string) => void;
  onRowClick: (doctor: typeof mockDoctors[0]) => void;
}

export default function LicenseAlertsTab({ showToast, onRowClick }: LicenseAlertsTabProps) {
  const expiring = mockDoctors
    .filter(d => d.daysUntilExpiry <= 90)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const critical = expiring.filter(d => d.daysUntilExpiry <= 30);
  const warning = expiring.filter(d => d.daysUntilExpiry > 30 && d.daysUntilExpiry <= 90);

  const getExpiryStyle = (days: number) => {
    if (days < 0) return { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: `Expired ${Math.abs(days)}d ago` };
    if (days <= 30) return { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: `${days}d left` };
    return { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: `${days}d left` };
  };

  const handleRemind = (name: string) => showToast(`📧 Renewal reminder sent to ${name}`);
  const handleBulkRemind = (count: number) => showToast(`📧 Renewal reminder sent to ${count} doctors`);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Expired', count: mockDoctors.filter(d => d.daysUntilExpiry < 0).length, color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: <XCircle style={{ width: 18, height: 18 }} /> },
          { label: 'Critical (<30 days)', count: critical.length, color: '#F97316', bg: 'rgba(249,115,22,0.1)', icon: <AlertTriangle style={{ width: 18, height: 18 }} /> },
          { label: 'Warning (30–90 days)', count: warning.length, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: <Clock style={{ width: 18, height: 18 }} /> },
        ].map(card => (
          <div key={card.label} className="rounded-xl px-5 py-4 flex items-center gap-4" style={{ background: card.bg, border: `1px solid ${card.color}33` }}>
            <div style={{ color: card.color }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: card.color, fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{card.count}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div style={{ fontSize: 13, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
          {expiring.length} licenses require attention
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleBulkRemind(critical.length)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600, background: 'rgba(249,115,22,0.1)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.2)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.1)'}
          >
            <Send style={{ width: 13, height: 13 }} />
            Remind All Critical ({critical.length})
          </button>
          <button
            onClick={() => handleBulkRemind(expiring.length)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#3D4F63'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
          >
            <Mail style={{ width: 13, height: 13 }} />
            Remind All ({expiring.length})
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid #334155' }}>
        <div
          className="grid gap-0"
          style={{ gridTemplateColumns: '200px 140px 120px 120px 180px 1fr 140px' }}
        >
          {['Doctor', 'DHA License', 'Expiry Date', 'Days Left', 'Clinic', 'Renewal Status', 'Actions'].map(h => (
            <div key={h} className="px-4 py-3" style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#0F172A', borderBottom: '1px solid #334155' }}>
              {h}
            </div>
          ))}
        </div>

        {expiring.map((doc, i) => {
          const exp = getExpiryStyle(doc.daysUntilExpiry);
          return (
            <div
              key={doc.id}
              className="grid cursor-pointer"
              style={{
                gridTemplateColumns: '200px 140px 120px 120px 180px 1fr 140px',
                background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)',
                borderBottom: '1px solid rgba(51,65,85,0.4)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(13,148,136,0.05)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)'}
              onClick={() => onRowClick(doc)}
            >
              <div className="px-4 py-3 flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: doc.avatarGradient, fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}
                >
                  {doc.initials}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9', fontFamily: 'Inter, sans-serif', lineHeight: 1.2 }}>{doc.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{doc.specialty}</div>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center">
                <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{doc.dhaLicense}</span>
              </div>
              <div className="px-4 py-3 flex items-center">
                <span style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>{doc.licenseExpiry}</span>
              </div>
              <div className="px-4 py-3 flex items-center">
                <span
                  className="px-2 py-1 rounded-lg"
                  style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: exp.color, background: exp.bg }}
                >
                  {exp.label}
                </span>
              </div>
              <div className="px-4 py-3 flex items-center">
                <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{doc.clinicPrimary}</span>
              </div>
              <div className="px-4 py-3 flex items-center">
                {doc.renewalStatus ? (
                  <span style={{ fontSize: 11, color: doc.renewalStatus.includes('✅') ? '#10B981' : '#F59E0B', fontFamily: 'Inter, sans-serif' }}>
                    {doc.renewalStatus}
                  </span>
                ) : doc.reminderSent ? (
                  <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                    Reminded {doc.reminderSent}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif' }}>—</span>
                )}
              </div>
              <div className="px-4 py-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => handleRemind(doc.name)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#3D4F63'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
                >
                  <Mail style={{ width: 10, height: 10 }} /> Remind
                </button>
                <button
                  onClick={() => showToast('🔄 DHA re-verification initiated')}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ background: '#334155', color: '#94A3B8', border: '1px solid #475569' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#3D4F63'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#334155'}
                  title="Re-verify with DHA"
                >
                  <RefreshCw style={{ width: 11, height: 11 }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
