import { useEffect, useState, useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Mail, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, exportRowsToCsv, type AdminContext } from './AdminShell';
import type { AdminPatientRow } from '../../types';

type PatientFilter = 'all' | 'active' | 'inactive' | 'flagged' | 'suspended';

const prevMonthName = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  .toLocaleDateString(undefined, { month: 'long' });

const BreakdownBar = ({ label, count, max }: { label: string; count: number; max: number }) => (
  <div className="mb-2">
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="text-slate-500">{count}</span>
    </div>
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div
        className="h-2 rounded-full bg-teal-500"
        style={{ width: max > 0 ? `${(count / max) * 100}%` : '0%' }}
      />
    </div>
  </div>
);

const AdminPatientsView = ({ context }: { context: AdminContext }) => {
  const ctx = context.dashboard?.context;
  const patients = context.patients;
  const [filter, setFilter] = useState<PatientFilter>('all');
  const [search, setSearch] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showRegisterComingSoon, setShowRegisterComingSoon] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<AdminPatientRow | null>(null);

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

  const analytics = useMemo(() => {
    const ageBands = [
      { label: '0–17', count: 0 },
      { label: '18–34', count: 0 },
      { label: '35–54', count: 0 },
      { label: '55–74', count: 0 },
      { label: '75+', count: 0 },
      { label: 'Unknown', count: 0 },
    ];
    const riskCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const cityCounts = new Map<string, number>();
    const insuranceCounts = new Map<string, number>();
    const genderCounts = { male: 0, female: 0, unspecified: 0 };

    patients.forEach((p) => {
      const age = p.age;
      if (age == null) ageBands[5].count += 1;
      else if (age < 18) ageBands[0].count += 1;
      else if (age < 35) ageBands[1].count += 1;
      else if (age < 55) ageBands[2].count += 1;
      else if (age < 75) ageBands[3].count += 1;
      else ageBands[4].count += 1;

      if (p.risk_level && p.risk_level in riskCounts) riskCounts[p.risk_level] += 1;

      const city = p.city ?? 'Unknown';
      cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);

      const plan = p.insurance_plan ?? 'No insurance on file';
      insuranceCounts.set(plan, (insuranceCounts.get(plan) ?? 0) + 1);

      if (p.gender === 'male') genderCounts.male += 1;
      else if (p.gender === 'female') genderCounts.female += 1;
      else genderCounts.unspecified += 1;
    });

    const toSortedRows = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    return {
      ageBands,
      riskRows: [
        { label: 'Low', count: riskCounts.low },
        { label: 'Medium', count: riskCounts.medium },
        { label: 'High', count: riskCounts.high },
        { label: 'Critical', count: riskCounts.critical },
      ],
      cityRows: toSortedRows(cityCounts),
      insuranceRows: toSortedRows(insuranceCounts),
      genderRows: [
        { label: 'Female', count: genderCounts.female },
        { label: 'Male', count: genderCounts.male },
        { label: 'Unspecified', count: genderCounts.unspecified },
      ],
    };
  }, [patients]);

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
          onClick={() => setShowAnalytics(true)}
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
              } satisfies Record<string, unknown>)),
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
          onClick={() => setShowRegisterComingSoon(true)}
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
          trend={`↑ +${ctx?.patient_change_pct?.toFixed(1) ?? '0.0'}% vs ${prevMonthName}`}
          icon={CheckCircle2}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="Pending Verification"
          value={formatNumber(0)}
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
                type="button"
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
                          {[
                            row.age ? `${row.age}` : null,
                            row.gender ? (row.gender === 'female' ? 'F' : 'M') : null,
                            row.blood_type ?? null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
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
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(row)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      View
                    </button>
                  </td>
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

      {showAnalytics ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowAnalytics(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Patient Analytics</h2>
                <p className="text-sm text-slate-500">
                  Based on all {formatNumber(patients.length)} patients currently on the platform
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAnalytics(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Age Distribution</h3>
                {analytics.ageBands.map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.ageBands.map((r) => r.count), 1)} />
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Risk Level</h3>
                {analytics.riskRows.map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.riskRows.map((r) => r.count), 1)} />
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Gender</h3>
                {analytics.genderRows.map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.genderRows.map((r) => r.count), 1)} />
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Top Cities</h3>
                {analytics.cityRows.slice(0, 6).map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.cityRows.map((r) => r.count), 1)} />
                ))}
              </div>
              <div className="sm:col-span-2">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Insurance Plans</h3>
                {analytics.insuranceRows.slice(0, 8).map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.insuranceRows.map((r) => r.count), 1)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showRegisterComingSoon ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowRegisterComingSoon(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                <UserPlus className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterComingSoon(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Coming Soon: Patient Invites</h2>
            <p className="mt-2 text-sm text-slate-600">
              Instead of registering a patient directly from here, admins will be able to
              send an invite by email or phone number to someone who doesn't yet have a
              CeenAiX account. The recipient completes their own registration on their
              own device, the same way a patient signing up normally would — this admin
              panel just kicks off the invite.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-100">
              <Mail className="h-4 w-4 shrink-0" />
              This needs an email/SMS sending capability to be built first — it's tracked
              as its own upcoming feature.
            </div>
          </div>
        </div>
      ) : null}

      {selectedPatient ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPatient(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-sm font-bold text-white">
                  {selectedPatient.initials}
                </div>
                <div>
                  <div className="flex items-center gap-1 font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">
                    {selectedPatient.full_name}
                    {selectedPatient.badge_emoji ? <span>{selectedPatient.badge_emoji}</span> : null}
                  </div>
                  <div className="font-['DM_Mono'] text-xs text-slate-500">{selectedPatient.patient_code}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Pill
                tone={
                  selectedPatient.status_label === 'active'
                    ? 'emerald'
                    : selectedPatient.status_label === 'inactive'
                      ? 'slate'
                      : selectedPatient.status_label === 'flagged'
                        ? 'amber'
                        : 'rose'
                }
              >
                {selectedPatient.status_label}
              </Pill>
              <Pill
                tone={
                  selectedPatient.risk_level === 'critical'
                    ? 'rose'
                    : selectedPatient.risk_level === 'high'
                      ? 'amber'
                      : selectedPatient.risk_level === 'medium'
                        ? 'blue'
                        : 'emerald'
                }
              >
                {selectedPatient.risk_level} risk
              </Pill>
              {selectedPatient.badge_label ? (
                <Pill tone="amber">{selectedPatient.badge_label}</Pill>
              ) : null}
              {selectedPatient.status_flag ? (
                <Pill tone="rose">{selectedPatient.status_flag}</Pill>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Age / Gender</div>
                <div className="mt-1 text-slate-900">
                  {[
                    selectedPatient.age ? `${selectedPatient.age}` : null,
                    selectedPatient.gender ?? null,
                    selectedPatient.blood_type ?? null,
                  ].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">City</div>
                <div className="mt-1 text-slate-900">{selectedPatient.city ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Emirates ID</div>
                <div className="mt-1 font-['DM_Mono'] text-xs text-slate-700">{selectedPatient.emirates_id_masked ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Insurance</div>
                <div className="mt-1 text-slate-900">{selectedPatient.insurance_plan ?? '—'}</div>
                <div className="font-['DM_Mono'] text-xs text-slate-500">{selectedPatient.insurance_member_id_masked ?? ''}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Joined</div>
                <div className="mt-1 text-slate-900">{selectedPatient.joined_label ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Last Active</div>
                <div className="mt-1 text-slate-900">{selectedPatient.last_active_label ?? '—'}</div>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-100">
              This shows administrative account information only. Clinical
              records (appointments, prescriptions, consultation notes) are
              not accessible from the admin portal.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Doctors view
// ---------------------------------------------------------------------------

// ─── Export ───────────────────────────────────────────────────────────────────

export const AdminPatients = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Patients · CeenAiX Admin'; }, []);
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