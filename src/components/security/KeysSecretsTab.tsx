import { useState } from 'react';
import { Key, RefreshCw, AlertTriangle, Lock, Shield } from 'lucide-react';
import { SECRETS, CERTIFICATES, type Secret, type Certificate } from '../../data/securityData';
import { S, SCard, SectionHeader, SecretStatusChip, CertStatusChip, MonoValue, DaysCountdown, STH, STD, STR } from './SecurityPrimitives';

const ENCRYPTION_KEYS = [
  { id: 'CMK-DB-001', alias: 'Database master key', purpose: 'PostgreSQL TDE', algorithm: 'AES-256-GCM', region: 'me-central-1 (UAE)', status: 'Active', created: '2025-01-01', lastRotated: '2026-03-01', nextRotation: '2026-09-01', daysToRotation: 120, ciphertexts: 284120 },
  { id: 'CMK-BLOB-002', alias: 'Object storage key', purpose: 'S3/blob encryption', algorithm: 'AES-256-GCM', region: 'me-central-1 (UAE)', status: 'Active', created: '2025-01-01', lastRotated: '2026-02-15', nextRotation: '2026-08-15', daysToRotation: 103, ciphertexts: 1482041 },
  { id: 'CMK-PHI-FLE-003', alias: 'PHI field-level encryption key', purpose: 'Envelope encryption of sensitive PHI fields', algorithm: 'AES-256-GCM', region: 'me-central-1 (UAE)', status: 'Active', created: '2025-06-01', lastRotated: '2026-04-01', nextRotation: '2026-10-01', daysToRotation: 150, ciphertexts: 48201 },
  { id: 'CMK-SIGN-004', alias: 'Document signing key', purpose: 'PDF signatures, prescriptions', algorithm: 'RSA-4096 PSS', region: 'me-central-1 (UAE)', status: 'Active', created: '2025-03-01', lastRotated: '2026-01-01', nextRotation: '2027-01-01', daysToRotation: 242, ciphertexts: 8412 },
];

