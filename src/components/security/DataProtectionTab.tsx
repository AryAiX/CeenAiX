import { Lock, AlertTriangle, Eye, EyeOff, Database, Globe } from 'lucide-react';
import { S, SCard, SectionHeader, SStatusDot } from './SecurityPrimitives';

const CONSENT_TYPES = [
  { type: 'PHI', handling: 'Encrypt at rest + in transit, minimal access', encryption: 'AES-256-GCM', retention: '10 years (DHA)', residency: 'UAE only' },
  { type: 'Sensitive PHI (mental health, HIV, reproductive)', handling: 'Field-level encryption, consent-gated, audit every access', encryption: 'AES-256-GCM envelope', retention: '10 years (DHA)', residency: 'UAE only' },
  { type: 'PII (non-PHI)', handling: 'Encrypt at rest, PDPL consent required', encryption: 'AES-256-GCM', retention: '5 years', residency: 'UAE only' },
  { type: 'Financial (payment, billing)', handling: 'PCI DSS scope, tokenization', encryption: 'AES-256 + tokenized', retention: '7 years (VAT)', residency: 'UAE + GCC' },
  { type: 'Operational (logs, configs)', handling: 'Standard encryption', encryption: 'AES-256', retention: '3 years', residency: 'UAE + EU' },
];

const ENCRYPTION_STORES = [
  { store: 'PostgreSQL (primary)', status: true, key: 'CMK-DB-001', lastRotated: '2026-03-01' },
  { store: 'PostgreSQL (replica)', status: true, key: 'CMK-DB-001', lastRotated: '2026-03-01' },
  { store: 'Object storage (images, documents)', status: true, key: 'CMK-BLOB-002', lastRotated: '2026-02-15' },
  { store: 'Search index (Elasticsearch)', status: true, key: 'CMK-ES-003', lastRotated: '2026-01-10' },
  { store: 'Message queue (Redis)', status: true, key: 'CMK-CACHE-004', lastRotated: '2026-04-01' },
  { store: 'Backup storage', status: true, key: 'CMK-BACKUP-005', lastRotated: '2026-03-15' },
];

const DLP_RULES = [
  { rule: 'PHI in AI prompt/response', channel: 'AI inference', action: 'Block + audit', blocked24h: 4, falsePosPct: 2.1 },
  { rule: 'Bulk export > 100 records', channel: 'File export', action: 'Alert + log', blocked24h: 2, falsePosPct: 5.8 },
  { rule: 'Credit card number in support ticket', channel: 'Support chat', action: 'Block + redact', blocked24h: 1, falsePosPct: 1.2 },
  { rule: 'PHI in outbound email', channel: 'Email', action: 'Block', blocked24h: 0, falsePosPct: 0.4 },
  { rule: 'Sensitive PHI via SMART on FHIR app', channel: 'API', action: 'Consent-check + audit', blocked24h: 0, falsePosPct: 0.0 },
];

const BACKUPS = [
  { store: 'PostgreSQL primary', lastBackup: '2026-05-04 01:00', encrypted: true, verified: true, rto: '4h', rpo: '1h' },
  { store: 'Object storage', lastBackup: '2026-05-04 02:00', encrypted: true, verified: true, rto: '6h', rpo: '24h' },
  { store: 'Redis (session/cache)', lastBackup: '2026-05-04 00:30', encrypted: true, verified: false, rto: '1h', rpo: '30m' },
];

