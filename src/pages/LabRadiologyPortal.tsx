import React, { useState } from 'react';
import LabRadiologySidebar from '../components/labradiology/LabRadiologySidebar';
import LabRadiologyTopBar, { DeptFilter } from '../components/labradiology/LabRadiologyTopBar';
import LabRadiologyDashboard from '../components/labradiology/dashboard/LabRadiologyDashboard';
import RadiologyReportingPage from '../components/labradiology/pages/RadiologyReportingPage';
import NABIDHPage from '../components/labradiology/pages/NABIDHPage';
import ProfilePage from '../components/labradiology/pages/ProfilePage';

const PLACEHOLDER_PAGES: Record<string, { title: string; desc: string; color: string }> = {
  'lab-queue':         { title: 'Lab Queue', desc: 'Full-screen sample queue with department filters and real-time status', color: '#4F46E5' },
  'lab-orders':        { title: 'Lab Orders', desc: 'New and pending lab test orders from all departments', color: '#4F46E5' },
  'lab-results':       { title: 'Lab Results', desc: 'Result entry, verification, and release workflow', color: '#4F46E5' },
  'lab-qc':            { title: 'Quality Control', desc: 'Daily QC runs, Westgard rules, analyzer performance', color: '#F59E0B' },
  'imaging-queue':     { title: 'Imaging Queue', desc: 'Full radiology worklist — MRI, CT, USS, X-Ray, PET', color: '#1D4ED8' },
  'imaging-orders':    { title: 'Imaging Orders', desc: 'New imaging requests and order management', color: '#1D4ED8' },
  'imaging-equipment': { title: 'Imaging Equipment', desc: 'Equipment status, maintenance schedules, and QA logs', color: '#EF4444' },
  'lab-equipment':     { title: 'Lab Equipment', desc: 'Analyzer status, maintenance, and calibration records', color: '#0D9488' },
  'reports':           { title: 'Reports & Analytics', desc: 'Volume, TAT, productivity, and quality analytics', color: '#0D9488' },
  'settings':          { title: 'Portal Settings', desc: 'Notification preferences, integrations, user management', color: '#64748B' },
};

const PlaceholderPage: React.FC<{ page: string }> = ({ page }) => {
  const cfg = PLACEHOLDER_PAGES[page] || { title: page, desc: '', color: '#64748B' };
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#F8FAFC' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${cfg.color}15`, border: `2px solid ${cfg.color}25` }}>
          <span style={{ fontSize: 28 }}>🔬</span>
        </div>
        <div className="font-black text-slate-800 mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20 }}>{cfg.title}</div>
        <div className="text-slate-400" style={{ fontSize: 13, maxWidth: 360 }}>{cfg.desc}</div>
        <div className="mt-4 px-4 py-2 rounded-xl font-mono" style={{ fontSize: 10, background: `${cfg.color}10`, color: cfg.color, display: 'inline-block' }}>
          Lab & Radiology Portal › {cfg.title}
        </div>
      </div>
    </div>
  );
};

const LabRadiologyPortal: React.FC = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':        return <LabRadiologyDashboard deptFilter={deptFilter} />;
      case 'imaging-reports':  return <RadiologyReportingPage />;
      case 'nabidh':           return <NABIDHPage />;
      case 'profile':          return <ProfilePage />;
      default:                 return <PlaceholderPage page={activePage} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>
      <LabRadiologySidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <LabRadiologyTopBar
          activePage={activePage}
          deptFilter={deptFilter}
          onDeptChange={setDeptFilter}
        />
        {renderPage()}
      </div>
    </div>
  );
};

export default LabRadiologyPortal;
