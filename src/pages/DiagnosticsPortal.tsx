import React, { useState } from 'react';
import DiagnosticsSidebar from '../components/diagnostics/DiagnosticsSidebar';
import DiagnosticsTopBar, { DeptFilter } from '../components/diagnostics/DiagnosticsTopBar';
import DiagnosticsDashboard from '../components/diagnostics/dashboard/DiagnosticsDashboard';
import MRIPage from '../components/diagnostics/mri/MRIPage';
import CTScanPage from '../components/diagnostics/ct/CTScanPage';
import LabRadiologyPortal from './LabRadiologyPortal';

const FULL_SCREEN_PAGES = ['lab', 'mri', 'ct'];

const DiagnosticsPortal: React.FC = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');

  const isFullScreen = FULL_SCREEN_PAGES.includes(activePage);

  const renderPage = () => {
    switch (activePage) {
      case 'mri': return <MRIPage />;
      case 'ct':  return <CTScanPage />;
      case 'lab': return <LabRadiologyPortal />;
      default:    return <DiagnosticsDashboard deptFilter={deptFilter} onNavigate={setActivePage} />;
    }
  };

  if (isFullScreen) {
    return (
      <div className="flex h-screen overflow-hidden">
        {renderPage()}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>
      <DiagnosticsSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        activePage={activePage}
        onNavigate={setActivePage}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DiagnosticsTopBar deptFilter={deptFilter} onDeptChange={setDeptFilter} activePage={activePage} />
        {renderPage()}
      </div>
    </div>
  );
};

export default DiagnosticsPortal;
