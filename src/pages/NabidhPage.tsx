import { useState } from 'react';
import {
  Activity, Shield, Clock, Users, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  FileText, Settings, Key, Lock,
} from 'lucide-react';
import AdminPageLayout from '../components/admin/AdminPageLayout';
import { COMPLIANCE_STRIP, NABIDH_KPIS } from '../data/nabidhData';
import { OverviewTab } from '../components/nabidh/OverviewTab';
import { SubmissionQueueTab } from '../components/nabidh/SubmissionQueueTab';
import { RejectionsTab } from '../components/nabidh/RejectionsTab';
import { ConsentTab } from '../components/nabidh/ConsentTab';
import { MappingsTab } from '../components/nabidh/MappingsTab';
import { CertificatesTab } from '../components/nabidh/CertificatesTab';
import { AuditLogTab } from '../components/nabidh/AuditLogTab';
import { ReportsTab } from '../components/nabidh/ReportsTab';
import { ConfigTab } from '../components/nabidh/ConfigTab';

const N = {
  bg1: '#0F172A',
  bg2: '#1E293B',
  bg3: '#0A1628',
  border: 'rgba(30,41,59,0.9)',
  teal: '#0D9488',
  tealLight: '#2DD4BF',
  tealBg: 'rgba(13,148,136,0.12)',
  tealBorder: 'rgba(13,148,136,0.3)',
  cyan: '#0891B2',
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
  blueLight: '#93C5FD',
  blueBg: 'rgba(37,99,235,0.12)',
};

type Tab =
  | 'overview'
  | 'queue'
  | 'rejections'
  | 'consent'
  | 'mappings'
  | 'certificates'
  | 'audit'
  | 'reports'
  | 'config';

const TABS: { id: Tab; label: string; icon: React.ElementType; alert?: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'queue', label: 'Submission Queue', icon: RefreshCw },
  { id: 'rejections', label: 'Rejections & Errors', icon: XCircle, alert: true },
  { id: 'consent', label: 'Patient Consent', icon: Users },
  { id: 'mappings', label: 'Mappings & Schemas', icon: FileText },
  { id: 'certificates', label: 'Certificates', icon: Key, alert: true },
  { id: 'audit', label: 'Audit Log', icon: Lock },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'config', label: 'Configuration', icon: Settings },
];

