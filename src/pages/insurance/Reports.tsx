import { useState, useMemo, useEffect, type ComponentType, type ReactNode } from 'react';
import {
  FileText, DollarSign, Shield, AlertTriangle, Users, Stethoscope, CheckSquare,
  Calendar, Clock, Download, Bell, Plus, ChevronDown, ChevronUp, RefreshCw,
  AlertCircle, Loader, CheckCircle, Lock, X, Settings, Archive,
  FileSpreadsheet, Mail, Send, Search, Trash2, GripVertical, ChevronRight, Eye,
} from 'lucide-react';
import InsuranceShell, { useInsurancePageData } from './InsuranceShell';

// ─── Local Types ──────────────────────────────────────────────────────────────

type ReportCategory = 'claims' | 'financial' | 'preauth' | 'fraud' | 'members' | 'provider' | 'dha';
type ReportFormat = 'PDF' | 'Excel' | 'CSV' | 'DHA XML' | 'ZIP';
type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

interface CategoryMeta { label: string; bg: string; border: string; color: string }

interface ReportCatalogItem {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  formats: ReportFormat[];
  isDhaRequired?: boolean;
  isConfidential?: boolean;
  isScheduled?: boolean;
  lastGeneratedDisplay?: string;
  scheduleDesc?: string;
  dueDaysRemaining?: number;
  insight?: { type: 'warning' | 'success' | 'info'; text: string };
}

interface ReportHistoryItem {
  id: string;
  name: string;
  category: ReportCategory;
  format: string;
  size: string;
  generatedAtDisplay: string;
  generatedBy: string;
  status: 'completed' | 'generating' | 'failed';
  downloads?: number;
  isConfidential?: boolean;
  dhaSubmissionId?: string;
  progressPct?: number;
  errorMessage?: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  category: ReportCategory;
  frequency: ScheduleFrequency;
  nextRunDisplay: string;
  format: ReportFormat;
  isActive: boolean;
}

interface DhaCalendarItem {
  id: string;
  title: string;
  period: string;
  dueDateDisplay: string;
  daysRemaining: number;
  status: 'overdue' | 'urgent' | 'upcoming' | 'submitted';
  submissionId?: string;
}

interface Toast { id: number; msg: string; type: 'success' | 'warning' | 'info' }
interface FieldItem { id: string; label: string; category: string }
interface CanvasField extends FieldItem { uid: string; aggregate?: string }

