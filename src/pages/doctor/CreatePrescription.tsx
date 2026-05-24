import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertOctagon, CheckCircle2, ChevronDown, ChevronLeft, ClipboardList, Loader2, Pill, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { MedicationNameDisplay } from '../../components/MedicationNameDisplay';
import {
  useDoctorPatients,
  useMedicationCatalogSearch,
  useQuery,
} from '../../hooks';
import type {
  MedicationCatalog,
  MedicationCatalogSuggestion,
} from '../../types';
import { useAuth } from '../../lib/auth-context';
import {
  getMedicationCatalogDisplayNameAr,
  getMedicationCatalogDisplayNameEn,
  getMedicationSuggestionDisplayNameEn,
} from '../../lib/medication-catalog';
import {
  localizeMedicationDosageValue,
  normalizeMedicationDosageValue,
} from '../../lib/medication-display';
import { enrichMedicationCatalogEntry } from '../../lib/medication-enrichment';
import { appointmentPickerLabel } from '../../lib/i18n-ui';
import { resolveClinicalVocabLabel, type PrescriptionClinicalVocabRow } from '../../lib/prescription-vocab';
import { supabase } from '../../lib/supabase';

interface DraftPrescriptionItem {
  id: string;
  catalogSearch: string;
  medicationCatalogId: string | null;
  medicationCatalogSuggestionId: string | null;
  selectedCatalogGenericNameEn: string;
  selectedCatalogBrandNameEn: string;
  medicationName: string;
  medicationNameAr: string;
  dosage: string;
  frequencyCode: string;
  durationCode: string;
  quantity: string;
  instructions: string;
}

interface DraftNewMedicationSuggestion {
  genericNameEn: string;
  brandNameEn: string;
  displayNameAr: string;
  strength: string;
  dosageForm: string;
  manufacturer: string;
}

interface ActiveMedicationRow {
  id: string;
  medicationName: string;
  dose: string | null;
  frequency: string | null;
  prescriber: string;
}

interface PrescriptionItemRelation {
  id: string;
  medication_name: string | null;
  dosage: string | null;
  frequency: string | null;
  frequency_code: string | null;
}

interface ActivePrescriptionRow {
  id: string;
  prescription_items: PrescriptionItemRelation[] | null;
}

interface MedicationItemEditorProps {
  canRemove: boolean;
  durationOptions: PrescriptionClinicalVocabRow[];
  frequencyOptions: PrescriptionClinicalVocabRow[];
  item: DraftPrescriptionItem;
  index: number;
  onChange: (id: string, nextState: Partial<DraftPrescriptionItem>) => void;
  onRemove: (id: string) => void;
  showErrors: boolean;
  uiLanguage: string;
  userId: string;
}

const createDraftPrescriptionItem = (): DraftPrescriptionItem => ({
  id: crypto.randomUUID(),
  catalogSearch: '',
  medicationCatalogId: null,
  medicationCatalogSuggestionId: null,
  selectedCatalogGenericNameEn: '',
  selectedCatalogBrandNameEn: '',
  medicationName: '',
  medicationNameAr: '',
  dosage: '',
  frequencyCode: '',
  durationCode: '',
  quantity: '',
  instructions: '',
});

const createDraftMedicationSuggestion = (genericNameEn = ''): DraftNewMedicationSuggestion => ({
  genericNameEn,
  brandNameEn: '',
  displayNameAr: '',
  strength: '',
  dosageForm: '',
  manufacturer: '',
});

const patientInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const patientAgeGender = (dateOfBirth: string | null, gender: string | null) => {
  const genderInitial = gender?.trim()?.[0]?.toUpperCase() ?? '';
  if (!dateOfBirth) {
    return genderInitial || '--';
  }

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return genderInitial || '--';
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return `${age}${genderInitial}`;
};

const buildPendingSuggestionSelection = (
  suggestion: Pick<
    MedicationCatalogSuggestion,
    | 'id'
    | 'medication_catalog_id'
    | 'proposed_generic_name_en'
    | 'proposed_brand_name_en'
    | 'proposed_display_name_ar'
  >,
  fallbackCatalog?: MedicationCatalog | null
) => ({
  medicationCatalogId: suggestion.medication_catalog_id ?? fallbackCatalog?.id ?? null,
  medicationCatalogSuggestionId: suggestion.id,
  selectedCatalogGenericNameEn:
    suggestion.proposed_generic_name_en?.trim() || fallbackCatalog?.generic_name_en || '',
  selectedCatalogBrandNameEn:
    suggestion.proposed_brand_name_en?.trim() || fallbackCatalog?.brand_name_en || '',
  medicationName: getMedicationSuggestionDisplayNameEn(suggestion, fallbackCatalog),
  medicationNameAr:
    suggestion.proposed_display_name_ar?.trim() || getMedicationCatalogDisplayNameAr(fallbackCatalog ?? { display_name_ar: null }) || '',
});

