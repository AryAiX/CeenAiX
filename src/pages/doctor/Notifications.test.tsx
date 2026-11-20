import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorNotifications } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { NOTIFICATIONS_CHANGED_EVENT } from '../../lib/notification-events';
import { DoctorNotifications } from './Notifications';

vi.mock('../../hooks', () => ({ useDoctorNotifications: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));

const updateResult = { error: null as { message: string } | null };
const updates: Array<{ values: unknown; filters: Array<[string, unknown]> }> = [];
vi.mock('../../lib/supabase', () => {
  const chain = {
    update: (values: unknown) => (updates.push({ values, filters: [] }), chain),
    eq: (column: string, value: unknown) => (updates[updates.length - 1]?.filters.push([column, value]), chain),
    then: (resolve: (value: typeof updateResult) => unknown) => resolve(updateResult),
  };
  return { supabase: { from: () => chain } };
});

const refetch = vi.fn();
const notification = (id: string, isRead: boolean, actionUrl: string | null = null) => ({
  id,
  user_id: 'doc-1',
  type: 'system',
  title: `Title ${id}`,
  body: null,
  action_url: actionUrl,
  is_read: isRead,
  is_deleted: false,
  created_at: '2026-11-20T10:00:00Z',
});

const CurrentPath = () => {
  const location = useLocation();
  return <p data-testid="current-path">{`${location.pathname}${location.search}`}</p>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/doctor/notifications']}>
      <Routes>
        <Route path="/doctor/notifications" element={<DoctorNotifications />} />
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>
  );

const withNotifications = (notifications: ReturnType<typeof notification>[]) =>
  vi.mocked(useDoctorNotifications).mockReturnValue({
    data: {
      notifications,
      totalCount: notifications.length,
      unreadCount: notifications.filter((item) => !item.is_read).length,
      derivedNotifications: [],
    },
    loading: false,
    error: null,
    refetch,
  } as never);

describe('DoctorNotifications', () => {
  const announced = vi.fn();

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    refetch.mockClear();
    announced.mockClear();
    updateResult.error = null;
    updates.length = 0;
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, announced);
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'doc-1' } } as never);
    vi.mocked(useDoctorNotifications).mockReturnValue({
      data: {
        notifications: [notification('n1', false), notification('n2', true)],
        totalCount: 2,
        unreadCount: 1,
        derivedNotifications: [],
      },
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

  it('shows the real totals when more notifications exist than were loaded (QA-162)', () => {
    vi.mocked(useDoctorNotifications).mockReturnValue({
      data: {
        notifications: [notification('n1', false), notification('n2', true)],
        totalCount: 40,
        unreadCount: 30,
        derivedNotifications: [],
      },
      loading: false,
      error: null,
      refetch,
    } as never);
    renderPage();

    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All (40)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unread (30)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read (10)' })).toBeInTheDocument();
    expect(screen.getByTestId('notifications-latest-only')).toHaveTextContent(
      'Showing the latest 2 of 40 notifications.'
    );
  });

  it('hides the "latest only" note when everything is loaded (QA-162)', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'All (2)' })).toBeInTheDocument();
    expect(screen.queryByTestId('notifications-latest-only')).not.toBeInTheDocument();
  });

  it('marks an unread notification read when it is opened, then goes to its page (QA-163)', async () => {
    withNotifications([notification('n1', false, '/doctor/settings?section=my-clinic')]);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() =>
      expect(screen.getByTestId('current-path')).toHaveTextContent('/doctor/settings?section=my-clinic')
    );
    expect(updates).toEqual([
      {
        values: { is_read: true },
        filters: [
          ['id', 'n1'],
          ['user_id', 'doc-1'],
        ],
      },
    ]);
    expect(announced).toHaveBeenCalledTimes(1);
  });

  it('opens a read notification without updating it (QA-163)', async () => {
    withNotifications([notification('n2', true, '/doctor/imaging')]);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('/doctor/imaging'));
    expect(updates).toEqual([]);
  });

  it('shows no Open button for links outside the doctor portal (QA-163)', () => {
    withNotifications([
      notification('n1', false, '/patient/lab-results'),
      notification('n2', true, 'https://evil.example/doctor/imaging'),
    ]);
    renderPage();

    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
    expect(screen.getByText('Title n1')).toBeInTheDocument();
  });
});
