import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorDashboard } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { DoctorEarnings } from './Earnings';

vi.mock('../../hooks', () => ({ useDoctorDashboard: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));

const renderEarnings = (overrides: Record<string, unknown> = {}, fee: number | null = 300) => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'doctor-1' }, doctorProfile: { consultation_fee: fee } } as never);
  vi.mocked(useDoctorDashboard).mockReturnValue({
    data: {
      completedTodayAppointments: 2,
      todayAppointments: 5,
      pendingReviews: 9,
      todaySchedule: [
        { id: 'a1', patientName: 'Done Patient', chiefComplaint: 'Follow-up', type: 'in_person', status: 'completed' },
        { id: 'a2', patientName: 'Later Patient', chiefComplaint: null, type: 'in_person', status: 'scheduled' },
      ],
      ...overrides,
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as never);
  return render(
    <MemoryRouter>
      <DoctorEarnings />
    </MemoryRouter>
  );
};

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('DoctorEarnings (QA-158)', () => {
  it('has no placeholder tabs, dead export button or developer notes', () => {
    const { container } = renderEarnings();
    const text = container.textContent ?? '';
    for (const leftover of ['Transactions', 'Claims', 'Payouts', 'Analytics', 'Export tab data', 'data model', 'billing model', 'CPD']) {
      expect(text).not.toContain(leftover);
    }
    expect(screen.queryByRole('button', { name: /Export/ })).not.toBeInTheDocument();
  });

  it('shows completed / scheduled appointments instead of unrelated clinical reviews', () => {
    renderEarnings();
    expect(screen.getByText(i18n.t('doctor.earnings.appointmentsToday'))).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    expect(screen.queryByText('9')).not.toBeInTheDocument();
  });

  it('explains in plain words that the figures are estimates', () => {
    renderEarnings();
    expect(screen.getByText(i18n.t('doctor.earnings.subtitleEstimate'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('doctor.earnings.estimateNote'))).toBeInTheDocument();
  });
});
