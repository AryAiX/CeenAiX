import type { LabPageContext } from './shared/types';
import { formatDateShort, formatTimeShort, nabidhBadge } from './shared/helpers';
import { SectionCard, Pill, KpiTile, ProgressMeter } from './shared/ui';

const formatRelativeSync = (isoTimestamp: string | null): string => {
  if (!isoTimestamp) return 'Not yet synced';
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'Not yet synced';
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) return `synced ${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `synced ${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `synced ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `synced ${diffDays}d ago`;
};

export const NabidhPage = ({ context }: { context: LabPageContext }) => {
  const events = context.data?.nabidhEvents ?? [];
  const labEvents = events.filter(
    (e) => e.resourceType === 'Observation' || (e.resourceType === 'DiagnosticReport' && !e.referenceCode.includes('RAD'))
  );
  const radEvents = events.filter(
    (e) => e.resourceType === 'ImagingStudy' || (e.resourceType === 'DiagnosticReport' && e.referenceCode.includes('RAD'))
  );
  const countByType = (list: typeof events, type: string) =>
    list.filter((e) => e.resourceType === type && e.status === 'submitted').length;
  const submitted = events.filter((e) => e.status === 'submitted').length;
  const pending = events.filter((e) => e.status === 'pending').length;
  const failed = events.filter((e) => e.status === 'failed').length;
  const labSubmitted = labEvents.filter((e) => e.status === 'submitted').length;
  const labPending = labEvents.filter((e) => e.status === 'pending').length;
  const labFailed = labEvents.filter((e) => e.status === 'failed').length;
  const radSubmitted = radEvents.filter((e) => e.status === 'submitted').length;
  const radPending = radEvents.filter((e) => e.status === 'pending').length;
  const radFailed = radEvents.filter((e) => e.status === 'failed').length;
  const meta = context.data?.facilityMeta;
  const mostRecentNabidhSubmission =
    events
      .filter((event) => event.status === 'submitted' && event.submittedAt)
      .map((event) => event.submittedAt as string)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  const submitAllPending = () => {
    const pendingIds = events.filter((e) => e.status !== 'submitted').map((e) => e.id);
    void context.actions.markNabidhSubmittedBulk(pendingIds);
  };

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🇦🇪</div>
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-slate-900">NABIDH Health Information Exchange</h2>
              <p className="text-sm text-slate-500">National Unified Health Record · FHIR R4 · Real-time submission</p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">✅ Connected · {formatRelativeSync(mostRecentNabidhSubmission)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-['DM_Mono'] text-xs font-bold text-slate-700">{meta?.nabidhVendorId ?? '—'}</div>
              <div className="text-xs text-slate-500">Vendor ID</div>
            </div>
            <button type="button" onClick={submitAllPending} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
              📤 Submit All {pending + failed} Pending
            </button>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiTile label="✅" value={`${submitted}/${events.length}`} caption="submitted" tone="emerald" />
        <KpiTile label="⏳" value={pending} caption="pending" tone="amber" />
        <KpiTile label="❌" value={failed} caption="failed" tone="rose" />
        <KpiTile
          label="📤"
          value={mostRecentNabidhSubmission ? formatTimeShort(mostRecentNabidhSubmission) : '—'}
          caption="Last bulk"
          tone="slate"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard>
          <div className="mb-3">
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🧪 Lab Results</h3>
            <p className="text-sm text-slate-500">Submitted: {labSubmitted}/{labEvents.length} · {labEvents.length > 0 ? Math.round((labSubmitted / labEvents.length) * 100) : 0}%</p>
            <p className="text-xs text-slate-500">{labPending} pending · {labFailed} failed</p>
            <ProgressMeter value={labEvents.length > 0 ? (labSubmitted / labEvents.length) * 100 : 0} tone="accent-emerald-500" />
          </div>
          <div className="space-y-2">
            {labEvents.filter((e) => e.status !== 'submitted').slice(0, 5).map((event) => (
              <article key={event.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-['DM_Mono'] text-xs font-bold text-slate-700">{event.referenceCode}</span>
                  <Pill className={nabidhBadge[event.status]}>{event.status}</Pill>
                </div>
                <h4 className="mt-1 text-sm font-bold text-slate-900">{event.patientName}</h4>
                <p className="text-xs text-slate-500">{event.reason ?? 'Awaiting submission'}</p>
                {event.status === 'pending' && event.reason?.toLowerCase().includes('critical') ? (
                  <button type="button"
                    onClick={() => void context.actions.markNabidhSubmitted(event.id)}
                    className="mt-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    📞 Notify First
                  </button>
                ) : null}
              </article>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-slate-100 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">FHIR RESOURCES SUBMITTED</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div><div className="font-bold text-slate-900">Observation</div><div className="font-['DM_Mono'] text-emerald-700">{countByType(labEvents, 'Observation')} ✅</div></div>
              <div><div className="font-bold text-slate-900">DiagnosticReport</div><div className="font-['DM_Mono'] text-emerald-700">{countByType(labEvents, 'DiagnosticReport')} ✅</div></div>
              <div><div className="font-bold text-slate-900">ServiceRequest</div><div className="font-['DM_Mono'] text-emerald-700">{countByType(events, 'ServiceRequest')} ✅</div></div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="mb-3">
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🩻 Radiology Reports</h3>
            <p className="text-sm text-slate-500">Submitted: {radSubmitted}/{radEvents.length} · {radEvents.length > 0 ? Math.round((radSubmitted / radEvents.length) * 100) : 0}%</p>
            <p className="text-xs text-slate-500">{radPending} pending · {radFailed} failed</p>
            <ProgressMeter value={radEvents.length > 0 ? (radSubmitted / radEvents.length) * 100 : 0} tone="accent-emerald-500" />
          </div>
          <div className="space-y-2">
            {radEvents.filter((e) => e.status !== 'submitted').slice(0, 5).map((event) => (
              <article key={event.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-['DM_Mono'] text-xs font-bold text-slate-700">{event.referenceCode}</span>
                  <Pill className={nabidhBadge[event.status]}>{event.status}</Pill>
                </div>
                <h4 className="mt-1 text-sm font-bold text-slate-900">{event.patientName}</h4>
                <p className="text-xs text-slate-500">{event.reason ?? 'Awaiting submission'}</p>
              </article>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-slate-100 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">FHIR RESOURCES SUBMITTED</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
              <div><div className="font-bold text-slate-900">ImagingStudy</div><div className="font-['DM_Mono'] text-emerald-700">{countByType(radEvents, 'ImagingStudy')} ✅</div></div>
              <div><div className="font-bold text-slate-900">DiagnosticReport (radiology)</div><div className="font-['DM_Mono'] text-emerald-700">{countByType(radEvents, 'DiagnosticReport')} ✅</div></div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="flex items-center justify-between">
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Submission History — Today</h3>
          <button type="button"
            onClick={() => {
              const header = ['ref', 'patient', 'status', 'reason', 'submitted_at'];
              const escape = (v: string | number | null | undefined) => {
                if (v === null || v === undefined) return '';
                const s = String(v);
                return s.includes(',') || s.includes('"') || s.includes('\n')
                  ? `"${s.replace(/"/g, '""')}"`
                  : s;
              };
              const body = [
                header,
                ...events.map((event) => [
                  event.referenceCode,
                  event.patientName,
                  event.status,
                  event.reason ?? '',
                  event.submittedAt ?? '',
                ]),
              ]
                .map((line) => line.map(escape).join(','))
                .join('\n');
              const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `nabidh-submission-log-${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            Export Log
          </button>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Date / Time</th>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Resource Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">NABIDH Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {events.filter((e) => e.status === 'submitted').map((event) => (
                <tr key={event.id}>
                  <td className="px-3 py-2 text-slate-500">{formatDateShort(event.submittedAt ?? event.createdAt)} · {formatTimeShort(event.submittedAt ?? event.createdAt)}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{event.patientName}</td>
                  <td className="px-3 py-2 text-slate-600">{event.resourceType}</td>
                  <td className="px-3 py-2"><span className="text-emerald-600">✅</span></td>
                  <td className="px-3 py-2 font-['DM_Mono'] text-xs text-slate-500">{event.referenceCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};
