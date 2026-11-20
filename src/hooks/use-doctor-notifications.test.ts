import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';

type Filter = [string, string, unknown];

const results: Record<string, unknown[]> = {};
const calls: Array<{ table: string; filters: Filter[] }> = [];

vi.mock('../lib/supabase', () => {
  const builder = (table: string) => {
    const entry = { table, filters: [] as Filter[] };
    calls.push(entry);
    const record = (op: string) => (column: string, value: unknown) => {
      entry.filters.push([op, column, value]);
      return chain;
    };
    const chain = {
      select: () => chain,
      eq: record('eq'),
      neq: record('neq'),
      is: record('is'),
      in: record('in'),
      filter: (column: string, _op: string, value: unknown) => record('filter')(column, value),
      order: () => chain,
      limit: (value: number) => record('limit')('', value),
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        resolve({ data: results[table] ?? [], error: null }),
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
