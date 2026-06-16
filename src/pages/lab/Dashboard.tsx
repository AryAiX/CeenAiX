import { useState } from 'react';
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
          ['Reference', '3.5–5.0 mEq/L'],
          ['Doctor', 'Dr. Maryam Al Sayed · Al Zahra Clinic'],
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
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-emerald-600 disabled:opacity-90"
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
  const samples = data?.samples ?? [];
  const studies = data?.imagingStudies ?? [];
  const dashboardSamples = samples.slice(0, 5);
  const activeStudies = studies.filter((s) => s.status === 'scanning');
  const reportPending = studies.filter((s) => s.status === 'report_pending').slice(0, 2);
  const scheduledStudies = studies.filter((s) => s.status === 'scheduled').slice(0, 3);
  const labEquipment = (data?.equipment ?? []).filter((e) => e.department === 'laboratory').slice(0, 4);
  const radiologyEquipment = (data?.equipment ?? []).filter((e) => e.department === 'radiology').slice(0, 7);
  const nabidhTotal = (data?.metrics.nabidhSubmitted ?? 0) + (data?.metrics.nabidhPending ?? 0);
  const nabidhPercent = nabidhTotal > 0 ? Math.round(((data?.metrics.nabidhSubmitted ?? 0) / nabidhTotal) * 100) : 0;

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
      value: '3.2h',
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
              <p className="text-xs text-slate-500">{formatNumber(samples.length)} samples · {formatNumber(samples.filter((s) => s.status !== 'reviewed').length)} active</p>
            </div>
            <button type="button" onClick={() => navigate('/lab/queue')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All</button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" disabled title="Queue filters — coming soon" className="cursor-not-allowed rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white opacity-90">All</button>
            <button type="button" disabled title="Queue filters — coming soon" className="cursor-not-allowed rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 opacity-80">STAT ({samples.filter((s) => s.priority === 'STAT').length})</button>
            <button type="button" disabled title="Queue filters — coming soon" className="cursor-not-allowed rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 opacity-80">Urgent ({samples.filter((s) => s.priority === 'Urgent').length})</button>
            <button type="button" disabled title="Queue filters — coming soon" className="cursor-not-allowed rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 opacity-80">Routine</button>
          </div>
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
                      disabled
                      title="Sample actions — open full queue to process"
                      className="cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 opacity-80"
                    >
                      {action}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {samples.length > 5 ? (
            <button type="button" onClick={() => navigate('/lab/queue')} className="mt-3 w-full rounded-xl bg-slate-50 px-4 py-2.5 text-center text-xs font-bold text-indigo-600 hover:bg-slate-100">
              {samples.length - 5} more samples · View all in queue →
            </button>
          ) : null}
        </SectionCard>

        <SectionCard className="xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Imaging Queue</h3>
              <p className="text-xs text-slate-500">{formatNumber(studies.length)} studies · {formatNumber(activeStudies.length)} scanning</p>
            </div>
            <button type="button" onClick={() => navigate('/lab/imaging/queue')} className="text-xs font-bold text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {['All ●', 'MRI', 'CT', 'USS', 'X-Ray', 'Other'].map((m, i) => (
              <button type="button" key={m} className={`rounded-full px-3 py-1.5 text-xs font-bold ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {m}
              </button>
            ))}
          </div>
          {activeStudies.length > 0 ? (
            <div className="mb-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">ACTIVE NOW</div>
              <div className="space-y-3">
                {activeStudies.slice(0, 3).map((study) => (
                  <article key={study.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-['DM_Mono'] font-bold text-violet-700">{study.progressPercent}%</span>
                      <span className="font-bold text-slate-700">{study.modality}</span>
                    </div>
                    <ProgressMeter value={study.progressPercent} tone="accent-violet-500" />
                    <div className="mt-2 text-sm font-bold text-slate-900">{study.patientName} <span className="text-xs font-normal text-slate-500">· {ageGenderLabel(study.patientAge, study.patientGender)}</span></div>
                    <div className="text-xs text-slate-500">{study.studyName}</div>
                    <div className="mt-1 text-xs text-slate-500">{study.room ?? 'Scanner'} · {formatTat(study.tatMinutes)} remaining</div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {reportPending.length > 0 ? (
            <div className="mb-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">REPORT PENDING ({reportPending.length})</div>
              <div className="space-y-2">
                {reportPending.map((study) => {
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
          {scheduledStudies.length > 0 ? (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">SCHEDULED ({scheduledStudies.length})</div>
              <div className="space-y-2">
                {scheduledStudies.map((study) => (
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
            <p className="text-[11px] font-semibold text-emerald-700">Connected · synced 12s ago</p>
            <div className="mt-3 space-y-2 text-[11px]">
              <div>🧪 Lab {data?.metrics.nabidhSubmitted ?? 0}/{nabidhTotal} ({nabidhPercent}%)</div>
              <div>🩻 Radiology {data?.metrics.nabidhSubmitted ?? 0}/{nabidhTotal} ({nabidhPercent}%)</div>
              <div>Total: {(data?.metrics.nabidhSubmitted ?? 0) + (data?.metrics.nabidhPending ?? 0)} · {data?.metrics.nabidhPending ?? 0} pending</div>
            </div>
            <button type="button" disabled title="Bulk NABIDH submit — coming soon" className="mt-3 w-full cursor-not-allowed rounded-xl bg-violet-100 px-3 py-2 text-[11px] font-bold text-violet-700 opacity-80">
              📤 Submit All Pending
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
    </div>
  );
};
