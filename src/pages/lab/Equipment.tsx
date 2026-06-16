import type { LabPortalData, LabPortalEquipment, LabDepartment } from '../../hooks';
import { formatDateShort } from './shared/helpers';
import { SectionCard, ProgressMeter } from './shared/ui';

const EquipmentCard = ({ item, department }: { item: LabPortalEquipment; department: LabDepartment }) => {
  const statusColor =
    item.status === 'online' ? 'bg-emerald-100 text-emerald-700' :
    item.status === 'maintenance' ? 'bg-amber-100 text-amber-800' :
    item.status === 'warning' ? 'bg-orange-100 text-orange-700' :
    'bg-rose-100 text-rose-700';
  // Hosted display labels:
  //   Radiology: SCANNING (active scan), ONLINE, SCHEDULED (next slot soon), QA IN PROGRESS, MAINTENANCE
  //   Laboratory: RUNNING (active batch), ONLINE, MAINTENANCE, WARNING
  const isActivelyRunning = !!item.activeRemainingLabel && /remaining|ongoing/i.test(item.activeRemainingLabel);
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
        <div className="rounded-lg bg-emerald-50 p-2">
          <div className="font-['DM_Mono'] text-2xl font-bold text-emerald-700">✅</div>
          <div className="text-[10px] uppercase text-emerald-700">QC</div>
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

      {item.maintenanceDueAt ? (
        <p className="mt-3 text-xs text-slate-500">Maintenance due: {formatDateShort(item.maintenanceDueAt)}</p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <a
          href={isLab ? '/lab/analytics' : '/lab/imaging/equipment'}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-center"
        >
          {isLab ? '📊 Stats' : '📋 Schedule'}
        </a>
        <a
          href="/lab/equipment"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-center"
        >
          {isLab ? '⚙️ Log Maintenance' : '⚙️ Maintenance'}
        </a>
      </div>
    </SectionCard>
  );
};

export const EquipmentPage = ({ data, department }: { data: LabPortalData | null; department: LabDepartment }) => {
  const items = (data?.equipment ?? []).filter((e) => e.department === department);
  const lowReagents = items.filter((i) => (i.reagents ?? []).some((r) => r.percent < 50));

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
              <a
                href={`mailto:?subject=${encodeURIComponent('Reagent purchase order')}&body=${encodeURIComponent(
                  lowReagents
                    .flatMap((eq) =>
                      eq.reagents
                        .filter((r) => r.percent < 50)
                        .map((r) => `- ${eq.name} · ${r.name} at ${r.percent}%`)
                    )
                    .join('\n')
                )}`}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                📦 Generate Purchase Order
              </a>
            </div>
          </SectionCard>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <EquipmentCard key={item.id} item={item} department={department} />
          ))}
        </div>
      </div>
    </div>
  );
};
