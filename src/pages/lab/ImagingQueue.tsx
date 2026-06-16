import { useMemo, useState } from 'react';
import type { LabPageContext } from './shared/types';
import { ageGenderLabel, formatTat, formatTimeShort } from './shared/helpers';
import { SectionCard, Pill, ProgressMeter } from './shared/ui';

const IMAGING_MODALITIES = ['All ●', 'MRI', 'CT', 'X-Ray', 'USS', 'MAMMO', 'PET'] as const;
const IMAGING_STATUS_TABS = ['All', 'Scanning', 'Report Pending', 'Scheduled', 'Complete'] as const;

export const ImagingQueueView = ({ context }: { context: LabPageContext }) => {
  const studies = useMemo(() => context.data?.imagingStudies ?? [], [context.data?.imagingStudies]);
  const [modalityFilter, setModalityFilter] = useState<string>('All ●');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filtered = useMemo(() => {
    return studies.filter((s) => {
      if (modalityFilter !== 'All ●') {
        const target = modalityFilter.toUpperCase();
        if (s.modality.toUpperCase() !== target) return false;
      }
      if (statusFilter !== 'All') {
        if (statusFilter === 'Scanning' && s.status !== 'scanning') return false;
        if (statusFilter === 'Report Pending' && s.status !== 'report_pending') return false;
        if (statusFilter === 'Scheduled' && s.status !== 'scheduled') return false;
        if (statusFilter === 'Complete' && s.status !== 'released' && s.status !== 'reported') return false;
      }
      return true;
    });
  }, [studies, modalityFilter, statusFilter]);

  const active = filtered.filter((s) => s.status === 'scanning');
  const reportPending = filtered.filter((s) => s.status === 'report_pending');
  const scheduled = filtered.filter((s) => s.status === 'scheduled' || s.status === 'ordered');
  const released = filtered.filter((s) => s.status === 'released' || s.status === 'reported');

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="space-y-4 p-5">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-slate-900">Imaging Queue — {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-bold">{studies.length}</span> studies today · {active.length} scanning · {released.length} reported · {scheduled.length} scheduled
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {IMAGING_MODALITIES.map((m) => (
            <button type="button"
              key={m}
              onClick={() => setModalityFilter(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${modalityFilter === m ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {IMAGING_STATUS_TABS.map((s) => (
            <button type="button"
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {active.length > 0 ? (
          <SectionCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">ACTIVE NOW</div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{active.length}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {active.map((study) => (
                <article key={study.id} className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-700">{study.modality}</span>
                    <span className="font-['DM_Mono'] text-xs text-slate-500">{study.accession}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{study.patientName}</h3>
                      <p className="text-sm text-slate-500">{ageGenderLabel(study.patientAge, study.patientGender)}</p>
                    </div>
                    <div className="font-['DM_Mono'] text-2xl font-bold text-blue-700">{study.progressPercent}%</div>
                  </div>
                  <div className="mt-3">
                    <ProgressMeter value={study.progressPercent} tone="accent-blue-500" />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{study.studyName}</p>
                  <p className="mt-1 text-xs text-slate-500">~{formatTat(study.tatMinutes)} remaining · {study.room ?? 'Scanner'}</p>
                  <Pill className="mt-2 bg-blue-100 text-blue-700 ring-blue-200">SCANNING</Pill>
                </article>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {reportPending.length > 0 ? (
          <SectionCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-700">REPORT PENDING</div>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">{reportPending.length}</span>
            </div>
            <div className="space-y-3">
              {reportPending.map((study) => {
                const overdue = (study.tatMinutes ?? 0) > 240;
                return (
                  <div key={study.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                    <div>
                      <div className="text-xs font-bold text-slate-700">{study.modality}</div>
                      <div className="font-bold text-slate-900">{study.patientName}</div>
                      <div className="text-xs text-slate-500">{study.studyName}</div>
                      <div className="text-xs text-slate-500">{study.doctorName}</div>
                    </div>
                    <div className={`text-xs font-bold ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                      {formatTat(study.tatMinutes)} {overdue ? '🔴' : '⚠️'}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ) : null}

        {scheduled.length > 0 ? (
          <SectionCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700">SCHEDULED</div>
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-700">{scheduled.length}</span>
            </div>
            <div className="space-y-3">
              {scheduled.map((study) => (
                <div key={study.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-700">{study.modality}</div>
                    <div className="text-xs font-bold text-slate-600">{formatTimeShort(study.scheduledAt)}</div>
                  </div>
                  <div className="mt-1 font-bold text-slate-900">{study.patientName}</div>
                  <div className="text-xs text-slate-600">{study.studyName}</div>
                  <div className="mt-1 text-xs text-slate-500">Patient: Not yet arrived</div>
                  {study.alerts && study.alerts.length > 0 ? <div className="mt-1 text-xs text-amber-700">⚠️ {study.alerts[0]}</div> : null}
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {released.length > 0 ? (
          <SectionCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">REPORTED / RELEASED</div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{released.length}</span>
            </div>
            <div className="space-y-3">
              {released.map((study) => (
                <div key={study.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-xs font-bold text-slate-700">{study.modality}<span className="ml-2 text-emerald-700">✅ {study.status === 'released' ? 'Released' : 'Reported'}</span></div>
                  <div className="mt-1 font-bold text-slate-900">{study.patientName}</div>
                  <div className="text-xs text-slate-600">{study.studyName}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
};
