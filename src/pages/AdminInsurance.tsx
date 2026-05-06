import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Download, RefreshCw, Shield, Activity, TrendingUp } from 'lucide-react';
import AdminSidebar from '../components/admin/AdminSidebar';
import InsuranceKpiStrip from '../components/adminInsurance/InsuranceKpiStrip';
import InsurancePartnersTab from '../components/adminInsurance/InsurancePartnersTab';
import InsuranceClaimsTab from '../components/adminInsurance/InsuranceClaimsTab';
import InsuranceFraudTab from '../components/adminInsurance/InsuranceFraudTab';
import InsuranceApiTab from '../components/adminInsurance/InsuranceApiTab';
import InsuranceAnalyticsView from '../components/adminInsurance/InsuranceAnalyticsView';
import { OnboardInsurerModal, ExportInsuranceModal } from '../components/adminInsurance/InsuranceModals';
import InsurerDetailDrawer from '../components/adminInsurance/InsurerDetailDrawer';
import type { AdminInsurer } from '../data/adminInsuranceData';

interface Toast { id: number; msg: string; type: string }

type MainTab = 'partners' | 'claims' | 'fraud' | 'api';

const TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: 'partners', label: 'Partners', icon: Shield },
  { key: 'claims', label: 'Claims Overview', icon: Activity },
  { key: 'fraud', label: 'Fraud Alerts', icon: AlertTriangle },
  { key: 'api', label: 'API & Integrations', icon: TrendingUp },
];

export default function AdminInsurance() {
  const [mainTab, setMainTab] = useState<MainTab>('partners');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedInsurer, setSelectedInsurer] = useState<AdminInsurer | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const showToast = (msg: string, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'fraud' || tab === 'api' || tab === 'claims' || tab === 'partners') {
      setMainTab(tab as MainTab);
      setShowAnalytics(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); showToast('Insurance data refreshed', 'success'); }, 1800);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', overflow: 'hidden' }}>
      <AdminSidebar activeSection="insurance" onSectionChange={() => {}} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 28px 0', background: '#0F172A', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Shield size={22} color="#0D9488" />
                <h1 style={{ color: '#F1F5F9', fontWeight: 800, fontSize: 22, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                  Insurance Partners
                </h1>
                <span style={{ background: 'rgba(13,148,136,0.12)', color: '#0D9488', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, letterSpacing: '0.04em' }}>
                  7 Active
                </span>
              </div>
              <div style={{ color: '#475569', fontSize: 13 }}>
                Manage insurer integrations, claims processing, fraud monitoring, and API health
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <button
                onClick={() => { setShowAnalytics(a => !a); }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: showAnalytics ? 'rgba(13,148,136,0.15)' : 'rgba(30,41,59,0.8)', border: `1px solid ${showAnalytics ? '#0D9488' : '#334155'}`, borderRadius: 9, color: showAnalytics ? '#0D9488' : '#94A3B8', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <TrendingUp size={14} />
                Analytics
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: 9, color: '#94A3B8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </button>
              <button
                onClick={() => setShowExport(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: 9, color: '#94A3B8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={() => setShowOnboard(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', background: '#0D9488', border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={15} />
                Onboard Insurer
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0, padding: '4px 0', borderBottom: '1px solid #1E293B' }}>
            <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
              <AlertTriangle size={13} color="#F59E0B" />
              <span style={{ color: '#F59E0B', fontSize: 12, fontWeight: 600 }}>Daman API degraded — 3.2s avg response since 1:20 PM</span>
              <button
                onClick={() => showToast('Engineering team notified about Daman API degradation', 'info')}
                style={{ background: 'rgba(245,158,11,0.2)', border: 'none', borderRadius: 5, padding: '2px 8px', color: '#F59E0B', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                Notify
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 28px 0', flexShrink: 0 }}>
          <InsuranceKpiStrip onTabChange={handleTabChange} />
        </div>

        {showAnalytics ? (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <InsuranceAnalyticsView />
          </div>
        ) : (
          <>
            <div style={{ padding: '16px 28px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 2, background: '#0F172A', borderRadius: 10, padding: 4, border: '1px solid #1E293B', width: 'fit-content' }}>
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = mainTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setMainTab(tab.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 600 : 500, background: isActive ? '#1E293B' : 'transparent', color: isActive ? '#F1F5F9' : '#64748B', transition: 'all 0.15s' }}
                    >
                      <Icon size={14} color={isActive ? '#0D9488' : '#64748B'} />
                      {tab.label}
                      {tab.key === 'fraud' && (
                        <span style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>7</span>
                      )}
                      {tab.key === 'api' && (
                        <span style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>1</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              {mainTab === 'partners' && (
                <InsurancePartnersTab
                  onInsurerClick={setSelectedInsurer}
                  showToast={showToast}
                />
              )}
              {mainTab === 'claims' && <InsuranceClaimsTab />}
              {mainTab === 'fraud' && <InsuranceFraudTab showToast={showToast} />}
              {mainTab === 'api' && <InsuranceApiTab showToast={showToast} />}
            </div>
          </>
        )}
      </div>

      {selectedInsurer && (
        <InsurerDetailDrawer
          insurer={selectedInsurer}
          onClose={() => setSelectedInsurer(null)}
          showToast={showToast}
        />
      )}

      {showOnboard && <OnboardInsurerModal onClose={() => setShowOnboard(false)} showToast={showToast} />}
      {showExport && <ExportInsuranceModal onClose={() => setShowExport(false)} showToast={showToast} />}

      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2000, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              padding: '11px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, maxWidth: 360,
              background: t.type === 'success' ? '#0D9488' : t.type === 'error' ? '#EF4444' : '#1E293B',
              border: t.type === 'info' ? '1px solid #334155' : 'none',
              color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              animation: 'slideInToast 0.25s ease-out',
              pointerEvents: 'auto',
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideInToast { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
