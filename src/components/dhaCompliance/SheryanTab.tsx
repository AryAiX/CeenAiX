import { useState } from 'react';
import { Search, RefreshCw, Eye, AlertTriangle } from 'lucide-react';
import { FACILITY_LICENSE, PROFESSIONAL_LICENSES, type LicenseStatus } from '../../data/dhaComplianceData';
import { D, Card, SectionHeader, LicenseStatusChip, MonoId, TH, TD, TR, DaysChip } from './DhaCompliancePrimitives';

const ROLES = ['All', 'Doctor', 'Pharmacist', 'Nurse', 'Lab Tech', 'Radiographer'];
const STATUS_FILTERS: LicenseStatus[] = ['Active', 'Expiring', 'Expired', 'Suspended', 'Under review'];

export function SheryanTab() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<LicenseStatus | 'All'>('All');
  const [selected, setSelected] = useState<typeof PROFESSIONAL_LICENSES[0] | null>(null);

  const filtered = PROFESSIONAL_LICENSES.filter(p => {
    if (roleFilter !== 'All' && p.role !== roleFilter) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.licenseNumber.toLowerCase().includes(q) || p.specialty.toLowerCase().includes(q);
    }
    return true;
  });

  const suspended = PROFESSIONAL_LICENSES.filter(p => p.status === 'Suspended');
  const expiring = PROFESSIONAL_LICENSES.filter(p => p.status === 'Expiring');

  return (
    <div className="flex gap-4 p-5 overflow-auto">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Hard guardrail banner for suspended */}
        {suspended.length > 0 && (
          <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: D.errorBg, border: `1px solid ${D.errorBorder}` }}>
            <AlertTriangle size={14} style={{ color: D.errorLight, flexShrink: 0, marginTop: 1 }} />
            <div className="flex-1">
              <div className="text-xs font-semibold" style={{ color: D.errorLight }}>
                {suspended.length} professional{suspended.length > 1 ? 's' : ''} with suspended DHA license — clinical write access blocked in CeenAiX
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>
                {suspended.map(p => p.name).join(', ')} · Login allowed, clinical writes blocked until Sheryan status restored
              </div>
            </div>
          </div>
        )}

        {/* Facility license card */}
        <Card className="p-5">
          <SectionHeader title="Facility License">
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
              <RefreshCw size={9} /> Re-verify with DHA
            </button>
          </SectionHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold mb-1" style={{ color: D.text1 }}>{FACILITY_LICENSE.facilityName}</div>
                  <div className="text-[11px] mb-2" style={{ color: D.text3 }}>{FACILITY_LICENSE.activityScope}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <MonoId value={FACILITY_LICENSE.licenseNumber} label="DHA Facility License" />
                    <LicenseStatusChip status={FACILITY_LICENSE.status} />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 text-[10px]">
                {[
                  { label: 'Valid from', value: FACILITY_LICENSE.validFrom },
                  { label: 'Valid to', value: FACILITY_LICENSE.validTo },
                  { label: 'Renewal in', value: `${FACILITY_LICENSE.renewalDue} days` },
                  { label: 'Issued by', value: FACILITY_LICENSE.issuedBy },
                  { label: 'License type', value: FACILITY_LICENSE.licenseType },
                  { label: 'DED number', value: FACILITY_LICENSE.dedLicenseNumber },
                  { label: 'Owner on record', value: FACILITY_LICENSE.ownerOnRecord },
                ].map(f => (
                  <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                    <span style={{ color: D.text3 }}>{f.label}</span>
                    <span style={{ color: D.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: D.text3, fontFamily: 'DM Mono, monospace' }}>License Conditions</div>
              <div className="space-y-2">
                {FACILITY_LICENSE.conditions.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: D.bg1, border: `1px solid ${D.border}` }}>
                    <span className="text-[9px] font-bold mt-0.5 flex-shrink-0" style={{ color: D.tealLight }}>{i + 1}</span>
                    <span className="text-[10px] leading-snug" style={{ color: D.text2 }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Professional licenses */}
        <Card className="p-5">
          <SectionHeader title={`Professional Licenses (${PROFESSIONAL_LICENSES.length} total)`}>
            <div className="flex items-center gap-2">
              {expiring.length > 0 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: D.warningBg, color: D.warningLight }}>
                  {expiring.length} expiring
                </span>
              )}
              <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
                style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
                <RefreshCw size={9} /> Verify all
              </button>
            </div>
          </SectionHeader>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-1 min-w-40" style={{ background: D.bg1, border: `1px solid ${D.border}` }}>
              <Search size={10} style={{ color: D.text3 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name, license number, specialty…"
                className="bg-transparent text-[10px] outline-none flex-1" style={{ color: D.text1 }} />
            </div>
            <div className="flex gap-1">
              {ROLES.map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className="text-[10px] px-2 py-1 rounded-lg"
                  style={roleFilter === r ? { background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` } : { background: D.bg1, color: D.text3, border: `1px solid ${D.border}` }}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(['All', ...STATUS_FILTERS] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s as any)}
                  className="text-[10px] px-2 py-1 rounded-lg"
                  style={statusFilter === s ? { background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` } : { background: D.bg1, color: D.text3, border: `1px solid ${D.border}` }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: '#0A1628' }}>
                <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                  <TH>Name</TH>
                  <TH>Role</TH>
                  <TH>DHA License</TH>
                  <TH>Specialty</TH>
                  <TH>Status</TH>
                  <TH>Valid Until</TH>
                  <TH>Facility</TH>
                  <TH>Last Verified</TH>
                  <TH>Actions</TH>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <TR key={p.id}
                    onClick={() => setSelected(selected?.id === p.id ? null : p)}
                    highlight={p.status === 'Suspended' || p.status === 'Expired'}>
                    <TD>
                      <div className="text-xs font-semibold" style={{ color: D.text1 }}>{p.name}</div>
                    </TD>
                    <TD>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: D.bg1, color: D.text3, border: `1px solid ${D.border}` }}>{p.role}</span>
                    </TD>
                    <TD><MonoId value={p.licenseNumber} /></TD>
                    <TD>{p.specialty}{p.subSpecialty ? ` · ${p.subSpecialty}` : ''}</TD>
                    <TD><LicenseStatusChip status={p.status} /></TD>
                    <TD mono>{p.validUntil}</TD>
                    <TD>{p.linkedFacility}</TD>
                    <TD mono>{p.lastVerified}</TD>
                    <td className="py-2 pr-3">
                      <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: D.tealBg, color: D.tealLight }}>
                        <Eye size={8} className="inline mr-1" />View
                      </button>
                    </td>
                  </TR>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-8 text-[11px]" style={{ color: D.text3 }}>No professionals match current filters</div>
            )}
          </div>
        </Card>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0" style={{ background: D.bg2, border: `1px solid ${D.border}`, borderRadius: 12 }}>
          <div className="p-4 border-b" style={{ borderColor: D.border }}>
            <div className="text-sm font-semibold mb-1" style={{ color: D.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.name}</div>
            <div className="flex items-center gap-2 mb-1">
              <LicenseStatusChip status={selected.status} />
              <MonoId value={selected.licenseNumber} />
            </div>
            <div className="text-[10px]" style={{ color: D.text3 }}>{selected.role} · {selected.specialty}</div>
          </div>
          <div className="p-4 space-y-2 text-[10px]">
            {[
              { label: 'Sub-specialty', value: selected.subSpecialty || '—' },
              { label: 'Emirate', value: selected.emirate },
              { label: 'Valid until', value: selected.validUntil },
              { label: 'Linked facility', value: selected.linkedFacility },
              { label: 'CeenAiX user', value: selected.linkedUser },
              { label: 'Last verified', value: selected.lastVerified },
            ].map(f => (
              <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                <span style={{ color: D.text3 }}>{f.label}</span>
                <span style={{ color: D.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
              </div>
            ))}
          </div>
          {selected.status === 'Suspended' && (
            <div className="mx-4 mb-4 p-3 rounded-xl text-[10px]" style={{ background: D.errorBg, border: `1px solid ${D.errorBorder}`, color: D.errorLight }}>
              Clinical write access blocked in CeenAiX. Reinstate or terminate license to restore access.
            </div>
          )}
          <div className="p-4 flex gap-2">
            <button className="flex-1 text-[10px] py-1.5 rounded-lg" style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
              Re-verify
            </button>
            <button className="flex-1 text-[10px] py-1.5 rounded-lg" style={{ background: D.bg1, color: D.text2, border: `1px solid ${D.border}` }}>
              View history
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
