import React from 'react';
import type { ComplianceStatus, LicenseStatus, FindingSeverity, CapaStatus } from '../../data/dhaComplianceData';

// ─── Design tokens ────────────────────────────────────────────────────────────
export const D = {
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
};

// ─── Status maps ──────────────────────────────────────────────────────────────
export const COMPLIANCE_STATUS_MAP: Record<ComplianceStatus, { color: string; bg: string; border: string }> = {
  'Compliant':        { color: D.successLight, bg: D.successBg, border: 'rgba(5,150,105,0.3)' },
  'Action required':  { color: D.warningLight, bg: D.warningBg, border: D.warningBorder },
  'At risk':          { color: '#FB923C', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
  'Non-compliant':    { color: D.errorLight, bg: D.errorBg, border: D.errorBorder },
};

export const LICENSE_STATUS_MAP: Record<LicenseStatus, { color: string; bg: string }> = {
  'Active':       { color: D.successLight, bg: D.successBg },
  'Expiring':     { color: D.warningLight, bg: D.warningBg },
  'Expired':      { color: D.errorLight, bg: D.errorBg },
  'Suspended':    { color: '#F87171', bg: 'rgba(220,38,38,0.15)' },
  'Under review': { color: D.blueLight, bg: D.blueBg },
};

export const FINDING_SEVERITY_MAP: Record<FindingSeverity, { color: string; bg: string }> = {
  Critical:    { color: D.errorLight, bg: D.errorBg },
  Major:       { color: '#FB923C', bg: 'rgba(249,115,22,0.12)' },
  Minor:       { color: D.warningLight, bg: D.warningBg },
  Observation: { color: D.blueLight, bg: D.blueBg },
};

export const CAPA_STATUS_MAP: Record<CapaStatus, { color: string; bg: string }> = {
  'Draft':              { color: D.text3, bg: D.bg1 },
  'Submitted to DHA':   { color: D.blueLight, bg: D.blueBg },
  'Under review':       { color: D.warningLight, bg: D.warningBg },
  'Accepted':           { color: D.tealLight, bg: D.tealBg },
  'In progress':        { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  'Verification':       { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  'Closed':             { color: D.successLight, bg: D.successBg },
  'Reopened':           { color: D.errorLight, bg: D.errorBg },
};

export const PROGRAM_LABELS: Record<string, string> = {
  Sheryan: 'Sheryan',
  NABIDH: 'NABIDH',
  Tatmeen: 'Tatmeen',
  Shafafiya: 'Shafafiya',
  Formulary: 'Drug Formulary',
  PathB: 'DHA Path B',
  PatientRights: 'Patient Rights',
  Quality: 'Quality',
  DataProtection: 'Data Protection',
};

const PROGRAM_COLORS: Record<string, string> = {
  Sheryan: '#38BDF8',
  NABIDH: D.tealLight,
  Tatmeen: '#34D399',
  Shafafiya: '#A78BFA',
  Formulary: '#FB923C',
  PathB: D.blueLight,
  PatientRights: '#F9A8D4',
  Quality: D.warningLight,
  DataProtection: '#FCA5A5',
};

// ─── Primitive components ─────────────────────────────────────────────────────
export function ComplianceStatusChip({ status }: { status: ComplianceStatus }) {
  const s = COMPLIANCE_STATUS_MAP[status];
  return (
    <span className="text-[11px] px-3 py-1 rounded-full font-bold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

export function LicenseStatusChip({ status }: { status: LicenseStatus }) {
  const s = LICENSE_STATUS_MAP[status];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export function FindingChip({ severity }: { severity: FindingSeverity }) {
  const s = FINDING_SEVERITY_MAP[severity];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {severity}
    </span>
  );
}

export function CapaChip({ status }: { status: CapaStatus }) {
  const s = CAPA_STATUS_MAP[status];
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export function ProgramChip({ program }: { program: string }) {
  const color = PROGRAM_COLORS[program] || D.text3;
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap"
      style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}>
      {PROGRAM_LABELS[program] || program}
    </span>
  );
}

export function DaysChip({ days, label }: { days: number; label?: string }) {
  const color = days < 0 ? D.errorLight : days <= 7 ? '#F87171' : days <= 30 ? '#FB923C' : days <= 60 ? D.warningLight : D.successLight;
  const bg = days < 0 ? D.errorBg : days <= 7 ? 'rgba(248,113,113,0.12)' : days <= 30 ? 'rgba(249,115,22,0.12)' : days <= 60 ? D.warningBg : D.successBg;
  const text = days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded font-semibold whitespace-nowrap"
      style={{ background: bg, color }}
      title={label}>
      {text}
    </span>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ background: D.bg2, border: `1px solid ${D.border}`, borderRadius: 12 }}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm font-semibold" style={{ color: D.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function Sparkline({ data, color = D.teal }: { data: number[]; color?: string }) {
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

export function MonoId({ value, label }: { value: string; label?: string }) {
  const copy = () => navigator.clipboard?.writeText(value);
  return (
    <span onClick={copy} title={label || 'Click to copy'}
      className="cursor-pointer hover:opacity-70 transition-opacity"
      style={{ color: D.tealLight, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
      {value}
    </span>
  );
}

export function StatusDot({ ok, pulse }: { ok: boolean; pulse?: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
      style={{ background: ok ? D.successLight : D.errorLight }} />
  );
}

export function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ color: D.text3, fontFamily: 'DM Mono, monospace' }}>
      {children}
    </th>
  );
}

export function TD({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className="py-2 pr-3 text-xs" style={{ color: D.text2, fontFamily: mono ? 'DM Mono, monospace' : undefined }}>
      {children}
    </td>
  );
}

interface TRProps { children: React.ReactNode; onClick?: () => void; highlight?: boolean; }
export function TR({ children, onClick, highlight }: TRProps) {
  return (
    <tr onClick={onClick}
      className="transition-colors"
      style={{ borderBottom: `1px solid ${D.border}`, background: highlight ? 'rgba(220,38,38,0.04)' : 'transparent', cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(13,148,136,0.06)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = highlight ? 'rgba(220,38,38,0.04)' : 'transparent'; }}>
      {children}
    </tr>
  );
}
