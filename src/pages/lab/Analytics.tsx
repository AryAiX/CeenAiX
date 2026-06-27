import { useState } from 'react';
import type { LabPortalData } from '../../hooks';
import { formatNumber } from './shared/helpers';
import { SectionCard, KpiTile, ProgressMeter } from './shared/ui';

export const AnalyticsView = ({ data }: { data: LabPortalData | null }) => {
  const [scope, setScope] = useState<'all' | 'lab' | 'rad'>('all');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');

  const totalLab = data?.samples.length ?? 0;
  const totalRad = data?.imagingStudies.length ?? 0;
  const trends = data?.volumeTrends ?? [];
  const topLab = data?.topLabTests ?? [];
  const topImaging = data?.topImagingStudies ?? [];
  const todayStart = (() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  })();
  const criticals = (data?.criticalValues ?? []).filter((c) => c.observedAt >= todayStart);
  const notifiedTimes = criticals
    .map((c) => c.notifiedInMinutes)
    .filter((n): n is number => typeof n === 'number');
  const avgNotified = notifiedTimes.length > 0 ? Math.round(notifiedTimes.reduce((sum, n) => sum + n, 0) / notifiedTimes.length) : null;
  const fastestNotified = notifiedTimes.length > 0 ? Math.min(...notifiedTimes) : null;
  const slowestNotified = notifiedTimes.length > 0 ? Math.max(...notifiedTimes) : null;
  const maxVol = Math.max(1, ...trends.map((t) => Math.max(t.labVolume, t.radiologyVolume)));
  const showLab = scope !== 'rad';
  const showRad = scope !== 'lab';
  const todayLab = data?.metrics.sampleCountToday ?? 0;
  const todayRad = data?.metrics.studyCountToday ?? 0;
  const scopedTotal = (showLab ? todayLab : 0) + (showRad ? todayRad : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'lab', 'rad'] as const).map((s) => (
            <button type="button"
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${scope === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {s === 'all' ? 'All ●' : s === 'lab' ? 'Lab' : 'Radiology'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['today', 'week', 'month', 'custom'] as const).map((p) => (
            <button type="button"
              key={p}
              onClick={() => setPeriod(p)}
              disabled={p !== 'today'}
              title={p !== 'today' ? 'Period filtering — coming soon' : undefined}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${period === p ? 'bg-indigo-50 text-indigo-700' : 'border border-slate-200 bg-white text-slate-600'} ${p !== 'today' ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {p === 'today' ? 'Today ●' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button type="button"
            onClick={() => {
              const samples = showLab ? data?.samples ?? [] : [];
              const studies = showRad ? data?.imagingStudies ?? [] : [];
              const header = ['kind', 'id', 'patient_name', 'status', 'ordered_at_or_scheduled_at'];
              const escape = (v: string | number | null | undefined) => {
                if (v === null || v === undefined) return '';
                const s = String(v);
                return s.includes(',') || s.includes('"') || s.includes('\n')
                  ? `"${s.replace(/"/g, '""')}"`
                  : s;
              };
              const lines = [header];
              for (const sample of samples) {
                lines.push(['sample', sample.id, sample.patientName, sample.status, sample.orderedAt ?? '']);
              }
              for (const study of studies) {
                lines.push(['study', study.id, study.patientName, study.status, study.scheduledAt ?? '']);
              }
              const body = lines.map((line) => line.map(escape).join(',')).join('\n');
              const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `lab-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
          >
            Export
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiTile label="Lab Samples" value={showLab ? formatNumber(totalLab) : '—'} tone="indigo" />
        <KpiTile label="Radiology Studies" value={showRad ? formatNumber(totalRad) : '—'} tone="blue" />
        <KpiTile label="Total Today" value={formatNumber(scopedTotal)} tone="violet" />
        {(() => {
          // Compliance from live NABIDH events; fall back to '—' when there
          // are no events to score.
          const nabidh = data?.nabidhEvents ?? [];
          const submittedShare =
            nabidh.length > 0
              ? Math.round((nabidh.filter((event) => event.status === 'submitted').length / nabidh.length) * 100)
              : null;
          return (
            <KpiTile
              label="DHA Compliance Rate"
              value={submittedShare != null ? `${submittedShare}%` : '—'}
              tone="emerald"
            />
          );
        })()}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Daily Volume — 7-Day Trend</h3>
          <div className="mt-3 flex gap-3 text-xs">
            {showLab ? <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Lab</span> : null}
            {showRad ? <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Radiology</span> : null}
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {trends.map((t) => {
              const labH = Math.round((t.labVolume / maxVol) * 100);
              const radH = Math.round((t.radiologyVolume / maxVol) * 100);
              return (
                <div key={t.id} className="flex h-48 flex-col justify-end rounded-xl bg-slate-50 p-2">
                  <div className="flex flex-1 items-end gap-1">
                    {showLab ? <div className="w-full rounded-t bg-indigo-500" style={{ height: `${labH}%` }} /> : null}
                    {showRad ? <div className="w-full rounded-t bg-blue-500" style={{ height: `${radH}%` }} /> : null}
                  </div>
                  <div className="mt-2 text-center font-['DM_Mono'] text-[11px] text-slate-500">{t.dayLabel}</div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Modality Breakdown — Radiology</h3>
          {showRad ? (
            <>
              <p className="mt-1 text-xs text-slate-500">{totalRad} studies</p>
              <div className="mt-4 space-y-2">
                {[
                  { label: 'MRI', count: data?.imagingStudies.filter((s) => s.modality === 'MRI').length ?? 0 },
                  { label: 'CT', count: data?.imagingStudies.filter((s) => s.modality === 'CT').length ?? 0 },
                  { label: 'X-Ray', count: data?.imagingStudies.filter((s) => s.modality === 'X-Ray').length ?? 0 },
                  { label: 'USS', count: data?.imagingStudies.filter((s) => s.modality === 'USS').length ?? 0 },
                  { label: 'PET', count: data?.imagingStudies.filter((s) => s.modality === 'PET').length ?? 0 },
                  {
                    label: 'Other',
                    count:
                      data?.imagingStudies.filter(
                        (s) => !['MRI', 'CT', 'X-Ray', 'USS', 'PET'].includes(s.modality)
                      ).length ?? 0,
                  },
                ].map((m) => {
                  const pct = totalRad > 0 ? Math.round((m.count / totalRad) * 100) : 0;
                  return (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{m.label}</span>
                        <span className="font-bold text-slate-700">{pct}% ({m.count})</span>
                      </div>
                      <ProgressMeter value={pct} tone="accent-blue-500" />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Not applicable when scope is set to Lab.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard>
        <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Critical Value Tracking — Today</h3>
        {showLab ? (
          <>
            <p className="mt-1 text-xs text-slate-500">
              {avgNotified != null ? (
                <>Avg notification: {avgNotified} min (target: &lt;60 min {avgNotified < 60 ? '✅' : '⚠️'}) · Fastest: {fastestNotified} min · Slowest: {slowestNotified} min {slowestNotified != null && slowestNotified > 60 ? '⚠️' : ''}</>
              ) : (
                'No notification timing data available yet.'
              )}
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2">Critical Value</th>
                    <th className="px-3 py-2">Notified In</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {criticals.map((c) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2 font-semibold text-slate-900">{c.patientName}</td>
                      <td className="px-3 py-2 text-slate-700">{c.testName}</td>
                      <td className="px-3 py-2 text-slate-700">{c.valueLabel}</td>
                      <td className="px-3 py-2 text-slate-600">{typeof c.notifiedInMinutes === 'number' ? `${c.notifiedInMinutes} min ${c.notifiedInMinutes > 60 ? '⚠️' : ''}` : '—'}</td>
                      <td className="px-3 py-2">
                        {c.status === 'pending' ? <span className="text-amber-700">⚠️ Pending</span> : <span className="text-emerald-700">✅ Notified</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Not applicable when scope is set to Radiology.</p>
        )}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🧪 Top Requested Lab Tests</h3>
          {showLab ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {topLab.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="font-semibold text-slate-700">{m.label}</span>
                  <span className="font-['DM_Mono'] text-lg font-bold text-indigo-700">{m.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Not applicable when scope is set to Radiology.</p>
          )}
        </SectionCard>
        <SectionCard>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">🩻 Top Imaging Studies</h3>
          {showRad ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {topImaging.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="font-semibold text-slate-700">{m.label}</span>
                  <span className="font-['DM_Mono'] text-lg font-bold text-blue-700">{m.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Not applicable when scope is set to Lab.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard className="bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="flex items-center justify-between">
          {(() => {
            const nabidhAll = data?.nabidhEvents ?? [];
            const nabidhFailedCount = nabidhAll.filter((e) => e.status === 'failed').length;
            const nabidhRate =
              nabidhAll.length > 0
                ? Math.round((nabidhAll.filter((e) => e.status === 'submitted').length / nabidhAll.length) * 100)
                : null;
            return (
              <div>
                <div className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-emerald-700">
                  {nabidhRate != null ? `${nabidhRate}%` : '—'}
                </div>
                <p className="text-sm text-slate-700">NABIDH Submission Rate</p>
                <p className="text-xs text-slate-500">{nabidhFailedCount} currently failed</p>
              </div>
            );
          })()}
          <a
            href="/lab/nabidh"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            📋 Full NABIDH Report →
          </a>
        </div>
      </SectionCard>

      <SectionCard>
        <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900">Export Reports</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {['DHA Monthly Lab Report', 'DHA Radiology Report', 'Full Diagnostics Ledger', 'Critical Value Log', 'QC Summary Report'].map((report) => (
            <button type="button"
              key={report}
              onClick={() => {
                // Each report ships a real text summary of the underlying
                // canonical rows the dashboard already loaded. A richer PDF
                // / DOCX renderer will replace these once the formatting
                // workflow ships, but the download itself is real.
                const samples = data?.samples ?? [];
                const studies = data?.imagingStudies ?? [];
                const nabidh = data?.nabidhEvents ?? [];
                const qc = data?.qcRuns ?? [];
                const criticalValues = data?.criticalValues ?? [];
                const stamp = new Date().toISOString().slice(0, 10);
                let body = `${report}\nGenerated ${stamp}\n\n`;
                switch (report) {
                  case 'DHA Monthly Lab Report':
                    body += `Total lab samples this period: ${samples.length}\n`;
                    body += `By status: ${Object.entries(
                      samples.reduce<Record<string, number>>((acc, sample) => {
                        acc[sample.status] = (acc[sample.status] ?? 0) + 1;
                        return acc;
                      }, {})
                    )
                      .map(([status, count]) => `${status} ${count}`)
                      .join(' · ')}\n`;
                    break;
                  case 'DHA Radiology Report':
                    body += `Total imaging studies this period: ${studies.length}\n`;
                    break;
                  case 'Full Diagnostics Ledger':
                    body += `Samples: ${samples.length} · Imaging studies: ${studies.length} · QC runs: ${qc.length}\n`;
                    break;
                  case 'Critical Value Log':
                    body += `Critical values on file: ${criticalValues.length}\n`;
                    body += criticalValues
                      .map(
                        (value) =>
                          `- ${value.observedAt} · ${value.patientName} · ${value.testName} · ${value.valueLabel} · ${value.status}`
                      )
                      .join('\n');
                    break;
                  case 'QC Summary Report':
                    body += `QC runs: ${qc.length}\n`;
                    body += qc
                      .map(
                        (run) =>
                          `- ${run.runAt} · ${run.department} · ${run.instrumentName} · ${run.status}`
                      )
                      .join('\n');
                    break;
                  default:
                    body += `NABIDH events: ${nabidh.length}`;
                }
                const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${report.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stamp}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {report}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
