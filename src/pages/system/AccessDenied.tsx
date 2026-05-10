import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ShieldX } from 'lucide-react';
import { GeometricBackground } from '../../components/GeometricBackground';
import { getDefaultRouteForRole, useAuth } from '../../lib/auth-context';

export const AccessDenied = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { isAuthenticated, role, signOut } = useAuth();
  const dashboardPath = getDefaultRouteForRole(role);

  const handleUseAnotherAccount = async () => {
    await signOut();
    navigate('/auth/register', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-ceenai-cyan/5 relative overflow-hidden">
      <GeometricBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white/95 p-8 text-center shadow-xl backdrop-blur sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
            <ShieldX className="h-8 w-8" />
          </div>

          <div className="mt-6 space-y-4">
            <p className="inline-flex items-center rounded-full bg-ceenai-cyan/10 px-4 py-2 text-sm font-semibold text-ceenai-blue">
              {t('system.accessDenied.badge')}
            </p>
            <h1 className="text-3xl font-bold text-gray-900">{t('system.accessDenied.title')}</h1>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-gray-600">
              {t('system.accessDenied.body')}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 transition hover:border-ceenai-cyan hover:text-ceenai-blue"
            >
              <span>{t('system.accessDenied.home')}</span>
            </Link>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  void handleUseAnotherAccount();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ceenai-cyan/30 px-5 py-3 font-semibold text-ceenai-blue transition hover:bg-ceenai-cyan/10"
              >
                <span>{t('system.accessDenied.otherAccount')}</span>
              </button>
            ) : null}

            {isAuthenticated ? (
              <Link
                to={dashboardPath}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-ceenai-cyan to-ceenai-blue px-5 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.01]"
              >
                <span>{t('system.accessDenied.dashboard')}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            ) : (
              <Link
                to="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-ceenai-cyan to-ceenai-blue px-5 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.01]"
              >
                <span>{t('system.accessDenied.signIn', 'Sign in')}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
