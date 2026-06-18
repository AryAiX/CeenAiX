import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { LabPortalData } from '../../hooks';
import type { LabPageContext } from './shared/types';
import {
  formatNumber,
  formatTimeShort,
  formatTat,
  ageGenderLabel,
  equipmentStatusBadge,
  sampleStatusBadge,
  sampleStatusLabel,
} from './shared/helpers';
import { SectionCard, Pill, KpiTile, ProgressMeter } from './shared/ui';

const formatRelativeSync = (isoTimestamp: string | null): string => {
  if (!isoTimestamp) return 'Not yet synced';
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'Not yet synced';
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) return `synced ${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `synced ${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `synced ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `synced ${diffDays}d ago`;
};

const CriticalBanner = ({
  data,
  actions,
}: {
  data: LabPortalData | null;
  actions: LabPageContext['actions'];
}) => {
  const critical = data?.criticalValues.find((c) => c.status === 'pending') ?? data?.criticalValues[0];
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  if (!critical) return null;
  const observed = formatTimeShort(critical.observedAt);
  const isAlreadyNotified = critical.status === 'notified';

  const handleNotify = async () => {
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await actions.markCriticalValueNotified(critical.id, critical.observedAt);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not mark this critical value as notified.'
      );
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] ${isAlreadyNotified ? 'text-emerald-700' : 'text-red-700'}`}>
            <span>{isAlreadyNotified ? '✅' : '🔴'}</span>
            <span>{isAlreadyNotified ? 'CRITICAL VALUE — NOTIFIED' : 'CRITICAL VALUE — UNNOTIFIED'}</span>
          </div>
          <p className={`mt-1 text-sm font-semibold ${isAlreadyNotified ? 'text-emerald-700' : 'text-red-700'}`}>
            {isAlreadyNotified ? 'Doctor has already been notified of this critical value' : 'DHA requires notification within 60 minutes'}
          </p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 font-['DM_Mono'] text-sm font-bold text-red-700 ring-1 ring-red-200">
          {observed}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Patient', critical.patientName],
          ['Test', critical.testName],
          ['Value', critical.valueLabel],
          ['Reference', critical.referenceRange ?? 'Not recorded'],
          ['Doctor', [critical.doctorName, critical.facilityName].filter(Boolean).join(' · ') || 'Not recorded'],
          ['Resulted', `${observed} · ${critical.notifiedInMinutes ?? 0} min ago`],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-white/85 p-3 ring-1 ring-red-100">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-400">{label}</div>
            <div className="mt-1 text-sm font-bold text-red-950">{value}</div>
          </div>
        ))}
      </div>

      {errorMessage ? (
        <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200" role="alert">
          {errorMessage}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button"
          onClick={() => void handleNotify()}
          disabled={isSaving || isAlreadyNotified}
          className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed ${
            isAlreadyNotified
              ? 'bg-emerald-600 opacity-90'
              : isSaving
                ? 'bg-slate-400 opacity-90'
                : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAlreadyNotified
            ? '✅ Doctor notified'
            : isSaving
              ? 'Recording…'
              : 'Mark Doctor Notified'}
        </button>
        <a
          href="/lab/queue"
          className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
        >
          Open in queue
        </a>
      </div>
    </div>
  );
};

