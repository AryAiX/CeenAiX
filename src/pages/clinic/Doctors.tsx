import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal, useClinicPortalActions } from '../../hooks/use-clinic-portal';

export const ClinicDoctors = () => {
  const { t } = useTranslation('common');
  const { data, loading, refetch } = useClinicPortal();
  const actions = useClinicPortalActions();
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    license_number: '',
    specialization: '',
    consultation_fee: 300,
    telemedicine_fee: 250,
    follow_up_fee: 200,
  });

  const doctors = useMemo(() => {
    const list = data?.doctors ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (d) =>
        d.full_name.toLowerCase().includes(q) ||
        (d.specialization ?? '').toLowerCase().includes(q) ||
        (d.email ?? '').toLowerCase().includes(q),
    );
  }, [data?.doctors, query]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await actions.inviteDoctor({
        ...form,
        service_ids: data?.services.slice(0, 1).map((s) => s.id) ?? [],
        schedule_json: { days: ['Mon', 'Tue', 'Wed', 'Thu'], hours: '09:00-17:00' },
      });
      setMessage(
        result.mode === 'linked'
          ? t('clinic.doctors.linkedSuccess')
          : t('clinic.doctors.inviteSuccess'),
      );
      setShowForm(false);
      await refetch();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('clinic.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ClinicPageLayout
      title={t('clinic.doctors.title')}
      subtitle={t('clinic.doctors.subtitle')}
      actions={
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          {t('clinic.doctors.addDoctor')}
        </button>
      }
    >
      <div className="space-y-4 p-4 sm:p-6">
        {message ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{message}</div>
        ) : null}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('clinic.doctors.search')}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('clinic.doctors.colName')}</th>
                <th className="px-4 py-3">{t('clinic.doctors.colSpecialty')}</th>
                <th className="px-4 py-3">{t('clinic.doctors.colStatus')}</th>
                <th className="px-4 py-3">{t('clinic.doctors.colFee')}</th>
                <th className="px-4 py-3">{t('clinic.doctors.colAppts')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    {t('clinic.loading')}
                  </td>
                </tr>
              ) : doctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    {t('clinic.doctors.empty')}
                  </td>
                </tr>
              ) : (
                doctors.map((doctor) => (
                  <tr key={doctor.staff_id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{doctor.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{doctor.specialization ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        {doctor.invitation_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      AED {doctor.consultation_fee ?? doctor.profile_consultation_fee ?? '—'}
                    </td>
                    <td className="px-4 py-3">{doctor.appointments_this_month}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/clinic/doctors/${doctor.staff_id}`}
                        className="text-sm font-semibold text-teal-700 hover:text-teal-800"
                      >
                        {t('clinic.actions.view')}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showForm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <form
              onSubmit={(e) => void handleInvite(e)}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            >
              <h3 className="text-lg font-bold text-slate-900">{t('clinic.doctors.addDoctor')}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['full_name', t('clinic.doctors.fieldName')],
                    ['email', t('clinic.doctors.fieldEmail')],
                    ['phone', t('clinic.doctors.fieldPhone')],
                    ['license_number', t('clinic.doctors.fieldLicense')],
                    ['specialization', t('clinic.doctors.fieldSpecialty')],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="font-medium text-slate-700">{label}</span>
                    <input
                      required={key !== 'phone'}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                ))}
                {(
                  [
                    ['consultation_fee', t('clinic.doctors.fieldConsultFee')],
                    ['telemedicine_fee', t('clinic.doctors.fieldTeleFee')],
                    ['follow_up_fee', t('clinic.doctors.fieldFollowUpFee')],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="font-medium text-slate-700">{label}</span>
                    <input
                      type="number"
                      min={0}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600">
                  {t('clinic.actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? t('clinic.actions.saving') : t('clinic.doctors.submitInvite')}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </ClinicPageLayout>
  );
};
