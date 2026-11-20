import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { useDoctorClinicMembership, useDoctorPortalChrome } from '../hooks';
import { useAuth } from '../lib/auth-context';
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

const chrome = (overrides: Record<string, unknown> = {}) =>
  vi.mocked(useDoctorPortalChrome).mockReturnValue({
    data: {
      todayAppointmentsCount: 4,
      completedTodayAppointmentsCount: 1,
      unreadMessagesCount: 0,
      unreadNotificationsCount: 0,
      criticalResultsCount: 0,
      activeConsultationPatientId: null,
      activeConsultationPatientName: null,
      activeConsultationStartedAt: null,
      ...overrides,
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as never);

const auth = (profile: Record<string, unknown>, doctorProfile: Record<string, unknown> | null) =>
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'doc-1', email: 'doc@test.com' },
    profile: { full_name: 'Dr. Test', role: 'doctor', ...profile },
    doctorProfile,
    signOut: vi.fn(),
  } as never);

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PortalShell role="doctor">
        <div>page</div>
      </PortalShell>
    </MemoryRouter>
  );

const plain = (text: string | null) => (text ?? '').replace(/\u00a0/g, ' ').replace(/[\u200e\u200f]/g, '');

describe('Doctor sidebar and top bar facts (QA-187)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    chrome();
    vi.mocked(useDoctorClinicMembership).mockReturnValue({ data: null } as never);
    auth({ city: 'Dubai', address: 'Villa 12, Jumeirah' }, { consultation_fee: 300, specialization: 'Cardiology' });
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows earnings as an estimate from completed visits, in the money format', () => {
    renderAt('/doctor/dashboard');
    expect(screen.getByText('Earned today (estimate)')).toBeInTheDocument();
    expect(plain(screen.getByTestId('doctor-sidebar-earned').textContent)).toBe('AED 300');
    expect(screen.queryByText('Revenue today')).not.toBeInTheDocument();
  });

  it('shows a dash when no fee is set instead of "AED --"', () => {
    auth({ city: 'Dubai' }, { consultation_fee: null });
    renderAt('/doctor/dashboard');
    expect(screen.getByTestId('doctor-sidebar-earned')).toHaveTextContent('—');
    expect(screen.queryByText('AED --')).not.toBeInTheDocument();
  });

  it('shows the clinic, else the city — never the personal address or a made-up place', () => {
    renderAt('/doctor/dashboard');
    expect(screen.getByTestId('doctor-sidebar-facility')).toHaveTextContent('Dubai');
    expect(screen.queryByText(/Villa 12/)).not.toBeInTheDocument();

    vi.mocked(useDoctorClinicMembership).mockReturnValue({ data: { facilities: { name: 'Clinic One' } } } as never);
    renderAt('/doctor/dashboard');
    expect(screen.getAllByTestId('doctor-sidebar-facility').slice(-1)[0]).toHaveTextContent('Clinic One');
  });

  it('hides the line when there is no clinic and no city', () => {
    auth({ city: null, address: 'Villa 12' }, { consultation_fee: 300 });
    renderAt('/doctor/dashboard');
    expect(screen.queryByTestId('doctor-sidebar-facility')).not.toBeInTheDocument();
    expect(screen.queryByText('Dubai Healthcare City')).not.toBeInTheDocument();
  });

  it.each([
    ['/doctor/schedule', 'Schedule'],
    ['/doctor/notifications', 'Notifications'],
    ['/doctor/telemedicine/appt-1', 'Video visit'],
  ])('shows the right page title on %s', (path, title) => {
    renderAt(path);
    expect(screen.getByTestId('doctor-page-title')).toHaveTextContent(title);
  });

  it('lists Settings once and puts no alarm count on Dashboard', () => {
    renderAt('/doctor/dashboard');
    const sidebar = screen.getByRole('complementary');
    expect(Array.from(sidebar.querySelectorAll('button')).filter((button) => button.textContent?.trim() === 'Settings')).toHaveLength(1);
    const dashboardItem = Array.from(sidebar.querySelectorAll('button')).find((button) => button.textContent?.startsWith('Dashboard'));
    expect(dashboardItem?.textContent).toBe('Dashboard');
  });
});
