import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, CheckCircle2, RefreshCcw, XCircle } from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { useAdminSystemHealth } from '../../hooks';
import { ADMIN_NAV_ITEMS } from './navItems';
import type { ServiceHealthSnapshot, ServiceHealthStatus } from '../../types';

const STATUS_STYLE: Record<ServiceHealthStatus, string> = {
  healthy: 'bg-emerald-100 text-emerald-700',
  degraded: 'bg-amber-100 text-amber-800',
  down: 'bg-rose-100 text-rose-700',
  unknown: 'bg-slate-100 text-slate-500',
};

const STATUS_RANK: Record<ServiceHealthStatus, number> = {
  down: 3,
  degraded: 2,
  unknown: 1,
  healthy: 0,
};

const formatMs = (value: number | null | undefined) =>
  typeof value === 'number' ? `${Math.round(value)} ms` : '—';

const overallStatusFromSnapshots = (snapshots: ServiceHealthSnapshot[]): ServiceHealthStatus => {
  if (snapshots.length === 0) return 'unknown';
  let worst: ServiceHealthStatus = 'healthy';
  for (const snapshot of snapshots) {
    if (STATUS_RANK[snapshot.status] > STATUS_RANK[worst]) {
      worst = snapshot.status;
    }
  }
  return worst;
};

export const AdminSystemHealth = () => {
  const { t } = useTranslation('common');
  const { data, loading, error, refetch } = useAdminSystemHealth();

  const allSnapshots = useMemo<ServiceHealthSnapshot[]>(() => {
    if (!data) return [];
    return [...data.services, ...data.integrations, ...data.aiServices];
  }, [data]);

  const overallStatus = overallStatusFromSnapshots(allSnapshots);

  return (
    <OpsShell
      title={t('admin.systemHealth.title')}
      subtitle={t('admin.systemHealth.subtitle')}
      eyebrow="Admin Portal"
      navItems={ADMIN_NAV_ITEMS(t)}
      accent="slate"
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          Failed to load system health: {error}
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-2 inline-flex items-center gap-1 font-semibold underline"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500">
              <Activity className="h-4 w-4" />
              <h2 className="text-xs font-semibold uppercase tracking-wide">Overall status</h2>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 capitalize">
              {loading ? 'Checking…' : overallStatus}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {data?.generatedAt ? `Last updated ${new Date(data.generatedAt).toLocaleString()}` : ''}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              STATUS_STYLE[overallStatus] ?? STATUS_STYLE.unknown
            }`}
          >
            {overallStatus === 'healthy' ? (
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            ) : (
              <XCircle className="mr-1 h-3.5 w-3.5" />
            )}
            {overallStatus}
          </span>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading services…</p>
        ) : allSnapshots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            No service checks recorded yet.
          </div>
        ) : (
          allSnapshots.map((service) => (
            <article
              key={service.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{service.service_name}</h3>
                  <p className="mt-0.5 text-[10px] font-mono uppercase tracking-wide text-slate-400">
                    {service.service_key} • {service.category}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    STATUS_STYLE[service.status] ?? STATUS_STYLE.unknown
                  }`}
                >
                  {service.status}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="uppercase tracking-wide text-slate-400">Latency</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{formatMs(service.latency_ms)}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-slate-400">Region</dt>
                  <dd className="mt-1 text-slate-700">{service.region ?? '—'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="uppercase tracking-wide text-slate-400">Observed at</dt>
                  <dd className="mt-1 text-slate-700">
                    {new Date(service.observed_at).toLocaleString()}
                  </dd>
                </div>
              </dl>
              {service.message ? (
                <p className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                  {service.message}
                </p>
              ) : null}
            </article>
          ))
        )}
      </section>
    </OpsShell>
  );
};
