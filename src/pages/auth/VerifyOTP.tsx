import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, ShieldCheck } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import {
  getOtpRequestErrorMessage,
  getOtpVerificationErrorMessage,
} from '../../lib/auth-error-messages';
import {
  getDefaultRouteForRole,
  useAuth,
} from '../../lib/auth-context';
import { withTimeout } from '../../lib/with-timeout';

const AUTH_REMOTE_TIMEOUT_MS = 30_000;

export const VerifyOTP = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading, requestOtp, role, verifyOtp } = useAuth();

  const [token, setToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const phone = searchParams.get('phone') ?? '';
  const email = searchParams.get('email') ?? '';
  const type = searchParams.get('type') === 'email' ? 'email' : 'sms';
  const redirectTarget = searchParams.get('redirect') ?? undefined;
  const shouldGoToOnboarding = searchParams.get('signup') === '1';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(
        shouldGoToOnboarding ? '/auth/onboarding' : redirectTarget ?? getDefaultRouteForRole(role),
        { replace: true }
      );
    }
  }, [
    isAuthenticated,
    isLoading,
    navigate,
    redirectTarget,
    role,
    shouldGoToOnboarding,
  ]);

  const resetFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!phone && !email) {
      setErrorMessage(t('auth.otp.errors.noDestination'));
      return;
    }

    setIsSubmitting(true);

    let verificationResult: { error: Error | null };
    try {
      const pending =
        type === 'sms' && phone
          ? verifyOtp({
              token: token.trim(),
              phone,
              type: 'sms',
            })
          : type === 'email' && email
            ? verifyOtp({
                token: token.trim(),
                email,
                type: 'email',
              })
            : Promise.resolve({ error: new Error(t('auth.otp.errors.noDestination')) });

      verificationResult = await withTimeout(pending, AUTH_REMOTE_TIMEOUT_MS, () => new Error(t('auth.remoteTimeout')));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('auth.remoteTimeout'));
      setIsSubmitting(false);
      return;
    }

    if (verificationResult.error) {
      setErrorMessage(getOtpVerificationErrorMessage(verificationResult.error.message));
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage(t('auth.otp.verifySuccess'));
    setIsSubmitting(false);
  };

  const handleResend = async () => {
    resetFeedback();

    if (!phone) {
      setErrorMessage(t('auth.otp.errors.requestNew'));
      return;
    }

    setIsResending(true);

    let error: Error | null = null;
    try {
      const result = await withTimeout(
        requestOtp({
          phone,
          shouldCreateUser: shouldGoToOnboarding,
        }),
        AUTH_REMOTE_TIMEOUT_MS,
        () => new Error(t('auth.remoteTimeout'))
      );
      error = result.error;
    } catch (err) {
      error = err instanceof Error ? err : new Error(t('auth.remoteTimeout'));
    }

    if (error) {
      setErrorMessage(getOtpRequestErrorMessage(error.message, { isSignUp: shouldGoToOnboarding }));
      setIsResending(false);
      return;
    }

    setSuccessMessage(t('auth.otp.resentOk'));
    setIsResending(false);
  };

  return (
    <AuthShell
      badge={t('auth.otp.badge')}
      title={t('auth.otp.title')}
      description={t('auth.otp.description')}
      footer={
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>{t('auth.otp.wrongDetails')}</span>
          <Link
            to={shouldGoToOnboarding ? '/auth/register' : '/auth/login'}
            className="font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
          >
            {t('auth.otp.goBack')}
          </Link>
        </div>
      }
    >
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-cyan-600" />
          <div className="space-y-1 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{t('auth.otp.verificationTarget')}</p>
            <p>{phone || email}</p>
            <p>{shouldGoToOnboarding ? t('auth.otp.signupFlow') : t('auth.otp.signinFlow')}</p>
          </div>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">{t('auth.otp.codeLabel')}</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={token}
            onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-center text-2xl font-semibold tracking-[0.4em] text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
            placeholder="000000"
            autoComplete="one-time-code"
            required
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>{isResending ? t('auth.otp.resending') : t('auth.otp.resend')}</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-xl hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isSubmitting ? t('auth.otp.verifying') : t('auth.otp.verify')}</span>
          </button>
        </div>
      </form>
    </AuthShell>
  );
};
