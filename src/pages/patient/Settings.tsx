import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, Globe, HelpCircle, Lock, Pencil, Settings as SettingsIcon, ShieldCheck, User } from 'lucide-react';
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
  const { user, requestPasswordReset } = useAuth();
  const { data: profile, loading, error, refetch } = useUserProfile();
  const [section, setSection] = useState<SettingsSection>('account');
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimeoutRef = useRef<number | null>(null);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState<
    { kind: 'success' | 'error'; text: string } | null
  >(null);
  const [supportModal, setSupportModal] = useState<'email' | 'whatsapp' | 'bug' | 'help' | null>(null);

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

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  const savePreferences = async (nextPrefs = prefs) => {
    if (!user?.id) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ notification_preferences: nextPrefs })
      .eq('user_id', user.id);
    setSaving(false);
    if (updateError) {
      setSaveError(updateError.message);
      return;
    }
    setSaved(true);
    refetch();
    if (savedTimeoutRef.current !== null) {
      window.clearTimeout(savedTimeoutRef.current);
    }
    savedTimeoutRef.current = window.setTimeout(() => {
      setSaved(false);
      savedTimeoutRef.current = null;
    }, 2500);
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
            prefs[key] ? 'start-6' : 'start-1'
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
            <h3 className="mb-4 text-lg font-bold text-slate-900">{t('patient.settings.accountSummary')}</h3>
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
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/patient/profile')}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </button>
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
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          {renderToggle('largeText', t('patient.settings.largeText'), t('patient.settings.largeTextBody'))}
          {renderToggle('highContrast', t('patient.settings.highContrast'), t('patient.settings.highContrastBody'))}
        </div>
      );
    }

    if (section === 'security') {
      const accountEmail = (profile?.email ?? user?.email ?? '').trim();
      const handleSendReset = async () => {
        if (!accountEmail) {
          setPasswordResetMessage({
            kind: 'error',
            text: t('patient.settings.passwordResetMissingEmail', {
              defaultValue: 'Add an email to your profile before requesting a password reset.',
            }),
          });
          return;
        }
        setPasswordResetMessage(null);
        setSendingPasswordReset(true);
        const { error: resetError } = await requestPasswordReset(accountEmail);
        setSendingPasswordReset(false);
        if (resetError) {
          setPasswordResetMessage({ kind: 'error', text: resetError.message });
          return;
        }
        setPasswordResetMessage({
          kind: 'success',
          text: t('patient.settings.passwordResetSent', {
            defaultValue: 'We just emailed a password reset link to {{email}}.',
            email: accountEmail,
          }),
        });
      };

      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">{t('patient.settings.securityTitle')}</h3>
            <p className="mt-2 text-sm text-slate-500">{t('patient.settings.securityBody')}</p>
            <button
              type="button"
              onClick={() => void handleSendReset()}
              disabled={sendingPasswordReset}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendingPasswordReset
                ? t('patient.settings.passwordResetSending', {
                    defaultValue: 'Sending reset link…',
                  })
                : t('patient.settings.passwordResetCta', {
                    defaultValue: 'Email me a password reset link',
                  })}
            </button>
            {passwordResetMessage ? (
              <p
                role="alert"
                className={`mt-3 text-sm ${
                  passwordResetMessage.kind === 'error' ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {passwordResetMessage.text}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-slate-400">{t('patient.settings.passwordManaged')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900">{t('patient.settings.supportTitle')}</h3>
          <p className="text-sm text-slate-500">{t('patient.settings.supportBody')}</p>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setSupportModal('email')}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-xl">✉️</div>
              <div>
                <div className="font-bold text-slate-900">Email Support</div>
                <div className="text-xs text-slate-500">support@ceenaix.com</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSupportModal('whatsapp')}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">💬</div>
              <div>
                <div className="font-bold text-slate-900">WhatsApp Support</div>
                <div className="text-xs text-slate-500">Available 9AM – 6PM GST</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSupportModal('bug')}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-red-200 hover:bg-red-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-xl">🐛</div>
              <div>
                <div className="font-bold text-slate-900">Report a Bug</div>
                <div className="text-xs text-slate-500">Help us improve CeenAiX</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSupportModal('help')}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl">📖</div>
              <div>
                <div className="font-bold text-slate-900">Help Center</div>
                <div className="text-xs text-slate-500">Browse FAQs and guides</div>
              </div>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">App Information</h3>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Version</span>
              <span className="font-semibold text-slate-900">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Platform</span>
              <span className="font-semibold text-slate-900">CeenAiX Health Platform</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Region</span>
              <span className="font-semibold text-slate-900">UAE 🇦🇪</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="animate-fadeIn space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
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
              {saveError ? (
                <span className="font-medium text-rose-600" role="alert">
                  {saveError}
                </span>
              ) : null}
              {saved ? <span className="font-medium text-emerald-600">{t('patient.settings.saved')}</span> : null}
            </div>
          </div>
          {renderSection()}
        </main>
      </div>
    </div>
    {supportModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSupportModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {supportModal === 'email' ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-xl">✉️</div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Email Support</h2>
                      <p className="text-xs text-slate-500">We typically reply within 24 hours</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSupportModal(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Email</span>
                      <span className="font-bold text-slate-900">support@ceenaix.com</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Response Time</span>
                      <span className="font-bold text-slate-900">Within 24 hours</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Hours</span>
                      <span className="font-bold text-slate-900">Sunday – Thursday</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">Include your account email and a description of your issue for faster resolution.</p>
                </div>
                <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
                  <button type="button" onClick={() => setSupportModal(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <a
                    href={`mailto:support@ceenaix.com?subject=Support Request — ${profile?.email ?? ''}&body=Hi CeenAiX Support,%0D%0A%0D%0AAccount: ${profile?.email ?? ''}%0D%0A%0D%0AIssue description:%0D%0A`}
                    className="flex-1 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white text-center transition hover:bg-cyan-700"
                    onClick={() => setSupportModal(null)}
                  >
                    Open Email
                  </a>
                </div>
              </>
            ) : supportModal === 'whatsapp' ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">💬</div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">WhatsApp Support</h2>
                      <p className="text-xs text-slate-500">Chat with our support team</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSupportModal(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">WhatsApp Number</span>
                      <span className="font-bold text-slate-900">+971 50 000 0000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Available</span>
                      <span className="font-bold text-slate-900">9AM – 6PM GST</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Days</span>
                      <span className="font-bold text-slate-900">Sunday – Thursday</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">Our support team will respond to your message during working hours.</p>
                </div>
                <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
                  <button type="button" onClick={() => setSupportModal(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <a
                    href="https://wa.me/971500000000?text=Hi%20CeenAiX%20Support%2C%20I%20need%20help%20with%20my%20account."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white text-center transition hover:bg-emerald-700"
                    onClick={() => setSupportModal(null)}
                  >
                    Open WhatsApp
                  </a>
                </div>
              </>
            ) : supportModal === 'bug' ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-xl">🐛</div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Report a Bug</h2>
                      <p className="text-xs text-slate-500">Help us improve CeenAiX</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSupportModal(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="rounded-xl bg-red-50 border border-red-100 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Report To</span>
                      <span className="font-bold text-slate-900">bugs@ceenaix.com</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Response Time</span>
                      <span className="font-bold text-slate-900">Within 48 hours</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">Please include steps to reproduce the bug, which page it occurred on, and any screenshots if possible.</p>
                </div>
                <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
                  <button type="button" onClick={() => setSupportModal(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <a
                    href={`mailto:bugs@ceenaix.com?subject=Bug Report — CeenAiX Patient Portal&body=Account: ${profile?.email ?? ''}%0D%0A%0D%0APage where bug occurred:%0D%0A%0D%0ASteps to reproduce:%0D%0A1. %0D%0A2. %0D%0A3. %0D%0A%0D%0AExpected behavior:%0D%0A%0D%0AActual behavior:%0D%0A`}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white text-center transition hover:bg-red-700"
                    onClick={() => setSupportModal(null)}
                  >
                    Send Bug Report
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl">📖</div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Help Center</h2>
                      <p className="text-xs text-slate-500">Browse FAQs and guides</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSupportModal(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {[
                    { q: 'How do I book an appointment?', a: 'Go to Appointments → New Appointment and select your preferred doctor and time slot.' },
                    { q: 'How do I request a prescription refill?', a: 'Go to Prescriptions → find your medication → click Request Refill to message your doctor.' },
                    { q: 'How do I view my lab results?', a: 'Go to Lab Results to see all your test results, trends and upcoming tests.' },
                    { q: 'How do I update my insurance?', a: 'Go to Profile → Insurance section to update your insurance details.' },
                    { q: 'How do I change my password?', a: 'Go to Settings → Security → click Email me a password reset link.' },
                  ].map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-sm font-bold text-slate-900">❓ {item.q}</div>
                      <div className="mt-1 text-sm text-slate-500">{item.a}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 px-6 py-4">
                  <button type="button" onClick={() => setSupportModal(null)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};
