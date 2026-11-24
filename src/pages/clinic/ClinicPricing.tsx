import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
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
import { formatLocaleDigits, usesArabicEasternNumerals } from '../../lib/i18n-ui';
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

const CATEGORY_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  follow_up: 'Follow-up',
  procedure: 'Procedure',
  telemedicine: 'Telemedicine',
  lab: 'Lab',
  imaging: 'Imaging',
  package: 'Package',
};

/** Label of a stored (lowercase) category; unknown values are shown as stored. */
function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
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
      <form onSubmit={submit} noValidate className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center"><DollarSign size={18} className="text-teal-600" /></div>
            <h3 className="font-bold text-slate-900">{isEdit ? 'Edit Service' : 'Add New Service'}</h3>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          {saveError ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>
          ) : null}
          <div>
            <label htmlFor="service-name" className="block text-xs font-semibold text-slate-600 mb-1">Service Name</label>
            <input
              id="service-name"
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Cardiology Consultation"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="service-category" className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select id="service-category" value={form.category} onChange={set('category')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                {categoryOptions.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="service-duration" className="block text-xs font-semibold text-slate-600 mb-1">Duration (minutes)</label>
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
              <label htmlFor="service-price" className="block text-xs font-semibold text-slate-600 mb-1">Price (AED)</label>
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
            <label htmlFor="service-description" className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea
              id="service-description"
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="Brief description of this service…"
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
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">Cancel</button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save size={15} /> {saving ? t('clinic.pricingPage.form.saving') : isEdit ? 'Save Changes' : 'Add Service'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function ConfirmDeleteModal({ name, busy, onConfirm, onCancel }: { name: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Trash2 size={22} className="text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-slate-900 text-lg">Remove Service</h3>
            {/* QA-216: services are not shown to patients, and removing one changes no fee or visit */}
            <p className="text-sm text-slate-500 mt-1">{t('clinic.pricingPage.remove.message', { name })}</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Yes, Remove
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
      setError(err instanceof Error ? err.message : 'Failed to load services.');
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

  const totalActive = items.filter(p => p.isActive).length;
  const avgPrice = Math.round(items.filter(p => p.isActive).reduce((s, p) => s + p.priceAed, 0) / (totalActive || 1));
  const maxPrice = Math.max(...items.map(p => p.priceAed), 1);

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
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => void fetchData()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Pricing & Services</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('clinic.pricingPage.subtitle')}</p>
        </div>
        <button
          onClick={() => { setEditItem(undefined); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Service
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
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Services', value: items.length, icon: Tag, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Active Services', value: totalActive, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg. Price (AED)', value: avgPrice.toLocaleString(), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Highest Fee (AED)', value: maxPrice === 1 ? '—' : maxPrice.toLocaleString(), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}><Icon size={18} className={k.color} /></div>
              <div>
                <div className="text-xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…" className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...SERVICE_CATEGORIES].map(c => (
            <button key={c} type="button" aria-pressed={filterCat === c} onClick={() => setFilterCat(c)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterCat === c ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c === 'all' ? 'All' : categoryLabel(c)}</button>
          ))}
        </div>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(p => (
          <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${p.isActive ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-100">{categoryLabel(p.category)}</span>
                  {!p.isActive && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">Inactive</span>}
                </div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">{serviceText(p, lang).name}</h3>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-teal-700" style={{ fontFamily: 'DM Mono, monospace' }}>
                  {p.priceAed.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">AED</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">{serviceText(p, lang).description}</p>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={12} />
                {p.durationMinutes} min
              </div>
              <div className="w-px h-3 bg-slate-200" />
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${(p.priceAed / maxPrice) * 100}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => void toggleActive(p.id)} disabled={busyId === p.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${p.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {p.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {p.isActive ? 'Active' : 'Inactive'}
              </button>
              <button
                onClick={() => { setEditItem(p); setShowModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors ml-auto"
              >
                <Edit2 size={12} /> Edit
              </button>
              <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400">
          <DollarSign size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No services found.</p>
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
            return item ? serviceText(item, lang).name : 'this service';
          })()}
          busy={busyId === confirmDelete}
          onConfirm={() => void deleteItem(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
