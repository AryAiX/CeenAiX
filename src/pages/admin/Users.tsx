import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, formatNumber, formatDate, type AdminContext } from './AdminShell';
import type { UserRole } from '../../types';
const UsersView = ({ context, role }: { context: AdminContext; role?: UserRole }) => {
  const [search, setSearch] = useState('');
  const rows = context.users.filter((user) => {
    const matchesRole = role ? user.role === role : true;
    const haystack = `${user.full_name} ${user.email ?? ''} ${user.phone ?? ''}`.toLowerCase();
    return matchesRole && haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <PageHeader title="All Platform Users" subtitle={`${formatNumber(rows.length)} users match the current view`} />
      <Card>
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
              <tr>
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
                <tr key={row.user_id}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{row.full_name || '—'}</td>
                  <td className="px-3 py-2">
                    <Pill tone="blue">{row.role}</Pill>
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
            </tbody>
          </table>
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
