import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, HandHelping, ShieldCheck, Video, VideoOff } from 'lucide-react';
import { PhaseStub } from '../../components/system/PhaseStub';
import { useDoctorConsultationStub } from '../../hooks';

export const PatientTelemedicineConsultation = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { appointmentId } = useParams<{ appointmentId?: string }>();
  const { data } = useDoctorConsultationStub(appointmentId ?? null);

  return (
    <PhaseStub
      accent="violet"
      icon={VideoOff}
      phaseLabel={t('system.phaseStub.phaseActivation')}
      title={t('patient.telemedicine.title')}
      subtitle={t('patient.telemedicine.subtitle')}
      features={[
        {
          icon: Video,
          title: t('patient.telemedicine.featureVideoTitle'),
          description: t('patient.telemedicine.featureVideoBody'),
        },
        {
          icon: ShieldCheck,
          title: t('patient.telemedicine.featureSecureTitle'),
          description: t('patient.telemedicine.featureSecureBody'),
        },
        {
          icon: HandHelping,
          title: t('patient.telemedicine.featureHandoffTitle'),
          description: t('patient.telemedicine.featureHandoffBody'),
        },
      ]}
      actions={
        data?.appointmentId ? (
          <button
            type="button"
            onClick={() => navigate(`/patient/appointments/${data.appointmentId}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            <span>{t('patient.telemedicine.actionViewAppointment')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/patient/appointments')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span>{t('patient.telemedicine.actionTalkToSupport')}</span>
          </button>
        )
      }
    />
  );
};
