import { useState } from 'react';
import type { LabPageContext } from './shared/types';
import { formatTimeShort } from './shared/helpers';
import { SectionCard, Pill } from './shared/ui';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
};

export const QualityControlView = ({ context }: { context: LabPageContext }) => {
  const data = context.data;
  const [showLeveyJenningsModal, setShowLeveyJenningsModal] = useState(false);
  const [showViewLogModal, setShowViewLogModal] = useState(false);
  const [showQcRunModal, setShowQcRunModal] = useState(false);
  const [qcForm, setQcForm] = useState({
    instrumentName: '',
    department: 'laboratory',
    lotNumber: '',
    levelLabel: 'Level 1',
    resultLabel: '',
    status: 'passed' as 'passed' | 'warning' | 'failed',
  });
  const [qcSaving, setQcSaving] = useState(false);
  const [qcError, setQcError] = useState<string | null>(null);
  const runs = data?.qcRuns ?? [];
  const lastQcRun = [...runs].sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime())[0];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRuns = runs.filter((r) => new Date(r.runAt).getTime() >= todayStart.getTime());
  const passed = todayRuns.filter((r) => r.status === 'passed').length;
  const failures = todayRuns.filter((r) => r.status === 'failed').length;
  const labEquipmentInMaintenance = (data?.equipment ?? []).filter((e) => e.department === 'laboratory' && e.status === 'maintenance');
  const maintenance = labEquipmentInMaintenance.length;
  const labInstruments = (data?.equipment ?? [])
    .filter((e) => e.department === 'laboratory')
    .map((e) => e.name);

  const handleLogQcRun = async () => {
    if (!qcForm.instrumentName) {
      setQcError('Please select an instrument.');
      return;
    }
    if (!qcForm.lotNumber.trim()) {
      setQcError('Please enter a QC lot number.');
      return;
    }
    if (!qcForm.resultLabel.trim()) {
      setQcError('Please enter a result label.');
      return;
    }
    setQcError(null);
    setQcSaving(true);
    try {
      await context.actions.logQcRun({
        instrumentName: qcForm.instrumentName,
        department: qcForm.department,
        lotNumber: qcForm.lotNumber.trim(),
        levelLabel: qcForm.levelLabel,
        resultLabel: qcForm.resultLabel.trim(),
        status: qcForm.status,
      });
      setShowQcRunModal(false);
      setQcForm({
        instrumentName: '',
        department: 'laboratory',
        lotNumber: '',
        levelLabel: 'Level 1',
        resultLabel: '',
        status: 'passed',
      });
    } catch (error) {
      setQcError(getErrorMessage(error, 'Failed to log QC run.'));
    } finally {
      setQcSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-500">
          Last QC: {formatTimeShort(lastQcRun?.runAt)} · {lastQcRun?.department ?? 'Lab'} ·{' '}
          {lastQcRun?.resultLabel ?? 'No runs yet'}
        </div>
        <button
          type="button"
          onClick={() => {
            setQcError(null);
            setQcForm({
              instrumentName: labInstruments[0] ?? '',
              department: 'laboratory',
              lotNumber: '',
              levelLabel: 'Level 1',
              resultLabel: '',
              status: 'passed',
            });
            setShowQcRunModal(true);
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          Log New QC Run
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SectionCard className="border-emerald-200 bg-emerald-50">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">QC PASS ✅</div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-bold text-emerald-800">{passed}/{todayRuns.length}</div>
          <div className="mt-2 text-xs text-emerald-700">{todayRuns.length === 0 ? 'No QC runs logged today' : 'Instruments passed today'}</div>
        </SectionCard>
        <SectionCard className="border-amber-200 bg-amber-50">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">MAINTENANCE ⚠️</div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-bold text-amber-900">{maintenance}</div>
          <div className="mt-2 text-xs text-amber-800">
            {labEquipmentInMaintenance.length === 0
              ? 'No instruments under maintenance'
              : labEquipmentInMaintenance.map((e) => e.name).join(', ')}
          </div>
        </SectionCard>
        <SectionCard className="border-rose-200 bg-rose-50">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">FAILURES</div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-bold text-rose-800">{failures}</div>
          <div className="mt-2 text-xs text-rose-700">
            {todayRuns.length === 0 ? 'No runs logged today' : failures === 0 ? 'No QC failures today ✅' : `${failures} QC failure${failures === 1 ? '' : 's'} need review ⚠️`}
          </div>
        </SectionCard>
      </div>

      {labEquipmentInMaintenance.map((equipment) => (
        <SectionCard key={equipment.id} className="border-amber-200 bg-amber-50">
          <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-amber-950">{equipment.name} ({equipment.equipmentType}) — Under Maintenance</h2>
          {equipment.subtitle ? (
            <p className="mt-1 text-sm text-amber-800">{equipment.subtitle}</p>
          ) : (
            <p className="mt-1 text-sm text-amber-800">No additional maintenance details recorded.</p>
          )}
          {equipment.alert ? (
            <p className="mt-2 text-sm text-amber-800">{equipment.alert}</p>
          ) : null}
          <a
            href="/lab/equipment"
            className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
          >
            View Maintenance Log →
          </a>
        </SectionCard>
      ))}

      <SectionCard>
        <h2 className="mb-3 font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">QC Results — Today</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Instrument</th>
                <th className="px-3 py-2">QC Lot</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-3 py-2 text-slate-500">{formatTimeShort(run.runAt)}</td>
                  <td className="px-3 py-2 text-slate-600 capitalize">{run.department === 'laboratory' ? 'Laboratory' : run.department}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{run.instrumentName}</td>
                  <td className="px-3 py-2 font-['DM_Mono'] text-xs text-slate-500">{run.lotNumber}</td>
                  <td className="px-3 py-2 text-slate-600">{run.levelLabel}</td>
                  <td className="px-3 py-2">
                    <Pill className={
                      run.status === 'passed'
                        ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                        : run.status === 'failed'
                        ? 'bg-rose-100 text-rose-700 ring-rose-200'
                        : 'bg-amber-100 text-amber-700 ring-amber-200'
                    }>
                      {run.resultLabel}
                    </Pill>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {run.status === 'warning' ? (
                      <button
                        type="button"
                        onClick={() => setShowViewLogModal(true)}
                        className="text-xs font-bold text-amber-700 underline decoration-dotted hover:text-amber-800"
                      >
                        View Log
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowLeveyJenningsModal(true)}
                        className="text-xs font-bold text-indigo-600 underline decoration-dotted hover:text-indigo-800"
                      >
                        Levey-Jennings
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      {showQcRunModal ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Log New QC Run</h3>
            <p className="mt-1 text-sm text-gray-500">Record a quality control run for a lab instrument.</p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Instrument</span>
                <select
                  value={qcForm.instrumentName}
                  onChange={(e) => setQcForm((f) => ({ ...f, instrumentName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300"
                >
                  <option value="">Select instrument…</option>
                  {labInstruments.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Department</span>
                <select
                  value={qcForm.department}
                  onChange={(e) => setQcForm((f) => ({ ...f, department: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300"
                >
                  <option value="laboratory">Laboratory</option>
                  <option value="radiology">Radiology</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">QC Lot Number</span>
                <input
                  type="text"
                  value={qcForm.lotNumber}
                  onChange={(e) => setQcForm((f) => ({ ...f, lotNumber: e.target.value }))}
                  placeholder="e.g. LOT-2026-001"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Level</span>
                <select
                  value={qcForm.levelLabel}
                  onChange={(e) => setQcForm((f) => ({ ...f, levelLabel: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300"
                >
                  <option value="Level 1">Level 1 (Low)</option>
                  <option value="Level 2">Level 2 (Normal)</option>
                  <option value="Level 3">Level 3 (High)</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Result Label</span>
                <input
                  type="text"
                  value={qcForm.resultLabel}
                  onChange={(e) => setQcForm((f) => ({ ...f, resultLabel: e.target.value }))}
                  placeholder="e.g. Passed, Failed, Out of Range"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300"
                />
              </label>
              <div>
                <span className="mb-1 block text-xs font-semibold text-slate-700">Status</span>
                <div className="flex gap-2">
                  {(['passed', 'warning', 'failed'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQcForm((f) => ({ ...f, status: s }))}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold capitalize transition ${
                        qcForm.status === s
                          ? s === 'passed' ? 'bg-emerald-600 text-white'
                            : s === 'warning' ? 'bg-amber-500 text-white'
                            : 'bg-rose-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s === 'passed' ? '✅ Passed' : s === 'warning' ? '⚠️ Warning' : '❌ Failed'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {qcError ? (
              <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{qcError}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowQcRunModal(false)}
                disabled={qcSaving}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleLogQcRun()}
                disabled={qcSaving}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {qcSaving ? 'Saving…' : 'Log QC Run'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showLeveyJenningsModal ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Levey-Jennings Chart — Coming Soon</h3>
            <p className="mt-2 text-sm text-gray-500">
              Levey-Jennings charts show an instrument's QC results plotted over time, making it easy to spot trends or drift before results actually fail. This feature hasn't been built yet and will be added in a future pass.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowLeveyJenningsModal(false)}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showViewLogModal ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Maintenance Log — Coming Soon</h3>
            <p className="mt-2 text-sm text-gray-500">
              Viewing the detailed maintenance log for a specific instrument isn't available yet. This will link directly to the instrument's maintenance history once per-equipment logging is built.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowViewLogModal(false)}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
