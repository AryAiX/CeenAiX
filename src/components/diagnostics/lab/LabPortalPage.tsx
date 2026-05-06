import React, { useState, useEffect, useRef } from 'react';
import {
  FlaskConical, Phone, AlertTriangle, CheckCircle2, Clock,
  ChevronRight, X, Activity, Upload, Cpu, Microscope,
  Droplets, Shield, ArrowUpRight, Bell, RefreshCw,
  TrendingUp, TrendingDown, Minus, MapPin, User,
  FileText, Zap, BarChart3, Settings, LogOut, Printer, ArrowLeft
} from 'lucide-react';
import { labSamples, LabSample } from '../../../data/diagnosticsData';

/* ─── DESIGN TOKENS ─────────────────────────────────────────────── */
const T = {
  bg:      '#080B12',
  panel:   '#0D1117',
  card:    '#111620',
  card2:   '#161C26',
  border:  'rgba(255,255,255,0.06)',
  border2: 'rgba(255,255,255,0.04)',
  text:    '#E8EDF5',
  sub:     'rgba(255,255,255,0.45)',
  muted:   'rgba(255,255,255,0.22)',
  accent:  '#3B82F6',    // CeenAiX brand blue
  accentB: '#1D4ED8',
  teal:    '#06B6D4',
  emerald: '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  violet:  '#8B5CF6',
};

const DEPT: Record<string, { color: string; light: string; label: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }> }> = {
  Chemistry:    { color: '#3B82F6', light: 'rgba(59,130,246,0.12)', label: 'CHEM',  icon: FlaskConical },
  Haematology:  { color: '#EF4444', light: 'rgba(239,68,68,0.12)',  label: 'HAEM',  icon: Droplets },
  Immunology:   { color: '#8B5CF6', light: 'rgba(139,92,246,0.12)', label: 'IMMU',  icon: Shield },
  Coagulation:  { color: '#F59E0B', light: 'rgba(245,158,11,0.12)', label: 'COAG',  icon: Activity },
  Microbiology: { color: '#06B6D4', light: 'rgba(6,182,212,0.12)',  label: 'MICRO', icon: Microscope },
};

const ANALYZERS = [
  { name: 'Roche Cobas 6000', dept: 'Chemistry',    status: 'running',     load: 72, info: 'Lipid batch · ~45 min' },
  { name: 'Roche Cobas 8000', dept: 'Chemistry',    status: 'running',     load: 40, info: '4 urgent · ~15 min' },
  { name: 'Sysmex XN-3000',   dept: 'Haematology',  status: 'online',      load: 30, info: '8 CBCs queued' },
  { name: 'Siemens BCS XP',   dept: 'Coagulation',  status: 'maintenance', load: 0,  info: 'ETA 3:00 PM' },
  { name: 'Vitek 2 Compact',  dept: 'Microbiology', status: 'running',     load: 55, info: 'Sensitivity panel' },
  { name: 'Luminex 200',      dept: 'Immunology',   status: 'online',      load: 15, info: '3 samples queued' },
];

/* ─── HELPERS ───────────────────────────────────────────────────── */
const statusCfg = (s: LabSample) => {
  if (s.status === 'critical') return { label: 'CRITICAL', bg: 'rgba(239,68,68,0.18)', color: T.red, dot: T.red };
  if (s.status === 'running')  return { label: 'Running',  bg: 'rgba(59,130,246,0.14)', color: T.accent, dot: T.accent };
  if (s.status === 'resulted') return { label: 'Resulted', bg: 'rgba(245,158,11,0.14)', color: T.amber, dot: T.amber };
  if (s.status === 'verified') return { label: 'Verified', bg: 'rgba(16,185,129,0.14)', color: T.emerald, dot: T.emerald };
  if (s.status === 'received') return { label: 'Received', bg: 'rgba(59,130,246,0.1)',  color: T.accent, dot: T.accent };
  return { label: 'Pending', bg: 'rgba(255,255,255,0.05)', color: T.muted, dot: 'rgba(255,255,255,0.2)' };
};

