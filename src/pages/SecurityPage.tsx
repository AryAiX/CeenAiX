import { useState } from 'react';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw, ChevronRight, X } from 'lucide-react';
import AdminPageLayout from '../components/admin/AdminPageLayout';
import { SECURITY_POSTURE, SECURITY_KPIS, ACTIVE_ALERTS } from '../data/securityData';
import { S, SCard, PostureChip, SeverityDot, Sparkline } from '../components/security/SecurityPrimitives';
import { OverviewTab } from '../components/security/OverviewTab';
import { IdentityTab } from '../components/security/IdentityTab';
import { AuthenticationTab } from '../components/security/AuthenticationTab';
import { ThreatsTab } from '../components/security/ThreatsTab';
import { VulnerabilitiesTab } from '../components/security/VulnerabilitiesTab';
import { DataProtectionTab } from '../components/security/DataProtectionTab';
import { KeysSecretsTab } from '../components/security/KeysSecretsTab';
import { NetworkEndpointsTab } from '../components/security/NetworkEndpointsTab';
import { IncidentsTab } from '../components/security/IncidentsTab';
import { FrameworksTab } from '../components/security/FrameworksTab';
import { SettingsTab } from '../components/security/SettingsTab';

type TabId = 'overview' | 'identity' | 'authentication' | 'threats' | 'vulnerabilities' | 'data' | 'keys' | 'network' | 'incidents' | 'frameworks' | 'settings';

interface Tab { id: TabId; label: string; badge?: number; badgeColor?: string }

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'identity', label: 'Identity & Access', badge: SECURITY_KPIS.privilegedAccess.breakGlassActive > 0 ? SECURITY_KPIS.privilegedAccess.breakGlassActive : undefined, badgeColor: S.warningLight },
  { id: 'authentication', label: 'Authentication', badge: SECURITY_KPIS.mfaCoverage.value < 100 ? 1 : undefined, badgeColor: S.warningLight },
  { id: 'threats', label: 'Threats', badge: SECURITY_KPIS.activeThreats.critical + SECURITY_KPIS.activeThreats.high, badgeColor: S.errorLight },
  { id: 'vulnerabilities', label: 'Vulnerabilities', badge: SECURITY_KPIS.vulnerabilities.critical, badgeColor: S.errorLight },
  { id: 'data', label: 'Data Protection' },
  { id: 'keys', label: 'Keys & Secrets', badge: SECURITY_KPIS.secretsAtRisk.leakedDetected > 0 ? SECURITY_KPIS.secretsAtRisk.total : undefined, badgeColor: S.errorLight },
  { id: 'network', label: 'Network & Endpoints' },
  { id: 'incidents', label: 'Incidents', badge: 3, badgeColor: S.errorLight },
  { id: 'frameworks', label: 'Frameworks & Attestations' },
  { id: 'settings', label: 'Settings' },
];

