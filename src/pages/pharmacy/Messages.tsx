import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessagesWorkspace } from '../../components/MessagesWorkspace';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue, usePharmacyUnreadMessages } from '../../hooks';
import { PHARMACY_NAV_ITEMS, pharmacyNavCounts } from './navItems';

export const PharmacyMessages: React.FC = () => {
  const { t } = useTranslation('common');
  const { data } = usePharmacyPrescriptionQueue();
  const unreadMessages = usePharmacyUnreadMessages();

  return (
    <OpsShell
      title={t('pharmacy.messages.title', { defaultValue: 'Messages' })}
      subtitle={t('pharmacy.messages.pageSubtitle', {
        defaultValue: 'Conversations with patients and care teams',
      })}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, pharmacyNavCounts(data, unreadMessages))}
      accent="emerald"
      variant="pharmacy"
    >
      {/* QA-277: the title and subtitle are in the top bar only (the page repeated them as a second
          main heading, in English, with a different subtitle).
          QA-276: no "Encrypted" badge: messages travel over a secure connection but are stored
          readable by the service, so "Encrypted" on its own suggests more than is true (open
          question for Tooraj, same badge on the doctor, clinic and patient pages). */}
      <div className="flex flex-col gap-6 p-6">
        <MessagesWorkspace role="pharmacy" />
      </div>
    </OpsShell>
  );
};
