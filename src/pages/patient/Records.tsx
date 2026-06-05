import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  FileText,
  Filter,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Stethoscope,
  Syringe,
  Trash2,
  X,
} from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { usePatientRecords } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';
import { PATIENT_RECORD_FIELD_LIMITS } from '../../lib/patient-records';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { supabase } from '../../lib/supabase';
import type { AllergySeverity, ConditionStatus } from '../../types';

type RecordCategoryFilter = 'all' | 'condition' | 'allergy' | 'vaccination';
type RecordCategory = Exclude<RecordCategoryFilter, 'all'>;

interface RecordEntry {
  id: string;
  category: RecordCategory;
  title: string;
  subtitle: string | null;
  description: string | null;
  statusLabel: string;
  displayStatus: string;
  sortValue: string | null;
  dateLabel: string | null;
  metadata: string[];
  searchText: string;
}

interface ConditionFormState {
  conditionName: string;
  icdCode: string;
  diagnosedDate: string;
  status: ConditionStatus;
  notes: string;
}

interface AllergyFormState {
  allergen: string;
  severity: AllergySeverity;
  reaction: string;
  confirmedByDoctor: boolean;
}

interface VaccinationFormState {
  vaccineName: string;
  doseNumber: string;
  administeredDate: string;
  administeredBy: string;
  nextDoseDue: string;
}

const initialConditionForm: ConditionFormState = {
  conditionName: '',
  icdCode: '',
  diagnosedDate: '',
  status: 'active',
  notes: '',
};

const initialAllergyForm: AllergyFormState = {
  allergen: '',
  severity: 'mild',
  reaction: '',
  confirmedByDoctor: false,
};

const initialVaccinationForm: VaccinationFormState = {
  vaccineName: '',
  doseNumber: '',
  administeredDate: '',
  administeredBy: '',
  nextDoseDue: '',
};

