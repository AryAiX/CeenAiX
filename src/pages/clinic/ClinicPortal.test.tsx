import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../lib/auth-context';
import { countUnreadMessages, countUnreadNotifications } from '../../lib/clinic-unread-messages';
import { announceMessagesRead, announceNotificationsChanged } from '../../lib/notification-events';
import { supabase } from '../../lib/supabase';
import { createSupabaseQueryBuilder } from '../../test/supabase-mock';
import ClinicPortal from './ClinicPortal';

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../../lib/clinic-unread-messages', () => ({ countUnreadMessages: vi.fn(), countUnreadNotifications: vi.fn() }));
vi.mock('./ClinicDashboard', () => ({ default: () => null }));
vi.mock('./ClinicDoctors', () => ({ default: () => null }));
vi.mock('./ClinicAppointments', () => ({ default: () => null }));
vi.mock('./ClinicPatients', () => ({ default: () => null }));
vi.mock('./ClinicPricing', () => ({ default: () => null }));
vi.mock('./ClinicAnalytics', () => ({ default: () => null }));
vi.mock('./ClinicMessages', () => ({ default: () => null }));
vi.mock('./ClinicNotifications', () => ({ default: () => null }));
vi.mock('./ClinicSettings', () => ({ default: () => null }));
vi.mock('./ClinicTopBar', () => ({ default: () => null }));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'clinic-1' }, signOut: vi.fn() } as never);
  vi.mocked(supabase.from).mockImplementation((() => createSupabaseQueryBuilder({ data: null, error: null })) as never);
  vi.mocked(countUnreadMessages).mockResolvedValue(0);
  vi.mocked(countUnreadNotifications).mockResolvedValue(0);
});

afterEach(() => {
  vi.mocked(countUnreadMessages).mockReset();
  vi.mocked(countUnreadNotifications).mockReset();
});

const renderPortal = () =>
  render(
    <MemoryRouter initialEntries={['/clinic/dashboard']}>
      <ClinicPortal />
    </MemoryRouter>
  );

describe('ClinicPortal unread message badge (QA-220)', () => {
  it('updates the badge when messages are read, and shows no "0" when none are left', async () => {
    vi.mocked(countUnreadMessages).mockResolvedValueOnce(3).mockResolvedValue(0);
    renderPortal();

    expect(await screen.findByTestId('clinic-nav-badge-messages')).toHaveTextContent('3');
    act(() => announceMessagesRead());
    await waitFor(() => expect(screen.queryByTestId('clinic-nav-badge-messages')).not.toBeInTheDocument());
    for (const button of screen.getAllByRole('button', { name: /Messages/ })) {
      expect(button).not.toHaveTextContent('0');
    }
  });

  it('counts again when you move to another page', async () => {
    vi.mocked(countUnreadMessages).mockResolvedValueOnce(2).mockResolvedValue(5);
    renderPortal();
    expect(await screen.findByTestId('clinic-nav-badge-messages')).toHaveTextContent('2');

    fireEvent.click(screen.getAllByRole('button', { name: /Patients/ })[0]);
    await waitFor(() => expect(screen.getByTestId('clinic-nav-badge-messages')).toHaveTextContent('5'));
    expect(countUnreadMessages).toHaveBeenCalledTimes(2);
  });

  it('shows 99+ for large numbers', async () => {
    vi.mocked(countUnreadMessages).mockResolvedValue(1500);
    renderPortal();
    expect(await screen.findByTestId('clinic-nav-badge-messages')).toHaveTextContent('99+');
  });
});

describe('ClinicPortal unread notification badge (QA-224)', () => {
  it('updates the badge when notifications are marked read or dismissed', async () => {
    vi.mocked(countUnreadNotifications).mockResolvedValueOnce(4).mockResolvedValue(1);
    renderPortal();

    expect(await screen.findByTestId('clinic-nav-badge-notifications')).toHaveTextContent('4');
    act(() => announceNotificationsChanged());
    await waitFor(() => expect(screen.getByTestId('clinic-nav-badge-notifications')).toHaveTextContent('1'));
  });

  it('counts again when you move to another page, and hides the badge at 0', async () => {
    vi.mocked(countUnreadNotifications).mockResolvedValueOnce(2).mockResolvedValue(0);
    renderPortal();
    expect(await screen.findByTestId('clinic-nav-badge-notifications')).toHaveTextContent('2');

    fireEvent.click(screen.getAllByRole('button', { name: /Patients/ })[0]);
    await waitFor(() => expect(screen.queryByTestId('clinic-nav-badge-notifications')).not.toBeInTheDocument());
  });
});
