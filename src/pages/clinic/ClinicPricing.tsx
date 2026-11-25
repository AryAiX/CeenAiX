import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import {
  SERVICE_CATEGORIES,
  arabicNameForForm,
  normalizeServiceCategory,
  serviceSaveErrorKey,
  serviceText,
  validateServiceForm,
  type ServiceFieldError,
  type ServiceFormErrors,
  type ServiceFormValue,
} from '../../lib/clinic-services';
import { formatLocaleCurrency, formatLocaleDigits, usesArabicEasternNumerals } from '../../lib/i18n-ui';
import { Plus, Pencil as Edit2, Trash2, DollarSign, Clock, X, Save, ToggleLeft, ToggleRight, Search, Tag, TrendingUp, Activity, Info } from 'lucide-react';

interface PricingItem {
  id: string;
  name: string;
  /** QA-215 */
  nameAr: string;
  category: string;
  durationMinutes: number;
  priceAed: number;
  description: string;
  /** QA-215 */
  descriptionAr: string;
  isActive: boolean;
}

const SERVICE_COLUMNS =
  'id, name_en, name_ar, category, default_duration_min, default_price, description_en, description_ar, is_active';

interface ServiceRow {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  category: string | null;
  default_duration_min: number | null;
  default_price: number | string | null;
  description_en: string | null;
  description_ar: string | null;
  is_active: boolean | null;
}

const toPricingItem = (s: ServiceRow): PricingItem => ({
  id: s.id,
  name: s.name_en ?? '',
  nameAr: s.name_ar ?? '',
  category: normalizeServiceCategory(s.category),
  durationMinutes: s.default_duration_min ?? 30,
  priceAed: Number(s.default_price) || 0,
  description: s.description_en ?? '',
  descriptionAr: s.description_ar ?? '',
  isActive: s.is_active ?? true,
});

/** QA-217: label of a stored (lowercase) category in the UI language; unknown values are shown as stored. */
function categoryLabel(t: TFunction, category: string): string {
  return (SERVICE_CATEGORIES as readonly string[]).includes(category)
    ? t(`clinic.pricingPage.categories.${category}`)
    : category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
}

