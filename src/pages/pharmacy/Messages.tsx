import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, MessageSquare } from 'lucide-react';
import { MessagesWorkspace } from '../../components/MessagesWorkspace';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue } from '../../hooks';
import { PHARMACY_NAV_ITEMS } from './navItems';

export const PharmacyMessages: React.FC = () => {
  const { t } = useTranslation('common');
  const { data } = usePharmacyPrescriptionQueue();

  return (
    <OpsShell
      title="Messages"
      subtitle="Patient and doctor communications"
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, {
        prescriptions: data?.pendingPrescriptions || undefined,
        inventory: data?.lowStockAlerts || undefined,
        messages: data?.messages.reduce((sum, item) => sum + item.unreadCount, 0) || undefined,
      })}
      accent="emerald"
      variant="pharmacy"
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-slate-900">Messages</h1>
            <p className="mt-1 text-sm text-slate-500">
              Communicate with patients about their prescriptions
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              <Lock className="h-4 w-4" />
              Encrypted
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
              <MessageSquare className="h-4 w-4" />
              Patient Communications
            </span>
          </div>
        </div>
        <MessagesWorkspace role="pharmacy" />
      </div>
    </OpsShell>
  );
};
