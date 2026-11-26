import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PharmacyInventoryDerivedItem } from '../../hooks';

vi.mock('../../components/OpsShell', () => ({
  OpsShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../hooks', () => ({ usePharmacyPrescriptionQueue: vi.fn() }));

import { usePharmacyPrescriptionQueue } from '../../hooks';
import { PharmacyInventory } from './Inventory';

const item = (
  overrides: Partial<PharmacyInventoryDerivedItem> & Pick<PharmacyInventoryDerivedItem, 'id' | 'genericName'>
): PharmacyInventoryDerivedItem => ({
  name: overrides.genericName,
  sku: overrides.id,
  stock: 100,
  expiredStock: 0,
  nextExpiryDate: '2027-08-01',
  expiringSoon: false,
  batches: [],
  reorderPoint: 20,
  expiryMonth: '01 Aug',
  status: 'healthy',
  brandName: '',
  strength: null,
  dosageForm: 'Tablets',
  atcCode: null,
  category: null,
  unit: 'tabs',
  isControlled: false,
  isDHAFormulary: false,
  batchCount: 1,
  ...overrides,
});

const showInventory = (inventory: PharmacyInventoryDerivedItem[]) => {
  vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
    data: { inventory, profile: null, organization: null, lowStockAlerts: 0, pendingPrescriptions: 0 },
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as never);
};

const renderInventory = (path = '/pharmacy/inventory') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PharmacyInventory />
    </MemoryRouter>
  );

const inventoryRowFor = (name: string) => {
  const row = screen.getByText(name, { exact: true }).closest('.grid');
  if (!row) throw new Error('row not found');
  return row as HTMLElement;
};

describe('PharmacyInventory expired and expiring stock (QA-265)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const inventory = () => [
    item({ id: 'expired', genericName: 'Amoxicillin', stock: 40, expiredStock: 30 }),
    item({ id: 'low-expiring', genericName: 'Metformin', stock: 10, reorderPoint: 50, status: 'low', expiringSoon: true, nextExpiryDate: '2026-12-15' }),
    item({ id: 'fine', genericName: 'Losartan' }),
  ];

  it('shows expired units as a warning and not as stock', () => {
    showInventory(inventory());
    renderInventory();

    const row = inventoryRowFor('Amoxicillin');
    expect(within(row).getByText('IN STOCK')).toBeInTheDocument();
    expect(within(row).getByText('EXPIRED STOCK')).toBeInTheDocument();
    expect(within(row).getByRole('note')).toHaveTextContent('30 tabs expired · not counted in stock · remove from the shelf');
  });

  it('shows low stock and expiring soon together, instead of one hiding the other', () => {
    showInventory(inventory());
    renderInventory();

    const row = inventoryRowFor('Metformin');
    expect(within(row).getByText(/LOW STOCK|CRITICAL/)).toBeInTheDocument();
    expect(within(row).getByText('EXPIRING SOON')).toBeInTheDocument();
  });

  it('lists items with expired units under the Expired filter and figure', async () => {
    showInventory(inventory());
    renderInventory();

    expect(screen.getByRole('button', { name: /^Expired \(1\)/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Expired \(1\)/ }));

    expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
    expect(screen.queryByText('Metformin')).not.toBeInTheDocument();
    expect(screen.queryByText('Losartan')).not.toBeInTheDocument();
  });

  it('lists low items that expire soon under Expiring Soon', async () => {
    showInventory(inventory());
    renderInventory();

    await userEvent.click(screen.getByRole('button', { name: /^Expiring Soon \(1\)/ }));

    expect(screen.getByText('Metformin')).toBeInTheDocument();
    expect(screen.queryByText('Amoxicillin')).not.toBeInTheDocument();
  });
});

describe('PharmacyInventory shows only stored facts (QA-266)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not guess ATC codes or categories from the medicine name', () => {
    showInventory([
      item({ id: 'met', genericName: 'Metformin' }),
      item({ id: 'los', genericName: 'Losartan', atcCode: 'C09CA01', category: 'ARB' }),
    ]);
    renderInventory();

    const guessed = inventoryRowFor('Metformin');
    expect(within(guessed).queryByText(/A10BA02|RX-CUSTOM/)).not.toBeInTheDocument();
    expect(within(guessed).queryByText('Biguanide')).not.toBeInTheDocument();
    expect(within(guessed).getByText('—')).toBeInTheDocument();

    const stored = inventoryRowFor('Losartan');
    expect(within(stored).getByText('Tablets · C09CA01')).toBeInTheDocument();
    expect(within(stored).getByText('ARB')).toBeInTheDocument();
  });

  it('does not repeat the generic name as the brand', () => {
    showInventory([item({ id: 'met', genericName: 'Metformin', brandName: '' })]);
    renderInventory();

    expect(within(inventoryRowFor('Metformin')).getByText('Tablets')).toBeInTheDocument();
    expect(screen.queryByText(/^Metformin ·/)).not.toBeInTheDocument();
  });

  it('has no invented days of supply or made-up affected prescriptions', () => {
    showInventory([
      item({ id: 'out', genericName: 'Warfarin', stock: 0, status: 'out' }),
      item({ id: 'ok', genericName: 'Losartan', stock: 100 }),
    ]);
    renderInventory();

    expect(screen.queryByText(/Affects:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/prescription on hold/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+d$/)).not.toBeInTheDocument();
  });

  it('shows the DHA formulary badge only for items marked as on the formulary', () => {
    showInventory([
      item({ id: 'on', genericName: 'Losartan', isDHAFormulary: true }),
      item({ id: 'off', genericName: 'Metformin', isDHAFormulary: false }),
    ]);
    renderInventory();

    expect(within(inventoryRowFor('Losartan')).getByText('DHA formulary')).toBeInTheDocument();
    expect(within(inventoryRowFor('Metformin')).queryByText(/DHA/)).not.toBeInTheDocument();
  });
});

describe('PharmacyInventory batches panel (QA-267)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the real batches with quantity, expiry, received date and state', async () => {
    showInventory([
      item({
        id: 'amox',
        genericName: 'Amoxicillin',
        batchCount: 2,
        batches: [
          { id: 'b1', batchNumber: 'AMX-0126', quantity: 30, expiryDate: '2026-11-25', receivedAt: '2026-05-01T21:30:00Z', state: 'expired' },
          { id: 'b2', batchNumber: 'AMX-0827', quantity: 40, expiryDate: '2027-08-01', receivedAt: null, state: 'usable' },
        ],
      }),
    ]);
    renderInventory();

    await userEvent.click(within(inventoryRowFor('Amoxicillin')).getByRole('button', { name: /Batches/ }));

    const table = screen.getByRole('table', { name: /Batches of Amoxicillin/ });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
      // 21:30 UTC on 1 May is 2 May in Dubai.
      ['AMX-0126', '30 tabs', '2026-11-25', '2026-05-02', 'EXPIRED'],
      ['AMX-0827', '40 tabs', '2027-08-01', '—', 'USABLE'],
    ]);
  });

  it('says so when an item has no batches', async () => {
    showInventory([item({ id: 'none', genericName: 'Losartan', batchCount: 0, batches: [] })]);
    renderInventory();

    await userEvent.click(within(inventoryRowFor('Losartan')).getByRole('button', { name: /Batches/ }));

    expect(screen.getByText('No batches recorded for this item.')).toBeInTheDocument();
  });
});
