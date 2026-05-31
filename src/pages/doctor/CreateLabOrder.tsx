import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Plus, Search, TestTube2, Trash2 } from 'lucide-react';
import { LabTestNameDisplay } from '../../components/LabTestNameDisplay';
import {
  useDoctorPatients,
  useLabTestCatalogSearch,
  useQuery,
} from '../../hooks';
import type {
  LabTestCatalog,
  LabTestCatalogSuggestion,
} from '../../types';
import { useAuth } from '../../lib/auth-context';
import {
  getLabTestCatalogDisplayNameAr,
  getLabTestCatalogDisplayNameEn,
  getLabTestSuggestionDisplayNameEn,
} from '../../lib/lab-test-catalog';
import { appointmentPickerLabel } from '../../lib/i18n-ui';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { supabase } from '../../lib/supabase';

interface DraftLabOrderItem {
  id: string;
  catalogSearch: string;
  labTestCatalogId: string | null;
  labTestCatalogSuggestionId: string | null;
  selectedCatalogDisplayNameEn: string;
  testName: string;
  testNameAr: string;
  testCode: string;
}

interface DraftNewLabTestSuggestion {
  displayNameEn: string;
  displayNameAr: string;
  sourceCode: string;
  shortNameEn: string;
  specimen: string;
  property: string;
  category: string;
  isPanel: boolean;
}

interface LabOrderItemEditorProps {
  canRemove: boolean;
  index: number;
  item: DraftLabOrderItem;
  onChange: (id: string, nextState: Partial<DraftLabOrderItem>) => void;
  onRemove: (id: string) => void;
  showErrors: boolean;
  uiLanguage: string;
  userId: string;
}

const createDraftLabOrderItem = (): DraftLabOrderItem => ({
  id: crypto.randomUUID(),
  catalogSearch: '',
  labTestCatalogId: null,
  labTestCatalogSuggestionId: null,
  selectedCatalogDisplayNameEn: '',
  testName: '',
  testNameAr: '',
  testCode: '',
});

const createDraftLabTestSuggestion = (displayNameEn = ''): DraftNewLabTestSuggestion => ({
  displayNameEn,
  displayNameAr: '',
  sourceCode: '',
  shortNameEn: '',
  specimen: '',
  property: '',
  category: '',
  isPanel: false,
});

const buildPendingSuggestionSelection = (
  suggestion: Pick<
    LabTestCatalogSuggestion,
    | 'id'
    | 'lab_test_catalog_id'
    | 'proposed_display_name_en'
    | 'proposed_display_name_ar'
    | 'proposed_short_name_en'
    | 'proposed_source_code'
  >,
  fallbackCatalog?: LabTestCatalog | null
) => ({
  labTestCatalogId: suggestion.lab_test_catalog_id ?? fallbackCatalog?.id ?? null,
  labTestCatalogSuggestionId: suggestion.id,
  selectedCatalogDisplayNameEn:
    suggestion.proposed_display_name_en?.trim() || fallbackCatalog?.display_name_en || '',
  testName: getLabTestSuggestionDisplayNameEn(suggestion, fallbackCatalog),
  testNameAr:
    suggestion.proposed_display_name_ar?.trim() ||
    getLabTestCatalogDisplayNameAr(fallbackCatalog ?? { display_name_ar: null }) ||
    '',
  testCode: suggestion.proposed_source_code?.trim() || fallbackCatalog?.source_code?.trim() || '',
});

