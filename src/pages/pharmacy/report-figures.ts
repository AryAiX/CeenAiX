import type { PharmacyClaimLedgerItem, PharmacyQueuePrescriptionItem } from '../../hooks';
import { clinicDateKey } from '../../lib/clinic-booking-time';
import { CLINIC_TIME_ZONE, dateTimeFormatWithNumerals, resolveLocale } from '../../lib/i18n-ui';
import { inferPrescriptionWorkflowStatus, type PharmacyPrescriptionWorkflowStatus } from './prescription-status';

export interface ReportPrescription {
  prescriptionId: string;
  status: PharmacyPrescriptionWorkflowStatus;
  /** Dubai month the prescription was received ("2026-11"), from its earliest medicine. */
  monthKey: string;
  items: PharmacyQueuePrescriptionItem[];
}

/**
 * QA-286: one entry per prescription (its medicines grouped), with the same status the Dispensing
 * page shows. The old Reports page counted a prescription as dispensed only when every medicine
 * was, so one cancelled medicine kept it "in queue" for ever.
 */
export const groupReportPrescriptions = (queue: ReadonlyArray<PharmacyQueuePrescriptionItem>): ReportPrescription[] => {
  const byPrescription = new Map<string, PharmacyQueuePrescriptionItem[]>();
  for (const item of queue) {
    byPrescription.set(item.prescriptionId, [...(byPrescription.get(item.prescriptionId) ?? []), item]);
  }
  return Array.from(byPrescription.entries()).map(([prescriptionId, items]) => {
    const firstReceived = items.map((item) => item.receivedAt).sort()[0];
    return {
      prescriptionId,
      status: inferPrescriptionWorkflowStatus(items),
      monthKey: clinicDateKey(firstReceived).slice(0, 7),
      items,
    };
  });
};

export const isDispensedStatus = (status: PharmacyPrescriptionWorkflowStatus) =>
  status === 'dispensed' || status === 'picked_up';

export interface MonthFigures {
  received: number;
  dispensed: number;
  onHold: number;
  open: number;
  cancelled: number;
}

/** QA-286: the prescriptions received in a Dubai month, by their status now. */
export const summarizeMonth = (prescriptions: ReadonlyArray<ReportPrescription>, monthKey: string): MonthFigures => {
  const figures: MonthFigures = { received: 0, dispensed: 0, onHold: 0, open: 0, cancelled: 0 };
  for (const prescription of prescriptions) {
    if (prescription.monthKey !== monthKey) continue;
    figures.received += 1;
    if (isDispensedStatus(prescription.status)) figures.dispensed += 1;
    else if (prescription.status === 'on_hold') figures.onHold += 1;
    else if (prescription.status === 'cancelled') figures.cancelled += 1;
    else figures.open += 1;
  }
  return figures;
};

export interface ApprovalFigures {
  paid: number;
  denied: number;
  /** Paid ÷ (paid + denied), one decimal; null when no claim has been decided. */
  percent: number | null;
}

/** QA-286: the insurance approval rate from the claims (it used to be the share of prescriptions dispensed). */
export const summarizeApproval = (claims: ReadonlyArray<Pick<PharmacyClaimLedgerItem, 'status'>>): ApprovalFigures => {
  const paid = claims.filter((claim) => claim.status === 'paid').length;
  const denied = claims.filter((claim) => claim.status === 'denied').length;
  const decided = paid + denied;
  return { paid, denied, percent: decided ? Math.round((paid / decided) * 1000) / 10 : null };
};

/** A Dubai month ("2026-11") for display, e.g. "November 2026" / "نوفمبر ٢٠٢٦". */
export const formatReportMonth = (monthKey: string, language: string): string =>
  new Intl.DateTimeFormat(resolveLocale(language), {
    ...dateTimeFormatWithNumerals(language, { month: 'long', year: 'numeric' }),
    timeZone: CLINIC_TIME_ZONE,
  }).format(new Date(`${monthKey}-15T12:00:00+04:00`));

/**
 * QA-287: the medicines dispensed (or picked up) from the prescriptions received in a Dubai month,
 * most often first. Counts medicine lines; cancelled and not-yet-dispensed medicines are left out,
 * and the full name (with strength) is kept, as two strengths are two different products.
 */
export const topDispensedMedicines = (
  prescriptions: ReadonlyArray<ReportPrescription>,
  monthKey: string,
  limit = 7
): Array<{ medicine: string; count: number }> => {
  const counts = new Map<string, number>();
  for (const prescription of prescriptions) {
    if (prescription.monthKey !== monthKey) continue;
    for (const item of prescription.items) {
      if (item.workflowStatus !== 'dispensed' && item.workflowStatus !== 'picked_up') continue;
      const medicine = item.medication.trim();
      if (!medicine) continue;
      counts.set(medicine, (counts.get(medicine) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([medicine, count]) => ({ medicine, count }))
    .sort((a, b) => b.count - a.count || a.medicine.localeCompare(b.medicine))
    .slice(0, limit);
};
