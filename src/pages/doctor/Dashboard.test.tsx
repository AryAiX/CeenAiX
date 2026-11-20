import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('DoctorDashboard AI insights card (QA-182)', () => {
  it('is an honest Coming soon card, with no made-up pattern, interaction or next step', () => {
    renderWith(
      dashboard({
        nextAppointment: {
          id: 'appt-1',
          patientId: 'p1',
          patientName: 'Sara Ali',
          scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
          durationMinutes: 30,
          type: 'in_person',
          status: 'scheduled',
          chiefComplaint: 'Headache',
          patientAgeGender: null,
          bloodType: null,
          insuranceName: null,
          conditions: [],
          allergies: ['Penicillin'],
          medications: [],
          lastVisitAt: null,
          visitCount: 0,
        } as never,
        recentLabResults: [lab('a', { severity: 'abnormal' })],
      })
    );

    const card = screen.getByTestId('ai-insights-coming-soon');
    expect(card).toHaveTextContent('Coming soon');
    expect(card).toHaveTextContent('nothing here is a clinical warning');
    expect(card).not.toHaveTextContent('Interaction');
    expect(card).not.toHaveTextContent('Penicillin');
    expect(card).not.toHaveTextContent('Prepare plan for');
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('DoctorDashboard patient card timing (QA-183)', () => {
  const appointment = (scheduledAt: string, status: string) =>
    ({
      id: 'appt-1',
      patientId: 'p1',
      patientName: 'Sara Ali',
      scheduledAt,
      durationMinutes: 30,
      type: 'in_person',
      status,
      chiefComplaint: 'Headache',
      patientAgeGender: null,
      bloodType: null,
      insuranceName: null,
      conditions: [],
      allergies: [],
      medications: [],
      flags: [],
      lastVisitAt: null,
      visitCount: 0,
    }) as never;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T06:00:00Z')); // 10:00 in Dubai
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('en');
  });

  it('next patient: says when it starts and how long until then, not "Session started" / "Duration"', () => {
    renderWith(dashboard({ nextAppointment: appointment('2026-11-20T06:25:00Z', 'scheduled') }));

    expect(screen.getByTestId('hero-start')).toHaveTextContent(/^Starts at /);
    expect(screen.getByTestId('hero-timing')).toHaveTextContent('In 25 min');
    expect(screen.queryByText(/Session started/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Duration/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(screen.getByTestId('hero-timing')).toHaveTextContent('In 15 min');
  });

  it('next patient whose time has passed shows how late it is', () => {
    renderWith(dashboard({ nextAppointment: appointment('2026-11-20T05:48:00Z', 'confirmed') }));
    expect(screen.getByTestId('hero-timing')).toHaveTextContent('12 min late');
  });

  it('live visit: the timer ticks every second', () => {
    const live = appointment('2026-11-20T05:53:00Z', 'in_progress');
    renderWith(dashboard({ activeConsultation: live, nextAppointment: live }));

    expect(screen.getByText('Live consultation', { exact: false })).toBeInTheDocument();
    expect(screen.getByTestId('hero-start')).toHaveTextContent(/^Scheduled start: /);
    expect(screen.getByTestId('hero-timing')).toHaveTextContent('07:00');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('hero-timing')).toHaveTextContent('07:05');
  });

  it('uses Arabic digits for the timer in Arabic', async () => {
    await i18n.changeLanguage('ar');
    const live = appointment('2026-11-20T05:53:00Z', 'in_progress');
    renderWith(dashboard({ activeConsultation: live, nextAppointment: live }));
    expect(screen.getByTestId('hero-timing')).toHaveTextContent('٠٧:٠٠');
  });
});

describe('DoctorDashboard cards and links (QA-184)', () => {
  const withAuth = (fee: number | null, extra: Record<string, unknown> = {}) =>
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'doc-1' },
      profile: { full_name: 'Dr. Test', city: 'Dubai', address: 'Villa 12, Jumeirah', ...extra },
      doctorProfile: { consultation_fee: fee },
    } as never);
  const plain = (text: string | null) => (text ?? '').replace(/\u00a0/g, ' ').replace(/[\u200e\u200f]/g, '');

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows earnings as an estimate from completed visits, with the projection, like the Earnings page', () => {
    withAuth(300);
    renderWith(dashboard({ todayAppointments: 4, completedTodayAppointments: 1 }));

    const card = screen.getByText('Earned today (estimate)').closest('div') as HTMLElement;
    expect(plain(card.textContent)).toContain('AED 300');
    expect(plain(card.textContent)).toContain('Projected for today: AED 1,200');
    expect(screen.queryByText('Revenue Today')).not.toBeInTheDocument();

    fireEvent.click(card);
    expect(screen.getByTestId('where')).toHaveTextContent('/doctor/earnings');
  });

  it('says the fee is missing instead of "AED --"', () => {
    withAuth(null);
    renderWith(dashboard({ todayAppointments: 2 }));
    expect(screen.getByText("Your consultation fee isn't set, so earnings can't be estimated yet.")).toBeInTheDocument();
    expect(screen.queryByText('AED --')).not.toBeInTheDocument();
  });

  it('no longer shows a "Review" badge on Prescriptions written for unrelated reviews', () => {
    withAuth(300);
    renderWith(dashboard({ pendingReviews: 5 }));
    const card = screen.getByText('Prescriptions Written').closest('div') as HTMLElement;
    expect(card).not.toHaveTextContent('Review');
  });

  it('"Order Lab Test" opens a new lab order', () => {
    withAuth(300);
    renderWith(dashboard({ criticalResults: [lab('1')] }));
    fireEvent.click(screen.getByRole('button', { name: 'Order Lab Test' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/doctor/lab-orders/new');
  });

  it('the header shows the city, never the personal address', () => {
    withAuth(300);
    renderWith(dashboard());
    expect(screen.queryByText(/Villa 12, Jumeirah/)).not.toBeInTheDocument();
    expect(screen.getByText(/· Dubai$/)).toBeInTheDocument();
  });
});

