import { useState } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import {
  HEATMAP_DATA, HEATMAP_MONTHS, ACTION_ITEMS, DHA_ANNOUNCEMENTS,
  type ProgramKey,
} from '../../data/dhaComplianceData';
import {
  D, Card, SectionHeader, ProgramChip, DaysChip, FindingChip,
  PROGRAM_LABELS,
} from './DhaCompliancePrimitives';

const HEAT_COLORS = {
  green: 'rgba(5,150,105,0.65)',
  amber: 'rgba(217,119,6,0.65)',
  red: 'rgba(220,38,38,0.65)',
  grey: 'rgba(30,41,59,0.4)',
};

const PROGRAM_ORDER: ProgramKey[] = ['Sheryan','NABIDH','Tatmeen','Shafafiya','Formulary','PathB','PatientRights','Quality','DataProtection'];

function navigate(tabId: string) {
  window.history.pushState({}, '', `/admin/compliance/dha#${tabId}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function OverviewTab({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const [announcements, setAnnouncements] = useState(DHA_ANNOUNCEMENTS);
  const openActions = ACTION_ITEMS.filter(a => a.status !== 'Blocked');
  const overdueActions = ACTION_ITEMS.filter(a => a.status === 'Overdue');

  const acknowledge = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  return (
    <div className="flex gap-4 p-5 min-h-0 overflow-auto">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Compliance heatmap */}
        <Card className="p-5">
          <SectionHeader title="Compliance Heatmap — Last 12 Months">
            <div className="flex items-center gap-3 text-[9px]" style={{ color: D.text3 }}>
              {[['green', 'Compliant'], ['amber', 'Action required'], ['red', 'Non-compliant'], ['grey', 'N/A']].map(([k, label]) => (
                <div key={k} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ background: HEAT_COLORS[k as keyof typeof HEAT_COLORS] }} />
                  {label}
                </div>
              ))}
            </div>
          </SectionHeader>
          <div className="overflow-x-auto">
            <div className="flex gap-1 mb-1 ml-24">
              {HEATMAP_MONTHS.map(m => (
                <div key={m} className="flex-1 text-center text-[9px] whitespace-nowrap" style={{ color: D.text3, fontFamily: 'DM Mono, monospace', minWidth: 30 }}>{m}</div>
              ))}
            </div>
            {PROGRAM_ORDER.map(prog => (
              <div key={prog} className="flex items-center gap-1 mb-0.5">
                <button onClick={() => onSwitchTab(prog)}
                  className="w-24 text-right pr-2 text-[10px] truncate hover:opacity-80 transition-opacity flex-shrink-0"
                  style={{ color: D.text2 }}>
                  {PROGRAM_LABELS[prog]}
                </button>
                {HEATMAP_DATA[prog].map((status, i) => (
                  <div key={i} className="flex-1 rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ minWidth: 30, height: 20, background: HEAT_COLORS[status] }}
                    title={`${PROGRAM_LABELS[prog]} · ${HEATMAP_MONTHS[i]}: ${status === 'green' ? 'Compliant' : status === 'amber' ? 'Action required' : status === 'red' ? 'Non-compliant' : 'N/A'}`} />
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* Action queue */}
        <Card className="p-5">
          <SectionHeader title={`Action Queue (${openActions.length} open, ${overdueActions.length} overdue)`}>
            <button className="text-[10px] flex items-center gap-1" style={{ color: D.tealLight }}>
              View all <ChevronRight size={10} />
            </button>
          </SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                  {['Title', 'Program', 'Category', 'Due', 'Owner', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: D.text3, fontFamily: 'DM Mono, monospace' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACTION_ITEMS.map(item => (
                  <tr key={item.id} className="transition-colors"
                    style={{ borderBottom: `1px solid ${D.border}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="py-2 pr-3">
                      <div className="text-xs" style={{ color: D.text1, maxWidth: 280 }}>{item.title}</div>
                    </td>
                    <td className="py-2 pr-3"><ProgramChip program={item.program} /></td>
                    <td className="py-2 pr-3">
                      <span className="text-[10px]" style={{ color: D.text3 }}>{item.category}</span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <DaysChip days={item.daysRemaining} />
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-[10px]" style={{ color: D.text2 }}>{item.owner.split(' ').slice(0, 2).join(' ')}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: item.status === 'Overdue' ? D.errorBg : item.status === 'In progress' ? D.tealBg : D.bg1,
                          color: item.status === 'Overdue' ? D.errorLight : item.status === 'In progress' ? D.tealLight : D.text3,
                        }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent regulatory activity */}
        <Card className="p-5">
          <SectionHeader title="Recent Regulatory Activity">
            <button className="text-[10px] flex items-center gap-1" style={{ color: D.tealLight }}>
              View in Audit Log <ExternalLink size={9} />
            </button>
          </SectionHeader>
          <div className="space-y-2">
            {[
              { dot: D.errorLight, text: 'DHA inspection finding FND-001 opened — Bulk PHI export controls insufficient', program: 'DataProtection', time: '2026-02-18 09:22' },
              { dot: D.warningLight, text: 'NABIDH certificate approaching expiry — 39 days remaining', program: 'NABIDH', time: '2026-04-26 08:00' },
              { dot: D.successLight, text: 'DHA Path B approval renewed — valid until 2026-04-21', program: 'PathB', time: '2024-04-22 14:15' },
              { dot: D.tealLight, text: 'Tatmeen v4.2 migration announcement acknowledged', program: 'Tatmeen', time: '2026-04-16 11:03' },
              { dot: D.warningLight, text: 'MOHAP Formulary Q2-2026 update available — 12 drugs added, 3 removed', program: 'Formulary', time: '2026-04-20 09:00' },
              { dot: D.successLight, text: 'DHA Annual Compliance Report 2024–2025 submitted — ref DHA-ACR-2025-00441', program: 'Sheryan', time: '2025-05-28 16:42' },
            ].map((e, i) => (
              <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: `1px solid ${D.border}` }}>
                <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: e.dot }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px]" style={{ color: D.text1 }}>{e.text}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <ProgramChip program={e.program} />
                    <span className="text-[9px]" style={{ color: D.text3, fontFamily: 'DM Mono, monospace' }}>{e.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right rail: DHA Announcements */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        <Card className="p-4">
          <SectionHeader title="DHA Announcements" />
          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className="p-3 rounded-xl" style={{ background: ann.acknowledged ? D.bg1 : 'rgba(217,119,6,0.06)', border: `1px solid ${ann.acknowledged ? D.border : D.warningBorder}` }}>
                <div className="text-[11px] font-semibold leading-snug mb-1.5" style={{ color: ann.acknowledged ? D.text2 : D.text1 }}>{ann.title}</div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {ann.affectedPrograms.map(p => <ProgramChip key={p} program={p} />)}
                </div>
                <div className="flex items-center justify-between text-[9px] mb-2">
                  <span style={{ color: D.text3, fontFamily: 'DM Mono, monospace' }}>{ann.publishedDate}</span>
                  {ann.deadline && (
                    <span style={{ color: D.warningLight }}>Due {ann.deadline}</span>
                  )}
                </div>
                {!ann.acknowledged && (
                  <div className="flex gap-1">
                    <button onClick={() => acknowledge(ann.id)}
                      className="flex-1 text-[9px] py-1 rounded-lg"
                      style={{ background: D.successBg, color: D.successLight, border: `1px solid rgba(5,150,105,0.2)` }}>
                      Acknowledge
                    </button>
                    <button className="flex-1 text-[9px] py-1 rounded-lg"
                      style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
                      Assign
                    </button>
                  </div>
                )}
                {ann.acknowledged && (
                  <div className="text-[9px]" style={{ color: D.successLight }}>✓ Acknowledged</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Quick stats */}
        <Card className="p-4">
          <SectionHeader title="Program Summary" />
          <div className="space-y-2">
            {[
              { label: 'Sheryan licenses', value: '8 active', sub: '2 expiring in 60d', color: '#38BDF8' },
              { label: 'NABIDH compliance', value: '99.1%', sub: 'Last 24h', color: D.tealLight },
              { label: 'Tatmeen submissions', value: '99.2%', sub: 'Last 24h success', color: '#34D399' },
              { label: 'Shafafiya acceptance', value: '97.8%', sub: 'Last 24h', color: '#A78BFA' },
              { label: 'Drug formulary', value: '96.4%', sub: 'Catalog mapped', color: '#FB923C' },
              { label: 'Path B status', value: 'Approved', sub: '352d remaining', color: D.blueLight },
              { label: 'Consent coverage', value: '91.2%', sub: 'NABIDH general', color: '#F9A8D4' },
              { label: 'Inspection readiness', value: '82%', sub: 'Mock score', color: D.warningLight },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${D.border}` }}>
                <div>
                  <div className="text-[10px]" style={{ color: D.text2 }}>{s.label}</div>
                  <div className="text-[9px]" style={{ color: D.text3 }}>{s.sub}</div>
                </div>
                <div className="text-[11px] font-semibold" style={{ color: s.color, fontFamily: 'DM Mono, monospace' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