function ComplianceStrip() {
  const cs = COMPLIANCE_STRIP;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ background: '#070F1E', borderBottom: `1px solid ${N.border}` }}>
      {/* DHA License */}
      <div className="flex items-center gap-2 text-[10px]">
        <Shield size={11} style={{ color: N.successLight }} />
        <span style={{ color: N.text3 }}>DHA License</span>
        <span style={{ color: N.successLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{cs.dhaLicense.number}</span>
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: N.successBg, color: N.successLight }}>{cs.dhaLicense.status}</span>
        <span style={{ color: N.text3 }}>· exp. {cs.dhaLicense.expiryDate}</span>
      </div>

      <div className="w-px h-4" style={{ background: N.border }} />

      {/* Certificate */}
      <div className="flex items-center gap-2 text-[10px]">
        <Key size={11} style={{ color: N.warningLight }} />
        <span style={{ color: N.text3 }}>mTLS Cert</span>
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: N.warningBg, color: N.warningLight }}>{cs.certificate.status}</span>
        <span style={{ color: N.warningLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
          {cs.certificate.daysToExpiry}d left
        </span>
      </div>

      <div className="w-px h-4" style={{ background: N.border }} />

      {/* Submission SLA */}
      <div className="flex items-center gap-2 text-[10px]">
        <Clock size={11} style={{ color: cs.submissionSLA.breached ? N.errorLight : N.tealLight }} />
        <span style={{ color: N.text3 }}>Submission SLA</span>
        <span style={{ color: N.tealLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{cs.submissionSLA.current}%</span>
        <span style={{ color: N.text3 }}>/ {cs.submissionSLA.target}% target</span>
        {!cs.submissionSLA.breached
          ? <CheckCircle size={10} style={{ color: N.successLight }} />
          : <AlertTriangle size={10} style={{ color: N.errorLight }} />}
      </div>

      <div className="w-px h-4" style={{ background: N.border }} />

      {/* Consent coverage */}
      <div className="flex items-center gap-2 text-[10px]">
        <Users size={11} style={{ color: N.tealLight }} />
        <span style={{ color: N.text3 }}>Consent Coverage</span>
        <span style={{ color: N.tealLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{cs.consentCoverage.pct}%</span>
        <span style={{ color: N.text3 }}>({cs.consentCoverage.pending.toLocaleString()} pending)</span>
      </div>

      <div className="w-px h-4" style={{ background: N.border }} />

      {/* Compliance score */}
      <div className="flex items-center gap-2 text-[10px] ml-auto">
        <span style={{ color: N.text3 }}>Compliance Score</span>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }}>
          {cs.complianceScore.value}% · {cs.complianceScore.grade}
        </span>
        <span style={{ color: N.text3 }}>· Audited {cs.complianceScore.lastAudit}</span>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, color, delta,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; delta?: { value: number; positive: boolean };
}) {
  return (
    <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: N.bg2, border: `1px solid ${N.border}` }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}1A` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[10px]" style={{ color: N.text3 }}>{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color: N.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{value}</div>
      {sub && <div className="text-[10px]" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>{sub}</div>}
      {delta && (
        <div className="flex items-center gap-1 text-[10px]" style={{ color: delta.positive ? N.successLight : N.errorLight }}>
          <span>{delta.positive ? '▲' : '▼'}</span>
          <span style={{ fontFamily: 'DM Mono, monospace' }}>{Math.abs(delta.value)}%</span>
          <span style={{ color: N.text3 }}>vs yesterday</span>
        </div>
      )}
    </div>
  );
}

export default function NabidhPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const kpis = NABIDH_KPIS;

  return (
    <AdminPageLayout activeSection="nabidh">
      <div className="flex flex-col" style={{ background: N.bg1, minHeight: '100%' }}>
        {/* Compliance strip */}
        <ComplianceStrip />

        {/* Page header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4" style={{ borderBottom: `1px solid ${N.border}` }}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: N.tealBg, border: `1px solid ${N.tealBorder}` }}>
                <Activity size={16} style={{ color: N.tealLight }} />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: N.text1, fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.2 }}>
                  NABIDH Integration
                </h1>
                <div className="text-[10px]" style={{ color: N.text3 }}>
                  Dubai Health Authority · National Backbone for Health Information Exchange · FHIR R4
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px]" style={{ background: N.successBg, color: N.successLight, border: `1px solid rgba(5,150,105,0.25)` }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Connected
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px]"
              style={{ background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }}>
              <RefreshCw size={10} /> Sync Now
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 px-6 py-4">
          <KpiCard icon={RefreshCw} label="Submissions (24h)" value={kpis.submissions24h.value.toLocaleString()} sub={`${kpis.submissions24h.successCount.toLocaleString()} successful`} color={N.teal} delta={{ value: kpis.submissions24h.delta, positive: true }} />
          <KpiCard icon={CheckCircle} label="Success Rate" value={`${kpis.successRate.value}%`} sub={`Target: ${kpis.successRate.target}%`} color="#059669" delta={{ value: kpis.successRate.delta, positive: true }} />
          <KpiCard icon={Clock} label="Avg Latency" value={`${kpis.avgLatency.value}ms`} sub={`p99: ${kpis.avgLatency.p99}ms`} color={N.cyan} delta={{ value: Math.abs(kpis.avgLatency.delta), positive: true }} />
          <KpiCard icon={Activity} label="Pending Queue" value={kpis.pendingQueue.value.toLocaleString()} sub={`Oldest: ${kpis.pendingQueue.oldestAge}`} color={N.warning} delta={{ value: kpis.pendingQueue.delta, positive: false }} />
          <KpiCard icon={XCircle} label="Rejected (24h)" value={kpis.rejected24h.value.toLocaleString()} sub={kpis.rejected24h.topReason} color="#DC2626" delta={{ value: Math.abs(kpis.rejected24h.delta), positive: true }} />
          <KpiCard icon={Users} label="Consent Coverage" value={`${kpis.consentCoverage.value}%`} sub={`${kpis.consentCoverage.unconsented.toLocaleString()} unconsented`} color="#2563EB" delta={{ value: kpis.consentCoverage.delta, positive: true }} />
        </div>

        {/* Alert banners */}
        <div className="px-6 flex flex-col gap-2 mb-2">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}>
            <AlertTriangle size={13} style={{ color: N.errorLight, flexShrink: 0 }} />
            <div className="flex-1 text-xs" style={{ color: N.errorLight }}>
              <span className="font-semibold">Critical:</span>
              <span style={{ color: N.text2 }}> mTLS certificate CERT-001 expires in 39 days — initiate DHA renewal process immediately.</span>
            </div>
            <button className="text-[10px] px-2.5 py-1 rounded-lg flex-shrink-0"
              onClick={() => setActiveTab('certificates')}
              style={{ background: N.errorBg, color: N.errorLight, border: `1px solid rgba(220,38,38,0.3)` }}>
              View Certificates
            </button>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: N.warningBg, border: `1px solid rgba(217,119,6,0.25)` }}>
            <AlertTriangle size={13} style={{ color: N.warningLight, flexShrink: 0 }} />
            <div className="flex-1 text-xs" style={{ color: N.warningLight }}>
              <span className="font-semibold">Warning:</span>
              <span style={{ color: N.text2 }}> 3 critical rejection error codes active — NABIDH-E-3001 (expired signature) affects 2 workspaces.</span>
            </div>
            <button className="text-[10px] px-2.5 py-1 rounded-lg flex-shrink-0"
              onClick={() => setActiveTab('rejections')}
              style={{ background: N.warningBg, color: N.warningLight, border: `1px solid rgba(217,119,6,0.3)` }}>
              View Rejections
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto px-6 gap-1 sticky top-0 z-10" style={{ background: N.bg1, borderBottom: `1px solid ${N.border}` }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-3 text-xs whitespace-nowrap transition-all relative flex-shrink-0"
                style={{
                  color: isActive ? N.tealLight : N.text3,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontWeight: isActive ? 600 : 400,
                  borderBottom: isActive ? `2px solid ${N.teal}` : '2px solid transparent',
                  marginBottom: -1,
                }}>
                <Icon size={12} />
                {tab.label}
                {tab.alert && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="px-6 py-5">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'queue' && <SubmissionQueueTab />}
          {activeTab === 'rejections' && <RejectionsTab />}
          {activeTab === 'consent' && <ConsentTab />}
          {activeTab === 'mappings' && <MappingsTab />}
          {activeTab === 'certificates' && <CertificatesTab />}
          {activeTab === 'audit' && <AuditLogTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'config' && <ConfigTab />}
        </div>
      </div>
    </AdminPageLayout>
  );
}
