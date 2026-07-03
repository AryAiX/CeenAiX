import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import ClinicSidebar from './ClinicSidebar';
import ClinicTopBar from './ClinicTopBar';
import ClinicDashboard from './ClinicDashboard';
import ClinicDoctors from './ClinicDoctors';
import ClinicAppointments from './ClinicAppointments';
import ClinicPatients from './ClinicPatients';
import ClinicPricing from './ClinicPricing';
import ClinicAnalytics from './ClinicAnalytics';
import ClinicMessages from './ClinicMessages';
import ClinicNotifications from './ClinicNotifications';
import ClinicSettings from './ClinicSettings';

type ClinicPage = 'dashboard' | 'doctors' | 'appointments' | 'patients' | 'pricing' | 'analytics' | 'messages' | 'notifications' | 'settings';

export interface ClinicPortalMeta {
  facilityName: string;
  facilityAddress: string;
  userName: string;
  userRole: string;
  pendingDoctors: number;
  todayApptCount: number;
  todayConfirmedCount: number;
  todayRevenue: number;
  unreadMessages: number;
  unreadNotifications: number;
}

const defaultMeta: ClinicPortalMeta = {
  facilityName: 'Your Clinic',
  facilityAddress: '',
  userName: 'Clinic Staff',
  userRole: 'Staff',
  pendingDoctors: 0,
  todayApptCount: 0,
  todayConfirmedCount: 0,
  todayRevenue: 0,
  unreadMessages: 0,
  unreadNotifications: 0,
};

const pageMeta: Record<ClinicPage, { title: string; subtitle: string }> = {
  dashboard:    { title: 'Dashboard',           subtitle: 'Overview of Al Noor Medical Center' },
  doctors:      { title: 'Doctors',             subtitle: 'Manage your medical staff' },
  appointments: { title: 'Appointments',        subtitle: 'Schedule and manage patient visits' },
  patients:     { title: 'Patients',            subtitle: 'Your registered patient list' },
  pricing:      { title: 'Pricing & Services',  subtitle: 'Set consultation fees and service catalog' },
  analytics:    { title: 'Analytics',           subtitle: 'Performance and revenue insights' },
  messages:     { title: 'Messages',            subtitle: 'Communication with staff and patients' },
  notifications: { title: 'Notifications',      subtitle: 'Recent activity and updates' },
  settings:     { title: 'Settings',            subtitle: 'Clinic profile and configuration' },
};

const mobileNavItems: Array<{ page: ClinicPage; label: string; href: string }> = [
  { page: 'dashboard', label: 'Dashboard', href: '/clinic/dashboard' },
  { page: 'doctors', label: 'Doctors', href: '/clinic/doctors' },
  { page: 'appointments', label: 'Appointments', href: '/clinic/appointments' },
  { page: 'patients', label: 'Patients', href: '/clinic/patients' },
  { page: 'pricing', label: 'Pricing', href: '/clinic/pricing' },
  { page: 'messages', label: 'Messages', href: '/clinic/messages' },
  { page: 'notifications', label: 'Notifications', href: '/clinic/notifications' },
  { page: 'analytics', label: 'Analytics', href: '/clinic/analytics' },
  { page: 'settings', label: 'Settings', href: '/clinic/settings' },
];

function getPageFromPath(path: string): ClinicPage {
  if (path.includes('/clinic/doctors'))      return 'doctors';
  if (path.includes('/clinic/appointments')) return 'appointments';
  if (path.includes('/clinic/patients'))     return 'patients';
  if (path.includes('/clinic/pricing'))      return 'pricing';
  if (path.includes('/clinic/analytics'))    return 'analytics';
  if (path.includes('/clinic/messages'))     return 'messages';
  if (path.includes('/clinic/notifications')) return 'notifications';
  if (path.includes('/clinic/settings'))     return 'settings';
  return 'dashboard';
}

