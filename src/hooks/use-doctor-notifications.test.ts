import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';

type Filter = [string, string, unknown];

const results: Record<string, unknown[]> = {};
const counts = { total: null as number | null, unread: null as number | null };
const calls: Array<{ table: string; filters: Filter[]; head: boolean }> = [];

vi.mock('../lib/supabase', () => {
  const builder = (table: string) => {
    const entry = { table, filters: [] as Filter[], head: false };
    calls.push(entry);
    const record = (op: string) => (column: string, value: unknown) => {
      entry.filters.push([op, column, value]);
      return chain;
    };
    const chain = {
      select: (_columns?: string, options?: { head?: boolean }) => {
        entry.head = Boolean(options?.head);
        return chain;
      },
      eq: record('eq'),
      neq: record('neq'),
      is: record('is'),
      in: record('in'),
      filter: (column: string, _op: string, value: unknown) => record('filter')(column, value),
      order: () => chain,
      limit: (value: number) => record('limit')('', value),
      then: (resolve: (value: { data: unknown[]; count: number | null; error: null }) => unknown) => {
        if (entry.head) {
          const unreadOnly = entry.filters.some(([, column]) => column === 'is_read');
          return resolve({ data: [], count: unreadOnly ? counts.unread : counts.total, error: null });
        }
        return resolve({ data: results[table] ?? [], count: null, error: null });
      },
    };
    return chain;
  };
  return { supabase: { from: builder } };
});

import { useDoctorNotifications } from './use-doctor-notifications';

