import { useState } from 'react';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { CONSENT_RECORDS, CONSENT_STATS, ConsentRecord } from '../../data/nabidhData';
import { N, Card, SectionHeader, StatusChip, PhiRedacted, TH, TD, TR } from './NabidhPrimitives';

export function ConsentTab() {
  const [phiRevealed, setPhiRevealed] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = statusFilter === 'All'
    ? CONSENT_RECORDS
    : CONSENT_RECORDS.filter(c => c.status === statusFilter);

  const statuses = ['All', 'Granted', 'Pending', 'Revoked', 'Expired'];

  return (
    <div className="flex flex-col gap-4">
      {/* PHI warning banner */}
      {phiRevealed && (
        <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)' }}>
          <AlertTriangle size={14} style={{ color: N.warningLight, flexShrink: 0 }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: N.warningLight }}>PHI Revealed — Audit Event Logged</div>
            <div className="text-[10px] mt-0.5" style={{ color: N.text3 }}>All access to patient identifiable information is logged. Requires nabidh:view-phi permission.</div>
          </div>
          <button onClick={() => setPhiRevealed(false)} className="ml-auto flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: N.warningBg, color: N.warningLight, border: `1px solid rgba(217,119,6,0.3)` }}>
            <EyeOff size={10} /> Hide PHI
          </button>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Patients', value: CONSENT_STATS.total.toLocaleString(), color: N.text1 },
          { label: 'Consent Granted', value: CONSENT_STATS.granted.toLocaleString(), color: N.successLight },
          { label: 'Pending Consent', value: CONSENT_STATS.pending.toLocaleString(), color: N.warningLight },
          { label: 'Revoked', value: CONSENT_STATS.revoked.toLocaleString(), color: N.errorLight },
          { label: 'Expired', value: CONSENT_STATS.expired.toLocaleString(), color: N.text3 },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <div className="text-base font-semibold" style={{ color: s.color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.value}</div>
            <div className="text-[9px] mt-0.5" style={{ color: N.text3 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Coverage progress */}
      <Card className="p-5">
        <SectionHeader title="Consent Coverage">
          <span className="text-[10px] font-semibold" style={{ color: N.tealLight, fontFamily: 'DM Mono, monospace' }}>
            {CONSENT_STATS.grantRate}%
          </span>
        </SectionHeader>
        <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: N.bg1 }}>
          <div className="h-full rounded-full" style={{ width: `${CONSENT_STATS.grantRate}%`, background: `linear-gradient(90deg, ${N.teal}, #059669)` }} />
        </div>
        <div className="flex justify-between text-[10px]" style={{ color: N.text3 }}>
          <span>{CONSENT_STATS.granted.toLocaleString()} consented</span>
          <span>{(CONSENT_STATS.total - CONSENT_STATS.granted).toLocaleString()} remaining</span>
        </div>
        <div className="mt-3 p-3 rounded-lg" style={{ background: N.warningBg, border: `1px solid rgba(217,119,6,0.2)` }}>
          <div className="flex items-center gap-2 text-[10px]">
            <Shield size={10} style={{ color: N.warningLight }} />
            <span style={{ color: N.warningLight, fontWeight: 600 }}>DHA Requirement:</span>
            <span style={{ color: N.text2 }}>Submissions blocked for {CONSENT_STATS.pending.toLocaleString()} patients without consent</span>
          </div>
        </div>
      </Card>

      {/* Consent records table */}
      <Card className="p-5">
        <SectionHeader title="Consent Records">
          <div className="flex items-center gap-2">
            {!phiRevealed && (
              <button onClick={() => setPhiRevealed(true)} className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg"
                style={{ background: N.warningBg, color: N.warningLight, border: `1px solid rgba(217,119,6,0.3)` }}>
                <Eye size={10} /> Reveal PHI
              </button>
            )}
            <div className="flex flex-wrap gap-1">
              {statuses.map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className="text-[10px] px-2 py-1 rounded-lg"
                  style={statusFilter === s
                    ? { background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }
                    : { background: N.bg1, color: N.text3, border: `1px solid ${N.border}` }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${N.border}` }}>
                <TH>Record ID</TH><TH>Patient MRN</TH><TH>Patient Name</TH><TH>Emirates ID</TH>
                <TH>Workspace</TH><TH>Status</TH><TH>Granted</TH><TH>Expiry</TH><TH>Channel</TH><TH>Version</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <TR key={c.id} highlight={c.status === 'Revoked' || c.status === 'Expired'}>
                  <td className="py-2.5 pr-4">
                    <span className="text-[11px]" style={{ color: N.tealLight, fontFamily: 'DM Mono, monospace' }}>{c.id}</span>
                  </td>
                  <TD mono muted>{c.patientMrn}</TD>
                  <td className="py-2.5 pr-4 text-xs"><PhiRedacted value={c.name} revealed={phiRevealed} /></td>
                  <td className="py-2.5 pr-4 text-xs"><PhiRedacted value={c.emiratesId} revealed={phiRevealed} /></td>
                  <td className="py-2.5 pr-4 text-xs max-w-[140px] truncate" style={{ color: N.text2 }}>{c.workspace}</td>
                  <TD><StatusChip status={c.status} /></TD>
                  <TD mono muted>{c.grantedDate || '—'}</TD>
                  <td className="py-2.5 pr-4 text-xs" style={{ color: c.status === 'Expired' ? N.errorLight : N.text3, fontFamily: 'DM Mono, monospace' }}>
                    {c.expiryDate || c.revokedDate || '—'}
                  </td>
                  <TD muted>{c.channel}</TD>
                  <TD mono muted>{c.version}</TD>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
