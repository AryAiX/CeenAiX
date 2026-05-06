import { useState } from 'react';
import { ChevronRight, Shield, Activity, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { SECURITY_POSTURE, TOP_RISKS, LIVE_EVENTS, AUTH_TREND, type ThreatSeverity } from '../../data/securityData';
import { S, SCard, SectionHeader, SeverityChip, SeverityDot, Sparkline } from './SecurityPrimitives';

const RADAR_LABELS = ['Identity', 'Threats', 'Data', 'Network', 'Endpoint', 'Compliance'];

function RadarChart({ dimensions, targets }: { dimensions: Record<string, number>; targets: Record<string, number> }) {
  const cx = 100, cy = 100, r = 80;
  const keys = ['identity', 'threats', 'data', 'network', 'endpoint', 'compliance'];
  const n = keys.length;

  const toXY = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rad = (val / 100) * r;
    return { x: cx + Math.cos(angle) * rad, y: cy + Math.sin(angle) * rad };
  };

  const current = keys.map((k, i) => toXY(i, (dimensions as any)[k]));
  const target = keys.map((k, i) => toXY(i, (targets as any)[k]));
  const grid = [20, 40, 60, 80, 100];

  const polyPoints = (pts: { x: number; y: number }[]) => pts.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48">
      {/* Grid */}
      {grid.map(g => {
        const pts = keys.map((_, i) => toXY(i, g));
        return <polygon key={g} points={polyPoints(pts)} fill="none" stroke={S.border} strokeWidth={0.8} />;
      })}
      {/* Axes */}
      {keys.map((_, i) => {
        const outer = toXY(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke={S.border} strokeWidth={0.8} />;
      })}
      {/* Target area */}
      <polygon points={polyPoints(target)} fill={`${S.tealLight}10`} stroke={S.tealLight} strokeWidth={1} strokeDasharray="3,2" />
      {/* Current area */}
      <polygon points={polyPoints(current)} fill={`${S.teal}30`} stroke={S.tealLight} strokeWidth={1.5} />
      {/* Current dots */}
      {current.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={S.tealLight} />)}
      {/* Labels */}
      {keys.map((k, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 16);
        const ly = cy + Math.sin(angle) * (r + 16);
        return (
          <text key={k} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fill={S.text3} fontFamily="DM Mono, monospace">
            {RADAR_LABELS[i]}
          </text>
        );
      })}
    </svg>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Credential: S.errorLight,
  Data: '#FB923C',
  Identity: '#38BDF8',
  Vulnerability: S.warningLight,
  Certificate: '#A78BFA',
  Threat: '#F87171',
  Framework: S.blueLight,
};

