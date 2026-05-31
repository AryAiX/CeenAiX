import { useTranslation } from 'react-i18next';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal } from '../../hooks/use-clinic-portal';

export const ClinicAnalytics = () => {
  const { t } = useTranslation('common');
  const { data } = useClinicPortal();

  const bySpecialty = (data?.doctors ?? []).reduce<Record<string, number>>((acc, d) => {
    const key = d.specialization ?? t('clinic.doctors.general');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <ClinicPageLayout title={t('clinic.analytics.title')} subtitle={t('clinic.analytics.subtitle')}>
      <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">{t('clinic.analytics.bySpecialty')}</h2>
          <ul className="mt-4 space-y-2">
            {Object.entries(bySpecialty).map(([name, count]) => (
              <li key={name} className="flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-teal-500" style={{ width: `${Math.min(100, count * 25)}%` }} />
                </div>
                <span className="w-32 text-sm text-slate-600">{name}</span>
                <span className="font-mono text-sm">{count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">{t('clinic.analytics.appointmentsTrend')}</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data?.kpis.appointments_this_month ?? 0}</p>
          <p className="text-sm text-slate-500">{t('clinic.analytics.thisMonth')}</p>
        </section>
      </div>
    </ClinicPageLayout>
  );
};
