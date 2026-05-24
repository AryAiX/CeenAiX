import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Calendar, CheckCircle, Clock, Eye, FileText, Scan, Share2 } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { usePatientLabResults } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { dateTimeFormatWithNumerals, formatLocaleDigits, resolveLocale } from '../../lib/i18n-ui';

type ImagingTab = 'recent' | 'viewer' | 'reports' | 'findings' | 'scheduled';

interface ImagingStudy {
  id: string;
  date: string;
  modality: string;
  studyType: string;
  facility: string;
  orderedBy: string;
  status: 'reviewed' | 'pending';
  findings: Array<{ label: string; severity: 'normal' | 'monitor' | 'pending'; value: string }>;
  impression: string;
  accessionNumber: string;
}

function inferModality(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes('mri')) return 'MRI';
  if (normalized.includes('ct')) return 'CT';
  if (normalized.includes('x-ray') || normalized.includes('xray')) return 'X-Ray';
  if (normalized.includes('echo')) return 'Echo';
  if (normalized.includes('ultrasound') || normalized.includes('sono')) return 'Ultrasound';
  return 'Radiology';
}

function isImagingName(name: string): boolean {
  return /(mri|ct|x-?ray|ultrasound|sonography|echo|radiology|scan|doppler)/i.test(name);
}

