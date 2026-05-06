import React from 'react';
import type { ThreatSeverity, SecurityPosture, VulnStatus, SecretStatus, CertStatus, FrameworkStatus, UserRiskScore, IncidentSeverity, IncidentStatus } from '../../data/securityData';

// ─── Design tokens ────────────────────────────────────────────────────────────
export const S = {
  bg1: '#0F172A',
  bg2: '#1E293B',
  bg3: '#0A1628',
  border: 'rgba(30,41,59,0.9)',
  teal: '#0D9488',
  tealLight: '#2DD4BF',
  tealBg: 'rgba(13,148,136,0.12)',
  tealBorder: 'rgba(13,148,136,0.3)',
  text1: '#F1F5F9',
  text2: '#94A3B8',
  text3: '#475569',
  success: '#059669',
  successLight: '#34D399',
  successBg: 'rgba(5,150,105,0.12)',
  successBorder: 'rgba(5,150,105,0.3)',
  warning: '#D97706',
  warningLight: '#FCD34D',
  warningBg: 'rgba(217,119,6,0.12)',
  warningBorder: 'rgba(217,119,6,0.3)',
  error: '#DC2626',
  errorLight: '#FCA5A5',
  errorBg: 'rgba(220,38,38,0.12)',
  errorBorder: 'rgba(220,38,38,0.3)',
  blue: '#2563EB',
  blueLight: '#93C5FD',
  blueBg: 'rgba(37,99,235,0.12)',
  blueBorder: 'rgba(37,99,235,0.3)',
  orange: '#F97316',
  orangeLight: '#FB923C',
  orangeBg: 'rgba(249,115,22,0.12)',
};

// ─── Severity maps ─────────────────────────────────────────────────────────────
export const SEVERITY_MAP: Record<ThreatSeverity, { color: string; bg: string; border: string }> = {
  Critical: { color: S.errorLight, bg: S.errorBg, border: S.errorBorder },
  High: { color: S.orangeLight, bg: S.orangeBg, border: 'rgba(249,115,22,0.3)' },
  Medium: { color: S.warningLight, bg: S.warningBg, border: S.warningBorder },
  Low: { color: S.blueLight, bg: S.blueBg, border: S.blueBorder },
  Info: { color: S.text2, bg: '#1E293B', border: S.border },
};

export const POSTURE_MAP: Record<SecurityPosture, { color: string; bg: string; border: string }> = {
  Strong: { color: S.successLight, bg: S.successBg, border: S.successBorder },
  Good: { color: S.tealLight, bg: S.tealBg, border: S.tealBorder },
  'Needs attention': { color: S.warningLight, bg: S.warningBg, border: S.warningBorder },
  'At risk': { color: S.errorLight, bg: S.errorBg, border: S.errorBorder },
};

export const INCIDENT_SEV_MAP: Record<IncidentSeverity, { color: string; bg: string }> = {
  SEV1: { color: S.errorLight, bg: S.errorBg },
  SEV2: { color: S.orangeLight, bg: S.orangeBg },
  SEV3: { color: S.warningLight, bg: S.warningBg },
  SEV4: { color: S.blueLight, bg: S.blueBg },
};

