import { AlertTriangle, Clock, FileText } from 'lucide-react';
import { PATIENT_RIGHTS_STATUS } from '../../data/dhaComplianceData';
import { D, Card, SectionHeader } from './DhaCompliancePrimitives';

export function PatientRightsTab() {
  const pr = PATIENT_RIGHTS_STATUS;

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* SLA breach alert */}
      {pr.accessRequests.overdueSla > 0 && (
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: D.errorBg, border: `1px solid ${D.errorBorder}` }}>
          <AlertTriangle size={14} style={{ color: D.errorLight, flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1">
            <div className="text-xs font-semibold" style={{ color: D.errorLight }}>
              {pr.accessRequests.overdueSla} patient access request{pr.accessRequests.overdueSla > 1 ? 's' : ''} exceeded 30-day SLA
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>
              DHA Patient Rights Regulation requires responses within 30 days. Breach must be reported to DHA Patient Rights Unit.
            </div>
          </div>
          <button className="flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg"
            style={{ background: D.errorBg, color: D.errorLight, border: `1px solid ${D.errorBorder}` }}>
            Report to DHA
          </button>
        </div>
      )}

      {/* Charter card */}
      <Card className="p-5">
        <SectionHeader title="Patient Rights Charter">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: D.tealBg, color: D.tealLight }}>
              {pr.charterVersion}
            </span>
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
              <FileText size={9} /> View charter
            </button>
          </div>
        </SectionHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2 text-[10px]">
            {[
              { label: 'Effective date', value: pr.charterEffectiveDate },
              { label: 'Languages', value: pr.languages.map(l => l.toUpperCase()).join(' · ') },
            ].map(f => (
              <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                <span style={{ color: D.text3 }}>{f.label}</span>
                <span style={{ color: D.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] mb-1.5" style={{ color: D.text3 }}>Charter viewed rate</div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span style={{ color: D.text2 }}>Viewed</span>
              <span style={{ color: D.text1, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{pr.charterViewedRate}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
              <div className="h-full rounded-full" style={{ width: `${pr.charterViewedRate}%`, background: D.teal }} />
            </div>
          </div>
          <div>
            <div className="text-[10px] mb-1.5" style={{ color: D.text3 }}>Charter acknowledged rate</div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span style={{ color: D.text2 }}>Acknowledged</span>
              <span style={{ color: pr.charterAcknowledgedRate >= 80 ? D.successLight : D.warningLight, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>
                {pr.charterAcknowledgedRate}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
              <div className="h-full rounded-full" style={{ width: `${pr.charterAcknowledgedRate}%`, background: pr.charterAcknowledgedRate >= 80 ? D.success : D.warning }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Consent coverage */}
      <Card className="p-5">
        <SectionHeader title="Consent Coverage by Type" />
        <div className="space-y-3">
          {pr.consentTypes.map(ct => {
            const isLow = ct.coverage < 50;
            const isMedium = ct.coverage >= 50 && ct.coverage < 80;
            const barColor = isLow ? D.error : isMedium ? D.warning : D.success;
            const textColor = isLow ? D.errorLight : isMedium ? D.warningLight : D.successLight;
            return (
              <div key={ct.type}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span style={{ color: D.text2 }}>{ct.type}</span>
                  <div className="flex items-center gap-3">
                    {ct.recentWithdrawals > 0 && (
                      <span style={{ color: D.errorLight }}>−{ct.recentWithdrawals} withdrawals (7d)</span>
                    )}
                    <span style={{ color: textColor, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{ct.coverage}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
                  <div className="h-full rounded-full" style={{ width: `${ct.coverage}%`, background: barColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Access requests */}
        <Card className="p-5">
          <SectionHeader title="Patient Access Requests" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Open', value: pr.accessRequests.open, color: D.blueLight },
              { label: 'In Progress', value: pr.accessRequests.inProgress, color: D.warningLight },
              { label: 'Overdue SLA', value: pr.accessRequests.overdueSla, color: D.errorLight },
              { label: 'Closed (30d)', value: pr.accessRequests.closedLast30d, color: D.successLight },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: D.bg1 }}>
                <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'DM Mono, monospace' }}>{s.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 text-[10px]">
            {[
              { label: 'SLA target', value: '30 days (DHA requirement)' },
              { label: 'Avg resolution time', value: '12.4 days' },
              { label: 'Electronic portal', value: 'Enabled' },
            ].map(f => (
              <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                <span style={{ color: D.text3 }}>{f.label}</span>
                <span style={{ color: D.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Complaints */}
        <Card className="p-5">
          <SectionHeader title="Patient Complaints" />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Open', value: pr.complaints.open, color: D.warningLight },
              { label: 'Resolved (30d)', value: pr.complaints.resolved30d, color: D.successLight },
              { label: 'Pending DHA Report', value: pr.complaints.pendingDhaReport, color: pr.complaints.pendingDhaReport > 0 ? D.errorLight : D.successLight },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: D.bg1 }}>
                <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'DM Mono, monospace' }}>{s.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {pr.complaints.pendingDhaReport > 0 && (
            <div className="p-2.5 rounded-xl text-[10px] mb-3" style={{ background: 'rgba(220,38,38,0.06)', border: `1px solid ${D.errorBorder}` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={10} style={{ color: D.errorLight }} />
                <span className="font-semibold" style={{ color: D.errorLight }}>DHA report pending</span>
              </div>
              <span style={{ color: D.text3 }}>
                {pr.complaints.pendingDhaReport} complaint(s) require formal DHA Patient Rights Unit notification within 7 days of resolution.
              </span>
            </div>
          )}
          <div className="space-y-1.5 text-[10px]">
            {[
              { label: 'Complaint SLA', value: '7 days (initial response)' },
              { label: 'Resolution SLA', value: '30 days' },
              { label: 'DHA escalation threshold', value: 'Unresolved > 30d' },
            ].map(f => (
              <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                <span style={{ color: D.text3 }}>{f.label}</span>
                <span style={{ color: D.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