export function KeysSecretsTab() {
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const atRisk = SECRETS.filter(s => s.status === 'Leaked' || s.status === 'Expired' || s.status === 'Expiring');
  const expiringCerts = CERTIFICATES.filter(c => c.status === 'Expiring');

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {(atRisk.length > 0 || expiringCerts.length > 0) && (
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: S.errorBg, border: `1px solid ${S.errorBorder}` }}>
          <AlertTriangle size={14} style={{ color: S.errorLight, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: S.errorLight }}>
              {atRisk.filter(s => s.status === 'Leaked').length > 0 ? '1 leaked secret requires immediate rotation · ' : ''}
              {atRisk.filter(s => s.status !== 'Leaked').length} secrets expiring / expired · {expiringCerts.length} certificates expiring
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: S.text3 }}>
              STRIPE_SECRET_KEY leaked in public repo — auto-revoked, rotation in progress. NABIDH cert: 39d. API cert: 28d.
            </div>
          </div>
        </div>
      )}

      {/* KMS keys */}
      <SCard className="p-5">
        <SectionHeader title="Encryption Keys (KMS)">
          <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
            <Key size={9} /> New key
          </button>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: S.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                <STH>Key ID</STH>
                <STH>Alias</STH>
                <STH>Purpose</STH>
                <STH>Algorithm</STH>
                <STH>Last Rotated</STH>
                <STH>Next Rotation</STH>
                <STH>Ciphertexts</STH>
                <STH>Actions</STH>
              </tr>
            </thead>
            <tbody>
              {ENCRYPTION_KEYS.map(k => (
                <STR key={k.id}>
                  <STD><MonoValue value={k.id} /></STD>
                  <STD>
                    <div className="text-xs font-semibold" style={{ color: S.text1 }}>{k.alias}</div>
                  </STD>
                  <STD><span className="text-[10px]" style={{ color: S.text3 }}>{k.purpose}</span></STD>
                  <STD><span style={{ color: S.tealLight, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{k.algorithm}</span></STD>
                  <STD mono>{k.lastRotated}</STD>
                  <STD>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: S.text2, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{k.nextRotation}</span>
                      <DaysCountdown days={k.daysToRotation} />
                    </div>
                  </STD>
                  <STD mono>{k.ciphertexts.toLocaleString()}</STD>
                  <td className="py-2 pr-3">
                    <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.tealBg, color: S.tealLight }}>
                      <RefreshCw size={8} className="inline mr-1" />Rotate
                    </button>
                  </td>
                </STR>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>

      {/* Secrets vault + Certificates side-by-side */}
      <div className="flex gap-4">
        {/* Secrets */}
        <SCard className="flex-1 p-5">
          <SectionHeader title={`Secrets Vault (${SECRETS.length})`}>
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
              <Lock size={9} /> Add secret
            </button>
          </SectionHeader>
          <div className="flex gap-0">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: S.bg3 }}>
                  <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                    <STH>Secret</STH>
                    <STH>Type</STH>
                    <STH>Env</STH>
                    <STH>Rotation due</STH>
                    <STH>Status</STH>
                    <STH>Actions</STH>
                  </tr>
                </thead>
                <tbody>
                  {SECRETS.map(sec => (
                    <STR key={sec.id} onClick={() => setSelectedSecret(selectedSecret?.id === sec.id ? null : sec)}
                      selected={selectedSecret?.id === sec.id}
                      highlight={sec.status === 'Leaked' || sec.status === 'Expired'}>
                      <STD>
                        <span style={{ color: S.text1, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{sec.name}</span>
                      </STD>
                      <STD>
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: S.bg1, color: S.text3, border: `1px solid ${S.border}` }}>
                          {sec.type}
                        </span>
                      </STD>
                      <STD>
                        <span className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ background: sec.environment === 'Production' ? S.errorBg : S.bg1, color: sec.environment === 'Production' ? '#F87171' : S.text3 }}>
                          {sec.environment}
                        </span>
                      </STD>
                      <STD><DaysCountdown days={sec.daysToRotation} /></STD>
                      <STD><SecretStatusChip status={sec.status} /></STD>
                      <td className="py-2 pr-3">
                        <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: sec.status === 'Leaked' ? S.errorBg : S.tealBg, color: sec.status === 'Leaked' ? S.errorLight : S.tealLight }}>
                          {sec.status === 'Leaked' ? 'Rotate now' : 'Rotate'}
                        </button>
                      </td>
                    </STR>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedSecret && (
              <div className="w-56 flex-shrink-0 border-l p-3" style={{ borderColor: S.border, background: S.bg1 }}>
                <SecretStatusChip status={selectedSecret.status} />
                <div className="text-xs font-semibold mt-2 mb-2" style={{ color: S.text1, fontFamily: 'DM Mono, monospace' }}>{selectedSecret.name}</div>
                <div className="space-y-1.5 text-[10px]">
                  {[
                    { label: 'Type', value: selectedSecret.type },
                    { label: 'Owner', value: selectedSecret.ownerTeam },
                    { label: 'Env', value: selectedSecret.environment },
                    { label: 'Last rotated', value: selectedSecret.lastRotated },
                    { label: 'Rotation due', value: selectedSecret.nextRotationDue },
                    { label: 'Last used', value: selectedSecret.lastUsed },
                  ].map(f => (
                    <div key={f.label} className="flex justify-between py-0.5" style={{ borderBottom: `1px solid ${S.border}` }}>
                      <span style={{ color: S.text3 }}>{f.label}</span>
                      <span style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 p-2 rounded text-[9px]" style={{ background: S.bg2, color: S.text3 }}>
                  Value hidden — reveal requires security:keys:manage + reason capture + audit
                </div>
              </div>
            )}
          </div>
        </SCard>
      </div>

      {/* Certificates */}
      <SCard className="p-5">
        <SectionHeader title={`Certificates (${CERTIFICATES.length})`}>
          <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
            <Shield size={9} /> Add certificate
          </button>
        </SectionHeader>
        <div className="flex gap-0">
          <div className="flex-1 overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: S.bg3 }}>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  <STH>Subject</STH>
                  <STH>Issuer</STH>
                  <STH>Fingerprint</STH>
                  <STH>Deployments</STH>
                  <STH>Expires</STH>
                  <STH>Auto-renewal</STH>
                  <STH>Status</STH>
                  <STH>Actions</STH>
                </tr>
              </thead>
              <tbody>
                {CERTIFICATES.map(cert => (
                  <STR key={cert.id}
                    onClick={() => setSelectedCert(selectedCert?.id === cert.id ? null : cert)}
                    selected={selectedCert?.id === cert.id}
                    highlight={cert.status === 'Expiring' || cert.status === 'Expired'}>
                    <STD>
                      <span style={{ color: S.text1, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{cert.subject}</span>
                    </STD>
                    <STD><span className="text-[10px]" style={{ color: S.text3 }}>{cert.issuer}</span></STD>
                    <STD><MonoValue value={cert.fingerprint} /></STD>
                    <STD>
                      <span className="text-[10px]" style={{ color: S.text3 }}>{cert.deployments.join(', ')}</span>
                    </STD>
                    <STD>
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: S.text2, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{cert.validTo}</span>
                        <DaysCountdown days={cert.daysRemaining} />
                      </div>
                    </STD>
                    <STD>
                      <span className="text-[9px]" style={{ color: cert.autoRenewal ? S.successLight : S.warningLight }}>
                        {cert.autoRenewal ? 'Auto' : 'Manual'}
                      </span>
                    </STD>
                    <STD><CertStatusChip status={cert.status} /></STD>
                    <td className="py-2 pr-3">
                      <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.tealBg, color: S.tealLight }}>Renew</button>
                    </td>
                  </STR>
                ))}
              </tbody>
            </table>
          </div>
          {selectedCert && (
            <div className="w-64 flex-shrink-0 border-l p-4" style={{ borderColor: S.border, background: S.bg1 }}>
              <CertStatusChip status={selectedCert.status} />
              <div className="text-xs font-semibold mt-2 mb-1" style={{ color: S.text1, fontFamily: 'DM Mono, monospace' }}>{selectedCert.subject}</div>
              <div className="space-y-1.5 text-[10px]">
                {[
                  { label: 'Issuer', value: selectedCert.issuer },
                  { label: 'Valid from', value: selectedCert.validFrom },
                  { label: 'Valid to', value: selectedCert.validTo },
                  { label: 'Days remaining', value: `${selectedCert.daysRemaining}d` },
                  { label: 'Key strength', value: selectedCert.keyStrength },
                  { label: 'Auto-renewal', value: selectedCert.autoRenewal ? 'Yes (ACME)' : 'No — manual' },
                ].map(f => (
                  <div key={f.label} className="flex justify-between py-0.5" style={{ borderBottom: `1px solid ${S.border}` }}>
                    <span style={{ color: S.text3 }}>{f.label}</span>
                    <span style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1.5">
                <button className="w-full text-[10px] py-1.5 rounded-lg" style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>Renew certificate</button>
                <div className="text-[9px] p-2 rounded" style={{ background: S.bg2, color: S.text3 }}>
                  Private key never displayed in UI. Download only via audited CLI tool.
                </div>
              </div>
            </div>
          )}
        </div>
      </SCard>
    </div>
  );
}
