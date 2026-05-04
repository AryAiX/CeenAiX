import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FlaskConical, KeyRound, Mail, Pill, ShieldCheck, Smartphone, Stethoscope, UserRound } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthShell } from '../../components/AuthShell';
import { useAuth } from '../../lib/auth-context';
import type { UserRole } from '../../types';

type RegistrationMode = 'email-password' | 'phone-otp';
type RegistrationRole = Extract<UserRole, 'patient' | 'doctor' | 'pharmacy' | 'lab' | 'insurance'>;

interface RegistrationRoleOption {
  id: RegistrationRole;
  titleKey: string;
  descriptionKey: string;
  icon: typeof UserRound;
}

const registrationRoles: RegistrationRoleOption[] = [
  {
    id: 'patient',
    titleKey: 'auth.register.rolePatientTitle',
    descriptionKey: 'auth.register.rolePatientDesc',
    icon: UserRound,
  },
  {
    id: 'doctor',
    titleKey: 'auth.register.roleDoctorTitle',
    descriptionKey: 'auth.register.roleDoctorDesc',
    icon: Stethoscope,
  },
  {
    id: 'pharmacy',
    titleKey: 'auth.login.rolePharmacyTitle',
    descriptionKey: 'auth.roleAccess.roles.pharmacy.description',
    icon: Pill,
  },
  {
    id: 'lab',
    titleKey: 'auth.login.roleLabTitle',
    descriptionKey: 'auth.roleAccess.roles.lab.description',
    icon: FlaskConical,
  },
  {
    id: 'insurance',
    titleKey: 'auth.login.roleInsuranceTitle',
    descriptionKey: 'auth.roleAccess.roles.insurance.description',
    icon: ShieldCheck,
  },
];

const isRegistrationRole = (value: string | null): value is RegistrationRole =>
  value === 'patient' ||
  value === 'doctor' ||
  value === 'pharmacy' ||
  value === 'lab' ||
  value === 'insurance';

