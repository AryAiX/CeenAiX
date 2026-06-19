import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LabPageContext } from './shared/types';
import {
  priorityClass,
  formatDateShort,
  formatTimeShort,
  ageGenderLabel,
  bloodTypeColor,
  insurancePillClass,
  orderCardAccent,
} from './shared/helpers';
import { Pill, EmptyState } from './shared/ui';

type OrderTab = 'new' | 'in_progress' | 'completed' | 'rejected' | 'all';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const LabOrdersPage = ({ context }: { context: LabPageContext }) => {
  const allSamples = useMemo(() => context.data?.samples ?? [], [context.data?.samples]);
  const rejectedSamples = useMemo(() => context.data?.rejectedSamples ?? [], [context.data?.rejectedSamples]);
  const [tab, setTab] = useState<OrderTab>('new');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [showAcceptAllConfirm, setShowAcceptAllConfirm] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; orderCode: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const tabs: Array<{ id: OrderTab; label: string; emoji: string; count: number }> = [
    { id: 'new', emoji: '📬', label: 'New', count: allSamples.filter((s) => s.status === 'ordered').length },
    { id: 'in_progress', emoji: '⏳', label: 'In Progress', count: allSamples.filter((s) => s.status === 'collected' || s.status === 'processing' || s.status === 'resulted').length },
    { id: 'completed', emoji: '✅', label: 'Completed', count: allSamples.filter((s) => s.status === 'reviewed').length },
    { id: 'rejected', emoji: '❌', label: 'Rejected', count: rejectedSamples.length },
    { id: 'all', emoji: '', label: 'All', count: allSamples.length },
  ];

  const filtered = useMemo(() => {
    if (tab === 'new') return allSamples.filter((s) => s.status === 'ordered');
    if (tab === 'in_progress') return allSamples.filter((s) => s.status === 'collected' || s.status === 'processing' || s.status === 'resulted');
    if (tab === 'completed') return allSamples.filter((s) => s.status === 'reviewed');
    if (tab === 'rejected') return rejectedSamples;
    return allSamples;
  }, [allSamples, tab]);

  const newOrders = useMemo(
    () => allSamples.filter((s) => s.status === 'ordered'),
    [allSamples]
  );

  const handleAcceptAll = async () => {
    if (newOrders.length === 0) return;
    setOrdersError(null);
    setBulkBusy(true);
    try {
      for (const order of newOrders) {
        await context.actions.claimSample(order.id);
      }
      setShowAcceptAllConfirm(false);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Bulk accept failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    setOrdersError(null);
    setRowBusyId(rejectTarget.id);
    try {
      await context.actions.rejectOrder(rejectTarget.id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Reject failed.');
    } finally {
      setRowBusyId(null);
    }
  };

  const handleAcceptOne = async (sampleId: string) => {
    setOrdersError(null);
    setRowBusyId(sampleId);
    try {
      await context.actions.claimSample(sampleId);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Accept failed.');
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-700">
            <span className="font-bold">{tabs[0].count}</span> new order{tabs[0].count === 1 ? '' : 's'} received
          </p>
          <div className="flex gap-2">
            <button type="button"
              onClick={() => setShowAcceptAllConfirm(true)}
              disabled={bulkBusy || newOrders.length === 0}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkBusy ? 'Accepting…' : `Accept All (${newOrders.length})`}
            </button>
            <button type="button"
              onClick={() => setTab('new')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Review Each
            </button>
          </div>
        </div>
        {ordersError ? (
          <div
            role="alert"
            className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700"
          >
            {ordersError}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t.emoji} {t.label} ({t.count})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {filtered.length === 0 ? <EmptyState label="No orders match this filter." /> : null}

        {filtered.map((sample) => {
          const isCritical = !!sample.criticalValue;
          const accent = orderCardAccent(sample.priority, isCritical);

          return (
            <article
              key={sample.id}
              className={`relative overflow-hidden rounded-2xl border ${accent.border} ${accent.bg} bg-white p-5 shadow-sm`}
            >
              <span className={`absolute left-0 top-0 h-full w-1.5 ${accent.bar}`} aria-hidden="true" />

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-['DM_Mono'] text-sm font-bold text-slate-700">{sample.orderCode.replace('LAB', 'ORD')}</span>
                <Pill className={priorityClass[sample.priority]}>{accent.label}</Pill>
                <span className="text-xs text-slate-500">{formatDateShort(sample.orderedAt)} · {formatTimeShort(sample.orderedAt)}</span>
                <Pill className={
                  (sample.sourceLabel ?? '').toLowerCase().includes('walk-in')
                    ? 'bg-slate-100 text-slate-700 ring-slate-200'
                    : 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                }>
                  {sample.sourceLabel ?? 'CeenAiX ePrescription'} {(sample.sourceLabel ?? '').toLowerCase().includes('walk-in') ? '' : '✅'}
                </Pill>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">PATIENT</div>
                  <div className="mt-2 text-base font-bold text-slate-900">{sample.patientName}</div>
                  <div className="text-sm text-slate-600">
                    {ageGenderLabel(sample.patientAge, sample.patientGender)}
                    {sample.bloodType ? (
                      <span> · <span className={`font-bold ${bloodTypeColor(sample.bloodType)}`}>{sample.bloodType}</span></span>
                    ) : null}
                  </div>
                  {sample.insurancePlan ? (
                    <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${insurancePillClass(sample.insurancePlan)}`}>
                      {sample.insurancePlan}
                    </span>
                  ) : null}
                </div>
                <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">DOCTOR</div>
                  <div className="mt-2 text-base font-bold text-slate-900">{sample.doctorName}</div>
                  <div className="text-sm text-slate-600">
                    {sample.doctorSpecialty ?? 'Clinician'} · {sample.clinicName}
                  </div>
                  {sample.doctorDhaLicense ? (
                    <div className="mt-1 text-xs font-semibold text-emerald-700">DHA: {sample.doctorDhaLicense} ✅</div>
                  ) : null}
                </div>
              </div>

              {sample.clinicalNotes ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  <span className="font-bold">Clinical Notes:</span> {sample.clinicalNotes}
                </div>
              ) : null}

              {sample.tests.length > 0 ? (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-bold text-slate-700">Tests Ordered</div>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Test Name</th>
                          <th className="px-3 py-2">LOINC Code</th>
                          <th className="px-3 py-2">Specimen</th>
                          <th className="px-3 py-2">TAT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {sample.tests.map((t) => (
                          <tr key={`${sample.id}-${t.testName}`}>
                            <td className="px-3 py-2 font-semibold text-slate-900">{t.testName}</td>
                            <td className="px-3 py-2 font-['DM_Mono'] text-xs text-indigo-600">{t.loincCode ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600">{t.specimen ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600">{t.targetTat ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                {sample.specimenSummary ? (
                  <span><span className="font-bold">Specimen:</span> {sample.specimenSummary}</span>
                ) : null}
                <span className="text-slate-300">·</span>
                <span>
                  <span className="font-bold">Fasting:</span>{' '}
                  <span className={
                    !sample.fastingInstructions || sample.fastingInstructions.toLowerCase().includes('not required')
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }>
                    {sample.fastingInstructions ?? 'Not required'}
                  </span>
                </span>
              </div>

              {sample.preauthStatus ? (
                <div className="mt-3 text-xs">
                  <span className="font-bold text-slate-700">Insurance Pre-auth:</span>{' '}
                  <span className={
                    sample.preauthStatus.toLowerCase().includes('not required')
                      ? 'font-semibold text-emerald-700'
                      : sample.preauthStatus.toLowerCase().includes('covered')
                      ? 'font-semibold text-emerald-700'
                      : 'font-semibold text-amber-700'
                  }>
                    {sample.preauthStatus} {sample.preauthStatus.toLowerCase().includes('not required') || sample.preauthStatus.toLowerCase().includes('covered') ? '✅' : '⚠️'}
                  </span>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {tab !== 'rejected' ? (
                  <button type="button"
                    onClick={() => void handleAcceptOne(sample.id)}
                    disabled={rowBusyId === sample.id || sample.status !== 'ordered'}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {rowBusyId === sample.id
                      ? 'Working…'
                      : sample.status === 'ordered'
                        ? 'Accept Order'
                        : 'Accepted'}
                  </button>
                ) : (
                  <span className="inline-flex items-center rounded-lg bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                    ❌ Rejected{sample.clinicalNotes ? `: ${sample.clinicalNotes.replace('[REJECTED] ', '')}` : ''}
                  </span>
                )}
                <button type="button"
                  onClick={() => {
                    const labelWindow = window.open('', '_blank');
                    if (!labelWindow) {
                      setOrdersError('Could not open the print window — please allow popups for this site and try again.');
                      return;
                    }
                    setOrdersError(null);
                    labelWindow.document.write(`
                      <html>
                        <head><title>Tube label · ${escapeHtml(sample.orderCode)}</title>
                        <style>
                          body { font-family: 'DM Mono', monospace; padding: 24px; }
                          .label { border: 2px solid #000; padding: 16px; width: 320px; }
                          h1 { font-size: 18px; margin: 0 0 4px; }
                          dl { display: grid; grid-template-columns: 90px 1fr; gap: 4px 12px; font-size: 12px; }
                          dt { color: #555; }
                          .bars { font-size: 28px; letter-spacing: 4px; margin-top: 8px; }
                        </style>
                        </head>
                        <body>
                          <div class="label">
                            <h1>${escapeHtml(sample.orderCode)}</h1>
                            <div class="bars">▐▌▌▐▐▌▌▐▐▌▌▐</div>
                            <dl>
                              <dt>Patient</dt><dd>${escapeHtml(sample.patientName)}</dd>
                              <dt>Doctor</dt><dd>${escapeHtml(sample.doctorName)}</dd>
                              <dt>Priority</dt><dd>${escapeHtml(sample.priority)}</dd>
                              <dt>Tests</dt><dd>${escapeHtml(sample.testNames.join(', '))}</dd>
                              <dt>Specimen</dt><dd>${escapeHtml(sample.specimenSummary ?? '—')}</dd>
                            </dl>
                          </div>
                          <script>window.onload = () => { window.print(); };</script>
                        </body>
                      </html>
                    `);
                    labelWindow.document.close();
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Print Tube Labels
                </button>
                <a
                  href={`mailto:?subject=${encodeURIComponent(
                    `Re: lab order ${sample.orderCode} for ${sample.patientName}`
                  )}&body=${encodeURIComponent(
                    `Dr. ${sample.doctorName},\n\nRegarding lab order ${sample.orderCode} for ${sample.patientName}.\n\n`
                  )}`}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Contact Doctor
                </a>
                {tab !== 'rejected' ? (
                  <button type="button"
                    onClick={() => {
                      setRejectReason('');
                      setRejectTarget({ id: sample.id, orderCode: sample.orderCode });
                    }}
                    disabled={rowBusyId === sample.id}
                    className="ml-auto rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {showAcceptAllConfirm
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900">Accept All New Orders</h3>
                <p className="mt-2 text-sm text-gray-500">
                  This will claim all {newOrders.length} order{newOrders.length === 1 ? '' : 's'} currently in the New tab.
                </p>
                {ordersError ? (
                  <p className="mt-2 text-sm font-semibold text-red-600" role="alert">{ordersError}</p>
                ) : null}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAcceptAllConfirm(false)}
                    disabled={bulkBusy}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAcceptAll()}
                    disabled={bulkBusy}
                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {bulkBusy ? 'Accepting…' : 'Yes, Accept All'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {rejectTarget
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900">Reject Lab Order</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Provide a short reason for rejecting order {rejectTarget.orderCode}. This will be saved to the order notes.
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Specimen hemolyzed, insufficient volume…"
                  className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-rose-300"
                />
                {ordersError ? (
                  <p className="mt-2 text-sm font-semibold text-red-600" role="alert">{ordersError}</p>
                ) : null}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRejectTarget(null)}
                    disabled={rowBusyId === rejectTarget.id}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmReject()}
                    disabled={rowBusyId === rejectTarget.id}
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    {rowBusyId === rejectTarget.id ? 'Rejecting…' : 'Reject Order'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
