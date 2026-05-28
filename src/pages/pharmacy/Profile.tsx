import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Store, UserRound, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { formatLocaleDigits } from '../../lib/i18n-ui';
import { PHARMACY_NAV_ITEMS } from './navItems';

export const PharmacyProfile = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const { profile, user } = useAuth();
  const { data, error, refetch } = usePharmacyPrescriptionQueue();
  const fallbackName = t('pharmacy.profile.fallbackName', { defaultValue: 'Pharmacy' });
  const pendingLabel = t('pharmacy.profile.fallbackPending', { defaultValue: 'Pending' });
  const displayName =
    profile?.full_name?.trim() ||
    profile?.first_name?.trim() ||
    user?.email?.split('@')[0] ||
    fallbackName;
  const pharmacyName = data?.profile?.displayName ?? data?.organization?.name ?? fallbackName;

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    license_number: '',
    license_valid_until: '',
    address: '',
    operating_hours: '',
    pharmacist_in_charge: '',
  });

  const handleOpenEditModal = () => {
    setEditForm({
      display_name: data?.profile?.displayName ?? '',
      license_number: data?.profile?.licenseNumber ?? '',
      license_valid_until: data?.profile?.licenseValidUntil ?? '',
      address: data?.profile?.address ?? '',
      operating_hours: data?.profile?.operatingHours ?? '',
      pharmacist_in_charge: data?.profile?.pharmacistInCharge ?? '',
    });
    setEditError(null);
    setEditSuccess(false);
    setEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    setEditSaving(true);
    setEditError(null);
    try {
      const { error } = await supabase
        .from('pharmacy_facility_profiles')
        .update({
          display_name: editForm.display_name,
          license_number: editForm.license_number,
          license_valid_until: editForm.license_valid_until || null,
          address: editForm.address,
          operating_hours: editForm.operating_hours,
          pharmacist_in_charge: editForm.pharmacist_in_charge,
        })
        .eq('organization_id', data?.organization?.id);
      if (error) throw error;
      setEditSuccess(true);
      void refetch();
      setTimeout(() => {
        setEditModalOpen(false);
        setEditSuccess(false);
      }, 1500);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const operationRows: Array<[string, string | number, LucideIcon, string]> = [
    [t('pharmacy.profile.opPending', { defaultValue: 'Pending prescriptions' }), formatLocaleDigits(data?.pendingPrescriptions ?? 0, uiLang), UserRound, '/pharmacy/dispensing'],
    [t('pharmacy.profile.opAlerts', { defaultValue: 'Inventory alerts' }), formatLocaleDigits(data?.lowStockAlerts ?? 0, uiLang), ShieldCheck, '/pharmacy/inventory'],
    [
      t('pharmacy.profile.opDhaSync', { defaultValue: 'DHA sync' }),
      data?.profile?.dhaConnected
        ? t('pharmacy.profile.ready', { defaultValue: 'Ready' })
        : t('pharmacy.profile.needsSetup', { defaultValue: 'Needs setup' }),
      ShieldCheck,
      '/pharmacy/reports',
    ],
  ];

  return (
    <OpsShell
      title={t('pharmacy.profile.title', { defaultValue: 'My Pharmacy' })}
      subtitle={`${pharmacyName} ${t('pharmacy.profile.subtitleSuffix', { defaultValue: 'profile' })}`}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, {
        prescriptions: data?.pendingPrescriptions || undefined,
        inventory: data?.lowStockAlerts || undefined,
        messages: data?.messages.reduce((sum, item) => sum + item.unreadCount, 0) || undefined,
      })}
      accent="emerald"
      variant="pharmacy"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />
      <div className="min-h-full bg-slate-50 p-6">
        <div className="w-full">
          <h2 className="mb-5 text-[20px] font-bold text-slate-900">
            {t('pharmacy.profile.title', { defaultValue: 'My Pharmacy' })}
          </h2>

          <section className="mb-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-xl font-bold text-white">
                {pharmacyName
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{pharmacyName}</h3>
                <div className="text-sm text-slate-500">
                  {data?.organization?.city ?? t('pharmacy.profile.fallbackLocation', { defaultValue: 'UAE' })}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    {t('pharmacy.profile.dhaLicensed', { defaultValue: 'DHA Licensed' })} ✅
                  </span>
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">
                    {data?.profile?.nabidhConnected
                      ? `${t('pharmacy.profile.nabidhConnected', { defaultValue: 'NABIDH Connected' })} ✅`
                      : t('pharmacy.profile.nabidhPending', { defaultValue: 'NABIDH Pending' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {[
                [
                  t('pharmacy.profile.fieldLicense', { defaultValue: 'DHA License' }),
                  data?.profile?.licenseNumber ?? data?.organization?.notes ?? pendingLabel,
                ],
                [
                  t('pharmacy.profile.fieldLicenseValid', { defaultValue: 'License Valid Until' }),
                  data?.profile?.licenseValidUntil
                    ? new Date(data.profile.licenseValidUntil).toLocaleDateString(uiLang)
                    : pendingLabel,
                ],
                [
                  t('pharmacy.profile.fieldLocation', { defaultValue: 'Location' }),
                  data?.profile?.address ??
                    data?.organization?.city ??
                    t('pharmacy.profile.fallbackLocation', { defaultValue: 'UAE' }),
                ],
                [
                  t('pharmacy.profile.fieldHours', { defaultValue: 'Operating Hours' }),
                  data?.profile?.operatingHours ?? pendingLabel,
                ],
                [
                  t('pharmacy.profile.fieldPicName', { defaultValue: 'Pharmacist-in-Charge' }),
                  data?.profile?.pharmacistInCharge ?? displayName,
                ],
                [
                  t('pharmacy.profile.fieldEprescription', { defaultValue: 'CeenAiX ePrescription' }),
                  data?.profile?.dhaConnected
                    ? `${t('pharmacy.profile.connected', { defaultValue: 'Connected' })} ✅`
                    : t('pharmacy.profile.notConnected', { defaultValue: 'Not connected' }),
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-0.5 text-xs text-slate-400">{label}</div>
                  <div className="font-semibold text-slate-800">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.8fr]">
<article className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <h4 className="mb-4 text-[15px] font-bold text-slate-800">
            {t('pharmacy.profile.staffHeading', { defaultValue: 'Staff' })}
          </h4>
          {(data?.staff ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <UserRound className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600">No staff members found</p>
              <p className="mt-1 text-xs text-slate-400">Staff will appear here once added by an admin</p>
            </div>
          ) : null}
          {(data?.staff ?? []).map((staff) => (
                <div key={staff.id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {staff.fullName
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{staff.fullName}</div>
                    <div className="truncate text-xs text-slate-500">
                      {staff.roleTitle} ·{' '}
                      <span className="font-mono">
                        {staff.credentialNumber ??
                          t('pharmacy.profile.credentialPending', { defaultValue: 'Credential pending' })}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      staff.shiftStatus === 'on_shift'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {staff.shiftStatus === 'on_shift'
                      ? t('pharmacy.profile.shiftOn', { defaultValue: 'on shift' })
                      : t('pharmacy.profile.shiftOff', { defaultValue: 'off shift' })}
                  </span>
                </div>
              ))}
            </article>

            <article className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <Store className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-slate-800">
                    {t('pharmacy.profile.operationsHeading', { defaultValue: 'Operations Status' })}
                  </h4>
                  <div className="text-xs text-slate-400">
                    {t('pharmacy.profile.operationsSubtitle', { defaultValue: 'Live from pharmacy queue' })}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {operationRows.map(([label, value, Icon, route]) => (
                  <Link key={label as string} to={route as string} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 transition hover:ring-2 hover:ring-emerald-300">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Icon className="h-4 w-4 text-emerald-600" />
                      {label as string}
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-800">{value as string | number}</div>
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  {t('pharmacy.profile.editLicense', { defaultValue: 'Edit license details' })}
                </button>
              </div>
            </article>
          </section>
        </div>
      </div>
      {editModalOpen ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Edit License Details</h2>
                <p className="mt-0.5 text-xs text-slate-500">{pharmacyName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 px-6 py-4">
              {editError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {editError}
                </div>
              ) : null}
              {editSuccess ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  ✅ Changes saved successfully!
                </div>
              ) : null}
              {[
                { label: 'Pharmacy Name', key: 'display_name', type: 'text', placeholder: 'Al Shifa Pharmacy' },
                { label: 'DHA License Number', key: 'license_number', type: 'text', placeholder: 'DHA-PHARM-2019-003481' },
                { label: 'License Valid Until', key: 'license_valid_until', type: 'date', placeholder: '' },
                { label: 'Address', key: 'address', type: 'text', placeholder: 'Al Barsha 1, Dubai, UAE' },
                { label: 'Operating Hours', key: 'operating_hours', type: 'text', placeholder: '8 AM - 10 PM (Sun-Sat)' },
                { label: 'Pharmacist-in-Charge', key: 'pharmacist_in_charge', type: 'text', placeholder: 'Rania Hassan' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">{field.label}</label>
                  <input
                    type={field.type}
                    value={editForm[field.key as keyof typeof editForm]}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={() => void handleSaveProfile()}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </OpsShell>
  );
};
