import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { useDoctorClinicMembership, useDoctorPortalChrome } from '../hooks';
import { useAuth } from '../lib/auth-context';
import { announceNotificationsChanged } from '../lib/notification-events';
import { PortalShell } from './PortalShell';

vi.mock('../hooks', () => ({
  useDoctorPortalChrome: vi.fn(),
  useDoctorClinicMembership: vi.fn(),
}));
vi.mock('../hooks/use-patient-dashboard-alert', () => ({
  usePatientDashboardAlert: () => ({ data: null, loading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() } }));

const refetch = vi.fn();

const chrome = (overrides: Record<string, unknown>) => {
  vi.mocked(useDoctorPortalChrome).mockReturnValue({
    data: {
      todayAppointmentsCount: 0,
      completedTodayAppointmentsCount: 0,
      unreadMessagesCount: 7,
      unreadNotificationsCount: 0,
      criticalResultsCount: 0,
      activeConsultationPatientId: null,
      activeConsultationPatientName: null,
      activeConsultationStartedAt: null,
      ...overrides,
    },
    loading: false,
    error: null,
    refetch,
  } as never);
};

const renderShell = () =>
  render(
    <MemoryRouter initialEntries={['/doctor/dashboard']}>
      <PortalShell role="doctor">
        <div>page</div>
      </PortalShell>
    </MemoryRouter>
  );

describe('Doctor top-bar bell (QA-161)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    refetch.mockClear();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'doc-1', email: 'doc@test.com' },
      profile: { full_name: 'Dr. Test', role: 'doctor' },
      doctorProfile: null,
      signOut: vi.fn(),
    } as never);
    vi.mocked(useDoctorClinicMembership).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() } as never);
  });

  it('counts unread notifications, not unread messages', () => {
    chrome({ unreadMessagesCount: 7, unreadNotificationsCount: 2 });
    renderShell();
    const bell = screen.getByTestId('doctor-notifications-bell');
    expect(bell).toHaveAccessibleName('Notifications, 2 unread');
    expect(bell).toHaveTextContent('2');
    expect(bell).not.toHaveTextContent('7');
  });

  it('shows no number and a plain label when nothing is unread', () => {
    chrome({ unreadMessagesCount: 7, unreadNotificationsCount: 0 });
    renderShell();
    const bell = screen.getByTestId('doctor-notifications-bell');
    expect(bell).toHaveAccessibleName('Notifications');
    expect(bell).toHaveTextContent('');
  });

  it('caps at 9+ and uses Arabic digits and label in Arabic', async () => {
    await i18n.changeLanguage('ar');
    chrome({ unreadNotificationsCount: 12 });
    renderShell();
    const bell = screen.getByTestId('doctor-notifications-bell');
    expect(bell).toHaveTextContent('٩+');
    expect(bell).toHaveAccessibleName('الإشعارات، ١٢ إشعارًا غير مقروء');
  });

  it('reloads the count when a page marks notifications read', () => {
    chrome({ unreadNotificationsCount: 3 });
    renderShell();
    refetch.mockClear();
    act(() => announceNotificationsChanged());
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
