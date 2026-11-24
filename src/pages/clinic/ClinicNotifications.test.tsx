import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../lib/auth-context';
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
