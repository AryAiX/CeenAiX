import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Building2, CalendarRange, CheckCircle, Clock, Search, Settings as SettingsIcon, ShieldCheck, Stethoscope, X, XCircle } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { useDoctorSchedule, useUserProfile } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';

interface DoctorSettingsPrefs {
  email: boolean;
  sms: boolean;
  push: boolean;
  autoConfirmFollowUps: boolean;
  shareCalendar: boolean;
}

const DEFAULT_PREFS: DoctorSettingsPrefs = {
  email: true,
  sms: true,
  push: true,
  autoConfirmFollowUps: false,
  shareCalendar: true,
};

function normalize(value: unknown): DoctorSettingsPrefs {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return {
    email: typeof raw.email === 'boolean' ? raw.email : DEFAULT_PREFS.email,
    sms: typeof raw.sms === 'boolean' ? raw.sms : DEFAULT_PREFS.sms,
    push: typeof raw.push === 'boolean' ? raw.push : DEFAULT_PREFS.push,
    autoConfirmFollowUps: typeof raw.autoConfirmFollowUps === 'boolean' ? raw.autoConfirmFollowUps : DEFAULT_PREFS.autoConfirmFollowUps,
    shareCalendar: typeof raw.shareCalendar === 'boolean' ? raw.shareCalendar : DEFAULT_PREFS.shareCalendar,
  };
}

async function notifyClinicStaff(facilityId: string, title: string, body: string, actionUrl = '/clinic/doctors') {
  const { data: members } = await supabase
    .from('clinic_portal_members')
    .select('user_id')
    .eq('facility_id', facilityId)
    .eq('is_active', true);

  if (!members || members.length === 0) return;

  await supabase.from('notifications').insert(
    members.map((m) => ({
      user_id: m.user_id,
      type: 'system' as const,
      title,
      body,
      action_url: actionUrl,
    }))
  );
}

