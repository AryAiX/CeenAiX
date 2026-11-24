import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Building2, CalendarRange, CheckCircle, Clock, Search, Settings as SettingsIcon, ShieldCheck, Stethoscope, X, XCircle } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { useDoctorSchedule, useUserProfile } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { AccountSecurityPanel } from '../../components/AccountSecurityPanel';
import { isComingSoonSection, isSettingsSection } from '../../lib/doctor-settings-sections';
import { ilikeAnyFilter } from '../../lib/postgrest-search';
import { formatLocaleDigits } from '../../lib/i18n-ui';
import { SettingsComingSoon, SettingsGeneral, SettingsHelp, SettingsLanguage } from './SettingsSections';

// QA-175: tell the clinic's staff about this doctor's clinic link (join request / accepted /
// declined). Done by a database function: a doctor can't read the clinic's staff list or create
// notifications for other people, so the old client-side version silently did nothing. Best
// effort: the doctor's own action has already succeeded, so a failed notification must not undo it.
async function notifyClinicAboutLink(staffId: string) {
  const { error } = await supabase.rpc('notify_clinic_about_doctor_link', { p_staff_id: staffId });
  if (error) {
    console.warn('Could not notify the clinic', error.message);
  }
}

// QA-179: how the doctor's current clinic link is shown. Covers every status on dev, including
// 'active' (set by the clinic invite), 'cancelled' and 'removed', which used to show nothing.
type ClinicLinkView = { badge: string; tone: string; message: string | null; canSearch: boolean };
const clinicLinkView = (status: string): ClinicLinkView => {
  switch (status) {
    case 'pending':
      return { badge: 'pendingApproval', tone: 'bg-amber-50 text-amber-700 border-amber-200', message: 'pending', canSearch: false };
    case 'accepted':
    case 'active':
      return { badge: 'approved', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', message: 'member', canSearch: false };
    case 'invited':
      return { badge: 'invited', tone: 'bg-blue-50 text-blue-700 border-blue-200', message: 'invited', canSearch: false };
    case 'rejected':
      return { badge: 'rejected', tone: 'bg-red-50 text-red-600 border-red-200', message: 'rejected', canSearch: true };
    case 'declined':
      return { badge: 'declined', tone: 'bg-slate-100 text-slate-500 border-slate-200', message: 'declined', canSearch: true };
    default:
      return { badge: 'ended', tone: 'bg-slate-100 text-slate-500 border-slate-200', message: 'ended', canSearch: true };
  }
};

// QA-176: the notification preferences shown in Settings. None of them is used by the app yet.
const NOTIFICATION_SWITCHES = ['email', 'sms', 'portal', 'autoConfirmFollowUps', 'shareCalendar'] as const;

const ComingSoonSwitchRow = ({ id, title, body, badge }: { id: string; title: string; body: string; badge: string }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-5">
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span id={`${id}-title`} className="font-bold text-slate-700">
          {title}
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">{badge}</span>
      </div>
      <p id={`${id}-body`} className="mt-1 text-sm text-slate-500">
        {body}
      </p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={false}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      disabled
      className="relative h-7 w-12 cursor-not-allowed rounded-full bg-slate-200 opacity-60"
    >
      <span className="absolute start-1 top-1 h-5 w-5 rounded-full bg-white shadow" />
    </button>
  </div>
);

// QA-178: which label to show for a clinic the doctor already has a link with.
const linkStatusLabelKey = (status: string) => {
  if (status === 'pending') return 'pending';
  if (status === 'invited') return 'invited';
  if (status === 'accepted' || status === 'active') return 'member';
  if (status === 'rejected') return 'rejected';
  if (status === 'declined') return 'declined';
  return 'unavailable';
};

export const DoctorSettings = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, doctorProfile } = useAuth();
  const { data: profile, loading } = useUserProfile();
  const { data: schedule } = useDoctorSchedule(user?.id);
  const [myClinicRecord, setMyClinicRecord] = useState<{
    id: string;
    facility_id: string;
    invitation_status: string;
    facilities: { name: string | null; name_en: string | null; city: string | null } | null;
  } | null>(null);
  const [clinicActionLoading, setClinicActionLoading] = useState(false);
  const currentLinkView = myClinicRecord ? clinicLinkView(myClinicRecord.invitation_status) : null;
  const [clinicActionError, setClinicActionError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('general');
  const [clinicSearch, setClinicSearch] = useState('');
  const [clinicResults, setClinicResults] = useState<{ id: string; name: string; city: string; type: string }[]>([]);
  const [clinicSearching, setClinicSearching] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  // QA-178: the doctor's existing link per clinic (pending, rejected, declined...), so a clinic
  // they already have a link with shows its status instead of a "Request to Join" that would fail.
  const [linkStatusByFacility, setLinkStatusByFacility] = useState<Map<string, string>>(new Map());
  const [clinicSearchError, setClinicSearchError] = useState(false);
  const latestSearchRef = useRef(0);
  const settingsSections: Array<{ key: string; label: string }> = [
    { key: 'general', label: t('doctor.settings.sections.general', { defaultValue: 'General' }) },
    { key: 'my-clinic', label: t('doctor.settings.sections.myClinic') },
    { key: 'appearance', label: t('doctor.settings.sections.appearance', { defaultValue: 'Appearance' }) },
    { key: 'notifications', label: t('doctor.settings.sections.notifications', { defaultValue: 'Notifications' }) },
    { key: 'dashboard', label: t('doctor.settings.sections.dashboard', { defaultValue: 'Dashboard' }) },
    { key: 'clinical-tools', label: t('doctor.settings.sections.clinicalTools', { defaultValue: 'Clinical Tools' }) },
    { key: 'lab-and-imaging', label: t('doctor.settings.sections.labImaging', { defaultValue: 'Lab & Imaging' }) },
    { key: 'privacy', label: t('doctor.settings.sections.privacy', { defaultValue: 'Privacy' }) },
    { key: 'security', label: t('doctor.settings.sections.security', { defaultValue: 'Security' }) },
    { key: 'language', label: t('doctor.settings.sections.language', { defaultValue: 'Language' }) },
    { key: 'integrations', label: t('doctor.settings.sections.integrations', { defaultValue: 'Integrations' }) },
    { key: 'help', label: t('doctor.settings.sections.help', { defaultValue: 'Help' }) },
  ];

  useEffect(() => {
    const section = searchParams.get('section');
    if (isSettingsSection(section)) {
      setActiveSection(section);
    }
  }, [searchParams]);

  const fetchMyClinic = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('facility_staff')
      .select('id, facility_id, invitation_status, facilities(name, name_en, city)')
      .eq('doctor_user_id', user.id)
      .order('created_at', { ascending: false });
    const links = (data ?? []) as unknown as NonNullable<typeof myClinicRecord>[];
    setMyClinicRecord(links[0] ?? null);
    setLinkStatusByFacility(new Map(links.map((link) => [link.facility_id, link.invitation_status])));
  };

  useEffect(() => {
    void fetchMyClinic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleAcceptInvite = async () => {
    if (!myClinicRecord || !user?.id) return;
    setClinicActionLoading(true);
    setClinicActionError(null);
    try {
      const { error } = await supabase.rpc('approve_doctor_and_link_appointments', {
        p_staff_id: myClinicRecord.id,
        p_facility_id: myClinicRecord.facility_id,
        p_doctor_user_id: user.id,
      });
      if (error) throw error;

      await notifyClinicAboutLink(myClinicRecord.id);

      await fetchMyClinic();
    } catch {
      setClinicActionError(t('doctor.settings.clinic.errAccept'));
    } finally {
      setClinicActionLoading(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!myClinicRecord) return;
    setClinicActionLoading(true);
    setClinicActionError(null);
    try {
      const { error } = await supabase
        .from('facility_staff')
        .update({ invitation_status: 'declined', is_active: false, is_available: false })
        .eq('id', myClinicRecord.id);
      if (error) throw error;

      await notifyClinicAboutLink(myClinicRecord.id);

      await fetchMyClinic();
    } catch {
      setClinicActionError(t('doctor.settings.clinic.errDecline'));
    } finally {
      setClinicActionLoading(false);
    }
  };

  const searchClinics = async (query: string) => {
    setClinicSearch(query);
    setClinicSearchError(false);
    // QA-178: only the newest search may update the list (older answers can arrive later).
    const searchId = latestSearchRef.current + 1;
    latestSearchRef.current = searchId;
    if (query.trim().length < 2) {
      setClinicResults([]);
      setClinicSearching(false);
      return;
    }
    setClinicSearching(true);
    const { data, error } = await supabase
      .from('facilities')
      .select('id, name, city, facility_type')
      .or(ilikeAnyFilter(['name', 'name_en'], query))
      .eq('is_active', true)
      .eq('is_deleted', false)
      .limit(6);
    if (searchId !== latestSearchRef.current) return;
    setClinicSearching(false);
    if (error) {
      setClinicResults([]);
      setClinicSearchError(true);
      return;
    }
    setClinicResults((data ?? []).map(f => ({
      id: f.id,
      name: (f.name as string | null) ?? t('doctor.settings.clinic.unnamedClinic'),
      city: (f.city as string | null) ?? t('doctor.settings.clinic.uae'),
      type: f.facility_type
        ? t(`doctor.settings.clinic.facilityTypes.${f.facility_type as string}`, { defaultValue: f.facility_type as string })
        : '',
    })));
  };

  const handleJoinRequest = async (facilityId: string) => {
    if (!user?.id) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      const { data: request, error } = await supabase
        .from('facility_staff')
        .insert({
          facility_id: facilityId,
          doctor_user_id: user.id,
          is_active: false,
          is_available: false,
          invitation_status: 'pending',
        })
        .select('id')
        .single();
      if (error) throw error;

      await notifyClinicAboutLink(request.id);

      setJoinSuccess(true);
      setClinicSearch('');
      setClinicResults([]);
      void fetchMyClinic();
    } catch {
      // QA-178: a clear message instead of the raw database error.
      setJoinError(t('doctor.settings.clinic.errJoin'));
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 p-8 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
              <SettingsIcon className="h-4 w-4" />
              {t('doctor.settings.title')}
            </div>
            <h1 className="text-3xl font-bold">{profile?.full_name ?? t('shared.doctor')}</h1>
            <p className="mt-2 text-cyan-100">{t('doctor.settings.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/doctor/profile')}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            {t('doctor.settings.actionOpenProfile')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <CalendarRange className="mb-3 h-7 w-7 text-cyan-600" />
          <div className="text-2xl font-bold text-slate-900">
            {formatLocaleDigits(schedule?.availabilities.length ?? 0, i18n.language)}
          </div>
          <div className="text-sm text-slate-500">
            {t('doctor.settings.availabilityWindows', { defaultValue: 'Availability windows' })}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <Stethoscope className="mb-3 h-7 w-7 text-blue-600" />
          <div className="text-2xl font-bold text-slate-900">{doctorProfile?.specialization ?? '—'}</div>
          <div className="text-sm text-slate-500">
            {t('doctor.settings.clinicalSpecialty', { defaultValue: 'Clinical specialty' })}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <ShieldCheck className="mb-3 h-7 w-7 text-emerald-600" />
          <div className="text-2xl font-bold text-slate-900">
            {doctorProfile?.dha_license_verified
              ? t('doctor.settings.verified', { defaultValue: 'Verified' })
              : t('doctor.settings.pending', { defaultValue: 'Pending' })}
          </div>
          <div className="text-sm text-slate-500">
            {t('doctor.settings.dhaLicense', { defaultValue: 'DHA license' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="space-y-1">
            {settingsSections.map((section) => {
              const active = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full rounded-xl px-4 py-3 text-start text-sm font-semibold transition ${
                    active ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-6">
          {activeSection === 'general' ? (
            <SettingsGeneral
              fullName={profile?.full_name ?? null}
              email={profile?.email ?? user?.email ?? null}
              memberSince={profile?.created_at ?? null}
              verified={Boolean(doctorProfile?.dha_license_verified)}
              clinicName={
                myClinicRecord && ['accepted', 'active'].includes(myClinicRecord.invitation_status)
                  ? myClinicRecord.facilities?.name_en ?? myClinicRecord.facilities?.name ?? null
                  : null
              }
            />
          ) : null}
          {activeSection === 'security' ? <AccountSecurityPanel tone="doctor" /> : null}
          {activeSection === 'language' ? <SettingsLanguage /> : null}
          {activeSection === 'help' ? <SettingsHelp /> : null}
          {isComingSoonSection(activeSection) ? <SettingsComingSoon section={activeSection} /> : null}

          {activeSection === 'my-clinic' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-cyan-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{t('doctor.settings.sections.myClinic')}</h2>
                  <p className="text-sm text-slate-500">{t('doctor.settings.clinic.subtitle')}</p>
                </div>
              </div>

              {clinicActionError && (
                <p role="alert" className="text-xs text-red-500">{clinicActionError}</p>
              )}

              {myClinicRecord ? (
                <div className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                      <Building2 size={18} className="text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 text-sm">
                        {myClinicRecord.facilities?.name_en ?? myClinicRecord.facilities?.name ?? t('doctor.settings.clinic.unnamedClinic')}
                      </div>
                      <div className="text-xs text-slate-400">{myClinicRecord.facilities?.city ?? t('doctor.settings.clinic.uae')}</div>
                    </div>
                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${currentLinkView?.tone ?? ''}`}
                      data-testid="clinic-link-badge"
                    >
                      {currentLinkView?.badge === 'pendingApproval' ? <Clock size={11} aria-hidden="true" /> : null}
                      {currentLinkView?.badge === 'approved' ? <CheckCircle size={11} aria-hidden="true" /> : null}
                      {currentLinkView?.badge === 'rejected' ? <XCircle size={11} aria-hidden="true" /> : null}
                      {currentLinkView?.badge === 'invited' ? <Building2 size={11} aria-hidden="true" /> : null}
                      {t(`doctor.settings.clinic.badge.${currentLinkView?.badge ?? 'ended'}`)}
                    </span>
                  </div>

                  {currentLinkView?.message ? (
                    <p className="text-xs text-slate-500" data-testid="clinic-link-message">
                      {t(`doctor.settings.clinic.message.${currentLinkView.message}`)}
                    </p>
                  ) : null}

                  {myClinicRecord.invitation_status === 'invited' && (
                    <>
                      <div className="flex gap-3">
                        <button
                          onClick={() => void handleDeclineInvite()}
                          disabled={clinicActionLoading}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {t('doctor.settings.clinic.decline')}
                        </button>
                        <button
                          onClick={() => void handleAcceptInvite()}
                          disabled={clinicActionLoading}
                          className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          {clinicActionLoading ? t('doctor.settings.clinic.processing') : t('doctor.settings.clinic.accept')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {(!myClinicRecord || currentLinkView?.canSearch) && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-600">{t('doctor.settings.clinic.searchTitle')}</div>
                  <div className="relative">
                    <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      type="text"
                      value={clinicSearch}
                      onChange={e => void searchClinics(e.target.value)}
                      placeholder={t('doctor.settings.clinic.searchPlaceholder')}
                      aria-label={t('doctor.settings.clinic.searchTitle')}
                      className="w-full ps-9 pe-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {clinicSearch && (
                      <button
                        type="button"
                        onClick={() => void searchClinics('')}
                        aria-label={t('doctor.settings.clinic.clearSearch')}
                        className="absolute end-3 top-1/2 -translate-y-1/2"
                      >
                        <X size={14} className="text-slate-400" />
                      </button>
                    )}
                  </div>

                  {joinError && (
                    <p role="alert" className="text-xs text-red-500">{joinError}</p>
                  )}

                  {joinSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-sm text-emerald-700 font-medium">
                      <CheckCircle size={15} aria-hidden="true" /> {t('doctor.settings.clinic.joinSent')}
                    </div>
                  )}

                  {clinicSearchError && (
                    <p role="alert" className="text-xs text-red-500">{t('doctor.settings.clinic.errSearch')}</p>
                  )}

                  {clinicSearching && (
                    <p className="text-xs text-slate-400 px-1">{t('doctor.settings.clinic.searching')}</p>
                  )}

                  {clinicResults.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {clinicResults.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-cyan-50 rounded-lg flex items-center justify-center">
                              <Building2 size={14} className="text-cyan-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                              <div className="text-xs text-slate-400">{[c.city, c.type].filter(Boolean).join(' · ')}</div>
                            </div>
                          </div>
                          {linkStatusByFacility.has(c.id) ? (
                            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600" data-testid="clinic-link-status">
                              {t(`doctor.settings.clinic.linkStatus.${linkStatusLabelKey(linkStatusByFacility.get(c.id) ?? '')}`)}
                            </span>
                          ) : (
                            <button
                              onClick={() => void handleJoinRequest(c.id)}
                              disabled={joinLoading}
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {joinLoading ? t('doctor.settings.clinic.sending') : t('doctor.settings.clinic.requestJoin')}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {clinicSearch.trim().length >= 2 && !clinicSearching && !clinicSearchError && clinicResults.length === 0 && (
                    <p className="text-xs text-slate-400 px-1">
                      {t('doctor.settings.clinic.noResults', { query: clinicSearch.trim() })}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {activeSection === 'notifications' ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Bell className="h-6 w-6 text-cyan-600" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('doctor.settings.notificationSwitches.title')}</h2>
                <p className="text-sm text-slate-500">{t('doctor.settings.notificationSwitches.intro')}</p>
              </div>
            </div>
            {/* QA-176: these preferences are not used anywhere yet (no email / SMS sending, no
                automation, booking ignores 'share calendar'), so they are shown switched off and
                disabled with a "Coming soon" label instead of looking like they work. */}
            <div className="space-y-4" data-testid="notification-switches">
              {NOTIFICATION_SWITCHES.map((key) => (
                <ComingSoonSwitchRow
                  key={key}
                  id={`notification-switch-${key}`}
                  title={t(`doctor.settings.notificationSwitches.items.${key}.title`)}
                  body={t(`doctor.settings.notificationSwitches.items.${key}.body`)}
                  badge={t('doctor.settings.comingSoon.badge')}
                />
              ))}
            </div>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