/** QA-217: close a dialog with Escape (not while it is saving). */
function useEscape(onClose: () => void, disabled: boolean) {
  useEffect(() => {
    if (disabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, disabled]);
}

/**
 * QA-214: the form checks its values before saving, stays open (with what was typed) until the
 * save has worked, and cannot be sent twice.
 */
function PricingModal({
  item,
  existing,
  onClose,
  onSave,
}: {
  item?: PricingItem;
  existing: { id: string; name: string }[];
  onClose: () => void;
  /** resolves to a plain error message, or null when saved */
  onSave: (value: ServiceFormValue) => Promise<string | null>;
}) {
  const { t, i18n } = useTranslation();
  const isEdit = !!item;
  const initialCategory = normalizeServiceCategory(item?.category);
  const categoryOptions: string[] = (SERVICE_CATEGORIES as readonly string[]).includes(initialCategory)
    ? [...SERVICE_CATEGORIES]
    : [...SERVICE_CATEGORIES, initialCategory];
  const [form, setForm] = useState({
    name: item?.name || '',
    nameAr: arabicNameForForm(item),
    category: initialCategory,
    durationMinutes: String(item?.durationMinutes ?? 30),
    priceAed: item ? String(item.priceAed) : '',
    description: item?.description || '',
    descriptionAr: item?.descriptionAr || '',
  });
  const [errors, setErrors] = useState<ServiceFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const message = (error: ServiceFieldError | undefined) => {
    if (!error) return null;
    const values = Object.fromEntries(
      Object.entries(error.values ?? {}).map(([k, v]) => [
        k,
        // "100,000" in English, Arabic digits in Arabic
        usesArabicEasternNumerals(i18n.language) ? formatLocaleDigits(v, i18n.language) : v.toLocaleString('en-US'),
      ])
    );
    return t(`clinic.pricingPage.form.errors.${error.key}`, values);
  };
  const fieldError = (field: keyof ServiceFormErrors, id: string) => {
    const text = message(errors[field]);
    return text ? <p id={id} className="mt-1 text-xs text-red-600">{text}</p> : null;
  };

  useEscape(onClose, saving);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const result = validateServiceForm(form, existing, item?.id);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaveError(null);
    setSaving(true);
    const failure = await onSave(result.value);
    setSaving(false);
    if (failure) setSaveError(failure);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-form-title"
        dir={i18n.dir()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center"><DollarSign size={18} className="text-teal-600" aria-hidden="true" /></div>
            <h3 id="service-form-title" className="font-bold text-slate-900">{isEdit ? t('clinic.pricingPage.form.titleEdit') : t('clinic.pricingPage.form.titleAdd')}</h3>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={t('clinic.pricingPage.form.close')} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" aria-hidden="true" /></button>
        </div>
        <div className="p-6 space-y-4">
          {saveError ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>
          ) : null}
          <div>
            <label htmlFor="service-name" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.pricingPage.form.name')}</label>
            <input
              id="service-name"
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder={t('clinic.pricingPage.form.namePlaceholder')}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'service-name-error' : undefined}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {fieldError('name', 'service-name-error')}
          </div>
          <div>
            <label htmlFor="service-name-ar" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.pricingPage.form.nameAr')}</label>
            <input
              id="service-name-ar"
              type="text"
              dir="rtl"
              lang="ar"
              value={form.nameAr}
              onChange={set('nameAr')}
              aria-invalid={errors.nameAr ? true : undefined}
              aria-describedby={errors.nameAr ? 'service-name-ar-hint service-name-ar-error' : 'service-name-ar-hint'}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p id="service-name-ar-hint" className="mt-1 text-xs text-slate-400">{t('clinic.pricingPage.form.nameArHint')}</p>
            {fieldError('nameAr', 'service-name-ar-error')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="service-category" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.pricingPage.form.category')}</label>
              <select id="service-category" value={form.category} onChange={set('category')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                {categoryOptions.map(c => <option key={c} value={c}>{categoryLabel(t, c)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="service-duration" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.pricingPage.form.duration')}</label>
              <input
                id="service-duration"
                type="number"
                inputMode="numeric"
                min={5}
                max={480}
                step={5}
                value={form.durationMinutes}
                onChange={set('durationMinutes')}
                aria-invalid={errors.duration ? true : undefined}
                aria-describedby={errors.duration ? 'service-duration-error' : undefined}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {fieldError('duration', 'service-duration-error')}
            </div>
            <div>
              <label htmlFor="service-price" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.pricingPage.form.price')}</label>
              <input
                id="service-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.priceAed}
                onChange={set('priceAed')}
                placeholder="0"
                aria-invalid={errors.price ? true : undefined}
                aria-describedby={errors.price ? 'service-price-error' : undefined}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {fieldError('price', 'service-price-error')}
            </div>
          </div>
          <div>
            <label htmlFor="service-description" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.pricingPage.form.description')}</label>
            <textarea
              id="service-description"
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder={t('clinic.pricingPage.form.descriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? 'service-description-error' : undefined}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
            {fieldError('description', 'service-description-error')}
          </div>
          <div>
            <label htmlFor="service-description-ar" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.pricingPage.form.descriptionAr')}</label>
            <textarea
              id="service-description-ar"
              dir="rtl"
              lang="ar"
              value={form.descriptionAr}
              onChange={set('descriptionAr')}
              rows={2}
              aria-invalid={errors.descriptionAr ? true : undefined}
              aria-describedby={errors.descriptionAr ? 'service-description-ar-error' : undefined}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
            {fieldError('descriptionAr', 'service-description-ar-error')}
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">{t('clinic.actions.cancel')}</button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save size={15} aria-hidden="true" /> {saving ? t('clinic.pricingPage.form.saving') : isEdit ? t('clinic.pricingPage.form.submitEdit') : t('clinic.pricingPage.form.submitAdd')}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function ConfirmDeleteModal({ name, busy, onConfirm, onCancel }: { name: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const { t, i18n } = useTranslation();
  useEscape(onCancel, busy);
  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-service-title"
        aria-describedby="remove-service-message"
        dir={i18n.dir()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Trash2 size={22} className="text-red-500" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h3 id="remove-service-title" className="font-bold text-slate-900 text-lg">{t('clinic.pricingPage.remove.title')}</h3>
            {/* QA-216: services are not shown to patients, and removing one changes no fee or visit */}
            <p id="remove-service-message" className="text-sm text-slate-500 mt-1">{t('clinic.pricingPage.remove.message', { name })}</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
          >
            {t('clinic.actions.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {t('clinic.pricingPage.remove.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ClinicPricing() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [items, setItems] = useState<PricingItem[]>([]);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PricingItem | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('clinic_portal_members')
        .select('facility_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.facility_id) throw new Error('No clinic facility found.');

      const fId = memberData.facility_id;
      setFacilityId(fId);

      const { data: servicesData, error: servicesError } = await supabase
        .from('facility_services')
        .select(SERVICE_COLUMNS)
        .eq('facility_id', fId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (servicesError) throw servicesError;

      setItems(((servicesData ?? []) as ServiceRow[]).map(toPricingItem));
    } catch (err) {
      // QA-217: plain message in the UI language, not the raw database text
      console.warn('[ClinicPricing] load failed', err);
      setError(t('clinic.pricingPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter(p => {
    const query = search.trim().toLowerCase();
    const matchSearch =
      !query || [p.name, p.nameAr, p.description, p.descriptionAr].some(text => text.toLowerCase().includes(query));
    const matchCat = filterCat === 'all' || p.category === filterCat;
    return matchSearch && matchCat;
  });

  // QA-217: average and highest price of switched-on services; "—" when there are none
  // (the highest used to show "—" whenever it was exactly AED 1, and counted switched-off services)
  const activeItems = items.filter(p => p.isActive);
  const totalActive = activeItems.length;
  const avgPrice = totalActive ? Math.round(activeItems.reduce((sum, p) => sum + p.priceAed, 0) / totalActive) : null;
  const highestPrice = totalActive ? Math.max(...activeItems.map(p => p.priceAed)) : null;
  const barMax = Math.max(0, ...items.map(p => p.priceAed));
  const money = (value: number | null) => (value === null ? '—' : formatLocaleCurrency(value, lang));

  /** QA-214: save, then show the row as the database stored it. Returns a plain error message or null. */
  async function handleSave(value: ServiceFormValue): Promise<string | null> {
    if (!facilityId) return t('clinic.pricingPage.errors.saveFailed');
    const fields = {
      name_en: value.name,
      name_ar: value.nameAr,
      category: value.category,
      default_duration_min: value.durationMinutes,
      default_price: value.priceAed,
      description_en: value.description,
      description_ar: value.descriptionAr,
    };
    const { data, error: saveError } = editItem
      ? await supabase.from('facility_services').update(fields).eq('id', editItem.id).select(SERVICE_COLUMNS).single()
      : await supabase
          .from('facility_services')
          .insert({
            ...fields,
            facility_id: facilityId,
            currency: 'AED',
            is_active: true,
            is_deleted: false,
          })
          .select(SERVICE_COLUMNS)
          .single();
    if (saveError || !data) {
      console.warn('[ClinicPricing] save failed', saveError);
      return t(`clinic.pricingPage.errors.${serviceSaveErrorKey(saveError)}`);
    }
    const saved = toPricingItem(data as ServiceRow);
    setItems(prev => (editItem ? prev.map(p => (p.id === saved.id ? saved : p)) : [saved, ...prev]));
    setShowModal(false);
    setEditItem(undefined);
    return null;
  }

  async function toggleActive(id: string) {
    const item = items.find(p => p.id === id);
    if (!item || busyId) return;
    setBusyId(id);
    setError(null);
    const { error: updateError } = await supabase
      .from('facility_services')
      .update({ is_active: !item.isActive })
      .eq('id', id);
    setBusyId(null);
    if (updateError) {
      console.warn('[ClinicPricing] toggle failed', updateError);
      setError(t('clinic.pricingPage.errors.toggleFailed'));
      return;
    }
    setItems(prev => prev.map(p => p.id === id ? { ...p, isActive: !item.isActive } : p));
  }

  async function deleteItem(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    const { error: deleteError } = await supabase
      .from('facility_services')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);
    setBusyId(null);
    setConfirmDelete(null);
    if (deleteError) {
      console.warn('[ClinicPricing] remove failed', deleteError);
      setError(t('clinic.pricingPage.errors.removeFailed'));
      return;
    }
    setItems(prev => prev.filter(p => p.id !== id));
  }

  if (loading) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void fetchData()} className="ms-2 font-semibold underline">{t('clinic.actions.retry')}</button>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('clinic.pricingPage.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('clinic.pricingPage.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditItem(undefined); setShowModal(true); }}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} aria-hidden="true" /> {t('clinic.pricingPage.addService')}
        </button>
      </div>

      {/* QA-216: nothing else in the app reads these prices; visit fees come from the doctor links */}
      <div role="note" className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          {t('clinic.pricingPage.feeSource.text')}{' '}
          <Link to="/clinic/doctors" className="font-semibold underline">{t('clinic.pricingPage.feeSource.link')}</Link>
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'total', label: t('clinic.pricingPage.kpiTotal'), value: formatLocaleDigits(items.length, lang), icon: Tag, color: 'text-teal-600', bg: 'bg-teal-50' },
          { key: 'active', label: t('clinic.pricingPage.kpiActive'), value: formatLocaleDigits(totalActive, lang), icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { key: 'average', label: t('clinic.pricingPage.kpiAverage'), hint: t('clinic.pricingPage.kpiActiveOnly'), value: money(avgPrice), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { key: 'highest', label: t('clinic.pricingPage.kpiHighest'), hint: t('clinic.pricingPage.kpiActiveOnly'), value: money(highestPrice), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.key} data-testid={`pricing-kpi-${k.key}`} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 shrink-0 rounded-xl ${k.bg} flex items-center justify-center`}><Icon size={18} className={k.color} aria-hidden="true" /></div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
                {k.hint ? <div className="text-[11px] text-slate-400">{k.hint}</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('clinic.pricingPage.searchPlaceholder')}
            aria-label={t('clinic.pricingPage.searchLabel')}
            className="w-full ps-9 pe-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div role="group" aria-label={t('clinic.pricingPage.categoryFilterLabel')} className="flex gap-2 flex-wrap">
          {['all', ...SERVICE_CATEGORIES].map(c => (
            <button key={c} type="button" aria-pressed={filterCat === c} onClick={() => setFilterCat(c)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterCat === c ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c === 'all' ? t('clinic.pricingPage.categories.all') : categoryLabel(t, c)}</button>
          ))}
        </div>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(p => {
          const text = serviceText(p, lang);
          return (
          <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${p.isActive ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-100">{categoryLabel(t, p.category)}</span>
                  {!p.isActive && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">{t('clinic.pricingPage.card.inactive')}</span>}
                </div>
                <h3 className="font-bold text-slate-900 text-base leading-tight break-words">{text.name}</h3>
              </div>
              <div className="text-end shrink-0">
                <span className="sr-only">{t('clinic.pricingPage.card.price')}: </span>
                <div className="text-xl font-bold text-teal-700" style={{ fontFamily: 'DM Mono, monospace' }}>
                  {formatLocaleCurrency(p.priceAed, lang)}
                </div>
              </div>
            </div>

            {text.description ? <p className="text-xs text-slate-500 mb-3 leading-relaxed">{text.description}</p> : null}

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={12} aria-hidden="true" />
                {t('clinic.pricingPage.card.duration', { value: formatLocaleDigits(p.durationMinutes, lang) })}
              </div>
              <div className="w-px h-3 bg-slate-200" />
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${barMax > 0 ? (p.priceAed / barMax) * 100 : 0}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => void toggleActive(p.id)}
                disabled={busyId === p.id}
                aria-pressed={p.isActive}
                aria-label={t(p.isActive ? 'clinic.pricingPage.card.switchOff' : 'clinic.pricingPage.card.switchOn', { name: text.name })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${p.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {p.isActive ? <ToggleRight size={14} aria-hidden="true" /> : <ToggleLeft size={14} aria-hidden="true" />}
                {p.isActive ? t('clinic.pricingPage.card.active') : t('clinic.pricingPage.card.inactive')}
              </button>
              <button
                type="button"
                onClick={() => { setEditItem(p); setShowModal(true); }}
                aria-label={t('clinic.pricingPage.card.editLabel', { name: text.name })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors ms-auto"
              >
                <Edit2 size={12} aria-hidden="true" /> {t('clinic.pricingPage.card.edit')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(p.id)}
                aria-label={t('clinic.pricingPage.card.removeLabel', { name: text.name })}
                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400">
          <DollarSign size={32} className="mx-auto mb-3 opacity-30" aria-hidden="true" />
          <p className="text-sm">{t('clinic.pricingPage.empty')}</p>
        </div>
      )}

      {showModal && (
        <PricingModal
          item={editItem}
          existing={items}
          onClose={() => { setShowModal(false); setEditItem(undefined); }}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          name={(() => {
            const item = items.find(p => p.id === confirmDelete);
            return item ? serviceText(item, lang).name : t('clinic.pricingPage.remove.thisService');
          })()}
          busy={busyId === confirmDelete}
          onConfirm={() => void deleteItem(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
