import type { LabPortalData } from '../../hooks';
import { formatTimeShort } from './shared/helpers';
import { SectionCard, Pill } from './shared/ui';

export const QualityControlView = ({ data }: { data: LabPortalData | null }) => {
  const runs = data?.qcRuns ?? [];
  const passed = runs.filter((r) => r.status === 'passed').length;
  const maintenance = runs.filter((r) => r.status === 'warning').length;
  const failures = runs.filter((r) => r.status === 'failed').length;
  const labMaintenance = (data?.equipment ?? []).find((e) => e.department === 'laboratory' && e.status === 'maintenance');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-500">
          Last QC: {formatTimeShort(runs[0]?.runAt)} · {runs[0]?.department ?? 'Lab'} ·{' '}
          {runs[0]?.resultLabel ?? 'No runs yet'}
        </div>
        <a
          href="/lab/results/entry"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          Log New QC Run
        </a>
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
          <div className="mt-2 text-xs text-amber-800">{labMaintenance?.name ?? 'No instruments under maintenance'}</div>
        </SectionCard>
        <SectionCard className="border-rose-200 bg-rose-50">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">FAILURES</div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-bold text-rose-800">{failures}</div>
          <div className="mt-2 text-xs text-rose-700">
            {failures === 0 ? 'No QC failures today ✅' : `${failures} QC failure${failures === 1 ? '' : 's'} need review ⚠️`}
          </div>
        </SectionCard>
      </div>

      {labMaintenance ? (
        <SectionCard className="border-amber-200 bg-amber-50">
          <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-amber-950">{labMaintenance.name} ({labMaintenance.equipmentType}) — Under Maintenance</h2>
          <p className="mt-1 text-sm text-amber-800">Since {formatTimeShort(labMaintenance.maintenanceDueAt)} · ETA: 3:00 PM · Reason: Daily maintenance + ISI calibration</p>
          <p className="mt-2 text-sm text-amber-800">Samples rerouted to Sysmex CA-600 backup analyzer. ✅ All coagulation samples being processed.</p>
          <a
            href="/lab/equipment"
            className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
          >
            View Maintenance Log →
          </a>
        </SectionCard>
      ) : null}

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
                  <td className="px-3 py-2 text-slate-600 capitalize">{run.department === 'laboratory' ? 'Chemistry' : run.department}</td>
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
                      <a
                        href="/lab/equipment"
                        className="text-xs font-bold text-amber-700"
                      >
                        View Log
                      </a>
                    ) : (
                      <a
                        href="/lab/analytics"
                        className="text-xs font-bold text-indigo-600"
                      >
                        Levey-Jennings
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};
