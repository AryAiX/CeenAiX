import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { fetchPharmacyPrescriptionDetails } from '../../hooks';
import type { PharmacyPrescriptionItemDetail, PharmacyQueuePrescriptionItem } from '../../hooks';
import { useQuery } from '../../hooks/use-query';
import { formatLocaleCurrency, formatLocaleDigits } from '../../lib/i18n-ui';
import { resolveClinicalVocabLabel } from '../../lib/prescription-vocab';
import { prescriptionReference } from './prescription-status';
import type { PharmacyPrescriptionWorkflowStatus } from './prescription-status';

export interface PrescriptionDetailsRow {
  id: string;
  patientName: string;
  doctorName: string;
  status: PharmacyPrescriptionWorkflowStatus;
  tasks: Array<
    Pick<PharmacyQueuePrescriptionItem, 'id' | 'workflowStatus' | 'medication' | 'quantity' | 'prescriptionItemId'>
  >;
  insurance: string;
  copay: number;
  priority: PharmacyQueuePrescriptionItem['priority'];
  hasAllergyFlag: boolean;
}

interface PrescriptionDetailsDialogProps {
  row: PrescriptionDetailsRow;
  onClose: () => void;
}

const statusChipClass: Record<PharmacyPrescriptionWorkflowStatus, string> = {
  new: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-teal-50 text-teal-700',
  on_hold: 'bg-amber-50 text-amber-700',
  dispensed: 'bg-emerald-50 text-emerald-700',
  picked_up: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

/**
 * QA-253: everything the pharmacist needs to dispense one prescription: for each medicine the
 * doctor's dose, how often, how long, quantity and instructions, plus insurance, copay and priority.
 * Opens from every row (Details) and from View on finished prescriptions.
 */
export const PrescriptionDetailsDialog = ({ row, onClose }: PrescriptionDetailsDialogProps) => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const closeRef = useRef<HTMLButtonElement>(null);
  const itemIds = useMemo(
    () => row.tasks.map((task) => task.prescriptionItemId).filter((id): id is string => Boolean(id)),
    [row.tasks]
  );
  const itemKey = itemIds.join(',');
  const { data, loading, error, refetch } = useQuery(
    () => fetchPharmacyPrescriptionDetails(itemIds),
    [itemKey]
  );

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const detailById = useMemo(() => {
    const map = new Map<string, PharmacyPrescriptionItemDetail>();
    for (const item of data?.items ?? []) map.set(item.id, item);
    return map;
  }, [data?.items]);

  const notGiven = t('pharmacy.dispensing.detailsNotGiven', { defaultValue: 'Not given' });
  const statusLabel = (status: PharmacyPrescriptionWorkflowStatus) =>
    t(`pharmacy.dispensing.medicineStatus.${status}`, { defaultValue: status });

  const field = (label: string, value: string | null) => (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`break-words text-sm ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value ?? notGiven}</dd>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescription-details-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2 id="prescription-details-title" className="text-base font-semibold text-slate-900">
              {t('pharmacy.dispensing.detailsTitle', { defaultValue: 'Prescription details' })}
            </h2>
            <p className="mt-0.5 break-words text-xs text-slate-500">
              {row.patientName} · {prescriptionReference(row.id)}
            </p>
            <p className="mt-0.5 break-words text-xs text-slate-500">
              {t('pharmacy.dispensing.detailsDoctor', { defaultValue: 'Doctor' })}: {row.doctorName}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('pharmacy.dispensing.detailsClose', { defaultValue: 'Close' })}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          {row.hasAllergyFlag ? (
            <div role="note" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {t('pharmacy.dispensing.detailsAllergy', { defaultValue: 'Allergy flag on record' })}
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-500">
              {t('pharmacy.dispensing.detailsLoading', { defaultValue: 'Loading details…' })}
            </p>
          ) : null}
          {error ? (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              <span>{t('pharmacy.dispensing.detailsError', { defaultValue: 'Could not load the prescription details.' })}</span>
              <button type="button" onClick={() => refetch()} className="shrink-0 font-semibold underline">
                {t('pharmacy.dispensing.detailsRetry', { defaultValue: 'Try again' })}
              </button>
            </div>
          ) : null}

          <section aria-labelledby="prescription-details-medicines">
            <h3 id="prescription-details-medicines" className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t('pharmacy.dispensing.detailsMedicines', { defaultValue: 'Medicines' })}
            </h3>
            <ul className="space-y-3">
              {row.tasks.map((task) => {
                const detail = task.prescriptionItemId ? detailById.get(task.prescriptionItemId) : undefined;
                const name =
                  (uiLang.startsWith('ar') ? detail?.medicationNameAr : null) ?? detail?.medicationName ?? task.medication;
                const frequency = detail
                  ? resolveClinicalVocabLabel(data?.vocab ?? [], 'frequency', detail.frequencyCode, detail.frequency, uiLang) ??
                    detail.frequency
                  : null;
                const duration = detail
                  ? resolveClinicalVocabLabel(data?.vocab ?? [], 'duration', detail.durationCode, detail.duration, uiLang) ??
                    detail.duration
                  : null;
                const quantity = detail?.quantity ?? task.quantity;
                return (
                  <li key={task.id} className="rounded-xl border border-slate-100 px-4 py-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <span className="min-w-0 break-words text-sm font-semibold text-slate-900">{name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusChipClass[task.workflowStatus]}`}>
                        {statusLabel(task.workflowStatus)}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {field(t('pharmacy.dispensing.detailsDosage', { defaultValue: 'Dose' }), detail?.dosage ?? null)}
                      {field(t('pharmacy.dispensing.detailsFrequency', { defaultValue: 'How often' }), frequency)}
                      {field(t('pharmacy.dispensing.detailsDuration', { defaultValue: 'How long' }), duration)}
                      {field(
                        t('pharmacy.dispensing.detailsQuantity', { defaultValue: 'Quantity' }),
                        typeof quantity === 'number' ? formatLocaleDigits(quantity, uiLang) : null
                      )}
                      <div className="col-span-2">
                        {field(t('pharmacy.dispensing.detailsInstructions', { defaultValue: 'Instructions' }), detail?.instructions ?? null)}
                      </div>
                    </dl>
                    {!task.prescriptionItemId ? (
                      <p className="mt-2 text-xs text-slate-400">
                        {t('pharmacy.dispensing.detailsNoLink', {
                          defaultValue: "The doctor's details for this medicine are not linked.",
                        })}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>

          <dl className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                {t('pharmacy.dispensing.detailsInsurance', { defaultValue: 'Insurance' })}
              </dt>
              <dd className="break-words text-sm font-semibold text-slate-800">{row.insurance}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                {t('pharmacy.dispensing.detailsCopay', { defaultValue: 'Copay' })}
              </dt>
              <dd className="text-sm font-semibold text-slate-800">{formatLocaleCurrency(row.copay, uiLang)}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                {t('pharmacy.dispensing.detailsPriority', { defaultValue: 'Priority' })}
              </dt>
              <dd className="text-sm font-semibold text-slate-800">
                {t(`pharmacy.dispensing.priority.${row.priority}`, { defaultValue: row.priority })}
              </dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('pharmacy.dispensing.detailsClose', { defaultValue: 'Close' })}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
