import { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, ClipboardList, Stethoscope, Activity, CircleDollarSign, CheckCircle2, Mail, Search, UserPlus, X } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, Pill, PageHeader, KpiTile, formatNumber, formatAed, exportRowsToCsv, type AdminContext } from './AdminShell';
import type { AdminDoctorRow } from '../../types';
import { supabase } from '../../lib/supabase';

type DoctorFilter = 'all' | 'pending' | 'expiring' | 'flagged';

const BreakdownBar = ({ label, count, max }: { label: string; count: number; max: number }) => (
  <div className="mb-2">
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="text-slate-500">{count}</span>
    </div>
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div
        className="h-2 rounded-full bg-blue-500"
        style={{ width: max > 0 ? `${(count / max) * 100}%` : '0%' }}
      />
    </div>
  </div>
);

const AdminDoctorsView = ({ context }: { context: AdminContext }) => {
  const ctx = context.dashboard?.context;
  const doctors = context.doctors;
  const [filter, setFilter] = useState<DoctorFilter>('all');
  const [search, setSearch] = useState('');
  const [busyDoctorId, setBusyDoctorId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [rejectNotice, setRejectNotice] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAddDoctorComingSoon, setShowAddDoctorComingSoon] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<AdminDoctorRow | null>(null);

  const setDoctorVerificationStatus = async (doctorId: string, verified: boolean) => {
    setVerifyError(null);
    setRejectNotice(null);
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
    if (!verified) {
      const doctorName = doctors.find((d) => d.id === doctorId)?.full_name ?? 'This doctor';
      setRejectNotice(
        `${doctorName} marked as not verified. Note: rejections aren't tracked as a formal decision yet — they may reappear as pending if they reapply.`,
      );
    }
    context.refetchDoctors();
  };

  useEffect(() => {
    if (!rejectNotice) return;
    const id = setTimeout(() => setRejectNotice(null), 8_000);
    return () => clearTimeout(id);
  }, [rejectNotice]);

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

  const analytics = useMemo(() => {
    const specialtyCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();
    const nationalityCounts = new Map<string, number>();
    const genderCounts = { male: 0, female: 0, unspecified: 0 };
    const ratingBands = [
      { label: '4.5 – 5.0', count: 0 },
      { label: '4.0 – 4.49', count: 0 },
      { label: '3.0 – 3.99', count: 0 },
      { label: 'Below 3.0', count: 0 },
      { label: 'Not yet rated', count: 0 },
    ];

    doctors.forEach((d) => {
      const specialty = d.specialty ?? 'Unspecified';
      specialtyCounts.set(specialty, (specialtyCounts.get(specialty) ?? 0) + 1);

      const city = d.city ?? 'Unknown';
      cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);

      const nationality = d.nationality ?? 'Unspecified';
      nationalityCounts.set(nationality, (nationalityCounts.get(nationality) ?? 0) + 1);

      if (d.gender === 'male') genderCounts.male += 1;
      else if (d.gender === 'female') genderCounts.female += 1;
      else genderCounts.unspecified += 1;

      if (d.rating == null) ratingBands[4].count += 1;
      else if (d.rating >= 4.5) ratingBands[0].count += 1;
      else if (d.rating >= 4.0) ratingBands[1].count += 1;
      else if (d.rating >= 3.0) ratingBands[2].count += 1;
      else ratingBands[3].count += 1;
    });

    const toSortedRows = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    return {
      specialtyRows: toSortedRows(specialtyCounts),
      cityRows: toSortedRows(cityCounts),
      nationalityRows: toSortedRows(nationalityCounts),
      genderRows: [
        { label: 'Female', count: genderCounts.female },
        { label: 'Male', count: genderCounts.male },
        { label: 'Unspecified', count: genderCounts.unspecified },
      ],
      ratingBands,
    };
  }, [doctors]);

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
      {rejectNotice ? (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <span>{rejectNotice}</span>
          <button
            type="button"
            onClick={() => setRejectNotice(null)}
            className="shrink-0 text-amber-600 hover:text-amber-800"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <PageHeader title="Doctors" subtitle="DHA license verification & platform-wide doctor management">
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
          onClick={() => setShowAddDoctorComingSoon(true)}
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
                      onClick={() => setSelectedDoctor(row)}
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
                <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Doctor Analytics</h2>
                <p className="text-sm text-slate-500">
                  Based on all {formatNumber(doctors.length)} doctors on the platform
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
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Top Specialties</h3>
                {analytics.specialtyRows.slice(0, 6).map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.specialtyRows.map((r) => r.count), 1)} />
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Rating Distribution</h3>
                {analytics.ratingBands.map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.ratingBands.map((r) => r.count), 1)} />
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
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Nationality</h3>
                {analytics.nationalityRows.slice(0, 8).map((row) => (
                  <BreakdownBar key={row.label} label={row.label} count={row.count} max={Math.max(...analytics.nationalityRows.map((r) => r.count), 1)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAddDoctorComingSoon ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowAddDoctorComingSoon(false)}
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
                onClick={() => setShowAddDoctorComingSoon(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Coming Soon: Doctor Invites</h2>
            <p className="mt-2 text-sm text-slate-600">
              Instead of registering a doctor directly from here, admins will be able to
              send an invite by email or phone number to a doctor who doesn't yet have a
              CeenAiX account. The doctor completes their own registration and license
              submission on their own device — this admin panel just kicks off the
              invite and tracks it through to DHA verification.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-100">
              <Mail className="h-4 w-4 shrink-0" />
              This needs an email/SMS sending capability to be built first — it's tracked
              as its own upcoming feature.
            </div>
          </div>
        </div>
      ) : null}

      {selectedDoctor ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedDoctor(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                  {selectedDoctor.initials}
                </div>
                <div>
                  <div className="flex items-center gap-1 font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">
                    {selectedDoctor.full_name}
                    {selectedDoctor.badge_emoji ? <span>{selectedDoctor.badge_emoji}</span> : null}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedDoctor.specialty ?? '—'}
                    {selectedDoctor.specialty_sub ? ` · ${selectedDoctor.specialty_sub}` : ''}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Pill tone={selectedDoctor.dha_verified ? 'emerald' : 'amber'}>
                {selectedDoctor.dha_verified ? '✅ DHA Verified' : '⏳ Pending'}
              </Pill>
              <Pill
                tone={
                  selectedDoctor.status_label === 'verified'
                    ? 'emerald'
                    : selectedDoctor.status_label === 'suspended'
                      ? 'rose'
                      : 'amber'
                }
              >
                {selectedDoctor.status_label}
              </Pill>
              {selectedDoctor.badge_label ? <Pill tone="amber">{selectedDoctor.badge_label}</Pill> : null}
              {selectedDoctor.status_flag ? <Pill tone="rose">{selectedDoctor.status_flag}</Pill> : null}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">DHA License</div>
                <div className="mt-1 font-['DM_Mono'] text-xs text-slate-700">{selectedDoctor.dha_license ?? '—'}</div>
                <div className="text-xs text-slate-500">{selectedDoctor.license_expires_label ?? ''}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Age / Gender / Nationality</div>
                <div className="mt-1 text-slate-900">
                  {[
                    selectedDoctor.age ? `${selectedDoctor.age}` : null,
                    selectedDoctor.gender ?? null,
                    selectedDoctor.nationality ?? null,
                  ].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Clinic</div>
                <div className="mt-1 text-slate-900">{selectedDoctor.clinic_name ?? '—'}</div>
                <div className="text-xs text-slate-500">{selectedDoctor.city ?? ''}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Rating</div>
                <div className="mt-1 text-slate-900">
                  {selectedDoctor.rating ? `${selectedDoctor.rating.toFixed(1)} ★ (${selectedDoctor.rating_count})` : 'Not yet rated'}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Consultations</div>
                <div className="mt-1 text-slate-900">
                  {formatNumber(selectedDoctor.consults_lifetime)} lifetime
                  {selectedDoctor.consults_recent_label ? ` · ${selectedDoctor.consults_recent_label}` : ''}
                </div>
                {selectedDoctor.reminder_status ? (
                  <div className="mt-1 text-xs text-slate-500">{selectedDoctor.reminder_status}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
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