export default function ClinicPortal() {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [portalMeta, setPortalMeta] = useState<ClinicPortalMeta>(defaultMeta);
  const location = useLocation();
  const navigate = useNavigate();
  const page = getPageFromPath(location.pathname);

  const meta = pageMeta[page];

  useEffect(() => {
    if (!user?.id) return;

    void (async () => {
      try {
        const { data: memberData } = await supabase
          .from('clinic_portal_members')
          .select('facility_id, portal_role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!memberData?.facility_id) return;
        const facilityId = memberData.facility_id;

        const { data: facilityData } = await supabase
          .from('facilities')
          .select('name, address')
          .eq('id', facilityId)
          .maybeSingle();

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: pendingStaff } = await supabase
          .from('facility_staff')
          .select('id')
          .eq('facility_id', facilityId)
          .eq('invitation_status', 'pending');

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

        const { data: todayAppts } = await supabase
          .from('appointments')
          .select('doctor_id, status')
          .eq('facility_id', facilityId)
          .gte('scheduled_at', todayStart)
          .lt('scheduled_at', todayEnd)
          .eq('is_deleted', false);

        const { data: feeData } = await supabase
          .from('facility_staff')
          .select('doctor_user_id, consultation_fee')
          .eq('facility_id', facilityId);
        const feeMap = new Map((feeData ?? []).map(s => [s.doctor_user_id, Number(s.consultation_fee) || 0]));

        const todayApptCount = todayAppts?.length ?? 0;
        const todayConfirmedCount = (todayAppts ?? []).filter(a => ['confirmed', 'completed', 'in_progress'].includes(a.status)).length;
        const todayRevenue = (todayAppts ?? [])
          .filter(a => a.status === 'completed')
          .reduce((sum, a) => sum + (feeMap.get(a.doctor_id) ?? 0), 0);

        const { data: convData } = await supabase
          .from('conversations')
          .select('id')
          .or(`created_by.eq.${user.id},participant_ids.cs.["${user.id}"]`);
        const conversationIds = (convData ?? []).map(c => c.id);

        let unreadMessages = 0;
        if (conversationIds.length > 0) {
          const { data: unreadMsgs } = await supabase
            .from('messages')
            .select('id')
            .in('conversation_id', conversationIds)
            .neq('sender_id', user.id)
            .is('read_at', null);
          unreadMessages = unreadMsgs?.length ?? 0;
        }

        const { data: unreadNotifs } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .eq('is_deleted', false);

        setPortalMeta({
          facilityName: facilityData?.name ?? 'Your Clinic',
          facilityAddress: facilityData?.address ?? '',
          userName: profileData?.full_name ?? 'Clinic Staff',
          userRole: memberData.portal_role
            ? memberData.portal_role.charAt(0).toUpperCase() + memberData.portal_role.slice(1)
            : 'Staff',
          pendingDoctors: pendingStaff?.length ?? 0,
          todayApptCount,
          todayConfirmedCount,
          todayRevenue,
          unreadMessages,
          unreadNotifications: unreadNotifs?.length ?? 0,
        });
      } catch (err) {
        console.warn('[ClinicPortal] Failed to load portal meta:', err);
      }
    })();
  }, [user?.id]);

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <div className="hidden lg:block">
        <ClinicSidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(c => !c)} activeTab={page} meta={portalMeta} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {page !== 'messages' && <ClinicTopBar title={meta.title} subtitle={meta.subtitle} meta={portalMeta} />}
        <nav className="lg:hidden flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
          {mobileNavItems.map((item) => {
            const active = page === item.page;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={`inline-flex shrink-0 items-center rounded-full px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <main className="flex-1 overflow-y-auto">
          {page === 'dashboard'    && <ClinicDashboard />}
          {page === 'doctors'      && <ClinicDoctors />}
          {page === 'appointments' && <ClinicAppointments />}
          {page === 'patients'     && <ClinicPatients />}
          {page === 'pricing'      && <ClinicPricing />}
          {page === 'analytics'    && <ClinicAnalytics />}
          {page === 'messages'     && <ClinicMessages />}
          {page === 'notifications' && <ClinicNotifications />}
          {page === 'settings'     && <ClinicSettings />}
        </main>
      </div>
    </div>
  );
}
