import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal, useClinicPortalActions } from '../../hooks/use-clinic-portal';

export const ClinicDoctorDetail = () => {
  const { staffId } = useParams<{ staffId: string }>();
  const { t } = useTranslation('common');
  const { data, refetch } = useClinicPortal();
  const actions = useClinicPortalActions();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const doctor = useMemo(
    () => data?.doctors.find((d) => d.staff_id === staffId),
    [data?.doctors, staffId],
  );

  const [fees, setFees] = useState({ consultation: 0, telemedicine: 0, follow_up: 0 });

  useEffect(() => {
    if (!doctor) return;
    setFees({
      consultation: doctor.consultation_fee ?? doctor.profile_consultation_fee ?? 0,
      telemedicine: doctor.telemedicine_fee ?? 0,
      follow_up: doctor.follow_up_fee ?? 0,
    });
  }, [doctor]);

  if (!doctor) {
    return (
      <ClinicPageLayout title={t('clinic.doctors.detailTitle')} subtitle={t('clinic.doctors.notFound')}>
        <p className="p-6 text-slate-500">{t('clinic.doctors.notFound')}</p>
      </ClinicPageLayout>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await actions.updateStaffPricing(doctor.staff_id, {
        consultation_fee: fees.consultation,
        telemedicine_fee: fees.telemedicine,
        follow_up_fee: fees.follow_up,
      });
      setMessage(t('clinic.doctors.pricingSaved'));
      await refetch();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('clinic.errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const doctorAppointments = data?.appointments.filter((a) => a.doctor_id === doctor.doctor_user_id) ?? [];

  return (
    <ClinicPageLayout title={doctor.full_name} subtitle={doctor.specialization ?? t('clinic.doctors.general')}>
      <div className="space-y-6 p-4 sm:p-6">
        {message ? <div className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">{message}</div> : null}

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
          <div>
            <h2 className="font-bold text-slate-900">{t('clinic.doctors.overview')}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-slate-500">{t('clinic.doctors.fieldEmail')}</dt><dd>{doctor.email ?? '—'}</dd></div>
              <div><dt className="text-slate-500">{t('clinic.doctors.fieldLicense')}</dt><dd className="font-mono">{doctor.license_number ?? '—'}</dd></div>
              <div><dt className="text-slate-500">{t('clinic.doctors.colStatus')}</dt><dd>{doctor.invitation_status}</dd></div>
            </dl>
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{t('clinic.doctors.pricingTab')}</h2>
            <div className="mt-3 space-y-2">
              {(
                [
                  ['consultation', t('clinic.doctors.fieldConsultFee')],
                  ['telemedicine', t('clinic.doctors.fieldTeleFee')],
                  ['follow_up', t('clinic.doctors.fieldFollowUpFee')],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="text-slate-600">{label}</span>
                  <input
                    type="number"
                    value={fees[key]}
                    onChange={(e) => setFees((f) => ({ ...f, [key]: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
              ))}
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="mt-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {saving ? t('clinic.actions.saving') : t('clinic.actions.save')}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">{t('clinic.doctors.upcomingAppts')}</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {doctorAppointments.slice(0, 8).map((appt) => (
              <li key={appt.id} className="flex justify-between py-2 text-sm">
                <span>{appt.patient_name} · {new Date(appt.scheduled_at).toLocaleString()}</span>
                <span className="text-slate-500">{appt.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ClinicPageLayout>
  );
};
