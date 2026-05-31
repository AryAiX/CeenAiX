import { useTranslation } from 'react-i18next';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal } from '../../hooks/use-clinic-portal';

export const ClinicPricing = () => {
  const { t, i18n } = useTranslation('common');
  const { data } = useClinicPortal();
  const isArabic = i18n.language.startsWith('ar');

  return (
    <ClinicPageLayout title={t('clinic.pricing.title')} subtitle={t('clinic.pricing.subtitle')}>
      <div className="space-y-6 p-4 sm:p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">{t('clinic.pricing.clinicDefaults')}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">{t('clinic.services.title')}</th>
                  <th className="py-2">{t('clinic.pricing.defaultPrice')}</th>
                  <th className="py-2">{t('clinic.pricing.duration')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.services ?? []).map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-2">{isArabic ? s.name_ar : s.name_en}</td>
                    <td className="py-2 font-mono">AED {s.default_price}</td>
                    <td className="py-2">{s.default_duration_min} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">{t('clinic.pricing.doctorMatrix')}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">{t('clinic.doctors.colName')}</th>
                  <th className="py-2">{t('clinic.doctors.fieldConsultFee')}</th>
                  <th className="py-2">{t('clinic.doctors.fieldTeleFee')}</th>
                  <th className="py-2">{t('clinic.doctors.fieldFollowUpFee')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.doctors ?? []).map((d) => (
                  <tr key={d.staff_id} className="border-t border-slate-100">
                    <td className="py-2">{d.full_name}</td>
                    <td className="py-2 font-mono">{d.consultation_fee ?? d.profile_consultation_fee ?? '—'}</td>
                    <td className="py-2 font-mono">{d.telemedicine_fee ?? '—'}</td>
                    <td className="py-2 font-mono">{d.follow_up_fee ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">{t('clinic.pricing.auditLog')}</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {(data?.pricing_audit ?? []).length === 0 ? (
              <li>{t('clinic.pricing.noAudit')}</li>
            ) : (
              data?.pricing_audit.map((entry) => (
                <li key={entry.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  {entry.field_name} · {entry.entity_type} · {new Date(entry.changed_at).toLocaleString(i18n.language)}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </ClinicPageLayout>
  );
};
