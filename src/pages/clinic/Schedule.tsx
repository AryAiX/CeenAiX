import { useTranslation } from 'react-i18next';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal } from '../../hooks/use-clinic-portal';

export const ClinicSchedule = () => {
  const { t } = useTranslation('common');
  const { data } = useClinicPortal();

  return (
    <ClinicPageLayout title={t('clinic.schedule.title')} subtitle={t('clinic.schedule.subtitle')}>
      <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
        {(data?.doctors ?? []).map((doctor) => (
          <article key={doctor.staff_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-900">{doctor.full_name}</h3>
            <p className="text-sm text-slate-500">{doctor.specialization ?? t('clinic.doctors.general')}</p>
            <div className="mt-3 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900">
              <p>{t('clinic.schedule.hours')}: {(doctor.schedule_json as { hours?: string }).hours ?? '09:00-17:00'}</p>
              <p className="mt-1">{t('clinic.schedule.slot')}: {doctor.slot_duration_min} min</p>
            </div>
          </article>
        ))}
      </div>
    </ClinicPageLayout>
  );
};
