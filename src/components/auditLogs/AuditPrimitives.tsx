import React from 'react';
import { AuditSeverity, AuditCategory, AuditOutcome } from '../../data/auditLogsData';

export const A = {
  bg1: '#0F172A',
  bg2: '#1E293B',
  bg3: '#0A1628',
  border: 'rgba(30,41,59,0.9)',
  teal: '#0D9488',
  tealLight: '#2DD4BF',
  tealBg: 'rgba(13,148,136,0.12)',
  tealBorder: 'rgba(13,148,136,0.3)',
  cyan: '#0891B2',
  cyanLight: '#67E8F9',
  text1: '#F1F5F9',
  text2: '#94A3B8',
  text3: '#475569',
  success: '#059669',
  successLight: '#34D399',
  successBg: 'rgba(5,150,105,0.12)',
  warning: '#D97706',
  warningLight: '#FCD34D',
  warningBg: 'rgba(217,119,6,0.12)',
  error: '#DC2626',
  errorLight: '#FCA5A5',
  errorBg: 'rgba(220,38,38,0.12)',
  blue: '#2563EB',
  blueLight: '#93C5FD',
  blueBg: 'rgba(37,99,235,0.12)',
  orange: '#EA580C',
  orangeLight: '#FB923C',
  orangeBg: 'rgba(234,88,12,0.12)',
};

const SEVERITY_MAP: Record<AuditSeverity, { dot: string; color: string; bg: string }> = {
  Info: { dot: A.tealLight, color: A.tealLight, bg: A.tealBg },
  Notice: { dot: A.blueLight, color: A.blueLight, bg: A.blueBg },
  Warning: { dot: A.warningLight, color: A.warningLight, bg: A.warningBg },
  Error: { dot: A.orangeLight, color: A.orangeLight, bg: A.orangeBg },
  Critical: { dot: '#F87171', color: '#FCA5A5', bg: 'rgba(220,38,38,0.15)' },
};

const OUTCOME_MAP: Record<AuditOutcome, { color: string; bg: string }> = {
  Success: { color: A.successLight, bg: A.successBg },
  Failure: { color: A.errorLight, bg: A.errorBg },
  Blocked: { color: A.warningLight, bg: A.warningBg },
  Anomaly: { color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
};

const CATEGORY_COLORS: Record<AuditCategory | string, string> = {
  Authentication: '#38BDF8',
  Authorization: '#818CF8',
  'Data Access': A.tealLight,
  'Data Modification': '#FB923C',
  Configuration: A.warningLight,
  Integration: A.cyanLight,
  Security: '#F87171',
  Compliance: '#C084FC',
  Billing: '#4ADE80',
  Impersonation: '#FF6B6B',
  System: A.text3,
  AI: '#A78BFA',
  Communication: '#34D399',
};

export function SeverityDot({ severity }: { severity: AuditSeverity }) {
  const s = SEVERITY_MAP[severity];
  return (
    <span className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: s.dot, boxShadow: severity === 'Critical' ? `0 0 4px ${s.dot}` : undefined }} />
  );
}

export function SeverityChip({ severity }: { severity: AuditSeverity }) {
  const s = SEVERITY_MAP[severity];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {severity}
    </span>
  );
}

export function CategoryChip({ category }: { category: AuditCategory | string }) {
  const color = CATEGORY_COLORS[category] || A.text3;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}>
      {category}
    </span>
  );
}

export function OutcomeChip({ outcome }: { outcome: AuditOutcome }) {
  const s = OUTCOME_MAP[outcome];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {outcome}
    </span>
  );
}

export function AnomalyBadge({ score, reason }: { score: number; reason: string }) {
  const color = score >= 90 ? '#F87171' : score >= 70 ? '#FB923C' : A.warningLight;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold cursor-help"
      title={reason}
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      ⚡ {score}
    </span>
  );
}

export function PhiBadge() {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
      style={{ background: 'rgba(249,115,22,0.15)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.25)' }}>
      PHI
    </span>
  );
}

export function AiBadge({ model }: { model: string }) {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded"
      style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}
      title={model}>
      AI
    </span>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ background: A.bg2, border: `1px solid ${A.border}`, borderRadius: 12 }}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm font-semibold" style={{ color: A.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function Sparkline({ data, color = A.teal }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 56, h = 24;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
    </svg>
  );
}

export function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ color: A.text3, fontFamily: 'DM Mono, monospace' }}>
      {children}
    </th>
  );
}

interface TDProps { children: React.ReactNode; mono?: boolean; muted?: boolean; }
export function TD({ children, mono, muted }: TDProps) {
  return (
    <td className="py-2 pr-3 text-xs"
      style={{ color: muted ? A.text3 : A.text2, fontFamily: mono ? 'DM Mono, monospace' : undefined }}>
      {children}
    </td>
  );
}

interface TRProps { children: React.ReactNode; onClick?: () => void; highlight?: boolean; selected?: boolean; }
export function TR({ children, onClick, highlight, selected }: TRProps) {
  return (
    <tr onClick={onClick}
      className="transition-colors group"
      style={{
        borderBottom: `1px solid ${A.border}`,
        background: selected ? 'rgba(13,148,136,0.1)' : highlight ? 'rgba(220,38,38,0.04)' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'rgba(13,148,136,0.06)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = highlight ? 'rgba(220,38,38,0.04)' : 'transparent'; }}>
      {children}
    </tr>
  );
}

export function CopyableId({ value }: { value: string }) {
  const copy = () => navigator.clipboard?.writeText(value);
  return (
    <span onClick={e => { e.stopPropagation(); copy(); }}
      className="cursor-pointer hover:opacity-70 transition-opacity"
      title="Click to copy"
      style={{ color: A.tealLight, fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
      {value}
    </span>
  );
}
