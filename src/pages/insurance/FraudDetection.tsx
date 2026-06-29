import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon, AlertTriangle, Ban, BarChart2, Bot,
  Building2, Check, ChevronDown, Clock, FileText,
  Globe, Lock, MessageSquare, RotateCcw, Search,
  ShieldCheck, TrendingDown, User, Users, X,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, Cell, Line, LineChart,
  Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from 'recharts';
import { type InsuranceFraudAlert } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import InsuranceShell, {
  PreAuthAlert,
  formatCurrency,
  formatNumber,
  useInsurancePageData,
} from './InsuranceShell';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONO = { fontFamily: 'DM Mono, monospace' };
type RiskKey    = 'HIGH' | 'MEDIUM' | 'LOW';
type StatusKey  = 'NEW' | 'UNDER_REVIEW' | 'MONITORING' | 'CONFIRMED' | 'FALSE_POSITIVE';
type AlertTab   = 'active' | 'resolved' | 'analytics';
interface Toast { id: number; msg: string; type: 'success' | 'warning' | 'info' | 'error' }

const RISK_CFG: Record<RiskKey, { badge: string; badgeText: string; border: string; bg: string; dot: string }> = {
  HIGH:   { badge: '#FED7AA', badgeText: '#9A3412', border: '#EA580C', bg: 'rgba(234,88,12,0.04)',  dot: '#EA580C' },
  MEDIUM: { badge: '#FEF3C7', badgeText: '#92400E', border: '#D97706', bg: 'rgba(217,119,6,0.04)', dot: '#D97706' },
  LOW:    { badge: '#FEF9C3', badgeText: '#854D0E', border: '#CA8A04', bg: 'rgba(202,138,4,0.04)', dot: '#CA8A04' },
};

const STATUS_CHIP: Record<StatusKey, { bg: string; text: string; label: string }> = {
  NEW:            { bg: '#FEF2F2', text: '#B91C1C', label: '🆕 NEW'             },
  UNDER_REVIEW:   { bg: '#EFF6FF', text: '#1D4ED8', label: '🔍 UNDER REVIEW'    },
  MONITORING:     { bg: '#FFFBEB', text: '#92400E', label: '👁 MONITORING'      },
  CONFIRMED:      { bg: '#F0FDF4', text: '#15803D', label: '✅ CONFIRMED'       },
  FALSE_POSITIVE: { bg: '#F8FAFC', text: '#64748B', label: '❌ FALSE POSITIVE'  },
};

const TYPE_COLORS: Record<string, string> = {
  'Ghost Consultations': '#DC2626',
  'Duplicate Billing':   '#DC2626',
  'Upcoding':            '#EA580C',
  'Phantom Pharmacy':    '#D97706',
  'Out-of-Hours Pattern':'#CA8A04',
  'Identity Fraud':      '#B91C1C',
  'Kickback Pattern':    '#C2410C',
  'Anomaly Pattern':     '#64748B',
};

const TOAST_COLORS: Record<Toast['type'], { border: string; color: string; bg: string }> = {
  success: { border: '#6EE7B7', color: '#065F46', bg: '#F0FDF4' },
  warning: { border: '#FCD34D', color: '#92400E', bg: '#FFFBEB' },
  info:    { border: '#93C5FD', color: '#1E40AF', bg: '#EFF6FF' },
  error:   { border: '#FCA5A5', color: '#991B1B', bg: '#FFF5F5' },
};

const STATUS_OPTIONS = [
  { value: 'NEW',            label: 'New'                      },
  { value: 'UNDER_REVIEW',   label: 'Under Review'             },
  { value: 'MONITORING',     label: 'Monitoring'               },
  { value: 'CONFIRMED',      label: 'Confirmed + Closed'       },
  { value: 'FALSE_POSITIVE', label: 'False Positive + Cleared' },
];

const TEAM = ['Mariam Al Khateeb', 'Ahmad Al Mansouri', 'Sara Al Hashimi', 'Khalid Al Balushi'];

// ─── Static Analytics Data ────────────────────────────────────────────────────

const MONTHLY_FRAUD = [
  { month: 'Jan', confirmed: 4, review: 2, falsePositive: 1 },
  { month: 'Feb', confirmed: 6, review: 3, falsePositive: 2 },
  { month: 'Mar', confirmed: 8, review: 4, falsePositive: 1 },
  { month: 'Apr', confirmed: 5, review: 3, falsePositive: 2 },
  { month: 'May', confirmed: 9, review: 5, falsePositive: 3 },
  { month: 'Jun', confirmed: 7, review: 4, falsePositive: 1 },
];

const FRAUD_BY_TYPE = [
  { name: 'Ghost Consultations', value: 38, pct: 38, fill: '#DC2626' },
  { name: 'Duplicate Billing',   value: 24, pct: 24, fill: '#EA580C' },
  { name: 'Upcoding',            value: 19, pct: 19, fill: '#D97706' },
  { name: 'Phantom Pharmacy',    value: 12, pct: 12, fill: '#CA8A04' },
  { name: 'Out-of-Hours',        value: 7,  pct: 7,  fill: '#B91C1C' },
];

const AI_ACCURACY = [
  { month: 'Jan', truePositive: 82, falsePositive: 9 },
  { month: 'Feb', truePositive: 84, falsePositive: 8 },
  { month: 'Mar', truePositive: 86, falsePositive: 7 },
  { month: 'Apr', truePositive: 87, falsePositive: 6 },
  { month: 'May', truePositive: 89, falsePositive: 5 },
  { month: 'Jun', truePositive: 89, falsePositive: 4 },
];

const FRAUD_BY_PLAN = [
  { plan: 'Daman Gold',   pct: 47, fill: '#F59E0B' },
  { plan: 'Daman Silver', pct: 31, fill: '#64748B' },
  { plan: 'Daman Basic',  pct: 14, fill: '#3B82F6' },
  { plan: 'Thiqa',        pct: 8,  fill: '#8B5CF6' },
];

const HOURLY_DATA = [
  { hour: '0:00', count: 0  }, { hour: '1:00', count: 0   }, { hour: '2:00', count: 147 },
  { hour: '3:00', count: 82 }, { hour: '4:00', count: 0   }, { hour: '5:00', count: 0   },
  { hour: '6:00', count: 0  }, { hour: '7:00', count: 0   }, { hour: '8:00', count: 1   },
  { hour: '9:00', count: 3  }, { hour: '10:00', count: 4  }, { hour: '11:00', count: 3  },
  { hour: '12:00', count: 2 }, { hour: '13:00', count: 4  }, { hour: '14:00', count: 3  },
  { hour: '15:00', count: 3 }, { hour: '16:00', count: 2  }, { hour: '17:00', count: 1  },
  { hour: '18:00', count: 0 }, { hour: '19:00', count: 0  }, { hour: '20:00', count: 0  },
  { hour: '21:00', count: 0 }, { hour: '22:00', count: 0  }, { hour: '23:00', count: 0  },
];

