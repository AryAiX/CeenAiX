import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Link2, Plus, RefreshCcw, Stethoscope, UserPlus } from 'lucide-react';
import { OpsShell } from '../../components/OpsShell';
import {
  fetchAdminClinicDoctors,
  linkDoctorToClinic,
  onboardClinic,
  setClinicStatus,
  useAdminClinics,
  useAdminUnlinkedDoctors,
} from '../../hooks';
import { ADMIN_NAV_ITEMS } from './navItems';
import type { AdminClinicDoctorRecord, AdminClinicRecord } from '../../types';

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

export const AdminClinics = () => {
  const { t, i18n } = useTranslation('common');
  const isArabic = i18n.language.startsWith('ar');
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

  const handleOnboard = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await onboardClinic(form);
      setMessage(
        result.admin_linked
          ? t('admin.clinics.onboardSuccessLinked')
          : t('admin.clinics.onboardSuccess'),
      );
      setShowOnboard(false);
      setForm(emptyForm);
      await refetch();
      setSelectedClinicId(result.facility_id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('admin.clinics.onboardFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (clinic: AdminClinicRecord) => {
    setMessage(null);
    try {
      await setClinicStatus(clinic.facility_id, !clinic.is_active);
      setMessage(
        clinic.is_active ? t('admin.clinics.suspendedSuccess') : t('admin.clinics.reactivatedSuccess'),
      );
      await refetch();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('admin.clinics.statusFailed'));
    }
  };

  const handleMigrate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!migrateClinicId || !migrateDoctorId) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await linkDoctorToClinic(migrateClinicId, migrateDoctorId);
      setMessage(t('admin.clinics.migrateSuccess'));
      setShowMigrate(false);
      setMigrateDoctorId('');
      await Promise.all([refetch(), unlinked.refetch()]);
      if (selectedClinicId === migrateClinicId) {
        setClinicDoctors(await fetchAdminClinicDoctors(migrateClinicId));
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('admin.clinics.migrateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = (clinic: AdminClinicRecord) =>
    isArabic ? clinic.name_ar ?? clinic.name_en ?? clinic.name : clinic.name_en ?? clinic.name;

  return (
    <OpsShell
      title={t('admin.clinics.title')}
      subtitle={t('admin.clinics.subtitle')}
      eyebrow="Admin Portal"
      navItems={ADMIN_NAV_ITEMS(t)}
      accent="slate"
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {t('admin.clinics.loadFailed')}: {error}
          <button type="button" onClick={() => void refetch()} className="ml-2 font-semibold underline">
            {t('clinic.actions.retry')}
          </button>
        </div>
      ) : null}

      {message ? (
        <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {message}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.clinics.search')}
          className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={() => setShowMigrate(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <Link2 className="h-4 w-4" />
          {t('admin.clinics.migrateDoctor')}
        </button>
        <button
          type="button"
          onClick={() => setShowOnboard(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          {t('admin.clinics.onboardClinic')}
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
        >
          <RefreshCcw className="h-4 w-4" />
          {t('clinic.actions.retry')}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">{t('admin.clinics.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500">
              {t('admin.clinics.empty')}
            </div>
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
                      <h3 className="font-bold text-slate-900">{displayName(clinic)}</h3>
                      <p className="text-sm text-slate-500">
                        {[clinic.city, clinic.organization_name].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      clinic.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {clinic.is_active ? t('admin.clinics.active') : t('admin.clinics.suspended')}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase text-slate-400">{t('admin.clinics.doctors')}</dt>
                    <dd className="font-mono font-semibold text-slate-900">{clinic.doctor_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">{t('admin.clinics.admins')}</dt>
                    <dd className="font-mono font-semibold text-slate-900">{clinic.admin_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">{t('admin.clinics.pendingInvites')}</dt>
                    <dd className="font-mono font-semibold text-slate-900">{clinic.pending_invitations}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-400">{t('admin.clinics.license')}</dt>
                    <dd className="truncate font-mono text-slate-700">{clinic.license_number ?? '—'}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClinicId(clinic.facility_id)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
                  >
                    {t('admin.clinics.viewDoctors')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(clinic)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
                  >
                    {clinic.is_active ? t('admin.clinics.suspend') : t('admin.clinics.reactivate')}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            <h2 className="font-bold text-slate-900">
              {selectedClinic ? displayName(selectedClinic) : t('admin.clinics.doctorsPanel')}
            </h2>
          </div>
          {!selectedClinic ? (
            <p className="mt-3 text-sm text-slate-500">{t('admin.clinics.selectClinic')}</p>
          ) : doctorsLoading ? (
            <p className="mt-3 text-sm text-slate-500">{t('admin.clinics.loadingDoctors')}</p>
          ) : clinicDoctors.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t('admin.clinics.noDoctors')}</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {clinicDoctors.map((doctor) => (
                <li key={doctor.staff_id} className="py-3 text-sm">
                  <p className="font-semibold text-slate-900">{doctor.full_name}</p>
                  <p className="text-slate-500">{doctor.specialization ?? doctor.email ?? '—'}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {doctor.invitation_status}
                    {doctor.consultation_fee != null ? ` · AED ${doctor.consultation_fee}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {showOnboard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(e) => void handleOnboard(e)}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-bold text-slate-900">{t('admin.clinics.onboardClinic')}</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">{t('admin.clinics.onboardHint')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['name_en', t('admin.clinics.fieldNameEn'), true],
                  ['name_ar', t('admin.clinics.fieldNameAr'), false],
                  ['address', t('admin.clinics.fieldAddress'), false],
                  ['city', t('admin.clinics.fieldCity'), false],
                  ['phone', t('admin.clinics.fieldPhone'), false],
                  ['email', t('admin.clinics.fieldEmail'), false],
                  ['license_number', t('admin.clinics.fieldLicense'), false],
                  ['admin_name', t('admin.clinics.fieldAdminName'), false],
                  ['admin_email', t('admin.clinics.fieldAdminEmail'), false],
                ] as const
              ).map(([key, label, required]) => (
                <label key={key} className="block text-sm">
                  <span className="font-medium text-slate-700">{label}</span>
                  <input
                    required={required}
                    value={form[key]}
                    onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowOnboard(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600">
                {t('clinic.actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? t('clinic.actions.saving') : t('admin.clinics.createClinic')}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showMigrate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(e) => void handleMigrate(e)}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900">{t('admin.clinics.migrateDoctor')}</h3>
            <p className="mt-2 text-sm text-slate-500">{t('admin.clinics.migrateHint')}</p>
            <label className="mt-4 block text-sm">
              <span className="font-medium text-slate-700">{t('admin.clinics.selectClinic')}</span>
              <select
                required
                value={migrateClinicId}
                onChange={(e) => setMigrateClinicId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">{t('admin.clinics.chooseClinic')}</option>
                {clinics.map((clinic) => (
                  <option key={clinic.facility_id} value={clinic.facility_id}>
                    {displayName(clinic)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              <span className="font-medium text-slate-700">{t('admin.clinics.unlinkedDoctor')}</span>
              <select
                required
                value={migrateDoctorId}
                onChange={(e) => setMigrateDoctorId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">{t('admin.clinics.chooseDoctor')}</option>
                {(unlinked.data ?? []).map((doctor) => (
                  <option key={doctor.doctor_user_id} value={doctor.doctor_user_id}>
                    {doctor.full_name} {doctor.email ? `(${doctor.email})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowMigrate(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600">
                {t('clinic.actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? t('clinic.actions.saving') : t('admin.clinics.linkDoctor')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </OpsShell>
  );
};
