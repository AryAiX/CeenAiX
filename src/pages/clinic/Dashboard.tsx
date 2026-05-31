import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CalendarDays, Plus, Stethoscope, TrendingUp, Users } from 'lucide-react';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal } from '../../hooks/use-clinic-portal';
import { formatLocaleDigits } from '../../lib/i18n-ui';

export const ClinicDashboard = () => {
  const { t, i18n } = useTranslation('common');
  const { data, loading } = useClinicPortal();

  const kpis = useMemo(
    () => [
      {
        label: t('clinic.dashboard.totalDoctors'),
        value: data?.kpis.total_doctors ?? 0,
        icon: Stethoscope,
      },
      {
        label: t('clinic.dashboard.activeDoctors'),
        value: data?.kpis.active_doctors ?? 0,
        icon: Users,
      },
      {
        label: t('clinic.dashboard.appointmentsMonth'),
        value: data?.kpis.appointments_this_month ?? 0,
        icon: CalendarDays,
      },
      {
        label: t('clinic.dashboard.revenueMonth'),
        value: data?.kpis.revenue_this_month ?? 0,
        icon: TrendingUp,
        prefix: 'AED ',
      },
    ],
    [data?.kpis, t],
  );

  const recentAppointments = data?.appointments.slice(0, 6) ?? [];

  return (
    <ClinicPageLayout title={t('clinic.dashboard.title')} subtitle={t('clinic.dashboard.subtitle')}>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/clinic/doctors"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            {t('clinic.dashboard.addDoctor')}
          </Link>
          <Link
            to="/clinic/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('clinic.dashboard.updatePricing')}
          </Link>
          <Link
            to="/clinic/schedule"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('clinic.dashboard.viewSchedule')}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, prefix }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <div className="rounded-xl bg-teal-50 p-2 text-teal-700">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 font-mono text-3xl font-bold text-slate-900">
                {loading ? '…' : `${prefix ?? ''}${formatLocaleDigits(value, i18n.language)}`}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{t('clinic.dashboard.recentActivity')}</h2>
            <ul className="mt-4 space-y-3">
              {recentAppointments.length === 0 ? (
                <li className="text-sm text-slate-500">{t('clinic.dashboard.noActivity')}</li>
              ) : (
                recentAppointments.map((appt) => (
                  <li key={appt.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{appt.patient_name ?? '—'}</p>
                      <p className="text-xs text-slate-500">
                        {appt.doctor_name} · {new Date(appt.scheduled_at).toLocaleString(i18n.language)}
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                      {appt.status}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{t('clinic.dashboard.doctorsOverview')}</h2>
            <ul className="mt-4 space-y-3">
              {(data?.doctors ?? []).slice(0, 5).map((doctor) => (
                <li key={doctor.staff_id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{doctor.full_name}</p>
                    <p className="text-xs text-slate-500">{doctor.specialization ?? t('clinic.doctors.general')}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    {formatLocaleDigits(doctor.appointments_this_month, i18n.language)} {t('clinic.dashboard.apptsShort')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </ClinicPageLayout>
  );
};
