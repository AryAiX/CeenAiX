// Shared design tokens and primitives for the NABIDH portal

export const N = {
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
};

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type StatusType = string;

const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  Accepted: { bg: N.successBg, color: N.successLight },
  Active: { bg: N.successBg, color: N.successLight },
  Healthy: { bg: N.successBg, color: N.successLight },
  Granted: { bg: N.successBg, color: N.successLight },
  Valid: { bg: N.successBg, color: N.successLight },
  Submitted: { bg: N.tealBg, color: N.tealLight },
  Resubmitted: { bg: N.tealBg, color: N.tealLight },
  Processing: { bg: N.blueBg, color: N.blueLight },
  Pending: { bg: N.warningBg, color: N.warningLight },
  'Expiring Soon': { bg: N.warningBg, color: N.warningLight },
  Degraded: { bg: N.warningBg, color: N.warningLight },
  Warning: { bg: N.warningBg, color: N.warningLight },
  Draft: { bg: N.warningBg, color: N.warningLight },
  'Under Review': { bg: N.blueBg, color: N.blueLight },
  Rejected: { bg: N.errorBg, color: N.errorLight },
  Failed: { bg: N.errorBg, color: N.errorLight },
  Revoked: { bg: N.errorBg, color: N.errorLight },
  Expired: { bg: N.errorBg, color: N.errorLight },
  Deprecated: { bg: N.errorBg, color: N.errorLight },
  Critical: { bg: N.errorBg, color: N.errorLight },
  Offline: { bg: N.errorBg, color: N.errorLight },
};

export function StatusChip({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { bg: 'rgba(71,85,105,0.2)', color: N.text2 };
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export function SeverityChip({ severity }: { severity: Severity }) {
  const MAP: Record<Severity, { bg: string; color: string }> = {
    Critical: { bg: N.errorBg, color: N.errorLight },
    High: { bg: 'rgba(220,38,38,0.08)', color: '#F97316' },
    Medium: { bg: N.warningBg, color: N.warningLight },
    Low: { bg: N.tealBg, color: N.tealLight },
    Info: { bg: N.blueBg, color: N.blueLight },
  };
  const s = MAP[severity] || MAP.Info;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {severity}
    </span>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ background: N.bg2, border: `1px solid ${N.border}`, borderRadius: 12 }}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm font-semibold" style={{ color: N.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>
      {children}
    </th>
  );
}

interface TDProps { children: React.ReactNode; mono?: boolean; muted?: boolean; }
export function TD({ children, mono, muted }: TDProps) {
  return (
    <td className="py-2.5 pr-4 text-xs"
      style={{ color: muted ? N.text3 : N.text2, fontFamily: mono ? 'DM Mono, monospace' : undefined }}>
      {children}
    </td>
  );
}

interface TRProps { children: React.ReactNode; onClick?: () => void; highlight?: boolean; }
export function TR({ children, onClick, highlight }: TRProps) {
  return (
    <tr onClick={onClick}
      className="transition-colors"
      style={{
        borderBottom: `1px solid ${N.border}`,
        background: highlight ? 'rgba(220,38,38,0.04)' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'rgba(13,148,136,0.06)'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = highlight ? 'rgba(220,38,38,0.04)' : 'transparent'; }}>
      {children}
    </tr>
  );
}

export function PhiRedacted({ value, revealed }: { value: string; revealed: boolean }) {
  if (revealed) return <span style={{ color: N.warningLight, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{value}</span>;
  return <span style={{ color: N.text3, fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: 2 }}>••••••••</span>;
}
