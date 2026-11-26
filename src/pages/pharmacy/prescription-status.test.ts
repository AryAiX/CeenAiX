import { describe, expect, it } from 'vitest';
import type { PharmacyQueuePrescriptionItem } from '../../hooks/use-pharmacy-prescription-queue';
import {
  inferPrescriptionWorkflowStatus,
  openDispensingTaskIds,
  prescriptionReference,
} from './prescription-status';

const task = (
  id: string,
  workflowStatus: PharmacyQueuePrescriptionItem['workflowStatus']
): PharmacyQueuePrescriptionItem => ({
  id,
  prescriptionId: 'rx-1',
  externalRef: `ref-${id}`,
  prescriptionItemId: null,
  patientName: 'Test Patient',
  medication: 'Medicine',
  prescriber: 'Dr Test',
  priority: 'routine',
  status: 'verifying',
  workflowStatus,
  waitMinutes: 5,
  quantity: 10,
  isDispensed: workflowStatus === 'dispensed' || workflowStatus === 'picked_up',
  insuranceProvider: 'Cash',
  copayAed: 0,
  receivedAt: '2026-11-25T08:00:00.000Z',
  allergyFlag: false,
  assignedTo: null,
  patientUserId: null,
});

describe('inferPrescriptionWorkflowStatus (QA-251)', () => {
  it('does not call a prescription cancelled while other medicines still need dispensing', () => {
    expect(inferPrescriptionWorkflowStatus([task('a', 'cancelled'), task('b', 'new')])).toBe('new');
    expect(inferPrescriptionWorkflowStatus([task('a', 'cancelled'), task('b', 'dispensed')])).toBe('dispensed');
  });

  it('is cancelled only when every medicine is cancelled', () => {
    expect(inferPrescriptionWorkflowStatus([task('a', 'cancelled'), task('b', 'cancelled')])).toBe('cancelled');
    expect(inferPrescriptionWorkflowStatus([])).toBe('cancelled');
  });

  it('keeps a prescription open while one medicine is not dispensed yet', () => {
    expect(inferPrescriptionWorkflowStatus([task('a', 'dispensed'), task('b', 'new')])).toBe('new');
    expect(inferPrescriptionWorkflowStatus([task('a', 'dispensed'), task('b', 'on_hold')])).toBe('on_hold');
  });
});

describe('openDispensingTaskIds (QA-251)', () => {
  it('leaves dispensed, picked up and cancelled medicines out', () => {
    expect(
      openDispensingTaskIds([
        task('new', 'new'),
        task('progress', 'in_progress'),
        task('hold', 'on_hold'),
        task('done', 'dispensed'),
        task('picked', 'picked_up'),
        task('cancel', 'cancelled'),
      ])
    ).toEqual(['new', 'progress', 'hold']);
  });
});

describe('prescriptionReference (QA-251)', () => {
  it('shows RX- and the first 8 characters of a prescription id', () => {
    expect(prescriptionReference('1a2b3c4d-1111-2222-3333-444455556666')).toBe('RX-1A2B3C4D');
  });

  it('does not add a second RX- to a reference that already has one', () => {
    expect(prescriptionReference('RX-ATO-20')).toBe('RX-ATO-20');
    expect(prescriptionReference('RX-20260407-1042')).toBe('RX-20260407-1042');
  });

  it('shows the prescription part of a database task reference', () => {
    expect(
      prescriptionReference(
        'rx-1a2b3c4d-1111-2222-3333-444455556666-item-9f8e7d6c-1111-2222-3333-444455556666'
      )
    ).toBe('RX-1A2B3C4D');
  });
});
