import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, MoreVertical, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '../../components/Skeleton';
import { useDoctorPatients } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { useAuth } from '../../lib/auth-context';
import { dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';
import type { DoctorPatientRisk, DoctorPatientSummary } from '../../hooks/use-doctor-patients';

type PatientFilter = 'all' | 'today' | 'critical' | 'high';
type PatientSort = 'lastVisit' | 'risk' | 'name' | 'nextAppointment';
type PatientViewMode = 'list' | 'card';

const riskRank: Record<DoctorPatientRisk, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  new: 3,
  low: 4,
};

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const calculateAgeGender = (patient: DoctorPatientSummary) => {
  const gender = patient.gender?.trim()?.[0]?.toUpperCase() ?? '';
  if (!patient.dateOfBirth) {
    return gender || '--';
  }

  const birthDate = new Date(patient.dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return gender || '--';
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return `${age}${gender}`;
};

const riskBadgeClasses = (risk: DoctorPatientRisk) => {
  switch (risk) {
    case 'critical':
      return 'bg-red-600 text-white animate-pulse';
    case 'high':
      return 'bg-amber-100 text-amber-700';
    case 'medium':
      return 'bg-blue-100 text-blue-700';
    case 'new':
      return 'bg-teal-100 text-teal-700';
    case 'low':
      return 'bg-emerald-100 text-emerald-700';
  }
};

const riskLabel = (risk: DoctorPatientRisk) => {
  switch (risk) {
    case 'critical':
      return '🔴 CRITICAL';
    case 'high':
      return '🟠 HIGH';
    case 'medium':
      return '🔵 MEDIUM';
    case 'new':
      return '🆕 NEW';
    case 'low':
      return '✅ LOW';
  }
};

const rowAccentClasses = (risk: DoctorPatientRisk) => {
  switch (risk) {
    case 'critical':
      return 'bg-red-50 border-l-4 border-l-red-600 animate-pulse';
    case 'high':
      return 'bg-amber-50 border-l-4 border-l-amber-500';
    case 'medium':
      return 'border-l-4 border-l-blue-300';
    case 'new':
      return 'border-l-4 border-l-teal-400';
    case 'low':
      return '';
  }
};

const avatarGradientClasses = (risk: DoctorPatientRisk) => {
  switch (risk) {
    case 'critical':
      return 'from-red-500 to-red-600';
    case 'high':
      return 'from-amber-500 to-amber-600';
    case 'medium':
      return 'from-blue-500 to-blue-600';
    case 'new':
      return 'from-teal-500 to-teal-600';
    case 'low':
      return 'from-slate-500 to-slate-600';
  }
};

const flagClasses = (flag: string) => {
  if (/critical|severe/i.test(flag)) {
    return 'bg-red-100 text-red-600 animate-pulse';
  }
  if (/allergy/i.test(flag)) {
    return 'bg-red-50 text-red-600';
  }
  if (/session/i.test(flag)) {
    return 'bg-teal-100 text-teal-700';
  }
  if (/no-show/i.test(flag)) {
    return 'bg-amber-100 text-amber-700';
  }
  if (/new/i.test(flag)) {
    return 'bg-teal-50 text-teal-600';
  }
  return 'bg-indigo-50 text-indigo-600';
};

export const DoctorPatients: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const locale = resolveLocale(i18n.language);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(i18n.language, options);
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<PatientViewMode>('list');
  const [filterActive, setFilterActive] = useState<PatientFilter>('all');
  const [sortBy, setSortBy] = useState<PatientSort>('lastVisit');
  const { data, loading, error, refetch } = useDoctorPatients(user?.id);
  const rawPatients = useMemo(() => data ?? [], [data]);
  const uiLang = i18n.language ?? 'en';
  const todayKey = new Date().toDateString();
  const formatPatientDate = (value: string | null, fallback: string) => {
    if (!value) {
      return fallback;
    }

    return new Date(value).toLocaleDateString(locale, dtOpts({ month: 'short', day: 'numeric', year: 'numeric' }));
  };
  const isTodayDate = useCallback((value: string | null) => (value ? new Date(value).toDateString() === todayKey : false), [todayKey]);
  const filteredPatients = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = rawPatients.filter((patient) => {
      if (filterActive === 'today' && !isTodayDate(patient.lastAppointment) && !isTodayDate(patient.nextAppointment)) {
        return false;
      }
      if (filterActive === 'critical' && patient.risk !== 'critical') {
        return false;
      }
      if (filterActive === 'high' && patient.risk !== 'high') {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [
        patient.name,
        patient.email ?? '',
        patient.phone ?? '',
        patient.bloodType ?? '',
        patient.insuranceName ?? '',
        patient.latestChiefComplaint ?? '',
        ...patient.conditions,
        ...patient.allergies,
        ...patient.flags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === 'risk') {
        return riskRank[left.risk] - riskRank[right.risk];
      }
      if (sortBy === 'name') {
        return left.name.localeCompare(right.name);
      }
      if (sortBy === 'nextAppointment') {
        return (left.nextAppointment ? new Date(left.nextAppointment).getTime() : Number.MAX_SAFE_INTEGER) -
          (right.nextAppointment ? new Date(right.nextAppointment).getTime() : Number.MAX_SAFE_INTEGER);
      }

      return (right.lastAppointment ? new Date(right.lastAppointment).getTime() : 0) -
        (left.lastAppointment ? new Date(left.lastAppointment).getTime() : 0);
    });
  }, [filterActive, isTodayDate, rawPatients, searchQuery, sortBy]);
  const todayPatients = useMemo(
    () => rawPatients.filter((patient) => isTodayDate(patient.lastAppointment) || isTodayDate(patient.nextAppointment)).length,
    [isTodayDate, rawPatients]
  );
  const criticalPatients = useMemo(() => rawPatients.filter((patient) => patient.risk === 'critical').length, [rawPatients]);
  const highRiskPatients = useMemo(() => rawPatients.filter((patient) => patient.risk === 'high').length, [rawPatients]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
          <input
            type="text"
            placeholder={t('doctor.patients.searchPh', {
              defaultValue: 'Search by name, Emirates ID, condition, or medication...',
            })}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            maxLength={FORM_FIELD_LIMITS.searchQuery}
            className="h-12 w-full rounded-lg border border-slate-200 pl-12 pr-4 text-[14px] outline-none focus:ring-2 focus:ring-teal-500 rtl:pl-4 rtl:pr-12"
          />
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all' as const, label: `All Patients (${formatLocaleDigits(rawPatients.length, uiLang)}) ●`, className: 'bg-teal-100 text-teal-700' },
              { id: 'today' as const, label: `Today (${formatLocaleDigits(todayPatients, uiLang)})`, className: 'bg-teal-100 text-teal-700' },
              { id: 'critical' as const, label: `Critical (${formatLocaleDigits(criticalPatients, uiLang)})`, className: 'bg-red-100 text-red-700' },
              { id: 'high' as const, label: `High Risk (${formatLocaleDigits(highRiskPatients, uiLang)})`, className: 'bg-amber-100 text-amber-700' },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setFilterActive(filter.id)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  filterActive === filter.id ? filter.className : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } ${filter.id === 'critical' && criticalPatients > 0 && filterActive !== 'critical' ? 'animate-pulse' : ''}`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as PatientSort)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="lastVisit">Sort: Last Visit</option>
              <option value="risk">Sort: Risk (highest first)</option>
              <option value="name">Sort: Name A-Z</option>
              <option value="nextAppointment">Sort: Next Appointment</option>
            </select>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded px-2 py-1 ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                aria-label={t('doctor.patients.listView', { defaultValue: 'List view' })}
                aria-pressed={viewMode === 'list'}
              >
                ☰
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`rounded px-2 py-1 ${viewMode === 'card' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                aria-label={t('doctor.patients.cardView', { defaultValue: 'Card view' })}
                aria-pressed={viewMode === 'card'}
              >
                ⊞
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="mt-4 h-16 w-full rounded-xl" />
          <Skeleton className="mt-3 h-16 w-full rounded-xl" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
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
      ) : filteredPatients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <Users className="mx-auto mb-4 h-10 w-10 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-900">{t('doctor.patients.emptyTitle')}</h3>
          <p className="mt-2 text-sm text-gray-600">{t('doctor.patients.emptyBody')}</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
              <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <div className="col-span-3">Patient</div>
                <div className="col-span-1 text-center">Risk</div>
                <div className="col-span-2">Conditions</div>
                <div className="col-span-2">Flags</div>
                <div className="col-span-1">Last Visit</div>
                <div className="col-span-2">Next Appt</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                  className={`group grid cursor-pointer grid-cols-12 items-center gap-4 border-b border-slate-100 px-5 py-4 transition-all hover:bg-slate-50 ${rowAccentClasses(patient.risk)}`}
                >
                  <div className="col-span-3 flex items-center space-x-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradientClasses(patient.risk)} text-sm font-bold text-white`}>
                      {initialsFor(patient.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold text-slate-900">{patient.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {patient.id.slice(0, 8)} · {calculateAgeGender(patient)} ·{' '}
                        {patient.bloodType ?? t('doctor.patients.unknown', { defaultValue: 'Unknown' })} ·{' '}
                        {patient.insuranceName ?? t('doctor.patients.noInsurance', { defaultValue: 'No insurance' })}
                      </div>
                      {patient.allergies.length > 0 ? (
                        <div className="mt-1">
                          <span className="inline-block rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                            ⚠️ {patient.allergies[0]}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <span className={`rounded px-2 py-1 text-[10px] font-bold ${riskBadgeClasses(patient.risk)}`}>
                      {riskLabel(patient.risk)}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <div className="line-clamp-2 text-[13px] text-slate-700">
                      {patient.conditions.length > 0
                        ? patient.conditions.slice(0, 2).join(' · ')
                        : (patient.latestChiefComplaint ??
                          t('doctor.patients.noConditions', { defaultValue: 'No active conditions' }))}
                    </div>
                    {patient.conditions.length > 2 ? (
                      <div className="mt-0.5 text-[12px] italic text-slate-400">+{patient.conditions.length - 2} more</div>
                    ) : null}
                  </div>

                  <div className="col-span-2 flex flex-wrap gap-1">
                    {patient.flags.slice(0, 3).map((flag) => (
                      <span key={flag} className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${flagClasses(flag)}`}>
                        {/allergy|severe/i.test(flag) ? '⚠️ ' : null}
                        {/critical/i.test(flag) ? '🔴 ' : null}
                        {/session/i.test(flag) ? '● ' : null}
                        {flag}
                      </span>
                    ))}
                  </div>

                  <div className="col-span-1">
                    <div className="font-mono text-[12px] text-slate-600">
                      {formatPatientDate(
                        patient.lastAppointment,
                        t('doctor.patients.noVisits', { defaultValue: 'No visits' })
                      )}
                    </div>
                    {isTodayDate(patient.lastAppointment) ? (
                      <div className="text-[10px] font-bold text-emerald-600">
                        {t('doctor.patients.today', { defaultValue: 'Today' })} ✅
                      </div>
                    ) : null}
                  </div>

                  <div className="col-span-2">
                    <div className="font-mono text-[12px] text-slate-600">
                      {formatPatientDate(
                        patient.nextAppointment,
                        t('doctor.patients.notScheduled', { defaultValue: 'Not scheduled' })
                      )}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center justify-end space-x-1">
                    {patient.risk === 'critical' ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          // Acknowledgement state is patient-record-level work
                          // and lives on the detail page; surface the user
                          // there rather than firing a no-op on the row.
                          event.stopPropagation();
                          navigate(`/doctor/patients/${patient.id}`);
                        }}
                        className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-red-700"
                      >
                        ✅ {t('doctor.patients.acknowledge', { defaultValue: 'Acknowledge' })}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/doctor/patients/${patient.id}`);
                      }}
                      className="flex items-center space-x-1 rounded bg-teal-100 px-3 py-1.5 text-[11px] font-medium text-teal-700 opacity-0 transition-colors hover:bg-teal-200 group-hover:opacity-100"
                    >
                      <FileText className="h-3 w-3" />
                      <span>{t('doctor.patients.openRecord', { defaultValue: 'Open Record' })}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/doctor/patients/${patient.id}`);
                      }}
                      aria-label={t('doctor.patients.openRecord', { defaultValue: 'Open Record' })}
                      className="rounded p-1.5 opacity-0 transition-colors hover:bg-slate-200 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {t('doctor.patients.showingOf', {
                shown: formatLocaleDigits(filteredPatients.length, uiLang),
                total: formatLocaleDigits(rawPatients.length, uiLang),
                defaultValue: `Showing ${formatLocaleDigits(filteredPatients.length, uiLang)} of ${formatLocaleDigits(rawPatients.length, uiLang)} patients`,
              })}{' '}
              · {t('doctor.patients.sortedBy', { defaultValue: 'Sorted by' })}:{' '}
              {sortBy === 'lastVisit'
                ? t('doctor.patients.sortLastVisit', { defaultValue: 'Last Visit' })
                : sortBy === 'risk'
                  ? t('doctor.patients.sortRisk', { defaultValue: 'Risk' })
                  : sortBy === 'name'
                    ? t('doctor.patients.sortName', { defaultValue: 'Name A-Z' })
                    : t('doctor.patients.sortNextAppointment', { defaultValue: 'Next Appointment' })}
            </div>
            {/*
              Pagination is intentionally omitted until the backend exposes
              cursor-based paging for doctor patients. The previous "← 1" /
              "2 →" buttons were visual-only and had no onClick handler,
              which left users wondering why nothing happened.
            */}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredPatients.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => navigate(`/doctor/patients/${patient.id}`)}
              className={`rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md ${rowAccentClasses(patient.risk)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradientClasses(patient.risk)} text-sm font-bold text-white`}>
                    {initialsFor(patient.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{patient.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">
                      {calculateAgeGender(patient)} ·{' '}
                      {patient.bloodType ?? t('doctor.patients.unknown', { defaultValue: 'Unknown' })} ·{' '}
                      {patient.insuranceName ?? t('doctor.patients.noInsurance', { defaultValue: 'No insurance' })}
                    </p>
                  </div>
                </div>
                <span className={`rounded px-2 py-1 text-[10px] font-bold ${riskBadgeClasses(patient.risk)}`}>
                  {riskLabel(patient.risk)}
                </span>
              </div>
              <p className="mt-4 line-clamp-2 text-[13px] text-slate-700">
                {patient.conditions.length > 0
                  ? patient.conditions.join(' · ')
                  : (patient.latestChiefComplaint ??
                    t('doctor.patients.noConditions', { defaultValue: 'No active conditions' }))}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {patient.flags.slice(0, 3).map((flag) => (
                  <span key={flag} className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${flagClasses(flag)}`}>
                    {flag}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] text-slate-500">
                <div>
                  <p className="font-semibold uppercase tracking-wide text-slate-400">
                    {t('doctor.patients.lastVisit', { defaultValue: 'Last Visit' })}
                  </p>
                  <p className="mt-1 font-mono">
                    {formatPatientDate(
                      patient.lastAppointment,
                      t('doctor.patients.noVisits', { defaultValue: 'No visits' })
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-slate-400">
                    {t('doctor.patients.nextAppt', { defaultValue: 'Next Appt' })}
                  </p>
                  <p className="mt-1 font-mono">
                    {formatPatientDate(
                      patient.nextAppointment,
                      t('doctor.patients.notScheduled', { defaultValue: 'Not scheduled' })
                    )}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
