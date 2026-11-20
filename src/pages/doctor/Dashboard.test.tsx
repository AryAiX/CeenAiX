import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorDashboard } from '../../hooks';
import type { DoctorDashboardData } from '../../hooks/use-doctor-dashboard';
import { useAuth } from '../../lib/auth-context';
import type { DashboardLabResult } from '../../lib/doctor-dashboard-labs';
import { DoctorDashboard } from './Dashboard';

vi.mock('../../hooks', () => ({ useDoctorDashboard: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));

const lab = (id: string, overrides: Partial<DashboardLabResult> = {}): DashboardLabResult => ({
  id,
  labOrderId: `order-${id}`,
  patientId: `patient-${id}`,
  patientName: `Patient ${id}`,
  testName: 'Potassium',
  resultValue: '2.1',
  resultUnit: 'mmol/L',
  referenceRange: '3.5-5.1',
  resultedAt: new Date().toISOString(),
  labOrderStatus: 'resulted',
  severity: 'critical',
  direction: 'low',
  ...overrides,
});

const dashboard = (overrides: Partial<DoctorDashboardData> = {}): DoctorDashboardData => ({
  totalPatients: 0,
  todayAppointments: 0,
  completedTodayAppointments: 0,
  remainingTodayAppointments: 0,
  inProgressAppointments: 0,
  unreadMessages: 0,
  pendingReviews: 0,
  prescriptionsToday: 0,
  labOrdersToday: 0,
  estimatedRevenueToday: null,
  activeConsultation: null,
  nextAppointment: null,
  todaySchedule: [],
  todayQueue: [],
  criticalResults: [],
  recentLabResults: [],
  recentMessages: [],
  ...overrides,
});

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{`${location.pathname}|${JSON.stringify(location.state)}`}</p>;
};

const renderWith = (data: DoctorDashboardData) => {
  vi.mocked(useDoctorDashboard).mockReturnValue({ data, loading: false, error: null, refetch: vi.fn() } as never);
  return render(
    <MemoryRouter initialEntries={['/doctor/dashboard']}>
      <Routes>
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'doc-1' },
    profile: { full_name: 'Dr. Test', city: 'Dubai' },
    doctorProfile: null,
  } as never);
});

describe('DoctorDashboard critical result banner (QA-180)', () => {
  it('shows the real direction, no unconfirmed DHA rule, and opens that lab order', () => {
    const critical = lab('1', { direction: 'low' });
    renderWith(dashboard({ criticalResults: [critical, lab('2')], recentLabResults: [critical] }));

    const banner = screen.getByTestId('critical-result-banner');
    expect(within(banner).getByTestId('critical-direction')).toHaveTextContent('Critically low ↓↓');
    expect(banner).not.toHaveTextContent('CRITICAL HIGH');
    expect(banner).not.toHaveTextContent(/DHA requires/);
    expect(banner).toHaveTextContent('Not reviewed yet');
    expect(banner).toHaveTextContent('+1 more critical result');
    expect(within(banner).queryByRole('button', { name: /Acknowledge/ })).not.toBeInTheDocument();

    fireEvent.click(within(banner).getByRole('button', { name: 'Open lab order' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/doctor/lab-orders|{"focusLabOrderId":"order-1"}');
  });

  it('shows no banner when there is no unreviewed critical result', () => {
    renderWith(dashboard({ recentLabResults: [lab('3', { severity: 'abnormal', direction: 'high' })] }));
    expect(screen.queryByTestId('critical-result-banner')).not.toBeInTheDocument();
  });
});

describe('DoctorDashboard lab results box (QA-180)', () => {
  it('labels each result critical or abnormal, and only unreviewed ones get a Review button', () => {
    renderWith(
      dashboard({
        recentLabResults: [
          lab('a', { severity: 'abnormal', direction: 'high', labOrderStatus: 'resulted' }),
          lab('b', { severity: 'critical', labOrderStatus: 'reviewed' }),
        ],
      })
    );

    const [abnormal, reviewed] = screen.getAllByTestId('dashboard-lab-result');
    expect(abnormal).toHaveTextContent('Abnormal');
    expect(within(abnormal).getByRole('button', { name: 'Review' })).toBeInTheDocument();
    expect(reviewed).toHaveTextContent('Critical');
    expect(within(reviewed).queryByRole('button')).not.toBeInTheDocument();
    expect(reviewed).toHaveTextContent('Reviewed');

    fireEvent.click(within(abnormal).getByRole('button', { name: 'Review' }));
    expect(screen.getByTestId('where')).toHaveTextContent('{"focusLabOrderId":"order-a"}');
  });
});