export const INCIDENT_STATUS_MAP: Record<IncidentStatus, { color: string; bg: string }> = {
  Triage: { color: S.errorLight, bg: S.errorBg },
  Investigation: { color: S.orangeLight, bg: S.orangeBg },
  Containment: { color: S.warningLight, bg: S.warningBg },
  Eradication: { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  Recovery: { color: S.tealLight, bg: S.tealBg },
  Closed: { color: S.successLight, bg: S.successBg },
};

export const RISK_SCORE_MAP: Record<UserRiskScore, { color: string; bg: string }> = {
  low: { color: S.successLight, bg: S.successBg },
  medium: { color: S.warningLight, bg: S.warningBg },
  high: { color: S.orangeLight, bg: S.orangeBg },
  critical: { color: S.errorLight, bg: S.errorBg },
};

export const CERT_STATUS_MAP: Record<CertStatus, { color: string; bg: string }> = {
  Valid: { color: S.successLight, bg: S.successBg },
  Expiring: { color: S.warningLight, bg: S.warningBg },
  Expired: { color: S.errorLight, bg: S.errorBg },
  Revoked: { color: S.text3, bg: S.bg2 },
};

export const SECRET_STATUS_MAP: Record<SecretStatus, { color: string; bg: string }> = {
  Active: { color: S.successLight, bg: S.successBg },
  Expiring: { color: S.warningLight, bg: S.warningBg },
  Expired: { color: S.errorLight, bg: S.errorBg },
  Leaked: { color: S.errorLight, bg: 'rgba(220,38,38,0.2)' },
  Rotated: { color: S.tealLight, bg: S.tealBg },
};

export const FRAMEWORK_STATUS_MAP: Record<FrameworkStatus, { color: string; bg: string }> = {
  Active: { color: S.successLight, bg: S.successBg },
  'In progress': { color: S.warningLight, bg: S.warningBg },
  Lapsed: { color: S.errorLight, bg: S.errorBg },
  'Not applicable': { color: S.text3, bg: S.bg2 },
};

export const VULN_STATUS_MAP: Record<VulnStatus, { color: string; bg: string }> = {
  Open: { color: S.errorLight, bg: S.errorBg },
  Triaged: { color: S.warningLight, bg: S.warningBg },
  'Fix in progress': { color: S.blueLight, bg: S.blueBg },
  Fixed: { color: S.successLight, bg: S.successBg },
  'Accepted risk': { color: S.text2, bg: S.bg2 },
  "Won't fix": { color: S.text3, bg: S.bg2 },
};

// ─── Primitive components ─────────────────────────────────────────────────────
export function SeverityChip({ severity, compact }: { severity: ThreatSeverity; compact?: boolean }) {
  const s = SEVERITY_MAP[severity];
  return (
    <span className={`font-semibold whitespace-nowrap rounded-full ${compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {severity}
    </span>
  );
}

export function PostureChip({ posture }: { posture: SecurityPosture }) {
  const s = POSTURE_MAP[posture];
  return (
    <span className="text-sm font-bold px-4 py-1.5 rounded-full"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {posture}
    </span>
  );
}

export function IncidentSevChip({ severity }: { severity: IncidentSeverity }) {
  const s = INCIDENT_SEV_MAP[severity];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ background: s.bg, color: s.color }}>
      {severity}
    </span>
  );
}

export function IncidentStatusChip({ status }: { status: IncidentStatus }) {
  const s = INCIDENT_STATUS_MAP[status];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export function RiskChip({ score }: { score: UserRiskScore }) {
  const s = RISK_SCORE_MAP[score];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize"
      style={{ background: s.bg, color: s.color }}>
      {score}
    </span>
  );
}

export function CertStatusChip({ status }: { status: CertStatus }) {
  const s = CERT_STATUS_MAP[status];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export function SecretStatusChip({ status }: { status: SecretStatus }) {
  const s = SECRET_STATUS_MAP[status];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export function FrameworkStatusChip({ status }: { status: FrameworkStatus }) {
  const s = FRAMEWORK_STATUS_MAP[status];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export function VulnStatusChip({ status }: { status: VulnStatus }) {
  const s = VULN_STATUS_MAP[status];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export function SCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ background: S.bg2, border: `1px solid ${S.border}`, borderRadius: 12 }}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm font-semibold" style={{ color: S.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function MonoValue({ value, label }: { value: string; label?: string }) {
  const copy = () => navigator.clipboard?.writeText(value);
  return (
    <span onClick={copy} title={label || 'Click to copy'}
      className="cursor-pointer hover:opacity-70 transition-opacity"
      style={{ color: S.tealLight, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
      {value}
    </span>
  );
}

export function SStatusDot({ ok, pulse }: { ok: boolean; pulse?: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
      style={{ background: ok ? S.successLight : S.errorLight }} />
  );
}

export function STH({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>
      {children}
    </th>
  );
}

export function STD({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className="py-2 pr-3 text-xs" style={{ color: S.text2, fontFamily: mono ? 'DM Mono, monospace' : undefined }}>
      {children}
    </td>
  );
}

interface STRProps { children: React.ReactNode; onClick?: () => void; highlight?: boolean; selected?: boolean; }
export function STR({ children, onClick, highlight, selected }: STRProps) {
  return (
    <tr onClick={onClick}
      className="transition-colors"
      style={{
        borderBottom: `1px solid ${S.border}`,
        background: selected ? 'rgba(13,148,136,0.1)' : highlight ? 'rgba(220,38,38,0.04)' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'rgba(13,148,136,0.06)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected ? 'rgba(13,148,136,0.1)' : highlight ? 'rgba(220,38,38,0.04)' : 'transparent'; }}>
      {children}
    </tr>
  );
}

export function Sparkline({ data, color }: { data: number[]; color: string }) {
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

export function SeverityDot({ severity }: { severity: ThreatSeverity }) {
  const colors: Record<ThreatSeverity, string> = {
    Critical: S.errorLight,
    High: S.orangeLight,
    Medium: S.warningLight,
    Low: S.blueLight,
    Info: S.text3,
  };
  return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[severity] }} />;
}

export function DaysCountdown({ days, label }: { days: number; label?: string }) {
  const color = days < 0 ? S.errorLight : days <= 7 ? '#F87171' : days <= 30 ? S.orangeLight : days <= 60 ? S.warningLight : S.successLight;
  const bg = days < 0 ? S.errorBg : days <= 7 ? 'rgba(248,113,113,0.12)' : days <= 30 ? S.orangeBg : days <= 60 ? S.warningBg : S.successBg;
  const text = days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded font-semibold whitespace-nowrap"
      style={{ background: bg, color }}
      title={label}>
      {text}
    </span>
  );
}