export const Register = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    isAuthenticated,
    isLoading,
    requestOtp,
    resendSignupConfirmation,
    role,
    signOut,
    signUpWithPassword,
  } = useAuth();
  const requestedRole = searchParams.get('role');
  const resetRequested = searchParams.get('reset') === '1';
  const safeRequestedRole = isRegistrationRole(requestedRole) ? requestedRole : null;

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<RegistrationMode>('email-password');
  const [selectedRole, setSelectedRole] = useState<RegistrationRole>('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [duplicateEmailConflict, setDuplicateEmailConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [isResettingSession, setIsResettingSession] = useState(false);

  const registerPathWithoutReset = useMemo(() => {
    return safeRequestedRole ? `/auth/register?role=${safeRequestedRole}` : '/auth/register';
  }, [safeRequestedRole]);

  useEffect(() => {
    if (safeRequestedRole) {
      setSelectedRole(safeRequestedRole);
    }
  }, [safeRequestedRole]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated && resetRequested) {
      let isCancelled = false;

      setIsResettingSession(true);
      void signOut().then(() => {
        if (isCancelled) {
          return;
        }

        setIsResettingSession(false);
        navigate(registerPathWithoutReset, { replace: true });
      });

      return () => {
        isCancelled = true;
      };
    }

    if (isAuthenticated) {
      navigate('/auth/onboarding', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, registerPathWithoutReset, resetRequested, role, signOut]);

  const resetFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setDuplicateEmailConflict(false);
  };

  const normalizedEmail = email.trim();
  const selectedRoleOption =
    registrationRoles.find((roleOption) => roleOption.id === selectedRole) ?? registrationRoles[0];
  const SelectedRoleIcon = selectedRoleOption.icon;
  const selectedRoleTitle = t(selectedRoleOption.titleKey);

  const handleResendConfirmation = async () => {
    if (!normalizedEmail) {
      setErrorMessage(t('auth.register.errors.resendNeedEmail'));
      return;
    }

    setIsResendingConfirmation(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await resendSignupConfirmation(normalizedEmail);

    if (error) {
      setErrorMessage(error.message);
      setIsResendingConfirmation(false);
      return;
    }

    setSuccessMessage(t('auth.register.resendSuccess'));
    setIsResendingConfirmation(false);
  };

  const nextStep = () => {
    resetFeedback();

    if (step === 1 && fullName.trim().length < 3) {
      setErrorMessage(t('auth.register.errors.fullNameShort'));
      return;
    }

    if (step === 2) {
      if (mode === 'email-password') {
        if (!email.trim()) {
          setErrorMessage(t('auth.register.errors.emailRequired'));
          return;
        }

        if (password.length < 8) {
          setErrorMessage(t('auth.register.errors.passwordShort'));
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage(t('auth.register.errors.passwordMismatch'));
          return;
        }
      } else if (!phone.trim()) {
        setErrorMessage(t('auth.register.errors.phoneRequired'));
        return;
      }

      if (!termsAccepted) {
        setErrorMessage(t('auth.register.errors.termsRequired'));
        return;
      }
    }

    setStep((current) => Math.min(current + 1, 2));
  };

  const previousStep = () => {
    resetFeedback();
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (step < 2) {
      nextStep();
      return;
    }

    setIsSubmitting(true);

    if (mode === 'email-password') {
      const { error, session } = await signUpWithPassword({
        email: normalizedEmail,
        password,
        phone: phone.trim() || undefined,
        role: selectedRole,
        fullName: fullName.trim(),
        termsAccepted,
      });

      if (error) {
        if (error.message.trim().toLowerCase().includes('already registered')) {
          setDuplicateEmailConflict(true);
          setErrorMessage(t('auth.register.errors.emailAlreadyRegistered'));
        } else {
          setErrorMessage(error.message);
        }
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      if (session) {
        navigate('/auth/onboarding', { replace: true });
        return;
      }

      navigate(
        `/auth/login?role=${selectedRole}&created=1&email=${encodeURIComponent(normalizedEmail)}`,
        { replace: true }
      );
      return;
    }

    const normalizedPhone = phone.trim();
    const { error } = await requestOtp({
      phone: normalizedPhone,
      shouldCreateUser: true,
      data: {
        role: selectedRole,
        full_name: fullName.trim(),
        phone: normalizedPhone,
        terms_accepted: termsAccepted,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    navigate(
      `/auth/verify-otp?phone=${encodeURIComponent(normalizedPhone)}&type=sms&signup=1`
    );
  };

  const stepTitles = useMemo(
    () => [
      t('auth.register.step1'),
      safeRequestedRole ? t('auth.register.step2Details') : t('auth.register.step2'),
      t('auth.register.step3'),
    ],
    [safeRequestedRole, t]
  );

  return (
    <AuthShell
      badge={t('auth.register.badge')}
      title={t('auth.register.title')}
      description={t('auth.register.description')}
      footer={
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>{t('auth.register.haveAccount')}</span>
          <Link
            to={`/auth/login?role=${selectedRole}`}
            className="font-semibold text-teal-700 transition-colors hover:text-teal-800"
          >
            {t('auth.register.signInInstead')}
          </Link>
        </div>
      }
      contentWidthClass="max-w-xl"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {stepTitles.map((stepTitle, index) => {
          const completed = step > index;
          const active = step === index;

          return (
            <div
              key={stepTitle}
              className={`rounded-xl border px-3 py-3 transition ${
                completed || active
                  ? 'border-teal-500 bg-teal-50 shadow-sm shadow-teal-500/10'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    completed || active
                      ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/20'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <span className="text-sm font-semibold text-slate-700">{stepTitle}</span>
              </div>
            </div>
          );
        })}
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {(successMessage || duplicateEmailConflict) && mode === 'email-password' ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
          <span>{t('auth.register.resendPrompt')}</span>
          <button
            type="button"
            onClick={() => void handleResendConfirmation()}
            disabled={isSubmitting || isResendingConfirmation || !normalizedEmail}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResendingConfirmation ? t('auth.register.resending') : t('auth.register.resendButton')}
          </button>
          <Link
            to="/auth/login"
            className="font-semibold underline underline-offset-2"
          >
            {t('auth.register.signInInstead')}
          </Link>
        </div>
      ) : null}

      {isResettingSession ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
          {t('auth.register.resettingSession')}
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                resetFeedback();
                setMode('email-password');
              }}
              className={`rounded-xl border p-4 text-left transition ${
                mode === 'email-password'
                  ? 'border-teal-500 bg-teal-50 shadow-sm shadow-teal-500/10'
                  : 'border-gray-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <ShieldCheck className="h-5 w-5 text-teal-700" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">{t('auth.register.modeEmailTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                {t('auth.register.modeEmailDesc')}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                resetFeedback();
                setMode('phone-otp');
              }}
              className={`rounded-xl border p-4 text-left transition ${
                mode === 'phone-otp'
                  ? 'border-teal-500 bg-teal-50 shadow-sm shadow-teal-500/10'
                  : 'border-gray-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <UserRound className="h-5 w-5 text-teal-700" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">{t('auth.register.modePhoneTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                {t('auth.register.modePhoneDesc')}
              </p>
            </button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('auth.register.roleStepLabel')}</p>
                <p className="text-xs text-slate-500">{t('auth.register.roleStepHint')}</p>
              </div>
              <Link
                to="/auth/portal-access?intent=register"
                className="text-sm font-semibold text-teal-700 transition-colors hover:text-teal-800"
              >
                {t('auth.register.changeRole')}
              </Link>
            </div>

            {safeRequestedRole ? (
              <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                  <SelectedRoleIcon className="h-5 w-5 text-teal-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900">{selectedRoleTitle}</h3>
                  <p className="text-xs text-slate-500">{t('auth.login.roleAccessBadge')}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {registrationRoles.map((roleOption) => {
                  const Icon = roleOption.icon;

                  return (
                    <button
                      key={roleOption.id}
                      type="button"
                      onClick={() => setSelectedRole(roleOption.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selectedRole === roleOption.id
                          ? 'border-teal-500 bg-teal-50 shadow-sm shadow-teal-500/10'
                          : 'border-gray-200 bg-white hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Icon className="h-5 w-5 text-teal-700" />
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-gray-900">{t(roleOption.titleKey)}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600">
                        {t(roleOption.descriptionKey)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600">{t('auth.register.fullNameShort')}</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                  placeholder={t('auth.register.fullNamePlaceholder')}
                  autoComplete="name"
                  required
                />
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
            {mode === 'email-password' ? (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">{t('auth.register.emailShort')}</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                      placeholder={t('auth.register.emailPlaceholder')}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">{t('auth.register.mobileShortOptional')}</label>
                  <div className="relative">
                    <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                      placeholder={t('auth.register.mobilePlaceholder')}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">{t('auth.register.passwordShort')}</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                      placeholder={t('auth.register.passwordPlaceholder')}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">{t('auth.register.confirmPasswordShort')}</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                      placeholder={t('auth.register.confirmPasswordPlaceholder')}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">{t('auth.register.mobileShort')}</label>
                  <div className="relative">
                    <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                      placeholder={t('auth.register.mobilePlaceholder')}
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {t('auth.register.otpNextHint')}
                </div>
              </>
            )}

            <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm leading-relaxed text-gray-600">
                {t('auth.register.termsLabel')}
              </span>
            </label>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 0 || isSubmitting || isResettingSession}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 transition hover:border-teal-500 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('auth.register.btnBack')}</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting || isResettingSession}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white shadow-lg shadow-teal-500/10 transition hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            <span>
              {step < 2
                ? t('auth.register.btnContinue')
                : isSubmitting
                  ? t('auth.register.btnProcessing')
                  : mode === 'email-password'
                    ? t('auth.register.btnCreateAccount')
                    : t('auth.register.btnSendCode')}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </AuthShell>
  );
};