export const PatientImaging = () => {
  const { t, i18n } = useTranslation('common');
  const { user } = useAuth();
  const { data: labOrders, loading, error, refetch } = usePatientLabResults(user?.id);
  const [activeTab, setActiveTab] = useState<ImagingTab>('recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const uiLang = i18n.language ?? 'en';
  const locale = resolveLocale(uiLang);
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(
      locale,
      dateTimeFormatWithNumerals(uiLang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    );

  const studies = useMemo<ImagingStudy[]>(() => {
    return (labOrders ?? [])
      .flatMap((order) =>
        order.items
          .filter((item) => isImagingName(item.test_name))
          .map((item) => ({
            id: item.id,
            date: item.resulted_at ?? order.ordered_at,
            modality: inferModality(item.test_name),
            studyType: item.test_name,
            facility: order.labName ?? t('patient.imaging.ceenaixRadiology'),
            orderedBy: order.doctorName ?? t('patient.imaging.careTeam'),
            status: order.reviewStatus === 'reviewed' ? 'reviewed' as const : 'pending' as const,
            findings: [
              {
                label: item.test_name,
                severity:
                  item.status_category === 'normal'
                    ? 'normal' as const
                    : item.status_category === 'pending'
                      ? 'pending' as const
                      : 'monitor' as const,
                value: item.result_value
                  ? `${item.result_value}${item.result_unit ? ` ${item.result_unit}` : ''}`
                  : t('patient.imaging.resultPending'),
              },
            ],
            impression:
              item.result_value || item.reference_range
                ? t('patient.imaging.impressionFromResult', {
                    result: item.result_value ?? t('patient.imaging.resultPending'),
                    range: item.reference_range ?? t('patient.imaging.noReferenceRange'),
                  })
                : t('patient.imaging.impressionPending'),
            accessionNumber: `IMG-${order.id.slice(0, 8).toUpperCase()}`,
          }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [labOrders, t]);

  const selectedStudy = studies.find((study) => study.id === selectedId) ?? studies[0] ?? null;
  const pendingCount = studies.filter((study) => study.status === 'pending').length;
  const reviewedCount = studies.filter((study) => study.status === 'reviewed').length;
  const followUpCount = studies.filter((study) => study.findings.some((finding) => finding.severity === 'monitor')).length;
  const scheduled = (labOrders ?? []).filter((order) => order.isUpcoming);

  const tabs: Array<{ key: ImagingTab; label: string; badge?: number }> = [
    { key: 'recent', label: t('patient.imaging.tabRecent'), badge: studies.length },
    { key: 'viewer', label: t('patient.imaging.tabViewer') },
    { key: 'reports', label: t('patient.imaging.tabReports') },
    { key: 'findings', label: t('patient.imaging.tabFindings') },
    { key: 'scheduled', label: t('patient.imaging.tabScheduled'), badge: scheduled.length },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
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
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
              <Scan className="h-4 w-4" />
              {t('patient.imaging.title')}
            </div>
            <h1 className="mb-2 text-3xl font-bold">{t('patient.imaging.heroTitle')}</h1>
            <p className="max-w-2xl text-violet-100">{t('patient.imaging.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              // Real client-side export of the studies list so patients can
              // send their imaging history to an external provider.
              const lines = [
                `${t('patient.imaging.title')} — ${new Date().toLocaleDateString()}`,
                '',
                ...studies.map((study) =>
                  [
                    `• ${study.modality ?? ''} ${study.studyType ?? ''}`.trim(),
                    `  Date: ${formatDate(study.date)}`,
                    `  Facility: ${study.facility}`,
                    `  Status: ${study.status}`,
                  ]
                    .filter(Boolean)
                    .join('\n')
                ),
              ];
              const body = lines.join('\n');
              if (navigator.share) {
                void navigator
                  .share({ title: t('patient.imaging.title'), text: body })
                  .catch(() => undefined);
                return;
              }
              const subject = encodeURIComponent(t('patient.imaging.title'));
              const mailto = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
              window.location.href = mailto;
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
          >
            <Share2 className="h-4 w-4" />
            {t('patient.imaging.shareStudies')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: t('patient.imaging.kpiStudies'), value: studies.length, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-100' },
          { label: t('patient.imaging.kpiPending'), value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: t('patient.imaging.kpiReviewed'), value: reviewedCount, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: t('patient.imaging.kpiFollowUp'), value: followUpCount, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: t('patient.imaging.kpiScheduled'), value: scheduled.length, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-100' },
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

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 sm:px-6">
          <div className="flex min-w-max gap-6 overflow-x-auto sm:gap-8">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-2 py-4 text-[15px] font-medium transition-all duration-300 ${
                    active ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {typeof tab.badge === 'number' ? (
                    <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                      {formatLocaleDigits(tab.badge, uiLang)}
                    </span>
                  ) : null}
                  {active ? <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {studies.length === 0 && activeTab !== 'scheduled' ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <Scan className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-900">{t('patient.imaging.emptyTitle')}</h3>
              <p className="mt-2 text-sm text-slate-500">{t('patient.imaging.emptyBody')}</p>
            </div>
          ) : null}

          {activeTab === 'recent' && studies.length > 0 ? (
            <div className="space-y-4">
              {studies.map((study, idx) => (
                <button
                  key={study.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(study.id);
                    setActiveTab('viewer');
                  }}
                  className="animate-slideUp w-full rounded-xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-100">
                        <Scan className="h-7 w-7 text-violet-600" />
                      </div>
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{study.studyType}</h3>
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                            {study.modality}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {study.facility} · {formatDate(study.date)}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">{study.impression}</p>
                      </div>
                    </div>
                    <span className={study.status === 'reviewed' ? 'text-sm font-bold text-emerald-600' : 'text-sm font-bold text-amber-600'}>
                      {study.status === 'reviewed' ? t('patient.imaging.reviewed') : t('patient.imaging.awaitingReview')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {activeTab === 'viewer' ? (
            selectedStudy ? (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl bg-slate-900 p-6 text-white">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{selectedStudy.studyType}</h3>
                      <p className="text-sm text-slate-400">{selectedStudy.accessionNumber}</p>
                    </div>
                    <Eye className="h-5 w-5 text-violet-300" />
                  </div>
                  <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-white/10 bg-slate-800">
                    <div className="text-center">
                      <Scan className="mx-auto mb-4 h-20 w-20 text-violet-300" />
                      <p className="font-mono text-sm text-slate-300">{t('patient.imaging.viewerPlaceholder')}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-bold text-slate-900">{t('patient.imaging.studyDetails')}</h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-slate-400">{t('patient.imaging.facility')}</dt>
                      <dd className="font-medium text-slate-900">{selectedStudy.facility}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">{t('patient.imaging.orderedBy')}</dt>
                      <dd className="font-medium text-slate-900">{selectedStudy.orderedBy}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">{t('patient.imaging.date')}</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selectedStudy.date)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">{t('patient.imaging.impression')}</dt>
                      <dd className="font-medium text-slate-900">{selectedStudy.impression}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : null
          ) : null}

          {activeTab === 'reports' ? (
            <div className="space-y-3">
              {studies.map((study) => (
                <div key={study.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-violet-600" />
                    <div>
                      <div className="font-bold text-slate-900">{study.studyType}</div>
                      <div className="text-sm text-slate-500">{study.accessionNumber}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedId(study.id)} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm">
                    {t('patient.imaging.viewReport')}
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === 'findings' ? (
            <div className="space-y-4">
              {studies.flatMap((study) =>
                study.findings.map((finding) => (
                  <div key={`${study.id}-${finding.label}`} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900">{finding.label}</h3>
                      <span
                        className={
                          finding.severity === 'normal'
                            ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700'
                            : finding.severity === 'pending'
                              ? 'rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700'
                              : 'rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700'
                        }
                      >
                        {t(`patient.imaging.finding.${finding.severity}`)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{study.studyType} · {finding.value}</p>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {activeTab === 'scheduled' ? (
            scheduled.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <h3 className="text-lg font-bold text-slate-900">{t('patient.imaging.noScheduledTitle')}</h3>
                <p className="mt-2 text-sm text-slate-500">{t('patient.imaging.noScheduledBody')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduled.map((order) => (
                  <div key={order.id} className="rounded-xl bg-violet-50 p-5">
                    <div className="font-bold text-slate-900">{order.items[0]?.test_name ?? t('patient.imaging.scheduledStudy')}</div>
                    <div className="text-sm text-slate-600">{formatDate(order.ordered_at)} · {order.labName ?? t('patient.imaging.ceenaixRadiology')}</div>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-700">
        {t('patient.imaging.dataNote')}
      </div>
    </div>
  );
};
