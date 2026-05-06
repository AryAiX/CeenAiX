import { useState } from 'react';
import { AlertTriangle, FileText, Search, Users, CheckCircle } from 'lucide-react';
import { POLICIES, TRAINING_MODULES } from '../../data/dhaComplianceData';
import { D, Card, SectionHeader, TH, TD, TR } from './DhaCompliancePrimitives';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  'Current': { color: D.successLight, bg: D.successBg },
  'In review': { color: D.blueLight, bg: D.blueBg },
  'Overdue review': { color: D.warningLight, bg: D.warningBg },
  'Draft': { color: D.text3, bg: D.bg1 },
};

export function PoliciesTab() {
  const [search, setSearch] = useState('');
  const overdueReview = POLICIES.filter(p => p.status === 'Overdue review');
  const lowAck = POLICIES.filter(p => p.acknowledgementCoverage < 85);

  const filteredPolicies = POLICIES.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const totalOverdue = TRAINING_MODULES.reduce((sum, t) => sum + t.overdueCount, 0);

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {(overdueReview.length > 0 || lowAck.length > 0) && (
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: D.warningBg, border: `1px solid ${D.warningBorder}` }}>
          <AlertTriangle size={14} style={{ color: D.warningLight, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: D.warningLight }}>
              {overdueReview.length} polic{overdueReview.length === 1 ? 'y' : 'ies'} overdue for review
              {lowAck.length > 0 && ` · ${lowAck.length} below 85% acknowledgement`}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>
              {overdueReview.map(p => p.name).join(', ')} — review must be completed and staff re-acknowledgement collected.
            </div>
          </div>
        </div>
      )}

      {/* Policies table */}
      <Card className="p-5">
        <SectionHeader title={`Policies & Procedures (${POLICIES.length})`}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: D.bg1, border: `1px solid ${D.border}` }}>
              <Search size={10} style={{ color: D.text3 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search policies…"
                className="bg-transparent text-[10px] outline-none w-36" style={{ color: D.text1 }} />
            </div>
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
              <FileText size={9} /> New policy
            </button>
          </div>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: D.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                <TH>Policy Name</TH>
                <TH>Category</TH>
                <TH>Version</TH>
                <TH>Effective</TH>
                <TH>Next Review</TH>
                <TH>Acknowledgement</TH>
                <TH>Languages</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.map(pol => {
                const s = STATUS_COLORS[pol.status] || { color: D.text3, bg: D.bg1 };
                return (
                  <TR key={pol.id} highlight={pol.status === 'Overdue review'}>
                    <TD>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: D.text1 }}>{pol.name}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>Owner: {pol.owner.split(' ').slice(0, 2).join(' ')}</div>
                      </div>
                    </TD>
                    <TD>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: D.bg1, color: D.text3, border: `1px solid ${D.border}` }}>
                        {pol.category}
                      </span>
                    </TD>
                    <TD mono>{pol.version}</TD>
                    <TD mono>{pol.effectiveDate}</TD>
                    <TD mono>
                      <span style={{ color: pol.status === 'Overdue review' ? D.warningLight : D.text2 }}>
                        {pol.nextReviewDue}
                      </span>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${pol.acknowledgementCoverage}%`, background: pol.acknowledgementCoverage >= 90 ? D.success : pol.acknowledgementCoverage >= 75 ? D.warning : D.error }} />
                        </div>
                        <span style={{ color: pol.acknowledgementCoverage >= 90 ? D.successLight : pol.acknowledgementCoverage >= 75 ? D.warningLight : D.errorLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
                          {pol.acknowledgementCoverage}%
                        </span>
                      </div>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        {pol.languages.map(l => (
                          <span key={l} className="text-[9px] px-1.5 py-0.5 rounded uppercase"
                            style={{ background: D.tealBg, color: D.tealLight }}>{l}</span>
                        ))}
                      </div>
                    </TD>
                    <TD>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
                        {pol.status}
                      </span>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Training modules */}
      <Card className="p-5">
        <SectionHeader title="Training & Competency">
          <div className="flex items-center gap-2">
            {totalOverdue > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: D.warningBg, color: D.warningLight }}>
                {totalOverdue} overdue
              </span>
            )}
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
              <Users size={9} /> Assign training
            </button>
          </div>
        </SectionHeader>
        <div className="space-y-3">
          {TRAINING_MODULES.map(tm => (
            <div key={tm.id} className="p-3 rounded-xl" style={{ background: D.bg1, border: `1px solid ${D.border}` }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="text-xs font-semibold mb-0.5" style={{ color: D.text1 }}>{tm.name}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {tm.applicableRoles.map(r => (
                      <span key={r} className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: D.bg2, color: D.text3, border: `1px solid ${D.border}` }}>{r}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold" style={{ color: tm.completionRate === 100 ? D.successLight : tm.completionRate >= 90 ? D.tealLight : D.warningLight, fontFamily: 'DM Mono, monospace' }}>
                    {tm.completionRate}%
                  </div>
                  {tm.overdueCount > 0 && (
                    <div className="text-[9px]" style={{ color: D.warningLight }}>{tm.overdueCount} overdue</div>
                  )}
                  {tm.overdueCount === 0 && (
                    <div className="flex items-center gap-1 justify-end">
                      <CheckCircle size={9} style={{ color: D.successLight }} />
                      <span className="text-[9px]" style={{ color: D.successLight }}>All current</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: D.bg2 }}>
                <div className="h-full rounded-full"
                  style={{ width: `${tm.completionRate}%`, background: tm.completionRate === 100 ? D.success : tm.completionRate >= 90 ? D.teal : D.warning }} />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[9px]" style={{ color: D.text3 }}>
                <span>Expires every {tm.expiryMonths} months</span>
                <span>Last updated {tm.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