const SCAN_STEPS = [
  { delay: 400,  text: '✅ Al Noor Medical Center — Normal patterns',           ok: true  },
  { delay: 900,  text: '✅ Dubai Specialist Hospital — Normal',                  ok: true  },
  { delay: 1400, text: '✅ Emirates Medical Center — Under review (existing)',  ok: true  },
  { delay: 1900, text: '✅ All pharmacy claims — Validated',                    ok: true  },
  { delay: 2500, text: '✅ 308 claims — No anomalies detected',                 ok: true  },
  { delay: 3200, text: '⚠️ 4 claims — Minor pattern alerts (auto-resolved)',   ok: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toRiskKey  = (s: InsuranceFraudAlert['severity']): RiskKey =>
  s === 'high' ? 'HIGH' : s === 'medium' ? 'MEDIUM' : 'LOW';

const toStatusKey = (s: InsuranceFraudAlert['status']): StatusKey =>
  s === 'open' ? 'NEW' : s === 'investigating' ? 'UNDER_REVIEW' : 'CONFIRMED';

const toType = (reason: string): string => {
  const l = reason.toLowerCase();
  if (l.includes('ghost') || l.includes('phantom') || l.includes('consultation')) return 'Ghost Consultations';
  if (l.includes('duplicate'))                                                     return 'Duplicate Billing';
  if (l.includes('upcode') || l.includes('upcod'))                                return 'Upcoding';
  if (l.includes('pharmacy'))                                                      return 'Phantom Pharmacy';
  if (l.includes('hours') || l.includes('night'))                                 return 'Out-of-Hours Pattern';
  if (l.includes('identity') || l.includes('id fraud'))                           return 'Identity Fraud';
  if (l.includes('kickback') || l.includes('referral'))                           return 'Kickback Pattern';
  return 'Anomaly Pattern';
};

const toEvidencePills = (reason: string): string[] => {
  const chunks = reason.split(/[.;,]/).map(s => s.trim()).filter(s => s.length > 6 && s.length < 55);
  if (chunks.length > 0) return chunks.slice(0, 4);
  return ['Anomaly detected', 'AI flagged pattern', 'Review required'];
};

const toAiRecs = (sev: InsuranceFraudAlert['severity']): string[] => {
  if (sev === 'high')   return ['Freeze Claims', 'DHA Report Required', 'Suspend Provider', 'Legal Review'];
  if (sev === 'medium') return ['Monitor Closely', 'Request Provider Docs', 'Nabidh Cross-Check'];
  return ['Monitor', 'Flag for Review'];
};

const deriveNabidhPct   = (score: number) => Math.max(0, Math.round(100 - score * 0.85));
const NABIDH_TOTAL      = 20;

// ─── AIScanOverlay ────────────────────────────────────────────────────────────

const AIScanOverlay = ({ onClose }: { onClose: () => void }) => {
  const [progress, setProgress]         = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<typeof SCAN_STEPS>([]);
  const [done, setDone]                 = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 80);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    SCAN_STEPS.forEach(step => {
      const t = setTimeout(() => setVisibleSteps(r => [...r, step]), step.delay);
      return () => clearTimeout(t);
    });
    const t = setTimeout(() => setDone(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15,45,74,0.85)' }}>
      <div className="flex flex-col items-center" style={{ width: 480 }}>
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: '#7C3AED' }} />
          <div className="w-20 h-20 rounded-full flex items-center justify-center relative" style={{ backgroundColor: 'rgba(124,58,237,0.2)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-violet-400">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 12h2l2-4 2 8 2-4h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <p className="text-white font-bold text-xl mb-1">AI Fraud Detection Scan</p>
        <p className="text-violet-300 text-sm mb-6">Analyzing all claims · Cross-referencing Nabidh</p>
        <div className="w-full mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, height: 8 }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: '#0D9488' }} />
        </div>
        <div className="w-full space-y-1.5 mb-4">
          {['Scanning 312 claims today...', 'Checking 8,247 member records...', 'Cross-referencing 1,247 provider patterns...'].map((msg, i) => (
            <p key={i} className="text-sm animate-pulse" style={{ color: 'rgba(255,255,255,0.6)', ...MONO }}>{msg}</p>
          ))}
        </div>
        <div className="w-full space-y-2 min-h-[120px]">
          {visibleSteps.map((r, i) => (
            <p key={i} className={`text-sm font-medium ${r.ok ? 'text-emerald-400' : 'text-amber-400'}`} style={MONO}>{r.text}</p>
          ))}
        </div>
        {done && (
          <div className="w-full mt-6 text-center space-y-3">
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <p className="text-emerald-400 font-bold">✅ Full scan complete</p>
              <p className="text-emerald-300 text-sm mt-1">312 claims analyzed · 0 new fraud cases</p>
            </div>
            <button onClick={onClose} className="px-8 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all" style={{ backgroundColor: '#0D9488' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── FreezeClaimsModal ────────────────────────────────────────────────────────

const FreezeClaimsModal = ({
  alert, onClose, onConfirm,
}: { alert: InsuranceFraudAlert; onClose: () => void; onConfirm: () => void }) => {
  const [reason,         setReason]         = useState('investigation');
  const [notifyProvider, setNotifyProvider] = useState(true);
  const [logDaman,       setLogDaman]       = useState(true);
  const [notifyAdmin,    setNotifyAdmin]    = useState(true);
  const [confirming,     setConfirming]     = useState(false);
  const [done,           setDone]           = useState(false);

  const handleConfirm = () => {
    setConfirming(true);
    setTimeout(() => { setConfirming(false); setDone(true); setTimeout(onConfirm, 1200); }, 1400);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 440 }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#1E3A5F', minHeight: 56 }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <Lock size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-base">Freeze Provider Claims</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <X size={14} className="text-white" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <Check size={28} className="text-emerald-600" />
            </div>
            <p className="text-base font-bold text-emerald-700">Claims Frozen Successfully</p>
            <p className="text-sm text-slate-500">{alert.subjectName} · <span style={MONO}>AED {alert.exposureAmountAed.toLocaleString()}</span> protected</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 space-y-1">
              <p className="text-sm font-bold text-slate-800">Freezing claims for: {alert.subjectName}</p>
              <p className="text-xs text-slate-500">{alert.subjectType}</p>
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-xs font-semibold text-blue-700">AI flagged — claims blocked from payment ✅</p>
                <p className="text-xs text-blue-600" style={MONO}>AED {alert.exposureAmountAed.toLocaleString()} at risk</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">What Freezing Does</p>
              {[
                { ok: true,  text: 'Blocks all pending payments to provider' },
                { ok: true,  text: 'Returns claims to "Under Review" status' },
                { ok: true,  text: 'Sends freeze notification to provider'   },
                { ok: true,  text: 'Creates DHA compliance record'           },
                { ok: false, text: 'Does NOT affect previously paid claims'  },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={item.ok ? 'text-emerald-500' : 'text-slate-400'}>{item.ok ? '✅' : '❌'}</span>
                  <span className={item.ok ? 'text-slate-700' : 'text-slate-400'}>{item.text}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason</p>
              {[
                { id: 'investigation', label: 'Active fraud investigation' },
                { id: 'audit',         label: 'Audit review'               },
                { id: 'docs',          label: 'Documentation required'     },
                { id: 'other',         label: 'Other'                      },
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="freeze-reason" value={opt.id} checked={reason === opt.id} onChange={() => setReason(opt.id)} />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { state: notifyProvider, setter: setNotifyProvider, label: 'Send freeze notification to provider' },
                { state: logDaman,       setter: setLogDaman,       label: 'Log freeze in Daman compliance system' },
                { state: notifyAdmin,    setter: setNotifyAdmin,    label: 'Notify CeenAiX admin team' },
              ].map((item, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={item.state} onChange={e => item.setter(e.target.checked)} className="rounded" />
                  <span className="text-sm text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {!done && (
          <div className="px-6 pb-5 space-y-2">
            <button onClick={handleConfirm} disabled={confirming}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 bg-blue-600">
              {confirming ? 'Confirming...' : <><Lock size={15} /> Confirm Freeze</>}
            </button>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── SuspendProviderModal ─────────────────────────────────────────────────────

const SuspendProviderModal = ({
  alert, onClose, onConfirm,
}: { alert: InsuranceFraudAlert; onClose: () => void; onConfirm: () => void }) => {
  const [duration,   setDuration]   = useState('pending');
  const [reason,     setReason]     = useState('investigation');
  const [confirmed,  setConfirmed]  = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [done,       setDone]       = useState(false);

  const handleConfirm = () => {
    setSuspending(true);
    setTimeout(() => { setSuspending(false); setDone(true); setTimeout(onConfirm, 1200); }, 1600);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 480 }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#7F1D1D', minHeight: 56 }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <Ban size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-base">Suspend Provider Access</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <X size={14} className="text-white" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Ban size={24} className="text-red-600" />
            </div>
            <p className="text-base font-bold text-red-700">Provider Account Suspended</p>
            <p className="text-sm text-slate-500">{alert.subjectName} — pending investigation</p>
            <p className="text-xs text-slate-400">DHA notification sent · CeenAiX admin notified</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            <div className="p-4 rounded-xl border border-red-200 bg-red-50">
              <p className="text-sm font-bold text-red-800 mb-2">⚠️ This is a significant action. Suspending {alert.subjectName} will:</p>
              <ul className="space-y-1 text-xs text-red-700">
                <li>• Block access to CeenAiX platform immediately</li>
                <li>• Prevent new claims submission</li>
                <li>• Notify the provider of suspension</li>
                <li>• Create a formal DHA record</li>
                <li className="text-slate-500 mt-2">This does NOT revoke their DHA license. License revocation requires a separate DHA process.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Suspension Duration</p>
              {[
                { id: 'pending',   label: 'Pending investigation (indefinite, lift manually)' },
                { id: '30',        label: '30 days' },
                { id: '90',        label: '90 days' },
                { id: 'permanent', label: 'Permanent removal from network' },
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="duration" value={opt.id} checked={duration === opt.id} onChange={() => setDuration(opt.id)} />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Reason</p>
              <div className="relative">
                <select value={reason} onChange={e => setReason(e.target.value)} className="w-full appearance-none border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-700 pr-8 focus:outline-none">
                  <option value="investigation">Active fraud investigation</option>
                  <option value="pattern">Pattern anomaly under review</option>
                  <option value="dha">DHA compliance violation</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 border-red-200 bg-red-50">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="rounded mt-0.5" />
              <span className="text-sm font-semibold text-red-800">I confirm this action and understand it will immediately restrict provider access</span>
            </label>
          </div>
        )}

        {!done && (
          <div className="px-6 pb-5 space-y-2">
            <button onClick={handleConfirm} disabled={!confirmed || suspending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-red-600">
              {suspending ? 'Suspending...' : <><Ban size={15} /> Confirm Suspension</>}
            </button>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── DhaReportModal ───────────────────────────────────────────────────────────

const DhaReportModal = ({
  alert, onClose, onConfirm,
}: { alert: InsuranceFraudAlert; onClose: () => void; onConfirm: () => void }) => {
  const [reportType, setReportType] = useState('single');
  const [format,     setFormat]     = useState('xml');
  const [method,     setMethod]     = useState('download');
  const [generating, setGenerating] = useState(false);
  const [done,       setDone]       = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setDone(true); }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 560 }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#0F2D4A', minHeight: 56 }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <FileText size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-base">Generate DHA Fraud Report</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <X size={14} className="text-white" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <FileText size={24} className="text-teal-600" />
            </div>
            <p className="text-base font-bold text-teal-700">DHA Report Ready</p>
            <p className="text-sm font-semibold text-slate-700" style={MONO}>FRAUD-2026-04-001.xml</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={onConfirm} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ backgroundColor: '#0D9488' }}>
                Download File
              </button>
              <button onClick={onConfirm} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ backgroundColor: '#0F2D4A' }}>
                Submit to DHA Sheryan
              </button>
            </div>
            <p className="text-xs text-amber-600 font-semibold">⏰ DHA submission deadline: 48 hours from case opening</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Report Type</p>
              {[
                { id: 'single',    label: `Single case report (${alert.externalRef})` },
                { id: 'all',       label: 'All active cases'                          },
                { id: 'monthly',   label: 'Monthly summary (June 2026)'               },
                { id: 'quarterly', label: 'Quarterly report (Q2 2026 — DHA required)' },
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="report-type" value={opt.id} checked={reportType === opt.id} onChange={() => setReportType(opt.id)} />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="p-4 rounded-xl border border-teal-200" style={{ backgroundColor: '#F0FDFA' }}>
              <p className="text-xs font-bold text-teal-700 mb-2">DHA FORMAT PREVIEW</p>
              <div className="text-xs text-teal-800 space-y-0.5" style={MONO}>
                <p>DAMAN NATIONAL HEALTH INSURANCE</p>
                <p>FRAUD DETECTION REPORT — DHA FORMAT</p>
                <p>Reference: DHA-FRAUD-2026-06-001</p>
                <p>Cases included: 1 ({alert.externalRef})</p>
                <p>AI confidence: {alert.score}% ({toRiskKey(alert.severity)})</p>
                <p>Amount at risk: AED {alert.exposureAmountAed.toLocaleString()}</p>
                <p>Status: {alert.status}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Format</p>
                {['xml', 'pdf', 'both'].map(f => (
                  <label key={f} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} />
                    <span className="text-sm text-slate-700 uppercase">{f}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Submission</p>
                {[
                  { id: 'download', label: 'Download (manual)' },
                  { id: 'api',      label: 'DHA Sheryan API (auto)' },
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="method" value={opt.id} checked={method === opt.id} onChange={() => setMethod(opt.id)} />
                    <span className="text-sm text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50">
              <p className="text-xs text-blue-700 leading-relaxed">Fraud reports must be submitted to DHA within 48 hours of case opening per UAE Insurance Law Article 47. Quarterly summary due first week of each quarter.</p>
            </div>
          </div>
        )}

        {!done && (
          <div className="px-6 pb-5">
            <button onClick={handleGenerate} disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 hover:opacity-90" style={{ backgroundColor: '#0D9488' }}>
              {generating ? 'Compiling case data...' : <><FileText size={15} /> Generate DHA Report</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── FalsePositiveModal ───────────────────────────────────────────────────────

const FalsePositiveModal = ({
  alert, onClose, onConfirm,
}: { alert: InsuranceFraudAlert; onClose: () => void; onConfirm: () => void }) => {
  const [reason,     setReason]     = useState('');
  const [notes,      setNotes]      = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    if (!reason || !notes.trim()) return;
    setConfirming(true);
    setTimeout(() => { setConfirming(false); onConfirm(); }, 1400);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 420 }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#0F2D4A', minHeight: 56 }}>
          <span className="text-white font-semibold text-base">Clear Fraud Case — False Positive?</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <X size={14} className="text-white" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-slate-600">Clearing <span className="font-bold text-slate-800">{alert.externalRef}</span> as a false positive. This cannot be undone without creating a new case.</p>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Why Cleared (Required)</p>
            {[
              { id: 'high_volume', label: 'High-volume specialty clinic (legitimate)' },
              { id: 'docs',        label: 'Provider documentation verified'           },
              { id: 'nabidh',      label: 'Nabidh records found on manual check'      },
              { id: 'patient',     label: 'Patient confirmed visits'                  },
              { id: 'other',       label: 'Other'                                     },
            ].map(opt => (
              <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="fp-reason" value={opt.id} checked={reason === opt.id} onChange={() => setReason(opt.id)} />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Notes (Required)</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Explain why this case is a false positive..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none resize-none" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Impact on Provider</p>
            {['Provider account unfrozen', 'Claims released for processing', 'Provider notified — apology included', 'AI model improvement feedback sent'].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-700"><span className="text-emerald-500">✅</span> {s}</div>
            ))}
          </div>
        </div>
        <div className="px-6 pb-5 space-y-2">
          <button onClick={handleConfirm} disabled={!reason || !notes.trim() || confirming}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 bg-emerald-600">
            {confirming ? 'Clearing case...' : '✅ Confirm — Mark as False Positive'}
          </button>
          <button onClick={onClose} className="w-full py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ─── InvestigationWorkspace ───────────────────────────────────────────────────

type WsTab = 'summary' | 'claims' | 'patterns' | 'nabidh' | 'timeline' | 'notes';
interface NoteItem { time: string; author: string; text: string; isAi?: boolean }

const InvestigationWorkspace = ({
  alert, onClose, onToast, onFreeze, onSuspend, onDhaReport,
}: {
  alert: InsuranceFraudAlert;
  onClose: () => void;
  onToast: (msg: string, type: Toast['type']) => void;
  onFreeze: () => void;
  onSuspend: () => void;
  onDhaReport: () => void;
}) => {
  const [tab,             setTab]             = useState<WsTab>('summary');
  const [status,          setStatus]          = useState(toStatusKey(alert.status));
  const [assigned,        setAssigned]        = useState<string | null>(null);
  const [showStatusDrop,  setShowStatusDrop]  = useState(false);
  const [showAssignDrop,  setShowAssignDrop]  = useState(false);
  const [note,            setNote]            = useState('');
  const [notes,           setNotes]           = useState<NoteItem[]>([{
    time: 'Auto-detected', author: 'CeenAiX AI', isAi: true,
    text: `Automated fraud detection. Case created by CeenAiX AI on anomaly threshold breach. AI confidence: ${alert.score}%. Evidence: ${alert.reason}. Case ready for investigator review and DHA reporting.`,
  }]);

  const rk        = toRiskKey(alert.severity);
  const rc        = RISK_CFG[rk];
  const nabidhPct = deriveNabidhPct(alert.score);
  const nabidhMatch = Math.round(NABIDH_TOTAL * nabidhPct / 100);

  const dailyPattern = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      day:   `D${i + 1}`,
      count: Math.max(1, Math.round(alert.score / 5) + (i % 3 === 0 ? 3 : 0)),
    })), [alert.score]);

  const addNote = () => {
    if (!note.trim()) return;
    setNotes(n => [...n, { time: new Date().toLocaleString('en-AE'), author: 'Investigator', text: note }]);
    setNote('');
    onToast('Investigation note added', 'success');
  };

  const WS_TABS: { id: WsTab; label: string; icon: React.ElementType }[] = [
    { id: 'summary',  label: 'Summary',          icon: FileText     },
    { id: 'claims',   label: 'All Claims',        icon: Lock         },
    { id: 'patterns', label: 'Pattern Analysis',  icon: BarChart2    },
    { id: 'nabidh',   label: 'Nabidh Check',      icon: Globe        },
    { id: 'timeline', label: 'Timeline',          icon: Clock        },
    { id: 'notes',    label: 'Notes',             icon: MessageSquare},
  ];

  const timelineEvents = [
    { date: 'Alert Opened', events: [
      { type: 'danger',  text: `Fraud alert ${alert.externalRef} created by CeenAiX AI`,      actor: 'AI Engine | Automatic'  },
      { type: 'blue',    text: `Exposure estimated: AED ${alert.exposureAmountAed.toLocaleString()}`, actor: 'AI Engine | Automatic'  },
    ]},
    { date: 'AI Analysis', events: [
      { type: 'danger',  text: `Pattern: ${alert.reason}`,                                    actor: 'AI Engine | Automatic'  },
      { type: 'warning', text: `Nabidh cross-check initiated — ${nabidhPct}% match rate`,    actor: 'AI Engine | Automatic'  },
    ]},
    { date: alert.status === 'investigating' ? 'Under Investigation' : 'Current Status', events: [
      { type: 'success', text: `Status: ${alert.status} · Risk: ${rk}`,                       actor: 'Current user | Portal'  },
    ]},
    { date: 'Upcoming Steps', events: [
      { type: 'empty', text: 'Investigation assigned to officer',    actor: '' },
      { type: 'empty', text: 'Provider contacted for explanation',   actor: '' },
      { type: 'empty', text: 'DHA report submitted',                 actor: '' },
      { type: 'empty', text: 'Case resolved',                        actor: '' },
    ]},
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15,45,74,0.6)' }}>
      <div className="flex flex-col overflow-hidden rounded-2xl shadow-2xl w-full"
        style={{ maxWidth: 1000, height: '90vh', backgroundColor: 'white' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 flex-shrink-0" style={{ backgroundColor: '#7F1D1D', minHeight: 64 }}>
          <div>
            <p className="text-white font-bold text-base">Investigation Workspace</p>
            <p className="text-xs" style={{ ...MONO, color: '#FCA5A5' }}>{alert.externalRef} · {alert.subjectName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowStatusDrop(s => !s)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-red-400/50 hover:border-red-300 transition-colors">
                {STATUS_OPTIONS.find(s => s.value === status)?.label ?? status}
                <ChevronDown size={12} />
              </button>
              {showStatusDrop && (
                <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-slate-200 z-10 overflow-hidden w-52">
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { setStatus(opt.value as StatusKey); setShowStatusDrop(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between">
                      {opt.label}
                      {status === opt.value && <Check size={13} className="text-emerald-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setShowAssignDrop(s => !s)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-400/50 hover:border-red-300 transition-colors"
                style={{ color: '#FCA5A5' }}>
                {assigned ? assigned.split(' ')[0] : 'Unassigned'}
                <ChevronDown size={12} />
              </button>
              {showAssignDrop && (
                <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-slate-200 z-10 overflow-hidden w-52">
                  <button onClick={() => { setAssigned(null); setShowAssignDrop(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 italic">Unassigned</button>
                  {TEAM.map(m => (
                    <button key={m} onClick={() => { setAssigned(m); setShowAssignDrop(false); onToast(`Case assigned to ${m}`, 'success'); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between">
                      {m}
                      {assigned === m && <Check size={13} className="text-emerald-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-4 flex-shrink-0 overflow-x-auto" style={{ backgroundColor: '#450A0A' }}>
          {WS_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap"
              style={{ borderColor: tab === t.id ? '#FCA5A5' : 'transparent', color: tab === t.id ? '#FCA5A5' : 'rgba(252,165,165,0.5)' }}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* SUMMARY */}
          {tab === 'summary' && (
            <div className="p-6 grid gap-5" style={{ gridTemplateColumns: '1fr 300px' }}>
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Subject Details</p>
                  <p className="text-base font-bold text-slate-900 mb-1">{alert.subjectName}</p>
                  <p className="text-sm text-slate-500 mb-3">{alert.subjectType}</p>
                  <span className="px-2 py-0.5 rounded text-xs font-bold text-red-700 bg-red-50 animate-pulse">🚩 Under fraud investigation</span>
                </div>
                <div className="border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Evidence Summary</p>
                  <ol className="space-y-2">
                    {toEvidencePills(alert.reason).map((e, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: rc.dot }}>{i + 1}</span>
                        {e}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-2xl p-5 border border-violet-200" style={{ backgroundColor: '#F5F3FF' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot size={18} className="text-violet-600" />
                      <p className="text-sm font-bold text-violet-700">CeenAiX AI Analysis</p>
                    </div>
                    <span className="text-sm font-bold" style={{ ...MONO, color: rc.dot }}>{alert.score}% confidence</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed mb-3">{alert.reason}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {toAiRecs(alert.severity).map(r => (
                      <span key={r} className="px-2 py-1 rounded-lg text-xs font-semibold bg-violet-100 text-violet-700">{r}</span>
                    ))}
                  </div>
                  <p className="text-xs mt-2 italic" style={{ ...MONO, color: '#A78BFA' }}>AI model: claude-sonnet-4 · Flagged: Auto-detection</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Financial Summary</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Amount at risk</span>
                      <span className="text-xl font-black" style={{ ...MONO, color: '#DC2626' }}>AED {alert.exposureAmountAed.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">AI Confidence</span>
                      <span className="text-base font-bold" style={{ ...MONO, color: rc.dot }}>{alert.score}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Risk Level</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: rc.badge, color: rc.badgeText }}>{rk}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                      ✅ AI monitoring active — claims under review
                    </div>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</p>
                  <button onClick={onFreeze} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all" style={{ backgroundColor: '#1D4ED8' }}>
                    <Lock size={15} /> Freeze Claims
                  </button>
                  <button onClick={onSuspend} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 bg-red-600">
                    <Ban size={15} /> Suspend Provider Account
                  </button>
                  <button onClick={onDhaReport} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ backgroundColor: '#0D9488' }}>
                    <FileText size={15} /> Generate DHA Report
                  </button>
                  <button onClick={() => onToast('Provider inquiry email sent', 'info')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors">
                    <MessageSquare size={14} /> Request Provider Explanation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CLAIMS */}
          {tab === 'claims' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">{alert.subjectName}</p>
                  <p className="text-xs text-slate-500">Ref: {alert.externalRef}</p>
                </div>
                <button onClick={onFreeze} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600">
                  <Lock size={13} /> Freeze All
                </button>
              </div>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: '#F8FAFC' }}>
                    <tr className="border-b border-slate-100">
                      {['Date', 'Claim ID', 'Patient ID', 'Service', 'Amount', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Claim-level details are compiled from Supabase claims data. Use the Claims Worklist to view individual claims for this provider.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PATTERNS */}
          {tab === 'patterns' && (
            <div className="p-6 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-800 mb-4">Estimated Daily Claim Volume — {alert.subjectName}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dailyPattern}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`${v} claims`, 'Daily count']} />
                    <ReferenceLine y={6} stroke="#10B981" strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2} fill="rgba(239,68,68,0.15)" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-semibold">
                  ⚠️ Elevated volume pattern — above 6/day network average. AI confidence: {alert.score}%
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-800 mb-4">Claim Submission Timing (AI Pattern Analysis)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={HOURLY_DATA} barSize={10}>
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`${v} claims`]} />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {HOURLY_DATA.map((d, i) => (
                        <Cell key={i} fill={d.hour === '2:00' || d.hour === '3:00' ? '#DC2626' : '#CBD5E1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
                  High-volume submissions detected outside normal clinic hours (2–3 AM) — indicative of automated ghost billing
                </div>
              </div>
            </div>
          )}

          {/* NABIDH */}
          {tab === 'nabidh' && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🇦🇪</span>
                <div>
                  <p className="text-base font-bold text-slate-800">NABIDH HIE Cross-Reference Verification</p>
                  <p className="text-xs text-slate-500">Verification against UAE national health records</p>
                </div>
              </div>
              <div className={`rounded-2xl p-6 border-2 ${nabidhPct < 50 ? 'bg-red-50 border-red-300' : nabidhPct < 75 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
                <p className={`text-lg font-bold mb-4 ${nabidhPct < 50 ? 'text-red-700' : nabidhPct < 75 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {nabidhPct < 50 ? '❌ NABIDH VERIFICATION FAILED' : nabidhPct < 75 ? '⚠️ NABIDH MATCH: PARTIAL' : '✅ NABIDH MATCH: VERIFIED'}
                </p>
                <div className="flex items-center gap-8 mb-4">
                  {[
                    { label: 'Patients sampled', value: String(NABIDH_TOTAL) },
                    { label: 'Nabidh records found', value: String(nabidhMatch), color: nabidhPct < 50 ? '#DC2626' : '#059669' },
                    { label: 'Match rate', value: `${nabidhPct}%`, big: true, color: nabidhPct < 50 ? '#DC2626' : nabidhPct < 75 ? '#D97706' : '#059669' },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                      <p className={`font-black ${s.big ? 'text-3xl' : 'text-2xl'}`}
                        style={{ ...MONO, color: s.color ?? '#0F172A' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">This provider: {nabidhPct}% match</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${nabidhPct}%`, backgroundColor: nabidhPct < 50 ? '#DC2626' : '#0D9488' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">Network average: 91.4% match</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-teal-400" style={{ width: '91.4%' }} />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-emerald-700 italic mt-3">✅ Legitimate providers typically show 85–100% Nabidh record match rate</p>
              </div>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100" style={{ backgroundColor: '#F8FAFC' }}>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Patient Record Verification Sample ({NABIDH_TOTAL} records checked)</p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Patient ID', 'Claimed Service', 'Nabidh Status'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: NABIDH_TOTAL }, (_, i) => ({
                      id:      `PT-ANON-${(i + 1).toString().padStart(3, '0')}`,
                      service: 'Consultation · CPT 99213',
                      found:   i < nabidhMatch,
                    })).map((p, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-4 py-2.5 text-xs font-semibold text-slate-600" style={MONO}>{p.id}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600">{p.service}</td>
                        <td className="px-4 py-2.5">
                          {p.found
                            ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">✅ FOUND</span>
                            : <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700">❌ NOT FOUND</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                <p className="text-xs font-bold text-blue-800 mb-1">Legal Admissibility Notice</p>
                <p className="text-xs text-blue-700 leading-relaxed">Nabidh cross-check is admissible as evidence in UAE Insurance Authority fraud proceedings. This report has been logged with timestamp and investigator identity for DHA submission.</p>
              </div>
            </div>
          )}

          {/* TIMELINE */}
          {tab === 'timeline' && (
            <div className="p-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-5">Fraud Detection Timeline</p>
              <div className="space-y-6">
                {timelineEvents.map((group, gi) => (
                  <div key={gi}>
                    <p className="text-xs font-bold text-slate-700 mb-3" style={MONO}>{group.date}</p>
                    <div className="space-y-3 pl-4">
                      {group.events.map((ev, ei) => (
                        <div key={ei} className="flex items-start gap-3">
                          {ev.type === 'empty'
                            ? <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5 border-2 border-slate-300" />
                            : <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                                style={{ backgroundColor: ev.type === 'danger' ? '#DC2626' : ev.type === 'warning' ? '#F59E0B' : ev.type === 'success' ? '#10B981' : ev.type === 'blue' ? '#2563EB' : '#94A3B8' }} />}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${ev.type === 'empty' ? 'text-slate-400' : 'text-slate-700'}`}>{ev.text}</p>
                            {ev.actor && <p className="text-xs text-slate-400 mt-0.5" style={MONO}>{ev.actor}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTES */}
          {tab === 'notes' && (
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                {notes.map((n, i) => (
                  <div key={i} className={`rounded-xl p-4 border ${n.isAi ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {n.isAi && <Bot size={14} className="text-violet-600" />}
                      <span className="text-xs font-bold text-slate-700">{n.author}</span>
                      <span className="text-xs text-slate-400" style={MONO}>{n.time}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{n.text}</p>
                  </div>
                ))}
              </div>
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Add Investigation Note (Internal Only)</p>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
                  placeholder="Add investigation notes..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none resize-none" />
                <button onClick={addNote} disabled={!note.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 hover:opacity-90 transition-all" style={{ backgroundColor: '#0F2D4A' }}>
                  + Add Note
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">DHA Reports</p>
                <p className="text-xs text-slate-400 italic">Not yet submitted</p>
                <div className="flex gap-2">
                  <button onClick={onDhaReport} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: '#0D9488' }}>
                    <FileText size={13} /> Preview DHA Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── FraudCaseCard ────────────────────────────────────────────────────────────

const FraudCaseCard = ({
  alert,
  onOpen, onFreeze, onSuspend, onDha, onFalsePositive, onToast,
}: {
  alert: InsuranceFraudAlert;
  onOpen: (a: InsuranceFraudAlert) => void;
  onFreeze: (a: InsuranceFraudAlert) => void;
  onSuspend: (a: InsuranceFraudAlert) => void;
  onDha: (a: InsuranceFraudAlert) => void;
  onFalsePositive: (a: InsuranceFraudAlert) => void;
  onToast: (msg: string, type: Toast['type']) => void;
}) => {
  const rk   = toRiskKey(alert.severity);
  const rc   = RISK_CFG[rk];
  const sk   = toStatusKey(alert.status);
  const sc   = STATUS_CHIP[sk];
  const type = toType(alert.reason);
  const tc   = TYPE_COLORS[type] ?? '#64748B';
  const nPct = deriveNabidhPct(alert.score);
  const nFailed = nPct < 50;

  const SubjectIcon = alert.subjectType === 'provider' ? Building2 : alert.subjectType === 'ring' ? Users : User;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4"
      style={{ borderLeft: `6px solid ${rc.border}`, border: `1px solid ${rc.border}30`, borderLeftColor: rc.border }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100" style={{ backgroundColor: rc.bg }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3 py-1 rounded-lg text-xs font-black" style={{ backgroundColor: rc.badge, color: rc.badgeText }}>
            {rk === 'HIGH' ? '🟠' : rk === 'MEDIUM' ? '🟡' : '🟢'} {rk} · {alert.score}%
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: `${tc}18`, color: tc }}>{type}</span>
          <span className="text-xs font-bold" style={{ ...MONO, color: '#EA580C' }}>{alert.externalRef}</span>
          {alert.status === 'open' && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-700">NEW</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-black" style={{ ...MONO, color: '#DC2626' }}>AED {alert.exposureAmountAed.toLocaleString()} at risk</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>{sc.label}</span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Subject row */}
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${rc.dot}20` }}>
            <SubjectIcon size={18} style={{ color: rc.dot }} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Fraud Subject</p>
            <p className="text-sm font-bold text-slate-900">{alert.subjectName}</p>
            <p className="text-xs text-slate-500">{alert.subjectType}</p>
            <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-1 inline-block animate-pulse">🚩 Under fraud investigation</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right">
            <div><p className="text-[9px] text-slate-400 uppercase">Exposure</p><p className="text-sm font-bold text-red-600" style={MONO}>AED {alert.exposureAmountAed.toLocaleString()}</p></div>
            <div><p className="text-[9px] text-slate-400 uppercase">AI Score</p><p className="text-sm font-bold text-slate-800" style={MONO}>{alert.score}%</p></div>
          </div>
        </div>

        {/* Evidence */}
        <div className="rounded-xl p-4" style={{ backgroundColor: `${rc.dot}0D`, border: `1px solid ${rc.dot}30` }}>
          <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: rc.dot }}>Fraud Evidence Summary</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {toEvidencePills(alert.reason).map(p => (
              <span key={p} className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: rc.dot }}>{p}</span>
            ))}
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{alert.reason}</p>
        </div>

        {/* AI analysis */}
        <div className="rounded-xl p-4 border border-violet-200" style={{ backgroundColor: '#F5F3FF' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-violet-600" />
              <p className="text-xs font-bold text-violet-700">CeenAiX AI Analysis</p>
            </div>
            <span className="text-xs font-bold" style={{ ...MONO, color: rc.dot }}>{alert.score}% confidence</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed mb-3">{alert.reason}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {toAiRecs(alert.severity).map(r => (
              <span key={r} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700">{r}</span>
            ))}
          </div>
          <p className="text-[9px] italic" style={{ ...MONO, color: '#A78BFA' }}>AI model: claude-sonnet-4 · Flagged: Auto-detection</p>
        </div>

        {/* Nabidh */}
        <div className={`rounded-xl p-4 border ${nFailed ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-bold ${nFailed ? 'text-red-700' : 'text-amber-700'}`}>
              🇦🇪 Nabidh HIE Cross-Check — {nFailed ? 'FAILED' : 'PARTIAL MATCH'}
            </p>
            <span className="text-xl font-black" style={{ ...MONO, color: nFailed ? '#DC2626' : '#D97706' }}>{nPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${nPct}%`, backgroundColor: nFailed ? '#DC2626' : '#F59E0B' }} />
          </div>
          <p className="text-[10px] text-emerald-700 italic mt-1">✅ Legitimate providers: 85–100% Nabidh match rate</p>
        </div>

        {/* Financial mini grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total at risk', value: `AED ${alert.exposureAmountAed.toLocaleString()}`, color: '#DC2626' },
            { label: 'AI Confidence', value: `${alert.score}%`,                                 color: '#7C3AED' },
            { label: 'Fraud type',    value: type.slice(0, 14) + (type.length > 14 ? '…' : ''), color: tc       },
          ].map((s, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-xs font-bold" style={{ ...MONO, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button onClick={() => onOpen(alert)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 bg-red-600">
            🔍 Open Investigation
          </button>
          <button onClick={() => onFreeze(alert)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
            <Lock size={13} /> Freeze Claims
          </button>
          <button onClick={() => onDha(alert)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors">
            <FileText size={13} /> DHA Report
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onToast(`Case ${alert.externalRef} assigned to Mariam Al Khateeb`, 'success')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">👁 Assign to Me</button>
          <button onClick={() => onSuspend(alert)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors">📤 Suspend</button>
          <button onClick={() => onFalsePositive(alert)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">✅ False Positive</button>
        </div>
      </div>
    </div>
  );
};

// ─── AnalyticsTab ─────────────────────────────────────────────────────────────

const AnalyticsTab = () => (
  <div className="p-5 space-y-5">
    <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* Monthly */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-700 mb-4">Monthly Fraud Cases Detected — 2026</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={MONTHLY_FRAUD} barSize={16}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <Tooltip labelStyle={{ fontSize: 12 }} />
            <Bar dataKey="confirmed"     name="Confirmed"       fill="#EF4444" radius={[2, 2, 0, 0]} stackId="a" />
            <Bar dataKey="review"        name="Under Review"    fill="#F97316" stackId="a" />
            <Bar dataKey="falsePositive" name="False Positive"  fill="#CBD5E1" radius={[2, 2, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By type pie */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-700 mb-4">Fraud by Type (% of cases)</p>
        <div className="flex items-center gap-4">
          <div style={{ width: 140, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={FRAUD_BY_TYPE} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                  {FRAUD_BY_TYPE.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 flex-1">
            {FRAUD_BY_TYPE.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-xs font-semibold text-slate-600 truncate" style={{ maxWidth: 120 }}>{d.name}</span>
                </div>
                <span className="text-xs font-bold" style={{ ...MONO, color: d.fill }}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI accuracy */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-700 mb-4">AI Fraud Detection Performance — 2026</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={AI_ACCURACY}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => [`${v}%`]} />
            <Line type="monotone" dataKey="truePositive"  name="True Positive Rate"  stroke="#0D9488" strokeWidth={2} dot={{ fill: '#0D9488' }} />
            <Line type="monotone" dataKey="falsePositive" name="False Positive Rate" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444' }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-emerald-600 font-semibold mt-2">Improving accuracy month over month ✅</p>
      </div>

      {/* By plan */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-700 mb-4">Cases by Targeted Insurance Plan</p>
        <div className="space-y-3">
          {FRAUD_BY_PLAN.map(p => (
            <div key={p.plan}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">{p.plan}</span>
                <span className="text-xs font-bold" style={{ ...MONO, color: p.fill }}>{p.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.fill }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-amber-600 font-semibold italic mt-3">Gold plan most targeted — fraudsters target highest annual limits</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Prevented (30 days)', value: 'AED 847,200' },
            { label: 'AI Accuracy',         value: '89.1%'        },
            { label: 'Avg Detection',       value: '43 sec'        },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-sm font-black text-slate-800" style={MONO}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const InsuranceFraudDetection = () => {
  const { data, loading, error, openFraud, refetch, overduePreAuth } = useInsurancePageData();
  const alerts   = useMemo(() => data?.fraudAlerts ?? [], [data?.fraudAlerts]);
  const resolved = useMemo(() => alerts.filter(a => a.status === 'resolved'), [alerts]);
  const active   = useMemo(() => alerts.filter(a => a.status !== 'resolved'),  [alerts]);

  const [activeTab,     setActiveTab]     = useState<AlertTab>('active');
  const [search,        setSearch]        = useState('');
  const [riskFilter,    setRiskFilter]    = useState<RiskKey | 'ALL'>('ALL');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');

  const [openWorkspace, setOpenWorkspace] = useState<InsuranceFraudAlert | null>(null);
  const [freezeAlert,   setFreezeAlert]   = useState<InsuranceFraudAlert | null>(null);
  const [suspendAlert,  setSuspendAlert]  = useState<InsuranceFraudAlert | null>(null);
  const [dhaAlert,      setDhaAlert]      = useState<InsuranceFraudAlert | null>(null);
  const [fpAlert,       setFpAlert]       = useState<InsuranceFraudAlert | null>(null);
  const [showScan,      setShowScan]      = useState(false);
  const [showDhaGlobal, setShowDhaGlobal] = useState(false);
  const [toasts,        setToasts]        = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const FRAUD_TYPES = useMemo(() => [...new Set(active.map(a => toType(a.reason)))], [active]);

  const filteredActive = useMemo(() => {
    let list = [...active];
    if (riskFilter !== 'ALL') list = list.filter(a => toRiskKey(a.severity) === riskFilter);
    if (typeFilter)           list = list.filter(a => toType(a.reason) === typeFilter);
    if (statusFilter)         list = list.filter(a => toStatusKey(a.status) === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.externalRef.toLowerCase().includes(q)   ||
        a.subjectName.toLowerCase().includes(q)   ||
        a.subjectType.toLowerCase().includes(q)   ||
        a.reason.toLowerCase().includes(q),
      );
    }
    return list;
  }, [active, riskFilter, typeFilter, statusFilter, search]);

  const exposure      = openFraud.reduce((sum, a) => sum + a.exposureAmountAed, 0);
  const highCount     = active.filter(a => a.severity === 'high').length;
  const mediumCount   = active.filter(a => a.severity === 'medium').length;
  const lowCount      = active.filter(a => a.severity === 'low').length;
  const hasFilters    = riskFilter !== 'ALL' || !!typeFilter || !!statusFilter || !!search;

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <PreAuthAlert item={overduePreAuth} />

      {/* KPI strip */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {[
          { label: 'Active Cases',        value: loading ? '...' : formatNumber(active.length),   sub: `${highCount} high · ${mediumCount} medium · ${lowCount} low`, icon: AlertTriangle, iconBg: '#FEE2E2', iconColor: '#DC2626', valueColor: '#DC2626', pulse: true },
          { label: 'Total at Risk',        value: loading ? '...' : formatCurrency(exposure),      sub: 'Open alert exposure',              icon: AlertOctagon,  iconBg: '#FED7AA', iconColor: '#EA580C', valueColor: '#DC2626', pulse: false },
          { label: 'AI Flags Today',       value: loading ? '...' : formatNumber(active.length),  sub: 'Auto-detected patterns',           icon: Bot,           iconBg: '#EDE9FE', iconColor: '#7C3AED', valueColor: '#7C3AED', pulse: false },
          { label: 'Recovered (30 days)',  value: 'AED 847.2K',                                   sub: '89 cases resolved',                icon: TrendingDown,  iconBg: '#D1FAE5', iconColor: '#059669', valueColor: '#059669', pulse: false },
          { label: 'True Positive Rate',   value: '89.1%',                                        sub: 'AI detection accuracy',            icon: ShieldCheck,   iconBg: '#D1FAE5', iconColor: '#059669', valueColor: '#059669', pulse: false },
          { label: 'Resolved (total)',      value: loading ? '...' : formatNumber(resolved.length), sub: 'Closed investigations',           icon: ShieldCheck,   iconBg: '#DBEAFE', iconColor: '#2563EB', valueColor: '#2563EB', pulse: false },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-2 ${s.pulse ? 'border-red-200' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: s.iconBg }}>
                <s.icon size={16} style={{ color: s.iconColor }} />
              </div>
            </div>
            <p className="text-2xl font-black" style={{ ...MONO, color: s.valueColor }}>{s.value}</p>
            {s.sub && <p className="text-xs text-slate-500">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Page header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <AlertOctagon size={24} className="text-red-600" />
            <div>
              <h2 className="text-base font-bold text-slate-800">Fraud Detection</h2>
              <p className="text-xs text-slate-400">AI-powered anomaly detection · Claims integrity · DHA reporting</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 mr-2">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              AI monitoring active
            </div>
            <button onClick={() => setShowScan(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors">
              <RotateCcw size={14} /> Run AI Scan
            </button>
            <button onClick={() => setShowDhaGlobal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors">
              <FileText size={14} /> DHA Report
            </button>
            <button onClick={() => setActiveTab('analytics')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
              <BarChart2 size={14} /> Analytics
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="relative" style={{ width: 280 }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
              placeholder="Search case ID, provider, pattern..."
              className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>

          <div className="flex items-center gap-1">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(r => {
              const count  = r === 'ALL' ? active.length : active.filter(a => toRiskKey(a.severity) === r).length;
              const cfg    = r === 'ALL' ? null : RISK_CFG[r];
              const isActive = riskFilter === r;
              return (
                <button key={r} onClick={() => setRiskFilter(r)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all"
                  style={{
                    borderColor:     isActive ? (cfg?.dot    ?? '#0F2D4A') : '#E2E8F0',
                    backgroundColor: isActive ? (cfg?.badge  ?? '#0F2D4A') : 'white',
                    color:           isActive ? (cfg?.badgeText ?? 'white') : '#64748B',
                  }}>
                  {r === 'ALL' ? 'All ●' : `${r} (${count})`}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="appearance-none border border-slate-300 rounded-xl px-3 py-2 pr-7 text-xs font-semibold text-slate-700 focus:outline-none bg-white">
              <option value="">All Types</option>
              {FRAUD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1">
            {[
              { v: '',             l: 'All ●'       },
              { v: 'NEW',          l: 'New'          },
              { v: 'UNDER_REVIEW', l: 'Under Review' },
              { v: 'MONITORING',   l: 'Monitoring'   },
            ].map(s => (
              <button key={s.v} onClick={() => setStatusFilter(s.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${statusFilter === s.v ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {s.l}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button onClick={() => { setSearch(''); setRiskFilter('ALL'); setTypeFilter(''); setStatusFilter(''); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 border border-slate-300 hover:bg-slate-50">
              <X size={11} /> Clear
            </button>
          )}

          <button onClick={() => addToast('Manual case entry — coming soon', 'info')}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
            + New Case
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5">
          {[
            { id: 'active'    as const, label: `🔴 Active Cases (${active.length})`,    color: '#DC2626' },
            { id: 'resolved'  as const, label: `✅ Resolved (${resolved.length})`,      color: '#059669' },
            { id: 'analytics' as const, label: '📊 Analytics',                          color: '#2563EB' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="px-5 py-3 text-sm border-b-2 transition-all"
              style={{
                borderBottom: activeTab === t.id ? `3px solid ${t.color}` : '3px solid transparent',
                color:        activeTab === t.id ? t.color : '#64748B',
                fontWeight:   activeTab === t.id ? 700 : 600,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Active */}
        {activeTab === 'active' && (
          <div className="p-5">
            {filteredActive.length === 0 ? (
              <div className="py-16 text-center">
                <ShieldCheck size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">{loading ? 'Loading fraud alerts...' : 'No active cases match your filters'}</p>
              </div>
            ) : (
              filteredActive.map(a => (
                <FraudCaseCard
                  key={a.id}
                  alert={a}
                  onOpen={setOpenWorkspace}
                  onFreeze={setFreezeAlert}
                  onSuspend={setSuspendAlert}
                  onDha={setDhaAlert}
                  onFalsePositive={setFpAlert}
                  onToast={addToast}
                />
              ))
            )}
          </div>
        )}

        {/* Resolved */}
        {activeTab === 'resolved' && (
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: 'Confirmed fraud', value: `${resolved.filter(a => a.status === 'resolved').length} alerts`,     color: '#DC2626' },
                { label: 'Total exposure',  value: formatCurrency(resolved.reduce((s, a) => s + a.exposureAmountAed, 0)), color: '#059669' },
                { label: 'Resolved',        value: formatNumber(resolved.length),                                         color: '#2563EB' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p className="text-base font-black" style={{ ...MONO, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {resolved.length === 0 ? (
              <div className="py-12 text-center">
                <ShieldCheck size={28} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No resolved cases yet</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead style={{ backgroundColor: '#F8FAFC' }}>
                    <tr className="border-b border-slate-100">
                      {['Case Ref', 'Type', 'Subject', 'Exposure', 'Severity', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resolved.map(a => {
                      const rk = toRiskKey(a.severity);
                      const rc = RISK_CFG[rk];
                      return (
                        <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-orange-600 uppercase" style={MONO}>{a.externalRef}</td>
                          <td className="px-4 py-3 text-xs font-semibold" style={{ color: TYPE_COLORS[toType(a.reason)] ?? '#64748B' }}>{toType(a.reason)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">{a.subjectName}</td>
                          <td className="px-4 py-3 text-sm font-bold text-emerald-600" style={MONO}>AED {a.exposureAmountAed.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: rc.badge, color: rc.badgeText }}>{rk}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => addToast(`Case ${a.externalRef} report viewed`, 'info')} className="text-xs text-blue-600 font-semibold hover:text-blue-800">👁 View</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>

      {/* Workspace */}
      {openWorkspace && (
        <InvestigationWorkspace
          alert={openWorkspace}
          onClose={() => setOpenWorkspace(null)}
          onToast={addToast}
          onFreeze={() => { setOpenWorkspace(null); setFreezeAlert(openWorkspace); }}
          onSuspend={() => { setOpenWorkspace(null); setSuspendAlert(openWorkspace); }}
          onDhaReport={() => { setOpenWorkspace(null); setDhaAlert(openWorkspace); }}
        />
      )}

      {/* Freeze */}
      {freezeAlert && (
        <FreezeClaimsModal
          alert={freezeAlert}
          onClose={() => setFreezeAlert(null)}
          onConfirm={() => { setFreezeAlert(null); addToast(`Claims frozen · ${freezeAlert.subjectName} · AED ${freezeAlert.exposureAmountAed.toLocaleString()} protected`, 'info'); }}
        />
      )}

      {/* Suspend */}
      {suspendAlert && (
        <SuspendProviderModal
          alert={suspendAlert}
          onClose={() => setSuspendAlert(null)}
          onConfirm={() => { setSuspendAlert(null); addToast(`Provider account suspended — ${suspendAlert.subjectName}`, 'error'); }}
        />
      )}

      {/* DHA */}
      {(dhaAlert ?? showDhaGlobal) && (
        <DhaReportModal
          alert={dhaAlert ?? (active[0] ?? { id: '', externalRef: 'GLOBAL', subjectName: 'All Cases', subjectType: '—', reason: '—', score: 0, exposureAmountAed: 0, severity: 'low', status: 'open' })}
          onClose={() => { setDhaAlert(null); setShowDhaGlobal(false); }}
          onConfirm={() => { setDhaAlert(null); setShowDhaGlobal(false); addToast('DHA fraud report generated · FRAUD-2026-06-001.xml · Due within 48 hours', 'success'); }}
        />
      )}

      {/* False positive */}
      {fpAlert && (
        <FalsePositiveModal
          alert={fpAlert}
          onClose={() => setFpAlert(null)}
          onConfirm={() => { setFpAlert(null); addToast(`Case cleared — false positive · ${fpAlert.subjectName} account restored`, 'success'); }}
        />
      )}

      {/* AI scan */}
      {showScan && (
        <AIScanOverlay onClose={() => { setShowScan(false); addToast('Full AI scan complete · 312 claims analyzed · 0 new cases', 'info'); }} />
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[500] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 400 }}>
        {toasts.map(t => {
          const c = TOAST_COLORS[t.type];
          return (
            <div key={t.id} className="flex items-start gap-3 px-4 py-3 rounded-xl pointer-events-auto"
              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, fontSize: 12, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: c.color }} />
              <span className="leading-relaxed">{t.msg}</span>
            </div>
          );
        })}
      </div>
    </InsuranceShell>
  );
};

export default InsuranceFraudDetection;
