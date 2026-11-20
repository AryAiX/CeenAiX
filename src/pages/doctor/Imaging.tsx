import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ChevronDown, Clock, Layers, ListChecks, Scan, Search, Workflow } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { markDoctorImagingStudyReviewed, useImagingStudies } from '../../hooks';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import { useAuth } from '../../lib/auth-context';
import { dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';
import { imagingReportState, releasedReportText } from '../../lib/imaging-report';

export const DoctorImaging = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useImagingStudies(user?.id, 'doctor');
  const uiLang = i18n.language ?? 'en';
  const [activeStatus, setActiveStatus] = useState<'all' | 'pending' | 'reported' | 'abnormal'>('all');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [openStudyId, setOpenStudyId] = useState<string | null>(null);
  const locale = resolveLocale(uiLang);
  const formatDateTime = (value: string | null) =>
    value
      ? new Date(value).toLocaleString(
          locale,
          dateTimeFormatWithNumerals(uiLang, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        )
      : t('doctor.imaging.notRecorded');
  // QA-151: scan statuses used to look up lab-test labels that don't exist, so raw codes such as
  // "report_pending" showed in both languages. Scan types other than CT / MRI are translated too.
  const imagingStatusLabel = useCallback(
    (status: string) => t(`doctor.imaging.status.${status}`, { defaultValue: status }),
    [t]
  );
  const modalityLabel = useCallback(
    (modality: string) => t(`doctor.imaging.modality.${modality}`, { defaultValue: modality }),
    [t]
  );
  const studies = useMemo(
    () => data ?? [],
    [data]
  );
  const pending = studies.filter((study) => !['reported', 'released', 'rejected'].includes(study.status)).length;
  const reported = studies.filter((study) => ['reported', 'released'].includes(study.status)).length;
  const abnormal = studies.filter((study) => study.alerts.length > 0).length;
  const modalities = useMemo(() => Array.from(new Set(studies.map((study) => study.modality))).sort(), [studies]);
  const filteredStudies = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return studies.filter((study) => {
      if (activeStatus === 'pending' && ['reported', 'released', 'rejected'].includes(study.status)) return false;
      if (activeStatus === 'reported' && !['reported', 'released'].includes(study.status)) return false;
      if (activeStatus === 'abnormal' && study.alerts.length === 0) return false;
      if (modalityFilter !== 'all' && study.modality !== modalityFilter) return false;
      if (!search) return true;
      return [
        study.patientName,
        study.studyName,
        study.modality,
        modalityLabel(study.modality),
        study.status,
        imagingStatusLabel(study.status),
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [activeStatus, imagingStatusLabel, modalityFilter, modalityLabel, searchQuery, studies]);
  const imagingTabs = [
    { id: 'all' as const, label: t('doctor.imaging.tabAll'), count: studies.length },
    { id: 'pending' as const, label: t('doctor.imaging.tabPending'), count: pending },
    {
      id: 'reported' as const,
      label: t('doctor.imaging.tabReported'),
      count: reported,
    },
    { id: 'abnormal' as const, label: t('doctor.imaging.tabAbnormal'), count: abnormal },
  ];

  const handleMarkReviewed = async (studyId: string) => {
    setReviewBusyId(studyId);
    setReviewError(null);
    try {
      await markDoctorImagingStudyReviewed(studyId);
      await refetch();
    } catch {
      // The database message is English and technical; show the translated message instead.
      setReviewError(t('doctor.imaging.reviewError'));
    } finally {
      setReviewBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
          <button
            type="button"
            onClick={() => void refetch()}
            className="ms-2 font-semibold underline"
          >
            {t('shared.retry')}
          </button>
        </div>
      ) : null}
      {reviewError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {reviewError}
        </div>
      ) : null}

      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
              <Scan className="h-4 w-4" />
              {t('doctor.imaging.title')}
            </div>
            <h1 className="text-3xl font-bold">{t('doctor.imaging.featureQueueTitle')}</h1>
            <p className="mt-2 max-w-2xl text-violet-100">{t('doctor.imaging.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/doctor/lab-orders')}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            {t('doctor.imaging.openLabOrders')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: t('doctor.imaging.cardStudies'),
            value: studies.length,
            icon: ListChecks,
            color: 'text-violet-600',
            bg: 'bg-violet-100',
          },
          {
            label: t('doctor.imaging.tabPending'),
            value: pending,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
          },
          {
            label: t('doctor.imaging.tabReported'),
            value: reported,
            icon: CheckCircle,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100',
          },
          {
            label: t('doctor.imaging.tabAbnormal'),
            value: abnormal,
            icon: Workflow,
            color: 'text-red-600',
            bg: 'bg-red-100',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div className="font-mono text-3xl font-bold text-slate-900">{formatLocaleDigits(card.value, uiLang)}</div>
              <div className="text-xs text-slate-400">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-violet-600" />
            <h2 className="text-lg font-bold text-slate-900">
              {t('doctor.imaging.worklist')}
            </h2>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:min-w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                maxLength={FORM_FIELD_LIMITS.searchQuery}
                placeholder={t('doctor.imaging.searchPh')}
                className="w-full rounded-xl border border-slate-200 py-2.5 ps-9 pe-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            <select
              value={modalityFilter}
              onChange={(event) => setModalityFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="all">{t('doctor.imaging.allModalities')}</option>
              {modalities.map((modality) => (
                <option key={modality} value={modality}>
                  {modalityLabel(modality)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-3">
          {imagingTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStatus(tab.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeStatus === tab.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`ms-2 rounded-full px-2 py-0.5 text-[10px] ${activeStatus === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {formatLocaleDigits(tab.count, uiLang)}
              </span>
            </button>
          ))}
        </div>
        {filteredStudies.length === 0 ? (
          <div className="m-5 rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            {t('doctor.imaging.emptyState')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStudies.map((study) => (
              <div key={study.id} className={`p-4 transition hover:bg-slate-50 ${study.alerts.length > 0 ? 'border-s-4 border-s-red-500 bg-red-50' : ''}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                      {modalityLabel(study.modality)}
                    </span>
                    <span className="font-bold text-slate-900">{study.studyName}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{study.patientName}</div>
                </div>
                <div className="text-end text-sm">
                  {(() => {
                    // QA-149: only a released report's text is shown; drafts and rejections say so.
                    const reportState = imagingReportState(study.status);
                    if (reportState === 'released') {
                      return (
                        <div className={study.alerts.length > 0 ? 'font-bold text-red-600' : 'font-bold text-slate-700'}>
                          {releasedReportText(study) ?? t('doctor.imaging.noReportText')}
                        </div>
                      );
                    }
                    if (reportState === 'rejected') {
                      return <div className="font-bold text-red-700">{t('doctor.imaging.studyRejected')}</div>;
                    }
                    return (
                      <div className="font-semibold italic text-amber-700">
                        {reportState === 'notReleased' ? t('doctor.imaging.reportNotReleased') : t('doctor.imaging.noReportYet')}
                      </div>
                    );
                  })()}
                  <div className="text-xs text-slate-400">
                    {imagingStatusLabel(study.status)}
                  </div>
                  {study.reviewedAt ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {t('doctor.imaging.reviewedOn', { date: formatDateTime(study.reviewedAt) })}
                    </span>
                  ) : null}
                  {study.status === 'released' && !study.reviewedAt ? (
                    <button
                      type="button"
                      onClick={() => void handleMarkReviewed(study.id)}
                      disabled={reviewBusyId === study.id}
                      className="mt-3 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reviewBusyId === study.id
                        ? t('doctor.imaging.reviewing')
                        : t('doctor.imaging.markReviewed')}
                    </button>
                  ) : null}
                </div>
              </div>
              {/* QA-150: the full report (and its details) can now be opened from the worklist. */}
              <button
                type="button"
                onClick={() => setOpenStudyId((current) => (current === study.id ? null : study.id))}
                aria-expanded={openStudyId === study.id}
                aria-controls={`imaging-report-${study.id}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
              >
                <ChevronDown className={`h-4 w-4 transition ${openStudyId === study.id ? 'rotate-180' : ''}`} />
                {openStudyId === study.id ? t('doctor.imaging.hideReport') : t('doctor.imaging.viewReport')}
              </button>
              {openStudyId === study.id ? (
                <div id={`imaging-report-${study.id}`} className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
                  <dl className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold text-slate-700">{t('doctor.imaging.accession')}</dt>
                      <dd dir="ltr" className="text-start">{study.accession}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">{t('doctor.imaging.scheduledAt')}</dt>
                      <dd>{formatDateTime(study.scheduledAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">{t('doctor.imaging.releasedAt')}</dt>
                      <dd>{formatDateTime(study.releasedAt)}</dd>
                    </div>
                  </dl>
                  {study.alerts.length > 0 ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('doctor.imaging.alerts')}
                      </p>
                      <ul className="list-disc space-y-0.5 ps-5 text-red-700">
                        {study.alerts.map((alert, index) => (
                          <li key={`${study.id}-alert-${index}`} dir="auto">
                            {alert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {study.status === 'released' ? (
                    (
                      [
                        ['findings', study.findings],
                        ['impression', study.impression],
                        ['recommendations', study.recommendations],
                      ] as const
                    ).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t(`doctor.imaging.${key}`)}</p>
                        <p className="mt-0.5 whitespace-pre-line text-slate-800" dir="auto">
                          {value?.trim() || t('doctor.imaging.notRecorded')}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="italic text-amber-700">
                      {study.status === 'rejected'
                        ? t('doctor.imaging.studyRejected')
                        : imagingReportState(study.status) === 'notReleased'
                          ? t('doctor.imaging.reportNotReleased')
                          : t('doctor.imaging.noReportYet')}
                    </p>
                  )}
                </div>
              ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-700">
        {t('doctor.imaging.footerNote')}
      </div>
    </div>
  );
};