/* ─── PULSE DOT ─────────────────────────────────────────────────── */
const PulseDot: React.FC<{ color: string; size?: number }> = ({ color, size = 8 }) => (
  <span className="relative flex-shrink-0" style={{ width: size, height: size }}>
    <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.4 }} />
    <span className="relative block rounded-full" style={{ width: size, height: size, background: color }} />
  </span>
);

/* ─── ANIMATED NUMBER ───────────────────────────────────────────── */
const AnimatedNum: React.FC<{ value: number; duration?: number }> = ({ value, duration = 800 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(id); }
      else setDisplay(Math.round(start));
    }, 16);
    return () => clearInterval(id);
  }, [value]);
  return <>{display}</>;
};

/* ─── LEFT NAV ──────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'overview',  icon: BarChart3,   label: 'Overview' },
  { id: 'queue',     icon: FlaskConical, label: 'Sample Queue', badge: 10 },
  { id: 'critical',  icon: AlertTriangle,label: 'Critical',     badge: 1,  badgeRed: true },
  { id: 'analyzers', icon: Cpu,          label: 'Analyzers' },
  { id: 'reports',   icon: FileText,     label: 'Reports' },
  { id: 'nabidh',    icon: Upload,       label: 'NABIDH',       badge: 5 },
];

const LabNav: React.FC<{ active: string; onChange: (id: string) => void; onBack?: () => void }> = ({ active, onChange, onBack }) => (
  <nav className="flex-shrink-0 flex flex-col" style={{ width: 220, background: T.panel, borderRight: `1px solid ${T.border}`, height: '100%' }}>
    {/* Logo area */}
    <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)', boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}>
          <FlaskConical className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <div className="font-black text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, letterSpacing: '-0.01em' }}>Lab Portal</div>
          <div style={{ fontSize: 9, color: T.muted, fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em' }}>CLINICAL LABORATORY</div>
        </div>
      </div>

      {/* Shift info */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <PulseDot color={T.emerald} size={6} />
          <span style={{ fontSize: 10, fontWeight: 600, color: T.emerald }}>Day Shift Active</span>
        </div>
        <div style={{ fontSize: 9, color: T.muted }}>Fatima Al Rashidi · Lab Supervisor</div>
        <div style={{ fontSize: 9, color: T.muted, fontFamily: 'DM Mono, monospace' }}>Ends 20:00 · 53 min left</div>
      </div>
    </div>

    {/* Nav items */}
    <div className="flex-1 overflow-y-auto py-3 px-3">
      <div className="mb-1 px-2" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Navigation</div>
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="w-full flex items-center gap-3 rounded-xl mb-0.5 transition-all duration-200"
            style={{
              padding: '9px 12px',
              background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
              border: isActive ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
            }}
          >
            <Icon className="flex-shrink-0" style={{ width: 15, height: 15, color: isActive ? T.accent : T.muted }} />
            <span className="flex-1 text-left" style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? T.text : T.sub }}>{item.label}</span>
            {item.badge && (
              <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ fontSize: 9, background: item.badgeRed ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)', color: item.badgeRed ? T.red : T.accent, minWidth: 20, textAlign: 'center' }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      <div className="mt-4 mb-1 px-2" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Departments</div>
      {Object.entries(DEPT).map(([name, cfg]) => {
        const count = labSamples.filter(s => s.department === name).length;
        const critical = labSamples.filter(s => s.department === name && s.status === 'critical').length;
        const Icon = cfg.icon;
        return (
          <div key={name} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 mb-0.5 transition-all hover:bg-white/5 cursor-pointer">
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: cfg.light }}>
              <Icon style={{ width: 11, height: 11, color: cfg.color }} />
            </div>
            <span style={{ fontSize: 12, color: T.sub, flex: 1 }}>{name}</span>
            {critical > 0 && <span className="w-4 h-4 rounded-full flex items-center justify-center animate-pulse" style={{ background: T.red, fontSize: 8, color: '#fff', fontWeight: 700 }}>{critical}</span>}
            <span style={{ fontSize: 10, color: T.muted, fontFamily: 'DM Mono, monospace' }}>{count}</span>
          </div>
        );
      })}
    </div>

    {/* Bottom */}
    <div className="flex-shrink-0 p-3 space-y-1" style={{ borderTop: `1px solid ${T.border}` }}>
      <button className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-white/5 transition-colors">
        <Settings style={{ width: 14, height: 14, color: T.muted }} />
        <span style={{ fontSize: 12, color: T.muted }}>Settings</span>
      </button>
      {onBack && (
        <button onClick={onBack} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-white/5 transition-colors">
          <ArrowLeft style={{ width: 14, height: 14, color: T.muted }} />
          <span style={{ fontSize: 12, color: T.muted }}>Back to Diagnostics</span>
        </button>
      )}
    </div>
  </nav>
);

