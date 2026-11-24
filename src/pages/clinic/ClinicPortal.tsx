import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { countUnreadMessages, countUnreadNotifications } from '../../lib/clinic-unread-messages';
import { loadClinicTodayStats } from '../../lib/clinic-dashboard';
import { MESSAGES_READ_EVENT, NOTIFICATIONS_CHANGED_EVENT } from '../../lib/notification-events';
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
  /** QA-238: CeenAiX has recorded the clinic as DHA licensed (facilities.dha_status = 'licensed') */
  dhaLicensed: boolean;
  userName: string;
  /** QA-240: the stored portal role (clinic_admin, …); the top bar shows it translated */
  userRole: string | null;
  pendingDoctors: number;
  todayApptCount: number;
  todayConfirmedCount: number;
  /** QA-239: estimated fees of today's completed visits; null when no fee is set */
  todayFees: number | null;
  unreadMessages: number;
  unreadNotifications: number;
}

const defaultMeta: ClinicPortalMeta = {
  facilityName: 'Your Clinic',
  facilityAddress: '',
  dhaLicensed: false,
  userName: 'Clinic Staff',
  userRole: null,
  pendingDoctors: 0,
  todayApptCount: 0,
  todayConfirmedCount: 0,
  todayFees: null,
  unreadMessages: 0,
  unreadNotifications: 0,
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
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const page = getPageFromPath(location.pathname);
  const { t } = useTranslation();

  // QA-238: titles and subtitles in the UI language; the Dashboard subtitle used to name
  // "Al Noor Medical Center" for every clinic
  const meta = {
    title: t(`clinic.portalPage.titles.${page}`),
    subtitle: t(`clinic.portalPage.subtitles.${page}`, { name: portalMeta.facilityName }),
  };

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
        setFacilityId(facilityId);

        const { data: facilityData } = await supabase
          .from('facilities')
          .select('name, address, dha_status')
          .eq('id', facilityId)
          .maybeSingle();

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        setPortalMeta(previous => ({
          ...previous,
          facilityName: facilityData?.name ?? 'Your Clinic',
          facilityAddress: facilityData?.address ?? '',
          // only CeenAiX can set dha_status (QA-230); nothing else means "licensed"
          dhaLicensed: (facilityData?.dha_status ?? '').trim().toLowerCase() === 'licensed',
          userName: profileData?.full_name ?? 'Clinic Staff',
          userRole: memberData.portal_role ?? null,
          // QA-220 / QA-224 / QA-239: counts are kept up to date by the effect below
        }));
      } catch (err) {
        console.warn('[ClinicPortal] Failed to load portal meta:', err);
      }
    })();
  }, [user?.id]);

  // QA-220 / QA-224 / QA-239: the badges and the sidebar's "TODAY" numbers used to be counted once at
  // login. They now reload when you move to another page, when messages are marked as read, and when
  // notifications change (marked read, all read, dismissed).
  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let cancelled = false;
    const refresh = () => {
      countUnreadMessages(supabase, userId)
        .then(count => {
          if (!cancelled) setPortalMeta(previous => ({ ...previous, unreadMessages: count }));
        })
        .catch(err => console.warn('[ClinicPortal] Failed to count unread messages:', err));
      countUnreadNotifications(supabase, userId)
        .then(count => {
          if (!cancelled) setPortalMeta(previous => ({ ...previous, unreadNotifications: count }));
        })
        .catch(err => console.warn('[ClinicPortal] Failed to count unread notifications:', err));
      if (facilityId) {
        loadClinicTodayStats(supabase, facilityId)
          .then(stats => {
            if (!cancelled) setPortalMeta(previous => ({ ...previous, ...stats }));
          })
          .catch(err => console.warn("[ClinicPortal] Failed to count today's visits:", err));
      }
    };
    refresh();
    window.addEventListener(MESSAGES_READ_EVENT, refresh);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(MESSAGES_READ_EVENT, refresh);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    };
  }, [user?.id, facilityId, location.pathname]);

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
