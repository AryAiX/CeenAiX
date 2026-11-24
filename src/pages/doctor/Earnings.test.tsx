import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorDashboard } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { formatLocaleCurrency } from '../../lib/i18n-ui';
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

/** Intl puts a non-breaking space between the currency and the amount, so they never wrap apart. */
const plain = (value: string) => value.replace(/\u00a0/g, ' ');

describe('money formatting (QA-159)', () => {
  it('formats AED for each language', () => {
    expect(plain(formatLocaleCurrency(300, 'en'))).toBe('AED 300');
    expect(plain(formatLocaleCurrency(1250.5, 'en'))).toBe('AED 1,250.50');
    expect(formatLocaleCurrency(300, 'ar')).toContain('٣٠٠');
    expect(formatLocaleCurrency(300, 'ar')).toContain('د.إ');
    expect(formatLocaleCurrency(300, 'ar')).not.toContain('AED');
  });
});

describe('DoctorEarnings language and labels (QA-159)', () => {
  it('labels the big number and shows money in Arabic format', async () => {
    await i18n.changeLanguage('ar');
    const { container } = renderEarnings();
    const text = container.textContent ?? '';
    expect(screen.getByText(i18n.t('doctor.earnings.earnedTodayEstimate'))).toBeInTheDocument();
    expect(plain(text)).toContain(plain(formatLocaleCurrency(600, 'ar')));
    expect(plain(text)).toContain(plain(formatLocaleCurrency(1500, 'ar')));
    for (const english of ['AED', 'Retry', 'Completed today', "Today's projection", 'Consultation fee', 'completed']) {
      expect(text).not.toContain(english);
    }
  });

  it('says the fee is not set instead of showing zero earnings', () => {
    renderEarnings({}, null);
    expect(screen.getByText(i18n.t('doctor.earnings.feeMissing'))).toBeInTheDocument();
    expect(screen.queryByText(/AED 0/)).not.toBeInTheDocument();
  });
});
