import { describe, expect, it } from 'vitest';
import type { PharmacyQueuePrescriptionItem } from '../../hooks';
import { pharmacyNavCounts } from './navItems';

const task = (
  prescriptionId: string,
  workflowStatus: PharmacyQueuePrescriptionItem['workflowStatus']
): PharmacyQueuePrescriptionItem =>
  ({
    id: `${prescriptionId}-${workflowStatus}-${Math.random()}`,
    prescriptionId,
    workflowStatus,
    quantity: 1,
    isDispensed: workflowStatus === 'dispensed' || workflowStatus === 'picked_up',
  }) as PharmacyQueuePrescriptionItem;

describe('pharmacyNavCounts (QA-273)', () => {
  it('counts prescriptions that are new or on hold, not medicines', () => {
    expect(
      pharmacyNavCounts({
        queue: [
          task('rx-new', 'new'),
          task('rx-new', 'new'),
          task('rx-hold', 'on_hold'),
          task('rx-hold', 'dispensed'),
          task('rx-wip', 'in_progress'),
          task('rx-done', 'dispensed'),
          task('rx-picked', 'picked_up'),
          task('rx-cancelled', 'cancelled'),
        ],
        messages: [{ unreadCount: 2 }, { unreadCount: 0 }, { unreadCount: 3 }],
        lowStockAlerts: 4,
      })
    ).toEqual({ prescriptions: 2, inventory: 4, messages: 5 });
  });

  it('shows no badge when there is nothing to count', () => {
    expect(pharmacyNavCounts(null)).toEqual({ prescriptions: undefined, inventory: undefined, messages: undefined });
  });
});
