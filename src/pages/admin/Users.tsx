import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, Search } from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import { useAdminUsers } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { ADMIN_NAV_ITEMS } from './navItems';
import type { UserRole } from '../../types';

const ROLE_FILTERS: Array<{ value: '' | UserRole; label: string }> = [
  { value: '', label: 'All roles' },
  { value: 'patient', label: 'Patients' },
  { value: 'doctor', label: 'Doctors' },
  { value: 'lab', label: 'Lab' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'facility_admin', label: 'Facility admins' },
  { value: 'super_admin', label: 'Administrators' },
];

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const AdminUsers = () => {
  const { t } = useTranslation('common');
  const [searchInput, setSearchInput] = useState('');
  const [role, setRole] = useState<'' | UserRole>('');
  const search = useDeferredValue(searchInput);

  const { data, loading, error, refetch } = useAdminUsers({ search, role: role || null, limit: 100 });
  const rows = data ?? [];

  return (
    <OpsShell
      title={t('admin.users.title')}
      subtitle={t('admin.users.subtitle')}
      eyebrow="Admin Portal"
      navItems={ADMIN_NAV_ITEMS(t)}
      accent="slate"
    >
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
              placeholder="Search name, email, phone"
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter.value || 'all'}
                type="button"
                onClick={() => setRole(filter.value)}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  role === filter.value
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="p-4 text-sm text-rose-700" role="alert">
            Failed to load users: {error}
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading users…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No users match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.user_id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.full_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {row.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.city ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.role === 'doctor' ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.is_dha_verified
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {row.is_dha_verified ? 'DHA verified' : 'DHA pending'}
                        </span>
                      ) : row.profile_completed ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          Onboarding
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.last_sign_in_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </OpsShell>
  );
};
