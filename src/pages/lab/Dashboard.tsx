import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Gauge,
  Inbox,
  ListChecks,
  Zap,
} from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { useAuth } from '../../lib/auth-context';
import { useLabDashboard } from '../../hooks';
import type { LabWorklistItem } from '../../hooks/use-lab-dashboard';
import { formatLocaleDigits } from '../../lib/i18n-ui';
import { LAB_NAV_ITEMS } from './navItems';

const STATUS_PILL: Record<LabWorklistItem['status'], string> = {
  ordered: 'bg-amber-50 text-amber-700 ring-amber-200',
  collected: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  processing: 'bg-blue-50 text-blue-700 ring-blue-200',
  resulted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  reviewed: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const formatNumber = (value: number | null | undefined, language: string) =>
  typeof value === 'number' ? formatLocaleDigits(value, language) : '—';

export const LabDashboard = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const { data, loading, error, refetch } = useLabDashboard(user?.id ?? null);

  const kpis = useMemo(
    () => [
      {
        label: t('lab.dashboard.kpiPending'),
        value: data?.metrics.pendingOrders,
        icon: Inbox,
        accent: 'from-amber-500 to-orange-500',
      },
      {
        label: t('lab.dashboard.kpiInProgress'),
        value: data?.metrics.inProgressOrders,
        icon: Activity,
        accent: 'from-cyan-500 to-blue-600',
      },
      {
        label: t('lab.dashboard.kpiCompletedToday'),
        value: data?.metrics.completedToday,
        icon: CheckCircle2,
        accent: 'from-emerald-500 to-teal-600',
      },
      {
        label: t('lab.dashboard.kpiStat'),
        value: data?.metrics.stat,
        icon: Zap,
        accent: 'from-rose-500 to-orange-500',
      },
    ],
    [data?.metrics, t],
  );

  return (
    <OpsShell
      title={t('lab.dashboard.title')}
      subtitle={data?.labName ?? t('lab.dashboard.subtitle')}
      eyebrow={t('lab.dashboard.eyebrow')}
      navItems={LAB_NAV_ITEMS(t)}
      accent="emerald"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article
              key={kpi.label}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                aria-hidden
                className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${kpi.accent} opacity-10`}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {kpi.label}
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.accent} text-white shadow-sm`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {loading ? '…' : formatNumber(kpi.value, i18n.language)}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[2fr,1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t('lab.dashboard.worklistHeading')}
              </h2>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {formatNumber(data?.worklist?.length ?? 0, i18n.language)} {t('lab.dashboard.worklistCountLabel')}
              </p>
            </div>
            <Link
              to="/lab/results/entry"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <ListChecks className="h-3.5 w-3.5" />
              {t('lab.dashboard.worklistCta')}
            </Link>
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {(data?.worklist ?? []).slice(0, 8).map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FlaskConical className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.patientName ?? t('lab.dashboard.anonPatient')}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {item.firstTestName ?? t('lab.dashboard.untitledTest')} •{' '}
                    {item.testCount} {t('lab.dashboard.testsLabel')}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${
                    STATUS_PILL[item.status] ?? STATUS_PILL.ordered
                  }`}
                >
                  {t(`lab.status.${item.status}`)}
                </span>
              </li>
            ))}
            {(!data || data.worklist.length === 0) && !loading ? (
              <li className="py-6 text-center text-sm text-slate-500">
                {t('lab.dashboard.worklistEmpty')}
              </li>
            ) : null}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t('lab.dashboard.qualityHeading')}
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Gauge className="h-4 w-4 text-emerald-500" />
              <span className="flex-1">{t('lab.dashboard.turnaroundLabel')}</span>
              <span className="font-semibold text-slate-900">
                {formatNumber(data?.metrics.totalActiveTests, i18n.language)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="flex-1">{t('lab.dashboard.collectedLabel')}</span>
              <span className="font-semibold text-slate-900">
                {formatNumber(data?.metrics.collectedOrders, i18n.language)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="flex-1">{t('lab.dashboard.criticalLabel')}</span>
              <span className="font-semibold text-slate-900">
                {formatNumber(data?.metrics.stat, i18n.language)}
              </span>
            </div>
          </div>
        </article>
      </section>
    </OpsShell>
  );
};
