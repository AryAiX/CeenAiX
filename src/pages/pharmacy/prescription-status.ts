import type { PharmacyQueuePrescriptionItem } from '../../hooks/use-pharmacy-prescription-queue';

export type PharmacyPrescriptionWorkflowStatus =
  | 'new'
  | 'in_progress'
  | 'on_hold'
  | 'dispensed'
  | 'cancelled';

/** Map grouped dispensing-task rows onto the canonical workflow status enum. */
export const inferPrescriptionWorkflowStatus = (
  items: PharmacyQueuePrescriptionItem[]
): PharmacyPrescriptionWorkflowStatus => {
  if (items.length === 0) {
    return 'cancelled';
  }

  if (items.every((item) => item.workflowStatus === 'dispensed' || item.isDispensed)) {
    return 'dispensed';
  }

  if (items.some((item) => item.workflowStatus === 'cancelled')) {
    return 'cancelled';
  }

  if (items.some((item) => item.workflowStatus === 'on_hold' || item.quantity === 0)) {
    return 'on_hold';
  }

  if (items.some((item) => item.workflowStatus === 'in_progress')) {
    return 'in_progress';
  }

  return 'new';
};

const dashboardStatusLabel: Record<
  PharmacyPrescriptionWorkflowStatus,
  PharmacyQueuePrescriptionItem['status']
> = {
  new: 'verifying',
  in_progress: 'verifying',
  on_hold: 'ready',
  dispensed: 'counseling',
  cancelled: 'ready',
};

export const dashboardQueueStatusForWorkflow = (
  workflowStatus: PharmacyPrescriptionWorkflowStatus
): PharmacyQueuePrescriptionItem['status'] => dashboardStatusLabel[workflowStatus];