const KPI_DATA = [
  {
    key: 'score',
    label: 'Security Score',
    value: `${SECURITY_KPIS.securityScore.value}`,
    unit: `/${SECURITY_KPIS.securityScore.grade}`,
    delta: SECURITY_KPIS.securityScore.delta,
    deltaLabel: '7d',
    sparkline: SECURITY_KPIS.securityScore.sparkline,
    color: S.warningLight,
    alert: false,
  },
  {
    key: 'threats',
    label: 'Active Threats',
    value: `${SECURITY_KPIS.activeThreats.total}`,
    unit: '',
    sub: `${SECURITY_KPIS.activeThreats.critical} critical`,
    delta: SECURITY_KPIS.activeThreats.delta,
    deltaLabel: '24h',
    sparkline: SECURITY_KPIS.activeThreats.sparkline,
    color: S.errorLight,
    alert: true,
  },
  {
    key: 'auth',
    label: 'Failed Auths (24h)',
    value: SECURITY_KPIS.failedAuths.value.toLocaleString(),
    unit: '',
    delta: SECURITY_KPIS.failedAuths.delta,
    deltaLabel: 'vs yesterday',
    sparkline: SECURITY_KPIS.failedAuths.sparkline,
    color: S.warningLight,
    alert: SECURITY_KPIS.failedAuths.anomalous,
  },
  {
    key: 'mfa',
    label: 'MFA Coverage',
    value: `${SECURITY_KPIS.mfaCoverage.value}`,
    unit: '%',
    delta: SECURITY_KPIS.mfaCoverage.delta,
    deltaLabel: '7d',
    sparkline: SECURITY_KPIS.mfaCoverage.sparkline,
    color: S.warningLight,
    alert: SECURITY_KPIS.mfaCoverage.value < 100,
  },
  {
    key: 'privaccess',
    label: 'Privileged Users',
    value: `${SECURITY_KPIS.privilegedAccess.total}`,
    unit: '',
    sub: `${SECURITY_KPIS.privilegedAccess.breakGlassActive} break-glass active`,
    delta: SECURITY_KPIS.privilegedAccess.delta,
    deltaLabel: '30d',
    sparkline: SECURITY_KPIS.privilegedAccess.sparkline,
    color: S.blueLight,
    alert: SECURITY_KPIS.privilegedAccess.breakGlassActive > 0,
  },
  {
    key: 'vulns',
    label: 'Open Vulnerabilities',
    value: `${SECURITY_KPIS.vulnerabilities.total}`,
    unit: '',
    sub: `${SECURITY_KPIS.vulnerabilities.critical} critical`,
    delta: SECURITY_KPIS.vulnerabilities.delta,
    deltaLabel: '7d',
    sparkline: SECURITY_KPIS.vulnerabilities.sparkline,
    color: S.errorLight,
    alert: SECURITY_KPIS.vulnerabilities.critical > 0,
  },
  {
    key: 'secrets',
    label: 'Secrets at Risk',
    value: `${SECURITY_KPIS.secretsAtRisk.total}`,
    unit: '',
    sub: `${SECURITY_KPIS.secretsAtRisk.leakedDetected} leaked`,
    delta: SECURITY_KPIS.secretsAtRisk.delta,
    deltaLabel: '7d',
    sparkline: SECURITY_KPIS.secretsAtRisk.sparkline,
    color: S.errorLight,
    alert: SECURITY_KPIS.secretsAtRisk.leakedDetected > 0,
  },
  {
    key: 'findings',
    label: 'Open Findings',
    value: `${SECURITY_KPIS.openFindings.total}`,
    unit: '',
    sub: `${SECURITY_KPIS.openFindings.critical} critical`,
    delta: SECURITY_KPIS.openFindings.delta,
    deltaLabel: '7d',
    sparkline: SECURITY_KPIS.openFindings.sparkline,
    color: S.warningLight,
    alert: false,
  },
];

