import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Stethoscope, Activity, CircleDollarSign, CheckCircle2, Search } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, formatAed, exportRowsToCsv, type AdminContext } from './AdminShell';
import { supabase } from '../../lib/supabase';

type DoctorFilter = 'all' | 'pending' | 'expiring' | 'flagged';

const AdminDoctorsView = ({ context }: { context: AdminContext }) => {
  const navigate = useNavigate();
  const ctx = context.dashboard?.context;
  const doctors = context.doctors;
  const [filter, setFilter] = useState<DoctorFilter>('all');
  const [search, setSearch] = useState('');
  const [busyDoctorId, setBusyDoctorId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const setDoctorVerificationStatus = async (doctorId: string, verified: boolean) => {
    setVerifyError(null);
    setBusyDoctorId(doctorId);
    const nowIso = new Date().toISOString();
    const update = verified
      ? { dha_license_verified: true, dha_verified_at: nowIso, updated_at: nowIso }
      : { dha_license_verified: false, dha_verified_at: null, updated_at: nowIso };
    const { error: updateError } = await supabase
      .from('doctor_profiles')
      .update(update)
      .eq('user_id', doctorId);
    setBusyDoctorId(null);
    if (updateError) {
      setVerifyError(updateError.message);
      return;
    }
    context.refetchAll();
  };

  const filtered = useMemo(() => {
    let rows = doctors;
    if (filter === 'pending') rows = rows.filter((d) => d.status_label === 'pending');
    else if (filter === 'expiring') rows = rows.filter((d) => d.status_label === 'expiring');
    else if (filter === 'flagged')
      rows = rows.filter((d) => d.status_label === 'flagged' || d.status_label === 'suspended');
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (d) =>
          d.full_name.toLowerCase().includes(q) ||
          (d.specialty ?? '').toLowerCase().includes(q) ||
          (d.clinic_name ?? '').toLowerCase().includes(q) ||
          (d.dha_license ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [doctors, filter, search]);

  const expiring = doctors.filter((d) => d.status_label === 'expiring');
  const expiredOrSuspended = doctors.filter((d) => d.status_label === 'suspended');
  const pending = doctors.filter((d) => d.status_label === 'pending');

  const tabs: { key: DoctorFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All Doctors', count: doctors.length },
    { key: 'pending', label: 'Pending Verification', count: pending.length },
    { key: 'expiring', label: 'License Alerts', count: expiring.length },
    {
      key: 'flagged',
      label: 'Flagged / Suspended',
      count: doctors.filter((d) => d.status_label === 'flagged' || d.status_label === 'suspended').length,
    },
  ];

  return (
    <div className="space-y-5">
      {verifyError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {verifyError}
        </div>
      ) : null}
      <PageHeader title="Doctors" subtitle="DHA license verification & platform-wide doctor management">
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
              filtered.map((d) => ({
                full_name: d.full_name,
                specialty: d.specialty ?? '',
                clinic_name: d.clinic_name ?? '',
                dha_license: d.dha_license ?? '',
                license_expires_at: d.license_expires_at ?? '',
                status_label: d.status_label,
              } satisfies Record<string, unknown>)),
              `doctors-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={!filtered.length}
        >
          Export
        </button>
        <button
          type="button"
          // Force the register page to sign-out the admin first (?reset=1)
          // so the existing session doesn't bounce them back to /auth/onboarding
          // before the new doctor record can be created.
          onClick={() => navigate('/auth/register?role=doctor&reset=1')}
          className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Add Doctor
        </button>
      </PageHeader>

      <Card className="!p-4">
        <div className="grid gap-2 md:grid-cols-3">
          {expiredOrSuspended.length ? (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <span className="font-semibold text-rose-700">
                {expiredOrSuspended.length} license expired — account auto-suspended
              </span>
            </div>
          ) : null}
          {expiring.length ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-700">
                {expiring.length} license{expiring.length > 1 ? 's' : ''} expiring in &lt;30 days
              </span>
            </div>
          ) : null}
          {pending.length ? (
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-700">
                {pending.length} applications pending verification · ready to approve
              </span>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiTile
          label="Verified Doctors"
          value={formatNumber(ctx?.verified_doctors ?? 0)}
          trend={`↑ +${ctx?.doctors_added_this_month ?? 0} this month`}
          icon={Stethoscope}
        />
        <KpiTile
          label="Pending Verification"
          value={formatNumber(ctx?.pending_doctors ?? pending.length)}
          caption="Ready to approve"
          icon={ClipboardList}
          iconTone="bg-amber-50 text-amber-600 ring-amber-100"
        />
        <KpiTile
          label="Active Now"
          value={formatNumber(ctx?.doctors_active_now ?? 0)}
          caption="In sessions"
          icon={Activity}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="License Alerts"
          value={formatNumber(ctx?.doctor_license_alerts ?? expiring.length)}
          caption={`${expiring.length} upcoming · ${expiredOrSuspended.length} expired`}
          icon={AlertTriangle}
          iconTone="bg-rose-50 text-rose-600 ring-rose-100"
        />
        <KpiTile
          label="Platform Fees (MTD)"
          value={formatAed(ctx?.doctor_fees_mtd_aed ?? 0)}
          caption="From verified doctors · 8% fee"
          icon={CircleDollarSign}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
        <KpiTile
          label="Avg Doctor Rating"
          value={`${ctx?.doctor_avg_rating?.toFixed(1) ?? '—'} ★`}
          caption="Verified reviews"
          icon={CheckCircle2}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
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
                {tab.label} <span className="opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, DHA license, specialty, clinic..."
            className="w-full bg-transparent placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2">Doctor</th>
                <th className="px-3 py-2">DHA License</th>
                <th className="px-3 py-2">Specialty</th>
                <th className="px-3 py-2">Clinic</th>
                <th className="px-3 py-2">Consults · Rating · Expiry</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
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
                            row.gender === 'female' ? 'F' : row.gender === 'male' ? 'M' : null,
                            row.nationality ?? null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-['DM_Mono'] text-xs font-bold text-slate-700">{row.dha_license}</div>
                    <Pill tone={row.dha_verified ? 'emerald' : 'amber'}>
                      {row.dha_verified ? '✅ DHA Verified' : '⏳ Pending'}
                    </Pill>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-900">{row.specialty ?? '—'}</div>
                    {row.specialty_sub ? <div className="text-xs text-slate-500">{row.specialty_sub}</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-700">{row.clinic_name ?? '—'}</div>
                    <div className="text-xs text-slate-500">{row.city ?? ''}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div className="font-bold text-slate-700">
                      {formatNumber(row.consults_lifetime)} ·{' '}
                      <span className="text-slate-500">{row.consults_recent_label}</span>
                    </div>
                    <div className="text-slate-700">
                      {row.rating ? `${row.rating.toFixed(1)} (${row.rating_count})` : '—'}
                    </div>
                    <div className="text-slate-500">{row.license_expires_label}</div>
                    {row.reminder_status ? (
                      <div className="text-[11px] text-slate-500">{row.reminder_status}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <Pill
                      tone={
                        row.status_label === 'verified'
                          ? 'emerald'
                          : row.status_label === 'expiring'
                            ? 'amber'
                            : row.status_label === 'flagged'
                              ? 'amber'
                              : row.status_label === 'suspended'
                                ? 'rose'
                                : 'slate'
                      }
                    >
                      {row.status_label === 'verified'
                        ? '✅ Verified'
                        : row.status_label === 'expiring'
                          ? '⚠️ Expiring'
                          : row.status_label === 'flagged'
                            ? '🚩 Flagged'
                            : row.status_label === 'suspended'
                              ? '⛔ Suspended'
                              : '⏳ Pending'}
                    </Pill>
                  </td>
                  <td className="px-3 py-3">
                    {row.status_label === 'pending' ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => void setDoctorVerificationStatus(row.id, true)}
                          disabled={busyDoctorId === row.id}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyDoctorId === row.id ? '…' : 'OK'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void setDoctorVerificationStatus(row.id, false)}
                          disabled={busyDoctorId === row.id}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/doctors/${row.id}`)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No doctors match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Showing {filtered.length} of {doctors.length} doctors
        </div>
      </Card>
    </div>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const AdminDoctors = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Doctors · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="doctors" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : (
        <AdminDoctorsView context={context} />
      )}
    </AdminShell>
  );
};