import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Filter = [string, string, unknown];

const results: Record<string, { data?: unknown[]; count?: number }> = {};
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
      order: () => chain,
      maybeSingle: () => chain,
      then: (resolve: (value: { data: unknown; count: number | null; error: null }) => unknown) =>
        resolve({ data: results[table]?.data ?? [], count: results[table]?.count ?? null, error: null }),
    };
    return chain;
  };
  return { supabase: { from: builder } };
});

import { useDoctorPortalChrome } from './use-doctor-portal-chrome';

describe('useDoctorPortalChrome counts (QA-161)', () => {
  beforeEach(() => {
    calls.length = 0;
    for (const key of Object.keys(results)) delete results[key];
  });

  it('returns the unread notifications count from the notifications table', async () => {
    results.notifications = { count: 4 };
    results.conversations = { data: [{ id: 'conv-1' }] };
    results.messages = { count: 9 };

    const { result } = renderHook(() => useDoctorPortalChrome('doc-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data?.unreadNotificationsCount).toBe(4);
    expect(result.current.data?.unreadMessagesCount).toBe(9);
    expect(calls.find((call) => call.table === 'notifications')?.filters).toEqual([
      ['eq', 'user_id', 'doc-1'],
      ['eq', 'is_deleted', false],
      ['eq', 'is_read', false],
    ]);
  });

  it('does not count deleted messages as unread', async () => {
    results.conversations = { data: [{ id: 'conv-1' }] };

    const { result } = renderHook(() => useDoctorPortalChrome('doc-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(calls.find((call) => call.table === 'messages')?.filters).toContainEqual(['eq', 'is_deleted', false]);
  });
});

describe('useDoctorPortalChrome critical count (QA-186)', () => {
  beforeEach(() => {
    calls.length = 0;
    for (const key of Object.keys(results)) delete results[key];
  });

  const item = (orderId: string, flag: string | null, extra: Record<string, unknown> = {}) => ({
    lab_order_id: orderId,
    numeric_value: null,
    result_value: '5.0',
    status_category: null,
    is_abnormal: flag !== null,
    flag,
    ...extra,
  });

  it('counts lab orders not reviewed yet that have a critical result, not every abnormal value', async () => {
    results.lab_orders = { data: [{ id: 'o1', status: 'resulted' }, { id: 'o2', status: 'resulted' }, { id: 'o3', status: 'processing' }] };
    results.lab_order_items = {
      data: [
        item('o1', 'HH'),
        item('o1', 'LL'), // same order: still one
        item('o2', 'H'), // abnormal only: not counted
        item('o3', null, { status_category: 'critical' }), // marked critical by the lab
      ],
    };

    const { result } = renderHook(() => useDoctorPortalChrome('doc-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data?.criticalResultsCount).toBe(2);
    // Reviewed (and any other closed) orders are not even loaded.
    expect(calls.find((call) => call.table === 'lab_orders')?.filters).toContainEqual([
      'in',
      'status',
      ['ordered', 'collected', 'processing', 'resulted'],
    ]);
  });

  it('is 0 when there are only abnormal results', async () => {
    results.lab_orders = { data: [{ id: 'o1', status: 'resulted' }] };
    results.lab_order_items = { data: [item('o1', 'H'), item('o1', 'L')] };

    const { result } = renderHook(() => useDoctorPortalChrome('doc-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.criticalResultsCount).toBe(0);
  });
});

