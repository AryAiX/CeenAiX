import type { PharmacyQueuePrescriptionItem } from '../../hooks/use-pharmacy-prescription-queue';

export type PharmacyPrescriptionWorkflowStatus =
  | 'new'
  | 'in_progress'
  | 'on_hold'
  | 'dispensed'
  | 'picked_up'
  | 'cancelled';

/** Map grouped dispensing-task rows onto the canonical workflow status enum. */
export const inferPrescriptionWorkflowStatus = (
  items: PharmacyQueuePrescriptionItem[]
): PharmacyPrescriptionWorkflowStatus => {
  // QA-251: a cancelled medicine no longer makes the whole prescription "cancelled"; the other
  // medicines still need dispensing. Only when every medicine is cancelled is it cancelled.
  const active = items.filter((item) => item.workflowStatus !== 'cancelled');

  if (active.length === 0) {
    return 'cancelled';
  }

  if (active.every((item) => item.workflowStatus === 'picked_up')) {
    return 'picked_up';
  }

  if (active.every((item) => item.workflowStatus === 'dispensed' || item.isDispensed)) {
    return 'dispensed';
  }

  if (active.some((item) => item.workflowStatus === 'on_hold' || item.quantity === 0)) {
    return 'on_hold';
  }

  if (active.some((item) => item.workflowStatus === 'in_progress')) {
    return 'in_progress';
  }

  return 'new';
};

const CLOSED_TASK_STATUSES: ReadonlyArray<PharmacyQueuePrescriptionItem['workflowStatus']> = [
  'dispensed',
  'picked_up',
  'cancelled',
];

/**
 * QA-251: the medicines of a prescription that a status button may still change. Dispensed, picked
 * up and cancelled medicines are never pushed back to "in progress" or "on hold".
 */
export const openDispensingTaskIds = (
  tasks: ReadonlyArray<Pick<PharmacyQueuePrescriptionItem, 'id' | 'workflowStatus'>>
): string[] =>
  tasks.filter((task) => !CLOSED_TASK_STATUSES.includes(task.workflowStatus)).map((task) => task.id);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * QA-251: the reference shown for a prescription. A real prescription shows "RX-" and the first 8
 * characters of its id; a reference that already starts with "RX-" is shown as it is (it used to
 * become "RX-RX-…").
 */
export const prescriptionReference = (prescriptionKey: string): string => {
  const key = prescriptionKey.trim();
  if (UUID_PATTERN.test(key)) {
    return `RX-${key.slice(0, 8).toUpperCase()}`;
  }
  // A task whose prescription link was lost keeps the database reference "rx-<prescription>-item-<medicine>".
  const taskRef = /^rx-([0-9a-f]{8})-[0-9a-f-]{27}-item-/i.exec(key);
  if (taskRef) {
    return `RX-${taskRef[1].toUpperCase()}`;
  }
  if (/^rx-/i.test(key)) {
    return key.toUpperCase();
  }
  return `RX-${key.slice(0, 8).toUpperCase()}`;
};

const dashboardStatusLabel: Record<
  PharmacyPrescriptionWorkflowStatus,
  PharmacyQueuePrescriptionItem['status']
> = {
  new: 'verifying',
  in_progress: 'verifying',
  on_hold: 'ready',
  dispensed: 'counseling',
  picked_up: 'counseling',
  cancelled: 'ready',
};

export const dashboardQueueStatusForWorkflow = (
  workflowStatus: PharmacyPrescriptionWorkflowStatus
): PharmacyQueuePrescriptionItem['status'] => dashboardStatusLabel[workflowStatus];
