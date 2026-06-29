import { useCallback, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ComposedChart, Legend, Line, LineChart, PieChart, Pie,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, AlertTriangle, Bot, Calendar, CheckCircle, ChevronDown,
  ChevronUp, DollarSign, Download, FileText, Info, Mail, Minus,
  Shield, TrendingDown, TrendingUp, User, Users, X,
} from 'lucide-react';
import InsuranceShell, { useInsurancePageData } from './InsuranceShell';
import type {
  InsuranceAiInsight,
  InsuranceNetworkProvider,
  InsuranceRiskSegment,
} from '../../hooks';

// ─── Formatters ───────────────────────────────────────────────────────────────

const MONO = "'DM Mono', monospace";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `AED ${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `AED ${(n / 1_000).toFixed(0)}K`
    : `AED ${n.toLocaleString()}`;

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

// ─── Static mock data ─────────────────────────────────────────────────────────

const MOCK_FINANCIAL_SNAPSHOT = {
  premiumRevenue: 28_400_000,
  claimsPaid: 17_840_000,
  lossRatio: 0.628,
  lossRatioTarget: 0.72,
  memberCount: 24_847,
  activePolicies: 11_203,
  slaCompliance: 0.857,
  budgetUtilization: 0.791,
};

const MOCK_MONTHLY_ACTUALS = [
  { shortMonth: 'Jan', claimsSubmitted: 4_840_000, claimsPaid: 4_120_000, budget: 5_200_000 },
  { shortMonth: 'Feb', claimsSubmitted: 4_210_000, claimsPaid: 3_940_000, budget: 5_200_000 },
  { shortMonth: 'Mar', claimsSubmitted: 5_180_000, claimsPaid: 4_690_000, budget: 5_200_000 },
  { shortMonth: 'Apr', claimsSubmitted: 6_120_000, claimsPaid: 5_090_000, budget: 5_200_000 },
];

const MOCK_PLAN_BREAKDOWN = [
  { plan: 'Enhanced Gold',   shortName: 'Gold',   members: 3_412,  avgCostPerMember: 2_840, color: '#F59E0B' },
  { plan: 'Standard Silver', shortName: 'Silver', members: 8_914,  avgCostPerMember: 1_420, color: '#94A3B8' },
  { plan: 'Basic Essential', shortName: 'Basic',  members: 9_821,  avgCostPerMember: 720,   color: '#3B82F6' },
  { plan: 'Other Plans',     shortName: 'Other',  members: 2_700,  avgCostPerMember: 980,   color: '#8B5CF6' },
];

const MOCK_SPECIALTY_SPEND = [
  { specialty: 'Cardiology',    budget: 3_200_000, actual: 2_840_000 },
  { specialty: 'Orthopedics',   budget: 2_800_000, actual: 3_120_000 },
  { specialty: 'Oncology',      budget: 4_100_000, actual: 3_890_000 },
  { specialty: 'Diabetes/Endo', budget: 1_900_000, actual: 1_740_000 },
  { specialty: 'Mental Health', budget: 1_400_000, actual: 1_280_000 },
];

const MOCK_SLA_DATA = [
  { category: 'Initial Review',   target: 4,  actual: 3.2,  met: true  },
  { category: 'Standard Claims',  target: 15, actual: 12.8, met: true  },
  { category: 'Urgent Claims',    target: 4,  actual: 3.8,  met: true  },
  { category: 'Pre-Auth Routine', target: 48, actual: 44.2, met: true  },
  { category: 'Pre-Auth Urgent',  target: 24, actual: 21.6, met: true  },
  { category: 'Complex Cases',    target: 72, actual: 68.4, met: true  },
  { category: 'Provider Appeal',  target: 72, actual: 89.4, met: false },
];

const MOCK_DENIAL_TREND = [
  { month: 'Oct', overall: 13.2, medical: 14.8, pharmacy: 8.4 },
  { month: 'Nov', overall: 12.1, medical: 13.4, pharmacy: 7.8 },
  { month: 'Dec', overall: 10.8, medical: 12.2, pharmacy: 6.9 },
  { month: 'Jan', overall: 9.4,  medical: 11.1, pharmacy: 5.8 },
  { month: 'Feb', overall: 8.7,  medical: 10.3, pharmacy: 5.4 },
  { month: 'Mar', overall: 8.2,  medical: 9.6,  pharmacy: 5.1 },
  { month: 'Apr', overall: 7.9,  medical: 9.1,  pharmacy: 4.8 },
];

const MOCK_PROVIDER_PERF = [
  { id: '1', name: 'Cleveland Clinic Abu Dhabi', city: 'Abu Dhabi', type: 'Hospital',     claimsSubmitted: 1_842, claimsApproved: 1_720, totalPaid: 8_420_000, avgClaim: 4_571, slaScore: 96, fraudFlags: 0, overallScore: 94, trend: 'up'     as const },
  { id: '2', name: 'Mediclinic City Hospital',   city: 'Dubai',     type: 'Hospital',     claimsSubmitted: 2_104, claimsApproved: 1_940, totalPaid: 6_820_000, avgClaim: 3_243, slaScore: 91, fraudFlags: 1, overallScore: 89, trend: 'stable' as const },
  { id: '3', name: 'Aster DM Healthcare',        city: 'Dubai',     type: 'Multi-clinic', claimsSubmitted: 3_481, claimsApproved: 3_120, totalPaid: 4_240_000, avgClaim: 1_218, slaScore: 88, fraudFlags: 0, overallScore: 87, trend: 'up'     as const },
  { id: '4', name: 'Saudi German Hospital',      city: 'Abu Dhabi', type: 'Hospital',     claimsSubmitted: 1_247, claimsApproved: 1_058, totalPaid: 3_840_000, avgClaim: 3_080, slaScore: 78, fraudFlags: 3, overallScore: 74, trend: 'down'   as const },
  { id: '5', name: 'NMC Royal Hospital',         city: 'Dubai',     type: 'Hospital',     claimsSubmitted: 984,   claimsApproved: 892,   totalPaid: 2_184_000, avgClaim: 2_219, slaScore: 84, fraudFlags: 0, overallScore: 82, trend: 'stable' as const },
  { id: '6', name: 'Zulekha Hospital',           city: 'Sharjah',   type: 'Hospital',     claimsSubmitted: 741,   claimsApproved: 680,   totalPaid: 1_840_000, avgClaim: 2_482, slaScore: 82, fraudFlags: 1, overallScore: 80, trend: 'up'     as const },
];

const MOCK_RISK_STRAT = [
  { tier: 'Critical', members: 672,    pct: '2.7',  totalSpend: 5_712_000,  projectedSpend: 17_136_000, avgSpend: 8_500, color: '#DC2626', bgColor: '#FEF2F2', topConditions: ['Oncology', 'Heart Failure', 'ESRD', 'Transplant']     },
  { tier: 'High',     members: 2_184,  pct: '8.8',  totalSpend: 5_024_000,  projectedSpend: 15_072_000, avgSpend: 2_300, color: '#EA580C', bgColor: '#FFF7ED', topConditions: ['Diabetes T2', 'CAD', 'COPD', 'Stroke']               },
  { tier: 'Medium',   members: 5_840,  pct: '23.5', totalSpend: 4_128_000,  projectedSpend: 12_384_000, avgSpend: 707,   color: '#D97706', bgColor: '#FFFBEB', topConditions: ['Hypertension', 'Asthma', 'Thyroid', 'Anxiety']        },
  { tier: 'Low',      members: 16_151, pct: '65.0', totalSpend: 2_976_000,  projectedSpend: 8_928_000,  avgSpend: 184,   color: '#16A34A', bgColor: '#F0FDF4', topConditions: ['Preventive', 'Minor Acute', 'Dental', 'Vision']        },
];

const MOCK_FINANCIAL_BREAKDOWN = [
  { category: 'Inpatient',    q1Budget: 5_200_000, q1Actual: 4_840_000, ytdBudget: 6_700_000, ytdActual: 6_120_000, variance: -580_000,  variancePct: -8.7  },
  { category: 'Outpatient',   q1Budget: 3_800_000, q1Actual: 3_940_000, ytdBudget: 5_100_000, ytdActual: 5_280_000, variance:  180_000,  variancePct:  3.5  },
  { category: 'Pharmacy',     q1Budget: 2_400_000, q1Actual: 2_210_000, ytdBudget: 3_100_000, ytdActual: 2_840_000, variance: -260_000,  variancePct: -8.4  },
  { category: 'Dental',       q1Budget:   840_000, q1Actual:   820_000, ytdBudget: 1_120_000, ytdActual: 1_080_000, variance:  -40_000,  variancePct: -3.6  },
  { category: 'Vision',       q1Budget:   420_000, q1Actual:   390_000, ytdBudget:   560_000, ytdActual:   510_000, variance:  -50_000,  variancePct: -8.9  },
  { category: 'Lab/Imaging',  q1Budget: 1_200_000, q1Actual: 1_340_000, ytdBudget: 1_600_000, ytdActual: 1_810_000, variance:  210_000,  variancePct: 13.1  },
  { category: 'Specialist',   q1Budget: 1_600_000, q1Actual: 1_480_000, ytdBudget: 2_100_000, ytdActual: 2_000_000, variance: -100_000,  variancePct: -4.8  },
];

const MOCK_UTIL_TREND = [
  { month: 'Jan', inpatient: 4_120_000, outpatient: 2_840_000, pharmacy: 1_710_000, dental: 640_000, vision: 310_000 },
  { month: 'Feb', inpatient: 3_940_000, outpatient: 2_960_000, pharmacy: 1_640_000, dental: 620_000, vision: 290_000 },
  { month: 'Mar', inpatient: 4_690_000, outpatient: 3_280_000, pharmacy: 1_820_000, dental: 700_000, vision: 320_000 },
  { month: 'Apr', inpatient: 5_090_000, outpatient: 3_510_000, pharmacy: 1_940_000, dental: 720_000, vision: 330_000 },
];

const MOCK_QUARTERLY_PROJ = [
  { quarter: 'Q1 (Actual)', baseCase: 14_180_000, optimistic: 13_200_000, pessimistic: 15_600_000, confidence: 100 },
  { quarter: 'Q2 (Proj)',   baseCase: 17_840_000, optimistic: 16_200_000, pessimistic: 19_800_000, confidence: 82  },
  { quarter: 'Q3 (Proj)',   baseCase: 19_200_000, optimistic: 17_400_000, pessimistic: 21_400_000, confidence: 71  },
  { quarter: 'Q4 (Proj)',   baseCase: 20_840_000, optimistic: 18_800_000, pessimistic: 23_200_000, confidence: 58  },
];

const MOCK_FULL_YEAR_PROJ: { month: string; actual: number | null; projected: number | null; budget: number }[] = [
  { month: 'Jan', actual: 4_120_000, projected: null,      budget: 5_200_000 },
  { month: 'Feb', actual: 3_940_000, projected: null,      budget: 5_200_000 },
  { month: 'Mar', actual: 4_690_000, projected: null,      budget: 5_200_000 },
  { month: 'Apr', actual: 1_820_000, projected: null,      budget: 5_200_000 },
  { month: 'May', actual: null,      projected: 5_280_000, budget: 5_200_000 },
  { month: 'Jun', actual: null,      projected: 5_480_000, budget: 5_200_000 },
  { month: 'Jul', actual: null,      projected: 5_720_000, budget: 5_200_000 },
  { month: 'Aug', actual: null,      projected: 5_640_000, budget: 5_200_000 },
  { month: 'Sep', actual: null,      projected: 5_840_000, budget: 5_200_000 },
  { month: 'Oct', actual: null,      projected: 6_120_000, budget: 5_200_000 },
  { month: 'Nov', actual: null,      projected: 6_240_000, budget: 5_200_000 },
  { month: 'Dec', actual: null,      projected: 6_480_000, budget: 5_200_000 },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'success' | 'warning' | 'info' }

const TOAST_COLORS: Record<Toast['type'], { border: string; color: string; bg: string }> = {
  success: { border: '#6EE7B7', color: '#065F46', bg: '#F0FDF4' },
  warning: { border: '#FCA5A5', color: '#991B1B', bg: '#FFF5F5' },
  info:    { border: '#93C5FD', color: '#1E40AF', bg: '#EFF6FF' },
};

// ─── Export Modal ─────────────────────────────────────────────────────────────

interface ExportModalProps {
  onClose: () => void;
  onToast: (msg: string, type: Toast['type']) => void;
}

function ExportModal({ onClose, onToast }: ExportModalProps) {
  const [format, setFormat]     = useState<'pdf' | 'xlsx' | 'csv'>('pdf');
  const [generating, setGen]    = useState(false);
  const [sections, setSections] = useState({
    financial: true, risk: true, providers: true, utilization: true, predictive: false, fraud: false,
  });

  const toggle = (key: keyof typeof sections) => setSections(s => ({ ...s, [key]: !s[key] }));

  const handleGenerate = () => {
    setGen(true);
    setTimeout(() => {
      setGen(false);
      onClose();
      onToast(`Report generated (${format.toUpperCase()}) — DHA-compliant formatting applied`, 'success');
    }, 2_200);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl overflow-hidden"
        style={{ width: 520, background: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.22)', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between px-6 py-5"
          style={{ background: '#1E3A5F', borderBottom: '1px solid #2D4A6F' }}>
          <div className="flex items-center gap-3">
            <FileText size={18} color="#93C5FD" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Export Report</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.1)', cursor: 'pointer' }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Export Format
            </p>
            <div className="flex gap-3">
              {(['pdf', 'xlsx', 'csv'] as const).map(f => (
                <button key={f} onClick={() => setFormat(f)} className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ border: `2px solid ${format === f ? '#1E3A5F' : '#E2E8F0'}`, background: format === f ? '#EFF6FF' : '#fff', color: format === f ? '#1E3A5F' : '#64748B', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                  .{f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Include Sections
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {(Object.entries(sections) as [keyof typeof sections, boolean][]).map(([key, val]) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                  style={{ border: `1px solid ${val ? '#BFDBFE' : '#F1F5F9'}`, background: val ? '#EFF6FF' : '#FAFBFC' }}>
                  <input type="checkbox" checked={val} onChange={() => toggle(key)} style={{ accentColor: '#1E3A5F' }} />
                  <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#374151', textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <p style={{ fontSize: 11, color: '#15803D', fontFamily: 'Inter, sans-serif' }}>
              Report will reflect the current workspace period. DHA-compliant formatting applied automatically.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleGenerate} disabled={generating}
              className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: generating ? '#94A3B8' : '#1E3A5F', color: '#fff', fontFamily: 'Inter, sans-serif', cursor: generating ? 'not-allowed' : 'pointer' }}>
              {generating ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Generating…</>
              ) : (
                <><Download size={15} />Generate Report</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SnapCard ─────────────────────────────────────────────────────────────────

interface SnapCardProps {
  label: string; value: string; sub: string; icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral'; trendLabel?: string; highlight?: boolean;
}

function SnapCard({ label, value, sub, icon, trend, trendLabel, highlight }: SnapCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#16A34A' : trend === 'down' ? '#DC2626' : '#94A3B8';
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: highlight ? '#1E3A5F' : '#fff', border: `1px solid ${highlight ? '#2D4A6F' : '#E2E8F0'}`, flex: 1 }}>
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl" style={{ background: highlight ? 'rgba(255,255,255,0.12)' : '#F1F5F9' }}>
          {icon}
        </div>
        {trend && trendLabel && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ background: highlight ? 'rgba(255,255,255,0.1)' : `${trendColor}18` }}>
            <TrendIcon size={11} color={highlight ? '#93C5FD' : trendColor} />
            <span style={{ fontSize: 11, fontWeight: 600, color: highlight ? '#93C5FD' : trendColor, fontFamily: 'Inter, sans-serif' }}>{trendLabel}</span>
          </div>
        )}
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: highlight ? '#93C5FD' : '#64748B', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
        <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: highlight ? '#fff' : '#0F172A', lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: 11, color: highlight ? 'rgba(255,255,255,0.6)' : '#94A3B8', fontFamily: 'Inter, sans-serif', marginTop: 3 }}>{sub}</p>
      </div>
    </div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif', marginBottom: subtitle ? 2 : 14 }}>{title}</p>
      {subtitle && <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginBottom: 14 }}>{subtitle}</p>}
      {children}
    </div>
  );
}

// ─── AI Risk Intelligence Panel ───────────────────────────────────────────────

function AiInsightItem({ insight }: { insight: InsuranceAiInsight }) {
  const type = insight.insightType;
  const cfg =
    type === 'preventive'
      ? { accent: '#059669', iconBg: '#DCFCE7', iconColor: '#059669', tagBg: '#DCFCE7', tagColor: '#065F46', tag: 'PREVENTIVE', cardBg: '#F0FDF4', border: '#BBF7D0' }
      : type === 'cluster' || type === 'cluster_risk'
      ? { accent: '#D97706', iconBg: '#FEF3C7', iconColor: '#D97706', tagBg: '#FEF3C7', tagColor: '#92400E', tag: 'CLUSTER',    cardBg: '#FFFBEB', border: '#FDE68A' }
      : { accent: '#2563EB', iconBg: '#DBEAFE', iconColor: '#2563EB', tagBg: '#DBEAFE', tagColor: '#1E40AF', tag: 'PROVIDER',   cardBg: '#EFF6FF', border: '#BFDBFE' };

  return (
    <div className="rounded-lg p-3" style={{ background: cfg.cardBg, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.accent}` }}>
      <div className="flex items-start gap-2 mb-2">
        <span className="rounded px-1.5 py-0.5 flex-shrink-0"
          style={{ fontSize: 10, fontWeight: 700, color: cfg.tagColor, background: cfg.tagBg, fontFamily: MONO }}>
          {cfg.tag}
        </span>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{insight.title}</p>
      </div>
      <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, marginBottom: insight.savingsLabel ? 6 : 8 }}>
        {insight.description}
      </p>
      {insight.savingsLabel && (
        <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: cfg.accent, marginBottom: 8 }}>
          {insight.savingsLabel}
        </p>
      )}
      <div className="flex gap-2">
        {insight.primaryActionLabel && (
          <button className="flex items-center gap-1 rounded-lg px-2.5 py-1 transition-opacity hover:opacity-80"
            style={{ background: cfg.iconBg, color: cfg.iconColor, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            <Mail style={{ width: 10, height: 10 }} />
            {insight.primaryActionLabel}
          </button>
        )}
        {insight.secondaryActionLabel && (
          <button className="flex items-center gap-1 rounded-lg px-2.5 py-1 hover:bg-slate-200"
            style={{ background: '#F1F5F9', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            <User style={{ width: 10, height: 10 }} />
            {insight.secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function AiRiskPanel({ insights }: { insights: InsuranceAiInsight[] }) {
  return (
    <div className="rounded-xl"
      style={{ background: '#fff', border: '1px solid #E2E8F0', borderLeft: '3px solid #7C3AED', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EDE9FE' }}>
          <Bot style={{ width: 13, height: 13, color: '#7C3AED' }} />
        </div>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#0F172A', lineHeight: 1.2 }}>
            AI Risk Intelligence
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>Powered by CeenAiX</div>
        </div>
        {insights.length > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: '#EDE9FE', color: '#7C3AED', fontFamily: 'Inter, sans-serif' }}>
            {insights.length} Active
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        {insights.length === 0 ? (
          <p style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '16px 0' }}>
            No active risk insights
          </p>
        ) : (
          insights.map(insight => <AiInsightItem key={insight.id} insight={insight} />)
        )}
      </div>
    </div>
  );
}

// ─── Analytics Sections — tab sub-components ──────────────────────────────────

type AnalyticsTab = 'financial' | 'risk' | 'provider' | 'utilization' | 'predictive';

// Financial Breakdown Tab
function FinancialTab() {
  const total = MOCK_FINANCIAL_BREAKDOWN.reduce(
    (s, r) => ({ ytdActual: s.ytdActual + r.ytdActual, ytdBudget: s.ytdBudget + r.ytdBudget }),
    { ytdActual: 0, ytdBudget: 0 },
  );
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 380px' }}>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Category', 'Q1 Budget', 'Q1 Actual', 'YTD Budget', 'YTD Actual', 'Variance', '%'].map(h => (
                <th key={h} className="text-left px-4 py-3" style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_FINANCIAL_BREAKDOWN.map((row, i) => (
              <tr key={row.category} style={{ borderBottom: i < MOCK_FINANCIAL_BREAKDOWN.length - 1 ? '1px solid #F1F5F9' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                <td className="px-4 py-3" style={{ fontWeight: 500, color: '#1E293B' }}>{row.category}</td>
                <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#475569', fontSize: 12 }}>{fmtShort(row.q1Budget)}</td>
                <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#1E293B', fontSize: 12, fontWeight: 600 }}>{fmtShort(row.q1Actual)}</td>
                <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#475569', fontSize: 12 }}>{fmtShort(row.ytdBudget)}</td>
                <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#1E293B', fontSize: 12, fontWeight: 600 }}>{fmtShort(row.ytdActual)}</td>
                <td className="px-4 py-3">
                  <span style={{ fontFamily: MONO, fontSize: 12, color: row.variance > 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                    {row.variance > 0 ? '+' : ''}{fmtShort(row.variance)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-bold" style={{
                    fontFamily: MONO,
                    background: row.variancePct > 10 ? '#FEE2E2' : row.variancePct > 0 ? '#FEF3C7' : row.variancePct < -5 ? '#DCFCE7' : '#F1F5F9',
                    color:      row.variancePct > 10 ? '#DC2626' : row.variancePct > 0 ? '#92400E' : row.variancePct < -5 ? '#15803D' : '#64748B',
                  }}>
                    {row.variancePct > 0 ? '+' : ''}{row.variancePct.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
            <tr style={{ background: '#F8FAFC', borderTop: '2px solid #CBD5E1' }}>
              <td className="px-4 py-3" style={{ fontWeight: 700, color: '#0F172A' }}>Total</td>
              <td className="px-4 py-3" /><td className="px-4 py-3" />
              <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#475569', fontSize: 12 }}>{fmtShort(total.ytdBudget)}</td>
              <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#1E293B', fontSize: 12, fontWeight: 700 }}>{fmtShort(total.ytdActual)}</td>
              <td className="px-4 py-3">
                <span style={{ fontFamily: MONO, fontSize: 12, color: total.ytdActual - total.ytdBudget > 0 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>
                  {total.ytdActual - total.ytdBudget > 0 ? '+' : ''}{fmtShort(total.ytdActual - total.ytdBudget)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
                  {(((total.ytdActual - total.ytdBudget) / total.ytdBudget) * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-xl p-5" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 16, fontFamily: 'Inter, sans-serif' }}>Budget vs Actual — YTD</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={MOCK_FINANCIAL_BREAKDOWN} layout="vertical" margin={{ left: 16, right: 40, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: MONO }} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'Inter, sans-serif' }} width={90} />
            <Tooltip formatter={(v: unknown) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
            <Bar dataKey="ytdBudget" name="Budget" fill="#CBD5E1" radius={[0, 2, 2, 0]} animationDuration={800} />
            <Bar dataKey="ytdActual" name="Actual"  radius={[0, 2, 2, 0]} animationDuration={800}>
              {MOCK_FINANCIAL_BREAKDOWN.map(entry => (
                <Cell key={entry.category} fill={entry.ytdActual > entry.ytdBudget ? '#EF4444' : '#22C55E'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Risk Stratification Tab — uses real riskSegments augmented with mock spend data
function RiskTab({ riskSegments }: { riskSegments: InsuranceRiskSegment[] }) {
  // Map real segment names onto mock strat tiers for spend/conditions detail
  const displayTiers = MOCK_RISK_STRAT.map((mock, i) => {
    const real = riskSegments[i];
    return real
      ? { ...mock, tier: real.segmentName, pct: String(real.utilizationPercent.toFixed(1)), forecastNote: real.forecastNote }
      : mock;
  });
  const total = displayTiers.reduce((s, r) => s + r.totalSpend, 0);

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 340px' }}>
      <div className="flex flex-col gap-4">
        {displayTiers.map(tier => (
          <div key={tier.tier} className="rounded-xl p-5" style={{ border: `1px solid ${tier.color}30`, background: tier.bgColor }}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tier.color }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{tier.tier} Risk</p>
                  <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{tier.members.toLocaleString()} members ({tier.pct}%)</p>
                </div>
              </div>
              <div className="text-right">
                <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>Avg cost / member</p>
                <p style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: tier.color }}>{fmt(tier.avgSpend)}</p>
              </div>
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div>
                <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>Month-to-Date Spend</p>
                <p style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{fmt(tier.totalSpend)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>Projected Annual</p>
                <p style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: tier.color }}>{fmt(tier.projectedSpend)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>% of Total Spend</p>
                <p style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{((tier.totalSpend / total) * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="mt-3">
              <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>Top Conditions</p>
              <div className="flex gap-2 flex-wrap">
                {tier.topConditions.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded"
                    style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', background: `${tier.color}18`, color: tier.color, fontWeight: 600 }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: `${tier.color}20` }}>
              <div className="h-full rounded-full" style={{ width: `${(tier.totalSpend / total) * 100}%`, background: tier.color, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-5" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Cost Concentration</p>
        <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}>% of total spend by risk tier</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={displayTiers.map(r => ({ name: r.tier.split(' ')[0], value: parseFloat(((r.totalSpend / total) * 100).toFixed(1)), color: r.color }))}
            layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: MONO }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Inter, sans-serif' }} width={70} />
            <Tooltip formatter={(v: unknown) => `${Number(v)}%`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
              {displayTiers.map(r => <Cell key={r.tier} fill={r.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 p-3 rounded-lg" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>Cost Concentration Alert</p>
          <p style={{ fontSize: 11, color: '#78350F', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
            {displayTiers[0].pct}% of members ({displayTiers[0].tier.split(' ')[0]} tier) account for{' '}
            {((displayTiers[0].totalSpend / total) * 100).toFixed(0)}% of claims spend. Targeted care management could reduce this significantly.
          </p>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {displayTiers.map(r => (
            <div key={r.tier} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                <span style={{ fontSize: 12, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{r.tier.split(' ')[0]}</span>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 12, color: '#1E293B', fontWeight: 600 }}>{((r.totalSpend / total) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Provider Scorecard Tab — uses real networkProviders if available, falls back to mock
function ProviderTab({ networkProviders }: { networkProviders: InsuranceNetworkProvider[] }) {
  const [sortBy, setSortBy]   = useState<'overallScore' | 'totalPaid' | 'slaScore' | 'fraudFlags'>('overallScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // If real providers exist, map them to the display shape; otherwise use mock
  const rows: typeof MOCK_PROVIDER_PERF = useMemo(() => {
    if (networkProviders.length > 0) {
      return networkProviders.map((p, i) => ({
        id: p.id,
        name: p.providerName,
        city: p.networkNote ?? 'UAE',
        type: p.specialty,
        claimsSubmitted: p.claimsCount,
        claimsApproved: Math.round(p.claimsCount * (p.approvalRatePercent / 100)),
        totalPaid: p.averageCostAed * p.claimsCount,
        avgClaim: p.averageCostAed,
        slaScore: Math.round(p.approvalRatePercent),
        fraudFlags: p.fraudScore === 'high' ? 3 : p.fraudScore === 'medium' ? 1 : 0,
        overallScore: Math.round(p.approvalRatePercent * 0.9 + (p.denialRatePercent != null ? (100 - p.denialRatePercent) * 0.1 : 9)),
        trend: (i % 3 === 0 ? 'up' : i % 3 === 1 ? 'stable' : 'down') as 'up' | 'stable' | 'down',
      }));
    }
    return MOCK_PROVIDER_PERF;
  }, [networkProviders]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const diff = (a[sortBy] as number) - (b[sortBy] as number);
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [rows, sortBy, sortDir]);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortBy(col); setSortDir('desc'); }
  };

  const ScoreRing = ({ score }: { score: number }) => {
    const color = score >= 90 ? '#16A34A' : score >= 80 ? '#2563EB' : score >= 70 ? '#D97706' : '#DC2626';
    return (
      <div className="relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
        <svg width="36" height="36" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="3" />
          <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${(score / 100) * 87.96} 87.96`} strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color, position: 'relative', zIndex: 1 }}>{score}</span>
      </div>
    );
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : null;

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) =>
    trend === 'up'   ? <TrendingUp size={12} color="#16A34A" /> :
    trend === 'down' ? <TrendingDown size={12} color="#DC2626" /> :
    <Minus size={12} color="#94A3B8" />;

  const hdr = (label: string, col?: typeof sortBy) => (
    <th
      className={`text-left px-4 py-3${col ? ' cursor-pointer select-none hover:text-slate-700' : ''}`}
      style={{ fontSize: 11, fontWeight: 600, color: col && sortBy === col ? '#1E3A5F' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}
      onClick={col ? () => handleSort(col) : undefined}>
      {col ? <div className="flex items-center gap-1">{label} <SortIcon col={col} /></div> : label}
    </th>
  );

  return (
    <div>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {hdr('Provider')}
              {hdr('Claims')}
              {hdr('Paid', 'totalPaid')}
              {hdr('SLA', 'slaScore')}
              {hdr('Fraud', 'fraudFlags')}
              {hdr('Score', 'overallScore')}
              {hdr('Trend')}
            </tr>
          </thead>
          <tbody>
            {sorted.map((prov, i) => (
              <tr key={prov.id} style={{ borderBottom: i < sorted.length - 1 ? '1px solid #F1F5F9' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                <td className="px-4 py-3">
                  <p style={{ fontWeight: 600, color: '#1E293B', fontSize: 13 }}>{prov.name}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8' }}>{prov.city} · {prov.type}</p>
                </td>
                <td className="px-4 py-3">
                  <p style={{ fontFamily: MONO, fontSize: 12, color: '#1E293B' }}>{prov.claimsSubmitted.toLocaleString()}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8' }}>{((prov.claimsApproved / prov.claimsSubmitted) * 100).toFixed(1)}% approved</p>
                </td>
                <td className="px-4 py-3">
                  <p style={{ fontFamily: MONO, fontSize: 12, color: '#1E293B', fontWeight: 600 }}>{fmtShort(prov.totalPaid)}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8' }}>avg {fmtShort(prov.avgClaim)}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-bold" style={{
                    fontFamily: MONO,
                    background: prov.slaScore >= 90 ? '#DCFCE7' : prov.slaScore >= 80 ? '#EFF6FF' : '#FEF3C7',
                    color:      prov.slaScore >= 90 ? '#15803D' : prov.slaScore >= 80 ? '#1D4ED8' : '#92400E',
                  }}>{prov.slaScore}%</span>
                </td>
                <td className="px-4 py-3">
                  {prov.fraudFlags > 0
                    ? <span className="flex items-center gap-1" style={{ color: '#DC2626', fontSize: 12, fontWeight: 600 }}><AlertTriangle size={12} />{prov.fraudFlags}</span>
                    : <span style={{ color: '#16A34A', fontSize: 12, fontFamily: MONO }}>—</span>}
                </td>
                <td className="px-4 py-3"><ScoreRing score={prov.overallScore} /></td>
                <td className="px-4 py-3"><TrendIcon trend={prov.trend} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-xl p-5" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 16, fontFamily: 'Inter, sans-serif' }}>Provider Score Comparison</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={rows.map(p => ({ name: p.name.split(' ')[0], score: p.overallScore }))}
            margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Inter, sans-serif' }} />
            <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: MONO }} />
            <Tooltip formatter={(v: unknown) => `${Number(v)}/100`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
            <ReferenceLine y={80} stroke="#CBD5E1" strokeDasharray="4 4" label={{ value: 'Target 80', position: 'right', fontSize: 10, fill: '#94A3B8' }} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} animationDuration={800}>
              {rows.map(p => <Cell key={p.id} fill={p.overallScore >= 90 ? '#16A34A' : p.overallScore >= 80 ? '#2563EB' : p.overallScore >= 70 ? '#D97706' : '#DC2626'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Utilization Trends Tab
function UtilizationTab() {
  const UTIL_CATEGORIES = [
    { key: 'inpatient',  label: 'Inpatient',  color: '#1E40AF' },
    { key: 'outpatient', label: 'Outpatient', color: '#0369A1' },
    { key: 'pharmacy',   label: 'Pharmacy',   color: '#0F766E' },
    { key: 'dental',     label: 'Dental',     color: '#7C3AED' },
    { key: 'vision',     label: 'Vision',     color: '#BE185D' },
  ];

  const CONDITIONS = [
    { condition: 'Hypertension',       encounters: 4_218, cost: 2_841_200 },
    { condition: 'Diabetes (T2)',       encounters: 3_847, cost: 5_412_800 },
    { condition: 'Upper Respiratory',  encounters: 6_412, cost: 1_284_100 },
    { condition: 'Musculoskeletal',    encounters: 2_941, cost: 4_184_200 },
    { condition: 'Anxiety/Depression', encounters: 2_184, cost: 1_841_200 },
    { condition: 'Ischemic Heart',     encounters: 1_247, cost: 6_284_100 },
    { condition: 'Asthma/COPD',        encounters: 1_841, cost: 2_641_800 },
  ];

  const totalCost = CONDITIONS.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-5" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Claims Spend by Care Category</p>
        <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 16, fontFamily: 'Inter, sans-serif' }}>Monthly stacked spend — Jan through Apr 2026</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={MOCK_UTIL_TREND} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Inter, sans-serif' }} />
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: MONO }} />
            <Tooltip formatter={(v: unknown, name: unknown) => [fmt(Number(v)), String(name)]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
            <Legend iconType="square" wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }} />
            {UTIL_CATEGORIES.map(c => (
              <Area key={c.key} type="monotone" dataKey={c.key} name={c.label} stackId="1" stroke={c.color} fill={c.color} fillOpacity={0.15} animationDuration={800} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif' }}>Top Condition Frequency (YTD)</p>
        </div>
        <table className="w-full" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Condition', 'Encounters', 'Total Cost', 'Avg / Encounter', '% of Total Spend'].map(h => (
                <th key={h} className="text-left px-4 py-3" style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CONDITIONS.map((row, i) => (
              <tr key={row.condition} style={{ borderBottom: i < CONDITIONS.length - 1 ? '1px solid #F1F5F9' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                <td className="px-4 py-3" style={{ fontWeight: 500, color: '#1E293B' }}>{row.condition}</td>
                <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#475569' }}>{row.encounters.toLocaleString()}</td>
                <td className="px-4 py-3" style={{ fontFamily: MONO, fontWeight: 600, color: '#1E293B' }}>{fmt(row.cost)}</td>
                <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#475569' }}>{fmt(Math.round(row.cost / row.encounters))}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9', minWidth: 60 }}>
                      <div className="h-full rounded-full" style={{ width: `${(row.cost / totalCost) * 100}%`, background: '#1E3A5F' }} />
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: '#64748B', minWidth: 36 }}>{((row.cost / totalCost) * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Predictive Modeling Tab
function PredictiveTab({ onToast }: { onToast: (msg: string, type: Toast['type']) => void }) {
  const [memberGrowth,   setMemberGrowth]   = useState(3);
  const [medInflation,   setMedInflation]   = useState(6);
  const [fraudReduction, setFraudReduction] = useState(15);
  const [careManagement, setCareManagement] = useState(8);

  const adjusted = useMemo(() => {
    const combined =
      (1 + memberGrowth / 100) *
      (1 + medInflation / 100) *
      (1 - (fraudReduction / 100) * 0.05) *
      (1 - (careManagement / 100) * 0.04);
    return MOCK_QUARTERLY_PROJ.map(q => ({ ...q, adjusted: Math.round(q.baseCase * combined) }));
  }, [memberGrowth, medInflation, fraudReduction, careManagement]);

  const totalAdjusted = adjusted.reduce((s, q) => s + q.adjusted, 0);
  const totalBase     = MOCK_QUARTERLY_PROJ.reduce((s, q) => s + q.baseCase, 0);
  const savings       = totalBase - totalAdjusted;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-5" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif' }}>Full-Year Claims Projection — 2026</p>
            <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Actual (Jan–Apr) + AI projection (May–Dec)</p>
          </div>
          <div className="flex items-center gap-4" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: '#1E40AF' }} /><span style={{ color: '#64748B' }}>Actual</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: '#0F766E' }} /><span style={{ color: '#64748B' }}>Projected</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: '#CBD5E1' }} /><span style={{ color: '#64748B' }}>Budget</span></div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={MOCK_FULL_YEAR_PROJ} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Inter, sans-serif' }} />
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: MONO }} />
            <Tooltip
              formatter={(v: unknown, name: unknown) => (typeof v === 'number' ? [fmt(v), String(name)] : ['-', String(name)])}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
            <Bar dataKey="actual"    name="Actual"    fill="#1E40AF" fillOpacity={0.8} radius={[2, 2, 0, 0]} animationDuration={800} />
            <Bar dataKey="projected" name="Projected" fill="#0F766E" fillOpacity={0.5} radius={[2, 2, 0, 0]} animationDuration={800} />
            <Line dataKey="budget"   name="Budget" stroke="#CBD5E1" strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={800} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 360px' }}>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif' }}>Quarterly Projection Detail</p>
          </div>
          <table className="w-full" style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Quarter', 'Base Case', 'Adjusted', 'Optimistic', 'Pessimistic', 'Confidence'].map(h => (
                  <th key={h} className="text-left px-4 py-3" style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adjusted.map((q, i) => (
                <tr key={q.quarter} style={{ borderBottom: i < adjusted.length - 1 ? '1px solid #F1F5F9' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                  <td className="px-4 py-3" style={{ fontWeight: 600, color: '#1E293B' }}>{q.quarter}</td>
                  <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#475569', fontSize: 12 }}>{fmtShort(q.baseCase)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: q.adjusted < q.baseCase ? '#16A34A' : '#DC2626' }}>{fmtShort(q.adjusted)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#16A34A', fontSize: 12 }}>{fmtShort(q.optimistic)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: MONO, color: '#DC2626', fontSize: 12 }}>{fmtShort(q.pessimistic)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 48, background: '#F1F5F9' }}>
                        <div className="h-full rounded-full" style={{ width: `${q.confidence}%`, background: q.confidence >= 80 ? '#16A34A' : q.confidence >= 65 ? '#D97706' : '#DC2626' }} />
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: '#64748B' }}>{q.confidence}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#F0FDF4', borderTop: '2px solid #BBF7D0' }}>
                <td className="px-4 py-3" style={{ fontWeight: 700, color: '#15803D' }}>Full Year</td>
                <td className="px-4 py-3" style={{ fontFamily: MONO, fontSize: 12, color: '#475569' }}>{fmtShort(totalBase)}</td>
                <td className="px-4 py-3" style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#15803D' }}>{fmtShort(totalAdjusted)}</td>
                <td colSpan={3} className="px-4 py-3" style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>
                  {savings > 0 ? `Saves ${fmtShort(savings)} vs base` : `+${fmtShort(-savings)} vs base`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-xl p-5 flex flex-col gap-4" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>Scenario Modeling</p>
            <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Adjust assumptions to model outcomes</p>
          </div>
          {([
            { label: 'Member Growth Rate',       value: memberGrowth,   set: setMemberGrowth,   min: -5, max: 20, color: '#2563EB' },
            { label: 'Medical Inflation',        value: medInflation,   set: setMedInflation,   min: 0,  max: 20, color: '#EA580C' },
            { label: 'Fraud Reduction',          value: fraudReduction, set: setFraudReduction, min: 0,  max: 40, color: '#16A34A' },
            { label: 'Care Management Savings',  value: careManagement, set: setCareManagement, min: 0,  max: 30, color: '#7C3AED' },
          ] as const).map(s => (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 12, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{s.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: s.color }}>{s.value > 0 ? '+' : ''}{s.value}%</span>
              </div>
              <input type="range" min={s.min} max={s.max} value={s.value}
                onChange={e => s.set(Number(e.target.value))}
                className="w-full" style={{ accentColor: s.color, height: 4 }} />
            </div>
          ))}

          <div className="mt-2 p-3 rounded-lg" style={{ background: savings > 0 ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${savings > 0 ? '#BBF7D0' : '#FCA5A5'}` }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: savings > 0 ? '#15803D' : '#DC2626', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>
              Scenario Result vs Base
            </p>
            <p style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: savings > 0 ? '#16A34A' : '#DC2626' }}>
              {savings > 0 ? '−' : '+'}{fmt(Math.abs(savings))}
            </p>
            <p style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Projected annual claim cost delta</p>
          </div>

          <button
            onClick={() => onToast('Scenario saved to report queue', 'success')}
            className="w-full py-2 rounded-lg text-sm font-semibold"
            style={{ background: '#1E3A5F', color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}>
            Save Scenario to Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Sections (tabbed bottom panel) ─────────────────────────────────

const TABS: { id: AnalyticsTab; label: string }[] = [
  { id: 'financial',   label: 'Financial Breakdown'  },
  { id: 'risk',        label: 'Risk Stratification'  },
  { id: 'provider',    label: 'Provider Scorecard'   },
  { id: 'utilization', label: 'Utilization Trends'   },
  { id: 'predictive',  label: 'Predictive Modeling'  },
];

function AnalyticsSections({
  onToast,
  riskSegments,
  networkProviders,
}: {
  onToast: (msg: string, type: Toast['type']) => void;
  riskSegments: InsuranceRiskSegment[];
  networkProviders: InsuranceNetworkProvider[];
}) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('financial');

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
      <div className="flex" style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-shrink-0 px-6 py-4 text-sm font-semibold transition-all"
            style={{
              fontFamily: 'Inter, sans-serif', fontSize: 13,
              color: activeTab === tab.id ? '#1E3A5F' : '#64748B',
              borderBottom: activeTab === tab.id ? '2px solid #1E3A5F' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-6">
        {activeTab === 'financial'   && <FinancialTab />}
        {activeTab === 'risk'        && <RiskTab riskSegments={riskSegments} />}
        {activeTab === 'provider'    && <ProviderTab networkProviders={networkProviders} />}
        {activeTab === 'utilization' && <UtilizationTab />}
        {activeTab === 'predictive'  && <PredictiveTab onToast={onToast} />}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type DateRange = 'today' | 'month' | 'last3m' | 'year' | 'custom';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today', month: 'This Month', last3m: 'Last 3 Months', year: 'This Year', custom: 'Custom',
};

const INSIGHT_ICON: Record<string, { icon: React.ReactNode; border: string; bg: string; titleColor: string }> = {
  warning: { icon: <AlertTriangle size={14} color="#D97706" />, border: '#FDE68A', bg: '#FFFBEB', titleColor: '#92400E' },
  success: { icon: <CheckCircle size={14} color="#16A34A" />,   border: '#BBF7D0', bg: '#F0FDF4', titleColor: '#15803D' },
  info:    { icon: <Info size={14} color="#2563EB" />,          border: '#BFDBFE', bg: '#EFF6FF', titleColor: '#1D4ED8' },
};


export const InsuranceRiskAnalytics = () => {
  const { data, error, refetch } = useInsurancePageData();

  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [showExport, setShowExport] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4_000);
  }, []);

  // ── Real data derivations ──────────────────────────────────────────────────

  const riskSegments     = data?.riskSegments ?? [];
  const aiInsights       = data?.aiInsights ?? [];
  const networkProviders = data?.networkProviders ?? [];
  const profile          = data?.profile ?? null;

  // Claims trend: prefer real monthlyClaimsVolume, fall back to mock
  const claimsTrendData = useMemo(() => {
    const vol = data?.monthlyClaimsVolume ?? [];
    if (vol.length > 0) {
      return vol.map(m => ({
        month: m.monthLabel.slice(0, 3),
        submitted: m.claimsValueAed,
        paid: Math.round(m.claimsValueAed * 0.88),
        budget: Math.round(m.claimsValueAed * 1.1),
      }));
    }
    return MOCK_MONTHLY_ACTUALS.map(m => ({ month: m.shortMonth, submitted: m.claimsSubmitted, paid: m.claimsPaid, budget: m.budget }));
  }, [data?.monthlyClaimsVolume]);

  // KPI card values — use real profile data where available, else mock
  const activeMembersVal = profile?.activeMembers ?? MOCK_FINANCIAL_SNAPSHOT.memberCount;
  const claimsMtdVal     = profile?.claimsMtdAed  ?? MOCK_FINANCIAL_SNAPSHOT.claimsPaid;
  const slaOk            = profile?.avgProcessingHours != null && profile.slaTargetStandardHours != null
    ? profile.avgProcessingHours <= profile.slaTargetStandardHours
    : true;
  const slaVal = slaOk ? pct(MOCK_FINANCIAL_SNAPSHOT.slaCompliance) : `${profile?.avgProcessingHours ?? '—'}h avg`;

  // Plan donut — use real member plan breakdown if available
  const planDonutData = useMemo(() => {
    if (profile?.membersGold != null || profile?.membersSilver != null || profile?.membersBasic != null) {
      return [
        { name: 'Gold',   value: profile.membersGold   ?? 0, color: '#F59E0B' },
        { name: 'Silver', value: profile.membersSilver ?? 0, color: '#94A3B8' },
        { name: 'Basic',  value: profile.membersBasic  ?? 0, color: '#3B82F6' },
      ].filter(d => d.value > 0);
    }
    return MOCK_PLAN_BREAKDOWN.map(p => ({ name: p.shortName, value: p.members, color: p.color }));
  }, [profile]);

  const planTotalMembers = planDonutData.reduce((s, d) => s + d.value, 0) || activeMembersVal;

  const riskBarData = MOCK_RISK_STRAT.map(r => ({ tier: r.tier, members: r.members, color: r.color }));

  // Average loss ratio from real segments
  const avgLossRatio = riskSegments.length > 0
    ? riskSegments.reduce((s, r) => s + r.lossRatioPercent, 0) / riskSegments.length / 100
    : MOCK_FINANCIAL_SNAPSHOT.lossRatio;

  const specialtyData = MOCK_SPECIALTY_SPEND.map(s => ({ specialty: s.specialty.split('/')[0], budget: s.budget, actual: s.actual }));

  const slaChartData = MOCK_SLA_DATA.map(s => ({
    category: s.category.split(' ').slice(0, 2).join(' '), target: s.target, actual: s.actual, met: s.met,
  }));

  return (
    <InsuranceShell data={data ?? null} loadError={error ?? null} onRetry={() => void refetch()}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Risk Analytics
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            Actuarial &amp; Risk Management Intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            {(['today', 'month', 'last3m', 'year'] as DateRange[]).map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: dateRange === r ? '#1E3A5F' : 'transparent', color: dateRange === r ? '#fff' : '#64748B', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                {DATE_RANGE_LABELS[r]}
              </button>
            ))}
            <button onClick={() => setDateRange('custom')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              style={{ background: dateRange === 'custom' ? '#1E3A5F' : 'transparent', color: dateRange === 'custom' ? '#fff' : '#64748B', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
              <Calendar size={11} /> Custom
            </button>
          </div>
          <button onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#1E3A5F', color: '#fff', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* ── Financial Snapshot KPI cards ─────────────────────────────────── */}
      <div className="flex gap-4">
        <SnapCard
          label="Premium Revenue"
          value={`AED ${(MOCK_FINANCIAL_SNAPSHOT.premiumRevenue / 1_000_000).toFixed(2)}M`}
          sub="Month-to-date"
          icon={<DollarSign size={16} color="#1E3A5F" />}
          trend="up" trendLabel="+4.2% MoM" highlight
        />
        <SnapCard
          label="Claims Paid"
          value={`AED ${(claimsMtdVal / 1_000_000).toFixed(2)}M`}
          sub={`${pct(MOCK_FINANCIAL_SNAPSHOT.budgetUtilization)} of monthly budget used`}
          icon={<Activity size={16} color="#1E3A5F" />}
          trend="down" trendLabel="−8.1% MoM"
        />
        <SnapCard
          label="Loss Ratio"
          value={pct(avgLossRatio)}
          sub={`Target: ${pct(MOCK_FINANCIAL_SNAPSHOT.lossRatioTarget)} · Well below threshold`}
          icon={<Shield size={16} color="#16A34A" />}
          trend="down" trendLabel="−2.1pp"
        />
        <SnapCard
          label="Active Members"
          value={activeMembersVal.toLocaleString()}
          sub={`${MOCK_FINANCIAL_SNAPSHOT.activePolicies.toLocaleString()} active policies`}
          icon={<Users size={16} color="#1E3A5F" />}
          trend="up" trendLabel="+0.5%"
        />
        <SnapCard
          label="SLA Compliance"
          value={slaVal}
          sub="6 of 7 categories on target"
          icon={<CheckCircle size={16} color="#D97706" />}
          trend="neutral" trendLabel="Stable"
        />
      </div>

      {/* ── Main 2-column layout ─────────────────────────────────────────── */}
      <div className="flex gap-5">

        {/* LEFT — 65% */}
        <div className="flex flex-col gap-5" style={{ flex: '0 0 calc(65% - 10px)', minWidth: 0 }}>

          {/* Chart 1: Claims Trend vs Budget */}
          <ChartCard title="Claims Trend vs Budget" subtitle="Monthly submitted, paid, and budget line">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={claimsTrendData} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Inter, sans-serif' }} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: MONO }} />
                <Tooltip formatter={(v: unknown, name: unknown) => [fmt(Number(v)), String(name)]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }} />
                <Bar dataKey="submitted" name="Submitted" fill="#1E40AF" fillOpacity={0.25} radius={[2, 2, 0, 0]} animationDuration={800} />
                <Bar dataKey="paid"      name="Paid"      fill="#1E40AF" radius={[2, 2, 0, 0]} animationDuration={800} />
                <Line dataKey="budget"   name="Budget"    stroke="#EF4444" strokeWidth={2} strokeDasharray="6 3" dot={false} animationDuration={800} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 2: Specialty Spend */}
          <ChartCard title="Specialty Spend — Budget vs Actual" subtitle="Year-to-date by clinical specialty (AED)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={specialtyData} layout="vertical" margin={{ left: 16, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: MONO }} />
                <YAxis type="category" dataKey="specialty" tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'Inter, sans-serif' }} width={100} />
                <Tooltip formatter={(v: unknown) => fmt(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }} />
                <Bar dataKey="budget" name="Budget" fill="#CBD5E1" radius={[0, 2, 2, 0]} animationDuration={800} />
                <Bar dataKey="actual" name="Actual" fill="#1E3A5F" radius={[0, 2, 2, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 3: Top Provider Performance */}
          <ChartCard title="Top Provider Performance">
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #F1F5F9' }}>
              <table className="w-full" style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                    {['Provider', 'Claims', 'Total Paid', 'Score', 'SLA'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5" style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(networkProviders.length > 0
                    ? networkProviders.slice(0, 5).map(p => ({
                        id: p.id, name: p.providerName, city: p.networkNote ?? 'UAE',
                        claimsSubmitted: p.claimsCount,
                        totalPaid: p.averageCostAed * p.claimsCount,
                        overallScore: Math.round(p.approvalRatePercent),
                        slaScore: Math.round(p.approvalRatePercent),
                      }))
                    : MOCK_PROVIDER_PERF.slice(0, 5)
                  ).map((p, i) => {
                    const scoreColor = p.overallScore >= 90 ? '#16A34A' : p.overallScore >= 80 ? '#2563EB' : '#D97706';
                    return (
                      <tr key={p.id} style={{ borderBottom: i < 4 ? '1px solid #F1F5F9' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                        <td className="px-3 py-2.5" style={{ fontWeight: 500, color: '#1E293B' }}>
                          <p style={{ fontSize: 12 }}>{p.name}</p>
                          <p style={{ fontSize: 10, color: '#94A3B8' }}>{p.city}</p>
                        </td>
                        <td className="px-3 py-2.5" style={{ fontFamily: MONO, color: '#475569' }}>{p.claimsSubmitted.toLocaleString()}</td>
                        <td className="px-3 py-2.5" style={{ fontFamily: MONO, fontWeight: 600, color: '#1E293B' }}>{fmtShort(p.totalPaid)}</td>
                        <td className="px-3 py-2.5">
                          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: scoreColor }}>{p.overallScore}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{
                            fontFamily: MONO,
                            background: p.slaScore >= 90 ? '#DCFCE7' : p.slaScore >= 80 ? '#EFF6FF' : '#FEF3C7',
                            color:      p.slaScore >= 90 ? '#15803D' : p.slaScore >= 80 ? '#1D4ED8' : '#92400E',
                          }}>{p.slaScore}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* Chart 4: SLA Performance Tracker */}
          <ChartCard title="SLA Performance Tracker" subtitle="Hours: actual vs target by category">
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={slaChartData} layout="vertical" margin={{ left: 16, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: MONO }} unit="h" />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'Inter, sans-serif' }} width={100} />
                <Tooltip formatter={(v: unknown) => `${Number(v)}h`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="target" name="Target" fill="#CBD5E1" radius={[0, 2, 2, 0]} animationDuration={800} />
                <Bar dataKey="actual" name="Actual" radius={[0, 2, 2, 0]} animationDuration={800}>
                  {MOCK_SLA_DATA.map(s => <Cell key={s.category} fill={s.met ? '#22C55E' : '#EF4444'} />)}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3" style={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#22C55E' }} /><span style={{ color: '#64748B' }}>SLA Met</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#EF4444' }} /><span style={{ color: '#64748B' }}>SLA Breached</span></div>
              <span style={{ color: '#94A3B8', marginLeft: 'auto' }}>1 breach: Provider Appeal (89.4h vs 72h target)</span>
            </div>
          </ChartCard>
        </div>

        {/* RIGHT — 35% */}
        <div className="flex flex-col gap-5" style={{ flex: '0 0 calc(35% - 10px)', minWidth: 0 }}>

          {/* Chart 5: Plan Distribution Donut */}
          <ChartCard title="Plan Distribution" subtitle="Members by plan tier">
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={planDonutData} cx="50%" cy="50%" innerRadius={36} outerRadius={54} dataKey="value" animationDuration={800}>
                    {planDonutData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-1.5">
                {planDonutData.map(p => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif' }}>{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span style={{ fontFamily: MONO, fontSize: 11, color: '#1E293B', fontWeight: 600 }}>{p.value.toLocaleString()}</span>
                      <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginLeft: 4 }}>({((p.value / planTotalMembers) * 100).toFixed(0)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
              <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>Avg Cost / Member / Month</p>
              <div className="flex flex-col gap-1.5">
                {MOCK_PLAN_BREAKDOWN.map(p => (
                  <div key={p.plan} className="flex items-center justify-between">
                    <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{p.shortName}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: '#1E293B' }}>AED {p.avgCostPerMember.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Chart 6: Risk Stratification Mini Bar */}
          <ChartCard title="Risk Stratification" subtitle="Members by risk tier">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={riskBarData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="tier" tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'Inter, sans-serif' }} />
                <YAxis tick={{ fontSize: 9, fill: '#94A3B8', fontFamily: MONO }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="members" name="Members" radius={[3, 3, 0, 0]} animationDuration={800}>
                  {MOCK_RISK_STRAT.map(r => <Cell key={r.tier} fill={r.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 rounded-lg" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#92400E', fontFamily: 'Inter, sans-serif' }}>Concentration Alert</p>
              <p style={{ fontSize: 11, color: '#78350F', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                {MOCK_RISK_STRAT[0].pct}% Critical members → {((MOCK_RISK_STRAT[0].totalSpend / MOCK_RISK_STRAT.reduce((s, r) => s + r.totalSpend, 0)) * 100).toFixed(0)}% of total spend
              </p>
            </div>
          </ChartCard>

          {/* Chart 7: Denial Rate Trend */}
          <ChartCard title="Denial Rate Trend" subtitle="Oct 2025 – Apr 2026 (%)">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={MOCK_DENIAL_TREND} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'Inter, sans-serif' }} />
                <YAxis unit="%" tick={{ fontSize: 9, fill: '#94A3B8', fontFamily: MONO }} />
                <Tooltip formatter={(v: unknown) => `${Number(v)}%`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Line dataKey="overall"  name="Overall"  stroke="#1E40AF" strokeWidth={2.5} dot={false} animationDuration={800} />
                <Line dataKey="medical"  name="Medical"  stroke="#EA580C" strokeWidth={1.5} dot={false} strokeDasharray="4 2" animationDuration={800} />
                <Line dataKey="pharmacy" name="Pharmacy" stroke="#16A34A" strokeWidth={1.5} dot={false} strokeDasharray="4 2" animationDuration={800} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { label: 'Overall',  val: '7.9%', delta: '−5.3pp' },
                { label: 'Medical',  val: '9.1%', delta: '−5.7pp' },
                { label: 'Pharmacy', val: '4.8%', delta: '−3.6pp' },
              ].map(p => (
                <div key={p.label} className="px-2.5 py-1.5 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <p style={{ fontSize: 10, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{p.label}</p>
                  <p style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#15803D' }}>{p.val} <span style={{ fontSize: 10 }}>{p.delta}</span></p>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* AI Predictive Insights — real aiInsights data */}
          {aiInsights.length > 0 ? (
            <AiRiskPanel insights={aiInsights} />
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)', borderBottom: '1px solid #2D4A6F' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.25)' }}>
                    <Activity size={12} color="#C4B5FD" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Predictive Insights</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(167,139,250,0.2)', color: '#C4B5FD', fontFamily: 'Inter, sans-serif' }}>
                  3 Active
                </span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {[
                  { id: 'i1', key: 'warning', title: 'High-Cost Cluster Detected', category: 'Risk', confidence: 91, detail: 'A cohort of 47 members with overlapping chronic conditions shows 3.2× projected spend vs peer group for next quarter.', impactAmount: 2_840_000 },
                  { id: 'i2', key: 'success', title: 'Preventive Program ROI', category: 'Prevention', confidence: 87, detail: 'Diabetes prevention programme enrollees show 18% lower hospitalization rate — estimated AED 1.4M annual savings.', impactAmount: 1_400_000 },
                  { id: 'i3', key: 'info', title: 'Provider Outlier Pattern', category: 'Provider', confidence: 78, detail: 'One provider shows atypical imaging order frequency (+34% vs specialty median). Peer review recommended.', impactAmount: 420_000 },
                ].map(insight => {
                  const ic = INSIGHT_ICON[insight.key];
                  return (
                    <div key={insight.id} className="rounded-xl p-3.5" style={{ background: ic.bg, border: `1px solid ${ic.border}` }}>
                      <div className="flex items-start gap-2.5 mb-2">
                        {ic.icon}
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 12, fontWeight: 700, color: ic.titleColor, fontFamily: 'Inter, sans-serif' }}>{insight.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(0,0,0,0.06)', color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{insight.category}</span>
                            <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: MONO }}>{insight.confidence}% confidence</span>
                          </div>
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: '#475569', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>{insight.detail}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Financial impact</span>
                        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: ic.titleColor }}>{fmt(insight.impactAmount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom tabbed analytics section ──────────────────────────────── */}
      <AnalyticsSections
        onToast={addToast}
        riskSegments={riskSegments}
        networkProviders={networkProviders}
      />

      {/* ── Export Modal ─────────────────────────────────────────────────── */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} onToast={addToast} />}

      {/* ── Toast stack ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[500] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
        {toasts.map(t => {
          const c = TOAST_COLORS[t.type];
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto"
              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', fontFamily: 'Inter, sans-serif' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>

    </InsuranceShell>
  );
};

export default InsuranceRiskAnalytics;
