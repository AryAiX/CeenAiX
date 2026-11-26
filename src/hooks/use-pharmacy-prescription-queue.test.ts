import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

import { supabase } from '../lib/supabase';
import { createSupabaseQueryBuilder } from '../test/supabase-mock';
import {
  fetchPharmacyPrescriptionDetails,
  sendPharmacyHoldNotificationAndMessage,
  usePharmacyPrescriptionQueue,
} from './use-pharmacy-prescription-queue';

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

describe('usePharmacyPrescriptionQueue grouping key (QA-251)', () => {
  const fromMock = vi.mocked(supabase.from);
  const PRESCRIPTION = '1a2b3c4d-1111-2222-3333-444455556666';
  const taskRow = (id: string, medication: string, prescriptionId: string | null, externalRef: string) => ({
    id,
    prescription_id: prescriptionId,
    prescription_item_id: prescriptionId ? `item-${id}` : null,
    external_ref: externalRef,
    patient_name: 'Test Patient',
    prescriber_name: 'Dr Test',
    medication_name: medication,
    quantity: 10,
    priority: 'routine',
    workflow_status: 'new',
    received_at: '2026-11-25T08:00:00.000Z',
    insurance_provider: 'Cash',
    copay_aed: 0,
    allergy_flag: false,
    assigned_to: null,
    patient_user_id: 'patient-1',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const tables: Record<string, ReturnType<typeof createSupabaseQueryBuilder>> = {
      organizations: createSupabaseQueryBuilder({
        data: { id: 'org-1', name: 'QA Pharmacy', slug: 'qa', city: null, notes: null },
        error: null,
      }),
      pharmacy_facility_profiles: createSupabaseQueryBuilder({ data: null, error: null }),
      organization_staff_members: createSupabaseQueryBuilder({ data: [], error: null }),
      pharmacy_dispensing_tasks: createSupabaseQueryBuilder({
        data: [
          taskRow('task-1', 'Amoxicillin', PRESCRIPTION, `rx-${PRESCRIPTION}-item-aaaa`),
          taskRow('task-2', 'Paracetamol', PRESCRIPTION, `rx-${PRESCRIPTION}-item-bbbb`),
          taskRow('task-3', 'Demo medicine', null, 'RX-ATO-20'),
        ],
        error: null,
      }),
      pharmacy_inventory_items: createSupabaseQueryBuilder({ data: [], error: null }),
      pharmacy_claims: createSupabaseQueryBuilder({ data: [], error: null }),
      pharmacy_messages: createSupabaseQueryBuilder({ data: [], error: null }),
      pharmacy_settings: createSupabaseQueryBuilder({ data: [], error: null }),
    };
    fromMock.mockImplementation(((table: string) => {
      const builder = tables[table];
      if (!builder) throw new Error(`Unexpected table ${table}`);
      return builder;
    }) as never);
  });

  it('groups the medicines of one prescription by the prescription, not by each medicine reference', async () => {
    const { result } = renderHook(() => usePharmacyPrescriptionQueue());
    await waitFor(() => expect(result.current.data?.queue).toHaveLength(3));

    const queue = result.current.data?.queue ?? [];
    expect(queue.map((item) => item.prescriptionId)).toEqual([PRESCRIPTION, PRESCRIPTION, 'RX-ATO-20']);
    expect(queue.map((item) => item.prescriptionItemId)).toEqual(['item-task-1', 'item-task-2', null]);
    expect(queue.map((item) => item.externalRef)).toEqual([
      `rx-${PRESCRIPTION}-item-aaaa`,
      `rx-${PRESCRIPTION}-item-bbbb`,
      'RX-ATO-20',
    ]);
  });
});

describe('fetchPharmacyPrescriptionDetails (QA-253)', () => {
  const fromMock = vi.mocked(supabase.from);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the doctor lines for the given medicines and the frequency / duration labels', async () => {
    const items = createSupabaseQueryBuilder({
      data: [
        {
          id: 'item-1',
          medication_name: 'Amoxicillin',
          medication_name_ar: '  ',
          dosage: ' 1 capsule ',
          frequency: 'Three times a day',
          frequency_code: 'tid',
          duration: '',
          duration_code: null,
          quantity: 21,
          instructions: null,
        },
      ],
      error: null,
    });
    const vocab = createSupabaseQueryBuilder({
      data: [{ category: 'frequency', code: 'tid', label_en: 'Three times a day', label_ar: 'ثلاث مرات', legacy_match: null }],
      error: null,
    });
    fromMock.mockImplementation(((table: string) => (table === 'prescription_items' ? items : vocab)) as never);

    const result = await fetchPharmacyPrescriptionDetails(['item-1', 'item-1', '']);

    expect(items.in).toHaveBeenCalledWith('id', ['item-1']);
    expect(result.items).toEqual([
      expect.objectContaining({ id: 'item-1', medicationNameAr: null, dosage: '1 capsule', duration: null, quantity: 21 }),
    ]);
    expect(result.vocab).toHaveLength(1);
  });

  it('asks nothing when no medicine is linked to a doctor line', async () => {
    await expect(fetchPharmacyPrescriptionDetails([])).resolves.toEqual({ items: [], vocab: [] });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('still shows the doctor text when the labels cannot be loaded, but reports a refused read', async () => {
    const items = createSupabaseQueryBuilder({ data: [], error: null });
    const vocab = createSupabaseQueryBuilder({ data: null, error: { message: 'vocab down' } });
    fromMock.mockImplementation(((table: string) => (table === 'prescription_items' ? items : vocab)) as never);
    await expect(fetchPharmacyPrescriptionDetails(['item-1'])).resolves.toEqual({ items: [], vocab: [] });

    const refused = createSupabaseQueryBuilder({ data: null, error: { message: 'permission denied' } });
    fromMock.mockImplementation(((table: string) => (table === 'prescription_items' ? refused : vocab)) as never);
    await expect(fetchPharmacyPrescriptionDetails(['item-1'])).rejects.toMatchObject({ message: 'permission denied' });
  });
});