export const DashboardView = ({ context }: { context: LabPageContext }) => {
  const data = context.data;
  const [modalityFilter, setModalityFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'STAT' | 'Urgent' | 'Routine'>('All');
  const [isSubmittingNabidh, setIsSubmittingNabidh] = useState(false);
  const [nabidhSubmitError, setNabidhSubmitError] = useState<string | null>(null);
  const [showNabidhConfirm, setShowNabidhConfirm] = useState(false);
  const samples = data?.samples ?? [];
  const myLabQueueSamples = samples.filter((s) => s.isClaimed);
  const studies = data?.imagingStudies ?? [];
  const filteredSamples = priorityFilter === 'All' ? myLabQueueSamples : myLabQueueSamples.filter((s) => s.priority === priorityFilter);
  const dashboardSamples = filteredSamples.slice(0, 5);
  const [processingSampleId, setProcessingSampleId] = useState<string | null>(null);
  const [sampleActionError, setSampleActionError] = useState<string | null>(null);

  const handleSampleAction = async (sample: (typeof dashboardSamples)[number]) => {
    if (sample.status === 'ordered') {
      setSampleActionError(null);
      setProcessingSampleId(sample.id);
      try {
        await context.actions.startProcessing(sample.id);
      } catch (error) {
        setSampleActionError(
          error instanceof Error ? error.message : 'Could not start processing this sample.'
        );
      } finally {
        setProcessingSampleId(null);
      }
      return;
    }
    navigate('/lab/queue');
  };
  const activeStudies = studies.filter((s) => s.status === 'scanning');
  const scheduledStudies = studies.filter((s) => s.status === 'scheduled').slice(0, 3);
  const labEquipment = (data?.equipment ?? []).filter((e) => e.department === 'laboratory').slice(0, 4);
  const radiologyEquipment = (data?.equipment ?? []).filter((e) => e.department === 'radiology').slice(0, 7);
  const filteredStudies =
    modalityFilter === 'All'
      ? studies
      : modalityFilter === 'Other'
        ? studies.filter((s) => !['MRI', 'CT', 'USS', 'X-Ray'].includes(s.modality))
        : studies.filter((s) => s.modality === modalityFilter);
  const filteredActiveStudies = filteredStudies.filter((s) => s.status === 'scanning');
  const filteredReportPending = filteredStudies.filter((s) => s.status === 'report_pending').slice(0, 2);
  const filteredScheduledStudies = filteredStudies.filter((s) => s.status === 'scheduled' || s.status === 'ordered').slice(0, 3);
  const filteredCompletedStudies = filteredStudies.filter((s) => s.status === 'reported' || s.status === 'released').slice(0, 2);

  const labMetricCards = [
    {
      label: 'Samples',
      value: formatNumber(data?.metrics.sampleCountToday || samples.length),
      caption: 'Total today',
      tone: 'indigo' as const,
    },
    {
      label: 'Critical',
      value: formatNumber(data?.criticalValues.length),
      caption: `${formatNumber(data?.metrics.criticalUnnotified)} unnotified ⚠️`,
      tone: 'red' as const,
    },
    {
      label: 'Avg TAT',
      value: formatTat(data?.metrics.avgTatMinutes ?? null),
      caption: 'Today',
      tone: 'blue' as const,
    },
    {
      label: 'NABIDH',
      value: `${formatNumber(data?.metrics.nabidhSubmitted)}/${formatNumber((data?.metrics.nabidhSubmitted ?? 0) + (data?.metrics.nabidhPending ?? 0))}`,
      caption: 'Submitted',
      tone: 'violet' as const,
    },
    {
      label: 'QC ✅',
      value: `${formatNumber(data?.qcRuns.filter((r) => r.status === 'passed').length)}/${formatNumber(data?.qcRuns.length)}`,
      caption: `${formatNumber(data?.metrics.qualityWarnings)} in maintenance`,
      tone: 'emerald' as const,
    },
  ];

  const radMetricCards = [
    {
      label: 'Studies',
      value: formatNumber(studies.length),
      caption: 'Total today',
      tone: 'blue' as const,
    },
    {
      label: 'Scanning',
      value: formatNumber(activeStudies.length),
      caption: 'Active now',
      tone: 'violet' as const,
    },
    {
      label: 'Reports',
      value: formatNumber(data?.metrics.radiologyReports),
      caption: 'Pending sign-off',
      tone: 'orange' as const,
    },
    {
      label: 'Scheduled',
      value: formatNumber(scheduledStudies.length),
      caption: 'Today remaining',
      tone: 'cyan' as const,
    },
    {
      label: 'Issues ⚠️',
      value: formatNumber(data?.metrics.imagingEquipmentWarnings),
      caption: 'Equipment alerts',
      tone: 'amber' as const,
    },
  ];

  const navigate = useNavigate();

  const handleSubmitAllPendingNabidh = async () => {
    const pendingEventIds = (data?.nabidhEvents ?? [])
      .filter((event) => event.status === 'pending')
      .map((event) => event.id);
    if (pendingEventIds.length === 0) return;
    setNabidhSubmitError(null);
    setIsSubmittingNabidh(true);
    try {
      await context.actions.markNabidhSubmittedBulk(pendingEventIds);
      setShowNabidhConfirm(false);
    } catch (error) {
      setNabidhSubmitError(
        error instanceof Error ? error.message : 'Could not submit pending NABIDH events.'
      );
    } finally {
      setIsSubmittingNabidh(false);
    }
  };

  const mostRecentNabidhSubmission = (data?.nabidhEvents ?? [])
    .filter((event) => event.status === 'submitted' && event.submittedAt)
    .map((event) => event.submittedAt as string)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return (
    <div className="space-y-4">
      <CriticalBanner data={data} actions={context.actions} />

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-600">LABORATORY</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {labMetricCards.map((card) => (
            <KpiTile key={card.label} label={card.label} value={card.value} caption={card.caption} tone={card.tone} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-600">RADIOLOGY</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {radMetricCards.map((card) => (
            <KpiTile key={card.label} label={card.label} value={card.value} caption={card.caption} tone={card.tone} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <SectionCard className="xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Lab Queue</h3>
              <p className="text-xs text-slate-500">{formatNumber(filteredSamples.length)} samples · {formatNumber(filteredSamples.filter((s) => s.status !== 'reviewed').length)} active</p>
            </div>
            <button type="button" onClick={() => navigate('/lab/queue')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All</button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPriorityFilter('All')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${priorityFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter('STAT')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${priorityFilter === 'STAT' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              STAT ({myLabQueueSamples.filter((s) => s.priority === 'STAT').length})
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter('Urgent')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${priorityFilter === 'Urgent' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Urgent ({myLabQueueSamples.filter((s) => s.priority === 'Urgent').length})
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter('Routine')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${priorityFilter === 'Routine' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Routine ({myLabQueueSamples.filter((s) => s.priority === 'Routine').length})
            </button>
          </div>
          {sampleActionError ? (
            <p className="mb-2 text-xs font-semibold text-red-600" role="alert">{sampleActionError}</p>
          ) : null}
          <div className="space-y-3">
            {dashboardSamples.map((sample) => {
              const code = sample.orderCode.split('-').slice(-1)[0];
              const action =
                sample.status === 'resulted' || sample.criticalValue
                  ? '📞 Notify'
                  : sample.status === 'ordered'
                  ? '▶ Process'
                  : '📋 View';
              return (
                <article key={sample.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-['DM_Mono'] text-xs font-bold text-slate-500">{code}</div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{sample.patientName} <span className="text-xs font-normal text-slate-500">· {ageGenderLabel(sample.patientAge, sample.patientGender)}</span></div>
                      <div className="mt-1 text-xs text-slate-500">
                        {sample.testNames.length} tests · {sample.testNames.slice(0, 3).join(' · ')}
                      </div>
                      {sample.criticalValue ? <div className="mt-1 text-xs font-bold text-red-600">{sample.criticalValue} ↑↑</div> : null}
                      <Pill className={`mt-2 ${sampleStatusBadge[sample.status]}`}>{sampleStatusLabel(sample.status, !!sample.criticalValue)}</Pill>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSampleAction(sample)}
                      disabled={processingSampleId === sample.id}
                      className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingSampleId === sample.id ? 'Starting…' : action}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {filteredSamples.length > 5 ? (
            <button type="button" onClick={() => navigate('/lab/queue')} className="mt-3 w-full rounded-xl bg-slate-50 px-4 py-2.5 text-center text-xs font-bold text-indigo-600 hover:bg-slate-100">
              {filteredSamples.length - 5} more samples · View all in queue →
            </button>
          ) : null}
        </SectionCard>

        <SectionCard className="xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Imaging Queue</h3>
              <p className="text-xs text-slate-500">{formatNumber(filteredStudies.length)} studies · {formatNumber(filteredActiveStudies.length)} scanning</p>
            </div>
            <button type="button" onClick={() => navigate('/lab/imaging/queue')} className="text-xs font-bold text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {['All', 'MRI', 'CT', 'USS', 'X-Ray', 'Other'].map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setModalityFilter(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  modalityFilter === m ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {filteredActiveStudies.length > 0 ? (
            <div className="mb-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">ACTIVE NOW</div>
              <div className="space-y-3">
                {filteredActiveStudies.slice(0, 3).map((study) => (
                  <article key={study.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-['DM_Mono'] font-bold text-violet-700">{study.progressPercent}%</span>
                      <span className="font-bold text-slate-700">{study.modality}</span>
                    </div>
                    <ProgressMeter value={study.progressPercent} tone="accent-violet-500" />
                    <div className="mt-2 text-sm font-bold text-slate-900">{study.patientName} <span className="text-xs font-normal text-slate-500">· {ageGenderLabel(study.patientAge, study.patientGender)}</span></div>
                    <div className="text-xs text-slate-500">{study.studyName}</div>
                    <div className="mt-1 text-xs text-slate-500">{study.room ?? 'Scanner'} · {formatTat(study.tatMinutes)} elapsed</div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {filteredReportPending.length > 0 ? (
            <div className="mb-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">REPORT PENDING ({filteredReportPending.length})</div>
              <div className="space-y-2">
                {filteredReportPending.map((study) => {
                  const overdue = (study.tatMinutes ?? 0) > 240;
                  return (
                    <div key={study.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                      <div>
                        <div className="font-bold text-slate-900">{study.modality}</div>
                        <div className="text-xs text-slate-700">{study.patientName}</div>
                        <div className="text-xs text-slate-500">{study.studyName}</div>
                      </div>
                      <div className={`text-xs font-bold ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatTat(study.tatMinutes)} {overdue ? '🔴 OVERDUE' : '⚠️'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {filteredScheduledStudies.length > 0 ? (
            <div className="mb-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">SCHEDULED ({filteredScheduledStudies.length})</div>
              <div className="space-y-2">
                {filteredScheduledStudies.map((study) => (
                  <div key={study.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">{study.modality}</div>
                      <div className="text-xs font-bold text-slate-600">{formatTimeShort(study.scheduledAt)}</div>
                    </div>
                    <div className="text-xs text-slate-700">{study.patientName}</div>
                    {study.alerts && study.alerts.length > 0 ? <div className="text-xs text-amber-700">⚠️ {study.alerts[0]}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {filteredCompletedStudies.length > 0 ? (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">REPORTED / RELEASED ({filteredCompletedStudies.length})</div>
              <div className="space-y-2">
                {filteredCompletedStudies.map((study) => (
                  <div key={study.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="text-xs font-bold text-slate-700">
                      {study.modality}
                      <span className="ml-2 text-emerald-700">✅ {study.status === 'released' ? 'Released' : 'Reported'}</span>
                    </div>
                    <div className="mt-1 font-bold text-slate-900">{study.patientName}</div>
                    <div className="text-xs text-slate-600">{study.studyName}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>

        <div className="space-y-4 xl:col-span-2">
          <SectionCard>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Equipment</div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">🩻 RADIOLOGY</div>
            <div className="space-y-1.5">
              {radiologyEquipment.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between text-xs">
                  <span className="truncate font-semibold text-slate-700">{eq.name.split(' ').slice(0, 2).join(' ')}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${equipmentStatusBadge[eq.status]}`}>
                    {eq.status === 'online' ? '✅' : eq.status === 'maintenance' ? '🔄' : '⚠️'}
                  </span>
                </div>
              ))}
            </div>
            <div className="my-2 border-t border-slate-100" />
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">🧪 LABORATORY</div>
            <div className="space-y-1.5">
              {labEquipment.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between text-xs">
                  <span className="truncate font-semibold text-slate-700">{eq.name.split(' ').slice(0, 2).join(' ')}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${equipmentStatusBadge[eq.status]}`}>
                    {eq.status === 'online' ? '✅' : eq.status === 'maintenance' ? '🔄' : '⚠️'}
                  </span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => navigate('/lab/equipment')} className="mt-3 w-full text-center text-[11px] font-bold text-indigo-600 hover:text-indigo-700">
              View All Equipment →
            </button>
          </SectionCard>

          <SectionCard>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">🇦🇪 NABIDH HIE · FHIR R4</div>
            <p className="text-[11px] font-semibold text-emerald-700">
              Connected · {formatRelativeSync(mostRecentNabidhSubmission)}
            </p>
            <div className="mt-3 space-y-2 text-[11px]">
              <div>🧪 Lab {data?.metrics.nabidhSubmittedLab ?? 0}/{(data?.metrics.nabidhSubmittedLab ?? 0) + (data?.metrics.nabidhPendingLab ?? 0)} ({(data?.metrics.nabidhSubmittedLab ?? 0) + (data?.metrics.nabidhPendingLab ?? 0) > 0 ? Math.round(((data?.metrics.nabidhSubmittedLab ?? 0) / ((data?.metrics.nabidhSubmittedLab ?? 0) + (data?.metrics.nabidhPendingLab ?? 0))) * 100) : 0}%)</div>
              <div>🩻 Radiology {data?.metrics.nabidhSubmittedRadiology ?? 0}/{(data?.metrics.nabidhSubmittedRadiology ?? 0) + (data?.metrics.nabidhPendingRadiology ?? 0)} ({(data?.metrics.nabidhSubmittedRadiology ?? 0) + (data?.metrics.nabidhPendingRadiology ?? 0) > 0 ? Math.round(((data?.metrics.nabidhSubmittedRadiology ?? 0) / ((data?.metrics.nabidhSubmittedRadiology ?? 0) + (data?.metrics.nabidhPendingRadiology ?? 0))) * 100) : 0}%)</div>
              <div>Total: {(data?.metrics.nabidhSubmitted ?? 0) + (data?.metrics.nabidhPending ?? 0)} · {data?.metrics.nabidhPending ?? 0} pending</div>
            </div>
            {nabidhSubmitError ? (
              <p className="mt-2 text-[11px] font-semibold text-red-600" role="alert">{nabidhSubmitError}</p>
            ) : null}
            <button
              type="button"
              onClick={() => setShowNabidhConfirm(true)}
              disabled={isSubmittingNabidh || (data?.metrics.nabidhPending ?? 0) === 0}
              className="mt-3 w-full rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-100 disabled:text-violet-700 disabled:opacity-80"
            >
              {isSubmittingNabidh
                ? 'Submitting…'
                : (data?.metrics.nabidhPending ?? 0) === 0
                  ? '✅ All submitted'
                  : `📤 Submit All Pending (${data?.metrics.nabidhPending})`}
            </button>
          </SectionCard>

          <SectionCard>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Volume Today</div>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {formatNumber(samples.length)} lab + {formatNumber(studies.length)} radiology = {formatNumber(samples.length + studies.length)} total
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Lab: ⚠️ {formatNumber(data?.metrics.criticalUnnotified)} critical · {formatNumber(data?.metrics.labQueue)} pending · {formatNumber(data?.metrics.nabidhPending)} NABIDH</p>
            <p className="text-[11px] text-slate-500">Radiology: ⚠️ {formatNumber(data?.metrics.radiologyReports)} reports pending</p>
            <button type="button" disabled title="Handoff report — coming soon" className="mt-3 w-full cursor-not-allowed rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 opacity-80">
              📋 Generate Handoff Report
            </button>
          </SectionCard>
        </div>
      </div>

      {showNabidhConfirm
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900">Submit All Pending to NABIDH</h3>
                <p className="mt-2 text-sm text-gray-500">
                  This will submit {data?.metrics.nabidhPending ?? 0} pending record{(data?.metrics.nabidhPending ?? 0) === 1 ? '' : 's'} to the NABIDH health information exchange. This action cannot be undone.
                </p>
                {nabidhSubmitError ? (
                  <p className="mt-2 text-sm font-semibold text-red-600" role="alert">{nabidhSubmitError}</p>
                ) : null}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNabidhConfirm(false)}
                    disabled={isSubmittingNabidh}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmitAllPendingNabidh()}
                    disabled={isSubmittingNabidh}
                    className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    {isSubmittingNabidh ? 'Submitting…' : 'Yes, Submit All'}
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
