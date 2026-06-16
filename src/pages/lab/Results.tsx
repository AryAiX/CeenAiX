import { useEffect, useState } from 'react';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import type { LabPageContext } from './shared/types';
import {
  ageGenderLabel,
  formatTimeShort,
  sampleStatusBadge,
  sampleStatusLabel,
} from './shared/helpers';
import { SectionCard, Pill, EmptyState } from './shared/ui';

export const LabResultsPage = ({ context }: { context: LabPageContext }) => {
  const samples = context.data?.samples ?? [];
  const candidates = samples.filter((s) => s.status === 'resulted' || s.status === 'processing' || s.status === 'collected');
  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.id ?? null);
  const selected = candidates.find((s) => s.id === selectedId) ?? candidates[0];
  const [instrument, setInstrument] = useState('Roche Cobas 6000');
  const [pin, setPin] = useState('');
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<'idle' | 'draft' | 'release' | 'verify'>('idle');
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [resultsNotice, setResultsNotice] = useState<string | null>(null);
  const meta = context.data?.facilityMeta;
  const qcRuns = context.data?.qcRuns ?? [];
  const matchingQcRun =
    qcRuns
      .filter((run) => run.instrumentName === instrument)
      .sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime())[0] ?? null;

  // Reset the draft buffer when the selected sample changes so values from
  // one patient never leak into another.
  const selectedId2 = selected?.id ?? null;
  useEffect(() => {
    setResultDrafts({});
    setResultsError(null);
    setResultsNotice(null);
  }, [selectedId2]);

  const draftFor = (itemId: string, existing: string | null) =>
    resultDrafts[itemId] ?? existing ?? '';

  const persistDrafts = async () => {
    if (!selected) return [] as string[];
    const entries = Object.entries(resultDrafts).filter(([, value]) => value.trim().length > 0);
    const itemsById = new Map(selected.tests.map((test) => [test.itemId, test] as const));
    const saved: string[] = [];
    for (const [itemId, value] of entries) {
      const test = itemsById.get(itemId);
      if (!test) continue;
      const numeric = Number.parseFloat(value);
      const referenceMin = test.referenceMin ? Number.parseFloat(test.referenceMin) : null;
      const referenceMax = test.referenceMax ? Number.parseFloat(test.referenceMax) : null;
      const referenceText =
        test.referenceText ??
        (referenceMin != null && referenceMax != null ? `${referenceMin}-${referenceMax}` : null);
      const isAbnormal =
        !Number.isNaN(numeric) && referenceMin != null && referenceMax != null
          ? numeric < referenceMin || numeric > referenceMax
          : Boolean(test.isAbnormal);
      await context.actions.saveItemResult({
        itemId,
        resultValue: value.trim(),
        resultUnit: test.resultUnit,
        referenceRange: referenceText,
        isAbnormal,
      });
      saved.push(itemId);
    }
    return saved;
  };

  const handleSaveDraft = async () => {
    if (!selected) return;
    setResultsError(null);
    setResultsNotice(null);
    setSaving('draft');
    try {
      const saved = await persistDrafts();
      setResultsNotice(
        saved.length > 0
          ? `Saved ${saved.length} result${saved.length === 1 ? '' : 's'} as draft.`
          : 'Nothing to save — enter at least one value first.'
      );
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : 'Failed to save drafts.');
    } finally {
      setSaving('idle');
    }
  };

  const handleVerifyAndRelease = async () => {
    if (!selected) return;
    if (!pin.trim()) {
      setResultsError('Enter your technician PIN to verify the release.');
      return;
    }
    setResultsError(null);
    setResultsNotice(null);
    setSaving('verify');
    try {
      await persistDrafts();
      await context.actions.releaseOrder(selected.id);
      setResultsNotice('Results verified and released to the requesting doctor.');
      setResultDrafts({});
      setPin('');
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : 'Failed to release results.');
    } finally {
      setSaving('idle');
    }
  };

  const handleReleaseAndNotify = async () => {
    if (!selected) return;
    if (!pin.trim()) {
      setResultsError('Enter your technician PIN to release these results.');
      return;
    }
    setResultsError(null);
    setResultsNotice(null);
    setSaving('release');
    try {
      await persistDrafts();
      await context.actions.releaseOrder(selected.id);
      setResultsNotice('Results released — the requesting doctor will be notified via the standard alert.');
      setResultDrafts({});
      setPin('');
    } catch (error) {
      setResultsError(error instanceof Error ? error.message : 'Failed to release results.');
    } finally {
      setSaving('idle');
    }
  };

  if (!selected) {
    return (
      <div className="h-full overflow-y-auto p-5">
        <EmptyState label="No samples available for result entry." />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left rail: sample selector */}
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pending Samples</div>
        <div className="space-y-1.5">
          {candidates.map((s) => (
            <button type="button"
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full rounded-lg p-2 text-left transition ${selectedId === s.id || (!selectedId && s.id === candidates[0]?.id) ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}
            >
              <div className="font-['DM_Mono'] text-xs font-bold text-slate-700">{s.orderCode}</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">{s.patientName}</div>
              <Pill className={`mt-1 ${sampleStatusBadge[s.status]}`}>{sampleStatusLabel(s.status, !!s.criticalValue)}</Pill>
            </button>
          ))}
        </div>
      </aside>

      {/* Main: result entry workspace */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
        <div className="grid gap-4 xl:grid-cols-[320px,1fr]">
          {/* Patient panel */}
          <div className="space-y-4">
            <SectionCard>
              <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-slate-900">{selected.patientName}</h2>
              <p className="text-sm text-slate-500">
                {ageGenderLabel(selected.patientAge, selected.patientGender)}{selected.bloodType ? ` · ${selected.bloodType}` : ''} · PT-{selected.patientId.slice(0, 3).toUpperCase()}
              </p>
              {selected.insurancePlan ? <p className="mt-1 text-xs text-slate-500">{selected.insurancePlan}</p> : null}
              <div className="mt-3 text-xs text-slate-500">
                Emirates ID lookup is handled inside the patient portal —
                request a re-verification from{' '}
                <a href="/lab/profile" className="font-semibold text-indigo-600 underline">
                  the lab profile workspace
                </a>{' '}
                if needed.
              </div>
            </SectionCard>
            <SectionCard>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">SAMPLE INFO</div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Sample ID</dt><dd className="font-['DM_Mono'] font-bold text-slate-900">{selected.orderCode}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="text-slate-700">Venous blood — EDTA + SST</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Collected</dt><dd className="text-slate-700">{formatTimeShort(selected.collectedAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Received</dt><dd className="text-slate-700">{formatTimeShort(selected.receivedAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Accessioned</dt><dd className="text-slate-700">{formatTimeShort(selected.receivedAt)}</dd></div>
              </dl>
            </SectionCard>
            <SectionCard>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">REQUESTING DOCTOR</div>
              <p className="font-bold text-slate-900">{selected.doctorName}</p>
              <p className="text-sm text-slate-600">{selected.doctorSpecialty ?? 'Clinician'} · {selected.clinicName}</p>
              {selected.doctorDhaLicense ? <p className="mt-1 text-xs text-emerald-700">{selected.doctorDhaLicense} ✅</p> : null}
              {selected.clinicalNotes ? (
                <p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">{selected.clinicalNotes}</p>
              ) : null}
            </SectionCard>
            <SectionCard>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">TESTS ORDERED</div>
              <div className="space-y-2">
                {selected.tests.map((t) => (
                  <div key={`order-${t.testName}`} className="rounded-lg bg-slate-50 p-2">
                    <div className="font-bold text-sm text-slate-900">{t.testName}</div>
                    <div className="font-['DM_Mono'] text-[10px] text-slate-500">
                      {t.loincCode} · {selected.priority}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Right: result entry */}
          <div className="space-y-4">
            <SectionCard>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-500">Select Instrument:</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Roche Cobas 6000', 'Cobas 8000', 'Manual Entry'].map((inst) => (
                    <button type="button"
                      key={inst}
                      onClick={() => setInstrument(inst)}
                      className={`rounded-lg px-3 py-2 text-xs font-bold ${instrument === inst ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                    >
                      {instrument === inst ? `${inst} ●` : inst}
                    </button>
                  ))}
                </div>
              </div>
              {matchingQcRun ? (
                <div className={`mt-4 rounded-lg border px-3 py-2 text-sm font-bold ${
                  matchingQcRun.status === 'passed'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : matchingQcRun.status === 'failed'
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}>
                  {matchingQcRun.lotNumber}{' '}
                  {matchingQcRun.status === 'passed' ? '✅ QC PASS' : matchingQcRun.status === 'failed' ? '❌ QC FAIL' : '⚠️ QC WARNING'}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
                  No QC run on file for {instrument}
                </div>
              )}
            </SectionCard>

            <SectionCard>
              <div className="mb-3">
                <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">Result Entry — All Panels</h2>
                <p className="text-sm text-slate-500">{selected.patientName} · {selected.orderCode}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {selected.tests.map((t) => (
                  <label key={`entry-${t.itemId}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="font-bold text-sm text-slate-900">{t.testName}</div>
                    <div className="font-['DM_Mono'] text-[10px] text-slate-500">LOINC: {t.loincCode ?? '—'}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draftFor(t.itemId, t.resultValue)}
                        onChange={(event) =>
                          setResultDrafts((current) => ({
                            ...current,
                            [t.itemId]: event.target.value,
                          }))
                        }
                        placeholder="Value"
                        maxLength={FORM_FIELD_LIMITS.shortText}
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                      />
                      <span className="text-xs text-slate-500">{t.resultUnit ?? '—'}</span>
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-500">Ref: {t.referenceText ?? '—'}</div>
                  </label>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-2.5"><div className="text-xs text-slate-500">Abnormal</div><div className="font-bold text-slate-900">{selected.tests.filter((t) => t.isAbnormal).length} of {selected.tests.length} flagged</div></div>
                <div className="rounded-lg bg-slate-50 p-2.5"><div className="text-xs text-slate-500">Critical</div><div className="font-bold text-slate-900">{selected.criticalValue ? selected.criticalValue : 'None'}</div></div>
                <div className={`rounded-lg p-2.5 ${matchingQcRun?.status === 'passed' ? 'bg-emerald-50' : matchingQcRun?.status === 'failed' ? 'bg-rose-50' : matchingQcRun?.status === 'warning' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${matchingQcRun?.status === 'passed' ? 'text-emerald-700' : matchingQcRun?.status === 'failed' ? 'text-rose-700' : matchingQcRun?.status === 'warning' ? 'text-amber-700' : 'text-slate-500'}`}>QC</div>
                  <div className={`font-bold ${matchingQcRun?.status === 'passed' ? 'text-emerald-800' : matchingQcRun?.status === 'failed' ? 'text-rose-800' : matchingQcRun?.status === 'warning' ? 'text-amber-800' : 'text-slate-700'}`}>
                    {matchingQcRun
                      ? matchingQcRun.status === 'passed' ? '✅ Passed for this run' : matchingQcRun.status === 'failed' ? '❌ Failed for this run' : '⚠️ Warning for this run'
                      : 'No QC on file'}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">VERIFICATION SIGN-OFF</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="text-xs text-slate-500">Technician</div>
                  <div className="font-bold text-slate-900">{meta?.technicianName ?? selected.technicianName ?? 'Unassigned'} · {meta?.technicianCredentials ?? 'Lab Tech'}</div>
                </div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Technician PIN"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              {resultsError ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">
                  {resultsError}
                </div>
              ) : null}
              {resultsNotice ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  {resultsNotice}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button"
                  onClick={() => void handleSaveDraft()}
                  disabled={saving !== 'idle'}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving === 'draft' ? 'Saving…' : '💾 Save Draft'}
                </button>
                <button type="button"
                  onClick={() => void handleReleaseAndNotify()}
                  disabled={saving !== 'idle'}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving === 'release' ? 'Releasing…' : 'Release & Notify Doctor'}
                </button>
                <button type="button"
                  onClick={() => void handleVerifyAndRelease()}
                  disabled={saving !== 'idle'}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving === 'verify' ? 'Verifying…' : 'Verify & Release'}
                </button>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
};