/* ─── KPI CARD ──────────────────────────────────────────────────── */
const KpiCard: React.FC<{
  value: number | string;
  label: string;
  sub: string;
  accent: string;
  trend?: 'up' | 'down' | 'flat';
  pulse?: boolean;
  animate?: boolean;
}> = ({ value, label, sub, accent, trend, pulse, animate }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  return (
    <div className="flex-1 rounded-2xl p-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top left, ${accent}10 0%, transparent 60%)` }} />
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}20` }}>
          <FlaskConical style={{ width: 15, height: 15, color: accent }} />
        </div>
        {pulse && <PulseDot color={accent} size={7} />}
        {trend && <div className="flex items-center gap-1" style={{ fontSize: 10, color: trend === 'up' ? T.red : T.emerald }}><TrendIcon style={{ width: 12, height: 12 }} /></div>}
      </div>
      <div className="relative z-10">
        <div className="font-black leading-none mb-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, color: accent, letterSpacing: '-0.02em' }}>
          {typeof value === 'number' && animate ? <AnimatedNum value={value} /> : value}
        </div>
        <div className="font-semibold" style={{ fontSize: 12, color: T.text }}>{label}</div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
};

/* ─── ANALYZER CARD ─────────────────────────────────────────────── */
const AnalyzerCard: React.FC<{ a: typeof ANALYZERS[0] }> = ({ a }) => {
  const dept = DEPT[a.dept];
  const statusColor = a.status === 'online' ? T.emerald : a.status === 'running' ? T.accent : T.red;
  const statusLabel = a.status === 'running' ? 'Running' : a.status === 'online' ? 'Online' : 'Maintenance';
  return (
    <div className="rounded-xl p-3 relative overflow-hidden transition-all hover:bg-white/[0.02]" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: dept?.light || 'rgba(59,130,246,0.1)' }}>
          <Cpu style={{ width: 14, height: 14, color: dept?.color || T.accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="font-semibold text-white truncate" style={{ fontSize: 11 }}>{a.name}</div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              {a.status === 'running' ? <PulseDot color={statusColor} size={6} /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />}
              <span style={{ fontSize: 9, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: T.muted }}>{a.dept}</div>
          <div style={{ fontSize: 9, color: T.sub, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{a.info}</div>
        </div>
      </div>
      {a.status !== 'maintenance' && a.load > 0 && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: 8, color: T.muted }}>Load</span>
            <span style={{ fontSize: 8, color: statusColor, fontFamily: 'DM Mono, monospace' }}>{a.load}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${a.load}%`, background: `linear-gradient(90deg, ${dept?.color || T.accent}, ${statusColor})`, transition: 'width 1s ease' }} />
          </div>
        </div>
      )}
      {a.status === 'maintenance' && (
        <div className="mt-2 rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <span style={{ fontSize: 9, color: T.red }}>Under maintenance — ETA 3:00 PM</span>
        </div>
      )}
    </div>
  );
};

