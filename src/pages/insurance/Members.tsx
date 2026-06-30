import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Brain,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  DollarSign,
  Download,
  FileText,
  LayoutGrid,
  List,
  Search,
  Send,
  Shield,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { type InsuranceMember, type InsurancePayerProfile } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import InsuranceShell, {
  PreAuthAlert,
  formatCurrency,
  formatNumber,
  useInsurancePageData,
} from './InsuranceShell';

// ─── Static mock data (shown when Supabase returns empty) ────────────────────

const MOCK_PROFILE_MEMBERS: InsurancePayerProfile = {
  displayName: 'Daman National Health',
  arabicName: 'الضمان للتأمين الصحي الوطني',
  regulatorName: 'DHA — Dubai Health Authority',
  activeMembers: 8247,
  membersGold: 2847,
  membersSilver: 3104,
  membersBasic: 1892,
  officerName: 'Sarah Al Mansouri',
  officerTitle: 'Senior Claims Officer',
  aiAutoApprovalPercent: 78.2,
  aiAutoApprovalChangePercent: 3.1,
  avgProcessingHours: 4.2,
  slaTargetStandardHours: 8,
  slaTargetUrgentHours: 4,
  claimsTodayTotalAed: 1_247_840,
  claimsTodayCount: 312,
  claimsTodayApprovedCount: 244,
  claimsTodayApprovedAed: 981_200,
  claimsTodayPendingCount: 48,
  claimsTodayPendingAed: 196_400,
  claimsTodayDeniedCount: 20,
  claimsTodayDeniedAed: 70_240,
  claimsTodayAppealedCount: 0,
  claimsTodayAppealedAed: 0,
  damanExposureTodayAed: 151,
  claimsMtdAed: 4_800_000,
  claimsBudgetAed: 4_000_000,
  claimsBudgetPct: 120,
  priorMonthGrowthPercent: 8.4,
};

const MOCK_MEMBERS: InsuranceMember[] = [
  { id: 'mm-1', externalMemberId: 'MBR-2026-4471', patientName: 'Ahmed Al Rashidi',    planName: 'Gold Enhanced',   utilizationPercent: 82, claimCount: 7,  riskLevel: 'high',   isActive: true  },
  { id: 'mm-2', externalMemberId: 'MBR-2026-4472', patientName: 'Noura Al Hammadi',    planName: 'Silver Standard', utilizationPercent: 34, claimCount: 2,  riskLevel: 'low',    isActive: true  },
  { id: 'mm-3', externalMemberId: 'MBR-2026-4473', patientName: 'Mohammed Al Kaabi',   planName: 'Gold Enhanced',   utilizationPercent: 91, claimCount: 12, riskLevel: 'high',   isActive: true  },
  { id: 'mm-4', externalMemberId: 'MBR-2026-4474', patientName: 'Aisha Al Marzouqi',   planName: 'Basic Essential', utilizationPercent: 18, claimCount: 1,  riskLevel: 'low',    isActive: true  },
  { id: 'mm-5', externalMemberId: 'MBR-2026-4475', patientName: 'Saeed Al Falasi',     planName: 'Gold Enhanced',   utilizationPercent: 67, claimCount: 5,  riskLevel: 'medium', isActive: true  },
  { id: 'mm-6', externalMemberId: 'MBR-2026-4476', patientName: 'Mariam Al Qubaisi',   planName: 'Silver Standard', utilizationPercent: 55, claimCount: 3,  riskLevel: 'medium', isActive: true  },
  { id: 'mm-7', externalMemberId: 'MBR-2026-4477', patientName: 'Hassan Al Suwaidi',   planName: 'Gold Enhanced',   utilizationPercent: 95, claimCount: 22, riskLevel: 'high',   isActive: true  },
  { id: 'mm-8', externalMemberId: 'MBR-2026-4478', patientName: 'Fatima Al Neyadi',    planName: 'Basic Essential', utilizationPercent: 28, claimCount: 2,  riskLevel: 'low',    isActive: false },
];

// ─── Helpers & Constants ──────────────────────────────────────────────────────

type RiskKey = 'HIGH' | 'MEDIUM' | 'LOW';
type PlanKey = 'Gold' | 'Silver' | 'Basic' | 'Thiqa';
type Tab = 'all' | 'risk' | 'benefits' | 'wellness' | 'analytics';
type ViewMode = 'table' | 'card';
interface Toast { id: number; msg: string; type: 'success' | 'warning' | 'info' }

const toRiskKey = (r: InsuranceMember['riskLevel']): RiskKey => {
  if (r === 'high')   return 'HIGH';
  if (r === 'medium') return 'MEDIUM';
  return 'LOW';
};

const extractPlanTier = (planName: string): PlanKey => {
  const l = planName.toLowerCase();
  if (l.includes('gold'))   return 'Gold';
  if (l.includes('silver')) return 'Silver';
  if (l.includes('thiqa'))  return 'Thiqa';
  return 'Basic';
};

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();

const ANNUAL_LIMIT = 100_000;
const getAnnualUsed  = (m: InsuranceMember) => Math.round(m.utilizationPercent * ANNUAL_LIMIT / 100);
const getBenefitAlert = (m: InsuranceMember): 'EXHAUSTED' | 'NEAR_LIMIT' | null =>
  m.utilizationPercent >= 100 ? 'EXHAUSTED' : m.utilizationPercent >= 80 ? 'NEAR_LIMIT' : null;
const getAiScore = (m: InsuranceMember) => Math.max(10, Math.round(100 - m.utilizationPercent * 0.6));

const RISK_COLORS: Record<RiskKey, { badge: string; badgeText: string; dot: string; rowBg: string; border: string }> = {
  HIGH:   { badge: '#FED7AA', badgeText: '#9A3412', dot: '#F97316', rowBg: 'rgba(249,115,22,0.04)',  border: '#FDBA74' },
  MEDIUM: { badge: '#FEF3C7', badgeText: '#92400E', dot: '#F59E0B', rowBg: 'rgba(245,158,11,0.04)', border: '#FCD34D' },
  LOW:    { badge: '#D1FAE5', badgeText: '#065F46', dot: '#10B981', rowBg: 'rgba(16,185,129,0.04)', border: '#6EE7B7' },
};

const PLAN_BADGE: Record<PlanKey, { bg: string; text: string }> = {
  Gold:   { bg: '#FEF3C7', text: '#92400E' },
  Silver: { bg: '#F1F5F9', text: '#475569' },
  Basic:  { bg: '#EFF6FF', text: '#1E40AF' },
  Thiqa:  { bg: '#F3E8FF', text: '#6B21A8' },
};

const barColorPct = (pct: number) =>
  pct >= 100 ? '#DC2626' : pct >= 86 ? '#F97316' : pct >= 61 ? '#F59E0B' : '#10B981';

