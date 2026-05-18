import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, FileCheck2, FlaskConical, PenLine } from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { useAuth } from '../../lib/auth-context';
import { useLabDashboard } from '../../hooks';
import { LAB_NAV_ITEMS } from './navItems';

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

export const LabResultEntry = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { data, loading, error, refetch } = useLabDashboard(user?.id ?? null);

  const processingItems = (data?.worklist ?? []).filter(
    (item) => item.status === 'processing' || item.status === 'collected' || item.status === 'resulted',
  );

  return (
    <OpsShell
      title={t('lab.resultEntry.title')}
      subtitle={t('lab.resultEntry.subtitle')}
      eyebrow={t('lab.dashboard.eyebrow')}
      navItems={LAB_NAV_ITEMS(t)}
      accent="emerald"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />
      <section className="grid gap-4 md:grid-cols-3">
        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 opacity-10"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('lab.resultEntry.kpiAwaiting')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? '…' : formatNumber(data?.metrics.collectedOrders)}
          </p>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 opacity-10"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('lab.resultEntry.kpiProcessing')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm">
              <PenLine className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? '…' : formatNumber(data?.metrics.inProgressOrders)}
          </p>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-10"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('lab.resultEntry.kpiReleasedToday')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? '…' : formatNumber(data?.metrics.completedToday)}
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('lab.resultEntry.queueHeading')}
            </h2>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatNumber(processingItems.length)} {t('lab.resultEntry.queueCountLabel')}
            </p>
          </div>
          <Link
            to="/lab/dashboard"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            {t('lab.resultEntry.queueCta')}
          </Link>
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {processingItems.slice(0, 12).map((item) => (
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
                  {formatNumber(item.pendingTestCount)} {t('lab.resultEntry.pendingLabel')}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                {formatNumber(item.resultedTestCount)}/{formatNumber(item.testCount)}{' '}
                {t('lab.resultEntry.resultedLabel')}
              </div>
            </li>
          ))}
          {!loading && processingItems.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-500">
              {t('lab.resultEntry.queueEmpty')}
            </li>
          ) : null}
        </ul>
      </section>
    </OpsShell>
  );
};
