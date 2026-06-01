import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, DatabaseZap, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { setPharmacySettingEnabled, usePharmacyPrescriptionQueue } from '../../hooks';
import { PHARMACY_NAV_ITEMS } from './navItems';

export const PharmacySettings = () => {
  const { t } = useTranslation('common');
  const { data, error: loadError, refetch } = usePharmacyPrescriptionQueue();
  const settings = data?.settings ?? [];
  const fallbackName = t('pharmacy.settings.fallbackName', { defaultValue: 'Pharmacy' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleToggle = async (settingId: string, nextEnabled: boolean) => {
    setError(null);
    setBusyId(settingId);
    try {
      await setPharmacySettingEnabled(settingId, nextEnabled);
      void refetch();
      setSuccessId(settingId);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : t('pharmacy.settings.toggleError', { defaultValue: 'Could not update preference.' })
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <OpsShell
      title={t('pharmacy.settings.title', { defaultValue: 'Settings' })}
      subtitle={t('pharmacy.settings.subtitle', {
        defaultValue: 'Notification, compliance, and sync preferences',
      })}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, {
        prescriptions: data?.pendingPrescriptions || undefined,
        inventory: data?.lowStockAlerts || undefined,
        messages: data?.messages.reduce((sum, item) => sum + item.unreadCount, 0) || undefined,
      })}
      accent="emerald"
      variant="pharmacy"
    >
      <div className="min-h-full bg-slate-50 p-6">
        <PortalQueryBanner error={loadError} onRetry={() => void refetch()} />
        <div className="w-full">
          <div className="mb-5">
            <h2 className="text-[20px] font-bold text-slate-900">
              {t('pharmacy.settings.title', { defaultValue: 'Settings' })}
            </h2>
            <div className="text-[13px] text-slate-400">
              {data?.profile?.displayName ?? data?.organization?.name ?? fallbackName}{' '}
              {t('pharmacy.settings.portalPreferences', { defaultValue: 'portal preferences' })}
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {error}
            </div>
          ) : null}

          <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-3">
            {[
              [
                t('pharmacy.settings.cardNotifications', { defaultValue: 'Notifications' }),
                t('pharmacy.settings.cardNotificationsValue', { defaultValue: 'Live' }),
                Bell,
              ],
              [
                t('pharmacy.settings.cardCompliance', { defaultValue: 'DHA Compliance' }),
                t('pharmacy.settings.cardComplianceValue', { defaultValue: 'Enabled' }),
                ShieldCheck,
              ],
              [
                t('pharmacy.settings.cardSync', { defaultValue: 'NABIDH Sync' }),
                t('pharmacy.settings.cardSyncValue', { defaultValue: 'Ready' }),
                DatabaseZap,
              ],
            ].map(([label, value, Icon]) => (
              <div key={label as string} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <Icon className="mb-3 h-5 w-5 text-emerald-600" />
                <div className="font-semibold text-slate-800">{label as string}</div>
                <div className="text-xs text-slate-400">{value as string}</div>
              </div>
            ))}
          </section>

          {settings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <SlidersHorizontal className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600">No settings found</p>
              <p className="mt-1 text-xs text-slate-400">Pharmacy settings will appear here once configured</p>
            </div>
          ) : null}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {settings.map((setting) => (
              <article
                key={setting.title}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                    <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{setting.title}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{setting.description}</div>
                    {successId === setting.id ? (
                      <div className="mt-1 text-xs font-semibold text-emerald-600">
                        ✅ Saved successfully!
                      </div>
                    ) : null}
                  </div>
                </div>
                  <button
                    type="button"
                    onClick={() => void handleToggle(setting.id, !setting.enabled)}
                    disabled={busyId === setting.id}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      setting.enabled ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                    aria-pressed={setting.enabled}
                    aria-label={
                      setting.enabled
                        ? t('pharmacy.settings.toggleOn', { defaultValue: 'On' })
                        : t('pharmacy.settings.toggleOff', { defaultValue: 'Off' })
                    }
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        setting.enabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0 rtl:translate-x-0'
                      }`}
                    />
                  </button>
              </article>
            ))}
          </section>
        </div>
      </div>
    </OpsShell>
  );
};