const formatDate = (value: string | null | undefined, language: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString(
    resolveLocale(language),
    dateTimeFormatWithNumerals(language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  );
};

const getStatusClasses = (category: RecordCategory, statusLabel: string) => {
  if (category === 'allergy') {
    if (statusLabel === 'severe') {
      return 'bg-red-100 text-red-700';
    }

    if (statusLabel === 'moderate') {
      return 'bg-amber-100 text-amber-700';
    }

    return 'bg-emerald-100 text-emerald-700';
  }

  if (category === 'vaccination') {
    return 'bg-violet-100 text-violet-700';
  }

  if (statusLabel === 'chronic') {
    return 'bg-red-100 text-red-700';
  }

  if (statusLabel === 'resolved') {
    return 'bg-emerald-100 text-emerald-700';
  }

  return 'bg-cyan-100 text-cyan-700';
};

const getCategoryIcon = (category: RecordCategory) => {
  if (category === 'condition') {
    return <Stethoscope className="h-5 w-5 text-cyan-600" />;
  }

  if (category === 'allergy') {
    return <ShieldAlert className="h-5 w-5 text-amber-600" />;
  }

  return <Syringe className="h-5 w-5 text-violet-600" />;
};

export const PatientRecords: React.FC = () => {
  const { t, i18n } = useTranslation();
  const recordCategoryLabel = (c: RecordCategory) =>
    c === 'condition'
      ? t('patient.records.categoryCondition')
      : c === 'allergy'
        ? t('patient.records.categoryAllergy')
        : t('patient.records.categoryVax');

  const { user } = useAuth();
  const {
    data,
    loading,
    error,
    refetch,
  } = usePatientRecords(user?.id);
  const [filterType, setFilterType] = useState<RecordCategoryFilter>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeForm, setActiveForm] = useState<RecordCategory | null>(null);
  const [conditionForm, setConditionForm] = useState<ConditionFormState>(initialConditionForm);
  const [allergyForm, setAllergyForm] = useState<AllergyFormState>(initialAllergyForm);
  const [vaccinationForm, setVaccinationForm] = useState<VaccinationFormState>(initialVaccinationForm);
  const [submittingForm, setSubmittingForm] = useState<RecordCategory | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<RecordEntry | null>(null);
  const [showFormSwitchWarning, setShowFormSwitchWarning] = useState(false);
  const [pendingForm, setPendingForm] = useState<RecordCategory | null>(null);

  useEffect(() => {
    if (!feedback) return;
    if (feedback.type !== 'success') return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const conditions = useMemo(() => data?.conditions ?? [], [data?.conditions]);
  const allergies = useMemo(() => data?.allergies ?? [], [data?.allergies]);
  const vaccinations = useMemo(() => data?.vaccinations ?? [], [data?.vaccinations]);

  const records = useMemo<RecordEntry[]>(() => {
    const cat = (c: RecordCategory) =>
      c === 'condition'
        ? t('patient.records.categoryCondition')
        : c === 'allergy'
          ? t('patient.records.categoryAllergy')
          : t('patient.records.categoryVax');

    const conditionStatusDisplay = (status: string) => {
      if (status === 'active') {
        return t('patient.records.statusActive');
      }
      if (status === 'chronic') {
        return t('patient.records.statusChronic');
      }
      if (status === 'resolved') {
        return t('patient.records.statusResolved');
      }
      return status.replace(/_/g, ' ');
    };

    const allergySeverityDisplay = (severity: string) => {
      if (severity === 'severe') {
        return t('patient.records.severitySevere');
      }
      if (severity === 'moderate') {
        return t('patient.records.severityModerate');
      }
      return t('patient.records.severityMild');
    };

    const conditionEntries = conditions.map((condition) => ({
      id: condition.id,
      category: 'condition' as const,
      title: condition.condition_name,
      subtitle: condition.icd_code ? t('patient.records.icdPrefix', { code: condition.icd_code }) : null,
      description: condition.notes ?? null,
      statusLabel: condition.status,
      displayStatus: conditionStatusDisplay(condition.status),
      sortValue: condition.diagnosed_date ?? condition.created_at,
      dateLabel: formatDate(condition.diagnosed_date, i18n.language) ?? formatDate(condition.created_at, i18n.language),
      metadata: [cat('condition'), conditionStatusDisplay(condition.status)],
      searchText: [
        condition.condition_name,
        condition.icd_code,
        condition.notes,
        condition.status,
        conditionStatusDisplay(condition.status),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    }));

    const allergyEntries = allergies.map((allergy) => ({
      id: allergy.id,
      category: 'allergy' as const,
      title: allergy.allergen,
      subtitle: allergy.reaction ? t('patient.records.reactionPrefix', { reaction: allergy.reaction }) : null,
      description: allergy.confirmed_by_doctor
        ? t('patient.records.allergyDetailDoctor')
        : t('patient.records.allergyDetailSelf'),
      statusLabel: allergy.severity,
      displayStatus: allergySeverityDisplay(allergy.severity),
      sortValue: allergy.created_at,
      dateLabel: formatDate(allergy.created_at, i18n.language),
      metadata: [
        cat('allergy'),
        allergy.confirmed_by_doctor ? t('patient.records.doctorConfirmed') : t('patient.records.selfReported'),
      ],
      searchText: [
        allergy.allergen,
        allergy.reaction,
        allergy.severity,
        allergy.confirmed_by_doctor ? t('patient.records.doctorConfirmed') : t('patient.records.selfReported'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    }));

    const vaccinationEntries = vaccinations.map((vaccination) => {
      const nextFormatted = formatDate(vaccination.next_dose_due, i18n.language);
      return {
        id: vaccination.id,
        category: 'vaccination' as const,
        title: vaccination.vaccine_name,
        subtitle: vaccination.administered_by
          ? t('patient.records.givenByPrefix', { name: vaccination.administered_by })
          : null,
        description: vaccination.next_dose_due
          ? t('patient.records.nextDoseLine', {
              date: nextFormatted ?? t('patient.records.nextDoseSoon'),
            })
          : t('patient.records.noNextDose'),
        statusLabel:
          vaccination.dose_number !== null ? `dose-${vaccination.dose_number}` : 'recorded',
        displayStatus:
          vaccination.dose_number !== null
            ? t('patient.records.doseN', { n: vaccination.dose_number })
            : t('patient.records.recorded'),
        sortValue: vaccination.administered_date ?? vaccination.created_at,
        dateLabel:
          formatDate(vaccination.administered_date, i18n.language) ??
          formatDate(vaccination.created_at, i18n.language),
        metadata: [
          cat('vaccination'),
          vaccination.next_dose_due ? t('patient.records.followUpDue') : t('patient.records.courseLogged'),
        ],
        searchText: [
          vaccination.vaccine_name,
          vaccination.administered_by,
          vaccination.next_dose_due,
          vaccination.dose_number?.toString(),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      };
    });

    return [...conditionEntries, ...allergyEntries, ...vaccinationEntries];
  }, [allergies, conditions, i18n.language, t, vaccinations]);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesType = filterType === 'all' || record.category === filterType;
        const matchesSearch =
          searchQuery.trim().length === 0 || record.searchText.includes(searchQuery.trim().toLowerCase());
        return matchesType && matchesSearch;
      }),
    [filterType, records, searchQuery]
  );

  const sortedRecords = useMemo(() => {
    const entries = [...filteredRecords];

    entries.sort((left, right) => {
      if (sortOrder === 'alphabetical') {
        return left.title.localeCompare(right.title);
      }

      const leftDate = left.sortValue ? new Date(left.sortValue).getTime() : 0;
      const rightDate = right.sortValue ? new Date(right.sortValue).getTime() : 0;

      if (sortOrder === 'oldest') {
        return leftDate - rightDate;
      }

      return rightDate - leftDate;
    });

    return entries;
  }, [filteredRecords, sortOrder]);

  const totalRecords = records.length;

  const resetForms = () => {
    setConditionForm(initialConditionForm);
    setAllergyForm(initialAllergyForm);
    setVaccinationForm(initialVaccinationForm);
    setActiveForm(null);
  };

  const hasUnsavedFormData = () => {
    if (activeForm === 'condition') {
      return (
        conditionForm.conditionName.trim() !== '' ||
        conditionForm.icdCode.trim() !== '' ||
        conditionForm.diagnosedDate !== '' ||
        conditionForm.notes.trim() !== ''
      );
    }
    if (activeForm === 'allergy') {
      return (
        allergyForm.allergen.trim() !== '' ||
        allergyForm.reaction.trim() !== ''
      );
    }
    if (activeForm === 'vaccination') {
      return (
        vaccinationForm.vaccineName.trim() !== '' ||
        vaccinationForm.administeredBy.trim() !== '' ||
        vaccinationForm.administeredDate !== '' ||
        vaccinationForm.nextDoseDue !== ''
      );
    }
    return false;
  };

  const handleSwitchForm = (form: RecordCategory) => {
    if (activeForm && activeForm !== form && hasUnsavedFormData()) {
      setPendingForm(form);
      setShowFormSwitchWarning(true);
    } else {
      resetForms();
      setActiveForm(form);
    }
  };

  const handleCreateCondition = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      return;
    }

    setFeedback(null);
    setSubmittingForm('condition');

    const { error: insertError } = await supabase.from('medical_conditions').insert({
      patient_id: user.id,
      condition_name: conditionForm.conditionName.trim(),
      icd_code: conditionForm.icdCode.trim() || null,
      diagnosed_date: conditionForm.diagnosedDate || null,
      status: conditionForm.status,
      notes: conditionForm.notes.trim() || null,
    });

    setSubmittingForm(null);

    if (insertError) {
      setFeedback({ type: 'error', message: insertError.message });
      return;
    }

    setFeedback({ type: 'success', message: t('patient.records.successCondition') });
    resetForms();
    refetch();
  };

  const handleCreateAllergy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      return;
    }

    setFeedback(null);
    setSubmittingForm('allergy');

    const { error: insertError } = await supabase.from('allergies').insert({
      patient_id: user.id,
      allergen: allergyForm.allergen.trim(),
      severity: allergyForm.severity,
      reaction: allergyForm.reaction.trim() || null,
      confirmed_by_doctor: allergyForm.confirmedByDoctor,
    });

    setSubmittingForm(null);

    if (insertError) {
      setFeedback({ type: 'error', message: insertError.message });
      return;
    }

    setFeedback({ type: 'success', message: t('patient.records.successAllergy') });
    resetForms();
    refetch();
  };

  const handleCreateVaccination = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      return;
    }

    setFeedback(null);
    setSubmittingForm('vaccination');

    const parsedDoseNumber = vaccinationForm.doseNumber.trim()
      ? Number(vaccinationForm.doseNumber)
      : null;

    if (parsedDoseNumber !== null && (!Number.isFinite(parsedDoseNumber) || parsedDoseNumber <= 0)) {
      setSubmittingForm(null);
      setFeedback({
        type: 'error',
        message: t('patient.records.errDoseNumber', { defaultValue: 'Dose number must be a positive whole number.' }),
      });
      return;
    }

    const { error: insertError } = await supabase.from('vaccinations').insert({
      patient_id: user.id,
      vaccine_name: vaccinationForm.vaccineName.trim(),
      dose_number: parsedDoseNumber !== null && Number.isFinite(parsedDoseNumber) ? parsedDoseNumber : null,
      administered_date: vaccinationForm.administeredDate || null,
      administered_by: vaccinationForm.administeredBy.trim() || null,
      next_dose_due: vaccinationForm.nextDoseDue || null,
    });

    setSubmittingForm(null);

    if (insertError) {
      setFeedback({ type: 'error', message: insertError.message });
      return;
    }

    setFeedback({ type: 'success', message: t('patient.records.successVax') });
    resetForms();
    refetch();
  };

  const handleDeleteRecord = async (record: RecordEntry) => {
    if (!user?.id) {
      return;
    }

    const tableName =
      record.category === 'condition'
        ? 'medical_conditions'
        : record.category === 'allergy'
          ? 'allergies'
          : 'vaccinations';

    setFeedback(null);
    setBusyDeleteId(record.id);

    const { error: deleteError } = await supabase
      .from(tableName)
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', record.id)
      .eq('patient_id', user.id);

    setBusyDeleteId(null);

    if (deleteError) {
      setFeedback({ type: 'error', message: deleteError.message });
      return;
    }

    setFeedback({
      type: 'success',
      message: t('patient.records.removed', { category: recordCategoryLabel(record.category) }),
    });
    refetch();
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('patient.records.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('patient.records.subtitle')}</p>
      </div>

      <div>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div
            className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
            onClick={() => setFilterType('condition')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterType('condition'); } }}
          >
            <p className="text-sm font-medium text-slate-500">{t('patient.records.conditions')}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatLocaleDigits(conditions.length, i18n.language)}
            </p>
            <p className="mt-1 text-xs font-medium text-teal-600">{t('patient.records.conditionsSub')}</p>
          </div>
          <div
            className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
            onClick={() => setFilterType('allergy')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterType('allergy'); } }}
          >
            <p className="text-sm font-medium text-slate-500">{t('patient.records.allergies')}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatLocaleDigits(allergies.length, i18n.language)}
            </p>
            <p className="mt-1 text-xs font-medium text-amber-600">{t('patient.records.allergiesSub')}</p>
          </div>
          <div
            className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
            onClick={() => setFilterType('vaccination')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterType('vaccination'); } }}
          >
            <p className="text-sm font-medium text-slate-500">{t('patient.records.vaccinations')}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatLocaleDigits(vaccinations.length, i18n.language)}
            </p>
            <p className="mt-1 text-xs font-medium text-violet-600">{t('patient.records.vaccinationsSub')}</p>
          </div>
          <div
            className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
            onClick={() => setFilterType('all')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterType('all'); } }}
          >
            <p className="text-sm font-medium text-slate-500">{t('patient.records.totalEntries')}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatLocaleDigits(totalRecords, i18n.language)}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-600">{t('patient.records.totalSub')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 rtl:left-auto rtl:right-4" />
              <input
                type="text"
                placeholder={t('patient.records.searchPh')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={FORM_FIELD_LIMITS.searchQuery}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 rtl:left-auto rtl:right-3" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as RecordCategoryFilter)}
                  className="pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-medium appearance-none bg-white cursor-pointer"
                >
                  <option value="all">{t('patient.records.filterAllRecords')}</option>
                  <option value="condition">{t('patient.records.filterCondition')}</option>
                  <option value="allergy">{t('patient.records.filterAllergy')}</option>
                  <option value="vaccination">{t('patient.records.filterVax')}</option>
                </select>
              </div>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'alphabetical')}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-medium appearance-none bg-white cursor-pointer"
              >
                <option value="newest">{t('patient.records.sortNewest')}</option>
                <option value="oldest">{t('patient.records.sortOldest')}</option>
                <option value="alphabetical">{t('patient.records.sortAlpha')}</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {t('patient.records.showing', { shown: sortedRecords.length, total: totalRecords })}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSwitchForm('condition')}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
              >
                <Plus className="h-4 w-4" />
                {t('patient.records.addCondition')}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchForm('allergy')}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
              >
                <Plus className="h-4 w-4" />
                {t('patient.records.addAllergy')}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchForm('vaccination')}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                <Plus className="h-4 w-4" />
                {t('patient.records.addVax')}
              </button>
            </div>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
            role="alert"
          >
            {feedback.message}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
            <button
              type="button"
              onClick={() => void refetch()}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          </div>
        ) : null}

        {activeForm === 'condition' ? (
          <form onSubmit={handleCreateCondition} className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('patient.records.addCondition')}</h2>
                <p className="mt-1 text-sm text-gray-600">{t('patient.records.addConditionSub')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedFormData()) {
                    setShowFormSwitchWarning(true);
                    setPendingForm(null);
                  } else {
                    resetForms();
                  }
                }}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                aria-label={t('patient.records.closeForm')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.conditionName')} <span className="text-red-500">*</span></span>
                <input
                  required
                  type="text"
                  maxLength={PATIENT_RECORD_FIELD_LIMITS.conditionName}
                  value={conditionForm.conditionName}
                  onChange={(event) =>
                    setConditionForm((current) => ({ ...current, conditionName: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.icdCode')} <span className="text-slate-400 font-normal text-xs">(optional)</span></span>
                <input
                  type="text"
                  maxLength={PATIENT_RECORD_FIELD_LIMITS.icdCode}
                  value={conditionForm.icdCode}
                  onChange={(event) =>
                    setConditionForm((current) => ({ ...current, icdCode: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.diagnosedDate')} <span className="text-slate-400 font-normal text-xs">(optional)</span></span>
                <input
                  type="date"
                  value={conditionForm.diagnosedDate}
                  onChange={(event) =>
                    setConditionForm((current) => ({ ...current, diagnosedDate: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.status')} <span className="text-red-500">*</span></span>
                <select
                  value={conditionForm.status}
                  onChange={(event) =>
                    setConditionForm((current) => ({
                      ...current,
                      status: event.target.value as ConditionStatus,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                >
                  <option value="active">{t('patient.records.statusActive')}</option>
                  <option value="chronic">{t('patient.records.statusChronic')}</option>
                  <option value="resolved">{t('patient.records.statusResolved')}</option>
                </select>
              </label>
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.notes')} <span className="text-slate-400 font-normal text-xs">(optional)</span></span>
                <textarea
                  rows={4}
                  maxLength={PATIENT_RECORD_FIELD_LIMITS.notes}
                  value={conditionForm.notes}
                  onChange={(event) =>
                    setConditionForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submittingForm === 'condition'}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-ceenai-navy via-ceenai-blue to-ceenai-cyan px-5 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {submittingForm === 'condition' ? t('patient.records.saving') : t('patient.records.saveCondition')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedFormData()) {
                    setShowFormSwitchWarning(true);
                    setPendingForm(null);
                  } else {
                    resetForms();
                  }
                }}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                {t('patient.records.cancel')}
              </button>
            </div>
          </form>
        ) : null}

        {activeForm === 'allergy' ? (
          <form onSubmit={handleCreateAllergy} className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('patient.records.addAllergy')}</h2>
                <p className="mt-1 text-sm text-gray-600">{t('patient.records.addAllergySub')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedFormData()) {
                    setShowFormSwitchWarning(true);
                    setPendingForm(null);
                  } else {
                    resetForms();
                  }
                }}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                aria-label={t('patient.records.closeForm')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.allergen')} <span className="text-red-500">*</span></span>
                <input
                  required
                  type="text"
                  maxLength={PATIENT_RECORD_FIELD_LIMITS.allergen}
                  value={allergyForm.allergen}
                  onChange={(event) =>
                    setAllergyForm((current) => ({ ...current, allergen: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.severity')} <span className="text-red-500">*</span></span>
                <select
                  value={allergyForm.severity}
                  onChange={(event) =>
                    setAllergyForm((current) => ({
                      ...current,
                      severity: event.target.value as AllergySeverity,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                >
                  <option value="mild">{t('patient.records.severityMild')}</option>
                  <option value="moderate">{t('patient.records.severityModerate')}</option>
                  <option value="severe">{t('patient.records.severitySevere')}</option>
                </select>
              </label>
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.reaction')} <span className="text-slate-400 font-normal text-xs">(optional)</span></span>
                <textarea
                  rows={4}
                  maxLength={PATIENT_RECORD_FIELD_LIMITS.reaction}
                  value={allergyForm.reaction}
                  onChange={(event) =>
                    setAllergyForm((current) => ({ ...current, reaction: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </label>
              <label className="inline-flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={allergyForm.confirmedByDoctor}
                  onChange={(event) =>
                    setAllergyForm((current) => ({
                      ...current,
                      confirmedByDoctor: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                {t('patient.records.confirmAllergyDoctor')}
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submittingForm === 'allergy'}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {submittingForm === 'allergy' ? t('patient.records.saving') : t('patient.records.saveAllergy')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedFormData()) {
                    setShowFormSwitchWarning(true);
                    setPendingForm(null);
                  } else {
                    resetForms();
                  }
                }}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                {t('patient.records.cancel')}
              </button>
            </div>
          </form>
        ) : null}

        {activeForm === 'vaccination' ? (
          <form onSubmit={handleCreateVaccination} className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('patient.records.addVax')}</h2>
                <p className="mt-1 text-sm text-gray-600">{t('patient.records.addVaxSub')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedFormData()) {
                    setShowFormSwitchWarning(true);
                    setPendingForm(null);
                  } else {
                    resetForms();
                  }
                }}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                aria-label={t('patient.records.closeForm')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.vaccineName')} <span className="text-red-500">*</span></span>
                <input
                  required
                  type="text"
                  maxLength={PATIENT_RECORD_FIELD_LIMITS.vaccineName}
                  value={vaccinationForm.vaccineName}
                  onChange={(event) =>
                    setVaccinationForm((current) => ({ ...current, vaccineName: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.doseNumber')} <span className="text-slate-400 font-normal text-xs">(optional)</span></span>
                <input
                  type="number"
                  min={1}
                  max={PATIENT_RECORD_FIELD_LIMITS.doseNumberMax}
                  value={vaccinationForm.doseNumber}
                  onChange={(event) =>
                    setVaccinationForm((current) => ({ ...current, doseNumber: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.administeredDate')} <span className="text-slate-400 font-normal text-xs">(optional)</span></span>
                <input
                  type="date"
                  value={vaccinationForm.administeredDate}
                  onChange={(event) =>
                    setVaccinationForm((current) => ({
                      ...current,
                      administeredDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.administeredBy')} <span className="text-slate-400 font-normal text-xs">(optional)</span></span>
                <input
                  type="text"
                  maxLength={PATIENT_RECORD_FIELD_LIMITS.administeredBy}
                  value={vaccinationForm.administeredBy}
                  onChange={(event) =>
                    setVaccinationForm((current) => ({
                      ...current,
                      administeredBy: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
              </label>
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-gray-700">{t('patient.records.nextDose')} <span className="text-slate-400 font-normal text-xs">(optional)</span></span>
                <input
                  type="date"
                  value={vaccinationForm.nextDoseDue}
                  onChange={(event) =>
                    setVaccinationForm((current) => ({ ...current, nextDoseDue: event.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submittingForm === 'vaccination'}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {submittingForm === 'vaccination' ? t('patient.records.saving') : t('patient.records.saveVax')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedFormData()) {
                    setShowFormSwitchWarning(true);
                    setPendingForm(null);
                  } else {
                    resetForms();
                  }
                }}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                {t('patient.records.cancel')}
              </button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        ) : sortedRecords.length === 0 ? (
          <div className="relative bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
              <img
                src="https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=400"
                alt={t('patient.records.title')}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-ceenai-cyan to-ceenai-blue rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('patient.records.noMatchTitle')}</h3>
              <p className="text-gray-600">{t('patient.records.emptyStateBody')}</p>
              <button
                type="button"
                onClick={() => setActiveForm('condition')}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-ceenai-navy via-ceenai-blue to-ceenai-cyan px-5 py-3 text-sm font-semibold text-white transition hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                {t('patient.records.emptyStateCta')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedRecords.map((record) => (
              <div key={record.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-gray-50 p-3">{getCategoryIcon(record.category)}</div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900">{record.title}</h3>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase text-gray-600">
                          {recordCategoryLabel(record.category)}
                        </span>
                      </div>
                      {record.subtitle ? (
                        <p className="mt-1 text-sm font-medium text-gray-600">{record.subtitle}</p>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusClasses(
                      record.category,
                      record.category === 'vaccination' ? 'recorded' : record.statusLabel
                    )}`}
                  >
                    {record.displayStatus}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {record.metadata.map((item) => (
                    <span
                      key={`${record.id}-${item}`}
                      className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600"
                    >
                      {item}
                    </span>
                  ))}
                  {record.dateLabel ? (
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                      {t('patient.records.recordedOn', { date: record.dateLabel })}
                    </span>
                  ) : null}
                </div>

                {record.description ? (
                  <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                    {record.description}
                  </div>
                ) : null}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteRecord(record)}
                    disabled={busyDeleteId === record.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {busyDeleteId === record.id ? t('patient.records.removing') : t('patient.records.remove')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && totalRecords > 0 ? (
          <div className="mt-6 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600" />
              <p>{t('patient.records.footerDisclaimer')}</p>
            </div>
          </div>
        ) : null}
      </div>

      {confirmDeleteRecord ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmDeleteRecord(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                Remove {recordCategoryLabel(confirmDeleteRecord.category)}?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{confirmDeleteRecord.title}</span> will be permanently removed from your records. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmDeleteRecord(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyDeleteId === confirmDeleteRecord.id}
                onClick={async () => {
                  await handleDeleteRecord(confirmDeleteRecord);
                  setConfirmDeleteRecord(null);
                }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyDeleteId === confirmDeleteRecord.id ? t('patient.records.removing') : t('patient.records.remove')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {showFormSwitchWarning ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowFormSwitchWarning(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-slate-900">
                Discard unsaved data?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                You have unsaved information in this form. Are you sure you want to switch? Your changes will be lost.
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setShowFormSwitchWarning(false);
                  setPendingForm(null);
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForms();
                  if (pendingForm) setActiveForm(pendingForm);
                  setShowFormSwitchWarning(false);
                  setPendingForm(null);
                }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
};