export function DataProtectionTab() {
  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* PHI access highlight */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'PHI accesses (24h)', value: '28,412', color: S.text1 },
          { label: 'Anomalous accesses', value: '2', color: S.errorLight },
          { label: 'Break-glass accesses', value: '1', color: S.warningLight },
          { label: 'Off-hours accesses', value: '184', color: S.blueLight },
        ].map(k => (
          <SCard key={k.label} className="p-4">
            <div className="text-[10px] mb-1" style={{ color: S.text3 }}>{k.label}</div>
            <div className="text-xl font-bold" style={{ color: k.color, fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
          </SCard>
        ))}
      </div>

      {/* Data classification */}
      <SCard className="p-5">
        <SectionHeader title="Data Classification & Handling" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: S.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {['Data Type', 'Handling Rule', 'Encryption', 'Retention', 'Residency'].map(h => (
                  <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONSENT_TYPES.map(c => (
                <tr key={c.type} style={{ borderBottom: `1px solid ${S.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="py-2 pr-3">
                    <div className="text-xs font-semibold" style={{ color: S.text1 }}>{c.type}</div>
                  </td>
                  <td className="py-2 pr-3 text-[10px] max-w-xs" style={{ color: S.text3 }}>{c.handling}</td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.tealLight, fontFamily: 'DM Mono, monospace' }}>{c.encryption}</td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2 }}>{c.retention}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <Globe size={10} style={{ color: S.tealLight }} />
                      <span className="text-[10px]" style={{ color: S.tealLight }}>{c.residency}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Encryption at rest */}
        <SCard className="p-5">
          <SectionHeader title="Encryption at Rest">
            <button className="text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
              View keys
            </button>
          </SectionHeader>
          <div className="space-y-2">
            {ENCRYPTION_STORES.map(e => (
              <div key={e.store} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: S.bg1 }}>
                <div className="flex items-center gap-2">
                  <SStatusDot ok={e.status} />
                  <div>
                    <div className="text-xs" style={{ color: S.text1 }}>{e.store}</div>
                    <span style={{ color: S.tealLight, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{e.key}</span>
                  </div>
                </div>
                <span className="text-[9px]" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>Rotated {e.lastRotated}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2.5 rounded-xl text-[10px]" style={{ background: 'rgba(13,148,136,0.08)', border: `1px solid ${S.tealBorder}` }}>
            <div className="font-semibold mb-0.5" style={{ color: S.tealLight }}>TLS in transit</div>
            <div style={{ color: S.text3 }}>All ingress/egress enforces TLS 1.2+. TLS 1.0/1.1 disabled. Cipher suite: ECDHE-RSA-AES256-GCM-SHA384.</div>
          </div>
        </SCard>

        {/* DLP rules */}
        <SCard className="p-5">
          <SectionHeader title="Data Loss Prevention (DLP)">
            <button className="text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
              New rule
            </button>
          </SectionHeader>
          <div className="space-y-2">
            {DLP_RULES.map(r => (
              <div key={r.rule} className="p-2.5 rounded-xl" style={{ background: S.bg1, border: `1px solid ${S.border}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-semibold" style={{ color: S.text1 }}>{r.rule}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                      <span style={{ color: S.text3 }}>{r.channel}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px]"
                        style={{ background: r.action.startsWith('Block') ? S.errorBg : S.warningBg, color: r.action.startsWith('Block') ? S.errorLight : S.warningLight }}>
                        {r.action}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px]" style={{ color: r.blocked24h > 0 ? S.errorLight : S.successLight, fontFamily: 'DM Mono, monospace' }}>{r.blocked24h} blocked</div>
                    <div className="text-[9px]" style={{ color: S.text3 }}>{r.falsePosPct}% FP rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SCard>
      </div>

      {/* Backups */}
      <SCard className="p-5">
        <SectionHeader title="Backups & Recovery">
          <button className="text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
            Schedule restore test
          </button>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: S.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {['Store', 'Last Backup', 'Encrypted', 'Integrity Verified', 'RTO', 'RPO'].map(h => (
                  <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BACKUPS.map(b => (
                <tr key={b.store} style={{ borderBottom: `1px solid ${S.border}` }}>
                  <td className="py-2 pr-3 text-xs font-semibold" style={{ color: S.text1 }}>{b.store}</td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{b.lastBackup}</td>
                  <td className="py-2 pr-3"><SStatusDot ok={b.encrypted} /></td>
                  <td className="py-2 pr-3">
                    {b.verified
                      ? <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: S.successBg, color: S.successLight }}>Verified</span>
                      : <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: S.warningBg, color: S.warningLight }}>Pending</span>
                    }
                  </td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{b.rto}</td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{b.rpo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>
    </div>
  );
}
