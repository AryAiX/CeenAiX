import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LabPageContext } from './shared/types';
import {
  priorityClass,
  formatTimeShort,
  ageGenderLabel,
  insurancePillClass,
  orderCardAccent,
} from './shared/helpers';
import { Pill, EmptyState } from './shared/ui';

type ImagingOrderTab = 'new' | 'scheduled' | 'active' | 'completed' | 'rejected' | 'all';

export const ImagingOrdersPage = ({ context }: { context: LabPageContext }) => {
  const navigate = useNavigate();
  const studies = useMemo(() => context.data?.imagingStudies ?? [], [context.data?.imagingStudies]);
  const [tab, setTab] = useState<ImagingOrderTab>('new');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleAcceptAndSchedule = async (studyId: string) => {
    setRejectError(null);
    setAcceptingId(studyId);
    try {
      await context.actions.setImagingStudyStatus(studyId, 'scheduled');
      navigate('/lab/imaging/queue');
    } catch (error) {
      setRejectError(error instanceof Error ? error.message : 'Failed to accept this study.');
    } finally {
      setAcceptingId(null);
    }
  };

  const counts = {
    new: studies.filter((s) => s.status === 'ordered').length,
    scheduled: studies.filter((s) => s.status === 'scheduled').length,
    active: studies.filter((s) => s.status === 'scanning').length,
    completed: studies.filter((s) => s.status === 'released' || s.status === 'reported').length,
    rejected: 0,
    all: studies.length,
  };

  const tabs: Array<{ id: ImagingOrderTab; label: string; emoji: string; count: number }> = [
    { id: 'new', emoji: '📬', label: 'New', count: counts.new },
    { id: 'scheduled', emoji: '⏳', label: 'Scheduled', count: counts.scheduled },
    { id: 'active', emoji: '🔄', label: 'Active', count: counts.active },
    { id: 'completed', emoji: '✅', label: 'Completed', count: counts.completed },
    { id: 'rejected', emoji: '❌', label: 'Rejected', count: counts.rejected },
    { id: 'all', emoji: '', label: 'All', count: counts.all },
  ];

  const filtered = useMemo(() => {
    if (tab === 'new') return studies.filter((s) => s.status === 'ordered');
    if (tab === 'scheduled') return studies.filter((s) => s.status === 'scheduled');
    if (tab === 'active') return studies.filter((s) => s.status === 'scanning');
    if (tab === 'completed') return studies.filter((s) => s.status === 'released' || s.status === 'reported');
    if (tab === 'rejected') return [];
    return studies;
  }, [studies, tab]);

  const preAuthCount = studies.filter((s) => s.preauthStatus).length;

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-700">
            <span className="font-bold">{preAuthCount}</span> studies awaiting insurance pre-authorization
          </p>
          <button type="button" disabled title="Pre-auth tracker — coming soon" className="cursor-not-allowed rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 opacity-80">View Pre-Auth Tracker →</button>
        </div>
        {rejectError ? (
          <div role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
            {rejectError}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t.emoji} {t.label} ({t.count})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {filtered.length === 0 ? <EmptyState label="No imaging orders match this filter." /> : null}

        {filtered.map((study) => {
          const accent = orderCardAccent(study.priority, false);

          return (
            <article
              key={study.id}
              className={`relative overflow-hidden rounded-2xl border ${accent.border} ${accent.bg} bg-white p-5 shadow-sm`}
            >
              <span className={`absolute left-0 top-0 h-full w-1.5 ${accent.bar}`} aria-hidden="true" />

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-['DM_Mono'] text-sm font-bold text-slate-700">{study.accession.replace(/^(MRI|CT|USS|XR|PET|X-Ray)/, 'IORD')}</span>
                <Pill className={priorityClass[study.priority]}>{accent.label}</Pill>
                <span className="text-xs text-slate-500">Today {formatTimeShort(study.scheduledAt)}</span>
                <Pill className={
                  (study.sourceLabel ?? '').toLowerCase().includes('walk-in')
                    ? 'bg-slate-100 text-slate-700 ring-slate-200'
                    : 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                }>
                  {study.sourceLabel ?? 'CeenAiX ePrescription'} {(study.sourceLabel ?? '').toLowerCase().includes('walk-in') ? '' : '✅'}
                </Pill>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">PATIENT</div>
                  <div className="mt-2 text-base font-bold text-slate-900">{study.patientName}</div>
                  <div className="text-sm text-slate-600">{ageGenderLabel(study.patientAge, study.patientGender)}</div>
                  {study.insurancePlan ? (
                    <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${insurancePillClass(study.insurancePlan)}`}>
                      {study.insurancePlan}
                    </span>
                  ) : null}
                </div>
                <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">DOCTOR</div>
                  <div className="mt-2 text-base font-bold text-slate-900">{study.doctorName}</div>
                  <div className="text-sm text-slate-600">
                    {study.doctorSpecialty ?? 'Clinician'} · {study.clinicName}
                  </div>
                  {study.doctorDhaLicense ? (
                    <div className="mt-1 text-xs font-semibold text-emerald-700">DHA: {study.doctorDhaLicense} ✅</div>
                  ) : null}
                </div>
              </div>

              {study.clinicalIndication ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  <span className="font-bold">Clinical Indication:</span> {study.clinicalIndication}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">{study.modality}</div>
                  <h3 className="mt-2 font-bold text-slate-900">{study.studyName}</h3>
                  {study.icd10Code ? (
                    <p className="mt-2 text-xs text-slate-600">{study.icd10Code} — {study.icd10Description}</p>
                  ) : null}
                  {study.cptCode ? <p className="text-xs font-['DM_Mono'] text-indigo-600">CPT: {study.cptCode}</p> : null}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
                  <div className="text-slate-600">
                    <span className="font-bold">Contrast:</span>{' '}
                    <span className={study.contrast && study.contrast !== 'No' ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                      {study.contrast ?? 'No'}
                    </span>
                  </div>
                  <div className="text-slate-600"><span className="font-bold">Prep:</span> {study.prepInstructions ?? 'No prep required'}</div>
                  <div className="text-slate-600"><span className="font-bold">Priority:</span> <span className={`font-semibold ${
                    study.priority === 'STAT' ? 'text-red-600' : study.priority === 'Urgent' ? 'text-amber-600' : 'text-slate-600'
                  }`}>{study.priority}</span></div>
                  {study.roomsAvailableSummary ? (
                    <div className="mt-2 text-xs font-semibold text-emerald-700">{study.roomsAvailableSummary} ✅</div>
                  ) : null}
                  {study.suggestedSlot ? (
                    <div className="text-xs text-slate-500">Suggested: {study.suggestedSlot}</div>
                  ) : null}
                </div>
              </div>

              {study.preauthStatus ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-amber-900">
                      <span className="font-bold">Pre-auth:</span>{' '}
                      <span className={`font-semibold ${insurancePillClass(study.insurancePlan).includes('rose') ? 'text-rose-700' : insurancePillClass(study.insurancePlan).includes('sky') ? 'text-sky-700' : insurancePillClass(study.insurancePlan).includes('indigo') ? 'text-indigo-700' : insurancePillClass(study.insurancePlan).includes('violet') ? 'text-violet-700' : 'text-amber-900'}`}>
                        {study.insurancePlan}
                      </span>
                      {' — '}
                      <span className="font-semibold text-amber-800">{study.preauthStatus}</span>
                      {' ⚠️'}
                    </div>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(
                        `Pre-auth request: ${study.accession} ${study.studyName}`
                      )}&body=${encodeURIComponent(
                        `Patient: ${study.patientName}\nStudy: ${study.studyName}\nModality: ${study.modality}\nPrescriber: ${study.doctorName}\nInsurance: ${study.insurancePlan ?? '—'}\nClinical indication: ${study.clinicalIndication ?? '—'}\n\nPlease initiate pre-authorization.`
                      )}`}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      📋 Request Pre-Auth
                    </a>
                  </div>
                  {study.preauthCoverage ? <div className="mt-1 text-xs text-amber-700">{study.preauthCoverage}</div> : null}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleAcceptAndSchedule(study.id)}
                  disabled={acceptingId === study.id || study.status !== 'ordered'}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {acceptingId === study.id
                    ? 'Accepting…'
                    : study.status === 'ordered'
                      ? 'Accept & Schedule'
                      : 'Accepted'}
                </button>
                <button type="button"
                  onClick={async () => {
                    setRejectError(null);
                    const reason = window.prompt(
                      `Reject imaging order ${study.accession}?\n\nProvide a short reason that will be saved to the order notes:`
                    );
                    if (reason === null) return;
                    try {
                      await context.actions.rejectOrder(study.id, reason.trim());
                    } catch (error) {
                      setRejectError(error instanceof Error ? error.message : 'Failed to reject this order.');
                    }
                  }}
                  className="ml-auto rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
