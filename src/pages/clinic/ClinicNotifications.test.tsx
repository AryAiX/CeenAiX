import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../lib/auth-context';
import { NOTIFICATIONS_CHANGED_EVENT } from '../../lib/notification-events';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder, type MockSupabaseQueryBuilder } from '../../test/supabase-mock';
import ClinicNotifications from './ClinicNotifications';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

const note = (id: string, title: string, action_url: string | null, is_read = false) => ({
  id,
  type: 'system',
  title,
  body: null,
  action_url,
  is_read,
  created_at: '2026-11-24T08:00:00Z',
});

let landedAt = '';
const Probe = () => {
  landedAt = useLocation().pathname;
  return null;
};

/** The first notifications call loads the list; later calls (updates) are recorded. */
const setup = (rows: ReturnType<typeof note>[]) => {
  const updates: MockSupabaseQueryBuilder<unknown>[] = [];
  let calls = 0;
  vi.mocked(supabase.from).mockImplementation((() => {
    calls += 1;
    if (calls === 1) return createSupabaseQueryBuilder({ data: rows, error: null });
    const builder = createSupabaseQueryBuilder({ data: null, error: null });
    updates.push(builder);
    return builder;
  }) as never);
  render(
    <MemoryRouter initialEntries={['/clinic/notifications']}>
      <Routes>
        <Route path="/clinic/notifications" element={<ClinicNotifications />} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  );
  return updates;
};

const card = async (title: string) => (await screen.findByText(title)).closest('div.rounded-2xl') as HTMLElement;

beforeEach(() => {
  landedAt = '';
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-1' } } as never);
});

afterEach(() => {
  vi.mocked(supabase.from).mockReset();
});

describe('ClinicNotifications Open button (QA-223)', () => {
  it('marks an unread notification as read and goes to its clinic page', async () => {
    const updates = setup([note('n1', 'Doctor request', '/clinic/doctors')]);
    fireEvent.click(within(await card('Doctor request')).getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(landedAt).toBe('/clinic/doctors'));
    expect(updates).toHaveLength(1);
    expect(updates[0].update).toHaveBeenCalledWith({ is_read: true });
    expect(updates[0].eq).toHaveBeenCalledWith('id', 'n1');
  });

  it('opens a notification that is already read without updating it', async () => {
    const updates = setup([note('n1', 'Old request', '/clinic/doctors?tab=pending', true)]);
    fireEvent.click(within(await card('Old request')).getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(landedAt).toBe('/clinic/doctors'));
    expect(updates).toHaveLength(0);
  });

  it.each([
    ['an outside website', 'https://evil.example/login'],
    ['a protocol-relative address', '//evil.example/login'],
    ['another portal', '/patient/records'],
    ['a path that climbs out of the clinic portal', '/clinic/../admin'],
    ['a javascript: link', 'javascript:alert(1)'],
  ])('shows no Open button for %s', async (_label, url) => {
    setup([note('n1', 'Suspicious', url)]);
    const item = await card('Suspicious');
    expect(within(item).queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
    expect(within(item).getByRole('button', { name: /Mark Read/ })).toBeInTheDocument();
  });
});

describe('ClinicNotifications keeps the badges up to date (QA-224)', () => {
  const listen = () => {
    const listener = vi.fn();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
    return { listener, stop: () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, listener) };
  };

  it('announces the change after Mark Read', async () => {
    const { listener, stop } = listen();
    setup([note('n1', 'Doctor request', '/clinic/doctors')]);
    fireEvent.click(within(await card('Doctor request')).getByRole('button', { name: /Mark Read/ }));
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    stop();
  });

  it('announces the change after Mark All Read', async () => {
    const { listener, stop } = listen();
    setup([note('n1', 'First', null), note('n2', 'Second', null)]);
    await screen.findByText('First');
    fireEvent.click(screen.getByRole('button', { name: /Mark All Read/ }));
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    stop();
  });

  it('announces the change after Dismiss', async () => {
    const { listener, stop } = listen();
    setup([note('n1', 'Doctor request', '/clinic/doctors')]);
    fireEvent.click(within(await card('Doctor request')).getByRole('button', { name: /Dismiss/ }));
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Doctor request')).not.toBeInTheDocument());
    stop();
  });

  it('does not announce anything when the update fails', async () => {
    const { listener, stop } = listen();
    let calls = 0;
    vi.mocked(supabase.from).mockImplementation((() => {
      calls += 1;
      return calls === 1
        ? createSupabaseQueryBuilder({ data: [note('n1', 'Doctor request', null)], error: null })
        : createSupabaseQueryBuilder({ data: null, error: new Error('permission denied') });
    }) as never);
    render(
      <MemoryRouter initialEntries={['/clinic/notifications']}>
        <ClinicNotifications />
      </MemoryRouter>
    );
    fireEvent.click(within(await card('Doctor request')).getByRole('button', { name: /Mark Read/ }));
    await screen.findByText(/permission denied/);
    expect(listener).not.toHaveBeenCalled();
    stop();
  });
});