/* ─── DEPT PILL ─────────────────────────────────────────────────── */
const DeptPill: React.FC<{ name: string; active: boolean; onClick: () => void }> = ({ name, active, onClick }) => {
  const cfg = DEPT[name];
  const count = labSamples.filter(s => s.department === name || name === 'all').length;
  const critical = name === 'all'
    ? labSamples.filter(s => s.status === 'critical').length
    : labSamples.filter(s => s.department === name && s.status === 'critical').length;

  if (name === 'all') {
    return (
      <button onClick={onClick} className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-all duration-200" style={{ background: active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)', border: active ? '1px solid rgba(59,130,246,0.35)' : `1px solid ${T.border}`, color: active ? T.accent : T.sub, fontSize: 13 }}>
        All <span style={{ fontSize: 11, opacity: 0.7 }}>({labSamples.length})</span>
      </button>
    );
  }
  const Icon = cfg.icon;
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-semibold transition-all duration-200 relative" style={{ background: active ? cfg.light : 'rgba(255,255,255,0.03)', border: active ? `1px solid ${cfg.color}35` : `1px solid ${T.border}`, color: active ? cfg.color : T.sub, fontSize: 12 }}>
      <Icon style={{ width: 13, height: 13 }} />
      {name}
      {critical > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center animate-pulse" style={{ background: T.red, fontSize: 8, color: '#fff', fontWeight: 700 }}>{critical}</span>}
    </button>
  );
};

