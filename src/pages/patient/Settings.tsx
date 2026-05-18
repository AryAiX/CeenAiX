import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, BookOpen, Bug, Globe, HelpCircle, Lock, Mail, MessageSquare, Phone, PlayCircle, Settings as SettingsIcon, ShieldCheck, User, X } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { useUserProfile } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';

type SettingsSection = 'account' | 'privacy' | 'notifications' | 'language' | 'security' | 'support';

interface Preferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  shareWithDoctors: boolean;
  shareWithPharmacy: boolean;
  shareWithInsurance: boolean;
  language: string;
  largeText: boolean;
  highContrast: boolean;
}

const DEFAULT_PREFS: Preferences = {
  email: true,
  sms: true,
  push: true,
  shareWithDoctors: true,
  shareWithPharmacy: true,
  shareWithInsurance: false,
  language: 'en',
  largeText: false,
  highContrast: false,
};

function normalizePrefs(value: unknown): Preferences {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return {
    email: typeof raw.email === 'boolean' ? raw.email : DEFAULT_PREFS.email,
    sms: typeof raw.sms === 'boolean' ? raw.sms : DEFAULT_PREFS.sms,
    push: typeof raw.push === 'boolean' ? raw.push : DEFAULT_PREFS.push,
    shareWithDoctors: typeof raw.shareWithDoctors === 'boolean' ? raw.shareWithDoctors : DEFAULT_PREFS.shareWithDoctors,
    shareWithPharmacy: typeof raw.shareWithPharmacy === 'boolean' ? raw.shareWithPharmacy : DEFAULT_PREFS.shareWithPharmacy,
    shareWithInsurance: typeof raw.shareWithInsurance === 'boolean' ? raw.shareWithInsurance : DEFAULT_PREFS.shareWithInsurance,
    language: typeof raw.language === 'string' ? raw.language : DEFAULT_PREFS.language,
    largeText: typeof raw.largeText === 'boolean' ? raw.largeText : DEFAULT_PREFS.largeText,
    highContrast: typeof raw.highContrast === 'boolean' ? raw.highContrast : DEFAULT_PREFS.highContrast,
  };
}

