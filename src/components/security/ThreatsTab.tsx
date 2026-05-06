import { useState } from 'react';
import { Search, Shield, AlertTriangle, Flag, Eye } from 'lucide-react';
import { THREAT_DETECTIONS, type ThreatDetection, type ThreatSeverity } from '../../data/securityData';
import { S, SCard, SectionHeader, SeverityChip, SeverityDot, MonoValue, STH, STD, STR } from './SecurityPrimitives';

const CATEGORIES = ['All', 'Authentication anomaly', 'Credential abuse', 'Data exfiltration', 'Brute force', 'Geo anomaly', 'Credential stuffing', 'Suspicious automation', 'Known-bad indicator'];
const STATUSES = ['All', 'New', 'Investigating', 'Mitigated', 'Resolved', 'False positive'];

const MITRE_NAMES: Record<string, string> = {
  'T1552.001': 'Credentials In Files',
  'T1020': 'Automated Exfiltration',
  'T1556.006': 'Multi-Factor Auth Bypass',
  'T1110.001': 'Password Guessing',
  'T1078': 'Valid Accounts',
  'T1110.004': 'Credential Stuffing',
  'T1071.004': 'DNS Application Layer Protocol',
};

export function ThreatsTab() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<string>('All');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState<ThreatDetection | null>(null);

  const filtered = THREAT_DETECTIONS.filter(d => {
    if (severity !== 'All' && d.severity !== severity) return false;
    if (category !== 'All' && d.category !== category) return false;
    if (status !== 'All' && d.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.summary.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || (d.affectedUser || '').toLowerCase().includes(q);
    }
    return true;
  });

  const statusColor = (s: string) => {
    const m: Record<string, string> = { New: S.errorLight, Investigating: S.orangeLight, Mitigated: S.tealLight, Resolved: S.successLight, 'False positive': S.text3, Suppressed: S.text3 };
    return m[s] || S.text3;
  };

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* Active critical/high */}
      {THREAT_DETECTIONS.filter(d => d.status === 'New' && (d.severity === 'Critical' || d.severity === 'High')).length > 0 && (
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: S.errorBg, border: `1px solid ${S.errorBorder}` }}>
          <AlertTriangle size={14} style={{ color: S.errorLight, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: S.errorLight }}>
              {THREAT_DETECTIONS.filter(d => d.status === 'New' && (d.severity === 'Critical' || d.severity === 'High')).length} new Critical/High detections require immediate attention
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: S.text3 }}>DET-001: Leaked API key · DET-002: Bulk PHI export · DET-003: MFA bypass</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: S.bg2, border: `1px solid ${S.border}` }}>
          <Search size={10} style={{ color: S.text3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Detection ID, summary, user…"
            className="bg-transparent text-[10px] outline-none w-44" style={{ color: S.text1 }} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => (
            <button key={s} onClick={() => setSeverity(s)}
              className="text-[10px] px-2 py-0.5 rounded-lg"
              style={severity === s ? { background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` } : { background: S.bg2, color: S.text3, border: `1px solid ${S.border}` }}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className="text-[10px] px-2 py-0.5 rounded-lg"
              style={status === s ? { background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` } : { background: S.bg2, color: S.text3, border: `1px solid ${S.border}` }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Detections table + detail panel */}
      <SCard className="p-0 overflow-hidden">
        <div className="flex">
          <div className="flex-1 overflow-x-auto">
            <div className="p-4 pb-2" style={{ borderBottom: `1px solid ${S.border}` }}>
              <span className="text-sm font-semibold" style={{ color: S.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Detections ({filtered.length})
              </span>
            </div>
            <table className="w-full">
              <thead style={{ background: S.bg3 }}>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  <STH>Time</STH>
                  <STH>Severity</STH>
                  <STH>Category</STH>
                  <STH>Summary</STH>
                  <STH>Affected</STH>
                  <STH>MITRE</STH>
                  <STH>Status</STH>
                  <STH>Actions</STH>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <STR key={d.id}
                    onClick={() => setSelected(selected?.id === d.id ? null : d)}
                    selected={selected?.id === d.id}
                    highlight={d.status === 'New' && (d.severity === 'Critical' || d.severity === 'High')}>
                    <STD mono>
                      {new Date(d.timestamp).toLocaleTimeString('en-AE', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' })}
                    </STD>
                    <STD><SeverityChip severity={d.severity} /></STD>
                    <STD>
                      <span className="text-[10px]" style={{ color: S.text3 }}>{d.category}</span>
                    </STD>
                    <STD>
                      <div className="max-w-xs">
                        <span className="text-xs" style={{ color: S.text1 }}>{d.summary.slice(0, 80)}{d.summary.length > 80 ? '…' : ''}</span>
                        {d.autoMitigated && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded" style={{ background: S.tealBg, color: S.tealLight }}>Auto-mitigated</span>}
                      </div>
                    </STD>
                    <STD>
                      <span className="text-[10px]" style={{ color: S.text3 }}>
                        {d.affectedUser || d.affectedService || (d.sourceIp ? `IP: ${d.sourceIp}` : '—')}
                      </span>
                    </STD>
                    <STD>
                      {d.mitre ? (
                        <span className="text-[10px] font-mono" style={{ color: S.blueLight }}>{d.mitre}</span>
                      ) : <span style={{ color: S.text3 }}>—</span>}
                    </STD>
                    <STD>
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: `${statusColor(d.status)}18`, color: statusColor(d.status) }}>
                        {d.status}
                      </span>
                    </STD>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        <button className="text-[9px] px-2 py-0.5 rounded" style={{ background: S.tealBg, color: S.tealLight }}>
                          <Eye size={8} className="inline mr-1" />Investigate
                        </button>
                      </div>
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
                  <SeverityChip severity={selected.severity} />
                  <MonoValue value={selected.id} />
                </div>
                <div className="text-xs font-semibold mt-1" style={{ color: S.text1 }}>{selected.category}</div>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-[11px]" style={{ color: S.text2 }}>{selected.summary}</div>
                <div className="space-y-1.5 text-[10px]">
                  {[
                    { label: 'Status', value: selected.status },
                    ...(selected.affectedUser ? [{ label: 'Affected user', value: selected.affectedUser }] : []),
                    ...(selected.affectedService ? [{ label: 'Affected service', value: selected.affectedService }] : []),
                    ...(selected.sourceIp ? [{ label: 'Source IP', value: selected.sourceIp }] : []),
                    ...(selected.country ? [{ label: 'Country', value: selected.country }] : []),
                    ...(selected.mitre ? [{ label: 'MITRE ATT&CK', value: `${selected.mitre}: ${MITRE_NAMES[selected.mitre] || ''}` }] : []),
                  ].map(f => (
                    <div key={f.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${S.border}` }}>
                      <span style={{ color: S.text3 }}>{f.label}</span>
                      <span style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold" style={{ color: S.text2 }}>Response actions</div>
                  {[
                    { label: 'Investigate', color: S.tealBg, textColor: S.tealLight },
                    { label: 'Block source IP', color: S.errorBg, textColor: S.errorLight },
                    { label: 'Revoke session', color: S.warningBg, textColor: S.warningLight },
                    { label: 'Escalate to incident', color: S.orangeBg, textColor: S.orangeLight },
                    { label: 'Mark false positive', color: S.bg2, textColor: S.text3 },
                  ].map(a => (
                    <button key={a.label} className="w-full text-[10px] py-1.5 rounded-lg text-left px-2.5"
                      style={{ background: a.color, color: a.textColor }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </SCard>
    </div>
  );
}