const scoreColor = (s: number) =>
  s >= 80 ? '#10B981' : s >= 60 ? '#0D9488' : s >= 40 ? '#F59E0B' : '#DC2626';

const TOAST_COLORS: Record<Toast['type'], { border: string; color: string; bg: string }> = {
  success: { border: '#6EE7B7', color: '#065F46', bg: '#F0FDF4' },
  warning: { border: '#FCA5A5', color: '#991B1B', bg: '#FFF5F5' },
  info:    { border: '#93C5FD', color: '#1E40AF', bg: '#EFF6FF' },
};

const TEMPLATES = [
  { id: 'annual_checkup',  label: 'Annual Checkup Reminder',    subject: 'Time for Your Annual Health Checkup',           subjectAr: 'حان وقت الفحص الصحي السنوي',          msgEn: 'Dear Member,\n\nYour annual health checkup is due. Early detection saves lives.\n\nBook your appointment today at any Daman network facility.\n\nWarm regards,\nDaman National Health Insurance',  msgAr: 'عزيزي العضو،\n\nموعد فحصك الصحي السنوي قد حان. الكشف المبكر ينقذ الأرواح.\n\nاحجز موعدك اليوم.\n\nضمان التأمين الصحي الوطني' },
  { id: 'chronic_mgmt',   label: 'Chronic Disease Management',  subject: 'Important: Managing Your Chronic Condition',     subjectAr: 'مهم: إدارة حالتك المزمنة',            msgEn: 'Dear Member,\n\nManaging your condition is key to a high quality of life. Our care coordinators are available to support you.\n\nContact us at 800-DAMAN.\n\nWarm regards,\nDaman',              msgAr: 'عزيزي العضو،\n\nمنسقو الرعاية لدينا متاحون لدعمك.\n\nتواصل معنا على DAMAN-800.\n\nضمان التأمين الصحي الوطني' },
  { id: 'benefit_expiry', label: 'Benefits Expiring Soon',       subject: 'Your Insurance Benefits Expire Soon',           subjectAr: 'تنتهي مزاياك التأمينية قريباً',       msgEn: 'Dear Member,\n\nYour annual insurance benefits are approaching their limit. Schedule pending procedures before the policy year ends.\n\nFor assistance, call 800-DAMAN.\n\nWarm regards,\nDaman', msgAr: 'عزيزي العضو،\n\nتقترب مزاياك السنوية من حدها الأقصى. جدولي أي إجراءات طبية قبل نهاية سنة الوثيقة.\n\nضمان التأمين الصحي الوطني' },
  { id: 'preventive_care',label: 'Preventive Care Program',     subject: "Join Daman's Preventive Care Program",          subjectAr: 'انضم إلى برنامج الرعاية الوقائية',  msgEn: "Dear Member,\n\nDaman's Preventive Care Program offers free screenings and health coaching.\n\nEnroll today through the Daman app.\n\nWarm regards,\nDaman",                                      msgAr: 'عزيزي العضو،\n\nسجّل في برنامج الرعاية الوقائية من ضمان اليوم.\n\nضمان التأمين الصحي الوطني' },
  { id: 'custom',         label: 'Custom Message',              subject: '',                                              subjectAr: '',                                    msgEn: '',                                                                                                                                                                                                         msgAr: '' },
];

// ─── ScoreRing ─────────────────────────────────────────────────────────────────

const ScoreRing = ({ score, size = 64 }: { score: number; size?: number }) => {
  const color  = scoreColor(score);
  const r      = (size - 8) / 2;
  const c      = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: size * 0.25, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.12, color: '#94A3B8', lineHeight: 1 }}>/100</span>
      </div>
    </div>
  );
};

// ─── UsageBar ─────────────────────────────────────────────────────────────────

const UsageBar = ({ pct }: { pct: number }) => {
  const color = barColorPct(pct);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0', minWidth: 60 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700, color, minWidth: 34 }}>{pct}%</span>
    </div>
  );
};

// ─── ExportModal ──────────────────────────────────────────────────────────────

