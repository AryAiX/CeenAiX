import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorNotifications } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { NOTIFICATIONS_CHANGED_EVENT } from '../../lib/notification-events';
import { DoctorNotifications } from './Notifications';

vi.mock('../../hooks', () => ({ useDoctorNotifications: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));

const updateResult = { error: null as { message: string } | null };
vi.mock('../../lib/supabase', () => {
  const chain = {
    update: () => chain,
    eq: () => chain,
    then: (resolve: (value: typeof updateResult) => unknown) => resolve(updateResult),
  };
  return { supabase: { from: () => chain } };
});

const refetch = vi.fn();
const notification = (id: string, isRead: boolean) => ({
  id,
  user_id: 'doc-1',
  type: 'system',
  title: `Title ${id}`,
  body: null,
  action_url: null,
  is_read: isRead,
  is_deleted: false,
  created_at: '2026-11-20T10:00:00Z',
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <DoctorNotifications />
    </MemoryRouter>
  );

describe('DoctorNotifications', () => {
  const announced = vi.fn();

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    refetch.mockClear();
    announced.mockClear();
    updateResult.error = null;
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, announced);
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'doc-1' } } as never);
    vi.mocked(useDoctorNotifications).mockReturnValue({
      data: { notifications: [notification('n1', false), notification('n2', true)], derivedNotifications: [] },
      loading: false,
      error: null,
      refetch,
    } as never);
  });

  afterEach(() => {
    window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, announced);
  });

  it('tells the top-bar bell to reload after marking one or all read (QA-161)', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));
    await waitFor(() => expect(announced).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    await waitFor(() => expect(announced).toHaveBeenCalledTimes(2));
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('does not tell the bell to reload when the update fails', async () => {
    updateResult.error = { message: 'nope' };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(announced).not.toHaveBeenCalled();
  });
});