// ─── Static Mock Data ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<ReportCategory, CategoryMeta> = {
  claims:    { label: 'Claims',    bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8' },
  financial: { label: 'Financial', bg: '#ECFDF5', border: '#A7F3D0', color: '#059669' },
  preauth:   { label: 'Pre-Auth',  bg: '#FFF7ED', border: '#FED7AA', color: '#C2410C' },
  fraud:     { label: 'Fraud',     bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' },
  members:   { label: 'Members',   bg: '#F5F3FF', border: '#DDD6FE', color: '#7C3AED' },
  provider:  { label: 'Provider',  bg: '#FEFCE8', border: '#FEF08A', color: '#A16207' },
  dha:       { label: 'DHA',       bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46' },
};

const REPORT_CATALOG: ReportCatalogItem[] = [
  { id: 'RPT-001', category: 'claims', title: 'Monthly Claims Summary', description: 'Aggregated claims volume, approval rates, denial analysis, and total paid amounts by provider and specialty.', formats: ['PDF', 'Excel', 'CSV'], isScheduled: true, lastGeneratedDisplay: 'Jun 1, 2026', scheduleDesc: 'Monthly, 1st', insight: { type: 'success', text: 'Approval rate improved 2.3 pp vs prior month.' } },
  { id: 'RPT-002', category: 'claims', title: 'Denial Analysis Report', description: 'Root-cause breakdown of denied claims by denial code, provider, plan tier, and appeal outcomes.', formats: ['PDF', 'Excel'], isScheduled: true, lastGeneratedDisplay: 'Jun 1, 2026', scheduleDesc: 'Monthly, 1st', insight: { type: 'warning', text: '14.7% of denials stem from duplicate submissions — consider provider training.' } },
  { id: 'RPT-003', category: 'claims', title: 'High-Value Claims Register', description: 'All claims above AED 50,000 threshold with clinician narrative, pre-auth status, and payment disposition.', formats: ['PDF', 'Excel'], isConfidential: true, lastGeneratedDisplay: 'Jun 14, 2026', scheduleDesc: 'Bi-weekly' },
  { id: 'RPT-010', category: 'financial', title: 'Loss Ratio Statement', description: 'Claims paid vs premium earned by plan tier with IBNR reserves and actuarial commentary.', formats: ['PDF', 'Excel'], isConfidential: true, isScheduled: true, lastGeneratedDisplay: 'May 31, 2026', scheduleDesc: 'Monthly, end-of-month', insight: { type: 'info', text: 'Loss ratio 87.2% — within the 90% ceiling for Q2 2026.' } },
  { id: 'RPT-011', category: 'financial', title: 'Cash Flow Projection', description: '13-week rolling cash flow model incorporating expected claims payable, premium inflows, and reinsurance recoveries.', formats: ['Excel', 'PDF'], isConfidential: true, insight: { type: 'warning', text: 'Last run failed — data source timeout. Retry to regenerate.' } },
  { id: 'RPT-012', category: 'financial', title: 'Budget vs Actual Variance', description: 'Line-by-line comparison of budgeted vs actual claims spend by category and cost centre.', formats: ['Excel', 'PDF'], isConfidential: true, isScheduled: true, lastGeneratedDisplay: 'Jun 5, 2026', scheduleDesc: 'Monthly, 5th' },
  { id: 'RPT-020', category: 'preauth', title: 'Pre-Auth Queue Aging Report', description: 'Pending pre-authorizations broken down by aging bucket (0–24h, 24–48h, 48h+) and SLA breach status.', formats: ['PDF', 'Excel'], isScheduled: true, lastGeneratedDisplay: 'Jun 28, 2026', scheduleDesc: 'Daily, 08:00' },
  { id: 'RPT-021', category: 'preauth', title: 'AI Override Audit', description: 'Cases where the AI recommendation was overridden by a human officer with override justification and outcome tracking.', formats: ['PDF', 'Excel'], isConfidential: true, lastGeneratedDisplay: 'Jun 15, 2026' },
  { id: 'RPT-030', category: 'fraud', title: 'Anomaly Detection Alerts', description: 'Flagged billing anomalies ranked by fraud probability score with supporting evidence summaries.', formats: ['PDF', 'Excel', 'ZIP'], isConfidential: true, isScheduled: true, lastGeneratedDisplay: 'Jun 19, 2026', scheduleDesc: 'Weekly, Monday', insight: { type: 'warning', text: '3 providers currently exceed the 90th-percentile billing frequency threshold.' } },
  { id: 'RPT-031', category: 'fraud', title: 'SIU Investigation Register', description: 'Open and closed Special Investigations Unit cases with referral dates, evidence status, and recovery amounts.', formats: ['PDF'], isConfidential: true, lastGeneratedDisplay: 'Feb 28, 2026' },
  { id: 'RPT-040', category: 'members', title: 'Risk Stratification Report', description: 'Members stratified by clinical risk tier (low / medium / high) with utilization drivers and care gap flags.', formats: ['Excel', 'PDF'], isConfidential: true, isScheduled: true, lastGeneratedDisplay: 'Apr 1, 2026', scheduleDesc: 'Quarterly', insight: { type: 'info', text: '8.4% of members account for 62% of total claims spend — high-risk cohort.' } },
  { id: 'RPT-041', category: 'members', title: 'Member Utilization Summary', description: 'Per-member utilization rates, claim frequency, and plan utilization efficiency scores.', formats: ['Excel', 'CSV'], isScheduled: true, lastGeneratedDisplay: 'Jun 1, 2026', scheduleDesc: 'Monthly, 1st' },
  { id: 'RPT-050', category: 'provider', title: 'Provider Performance Scorecard', description: 'Quality and cost efficiency scores for all network providers benchmarked against specialty peers.', formats: ['PDF', 'Excel'], isScheduled: true, lastGeneratedDisplay: 'Apr 1, 2026', scheduleDesc: 'Quarterly' },
  { id: 'RPT-051', category: 'provider', title: 'Contract Expiry Watch List', description: 'Network provider contracts expiring within 90 days with renewal status and negotiation flags.', formats: ['PDF', 'Excel'], isScheduled: true, lastGeneratedDisplay: 'Jun 26, 2026', scheduleDesc: 'Weekly, Monday' },
  { id: 'DHA-F001', category: 'dha', title: 'Monthly Claims (DHA-F001)', description: 'Standardised monthly claims file submitted to DHA Health Financing as required by circular HF-2019-03.', formats: ['DHA XML', 'PDF'], isDhaRequired: true, isScheduled: true, lastGeneratedDisplay: 'Jun 14, 2026', scheduleDesc: 'Monthly, 14th', dueDaysRemaining: 7, insight: { type: 'warning', text: 'Submission due in 7 days — start generation now to allow QA review.' } },
  { id: 'DHA-F002', category: 'dha', title: 'Member Census (DHA-F002)', description: 'Monthly active member headcount by plan tier, nationality, and emirate submitted to DHA.', formats: ['DHA XML', 'PDF'], isDhaRequired: true, isScheduled: true, lastGeneratedDisplay: 'Jun 14, 2026', scheduleDesc: 'Monthly, 14th', dueDaysRemaining: 7 },
  { id: 'DHA-F012', category: 'dha', title: 'Annual Actuarial Certification (DHA-F012)', description: 'Annual certified actuarial report confirming premium adequacy and reserve sufficiency as required by DHA.', formats: ['PDF'], isDhaRequired: true, isConfidential: true, lastGeneratedDisplay: 'Jan 31, 2026' },
];

const RECENT_HISTORY: ReportHistoryItem[] = [
  { id: 'RPT-150', name: 'Pre-Auth Queue Aging Report', category: 'preauth', format: 'PDF', size: '0.8 MB', generatedAtDisplay: 'Jun 28, 08:00', generatedBy: 'System', status: 'completed', downloads: 1 },
  { id: 'RPT-149', name: 'Contract Expiry Watch List', category: 'provider', format: 'PDF', size: '1.1 MB', generatedAtDisplay: 'Jun 26, 08:00', generatedBy: 'System', status: 'completed', downloads: 3 },
  { id: 'RPT-009', name: 'Anomaly Detection Alerts', category: 'fraud', format: 'Excel', size: '—', generatedAtDisplay: 'In progress', generatedBy: 'System', status: 'generating', progressPct: 67, isConfidential: true },
  { id: 'RPT-FIN', name: 'Cash Flow Projection', category: 'financial', format: 'Excel', size: '—', generatedAtDisplay: 'Failed today', generatedBy: 'System', status: 'failed', errorMessage: 'Data source timeout', isConfidential: true },
  { id: 'RPT-148', name: 'Monthly Claims Summary', category: 'claims', format: 'Excel', size: '8.1 MB', generatedAtDisplay: 'Jun 1, 06:00', generatedBy: 'System', status: 'completed', downloads: 5 },
];

const DHA_CALENDAR: DhaCalendarItem[] = [
  { id: 'dc-1', title: 'Monthly Claims (DHA-F001)', period: 'June 2026', dueDateDisplay: 'Jul 14, 2026', daysRemaining: 15, status: 'upcoming' },
  { id: 'dc-2', title: 'Member Census (DHA-F002)', period: 'June 2026', dueDateDisplay: 'Jul 14, 2026', daysRemaining: 15, status: 'upcoming' },
  { id: 'dc-3', title: 'Monthly Claims (DHA-F001)', period: 'May 2026', dueDateDisplay: 'Jun 14, 2026', daysRemaining: -15, status: 'submitted', submissionId: 'DHA-2026-05-DN-0041' },
  { id: 'dc-4', title: 'Annual Actuarial (DHA-F012)', period: 'FY 2025', dueDateDisplay: 'Jan 31, 2026', daysRemaining: -149, status: 'submitted', submissionId: 'DHA-2026-ACT-0001' },
];

const SCHEDULED_REPORTS: ScheduledReport[] = [
  { id: 'sch-1', name: 'Monthly Claims Summary', category: 'claims', frequency: 'monthly', nextRunDisplay: 'Jul 1, 06:00', format: 'Excel', isActive: true },
  { id: 'sch-2', name: 'Pre-Auth Queue Aging', category: 'preauth', frequency: 'daily', nextRunDisplay: 'Tomorrow 08:00', format: 'PDF', isActive: true },
  { id: 'sch-3', name: 'Anomaly Detection Alerts', category: 'fraud', frequency: 'weekly', nextRunDisplay: 'Mon Jul 6, 06:00', format: 'Excel', isActive: true },
  { id: 'sch-4', name: 'Provider Performance Scorecard', category: 'provider', frequency: 'quarterly', nextRunDisplay: 'Sep 30, 07:00', format: 'PDF', isActive: true },
  { id: 'sch-5', name: 'Budget vs Actual Variance', category: 'financial', frequency: 'monthly', nextRunDisplay: 'Jul 5, 07:00', format: 'Excel', isActive: false },
];

const REPORT_KPIS = { totalGenerated: 150, generatedThisMonth: 12, scheduledActive: 4, dhaPending: 2, avgGenerationSecs: 38 };

const ALL_ARCHIVE: ReportHistoryItem[] = [
  { id: 'RPT-150', name: 'Pre-Auth Queue Aging Report', category: 'preauth', format: 'PDF', size: '0.8 MB', generatedAtDisplay: 'Jun 28, 2026', generatedBy: 'System', status: 'completed', downloads: 1 },
  { id: 'RPT-149', name: 'Contract Expiry Watch List', category: 'provider', format: 'PDF', size: '1.1 MB', generatedAtDisplay: 'Jun 26, 2026', generatedBy: 'System', status: 'completed', downloads: 3 },
  { id: 'RPT-148', name: 'Monthly Claims Summary', category: 'claims', format: 'Excel', size: '8.1 MB', generatedAtDisplay: 'Jun 1, 2026', generatedBy: 'System', status: 'completed', downloads: 5 },
  { id: 'RPT-147', name: 'Monthly Claims Summary', category: 'claims', format: 'Excel', size: '7.8 MB', generatedAtDisplay: 'May 1, 2026', generatedBy: 'System', status: 'completed', downloads: 8 },
  { id: 'RPT-146', name: 'Loss Ratio Statement', category: 'financial', format: 'PDF', size: '3.9 MB', generatedAtDisplay: 'Apr 30, 2026', generatedBy: 'Mariam Al Hashemi', status: 'completed', downloads: 5, isConfidential: true },
  { id: 'RPT-145', name: 'Provider Performance Scorecard', category: 'provider', format: 'PDF', size: '2.1 MB', generatedAtDisplay: 'Apr 1, 2026', generatedBy: 'System', status: 'completed', downloads: 11 },
  { id: 'RPT-144', name: 'Risk Stratification Report', category: 'members', format: 'Excel', size: '5.8 MB', generatedAtDisplay: 'Apr 1, 2026', generatedBy: 'System', status: 'completed', downloads: 3, isConfidential: true },
  { id: 'RPT-143', name: 'Monthly Claims (DHA-F001)', category: 'dha', format: 'DHA XML', size: '17.1 MB', generatedAtDisplay: 'Mar 14, 2026', generatedBy: 'System', status: 'completed', downloads: 1, dhaSubmissionId: 'DHA-2026-03-DN-0038' },
  { id: 'RPT-142', name: 'Denial Analysis Report', category: 'claims', format: 'PDF', size: '2.4 MB', generatedAtDisplay: 'Mar 2, 2026', generatedBy: 'System', status: 'completed', downloads: 6 },
  { id: 'RPT-141', name: 'SIU Investigation Register', category: 'fraud', format: 'PDF', size: '4.7 MB', generatedAtDisplay: 'Feb 28, 2026', generatedBy: 'Fatima Al Zahra', status: 'completed', downloads: 2, isConfidential: true },
  { id: 'RPT-140', name: 'Budget vs Actual Variance', category: 'financial', format: 'Excel', size: '2.2 MB', generatedAtDisplay: 'Feb 5, 2026', generatedBy: 'System', status: 'completed', downloads: 4, isConfidential: true },
  { id: 'RPT-139', name: 'Monthly Claims Summary', category: 'claims', format: 'Excel', size: '7.2 MB', generatedAtDisplay: 'Feb 1, 2026', generatedBy: 'System', status: 'completed', downloads: 9 },
];

// ─── Constants ────────────────────────────────────────────────────────────────

type IconComp = ComponentType<{ size?: number; color?: string }>;

const CATEGORY_ICONS: Record<ReportCategory, IconComp> = {
  claims: FileText, financial: DollarSign, preauth: Shield, fraud: AlertTriangle,
  members: Users, provider: Stethoscope, dha: CheckSquare,
};

const STATUS_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  completed:  { bg: '#ECFDF5', color: '#059669', label: 'Completed' },
  generating: { bg: '#FFF7ED', color: '#D97706', label: 'Generating' },
  failed:     { bg: '#FEF2F2', color: '#EF4444', label: 'Failed' },
  ready:      { bg: '#ECFDF5', color: '#059669', label: 'Ready' },
  running:    { bg: '#FFF7ED', color: '#D97706', label: 'Running' },
};

const CALENDAR_STATUS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  overdue:   { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: 'Overdue' },
  urgent:    { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'Due Soon' },
  upcoming:  { color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', label: 'Upcoming' },
  submitted: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Submitted' },
};

const FORMAT_ICON: Record<string, ReactNode> = {
  'PDF':     <FileText size={13} color="#EF4444" />,
  'Excel':   <FileSpreadsheet size={13} color="#16A34A" />,
  'CSV':     <FileText size={13} color="#F59E0B" />,
  'DHA XML': <Shield size={13} color="#0284C7" />,
};

const FORMAT_ICONS_MAP: Record<ReportFormat, ReactNode> = {
  'PDF':     <FileText size={16} />,
  'Excel':   <FileSpreadsheet size={16} />,
  'CSV':     <Download size={16} />,
  'DHA XML': <Shield size={16} />,
  'ZIP':     <Download size={16} />,
};

const PRESETS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3' },
  { label: 'Q2 2026', value: 'q2_2026' },
  { label: 'YTD 2026', value: 'ytd' },
  { label: 'Custom', value: 'custom' },
];

