import React from 'react';
import { Shield, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { docLicenseExpiries } from '../../data/superAdminData';

const nav = (href: string) => {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const checklist = [
  { label: 'DHA Platform License', status: 'ok' as const, detail: 'Valid until Dec 2026' },
  { label: 'NABIDH HIE Approved', status: 'ok' as const, detail: 'Approved · Active' },
  { label: 'Patient Data Encryption', status: 'ok' as const, detail: 'AES-256 · At rest + transit' },
  { label: 'ePrescription Module', status: 'ok' as const, detail: 'DHA-certified · v3.2' },
  { label: 'Audit Logging', status: 'ok' as const, detail: 'All events logged · 7yr retention' },
  { label: 'ISO 27001', status: 'warn' as const, detail: 'Renewal due Aug 2026' },
];

const CompliancePanel: React.FC = () => {
  const score = 97.4;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col cursor-pointer"
      style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
      onClick={() => nav('/admin/compliance/dha')}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(13,148,136,0.4)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}
      >
        <div className="flex items-center gap-2">
          <Shield style={{ width: 16, height: 16, color: '#34D399' }} />
          <span className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
            DHA Compliance
          </span>
        </div>
        <div
          className="rounded-lg px-2 py-1"
          style={{ background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.3)' }}
        >
          <span style={{ fontSize: 10, color: '#34D399', fontFamily: 'DM Mono, monospace' }}>NABIDH APPROVED</span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
            <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth="6" />
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                stroke="#34D399"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ transform: 'none' }}
            >
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 700, color: '#34D399', lineHeight: 1 }}>
                {score}
              </div>
              <div style={{ fontSize: 9, color: '#64748B' }}>DHA Score</div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>DHA License</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B', marginBottom: 2 }}>
              DHA-PLAT-2025-001847
            </div>
            <div style={{ fontSize: 10, color: '#34D399', marginBottom: 8 }}>Valid · Expires Dec 2026</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>23 Doctors Pending</div>
            <div
              className="rounded-lg px-2.5 py-1 inline-block"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <span style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'DM Mono, monospace' }}>23 pending DHA verification</span>
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 9,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'DM Mono, monospace',
              marginBottom: 6,
            }}
          >
            COMPLIANCE CHECKLIST
          </div>
          <div className="flex flex-col gap-1.5">
            {checklist.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                {item.status === 'ok' ? (
                  <CheckCircle style={{ width: 12, height: 12, color: '#34D399', flexShrink: 0 }} />
                ) : (
                  <AlertTriangle style={{ width: 12, height: 12, color: '#FCD34D', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 11, color: item.status === 'ok' ? '#CBD5E1' : '#FCD34D', flex: 1 }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
                  {item.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 9,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'DM Mono, monospace',
              marginBottom: 6,
            }}
          >
            LICENSE EXPIRY ALERTS
          </div>
          <div className="flex flex-col gap-1.5">
            {docLicenseExpiries.map(doc => (
              <div
                key={doc.name}
                className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  background: doc.days <= 20 ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
                  border: `1px solid ${doc.days <= 20 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}
                onClick={e => { e.stopPropagation(); nav('/admin/doctors'); }}
              >
                <Clock style={{ width: 11, height: 11, color: doc.days <= 20 ? '#F87171' : '#FCD34D', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#CBD5E1', flex: 1 }}>{doc.name}</span>
                <span
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 10,
                    color: doc.days <= 20 ? '#F87171' : '#FCD34D',
                    flexShrink: 0,
                  }}
                >
                  {doc.days}d
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompliancePanel;
