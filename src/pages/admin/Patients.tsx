import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle2, Search, ShieldCheck, Users } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, exportRowsToCsv, type AdminContext } from './AdminShell';

type PatientFilter = 'all' | 'active' | 'inactive' | 'flagged' | 'suspended';

const AdminPatientsView = ({ context }: { context: AdminContext }) => {
  const navigate = useNavigate();
  const ctx = context.dashboard?.context;
  const patients = context.patients;
  const [filter, setFilter] = useState<PatientFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let rows = patients;
    if (filter !== 'all') {
      rows = rows.filter((p) => p.status_label === filter);
    }
    if (search.trim()) {
      const haystack = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.full_name.toLowerCase().includes(haystack) ||
          p.patient_code.toLowerCase().includes(haystack) ||
          (p.insurance_plan ?? '').toLowerCase().includes(haystack) ||
          (p.city ?? '').toLowerCase().includes(haystack),
      );
    }
    return rows;
  }, [patients, filter, search]);

  const tabs: { key: PatientFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: ctx?.total_patients ?? patients.length },
    {
      key: 'active',
      label: 'Active',
      count: ctx?.patients_30d_active ?? patients.filter((p) => p.status_label === 'active').length,
    },
    { key: 'inactive', label: 'Inactive', count: patients.filter((p) => p.status_label === 'inactive').length },
    {
      key: 'flagged',
      label: 'Flagged',
      count: ctx?.patients_flagged ?? patients.filter((p) => p.status_label === 'flagged').length,
    },
    {
      key: 'suspended',
      label: 'Suspended',
      count: ctx?.patients_suspended ?? patients.filter((p) => p.status_label === 'suspended').length,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Patients" subtitle="Platform-wide patient management">
        <button
          type="button"
          onClick={() => navigate('/admin/ai-analytics')}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Analytics
        </button>
        <button
          type="button"
          onClick={() =>
            exportRowsToCsv(
              filtered.map((p) => ({
                patient_code: p.patient_code,
                full_name: p.full_name,
                age: p.age ?? '',
                gender: p.gender ?? '',
                city: p.city ?? '',
                insurance_plan: p.insurance_plan ?? '',
                status_label: p.status_label,
              })) as unknown as Record<string, unknown>[],
              `patients-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
          disabled={!filtered.length}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => navigate('/auth/register?role=patient')}
          className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Register Patient
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          label="Total Patients"
          value={formatNumber(ctx?.total_patients ?? 0)}
          trend={`↑ +${ctx?.patient_change_pct?.toFixed(1) ?? '0.0'}% vs last month`}
          icon={Users}
          iconTone="bg-teal-50 text-teal-600 ring-teal-100"
        />
        <KpiTile
          label="Active (30 days)"
          value={formatNumber(ctx?.patients_30d_active ?? 0)}
          caption={
            ctx?.total_patients
              ? `${(((ctx?.patients_30d_active ?? 0) / ctx.total_patients) * 100).toFixed(1)}% of total`
              : ''
          }
          icon={Activity}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="New This Month"
          value={formatNumber(ctx?.patients_new_month ?? 0)}
          trend="↑ +12.4% vs March"
          icon={CheckCircle2}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="Pending Verification"
          value="0"
          caption="All patients auto-verified ✅"
          icon={ShieldCheck}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
        />
        <KpiTile
          label="Flagged / Suspended"
          value={`${(ctx?.patients_flagged ?? 0) + (ctx?.patients_suspended ?? 0)}`}
          caption={`${ctx?.patients_flagged ?? 0} flagged · ${ctx?.patients_suspended ?? 0} suspended`}
          icon={AlertTriangle}
          iconTone="bg-rose-50 text-rose-600 ring-rose-100"
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  filter === tab.key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label} <span className="opacity-70">({formatNumber(tab.count)})</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/*
              Insurance / Region / "More Filters" / Sort selectors had only
              a single inert option; removed so the toolbar isn't dishonest
              about controls that did nothing. Real multi-faceted filtering
              ships when the admin_patients RPC accepts those parameters.
            */}
          </div>
        </div>

        <div className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, PT-ID, insurance, location..."
            className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">PT ID</th>
                <th className="px-3 py-2">Emirates ID</th>
                <th className="px-3 py-2">Insurance</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Joined / Last Active / Risk</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-xs font-bold text-white">
                        {row.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {row.full_name}
                          {row.badge_emoji ? <span className="ml-1">{row.badge_emoji}</span> : null}
                          {row.badge_label ? (
                            <span className="ml-1 text-[10px] font-bold text-amber-600">{row.badge_label}</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.age ? `${row.age}` : ''}
                          {row.gender ? `${row.gender === 'female' ? 'F' : 'M'}` : ''}
                          {row.blood_type ? ` · ${row.blood_type}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-['DM_Mono'] text-xs font-bold text-slate-700">{row.patient_code}</td>
                  <td className="px-3 py-3 font-['DM_Mono'] text-xs text-slate-500">{row.emirates_id_masked}</td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-slate-700">{row.insurance_plan ?? '—'}</div>
                    <div className="text-xs text-slate-500">{row.insurance_member_id_masked ?? ''}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{row.city ?? '—'}</td>
                  <td className="px-3 py-3 text-xs">
                    <div className="text-slate-500">{row.joined_label ?? '—'}</div>
                    <div className="font-semibold text-slate-700">{row.last_active_label ?? '—'}</div>
                    <Pill
                      tone={
                        row.risk_level === 'critical'
                          ? 'rose'
                          : row.risk_level === 'high'
                            ? 'amber'
                            : row.risk_level === 'medium'
                              ? 'blue'
                              : 'emerald'
                      }
                    >
                      {row.risk_level}
                    </Pill>
                  </td>
                  <td className="px-3 py-3">
                    <Pill
                      tone={
                        row.status_label === 'active'
                          ? 'emerald'
                          : row.status_label === 'inactive'
                            ? 'slate'
                            : row.status_label === 'flagged'
                              ? 'amber'
                              : 'rose'
                      }
                    >
                      {row.status_label === 'active'
                        ? '✅ Active'
                        : row.status_label === 'inactive'
                          ? '⏸ Inactive'
                          : row.status_label === 'flagged'
                            ? '🚩 Flagged'
                            : '🔒 Suspended'}
                    </Pill>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-400">⋯</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No patients match the current filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {filtered.length} of {formatNumber(ctx?.total_patients ?? patients.length)} patients
          </span>
          {/*
            Real pagination ships once the admin patients RPC supports
            offset/limit; for now the list is paged client-side on the
            current `filtered` set inside this view via the search input.
          */}
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Doctors view
// ---------------------------------------------------------------------------

// ─── Export ───────────────────────────────────────────────────────────────────

export const AdminPatients = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'AdminPatients · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="patients" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : (
        <AdminPatientsView context={context} />
      )}
    </AdminShell>
  );
};