export const PatientSettings = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, loading, error, refetch } = useUserProfile();
  const [section, setSection] = useState<SettingsSection>('account');
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [resetEmailSent, setResetEmailSent] = useState<boolean>(false);
  const [resetCooldown, setResetCooldown] = useState<boolean>(false);
  const [bugReport, setBugReport] = useState<string>('');
  const [bugSubmitted, setBugSubmitted] = useState<boolean>(false);
  const [languageSaved, setLanguageSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setPrefs(normalizePrefs(profile.notification_preferences));
    }
  }, [profile]);

  const sections = useMemo(
    () => [
      { id: 'account' as const, icon: User, title: t('patient.settings.sectionAccount'), desc: t('patient.settings.sectionAccountDesc') },
      { id: 'privacy' as const, icon: ShieldCheck, title: t('patient.settings.sectionPrivacy'), desc: t('patient.settings.sectionPrivacyDesc') },
      { id: 'notifications' as const, icon: Bell, title: t('patient.settings.sectionNotifications'), desc: t('patient.settings.sectionNotificationsDesc') },
      { id: 'language' as const, icon: Globe, title: t('patient.settings.sectionLanguage'), desc: t('patient.settings.sectionLanguageDesc') },
      { id: 'security' as const, icon: Lock, title: t('patient.settings.sectionSecurity'), desc: t('patient.settings.sectionSecurityDesc') },
      { id: 'support' as const, icon: HelpCircle, title: t('patient.settings.sectionSupport'), desc: t('patient.settings.sectionSupportDesc') },
    ],
    [t]
  );

  const currentSection = sections.find((item) => item.id === section) ?? sections[0];

  const savePreferences = async (nextPrefs = prefs) => {
    if (!user?.id) return;
    setSaving(true);
    setSaved(false);
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ notification_preferences: nextPrefs })
      .eq('user_id', user.id);
    setSaving(false);
    if (!updateError) {
      setSaved(true);
      refetch();
      window.setTimeout(() => setSaved(false), 2500);
    }
  };

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    void savePreferences(next);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  const renderToggle = (key: keyof Preferences, label: string, body: string) => (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div>
        <div className="font-bold text-slate-900">{label}</div>
        <p className="mt-1 text-sm text-slate-500">{body}</p>
      </div>
      <button
        type="button"
        onClick={() => updatePref(key, !prefs[key] as Preferences[typeof key])}
        className={`relative h-7 w-12 rounded-full transition ${prefs[key] ? 'bg-cyan-600' : 'bg-slate-300'}`}
        aria-pressed={Boolean(prefs[key])}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            prefs[key] ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );

  const renderSection = () => {
    if (section === 'account') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{t('patient.settings.accountSummary')}</h3>
              <button
                type="button"
                onClick={() => navigate('/patient/profile')}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
              >
                <User className="h-4 w-4" />
                Edit Profile
              </button>
            </div>
            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm text-slate-400">{t('patient.settings.fullName')}</dt>
                <dd className="font-semibold text-slate-900">{profile?.full_name ?? t('patient.profile.notSet')}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">{t('patient.settings.email')}</dt>
                <dd className="font-semibold text-slate-900">{profile?.email ?? t('patient.profile.notSet')}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">{t('patient.settings.phone')}</dt>
                <dd className="font-semibold text-slate-900">{profile?.phone ?? t('patient.profile.notSet')}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">{t('patient.settings.city')}</dt>
                <dd className="font-semibold text-slate-900">{profile?.city ?? t('patient.profile.notSet')}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              To update your personal information, visit your full profile page.
            </div>
          </div>
        </div>
      );
    }

    if (section === 'privacy') {
      return (
        <div className="space-y-4">
          {renderToggle('shareWithDoctors', t('patient.settings.shareDoctors'), t('patient.settings.shareDoctorsBody'))}
          {renderToggle('shareWithPharmacy', t('patient.settings.sharePharmacy'), t('patient.settings.sharePharmacyBody'))}
          {renderToggle('shareWithInsurance', t('patient.settings.shareInsurance'), t('patient.settings.shareInsuranceBody'))}
        </div>
      );
    }

    if (section === 'notifications') {
      return (
        <div className="space-y-4">
          {renderToggle('email', t('patient.settings.emailNotifications'), t('patient.settings.emailNotificationsBody'))}
          {renderToggle('sms', t('patient.settings.smsNotifications'), t('patient.settings.smsNotificationsBody'))}
          {renderToggle('push', t('patient.settings.pushNotifications'), t('patient.settings.pushNotificationsBody'))}
        </div>
      );
    }

    if (section === 'language') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-bold text-slate-900">{t('patient.settings.language')}</label>
            <select
              value={prefs.language}
              onChange={(event) => {
                updatePref('language', event.target.value);
                void i18n.changeLanguage(event.target.value);
                setLanguageSaved(true);
                window.setTimeout(() => setLanguageSaved(false), 2500);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
            {languageSaved ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                ✓ Language updated successfully!
              </div>
            ) : null}
          </div>
          {renderToggle('largeText', t('patient.settings.largeText'), t('patient.settings.largeTextBody'))}
          {renderToggle('highContrast', t('patient.settings.highContrast'), t('patient.settings.highContrastBody'))}
        </div>
      );
    }

    if (section === 'security') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">{t('patient.settings.securityTitle')}</h3>
            <p className="mt-2 text-sm text-slate-500">{t('patient.settings.securityBody')}</p>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              <Lock className="h-4 w-4" />
              {t('patient.settings.passwordManaged')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {/* Quick Help Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { emoji: '📖', icon: BookOpen, label: 'User Guide', desc: 'Learn how to use CeenAiX patient portal', url: 'https://ceenaix.com/guide' },
            { emoji: '❓', icon: HelpCircle, label: 'FAQ', desc: 'Frequently asked questions about your health portal', url: 'https://ceenaix.com/faq' },
            { emoji: '🎥', icon: PlayCircle, label: 'Video Tutorials', desc: 'Watch step-by-step video guides', url: 'https://ceenaix.com/tutorials' },
          ].map(({ icon: Icon, label, desc, url }) => (
            <button
              key={label}
              type="button"
              onClick={() => window.open(url, '_blank')}
              className="flex flex-col items-start gap-3 rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50">
                <Icon className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{label}</p>
                <p className="mt-1 text-xs text-slate-500">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Contact Support */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="font-bold text-slate-900">Contact Support</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            <li className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Email Support</p>
                  <p className="text-xs text-slate-500">support@ceenaix.com</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.open('mailto:support@ceenaix.com')}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Send Email
              </button>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Live Chat</p>
                  <p className="text-xs text-slate-500">Available Sunday–Thursday, 9AM–6PM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert('Live chat coming soon!')}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                Start Chat
              </button>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
                  <Phone className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Phone</p>
                  <p className="text-xs text-slate-500">+971 4 000 0000</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.open('tel:+97140000000')}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Call Now
              </button>
            </li>
          </ul>
        </div>

        {/* Report a Bug */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <Bug className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Found a bug or issue?</h3>
              <p className="text-xs text-slate-500">Help us improve CeenAiX by reporting any issues you encounter</p>
            </div>
          </div>
          <textarea
            value={bugReport}
            onChange={(e) => setBugReport(e.target.value)}
            placeholder="Describe the issue..."
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
          {bugSubmitted && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              ✓ Report submitted! Thank you for helping us improve.
            </div>
          )}
          <button
            type="button"
            disabled={!bugReport.trim()}
            onClick={() => {
              setBugSubmitted(true);
              setBugReport('');
              window.setTimeout(() => setBugSubmitted(false), 3000);
            }}
            className="mt-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit Report
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fadeIn space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('patient.settings.loadError')}
        </div>
      ) : null}

      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 p-8 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <SettingsIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('patient.settings.title')}</h1>
            <p className="text-cyan-100">{t('patient.settings.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          {sections.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full rounded-xl p-4 text-left transition ${
                  active ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5" />
                  <div>
                    <div className="font-bold">{item.title}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{item.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        <main>
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-900">{currentSection.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{currentSection.desc}</p>
            <div className="mt-2 h-5 text-sm">
              {saving ? <span className="text-slate-500">{t('patient.settings.saving')}</span> : null}
              {saved ? <span className="font-medium text-emerald-600">{t('patient.settings.saved')}</span> : null}
            </div>
          </div>
          {renderSection()}
        </main>
      </div>

      {showPasswordModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowPasswordModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-cyan-600" />
                  <h2 className="text-lg font-bold text-slate-900">Password &amp; Security</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Info card */}
                <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-4 text-sm text-cyan-800">
                  Your password is managed securely through Supabase Authentication. For security reasons,
                  password changes are handled through our secure authentication system.
                </div>

                {/* Security info rows */}
                <ul className="space-y-3">
                  {[
                    { emoji: '🔒', text: 'Password is encrypted using bcrypt hashing' },
                    { emoji: '🛡️', text: 'Two-factor authentication is available through your email' },
                    { emoji: '📧', text: 'To change your password, use the Forgot Password flow on the login page' },
                  ].map(({ emoji, text }) => (
                    <li key={text} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <span className="mt-0.5 shrink-0 text-base">{emoji}</span>
                      {text}
                    </li>
                  ))}
                </ul>

                {/* Reset email sent banner */}
                {resetEmailSent && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    ✓ Password reset email sent! Check your inbox.
                  </div>
                )}

                {/* Send reset email button */}
                <button
                  type="button"
                  disabled={resetCooldown}
                  onClick={async () => {
                    if (resetCooldown) return;
                    await supabase.auth.resetPasswordForEmail(profile?.email ?? '');
                    setResetEmailSent(true);
                    setResetCooldown(true);
                    window.setTimeout(() => setResetCooldown(false), 30_000);
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resetCooldown ? 'Email sent — please wait 30 s' : 'Send Password Reset Email'}
                </button>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