/* ─── SAMPLE ROW ────────────────────────────────────────────────── */
const SampleRow: React.FC<{ sample: LabSample; index: number; onClick: () => void }> = ({ sample, index, onClick }) => {
  const dept   = DEPT[sample.department || ''];
  const st     = statusCfg(sample);
  const isCrit = sample.status === 'critical';
  const isRun  = sample.status === 'running';
  const pct    = sample.totalTests && sample.completedTests !== undefined ? Math.round((sample.completedTests / sample.totalTests) * 100) : null;

  return (
    <div
      className="group cursor-pointer"
      style={{ borderBottom: `1px solid ${T.border2}`, borderLeft: `2px solid ${isCrit ? T.red : dept?.color || T.accent}`, animationDelay: `${index * 40}ms`, background: isCrit ? 'rgba(239,68,68,0.03)' : 'transparent' }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.background = isCrit ? 'rgba(239,68,68,0.07)' : `${dept?.color || T.accent}07`)}
      onMouseLeave={e => (e.currentTarget.style.background = isCrit ? 'rgba(239,68,68,0.03)' : 'transparent')}
    >
      <div className="flex items-start gap-4 px-5 pt-3 pb-2">
        {/* Dept icon */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: isCrit ? 'rgba(239,68,68,0.15)' : (dept?.light || 'rgba(59,130,246,0.1)') }}>
          {dept ? <dept.icon style={{ width: 14, height: 14, color: isCrit ? T.red : dept.color }} /> : <FlaskConical style={{ width: 14, height: 14, color: T.accent }} />}
        </div>

        {/* Sample + patient */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 600, color: isCrit ? '#FCA5A5' : 'rgba(255,255,255,0.55)' }}>{sample.sampleNum}</span>
            <span style={{ fontSize: 9, color: T.muted }}>{sample.receivedTime}</span>
            {sample.priority === 'stat'   && <span className="px-1.5 rounded font-black" style={{ fontSize: 8, background: 'rgba(239,68,68,0.2)', color: T.red, border: '1px solid rgba(239,68,68,0.3)' }}>STAT</span>}
            {sample.priority === 'urgent' && <span className="px-1.5 rounded font-black" style={{ fontSize: 8, background: 'rgba(245,158,11,0.15)', color: T.amber, border: '1px solid rgba(245,158,11,0.25)' }}>URGENT</span>}
            {sample.tatOverdue && <span style={{ fontSize: 8, color: T.amber, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>⚠ TAT</span>}
          </div>
          <div className="font-semibold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>
            {sample.patientName} <span style={{ fontSize: 10, color: T.muted, fontWeight: 400 }}>{sample.patientAge}{sample.patientGender}</span>
          </div>

          {isCrit && sample.criticalValues ? (
            <div className="flex flex-wrap gap-2 mb-1.5">
              {sample.criticalValues.map(cv => (
                <span key={cv.test} style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#FCA5A5' }}>
                  {cv.test}: {cv.value} {cv.unit} {cv.flag}
                  {cv.refRange && <span style={{ fontSize: 9, color: 'rgba(252,165,165,0.4)', fontWeight: 400 }}> (ref {cv.refRange})</span>}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {sample.tests.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-md" style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', color: T.sub, border: `1px solid ${T.border}` }}>{t}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {sample.location && <div className="flex items-center gap-1"><MapPin style={{ width: 10, height: 10, color: T.muted }} /><span style={{ fontSize: 9, color: T.muted }}>{sample.location}</span></div>}
            {sample.doctor && <div className="flex items-center gap-1"><User style={{ width: 10, height: 10, color: T.muted }} /><span style={{ fontSize: 9, color: T.muted }}>{sample.doctor}</span></div>}
            {sample.analyzer && <span style={{ fontSize: 9, color: T.muted, fontFamily: 'DM Mono, monospace' }}>{sample.analyzer}</span>}
            {sample.sampleType && <span style={{ fontSize: 9, color: T.muted, fontFamily: 'DM Mono, monospace' }}>{sample.sampleType}</span>}
          </div>
        </div>

        {/* Status column */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: st.bg }}>
            {(isCrit || isRun) ? <PulseDot color={st.dot} size={6} /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />}
            <span style={{ fontSize: 10, color: st.color, fontWeight: 700 }}>{st.label}</span>
          </div>
          {isCrit && (
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold hover:scale-105 transition-transform" style={{ background: T.red, color: '#fff', fontSize: 10 }} onClick={e => e.stopPropagation()}>
              <Phone style={{ width: 11, height: 11 }} /> Notify
            </button>
          )}
          <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 14, height: 14, color: T.muted }} />
        </div>
      </div>

      {/* Progress */}
      {(isRun || sample.status === 'received') && pct !== null && (
        <div className="px-5 pb-2.5">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${dept?.color || T.accent}, ${T.teal})`, transition: 'width 1.2s ease' }} />
            </div>
            <span style={{ fontSize: 9, color: T.muted, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{sample.completedTests}/{sample.totalTests} tests</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── SAMPLE DETAIL PANEL ───────────────────────────────────────── */
const DetailPanel: React.FC<{ sample: LabSample; onClose: () => void }> = ({ sample, onClose }) => {
  const dept = DEPT[sample.department || ''];
  const st   = statusCfg(sample);
  const isCrit = sample.status === 'critical';
  const pct = sample.totalTests && sample.completedTests !== undefined ? Math.round((sample.completedTests / sample.totalTests) * 100) : null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col" style={{ width: 440, background: T.panel, borderLeft: `1px solid ${T.border}` }}>
      {/* Header */}
      <div className="px-6 py-5 flex-shrink-0 relative overflow-hidden" style={{ borderBottom: `1px solid ${T.border}`, background: isCrit ? 'rgba(239,68,68,0.07)' : `${dept?.color || T.accent}08` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${isCrit ? T.red : dept?.color || T.accent}15 0%, transparent 60%)` }} />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="font-black text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16 }}>Sample Details</div>
            <div style={{ fontSize: 11, color: dept?.color || T.accent, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{sample.sampleNum} · {sample.department}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
            <X style={{ width: 16, height: 16, color: T.sub }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Critical alert */}
        {isCrit && sample.criticalValues && (
          <div className="mx-5 mt-5 rounded-2xl p-4 relative overflow-hidden" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <PulseDot color={T.red} size={8} />
              <span className="font-black uppercase tracking-wider" style={{ fontSize: 10, color: T.red, fontFamily: 'DM Mono, monospace' }}>Critical Value — Action Required</span>
            </div>
            {sample.criticalValues.map(cv => (
              <div key={cv.test} className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="font-black" style={{ fontFamily: 'DM Mono, monospace', fontSize: 24, color: '#FCA5A5', letterSpacing: '-0.02em' }}>{cv.value} <span style={{ fontSize: 14 }}>{cv.unit}</span> {cv.flag}</div>
                <div style={{ fontSize: 12, color: T.text, marginTop: 4 }}>{cv.test}</div>
                {cv.refRange && <div style={{ fontSize: 10, color: 'rgba(252,165,165,0.5)', marginTop: 2 }}>Reference: {cv.refRange}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Patient */}
        <div className="mx-5 mt-5 rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <User style={{ width: 18, height: 18, color: T.accent }} />
            </div>
            <div>
              <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>{sample.patientName}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{sample.patientAge}{sample.patientGender} · {sample.patientId}</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: st.bg }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
              <span style={{ fontSize: 9, color: st.color, fontWeight: 700 }}>{st.label}</span>
            </div>
          </div>
          {(sample.insurance || sample.location) && (
            <div className="flex gap-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
              {sample.location && <div className="flex items-center gap-1.5"><MapPin style={{ width: 12, height: 12, color: T.teal }} /><span style={{ fontSize: 11, color: T.sub }}>{sample.location}</span></div>}
              {sample.insurance && <div style={{ fontSize: 11, color: T.accent }}>{sample.insurance}</div>}
            </div>
          )}
        </div>

        {/* Info grid */}
        <div className="mx-5 mt-4 grid grid-cols-2 gap-2">
          {[
            { label: 'Department',     value: sample.department },
            { label: 'Sample Type',    value: sample.sampleType },
            { label: 'Received',       value: sample.receivedTime },
            { label: 'Resulted',       value: sample.resultTime || '—' },
            { label: 'TAT',            value: sample.tat ? `${sample.tat}${sample.tatTarget ? ` / ${sample.tatTarget}` : ''}` : '—', warn: sample.tatOverdue },
            { label: 'Analyzer',       value: sample.analyzer || '—' },
            { label: 'Ordering Doctor',value: sample.doctor || '—' },
            { label: 'Priority',       value: sample.priority?.toUpperCase() || 'Routine' },
          ].map(r => (
            <div key={r.label} className="rounded-xl p-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 9, color: T.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'DM Mono, monospace' }}>{r.label}</div>
              <div style={{ fontSize: 12, color: r.warn ? T.amber : T.text, fontWeight: 500 }}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* Tests */}
        <div className="mx-5 mt-4 mb-5 rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-white" style={{ fontSize: 13 }}>Tests Ordered</span>
            {pct !== null && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: T.accent }}>{sample.completedTests}/{sample.totalTests} complete · {pct}%</span>}
          </div>
          {pct !== null && (
            <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${T.accent}, ${T.teal})`, transition: 'width 1s ease' }} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {sample.tests.map((t, i) => {
              const done = sample.completedTests !== undefined && i < sample.completedTests;
              return (
                <span key={t} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ fontSize: 11, background: done ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', color: done ? T.emerald : T.sub, border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : T.border}` }}>
                  {done && <CheckCircle2 style={{ width: 11, height: 11 }} />}{t}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-5 flex-shrink-0 space-y-2.5" style={{ borderTop: `1px solid ${T.border}` }}>
        {isCrit && (
          <button className="w-full py-3 rounded-xl font-black flex items-center justify-center gap-2.5 hover:opacity-90 transition-all hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)', color: '#fff', fontSize: 14, boxShadow: '0 4px 20px rgba(239,68,68,0.3)' }}>
            <Phone style={{ width: 16, height: 16 }} /> Notify Doctor Immediately
          </button>
        )}
        {sample.status === 'resulted' && (
          <button className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all" style={{ background: `linear-gradient(135deg, ${T.accentB}, ${T.accent})`, color: '#fff', fontSize: 13, boxShadow: '0 4px 20px rgba(59,130,246,0.2)' }}>
            <CheckCircle2 style={{ width: 15, height: 15 }} /> Verify Results
          </button>
        )}
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: T.sub, fontSize: 12, border: `1px solid ${T.border}` }}>
            <Upload style={{ width: 14, height: 14 }} /> NABIDH
          </button>
          <button className="flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors" style={{ background: 'rgba(255,255,255,0.05)', color: T.sub, fontSize: 12, border: `1px solid ${T.border}` }}>
            <Printer style={{ width: 14, height: 14 }} /> Print
          </button>
        </div>
        {sample.status === 'verified' && (
          <button className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all" style={{ background: 'rgba(16,185,129,0.15)', color: T.emerald, border: '1px solid rgba(16,185,129,0.25)', fontSize: 13 }}>
            <CheckCircle2 style={{ width: 14, height: 14 }} /> Release Report
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── MAIN PAGE ─────────────────────────────────────────────────── */
const LabPortalPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [activeNav,  setActiveNav]  = useState('overview');
  const [activeDept, setActiveDept] = useState('all');
  const [selected,   setSelected]   = useState<LabSample | null>(null);
  const [loaded,     setLoaded]     = useState(false);

  useEffect(() => { const t = setTimeout(() => setLoaded(true), 50); return () => clearTimeout(t); }, []);

  const filtered    = activeDept === 'all' ? labSamples : labSamples.filter(s => s.department === activeDept);
  const critical    = labSamples.filter(s => s.status === 'critical');
  const running     = labSamples.filter(s => s.status === 'running');
  const pending     = labSamples.filter(s => s.status === 'pending' || s.status === 'received');
  const resulted    = labSamples.filter(s => s.status === 'resulted' || s.status === 'verified');
  const tatOverdue  = labSamples.filter(s => s.tatOverdue);

  const critF   = filtered.filter(s => s.status === 'critical');
  const runF    = filtered.filter(s => s.status === 'running');
  const pendF   = filtered.filter(s => s.status === 'pending' || s.status === 'received');
  const resF    = filtered.filter(s => s.status === 'resulted' || s.status === 'verified');

  const SectionHdr: React.FC<{ label: string; count: number; color: string; pulse?: boolean }> = ({ label, count, color, pulse }) => (
    <div className="flex items-center gap-2.5 px-5 py-2" style={{ background: `${color}07`, borderBottom: `1px solid ${color}12` }}>
      {pulse ? <PulseDot color={color} size={6} /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label} ({count})</span>
    </div>
  );

  return (
    <div className="flex w-full h-full overflow-hidden" style={{ background: T.bg, minHeight: 0, flex: '1 1 0' }}>
      {/* Left nav */}
      <LabNav active={activeNav} onChange={setActiveNav} onBack={onBack} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3.5" style={{ background: T.panel, borderBottom: `1px solid ${T.border}`, height: 60 }}>
          <div className="flex items-center gap-4">
            <div>
              <div className="font-black text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, letterSpacing: '-0.01em' }}>Clinical Laboratory</div>
              <div style={{ fontSize: 10, color: T.muted }}>Dubai Medical & Imaging Centre · Day Shift 07:00–20:00</div>
            </div>
            <span className="px-2.5 py-1 rounded-full font-bold" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', background: 'rgba(59,130,246,0.12)', color: T.accent, border: '1px solid rgba(59,130,246,0.2)' }}>DHA-LAB-2015-002841</span>
          </div>
          <div className="flex items-center gap-2.5">
            {critical.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <PulseDot color={T.red} size={6} />
                <span style={{ fontSize: 11, color: T.red, fontWeight: 600 }}>{critical.length} Critical Unnotified</span>
              </div>
            )}
            <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors relative" style={{ border: `1px solid ${T.border}` }}>
              <Bell style={{ width: 16, height: 16, color: T.sub }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors" style={{ border: `1px solid ${T.border}` }}>
              <RefreshCw style={{ width: 15, height: 15, color: T.sub }} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5">

            {/* KPIs */}
            <div className={`flex gap-3 mb-6 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <KpiCard value={labSamples.length} label="Samples Today"  sub="Across all departments"   accent={T.accent}   animate trend="up" />
              <KpiCard value={critical.length}   label="Critical Values" sub={`${critical.filter(s => !s.notified).length} unnotified`} accent={T.red}    animate pulse trend="flat" />
              <KpiCard value={running.length}    label="Running Now"     sub={running.map(s => s.department).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')} accent={T.teal}   animate pulse />
              <KpiCard value={tatOverdue.length} label="TAT Overdue"     sub="Require escalation"       accent={T.amber}    animate trend="up" />
              <KpiCard value="4/5"               label="QC Status"       sub="1 analyzer in maintenance" accent={T.violet} />
            </div>

            {/* Middle row: dept pills + TAT summary + Analyzers */}
            <div className={`grid grid-cols-3 gap-4 mb-6 transition-all duration-700 delay-100 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Department stats */}
              <div className="col-span-2 rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Department Breakdown</div>
                  <span style={{ fontSize: 10, color: T.muted }}>Today · All shifts</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(DEPT).map(([name, cfg]) => {
                    const deptSamples = labSamples.filter(s => s.department === name);
                    const deptRun   = deptSamples.filter(s => s.status === 'running').length;
                    const deptCrit  = deptSamples.filter(s => s.status === 'critical').length;
                    const deptDone  = deptSamples.filter(s => s.status === 'verified' || s.status === 'resulted').length;
                    const pct = deptSamples.length ? Math.round((deptDone / deptSamples.length) * 100) : 0;
                    const Icon = cfg.icon;
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.light }}>
                          <Icon style={{ width: 13, height: 13, color: cfg.color }} />
                        </div>
                        <div className="flex-shrink-0" style={{ width: 90 }}>
                          <div className="font-semibold" style={{ fontSize: 11, color: T.text }}>{name}</div>
                          <div style={{ fontSize: 9, color: T.muted }}>{deptSamples.length} samples</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {deptCrit > 0 && <span className="flex items-center gap-1" style={{ fontSize: 9, color: T.red }}><PulseDot color={T.red} size={5} />{deptCrit} crit</span>}
                              {deptRun > 0  && <span className="flex items-center gap-1" style={{ fontSize: 9, color: cfg.color }}><PulseDot color={cfg.color} size={5} />{deptRun} running</span>}
                            </div>
                            <span style={{ fontSize: 9, color: T.muted, fontFamily: 'DM Mono, monospace' }}>{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color})`, transition: 'width 1.2s ease' }} />
                          </div>
                        </div>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: pct === 100 ? T.emerald : T.sub, flexShrink: 0 }}>{deptDone}/{deptSamples.length}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Analyzers panel */}
              <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <div className="font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>
                    <Cpu style={{ width: 14, height: 14, color: T.muted }} /> Analyzers
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.red }} />
                    <span style={{ fontSize: 9, color: T.red }}>1 maintenance</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {ANALYZERS.map(a => <AnalyzerCard key={a.name} a={a} />)}
                </div>
              </div>
            </div>

            {/* Sample Queue */}
            <div className={`rounded-2xl overflow-hidden transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ background: T.card, border: `1px solid ${T.border}`, borderTop: `2px solid ${activeDept !== 'all' ? (DEPT[activeDept]?.color || T.accent) : T.accent}` }}>
              {/* Queue header */}
              <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>
                    Sample Queue
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, color: T.muted }}>{filtered.length} samples</span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold hover:opacity-90 transition-all" style={{ background: `linear-gradient(135deg, ${T.accentB}, ${T.accent})`, color: '#fff', fontSize: 11, boxShadow: '0 2px 12px rgba(59,130,246,0.3)' }}>
                      + New Sample
                    </button>
                  </div>
                </div>

                {/* Dept filter pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <DeptPill name="all" active={activeDept === 'all'} onClick={() => setActiveDept('all')} />
                  {Object.keys(DEPT).map(d => (
                    <DeptPill key={d} name={d} active={activeDept === d} onClick={() => setActiveDept(d)} />
                  ))}
                </div>
              </div>

              {/* Sections */}
              {critF.length > 0 && (
                <div>
                  <SectionHdr label="Critical — Immediate Action" count={critF.length} color={T.red} pulse />
                  {critF.map((s, i) => <SampleRow key={s.id} sample={s} index={i} onClick={() => setSelected(s)} />)}
                </div>
              )}
              {runF.length > 0 && (
                <div>
                  <SectionHdr label="Running" count={runF.length} color={T.accent} pulse />
                  {runF.map((s, i) => <SampleRow key={s.id} sample={s} index={i} onClick={() => setSelected(s)} />)}
                </div>
              )}
              {pendF.length > 0 && (
                <div>
                  <SectionHdr label="Pending / Received" count={pendF.length} color={T.teal} />
                  {pendF.map((s, i) => <SampleRow key={s.id} sample={s} index={i} onClick={() => setSelected(s)} />)}
                </div>
              )}
              {resF.length > 0 && (
                <div>
                  <SectionHdr label="Resulted / Verified" count={resF.length} color={T.emerald} />
                  {resF.map((s, i) => <SampleRow key={s.id} sample={s} index={i} onClick={() => setSelected(s)} />)}
                </div>
              )}
              {filtered.length === 0 && (
                <div className="px-5 py-12 text-center" style={{ color: T.muted }}>No samples for this department today</div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} onClick={() => setSelected(null)} />
          <DetailPanel sample={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
};

export default LabPortalPage;
