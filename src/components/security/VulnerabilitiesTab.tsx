import { useState } from 'react';
import { Search, AlertTriangle, Zap } from 'lucide-react';
import { VULNERABILITIES, type Vulnerability } from '../../data/securityData';
import { S, SCard, SectionHeader, SeverityChip, VulnStatusChip, MonoValue, DaysCountdown, STH, STD, STR } from './SecurityPrimitives';

const SOURCES = ['All', 'SCA', 'SAST', 'DAST', 'Container', 'Infrastructure', 'Pentest', 'Bug bounty'];
const SLA_DAYS: Record<string, number> = { Critical: 7, High: 30, Medium: 90, Low: 180 };

export function VulnerabilitiesTab() {
  const [search, setSearch] = useState('');
  const [severityF, setSeverityF] = useState('All');
  const [sourceF, setSourceF] = useState('All');
  const [statusF, setStatusF] = useState('All');
  const [selected, setSelected] = useState<Vulnerability | null>(null);

  const breached = VULNERABILITIES.filter(v => v.slaBreached && v.status !== 'Fixed');

  const filtered = VULNERABILITIES.filter(v => {
    if (severityF !== 'All' && v.severity !== severityF) return false;
    if (sourceF !== 'All' && v.source !== sourceF) return false;
    if (statusF !== 'All' && v.status !== statusF) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.title.toLowerCase().includes(q) || (v.cve || '').toLowerCase().includes(q) || v.affectedService.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {breached.length > 0 && (
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: S.errorBg, border: `1px solid ${S.errorBorder}` }}>
          <AlertTriangle size={14} style={{ color: S.errorLight, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: S.errorLight }}>
              {breached.length} vulnerabilit{breached.length === 1 ? 'y' : 'ies'} exceeded SLA — immediate remediation required
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: S.text3 }}>
              {breached.map(v => v.id).join(' · ')} — review and either remediate or document accepted risk with approver
            </div>
          </div>
        </div>
      )}

      {/* SLA config */}
      <div className="grid grid-cols-4 gap-3">
        {(['Critical', 'High', 'Medium', 'Low'] as const).map(sev => {
          const open = VULNERABILITIES.filter(v => v.severity === sev && v.status !== 'Fixed' && v.status !== "Won't fix").length;
          const breachedCount = VULNERABILITIES.filter(v => v.severity === sev && v.slaBreached).length;
          const colors = { Critical: S.errorLight, High: S.orangeLight, Medium: S.warningLight, Low: S.blueLight };
          const bgs = { Critical: S.errorBg, High: S.orangeBg, Medium: S.warningBg, Low: S.blueBg };
          return (
            <SCard key={sev} className="p-3">
              <div className="text-[10px] mb-1" style={{ color: S.text3 }}>{sev} · SLA {SLA_DAYS[sev]}d</div>
              <div className="text-xl font-bold" style={{ color: colors[sev], fontFamily: 'DM Mono, monospace' }}>{open}</div>
              {breachedCount > 0 && (
                <div className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded inline-block" style={{ background: bgs[sev], color: colors[sev] }}>
                  {breachedCount} SLA breach{breachedCount > 1 ? 'es' : ''}
                </div>
              )}
            </SCard>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: S.bg2, border: `1px solid ${S.border}` }}>
          <Search size={10} style={{ color: S.text3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="CVE, title, service…"
            className="bg-transparent text-[10px] outline-none w-40" style={{ color: S.text1 }} />
        </div>
        <div className="flex gap-1">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => (
            <button key={s} onClick={() => setSeverityF(s)}
              className="text-[10px] px-2 py-0.5 rounded-lg"
              style={severityF === s ? { background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` } : { background: S.bg2, color: S.text3, border: `1px solid ${S.border}` }}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {SOURCES.map(s => (
            <button key={s} onClick={() => setSourceF(s)}
              className="text-[10px] px-2 py-0.5 rounded-lg"
              style={sourceF === s ? { background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` } : { background: S.bg2, color: S.text3, border: `1px solid ${S.border}` }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table + detail */}
      <SCard className="p-0 overflow-hidden">
        <div className="flex">
          <div className="flex-1 overflow-x-auto">
            <div className="p-4 pb-2" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="text-sm font-semibold" style={{ color: S.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Vulnerabilities ({filtered.length})
              </span>
            </div>
            <table className="w-full">
              <thead style={{ background: S.bg3 }}>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  <STH>ID / CVE</STH>
                  <STH>Title</STH>
                  <STH>Severity</STH>
                  <STH>Source</STH>
                  <STH>Service</STH>
                  <STH>Age</STH>
                  <STH>SLA</STH>
                  <STH>Status</STH>
                  <STH>Actions</STH>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <STR key={v.id} onClick={() => setSelected(selected?.id === v.id ? null : v)}
                    selected={selected?.id === v.id} highlight={v.slaBreached && v.status !== 'Fixed'}>
                    <STD>
                      <div>
                        <MonoValue value={v.id} />
                        {v.cve && <div><span className="text-[9px]" style={{ color: S.blueLight, fontFamily: 'DM Mono, monospace' }}>{v.cve}</span></div>}
                      </div>
                    </STD>
                    <STD>
                      <div className="max-w-xs flex items-center gap-1">
                        <span className="text-xs" style={{ color: S.text1 }}>{v.title}</span>
                        {v.exploitAvailable && <Zap size={10} style={{ color: S.errorLight, flexShrink: 0 }} title="Public exploit available" />}
                      </div>
                    </STD>
                    <STD>
                      <div>
                        <SeverityChip severity={v.severity} />
                        <div className="text-[9px] mt-0.5" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>CVSS {v.cvss}</div>
                      </div>
                    </STD>
                    <STD>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: S.bg1, color: S.text3, border: `1px solid ${S.border}` }}>
                        {v.source}
                      </span>
                    </STD>
                    <STD>
                      <span className="text-[10px]" style={{ color: S.text2 }}>{v.affectedService}</span>
                    </STD>
                    <STD mono>{v.agedays}d</STD>
                    <STD>
                      <DaysCountdown days={v.slaDaysRemaining} label="SLA days remaining" />
                    </STD>
                    <STD><VulnStatusChip status={v.status} /></STD>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.tealBg, color: S.tealLight }}>Assign</button>
                        <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.bg1, color: S.text3 }}>Accept risk</button>
                      </div>
                    </td>
                  </STR>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="w-72 flex-shrink-0 border-l p-4" style={{ borderColor: S.border, background: S.bg1 }}>
              <div className="flex items-center gap-2 mb-2">
                <SeverityChip severity={selected.severity} />
                <MonoValue value={selected.id} />
              </div>
              {selected.cve && <div className="mb-1"><span style={{ color: S.blueLight, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{selected.cve}</span></div>}
              <div className="text-xs font-semibold mb-3" style={{ color: S.text1 }}>{selected.title}</div>
              <div className="space-y-1.5 text-[10px]">
                {[
                  { label: 'CVSS score', value: selected.cvss.toString() },
                  { label: 'Source', value: selected.source },
                  { label: 'Service', value: selected.affectedService },
                  { label: 'First seen', value: selected.firstSeen },
                  { label: 'Age', value: `${selected.agedays} days` },
                  { label: 'Owner', value: selected.owner },
                  { label: 'SLA days', value: selected.slaDaysRemaining < 0 ? `${Math.abs(selected.slaDaysRemaining)}d breached` : `${selected.slaDaysRemaining}d remaining` },
                  { label: 'Exploit available', value: selected.exploitAvailable ? 'Yes' : 'No' },
                ].map(f => (
                  <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${S.border}` }}>
                    <span style={{ color: S.text3 }}>{f.label}</span>
                    <span style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1.5">
                <button className="w-full text-[10px] py-1.5 rounded-lg" style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>Assign to team</button>
                <button className="w-full text-[10px] py-1.5 rounded-lg" style={{ background: S.warningBg, color: S.warningLight, border: `1px solid ${S.warningBorder}` }}>Accept risk (requires reason)</button>
                <button className="w-full text-[10px] py-1.5 rounded-lg" style={{ background: S.bg2, color: S.text2, border: `1px solid ${S.border}` }}>Mark fixed</button>
              </div>
            </div>
          )}
        </div>
      </SCard>
    </div>
  );
}
