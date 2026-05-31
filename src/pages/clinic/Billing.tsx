import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal } from '../../hooks/use-clinic-portal';
import { formatLocaleDigits } from '../../lib/i18n-ui';

export const ClinicBilling = () => {
  const { t, i18n } = useTranslation('common');
  const { data } = useClinicPortal();

  const byDoctor = useMemo(() => {
    const map = new Map<string, number>();
    for (const appt of data?.appointments ?? []) {
      if (appt.status !== 'completed') continue;
      const doctor = data?.doctors.find((d) => d.doctor_user_id === appt.doctor_id);
      const fee = doctor?.consultation_fee ?? doctor?.profile_consultation_fee ?? 0;
      map.set(appt.doctor_name ?? appt.doctor_id, (map.get(appt.doctor_name ?? appt.doctor_id) ?? 0) + fee);
    }
    return [...map.entries()];
  }, [data?.appointments, data?.doctors]);

  if (data && data.portal_role !== 'clinic_admin') {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <ClinicPageLayout title={t('clinic.billing.title')} subtitle={t('clinic.billing.subtitle')}>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">{t('clinic.billing.monthSummary')}</p>
          <p className="mt-2 font-mono text-4xl font-bold text-slate-900">
            AED {formatLocaleDigits(data?.kpis.revenue_this_month ?? 0, i18n.language)}
          </p>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">{t('clinic.billing.byDoctor')}</h2>
          <ul className="mt-3 space-y-2">
            {byDoctor.map(([name, amount]) => (
              <li key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <span className="font-mono">AED {formatLocaleDigits(amount, i18n.language)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ClinicPageLayout>
  );
};
