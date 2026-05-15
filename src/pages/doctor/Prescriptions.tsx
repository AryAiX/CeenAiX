import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, MessageSquare, Pill, Search, Users } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { MedicationNameDisplay } from '../../components/MedicationNameDisplay';
import { useDoctorPrescriptions } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import {
  dateTimeFormatWithNumerals,
  formatLocaleDigits,
  prescriptionStatusLabel,
  resolveLocale,
} from '../../lib/i18n-ui';
import { formatMedicationDetailLine } from '../../lib/medication-display';

export const DoctorPrescriptions: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();
  const locale = resolveLocale(i18n.language);
  const uiLang = i18n.language ?? 'en';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'history'>('all');
  const { data, loading, error } = useDoctorPrescriptions(user?.id);
  const prescriptions = useMemo(() => data ?? [], [data]);
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(
      locale,
      dateTimeFormatWithNumerals(uiLang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    );

  const filteredPrescriptions = useMemo(
    () =>
      prescriptions.filter((prescription) => {
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' ? prescription.status === 'active' : prescription.status !== 'active');
        const searchValue = searchQuery.trim().toLowerCase();

        if (!matchesStatus) {
          return false;
        }

        if (searchValue.length === 0) {
          return true;
        }

        const haystack = [
          prescription.patientName,
          prescription.patientEmail,
          prescription.status,
          ...prescription.items.flatMap((item) => [
            item.medication_name,
            item.medication_name_ar,
            item.dosage,
            item.frequency,
            item.duration,
            item.instructions,
          ]),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(searchValue);
      }),
    [prescriptions, searchQuery, statusFilter]
  );

  const activePrescriptions = useMemo(
    () => filteredPrescriptions.filter((prescription) => prescription.status === 'active'),
    [filteredPrescriptions]
  );
  const historyPrescriptions = useMemo(
    () => filteredPrescriptions.filter((prescription) => prescription.status !== 'active'),
    [filteredPrescriptions]
  );
  const uniquePatientsCount = useMemo(
    () => new Set(prescriptions.map((prescription) => prescription.patient_id)).size,
    [prescriptions]
  );
  const activePrescriptionCount = useMemo(
    () => prescriptions.filter((prescription) => prescription.status === 'active').length,
    [prescriptions]
  );
  const pendingDispenseCount = useMemo(
    () =>
      prescriptions
        .filter((prescription) => prescription.status === 'active')
        .flatMap((prescription) => prescription.items)
        .filter((item) => !item.is_dispensed).length,
    [prescriptions]
  );

  if (loading) {
    return (
      <>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('doctor.prescriptions.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('doctor.prescriptions.subtitle')}</p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('doctor.prescriptions.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('doctor.prescriptions.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/doctor/prescriptions/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
        >
          <Pill className="h-4 w-4" />
          <span>{t('doctor.createPrescription.create')}</span>
        </button>
      </div>

      <div>
        {error ? (
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t('doctor.prescriptions.loadError')}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t('doctor.prescriptions.activePlans')}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatLocaleDigits(activePrescriptionCount, uiLang)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t('doctor.prescriptions.pendingDispense')}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatLocaleDigits(pendingDispenseCount, uiLang)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <Pill className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t('doctor.prescriptions.linkedPatients')}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatLocaleDigits(uniquePatientsCount, uiLang)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                placeholder={t('doctor.prescriptions.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 rtl:pl-4 rtl:pr-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'history')}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 md:w-auto"
            >
              <option value="all">{t('doctor.prescriptions.filterAll')}</option>
              <option value="active">{t('doctor.prescriptions.filterActive')}</option>
              <option value="history">{t('doctor.prescriptions.filterHistory')}</option>
            </select>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('doctor.prescriptions.activeSection')}</h2>
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                {t('doctor.prescriptions.activeBadge', { count: activePrescriptions.length })}
              </span>
            </div>

            {activePrescriptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-md">
                <Pill className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-2xl font-bold text-gray-900">{t('doctor.prescriptions.emptyActiveTitle')}</h3>
                <p className="mt-2 text-gray-600">{t('doctor.prescriptions.emptyActiveBody')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activePrescriptions.map((prescription) => (
                  <div
                    key={prescription.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md"
                  >
                    <div className="bg-gradient-to-r from-slate-900 to-emerald-800 p-6 text-white">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-bold">{prescription.patientName}</p>
                          <p className="mt-1 text-sm text-white/85">
                            {prescription.patientEmail ?? t('doctor.prescriptions.noEmail')}
                          </p>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-slate-800">
                          {prescriptionStatusLabel(t, prescription.status)}
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-500">
                          {t('doctor.prescriptions.prescribedAt', { date: formatDate(prescription.prescribed_at) })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/doctor/patients/${prescription.patient_id}`)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                          >
                            <Users className="h-4 w-4" />
                            <span>View Patient</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/doctor/messages?patient=${prescription.patient_id}`)}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>{t('doctor.messages.messagePatient')}</span>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {prescription.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-gray-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div>
                                <MedicationNameDisplay
                                  canonicalName={item.medication_name}
                                  localizedName={item.medication_name_ar}
                                  language={uiLang}
                                  primaryClassName="font-semibold text-gray-900"
                                  secondaryClassName="text-xs text-gray-500 mt-0.5"
                                />
                              {item.medication_catalog_suggestion_id ? (
                                <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                                  {t('doctor.createPrescription.pendingBadge')}
                                </p>
                              ) : null}
                                <p className="mt-1 text-sm text-gray-600">
                                  {formatMedicationDetailLine(t, uiLang, {
                                    dosage: item.dosage,
                                    frequency: item.frequency,
                                    duration: item.duration,
                                    detail: '',
                                    emptyFallback: t('doctor.prescriptions.noMedicationDetail'),
                                  }) ||
                                    t('doctor.prescriptions.noMedicationDetail')}
                                </p>
                                {item.instructions ? (
                                  <p className="mt-2 text-sm text-gray-600">{item.instructions}</p>
                                ) : null}
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  item.is_dispensed
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {item.is_dispensed
                                  ? t('doctor.prescriptions.dispensed')
                                  : t('doctor.prescriptions.pending')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('doctor.prescriptions.historySection')}</h2>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                {t('doctor.prescriptions.historyBadge', { count: historyPrescriptions.length })}
              </span>
            </div>

            {historyPrescriptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-md">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-2xl font-bold text-gray-900">{t('doctor.prescriptions.emptyHistoryTitle')}</h3>
                <p className="mt-2 text-gray-600">{t('doctor.prescriptions.emptyHistoryBody')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyPrescriptions.map((prescription) => (
                  <div
                    key={prescription.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{prescription.patientName}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {t('doctor.prescriptions.prescribedAt', { date: formatDate(prescription.prescribed_at) })}
                        </p>
                        <p className="mt-3 text-sm text-gray-600">
                          {prescription.items.map((item) => item.medication_name).join(', ')}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">
                        {prescriptionStatusLabel(t, prescription.status)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/doctor/patients/${prescription.patient_id}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                      >
                        <Users className="h-4 w-4" />
                        <span>View Patient</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/doctor/messages?patient=${prescription.patient_id}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{t('doctor.messages.messagePatient')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};
