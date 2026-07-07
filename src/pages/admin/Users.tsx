import { useState, useMemo, useEffect } from 'react';
import { CheckCircle2, Search, Stethoscope, Users, ShieldCheck } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, formatDate, exportRowsToCsv, titleCase, type AdminContext } from './AdminShell';
import type { UserRole } from '../../types';

type RoleFilter = UserRole | 'all';

const ROLE_TABS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'patient', label: 'Patients' },
  { key: 'doctor', label: 'Doctors' },
  { key: 'super_admin', label: 'Admins' },
  { key: 'clinic', label: 'Clinics' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'lab', label: 'Lab' },
  { key: 'insurance', label: 'Insurance' },
];

const UsersView = ({ context }: { context: AdminContext }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const rows = useMemo(() => {
    return context.users.filter((user) => {
      const matchesRole = roleFilter === 'all' ? true : user.role === roleFilter;
      const haystack = `${user.full_name} ${user.email ?? ''} ${user.phone ?? ''}`.toLowerCase();
      return matchesRole && haystack.includes(search.toLowerCase());
    });
  }, [context.users, roleFilter, search]);

  const totalLoaded = context.users.length;
  const patientCount = context.users.filter((u) => u.role === 'patient').length;
  const doctorCount = context.users.filter((u) => u.role === 'doctor').length;
  const completedCount = context.users.filter((u) => u.profile_completed).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="All Platform Users"
        subtitle={`${formatNumber(rows.length)} of ${formatNumber(totalLoaded)} loaded users`}
      >
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() =>
            exportRowsToCsv(
              rows.map((u) => ({
                full_name: u.full_name,
                role: u.role,
                email: u.email ?? '',
                phone: u.phone ?? '',
                city: u.city ?? '',
                profile_completed: u.profile_completed,
                created_at: u.created_at,
                last_sign_in_at: u.last_sign_in_at ?? '',
              } satisfies Record<string, unknown>)),
              `users-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Export
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Total Loaded"
          value={formatNumber(totalLoaded)}
          caption="Up to 120 per session"
          icon={Users}
          iconTone="bg-teal-50 text-teal-600 ring-teal-100"
        />
        <KpiTile
          label="Patients"
          value={formatNumber(patientCount)}
          caption={`${formatNumber(doctorCount)} doctors`}
          icon={Stethoscope}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="Profile Completed"
          value={formatNumber(completedCount)}
          caption={
            totalLoaded
              ? `${((completedCount / totalLoaded) * 100).toFixed(1)}% of loaded users`
              : ''
          }
          icon={CheckCircle2}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="DHA Verified"
          value={formatNumber(context.users.filter((u) => u.is_dha_verified).length)}
          caption="Doctors with active DHA license"
          icon={ShieldCheck}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRoleFilter(tab.key)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                roleFilter === tab.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' ? (
                <span className="ml-1 opacity-70">
                  ({context.users.filter((u) => u.role === tab.key).length})
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, phone"
            className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2">Last Login</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.user_id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-semibold text-slate-900">{row.full_name || '—'}</td>
                  <td className="px-3 py-2">
                    <Pill tone="blue">{titleCase(row.role)}</Pill>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.email ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{row.city ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(row.created_at)}</td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(row.last_sign_in_at)}</td>
                  <td className="px-3 py-2">
                    <Pill tone={row.profile_completed ? 'emerald' : 'amber'}>
                      {row.profile_completed ? 'Active' : 'Onboarding'}
                    </Pill>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No users match the current filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Showing {rows.length} of {formatNumber(totalLoaded)} loaded users
          {roleFilter !== 'all' ? ` · filtered to ${titleCase(roleFilter)}` : ''}
        </div>
      </Card>
    </div>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const AdminUsers = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Users · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="users" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : <UsersView context={context} />}
    </AdminShell>
  );
};
