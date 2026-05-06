import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Currency, formatCurrency } from '../../data/revenueData';

// ─── Design tokens ─────────────────────────────────────────────────────────────
export const T = {
  bg0:         '#0F172A',
  bg1:         '#1E293B',
  bg2:         '#0A1628',
  bg3:         'rgba(255,255,255,0.03)',
  border:      'rgba(30,41,59,0.9)',
  border2:     'rgba(51,65,85,0.6)',
  teal:        '#0D9488',
  tealLight:   '#2DD4BF',
  tealBg:      'rgba(13,148,136,0.12)',
  tealBorder:  'rgba(13,148,136,0.28)',
  cyan:        '#0891B2',
  text1:       '#F1F5F9',
  text2:       '#94A3B8',
  text3:       '#64748B',
  success:     '#34D399',
  successBg:   'rgba(52,211,153,0.1)',
  warning:     '#FCD34D',
  warningBg:   'rgba(245,158,11,0.1)',
  error:       '#F87171',
  errorBg:     'rgba(239,68,68,0.1)',
  blue:        '#60A5FA',
  blueBg:      'rgba(59,130,246,0.1)',
};

// ─── MiniSparkline ─────────────────────────────────────────────────────────────
export function Sparkline({ data, color = T.teal, w = 56, h = 22 }: {
  data: number[]; color?: string; w?: number; h?: number;
}) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={2.5} fill={color} />
    </svg>
  );
}

