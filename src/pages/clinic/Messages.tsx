import { useTranslation } from 'react-i18next';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';

export const ClinicMessages = () => {
  const { t } = useTranslation('common');
  return (
    <ClinicPageLayout title={t('clinic.messages.title')} subtitle={t('clinic.messages.subtitle')}>
      <p className="p-6 text-slate-500">{t('clinic.messages.comingSoon')}</p>
    </ClinicPageLayout>
  );
};