export const DoctorSettings = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, doctorProfile } = useAuth();
  const { data: profile, loading, refetch } = useUserProfile();
  const { data: schedule } = useDoctorSchedule(user?.id);
  const [myClinicRecord, setMyClinicRecord] = useState<{
    id: string;
    facility_id: string;
    invitation_status: string;
    facilities: { name: string | null; name_en: string | null; city: string | null } | null;
  } | null>(null);
  const [clinicActionLoading, setClinicActionLoading] = useState(false);
  const [clinicActionError, setClinicActionError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<DoctorSettingsPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('notifications');
  const [clinicSearch, setClinicSearch] = useState('');
  const [clinicResults, setClinicResults] = useState<{ id: string; name: string; city: string; type: string }[]>([]);
  const [clinicSearching, setClinicSearching] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const settingsSections: Array<{ key: string; label: string }> = [
    { key: 'general', label: t('doctor.settings.sections.general', { defaultValue: 'General' }) },
    { key: 'my-clinic', label: 'My Clinic' },
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
    if (profile) {
      setPrefs(normalize(profile.notification_preferences));
    }
  }, [profile]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);

  const fetchMyClinic = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('facility_staff')
      .select('id, facility_id, invitation_status, facilities(name, name_en, city)')
      .eq('doctor_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setMyClinicRecord(data as typeof myClinicRecord);
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

      await notifyClinicStaff(
        myClinicRecord.facility_id,
        '✅ Doctor Accepted Invitation',
        `${profile?.full_name ?? 'A doctor'} has accepted your invitation and joined your clinic.`
      );

      await fetchMyClinic();
    } catch (err) {
      setClinicActionError(err instanceof Error ? err.message : 'Failed to accept invitation.');
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

      await notifyClinicStaff(
        myClinicRecord.facility_id,
        '❌ Doctor Declined Invitation',
        `${profile?.full_name ?? 'A doctor'} has declined your invitation to join your clinic.`
      );

      await fetchMyClinic();
    } catch (err) {
      setClinicActionError(err instanceof Error ? err.message : 'Failed to decline invitation.');
    } finally {
      setClinicActionLoading(false);
    }
  };

  const searchClinics = async (query: string) => {
    setClinicSearch(query);
    if (query.length < 2) { setClinicResults([]); return; }
    setClinicSearching(true);
    const { data } = await supabase
      .from('facilities')
      .select('id, name, city, facility_type')
      .or(`name.ilike.%${query}%,name_en.ilike.%${query}%`)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .limit(6);
    setClinicResults((data ?? []).map(f => ({
      id: f.id,
      name: (f.name as string | null) ?? 'Unknown Clinic',
      city: (f.city as string | null) ?? 'UAE',
      type: (f.facility_type as string | null) ?? 'Clinic',
    })));
    setClinicSearching(false);
  };

  const handleJoinRequest = async (facilityId: string) => {
    if (!user?.id) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      const { error } = await supabase
        .from('facility_staff')
        .insert({
          facility_id: facilityId,
          doctor_user_id: user.id,
          is_active: false,
          is_available: false,
          invitation_status: 'pending',
        });
      if (error) throw error;

      await notifyClinicStaff(
        facilityId,
        '🩺 New Doctor Join Request',
        `${profile?.full_name ?? 'A doctor'} has requested to join your clinic. Review their request in Doctors.`
      );

      setJoinSuccess(true);
      setClinicSearch('');
      setClinicResults([]);
      void fetchMyClinic();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to send join request.');
    } finally {
      setJoinLoading(false);
    }
  };

  const save = async (nextPrefs: DoctorSettingsPrefs) => {
    if (!user?.id) return;
    setSaving(true);
    setSaveError(null);
    const { error: saveError } = await supabase
      .from('user_profiles')
      .update({ notification_preferences: nextPrefs })
      .eq('user_id', user.id);
    setSaving(false);
    if (saveError) {
      setSaveError(saveError.message);
      return;
    }
    refetch();
  };

  const toggle = (key: keyof DoctorSettingsPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    void save(next);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const ToggleRow = ({ prefKey, title, body }: { prefKey: keyof DoctorSettingsPrefs; title: string; body: string }) => (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div>
        <div className="font-bold text-slate-900">{title}</div>
        <p className="mt-1 text-sm text-slate-500">{body}</p>
      </div>
      <button
        type="button"
        onClick={() => toggle(prefKey)}
        className={`relative h-7 w-12 rounded-full transition ${prefs[prefKey] ? 'bg-cyan-600' : 'bg-slate-300'}`}
        aria-pressed={prefs[prefKey]}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${prefs[prefKey] ? 'start-6' : 'start-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-6">
      {saveError ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {t('doctor.settings.saveError', {
            defaultValue: 'Could not save your preferences: {{message}}',
            message: saveError,
          })}
        </div>
      ) : null}
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
          <div className="text-2xl font-bold text-slate-900">{schedule?.availabilities.length ?? 0}</div>
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
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
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
          {activeSection !== 'notifications' && activeSection !== 'my-clinic' ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              {t('doctor.settings.placeholderSection', {
                defaultValue:
                  'This section is reserved for real profile, security, device, integration, and clinical workspace settings as those tables become available. Notifications below remain fully persisted.',
              })}
            </div>
          ) : null}

          {activeSection === 'my-clinic' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-cyan-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">My Clinic</h2>
                  <p className="text-sm text-slate-500">Search and request to join a clinic</p>
                </div>
              </div>

              {clinicActionError && (
                <p className="text-xs text-red-500">{clinicActionError}</p>
              )}

              {myClinicRecord ? (
                <div className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                      <Building2 size={18} className="text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 text-sm">
                        {myClinicRecord.facilities?.name_en ?? myClinicRecord.facilities?.name ?? 'Clinic'}
                      </div>
                      <div className="text-xs text-slate-400">{myClinicRecord.facilities?.city ?? 'UAE'}</div>
                    </div>
                    {myClinicRecord.invitation_status === 'pending' && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200">
                        <Clock size={11} /> Pending Approval
                      </span>
                    )}
                    {myClinicRecord.invitation_status === 'accepted' && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                        <CheckCircle size={11} /> Approved
                      </span>
                    )}
                    {myClinicRecord.invitation_status === 'rejected' && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium border border-red-200">
                        <XCircle size={11} /> Rejected
                      </span>
                    )}
                    {myClinicRecord.invitation_status === 'invited' && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                        <Building2 size={11} /> Invitation Received
                      </span>
                    )}
                    {myClinicRecord.invitation_status === 'declined' && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium border border-slate-200">
                        Declined
                      </span>
                    )}
                  </div>

                  {myClinicRecord.invitation_status === 'pending' && (
                    <p className="text-xs text-slate-400">
                      Your request has been sent. Please wait for the clinic to approve your request.
                    </p>
                  )}
                  {myClinicRecord.invitation_status === 'accepted' && (
                    <p className="text-xs text-slate-400">
                      You are an active member of this clinic. Your appointments are linked automatically.
                    </p>
                  )}
                  {myClinicRecord.invitation_status === 'rejected' && (
                    <p className="text-xs text-slate-400">
                      Your request was rejected. You can search and request to join another clinic below.
                    </p>
                  )}
                  {myClinicRecord.invitation_status === 'declined' && (
                    <p className="text-xs text-slate-400">
                      You declined this invitation. You can search and request to join another clinic below.
                    </p>
                  )}

                  {myClinicRecord.invitation_status === 'invited' && (
                    <>
                      <p className="text-xs text-slate-500">
                        This clinic has invited you to join their staff. Accepting will link your appointments to this clinic automatically.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => void handleDeclineInvite()}
                          disabled={clinicActionLoading}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => void handleAcceptInvite()}
                          disabled={clinicActionLoading}
                          className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          {clinicActionLoading ? 'Processing…' : 'Accept Invitation'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {(!myClinicRecord || myClinicRecord.invitation_status === 'rejected' || myClinicRecord.invitation_status === 'declined') && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-600">Search for a Clinic</div>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={clinicSearch}
                      onChange={e => void searchClinics(e.target.value)}
                      placeholder="Type clinic name…"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {clinicSearch && (
                      <button onClick={() => { setClinicSearch(''); setClinicResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X size={14} className="text-slate-400" />
                      </button>
                    )}
                  </div>

                  {joinError && (
                    <p className="text-xs text-red-500">{joinError}</p>
                  )}

                  {joinSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-sm text-emerald-700 font-medium">
                      <CheckCircle size={15} /> Join request sent successfully!
                    </div>
                  )}

                  {clinicSearching && (
                    <p className="text-xs text-slate-400 px-1">Searching…</p>
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
                              <div className="text-xs text-slate-400">{c.city} · {c.type}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => void handleJoinRequest(c.id)}
                            disabled={joinLoading}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {joinLoading ? 'Sending…' : 'Request to Join'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {clinicSearch.length >= 2 && !clinicSearching && clinicResults.length === 0 && (
                    <p className="text-xs text-slate-400 px-1">No clinics found for "{clinicSearch}"</p>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {activeSection === 'notifications' ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Bell className="h-6 w-6 text-cyan-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('doctor.settings.featureNotificationsTitle')}</h2>
                <p className="text-sm text-slate-500">
                  {saving
                    ? t('doctor.settings.saving', { defaultValue: 'Saving…' })
                    : t('doctor.settings.featureNotificationsBody')}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <ToggleRow
                prefKey="email"
                title={t('doctor.settings.toggles.emailTitle', { defaultValue: 'Email notifications' })}
                body={t('doctor.settings.toggles.emailBody', {
                  defaultValue: 'Appointment, lab, and patient message updates.',
                })}
              />
              <ToggleRow
                prefKey="sms"
                title={t('doctor.settings.toggles.smsTitle', { defaultValue: 'SMS alerts' })}
                body={t('doctor.settings.toggles.smsBody', {
                  defaultValue: 'Urgent schedule changes and critical-result notifications.',
                })}
              />
              <ToggleRow
                prefKey="push"
                title={t('doctor.settings.toggles.pushTitle', { defaultValue: 'Portal notifications' })}
                body={t('doctor.settings.toggles.pushBody', {
                  defaultValue: 'In-app updates while you are using CeenAiX.',
                })}
              />
              <ToggleRow
                prefKey="autoConfirmFollowUps"
                title={t('doctor.settings.toggles.autoFollowTitle', { defaultValue: 'Auto-confirm follow-ups' })}
                body={t('doctor.settings.toggles.autoFollowBody', {
                  defaultValue: 'Reserve follow-up workflow preference for future scheduling automation.',
                })}
              />
              <ToggleRow
                prefKey="shareCalendar"
                title={t('doctor.settings.toggles.shareCalTitle', { defaultValue: 'Share calendar availability' })}
                body={t('doctor.settings.toggles.shareCalBody', {
                  defaultValue: 'Expose active availability slots to patient booking surfaces.',
                })}
              />
            </div>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
