import { useState } from 'react';
import type { LabPortalData } from '../../hooks';
import { formatTimeShort } from './shared/helpers';
import { SectionCard, Pill } from './shared/ui';

export const QualityControlView = ({ data }: { data: LabPortalData | null }) => {
  const [showLeveyJenningsModal, setShowLeveyJenningsModal] = useState(false);
  const [showViewLogModal, setShowViewLogModal] = useState(false);
  const runs = data?.qcRuns ?? [];
  const lastQcRun = [...runs].sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime())[0];
  const passed = runs.filter((r) => r.status === 'passed').length;
  const failures = runs.filter((r) => r.status === 'failed').length;
  const labEquipmentInMaintenance = (data?.equipment ?? []).filter((e) => e.department === 'laboratory' && e.status === 'maintenance');
  const maintenance = labEquipmentInMaintenance.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-500">
          Last QC: {formatTimeShort(lastQcRun?.runAt)} · {lastQcRun?.department ?? 'Lab'} ·{' '}
          {lastQcRun?.resultLabel ?? 'No runs yet'}
        </div>
        <button
          type="button"
          disabled
          title="QC run entry — coming soon"
          className="cursor-not-allowed rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white opacity-60"
        >
          Log New QC Run
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SectionCard className="border-emerald-200 bg-emerald-50">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">QC PASS ✅</div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-bold text-emerald-800">{passed}/{runs.length}</div>
          <div className="mt-2 text-xs text-emerald-700">All instruments today</div>
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
            {failures === 0 ? 'No QC failures today ✅' : `${failures} QC failure${failures === 1 ? '' : 's'} need review ⚠️`}
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
