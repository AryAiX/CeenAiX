import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal } from '../../hooks/use-clinic-portal';

export const ClinicPatients = () => {
  const { t } = useTranslation('common');
  const { data } = useClinicPortal();

  const patients = useMemo(() => {
    const map = new Map<string, { name: string; phone: string | null; count: number }>();
    for (const appt of data?.appointments ?? []) {
      const existing = map.get(appt.patient_id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(appt.patient_id, {
          name: appt.patient_name ?? t('clinic.patients.unknown'),
          phone: appt.patient_phone,
          count: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [data?.appointments, t]);

  return (
    <ClinicPageLayout title={t('clinic.patients.title')} subtitle={t('clinic.patients.subtitle')}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm m-4 sm:m-6">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('clinic.patients.name')}</th>
              <th className="px-4 py-3">{t('clinic.patients.phone')}</th>
              <th className="px-4 py-3">{t('clinic.patients.visits')}</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.name + p.phone} className="border-t border-slate-100">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.phone ?? '—'}</td>
                <td className="px-4 py-3">{p.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ClinicPageLayout>
  );
};