const PROGRESS_STEPS = [
  'Validating parameters...',
  'Querying claims database...',
  'Applying filters and aggregations...',
  'Building report structure...',
  'Rendering output format...',
  'Applying PHI masking...',
  'Finalizing report...',
];

const FREQUENCIES: { value: ScheduleFrequency; label: string; desc: string }[] = [
  { value: 'daily',     label: 'Daily',     desc: 'Every day at the selected time' },
  { value: 'weekly',    label: 'Weekly',    desc: 'Once per week on the selected day' },
  { value: 'monthly',   label: 'Monthly',   desc: 'Once per month on the selected date' },
  { value: 'quarterly', label: 'Quarterly', desc: 'Once per quarter at period-end' },
];

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MONTH_DATES = Array.from({ length: 28 }, (_, i) => i + 1);

const ARCHIVE_CATS: { id: ReportCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'claims', label: 'Claims' }, { id: 'financial', label: 'Financial' },
  { id: 'preauth', label: 'Pre-Auth' }, { id: 'fraud', label: 'Fraud' },
  { id: 'members', label: 'Members' }, { id: 'provider', label: 'Provider' }, { id: 'dha', label: 'DHA' },
];

const FIELD_TREE: { category: string; fields: FieldItem[] }[] = [
  { category: 'Member', fields: [
    { id: 'mbr_id', label: 'Member ID', category: 'Member' },
    { id: 'mbr_name', label: 'Member Name', category: 'Member' },
    { id: 'mbr_plan', label: 'Plan', category: 'Member' },
    { id: 'mbr_dob', label: 'Date of Birth', category: 'Member' },
    { id: 'mbr_emirate', label: 'Emirate', category: 'Member' },
    { id: 'mbr_risk_tier', label: 'Risk Tier', category: 'Member' },
  ]},
  { category: 'Claims', fields: [
    { id: 'clm_id', label: 'Claim ID', category: 'Claims' },
    { id: 'clm_date', label: 'Claim Date', category: 'Claims' },
    { id: 'clm_amount', label: 'Claim Amount', category: 'Claims' },
    { id: 'clm_status', label: 'Status', category: 'Claims' },
    { id: 'clm_denial', label: 'Denial Code', category: 'Claims' },
    { id: 'clm_specialty', label: 'Specialty', category: 'Claims' },
    { id: 'clm_icd', label: 'ICD-10 Code', category: 'Claims' },
  ]},
  { category: 'Provider', fields: [
    { id: 'prv_id', label: 'Provider ID', category: 'Provider' },
    { id: 'prv_name', label: 'Provider Name', category: 'Provider' },
    { id: 'prv_dha', label: 'DHA License', category: 'Provider' },
    { id: 'prv_tier', label: 'Network Tier', category: 'Provider' },
    { id: 'prv_score', label: 'Performance Score', category: 'Provider' },
  ]},
  { category: 'Financial', fields: [
    { id: 'fin_premium', label: 'Premium Paid', category: 'Financial' },
    { id: 'fin_copay', label: 'Co-pay Collected', category: 'Financial' },
    { id: 'fin_loss_ratio', label: 'Loss Ratio', category: 'Financial' },
    { id: 'fin_ibnr', label: 'IBNR Reserve', category: 'Financial' },
  ]},
];