// ─── DeltaBadge ────────────────────────────────────────────────────────────────
export function DeltaBadge({ delta, size = 'sm' }: { delta: number; size?: 'sm' | 'xs' }) {
  const pos = delta >= 0;
  const Icon = pos ? ArrowUpRight : ArrowDownRight;
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]';
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-semibold leading-none ${pad}`}
      style={{ background: pos ? T.successBg : T.errorBg, color: pos ? T.success : T.error }}
    >
      <Icon size={size === 'xs' ? 9 : 11} strokeWidth={2.5} />
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

// ─── StatusChip ────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  Active:          { bg: 'rgba(52,211,153,0.1)',  color: '#34D399' },
  Paid:            { bg: 'rgba(52,211,153,0.1)',  color: '#34D399' },
  Succeeded:       { bg: 'rgba(52,211,153,0.1)',  color: '#34D399' },
  Completed:       { bg: 'rgba(52,211,153,0.1)',  color: '#34D399' },
  Won:             { bg: 'rgba(52,211,153,0.1)',  color: '#34D399' },
  Sent:            { bg: 'rgba(59,130,246,0.1)',  color: '#60A5FA' },
  'In transit':    { bg: 'rgba(59,130,246,0.1)',  color: '#60A5FA' },
  Processing:      { bg: 'rgba(245,158,11,0.1)',  color: '#FCD34D' },
  Pending:         { bg: 'rgba(245,158,11,0.1)',  color: '#FCD34D' },
  Partial:         { bg: 'rgba(245,158,11,0.1)',  color: '#FCD34D' },
  Trial:           { bg: 'rgba(96,165,250,0.1)',  color: '#93C5FD' },
  'Needs evidence':{ bg: 'rgba(245,158,11,0.1)',  color: '#FCD34D' },
  'Under review':  { bg: 'rgba(245,158,11,0.1)',  color: '#FCD34D' },
  'Past due':      { bg: 'rgba(239,68,68,0.1)',   color: '#F87171' },
  Overdue:         { bg: 'rgba(239,68,68,0.1)',   color: '#F87171' },
  Failed:          { bg: 'rgba(239,68,68,0.1)',   color: '#F87171' },
  Lost:            { bg: 'rgba(239,68,68,0.1)',   color: '#F87171' },
  Refunded:        { bg: 'rgba(100,116,139,0.15)',color: '#94A3B8' },
  Draft:           { bg: 'rgba(100,116,139,0.15)',color: '#94A3B8' },
  Canceled:        { bg: 'rgba(100,116,139,0.15)',color: '#94A3B8' },
  Paused:          { bg: 'rgba(100,116,139,0.15)',color: '#94A3B8' },
  Churned:         { bg: 'rgba(239,68,68,0.1)',   color: '#F87171' },
};
export function StatusChip({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { bg: 'rgba(100,116,139,0.15)', color: '#94A3B8' };
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

// ─── HealthChip ────────────────────────────────────────────────────────────────
const HEALTH_MAP = {
  Healthy:  { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', dot: '#34D399' },
  'At risk':{ bg: 'rgba(245,158,11,0.1)',  color: '#FCD34D', dot: '#FCD34D' },
  Churned:  { bg: 'rgba(239,68,68,0.1)',   color: '#F87171', dot: '#F87171' },
} as const;
export function HealthChip({ health }: { health: keyof typeof HEALTH_MAP }) {
  const s = HEALTH_MAP[health] ?? HEALTH_MAP.Healthy;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {health}
    </span>
  );
}

// ─── TierChip ─────────────────────────────────────────────────────────────────
const TIER_MAP: Record<string, { bg: string; color: string }> = {
  Pilot:      { bg: 'rgba(100,116,139,0.15)', color: '#94A3B8' },
  Growth:     { bg: 'rgba(59,130,246,0.1)',   color: '#60A5FA' },
  Enterprise: { bg: 'rgba(13,148,136,0.12)',  color: '#2DD4BF' },
};
export function TierChip({ tier }: { tier: string }) {
  const s = TIER_MAP[tier] ?? TIER_MAP.Pilot;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: s.bg, color: s.color }}>
      {tier}
    </span>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', style }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{ background: T.bg1, borderColor: T.border, ...style }}
    >
      {children}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</h3>
      {children}
    </div>
  );
}

// ─── TabButton ─────────────────────────────────────────────────────────────────
export function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-3 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
      style={{ color: active ? T.tealLight : T.text3, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
      aria-selected={active}
      role="tab"
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-sm" style={{ background: T.teal }} />
      )}
    </button>
  );
}

// ─── Recharts custom tooltip ───────────────────────────────────────────────────
export function RevenueTooltip({ active, payload, label, currency }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: Currency;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-xl border p-3 text-xs z-50" style={{
      background: T.bg0,
      borderColor: T.border2,
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      minWidth: 180,
    }}>
      <div className="font-semibold mb-2" style={{ color: T.text1, fontFamily: 'DM Mono, monospace' }}>{label}</div>
      {[...payload].reverse().map(p => (
        <div key={p.name} className="flex items-center justify-between gap-6 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: p.color }} />
            <span style={{ color: T.text2 }}>{p.name}</span>
          </div>
          <span style={{ color: T.text1, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(p.value, currency)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <span style={{ color: T.text3 }}>Total</span>
          <span style={{ color: T.tealLight, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(total, currency)}</span>
        </div>
      )}
    </div>
  );
}

// ─── SimpleTooltip ─────────────────────────────────────────────────────────────
export function SimpleTooltip({ active, payload, label, currency }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  currency: Currency;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs" style={{ background: T.bg0, borderColor: T.border2, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
      <div style={{ color: T.text3, fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: T.text1, fontFamily: 'DM Mono, monospace' }}>
          {p.name}: {formatCurrency(p.value, currency)}
        </div>
      ))}
    </div>
  );
}

// ─── IconButton ────────────────────────────────────────────────────────────────
export function IconBtn({ children, onClick, active = false, title }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-7 px-2.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1"
      style={active
        ? { background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }
        : { background: 'transparent', color: T.text3, border: `1px solid ${T.border}` }
      }
    >
      {children}
    </button>
  );
}

// ─── FilterBtn ─────────────────────────────────────────────────────────────────
export function FilterBtn({ children, active = false, onClick }: {
  children: React.ReactNode; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium transition-all"
      style={active
        ? { background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }
        : { background: T.bg2, color: T.text2, border: `1px solid ${T.border}` }
      }
    >
      {children}
    </button>
  );
}

// ─── TableHeader ──────────────────────────────────────────────────────────────
export function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`pb-2 pr-4 font-semibold text-[10px] uppercase tracking-wide ${right ? 'text-right' : 'text-left'}`}
      style={{ color: T.text3 }}
    >
      {children}
    </th>
  );
}
export function TD({ children, mono, right, muted, className = '' }: {
  children: React.ReactNode; mono?: boolean; right?: boolean; muted?: boolean; className?: string;
}) {
  return (
    <td
      className={`py-2.5 pr-4 text-xs ${right ? 'text-right' : ''} ${className}`}
      style={{ color: muted ? T.text3 : T.text2, fontFamily: mono ? 'DM Mono, monospace' : undefined }}
    >
      {children}
    </td>
  );
}
export function TR({ children, onClick, highlight }: {
  children: React.ReactNode; onClick?: () => void; highlight?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className="border-b transition-colors"
      style={{
        borderColor: T.border,
        cursor: onClick ? 'pointer' : undefined,
        background: highlight ? 'rgba(239,68,68,0.04)' : 'transparent',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = highlight ? 'rgba(239,68,68,0.04)' : 'transparent'; }}
    >
      {children}
    </tr>
  );
}
