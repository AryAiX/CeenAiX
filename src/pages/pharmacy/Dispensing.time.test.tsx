// QA-258: the browser here is NOT in Dubai, so these tests show that times are shown in Dubai time.
process.env.TZ = 'UTC';

import { act, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PharmacyQueuePrescriptionItem } from '../../hooks';
import i18n from '../../i18n';

vi.mock('../../components/OpsShell', () => ({
  OpsShell: ({ children, subtitle }: { children: ReactNode; subtitle?: string }) => (
    <div>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));
vi.mock('../../lib/auth-context', () => ({ useAuth: () => ({ user: { id: 'pharmacist-1' } }) }));
vi.mock('../../hooks', () => ({
  PharmacyTaskChangeNotAllowedError: class PharmacyTaskChangeNotAllowedError extends Error {},
  fetchPharmacyPrescriptionDetails: vi.fn(),
  usePharmacyPrescriptionQueue: vi.fn(),
  usePharmacyUnreadMessages: vi.fn(),
  updatePharmacyDispensingTaskStatus: vi.fn(),
  sendPharmacyHoldNotificationAndMessage: vi.fn(),
}));

import { usePharmacyPrescriptionQueue } from '../../hooks';
import { PharmacyDispensing } from './Dispensing';

// 26 Nov 2026, 13:30 in Dubai (09:30 UTC).
const NOW = new Date('2026-11-26T09:30:00.000Z');

const task = (
  overrides: Partial<PharmacyQueuePrescriptionItem> & Pick<PharmacyQueuePrescriptionItem, 'id'>
): PharmacyQueuePrescriptionItem => ({
  prescriptionId: 'rx-1',
  externalRef: `ref-${overrides.id}`,
  prescriptionItemId: null,
  patientName: 'Test Patient',
  medication: 'Amoxicillin',
  prescriber: 'Dr Test',
  priority: 'routine',
  status: 'verifying',
  workflowStatus: 'new',
  waitMinutes: 0,
  quantity: 10,
  isDispensed: false,
  insuranceProvider: 'Cash',
  copayAed: 0,
  receivedAt: '2026-11-26T08:30:00.000Z',
  allergyFlag: false,
  assignedTo: null,
  patientUserId: 'patient-1',
  ...overrides,
});

const showQueue = (
  queue: PharmacyQueuePrescriptionItem[],
  extra: { loading?: boolean; refetch?: () => void } = {}
) => {
  vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
    data: {
      queue,
      profile: { displayName: 'QA Test Pharmacy' },
      organization: null,
      lowStockAlerts: 0,
    },
    loading: extra.loading ?? false,
    error: null,
    refetch: extra.refetch ?? vi.fn(),
  } as never);
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/pharmacy/dispensing']}>
      <PharmacyDispensing />
    </MemoryRouter>
  );

const rowFor = (patientText: string) => {
  const row = screen.getByText(patientText).closest('.grid');
  if (!row) throw new Error('row not found');
  return row as HTMLElement;
};

describe('PharmacyDispensing received times and refresh (QA-258)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(NOW);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('en');
  });

  it("shows today's prescriptions at their Dubai time with a translated time-ago", () => {
    // 08:30 UTC = 12:30 in Dubai, one hour ago.
    showQueue([task({ id: 'a' })]);
    renderPage();

    const row = rowFor('Test Patient');
    expect(within(row).getByText('12:30')).toBeInTheDocument();
    expect(within(row).getByText('1h ago')).toBeInTheDocument();
    expect(within(row).queryByText(/min ago/)).not.toBeInTheDocument();
  });

  it('shows the Dubai date for older prescriptions, not hours like "49h 30min ago"', () => {
    showQueue([task({ id: 'a', receivedAt: '2026-11-24T08:00:00.000Z' })]);
    renderPage();

    const row = rowFor('Test Patient');
    expect(within(row).getByText('Nov 24, 2026')).toBeInTheDocument();
    expect(within(row).getByText('2d ago')).toBeInTheDocument();
  });

  it('counts a prescription received just after midnight in Dubai as today, even when it is still the day before in UTC', () => {
    // 20:30 UTC on 25 Nov = 00:30 on 26 Nov in Dubai.
    showQueue([task({ id: 'a', receivedAt: '2026-11-25T20:30:00.000Z' })]);
    renderPage();

    expect(within(rowFor('Test Patient')).getByText('00:30')).toBeInTheDocument();
  });

  it('uses the earliest medicine of the prescription as its received time', () => {
    showQueue([
      task({ id: 'a', receivedAt: '2026-11-26T09:00:00.000Z' }),
      task({ id: 'b', medication: 'Paracetamol', receivedAt: '2026-11-26T07:00:00.000Z' }),
    ]);
    renderPage();

    const row = rowFor('Test Patient');
    expect(within(row).getByText('11:00')).toBeInTheDocument();
    expect(within(row).getByText('2h ago')).toBeInTheDocument();
  });

  it('shows the times in Arabic', async () => {
    await i18n.changeLanguage('ar');
    showQueue([task({ id: 'a' })]);
    renderPage();

    const row = rowFor('Test Patient');
    expect(within(row).getByText('١٢:٣٠')).toBeInTheDocument();
    expect(within(row).getByText('منذ ساعة')).toBeInTheDocument();
  });

  it('describes the list as it is, not as "today" only', () => {
    showQueue([task({ id: 'a' })]);
    renderPage();

    expect(screen.getByText('Prescriptions sent to QA Test Pharmacy')).toBeInTheDocument();
    expect(screen.queryByText(/today/i)).not.toBeInTheDocument();
  });

  it('reloads the list every minute and when the pharmacist comes back to the tab', () => {
    const refetch = vi.fn();
    showQueue([task({ id: 'a' })], { refetch });
    renderPage();
    expect(refetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(refetch).toHaveBeenCalledTimes(1);

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the list on screen during a background reload', () => {
    showQueue([task({ id: 'a' })], { loading: true });
    renderPage();

    expect(screen.getByText('Test Patient')).toBeInTheDocument();
    expect(screen.queryByText(/Loading prescriptions/)).not.toBeInTheDocument();
  });
});
