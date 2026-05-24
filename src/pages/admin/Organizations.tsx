import { useTranslation } from 'react-i18next';
import { Building2, RefreshCcw } from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { useAdminOrganizations } from '../../hooks';
import { ADMIN_NAV_ITEMS } from './navItems';
import type { OrganizationKind, OrganizationStatus } from '../../types';

const KIND_BADGE: Record<OrganizationKind, string> = {
  hospital: 'bg-blue-100 text-blue-700',
  clinic: 'bg-cyan-100 text-cyan-700',
  lab: 'bg-violet-100 text-violet-700',
  pharmacy: 'bg-emerald-100 text-emerald-700',
  insurance: 'bg-amber-100 text-amber-700',
};

const STATUS_BADGE: Record<OrganizationStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-rose-100 text-rose-700',
  pending: 'bg-amber-100 text-amber-800',
  archived: 'bg-slate-200 text-slate-700',
};

export const AdminOrganizations = () => {
  const { t } = useTranslation('common');
  const { data, loading, error, refetch } = useAdminOrganizations();
  const orgs = data ?? [];

  return (
    <OpsShell
      title={t('admin.organizations.title')}
      subtitle={t('admin.organizations.subtitle')}
      eyebrow="Admin Portal"
      navItems={ADMIN_NAV_ITEMS(t)}
      accent="slate"
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          Failed to load organizations: {error}
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading organizations…</p>
        ) : orgs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            No organizations configured yet.
          </div>
        ) : (
          orgs.map((org) => (
            <article
              key={org.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{org.name}</h3>
                    <p className="text-xs text-slate-500">
                      {[org.city, org.country].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    KIND_BADGE[org.kind] ?? 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {org.kind}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="uppercase tracking-wide text-slate-400">Primary contact</dt>
                  <dd className="mt-1 text-slate-700">{org.primary_contact_name || '—'}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-slate-400">Email</dt>
                  <dd className="mt-1 truncate text-slate-700">
                    {org.primary_contact_email || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-slate-400">Seats</dt>
                  <dd className="mt-1 text-slate-700">
                    {org.seats_used} / {org.seats_allocated}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-slate-400">Status</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        STATUS_BADGE[org.status] ?? STATUS_BADGE.archived
                      }`}
                    >
                      {org.status}
                    </span>
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="uppercase tracking-wide text-slate-400">Created</dt>
                  <dd className="mt-1 text-slate-700">
                    {new Date(org.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </section>
    </OpsShell>
  );
};
