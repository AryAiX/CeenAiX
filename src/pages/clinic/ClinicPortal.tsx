import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ClinicSidebar from './ClinicSidebar';
import ClinicTopBar from './ClinicTopBar';
import ClinicDashboard from './ClinicDashboard';
import ClinicDoctors from './ClinicDoctors';
import ClinicAppointments from './ClinicAppointments';
import ClinicPatients from './ClinicPatients';
import ClinicPricing from './ClinicPricing';
import ClinicAnalytics from './ClinicAnalytics';
import ClinicMessages from './ClinicMessages';
import ClinicSettings from './ClinicSettings';

type ClinicPage = 'dashboard' | 'doctors' | 'appointments' | 'patients' | 'pricing' | 'analytics' | 'messages' | 'settings';

const pageMeta: Record<ClinicPage, { title: string; subtitle: string }> = {
  dashboard:    { title: 'Dashboard',           subtitle: 'Overview of Al Noor Medical Center' },
  doctors:      { title: 'Doctors',             subtitle: 'Manage your medical staff' },
  appointments: { title: 'Appointments',        subtitle: 'Schedule and manage patient visits' },
  patients:     { title: 'Patients',            subtitle: 'Your registered patient list' },
  pricing:      { title: 'Pricing & Services',  subtitle: 'Set consultation fees and service catalog' },
  analytics:    { title: 'Analytics',           subtitle: 'Performance and revenue insights' },
  messages:     { title: 'Messages',            subtitle: 'Communication with staff and patients' },
  settings:     { title: 'Settings',            subtitle: 'Clinic profile and configuration' },
};

function getPageFromPath(path: string): ClinicPage {
  if (path.includes('/clinic/doctors'))      return 'doctors';
  if (path.includes('/clinic/appointments')) return 'appointments';
  if (path.includes('/clinic/patients'))     return 'patients';
  if (path.includes('/clinic/pricing'))      return 'pricing';
  if (path.includes('/clinic/analytics'))    return 'analytics';
  if (path.includes('/clinic/messages'))     return 'messages';
  if (path.includes('/clinic/settings'))     return 'settings';
  return 'dashboard';
}

export default function ClinicPortal() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const page = getPageFromPath(location.pathname);

  const meta = pageMeta[page];

  return (
    <div className="h-screen bg-slate-50 flex">
      <ClinicSidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(c => !c)} activeTab={page} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {page !== 'messages' && <ClinicTopBar title={meta.title} subtitle={meta.subtitle} />}
        <main className="flex-1 overflow-y-auto">
          {page === 'dashboard'    && <ClinicDashboard />}
          {page === 'doctors'      && <ClinicDoctors />}
          {page === 'appointments' && <ClinicAppointments />}
          {page === 'patients'     && <ClinicPatients />}
          {page === 'pricing'      && <ClinicPricing />}
          {page === 'analytics'    && <ClinicAnalytics />}
          {page === 'messages'     && <ClinicMessages />}
          {page === 'settings'     && <ClinicSettings />}
        </main>
      </div>
    </div>
  );
}
