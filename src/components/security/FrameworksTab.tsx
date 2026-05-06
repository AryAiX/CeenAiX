import { useState } from 'react';
import { ChevronDown, ChevronRight, Download, Upload, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { FRAMEWORKS, type Framework } from '../../data/securityData';
import { S, SCard, SectionHeader, FrameworkStatusChip } from './SecurityPrimitives';

const RISK_REGISTER = [
  { id: 'RISK-001', title: 'PHI data breach via compromised credentials', likelihood: 'Medium', impact: 'Critical', residualRisk: 'High', owner: 'CISO', treatment: 'Mitigate', controls: ['MFA enforcement', 'SIEM alerting', 'DLP'] },
  { id: 'RISK-002', title: 'Ransomware attack on clinical systems', likelihood: 'Low', impact: 'Critical', residualRisk: 'Medium', owner: 'IT Security', treatment: 'Mitigate', controls: ['EDR', 'Backups', 'Network segmentation'] },
  { id: 'RISK-003', title: 'Third-party vendor data exposure', likelihood: 'Medium', impact: 'High', residualRisk: 'Medium', owner: 'Procurement', treatment: 'Transfer', controls: ['Vendor assessments', 'DPA agreements'] },
  { id: 'RISK-004', title: 'DDoS attack disrupting patient portal', likelihood: 'High', impact: 'Medium', residualRisk: 'Low', owner: 'DevOps', treatment: 'Mitigate', controls: ['WAF', 'CDN', 'Rate limiting'] },
  { id: 'RISK-005', title: 'Insider threat — unauthorized PHI access', likelihood: 'Low', impact: 'High', residualRisk: 'Low', owner: 'HR + Security', treatment: 'Mitigate', controls: ['RBAC', 'Audit logging', 'UEBA'] },
];

const riskColors: Record<string, { bg: string; text: string }> = {
  Critical: { bg: S.errorBg, text: S.errorLight },
  High: { bg: S.orangeBg, text: S.orangeLight },
  Medium: { bg: S.warningBg, text: S.warningLight },
  Low: { bg: S.successBg, text: S.successLight },
};

const likelihoodColors: Record<string, string> = {
  High: S.errorLight,
  Medium: S.warningLight,
  Low: S.successLight,
};

export function FrameworksTab() {
  const [expandedFramework, setExpandedFramework] = useState<string | null>(FRAMEWORKS[0]?.id || null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const selected = FRAMEWORKS.find(f => f.id === expandedFramework) || null;

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* Framework overview grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Frameworks tracked', value: FRAMEWORKS.length.toString(), color: S.tealLight },
          { label: 'Certified / Compliant', value: FRAMEWORKS.filter(f => f.status === 'Certified' || f.status === 'Compliant').length.toString(), color: S.successLight },
          { label: 'In assessment', value: FRAMEWORKS.filter(f => f.status === 'In Assessment').length.toString(), color: S.warningLight },
          { label: 'Avg control coverage', value: `${Math.round(FRAMEWORKS.reduce((s, f) => s + f.controlsCoverage, 0) / FRAMEWORKS.length)}%`, color: S.text1 },
        ].map(k => (
          <SCard key={k.label} className="p-4">
            <div className="text-[10px] mb-1" style={{ color: S.text3 }}>{k.label}</div>
            <div className="text-xl font-bold" style={{ color: k.color, fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
          </SCard>
        ))}
      </div>

      {/* Framework detail cards */}
      <SCard className="p-5">
        <SectionHeader title="Compliance Frameworks">
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
              <Download size={9} />Export evidence pack
            </button>
          </div>
        </SectionHeader>

        <div className="flex gap-4">
          {/* Framework list */}
          <div className="w-52 flex-shrink-0 space-y-1.5">
            {FRAMEWORKS.map(f => (
              <button key={f.id}
                onClick={() => setExpandedFramework(expandedFramework === f.id ? null : f.id)}
                className="w-full text-left p-3 rounded-xl transition-all"
                style={{
                  background: expandedFramework === f.id ? S.tealBg : S.bg1,
                  border: `1px solid ${expandedFramework === f.id ? S.tealBorder : S.border}`,
                }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: expandedFramework === f.id ? S.tealLight : S.text1 }}>{f.name}</span>
                  {expandedFramework === f.id ? <ChevronDown size={10} style={{ color: S.tealLight }} /> : <ChevronRight size={10} style={{ color: S.text3 }} />}
                </div>
                <FrameworkStatusChip status={f.status} />
                <div className="mt-1.5">
                  <div className="text-[9px] mb-0.5" style={{ color: S.text3 }}>Coverage</div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S.bg3 }}>
                    <div className="h-full rounded-full" style={{ width: `${f.controlsCoverage}%`, background: S.tealLight }} />
                  </div>
                  <div className="text-[9px] mt-0.5 text-right" style={{ color: S.tealLight, fontFamily: 'DM Mono, monospace' }}>{f.controlsCoverage}%</div>
                </div>
              </button>
            ))}
          </div>

          {/* Framework detail */}
          {selected && (
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold" style={{ color: S.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{selected.name}</h3>
                    <FrameworkStatusChip status={selected.status} />
                  </div>
                  <div className="text-[10px]" style={{ color: S.text3 }}>
                    {selected.certBody && <span>{selected.certBody} · </span>}
                    {selected.nextAudit && <span>Next audit: {selected.nextAudit}</span>}
                    {selected.lastAudit && <span> · Last audit: {selected.lastAudit}</span>}
                  </div>
                </div>
                <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
                  style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
                  <Upload size={9} />Upload evidence
                </button>
              </div>

              {/* Control domains */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {selected.controlDomains.map(d => {
                  const pct = Math.round((d.passed / d.total) * 100);
                  return (
                    <div key={d.domain} className="p-3 rounded-xl" style={{ background: S.bg1, border: `1px solid ${S.border}` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold" style={{ color: S.text1 }}>{d.domain}</span>
                        <span className="text-[10px]" style={{ color: S.text2, fontFamily: 'DM Mono, monospace' }}>{d.passed}/{d.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S.bg3 }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? S.successLight : pct >= 80 ? S.tealLight : S.warningLight }} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex gap-2 text-[9px]">
                          {d.failed > 0 && <span style={{ color: S.errorLight }}>{d.failed} failed</span>}
                          {d.exceptions > 0 && <span style={{ color: S.warningLight }}>{d.exceptions} exception{d.exceptions > 1 ? 's' : ''}</span>}
                        </div>
                        <span className="text-[9px]" style={{ color: pct === 100 ? S.successLight : S.text3, fontFamily: 'DM Mono, monospace' }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Evidence summary */}
              <div className="p-3 rounded-xl" style={{ background: S.bg1, border: `1px solid ${S.border}` }}>
                <div className="text-[10px] font-semibold mb-2" style={{ color: S.text2 }}>Evidence Collection</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Collected', value: selected.evidence.collected, icon: CheckCircle, color: S.successLight },
                    { label: 'Pending', value: selected.evidence.pending, icon: Clock, color: S.warningLight },
                    { label: 'Exceptions', value: selected.evidence.exceptions, icon: AlertTriangle, color: S.errorLight },
                  ].map(e => (
                    <div key={e.label} className="flex items-center gap-2">
                      <e.icon size={12} style={{ color: e.color }} />
                      <div>
                        <div className="text-sm font-bold" style={{ color: e.color, fontFamily: 'DM Mono, monospace' }}>{e.value}</div>
                        <div className="text-[9px]" style={{ color: S.text3 }}>{e.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </SCard>

      {/* Risk register */}
      <SCard className="p-5">
        <SectionHeader title="Risk Register">
          <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
            style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
            Add risk
          </button>
        </SectionHeader>
        <div className="space-y-2">
          {RISK_REGISTER.map(r => (
            <div key={r.id}>
              <button
                className="w-full text-left p-3 rounded-xl transition-all"
                onClick={() => setExpandedRisk(expandedRisk === r.id ? null : r.id)}
                style={{ background: S.bg1, border: `1px solid ${S.border}` }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = S.bg1)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-[9px] font-mono flex-shrink-0" style={{ color: S.text3 }}>{r.id}</span>
                    <span className="text-xs font-semibold truncate" style={{ color: S.text1 }}>{r.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: riskColors[r.residualRisk]?.bg, color: riskColors[r.residualRisk]?.text }}>
                      {r.residualRisk}
                    </span>
                    <span className="text-[9px]" style={{ color: S.text3 }}>{r.owner}</span>
                    {expandedRisk === r.id ? <ChevronDown size={10} style={{ color: S.text3 }} /> : <ChevronRight size={10} style={{ color: S.text3 }} />}
                  </div>
                </div>
              </button>
              {expandedRisk === r.id && (
                <div className="mx-2 mb-2 p-3 rounded-b-xl" style={{ background: S.bg3, border: `1px solid ${S.border}`, borderTop: 'none' }}>
                  <div className="grid grid-cols-4 gap-3 text-[10px] mb-3">
                    {[
                      { label: 'Likelihood', value: r.likelihood, color: likelihoodColors[r.likelihood] },
                      { label: 'Impact', value: r.impact, color: riskColors[r.impact]?.text },
                      { label: 'Residual', value: r.residualRisk, color: riskColors[r.residualRisk]?.text },
                      { label: 'Treatment', value: r.treatment, color: S.text2 },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ color: S.text3 }}>{f.label}</div>
                        <div className="font-semibold mt-0.5" style={{ color: f.color, fontFamily: 'DM Mono, monospace' }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[9px] mb-1" style={{ color: S.text3 }}>Controls</div>
                    <div className="flex flex-wrap gap-1">
                      {r.controls.map(c => (
                        <span key={c} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: S.tealBg, color: S.tealLight }}>{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SCard>
    </div>
  );
}
