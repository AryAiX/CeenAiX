// QA-269: the browser here is NOT in Dubai (and west of UTC), so these tests show that Inventory
// dates are Dubai dates with the year.
process.env.TZ = 'America/New_York';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PharmacyInventoryDerivedItem } from '../../hooks';
import i18n from '../../i18n';

vi.mock('../../components/OpsShell', () => ({
  OpsShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../hooks', () => ({ usePharmacyPrescriptionQueue: vi.fn() }));

import { usePharmacyPrescriptionQueue } from '../../hooks';
import { PharmacyInventory } from './Inventory';

const amoxicillin: PharmacyInventoryDerivedItem = {
  id: 'amox',
  name: 'Amoxicillin',
  sku: 'AMX',
  stock: 40,
  expiredStock: 0,
  nextExpiryDate: '2026-12-01',
  expiringSoon: true,
  batches: [
    { id: 'b1', batchNumber: 'AMX-1', quantity: 40, expiryDate: '2026-12-01', receivedAt: '2026-05-01T21:30:00Z', state: 'expiring_soon' },
  ],
  reorderPoint: 20,
  expiryMonth: null,
  status: 'near_expiry',
  genericName: 'Amoxicillin',
  brandName: '',
  strength: null,
  dosageForm: 'Capsules',
  atcCode: null,
  category: null,
  unit: 'caps',
  isControlled: false,
  isDHAFormulary: false,
  batchCount: 1,
};

describe('PharmacyInventory dates (QA-269)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    // 26 Nov 2026 00:30 in Dubai; still 25 Nov in UTC and in New York.
    vi.setSystemTime(new Date('2026-11-25T20:30:00.000Z'));
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
      data: { inventory: [amoxicillin], profile: { displayName: 'QA Test Pharmacy' }, organization: null, lowStockAlerts: 0 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('en');
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/pharmacy/inventory']}>
        <PharmacyInventory />
      </MemoryRouter>
    );

  it("shows today's Dubai date in the header and the expiry with its year, not a day early", () => {
    renderPage();

    expect(screen.getByText(/QA Test Pharmacy · Nov 26, 2026/)).toBeInTheDocument();
    const row = screen.getByText('Amoxicillin', { exact: true }).closest('.grid') as HTMLElement;
    expect(within(row).getByText('Dec 1, 2026')).toBeInTheDocument();
    expect(within(row).queryByText('30 Nov')).not.toBeInTheDocument();
  });

  it('shows the batch expiry and received dates as Dubai dates', async () => {
    renderPage();

    const row = screen.getByText('Amoxicillin', { exact: true }).closest('.grid') as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: /Batches/ }));

    const cells = within(screen.getByRole('table')).getAllByRole('cell').map((cell) => cell.textContent);
    // 21:30 UTC on 1 May is 2 May in Dubai (and still 1 May in New York).
    expect(cells).toEqual(['AMX-1', '40 caps', 'Dec 1, 2026', 'May 2, 2026', 'EXPIRING SOON']);
  });

  it('shows the dates in Arabic', async () => {
    await i18n.changeLanguage('ar');
    renderPage();

    const row = screen.getByText('Amoxicillin', { exact: true }).closest('.grid') as HTMLElement;
    expect(within(row).getByText('١ ديسمبر ٢٠٢٦')).toBeInTheDocument();
  });
});
