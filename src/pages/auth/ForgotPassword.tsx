import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, Mail } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { getDefaultRouteForRole, useAuth } from '../../lib/auth-context';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { withTimeout } from '../../lib/with-timeout';

const AUTH_REMOTE_TIMEOUT_MS = 30_000;

export const ForgotPassword = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading, requestPasswordReset, role, updatePassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  useEffect(() => {
    if (!isLoading && isAuthenticated && isRecoveryMode && successMessage) {
      navigate(getDefaultRouteForRole(role), { replace: true });
    }
  }, [isAuthenticated, isLoading, isRecoveryMode, navigate, role, successMessage]);

  const resetFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setIsSubmitting(true);

    let error: Error | null = null;
    try {
      const result = await withTimeout(
        requestPasswordReset(email.trim()),
        AUTH_REMOTE_TIMEOUT_MS,
        () => new Error(t('auth.remoteTimeout'))
      );
      error = result.error;
    } catch (err) {
      error = err instanceof Error ? err : new Error(t('auth.remoteTimeout'));
    }

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage(t('auth.forgot.resetSent'));
    setIsSubmitting(false);
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (password.length < 8) {
      setErrorMessage(t('auth.login.errors.passwordShort'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.login.errors.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);

    let error: Error | null = null;
    try {
      const result = await withTimeout(
        updatePassword(password),
        AUTH_REMOTE_TIMEOUT_MS,
        () => new Error(t('auth.remoteTimeout'))
      );
      error = result.error;
    } catch (err) {
      error = err instanceof Error ? err : new Error(t('auth.remoteTimeout'));
    }

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage(t('auth.forgot.passwordUpdated'));
    setIsSubmitting(false);
  };

  return (
    <AuthShell
      badge={t('auth.forgot.badge')}
      title={isRecoveryMode ? t('auth.forgot.titleRecovery') : t('auth.forgot.titleRequest')}
      description={
        isRecoveryMode ? t('auth.forgot.descriptionRecovery') : t('auth.forgot.descriptionRequest')
      }
      footer={
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>{t('auth.forgot.remembered')}</span>
          <Link
            to="/auth/login"
            className="font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
          >
            {t('auth.forgot.returnSignIn')}
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

      {isRecoveryMode ? (
        <form className="space-y-5" onSubmit={handleUpdatePassword}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">{t('auth.login.newPassword')}</span>
            <input
              type="password"
              value={password}
              maxLength={FORM_FIELD_LIMITS.password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
              placeholder={t('auth.login.newPasswordPlaceholder')}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">{t('auth.login.confirmNewPassword')}</span>
            <input
              type="password"
              value={confirmPassword}
              maxLength={FORM_FIELD_LIMITS.password}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
              placeholder={t('auth.login.repeatPasswordPlaceholder')}
              autoComplete="new-password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-xl hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            <KeyRound className="h-4 w-4" />
            <span>{isSubmitting ? t('auth.forgot.updating') : t('auth.forgot.updatePassword')}</span>
          </button>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleRequestReset}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">{t('auth.login.email')}</span>
            <input
              type="email"
              value={email}
              maxLength={FORM_FIELD_LIMITS.email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t('auth.forgot.resetInfo')}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-xl hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            <Mail className="h-4 w-4" />
            <span>{isSubmitting ? t('auth.forgot.sending') : t('auth.forgot.sendReset')}</span>
          </button>
        </form>
      )}
    </AuthShell>
  );
};
