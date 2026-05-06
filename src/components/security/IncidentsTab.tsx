import { useState } from 'react';
import { AlertTriangle, Plus, Clock, User, ChevronDown, ChevronRight } from 'lucide-react';
import { SECURITY_INCIDENTS, type SecurityIncident } from '../../data/securityData';
import { S, SCard, SectionHeader, IncidentSevChip, IncidentStatusChip, MonoValue, STH, STD, STR } from './SecurityPrimitives';

const HISTORICAL = [
  { id: 'INC-2026-018', title: 'DDoS attack — patient portal', severity: 'High', status: 'Resolved', opened: '2026-04-10', resolved: '2026-04-10', ttd: '4m', ttr: '38m', postmortem: true },
  { id: 'INC-2026-011', title: 'Phishing campaign targeting doctors', severity: 'Medium', status: 'Resolved', opened: '2026-03-22', resolved: '2026-03-23', ttd: '2h', ttr: '8h', postmortem: true },
  { id: 'INC-2026-004', title: 'Misconfigured S3 bucket (non-PHI)', severity: 'Medium', status: 'Resolved', opened: '2026-02-14', resolved: '2026-02-14', ttd: '1h', ttr: '3h', postmortem: false },
  { id: 'INC-2025-084', title: 'Insider access anomaly — billing data', severity: 'High', status: 'Resolved', opened: '2025-11-30', resolved: '2025-12-01', ttd: '8h', ttr: '26h', postmortem: true },
];

const DRILLS = [
  { name: 'Ransomware response drill', date: '2026-03-15', participants: 8, score: 88, status: 'Completed', findings: 2 },
  { name: 'PHI exfiltration scenario', date: '2026-01-20', participants: 6, score: 94, status: 'Completed', findings: 1 },
  { name: 'Insider threat tabletop', date: '2025-11-10', participants: 10, score: 76, status: 'Completed', findings: 4 },
  { name: 'DDoS response exercise', date: '2026-06-01', participants: 0, score: 0, status: 'Scheduled', findings: 0 },
];

const sevColors: Record<string, { bg: string; text: string }> = {
  Critical: { bg: S.errorBg, text: S.errorLight },
  High: { bg: S.orangeBg, text: S.orangeLight },
  Medium: { bg: S.warningBg, text: S.warningLight },
  Low: { bg: S.blueBg, text: S.blueLight },
};

