import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, MessageSquare, Plus, Printer, Search, TestTube2, Users, X } from 'lucide-react';
import { LabTestNameDisplay } from '../../components/LabTestNameDisplay';
import { Skeleton } from '../../components/Skeleton';
import { useDoctorLabOrders } from '../../hooks';
import type { DoctorLabOrderRecord } from '../../hooks/use-doctor-lab-orders';
import { useAuth } from '../../lib/auth-context';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { dateTimeFormatWithNumerals, formatLocaleDigits, labOrderStatusLabel, resolveLocale } from '../../lib/i18n-ui';
import { reorderItemsFrom } from '../../lib/lab-reorder';
import {
  downloadPrescriptionPdf as downloadClinicalPdf,
  printPrescription as openClinicalPrint,
  type PrescriptionPrintContent,
} from '../../lib/prescription-print';
import { isCriticalLabItem, labResultSeverity, labResultValueText, needsCriticalReview } from '../../lib/lab-severity';
import { supabase } from '../../lib/supabase';

const PENDING_STATUSES: string[] = ['ordered', 'collected', 'processing'];

export const DoctorLabOrders: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user, profile, doctorProfile } = useAuth();
  const { data, loading, error, refetch } = useDoctorLabOrders(user?.id);
  const labOrders = useMemo(() => data ?? [], [data]);
  const locale = resolveLocale(i18n.language);
  const uiLang = i18n.language ?? 'en';
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(uiLang, options);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'pending' | 'results' | 'scheduled'>('critical');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLabOrderId, setPrintLabOrderId] = useState<string | null>(null);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // QA-142: only results the lab marked critical (or HH / LL) count, and only until the doctor
  // marks the order reviewed. Other out-of-range results are shown as abnormal, not critical.
  const hasCriticalResult = useCallback((labOrder: (typeof labOrders)[number]) => needsCriticalReview(labOrder), []);

  const tabLabOrders = useMemo(() => {
    switch (activeTab) {
      case 'critical':
        return labOrders.filter(hasCriticalResult);
      case 'pending':
        return labOrders.filter((labOrder) => PENDING_STATUSES.includes(labOrder.status));
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


  // QA-144: same rule as the Pending tab (still waiting for the lab). Results waiting for the
  // doctor's review are under Results, so they no longer inflate this number.
  const pendingResults = useMemo(
    () => labOrders.filter((labOrder) => PENDING_STATUSES.includes(labOrder.status)).length,
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
  const printLabOrder = labOrders.find((o) => o.id === printLabOrderId) ?? null;
  const firstCriticalItem = firstCriticalOrder?.items.find(isCriticalLabItem) ?? null;
  const labTabs = [
    { id: 'all' as const, label: 'All', count: labOrders.length, icon: TestTube2 },
    { id: 'critical' as const, label: 'Critical', count: criticalCount, icon: AlertTriangle },
    { id: 'pending' as const, label: 'Pending', count: pendingResults, icon: Clock },
    { id: 'results' as const, label: 'Results', count: resultedCount, icon: CheckCircle2 },
    { id: 'scheduled' as const, label: 'Scheduled', count: scheduledCount, icon: CalendarCheck },
  ];

  useEffect(() => {
    if (!loading && activeTab === 'critical' && criticalCount === 0 && labOrders.length > 0) {
      setActiveTab('pending');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, criticalCount, labOrders.length]);

  const handleMarkReviewed = async (labOrderId: string) => {
    setActionFeedback(null);
    setReviewBusyId(labOrderId);
    try {
      const { error: reviewError } = await supabase.rpc('doctor_review_lab_order', {
        target_order_id: labOrderId,
        overall_comment: null,
      });
      if (reviewError) {
        throw reviewError;
      }
      setActionFeedback({
        type: 'success',
        message: t('doctor.labOrders.reviewedSuccess', { defaultValue: 'Lab order marked as reviewed.' }),
      });
      await refetch();
    } catch (reviewFailure) {
      setActionFeedback({
        type: 'error',
        message:
          reviewFailure instanceof Error
            ? reviewFailure.message
            : t('doctor.labOrders.reviewError', { defaultValue: 'Could not mark lab order reviewed.' }),
      });
    } finally {
      setReviewBusyId(null);
    }
  };

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

  const closePrintModal = () => {
    setShowPrintModal(false);
    setPrintLabOrderId(null);
    setPdfError(null);
  };

  const formatOrderDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, dtOpts({ year: 'numeric', month: 'short', day: 'numeric' }));

  // QA-145: the same translated print/PDF layout as prescriptions (QA-137), with critical and
  // abnormal results coloured like the page (QA-142).
  const buildLabPrintContent = (labOrder: DoctorLabOrderRecord): PrescriptionPrintContent => {
    const labKey = (name: string) => t(`doctor.labOrders.print.${name}`);
    const sharedKey = (name: string, options?: Record<string, unknown>) => t(`doctor.prescriptions.print.${name}`, options);
    const rawDoctorName = (profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? '').trim();
    const doctorName = /^(dr\.?\s|د\.\s?)/i.test(rawDoctorName) ? rawDoctorName : sharedKey('doctorName', { name: rawDoctorName });
    const isEnglishUi = uiLang.toLowerCase().startsWith('en');
    const shortId = labOrder.id.slice(0, 8);
    return {
      language: uiLang,
      brand: t('shared.pdf.brand'),
      title: labKey('docTitle'),
      details: [
        { label: sharedKey('patient'), value: labOrder.patientName },
        { label: labKey('orderedOn'), value: formatOrderDate(labOrder.ordered_at) },
        ...(rawDoctorName ? [{ label: labKey('doctor'), value: doctorName }] : []),
        ...(doctorProfile?.license_number ? [{ label: sharedKey('licence'), value: doctorProfile.license_number }] : []),
        { label: sharedKey('status'), value: labOrderStatusLabel(t, labOrder.status) },
        { label: labKey('orderId'), value: shortId },
      ],
      medicationsHeading: labKey('tests'),
      quantityLabel: labKey('code'),
      instructionsLabel: labKey('referenceRange'),
      items: labOrder.items
        .filter((item) => !item.parent_item_id)
        .map((item) => {
          const localized = item.test_name_ar?.trim() ?? '';
          const canonical = item.test_name.trim();
          const useLocalized = !isEnglishUi && localized && localized.toLowerCase() !== canonical.toLowerCase();
          const severity = labResultSeverity(item);
          const value = labResultValueText(item);
          const severityLabel =
            severity === 'critical' || severity === 'abnormal' || severity === 'normal' ? labKey(severity) : null;
          return {
            name: useLocalized ? localized : canonical,
            secondaryName: useLocalized ? canonical : null,
            detail: value
              ? [`${labKey('result')}: ${value}`, severityLabel].filter(Boolean).join(' · ')
              : labOrderStatusLabel(t, item.status),
            quantity: item.test_code,
            instructions: item.reference_range,
            tone: severity === 'critical' || severity === 'abnormal' ? severity : null,
          };
        }),
      disclaimer: labKey('docDisclaimer'),
      footerNote: t('shared.pdf.footerNote'),
      pageLabel: (page, total) =>
        t('shared.pdf.pageOf', { page: formatLocaleDigits(page, uiLang), total: formatLocaleDigits(total, uiLang) }),
      fileName: `lab-order-${shortId}`,
    };
  };

  const handlePrint = () => {
    if (!printLabOrder) return;
    openClinicalPrint(buildLabPrintContent(printLabOrder));
  };

  const handleDownloadPdf = async () => {
    if (!printLabOrder || pdfBusy) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      await downloadClinicalPdf(buildLabPrintContent(printLabOrder));
    } catch {
      setPdfError(t('doctor.prescriptions.print.pdfError'));
    } finally {
      setPdfBusy(false);
    }
  };

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
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 font-semibold text-amber-900 underline"
            >
              {t('shared.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        ) : null}

        {actionFeedback ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              actionFeedback.type === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-red-100 bg-red-50 text-red-600'
            }`}
            role="alert"
          >
            {actionFeedback.message}
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
                    {labResultValueText(firstCriticalItem) || 'Resulted'}
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
          <button
            type="button"
            onClick={() => setActiveTab('critical')}
            className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm cursor-pointer transition hover:shadow-md hover:border-red-300 text-left w-full"
          >
            <p className="text-sm font-medium text-slate-500">Critical results</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{formatLocaleDigits(criticalCount, uiLang)}</p>
            <p className="mt-1 text-xs text-red-400">Click to review</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm cursor-pointer transition hover:shadow-md hover:border-teal-200 text-left w-full"
          >
            <p className="text-sm font-medium text-slate-500">{t('doctor.labOrders.totalOrders')}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatLocaleDigits(labOrders.length, uiLang)}</p>
            <p className="mt-1 text-xs text-teal-400">Click to view all</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm cursor-pointer transition hover:shadow-md hover:border-amber-200 text-left w-full"
          >
            <p className="text-sm font-medium text-slate-500">{t('doctor.labOrders.pendingResults')}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatLocaleDigits(pendingResults, uiLang)}</p>
            <p className="mt-1 text-xs text-amber-400">Click to view pending</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scheduled')}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm cursor-pointer transition hover:shadow-md hover:border-blue-200 text-left w-full"
          >
            <p className="text-sm font-medium text-slate-500">Scheduled</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatLocaleDigits(scheduledCount, uiLang)}</p>
            <p className="mt-1 text-xs text-blue-400">Click to view scheduled</p>
          </button>
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
                        : tab.id === 'all'
                        ? 'bg-slate-700 text-white shadow-lg shadow-slate-500/20'
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
                  maxLength={FORM_FIELD_LIMITS.searchQuery}
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
                      {['resulted', 'reviewed'].includes(labOrder.status) ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/doctor/lab-orders/new?patient=${labOrder.patient_id}&appointment=${labOrder.appointment_id ?? ''}`,
                              { state: { reorderItems: reorderItemsFrom(labOrder.items) } }
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{t('doctor.labOrders.reorder')}</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setPrintLabOrderId(labOrder.id);
                          setShowPrintModal(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Printer className="h-4 w-4" />
                        <span>{t('doctor.prescriptions.print.button')}</span>
                      </button>
                      {labOrder.status === 'resulted' ? (
                        <button
                          type="button"
                          onClick={() => void handleMarkReviewed(labOrder.id)}
                          disabled={reviewBusyId === labOrder.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{t('doctor.labOrders.markReviewed', { defaultValue: 'Mark reviewed' })}</span>
                        </button>
                      ) : labOrder.status === 'reviewed' ? (
                        <button
                          type="button"
                          disabled
                          title={t('doctor.labOrders.alreadyReviewed', { defaultValue: 'Already reviewed' })}
                          className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-500 opacity-70"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{t('doctor.labOrders.markReviewed', { defaultValue: 'Mark reviewed' })}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title={t('doctor.labOrders.markReviewedUnavailable', {
                            defaultValue: 'Mark reviewed — available when results are released',
                          })}
                          className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400 opacity-70"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{t('doctor.labOrders.markReviewed', { defaultValue: 'Mark reviewed' })}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {labOrder.items.map((item) => {
                      const severity = labResultSeverity(item);
                      return (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-4 ${
                          severity === 'critical'
                            ? 'border border-red-200 bg-red-50'
                            : severity === 'abnormal'
                              ? 'border border-amber-200 bg-amber-50'
                              : 'bg-slate-50'
                        }`}
                      >
                        <LabTestNameDisplay
                          canonicalName={item.test_name}
                          localizedName={item.test_name_ar}
                          language={uiLang}
                          primaryClassName="font-semibold text-slate-900"
                          secondaryClassName="mt-0.5 text-xs text-slate-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">{item.test_code ?? t('doctor.labOrders.noCode')}</p>
                        {labResultValueText(item) || item.reference_range ? (
                          <p
                            className={`mt-2 font-mono text-sm font-bold ${
                              severity === 'critical' ? 'text-red-700' : severity === 'abnormal' ? 'text-amber-800' : 'text-slate-700'
                            }`}
                          >
                            {labResultValueText(item) || 'Resulted'}
                            {item.reference_range ? <span className="ml-2 text-xs font-normal text-slate-500">Ref: {item.reference_range}</span> : null}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {labOrderStatusLabel(t, item.status)}
                          </p>
                          {severity === 'critical' || severity === 'abnormal' ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                severity === 'critical'
                                  ? 'border border-red-200 bg-white text-red-700'
                                  : 'border border-amber-200 bg-white text-amber-800'
                              }`}
                            >
                              {t(severity === 'critical' ? 'patient.labResults.statusCritical' : 'patient.labResults.statusAbnormal')}
                            </span>
                          ) : null}
                          {item.lab_test_catalog_suggestion_id ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              {t('doctor.createLabOrder.pendingBadge')}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {showPrintModal && printLabOrder
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Printer className="h-5 w-5 text-slate-600" />
                    <h2 className="text-base font-bold text-slate-900">{t('doctor.labOrders.print.modalTitle')}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={closePrintModal}
                    aria-label={t('doctor.prescriptions.print.close')}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="border-b border-slate-100 px-6 py-4">
                  <p className="text-sm font-bold text-slate-900">{printLabOrder.patientName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t('doctor.labOrders.print.orderedOn')}: {formatOrderDate(printLabOrder.ordered_at)}
                  </p>
                  <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-700">
                    {labOrderStatusLabel(t, printLabOrder.status)}
                  </span>
                  <ul className="mt-3 space-y-1">
                    {printLabOrder.items
                      .filter((item) => !item.parent_item_id)
                      .map((item) => (
                        <li key={item.id} className="text-xs text-slate-600">
                          <LabTestNameDisplay
                            canonicalName={item.test_name}
                            localizedName={item.test_name_ar}
                            language={uiLang}
                            variant="compact"
                            primaryClassName="text-slate-700"
                          />
                          {item.test_code ? <span dir="ltr"> ({item.test_code})</span> : null}
                        </li>
                      ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 px-6 py-5">
                  <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <span className="mb-2 text-2xl">🖨️</span>
                    <p className="text-sm font-bold text-slate-900">{t('doctor.labOrders.print.printTitle')}</p>
                    <p className="mt-1 text-xs text-slate-500">{t('doctor.labOrders.print.printBody')}</p>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="mt-auto w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      {t('doctor.prescriptions.print.printNow')}
                    </button>
                  </div>
                  <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <span className="mb-2 text-2xl">📑</span>
                    <p className="text-sm font-bold text-slate-900">{t('doctor.prescriptions.print.pdfTitle')}</p>
                    <p className="mt-1 text-xs text-slate-500">{t('doctor.labOrders.print.pdfBody')}</p>
                    <button
                      type="button"
                      onClick={() => void handleDownloadPdf()}
                      disabled={pdfBusy}
                      className="mt-auto w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      {pdfBusy ? t('doctor.prescriptions.print.preparingPdf') : t('doctor.prescriptions.print.downloadPdf')}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 px-6 py-4">
                  {pdfError ? (
                    <p role="alert" className="mb-3 text-xs font-semibold text-red-600">
                      {pdfError}
                    </p>
                  ) : null}
                  <p className="text-xs text-amber-600">⚠️ {t('doctor.labOrders.print.modalDisclaimer')}</p>
                  <button
                    type="button"
                    onClick={closePrintModal}
                    className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {t('doctor.prescriptions.print.close')}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};
