import { useState } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopBar from '../components/admin/AdminTopBar';
import HeroMetrics from '../components/admin/HeroMetrics';
import UAEMap from '../components/admin/UAEMap';
import ActivityFeed from '../components/admin/ActivityFeed';
import AIMetricsPanel from '../components/admin/AIMetricsPanel';
import SystemHealthPanel from '../components/admin/SystemHealthPanel';
import CompliancePanel from '../components/admin/CompliancePanel';
import PortalStatus from '../components/admin/PortalStatus';
import RevenueChart from '../components/admin/RevenueChart';
import QuickActions from '../components/admin/QuickActions';
import { AlertTriangle, X, AlertCircle } from 'lucide-react';
import { alerts } from '../data/superAdminData';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#0F172A' }}>
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <AdminTopBar />

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5" style={{ padding: '20px 24px' }}>

          {visibleAlerts.length > 0 && (
            <div className="flex flex-col gap-2">
              {visibleAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                  style={{
                    background: alert.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${alert.type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  }}
                >
                  {alert.type === 'error' ? (
                    <AlertCircle style={{ width: 14, height: 14, color: '#F87171', flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle style={{ width: 14, height: 14, color: '#FCD34D', flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 12, color: alert.type === 'error' ? '#F87171' : '#FCD34D', flex: 1 }}>
                    {alert.message}
                  </span>
                  <button
                    className="rounded-lg px-2.5 py-1 transition-colors"
                    style={{
                      fontSize: 11,
                      color: alert.type === 'error' ? '#F87171' : '#FCD34D',
                      background: alert.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                      border: `1px solid ${alert.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    }}
                  >
                    {alert.action}
                  </button>
                  <button
                    onClick={() => setDismissedAlerts(prev => new Set([...prev, alert.id]))}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                    style={{ color: '#475569' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#475569'; }}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <HeroMetrics />

          <QuickActions />

          {/* Main grid */}
          <div className="flex gap-5">

            {/* Left 9-col area */}
            <div className="flex flex-col gap-5 min-w-0" style={{ flex: '0 0 calc(75% - 10px)' }}>
              {/* Row 1: UAEMap + ActivityFeed */}
              <div className="flex gap-5">
                <div style={{ flex: '0 0 calc(55.55% - 10px)', height: 304 }}><UAEMap /></div>
                <div style={{ flex: '1 1 0', height: 304 }}><ActivityFeed /></div>
              </div>

              {/* Row 2: RevenueChart + SystemHealthPanel */}
              <div className="flex gap-5">
                <div style={{ flex: '0 0 calc(55.55% - 10px)' }}><RevenueChart /></div>
                <div style={{ flex: '1 1 0' }}><SystemHealthPanel /></div>
              </div>

              {/* Row 3: AI Analytics */}
              <div><AIMetricsPanel /></div>
            </div>

            {/* Right column: PortalStatus + CompliancePanel */}
            <div className="flex flex-col gap-5" style={{ flex: '0 0 calc(25% - 10px)' }}>
              <PortalStatus />
              <CompliancePanel />
            </div>

          </div>
          </div>{/* end flex-col gap-5 */}
        </div>
      </div>
    </div>
  );
}
