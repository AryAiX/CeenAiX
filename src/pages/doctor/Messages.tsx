import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { MessagesWorkspace } from '../../components/MessagesWorkspace';

export const DoctorMessages: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900">{t('doctor.messages.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('doctor.messages.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <Lock className="h-4 w-4" />
            {t('doctor.messages.encrypted')}
          </span>
        </div>
      </div>
      <MessagesWorkspace role="doctor" />
    </>
  );
};