const ExportModal = ({ onClose }: { onClose: () => void }) => {
  const [fmt,      setFmt]      = useState('xlsx');
  const [scope,    setScope]    = useState('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const doExport = () => {
    setExporting(true);
    setTimeout(() => { setExporting(false); onClose(); }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 440 }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#0F2D4A' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <Download size={16} color="#fff" />
            </div>
            <span className="text-white font-semibold text-base">Export Members</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <X size={16} color="#fff" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Format</p>
            <div className="flex gap-2">
              {['xlsx', 'csv', 'pdf'].map(f => (
                <button key={f} onClick={() => setFmt(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 uppercase transition-all ${fmt === f ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Scope</p>
            <div className="space-y-2">
              {[
                { id: 'all',      label: 'All Members',              desc: 'Full member portfolio'            },
                { id: 'filtered', label: 'Current Filter / View',    desc: 'Matches current search & filters' },
                { id: 'selected', label: 'Selected Members Only',    desc: 'Based on checkbox selection'      },
              ].map(s => (
                <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${scope === s.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" checked={scope === s.id} onChange={() => setScope(s.id)} style={{ accentColor: '#2563EB' }} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                    <p className="text-xs text-slate-500">{s.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50">Cancel</button>
          <button onClick={doExport} disabled={exporting}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#0F2D4A' }}>
            {exporting ? 'Exporting...' : <><Download size={15} /> Export {fmt.toUpperCase()}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── WellnessCampaignModal ────────────────────────────────────────────────────

type Audience = 'all' | 'high_risk' | 'benefit_alert';
type Channel  = 'sms' | 'email' | 'push';

const WellnessCampaignModal = ({
  members, onClose, onSend,
}: {
  members: InsuranceMember[];
  onClose: () => void;
  onSend: (count: number) => void;
}) => {
  const [step,       setStep]       = useState(0);
  const [audience,   setAudience]   = useState<Audience>('high_risk');
  const [filterPlan, setFilterPlan] = useState<PlanKey[]>([]);
  const [templateId, setTemplateId] = useState('annual_checkup');
  const [subjectEn,  setSubjectEn]  = useState(TEMPLATES[0].subject);
  const [subjectAr,  setSubjectAr]  = useState(TEMPLATES[0].subjectAr);
  const [messageEn,  setMessageEn]  = useState(TEMPLATES[0].msgEn);
  const [messageAr,  setMessageAr]  = useState(TEMPLATES[0].msgAr);
  const [channels,   setChannels]   = useState<Channel[]>(['sms', 'email']);
  const [sending,    setSending]    = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const audienceCount = useMemo(() => {
    if (audience === 'all') return members.length;
    if (audience === 'high_risk') return members.filter(m => m.riskLevel === 'high').length;
    return members.filter(m => getBenefitAlert(m) !== null).length;
  }, [audience, members]);

  const togglePlan = (p: PlanKey) =>
    setFilterPlan(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleChannel = (c: Channel) =>
    setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const t = TEMPLATES.find(t => t.id === id);
    if (t) { setSubjectEn(t.subject); setSubjectAr(t.subjectAr); setMessageEn(t.msgEn); setMessageAr(t.msgAr); }
  };

  const handleSend = () => {
    setSending(true);
    setTimeout(() => { setSending(false); onSend(audienceCount); }, 1400);
  };

  const steps      = ['Audience', 'Message', 'Preview & Send'];
  const canProceed = step === 0 ? audienceCount > 0 : step === 1 ? (subjectEn.trim() && messageEn.trim() && channels.length > 0) : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 560, maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ backgroundColor: '#0F2D4A' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <Send size={16} color="#fff" />
            </div>
            <span className="text-white font-semibold text-base">Send Wellness Outreach</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 px-6 py-4 border-b border-slate-100 flex-shrink-0">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: i < step ? '#10B981' : i === step ? '#0F2D4A' : '#E2E8F0', color: i <= step ? '#fff' : '#94A3B8' }}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${i === step ? 'text-slate-800' : i < step ? 'text-emerald-600' : 'text-slate-400'}`}>{s}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {step === 0 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Who Receives This Message</p>
                <div className="space-y-2">
                  {([
                    { id: 'all',          label: 'All Members',              desc: `All ${members.length} members in portfolio`                                    },
                    { id: 'high_risk',    label: 'High Risk Members',        desc: `${members.filter(m => m.riskLevel === 'high').length} members with high risk` },
                    { id: 'benefit_alert',label: 'Benefit Alert Members',    desc: `${members.filter(m => getBenefitAlert(m) !== null).length} members near/at limit` },
                  ] as const).map(opt => (
                    <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${audience === opt.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" checked={audience === opt.id} onChange={() => setAudience(opt.id)} style={{ accentColor: '#2563EB' }} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filter by Plan (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {(['Gold', 'Silver', 'Basic', 'Thiqa'] as PlanKey[]).map(p => {
                    const pc = PLAN_BADGE[p];
                    const active = filterPlan.includes(p);
                    return (
                      <button key={p} onClick={() => togglePlan(p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                        style={{ borderColor: active ? pc.text : '#E2E8F0', backgroundColor: active ? pc.bg : '#fff', color: active ? pc.text : '#64748B' }}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Users size={20} color="#059669" />
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-medium">Estimated Reach</p>
                  <p className="text-lg font-bold text-emerald-700" style={{ fontFamily: 'DM Mono, monospace' }}>
                    {audienceCount.toLocaleString()} <span className="text-sm font-normal">members</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Template</p>
                <div className="relative">
                  <select value={templateId} onChange={e => handleTemplateChange(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-700 pr-8 focus:outline-none">
                    {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject (English)</label>
                  <input value={subjectEn} onChange={e => setSubjectEn(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none" placeholder="English subject" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject (Arabic)</label>
                  <input value={subjectAr} onChange={e => setSubjectAr(e.target.value)} dir="rtl"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none" placeholder="الموضوع بالعربية" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message (English)</label>
                  <textarea value={messageEn} onChange={e => setMessageEn(e.target.value)} rows={7}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none resize-none" placeholder="English message..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message (Arabic)</label>
                  <textarea value={messageAr} onChange={e => setMessageAr(e.target.value)} rows={7} dir="rtl"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none resize-none" placeholder="الرسالة بالعربية..." />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Delivery Channels</p>
                <div className="flex gap-3">
                  {(['sms', 'email', 'push'] as Channel[]).map(ch => (
                    <label key={ch} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${channels.includes(ch) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={channels.includes(ch)} onChange={() => toggleChannel(ch)} style={{ accentColor: '#2563EB' }} />
                      <span className="text-sm font-semibold text-slate-700 uppercase">{ch}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campaign Summary</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    {audienceCount.toLocaleString()} recipients
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    ['Audience', audience === 'all' ? 'All Members' : audience === 'high_risk' ? 'High Risk Members' : 'Benefit Alert Members'],
                    ['Channels', channels.join(' · ').toUpperCase()],
                    ['Subject',  subjectEn],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                      <span className="text-xs text-slate-500 w-20 flex-shrink-0 mt-0.5">{k}</span>
                      <span className="text-xs font-semibold text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Message Preview</p>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {messageEn.length > 300 ? messageEn.slice(0, 300) + '…' : messageEn}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-800 mb-1">DHA Compliance Notice</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    All communications must comply with the DHA Patient Rights Charter and Federal Law No. 2 of 2019 on ICT in Health Fields. Ensure content is medically accurate and does not constitute unsolicited medical advice.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
          <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors">
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canProceed}
              className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: '#0F2D4A' }}>
              Continue
            </button>
          ) : (
            <button onClick={handleSend} disabled={sending}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 justify-center"
              style={{ backgroundColor: '#0F2D4A', minWidth: 180 }}>
              {sending ? 'Sending...' : <><Send size={15} /> Send Campaign</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── MemberDetailDrawer ───────────────────────────────────────────────────────

type DrawerTab = 'overview' | 'claims' | 'health' | 'benefits';

const MemberDetailDrawer = ({
  member, allMembers, onClose, onToast, onNavigate,
}: {
  member: InsuranceMember;
  allMembers: InsuranceMember[];
  onClose: () => void;
  onToast: (msg: string, type: Toast['type']) => void;
  onNavigate: (m: InsuranceMember) => void;
}) => {
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('overview');

  const idx   = allMembers.findIndex(m => m.id === member.id);
  const prev  = idx > 0 ? allMembers[idx - 1] : null;
  const next  = idx < allMembers.length - 1 ? allMembers[idx + 1] : null;

  const rk      = toRiskKey(member.riskLevel);
  const rc      = RISK_COLORS[rk];
  const tier    = extractPlanTier(member.planName);
  const pc      = PLAN_BADGE[tier];
  const pct     = member.utilizationPercent;
  const bc      = barColorPct(pct);
  const used    = getAnnualUsed(member);
  const aiScore = getAiScore(member);
  const initials = getInitials(member.patientName);
  const alert   = getBenefitAlert(member);

  const TABS: { key: DrawerTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview',       icon: <User     style={{ width: 12, height: 12 }} /> },
    { key: 'claims',   label: 'Claims',          icon: <DollarSign style={{ width: 12, height: 12 }} /> },
    { key: 'health',   label: 'Health Profile',  icon: <Activity style={{ width: 12, height: 12 }} /> },
    { key: 'benefits', label: 'Benefits',        icon: <FileText style={{ width: 12, height: 12 }} /> },
  ];

  return (
    <div className="fixed inset-0 z-[500]" style={{ pointerEvents: 'none' }}>
      <div className="absolute inset-0" style={{ background: 'rgba(15,45,74,0.25)', backdropFilter: 'blur(2px)', pointerEvents: 'auto' }}
        onClick={onClose} />

      <div className="absolute right-0 top-0 bottom-0 flex flex-col"
        style={{ width: 660, background: '#fff', borderLeft: '1px solid #E2E8F0', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', pointerEvents: 'auto' }}>

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '16px 20px', background: '#0F2D4A', borderBottom: '1px solid #1E3A5F' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Member Profile</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#93C5FD' }}>
              {member.patientName} · {member.externalMemberId}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-1"
              style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.12)', color: '#FDE68A' }}>
              {rk} RISK
            </span>
            <button onClick={onClose} className="rounded-lg p-1.5"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Inner tabs */}
        <div className="flex flex-shrink-0"
          style={{ background: '#1E3A5F', padding: '0 20px', borderBottom: '1px solid #2D4A6F' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setDrawerTab(t.key)}
              className="flex items-center gap-1.5 py-3 px-3"
              style={{
                fontSize: 12, fontWeight: drawerTab === t.key ? 700 : 400,
                color: drawerTab === t.key ? '#93C5FD' : '#64748B',
                borderBottom: drawerTab === t.key ? '2px solid #93C5FD' : '2px solid transparent',
                marginBottom: -1, whiteSpace: 'nowrap',
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* OVERVIEW */}
          {drawerTab === 'overview' && (
            <>
              <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="rounded-full flex items-center justify-center"
                      style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #1E3A5F, #0D9488)', color: '#fff', fontSize: 18, fontWeight: 800 }}>
                      {initials}
                    </div>
                    <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white"
                      style={{ width: 14, height: 14, background: rc.dot }} />
                  </div>
                  <div className="flex-1">
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{member.patientName}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="rounded-full px-2 py-0.5"
                        style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, background: pc.bg, color: pc.text, fontWeight: 700 }}>
                        {member.externalMemberId}
                      </span>
                      <span className="rounded-full px-2 py-0.5"
                        style={{ fontSize: 9, background: pc.bg, color: pc.text, fontWeight: 700 }}>
                        Daman {tier}
                      </span>
                      <span className="rounded-full px-2 py-0.5"
                        style={{ fontSize: 9, background: rc.badge, color: rc.badgeText, fontWeight: 700 }}>
                        {rk} RISK
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {[
                    ['Member ID',    member.externalMemberId],
                    ['Plan',         `Daman ${tier} — ${member.planName}`],
                    ['Risk Level',   `${rk} RISK`],
                    ['Utilization',  `${pct}%`],
                    ['Claims YTD',   String(member.claimCount)],
                    ['Benefit Alert', alert ?? '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{k}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#0F172A', fontWeight: 600 }}>
                        {v}
                        {k === 'Member ID' && (
                          <button onClick={() => { navigator.clipboard.writeText(member.externalMemberId).catch(() => {}); onToast('Member ID copied', 'info'); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: '#94A3B8' }}>
                            <Copy style={{ width: 9, height: 9 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: member.claimCount, label: 'Claims YTD'   },
                  { value: pct,               label: '% Utilization' },
                  { value: aiScore,            label: 'AI Health Score' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl text-center"
                    style={{ padding: '12px 8px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 800, color: '#1E3A5F' }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Wellness flag */}
              {member.riskLevel === 'high' && (
                <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
                  <AlertTriangle style={{ width: 12, height: 12, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: '#92400E' }}>
                    High-risk member — proactive wellness outreach recommended per DHA chronic disease management guidelines.
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Wellness Outreach', bg: '#EFF6FF', color: '#1E3A5F',  action: () => onToast(`Wellness outreach sent to ${member.patientName}`, 'success') },
                  { label: 'View Pre-Auths',    bg: '#EEF2FF', color: '#4338CA',  action: () => onToast('Navigating to pre-auths for this member', 'info')           },
                  { label: 'Flag for Review',   bg: '#FFFBEB', color: '#92400E',  action: () => onToast(`${member.patientName} flagged for care review`, 'warning')  },
                ].map(a => (
                  <button key={a.label} onClick={a.action}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 flex-1"
                    style={{ fontSize: 12, fontWeight: 600, background: a.bg, color: a.color, border: `1px solid ${a.color}20` }}>
                    <Send style={{ width: 12, height: 12 }} />{a.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* CLAIMS */}
          {drawerTab === 'claims' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Claims YTD',   value: String(member.claimCount),                        color: '#1E3A5F' },
                  { label: 'Estimated Value',     value: formatCurrency(member.claimCount * 500),          color: '#1E3A5F' },
                  { label: 'Daman Liability (est)', value: formatCurrency(member.claimCount * 450),        color: '#059669' },
                  { label: 'Patient Paid (est)',    value: formatCurrency(member.claimCount * 50),         color: '#D97706' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-6 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>Detailed claims history available in the Claims Worklist</div>
              </div>
              <button onClick={() => onToast(`Claims history downloaded for ${member.patientName}`, 'success')}
                className="w-full rounded-xl py-2 flex items-center justify-center gap-2"
                style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 12 }}>
                <Download style={{ width: 13, height: 13 }} /> Download Claims Summary
              </button>
            </>
          )}

          {/* HEALTH PROFILE */}
          {drawerTab === 'health' && (
            <>
              <div className="rounded-xl p-3 flex items-start gap-2"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <Shield style={{ width: 12, height: 12, color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: '#1E40AF', lineHeight: 1.5 }}>
                  Health data accessed from CeenAiX via Nabidh HIE for claims processing only. Access logged per UAE PDPL (Federal Law No. 45/2021).
                </p>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Brain style={{ width: 16, height: 16, color: '#7C3AED' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95' }}>CeenAiX AI Health Score</span>
                </div>
                <div className="flex items-center gap-6">
                  <ScoreRing score={aiScore} size={80} />
                  <div className="flex-1">
                    <p style={{ fontSize: 11, color: '#6D28D9', fontStyle: 'italic', marginBottom: 8 }}>
                      Based on: utilization patterns, risk level, claims frequency
                    </p>
                    {[
                      { label: 'Benefits used',       pct: Math.min(100, pct)              },
                      { label: 'Risk level',          pct: rk === 'LOW' ? 85 : rk === 'MEDIUM' ? 60 : 35 },
                      { label: 'Claims frequency',    pct: Math.max(10, 100 - member.claimCount * 8)      },
                    ].map(b => (
                      <div key={b.label} className="flex items-center gap-2 mb-1.5">
                        <div style={{ fontSize: 10, color: '#7C3AED', width: 120, flexShrink: 0 }}>{b.label}</div>
                        <div className="flex-1 rounded-full" style={{ height: 4, background: '#E9D5FF' }}>
                          <div className="rounded-full" style={{ height: 4, width: `${b.pct}%`, background: scoreColor(b.pct) }} />
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#7C3AED', width: 28 }}>{b.pct}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  HEALTH DATA SOURCE
                </div>
                <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
                  Detailed clinical data (vitals, labs, medications, conditions) is available via the CeenAiX platform for members who have completed at least one consultation. Contact the clinical data team for full health records access.
                </p>
              </div>
            </>
          )}

          {/* BENEFITS */}
          {drawerTab === 'benefits' && (
            <>
              <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  ANNUAL BENEFIT STATUS — 2026
                </div>
                <div className="flex items-center gap-6">
                  <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
                    <svg width={100} height={100} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                      <circle cx={50} cy={50} r={42} fill="none" stroke="#F1F5F9" strokeWidth={8} />
                      <circle cx={50} cy={50} r={42} fill="none" stroke={bc} strokeWidth={8}
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(pct, 100) / 100)}
                        strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 800, color: bc }}>{pct}%</span>
                      <span style={{ fontSize: 9, color: '#94A3B8' }}>used</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#334155', marginBottom: 2 }}>AED {used.toLocaleString()} used</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 800, color: bc, marginBottom: 2 }}>
                      AED {(ANNUAL_LIMIT - used).toLocaleString()} remaining
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>of AED {ANNUAL_LIMIT.toLocaleString()} annual limit</div>
                    {alert === 'EXHAUSTED' && (
                      <div className="mt-2 rounded px-2 py-1" style={{ background: '#FEE2E2', display: 'inline-block', fontSize: 10, color: '#991B1B', fontWeight: 700 }}>
                        ANNUAL LIMIT EXHAUSTED
                      </div>
                    )}
                    {alert === 'NEAR_LIMIT' && (
                      <div className="mt-2 rounded px-2 py-1" style={{ background: '#FED7AA', display: 'inline-block', fontSize: 10, color: '#9A3412', fontWeight: 700 }}>
                        NEAR ANNUAL LIMIT
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  DAMAN {tier.toUpperCase()} COVERAGE
                </div>
                {[
                  { item: 'Specialist consultations',               covered: true  },
                  { item: 'Radiology & Imaging (PA for MRI/CT)',    covered: true  },
                  { item: 'Laboratory tests',                       covered: true  },
                  { item: 'Pharmacy — generic medicines',          covered: true  },
                  { item: 'Emergency care (100%)',                  covered: true  },
                  { item: 'Teleconsultation via CeenAiX',          covered: true  },
                  { item: 'Cosmetic procedures',                    covered: false },
                  { item: 'Fertility treatment',                    covered: false },
                  { item: 'Dental (emergency only)',                covered: false },
                ].map(c => (
                  <div key={c.item} className="flex items-center gap-2 mb-1.5">
                    <span style={{ fontSize: 13 }}>{c.covered ? '✅' : '❌'}</span>
                    <span style={{ fontSize: 11, color: c.covered ? '#334155' : '#94A3B8' }}>{c.item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between" style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9' }}>
          <div className="flex gap-2">
            <button onClick={() => onToast(`Wellness outreach sent to ${member.patientName}`, 'success')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2"
              style={{ fontSize: 11, background: '#EFF6FF', color: '#1E3A5F', border: '1px solid #BFDBFE' }}>
              <Send style={{ width: 11, height: 11 }} /> Wellness
            </button>
            <button onClick={() => onToast(`Member report downloaded — ${member.patientName}`, 'success')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2"
              style={{ fontSize: 11, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>
              <Download style={{ width: 11, height: 11 }} /> Report
            </button>
            <button onClick={() => onToast('Navigating to pre-authorizations', 'info')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2"
              style={{ fontSize: 11, background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }}>
              <ClipboardList style={{ width: 11, height: 11 }} /> Pre-Auths
            </button>
          </div>
          <div className="flex gap-1">
            <button onClick={() => prev && onNavigate(prev)} disabled={!prev}
              className="rounded-lg px-2 py-1.5 flex items-center gap-1"
              style={{ fontSize: 11, color: prev ? '#475569' : '#CBD5E1', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <ChevronLeft style={{ width: 12, height: 12 }} /> Prev
            </button>
            <button onClick={() => next && onNavigate(next)} disabled={!next}
              className="rounded-lg px-2 py-1.5 flex items-center gap-1"
              style={{ fontSize: 11, color: next ? '#475569' : '#CBD5E1', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              Next <ChevronRight style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Population Analytics ─────────────────────────────────────────────────────

const PopulationAnalytics = ({
  members, profile,
}: {
  members: InsuranceMember[];
  profile: ReturnType<typeof useInsurancePageData>['data'] extends null | undefined ? null : NonNullable<ReturnType<typeof useInsurancePageData>['data']>['profile'];
}) => {
  const highCount   = members.filter(m => m.riskLevel === 'high').length;
  const mediumCount = members.filter(m => m.riskLevel === 'medium').length;
  const lowCount    = members.filter(m => m.riskLevel === 'low').length;

  const riskPie = [
    { name: 'HIGH',   value: highCount,              fill: '#F97316' },
    { name: 'MEDIUM', value: mediumCount,             fill: '#F59E0B' },
    { name: 'LOW',    value: lowCount,                fill: '#10B981' },
  ].filter(r => r.value > 0);

  const planPie = [
    { name: 'Gold',   value: profile?.membersGold   ?? 0, fill: '#F59E0B' },
    { name: 'Silver', value: profile?.membersSilver ?? 0, fill: '#64748B' },
    { name: 'Basic',  value: profile?.membersBasic  ?? 0, fill: '#3B82F6' },
  ].filter(p => p.value > 0);

  const utilBuckets = [
    { label: '0–25%', count: members.filter(m => m.utilizationPercent < 25).length,                                   color: '#10B981' },
    { label: '26–60%', count: members.filter(m => m.utilizationPercent >= 25 && m.utilizationPercent < 60).length,    color: '#0D9488' },
    { label: '61–85%', count: members.filter(m => m.utilizationPercent >= 60 && m.utilizationPercent < 85).length,    color: '#F59E0B' },
    { label: '86–99%', count: members.filter(m => m.utilizationPercent >= 85 && m.utilizationPercent < 100).length,   color: '#F97316' },
    { label: '100%+',  count: members.filter(m => m.utilizationPercent >= 100).length,                                color: '#DC2626' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Risk distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-4">Risk Distribution</p>
          <div className="flex items-center gap-4">
            <div style={{ width: 140, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskPie} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                    {riskPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1">
              {riskPie.map(r => (
                <div key={r.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.fill }} />
                    <span className="text-xs font-semibold text-slate-600">{r.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{r.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Plan mix */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-700 mb-4">Plan Mix</p>
          {planPie.some(p => p.value > 0) ? (
            <div className="flex items-center gap-4">
              <div style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planPie} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                      {planPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {planPie.map(p => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.fill }} />
                      <span className="text-xs font-semibold text-slate-600">{p.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{p.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center" style={{ height: 140 }}>
              <span className="text-xs text-slate-400">Plan mix data not available</span>
            </div>
          )}
        </div>
      </div>

      {/* Benefit utilisation bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-700 mb-4">Benefit Utilisation Distribution</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={utilBuckets} barSize={28}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v: number | string | readonly (string | number)[] | undefined) => [`${v ?? 0} members`]} labelStyle={{ fontSize: 12 }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {utilBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Avg Utilization',   value: members.length > 0 ? `${Math.round(members.reduce((s, m) => s + m.utilizationPercent, 0) / members.length)}%` : '—', color: '#0D9488' },
          { label: 'Near / At Limit',   value: formatNumber(members.filter(m => getBenefitAlert(m) !== null).length), color: '#F97316' },
          { label: 'Avg Claims / Member', value: members.length > 0 ? (members.reduce((s, m) => s + m.claimCount, 0) / members.length).toFixed(1) : '—', color: '#2563EB' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const InsuranceMembers = () => {
  const { data, loading, error, refetch, overduePreAuth } = useInsurancePageData();
  const members = useMemo(() =>
    (data?.members.length ?? 0) > 0 ? data!.members : MOCK_MEMBERS,
    [data?.members]);
  const profile = (data?.profile?.activeMembers ?? 0) > 0 ? data!.profile! : MOCK_PROFILE_MEMBERS;

  const [tab,          setTab]          = useState<Tab>('all');
  const [viewMode,     setViewMode]     = useState<ViewMode>('table');
  const [search,       setSearch]       = useState('');
  const [planFilter,   setPlanFilter]   = useState<PlanKey[]>([]);
  const [riskFilter,   setRiskFilter]   = useState<Array<InsuranceMember['riskLevel']>>([]);
  const [benefitFilter, setBenefitFilter] = useState('');
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [openMember,   setOpenMember]   = useState<InsuranceMember | null>(null);
  const [showWellness, setShowWellness] = useState(false);
  const [showExport,   setShowExport]   = useState(false);
  const [toasts,       setToasts]       = useState<Toast[]>([]);

  const toast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const toggleSelect = useCallback((id: string) =>
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    }), []);

  const togglePlan = (p: PlanKey) => setPlanFilter(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleRisk = (r: InsuranceMember['riskLevel']) => setRiskFilter(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const filtered = useMemo(() => {
    let list = [...members];
    if (tab === 'risk')     list = list.filter(m => m.riskLevel === 'high');
    if (tab === 'benefits') list = list.filter(m => getBenefitAlert(m) !== null);
    if (tab === 'wellness') list = list.filter(m => m.riskLevel === 'high' || m.riskLevel === 'medium');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.patientName.toLowerCase().includes(q)       ||
        m.externalMemberId.toLowerCase().includes(q)  ||
        m.planName.toLowerCase().includes(q),
      );
    }
    if (planFilter.length) list = list.filter(m => planFilter.includes(extractPlanTier(m.planName)));
    if (riskFilter.length) list = list.filter(m => riskFilter.includes(m.riskLevel));
    if (benefitFilter === 'exhausted') list = list.filter(m => getBenefitAlert(m) === 'EXHAUSTED');
    if (benefitFilter === 'near')      list = list.filter(m => getBenefitAlert(m) === 'NEAR_LIMIT');
    return list;
  }, [members, tab, search, planFilter, riskFilter, benefitFilter]);

  const allSelected = filtered.length > 0 && filtered.every(m => selectedIds.has(m.id));
  const toggleAll   = () => {
    if (allSelected) { setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(m => n.delete(m.id)); return n; }); }
    else             { setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(m => n.add(m.id)); return n; }); }
  };

  // Derived alert counts
  const exhaustedMembers    = members.filter(m => getBenefitAlert(m) === 'EXHAUSTED');
  const nearLimitMembers    = members.filter(m => getBenefitAlert(m) === 'NEAR_LIMIT');
  const highRiskMembers     = members.filter(m => m.riskLevel === 'high');
  const hasFilters          = planFilter.length > 0 || riskFilter.length > 0 || benefitFilter || search;

  const tabDefs: { id: Tab; label: string; count?: number; icon: React.ElementType }[] = [
    { id: 'all',       label: 'All Members',          count: members.length,                                    icon: Users        },
    { id: 'risk',      label: 'High Risk',             count: highRiskMembers.length,                           icon: AlertTriangle },
    { id: 'benefits',  label: 'Benefit Alerts',        count: exhaustedMembers.length + nearLimitMembers.length, icon: Activity     },
    { id: 'wellness',  label: 'Wellness Outreach',                                                              icon: TrendingUp   },
    { id: 'analytics', label: 'Population Analytics',                                                           icon: BarChart2    },
  ];

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <PreAuthAlert item={overduePreAuth} />

      {/* Priority alerts strip */}
      {(exhaustedMembers.length > 0 || nearLimitMembers.length > 0 || highRiskMembers.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl px-4 py-2"
          style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Priority Alerts:</span>
          {exhaustedMembers.length > 0 && (
            <button onClick={() => setTab('benefits')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'pulse 2s infinite' }} />
              {exhaustedMembers.length} benefit limit exhausted
            </button>
          )}
          {nearLimitMembers.length > 0 && (
            <button onClick={() => setTab('benefits')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              {nearLimitMembers.length} near benefit limit
            </button>
          )}
          {highRiskMembers.length > 0 && (
            <button onClick={() => setTab('risk')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
              <AlertTriangle size={11} />
              {highRiskMembers.length} high-risk members
            </button>
          )}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {[
          { label: 'Total Members',   value: formatNumber(profile?.activeMembers ?? members.length), sub: 'On CeenAiX platform',                                      color: '#0F2D4A', icon: Users         },
          { label: 'Gold Plan',       value: formatNumber(profile?.membersGold   ?? 0),              sub: 'Premium tier',                                              color: '#F59E0B', icon: TrendingUp    },
          { label: 'Silver Plan',     value: formatNumber(profile?.membersSilver ?? 0),              sub: 'Mid-tier',                                                  color: '#64748B', icon: Users         },
          { label: 'Basic Plan',      value: formatNumber(profile?.membersBasic  ?? 0),              sub: 'Essential cover',                                           color: '#3B82F6', icon: Users         },
          { label: 'High Risk',       value: formatNumber(highRiskMembers.length),                   sub: 'Require intervention',                                      color: '#DC2626', icon: AlertTriangle },
          { label: 'Near / At Limit', value: formatNumber(exhaustedMembers.length + nearLimitMembers.length), sub: `${members.length > 0 ? Math.round((exhaustedMembers.length + nearLimitMembers.length) / members.length * 100) : 0}% of portfolio`, color: '#F97316', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}18` }}>
                <s.icon size={16} color={s.color} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{s.value}</p>
            {s.sub && <p className="text-xs text-slate-500">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Page header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Members</h2>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>Active plan members and utilization risk</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowWellness(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#0F2D4A' }}>
              <Send size={14} /> Wellness Campaign
            </button>
            <button onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative" style={{ width: 260 }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search}
              onChange={e => setSearch(e.target.value)}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
              placeholder="Search members, ID, or plan..."
              className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none" />
          </div>

          {/* Plan pills */}
          <div className="flex items-center gap-1">
            {(['Gold', 'Silver', 'Basic', 'Thiqa'] as PlanKey[]).map(p => {
              const pc = PLAN_BADGE[p];
              const active = planFilter.includes(p);
              return (
                <button key={p} onClick={() => togglePlan(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all"
                  style={{ borderColor: active ? pc.text : '#E2E8F0', backgroundColor: active ? pc.bg : '#fff', color: active ? pc.text : '#64748B' }}>
                  {p}
                </button>
              );
            })}
          </div>

          {/* Risk pills */}
          <div className="flex items-center gap-1">
            {(['high', 'medium', 'low'] as const).map(r => {
              const rk  = toRiskKey(r);
              const rc  = RISK_COLORS[rk];
              const active = riskFilter.includes(r);
              return (
                <button key={r} onClick={() => toggleRisk(r)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all"
                  style={{ borderColor: active ? rc.badgeText : '#E2E8F0', backgroundColor: active ? rc.badge : '#fff', color: active ? rc.badgeText : '#64748B' }}>
                  {rk}
                </button>
              );
            })}
          </div>

          {/* Benefit dropdown */}
          <div className="relative">
            <select value={benefitFilter} onChange={e => setBenefitFilter(e.target.value)}
              className="appearance-none border border-slate-300 rounded-xl px-3 py-2 pr-7 text-xs font-semibold text-slate-700 focus:outline-none bg-white">
              <option value="">Benefit Status</option>
              <option value="exhausted">Exhausted</option>
              <option value="near">Near Limit</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {hasFilters && (
            <button onClick={() => { setPlanFilter([]); setRiskFilter([]); setBenefitFilter(''); setSearch(''); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 border border-slate-300 hover:bg-slate-50 flex items-center gap-1">
              <X size={11} /> Clear
            </button>
          )}

          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setViewMode('table')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
              <List size={15} />
            </button>
            <button onClick={() => setViewMode('card')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'card' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5 overflow-x-auto">
          {tabDefs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <t.icon size={14} />
              {t.label}
              {t.count !== undefined && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-bold ${tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'analytics' ? (
          <div className="p-5">
            <PopulationAnalytics members={members} profile={profile} />
          </div>
        ) : tab === 'wellness' ? (
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50 flex items-start gap-3">
              <TrendingUp size={18} color="#2563EB" className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-800 mb-1">AI Wellness Recommendations</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Based on population health analysis, the following outreach campaigns are recommended to reduce long-term claim costs and improve member health outcomes.
                </p>
              </div>
            </div>
            {[
              { title: 'Annual Checkup Reminders',      desc: `${members.filter(m => m.claimCount === 0).length} low-engagement members have not filed any claims. A reminder may prevent costly interventions.`,                                                risk: 'HIGH',   count: members.filter(m => m.claimCount === 0).length,               saving: 'AED 240K potential saving', color: '#F97316' },
              { title: 'Benefit Expiry Outreach',       desc: `${nearLimitMembers.length} members are approaching their annual benefit limit. Proactive outreach can help them utilise remaining coverage.`,                                                   risk: 'MEDIUM', count: nearLimitMembers.length,                                        saving: 'AED 120K potential saving', color: '#F59E0B' },
              { title: 'High-Risk Member Engagement',   desc: `${highRiskMembers.length} members classified as high risk. Proactive coaching and care coordination can reduce hospitalization and emergency claims.`,                                         risk: 'HIGH',   count: highRiskMembers.length,                                         saving: 'AED 680K potential saving', color: '#DC2626' },
            ].map(r => (
              <div key={r.title} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${r.color}18` }}>
                  <TrendingUp size={18} color={r.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-slate-800">{r.title}</p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{ background: RISK_COLORS[r.risk as RiskKey]?.badge ?? '#FEE2E2', color: RISK_COLORS[r.risk as RiskKey]?.badgeText ?? '#991B1B' }}>
                      {r.risk}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2 leading-relaxed">{r.desc}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-600">{r.count} members</span>
                    <span className="text-xs font-bold text-emerald-600">{r.saving}</span>
                  </div>
                </div>
                <button onClick={() => setShowWellness(true)}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: '#0F2D4A' }}>
                  Launch Campaign
                </button>
              </div>
            ))}
          </div>
        ) : tab === 'benefits' ? (
          <div className="p-5 space-y-5">
            {exhaustedMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" style={{ animation: 'pulse 2s infinite' }} />
                  <p className="text-sm font-bold text-red-700">Annual Limit Exhausted ({exhaustedMembers.length})</p>
                </div>
                <div className="space-y-2">
                  {exhaustedMembers.map(m => {
                    const init = getInitials(m.patientName);
                    const tier = extractPlanTier(m.planName);
                    return (
                      <div key={m.id} onClick={() => setOpenMember(m)}
                        className="flex items-center gap-4 p-4 rounded-2xl border-2 border-red-200 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold">{init}</div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">{m.patientName}</p>
                          <p className="text-xs text-slate-500" style={{ fontFamily: 'DM Mono, monospace' }}>{m.externalMemberId} · {tier}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-red-700" style={{ fontFamily: 'DM Mono, monospace' }}>AED {ANNUAL_LIMIT.toLocaleString()}</p>
                          <p className="text-xs text-red-500 font-semibold">100% EXHAUSTED</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {nearLimitMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <p className="text-sm font-bold text-orange-700">Near Annual Limit ({nearLimitMembers.length})</p>
                </div>
                <div className="space-y-2">
                  {nearLimitMembers.map(m => {
                    const init = getInitials(m.patientName);
                    const tier = extractPlanTier(m.planName);
                    return (
                      <div key={m.id} onClick={() => setOpenMember(m)}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">{init}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">{m.patientName}</p>
                          <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'DM Mono, monospace' }}>{m.externalMemberId} · {tier}</p>
                          <div className="h-1.5 rounded-full bg-orange-200 overflow-hidden">
                            <div className="h-full rounded-full bg-orange-500" style={{ width: `${m.utilizationPercent}%` }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-black text-orange-700" style={{ fontFamily: 'DM Mono, monospace' }}>{m.utilizationPercent}%</p>
                          <p className="text-xs text-slate-500">AED {getAnnualUsed(m).toLocaleString()} / {ANNUAL_LIMIT.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {exhaustedMembers.length === 0 && nearLimitMembers.length === 0 && (
              <div className="py-12 text-center">
                <Activity size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No members with benefit alerts at this time</p>
              </div>
            )}
          </div>
        ) : (
          /* ALL / RISK tabs — table or card */
          viewMode === 'card' ? (
            <div className="p-5 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {filtered.map(m => {
                const rk   = toRiskKey(m.riskLevel);
                const rc   = RISK_COLORS[rk];
                const tier = extractPlanTier(m.planName);
                const pc   = PLAN_BADGE[tier];
                const pct  = m.utilizationPercent;
                const ai   = getAiScore(m);
                const ba   = getBenefitAlert(m);
                return (
                  <div key={m.id} onClick={() => setOpenMember(m)}
                    className="bg-white rounded-2xl border cursor-pointer transition-all hover:shadow-md"
                    style={{ borderColor: selectedIds.has(m.id) ? '#2563EB' : rc.border, borderWidth: selectedIds.has(m.id) ? 2 : 1, padding: 16 }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: rc.dot }}>
                          {getInitials(m.patientName)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{m.patientName}</p>
                          <p className="text-xs text-slate-400" style={{ fontFamily: 'DM Mono, monospace' }}>{m.externalMemberId}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: rc.badge, color: rc.badgeText }}>{rk}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: pc.bg, color: pc.text }}>{tier}</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Benefit Usage</span>
                        <span className="text-xs font-bold" style={{ color: barColorPct(pct), fontFamily: 'DM Mono, monospace' }}>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: barColorPct(pct) }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>AI Score: <span className="font-bold" style={{ fontFamily: 'DM Mono, monospace', color: scoreColor(ai) }}>{ai}</span></span>
                      <span>{m.claimCount} claims YTD</span>
                    </div>
                    {ba && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100">
                        {ba === 'EXHAUSTED' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">LIMIT REACHED</span>}
                        {ba === 'NEAR_LIMIT' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">NEAR LIMIT</span>}
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <Users size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">{loading ? 'Loading members...' : 'No members match your filters'}</p>
                </div>
              )}
            </div>
          ) : (
            /* Table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100" style={{ backgroundColor: '#F8FAFC' }}>
                    <th className="pl-4 pr-2 py-3 w-8">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll}
                        className="rounded border-slate-300 w-4 h-4" style={{ accentColor: '#1E3A5F' }} />
                    </th>
                    <th className="w-1.5" />
                    {['Member', 'Plan', 'Risk', 'AI Health', 'Benefits', 'Claims', 'Alerts'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        style={h === 'Benefits' ? { minWidth: 130 } : undefined}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const rk   = toRiskKey(m.riskLevel);
                    const rc   = RISK_COLORS[rk];
                    const tier = extractPlanTier(m.planName);
                    const pc   = PLAN_BADGE[tier];
                    const pct  = m.utilizationPercent;
                    const ai   = getAiScore(m);
                    const ba   = getBenefitAlert(m);
                    const isSel = selectedIds.has(m.id);
                    return (
                      <tr key={m.id}
                        className="border-b border-slate-100 cursor-pointer transition-colors"
                        style={{ backgroundColor: isSel ? 'rgba(37,99,235,0.06)' : rc.rowBg }}
                        onClick={() => setOpenMember(m)}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = isSel ? 'rgba(37,99,235,0.06)' : rc.rowBg; }}>
                        <td className="pl-4 pr-2 py-3 w-8" onClick={e => { e.stopPropagation(); toggleSelect(m.id); }}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(m.id)}
                            className="rounded border-slate-300 w-4 h-4" style={{ accentColor: '#1E3A5F' }} />
                        </td>
                        <td className="px-0 py-3 w-1.5">
                          <div className="w-1 h-8 rounded-r" style={{ backgroundColor: rc.dot }} />
                        </td>
                        <td className="px-4 py-3" style={{ minWidth: 200 }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: rc.dot }}>
                              {getInitials(m.patientName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{m.patientName}</p>
                              <p className="text-xs text-slate-400 truncate" style={{ fontFamily: 'DM Mono, monospace' }}>{m.externalMemberId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: pc.bg, color: pc.text }}>{tier}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: rc.badge, color: rc.badgeText }}>{rk}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold" style={{ fontFamily: 'DM Mono, monospace', color: scoreColor(ai) }}>{ai}</span>
                        </td>
                        <td className="px-4 py-3" style={{ minWidth: 130 }}>
                          <UsageBar pct={pct} />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: 'DM Mono, monospace' }}>{m.claimCount}</p>
                            <p className="text-xs text-slate-400">claims YTD</p>
                          </div>
                        </td>
                        <td className="px-4 pr-6 py-3">
                          <div className="flex flex-wrap gap-1">
                            {ba === 'EXHAUSTED' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 whitespace-nowrap">LIMIT REACHED</span>}
                            {ba === 'NEAR_LIMIT' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 whitespace-nowrap">NEAR LIMIT</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center">
                  <Users size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">{loading ? 'Loading members...' : 'No members match your filters'}</p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 z-40 flex items-center justify-between px-6 py-4 shadow-xl"
          style={{ left: 264, right: 0, backgroundColor: '#0F2D4A', height: 64 }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-400 text-white text-xs font-black flex items-center justify-center">
              {selectedIds.size}
            </div>
            <span className="text-white text-sm font-semibold">{selectedIds.size} member{selectedIds.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowWellness(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors">
              <Send size={14} /> Send Outreach
            </button>
            <button onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors">
              <Download size={14} /> Export Selected
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <X size={14} /> Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Member Detail Drawer */}
      {openMember && (
        <MemberDetailDrawer
          member={openMember}
          allMembers={filtered}
          onClose={() => setOpenMember(null)}
          onToast={toast}
          onNavigate={setOpenMember}
        />
      )}

      {/* Wellness Campaign Modal */}
      {showWellness && (
        <WellnessCampaignModal
          members={filtered}
          onClose={() => setShowWellness(false)}
          onSend={count => { setShowWellness(false); toast(`Wellness campaign sent to ${count} members`, 'success'); }}
        />
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          onClose={() => { setShowExport(false); toast('Export ready for download', 'success'); }}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[500] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }}>
        {toasts.map(t => {
          const c = TOAST_COLORS[t.type];
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto"
              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </InsuranceShell>
  );
};

export default InsuranceMembers;
