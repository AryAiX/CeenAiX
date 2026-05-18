import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, ClipboardList, FlaskConical, Gauge, Users } from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { useAuth } from '../../lib/auth-context';
import { useLabDashboard } from '../../hooks';
import { LAB_NAV_ITEMS } from './navItems';

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

export const LabReferrals = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { data, loading, error, refetch } = useLabDashboard(user?.id ?? null);

  const referrals = useMemo(() => data?.worklist ?? [], [data?.worklist]);

  const kpis = [
    {
      label: t('lab.referrals.kpiIncoming'),
      value: referrals.length,
      icon: ClipboardList,
      accent: 'from-cyan-500 to-blue-600',
    },
    {
      label: t('lab.referrals.kpiDoctors'),
      value: new Set(referrals.map((r) => r.doctorId)).size,
      icon: Users,
      accent: 'from-emerald-500 to-teal-600',
    },
    {
      label: t('lab.referrals.kpiSla'),
      value: data?.metrics.pendingOrders ?? 0,
      icon: Gauge,
      accent: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <OpsShell
      title={t('lab.referrals.title')}
      subtitle={t('lab.referrals.subtitle')}
      eyebrow={t('lab.dashboard.eyebrow')}
      navItems={LAB_NAV_ITEMS(t)}
      accent="emerald"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />
      <section className="grid gap-4 md:grid-cols-3">
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
                {loading ? '…' : formatNumber(kpi.value)}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('lab.referrals.tableHeading')}
            </h2>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatNumber(referrals.length)} {t('lab.referrals.tableCountLabel')}
            </p>
          </div>
          <Link
            to="/lab/dashboard"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('lab.referrals.tableCta')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {referrals.slice(0, 12).map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {item.doctorName ?? t('lab.referrals.anonDoctor')}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {item.patientName ?? t('lab.dashboard.anonPatient')} •{' '}
                  {item.firstTestName ?? t('lab.dashboard.untitledTest')}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {t(`lab.status.${item.status}`)}
              </span>
            </li>
          ))}
          {!loading && referrals.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-500">
              <FlaskConical className="mx-auto mb-2 h-6 w-6 text-slate-400" />
              {t('lab.referrals.tableEmpty')}
            </li>
          ) : null}
        </ul>
      </section>
    </OpsShell>
  );
};
