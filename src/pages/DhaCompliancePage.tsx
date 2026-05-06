import { useState } from 'react';
import { ShieldCheck, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import AdminPageLayout from '../components/admin/AdminPageLayout';
import { OverviewTab } from '../components/dhaCompliance/OverviewTab';
import { SheryanTab } from '../components/dhaCompliance/SheryanTab';
import { NabidhSummaryTab } from '../components/dhaCompliance/NabidhSummaryTab';
import { TatmeenTab } from '../components/dhaCompliance/TatmeenTab';
import { ShafafiyaTab } from '../components/dhaCompliance/ShafafiyaTab';
import { FormularyTab } from '../components/dhaCompliance/FormularyTab';
import { PathBTab } from '../components/dhaCompliance/PathBTab';
import { PatientRightsTab } from '../components/dhaCompliance/PatientRightsTab';
import { InspectionsTab } from '../components/dhaCompliance/InspectionsTab';
import { PoliciesTab } from '../components/dhaCompliance/PoliciesTab';
import { ReportsTab } from '../components/dhaCompliance/ReportsTab';
import { D, ComplianceStatusChip, Sparkline } from '../components/dhaCompliance/DhaCompliancePrimitives';
import { DHA_KPIS, ACTION_ITEMS } from '../data/dhaComplianceData';

// Tab config
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'Sheryan', label: 'Sheryan' },
  { id: 'NABIDH', label: 'NABIDH' },
  { id: 'Tatmeen', label: 'Tatmeen' },
  { id: 'Shafafiya', label: 'Shafafiya' },
  { id: 'Formulary', label: 'Drug Formulary' },
  { id: 'PathB', label: 'Path B' },
  { id: 'PatientRights', label: 'Patient Rights' },
  { id: 'Inspections', label: 'Inspections' },
  { id: 'Policies', label: 'Policies' },
  { id: 'Reports', label: 'Reports' },
] as const;

type TabId = typeof TABS[number]['id'];

// Program status strip config
const PROGRAM_STRIP = [
  { id: 'Sheryan', label: 'Sheryan', status: 'Compliant' as const },
  { id: 'NABIDH', label: 'NABIDH', status: 'Action required' as const },
  { id: 'Tatmeen', label: 'Tatmeen', status: 'Compliant' as const },
  { id: 'Shafafiya', label: 'Shafafiya', status: 'Action required' as const },
  { id: 'Formulary', label: 'Formulary', status: 'Action required' as const },
  { id: 'PathB', label: 'Path B', status: 'Compliant' as const },
  { id: 'PatientRights', label: 'Patient Rights', status: 'At risk' as const },
  { id: 'Inspections', label: 'Inspections', status: 'Action required' as const },
  { id: 'Policies', label: 'Policies', status: 'Compliant' as const },
] as const;

const STATUS_DOT: Record<string, string> = {
  'Compliant': D.successLight,
  'Action required': D.warningLight,
  'At risk': '#FB923C',
  'Non-compliant': D.errorLight,
};

const OVERDUE_COUNT = ACTION_ITEMS.filter(a => a.status === 'Overdue').length;
const CRITICAL_COUNT = ACTION_ITEMS.filter(a => a.priority === 'Critical').length;

