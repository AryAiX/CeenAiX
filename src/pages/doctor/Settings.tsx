import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarRange, Settings as SettingsIcon, ShieldCheck, Stethoscope } from 'lucide-react';
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
  const settingsSections: Array<{ key: string; label: string }> = [
    { key: 'general', label: t('doctor.settings.sections.general', { defaultValue: 'General' }) },
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
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${prefs[prefKey] ? 'start-6' : 'start-1'}`} />
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
          {activeSection !== 'notifications' ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              {t('doctor.settings.placeholderSection', {
                defaultValue:
                  'This section is reserved for real profile, security, device, integration, and clinical workspace settings as those tables become available. Notifications below remain fully persisted.',
              })}
            </div>
          ) : null}

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
        </div>
      </div>
    </div>
  );
};
