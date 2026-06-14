import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { MessagesWorkspace } from '../../components/MessagesWorkspace';

export default function ClinicMessages() {
  const { t } = useTranslation('common');

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900">
            {t('clinic.messages.title', { defaultValue: 'Messages' })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('clinic.messages.subtitle', { defaultValue: 'Communication with doctors and patients' })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700">
            <Lock className="h-4 w-4" />
            {t('clinic.messages.encrypted', { defaultValue: 'Encrypted' })}
          </span>
        </div>
      </div>
      <MessagesWorkspace role="clinic" />
    </div>
  );
}
