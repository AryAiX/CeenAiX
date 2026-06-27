import { useState } from 'react';
import type { LabPortalEquipment, LabDepartment } from '../../hooks';
import type { LabPageContext } from './shared/types';
import { formatDateShort } from './shared/helpers';
import { SectionCard, ProgressMeter } from './shared/ui';

const EquipmentCard = ({
  item,
  department,
  latestQcRun,
  onMaintenanceClick,
  onMarkOnlineClick,
}: {
  item: LabPortalEquipment;
  department: LabDepartment;
  latestQcRun: { status: 'passed' | 'failed' | 'warning' } | null;
  onMaintenanceClick: () => void;
  onMarkOnlineClick: () => void;
}) => {
  const statusColor =
    item.status === 'online' ? 'bg-emerald-100 text-emerald-700' :
    item.status === 'maintenance' ? 'bg-amber-100 text-amber-800' :
    item.status === 'warning' ? 'bg-orange-100 text-orange-700' :
    'bg-rose-100 text-rose-700';
  // Hosted display labels:
  //   Radiology: SCANNING (active scan), ONLINE, SCHEDULED (next slot soon), QA IN PROGRESS, MAINTENANCE
  //   Laboratory: RUNNING (active batch), ONLINE, MAINTENANCE, WARNING
  const isActivelyRunning = item.isRunning;
  const displayLabel = (() => {
    if (item.status === 'maintenance' && !isActivelyRunning) return 'MAINTENANCE';
    if (department === 'radiology') {
      if (isActivelyRunning) return 'SCANNING';
      if (item.status === 'warning') return item.alert?.toUpperCase().includes('QA') ? 'QA IN PROGRESS' : 'SCHEDULED';
      return 'ONLINE';
    }
    if (isActivelyRunning) return 'RUNNING';
    if (item.status === 'warning') return 'WARNING';
    return 'ONLINE';
  })();
  const labelToneClass =
    displayLabel === 'SCANNING' || displayLabel === 'RUNNING'
      ? 'bg-violet-100 text-violet-700'
      : displayLabel === 'MAINTENANCE'
      ? 'bg-amber-100 text-amber-800'
      : displayLabel === 'QA IN PROGRESS' || displayLabel === 'WARNING'
      ? 'bg-orange-100 text-orange-700'
      : displayLabel === 'SCHEDULED'
      ? 'bg-cyan-100 text-cyan-700'
      : statusColor;

  // Hosted layout differs per department:
  //   Radiology: status pill / NAME / model (equipmentType) / type (subtitle) / activity panel
  //   Laboratory: status pill / department (room) / NAME / equipmentType / activity description (subtitle)
  const isLab = department === 'laboratory';

  return (
    <SectionCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${labelToneClass}`}>
            {displayLabel}
          </span>
          {isLab && item.room ? (
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{item.room}</p>
          ) : null}
          <h3 className={`${isLab ? 'mt-1' : 'mt-2'} font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900`}>{item.name}</h3>
          {!isLab && item.equipmentType && item.equipmentType !== item.subtitle ? (
            <p className="text-sm font-semibold text-slate-700">{item.equipmentType}</p>
          ) : null}
          {!isLab && item.subtitle ? <p className="text-xs text-slate-500">{item.subtitle}</p> : null}
          {isLab && item.equipmentType ? <p className="text-xs text-slate-500">{item.equipmentType}</p> : null}
          {isLab && item.subtitle ? (
            <p className="mt-2 text-xs font-semibold text-slate-700">{item.subtitle}</p>
          ) : null}
          {isLab && item.activeRemainingLabel ? (
            <p className="mt-1 text-xs text-slate-500">{item.activeRemainingLabel}</p>
          ) : null}
        </div>
      </div>

      {!isLab && item.activeUserLabel ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs">
          <div className="font-semibold text-slate-700">{item.activeUserLabel}</div>
          {item.activeRemainingLabel ? <div className="text-slate-500">{item.activeRemainingLabel}</div> : null}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-['DM_Mono'] text-2xl font-bold text-slate-900">{item.todayCount ?? '—'}</div>
          <div className="text-[10px] uppercase text-slate-500">Today</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-['DM_Mono'] text-2xl font-bold text-slate-900">{item.uptimePercent ? `${item.uptimePercent}%` : '—'}</div>
          <div className="text-[10px] uppercase text-slate-500">Uptime</div>
        </div>
        <div className={`rounded-lg p-2 ${
          latestQcRun?.status === 'passed' ? 'bg-emerald-50'
            : latestQcRun?.status === 'failed' ? 'bg-rose-50'
            : latestQcRun?.status === 'warning' ? 'bg-amber-50'
            : 'bg-slate-50'
        }`}>
          <div className={`font-['DM_Mono'] text-2xl font-bold ${
            latestQcRun?.status === 'passed' ? 'text-emerald-700'
              : latestQcRun?.status === 'failed' ? 'text-rose-700'
              : latestQcRun?.status === 'warning' ? 'text-amber-700'
              : 'text-slate-400'
          }`}>
            {latestQcRun?.status === 'passed' ? '✅' : latestQcRun?.status === 'failed' ? '❌' : latestQcRun?.status === 'warning' ? '⚠️' : '—'}
          </div>
          <div className={`text-[10px] uppercase ${
            latestQcRun?.status === 'passed' ? 'text-emerald-700'
              : latestQcRun?.status === 'failed' ? 'text-rose-700'
              : latestQcRun?.status === 'warning' ? 'text-amber-700'
              : 'text-slate-500'
          }`}>QC</div>
        </div>
      </div>

      {item.qcStatus ? <div className="mt-2 text-xs text-slate-500">{item.qcStatus}</div> : null}
      {item.alert ? <div className="mt-2 text-xs text-amber-700">{item.alert}</div> : null}

      {item.reagents && item.reagents.length > 0 ? (
        <div className="mt-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">REAGENT LEVELS</div>
          <div className="mt-2 space-y-2">
            {item.reagents.map((r) => (
              <div key={r.name}>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700">{r.name}</span>
                  <span className={`font-bold ${r.percent < 50 ? 'text-amber-700' : 'text-slate-700'}`}>{r.percent}%</span>
                </div>
                <ProgressMeter value={r.percent} tone={r.percent < 50 ? 'accent-amber-500' : 'accent-emerald-500'} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {item.maintenanceDueAt ? (() => {
        const isOverdue = new Date(item.maintenanceDueAt).getTime() < Date.now();
        return (
          <p className={`mt-3 text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
            Maintenance due: {formatDateShort(item.maintenanceDueAt)} {isOverdue ? '🔴 OVERDUE' : ''}
          </p>
        );
      })() : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {isLab ? (
          <button
            type="button"
            disabled
            title="Per-equipment stats — coming soon"
            className="flex-1 cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-400 opacity-70 text-center"
          >
            📊 Stats
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Equipment scheduling — coming soon"
            className="flex-1 cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-400 opacity-70 text-center"
          >
            📋 Schedule
          </button>
        )}
        {isLab ? (
          <button
            type="button"
            onClick={onMaintenanceClick}
            className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 text-center"
          >
            ⚙️ Log Maintenance
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Maintenance logging — coming soon"
            className="flex-1 cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-400 opacity-70 text-center"
          >
            ⚙️ Maintenance
          </button>
        )}
        {isLab && (item.status === 'maintenance' || item.status === 'warning') ? (
          <button
            type="button"
            onClick={onMarkOnlineClick}
            className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 text-center"
          >
            ✅ Mark Online
          </button>
        ) : null}
      </div>
    </SectionCard>
  );
};

