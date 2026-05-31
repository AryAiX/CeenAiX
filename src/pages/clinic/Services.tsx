import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClinicPageLayout } from '../../components/ClinicPageLayout';
import { useClinicPortal, useClinicPortalActions } from '../../hooks/use-clinic-portal';

export const ClinicServices = () => {
  const { t, i18n } = useTranslation('common');
  const { data, refetch } = useClinicPortal();
  const actions = useClinicPortalActions();
  const isArabic = i18n.language.startsWith('ar');
  const [form, setForm] = useState({ name_en: '', name_ar: '', default_price: 300, default_duration_min: 30, category: 'consultation' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.facility_id) return;
    setSaving(true);
    try {
      await actions.upsertService({ facility_id: data.facility_id, ...form });
      setForm({ name_en: '', name_ar: '', default_price: 300, default_duration_min: 30, category: 'consultation' });
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ClinicPageLayout title={t('clinic.services.title')} subtitle={t('clinic.services.subtitle')}>
      <div className="space-y-6 p-4 sm:p-6">
        <form onSubmit={(e) => void handleAdd(e)} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
          <input required placeholder={t('clinic.services.nameEn')} value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required placeholder={t('clinic.services.nameAr')} value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" dir="rtl" />
          <input type="number" placeholder={t('clinic.services.price')} value={form.default_price} onChange={(e) => setForm((f) => ({ ...f, default_price: Number(e.target.value) }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" disabled={saving} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white md:col-span-3 md:max-w-xs">
            {t('clinic.services.add')}
          </button>
        </form>

        <div className="grid gap-3 md:grid-cols-2">
          {(data?.services ?? []).map((service) => (
            <article key={service.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-slate-900">{isArabic ? service.name_ar : service.name_en}</h3>
              <p className="mt-1 text-sm text-slate-500">{service.category} · {service.default_duration_min} min</p>
              <p className="mt-2 font-mono text-lg font-bold text-teal-700">AED {service.default_price}</p>
            </article>
          ))}
        </div>
      </div>
    </ClinicPageLayout>
  );
};
