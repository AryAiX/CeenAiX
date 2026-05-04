import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowLeft,
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  FlaskConical,
  KeyRound,
  Lock,
  Mail,
  Pill,
  Shield,
  Smartphone,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { getOtpRequestErrorMessage } from '../../lib/auth-error-messages';
import { getDefaultRouteForRole, useAuth } from '../../lib/auth-context';

type LoginMode = 'password' | 'otp';
type LoginRole = 'patient' | 'doctor' | 'pharmacy' | 'lab' | 'insurance' | 'admin';

interface RolePreset {
  title: string;
  icon: typeof UserRound;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const JAKARTA: React.CSSProperties = { fontFamily: 'Plus Jakarta Sans, sans-serif' };

const getRolePresets = (t: (key: string) => string): Record<LoginRole, RolePreset> => ({
  patient: {
    title: t('auth.login.rolePatientTitle'),
    icon: UserRound,
    colorClass: 'text-teal-700',
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-200',
  },
  doctor: {
    title: t('auth.login.roleDoctorTitle'),
    icon: Stethoscope,
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
  },
  pharmacy: {
    title: t('auth.login.rolePharmacyTitle'),
    icon: Pill,
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  lab: {
    title: t('auth.login.roleLabTitle'),
    icon: FlaskConical,
    colorClass: 'text-slate-700',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
  },
  insurance: {
    title: t('auth.login.roleInsuranceTitle'),
    icon: Shield,
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  admin: {
    title: t('auth.login.roleAdminTitle'),
    icon: Building2,
    colorClass: 'text-rose-700',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
  },
});

const isLoginRole = (value: string | null): value is LoginRole =>
  value === 'patient' ||
  value === 'doctor' ||
  value === 'pharmacy' ||
  value === 'lab' ||
  value === 'insurance' ||
  value === 'admin';

export const Login = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    isAuthenticated,
    isLoading,
    role,
    requestOtp,
    signInWithPassword,
    updatePassword,
  } = useAuth();

  const rolePresets = useMemo(() => getRolePresets(t), [t]);
  const requestedRole = searchParams.get('role');
  const selectedRole: LoginRole | null = isLoginRole(requestedRole) ? requestedRole : null;
  const rolePreset = selectedRole ? rolePresets[selectedRole] : null;
  const accountCreated = searchParams.get('created') === '1';
  const emailFromSignup = searchParams.get('email') ?? '';

  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState(emailFromSignup);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    accountCreated ? t('auth.login.accountCreatedCheckEmail') : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRecoveryMode = useMemo(() => {
    if (searchParams.get('mode') === 'recovery') {
      return true;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    return window.location.hash.includes('type=recovery');
  }, [searchParams]);

  const redirectTarget = searchParams.get('redirect') ?? undefined;

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isRecoveryMode) {
      navigate(redirectTarget ?? getDefaultRouteForRole(role), { replace: true });
    }
  }, [isAuthenticated, isLoading, isRecoveryMode, navigate, redirectTarget, role]);

  const resetFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setIsSubmitting(true);

    const { error } = await signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(error.message);
    }

    setIsSubmitting(false);
  };

  const handleOtpLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setIsSubmitting(true);

    const normalizedPhone = phone.trim();
    const { error } = await requestOtp({
      phone: normalizedPhone,
      shouldCreateUser: false,
    });

    if (error) {
      setErrorMessage(getOtpRequestErrorMessage(error.message, { isSignUp: false }));
      setIsSubmitting(false);
      return;
    }

    navigate(
      `/auth/verify-otp?phone=${encodeURIComponent(normalizedPhone)}&type=sms${
        redirectTarget ? `&redirect=${encodeURIComponent(redirectTarget)}` : ''
      }`
    );
  };

  const handlePasswordRecovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (newPassword.length < 8) {
      setErrorMessage('Use at least 8 characters for your new password.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('The new password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await updatePassword(newPassword);

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage('Password updated successfully. Redirecting to your account...');
    setIsSubmitting(false);
    navigate(getDefaultRouteForRole(role), { replace: true });
  };

  const RoleIcon = rolePreset?.icon ?? UserRound;

  const sidebarFeatures = [
    t('auth.roleAccess.sidebarFeature1'),
    t('auth.roleAccess.sidebarFeature2'),
    t('auth.roleAccess.sidebarFeature3'),
    t('auth.roleAccess.sidebarFeature4'),
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 lg:flex">
      <div className="absolute end-4 top-4 z-20 sm:end-6 sm:top-6 lg:end-8 lg:top-8">
        <LanguageSwitcher />
      </div>

      <div className="relative hidden w-80 shrink-0 flex-col justify-between overflow-hidden bg-slate-900 p-8 lg:flex">
        <div className="pointer-events-none absolute -right-20 top-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          <Link to="/" className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-white" style={JAKARTA}>
                CeenAiX
              </div>
              <div className="text-xs text-teal-400">{t('auth.roleAccess.sidebarEyebrow')}</div>
            </div>
          </Link>

          <div className="space-y-6">
            <div>
              <div className="text-2xl font-bold leading-tight text-white" style={JAKARTA}>
                {t('auth.roleAccess.sidebarTitle')}
              </div>
              <div className="mt-3 text-sm text-slate-400">
                {t('auth.roleAccess.sidebarDescription')}
              </div>
            </div>

            <div className="space-y-3">
              {sidebarFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative text-xs text-slate-500">{t('auth.roleAccess.copyright')}</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-800" style={JAKARTA}>
              CeenAiX
            </span>
          </div>

          {isRecoveryMode ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2
                className="mb-1 text-xl font-bold text-slate-900"
                style={JAKARTA}
              >
                {t('auth.login.titleRecovery')}
              </h2>
              <p className="mb-6 text-sm text-slate-500">{t('auth.login.descriptionRecovery')}</p>

              {errorMessage ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}
              {successMessage ? (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handlePasswordRecovery}>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    {t('auth.login.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder={t('auth.login.newPasswordPlaceholder')}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    {t('auth.login.confirmNewPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder={t('auth.login.repeatPasswordPlaceholder')}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-70"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? t('auth.login.updatingPassword')
                      : t('auth.login.savePassword')}
                  </span>
                </button>
              </form>
            </div>
          ) : (
            <>
              {rolePreset ? (
                <Link
                  to="/auth/portal-access?intent=login"
                  className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-700"
                >
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  <span>{t('auth.login.backToRoleSelection')}</span>
                </Link>
              ) : null}

              {rolePreset ? (
                <div
                  className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${rolePreset.bgClass} ${rolePreset.borderClass}`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${rolePreset.bgClass}`}
                  >
                    <RoleIcon className={`h-5 w-5 ${rolePreset.colorClass}`} />
                  </div>
                  <div>
                    <div className={`font-semibold ${rolePreset.colorClass}`}>
                      {rolePreset.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t('auth.login.rolePortalBadge')}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                <h2 className="mb-1 text-xl font-bold text-slate-900" style={JAKARTA}>
                  {t('auth.login.signIn')}
                </h2>
                <p className="mb-6 text-sm text-slate-500">
                  {rolePreset
                    ? t('auth.login.descriptionRole')
                    : t('auth.login.description')}
                </p>

                {errorMessage ? (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errorMessage}
                  </div>
                ) : null}
                {successMessage ? (
                  <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                ) : null}

                {mode === 'password' ? (
                  <form className="space-y-4" onSubmit={handlePasswordLogin}>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        {t('auth.login.email')}
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="w-full rounded-lg border border-slate-200 py-2.5 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder={t('auth.login.emailPlaceholder')}
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        {t('auth.login.password')}
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="w-full rounded-lg border border-slate-200 py-2.5 ps-9 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder={t('auth.login.passwordPlaceholder')}
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                          aria-label={
                            showPassword
                              ? t('auth.login.hidePassword')
                              : t('auth.login.showPassword')
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          resetFeedback();
                          setMode('otp');
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-teal-700"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>{t('auth.login.switchToOtp')}</span>
                      </button>
                      <Link
                        to="/auth/forgot-password"
                        className="text-xs font-medium text-teal-700 transition-colors hover:text-teal-800"
                      >
                        {t('auth.login.forgotPassword')}
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          <span>{t('auth.login.signingIn')}</span>
                        </>
                      ) : (
                        <>
                          <span>{t('auth.login.signIn')}</span>
                          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleOtpLogin}>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        {t('auth.login.mobile')}
                      </label>
                      <div className="relative">
                        <Smartphone className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          className="w-full rounded-lg border border-slate-200 py-2.5 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="+971 50 123 4567"
                          autoComplete="tel"
                          required
                        />
                      </div>
                    </div>

                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {t('auth.login.otpHint')}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        resetFeedback();
                        setMode('password');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-teal-700"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                      <span>{t('auth.login.switchToPassword')}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-70"
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>
                        {isSubmitting
                          ? t('auth.login.sendingCode')
                          : t('auth.login.sendCode')}
                      </span>
                    </button>
                  </form>
                )}

                <div className="mt-5 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
                  {selectedRole === 'admin' ? (
                    <span>{t('auth.login.adminInviteOnly')}</span>
                  ) : (
                    <>
                      <span>{t('auth.login.needAccount')}</span>{' '}
                      <Link
                        to={
                          selectedRole
                            ? `/auth/register?role=${selectedRole}`
                            : '/auth/register'
                        }
                        className="font-semibold text-teal-700 transition-colors hover:text-teal-800"
                      >
                        {t('auth.login.createAccount')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