export const EquipmentPage = ({ context, department }: { context: LabPageContext; department: LabDepartment }) => {
  const data = context.data;
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [maintenanceTarget, setMaintenanceTarget] = useState<{ id: string; name: string } | null>(null);
  const [onlineTarget, setOnlineTarget] = useState<{ id: string; name: string } | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceType: 'scheduled' as 'scheduled' | 'unscheduled',
    reason: '',
    performedBy: '',
    expectedReturnAt: '',
    notes: '',
  });
  const [onlineNotes, setOnlineNotes] = useState('');
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [onlineSaving, setOnlineSaving] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    return fallback;
  };

  const handleLogMaintenance = async () => {
    if (!maintenanceTarget || !maintenanceForm.reason.trim()) return;
    setMaintenanceError(null);
    setMaintenanceSaving(true);
    try {
      await context.actions.logMaintenance({
        equipmentId: maintenanceTarget.id,
        maintenanceType: maintenanceForm.maintenanceType,
        reason: maintenanceForm.reason.trim(),
        performedBy: maintenanceForm.performedBy.trim() || null,
        expectedReturnAt: maintenanceForm.expectedReturnAt || null,
        notes: maintenanceForm.notes.trim() || null,
      });
      setMaintenanceTarget(null);
      setMaintenanceForm({
        maintenanceType: 'scheduled',
        reason: '',
        performedBy: '',
        expectedReturnAt: '',
        notes: '',
      });
    } catch (error) {
      setMaintenanceError(getErrorMessage(error, 'Failed to log maintenance.'));
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const handleMarkOnline = async () => {
    if (!onlineTarget) return;
    setOnlineError(null);
    setOnlineSaving(true);
    try {
      await context.actions.markEquipmentOnline(onlineTarget.id, onlineNotes.trim() || null);
      setOnlineTarget(null);
      setOnlineNotes('');
    } catch (error) {
      setOnlineError(getErrorMessage(error, 'Failed to mark equipment as online.'));
    } finally {
      setOnlineSaving(false);
    }
  };

  const items = (data?.equipment ?? []).filter((e) => e.department === department);
  const lowReagents = items.filter((i) => (i.reagents ?? []).some((r) => r.percent < 50));
  const qcRuns = data?.qcRuns ?? [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const latestQcRunFor = (name: string) => {
    const instrumentRuns = qcRuns
      .filter((run) => run.instrumentName === name)
      .sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
    const todayRun = instrumentRuns.find((run) => new Date(run.runAt).getTime() >= todayStart.getTime());
    return todayRun ?? instrumentRuns[0] ?? null;
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="space-y-4 p-5">
        {department === 'laboratory' && lowReagents.length > 0 ? (
          <SectionCard className="border-amber-200 bg-amber-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-amber-950">
                  {lowReagents.reduce((acc, e) => acc + e.reagents.filter((r) => r.percent < 50).length, 0)} reagents below 50% — order required:
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  {lowReagents
                    .flatMap((eq) => eq.reagents.filter((r) => r.percent < 50).map((r) => `${eq.name}: ${r.name} ${r.percent}%`))
                    .join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPurchaseOrderModal(true)}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                📦 Generate Purchase Order
              </button>
            </div>
          </SectionCard>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <EquipmentCard
              key={item.id}
              item={item}
              department={department}
              latestQcRun={latestQcRunFor(item.name)}
              onMaintenanceClick={() => {
                setMaintenanceForm({ maintenanceType: 'scheduled', reason: '', performedBy: '', expectedReturnAt: '', notes: '' });
                setMaintenanceError(null);
                setMaintenanceTarget({ id: item.id, name: item.name });
              }}
              onMarkOnlineClick={() => {
                setOnlineNotes('');
                setOnlineError(null);
                setOnlineTarget({ id: item.id, name: item.name });
              }}
            />
          ))}
        </div>
      </div>
      {maintenanceTarget ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Log Maintenance</h3>
            <p className="mt-1 text-sm text-gray-500">Record a maintenance event for <span className="font-semibold text-slate-700">{maintenanceTarget.name}</span>.</p>
            <div className="mt-4 space-y-3">
              <div>
                <span className="mb-1 block text-xs font-semibold text-slate-700">Type</span>
                <div className="flex gap-2">
                  {(['scheduled', 'unscheduled'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMaintenanceForm((f) => ({ ...f, maintenanceType: t }))}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold capitalize transition ${
                        maintenanceForm.maintenanceType === t
                          ? 'bg-amber-500 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t === 'scheduled' ? '📅 Scheduled' : '⚠️ Unscheduled'}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Reason <span className="text-rose-500">*</span></span>
                <input
                  type="text"
                  value={maintenanceForm.reason}
                  onChange={(e) => setMaintenanceForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Daily calibration, Pump failure…"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-300"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Performed By</span>
                <input
                  type="text"
                  value={maintenanceForm.performedBy}
                  onChange={(e) => setMaintenanceForm((f) => ({ ...f, performedBy: e.target.value }))}
                  placeholder="e.g. Siemens Field Service"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-300"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Expected Return</span>
                <input
                  type="datetime-local"
                  value={maintenanceForm.expectedReturnAt}
                  onChange={(e) => setMaintenanceForm((f) => ({ ...f, expectedReturnAt: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-300"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Notes</span>
                <textarea
                  value={maintenanceForm.notes}
                  onChange={(e) => setMaintenanceForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any additional details…"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-300"
                />
              </label>
            </div>
            {maintenanceError ? (
              <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{maintenanceError}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setMaintenanceTarget(null)}
                disabled={maintenanceSaving}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleLogMaintenance()}
                disabled={maintenanceSaving || !maintenanceForm.reason.trim()}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {maintenanceSaving ? 'Saving…' : 'Log Maintenance'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {onlineTarget ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Mark as Online</h3>
            <p className="mt-2 text-sm text-gray-500">
              Confirm that <span className="font-semibold text-slate-700">{onlineTarget.name}</span> is back online and ready for use.
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Completion Notes (optional)</span>
              <textarea
                value={onlineNotes}
                onChange={(e) => setOnlineNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Calibration completed, instrument running normally…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-300"
              />
            </label>
            {onlineError ? (
              <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{onlineError}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setOnlineTarget(null)}
                disabled={onlineSaving}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleMarkOnline()}
                disabled={onlineSaving}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {onlineSaving ? 'Saving…' : '✅ Mark Online'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showPurchaseOrderModal ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Generate Purchase Order — Coming Soon</h3>
            <p className="mt-2 text-sm text-gray-500">
              Generating and submitting purchase orders directly through the portal isn't available yet. This requires integration with your procurement system which will be built in a future pass. Please contact your supplier through your existing process.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowPurchaseOrderModal(false)}
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