export default function DhaCompliancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const handleSwitchTab = (tabId: string) => {
    const found = TABS.find(t => t.id === tabId);
    if (found) setActiveTab(found.id as TabId);
  };

  return (
    <AdminPageLayout activeSection="compliance">
      <div className="flex flex-col h-full overflow-hidden" style={{ background: D.bg3 }}>

        {/* Page header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] mb-1.5" style={{ color: D.text3, fontFamily: 'DM Mono, monospace' }}>
                <span>Super Admin</span>
                <ChevronRight size={10} />
                <span style={{ color: D.tealLight }}>DHA Compliance</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: D.tealBg, border: `1px solid ${D.tealBorder}` }}>
                  <ShieldCheck size={20} style={{ color: D.tealLight }} />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: D.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>DHA Compliance Center</h1>
                  <div className="text-[11px]" style={{ color: D.text3 }}>Dubai Health Authority · All Programs · {new Date().toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' })}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {OVERDUE_COUNT > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: D.errorBg, color: D.errorLight, border: `1px solid ${D.errorBorder}` }}>
                  <AlertTriangle size={12} />
                  {OVERDUE_COUNT} overdue action{OVERDUE_COUNT > 1 ? 's' : ''}
                </div>
              )}
              <ComplianceStatusChip status="Action required" />
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {[
              { label: 'Compliance Score', value: `${DHA_KPIS.complianceScore.value}%`, grade: DHA_KPIS.complianceScore.grade, delta: DHA_KPIS.complianceScore.delta, sparkline: DHA_KPIS.complianceScore.sparkline, color: '#34D399' },
              { label: 'Open Findings', value: `${DHA_KPIS.openFindings.value}`, delta: DHA_KPIS.openFindings.delta, sparkline: DHA_KPIS.openFindings.sparkline, color: DHA_KPIS.openFindings.value > 0 ? D.warningLight : D.successLight },
              { label: 'Expiring Credentials', value: `${DHA_KPIS.expiringCredentials.value}`, delta: DHA_KPIS.expiringCredentials.delta, sparkline: DHA_KPIS.expiringCredentials.sparkline, color: D.warningLight },
              { label: '24h Submissions', value: DHA_KPIS.submissions24h.value.toLocaleString(), delta: DHA_KPIS.submissions24h.delta, sparkline: DHA_KPIS.submissions24h.sparkline, color: D.tealLight },
              { label: 'Patient Rights Events', value: `${DHA_KPIS.patientRightsEvents.value}`, delta: DHA_KPIS.patientRightsEvents.delta, sparkline: DHA_KPIS.patientRightsEvents.sparkline, color: '#F9A8D4' },
              { label: 'Inspection Readiness', value: `${DHA_KPIS.inspectionReadiness.value}%`, delta: DHA_KPIS.inspectionReadiness.delta, sparkline: DHA_KPIS.inspectionReadiness.sparkline, color: D.blueLight },
            ].map(k => {
              const isPos = k.delta > 0;
              const isNeg = k.delta < 0;
              const deltaColor = isPos ? D.successLight : isNeg ? D.errorLight : D.text3;
              const DeltaIcon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
              return (
                <div key={k.label} className="rounded-xl p-3" style={{ background: D.bg2, border: `1px solid ${D.border}` }}>
                  <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: D.text3, fontFamily: 'DM Mono, monospace' }}>{k.label}</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-base font-bold" style={{ color: k.color, fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <DeltaIcon size={9} style={{ color: deltaColor }} />
                        <span className="text-[9px]" style={{ color: deltaColor }}>
                          {isPos ? '+' : ''}{k.delta}
                        </span>
                      </div>
                    </div>
                    <Sparkline data={k.sparkline} color={k.color} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Program status strip */}
          <div className="flex items-center gap-1.5 mb-0 overflow-x-auto pb-1">
            {PROGRAM_STRIP.map(p => (
              <button key={p.id} onClick={() => handleSwitchTab(p.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg whitespace-nowrap flex-shrink-0 transition-all hover:opacity-80"
                style={{
                  background: activeTab === p.id ? D.tealBg : D.bg2,
                  border: `1px solid ${activeTab === p.id ? D.tealBorder : D.border}`,
                }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_DOT[p.status] }} />
                <span className="text-[10px]" style={{ color: activeTab === p.id ? D.tealLight : D.text2 }}>{p.label}</span>
                <span className="text-[9px]" style={{ color: STATUS_DOT[p.status] }}>{p.status === 'Compliant' ? '✓' : '!'}</span>
              </button>
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-0.5 mt-3 overflow-x-auto border-b" style={{ borderColor: D.border }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabId)}
                className="relative px-3 py-2 text-xs whitespace-nowrap flex-shrink-0 transition-colors"
                style={{ color: activeTab === tab.id ? D.tealLight : D.text3 }}>
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: D.teal }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'overview' && <OverviewTab onSwitchTab={handleSwitchTab} />}
          {activeTab === 'Sheryan' && <SheryanTab />}
          {activeTab === 'NABIDH' && <NabidhSummaryTab />}
          {activeTab === 'Tatmeen' && <TatmeenTab />}
          {activeTab === 'Shafafiya' && <ShafafiyaTab />}
          {activeTab === 'Formulary' && <FormularyTab />}
          {activeTab === 'PathB' && <PathBTab />}
          {activeTab === 'PatientRights' && <PatientRightsTab />}
          {activeTab === 'Inspections' && <InspectionsTab />}
          {activeTab === 'Policies' && <PoliciesTab />}
          {activeTab === 'Reports' && <ReportsTab />}
        </div>
      </div>
    </AdminPageLayout>
  );
}
