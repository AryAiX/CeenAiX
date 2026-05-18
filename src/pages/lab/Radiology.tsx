import { useTranslation } from 'react-i18next';
import { ScanLine, Stethoscope, Workflow } from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { useAuth } from '../../lib/auth-context';
import { useLabDashboard } from '../../hooks';
import { LAB_NAV_ITEMS } from './navItems';

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

const FEATURE_CARDS = [
  {
    key: 'worklist',
    icon: Workflow,
    accent: 'from-cyan-500 to-blue-600',
  },
  {
    key: 'viewer',
    icon: ScanLine,
    accent: 'from-violet-500 to-fuchsia-600',
  },
  {
    key: 'reports',
    icon: Stethoscope,
    accent: 'from-emerald-500 to-teal-600',
  },
] as const;

export const LabRadiology = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { data, loading, error, refetch } = useLabDashboard(user?.id ?? null);

  return (
    <OpsShell
      title={t('lab.radiology.title')}
      subtitle={t('lab.radiology.subtitle')}
      eyebrow={t('lab.dashboard.eyebrow')}
      navItems={LAB_NAV_ITEMS(t)}
      accent="emerald"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />
      <section className="grid gap-4 md:grid-cols-3">
        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 opacity-10"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('lab.radiology.kpiStudiesOpen')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm">
              <Workflow className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? '…' : formatNumber(data?.metrics.totalActiveTests)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {t('lab.radiology.kpiAcrossAllOrders', {
              defaultValue: 'Across all lab orders (radiology-specific metrics arrive with imaging Phase).',
            })}
          </p>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 opacity-10"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('lab.radiology.kpiPending')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
              <ScanLine className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? '…' : formatNumber(data?.metrics.pendingOrders)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {t('lab.radiology.kpiAcrossAllOrders', {
              defaultValue: 'Across all lab orders (radiology-specific metrics arrive with imaging Phase).',
            })}
          </p>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-10"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('lab.radiology.kpiReported')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? '…' : formatNumber(data?.metrics.completedToday)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {t('lab.radiology.kpiAcrossAllOrders', {
              defaultValue: 'Across all lab orders (radiology-specific metrics arrive with imaging Phase).',
            })}
          </p>
        </article>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {FEATURE_CARDS.map(({ key, icon: Icon, accent }) => (
          <article
            key={key}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              {t(`lab.radiology.feature${key.charAt(0).toUpperCase() + key.slice(1)}Title`)}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {t(`lab.radiology.feature${key.charAt(0).toUpperCase() + key.slice(1)}Body`)}
            </p>
          </article>
        ))}
      </section>
    </OpsShell>
  );
};
