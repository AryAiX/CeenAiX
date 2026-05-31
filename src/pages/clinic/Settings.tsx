import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal, useClinicPortalActions } from '../../hooks/use-clinic-portal';

export const ClinicSettings = () => {
  const { t, i18n } = useTranslation('common');
  const { data, refetch } = useClinicPortal();
  const actions = useClinicPortalActions();
  const isArabic = i18n.language.startsWith('ar');
  const facility = data?.facility;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    email: '',
    website: '',
    tax_registration_number: '',
  });

  useEffect(() => {
    if (!facility) return;
    setForm({
      phone: facility.phone ?? '',
      email: facility.email ?? '',
      website: facility.website ?? '',
      tax_registration_number: facility.tax_registration_number ?? '',
    });
  }, [facility]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;
    setSaving(true);
    try {
      await actions.updateFacility(facility.id, form);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ClinicPageLayout title={t('clinic.settings.title')} subtitle={isArabic ? facility?.name_ar ?? '' : facility?.name_en ?? ''}>
      <form onSubmit={(e) => void handleSave(e)} className="max-w-2xl space-y-4 p-4 sm:p-6">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{t('clinic.settings.phone')}</span>
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{t('clinic.settings.email')}</span>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{t('clinic.settings.website')}</span>
          <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{t('clinic.settings.trn')}</span>
          <input value={form.tax_registration_number} onChange={(e) => setForm((f) => ({ ...f, tax_registration_number: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <button type="submit" disabled={saving} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
          {saving ? t('clinic.actions.saving') : t('clinic.actions.save')}
        </button>
      </form>
    </ClinicPageLayout>
  );
};
