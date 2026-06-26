import { useState, useEffect } from 'react';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import type { LabPageContext } from './shared/types';
import { ageGenderLabel, formatTat } from './shared/helpers';
import { SectionCard, EmptyState } from './shared/ui';

type ReportTab = 'pending' | 'draft' | 'done';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
};

export const RadiologyReportsPage = ({ context }: { context: LabPageContext }) => {
  const studies = context.data?.imagingStudies ?? [];
  const meta = context.data?.facilityMeta;
  const pending = studies.filter((s) => s.status === 'report_pending');
  const overdueCount = pending.filter((s) => (s.tatMinutes ?? 0) > 240).length;
  const draft = studies.filter((s) => s.status === 'reported');
  const done = studies.filter((s) => s.status === 'released');

  const [tab, setTab] = useState<ReportTab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(pending[0]?.id ?? null);
  const [savingReport, setSavingReport] = useState<'idle' | 'draft' | 'preliminary' | 'verify'>('idle');
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [manualChecklist, setManualChecklist] = useState<Record<string, boolean>>({});

  const list = tab === 'pending' ? pending : tab === 'draft' ? draft : done;
  const selected = studies.find((s) => s.id === selectedId) ?? list[0] ?? null;

  const [findingsText, setFindingsText] = useState('');
  const [impressionText, setImpressionText] = useState('');
  const [recommendationsText, setRecommendationsText] = useState('');

  useEffect(() => {
    setManualChecklist((selected?.reportChecklist as Record<string, boolean>) ?? {});
    setFindingsText(selected?.findings ?? '');
    setImpressionText(selected?.impression ?? '');
    setRecommendationsText(selected?.recommendations ?? '');
  }, [selected?.id, selected?.reportChecklist, selected?.findings, selected?.impression, selected?.recommendations]);

  const checklistItems = selected
    ? [
        { id: 'indication', label: 'Clinical indication referenced', checked: Boolean(selected.clinicalIndication), manual: false },
        { id: 'anatomy', label: 'All anatomical regions documented', checked: !!manualChecklist.anatomy, manual: true },
        { id: 'impression', label: 'Impression section complete', checked: !!manualChecklist.impression, manual: true },
        { id: 'icd10', label: 'ICD-10 coded', checked: Boolean(selected.icd10Code), manual: false },
        { id: 'comparison', label: 'Comparison study referenced', checked: !!manualChecklist.comparison, manual: true },
        { id: 'recommendations', label: 'Recommendations included', checked: !!manualChecklist.recommendations, manual: true },
        { id: 'qa', label: 'QA: measurements consistent with viewer', checked: !!manualChecklist.qa, manual: true },
      ]
    : [];

  const advanceStudy = async (
    nextStatus: 'reported' | 'released',
    label: 'idle' | 'draft' | 'preliminary' | 'verify',
    reportStatus: string | null
  ) => {
    if (!selected) return;
    setReportError(null);
    setReportNotice(null);
    setSavingReport(label);
    try {
      await context.actions.setImagingStudyStatus(selected.id, nextStatus, reportStatus, {
        findings: findingsText.trim() || null,
        impression: impressionText.trim() || null,
        recommendations: recommendationsText.trim() || null,
        reportChecklist: manualChecklist,
      });
      setReportNotice(
        nextStatus === 'released'
          ? 'Report verified and released to the requesting doctor.'
          : 'Report saved.'
      );
    } catch (error) {
      setReportError(getErrorMessage(error, 'Could not update the radiology report.'));
    } finally {
      setSavingReport('idle');
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
        <div className="mb-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
          <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">
            {meta?.radiologistName ?? 'No radiologist assigned'}{meta?.radiologistCredentials ? ` ${meta.radiologistCredentials}` : ''}
          </h2>
          <p className="mt-1 text-xs text-slate-600">Radiologist on duty · {pending.length} reports in queue</p>
          {overdueCount > 0 ? <p className="mt-1 text-xs font-bold text-red-600">{overdueCount} overdue</p> : null}
          <button type="button"
            onClick={() => {
              const isCurrentSelectionPending = selected ? pending.some((s) => s.id === selected.id) : false;
              if (isCurrentSelectionPending) {
                setTab('pending');
                return;
              }
              const firstPending = pending[0];
              if (firstPending) {
                setSelectedId(firstPending.id);
                setTab('pending');
              }
            }}
            disabled={pending.length === 0}
            className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            🏃 Start Reporting
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          {(['pending', 'draft', 'done'] as ReportTab[]).map((t) => (
            <button type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {t === 'pending' ? `Pending (${pending.length})` : t === 'draft' ? `Draft (${draft.length})` : `Done (${done.length})`}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {list.map((study) => {
            const overdue = (study.tatMinutes ?? 0) > 240;
            return (
              <button type="button"
                key={study.id}
                onClick={() => setSelectedId(study.id)}
                className={`w-full rounded-xl p-3 text-left transition ${selected?.id === study.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-slate-50 hover:bg-slate-100'}`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">{study.modality}</span>
                  <span className={overdue ? 'text-red-600' : 'text-amber-600'}>
                    {formatTat(study.tatMinutes)} {overdue ? '🔴 OVERDUE' : '⚠️'}
                  </span>
                </div>
                <div className="mt-1 font-bold text-sm text-slate-900">{study.patientName}</div>
                <div className="text-xs text-slate-500">{study.studyName}</div>
                <div className="text-xs text-slate-500">{study.doctorName}</div>
                <div className="mt-2 text-xs font-bold text-blue-600">▶ Report</div>
              </button>
            );
          })}
        </div>
      </aside>

      {selected ? (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-slate-900">
                {selected.studyName} · {selected.patientName} · {ageGenderLabel(selected.patientAge, selected.patientGender)}
              </h2>
              <p className="text-sm text-slate-500">{selected.accession}</p>
              <p className="text-sm text-slate-500">{selected.doctorName} · {selected.doctorSpecialty ?? 'Clinician'} · {selected.clinicName}</p>
            </div>

            <SectionCard>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  {['W/L', 'Zoom', 'Pan', 'Measure', 'Compare'].map((tool) => (
                    <button type="button" key={tool} disabled title="Imaging tools — coming soon" className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-500 opacity-80">{tool}</button>
                  ))}
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-700">TAT:</span> {formatTat(selected.tatMinutes)} <span className="text-slate-500">· Target: &lt;3h</span>
                </div>
              </div>

              <div className="mt-4 flex h-72 items-center justify-center rounded-xl bg-slate-950 text-center text-slate-300">
                <div>
                  <div className="text-4xl">⬛</div>
                  <div className="mt-2 text-sm font-bold">{selected.modality} Viewer · Slice 45/120</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {['Lung', 'Mediastinum', 'Bone', 'Liver'].map((view) => (
                  <button type="button" key={view} disabled title="Anatomy presets — coming soon" className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-500 opacity-80">{view}</button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <button type="button" disabled title="Slice navigation — coming soon" className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-500 opacity-80">◀ Prev</button>
                <span className="font-bold text-slate-700">45 / 120</span>
                <button type="button" disabled title="Slice navigation — coming soon" className="cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-500 opacity-80">Next ▶</button>
              </div>
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
              <SectionCard>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">CLINICAL INDICATION</div>
                <p className="mt-2 text-sm text-slate-700">{selected.clinicalIndication ?? 'No indication on file.'}</p>
                <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Technique</div>
                <p className="mt-2 text-sm text-slate-700">{selected.modality} performed{selected.contrast ? ` with ${selected.contrast}` : ''}.</p>
              </SectionCard>

              <SectionCard>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">FINDINGS — {selected.studyName}</div>
                  <button type="button"
                    disabled
                    title="AI report assist — coming soon"
                    className="cursor-not-allowed rounded-full bg-violet-100/70 px-2.5 py-1 text-[10px] font-bold text-violet-500 opacity-70"
                  >
                    🤖 AI Assist
                  </button>
                </div>
                <textarea
                  maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                  value={findingsText}
                  onChange={(e) => setFindingsText(e.target.value)}
                  placeholder="Enter findings for this study…"
                  className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 p-3 text-sm"
                />
              </SectionCard>
            </div>

            <SectionCard>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">IMPRESSION *</div>
              <textarea
                maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                value={impressionText}
                onChange={(e) => setImpressionText(e.target.value)}
                placeholder="Enter impression/conclusion for this study…"
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
              <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">ICD-10</div>
                  <div className="mt-1 rounded-lg bg-slate-50 p-2">
                    <div className="font-['DM_Mono'] text-xs">{selected.icd10Code ?? 'N/A'} — {selected.icd10Description ?? 'N/A'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">CPT</div>
                  <div className="mt-1 rounded-lg bg-slate-50 p-2 font-['DM_Mono'] text-xs">{selected.cptCode ?? 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Recommendations</div>
                  <textarea
                    maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                    value={recommendationsText}
                    onChange={(e) => setRecommendationsText(e.target.value)}
                    placeholder="Follow-up recommendations…"
                    className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">REPORT CHECKLIST</div>
              <div className="mt-3 space-y-1.5">
                {checklistItems.map((item) => (
                  <label key={item.id} className={`flex cursor-pointer items-center gap-2 text-sm ${item.checked ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {item.manual ? (
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => setManualChecklist((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    ) : (
                      <span className={item.checked ? 'text-emerald-600' : 'text-slate-300'}>{item.checked ? '✅' : '○'}</span>
                    )}
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              {reportError ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">
                  {reportError}
                </div>
              ) : null}
              {reportNotice ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  {reportNotice}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button"
                  onClick={() => void advanceStudy('reported', 'draft', 'draft')}
                  disabled={savingReport !== 'idle'}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingReport === 'draft' ? 'Saving…' : '💾 Save Draft'}
                </button>
                <button type="button"
                  onClick={() => void advanceStudy('reported', 'preliminary', 'preliminary')}
                  disabled={savingReport !== 'idle'}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingReport === 'preliminary' ? 'Submitting…' : '📤 Submit Preliminary'}
                </button>
                <button type="button"
                  onClick={() => void advanceStudy('released', 'verify', 'final')}
                  disabled={savingReport !== 'idle'}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingReport === 'verify' ? 'Verifying…' : 'Verify & Sign Report'}
                </button>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50">
          <EmptyState label="Select a study from the queue to begin reporting." />
        </div>
      )}
    </div>
  );
};
