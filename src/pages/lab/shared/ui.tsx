import type { ReactNode } from 'react';

export const SectionCard = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>{children}</section>
);

export const Pill = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${className}`}>
    {children}
  </span>
);

export const EmptyState = ({ label }: { label: string }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
    {label}
  </div>
);

export const KpiTile = ({
  label,
  value,
  caption,
  tone = 'slate',
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  tone?: 'indigo' | 'red' | 'blue' | 'emerald' | 'amber' | 'violet' | 'slate' | 'orange' | 'cyan' | 'rose';
}) => {
  const toneMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    red: 'bg-red-50 text-red-700 ring-red-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    slate: 'bg-slate-50 text-slate-700 ring-slate-100',
    orange: 'bg-orange-50 text-orange-700 ring-orange-100',
    cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  };
  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneMap[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-2 font-['Plus_Jakarta_Sans'] text-2xl font-bold leading-none">{value}</div>
      {caption ? <div className="mt-2 text-[11px] font-medium opacity-80">{caption}</div> : null}
    </div>
  );
};

export const ProgressMeter = ({ value, tone = 'accent-indigo-500' }: { value: number; tone?: string }) => (
  <progress
    value={Math.max(0, Math.min(100, value))}
    max={100}
    className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${tone}`}
  />
);
