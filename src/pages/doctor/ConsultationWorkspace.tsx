import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Sparkles, Stethoscope, UserSquare2 } from 'lucide-react';
import { PhaseStub } from '../../components/system/PhaseStub';
import { useDoctorConsultationStub } from '../../hooks';

export const DoctorConsultationWorkspace = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { data } = useDoctorConsultationStub(appointmentId ?? null);

  return (
    <PhaseStub
      accent="cyan"
      icon={Stethoscope}
      phaseLabel={t('system.phaseStub.phasePlanned')}
      title={t('doctor.consultationWorkspace.title')}
      subtitle={t('doctor.consultationWorkspace.subtitle')}
      features={[
        {
          icon: ClipboardList,
          title: t('doctor.consultationWorkspace.featureSoapTitle'),
          description: t('doctor.consultationWorkspace.featureSoapBody'),
        },
        {
          icon: UserSquare2,
          title: t('doctor.consultationWorkspace.featureContextTitle'),
          description: t('doctor.consultationWorkspace.featureContextBody'),
        },
        {
          icon: Sparkles,
          title: t('doctor.consultationWorkspace.featureAiTitle'),
          description: t('doctor.consultationWorkspace.featureAiBody'),
        },
      ]}
      actions={
        data?.appointmentId ? (
          <button
            type="button"
            onClick={() => navigate(`/doctor/appointments/${data.appointmentId}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            <span>{t('doctor.consultationWorkspace.actionOpenAppointment')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/doctor/appointments')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span>{t('doctor.consultationWorkspace.actionBackAppointments')}</span>
          </button>
        )
      }
    />
  );
};
