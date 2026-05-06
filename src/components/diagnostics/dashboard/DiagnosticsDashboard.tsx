import React, { useState, useEffect, useRef } from 'react';
import { Phone, AlertTriangle, Clock, FlaskConical, ScanLine, Upload, FileText, RefreshCw, Activity, CheckCircle2, X, ChevronDown, ChevronRight, Printer, TrendingUp, Zap, ArrowRight, Pause, Square, MessageSquare, ClipboardList, Barcode as BarcodeIcon, Plus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine, Cell
} from 'recharts';
import { DeptFilter } from '../DiagnosticsTopBar';
import {
  labSamples, imagingStudies, equipmentItems, tatData, volumeData,
  LabSample, ImagingStudy
} from '../../../data/diagnosticsData';

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const LAB_ACCENT   = '#4F46E5';
const RAD_ACCENT   = '#1D4ED8';
const CRIT_RED     = '#DC2626';
const AMBER        = '#D97706';
const EMERALD      = '#16A34A';
const VIOLET       = '#7C3AED';

const deptAccent: Record<string, string> = {
  Chemistry: LAB_ACCENT, Haematology: CRIT_RED, Immunology: VIOLET,
  Coagulation: AMBER, Microbiology: '#0D9488',
};

const modalityMeta: Record<string, { bg: string; text: string; border: string; abbr: string; leftBorder: string }> = {
  MRI:   { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', abbr: 'MRI', leftBorder: '#6366F1' },
  CT:    { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', abbr: 'CT',  leftBorder: RAD_ACCENT },
  USS:   { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4', abbr: 'USS', leftBorder: '#0D9488' },
  XR:    { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1', abbr: 'XR',  leftBorder: '#64748B' },
  PET:   { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', abbr: 'PET', leftBorder: AMBER },
  MAMMO: { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', abbr: 'MAM', leftBorder: '#E11D48' },
  FLUORO:{ bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', abbr: 'FLU', leftBorder: '#EA580C' },
};

// ─── SHIMMER ──────────────────────────────────────────────────────────────────
const Shimmer: React.FC<{ h?: number; w?: string; rounded?: string; className?: string }> = ({
  h = 16, w = '100%', rounded = '8px', className = ''
}) => (
  <div
    className={`animate-pulse ${className}`}
    style={{ height: h, width: w, borderRadius: rounded, background: 'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize: '200% 100%' }}
  />
);

const KpiShimmerCard: React.FC<{ accent: string }> = ({ accent }) => (
  <div className="flex-1 min-w-0 rounded-xl p-3 bg-white" style={{ border: `1.5px solid ${accent}30`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
    <div className="flex items-start justify-between mb-2">
      <div className="w-7 h-7 rounded-lg animate-pulse" style={{ background: `${accent}20` }} />
    </div>
    <Shimmer h={20} w="60%" rounded="6px" className="mb-2" />
    <Shimmer h={10} w="80%" rounded="4px" className="mb-1" />
    <Shimmer h={9} w="50%" rounded="4px" />
  </div>
);

// ─── ANIMATED NUMBER ──────────────────────────────────────────────────────────
const AnimatedNum: React.FC<{ target: number | string; accent: string; size?: number }> = ({ target, accent, size = 20 }) => {
  const [val, setVal] = useState(0);
  const isNum = typeof target === 'number';
  useEffect(() => {
    if (!isNum) return;
    let start = 0;
    const end = target as number;
    const dur = 400;
    const step = Math.ceil(end / (dur / 16));
    const t = setInterval(() => {
      start = Math.min(start + step, end);
      setVal(start);
      if (start >= end) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [target, isNum]);
  return (
    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: size, fontWeight: 700, color: accent }}>
      {isNum ? val : target}
    </span>
  );
};

// ─── CRITICAL BANNER ─────────────────────────────────────────────────────────
const CriticalBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const [notified, setNotified] = useState(false);
  const [elapsed, setElapsed] = useState(44);
  useEffect(() => {
    if (dismissed) return;
    const t = setInterval(() => setElapsed(e => e + 1), 60000);
    return () => clearInterval(t);
  }, [dismissed]);
  if (dismissed) return null;
  return (
    <div
      className="flex items-center gap-3 px-5 py-2.5 flex-shrink-0"
      style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}
    >
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
      <span className="font-black uppercase tracking-wider text-red-600 flex-shrink-0" style={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}>
        Critical — Unnotified
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap" style={{ fontSize: 12 }}>
        <span className="font-bold text-slate-900">Ibrahim Al Marzouqi (PT-003)</span>
        <span className="text-slate-300">·</span>
        <span style={{ fontFamily: 'DM Mono, monospace', color: CRIT_RED, fontWeight: 700 }}>K⁺ = 6.8 mEq/L ↑↑</span>
        <span className="text-slate-300">·</span>
        <span style={{ fontFamily: 'DM Mono, monospace', color: '#94A3B8', fontSize: 11 }}>002847</span>
        <span className="text-slate-300">·</span>
        <span style={{ color: AMBER, fontWeight: 600 }}>{elapsed} min elapsed</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => { setNotified(true); setTimeout(() => setDismissed(true), 2000); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all"
          style={{
            background: notified ? '#F0FDF4' : CRIT_RED, color: notified ? EMERALD : '#fff',
            fontSize: 11, border: notified ? '1px solid #BBF7D0' : 'none',
          }}
        >
          {notified ? <><CheckCircle2 className="w-3.5 h-3.5" /> Notified</> : <><Phone className="w-3.5 h-3.5" /> Notify Now</>}
        </button>
        <button onClick={() => setDismissed(true)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── KPI STRIP ────────────────────────────────────────────────────────────────
interface KpiDef { v: string | number; label: string; sub: string; icon: React.ReactNode; accent: string; bg: string; border: string; warning?: boolean; pulse?: boolean }

const KpiCard: React.FC<{ k: KpiDef; loaded: boolean }> = ({ k, loaded }) => {
  if (!loaded) return <KpiShimmerCard accent={k.accent} />;
  return (
    <div
      className="flex-1 min-w-0 rounded-xl p-3 bg-white cursor-default"
      style={{ border: `1.5px solid ${k.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: k.bg }}>{k.icon}</div>
        {k.warning && <span className="w-2 h-2 rounded-full bg-amber-400 mt-0.5 flex-shrink-0" />}
        {k.pulse && <span className="w-2 h-2 rounded-full animate-pulse mt-0.5 flex-shrink-0" style={{ background: k.accent }} />}
      </div>
      <div className="leading-none mb-1"><AnimatedNum target={k.v} accent={k.accent} size={19} /></div>
      <div className="font-semibold text-slate-700 leading-tight" style={{ fontSize: 10 }}>{k.label}</div>
      <div className="mt-0.5 text-slate-400 leading-tight" style={{ fontSize: 9 }}>{k.sub}</div>
    </div>
  );
};

const KpiStrip: React.FC<{ deptFilter: DeptFilter; loaded: boolean }> = ({ deptFilter, loaded }) => {
  const labKpis: KpiDef[] = [
    { v: 234,    label: 'Samples Today',    sub: '80.8% complete',        icon: <FlaskConical className="w-3.5 h-3.5" style={{ color: LAB_ACCENT }} />, accent: LAB_ACCENT, bg: '#EEF2FF', border: '#C7D2FE' },
    { v: 7,      label: 'Critical Values',  sub: '1 unnotified',          icon: <AlertTriangle className="w-3.5 h-3.5" style={{ color: CRIT_RED }} />,  accent: CRIT_RED,  bg: '#FEF2F2', border: '#FECACA', warning: true },
    { v: '3.2h', label: 'Avg Lab TAT',      sub: 'Within targets',        icon: <Clock className="w-3.5 h-3.5" style={{ color: LAB_ACCENT }} />,        accent: LAB_ACCENT, bg: '#EEF2FF', border: '#C7D2FE' },
    { v: '42/47',label: 'NABIDH Lab',       sub: '5 pending',             icon: <Upload className="w-3.5 h-3.5" style={{ color: VIOLET }} />,            accent: VIOLET,    bg: '#F5F3FF', border: '#DDD6FE' },
    { v: '4/5',  label: 'QC Status',        sub: '1 maintenance',         icon: <Activity className="w-3.5 h-3.5" style={{ color: AMBER }} />,            accent: AMBER,     bg: '#FFFBEB', border: '#FDE68A', warning: true },
  ];
  const radKpis: KpiDef[] = [
    { v: 47,     label: 'Studies Today',    sub: '28 reported (60%)',      icon: <ScanLine className="w-3.5 h-3.5" style={{ color: RAD_ACCENT }} />,      accent: RAD_ACCENT, bg: '#EFF6FF', border: '#BFDBFE' },
    { v: 3,      label: 'Scanning Now',     sub: 'CT · MRI · USS active', icon: <RefreshCw className="w-3.5 h-3.5" style={{ color: VIOLET }} />,          accent: VIOLET,     bg: '#F5F3FF', border: '#DDD6FE', pulse: true },
    { v: 9,      label: 'Reports Pending',  sub: 'Dr. Rania on duty',      icon: <FileText className="w-3.5 h-3.5" style={{ color: AMBER }} />,            accent: AMBER,      bg: '#FFFBEB', border: '#FDE68A' },
    { v: 7,      label: 'Scheduled Today',  sub: 'Next: MRI 2:30 PM',     icon: <Clock className="w-3.5 h-3.5" style={{ color: RAD_ACCENT }} />,          accent: RAD_ACCENT, bg: '#EFF6FF', border: '#BFDBFE' },
    { v: 2,      label: 'Equip Issues',     sub: 'Coag maint · X-Ray QA', icon: <Zap className="w-3.5 h-3.5" style={{ color: AMBER }} />,                 accent: AMBER,      bg: '#FFFBEB', border: '#FDE68A', warning: true },
  ];
  return (
    <div className="px-5 py-3 space-y-2 flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
      {deptFilter !== 'radiology' && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1 h-3 rounded-full" style={{ background: LAB_ACCENT }} />
            <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: LAB_ACCENT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Laboratory
            </span>
          </div>
          <div className="flex gap-2">{labKpis.map(k => <KpiCard key={k.label} k={k} loaded={loaded} />)}</div>
        </div>
      )}
      {deptFilter !== 'lab' && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1 h-3 rounded-full" style={{ background: RAD_ACCENT }} />
            <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: RAD_ACCENT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Radiology &amp; Imaging
            </span>
          </div>
          <div className="flex gap-2">{radKpis.map(k => <KpiCard key={k.label} k={k} loaded={loaded} />)}</div>
        </div>
      )}
    </div>
  );
};

// ─── QUEUE SECTION HEADER ─────────────────────────────────────────────────────
const QueueSection: React.FC<{ label: string; count: number; accent: string; bg: string }> = ({ label, count, accent, bg }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0" style={{ background: bg, borderBottom: `1px solid ${accent}20` }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, color: accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {label} ({count})
    </span>
  </div>
);

// ─── LAB SAMPLE ROW ───────────────────────────────────────────────────────────
const LabSampleRow: React.FC<{ sample: LabSample; onSelect: (s: LabSample) => void }> = ({ sample, onSelect }) => {
  const isCritical = sample.status === 'critical';
  const isRunning  = sample.status === 'running';
  const isOverdue  = sample.tatOverdue;
  const leftAccent = isCritical ? CRIT_RED : isOverdue ? AMBER
    : sample.priority === 'stat' ? CRIT_RED : sample.priority === 'urgent' ? AMBER
    : deptAccent[sample.department || ''] || LAB_ACCENT;
  const bgBase  = isCritical ? '#FEF2F2' : '#fff';
  const bgHover = isCritical ? '#FEE2E2' : '#F8FAFC';

  const statusMap: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: '#FEE2E2', color: CRIT_RED, label: '⚠ CRITICAL' },
    running:  { bg: '#EEF2FF', color: LAB_ACCENT, label: '◎ Running' },
    resulted: { bg: '#FFFBEB', color: AMBER,       label: 'Resulted' },
    verified: { bg: '#F0FDF4', color: EMERALD,     label: '✓ Verified' },
    received: { bg: '#EFF6FF', color: RAD_ACCENT,  label: 'Received' },
    pending:  { bg: '#F8FAFC', color: '#64748B',   label: 'Pending' },
  };
  const st = statusMap[sample.status] || statusMap.pending;
  const pct = sample.totalTests && sample.completedTests !== undefined
    ? Math.round((sample.completedTests / sample.totalTests) * 100) : null;

  return (
    <div
      className="cursor-pointer transition-colors"
      style={{ borderBottom: '1px solid #F1F5F9', borderLeft: `3px solid ${leftAccent}`, background: bgBase }}
      onClick={() => onSelect(sample)}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = bgHover; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = bgBase; }}
    >
      <div className="flex items-start gap-2 px-3 pt-2 pb-1.5">
        {/* Sample # + time */}
        <div className="flex-shrink-0" style={{ width: 56 }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: isCritical ? CRIT_RED : '#64748B', fontWeight: 600 }}>{sample.sampleNum}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8' }}>{sample.receivedTime}</div>
          {sample.tat && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: isOverdue ? AMBER : '#CBD5E1', marginTop: 1 }}>{sample.tat}</div>}
        </div>
        {/* Patient + tests */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="font-semibold text-slate-800 truncate" style={{ fontSize: 12 }}>{sample.patientName}</span>
            <span className="text-slate-300" style={{ fontSize: 10 }}>·</span>
            <span className="text-slate-400" style={{ fontSize: 9 }}>{sample.patientAge}{sample.patientGender}</span>
            {sample.priority === 'stat' && <span className="px-1.5 rounded font-black" style={{ fontSize: 8, background: '#FEE2E2', color: CRIT_RED, border: '1px solid #FECACA' }}>STAT</span>}
            {sample.priority === 'urgent' && <span className="px-1.5 rounded font-black" style={{ fontSize: 8, background: '#FFFBEB', color: AMBER, border: '1px solid #FDE68A' }}>URG</span>}
          </div>
          {isCritical && sample.criticalValues ? (
            sample.criticalValues.map(cv => (
              <div key={cv.test} style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color: CRIT_RED }}>
                {cv.test}: {cv.value} {cv.unit} {cv.flag}
              </div>
            ))
          ) : (
            <div className="flex flex-wrap gap-1">
              {sample.tests.slice(0, 3).map(t => (
                <span key={t} className="px-1 rounded" style={{ fontSize: 9, background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>{t}</span>
              ))}
              {sample.tests.length > 3 && <span style={{ fontSize: 9, color: '#94A3B8' }}>+{sample.tests.length - 3}</span>}
            </div>
          )}
          {sample.department && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1 h-1 rounded-full" style={{ background: deptAccent[sample.department] || LAB_ACCENT }} />
              <span style={{ fontSize: 9, color: '#94A3B8' }}>{sample.department}</span>
              {sample.sampleType && <span style={{ fontSize: 9, color: '#CBD5E1', fontFamily: 'DM Mono, monospace' }}>· {sample.sampleType}</span>}
            </div>
          )}
        </div>
        {/* Status + action */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap" style={{ fontSize: 9, background: st.bg, color: st.color }}>{st.label}</span>
          {isCritical && (
            <button onClick={e => { e.stopPropagation(); }} className="flex items-center gap-1 px-2 py-1 rounded-lg font-bold" style={{ background: CRIT_RED, color: '#fff', fontSize: 9 }}>
              <Phone className="w-2.5 h-2.5" /> Notify
            </button>
          )}
          {isOverdue && !isCritical && <span style={{ fontSize: 8, color: AMBER, fontFamily: 'DM Mono, monospace' }}>OVERDUE</span>}
        </div>
      </div>
      {(isRunning || sample.status === 'received') && pct !== null && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-indigo-100">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${LAB_ACCENT},#818CF8)` }} />
            </div>
            <span style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{sample.completedTests}/{sample.totalTests}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── LAB SAMPLE DETAIL PANEL ──────────────────────────────────────────────────
const LabDetailPanel: React.FC<{ sample: LabSample; onClose: () => void }> = ({ sample, onClose }) => {
  const isCritical = sample.status === 'critical';
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col bg-white" style={{ width: 400, borderLeft: '1px solid #E2E8F0', boxShadow: '-4px 0 32px rgba(0,0,0,0.1)' }}>
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9', background: isCritical ? '#FEF2F2' : '#EEF2FF', borderTop: `3px solid ${isCritical ? CRIT_RED : LAB_ACCENT}` }}>
        <div>
          <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>Lab Sample Detail</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: isCritical ? CRIT_RED : LAB_ACCENT }}>#{sample.sampleNum}</div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isCritical && sample.criticalValues && (
          <div className="p-3 rounded-xl" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-black text-red-600 uppercase tracking-wider" style={{ fontSize: 10, fontFamily: 'DM Mono, monospace' }}>Critical Value — Unnotified</span>
            </div>
            {sample.criticalValues.map(cv => (
              <div key={cv.test}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700, color: CRIT_RED }}>{cv.test}: {cv.value} {cv.unit} {cv.flag}</div>
                {cv.refRange && <div style={{ fontSize: 11, color: '#94A3B8' }}>Reference: {cv.refRange}</div>}
              </div>
            ))}
          </div>
        )}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>{sample.patientName}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B', marginTop: 2 }}>
            {sample.patientAge}{sample.patientGender} · {sample.patientId}
          </div>
          {sample.insurance && <div className="text-blue-600 mt-0.5" style={{ fontSize: 11 }}>{sample.insurance}</div>}
          {sample.location && <div className="text-slate-500 mt-0.5" style={{ fontSize: 11 }}>{sample.location}</div>}
        </div>
        <div className="space-y-2">
          {[
            ['Sample #', sample.sampleNum],
            ['Sample Type', sample.sampleType],
            ['Department', sample.department],
            ['Ordering Doctor', sample.doctor],
            ['Received', sample.receivedTime],
            sample.resultTime ? ['Resulted', sample.resultTime] : null,
            sample.tat ? ['TAT', `${sample.tat} (target: ${sample.tatTarget})`] : null,
            sample.analyzer ? ['Analyzer', sample.analyzer] : null,
          ].filter(Boolean).map(([k, v]) => (
            <div key={String(k)} className="flex justify-between gap-4" style={{ fontSize: 12 }}>
              <span className="text-slate-400">{k}</span>
              <span className="text-slate-700 text-right" style={{ fontFamily: k === 'Sample #' || k === 'TAT' || k === 'Received' || k === 'Resulted' ? 'DM Mono, monospace' : 'inherit' }}>{v}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="font-semibold text-slate-600 mb-2" style={{ fontSize: 11 }}>Tests ({sample.tests.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {sample.tests.map(t => (
              <span key={t} className="px-2 py-1 rounded-lg" style={{ fontSize: 11, background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2 flex-shrink-0 border-t border-slate-100">
        {isCritical && (
          <button className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2" style={{ background: CRIT_RED, color: '#fff', fontSize: 13 }}>
            <Phone className="w-4 h-4" /> Notify Doctor Now
          </button>
        )}
        <button className="w-full py-2 rounded-xl font-semibold flex items-center justify-center gap-2" style={{ background: '#EEF2FF', color: LAB_ACCENT, border: '1px solid #C7D2FE', fontSize: 13 }}>
          <FileText className="w-4 h-4" /> View Full Result
        </button>
        <button className="w-full py-2 rounded-xl font-medium text-slate-500 bg-slate-50 border border-slate-200 flex items-center justify-center gap-2" style={{ fontSize: 13 }}>
          <Printer className="w-4 h-4" /> Print Label
        </button>
      </div>
    </div>
  );
};

// ─── IMAGING STUDY CARD ───────────────────────────────────────────────────────
const ImagingStudyCard: React.FC<{ study: ImagingStudy; onClick: () => void }> = ({ study, onClick }) => {
  const mm = modalityMeta[study.modality] || modalityMeta.CT;
  const isScanning  = study.status === 'scanning';
  const isOverdue   = study.status === 'report_overdue';
  const isPending   = study.status === 'report_pending';
  const isScheduled = study.status === 'scheduled';
  const isComplete  = study.status === 'complete' || study.status === 'released';

  const statusBadge = isScanning  ? { bg: '#F5F3FF', color: VIOLET, label: '● Scanning' }
    : isOverdue  ? { bg: '#FEF2F2', color: CRIT_RED, label: '! Overdue' }
    : isPending  ? { bg: '#FFFBEB', color: AMBER,    label: 'Report' }
    : isScheduled? { bg: '#EFF6FF', color: RAD_ACCENT,label: 'Scheduled' }
    : { bg: '#F0FDF4', color: EMERALD, label: '✓ Done' };

  const rowBg = isScanning  ? 'rgba(245,243,255,0.5)'
    : isOverdue   ? 'rgba(254,242,242,0.4)'
    : isScheduled ? 'rgba(239,246,255,0.4)'
    : '#fff';

  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors"
      style={{ borderBottom: '1px solid #F1F5F9', borderLeft: `3px solid ${isScanning ? VIOLET : mm.leftBorder}`, background: rowBg }}
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = mm.bg; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = rowBg; }}
    >
      {/* Modality badge */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold flex-shrink-0" style={{ background: mm.bg, color: mm.text, border: `1px solid ${mm.border}`, fontFamily: 'DM Mono, monospace', fontSize: 9 }}>
        {mm.abbr}
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#94A3B8', lineHeight: 1 }}>{study.accession}</div>
        <div className="font-semibold text-slate-800 truncate mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12 }}>{study.patientName}</div>
        <div className="text-slate-500 truncate" style={{ fontSize: 11 }}>{study.studyType}</div>
        {study.doctor && <div className="text-slate-400 truncate" style={{ fontSize: 10 }}>{study.doctor}{study.doctorSpecialty ? ` · ${study.doctorSpecialty}` : ''}</div>}
        {isScanning && (
          <div className="mt-1.5">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#EDE9FE' }}>
              <div className="h-full rounded-full" style={{ width: `${study.scanProgressPct}%`, background: VIOLET, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: VIOLET, marginTop: 2 }}>
              {study.scanElapsed}m elapsed · ~{study.scanRemaining}m rem.
            </div>
          </div>
        )}
        {(isPending || isOverdue) && (
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: isOverdue ? CRIT_RED : AMBER, marginTop: 2 }}>
            {study.reportPendingHours}h ago{isOverdue ? ' — OVERDUE' : ''}{study.queuePosition ? ` · #${study.queuePosition}/9` : ''}
          </div>
        )}
        {isScheduled && (
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: RAD_ACCENT }}>{study.scheduledTime}{study.scheduledTimeRelative ? ` · ${study.scheduledTimeRelative}` : ''}</span>
            {study.contrastAlert && <span style={{ fontSize: 9, color: AMBER }}>⚠ Contrast</span>}
            {study.fdgAlert && <span style={{ fontSize: 9, color: AMBER }}>⚠ FDG</span>}
            {study.patientArrived === true && <span style={{ fontSize: 9, color: EMERALD }}>✓ Arrived</span>}
            {study.patientArrived === false && <span style={{ fontSize: 9, color: '#94A3B8' }}>Not arrived</span>}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap" style={{ fontSize: 9, background: statusBadge.bg, color: statusBadge.color }}>
          {statusBadge.label}
        </span>
        {isScanning && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: VIOLET }}>{study.scanRemaining}m</span>}
        {isOverdue && <span style={{ fontSize: 9, color: CRIT_RED, fontFamily: 'DM Mono, monospace' }}>ESCALATE</span>}
      </div>
    </div>
  );
};

// ─── IMAGING STUDY DETAIL PANEL ───────────────────────────────────────────────
const ImagingDetailPanel: React.FC<{ study: ImagingStudy; onClose: () => void }> = ({ study, onClose }) => {
  const mm = modalityMeta[study.modality] || modalityMeta.CT;
  const isScanning = study.status === 'scanning';
  const isReport   = study.status === 'report_pending' || study.status === 'report_overdue';
  const isScheduled = study.status === 'scheduled';
  const headerBg   = isScanning ? '#F5F3FF' : isReport ? '#FFFBEB' : mm.bg;
  const headerBorder = isScanning ? VIOLET : isReport ? AMBER : mm.leftBorder;

  const pipeline = ['Ordered', 'Scheduled', 'Arrived', 'Consent', 'Scanning', 'Complete', 'Report', 'Released', 'NABIDH'];
  const activeIdx = isScanning ? 4 : isReport ? 6 : isScheduled ? 2 : 1;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col bg-white" style={{ width: 420, borderLeft: '1px solid #E2E8F0', boxShadow: '-4px 0 32px rgba(0,0,0,0.1)' }}>
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #F1F5F9', background: headerBg, borderTop: `3px solid ${headerBorder}` }}>
        <div>
          <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>{study.modality} Study Detail</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: mm.text }}>{study.accession}</div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Patient */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>{study.patientName}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B', marginTop: 2 }}>
            {study.patientAge}{study.patientGender}{study.patientBloodGroup ? ` · ${study.patientBloodGroup}` : ''} · {study.patientId}
          </div>
          {study.insurance && <div className="text-blue-600 mt-0.5" style={{ fontSize: 11 }}>{study.insurance}</div>}
          {study.conditions?.map(c => <div key={c} className="text-teal-600" style={{ fontSize: 11 }}>• {c}</div>)}
        </div>

        {/* Study info */}
        <div className="space-y-2">
          {([
            ['Modality', `${study.modality} — ${study.studyType}`],
            study.scanner      ? ['Scanner',      study.scanner] : null,
            study.room         ? ['Room',         study.room] : null,
            study.protocol     ? ['Protocol',     study.protocol] : null,
            study.contrast     ? ['Contrast',     study.contrast] : null,
            study.technologist ? ['Technologist', study.technologist] : null,
            ['Doctor', `${study.doctor}${study.doctorSpecialty ? ' · ' + study.doctorSpecialty : ''}`],
          ] as ([string, string] | null)[]).filter(Boolean).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4" style={{ fontSize: 12 }}>
              <span className="text-slate-400 flex-shrink-0">{k}</span>
              <span className="text-slate-700 text-right">{v}</span>
            </div>
          ))}
        </div>

        {/* Scan progress */}
        {isScanning && study.sequences && (
          <div className="p-4 rounded-xl" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <div className="flex items-center gap-4 mb-3">
              <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#DDD6FE" strokeWidth="8" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke={VIOLET} strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - (study.scanProgressPct || 55) / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: 700, color: VIOLET }}>{study.scanProgressPct}%</span>
                </div>
              </div>
              <div>
                <div className="font-semibold text-violet-700" style={{ fontSize: 12 }}>Scanning in Progress</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B', marginTop: 2 }}>{study.scanElapsed}m elapsed · {study.scanRemaining}m remaining</div>
                {study.scanner && <div className="text-slate-500 mt-1" style={{ fontSize: 11 }}>{study.scanner}</div>}
              </div>
            </div>
            <div className="space-y-1.5">
              {study.sequences.map(seq => (
                <div key={seq.name} className="flex items-center gap-2" style={{ fontSize: 12, color: seq.status === 'done' ? EMERALD : seq.status === 'active' ? VIOLET : '#94A3B8' }}>
                  {seq.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    : seq.status === 'active' ? <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin flex-shrink-0" />
                    : <div className="w-3.5 h-3.5 rounded-full border border-slate-200 flex-shrink-0" />}
                  <span className="flex-1">{seq.name}</span>
                  <span className="text-slate-300" style={{ fontSize: 10 }}>{seq.duration}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous study */}
        {study.previousStudy && (
          <div className="p-3 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <div className="font-semibold text-blue-600 mb-1" style={{ fontSize: 11 }}>Previous Study (NABIDH)</div>
            <div className="text-slate-700" style={{ fontSize: 11 }}>{study.previousStudy.date} · {study.previousStudy.facility}</div>
            <div className="text-slate-500" style={{ fontSize: 11 }}>Finding: {study.previousStudy.finding}</div>
          </div>
        )}

        {/* Pipeline */}
        <div>
          <div className="text-slate-400 mb-2" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pipeline Status</div>
          <div className="flex flex-wrap gap-1">
            {pipeline.map((step, i) => {
              const done   = i < activeIdx;
              const active = i === activeIdx;
              return (
                <React.Fragment key={step}>
                  <div className="px-1.5 py-0.5 rounded font-semibold" style={{
                    fontSize: 9,
                    background: done ? '#F0FDF4' : active ? '#F5F3FF' : '#F8FAFC',
                    color: done ? EMERALD : active ? VIOLET : '#94A3B8',
                    border: `1px solid ${done ? '#BBF7D0' : active ? '#DDD6FE' : '#E2E8F0'}`,
                  }}>
                    {done ? '✓' : active ? '●' : '○'} {step}
                  </div>
                  {i < pipeline.length - 1 && <ChevronRight className="w-2.5 h-2.5 text-slate-200" style={{ alignSelf: 'center', flexShrink: 0 }} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Clinical notes */}
        {study.clinicalNotes && (
          <div className="p-3 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <div className="font-semibold text-blue-600 mb-1.5" style={{ fontSize: 11 }}>Clinical Notes</div>
            <div className="text-slate-700" style={{ fontSize: 12, lineHeight: 1.6 }}>{study.clinicalNotes}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2 flex-shrink-0 border-t border-slate-100">
        {isScanning && <>
          <button className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2" style={{ background: mm.bg, color: mm.text, border: `1px solid ${mm.border}`, fontSize: 13 }}>
            <ClipboardList className="w-4 h-4" /> View Full Protocol
          </button>
          <button className="w-full py-2 rounded-xl font-medium text-slate-500 bg-slate-50 border border-slate-200 flex items-center justify-center gap-2" style={{ fontSize: 13 }}>
            <MessageSquare className="w-4 h-4" /> Message Doctor
          </button>
          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-1" style={{ background: '#FFFBEB', color: AMBER, border: '1px solid #FDE68A', fontSize: 12 }}>
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
            <button className="flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-1" style={{ background: '#FEF2F2', color: CRIT_RED, border: '1px solid #FECACA', fontSize: 12 }}>
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          </div>
        </>}
        {isReport && <>
          <button className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2" style={{ background: AMBER, color: '#fff', fontSize: 13 }}>
            <FileText className="w-4 h-4" /> Open in Reporting Workstation
          </button>
          <button className="w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2" style={{ background: '#FFFBEB', color: AMBER, border: '1px solid #FDE68A', fontSize: 13 }}>
            <Phone className="w-4 h-4" /> Alert Radiologist
          </button>
          <button className="w-full py-2 rounded-xl font-medium text-slate-500 bg-slate-50 border border-slate-200 flex items-center justify-center gap-2" style={{ fontSize: 13 }}>
            <MessageSquare className="w-4 h-4" /> Message Doctor
          </button>
        </>}
        {isScheduled && <>
          {study.contrastAlert && (
            <button className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2" style={{ background: '#FFFBEB', color: AMBER, border: '1px solid #FDE68A', fontSize: 13 }}>
              <ClipboardList className="w-4 h-4" /> Get Contrast Consent
            </button>
          )}
          {study.fdgAlert && (
            <div className="p-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <div className="font-semibold text-amber-700" style={{ fontSize: 11 }}>⚠ FDG Injection Required</div>
              <div className="text-amber-600" style={{ fontSize: 11 }}>Inject at 2:30 PM (60 min before scan)</div>
            </div>
          )}
          <button className="w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2" style={{ background: '#EFF6FF', color: RAD_ACCENT, border: '1px solid #BFDBFE', fontSize: 13 }}>
            <CheckCircle2 className="w-4 h-4" /> Confirm Patient Arrival
          </button>
        </>}
      </div>
    </div>
  );
};

// ─── LAB COLUMN ───────────────────────────────────────────────────────────────
type LabDeptFilter = 'all' | 'Chemistry' | 'Haematology' | 'Immunology' | 'Coagulation' | 'Microbiology';
type LabPrioFilter = 'all' | 'stat' | 'urgent' | 'routine';

const LabColumn: React.FC<{ expanded: boolean; onNavigate?: (p: string) => void; loaded: boolean }> = ({ expanded, onNavigate, loaded }) => {
  const [deptFilter, setDeptFilter] = useState<LabDeptFilter>('all');
  const [prioFilter, setPrioFilter] = useState<LabPrioFilter>('all');
  const [selectedSample, setSelectedSample] = useState<LabSample | null>(null);
  const [showAllResulted, setShowAllResulted] = useState(false);

  const base = deptFilter === 'all' ? labSamples : labSamples.filter(s => s.department === deptFilter);
  const filtered = prioFilter === 'all' ? base : base.filter(s => s.priority === prioFilter);

  const critical = filtered.filter(s => s.status === 'critical');
  const running  = filtered.filter(s => s.status === 'running');
  const pending  = filtered.filter(s => s.status === 'pending' || s.status === 'received');
  const resulted = filtered.filter(s => s.status === 'resulted' || s.status === 'verified');

  if (!loaded) {
    return (
      <div className="flex flex-col min-w-0 rounded-2xl overflow-hidden bg-white"
        style={{ flex: expanded ? '0 0 60%' : '0 0 38%', border: '1px solid #E2E8F0', borderTop: `3px solid ${LAB_ACCENT}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="p-4 space-y-3 border-b border-slate-100">
          <Shimmer h={18} w="40%" rounded="6px" />
          <Shimmer h={12} w="60%" rounded="4px" />
          <div className="flex gap-1.5">{[...Array(5)].map((_, i) => <Shimmer key={i} h={24} w="60px" rounded="8px" />)}</div>
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[...Array(6)].map((_, i) => <Shimmer key={i} h={56} rounded="8px" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-w-0 rounded-2xl overflow-hidden bg-white"
        style={{ flex: expanded ? '0 0 60%' : '0 0 38%', border: '1px solid #E2E8F0', borderTop: `3px solid ${LAB_ACCENT}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
                <FlaskConical className="w-4 h-4" style={{ color: LAB_ACCENT }} /> Lab Queue
              </div>
              <div className="mt-0.5" style={{ fontSize: 11 }}>
                <span className="font-semibold" style={{ color: CRIT_RED }}>{critical.length} critical</span>
                <span className="text-slate-300 mx-1">·</span>
                <span style={{ color: LAB_ACCENT }}>{running.length} running</span>
                <span className="text-slate-300 mx-1">·</span>
                <span className="text-slate-400">{pending.length} pending</span>
              </div>
            </div>
            <button onClick={() => onNavigate?.('lab')} className="flex items-center gap-1 transition-colors" style={{ fontSize: 10, color: LAB_ACCENT }}>
              Full Portal <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {/* Priority pills */}
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            {([['all', 'All'], ['stat', 'STAT (1)'], ['urgent', 'Urgent (3)'], ['routine', 'Routine']] as [LabPrioFilter, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setPrioFilter(k)}
                className="px-2 py-0.5 rounded-lg font-bold transition-all"
                style={{ fontSize: 9, background: prioFilter === k ? (k === 'stat' ? '#FEE2E2' : k === 'urgent' ? '#FFFBEB' : '#F1F5F9') : '#F8FAFC', color: prioFilter === k ? (k === 'stat' ? CRIT_RED : k === 'urgent' ? AMBER : '#334155') : '#94A3B8', border: `1px solid ${prioFilter === k ? (k === 'stat' ? '#FECACA' : k === 'urgent' ? '#FDE68A' : '#CBD5E1') : '#E2E8F0'}` }}>
                {l}
              </button>
            ))}
          </div>
          {/* Dept filter */}
          <div className="flex items-center gap-1 flex-wrap">
            {(['all', 'Chemistry', 'Haematology', 'Immunology', 'Coagulation', 'Microbiology'] as LabDeptFilter[]).map(f => (
              <button key={f} onClick={() => setDeptFilter(f)}
                className="px-2 py-0.5 rounded-lg font-semibold transition-all"
                style={{ fontSize: 9, background: deptFilter === f ? (deptAccent[f] || LAB_ACCENT) + '18' : '#F8FAFC', color: deptFilter === f ? (deptAccent[f] || LAB_ACCENT) : '#94A3B8', border: `1px solid ${deptFilter === f ? (deptAccent[f] || LAB_ACCENT) + '30' : '#E2E8F0'}` }}>
                {f === 'all' ? 'All Depts' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Queue */}
        <div className="flex-1 overflow-y-auto">
          {critical.length > 0 && <>
            <QueueSection label="Critical — Unnotified" count={critical.length} accent={CRIT_RED} bg="#FEF2F2" />
            {critical.map(s => <LabSampleRow key={s.id} sample={s} onSelect={setSelectedSample} />)}
          </>}
          {running.length > 0 && <>
            <QueueSection label="Running" count={running.length} accent={LAB_ACCENT} bg="#EEF2FF" />
            {running.map(s => <LabSampleRow key={s.id} sample={s} onSelect={setSelectedSample} />)}
          </>}
          {pending.length > 0 && <>
            <QueueSection label="Pending" count={pending.length} accent={RAD_ACCENT} bg="#EFF6FF" />
            {pending.map(s => <LabSampleRow key={s.id} sample={s} onSelect={setSelectedSample} />)}
          </>}
          {resulted.length > 0 && <>
            <QueueSection label="Resulted" count={resulted.length} accent={EMERALD} bg="#F0FDF4" />
            {resulted.slice(0, showAllResulted ? undefined : 3).map(s => <LabSampleRow key={s.id} sample={s} onSelect={setSelectedSample} />)}
            {!showAllResulted && resulted.length > 3 && (
              <button onClick={() => setShowAllResulted(true)} className="w-full py-2 flex items-center justify-center gap-1.5 transition-colors hover:bg-indigo-50" style={{ fontSize: 11, color: LAB_ACCENT }}>
                <ChevronDown className="w-3.5 h-3.5" /> {resulted.length - 3} more resulted
              </button>
            )}
          </>}
          {filtered.length === 0 && <div className="py-12 text-center text-slate-400" style={{ fontSize: 12 }}>No samples match this filter</div>}
        </div>

        {/* Critical footer */}
        <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between" style={{ background: '#FEF2F2', borderTop: '1px solid #FECACA' }}>
          <div>
            <div className="font-bold" style={{ fontSize: 11, color: CRIT_RED }}>1 critical unnotified</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#FCA5A5' }}>Ibrahim K⁺ 6.8 · 44 min elapsed</div>
          </div>
          <button className="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity" style={{ background: CRIT_RED, color: '#fff', fontSize: 11 }}>
            <Phone className="w-3 h-3" /> Notify Now
          </button>
        </div>
      </div>

      {/* Lab detail slide panel */}
      {selectedSample && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)' }} onClick={() => setSelectedSample(null)} />
          <LabDetailPanel sample={selectedSample} onClose={() => setSelectedSample(null)} />
        </>
      )}
    </>
  );
};

// ─── RADIOLOGY COLUMN ─────────────────────────────────────────────────────────
type ModalityFilter = 'all' | 'MRI' | 'CT' | 'USS' | 'XR' | 'PET';

const RadiologyColumn: React.FC<{ expanded: boolean; loaded: boolean; onStudySelect: (s: ImagingStudy) => void }> = ({ expanded, loaded, onStudySelect }) => {
  const [modFilter, setModFilter] = useState<ModalityFilter>('all');
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllScheduled, setShowAllScheduled] = useState(false);

  const applyMod = (arr: ImagingStudy[]) => modFilter === 'all' ? arr : arr.filter(s => s.modality === modFilter);

  const scanning  = applyMod(imagingStudies.filter(s => s.status === 'scanning'));
  const pending   = applyMod(imagingStudies.filter(s => s.status === 'report_pending' || s.status === 'report_overdue'));
  const scheduled = applyMod(imagingStudies.filter(s => s.status === 'scheduled'));

  if (!loaded) {
    return (
      <div className="flex flex-col min-w-0 rounded-2xl overflow-hidden bg-white"
        style={{ flex: expanded ? '0 0 60%' : '0 0 38%', border: '1px solid #E2E8F0', borderTop: `3px solid ${RAD_ACCENT}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="p-4 space-y-3 border-b border-slate-100">
          <Shimmer h={18} w="50%" rounded="6px" />
          <Shimmer h={12} w="65%" rounded="4px" />
          <div className="flex gap-1.5">{[...Array(6)].map((_, i) => <Shimmer key={i} h={24} w="50px" rounded="8px" />)}</div>
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[...Array(7)].map((_, i) => <Shimmer key={i} h={72} rounded="8px" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0 rounded-2xl overflow-hidden bg-white"
      style={{ flex: expanded ? '0 0 60%' : '0 0 38%', border: '1px solid #E2E8F0', borderTop: `3px solid ${RAD_ACCENT}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex-shrink-0 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-bold text-slate-800 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
              <ScanLine className="w-4 h-4" style={{ color: RAD_ACCENT }} /> Imaging Queue
            </div>
            <div className="mt-0.5" style={{ fontSize: 11 }}>
              <span className="font-semibold" style={{ color: VIOLET }}>{scanning.length} scanning now</span>
              <span className="text-slate-300 mx-1">·</span>
              <span style={{ color: AMBER }}>{pending.length} rpt pending</span>
              <span className="text-slate-300 mx-1">·</span>
              <span style={{ color: RAD_ACCENT }}>{scheduled.length} scheduled</span>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors hover:bg-blue-100" style={{ fontSize: 10, background: '#EFF6FF', color: RAD_ACCENT, border: '1px solid #BFDBFE' }}>
            <Plus className="w-3 h-3" /> New Study
          </button>
        </div>
        {/* Modality filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'MRI', 'CT', 'USS', 'XR', 'PET'] as ModalityFilter[]).map(m => {
            const mm = m !== 'all' ? modalityMeta[m] : null;
            return (
              <button key={m} onClick={() => setModFilter(m)}
                className="px-2 py-0.5 rounded-lg font-bold transition-all"
                style={{ fontSize: 9, background: modFilter === m ? (mm ? mm.bg : '#F1F5F9') : '#F8FAFC', color: modFilter === m ? (mm ? mm.text : '#334155') : '#94A3B8', border: `1px solid ${modFilter === m ? (mm ? mm.border : '#CBD5E1') : '#E2E8F0'}` }}>
                {m === 'all' ? 'All' : m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-y-auto">
        {scanning.length > 0 && <>
          <QueueSection label="Active Now" count={scanning.length} accent={VIOLET} bg="#F5F3FF" />
          {scanning.map(s => <ImagingStudyCard key={s.id} study={s} onClick={() => onStudySelect(s)} />)}
        </>}
        {pending.length > 0 && <>
          <QueueSection label="Report Pending" count={pending.length} accent={AMBER} bg="#FFFBEB" />
          {pending.slice(0, showAllPending ? undefined : 4).map(s => <ImagingStudyCard key={s.id} study={s} onClick={() => onStudySelect(s)} />)}
          {!showAllPending && pending.length > 4 && (
            <button onClick={() => setShowAllPending(true)} className="w-full py-2 flex items-center justify-center gap-1.5 hover:bg-amber-50 transition-colors" style={{ fontSize: 11, color: AMBER }}>
              <ChevronDown className="w-3.5 h-3.5" /> {pending.length - 4} more pending
            </button>
          )}
        </>}
        {scheduled.length > 0 && <>
          <QueueSection label="Scheduled Today" count={scheduled.length} accent={RAD_ACCENT} bg="#EFF6FF" />
          {scheduled.slice(0, showAllScheduled ? undefined : 4).map(s => <ImagingStudyCard key={s.id} study={s} onClick={() => onStudySelect(s)} />)}
          {!showAllScheduled && scheduled.length > 4 && (
            <button onClick={() => setShowAllScheduled(true)} className="w-full py-2 flex items-center justify-center gap-1.5 hover:bg-blue-50 transition-colors" style={{ fontSize: 11, color: RAD_ACCENT }}>
              <ChevronDown className="w-3.5 h-3.5" /> {scheduled.length - 4} more scheduled
            </button>
          )}
        </>}
        {scanning.length === 0 && pending.length === 0 && scheduled.length === 0 && (
          <div className="py-12 text-center text-slate-400" style={{ fontSize: 12 }}>No studies match this filter</div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between" style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
        <span style={{ fontSize: 10, color: '#64748B' }}>
          <span className="font-semibold" style={{ color: EMERALD }}>28 done</span> · <span style={{ color: AMBER }}>9 pending</span>
        </span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>
          TAT <span className="font-bold" style={{ color: RAD_ACCENT }}>3.8h</span>
        </span>
        <span className="text-slate-400" style={{ fontSize: 10 }}>Dr. Rania: 9 queued</span>
      </div>
    </div>
  );
};

// ─── RIGHT COLUMN ─────────────────────────────────────────────────────────────
const RightColumn: React.FC<{ loaded: boolean }> = ({ loaded }) => {
  const [volumeTab, setVolumeTab] = useState<'both' | 'lab' | 'rad'>('both');

  if (!loaded) {
    return (
      <div className="overflow-y-auto space-y-3" style={{ flex: '0 0 24%', minWidth: 220 }}>
        {[160, 200, 160, 140, 160].map((h, i) => <Shimmer key={i} h={h} rounded="16px" />)}
      </div>
    );
  }

  return (
    <div className="overflow-y-auto space-y-3" style={{ flex: '0 0 24%', minWidth: 220 }}>

      {/* Equipment */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Equipment</span>
          <button className="font-medium transition-colors hover:text-teal-700" style={{ fontSize: 10, color: '#0D9488' }}>View All →</button>
        </div>
        <div className="px-4 py-3 space-y-0.5">
          <div className="font-bold mb-2" style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: RAD_ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Radiology</div>
          {equipmentItems.radiology.map(e => {
            const dot = e.status === 'online' ? EMERALD : e.status === 'scanning' || e.status === 'running' ? VIOLET : e.status === 'maintenance' ? CRIT_RED : e.status === 'partial' ? AMBER : RAD_ACCENT;
            const info = e.status === 'maintenance' ? CRIT_RED : e.status === 'scanning' || e.status === 'running' ? VIOLET : '#94A3B8';
            return (
              <div key={e.name} className="flex items-center gap-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
                <span className="flex-1 truncate text-slate-600" style={{ fontSize: 11 }}>{e.name}</span>
                <span className="truncate text-right" style={{ fontSize: 9, color: info, maxWidth: 110 }}>{e.info}</span>
              </div>
            );
          })}
          <div className="my-2 border-t border-slate-100" />
          <div className="font-bold mb-2" style={{ fontSize: 8, fontFamily: 'DM Mono, monospace', color: LAB_ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Laboratory</div>
          {equipmentItems.lab.map(e => {
            const dot = e.status === 'online' ? EMERALD : e.status === 'running' ? VIOLET : e.status === 'maintenance' ? CRIT_RED : AMBER;
            const info = e.status === 'maintenance' ? CRIT_RED : e.status === 'running' ? VIOLET : '#94A3B8';
            return (
              <div key={e.name} className="flex items-center gap-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
                <span className="flex-1 truncate text-slate-600" style={{ fontSize: 11 }}>{e.name}</span>
                <span className="truncate text-right" style={{ fontSize: 9, color: info, maxWidth: 110 }}>{e.info}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* TAT Monitor */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100">
          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Turnaround Times</span>
        </div>
        <div className="px-3 pt-2 pb-3">
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={tatData} barCategoryGap="25%" margin={{ top: 4, right: 4, bottom: 0, left: -26 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="dept" tick={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 6]} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, background: '#fff', border: '1px solid #E2E8F0', color: '#334155' }} formatter={(v: number) => [`${v}h`, 'TAT']} />
              <ReferenceLine y={4} stroke="#C7D2FE" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '4h', fontSize: 8, fill: '#94A3B8', position: 'right' }} />
              <ReferenceLine y={3} stroke="#BFDBFE" strokeDasharray="4 4" strokeWidth={1.5} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={600}>
                {tatData.map((e, i) => (
                  <Cell key={i} fill={e.value > e.target ? CRIT_RED : e.value > e.target * 0.92 ? AMBER : e.type === 'lab' ? LAB_ACCENT : RAD_ACCENT} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 px-3 py-2 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div className="font-medium" style={{ fontSize: 10, color: '#92400E' }}>⚠ MRI report TAT 4.8h vs 4h target — 9 in queue</div>
            <button className="mt-0.5 hover:underline" style={{ fontSize: 10, color: AMBER }}>Escalate →</button>
          </div>
        </div>
      </div>

      {/* NABIDH */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" style={{ color: VIOLET }} />
            <span className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>NABIDH</span>
          </div>
          <span className="text-slate-400" style={{ fontSize: 10 }}>🇦🇪 FHIR R4</span>
        </div>
        <div className="p-4 space-y-3">
          {[{ label: 'Lab', count: '42/47', sub: '5 pending', pct: 89, color: LAB_ACCENT, bg: '#EEF2FF' }, { label: 'Radiology', count: '25/28', sub: '3 pending', pct: 89, color: RAD_ACCENT, bg: '#EFF6FF' }].map(r => (
            <div key={r.label}>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500" style={{ fontSize: 11 }}>{r.label}</span>
                <div className="text-right">
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: r.color, fontWeight: 700 }}>{r.count}</span>
                  <span className="text-slate-400 ml-1" style={{ fontSize: 10 }}>· {r.sub}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: r.bg }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${r.pct}%`, background: r.color }} />
              </div>
            </div>
          ))}
          <div style={{ paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
            <div className="flex justify-between mb-2" style={{ fontSize: 11, color: '#64748B' }}>
              <span>Total</span>
              <span style={{ fontFamily: 'DM Mono, monospace', color: '#334155', fontWeight: 700 }}>67/75 · 8 pending</span>
            </div>
            <button className="w-full py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors" style={{ background: '#F5F3FF', color: VIOLET, border: '1px solid #DDD6FE', fontSize: 12 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#EDE9FE'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F3FF'; }}>
              <Upload className="w-3.5 h-3.5" /> Submit Pending (8)
            </button>
          </div>
        </div>
      </div>

      {/* Volume chart */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Volume Today</span>
          <div className="flex gap-0.5 rounded-lg overflow-hidden" style={{ background: '#F1F5F9', padding: 2 }}>
            {(['both', 'lab', 'rad'] as const).map(k => (
              <button key={k} onClick={() => setVolumeTab(k)}
                className="px-2 py-0.5 font-bold transition-all rounded"
                style={{ fontSize: 10, background: volumeTab === k ? '#fff' : 'transparent', color: volumeTab === k ? '#334155' : '#94A3B8', boxShadow: volumeTab === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {k === 'both' ? 'Both' : k === 'lab' ? 'Lab' : 'Rad'}
              </button>
            ))}
          </div>
        </div>
        <div className="px-3 pt-2 pb-1">
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={volumeData} margin={{ top: 2, right: 4, bottom: 0, left: -26 }}>
              <defs>
                <linearGradient id="volLab" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={LAB_ACCENT} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={LAB_ACCENT} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="volRad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={RAD_ACCENT} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={RAD_ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, background: '#fff', border: '1px solid #E2E8F0', color: '#334155' }} animationDuration={100} />
              {(volumeTab !== 'rad') && <Area type="monotone" dataKey="lab" stroke={LAB_ACCENT} strokeWidth={2} fill="url(#volLab)" name="Lab" dot={false} animationDuration={800} />}
              {(volumeTab !== 'lab') && <Area type="monotone" dataKey="rad" stroke={RAD_ACCENT} strokeWidth={2} fill="url(#volRad)" name="Radiology" dot={false} animationDuration={800} />}
            </AreaChart>
          </ResponsiveContainer>
          <div className="text-center py-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#94A3B8' }}>
            234 lab + 47 imaging = <span className="font-bold text-slate-700">281 total</span>
          </div>
        </div>
      </div>

      {/* Shift handoff */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-100">
          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="font-bold text-amber-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>Handoff in 53 min</span>
        </div>
        <div className="p-3 space-y-1">
          <div className="font-bold mb-1.5" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: LAB_ACCENT }}>Lab</div>
          {[
            { icon: '⚠', text: '1 critical unnotified (Ibrahim)', color: CRIT_RED },
            { icon: '⏳', text: '14 samples pending', color: AMBER },
            { icon: '⏳', text: '5 NABIDH pending', color: AMBER },
            { icon: '✓', text: 'QC logs complete', color: EMERALD },
          ].map(r => (
            <div key={r.text} className="flex items-start gap-1.5" style={{ fontSize: 11, color: r.color }}>
              <span className="flex-shrink-0">{r.icon}</span><span>{r.text}</span>
            </div>
          ))}
          <div className="font-bold mt-2 mb-1.5" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: RAD_ACCENT }}>Radiology</div>
          {[
            { icon: '⏳', text: '9 reports pending radiologist', color: AMBER },
            { icon: '⏳', text: 'PET-CT 3:30 PM (after shift)', color: AMBER },
            { icon: '⏳', text: '3 NABIDH pending', color: AMBER },
            { icon: '⚠', text: 'MRI TAT overdue — escalate', color: CRIT_RED },
          ].map(r => (
            <div key={r.text} className="flex items-start gap-1.5" style={{ fontSize: 11, color: r.color }}>
              <span className="flex-shrink-0">{r.icon}</span><span>{r.text}</span>
            </div>
          ))}
          <button className="w-full mt-2 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors"
            style={{ background: '#FEF3C7', color: AMBER, border: '1px solid #FDE68A', fontSize: 12 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FDE68A'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF3C7'; }}>
            <Printer className="w-3.5 h-3.5" /> Generate Handoff Report
          </button>
        </div>
      </div>

    </div>
  );
};

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
const DiagnosticsDashboard: React.FC<{ deptFilter: DeptFilter; onNavigate?: (page: string) => void }> = ({ deptFilter, onNavigate }) => {
  const [loaded, setLoaded] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const t = setTimeout(() => setLoaded(true), 250);
    return () => clearTimeout(t);
  }, []);

  const showLab = deptFilter !== 'radiology';
  const showRad = deptFilter !== 'lab';

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: '#F8FAFC' }}>

      {/* Critical banner — always immediate */}
      <CriticalBanner />

      {/* KPI Strip with shimmer */}
      <KpiStrip deptFilter={deptFilter} loaded={loaded} />

      {/* 3-col layout — fills remaining height exactly */}
      <div className="flex-1 min-h-0 px-5 py-3 flex gap-4 overflow-hidden">

        {showLab && (
          <LabColumn expanded={!showRad} onNavigate={onNavigate} loaded={loaded} />
        )}

        {showRad && (
          <RadiologyColumn expanded={!showLab} loaded={loaded} onStudySelect={s => { setSelectedStudy(null); requestAnimationFrame(() => setSelectedStudy(s)); }} />
        )}

        <RightColumn loaded={loaded} />
      </div>

      {/* Imaging study detail overlay */}
      {selectedStudy && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)' }} onClick={() => setSelectedStudy(null)} />
          <ImagingDetailPanel study={selectedStudy} onClose={() => setSelectedStudy(null)} />
        </>
      )}
    </div>
  );
};

export default DiagnosticsDashboard;