export function IncidentsTab() {
  const [selected, setSelected] = useState<SecurityIncident | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const active = SECURITY_INCIDENTS.filter(i => i.status !== 'Resolved' && i.status !== 'Closed');

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {active.length > 0 && (
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: S.errorBg, border: `1px solid ${S.errorBorder}` }}>
          <AlertTriangle size={14} style={{ color: S.errorLight, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: S.errorLight }}>
              {active.length} active incident{active.length > 1 ? 's' : ''} — {active.filter(i => i.severity === 'Critical').length} critical
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: S.text3 }}>
              {active.map(i => i.id).join(' · ')} — active response required
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active incidents', value: active.length.toString(), color: active.length > 0 ? S.errorLight : S.successLight },
          { label: 'MTTD (30d)', value: '4.2h', color: S.text1 },
          { label: 'MTTR (30d)', value: '11.8h', color: S.text1 },
          { label: 'Drills completed (YTD)', value: '3', color: S.tealLight },
        ].map(k => (
          <SCard key={k.label} className="p-4">
            <div className="text-[10px] mb-1" style={{ color: S.text3 }}>{k.label}</div>
            <div className="text-xl font-bold" style={{ color: k.color, fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
          </SCard>
        ))}
      </div>

      {/* Active incidents */}
      <SCard className="p-0 overflow-hidden">
        <div className="flex">
          <div className="flex-1">
            <div className="p-4 pb-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="text-sm font-semibold" style={{ color: S.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Active Incidents ({active.length})
              </span>
              <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
                style={{ background: S.errorBg, color: S.errorLight, border: `1px solid ${S.errorBorder}` }}>
                <Plus size={9} />Declare incident
              </button>
            </div>
            <table className="w-full">
              <thead style={{ background: S.bg3 }}>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  <STH>ID</STH>
                  <STH>Title</STH>
                  <STH>Severity</STH>
                  <STH>Status</STH>
                  <STH>Commander</STH>
                  <STH>Opened</STH>
                  <STH>Age</STH>
                  <STH>Actions</STH>
                </tr>
              </thead>
              <tbody>
                {SECURITY_INCIDENTS.map(inc => (
                  <STR key={inc.id}
                    onClick={() => setSelected(selected?.id === inc.id ? null : inc)}
                    selected={selected?.id === inc.id}
                    highlight={inc.severity === 'Critical' && inc.status !== 'Resolved'}>
                    <STD><MonoValue value={inc.id} /></STD>
                    <STD>
                      <span className="text-xs" style={{ color: S.text1 }}>{inc.title}</span>
                    </STD>
                    <STD><IncidentSevChip severity={inc.severity} /></STD>
                    <STD><IncidentStatusChip status={inc.status} /></STD>
                    <STD>
                      <div className="flex items-center gap-1.5">
                        <User size={10} style={{ color: S.text3 }} />
                        <span className="text-[10px]" style={{ color: S.text2 }}>{inc.commander}</span>
                      </div>
                    </STD>
                    <STD mono>{inc.openedAt.slice(11, 16)}</STD>
                    <STD>
                      <div className="flex items-center gap-1">
                        <Clock size={9} style={{ color: S.text3 }} />
                        <span className="text-[10px]" style={{ color: S.text2 }}>{inc.durationHours}h</span>
                      </div>
                    </STD>
                    <td className="py-2 pr-3">
                      <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.tealBg, color: S.tealLight }}>
                        War room
                      </button>
                    </td>
                  </STR>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="w-80 flex-shrink-0 border-l" style={{ borderColor: S.border, background: S.bg1 }}>
              <div className="p-4 border-b" style={{ borderColor: S.border }}>
                <div className="flex items-center gap-2 mb-1">
                  <IncidentSevChip severity={selected.severity} />
                  <MonoValue value={selected.id} />
                </div>
                <div className="text-xs font-semibold mt-1" style={{ color: S.text1 }}>{selected.title}</div>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-[11px]" style={{ color: S.text2 }}>{selected.summary}</div>
                <div className="space-y-1.5 text-[10px]">
                  {[
                    { label: 'Status', value: selected.status },
                    { label: 'Commander', value: selected.commander },
                    { label: 'Opened', value: selected.openedAt },
                    { label: 'Duration', value: `${selected.durationHours}h` },
                    { label: 'Affected systems', value: selected.affectedSystems.join(', ') },
                    { label: 'PHI involved', value: selected.phiInvolved ? 'Yes — DHA notification pending' : 'No' },
                    { label: 'DHA notified', value: selected.dhaNotified ? 'Yes' : 'No' },
                  ].map(f => (
                    <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${S.border}` }}>
                      <span style={{ color: S.text3 }}>{f.label}</span>
                      <span style={{ color: f.label === 'PHI involved' && selected.phiInvolved ? S.errorLight : S.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <div>
                  <div className="text-[10px] font-semibold mb-2" style={{ color: S.text2 }}>Timeline</div>
                  <div className="space-y-1.5">
                    {selected.timeline.map((t, i) => (
                      <div key={i} className="flex gap-2 text-[9px]">
                        <span style={{ color: S.text3, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{t.time.slice(11, 16)}</span>
                        <span style={{ color: S.text2 }}>{t.event}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold" style={{ color: S.text2 }}>Actions</div>
                  {[
                    { label: 'Open war room', bg: S.tealBg, text: S.tealLight },
                    { label: 'Escalate severity', bg: S.errorBg, text: S.errorLight },
                    { label: 'Notify DHA (72h clock)', bg: S.warningBg, text: S.warningLight },
                    { label: 'Generate postmortem', bg: S.bg2, text: S.text2 },
                  ].map(a => (
                    <button key={a.label} className="w-full text-[10px] py-1.5 rounded-lg px-2.5 text-left"
                      style={{ background: a.bg, color: a.text }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </SCard>

      {/* Historical incidents */}
      <SCard className="p-5">
        <SectionHeader title="Historical Incidents (Last 12 months)" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: S.bg3 }}>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {['ID', 'Title', 'Severity', 'Opened', 'Resolved', 'MTTD', 'MTTR', 'Postmortem'].map(h => (
                  <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HISTORICAL.map(h => (
                <tr key={h.id} style={{ borderBottom: `1px solid ${S.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="py-2 pr-3"><MonoValue value={h.id} /></td>
                  <td className="py-2 pr-3 text-xs" style={{ color: S.text1 }}>{h.title}</td>
                  <td className="py-2 pr-3">
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: sevColors[h.severity]?.bg, color: sevColors[h.severity]?.text }}>
                      {h.severity}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{h.opened}</td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{h.resolved}</td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{h.ttd}</td>
                  <td className="py-2 pr-3 text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{h.ttr}</td>
                  <td className="py-2 pr-3">
                    {h.postmortem
                      ? <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.tealBg, color: S.tealLight }}>View</button>
                      : <span className="text-[9px]" style={{ color: S.text3 }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>

      {/* Drills */}
      <SCard className="p-5">
        <SectionHeader title="Incident Response Drills">
          <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
            <Plus size={9} />Schedule drill
          </button>
        </SectionHeader>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {DRILLS.map(d => (
            <div key={d.name} className="p-3.5 rounded-xl" style={{ background: S.bg1, border: `1px solid ${d.status === 'Scheduled' ? S.tealBorder : S.border}` }}>
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="text-xs font-semibold" style={{ color: S.text1 }}>{d.name}</div>
                <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: d.status === 'Completed' ? S.successBg : S.tealBg, color: d.status === 'Completed' ? S.successLight : S.tealLight }}>
                  {d.status}
                </span>
              </div>
              <div className="text-[10px] mb-1.5" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>{d.date}</div>
              {d.status === 'Completed' && (
                <>
                  <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: S.text3 }}>Score</span>
                    <span style={{ color: d.score >= 90 ? S.successLight : d.score >= 75 ? S.warningLight : S.errorLight, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{d.score}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-0.5">
                    <span style={{ color: S.text3 }}>Participants</span>
                    <span style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{d.participants}</span>
                  </div>
                  {d.findings > 0 && (
                    <div className="mt-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: S.warningBg, color: S.warningLight }}>
                      {d.findings} finding{d.findings > 1 ? 's' : ''} to address
                    </div>
                  )}
                </>
              )}
              {d.status === 'Scheduled' && (
                <button className="mt-2 w-full text-[9px] py-1 rounded" style={{ background: S.tealBg, color: S.tealLight }}>
                  View plan
                </button>
              )}
            </div>
          ))}
        </div>
      </SCard>
    </div>
  );
}