const LabOrderItemEditor: React.FC<LabOrderItemEditorProps> = ({
  canRemove,
  index,
  item,
  onChange,
  onRemove,
  showErrors,
  uiLanguage,
  userId,
}) => {
  const { t } = useTranslation('common');
  const [showTranslationForm, setShowTranslationForm] = useState(false);
  const [translationDraft, setTranslationDraft] = useState(item.testNameAr);
  const [showNewTestForm, setShowNewTestForm] = useState(false);
  const [newTestDraft, setNewTestDraft] = useState(createDraftLabTestSuggestion());
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const {
    data: searchResults,
    loading: searchLoading,
    refetch: refetchSearchResults,
  } = useLabTestCatalogSearch(userId, item.catalogSearch);

  const catalogMatches = useMemo(() => searchResults?.catalogMatches ?? [], [searchResults?.catalogMatches]);
  const pendingSuggestionMatches = useMemo(
    () => searchResults?.pendingSuggestionMatches ?? [],
    [searchResults?.pendingSuggestionMatches]
  );
  const hasSearchTerm = item.catalogSearch.trim().length >= 2;
  const pendingTranslationForSelectedCatalog =
    item.labTestCatalogId && !item.labTestCatalogSuggestionId
      ? pendingSuggestionMatches.find(
          (suggestion) =>
            suggestion.suggestion_type === 'translation' &&
            suggestion.lab_test_catalog_id === item.labTestCatalogId
        ) ?? null
      : null;

  const clearSelection = () => {
    onChange(item.id, {
      catalogSearch: '',
      labTestCatalogId: null,
      labTestCatalogSuggestionId: null,
      selectedCatalogDisplayNameEn: '',
      testName: '',
      testNameAr: '',
      testCode: '',
    });
    setTranslationDraft('');
    setShowTranslationForm(false);
    setShowNewTestForm(false);
    setSuggestionError(null);
  };

  const selectCatalogMatch = (catalogMatch: LabTestCatalog) => {
    onChange(item.id, {
      catalogSearch: getLabTestCatalogDisplayNameEn(catalogMatch),
      labTestCatalogId: catalogMatch.id,
      labTestCatalogSuggestionId: null,
      selectedCatalogDisplayNameEn: catalogMatch.display_name_en,
      testName: getLabTestCatalogDisplayNameEn(catalogMatch),
      testNameAr: getLabTestCatalogDisplayNameAr(catalogMatch) || '',
      testCode: catalogMatch.source_code?.trim() || '',
    });
    setTranslationDraft(getLabTestCatalogDisplayNameAr(catalogMatch) || '');
    setShowTranslationForm(false);
    setShowNewTestForm(false);
    setSuggestionError(null);
  };

  const selectPendingSuggestion = (
    suggestion: Pick<
      LabTestCatalogSuggestion,
      | 'id'
      | 'lab_test_catalog_id'
      | 'proposed_display_name_en'
      | 'proposed_display_name_ar'
      | 'proposed_short_name_en'
      | 'proposed_source_code'
    >,
    fallbackCatalog?: LabTestCatalog | null
  ) => {
    onChange(item.id, {
      catalogSearch: getLabTestSuggestionDisplayNameEn(suggestion, fallbackCatalog),
      ...buildPendingSuggestionSelection(suggestion, fallbackCatalog),
    });
    setTranslationDraft(suggestion.proposed_display_name_ar?.trim() || '');
    setShowTranslationForm(false);
    setShowNewTestForm(false);
    setSuggestionError(null);
  };

  const submitTranslationSuggestion = async () => {
    if (!item.labTestCatalogId || !translationDraft.trim()) {
      setSuggestionError(t('doctor.createLabOrder.translationRequired'));
      return;
    }

    setSubmittingSuggestion(true);
    setSuggestionError(null);

    const { data: insertedSuggestion, error } = await supabase
      .from('lab_test_catalog_suggestions')
      .insert({
        lab_test_catalog_id: item.labTestCatalogId,
        suggestion_type: 'translation',
        proposed_display_name_en: item.selectedCatalogDisplayNameEn || item.testName,
        proposed_display_name_ar: translationDraft.trim(),
        proposed_source_code: item.testCode.trim() || null,
        created_by: userId,
      })
      .select('*')
      .maybeSingle();

    setSubmittingSuggestion(false);

    if (error || !insertedSuggestion) {
      setSuggestionError(error?.message ?? t('doctor.createLabOrder.suggestionSaveError'));
      return;
    }

    selectPendingSuggestion(insertedSuggestion, {
      id: item.labTestCatalogId,
      source: 'loinc',
      source_code: item.testCode.trim() || null,
      loinc_class: null,
      category: null,
      display_name_en: item.selectedCatalogDisplayNameEn || item.testName,
      display_name_ar: null,
      short_name_en: null,
      specimen: null,
      property: null,
      is_panel: false,
      is_active: true,
      is_custom: false,
      source_updated_at: null,
      last_synced_at: null,
      created_at: '',
      updated_at: '',
    });
    void refetchSearchResults();
  };

  const submitNewLabTestSuggestion = async () => {
    if (!newTestDraft.displayNameEn.trim()) {
      setSuggestionError(t('doctor.createLabOrder.testNameRequired'));
      return;
    }

    setSubmittingSuggestion(true);
    setSuggestionError(null);

    const { data: insertedSuggestion, error } = await supabase
      .from('lab_test_catalog_suggestions')
      .insert({
        suggestion_type: 'new_lab_test',
        proposed_display_name_en: newTestDraft.displayNameEn.trim(),
        proposed_display_name_ar: newTestDraft.displayNameAr.trim() || null,
        proposed_source_code: newTestDraft.sourceCode.trim() || null,
        proposed_short_name_en: newTestDraft.shortNameEn.trim() || null,
        proposed_specimen: newTestDraft.specimen.trim() || null,
        proposed_property: newTestDraft.property.trim() || null,
        proposed_category: newTestDraft.category.trim() || null,
        proposed_is_panel: newTestDraft.isPanel,
        created_by: userId,
      })
      .select('*')
      .maybeSingle();

    setSubmittingSuggestion(false);

    if (error || !insertedSuggestion) {
      setSuggestionError(error?.message ?? t('doctor.createLabOrder.suggestionSaveError'));
      return;
    }

    selectPendingSuggestion(insertedSuggestion, null);
    setShowNewTestForm(false);
    void refetchSearchResults();
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">
          {t('doctor.createLabOrder.itemHeading', { count: index + 1 })}
        </h3>
        {canRemove ? (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            <span>{t('doctor.createLabOrder.remove')}</span>
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-900">
            {t('doctor.createLabOrder.searchTest')}
          </span>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
            <input
              type="text"
              value={item.catalogSearch}
              onChange={(event) =>
                onChange(item.id, {
                  catalogSearch: event.target.value,
                  labTestCatalogId: null,
                  labTestCatalogSuggestionId: null,
                  selectedCatalogDisplayNameEn: '',
                  testName: '',
                  testNameAr: '',
                  testCode: '',
                })
              }
              placeholder={t('doctor.createLabOrder.searchTestPlaceholder')}
              maxLength={FORM_FIELD_LIMITS.searchQuery}
              className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition rtl:pl-4 rtl:pr-11 ${
                showErrors && !item.testName
                  ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
              }`}
            />
          </div>
          {showErrors && !item.testName ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">⚠️ Please search and select a lab test</p>
          ) : null}
        </label>

        {item.testName ? (
          <div className="mt-4 rounded-2xl border border-cyan-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                  {item.labTestCatalogSuggestionId
                    ? t('doctor.createLabOrder.pendingSelection')
                    : t('doctor.createLabOrder.selectedTest')}
                </p>
                <div className="mt-2">
                  <LabTestNameDisplay
                    canonicalName={item.testName}
                    localizedName={item.testNameAr || null}
                    language={uiLanguage}
                    primaryClassName="font-semibold text-slate-900"
                    secondaryClassName="mt-0.5 text-xs text-slate-500"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {item.testCode || t('doctor.labOrders.noCode')}
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {t('doctor.createLabOrder.clearSelection')}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {item.labTestCatalogId && !item.labTestCatalogSuggestionId && !pendingTranslationForSelectedCatalog ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowTranslationForm((current) => !current);
                    setShowNewTestForm(false);
                    setSuggestionError(null);
                  }}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  {t('doctor.createLabOrder.suggestArabicTranslation')}
                </button>
              ) : null}

              {item.labTestCatalogSuggestionId ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                  {t('doctor.createLabOrder.pendingBadge')}
                </span>
              ) : null}
            </div>

            {showTranslationForm ? (
              <div className="mt-4 grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">
                    {t('doctor.createLabOrder.arabicLabel')}
                  </span>
                  <input
                    type="text"
                    value={translationDraft}
                    onChange={(event) => setTranslationDraft(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </label>
                <button
                  type="button"
                  onClick={submitTranslationSuggestion}
                  disabled={submittingSuggestion}
                  className="self-end rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submittingSuggestion ? t('doctor.createLabOrder.saving') : t('doctor.createLabOrder.saveSuggestion')}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {suggestionError ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {suggestionError}
          </div>
        ) : null}

        {hasSearchTerm ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.createLabOrder.approvedMatches')}
              </p>
              <div className="mt-2 space-y-2">
                {catalogMatches.map((catalogMatch) => (
                  <button
                    key={catalogMatch.id}
                    type="button"
                    onClick={() => selectCatalogMatch(catalogMatch)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <LabTestNameDisplay
                          canonicalName={catalogMatch.displayNameEn}
                          localizedName={catalogMatch.displayNameAr}
                          language={uiLanguage}
                          primaryClassName="font-semibold text-slate-900"
                          secondaryClassName="mt-0.5 text-xs text-slate-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {catalogMatch.source_code || t('doctor.labOrders.noCode')}
                        </p>
                      </div>
                      {catalogMatch.is_panel ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {t('doctor.createLabOrder.panel')}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
                {!searchLoading && catalogMatches.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('doctor.createLabOrder.noApprovedMatches')}</p>
                ) : null}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('doctor.createLabOrder.pendingSuggestions')}
              </p>
              <div className="mt-2 space-y-2">
                {pendingSuggestionMatches.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => selectPendingSuggestion(suggestion, suggestion.fallbackCatalog)}
                    className="w-full rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-left transition hover:bg-amber-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <LabTestNameDisplay
                          canonicalName={suggestion.displayNameEn}
                          localizedName={suggestion.displayNameAr}
                          language={uiLanguage}
                          primaryClassName="font-semibold text-slate-900"
                          secondaryClassName="mt-0.5 text-xs text-slate-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {suggestion.proposed_source_code || suggestion.fallbackCatalog?.source_code || t('doctor.labOrders.noCode')}
                        </p>
                      </div>
                      <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                        {t('doctor.createLabOrder.pendingBadge')}
                      </span>
                    </div>
                  </button>
                ))}
                {!searchLoading && pendingSuggestionMatches.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('doctor.createLabOrder.noPendingSuggestions')}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowNewTestForm((current) => !current);
              setShowTranslationForm(false);
              setSuggestionError(null);
              setNewTestDraft(createDraftLabTestSuggestion(item.catalogSearch.trim()));
            }}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            {t('doctor.createLabOrder.suggestMissingTest')}
          </button>
        </div>

        {showNewTestForm ? (
          <div className="mt-4 space-y-4 rounded-2xl border border-amber-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createLabOrder.testName')}
                </span>
                <input
                  type="text"
                  value={newTestDraft.displayNameEn}
                  onChange={(event) =>
                    setNewTestDraft((current) => ({ ...current, displayNameEn: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  maxLength={FORM_FIELD_LIMITS.shortText}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createLabOrder.arabicLabel')}
                </span>
                <input
                  type="text"
                  value={newTestDraft.displayNameAr}
                  onChange={(event) =>
                    setNewTestDraft((current) => ({ ...current, displayNameAr: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  maxLength={FORM_FIELD_LIMITS.shortText}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createLabOrder.testCode')}
                </span>
                <input
                  type="text"
                  value={newTestDraft.sourceCode}
                  onChange={(event) =>
                    setNewTestDraft((current) => ({ ...current, sourceCode: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  maxLength={FORM_FIELD_LIMITS.icdCode}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createLabOrder.shortName')}
                </span>
                <input
                  type="text"
                  value={newTestDraft.shortNameEn}
                  onChange={(event) =>
                    setNewTestDraft((current) => ({ ...current, shortNameEn: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  maxLength={FORM_FIELD_LIMITS.shortText}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createLabOrder.specimen')}
                </span>
                <input
                  type="text"
                  value={newTestDraft.specimen}
                  onChange={(event) =>
                    setNewTestDraft((current) => ({ ...current, specimen: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  maxLength={FORM_FIELD_LIMITS.shortText}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createLabOrder.property')}
                </span>
                <input
                  type="text"
                  value={newTestDraft.property}
                  onChange={(event) =>
                    setNewTestDraft((current) => ({ ...current, property: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  maxLength={FORM_FIELD_LIMITS.shortText}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  {t('doctor.createLabOrder.category')}
                </span>
                <input
                  type="text"
                  value={newTestDraft.category}
                  onChange={(event) =>
                    setNewTestDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  maxLength={FORM_FIELD_LIMITS.shortText}
                />
              </label>
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={newTestDraft.isPanel}
                onChange={(event) =>
                  setNewTestDraft((current) => ({ ...current, isPanel: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>{t('doctor.createLabOrder.isPanel')}</span>
            </label>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={submitNewLabTestSuggestion}
                disabled={submittingSuggestion}
                className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {submittingSuggestion ? t('doctor.createLabOrder.saving') : t('doctor.createLabOrder.saveSuggestion')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const CreateLabOrder: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: patientsData } = useDoctorPatients(user?.id);
  const patients = useMemo(() => patientsData ?? [], [patientsData]);
  const [patientId, setPatientId] = useState(searchParams.get('patient') ?? '');
  const [appointmentId, setAppointmentId] = useState(searchParams.get('appointment') ?? '');
  const [items, setItems] = useState<DraftLabOrderItem[]>(() => {
    const first = createDraftLabOrderItem();
    const prefillTest = searchParams.get('test')?.trim();
    return [prefillTest ? { ...first, testName: prefillTest } : first];
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

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

  const appointments = useMemo(() => appointmentsData ?? [], [appointmentsData]);
  const selectedAppointment = useMemo(
    () => appointments.find((appointment) => appointment.id === appointmentId) ?? null,
    [appointmentId, appointments]
  );

  const updateItem = (id: string, nextState: Partial<DraftLabOrderItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...nextState } : item))
    );
  };

  const submit = async () => {
    setShowValidationErrors(true);

    if (!user?.id || !patientId) {
      setFeedback({ type: 'error', message: t('doctor.createLabOrder.patientRequired') });
      return;
    }

    const normalizedItems = items
      .map((item) => ({
        labTestCatalogId: item.labTestCatalogId,
        labTestCatalogSuggestionId: item.labTestCatalogSuggestionId,
        testName: item.testName.trim(),
        testCode: item.testCode.trim(),
      }))
      .filter((item) => item.testName.length > 0);

    if (normalizedItems.length === 0) {
      setFeedback({ type: 'error', message: t('doctor.createLabOrder.itemRequired') });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const { data: insertedLabOrder, error: labOrderError } = await supabase
      .from('lab_orders')
      .insert({
        patient_id: patientId,
        doctor_id: user.id,
        appointment_id: appointmentId || null,
        status: 'ordered',
      })
      .select('id')
      .maybeSingle();

    if (labOrderError || !insertedLabOrder) {
      setSaving(false);
      setFeedback({ type: 'error', message: labOrderError?.message ?? t('doctor.createLabOrder.saveError') });
      return;
    }

    const { error: itemsError } = await supabase.from('lab_order_items').insert(
      normalizedItems.map((item) => ({
        lab_order_id: insertedLabOrder.id,
        lab_test_catalog_id: item.labTestCatalogId,
        lab_test_catalog_suggestion_id: item.labTestCatalogSuggestionId,
        test_name: item.testName,
        test_code: item.testCode || null,
        status: 'ordered',
      }))
    );

    if (itemsError) {
      setSaving(false);
      setFeedback({ type: 'error', message: itemsError.message });
      return;
    }

    await supabase.from('notifications').insert({
      user_id: patientId,
      type: 'system',
      title: 'New lab order created',
      body: 'Your doctor added a new lab order to your care plan.',
      action_url: '/patient/appointments',
    });

    setSaving(false);
    setShowValidationErrors(false);
    setFeedback({ type: 'success', message: t('doctor.createLabOrder.saveSuccess') });
    navigate('/doctor/lab-orders');
  };

  return (
    <>
        <div>
          <button
            type="button"
            onClick={() => navigate('/doctor/lab-orders')}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Lab Orders
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{t('doctor.createLabOrder.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('doctor.createLabOrder.subtitle')}</p>
        </div>

      <div className="mx-auto w-full max-w-5xl space-y-6">
        {feedback ? (
          <div
            role="alert"
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">
                {t('doctor.createLabOrder.patient')}
              </span>
              <select
                value={patientId}
                onChange={(event) => {
                  setPatientId(event.target.value);
                  setAppointmentId('');
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                showValidationErrors && !patientId
                  ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
              }`}
              >
                <option value="">{t('doctor.createLabOrder.selectPatient')}</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
              {showValidationErrors && !patientId ? (
                <p className="mt-1.5 text-xs font-medium text-red-600">⚠️ Please select a patient</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">
                {t('doctor.createLabOrder.appointment')}
              </span>
              <select
                value={appointmentId}
                onChange={(event) => setAppointmentId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">{t('doctor.createLabOrder.selectAppointment')}</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointmentPickerLabel(i18n.language, appointment.scheduled_at)}
                  </option>
                ))}
              </select>
              {selectedAppointment ? (
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">
                    {t('doctor.createLabOrder.appointmentPreview')}
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
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <LabOrderItemEditor
              key={item.id}
              canRemove={items.length > 1}
              index={index}
              item={item}
              onChange={updateItem}
              onRemove={(id) => setItems((current) => current.filter((currentItem) => currentItem.id !== id))}
              showErrors={showValidationErrors}
              uiLanguage={i18n.language}
              userId={user?.id ?? ''}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setItems((current) => [...current, createDraftLabOrderItem()])}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50"
          >
            <Plus className="h-4 w-4" />
            <span>{t('doctor.createLabOrder.addItem')}</span>
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
            <span>{saving ? t('doctor.createLabOrder.saving') : t('doctor.createLabOrder.save')}</span>
          </button>
        </div>
      </div>
    </>
  );
};
