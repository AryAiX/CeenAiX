import { useTranslation } from 'react-i18next';
import { AlertTriangle, FileText, RefreshCcw, ScrollText, ShieldCheck } from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { useAdminCompliance } from '../../hooks';
import { ADMIN_NAV_ITEMS } from './navItems';

const SEVERITY_STYLE: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-rose-100 text-rose-700',
};

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-rose-100 text-rose-700',
  investigating: 'bg-amber-100 text-amber-800',
  mitigated: 'bg-cyan-100 text-cyan-700',
  closed: 'bg-slate-100 text-slate-700',
};

export const AdminCompliance = () => {
  const { t } = useTranslation('common');
  const { data, loading, error, refetch } = useAdminCompliance();

  const incidents = data?.incidents ?? [];
  const events = data?.recentAuditEvents ?? [];

  return (
    <OpsShell
      title={t('admin.compliance.title')}
      subtitle={t('admin.compliance.subtitle')}
      eyebrow="Admin Portal"
      navItems={ADMIN_NAV_ITEMS(t)}
      accent="slate"
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          Failed to load compliance data: {error}
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

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <AlertTriangle className="h-4 w-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wide">Active incidents</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {data?.openIncidentCount ?? 0} open • {incidents.length} total
          </p>
          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">Loading incidents…</p>
            ) : incidents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No incidents reported.
              </div>
            ) : (
              incidents.map((incident) => (
                <div key={incident.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{incident.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(incident.detected_at ?? incident.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          SEVERITY_STYLE[incident.severity] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {incident.severity}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          STATUS_STYLE[incident.status] ?? STATUS_STYLE.open
                        }`}
                      >
                        {incident.status}
                      </span>
                    </div>
                  </div>
                  {incident.summary ? (
                    <p className="mt-2 text-sm text-slate-600">{incident.summary}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <ScrollText className="h-4 w-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wide">Recent audit events</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {events.length} recent • {data?.auditEventCount30d ?? 0} last 30d
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      Loading audit events…
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      No audit events recorded.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-3 py-2 text-slate-500">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{event.action}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {event.actor_name ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {event.table_name}
                        {event.record_id ? (
                          <div className="text-[10px] text-slate-400">{event.record_id}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <ShieldCheck className="h-4 w-4" />
          <h2 className="text-xs font-semibold uppercase tracking-wide">Regulatory snapshot</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {t('admin.compliance.featureAuditBody')}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-slate-600">
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 p-3">
            <FileText className="mt-0.5 h-4 w-4 text-slate-500" />
            <div>
              <p className="font-semibold text-slate-900">{t('admin.compliance.featureReportsTitle')}</p>
              <p>{t('admin.compliance.featureReportsBody')}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-slate-500" />
            <div>
              <p className="font-semibold text-slate-900">{t('admin.compliance.featureIncidentsTitle')}</p>
              <p>{t('admin.compliance.featureIncidentsBody')}</p>
            </div>
          </div>
        </div>
      </section>
    </OpsShell>
  );
};
