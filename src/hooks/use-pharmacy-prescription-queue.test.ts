import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

import { supabase } from '../lib/supabase';
import { sendPharmacyHoldNotificationAndMessage } from './use-pharmacy-prescription-queue';

describe('sendPharmacyHoldNotificationAndMessage (QA-263)', () => {
  const rpcMock = vi.mocked(supabase.rpc);
  const fromMock = vi.mocked(supabase.from);

  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: null, error: null } as never);
  });

  it('asks the database to notify the patient for the tasks on hold, never writing into their inbox', async () => {
    await sendPharmacyHoldNotificationAndMessage({
      taskIds: ['task-1', 'task-2'],
      patientUserId: 'patient-1',
      medications: ['Amoxicillin', 'Paracetamol'],
      holdReasonLabel: 'Out of Stock',
      holdNote: '',
      pharmacyUserId: null,
    });

    expect(rpcMock).toHaveBeenCalledWith('notify_patient_prescription_on_hold', {
      p_task_ids: ['task-1', 'task-2'],
    });
    expect(fromMock).not.toHaveBeenCalledWith('notifications');
  });

  it('reports a refused notification instead of hiding it', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'Prescription not found.' } } as never);

    await expect(
      sendPharmacyHoldNotificationAndMessage({
        taskIds: ['task-1'],
        patientUserId: 'patient-1',
        medications: ['Amoxicillin'],
        holdReasonLabel: 'Out of Stock',
        holdNote: '',
        pharmacyUserId: null,
      })
    ).rejects.toMatchObject({ message: 'Prescription not found.' });
  });
});
