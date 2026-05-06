import { useState } from 'react';
import { Search, Eye, Shield } from 'lucide-react';
import { AUDIT_LOG } from '../../data/nabidhData';
import { N, Card, SectionHeader, StatusChip, TH, TD, TR } from './NabidhPrimitives';

const ACTION_LABELS: Record<string, string> = {
  PHI_VIEW: 'PHI View',
  RESUBMIT: 'Resubmit',
  MAPPING_EDIT: 'Mapping Edit',
  CONFIG_CHANGE: 'Config Change',
  CERT_ALERT: 'Cert Alert',
  CONSENT_REVOKE: 'Consent Revoke',
  CERT_EXPIRY_CHECK: 'Cert Check',
  SUBMISSION_MANUAL: 'Manual Submission',
};

const ACTION_COLORS: Record<string, string> = {
  PHI_VIEW: '#F97316',
  CONSENT_REVOKE: N.errorLight,
  CONFIG_CHANGE: N.warningLight,
  MAPPING_EDIT: N.warningLight,
  RESUBMIT: N.tealLight,
  CERT_ALERT: N.warningLight,
  CERT_EXPIRY_CHECK: N.text3,
  SUBMISSION_MANUAL: N.blueLight,
};

export function AuditLogTab() {
  const [search, setSearch] = useState('');
  const [phiOnly, setPhiOnly] = useState(false);

  const filtered = AUDIT_LOG.filter(e => {
    if (phiOnly && !e.phiAccessed) return false;
    const q = search.toLowerCase();
    return !q || e.actor.toLowerCase().includes(q) || e.action.toLowerCase().includes(q) || e.resource.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-48 px-3 py-2 rounded-lg" style={{ background: N.bg1, border: `1px solid ${N.border}` }}>
            <Search size={12} style={{ color: N.text3 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actor, action, resource…"
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: N.text1, fontFamily: 'DM Mono, monospace' }} />
          </div>
          <button onClick={() => setPhiOnly(!phiOnly)} className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg"
            style={phiOnly
              ? { background: 'rgba(249,115,22,0.15)', color: '#F97316', border: '1px solid rgba(249,115,22,0.3)' }
              : { background: N.bg1, color: N.text2, border: `1px solid ${N.border}` }}>
            <Eye size={10} /> PHI Access Only
          </button>
        </div>
      </Card>

      {/* PHI access stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'PHI Access Events', value: AUDIT_LOG.filter(e => e.phiAccessed).length.toString(), color: '#F97316' },
          { label: 'Config Changes', value: AUDIT_LOG.filter(e => e.action === 'CONFIG_CHANGE').length.toString(), color: N.warningLight },
          { label: 'Consent Changes', value: AUDIT_LOG.filter(e => e.action.includes('CONSENT')).length.toString(), color: N.errorLight },
          { label: 'Auto Actions', value: AUDIT_LOG.filter(e => e.actorRole === 'Service Account').length.toString(), color: N.tealLight },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <div className="text-xl font-bold" style={{ color: s.color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{s.value}</div>
            <div className="text-[9px] mt-0.5" style={{ color: N.text3 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Audit table */}
      <Card className="p-5">
        <SectionHeader title={`Audit Log (${filtered.length} events)`}>
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: N.text3 }}>
            <Shield size={10} style={{ color: N.teal }} />
            <span>Immutable · Tamper-evident</span>
          </div>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${N.border}` }}>
                <TH>Timestamp</TH><TH>Actor</TH><TH>Role</TH><TH>Action</TH>
                <TH>Resource</TH><TH>PHI</TH><TH>Outcome</TH><TH>IP Address</TH><TH>Details</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <TR key={e.id} highlight={e.phiAccessed}>
                  <td className="py-2.5 pr-4 text-[11px]" style={{ color: N.text3, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{e.timestamp}</td>
                  <TD>{e.actor}</TD>
                  <td className="py-2.5 pr-4">
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: N.tealBg, color: N.tealLight }}>{e.actorRole}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-[10px] font-semibold" style={{ color: ACTION_COLORS[e.action] || N.text2 }}>
                      {ACTION_LABELS[e.action] || e.action}
                    </span>
                  </td>
                  <TD mono muted>{e.resource}</TD>
                  <td className="py-2.5 pr-4">
                    {e.phiAccessed
                      ? <span className="text-[10px] font-semibold" style={{ color: '#F97316' }}>PHI</span>
                      : <span className="text-[10px]" style={{ color: N.text3 }}>—</span>}
                  </td>
                  <TD><StatusChip status={e.outcome} /></TD>
                  <TD mono muted>{e.ipAddress}</TD>
                  <td className="py-2.5 text-[10px] max-w-[200px] truncate" style={{ color: N.text3 }} title={e.details}>{e.details}</td>
                </TR>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