export function OverviewTab({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  return (
    <div className="flex gap-4 p-5 overflow-auto">
      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Security posture summary */}
        <SCard className="p-5">
          <SectionHeader title="Security Posture">
            <button onClick={() => onSwitchTab('Frameworks')}
              className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
              View frameworks <ExternalLink size={9} />
            </button>
          </SectionHeader>
          <div className="flex items-start gap-6">
            <RadarChart dimensions={SECURITY_POSTURE.dimensions} targets={SECURITY_POSTURE.targets} />
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {Object.entries(SECURITY_POSTURE.dimensions).map(([key, val]) => {
                  const target = (SECURITY_POSTURE.targets as any)[key];
                  const gap = val - target;
                  const color = val >= target ? S.successLight : val >= target - 10 ? S.warningLight : S.errorLight;
                  return (
                    <div key={key} className="p-2.5 rounded-xl" style={{ background: S.bg1 }}>
                      <div className="text-[10px] capitalize mb-1" style={{ color: S.text3 }}>{key}</div>
                      <div className="text-base font-bold" style={{ color, fontFamily: 'DM Mono, monospace' }}>{val}</div>
                      <div className="text-[9px]" style={{ color: gap < 0 ? S.errorLight : S.successLight }}>
                        {gap >= 0 ? `+${gap}` : gap} vs target
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] mb-2" style={{ color: S.text3 }}>Score trend (7 days)</div>
              <div className="flex items-end gap-1">
                {SECURITY_POSTURE.sparkline.map((v, i) => (
                  <div key={i} className="flex-1 rounded-sm"
                    style={{ height: `${(v / 100) * 40}px`, background: i === SECURITY_POSTURE.sparkline.length - 1 ? S.tealLight : S.tealBg, minHeight: 4 }} />
                ))}
              </div>
            </div>
          </div>
        </SCard>

        {/* Top open risks */}
        <SCard className="p-5">
          <SectionHeader title="Top Open Risks">
            <button onClick={() => onSwitchTab('Threats')} className="text-[10px] flex items-center gap-1" style={{ color: S.tealLight }}>
              View all threats <ChevronRight size={10} />
            </button>
          </SectionHeader>
          <div className="space-y-1.5">
            {TOP_RISKS.map(risk => (
              <div key={risk.id} className="flex items-start gap-3 p-2.5 rounded-xl transition-colors"
                style={{ background: S.bg1, border: `1px solid ${S.border}` }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = S.bg1)}>
                <SeverityDot severity={risk.severity as ThreatSeverity} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: S.text1 }}>{risk.headline}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px]" style={{ color: S.text3 }}>{risk.scope}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: `${CATEGORY_COLORS[risk.category]}18`, color: CATEGORY_COLORS[risk.category] }}>
                      {risk.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[9px]" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>{risk.age}</span>
                  <span className="text-[9px]" style={{ color: S.text3 }}>{risk.owner}</span>
                  <button className="text-[9px] px-2 py-0.5 rounded-lg"
                    style={{ background: S.tealBg, color: S.tealLight }}>
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SCard>

        {/* Auth chart */}
        <SCard className="p-5">
          <SectionHeader title="Authentication Outcomes (Last 12h)" />
          <div className="flex items-end gap-0.5 h-28">
            {AUTH_TREND.map(h => {
              const total = h.success + h.failed + h.blocked + h.mfaChallenged;
              if (total === 0) return <div key={h.hour} className="flex-1" />;
              const maxVal = Math.max(...AUTH_TREND.map(x => x.success + x.failed + x.blocked + x.mfaChallenged));
              const heightPct = (total / maxVal) * 100;
              return (
                <div key={h.hour} className="flex-1 flex flex-col rounded-sm overflow-hidden" title={`${h.hour}:00 · ${total} total`}
                  style={{ height: `${Math.max(heightPct, 4)}%` }}>
                  <div style={{ flex: h.success, background: S.success, opacity: 0.7 }} />
                  <div style={{ flex: h.mfaChallenged, background: S.teal, opacity: 0.7 }} />
                  <div style={{ flex: h.failed, background: S.warning, opacity: 0.7 }} />
                  <div style={{ flex: h.blocked, background: S.error, opacity: 0.7 }} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2">
            {[['Success', S.success], ['MFA challenged', S.teal], ['Failed', S.warning], ['Blocked', S.error]].map(([l, c]) => (
              <div key={l as string} className="flex items-center gap-1 text-[9px]" style={{ color: S.text3 }}>
                <span className="w-2 h-2 rounded-sm" style={{ background: c as string }} />{l}
              </div>
            ))}
          </div>
        </SCard>

        {/* Quick links */}
        <SCard className="p-5">
          <SectionHeader title="Quick Actions" />
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Review access requests', tab: 'Identity' },
              { label: 'Disable a user', tab: 'Identity' },
              { label: 'Rotate a secret', tab: 'Keys' },
              { label: 'Quarantine integration', tab: 'Network' },
              { label: 'Open break-glass', tab: 'Identity' },
              { label: 'Run incident drill', tab: 'Incidents' },
            ].map(a => (
              <button key={a.label} onClick={() => onSwitchTab(a.tab)}
                className="flex items-center gap-2 p-3 rounded-xl text-xs transition-all text-left"
                style={{ background: S.bg1, color: S.text2, border: `1px solid ${S.border}` }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = S.tealBorder)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = S.border)}>
                <Shield size={11} style={{ color: S.tealLight, flexShrink: 0 }} />
                {a.label}
              </button>
            ))}
          </div>
        </SCard>
      </div>

      {/* Live activity rail */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <SCard className="p-4 flex-1">
          <SectionHeader title="Live Security Events">
            <button className="text-[10px] flex items-center gap-1" style={{ color: S.tealLight }}>
              View all <ExternalLink size={9} />
            </button>
          </SectionHeader>
          <div className="space-y-2">
            {LIVE_EVENTS.map(ev => (
              <div key={ev.id} className="flex items-start gap-2 py-2" style={{ borderBottom: `1px solid ${S.border}` }}>
                <SeverityDot severity={ev.severity as ThreatSeverity} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px]" style={{ color: S.text1 }}>{ev.headline}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>{ev.time}</div>
                </div>
              </div>
            ))}
          </div>
        </SCard>

        {/* Posture breakdown card */}
        <SCard className="p-4">
          <SectionHeader title="Dimension Scores" />
          <div className="space-y-2">
            {Object.entries(SECURITY_POSTURE.dimensions).map(([key, val]) => {
              const target = (SECURITY_POSTURE.targets as any)[key];
              const color = val >= target ? S.successLight : val >= target - 10 ? S.warningLight : S.errorLight;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="capitalize" style={{ color: S.text2 }}>{key}</span>
                    <span style={{ color, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{val} / {target}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S.bg1 }}>
                    <div className="h-full rounded-full" style={{ width: `${val}%`, background: val >= target ? S.success : S.warning }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SCard>
      </div>
    </div>
  );
}