const load = async () => {
  const { result } = renderHook(() => useDoctorNotifications('doc-1'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBeNull();
  return result.current.data!;
};

describe('useDoctorNotifications live attention (QA-160)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    calls.length = 0;
    for (const key of Object.keys(results)) delete results[key];
    counts.total = null;
    counts.unread = null;
    results.conversations = [{ id: 'conv-1' }, { id: 'conv-2' }];
    results.user_profiles = [
      { user_id: 'pat-1', full_name: 'Sara Ali' },
      { user_id: 'pat-2', full_name: 'Omar Said' },
    ];
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('skips deleted messages and shows one card per conversation with the newest message', async () => {
    results.messages = [
      { id: 'm3', conversation_id: 'conv-1', sender_id: 'pat-1', body: 'Newest from Sara', sent_at: '2026-11-20T10:00:00Z' },
      { id: 'm2', conversation_id: 'conv-1', sender_id: 'pat-1', body: 'Older', sent_at: '2026-11-20T09:00:00Z' },
      { id: 'm1', conversation_id: 'conv-1', sender_id: 'pat-1', body: 'Oldest', sent_at: '2026-11-20T08:00:00Z' },
      { id: 'm4', conversation_id: 'conv-2', sender_id: 'pat-2', body: 'Hello doctor', sent_at: '2026-11-20T07:00:00Z' },
    ];

    const data = await load();
    const messageCall = calls.find((call) => call.table === 'messages');
    expect(messageCall?.filters).toContainEqual(['eq', 'is_deleted', false]);

    const cards = data.derivedNotifications.filter((item) => item.kind === 'message');
    expect(cards).toEqual([
      expect.objectContaining({
        id: 'message-conv-1',
        title: '3 new messages from Sara Ali',
        body: 'Newest from Sara',
        actionUrl: '/doctor/messages/conv-1',
      }),
      expect.objectContaining({
        id: 'message-conv-2',
        title: 'New message from Omar Said',
        body: 'Hello doctor',
      }),
    ]);
  });

  it('uses the Arabic plural form for the message count', async () => {
    await i18n.changeLanguage('ar');
    results.messages = [
      { id: 'm2', conversation_id: 'conv-1', sender_id: 'pat-1', body: 'b', sent_at: '2026-11-20T10:00:00Z' },
      { id: 'm1', conversation_id: 'conv-1', sender_id: 'pat-1', body: 'a', sent_at: '2026-11-20T09:00:00Z' },
    ];

    const data = await load();
    expect(data.derivedNotifications[0].title).toBe('رسالتان جديدتان من Sara Ali');
  });

  it('skips pre-visit intake for cancelled or deleted appointments', async () => {
    results.messages = [];
    results.appointment_pre_visit_assessments = [
      { id: 'a1', appointment_id: 'apt-ok', patient_id: 'pat-1', completed_at: '2026-11-20T10:00:00Z', updated_at: null },
      { id: 'a2', appointment_id: 'apt-cancelled', patient_id: 'pat-1', completed_at: '2026-11-20T09:00:00Z', updated_at: null },
      { id: 'a3', appointment_id: 'apt-deleted', patient_id: 'pat-2', completed_at: '2026-11-20T08:00:00Z', updated_at: null },
    ];
    // apt-deleted is not returned because the query asks for is_deleted = false.
    results.appointments = [
      { id: 'apt-ok', patient_id: 'pat-1', chief_complaint: 'Headache', status: 'scheduled' },
      { id: 'apt-cancelled', patient_id: 'pat-1', chief_complaint: 'Cough', status: 'cancelled' },
    ];

    const data = await load();
    const intake = data.derivedNotifications.filter((item) => item.kind === 'pre_visit');
    expect(intake).toEqual([
      expect.objectContaining({
        id: 'previsit-a1',
        title: 'Sara Ali completed pre-visit intake',
        body: 'Headache',
        actionUrl: '/doctor/appointments/apt-ok',
      }),
    ]);
  });
});

describe('useDoctorNotifications log counts (QA-162)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    calls.length = 0;
    for (const key of Object.keys(results)) delete results[key];
    counts.total = null;
    counts.unread = null;
  });

  it('takes the total and unread counts from the database, not from the 25 loaded rows', async () => {
    results.notifications = [
      { id: 'n1', is_read: false },
      { id: 'n2', is_read: true },
    ];
    counts.total = 40;
    counts.unread = 30;

    const data = await load();
    expect(data.notifications).toHaveLength(2);
    expect(data.totalCount).toBe(40);
    expect(data.unreadCount).toBe(30);

    const countCalls = calls.filter((call) => call.table === 'notifications' && call.head);
    expect(countCalls.map((call) => call.filters)).toEqual([
      [
        ['eq', 'user_id', 'doc-1'],
        ['eq', 'is_deleted', false],
      ],
      [
        ['eq', 'user_id', 'doc-1'],
        ['eq', 'is_deleted', false],
        ['eq', 'is_read', false],
      ],
    ]);
  });

  it('keeps the chart label as stored in Arabic and uses a translated fallback (QA-164)', async () => {
    await i18n.changeLanguage('ar');
    results.appointments = [{ id: 'apt-1', patient_id: 'pat-1', status: 'scheduled' }];
    results.user_profiles = [{ user_id: 'pat-1', full_name: 'Sara Ali' }];
    results.patient_canonical_update_requests = [
      { id: 'u1', patient_id: 'pat-1', display_label: 'Allergies', created_at: '2026-11-20T10:00:00Z', updated_at: null },
      { id: 'u2', patient_id: 'pat-1', display_label: null, created_at: '2026-11-20T09:00:00Z', updated_at: null },
    ];

    const data = await load();
    const bodies = data.derivedNotifications.filter((item) => item.kind === 'patient_update').map((item) => item.body);
    expect(bodies).toEqual(['راجع Allergies في مساحة المريض.', 'راجع السجل في مساحة المريض.']);
  });

  it('lower-cases the stored label inside the English sentence (QA-164)', async () => {
    results.appointments = [{ id: 'apt-1', patient_id: 'pat-1', status: 'scheduled' }];
    results.user_profiles = [{ user_id: 'pat-1', full_name: 'Sara Ali' }];
    results.patient_canonical_update_requests = [
      { id: 'u1', patient_id: 'pat-1', display_label: 'Allergies', created_at: '2026-11-20T10:00:00Z', updated_at: null },
    ];

    const data = await load();
    expect(data.derivedNotifications[0].body).toBe('Review allergies in the patient detail workspace.');
  });
});
