import { Shield, AlertTriangle, CheckCircle, Wifi } from 'lucide-react';
import { CERTIFICATES, CONNECTION_ENDPOINTS } from '../../data/nabidhData';
import { N, Card, SectionHeader, StatusChip, TH, TD, TR } from './NabidhPrimitives';

export function CertificatesTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* Critical cert alert */}
      <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)' }}>
        <AlertTriangle size={16} style={{ color: N.errorLight, flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1">
          <div className="text-sm font-semibold mb-1" style={{ color: N.errorLight }}>Certificate Renewal Required — 39 Days</div>
          <div className="text-xs" style={{ color: N.text2 }}>
            <span className="font-semibold">NABIDH Production mTLS Client</span> (CERT-001) expires on 2026-06-12.
            DHA requires minimum 30-day lead time for certificate renewal. Initiate renewal now to avoid service disruption.
          </div>
          <div className="mt-3 flex gap-2">
            <button className="text-[10px] px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: N.errorBg, color: N.errorLight, border: `1px solid rgba(220,38,38,0.3)` }}>
              Initiate Renewal (requires nabidh:certificates:manage)
            </button>
            <button className="text-[10px] px-3 py-1.5 rounded-lg"
              style={{ background: N.bg2, color: N.text2, border: `1px solid ${N.border}` }}>
              Download CSR Template
            </button>
          </div>
        </div>
      </div>

      {/* Certificate list */}
      <Card className="p-5">
        <SectionHeader title="Certificates">
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: N.text3 }}>
            <Shield size={10} style={{ color: N.teal }} />
            <span>mTLS enforced for all DHA connections</span>
          </div>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${N.border}` }}>
                <TH>ID</TH><TH>Name</TH><TH>Type</TH><TH>Environment</TH><TH>Issuer</TH>
                <TH>Algorithm</TH><TH>Status</TH><TH>Expiry</TH><TH>Days Left</TH><TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {CERTIFICATES.map(c => (
                <TR key={c.id} highlight={c.status === 'Expiring Soon' || c.status === 'Expired'}>
                  <td className="py-2.5 pr-4">
                    <span className="text-[11px]" style={{ color: N.tealLight, fontFamily: 'DM Mono, monospace' }}>{c.id}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs max-w-[180px]" style={{ color: N.text1 }}>{c.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: N.blueBg, color: N.blueLight }}>{c.type}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{
                      background: c.environment === 'Production' ? N.successBg : N.warningBg,
                      color: c.environment === 'Production' ? N.successLight : N.warningLight,
                    }}>{c.environment}</span>
                  </td>
                  <TD muted>{c.issuer}</TD>
                  <TD mono muted>{c.algorithm}</TD>
                  <TD><StatusChip status={c.status} /></TD>
                  <TD mono muted>{c.expiryDate}</TD>
                  <td className="py-2.5 pr-4 text-xs font-semibold" style={{
                    color: c.daysToExpiry < 45 ? N.errorLight : c.daysToExpiry < 90 ? N.warningLight : N.successLight,
                    fontFamily: 'DM Mono, monospace',
                  }}>
                    {c.daysToExpiry}d
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: N.tealBg, color: N.tealLight }}>Details</button>
                      {c.status === 'Expiring Soon' && (
                        <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: N.warningBg, color: N.warningLight }}>Renew</button>
                      )}
                    </div>
                  </td>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Endpoint health */}
      <Card className="p-5">
        <SectionHeader title="NABIDH Endpoint Health">
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: N.text3 }}>
            <Wifi size={10} />
            <span>Checked every 60s</span>
          </div>
        </SectionHeader>
        <div className="space-y-3">
          {CONNECTION_ENDPOINTS.map(ep => (
            <div key={ep.name} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: N.bg1, border: `1px solid ${N.border}` }}>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold mb-0.5" style={{ color: N.text1 }}>{ep.name}</div>
                <div className="text-[10px] truncate" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>{ep.url}</div>
              </div>
              <div className="text-[10px] text-center" style={{ color: N.text3 }}>
                <div style={{ color: ep.latencyMs > 500 ? N.warningLight : N.tealLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{ep.latencyMs}ms</div>
                <div>latency</div>
              </div>
              <div className="text-[10px] text-center" style={{ color: N.text3 }}>
                <div style={{ color: N.successLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{ep.uptime}</div>
                <div>uptime</div>
              </div>
              <div className="flex items-center gap-1.5">
                {ep.status === 'Healthy'
                  ? <CheckCircle size={14} style={{ color: N.successLight }} />
                  : <AlertTriangle size={14} style={{ color: N.warningLight }} />}
                <span className="text-[10px] font-semibold" style={{ color: ep.status === 'Healthy' ? N.successLight : N.warningLight }}>{ep.status}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