const AGGREGATES = ['None', 'SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];

const CAT_COLORS: Record<string, string> = {
  Member: '#1E40AF', Claims: '#1E3A5F', Provider: '#4C1D95', Financial: '#065F46',
};

// ─── Primitive Components ─────────────────────────────────────────────────────

function SnapCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 12, padding: '16px 20px', flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color ?? '#0F172A', fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function InsightBadge({ type, text }: { type: 'warning' | 'success' | 'info'; text: string }) {
  const conf = {
    warning: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', icon: <AlertCircle size={12} /> },
    success: { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', icon: <CheckCircle size={12} /> },
    info:    { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', icon: <AlertCircle size={12} /> },
  }[type];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 10px', background: conf.bg, border: `1px solid ${conf.border}`, borderRadius: 7, marginTop: 8 }}>
      <span style={{ color: conf.color, flexShrink: 0, marginTop: 1 }}>{conf.icon}</span>
      <span style={{ fontSize: 12, color: conf.color }}>{text}</span>
    </div>
  );
}

// ─── Generate Report Modal ────────────────────────────────────────────────────

interface GenerateReportModalProps {
  report: ReportCatalogItem | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function GenerateReportModal({ report, onClose, onSuccess }: GenerateReportModalProps) {
  type Step = 'config' | 'progress' | 'done';
  const [step, setStep] = useState<Step>('config');
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat | null>(null);
  const [selectedPreset, setSelectedPreset] = useState('last_month');
  const [customFrom, setCustomFrom] = useState('2026-05-01');
  const [customTo, setCustomTo] = useState('2026-05-31');
  const [delivery, setDelivery] = useState<'download' | 'email' | 'dha'>('download');
  const [emailTo, setEmailTo] = useState('');
  const [phiConfirmed, setPhiConfirmed] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    if (report) {
      setSelectedFormat(report.formats[0] ?? null);
      setStep('config');
      setProgressStep(0);
      setProgressPct(0);
      setPhiConfirmed(false);
      setDelivery('download');
      setEmailTo('');
    }
  }, [report]);

  useEffect(() => {
    if (step !== 'progress') return;
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      const pct = Math.min(Math.round((current / (PROGRESS_STEPS.length * 6)) * 100), 98);
      setProgressPct(pct);
      if (current % 6 === 0) setProgressStep(prev => Math.min(prev + 1, PROGRESS_STEPS.length - 1));
      if (current >= PROGRESS_STEPS.length * 6) {
        clearInterval(interval);
        setProgressPct(100);
        setTimeout(() => setStep('done'), 400);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [step]);

  if (!report) return null;

  const meta = CATEGORY_META[report.category];
  const canGenerate = selectedFormat !== null && (report.isConfidential ? phiConfirmed : true);

  const deliveryOptions: Array<{ val: 'download' | 'email' | 'dha'; label: string; Icon: IconComp }> = [
    { val: 'download', label: 'Download', Icon: Download },
    { val: 'email', label: 'Email', Icon: Mail },
    ...(report.isDhaRequired ? [{ val: 'dha' as const, label: 'Submit to DHA', Icon: Send }] : []),
  ];

  function handleGenerate() { setStep('progress'); setProgressStep(0); setProgressPct(0); }

  function handleDone() {
    const label = delivery === 'dha' ? 'submitted to DHA' : delivery === 'email' ? 'sent via email' : 'ready to download';
    onSuccess(`${report.title} ${label} successfully`);
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={18} color={meta.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 4, padding: '2px 7px', fontFamily: 'DM Mono, monospace' }}>{report.id}</span>
              {report.isDhaRequired && <span style={{ fontSize: 11, fontWeight: 600, color: '#065F46', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 4, padding: '2px 7px' }}>DHA Required</span>}
              {report.isConfidential && <span style={{ fontSize: 11, fontWeight: 600, color: '#7F1D1D', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '2px 7px' }}>Confidential</span>}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{report.title}</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{report.description}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Reporting Period</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {PRESETS.map(p => (
                    <button key={p.value} onClick={() => setSelectedPreset(p.value)}
                      style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                        background: selectedPreset === p.value ? '#1E3A5F' : '#F8FAFC',
                        color: selectedPreset === p.value ? '#fff' : '#475569',
                        border: selectedPreset === p.value ? '1px solid #1E3A5F' : '1px solid #E2E8F0' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {selectedPreset === 'custom' && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>FROM</label>
                      <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>TO</label>
                      <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none' }} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Output Format</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {report.formats.map(f => (
                    <button key={f} onClick={() => setSelectedFormat(f)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                        background: selectedFormat === f ? '#EFF6FF' : '#F8FAFC',
                        color: selectedFormat === f ? '#1E3A5F' : '#475569',
                        border: selectedFormat === f ? '2px solid #1E3A5F' : '1px solid #E2E8F0' }}>
                      {FORMAT_ICONS_MAP[f]}
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Delivery Method</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {deliveryOptions.map(({ val, label, Icon }) => (
                    <button key={val} onClick={() => setDelivery(val)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', flex: 1, justifyContent: 'center', transition: 'all 0.15s',
                        background: delivery === val ? '#EFF6FF' : '#F8FAFC',
                        color: delivery === val ? '#1E3A5F' : '#475569',
                        border: delivery === val ? '2px solid #1E3A5F' : '1px solid #E2E8F0' }}>
                      <Icon size={15} />
                      {label}
                    </button>
                  ))}
                </div>
                {delivery === 'email' && (
                  <input type="email" placeholder="recipient@daman.ae" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                    style={{ marginTop: 10, width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
                )}
                {delivery === 'dha' && (
                  <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', fontSize: 12, color: '#065F46' }}>
                    Report will be submitted electronically to DHA Health Financing System. A submission ID will be generated upon acceptance.
                  </div>
                )}
              </div>

              {report.isConfidential && (
                <div style={{ padding: '14px 16px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={phiConfirmed} onChange={e => setPhiConfirmed(e.target.checked)}
                      style={{ marginTop: 2, accentColor: '#DC2626', width: 16, height: 16, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#7F1D1D' }}>Confidential Data Acknowledgement</div>
                      <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                        This report contains Protected Health Information (PHI). I confirm I am authorized to generate and access this report in accordance with Daman data governance policy and UAE Federal Law No. 2 of 2019 on Personal Data.
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {step === 'progress' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
              <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 24 }}>
                <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={40} cy={40} r={34} fill="none" stroke="#E2E8F0" strokeWidth={5} />
                  <circle cx={40} cy={40} r={34} fill="none" stroke="#1E3A5F" strokeWidth={5}
                    strokeDasharray={`${(progressPct / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.2s ease' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#1E3A5F', fontFamily: 'DM Mono, monospace' }}>
                  {progressPct}%
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Generating Report</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                {PROGRESS_STEPS[progressStep]}
              </div>
              <div style={{ width: '100%', background: '#F1F5F9', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #1E3A5F, #2563EB)', borderRadius: 4, width: `${progressPct}%`, transition: 'width 0.2s ease' }} />
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#94A3B8' }}>
                Step {Math.min(progressStep + 1, PROGRESS_STEPS.length)} of {PROGRESS_STEPS.length}
              </div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={30} color="#059669" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Report Ready</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>{report.title} has been generated successfully.</div>
              </div>
              <div style={{ display: 'flex', gap: 16, padding: '14px 20px', background: '#F8FAFC', borderRadius: 12, width: '100%' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>FORMAT</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{selectedFormat}</div>
                </div>
                <div style={{ width: 1, background: '#E2E8F0' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>SIZE</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>4.2 MB</div>
                </div>
                <div style={{ width: 1, background: '#E2E8F0' }} />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>GENERATED</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Just now</div>
                </div>
              </div>
              {delivery === 'dha' && (
                <div style={{ padding: '12px 16px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, width: '100%' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#065F46', marginBottom: 2 }}>DHA Submission ID</div>
                  <div style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: '#0F172A' }}>DHA-2026-06-DN-0042</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                {delivery === 'download' && (
                  <button onClick={handleDone} style={{ flex: 1, padding: '10px 0', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Download size={16} /> Download Report
                  </button>
                )}
                {delivery === 'email' && (
                  <button onClick={handleDone} style={{ flex: 1, padding: '10px 0', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Mail size={16} /> Email Sent
                  </button>
                )}
                {delivery === 'dha' && (
                  <button onClick={handleDone} style={{ flex: 1, padding: '10px 0', background: '#059669', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckCircle size={16} /> Submitted to DHA
                  </button>
                )}
                <button onClick={onClose} style={{ padding: '10px 20px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {step === 'config' && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleGenerate} disabled={!canGenerate}
              style={{ padding: '10px 24px', background: canGenerate ? '#1E3A5F' : '#CBD5E1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                cursor: canGenerate ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={15} /> Generate Report
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Schedule Report Modal ────────────────────────────────────────────────────

interface ScheduleReportModalProps {
  report: ReportCatalogItem | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function ScheduleReportModal({ report, onClose, onSuccess }: ScheduleReportModalProps) {
  const [frequency, setFrequency] = useState<ScheduleFrequency>('monthly');
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('PDF');
  const [runTime, setRunTime] = useState('06:00');
  const [weekDay, setWeekDay] = useState('Monday');
  const [monthDate, setMonthDate] = useState(1);
  const [recipients, setRecipients] = useState<string[]>(['reports@daman.ae']);
  const [newEmail, setNewEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!report) return null;

  const meta = CATEGORY_META[report.category];

  function addRecipient() {
    const email = newEmail.trim();
    if (email && !recipients.includes(email)) {
      setRecipients(prev => [...prev, email]);
      setNewEmail('');
    }
  }

  function ordinalSuffix(n: number): string {
    const s = ['st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] ?? s[v - 1] ?? 'th');
  }

  function getNextRunText() {
    if (frequency === 'daily') return `Daily at ${runTime}`;
    if (frequency === 'weekly') return `Every ${weekDay} at ${runTime}`;
    if (frequency === 'monthly') return `${ordinalSuffix(monthDate)} of each month at ${runTime}`;
    return 'At end of each quarter';
  }

  async function handleSave() {
    setSubmitting(true);
    await new Promise<void>(r => setTimeout(r, 1400));
    setSubmitting(false);
    onSuccess(`Schedule saved — ${report.title} will run ${getNextRunText()}`);
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={18} color={meta.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Schedule Report</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{report.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Frequency</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FREQUENCIES.map(f => (
                <button key={f.value} onClick={() => setFrequency(f.value)}
                  style={{ padding: '12px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                    background: frequency === f.value ? '#EFF6FF' : '#F8FAFC',
                    border: frequency === f.value ? '2px solid #1E3A5F' : '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: frequency === f.value ? '#1E3A5F' : '#374151' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Run Time</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              {frequency === 'weekly' && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>DAY OF WEEK</label>
                  <select value={weekDay} onChange={e => setWeekDay(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', background: '#fff' }}>
                    {WEEK_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              {frequency === 'monthly' && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>DAY OF MONTH</label>
                  <select value={monthDate} onChange={e => setMonthDate(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', background: '#fff' }}>
                    {MONTH_DATES.map(d => <option key={d} value={d}>{ordinalSuffix(d)}</option>)}
                  </select>
                </div>
              )}
              {frequency !== 'quarterly' && (
                <div style={{ flex: frequency === 'daily' ? 1 : 0.6 }}>
                  <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>TIME (UAE)</label>
                  <input type="time" value={runTime} onChange={e => setRunTime(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none' }} />
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Output Format</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {report.formats.map(f => (
                <button key={f} onClick={() => setSelectedFormat(f)}
                  style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                    background: selectedFormat === f ? '#1E3A5F' : '#F8FAFC',
                    color: selectedFormat === f ? '#fff' : '#475569',
                    border: selectedFormat === f ? '1px solid #1E3A5F' : '1px solid #E2E8F0' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} color="#64748B" /> Recipients
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {recipients.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#1E3A5F' }}>
                    {r.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: '#374151' }}>{r}</div>
                  <button onClick={() => setRecipients(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="email" placeholder="Add email address..." value={newEmail} onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addRecipient(); }}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none' }} />
              <button onClick={addRecipient} style={{ padding: '8px 14px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Subject (optional)</div>
            <input type="text" placeholder={`Scheduled: ${report.title} — {period}`} value={subject} onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Use {'{period}'} to auto-insert the reporting period</div>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Calendar size={14} color="#0284C7" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0284C7' }}>Next Scheduled Run</span>
            </div>
            <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>{getNextRunText()}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Delivered as {selectedFormat} to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => { void handleSave(); }} disabled={submitting || recipients.length === 0}
            style={{ padding: '10px 24px', background: submitting ? '#94A3B8' : '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
            {submitting ? <><Clock size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Bell size={15} /> Save Schedule</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Report Archive Modal ─────────────────────────────────────────────────────

function ReportArchiveModal({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<ReportCategory | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  const filtered = useMemo(() => ALL_ARCHIVE.filter(r => {
    if (catFilter !== 'all' && r.category !== catFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [search, catFilter]);

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id)));
  }

  async function handleDownload(id: string) {
    setDownloading(id);
    await new Promise<void>(r => setTimeout(r, 900));
    setDownloading(null);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: 760, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Download size={17} color="#475569" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Report Archive</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>150 reports stored • 7-year retention policy</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '12px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {ARCHIVE_CATS.map(c => (
              <button key={c.id} onClick={() => setCatFilter(c.id)}
                style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  background: catFilter === c.id ? '#1E3A5F' : '#F8FAFC',
                  color: catFilter === c.id ? '#fff' : '#475569',
                  border: catFilter === c.id ? '1px solid #1E3A5F' : '1px solid #E2E8F0' }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {selected.size > 0 && (
          <div style={{ padding: '8px 24px', background: '#EFF6FF', borderBottom: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#1E3A5F', fontWeight: 500 }}>{selected.size} selected</span>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Download size={12} /> Download Selected
            </button>
            <button onClick={() => setSelected(new Set())} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Trash2 size={12} /> Delete Selected
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                <th style={{ padding: '10px 14px', width: 36 }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll}
                    style={{ accentColor: '#1E3A5F', width: 14, height: 14 }} />
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>REPORT</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>DATE</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>GENERATED BY</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>SIZE</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>DL</th>
                <th style={{ padding: '10px 14px', width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const m = CATEGORY_META[r.category];
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F8FAFC', background: selected.has(r.id) ? '#EFF6FF' : '#fff' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                        style={{ accentColor: '#1E3A5F', width: 14, height: 14 }} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {FORMAT_ICON[r.format] ?? <FileText size={13} color="#94A3B8" />}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{r.name}</span>
                            {r.isConfidential && <Lock size={11} color="#EF4444" />}
                            {r.dhaSubmissionId && <CheckCircle size={11} color="#059669" />}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#94A3B8' }}>{r.id}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: m.color, background: m.bg, borderRadius: 3, padding: '1px 5px' }}>{m.label}</span>
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>{r.format}</span>
                          </div>
                          {r.dhaSubmissionId && (
                            <div style={{ fontSize: 10, color: '#059669', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>{r.dhaSubmissionId}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{r.generatedAtDisplay}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{r.generatedBy}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: '#374151', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{r.size}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>{r.downloads ?? 0}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => { void handleDownload(r.id); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {downloading === r.id ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={11} />}
                        {downloading === r.id ? 'Getting...' : 'Download'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No reports match your search</div>
          )}
        </div>

        <div style={{ padding: '12px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={13} color="#F59E0B" />
          <span style={{ fontSize: 12, color: '#78716C' }}>Reports older than 7 years are automatically purged per DHA data retention policy.</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', padding: '8px 20px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Custom Report Builder ────────────────────────────────────────────────────

interface CustomReportBuilderProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function CustomReportBuilder({ onClose, onSuccess }: CustomReportBuilderProps) {
  const [reportName, setReportName] = useState('');
  const [canvasFields, setCanvasFields] = useState<CanvasField[]>([]);
  const [expandedCats, setExpandedCats] = useState<string[]>(['Claims', 'Member']);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [step, setStep] = useState<'build' | 'generating' | 'done'>('build');
  const [progressPct, setProgressPct] = useState(0);

  function toggleCat(cat: string) {
    setExpandedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }

  function addField(field: FieldItem) {
    if (canvasFields.find(f => f.id === field.id)) return;
    setCanvasFields(prev => [...prev, { ...field, uid: `${field.id}_${Date.now()}`, aggregate: 'None' }]);
  }

  function removeField(uid: string) {
    setCanvasFields(prev => prev.filter(f => f.uid !== uid));
    if (activeField === uid) setActiveField(null);
  }

  function updateAggregate(uid: string, agg: string) {
    setCanvasFields(prev => prev.map(f => f.uid === uid ? { ...f, aggregate: agg } : f));
  }

  function moveField(uid: string, dir: 'up' | 'down') {
    const idx = canvasFields.findIndex(f => f.uid === uid);
    if (idx < 0) return;
    const arr = [...canvasFields];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap]!, arr[idx]!];
    setCanvasFields(arr);
  }

  const activeCanvasField = canvasFields.find(f => f.uid === activeField);

  const filteredTree = FIELD_TREE
    .map(cat => ({ ...cat, fields: cat.fields.filter(f => !filterText || f.label.toLowerCase().includes(filterText.toLowerCase())) }))
    .filter(cat => cat.fields.length > 0);

  function handleBuild() {
    if (!reportName.trim() || canvasFields.length === 0) return;
    setStep('generating');
    let p = 0;
    const interval = setInterval(() => {
      p += 4;
      setProgressPct(Math.min(p, 98));
      if (p >= 100) {
        clearInterval(interval);
        setProgressPct(100);
        setTimeout(() => setStep('done'), 300);
      }
    }, 80);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: 860, height: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12, background: '#FAFAFA' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={17} color="#1E3A5F" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Custom Report Builder</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Select fields, define aggregations, preview and generate</div>
          </div>
          <input placeholder="Report name..." value={reportName} onChange={e => setReportName(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', width: 200 }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {step === 'build' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: 230, borderRight: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', background: '#FAFAFA' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9' }}>
                <input placeholder="Search fields..." value={filterText} onChange={e => setFilterText(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #E2E8F0', fontSize: 12, color: '#0F172A', outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {filteredTree.map(cat => (
                  <div key={cat.category}>
                    <button onClick={() => toggleCat(cat.category)}
                      style={{ width: '100%', padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left' }}>
                      <ChevronRight size={13} color="#94A3B8" style={{ transform: expandedCats.includes(cat.category) ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: CAT_COLORS[cat.category] ?? '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cat.category}</span>
                    </button>
                    {expandedCats.includes(cat.category) && cat.fields.map(field => {
                      const added = canvasFields.some(f => f.id === field.id);
                      return (
                        <button key={field.id} onClick={() => addField(field)}
                          style={{ width: '100%', padding: '6px 14px 6px 28px', background: added ? '#EFF6FF' : 'none', border: 'none', cursor: added ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left' }}>
                          <span style={{ fontSize: 12, color: added ? '#93C5FD' : '#374151' }}>{field.label}</span>
                          {!added && <Plus size={11} color="#94A3B8" style={{ marginLeft: 'auto' }} />}
                          {added && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3B82F6' }}>Added</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #F1F5F9' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Report Columns</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>({canvasFields.length} selected)</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {canvasFields.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#CBD5E1', gap: 8 }}>
                    <Plus size={28} />
                    <div style={{ fontSize: 13 }}>Click fields from the left panel to add columns</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {canvasFields.map((f, i) => (
                      <div key={f.uid} onClick={() => setActiveField(f.uid)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8,
                          border: activeField === f.uid ? `2px solid ${CAT_COLORS[f.category] ?? '#1E3A5F'}` : '1px solid #E2E8F0',
                          background: activeField === f.uid ? '#F8FAFC' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <GripVertical size={14} color="#CBD5E1" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{f.label}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>{f.category}</div>
                        </div>
                        {f.aggregate && f.aggregate !== 'None' && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#1E3A5F', background: '#DBEAFE', borderRadius: 4, padding: '2px 6px' }}>{f.aggregate}</span>
                        )}
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button onClick={e => { e.stopPropagation(); moveField(f.uid, 'up'); }} disabled={i === 0}
                            style={{ background: 'none', border: 'none', cursor: i === 0 ? 'not-allowed' : 'pointer', color: '#CBD5E1', padding: 2, fontSize: 12 }}>▲</button>
                          <button onClick={e => { e.stopPropagation(); moveField(f.uid, 'down'); }} disabled={i === canvasFields.length - 1}
                            style={{ background: 'none', border: 'none', cursor: i === canvasFields.length - 1 ? 'not-allowed' : 'pointer', color: '#CBD5E1', padding: 2, fontSize: 12 }}>▼</button>
                          <button onClick={e => { e.stopPropagation(); removeField(f.uid); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FDA4AF', padding: 2 }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ width: 220, display: 'flex', flexDirection: 'column', background: '#FAFAFA' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Column Settings</div>
              </div>
              <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
                {activeCanvasField ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>FIELD</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{activeCanvasField.label}</div>
                      <div style={{ fontSize: 11, color: CAT_COLORS[activeCanvasField.category] ?? '#64748B', marginTop: 2 }}>{activeCanvasField.category}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>AGGREGATION</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {AGGREGATES.map(agg => (
                          <button key={agg} onClick={() => updateAggregate(activeCanvasField.uid, agg)}
                            style={{ padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                              background: activeCanvasField.aggregate === agg ? '#EFF6FF' : '#fff',
                              color: activeCanvasField.aggregate === agg ? '#1E3A5F' : '#475569',
                              border: activeCanvasField.aggregate === agg ? '1px solid #BFDBFE' : '1px solid #E2E8F0' }}>
                            {agg}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#CBD5E1', textAlign: 'center', marginTop: 40 }}>Select a column to configure</div>
                )}
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button style={{ width: '100%', padding: '8px 0', background: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Eye size={13} /> Preview (5 rows)
                </button>
                <button onClick={handleBuild} disabled={!reportName.trim() || canvasFields.length === 0}
                  style={{ width: '100%', padding: '9px 0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: (!reportName.trim() || canvasFields.length === 0) ? '#CBD5E1' : '#1E3A5F',
                    cursor: (!reportName.trim() || canvasFields.length === 0) ? 'not-allowed' : 'pointer' }}>
                  <FileText size={14} /> Build Report
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={40} cy={40} r={34} fill="none" stroke="#E2E8F0" strokeWidth={5} />
                <circle cx={40} cy={40} r={34} fill="none" stroke="#1E3A5F" strokeWidth={5}
                  strokeDasharray={`${(progressPct / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.15s ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#1E3A5F', fontFamily: 'DM Mono, monospace' }}>
                {progressPct}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>Building Your Report</div>
              <div style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                Processing {canvasFields.length} columns across all records...
              </div>
            </div>
            <div style={{ width: 320, background: '#F1F5F9', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #1E3A5F, #2563EB)', borderRadius: 4, width: `${progressPct}%`, transition: 'width 0.15s ease' }} />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={30} color="#059669" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{reportName || 'Custom Report'} Ready</div>
              <div style={{ fontSize: 13, color: '#64748B' }}>{canvasFields.length} columns exported as Excel • 2.3 MB</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { onSuccess(`Custom report "${reportName || 'Untitled'}" generated successfully`); onClose(); }}
                style={{ padding: '10px 24px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={16} /> Download Report
              </button>
              <button onClick={onClose} style={{ padding: '10px 20px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const InsuranceReports = () => {
  const { data, loading, error, refetch } = useInsurancePageData();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [generateTarget, setGenerateTarget] = useState<ReportCatalogItem | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<ReportCatalogItem | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<ReportCategory>>(new Set());

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  function toggleCat(cat: ReportCategory) {
    setCollapsedCats(prev => { const n = new Set(prev); if (n.has(cat)) n.delete(cat); else n.add(cat); return n; });
  }

  const categories = Array.from(new Set(REPORT_CATALOG.map(r => r.category)));

  // Use real Supabase reportRuns if available, else fall back to static
  const dbRuns = data?.reportRuns ?? [];
  const recentItems = dbRuns.length > 0 ? null : RECENT_HISTORY;

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => { void refetch(); }}>
      {/* Alert strip */}
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Loader size={13} color="#D97706" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#92400E' }}><strong>RPT-009</strong> Anomaly Detection Alerts is generating — 67% complete</span>
        </div>
        <div style={{ width: 1, height: 16, background: '#FDE68A' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <AlertCircle size={13} color="#DC2626" />
          <span style={{ fontSize: 13, color: '#7F1D1D' }}><strong>RPT-011</strong> Cash Flow Projection failed — data source timeout. <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Retry</span></span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={12} color="#92400E" />
          <span style={{ fontSize: 12, color: '#92400E' }}>Member Census (DHA-F002) due in 7 days</span>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 14 }}>
        <SnapCard label="Reports Generated" value={loading ? '…' : REPORT_KPIS.totalGenerated} sub={`+${REPORT_KPIS.generatedThisMonth} this month`} />
        <SnapCard label="Schedules Active" value={loading ? '…' : REPORT_KPIS.scheduledActive} sub="Running on schedule" color="#059669" />
        <SnapCard label="DHA Submissions Pending" value={loading ? '…' : REPORT_KPIS.dhaPending} sub="Next due in 7 days" color="#D97706" />
        <SnapCard label="Avg Generation Time" value={loading ? '…' : `${REPORT_KPIS.avgGenerationSecs}s`} sub="Last 30 days" />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Left: catalog */}
        <div style={{ flex: '0 0 63%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {categories.map(cat => {
            const meta = CATEGORY_META[cat];
            const Icon = CATEGORY_ICONS[cat];
            const items = REPORT_CATALOG.filter(r => r.category === cat);
            const isCollapsed = collapsedCats.has(cat);
            const dhaCount = items.filter(r => r.isDhaRequired).length;

            return (
              <div key={cat} style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 14, overflow: 'hidden' }}>
                <button onClick={() => toggleCat(cat)}
                  style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={17} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{meta.label} Reports</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>{items.length} reports{dhaCount > 0 ? ` • ${dhaCount} DHA required` : ''}</div>
                  </div>
                  {isCollapsed ? <ChevronDown size={16} color="#94A3B8" /> : <ChevronUp size={16} color="#94A3B8" />}
                </button>

                {!isCollapsed && (
                  <div style={{ borderTop: '1px solid #F8FAFC' }}>
                    {items.map((r, idx) => (
                      <div key={r.id} style={{ padding: '14px 20px', borderBottom: idx < items.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#94A3B8' }}>{r.id}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{r.title}</span>
                            {r.isDhaRequired && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#065F46', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 4, padding: '2px 6px' }}>DHA</span>
                            )}
                            {r.isConfidential && <Lock size={12} color="#EF4444" />}
                            {r.isScheduled && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 4, padding: '2px 6px' }}>
                                <Bell size={9} /> Auto
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, marginBottom: 8 }}>{r.description}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {r.formats.map(f => (
                                <span key={f} style={{ fontSize: 10, fontWeight: 600, color: '#475569', background: '#F1F5F9', borderRadius: 4, padding: '2px 6px' }}>{f}</span>
                              ))}
                            </div>
                            {r.lastGeneratedDisplay && (
                              <span style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={10} /> Last: {r.lastGeneratedDisplay}
                              </span>
                            )}
                            {r.scheduleDesc && (
                              <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <RefreshCw size={10} /> {r.scheduleDesc}
                              </span>
                            )}
                            {r.dueDaysRemaining !== undefined && (
                              <span style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, color: r.dueDaysRemaining <= 7 ? '#D97706' : '#1D4ED8' }}>
                                <Calendar size={10} /> Due in {r.dueDaysRemaining}d
                              </span>
                            )}
                          </div>
                          {r.insight && <InsightBadge type={r.insight.type} text={r.insight.text} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setGenerateTarget(r)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <FileText size={12} /> Generate
                          </button>
                          <button onClick={() => setScheduleTarget(r)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <Bell size={12} /> Schedule
                          </button>
                          {r.lastGeneratedDisplay && (
                            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              <Download size={12} /> Download
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: side panels */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Recent Reports — real Supabase data when available, else static */}
          <div style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={15} color="#64748B" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Recent Reports</span>
              <button onClick={() => setShowArchive(true)} style={{ marginLeft: 'auto', fontSize: 12, color: '#1E3A5F', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>View all</button>
            </div>

            {dbRuns.length > 0 ? (
              dbRuns.slice(0, 6).map((run, idx) => {
                const chip = STATUS_CHIP[run.status] ?? STATUS_CHIP.ready!;
                return (
                  <div key={run.id} style={{ padding: '11px 18px', borderBottom: idx < Math.min(dbRuns.length, 6) - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {run.status === 'running' ? <Loader size={13} color="#D97706" style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={13} color="#1D4ED8" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.reportName}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{run.periodLabel}</div>
                      {run.status === 'failed' && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>Generation failed</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: chip.color, background: chip.bg, borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>{chip.label}</span>
                      {run.status === 'ready' && run.storageUrl && (
                        <a href={run.storageUrl} target="_blank" rel="noreferrer" style={{ color: '#94A3B8', padding: 2, display: 'flex' }}>
                          <Download size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              (recentItems ?? RECENT_HISTORY).map((r, idx) => {
                const itemMeta = CATEGORY_META[r.category];
                const chipConf = STATUS_CHIP[r.status] ?? STATUS_CHIP.completed!;
                return (
                  <div key={r.id} style={{ padding: '11px 18px', borderBottom: idx < RECENT_HISTORY.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: itemMeta.bg, border: `1px solid ${itemMeta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {r.status === 'generating' ? (
                        <Loader size={13} color={itemMeta.color} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <FileText size={13} color={itemMeta.color} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#94A3B8' }}>{r.id}</span>
                        <span style={{ fontSize: 10, color: '#94A3B8' }}>{r.generatedAtDisplay}</span>
                        <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#64748B' }}>{r.size}</span>
                      </div>
                      {r.status === 'generating' && r.progressPct !== undefined && (
                        <div style={{ marginTop: 4, background: '#F1F5F9', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#F59E0B', width: `${r.progressPct}%`, transition: 'width 0.3s ease', borderRadius: 3 }} />
                        </div>
                      )}
                      {r.status === 'failed' && r.errorMessage && (
                        <div style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{r.errorMessage}</div>
                      )}
                      {r.dhaSubmissionId && (
                        <div style={{ fontSize: 10, color: '#059669', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{r.dhaSubmissionId}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: chipConf.color, background: chipConf.bg, borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>{chipConf.label}</span>
                      {r.status === 'completed' && (
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
                          <Download size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DHA Compliance Calendar */}
          <div style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)' }}>
              <Calendar size={15} color="#6EE7B7" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>DHA Compliance Calendar</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#A7F3D0' }}>2026</span>
            </div>
            {DHA_CALENDAR.map((item, idx) => {
              const statusConf = CALENDAR_STATUS[item.status] ?? CALENDAR_STATUS.upcoming!;
              return (
                <div key={item.id} style={{ padding: '12px 18px', borderBottom: idx < DHA_CALENDAR.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 9, background: statusConf.bg, border: `1px solid ${statusConf.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: statusConf.color, lineHeight: 1 }}>
                      {item.daysRemaining < 0 ? 'DONE' : item.daysRemaining}
                    </div>
                    {item.daysRemaining >= 0 && <div style={{ fontSize: 9, color: statusConf.color, fontWeight: 600 }}>days</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Period: {item.period} • Due: {item.dueDateDisplay}</div>
                    {item.submissionId && (
                      <div style={{ fontSize: 10, color: '#059669', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{item.submissionId}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusConf.color, background: statusConf.bg, border: `1px solid ${statusConf.border}`, borderRadius: 5, padding: '3px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {statusConf.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Scheduled Reports */}
          <div style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={15} color="#64748B" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Scheduled Reports</span>
              <span style={{ marginLeft: 4, fontSize: 11, color: '#94A3B8' }}>({SCHEDULED_REPORTS.filter(s => s.isActive).length} active)</span>
              <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}>
                <Settings size={14} />
              </button>
            </div>
            {SCHEDULED_REPORTS.map((s, idx) => {
              const m = CATEGORY_META[s.category];
              const freqColors: Record<ScheduleFrequency, string> = { daily: '#0284C7', weekly: '#7C3AED', monthly: '#059669', quarterly: '#D97706' };
              return (
                <div key={s.id} style={{ padding: '11px 18px', borderBottom: idx < SCHEDULED_REPORTS.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: 10, opacity: s.isActive ? 1 : 0.5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.isActive ? '#059669' : '#94A3B8', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: freqColors[s.frequency], background: '#F8FAFC', borderRadius: 4, padding: '2px 5px', border: '1px solid #E2E8F0', textTransform: 'capitalize' }}>{s.frequency}</span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>Next: {s.nextRunDisplay}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: m.color, background: m.bg, borderRadius: 4, padding: '2px 5px' }}>{s.format}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons (Archive + Custom Report) */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowArchive(true)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              <Archive size={14} /> View Archive
            </button>
            <button onClick={() => setShowBuilder(true)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Custom Report
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <GenerateReportModal report={generateTarget} onClose={() => setGenerateTarget(null)} onSuccess={msg => addToast(msg, 'success')} />
      <ScheduleReportModal report={scheduleTarget} onClose={() => setScheduleTarget(null)} onSuccess={msg => addToast(msg, 'success')} />
      {showBuilder && <CustomReportBuilder onClose={() => setShowBuilder(false)} onSuccess={msg => addToast(msg, 'success')} />}
      {showArchive && <ReportArchiveModal onClose={() => setShowArchive(false)} />}

      {/* Toast stack */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2000 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            background: t.type === 'success' ? '#ECFDF5' : t.type === 'warning' ? '#FFFBEB' : '#EFF6FF',
            border: `1px solid ${t.type === 'success' ? '#6EE7B7' : t.type === 'warning' ? '#FDE68A' : '#BFDBFE'}`,
            borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: 340,
          }}>
            {t.type === 'success' && <CheckCircle size={15} color="#059669" />}
            {t.type === 'warning' && <AlertCircle size={15} color="#D97706" />}
            {t.type === 'info' && <AlertCircle size={15} color="#1D4ED8" />}
            <span style={{ fontSize: 13, color: '#0F172A', flex: 1 }}>{t.msg}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </InsuranceShell>
  );
};

export default InsuranceReports;