const alertBg: Record<string, string> = {
  Critical: S.errorBg,
  High: S.orangeBg,
  Medium: S.warningBg,
};
const alertBorder: Record<string, string> = {
  Critical: S.errorBorder,
  High: S.orangeBorder,
  Medium: S.warningBorder,
};
const alertText: Record<string, string> = {
  Critical: S.errorLight,
  High: S.orangeLight,
  Medium: S.warningLight,
};

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [lastRefreshed] = useState(() => new Date().toLocaleTimeString('en-AE', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' }));

  const visibleAlerts = ACTIVE_ALERTS.filter(a => !dismissedAlerts.has(a.id));

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'identity': return <IdentityTab />;
      case 'authentication': return <AuthenticationTab />;
      case 'threats': return <ThreatsTab />;
      case 'vulnerabilities': return <VulnerabilitiesTab />;
      case 'data': return <DataProtectionTab />;
      case 'keys': return <KeysSecretsTab />;
      case 'network': return <NetworkEndpointsTab />;
      case 'incidents': return <IncidentsTab />;
      case 'frameworks': return <FrameworksTab />;
      case 'settings': return <SettingsTab />;
    }
  };

  return (
    <AdminPageLayout activeSection="security">
      <div className="flex flex-col h-full" style={{ background: S.bg2 }}>
        {/* Page header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-3" style={{ borderBottom: `1px solid ${S.border}`, background: S.bg2 }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Shield size={18} style={{ color: S.tealLight }} />
                <h1 className="text-lg font-bold" style={{ color: S.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Security Command Center
                </h1>
                <PostureChip posture={SECURITY_POSTURE.overall} />
                <span className="text-xs font-mono" style={{ color: S.text3 }}>Score {SECURITY_POSTURE.score} / 100 · {SECURITY_POSTURE.grade}</span>
              </div>
              <div className="text-[10px]" style={{ color: S.text3 }}>
                Last assessed {new Date(SECURITY_POSTURE.lastAssessed).toLocaleTimeString('en-AE', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' })} GST · Auto-refresh every 60s
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: S.text3 }}>
                <RefreshCw size={10} />
                <span>Updated {lastRefreshed}</span>
              </div>
              <button className="text-[10px] px-3 py-1.5 rounded-lg"
                style={{ background: S.tealBg, color: S.tealLight, border: `1px solid ${S.tealBorder}` }}>
                Export report
              </button>
            </div>
          </div>

          {/* Critical alerts strip */}
          {visibleAlerts.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-3">
              {visibleAlerts.map(alert => (
                <div key={alert.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: alertBg[alert.severity] || S.errorBg, border: `1px solid ${alertBorder[alert.severity] || S.errorBorder}` }}>
                  <SeverityDot severity={alert.severity} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold" style={{ color: alertText[alert.severity] || S.errorLight }}>
                      [{alert.id}] {alert.headline}
                    </span>
                    <span className="text-[10px] ml-2" style={{ color: S.text3 }}>{alert.scope}</span>
                  </div>
                  <button className="text-[10px] px-2 py-0.5 rounded flex-shrink-0"
                    style={{ background: alertBorder[alert.severity] || S.errorBorder, color: alertText[alert.severity] || S.errorLight }}>
                    <ChevronRight size={10} className="inline mr-0.5" />Respond
                  </button>
                  <button onClick={() => setDismissedAlerts(prev => new Set([...prev, alert.id]))}
                    className="flex-shrink-0" style={{ color: S.text3 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* KPI strip */}
          <div className="grid grid-cols-4 xl:grid-cols-8 gap-2 mb-3">
            {KPI_DATA.map(k => (
              <SCard key={k.key} className="p-3 cursor-pointer hover:border-teal-600 transition-all"
                style={{ minWidth: 0 }}>
                <div className="flex items-start justify-between mb-0.5">
                  <div className="text-[9px] leading-tight" style={{ color: S.text3 }}>{k.label}</div>
                  {k.alert && <AlertTriangle size={8} style={{ color: k.color, flexShrink: 0 }} />}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-base font-bold leading-none" style={{ color: k.color, fontFamily: 'DM Mono, monospace' }}>{k.value}</span>
                  {k.unit && <span className="text-[10px]" style={{ color: S.text3 }}>{k.unit}</span>}
                </div>
                {k.sub && <div className="text-[9px] mt-0.5" style={{ color: S.text3 }}>{k.sub}</div>}
                <div className="flex items-center gap-1 mt-1">
                  {k.delta !== 0 && (k.delta > 0
                    ? <TrendingUp size={8} style={{ color: k.key === 'score' || k.key === 'mfa' ? S.successLight : k.key === 'findings' || k.key === 'vulns' ? S.errorLight : S.warningLight }} />
                    : <TrendingDown size={8} style={{ color: k.key === 'score' || k.key === 'mfa' ? S.errorLight : S.successLight }} />
                  )}
                  <span className="text-[9px]" style={{ color: S.text3, fontFamily: 'DM Mono, monospace' }}>
                    {k.delta > 0 ? '+' : ''}{k.delta} {k.deltaLabel}
                  </span>
                </div>
                <Sparkline data={k.sparkline} color={k.color} height={18} />
              </SCard>
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex gap-0.5 overflow-x-auto pb-0" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-medium transition-all flex-shrink-0 relative"
                style={activeTab === tab.id
                  ? { background: S.bg1, color: S.tealLight, borderBottom: `2px solid ${S.tealLight}` }
                  : { color: S.text3, background: 'transparent' }}>
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: `${tab.badgeColor}22`, color: tab.badgeColor, minWidth: 16, textAlign: 'center' }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto" style={{ background: S.bg1 }}>
          {renderTab()}
        </div>
      </div>
    </AdminPageLayout>
  );
}
