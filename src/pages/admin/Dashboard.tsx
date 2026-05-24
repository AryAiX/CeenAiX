import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { useAdminMetrics } from '../../hooks';
import { ADMIN_NAV_ITEMS } from './navItems';

const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

export const AdminDashboard = () => {
  const { t } = useTranslation('common');
  const { data, loading, error, refetch } = useAdminMetrics();

  const totals = data?.totals ?? null;

  const roleRows = useMemo(() => {
    const usersByRole = data?.usersByRole ?? {};
    return [
      { key: 'patient', label: 'Patients', count: usersByRole.patient ?? 0 },
      { key: 'doctor', label: 'Doctors', count: usersByRole.doctor ?? 0 },
      { key: 'lab', label: 'Lab staff', count: usersByRole.lab ?? 0 },
      { key: 'pharmacy', label: 'Pharmacy staff', count: usersByRole.pharmacy ?? 0 },
      { key: 'facility_admin', label: 'Facility admins', count: usersByRole.facility_admin ?? 0 },
      { key: 'super_admin', label: 'Administrators', count: usersByRole.super_admin ?? 0 },
    ];
  }, [data?.usersByRole]);

  return (
    <OpsShell
      title={t('admin.dashboard.title')}
      subtitle={t('admin.dashboard.subtitle')}
      eyebrow="Admin Portal"
      navItems={ADMIN_NAV_ITEMS(t)}
      accent="slate"
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          Failed to load admin metrics: {error}
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

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Platform users',
            value: totals?.users,
            icon: Users,
            accent: 'from-slate-600 to-slate-800',
          },
          {
            label: "Today's appointments",
            value: totals?.appointmentsToday,
            icon: CalendarCheck,
            accent: 'from-cyan-500 to-blue-600',
          },
          {
            label: 'Completed this month',
            value: totals?.completedConsultsThisMonth,
            icon: Activity,
            accent: 'from-emerald-500 to-teal-600',
          },
          {
            label: 'Active incidents',
            value: totals?.activeIncidents,
            icon: AlertTriangle,
            accent: 'from-rose-500 to-orange-500',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                aria-hidden
                className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${card.accent} opacity-10`}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${card.accent} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {loading ? '…' : formatNumber(card.value)}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Users by role</h2>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatNumber(totals?.users)} total</p>
            </div>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manage users
            </Link>
          </div>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            {roleRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between py-2">
                <dt className="text-slate-600">{row.label}</dt>
                <dd className="font-semibold text-slate-900">{formatNumber(row.count)}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI & compliance</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <BrainCircuit className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">AI sessions (30d)</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatNumber(data?.ai.sessions30d)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Flagged outputs: {formatNumber(data?.ai.flaggedOutputs30d)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Audit events (30d)</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatNumber(data?.compliance.auditEvents30d)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Active incidents: {formatNumber(data?.compliance.activeIncidents)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/admin/compliance"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <FileText className="h-3.5 w-3.5" /> Open compliance
            </Link>
            <Link
              to="/admin/ai-analytics"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <BrainCircuit className="h-3.5 w-3.5" /> AI analytics
            </Link>
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Platform snapshot</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Pending doctor approvals:{' '}
          <span className="font-semibold text-slate-900">{formatNumber(totals?.pendingApprovals)}</span>{' '}
          • Generated at {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'}
        </p>
      </section>
    </OpsShell>
  );
};
