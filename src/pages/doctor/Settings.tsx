import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarRange, HelpCircle, LayoutDashboard, Palette, Plug, Settings as SettingsIcon, ShieldCheck, Stethoscope, TestTube2, User } from 'lucide-react';
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
          ) : activeSection === 'dashboard' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <LayoutDashboard className="h-6 w-6 text-cyan-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Dashboard</h2>
                  <p className="text-sm text-slate-500">Choose which widgets appear on your dashboard.</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'showRevenue', label: 'Revenue Widget', description: 'Show estimated revenue and consultation fee stats.' },
                  { key: 'showAppointments', label: 'Appointments Widget', description: 'Show today and weekly appointment counts.' },
                  { key: 'showLabResults', label: 'Lab Results Widget', description: 'Show critical and recent lab results.' },
                  { key: 'showMessages', label: 'Messages Widget', description: 'Show recent unread patient messages.' },
                  { key: 'showPendingReviews', label: 'Pending Reviews Widget', description: 'Show pending pre-visit assessments and notes.' },
                  { key: 'showPatientQueue', label: 'Patient Queue Widget', description: 'Show today patient queue and schedule.' },
                ].map((widget) => (
                  <div key={widget.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{widget.label}</p>
                      <p className="text-sm text-slate-500">{widget.description}</p>
                    </div>
                    <button
                      type="button"
                      className="relative h-7 w-12 rounded-full bg-cyan-600 transition"
                      aria-pressed={true}
                    >
                      <span className="absolute left-6 top-1 h-5 w-5 rounded-full bg-white shadow transition" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                ⚠️ Dashboard widget preferences will be saved to your browser locally. Full persistence coming soon.
              </div>
            </div>
          ) : activeSection === 'privacy' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="h-6 w-6 text-cyan-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Privacy</h2>
                  <p className="text-sm text-slate-500">Control your profile visibility and data sharing preferences.</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Show profile to patients', description: 'Allow patients to view your public profile when booking appointments.' },
                  { label: 'Show availability to patients', description: 'Allow patients to see your available time slots for booking.' },
                  { label: 'Share anonymized data for research', description: 'Allow CeenAiX to use anonymized clinical data to improve AI features.' },
                  { label: 'Allow patient feedback and ratings', description: 'Let patients leave ratings and reviews after consultations.' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      className="relative h-7 w-12 rounded-full bg-cyan-600 transition"
                      aria-pressed={true}
                    >
                      <span className="absolute left-6 top-1 h-5 w-5 rounded-full bg-white shadow transition" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900">Data & Privacy</p>
                <p className="text-sm text-slate-500">Your patient data is stored securely in compliance with UAE PDPL and HIPAA standards. CeenAiX never sells your data to third parties.</p>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
                >
                  Read our Privacy Policy →
                </a>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                ⚠️ Privacy preferences will be saved to your browser locally. Full persistence coming soon.
              </div>
            </div>
          ) : activeSection === 'security' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="h-6 w-6 text-cyan-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Security</h2>
                  <p className="text-sm text-slate-500">Manage your account security and authentication settings.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Password</p>
                      <p className="text-sm text-slate-500">Last changed: Not available</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/doctor/profile')}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Change Password
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Two-Factor Authentication</p>
                      <p className="text-sm text-slate-500">Add an extra layer of security to your account.</p>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Coming Soon
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Active Sessions</p>
                      <p className="text-sm text-slate-500">Manage devices currently logged in to your account.</p>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Coming Soon
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Login History</p>
                      <p className="text-sm text-slate-500">View recent login activity on your account.</p>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-700 mb-1">Danger Zone</p>
                <p className="text-sm text-red-600 mb-3">These actions are irreversible. Please proceed with caution.</p>
                <button
                  type="button"
                  className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Deactivate Account
                </button>
              </div>
            </div>
          ) : activeSection === 'lab-and-imaging' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <TestTube2 className="h-6 w-6 text-cyan-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Lab & Imaging</h2>
                  <p className="text-sm text-slate-500">Configure your preferred lab and imaging providers and default settings.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-3">Preferred Lab Provider</p>
                  <select className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20">
                    <option value="">Select a lab provider</option>
                    <option value="aster">Aster Laboratories</option>
                    <option value="nmc">NMC Healthcare Labs</option>
                    <option value="burjeel">Burjeel Medical Labs</option>
                    <option value="mediclinic">Mediclinic Labs</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-3">Preferred Imaging Center</p>
                  <select className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20">
                    <option value="">Select an imaging center</option>
                    <option value="aster">Aster Radiology</option>
                    <option value="nmc">NMC Radiology</option>
                    <option value="burjeel">Burjeel Imaging</option>
                    <option value="mediclinic">Mediclinic Radiology</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Auto-notify patient when lab results are ready', description: 'Send an automatic notification to the patient when their lab results are available.' },
                    { label: 'Flag abnormal results automatically', description: 'Automatically highlight abnormal lab results in red on the dashboard.' },
                    { label: 'Require confirmation before ordering imaging', description: 'Show a confirmation dialog before submitting imaging orders.' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.description}</p>
                      </div>
                      <button
                        type="button"
                        className="relative h-7 w-12 rounded-full bg-cyan-600 transition"
                        aria-pressed={true}
                      >
                        <span className="absolute left-6 top-1 h-5 w-5 rounded-full bg-white shadow transition" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                ⚠️ Lab and imaging preferences will be saved locally. Full persistence coming soon.
              </div>
            </div>
          ) : activeSection === 'integrations' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Plug className="h-6 w-6 text-cyan-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Integrations</h2>
                  <p className="text-sm text-slate-500">Connect CeenAiX with your favorite tools and services.</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Google Calendar', description: 'Sync your appointments with Google Calendar automatically.', icon: '📅', status: 'coming_soon' },
                  { name: 'Apple Calendar', description: 'Sync your appointments with Apple Calendar on your devices.', icon: '🍎', status: 'coming_soon' },
                  { name: 'Microsoft Outlook', description: 'Connect your Outlook calendar and email for appointment sync.', icon: '📧', status: 'coming_soon' },
                  { name: 'Zoom', description: 'Launch Zoom meetings directly from teleconsultation appointments.', icon: '🎥', status: 'coming_soon' },
                  { name: 'WhatsApp Business', description: 'Send appointment reminders and notifications via WhatsApp.', icon: '💬', status: 'coming_soon' },
                  { name: 'DHA ePrescription', description: 'Submit prescriptions directly to the DHA ePrescription system.', icon: '💊', status: 'coming_soon' },
                ].map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <p className="font-semibold text-slate-900">{integration.name}</p>
                        <p className="text-sm text-slate-500">{integration.description}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 whitespace-nowrap">
                      Coming Soon
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900 mb-1">Need a custom integration?</p>
                <p className="text-sm text-slate-500">Contact our team to discuss custom EMR or HIS integrations for your clinic.</p>
                <a href="mailto:support@ceenaix.com" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 hover:text-cyan-700">
                  Contact Support →
                </a>
              </div>
            </div>
          ) : activeSection === 'help' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <HelpCircle className="h-6 w-6 text-cyan-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Help & Support</h2>
                  <p className="text-sm text-slate-500">Find answers, contact support or report an issue.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: '📖', title: 'User Guide', description: 'Step by step guides for using CeenAiX as a doctor.', link: '#' },
                  { icon: '❓', title: 'FAQ', description: 'Answers to the most commonly asked questions.', link: '#' },
                  { icon: '🎥', title: 'Video Tutorials', description: 'Watch short videos covering key features.', link: '#' },
                ].map((resource) => (
                  <a
                    key={resource.title}
                    href={resource.link}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/40"
                  >
                    <span className="text-2xl">{resource.icon}</span>
                    <p className="font-semibold text-slate-900">{resource.title}</p>
                    <p className="text-sm text-slate-500">{resource.description}</p>
                  </a>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                <p className="font-semibold text-slate-900">Contact Support</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <a
                    href="mailto:support@ceenaix.com"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-cyan-300"
                  >
                    <span className="text-xl">📧</span>
                    <div>
                      <p className="font-semibold text-slate-900">Email Support</p>
                      <p className="text-sm text-slate-500">support@ceenaix.com</p>
                    </div>
                  </a>
                  <a
                    href="https://wa.me/971000000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-cyan-300"
                  >
                    <span className="text-xl">💬</span>
                    <div>
                      <p className="font-semibold text-slate-900">WhatsApp Support</p>
                      <p className="text-sm text-slate-500">Chat with our team</p>
                    </div>
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <p className="font-semibold text-slate-900">Report a Bug</p>
                <textarea
                  rows={3}
                  placeholder="Describe the issue you encountered..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none"
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  Submit Report
                </button>
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
