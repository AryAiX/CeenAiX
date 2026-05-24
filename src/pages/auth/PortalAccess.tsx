import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowLeft,
  Building2,
  ChevronRight,
  FlaskConical,
  Pill,
  Shield,
  Stethoscope,
  UserRound,
} from 'lucide-react';

type PortalRole = 'patient' | 'doctor' | 'pharmacy' | 'lab' | 'insurance' | 'admin';

interface RoleOption {
  id: PortalRole;
  titleKey: string;
  descriptionKey: string;
  icon: typeof UserRound;
  accentClass: string;
  borderClass: string;
  enabled: boolean;
}

const JAKARTA: React.CSSProperties = { fontFamily: 'Plus Jakarta Sans, sans-serif' };

const roleOptions: RoleOption[] = [
  {
    id: 'patient',
    titleKey: 'auth.roleAccess.roles.patient.title',
    descriptionKey: 'auth.roleAccess.roles.patient.description',
    icon: UserRound,
    accentClass: 'text-teal-700 bg-teal-50',
    borderClass: 'border-teal-200 hover:border-teal-300',
    enabled: true,
  },
  {
    id: 'doctor',
    titleKey: 'auth.roleAccess.roles.doctor.title',
    descriptionKey: 'auth.roleAccess.roles.doctor.description',
    icon: Stethoscope,
    accentClass: 'text-blue-700 bg-blue-50',
    borderClass: 'border-blue-200 hover:border-blue-300',
    enabled: true,
  },
  {
    id: 'pharmacy',
    titleKey: 'auth.roleAccess.roles.pharmacy.title',
    descriptionKey: 'auth.roleAccess.roles.pharmacy.description',
    icon: Pill,
    accentClass: 'text-emerald-700 bg-emerald-50',
    borderClass: 'border-emerald-200 hover:border-emerald-300',
    enabled: true,
  },
  {
    id: 'lab',
    titleKey: 'auth.roleAccess.roles.lab.title',
    descriptionKey: 'auth.roleAccess.roles.lab.description',
    icon: FlaskConical,
    accentClass: 'text-slate-700 bg-slate-50',
    borderClass: 'border-slate-200 hover:border-slate-300',
    enabled: true,
  },
  {
    id: 'insurance',
    titleKey: 'auth.roleAccess.roles.insurance.title',
    descriptionKey: 'auth.roleAccess.roles.insurance.description',
    icon: Shield,
    accentClass: 'text-amber-700 bg-amber-50',
    borderClass: 'border-amber-200 hover:border-amber-300',
    enabled: true,
  },
  {
    id: 'admin',
    titleKey: 'auth.roleAccess.roles.admin.title',
    descriptionKey: 'auth.roleAccess.roles.admin.description',
    icon: Building2,
    accentClass: 'text-rose-700 bg-rose-50',
    borderClass: 'border-rose-200 hover:border-rose-300',
    enabled: true,
  },
];

export const PortalAccess = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [searchParams] = useSearchParams();
  const intent = searchParams.get('intent') === 'login' ? 'login' : 'register';
  const sidebarFeatures = useMemo(
    () => [
      t('auth.roleAccess.sidebarFeature1'),
      t('auth.roleAccess.sidebarFeature2'),
      t('auth.roleAccess.sidebarFeature3'),
      t('auth.roleAccess.sidebarFeature4'),
    ],
    [t]
  );

  const handleSelect = (role: PortalRole, enabled: boolean) => {
    if (!enabled) {
      return;
    }

    if (intent === 'login') {
      navigate(`/auth/login?role=${role}`);
      return;
    }

    if (role === 'admin') {
      navigate('/auth/login?role=admin');
      return;
    }

    navigate(`/auth/register?role=${role}`);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 lg:flex">
      <div className="relative hidden w-80 shrink-0 flex-col justify-between overflow-hidden bg-slate-900 p-8 lg:flex">
        <div className="pointer-events-none absolute -right-20 top-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-white" style={JAKARTA}>
                CeenAiX
              </div>
              <div className="text-xs text-teal-400">{t('auth.roleAccess.sidebarEyebrow')}</div>
            </div>
          </div>

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
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
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
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-3 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-slate-800" style={JAKARTA}>
                CeenAiX
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900" style={JAKARTA}>
              {t('auth.roleAccess.title')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{t('auth.roleAccess.description')}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            {roleOptions.map((role) => {
              const Icon = role.icon;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleSelect(role.id, role.enabled)}
                  disabled={!role.enabled}
                  title={role.enabled ? undefined : t('auth.roleAccess.comingSoon')}
                  aria-disabled={!role.enabled}
                  className={`group relative flex items-start gap-4 rounded-xl border-2 p-4 text-start transition-all ${
                    role.enabled
                      ? `hover:scale-[1.02] hover:shadow-md ${role.accentClass} ${role.borderClass}`
                      : 'cursor-not-allowed border-slate-200 bg-white/80 opacity-80'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      role.enabled ? `${role.borderClass} ${role.accentClass}` : 'border-slate-200 bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-semibold ${role.enabled ? '' : 'text-slate-700'}`}>
                        {t(role.titleKey)}
                      </div>
                      {!role.enabled ? (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {t('auth.roleAccess.comingSoon')}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      {t(role.descriptionKey)}
                    </div>
                  </div>
                  <ChevronRight
                    className={`mt-1 h-4 w-4 shrink-0 text-slate-400 rtl:rotate-180 ${
                      role.enabled ? 'transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5' : ''
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 transition-colors hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              <span>{t('auth.roleAccess.backHome')}</span>
            </Link>

            {intent === 'login' ? (
              <div className="flex items-center gap-2">
                <span>{t('auth.roleAccess.needAccount')}</span>
                <Link
                  to="/auth/portal-access?intent=register"
                  className="font-semibold text-teal-700 transition-colors hover:text-teal-800"
                >
                  {t('auth.roleAccess.createAccount')}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{t('auth.roleAccess.haveAccount')}</span>
                <Link
                  to="/auth/portal-access?intent=login"
                  className="font-semibold text-teal-700 transition-colors hover:text-teal-800"
                >
                  {t('auth.roleAccess.signInInstead')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
