import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal, useClinicPortalActions } from '../../hooks/use-clinic-portal';

export const ClinicAppointments = () => {
  const { t, i18n } = useTranslation('common');
  const { data, loading, refetch } = useClinicPortal();
  const actions = useClinicPortalActions();
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');

  const appointments = useMemo(() => {
    let list = data?.appointments ?? [];
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter);
    if (doctorFilter !== 'all') list = list.filter((a) => a.doctor_id === doctorFilter);
    return list;
  }, [data?.appointments, doctorFilter, statusFilter]);

  const handleCancel = async (id: string) => {
    await actions.updateAppointmentStatus(id, 'cancelled', 'Cancelled by clinic manager');
    await refetch();
  };

  return (
    <ClinicPageLayout title={t('clinic.appointments.title')} subtitle={t('clinic.appointments.subtitle')}>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="all">{t('clinic.filters.allStatuses')}</option>
            {['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="all">{t('clinic.filters.allDoctors')}</option>
            {(data?.doctors ?? []).map((d) => (
              <option key={d.doctor_user_id} value={d.doctor_user_id}>{d.full_name}</option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('clinic.appointments.patient')}</th>
                <th className="px-4 py-3">{t('clinic.appointments.doctor')}</th>
                <th className="px-4 py-3">{t('clinic.appointments.when')}</th>
                <th className="px-4 py-3">{t('clinic.appointments.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{t('clinic.loading')}</td></tr>
              ) : appointments.map((appt) => (
                <tr key={appt.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{appt.patient_name ?? '—'}</td>
                  <td className="px-4 py-3">{appt.doctor_name ?? '—'}</td>
                  <td className="px-4 py-3">{new Date(appt.scheduled_at).toLocaleString(i18n.language)}</td>
                  <td className="px-4 py-3">{appt.status}</td>
                  <td className="px-4 py-3 text-right">
                    {appt.status !== 'cancelled' && appt.status !== 'completed' ? (
                      <button type="button" onClick={() => void handleCancel(appt.id)} className="text-sm font-semibold text-rose-600">
                        {t('clinic.appointments.cancel')}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ClinicPageLayout>
  );
};