const getCatalogSelectionDosage = (
  catalog: Pick<MedicationCatalog, 'strength'> | null | undefined,
  suggestion?: Pick<MedicationCatalogSuggestion, 'proposed_strength'> | null
) => suggestion?.proposed_strength?.trim() || catalog?.strength?.trim() || '';

const MedicationItemEditor: React.FC<MedicationItemEditorProps> = ({
  canRemove,
  durationOptions,
  frequencyOptions,
  item,
  index,
  onChange,
  onRemove,
  showErrors,
  uiLanguage,
  userId,
}) => {
  const { t } = useTranslation('common');
  const [showTranslationForm, setShowTranslationForm] = useState(false);
  const [translationDraft, setTranslationDraft] = useState(item.medicationNameAr);
  const [showNewMedicationForm, setShowNewMedicationForm] = useState(false);
  const [newMedicationDraft, setNewMedicationDraft] = useState(createDraftMedicationSuggestion());
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [enrichingCatalogId, setEnrichingCatalogId] = useState<string | null>(null);
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);
  const {
    data: searchResults,
    loading: searchLoading,
    refetch: refetchSearchResults,
  } = useMedicationCatalogSearch(userId, item.catalogSearch);

  const catalogMatches = useMemo(() => searchResults?.catalogMatches ?? [], [searchResults?.catalogMatches]);
  const pendingSuggestionMatches = useMemo(
    () => searchResults?.pendingSuggestionMatches ?? [],
    [searchResults?.pendingSuggestionMatches]
  );

  const pendingTranslationForSelectedCatalog =
    item.medicationCatalogId && !item.medicationCatalogSuggestionId
      ? pendingSuggestionMatches.find(
          (suggestion) =>
            suggestion.suggestion_type === 'translation' &&
            suggestion.medication_catalog_id === item.medicationCatalogId
        ) ?? null
      : null;
  const localizedDosageValue = localizeMedicationDosageValue(t, uiLanguage, item.dosage) ?? item.dosage;

  const clearSelection = () => {
    onChange(item.id, {
      catalogSearch: '',
      medicationCatalogId: null,
      medicationCatalogSuggestionId: null,
      selectedCatalogGenericNameEn: '',
      selectedCatalogBrandNameEn: '',
      medicationName: '',
      medicationNameAr: '',
    });
    setShowTranslationForm(false);
    setShowNewMedicationForm(false);
    setSuggestionError(null);
    setEnrichingCatalogId(null);
    setEnrichmentError(null);
  };

  const maybeEnrichCatalogMatch = async (
    catalogMatch: MedicationCatalog,
    preferredStrength?: string | null
  ) => {
    if (
      catalogMatch.source !== 'rxnorm' ||
      !catalogMatch.id ||
      (catalogMatch.enrichment_status === 'enriched' && catalogMatch.strength?.trim())
    ) {
      return;
    }

    setEnrichingCatalogId(catalogMatch.id);
    setEnrichmentError(null);

    try {
      const enrichedCatalog = await enrichMedicationCatalogEntry(catalogMatch.id);
      const nextDosage = preferredStrength?.trim() || enrichedCatalog.strength?.trim() || '';

      if (!item.dosage.trim() && nextDosage) {
        onChange(item.id, { dosage: nextDosage });
      }
    } catch (error) {
      setEnrichmentError(error instanceof Error ? error.message : t('doctor.createPrescription.enrichmentFailed'));
    } finally {
      setEnrichingCatalogId(null);
    }
  };

  const selectCatalogMatch = async (catalogMatch: MedicationCatalog) => {
    const nextDosage = getCatalogSelectionDosage(catalogMatch);
    onChange(item.id, {
      catalogSearch: getMedicationCatalogDisplayNameEn(catalogMatch),
      medicationCatalogId: catalogMatch.id,
      medicationCatalogSuggestionId: null,
      selectedCatalogGenericNameEn: catalogMatch.generic_name_en,
      selectedCatalogBrandNameEn: catalogMatch.brand_name_en?.trim() || '',
      medicationName: getMedicationCatalogDisplayNameEn(catalogMatch),
      medicationNameAr: getMedicationCatalogDisplayNameAr(catalogMatch) || '',
      dosage: item.dosage.trim() || nextDosage,
    });
    setTranslationDraft(getMedicationCatalogDisplayNameAr(catalogMatch) || '');
    setShowTranslationForm(false);
    setShowNewMedicationForm(false);
    setSuggestionError(null);
    setEnrichmentError(null);
    await maybeEnrichCatalogMatch(catalogMatch);
  };

  const selectPendingSuggestion = async (
    suggestion: Pick<
      MedicationCatalogSuggestion,
      | 'id'
      | 'medication_catalog_id'
      | 'proposed_generic_name_en'
      | 'proposed_brand_name_en'
      | 'proposed_display_name_ar'
      | 'proposed_strength'
    >,
    fallbackCatalog?: MedicationCatalog | null
  ) => {
    const nextDosage = getCatalogSelectionDosage(fallbackCatalog, suggestion);
    onChange(item.id, {
      catalogSearch: getMedicationSuggestionDisplayNameEn(suggestion, fallbackCatalog),
      ...buildPendingSuggestionSelection(suggestion, fallbackCatalog),
      dosage: item.dosage.trim() || nextDosage,
    });
    setTranslationDraft(suggestion.proposed_display_name_ar?.trim() || '');
    setShowTranslationForm(false);
    setShowNewMedicationForm(false);
    setSuggestionError(null);
    setEnrichmentError(null);

    if (fallbackCatalog) {
      await maybeEnrichCatalogMatch(fallbackCatalog, suggestion.proposed_strength);
    }
  };

  const submitTranslationSuggestion = async () => {
    if (!item.medicationCatalogId || !translationDraft.trim()) {
      setSuggestionError(t('doctor.createPrescription.translationRequired'));
      return;
    }

    setSubmittingSuggestion(true);
    setSuggestionError(null);

    const { data: insertedSuggestion, error } = await supabase
      .from('medication_catalog_suggestions')
      .insert({
        medication_catalog_id: item.medicationCatalogId,
        suggestion_type: 'translation',
        proposed_generic_name_en: item.selectedCatalogGenericNameEn || item.medicationName,
        proposed_brand_name_en: item.selectedCatalogBrandNameEn || null,
        proposed_display_name_ar: translationDraft.trim(),
        created_by: userId,
      })
      .select('*')
      .maybeSingle();

    setSubmittingSuggestion(false);

    if (error || !insertedSuggestion) {
      setSuggestionError(error?.message ?? t('doctor.createPrescription.suggestionSaveError'));
      return;
    }

    void selectPendingSuggestion(insertedSuggestion, {
      id: item.medicationCatalogId,
      source: 'rxnorm',
      source_code: null,
      generic_name_en: item.selectedCatalogGenericNameEn || item.medicationName,
      brand_name_en: item.selectedCatalogBrandNameEn || null,
      display_name_ar: null,
      strength: null,
      dosage_form: null,
      manufacturer: null,
      rxnorm_tty: null,
      ingredient_name_en: null,
      enrichment_status: 'pending',
      enrichment_error: null,
      last_enriched_at: null,
      is_active: true,
      is_custom: false,
      source_updated_at: null,
      last_synced_at: null,
      created_at: '',
      updated_at: '',
    });
    void refetchSearchResults();
  };

  const submitNewMedicationSuggestion = async () => {
    if (!newMedicationDraft.genericNameEn.trim()) {
      setSuggestionError(t('doctor.createPrescription.genericNameRequired'));
      return;
    }

    setSubmittingSuggestion(true);
    setSuggestionError(null);

    const { data: insertedSuggestion, error } = await supabase
      .from('medication_catalog_suggestions')
      .insert({
        suggestion_type: 'new_medication',
        proposed_generic_name_en: newMedicationDraft.genericNameEn.trim(),
        proposed_brand_name_en: newMedicationDraft.brandNameEn.trim() || null,
        proposed_display_name_ar: newMedicationDraft.displayNameAr.trim() || null,
        proposed_strength: newMedicationDraft.strength.trim() || null,
        proposed_dosage_form: newMedicationDraft.dosageForm.trim() || null,
        proposed_manufacturer: newMedicationDraft.manufacturer.trim() || null,
        created_by: userId,
      })
      .select('*')
      .maybeSingle();

    setSubmittingSuggestion(false);

    if (error || !insertedSuggestion) {
      setSuggestionError(error?.message ?? t('doctor.createPrescription.suggestionSaveError'));
      return;
    }

    void selectPendingSuggestion(insertedSuggestion, null);
    setShowNewMedicationForm(false);
    void refetchSearchResults();
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">
          {t('doctor.createPrescription.itemHeading', { count: index + 1 })}
        </h3>
        {canRemove ? (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            <span>{t('doctor.createPrescription.remove')}</span>
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-900">
            {t('doctor.createPrescription.searchMedication')}
          </span>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
            <input
              type="text"
              value={item.catalogSearch}
              onChange={(event) =>
                onChange(item.id, {
                  catalogSearch: event.target.value,
                  medicationCatalogId: null,
                  medicationCatalogSuggestionId: null,
                  selectedCatalogGenericNameEn: '',
                  selectedCatalogBrandNameEn: '',
                  medicationName: '',
                  medicationNameAr: '',
                })
              }
              placeholder={t('doctor.createPrescription.searchMedicationPlaceholder')}
              className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:ring-2 rtl:pl-4 rtl:pr-11 ${
                showErrors && !item.medicationName
                  ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
              }`}
            />
          </div>
          {showErrors && !item.medicationName ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              ⚠️ Please search and select a medication
            </p>
          ) : null}
        </label>

        {item.medicationName ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {item.medicationCatalogSuggestionId
                    ? t('doctor.createPrescription.pendingSelection')
                    : t('doctor.createPrescription.selectedMedication')}
                </p>
                <div className="mt-2">
                  <MedicationNameDisplay
                    canonicalName={item.medicationName}
                    localizedName={item.medicationNameAr || null}
                    language={uiLanguage}
                    primaryClassName="font-semibold text-slate-900"
                    secondaryClassName="mt-0.5 text-xs text-slate-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {t('doctor.createPrescription.clearSelection')}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {pendingTranslationForSelectedCatalog ? (
                <button
                  type="button"
                  onClick={() => {
                    void selectPendingSuggestion(
                      pendingTranslationForSelectedCatalog,
                      pendingTranslationForSelectedCatalog.fallbackCatalog
                    );
                  }}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                >
                  {t('doctor.createPrescription.usePendingTranslation')}
                </button>
              ) : null}

              {item.medicationCatalogId && !item.medicationCatalogSuggestionId && !item.medicationNameAr.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowTranslationForm((current) => !current);
                    setTranslationDraft('');
                    setShowNewMedicationForm(false);
                  }}
                  className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100"
                >
                  {t('doctor.createPrescription.addArabicSuggestion')}
                </button>
              ) : null}
            </div>

            {enrichingCatalogId === item.medicationCatalogId ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t('doctor.createPrescription.enrichingMedication')}</span>
              </div>
            ) : null}

            {enrichmentError ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {enrichmentError}
              </div>
            ) : null}
          </div>
        ) : null}

        {showTranslationForm ? (
          <div className="mt-4 rounded-2xl border border-cyan-200 bg-white p-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">
                {t('doctor.createPrescription.arabicLabel')}
              </span>
              <input
                type="text"
                value={translationDraft}
                onChange={(event) => setTranslationDraft(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={submitTranslationSuggestion}
                disabled={submittingSuggestion}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
              >
                {submittingSuggestion ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{t('doctor.createPrescription.saveSuggestionUseNow')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTranslationForm(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {t('doctor.createPrescription.cancelSuggestion')}
              </button>
            </div>
          </div>
        ) : null}

        {showNewMedicationForm ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createPrescription.genericName')}
                </span>
                <input
                  type="text"
                  value={newMedicationDraft.genericNameEn}
                  onChange={(event) =>
                    setNewMedicationDraft((current) => ({ ...current, genericNameEn: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createPrescription.brandName')}
                </span>
                <input
                  type="text"
                  value={newMedicationDraft.brandNameEn}
                  onChange={(event) =>
                    setNewMedicationDraft((current) => ({ ...current, brandNameEn: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createPrescription.arabicLabel')}
                </span>
                <input
                  type="text"
                  value={newMedicationDraft.displayNameAr}
                  onChange={(event) =>
                    setNewMedicationDraft((current) => ({ ...current, displayNameAr: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createPrescription.dosage')}
                </span>
                <input
                  type="text"
                  value={newMedicationDraft.strength}
                  onChange={(event) =>
                    setNewMedicationDraft((current) => ({ ...current, strength: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createPrescription.dosageForm')}
                </span>
                <input
                  type="text"
                  value={newMedicationDraft.dosageForm}
                  onChange={(event) =>
                    setNewMedicationDraft((current) => ({ ...current, dosageForm: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createPrescription.manufacturer')}
                </span>
                <input
                  type="text"
                  value={newMedicationDraft.manufacturer}
                  onChange={(event) =>
                    setNewMedicationDraft((current) => ({ ...current, manufacturer: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={submitNewMedicationSuggestion}
                disabled={submittingSuggestion}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {submittingSuggestion ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{t('doctor.createPrescription.saveSuggestionUseNow')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewMedicationForm(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {t('doctor.createPrescription.cancelSuggestion')}
              </button>
            </div>
          </div>
        ) : null}

        {suggestionError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {suggestionError}
          </div>
        ) : null}

        {item.catalogSearch.trim().length >= 2 ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.createPrescription.catalogMatches')}
              </p>
              <div className="mt-2 space-y-2">
                {catalogMatches.map((catalogMatch) => (
                  <button
                    key={catalogMatch.id}
                    type="button"
                    onClick={() => {
                      void selectCatalogMatch(catalogMatch);
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/60"
                  >
                    <MedicationNameDisplay
                      canonicalName={catalogMatch.displayNameEn}
                      localizedName={catalogMatch.displayNameAr}
                      language={uiLanguage}
                      primaryClassName="font-semibold text-slate-900"
                      secondaryClassName="mt-0.5 text-xs text-slate-500"
                    />
                  </button>
                ))}
                {!searchLoading && catalogMatches.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                    {t('doctor.createPrescription.noCatalogMatches')}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.createPrescription.pendingSuggestions')}
              </p>
              <div className="mt-2 space-y-2">
                {pendingSuggestionMatches.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => {
                      void selectPendingSuggestion(suggestion, suggestion.fallbackCatalog);
                    }}
                    className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left transition hover:bg-amber-100"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <MedicationNameDisplay
                        canonicalName={suggestion.displayNameEn}
                        localizedName={suggestion.displayNameAr}
                        language={uiLanguage}
                        primaryClassName="font-semibold text-slate-900"
                        secondaryClassName="mt-0.5 text-xs text-slate-500"
                      />
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-amber-800">
                        {t('doctor.createPrescription.pendingBadge')}
                      </span>
                    </div>
                  </button>
                ))}
                {!searchLoading && pendingSuggestionMatches.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                    {t('doctor.createPrescription.noPendingSuggestions')}
                  </p>
                ) : null}
              </div>
            </div>

            {!showNewMedicationForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowNewMedicationForm(true);
                  setShowTranslationForm(false);
                  setNewMedicationDraft(createDraftMedicationSuggestion(item.catalogSearch.trim()));
                  setSuggestionError(null);
                }}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                {t('doctor.createPrescription.suggestMissingMedication')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-900">
            {t('doctor.createPrescription.quantity')}
          </span>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(event) => onChange(item.id, { quantity: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-900">
            {t('doctor.createPrescription.dosage')}
          </span>
          <input
            type="text"
            value={localizedDosageValue}
            onChange={(event) =>
              onChange(item.id, { dosage: normalizeMedicationDosageValue(event.target.value) })
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-900">
            {t('doctor.createPrescription.frequency')}
          </span>
          <select
            value={item.frequencyCode}
            onChange={(event) => onChange(item.id, { frequencyCode: event.target.value })}
            className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
              showErrors && !item.frequencyCode
                ? 'border-red-400 bg-red-50'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
            }`}
          >
            <option value="">{t('doctor.createPrescription.selectFrequency')}</option>
            {frequencyOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {uiLanguage.startsWith('ar') ? option.label_ar : option.label_en}
              </option>
            ))}
          </select>
          {showErrors && !item.frequencyCode ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">⚠️ Please select a frequency</p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-900">
            {t('doctor.createPrescription.duration')}
          </span>
          <select
            value={item.durationCode}
            onChange={(event) => onChange(item.id, { durationCode: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">{t('doctor.createPrescription.selectDuration')}</option>
            {durationOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {uiLanguage.startsWith('ar') ? option.label_ar : option.label_en}
              </option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-900">
            {t('doctor.createPrescription.instructions')}
          </span>
          <textarea
            rows={4}
            value={item.instructions}
            onChange={(event) => onChange(item.id, { instructions: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>
      </div>
    </div>
  );
};

export const CreatePrescription: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, doctorProfile, profile } = useAuth();
  const { data: patientsData } = useDoctorPatients(user?.id);
  const patients = useMemo(() => patientsData ?? [], [patientsData]);
  const [patientId, setPatientId] = useState(searchParams.get('patient') ?? '');
  const [appointmentId, setAppointmentId] = useState(searchParams.get('appointment') ?? '');
  const [status, setStatus] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [items, setItems] = useState<DraftPrescriptionItem[]>([createDraftPrescriptionItem()]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === patientId) ?? null,
    [patientId, patients]
  );

  useEffect(() => {
    if (!patientId && patients.length > 0) {
      setPatientId(patients[0].id);
    }
  }, [patientId, patients]);

  const { data: vocabData } = useQuery<PrescriptionClinicalVocabRow[]>(
    async () => {
      const { data, error } = await supabase
        .from('prescription_clinical_vocab')
        .select('category, code, label_en, label_ar, legacy_match')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as PrescriptionClinicalVocabRow[];
    },
    []
  );

  const { data: appointmentsData } = useQuery<
    Array<{ id: string; scheduled_at: string; chief_complaint: string | null }>
  >(
    async () => {
      if (!user?.id || !patientId) {
        return [];
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('id, scheduled_at, chief_complaint')
        .eq('doctor_id', user.id)
        .eq('patient_id', patientId)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
    [user?.id ?? '', patientId]
  );
  const { data: activeMedicationsData } = useQuery<ActiveMedicationRow[]>(
    async () => {
      if (!patientId) {
        return [];
      }

      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, prescription_items (id, medication_name, dosage, frequency, frequency_code)')
        .eq('patient_id', patientId)
        .eq('is_deleted', false)
        .eq('status', 'active')
        .order('prescribed_at', { ascending: false });

      if (error) {
        throw error;
      }

      return ((data ?? []) as ActivePrescriptionRow[]).flatMap((prescription) =>
        (prescription.prescription_items ?? [])
          .filter((item) => item.medication_name?.trim())
          .map((item) => ({
            id: item.id,
            medicationName: item.medication_name ?? 'Medication',
            dose: item.dosage,
            frequency: item.frequency ?? item.frequency_code,
            prescriber: 'Current care team',
          }))
      );
    },
    [patientId]
  );

  const vocabRows = useMemo(() => vocabData ?? [], [vocabData]);
  const frequencyOptions = useMemo(
    () => vocabRows.filter((row) => row.category === 'frequency'),
    [vocabRows]
  );
  const durationOptions = useMemo(
    () => vocabRows.filter((row) => row.category === 'duration'),
    [vocabRows]
  );
  const appointments = useMemo(() => appointmentsData ?? [], [appointmentsData]);
  const activeMedications = useMemo(() => activeMedicationsData ?? [], [activeMedicationsData]);
  const selectedAppointment = useMemo(
    () => appointments.find((appointment) => appointment.id === appointmentId) ?? null,
    [appointmentId, appointments]
  );

  const updateItem = (id: string, nextState: Partial<DraftPrescriptionItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...nextState } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const submit = async () => {
    setShowValidationErrors(true);

    if (!user?.id || !patientId) {
      setFeedback({ type: 'error', message: t('doctor.createPrescription.patientRequired') });
      return;
    }

    const normalizedItems = items
      .map((item) => ({
        medicationCatalogId: item.medicationCatalogId,
        medicationCatalogSuggestionId: item.medicationCatalogSuggestionId,
        medicationName: item.medicationName.trim(),
        medicationNameAr: item.medicationNameAr.trim(),
        dosage: item.dosage.trim(),
        frequencyCode: item.frequencyCode.trim(),
        durationCode: item.durationCode.trim(),
        quantity: item.quantity.trim(),
        instructions: item.instructions.trim(),
      }))
      .filter((item) => item.medicationName.length > 0);

    if (normalizedItems.length === 0) {
      setFeedback({ type: 'error', message: t('doctor.createPrescription.itemRequired') });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const { data: insertedPrescription, error: prescriptionError } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: patientId,
        doctor_id: user.id,
        appointment_id: appointmentId || null,
        status,
      })
      .select('id')
      .maybeSingle();

    if (prescriptionError || !insertedPrescription) {
      setSaving(false);
      setFeedback({
        type: 'error',
        message: prescriptionError?.message ?? t('doctor.createPrescription.saveError'),
      });
      return;
    }

    const itemPayload = normalizedItems.map((item) => ({
      prescription_id: insertedPrescription.id,
      medication_catalog_id: item.medicationCatalogId,
      medication_catalog_suggestion_id: item.medicationCatalogSuggestionId,
      medication_name: item.medicationName,
      medication_name_ar: item.medicationNameAr || null,
      dosage: item.dosage || null,
      frequency_code: item.frequencyCode || null,
      duration_code: item.durationCode || null,
      frequency:
        resolveClinicalVocabLabel(vocabRows, 'frequency', item.frequencyCode || null, null, 'en') ?? null,
      duration:
        resolveClinicalVocabLabel(vocabRows, 'duration', item.durationCode || null, null, 'en') ?? null,
      quantity: item.quantity ? Number.parseInt(item.quantity, 10) || null : null,
      instructions: item.instructions || null,
      is_dispensed: false,
    }));

    const { error: itemsError } = await supabase.from('prescription_items').insert(itemPayload);

    if (itemsError) {
      setSaving(false);
      setFeedback({ type: 'error', message: itemsError.message });
      return;
    }

    await supabase.from('notifications').insert({
      user_id: patientId,
      type: 'medication',
      title: 'New prescription issued',
      body: 'Your doctor added a new medication plan to your account.',
      action_url: '/patient/prescriptions',
    });

    setSaving(false);
    setShowValidationErrors(false);
    setFeedback({ type: 'success', message: t('doctor.createPrescription.saveSuccess') });
    window.setTimeout(() => {
      navigate('/doctor/prescriptions');
    }, 2000);
  };

  return (
    <div className="-mx-6 -my-5 min-h-[calc(100vh-64px)] overflow-y-auto bg-slate-50 p-6 xl:h-[calc(100vh-64px)] xl:overflow-hidden">
      <div className="flex min-h-full flex-col gap-4 xl:h-full">
        <div>
          <button
            type="button"
            onClick={() => navigate('/doctor/prescriptions')}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Prescriptions
          </button>
        </div>
        {feedback ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-red-100 bg-red-50 text-red-600'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="xl:min-h-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:h-full xl:overflow-y-auto">
              <div className="mb-5">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  PRESCRIBING FOR
                </div>
              {selectedPatient ? (
                <div className="mb-3 rounded-xl border-2 border-teal-200 bg-teal-50 p-4">
                  <div className="mb-3 flex items-center space-x-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 font-bold text-white">
                      {patientInitials(selectedPatient.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-bold text-slate-900">{selectedPatient.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {selectedPatient.id.slice(0, 8)} · {patientAgeGender(selectedPatient.dateOfBirth, selectedPatient.gender)} ·{' '}
                        {selectedPatient.bloodType ?? 'Unknown'}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        {selectedPatient.insuranceName ?? 'No insurance on file'}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex w-full items-center justify-center space-x-1 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-200">
                      <span>Change Patient</span>
                      <ChevronDown className="h-3 w-3" />
                    </div>
                    <select
                      aria-label="Change patient"
                      value={patientId}
                      onChange={(event) => {
                        setPatientId(event.target.value);
                        setAppointmentId('');
                      }}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    >
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Select a patient to surface clinical context, appointment notes, and medication safety checks.
                </div>
              )}
              </div>

              <div className="mb-5">
                {selectedPatient?.allergies.length ? (
                  <div className="rounded-xl border-2 border-red-200 border-l-4 border-l-red-600 bg-red-50 p-4">
                    <div className="mb-3 flex items-center space-x-2">
                      <AlertOctagon className="h-5 w-5 text-red-600" />
                      <div className="text-[10px] font-bold uppercase tracking-wider text-red-700">ALLERGY ALERT</div>
                    </div>
                    <div className="space-y-2">
                      {selectedPatient.allergies.map((allergy) => (
                        <div key={allergy} className="rounded-lg border border-red-200 bg-white p-3">
                          <div className="mb-1 text-[13px] font-bold text-red-700">⚠️ {allergy}</div>
                          <div className="text-[12px] text-red-600">Verify reaction details before prescribing related drug classes.</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-[10px] text-blue-600">✅ Allergies pulled from canonical patient records</div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <div className="text-[12px] font-bold text-emerald-700">No Known Allergies</div>
                    </div>
                    <div className="text-[10px] text-emerald-600">
                      ✅ Verified from patient allergy records · {new Date().toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  CURRENT MEDICATIONS
                </div>
                <div className="space-y-2">
                  {activeMedications.length > 0 ? (
                    activeMedications.slice(0, 8).map((medication) => (
                      <div key={medication.id} className="flex items-start space-x-2 text-[12px]">
                        <Pill className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
                        <div className="flex-1">
                          <div className="font-medium text-slate-700">
                            {medication.medicationName} {[medication.dose, medication.frequency].filter(Boolean).join(' · ')}
                          </div>
                          <div className="text-[10px] text-slate-400">{medication.prescriber}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500">
                      No active medications found in prescriptions.
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => selectedPatient && navigate(`/doctor/patients/${selectedPatient.id}`)}
                  className="mt-3 text-[11px] font-medium text-teal-600 hover:text-teal-700"
                >
                  View Full Record →
                </button>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">PRESCRIBER</div>
                <div className="space-y-1 text-[12px] text-slate-700">
                  <div className="font-bold">{profile?.full_name ?? 'Doctor'}</div>
                  <div>{doctorProfile?.specialization ?? 'Clinician'}</div>
                  <div>CeenAiX Clinic</div>
                  <div className="font-mono text-[10px] text-slate-500">{doctorProfile?.license_number ?? 'DHA license pending'}</div>
                  <div className="font-mono text-[10px] text-slate-500">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-6 xl:min-h-0 xl:overflow-y-auto">
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-slate-900">Add Medications</h2>
                <p className="text-[12px] text-slate-400">UAE medication catalog · canonical ePrescription</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(true)}
                  className="flex items-center space-x-2 rounded-lg bg-slate-100 px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Renew Existing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="flex items-center space-x-2 rounded-lg bg-slate-100 px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>History</span>
                </button>
              </div>
            </div>
            <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Prescription details</p>
              <p className="text-[12px] text-slate-500">Optional appointment link and prescription lifecycle status.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {t('doctor.createPrescription.appointment')}
              </span>
              <select
                value={appointmentId}
                onChange={(event) => setAppointmentId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">{t('doctor.createPrescription.selectAppointment')}</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointmentPickerLabel(i18n.language, appointment.scheduled_at)}
                  </option>
                ))}
              </select>
              {selectedAppointment ? (
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">
                    {t('doctor.createPrescription.appointmentPreview')}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {appointmentPickerLabel(i18n.language, selectedAppointment.scheduled_at)}
                  </p>
                  <p className="mt-1 break-words text-xs text-slate-600" dir="auto">
                    {selectedAppointment.chief_complaint?.trim() || t('doctor.appointments.noReason')}
                  </p>
                </div>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {t('doctor.createPrescription.status')}
              </span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as 'active' | 'completed' | 'cancelled')
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="active">{t('shared.prescriptionStatus.active')}</option>
                <option value="completed">{t('shared.prescriptionStatus.completed')}</option>
                <option value="cancelled">{t('shared.prescriptionStatus.cancelled')}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <MedicationItemEditor
              key={item.id}
              canRemove={items.length > 1}
              durationOptions={durationOptions}
              frequencyOptions={frequencyOptions}
              item={item}
              index={index}
              onChange={updateItem}
              onRemove={removeItem}
              showErrors={showValidationErrors}
              uiLanguage={i18n.language ?? 'en'}
              userId={user?.id ?? ''}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setItems((current) => [...current, createDraftPrescriptionItem()])}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4" />
            <span>{t('doctor.createPrescription.addItem')}</span>
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pill className="h-4 w-4" />}
            <span>{saving ? t('doctor.createPrescription.saving') : t('doctor.createPrescription.save')}</span>
          </button>
        </div>
          </div>
        </div>
      </div>
    </div>
      {showRenewModal
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setShowRenewModal(false)}
            >
              <div
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-900">Renew Existing Prescription</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRenewModal(false)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4 px-6 py-5">
                  {activeMedications.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      No active medications found for this patient to renew.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">
                        Select a medication to renew from the patient current active medications:
                      </p>
                      {activeMedications.map((medication) => (
                        <button
                          key={medication.id}
                          type="button"
                          onClick={() => {
                            setItems([
                              {
                                ...createDraftPrescriptionItem(),
                                medicationName: medication.medicationName,
                                catalogSearch: medication.medicationName,
                                dosage: medication.dose ?? '',
                                frequencyCode: '',
                              },
                            ]);
                            setShowRenewModal(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <Pill className="h-5 w-5 shrink-0 text-emerald-600" />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{medication.medicationName}</p>
                            <p className="text-xs text-slate-500">
                              {[medication.dose, medication.frequency].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setShowRenewModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      {showHistoryModal
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setShowHistoryModal(false)}
            >
              <div
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-900">Prescription History</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(false)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 py-5">
                  {activeMedications.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      No prescription history found for this patient.
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600">Current active medications for this patient:</p>
                      {activeMedications.map((medication) => (
                        <div
                          key={medication.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <Pill className="h-5 w-5 shrink-0 text-emerald-600" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">{medication.medicationName}</p>
                            <p className="text-xs text-slate-500">
                              {[medication.dose, medication.frequency].filter(Boolean).join(' · ')}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">{medication.prescriber}</p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Active
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => navigate('/doctor/prescriptions')}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    View All Prescriptions
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(false)}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
