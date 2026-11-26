import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

import { supabase } from '../lib/supabase';
import { createSupabaseQueryBuilder } from '../test/supabase-mock';
import {
  fetchPharmacyPrescriptionDetails,
  PharmacyTaskChangeNotAllowedError,
  sendPharmacyHoldNotificationAndMessage,
  updatePharmacyDispensingTaskStatus,
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

  it('reports a refused notification instead of throwing, and logs the database error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
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
    ).resolves.toEqual({ notified: false, messaged: false });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Prescription not found.'));
    warn.mockRestore();
  });
});

describe('sendPharmacyHoldNotificationAndMessage message to the patient (QA-254)', () => {
  const rpcMock = vi.mocked(supabase.rpc);
  const fromMock = vi.mocked(supabase.from);
  const hold = {
    taskIds: ['task-1', 'task-2'],
    patientUserId: 'patient-1',
    medications: ['Amoxicillin', 'Paracetamol'],
    holdReasonLabel: 'Out of Stock',
    holdNote: 'Back on Monday',
    pharmacyUserId: 'pharmacist-1',
  };
  let messages: ReturnType<typeof createSupabaseQueryBuilder>;
  let conversations: ReturnType<typeof createSupabaseQueryBuilder>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    messages = createSupabaseQueryBuilder({ data: null, error: null });
    conversations = createSupabaseQueryBuilder({ data: null, error: null });
    fromMock.mockImplementation(((table: string) => (table === 'messages' ? messages : conversations)) as never);
    rpcMock.mockImplementation(((name: string) =>
      Promise.resolve(
        name === 'get_or_create_direct_conversation'
          ? { data: 'conversation-1', error: null }
          : { data: null, error: null }
      )) as never);
  });

  it('opens the conversation with the real function and sends the message in it', async () => {
    await expect(sendPharmacyHoldNotificationAndMessage(hold)).resolves.toEqual({ notified: true, messaged: true });

    expect(rpcMock).toHaveBeenCalledWith('get_or_create_direct_conversation', {
      p_other_user_id: 'patient-1',
      p_subject: 'Prescription Update - Amoxicillin, Paracetamol',
    });
    expect(rpcMock).not.toHaveBeenCalledWith('ensure_direct_conversation', expect.anything());
    expect(messages.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'conversation-1',
        sender_id: 'pharmacist-1',
        body: expect.stringContaining('Reason: Out of Stock'),
      })
    );
    expect(messages.insert).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('Note: Back on Monday') })
    );
    // The conversation moves to the top of both inboxes.
    expect(conversations.update).toHaveBeenCalledWith({ last_message_at: expect.any(String) });
    expect(conversations.eq).toHaveBeenCalledWith('id', 'conversation-1');
  });

  it('reports a refused conversation as "not messaged" instead of throwing', async () => {
    rpcMock.mockImplementation(((name: string) =>
      Promise.resolve(
        name === 'get_or_create_direct_conversation'
          ? { data: null, error: { message: 'You can only start a conversation with your care team.' } }
          : { data: null, error: null }
      )) as never);

    await expect(sendPharmacyHoldNotificationAndMessage(hold)).resolves.toEqual({ notified: true, messaged: false });
    expect(messages.insert).not.toHaveBeenCalled();
  });

  it('reports a refused message as "not messaged"', async () => {
    messages = createSupabaseQueryBuilder({ data: null, error: { message: 'new row violates row-level security policy' } });
    fromMock.mockImplementation(((table: string) => (table === 'messages' ? messages : conversations)) as never);

    await expect(sendPharmacyHoldNotificationAndMessage(hold)).resolves.toEqual({ notified: true, messaged: false });
    expect(conversations.update).not.toHaveBeenCalled();
  });

  it('still counts the message as sent when only the conversation time could not be updated', async () => {
    conversations = createSupabaseQueryBuilder({ data: null, error: { message: 'update failed' } });
    fromMock.mockImplementation(((table: string) => (table === 'messages' ? messages : conversations)) as never);

    await expect(sendPharmacyHoldNotificationAndMessage(hold)).resolves.toEqual({ notified: true, messaged: true });
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

describe('updatePharmacyDispensingTaskStatus (QA-255)', () => {
  const fromMock = vi.mocked(supabase.from);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const useTasks = (result: { data: unknown; error: unknown }) => {
    const builder = createSupabaseQueryBuilder(result);
    fromMock.mockReturnValue(builder as never);
    return builder;
  };

  it('saves the status and checks that the row was really changed', async () => {
    const builder = useTasks({ data: [{ id: 'task-1' }], error: null });

    await expect(
      updatePharmacyDispensingTaskStatus('task-1', 'on_hold', { holdReasonCode: 'out_of_stock', holdNote: '  Monday ' })
    ).resolves.toBeUndefined();

    expect(builder.update).toHaveBeenCalledWith({
      workflow_status: 'on_hold',
      hold_reason_code: 'out_of_stock',
      hold_note: 'Monday',
    });
    expect(builder.eq).toHaveBeenCalledWith('id', 'task-1');
    expect(builder.select).toHaveBeenCalledWith('id');
  });

  it('treats 0 changed rows (refused by the access rules) as not allowed, not as success', async () => {
    useTasks({ data: [], error: null });

    await expect(updatePharmacyDispensingTaskStatus('task-1', 'in_progress')).rejects.toBeInstanceOf(
      PharmacyTaskChangeNotAllowedError
    );
  });

  it('treats a step the database guard refuses as not allowed', async () => {
    useTasks({ data: null, error: { code: '42501', message: 'A prescription cannot go from dispensed to new.' } });

    await expect(updatePharmacyDispensingTaskStatus('task-1', 'new')).rejects.toBeInstanceOf(
      PharmacyTaskChangeNotAllowedError
    );
  });

  it('passes other database errors on as they are', async () => {
    useTasks({ data: null, error: { code: '08006', message: 'connection lost' } });

    await expect(updatePharmacyDispensingTaskStatus('task-1', 'in_progress')).rejects.toMatchObject({
      message: 'connection lost',
    });
  });
});
