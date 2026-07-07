import { useEffect, useMemo, useState } from 'react';
import { Building2, Link2, Plus, RefreshCw, Stethoscope, UserPlus, X } from 'lucide-react';
import AdminShell, {
  useAdminContextValue,
  Card,
  Pill,
  PageHeader,
  KpiTile,
  formatNumber,
  titleCase,
} from './AdminShell';
import {
  fetchAdminClinicDoctors,
  linkDoctorToClinic,
  onboardClinic,
  setClinicStatus,
  useAdminClinics,
  useAdminUnlinkedDoctors,
} from '../../hooks';
import type { AdminClinicDoctorRecord, AdminClinicRecord } from '../../types';

const INVITATION_TONE: Record<string, 'emerald' | 'amber' | 'rose' | 'slate'> = {
  accepted: 'emerald',
  pending: 'amber',
  declined: 'rose',
};

const emptyForm = {
  name_en: '',
  name_ar: '',
  address: '',
  city: 'Dubai',
  phone: '',
  email: '',
  license_number: '',
  admin_name: '',
  admin_email: '',
};

const ClinicsView = () => {
  const { data, loading, error, refetch } = useAdminClinics();
  const unlinked = useAdminUnlinkedDoctors();
  const clinics = useMemo(() => data ?? [], [data]);

  const [search, setSearch] = useState('');
  const [showOnboard, setShowOnboard] = useState(false);
  const [showMigrate, setShowMigrate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [clinicDoctors, setClinicDoctors] = useState<AdminClinicDoctorRecord[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [migrateDoctorId, setMigrateDoctorId] = useState('');
  const [migrateClinicId, setMigrateClinicId] = useState('');

  // Auto-dismiss message after 6 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  // Load doctors when clinic is selected
  useEffect(() => {
    if (!selectedClinicId) {
      setClinicDoctors([]);
      return;
    }
    setDoctorsLoading(true);
    void fetchAdminClinicDoctors(selectedClinicId)
      .then(setClinicDoctors)
      .finally(() => setDoctorsLoading(false));
  }, [selectedClinicId]);

  const selectedClinic = clinics.find((c) => c.facility_id === selectedClinicId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter(
      (clinic) =>
        clinic.name.toLowerCase().includes(q) ||
        (clinic.name_en ?? '').toLowerCase().includes(q) ||
        (clinic.city ?? '').toLowerCase().includes(q) ||
        (clinic.organization_name ?? '').toLowerCase().includes(q),
    );
  }, [clinics, search]);

  const activeCount = clinics.filter((c) => c.is_active).length;
  const totalDoctors = clinics.reduce((sum, c) => sum + c.doctor_count, 0);

  const handleOnboard = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await onboardClinic(form);
      setMessage(result.admin_linked ? 'Clinic created and admin linked.' : 'Clinic created successfully.');
      setShowOnboard(false);
      setForm(emptyForm);
      await refetch();
      setSelectedClinicId(result.facility_id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to onboard clinic.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (clinic: AdminClinicRecord) => {
    setMessage(null);
    try {
      await setClinicStatus(clinic.facility_id, !clinic.is_active);
      setMessage(clinic.is_active ? 'Clinic suspended.' : 'Clinic reactivated.');
      await refetch();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const handleMigrate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!migrateClinicId || !migrateDoctorId) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await linkDoctorToClinic(migrateClinicId, migrateDoctorId);
      setMessage('Doctor linked to clinic successfully.');
      setShowMigrate(false);
      setMigrateDoctorId('');
      setMigrateClinicId('');
      await Promise.all([refetch(), unlinked.refetch()]);
      if (selectedClinicId === migrateClinicId) {
        setClinicDoctors(await fetchAdminClinicDoctors(migrateClinicId));
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to link doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeMigrateModal = () => {
    setShowMigrate(false);
    setMigrateDoctorId('');
    setMigrateClinicId('');
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Clinics" subtitle="Manage clinic facilities, doctors, and onboarding">
        <button
          type="button"
          onClick={() => setShowMigrate(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Link2 className="h-4 w-4" /> Link Doctor
        </button>
        <button
          type="button"
          onClick={() => setShowOnboard(true)}
          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Onboard Clinic
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </PageHeader>

      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load clinics: {error}
          <button type="button" onClick={() => void refetch()} className="ml-2 font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Total Clinics"
          value={formatNumber(clinics.length)}
          caption={`${formatNumber(activeCount)} active`}
          icon={Building2}
          iconTone="bg-teal-50 text-teal-600 ring-teal-100"
        />
        <KpiTile
          label="Active"
          value={formatNumber(activeCount)}
          caption={`${formatNumber(clinics.length - activeCount)} suspended`}
          icon={Building2}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="Suspended"
          value={formatNumber(clinics.length - activeCount)}
          icon={Building2}
          iconTone="bg-rose-50 text-rose-600 ring-rose-100"
        />
        <KpiTile
          label="Total Doctors"
          value={formatNumber(totalDoctors)}
          caption="Across all clinics"
          icon={Stethoscope}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, or organization"
          className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          {loading ? (
            <Card>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <div className="py-12 text-center text-slate-500">
                {search ? 'No clinics match the search.' : 'No clinics found.'}
              </div>
            </Card>
          ) : (
            filtered.map((clinic) => (
              <article
                key={clinic.facility_id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                  selectedClinicId === clinic.facility_id
                    ? 'border-teal-300 ring-2 ring-teal-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {clinic.name_en ?? clinic.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {[clinic.city, clinic.organization_name].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <Pill tone={clinic.is_active ? 'emerald' : 'rose'}>
                    {clinic.is_active ? 'Active' : 'Suspended'}
                  </Pill>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Doctors</dt>
                    <dd className="font-mono font-semibold text-slate-900">{clinic.doctor_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Admins</dt>
                    <dd className="font-mono font-semibold text-slate-900">{clinic.admin_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">Pending Invites</dt>
                    <dd className="font-mono font-semibold text-slate-900">{clinic.pending_invitations}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">License</dt>
                    <dd className="truncate font-mono text-slate-700">{clinic.license_number ?? '—'}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedClinicId(
                        selectedClinicId === clinic.facility_id ? null : clinic.facility_id,
                      )
                    }
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {selectedClinicId === clinic.facility_id ? 'Hide Doctors' : 'View Doctors'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(clinic)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {clinic.is_active ? 'Suspend' : 'Reactivate'}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-teal-600" />
              <h2 className="font-bold text-slate-900">
                {selectedClinic ? (selectedClinic.name_en ?? selectedClinic.name) : 'Doctors Panel'}
              </h2>
            </div>
            {selectedClinic ? (
              <button
                type="button"
                onClick={() => setSelectedClinicId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {!selectedClinic ? (
            <p className="mt-3 text-sm text-slate-500">Select a clinic to view its doctors.</p>
          ) : doctorsLoading ? (
            <div className="mt-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : clinicDoctors.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No doctors linked to this clinic.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {clinicDoctors.map((doctor) => (
                <li key={doctor.staff_id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{doctor.full_name}</p>
                      <p className="text-slate-500">{doctor.specialization ?? doctor.email ?? '—'}</p>
                    </div>
                    <Pill tone={INVITATION_TONE[doctor.invitation_status] ?? 'slate'}>
                      {titleCase(doctor.invitation_status)}
                    </Pill>
                  </div>
                  {doctor.consultation_fee != null ? (
                    <p className="mt-0.5 text-xs text-slate-400">
                      AED {doctor.consultation_fee}
                      {doctor.is_available ? ' · Available' : ' · Unavailable'}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Onboard Clinic Modal */}
      {showOnboard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowOnboard(false)}>
          <form
            onSubmit={(e) => void handleOnboard(e)}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-bold text-slate-900">Onboard New Clinic</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Create a clinic facility and optionally invite an admin user.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['name_en', 'Clinic Name (English)', true],
                  ['name_ar', 'Clinic Name (Arabic)', false],
                  ['address', 'Address', false],
                  ['city', 'City', false],
                  ['phone', 'Phone', false],
                  ['email', 'Email', false],
                  ['license_number', 'License Number', false],
                  ['admin_name', 'Admin Name', false],
                  ['admin_email', 'Admin Email', false],
                ] as const
              ).map(([key, label, required]) => (
                <label key={key} className="block text-sm">
                  <span className="font-medium text-slate-700">
                    {label}{required ? ' *' : ''}
                  </span>
                  <input
                    required={required}
                    value={form[key]}
                    onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOnboard(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-teal-700"
              >
                {submitting ? 'Creating…' : 'Create Clinic'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Link Doctor Modal */}
      {showMigrate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeMigrateModal}>
          <form
            onSubmit={(e) => void handleMigrate(e)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900">Link Doctor to Clinic</h3>
            <p className="mt-2 text-sm text-slate-500">
              Assign an unlinked doctor to a clinic facility.
            </p>
            <label className="mt-4 block text-sm">
              <span className="font-medium text-slate-700">Clinic</span>
              <select
                required
                value={migrateClinicId}
                onChange={(e) => setMigrateClinicId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
              >
                <option value="">Choose a clinic…</option>
                {clinics.map((clinic) => (
                  <option key={clinic.facility_id} value={clinic.facility_id}>
                    {clinic.name_en ?? clinic.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              <span className="font-medium text-slate-700">Unlinked Doctor</span>
              <select
                required
                value={migrateDoctorId}
                onChange={(e) => setMigrateDoctorId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
              >
                <option value="">Choose a doctor…</option>
                {(unlinked.data ?? []).map((doctor) => (
                  <option key={doctor.doctor_user_id} value={doctor.doctor_user_id}>
                    {doctor.full_name}{doctor.email ? ` (${doctor.email})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeMigrateModal}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-teal-700"
              >
                {submitting ? 'Linking…' : 'Link Doctor'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const AdminClinics = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Clinics · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="clinics" context={context}>
      <ClinicsView />
    </AdminShell>
  );
};
