import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, MessageSquare, Plus, Search, TestTube2, Users } from 'lucide-react';
import { LabTestNameDisplay } from '../../components/LabTestNameDisplay';
import { Skeleton } from '../../components/Skeleton';
import { useDoctorLabOrders } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { dateTimeFormatWithNumerals, formatLocaleDigits, labOrderStatusLabel, resolveLocale } from '../../lib/i18n-ui';

export const DoctorLabOrders: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error } = useDoctorLabOrders(user?.id);
  const labOrders = useMemo(() => data ?? [], [data]);
  const locale = resolveLocale(i18n.language);
  const uiLang = i18n.language ?? 'en';
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(uiLang, options);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'critical' | 'pending' | 'results' | 'scheduled'>('critical');

  const hasCriticalResult = useCallback(
    (labOrder: (typeof labOrders)[number]) =>
      labOrder.items.some((item) => item.is_abnormal && item.status === 'resulted'),
    []
  );

  const tabLabOrders = useMemo(() => {
    switch (activeTab) {
      case 'critical':
        return labOrders.filter(hasCriticalResult);
      case 'pending':
        return labOrders.filter((labOrder) => ['ordered', 'collected', 'processing'].includes(labOrder.status));
      case 'results':
        return labOrders.filter((labOrder) => ['resulted', 'reviewed'].includes(labOrder.status));
      case 'scheduled':
        return labOrders.filter((labOrder) => labOrder.status === 'ordered');
      default:
        return labOrders;
    }
  }, [activeTab, hasCriticalResult, labOrders]);

  const filteredLabOrders = useMemo(
    () =>
      tabLabOrders.filter((labOrder) => {
        if (statusFilter !== 'all' && labOrder.status !== statusFilter) {
          return false;
        }

        const searchValue = searchQuery.trim().toLowerCase();
        if (!searchValue) {
          return true;
        }

        const haystack = [
          labOrder.patientName,
          labOrder.patientEmail,
          labOrder.status,
          ...labOrder.items.map((item) => `${item.test_name} ${item.test_name_ar ?? ''} ${item.test_code ?? ''}`),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(searchValue);
      }),
    [searchQuery, statusFilter, tabLabOrders]
  );

  const uniquePatients = useMemo(
    () => new Set(labOrders.map((labOrder) => labOrder.patient_id)).size,
    [labOrders]
  );
  const pendingResults = useMemo(
    () => labOrders.filter((labOrder) => labOrder.status !== 'reviewed').length,
    [labOrders]
  );
  const criticalCount = useMemo(() => labOrders.filter(hasCriticalResult).length, [hasCriticalResult, labOrders]);
  const resultedCount = useMemo(
    () => labOrders.filter((labOrder) => ['resulted', 'reviewed'].includes(labOrder.status)).length,
    [labOrders]
  );
  const scheduledCount = useMemo(
    () => labOrders.filter((labOrder) => labOrder.status === 'ordered').length,
    [labOrders]
  );
  const firstCriticalOrder = useMemo(() => labOrders.find(hasCriticalResult) ?? null, [hasCriticalResult, labOrders]);
  const firstCriticalItem = firstCriticalOrder?.items.find((item) => item.is_abnormal && item.status === 'resulted') ?? null;
  const labTabs = [
    { id: 'critical' as const, label: 'Critical', count: criticalCount, icon: AlertTriangle },
    { id: 'pending' as const, label: 'Pending', count: pendingResults, icon: Clock },
    { id: 'results' as const, label: 'Results', count: resultedCount, icon: CheckCircle2 },
    { id: 'scheduled' as const, label: 'Scheduled', count: scheduledCount, icon: CalendarCheck },
  ];

  useEffect(() => {
    if (!loading && activeTab === 'critical' && criticalCount === 0 && labOrders.length > 0) {
      setActiveTab('pending');
    }
  }, [activeTab, criticalCount, labOrders.length, loading]);

  if (loading) {
    return (
      <>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('doctor.labOrders.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('doctor.labOrders.subtitle')}</p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900">{t('doctor.labOrders.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('doctor.labOrders.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/doctor/lab-orders/new')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          <span>{t('doctor.labOrders.create')}</span>
        </button>
      </div>

      <div className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        ) : null}

        {firstCriticalOrder && firstCriticalItem ? (
          <div className="rounded-2xl border-2 border-red-600 bg-red-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <AlertTriangle className="h-8 w-8 shrink-0 animate-pulse text-red-600" />
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-wide text-red-700">Critical result</p>
                  <h2 className="mt-2 text-lg font-bold text-red-950">
                    {firstCriticalOrder.patientName} — {firstCriticalItem.test_name}
                  </h2>
                  <p className="mt-2 font-mono text-3xl font-bold text-red-700">
                    {[firstCriticalItem.result_value, firstCriticalItem.result_unit].filter(Boolean).join(' ') || 'Resulted'}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Reference: {firstCriticalItem.reference_range ?? '-'} · Resulted{' '}
                    {firstCriticalItem.resulted_at
                      ? new Date(firstCriticalItem.resulted_at).toLocaleTimeString(locale, dtOpts({ hour: 'numeric', minute: '2-digit' }))
                      : 'recently'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('critical')}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Review critical result
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Critical results</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{formatLocaleDigits(criticalCount, uiLang)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t('doctor.labOrders.totalOrders')}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatLocaleDigits(labOrders.length, uiLang)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t('doctor.labOrders.pendingResults')}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatLocaleDigits(pendingResults, uiLang)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t('doctor.labOrders.linkedPatients')}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatLocaleDigits(uniquePatients, uiLang)}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-w-full gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3">
            {labTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? tab.id === 'critical'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                        : 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {tab.label}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {formatLocaleDigits(tab.count, uiLang)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('doctor.labOrders.searchPlaceholder')}
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 rtl:pl-4 rtl:pr-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="all">{t('doctor.labOrders.allStatuses')}</option>
                <option value="ordered">{t('shared.labOrderStatus.ordered')}</option>
                <option value="collected">{t('shared.labOrderStatus.collected')}</option>
                <option value="processing">{t('shared.labOrderStatus.processing')}</option>
                <option value="resulted">{t('shared.labOrderStatus.resulted')}</option>
                <option value="reviewed">{t('shared.labOrderStatus.reviewed')}</option>
              </select>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {formatLocaleDigits(filteredLabOrders.length, uiLang)} shown
            </p>
          </div>
        </div>

        {filteredLabOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <TestTube2 className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h3 className="text-xl font-bold text-slate-900">{t('doctor.labOrders.emptyTitle')}</h3>
            <p className="mt-2 text-sm text-slate-600">{t('doctor.labOrders.emptyBody')}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredLabOrders.map((labOrder) => {
              const critical = hasCriticalResult(labOrder);
              return (
              <div
                key={labOrder.id}
                className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                  critical ? 'border-red-200 border-l-4 border-l-red-600' : 'border-slate-200'
                }`}
              >
                <div className={`${critical ? 'bg-gradient-to-r from-red-700 to-red-600' : 'bg-gradient-to-r from-slate-900 to-cyan-800'} p-5 text-white`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold">{labOrder.patientName}</p>
                      <p className="mt-1 text-sm text-white/85">
                        {labOrder.patientEmail ?? t('doctor.prescriptions.noEmail')}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                      {labOrderStatusLabel(t, labOrder.status)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">
                      {t('doctor.labOrders.orderedAt', {
                        date: new Date(labOrder.ordered_at).toLocaleDateString(
                          locale,
                          dtOpts({ year: 'numeric', month: 'short', day: 'numeric' })
                        ),
                      })}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/doctor/patients/${labOrder.patient_id}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <Users className="h-4 w-4" />
                        <span>View Patient</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/doctor/messages?patient=${labOrder.patient_id}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{t('doctor.messages.messagePatient')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/doctor/lab-orders/new?patient=${labOrder.patient_id}&appointment=${labOrder.appointment_id ?? ''}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{t('doctor.labOrders.reorder')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {labOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-4 ${item.is_abnormal ? 'border border-red-100 bg-red-50' : 'bg-slate-50'}`}
                      >
                        <LabTestNameDisplay
                          canonicalName={item.test_name}
                          localizedName={item.test_name_ar}
                          language={uiLang}
                          primaryClassName="font-semibold text-slate-900"
                          secondaryClassName="mt-0.5 text-xs text-slate-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">{item.test_code ?? t('doctor.labOrders.noCode')}</p>
                        {item.result_value || item.reference_range ? (
                          <p className={`mt-2 font-mono text-sm font-bold ${item.is_abnormal ? 'text-red-700' : 'text-slate-700'}`}>
                            {[item.result_value, item.result_unit].filter(Boolean).join(' ') || 'Resulted'}
                            {item.reference_range ? <span className="ml-2 text-xs font-normal text-slate-500">Ref: {item.reference_range}</span> : null}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {labOrderStatusLabel(t, item.status)}
                          </p>
                          {item.lab_test_catalog_suggestion_id ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              {t('doctor.createLabOrder.pendingBadge')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
