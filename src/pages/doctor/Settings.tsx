import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarRange, Palette, Settings as SettingsIcon, ShieldCheck, Stethoscope, User } from 'lucide-react';
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

export const DoctorSettings = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user, doctorProfile } = useAuth();
  const { data: profile, loading, refetch } = useUserProfile();
  const { data: schedule } = useDoctorSchedule(user?.id);
  const [prefs, setPrefs] = useState<DoctorSettingsPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('notifications');
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [compactMode, setCompactMode] = useState(false);
  const settingsSections = [
    'General',
    'Appearance',
    'Notifications',
    'Dashboard',
    'Clinical Tools',
    'Lab & Imaging',
    'Privacy',
    'Security',
    'Language',
    'Integrations',
    'Help',
  ];

  useEffect(() => {
    if (profile) {
      setPrefs(normalize(profile.notification_preferences));
    }
  }, [profile]);

  const save = async (nextPrefs: DoctorSettingsPrefs) => {
    if (!user?.id) return;
    setSaving(true);
    await supabase.from('user_profiles').update({ notification_preferences: nextPrefs }).eq('user_id', user.id);
    setSaving(false);
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
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${prefs[prefKey] ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );

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
          <div className="text-2xl font-bold text-slate-900">{schedule?.availabilities.length ?? 0}</div>
          <div className="text-sm text-slate-500">Availability windows</div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <Stethoscope className="mb-3 h-7 w-7 text-blue-600" />
          <div className="text-2xl font-bold text-slate-900">{doctorProfile?.specialization ?? '—'}</div>
          <div className="text-sm text-slate-500">Clinical specialty</div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <ShieldCheck className="mb-3 h-7 w-7 text-emerald-600" />
          <div className="text-2xl font-bold text-slate-900">{doctorProfile?.dha_license_verified ? 'Verified' : 'Pending'}</div>
          <div className="text-sm text-slate-500">DHA license</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="space-y-1">
            {settingsSections.map((section) => {
              const key = section.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-');
              const active = activeSection === key || (section === 'Notifications' && activeSection === 'notifications');
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(key)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                    active ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {section}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-6">
          {activeSection === 'general' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <SettingsIcon className="h-6 w-6 text-cyan-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">General</h2>
                  <p className="text-sm text-slate-500">Overview of your account and quick access to your profile.</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl font-bold text-white">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'D'}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{profile?.full_name ?? 'Doctor'}</p>
                    <p className="text-sm text-slate-500">{profile?.email ?? 'No email provided'}</p>
                    <p className="text-sm text-slate-500">{doctorProfile?.specialization ?? 'No specialization set'}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">License Number</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{doctorProfile?.license_number ?? 'Not provided'}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">DHA Status</p>
                    <p className={`mt-1 text-sm font-semibold ${doctorProfile?.dha_license_verified ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {doctorProfile?.dha_license_verified ? '✅ Verified' : '⏳ Pending Verification'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{profile?.phone ?? 'Not provided'}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{profile?.address ?? 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/doctor/profile')}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
              >
                <User className="h-4 w-4" />
                Edit Full Profile
              </button>
            </div>
          ) : activeSection === 'appearance' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Palette className="h-6 w-6 text-cyan-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Appearance</h2>
                  <p className="text-sm text-slate-500">Customize how the CeenAiX portal looks for you.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">Dark Mode</p>
                    <p className="text-sm text-slate-500">Switch to a darker color scheme — coming soon.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDarkMode((prev) => !prev)}
                    className={`relative h-7 w-12 rounded-full transition ${darkMode ? 'bg-cyan-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${darkMode ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">Compact Mode</p>
                    <p className="text-sm text-slate-500">Reduce spacing and padding for a denser layout.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompactMode((prev) => !prev)}
                    className={`relative h-7 w-12 rounded-full transition ${compactMode ? 'bg-cyan-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${compactMode ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900 mb-3">Font Size</p>
                  <div className="flex gap-3">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setFontSize(size)}
                        className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize transition ${
                          fontSize === size
                            ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                ⚠️ Appearance settings are UI preferences only and will be saved to your browser locally. Full theme support coming soon.
              </div>
            </div>
          ) : activeSection !== 'notifications' ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              This section is reserved for real profile, security, device, integration, and clinical workspace settings as those tables become available. Notifications below remain fully persisted.
            </div>
          ) : null}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Bell className="h-6 w-6 text-cyan-600" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('doctor.settings.featureNotificationsTitle')}</h2>
                <p className="text-sm text-slate-500">{saving ? 'Saving...' : t('doctor.settings.featureNotificationsBody')}</p>
              </div>
            </div>
            <div className="space-y-4">
              <ToggleRow prefKey="email" title="Email notifications" body="Appointment, lab, and patient message updates." />
              <ToggleRow prefKey="sms" title="SMS alerts" body="Urgent schedule changes and critical-result notifications." />
              <ToggleRow prefKey="push" title="Portal notifications" body="In-app updates while you are using CeenAiX." />
              <ToggleRow prefKey="autoConfirmFollowUps" title="Auto-confirm follow-ups" body="Reserve follow-up workflow preference for future scheduling automation." />
              <ToggleRow prefKey="shareCalendar" title="Share calendar availability" body="Expose active availability slots to patient booking surfaces." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
