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
vi.mock('../../lib/csv-export', () => ({ downloadCsv: vi.fn() }));

import { usePharmacyPrescriptionQueue } from '../../hooks';
import { downloadCsv } from '../../lib/csv-export';
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
      ['AMX-0126', '30 tabs', 'Nov 25, 2026', 'May 2, 2026', 'EXPIRED'],
      ['AMX-0827', '40 tabs', 'Aug 1, 2027', '—', 'USABLE'],
    ]);
  });

  it('says so when an item has no batches', async () => {
    showInventory([item({ id: 'none', genericName: 'Losartan', batchCount: 0, batches: [] })]);
    renderInventory();

    await userEvent.click(within(inventoryRowFor('Losartan')).getByRole('button', { name: /Batches/ }));

    expect(screen.getByText('No batches recorded for this item.')).toBeInTheDocument();
  });
});

describe('PharmacyInventory buttons that do what they say (QA-268)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no "Receive Stock" button that only opened Messages, and says who updates stock', () => {
    showInventory([item({ id: 'amox', genericName: 'Amoxicillin' })]);
    renderInventory();

    expect(screen.queryByText('Receive Stock')).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/pharmacy/messages"]')).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent('Stock and batches are updated by a CeenAiX administrator.');
  });

  it('offers an email reorder draft that names the item as the supplier knows it', () => {
    showInventory([
      item({
        id: '0b7c2f4e-1111-2222-3333-444455556666',
        sku: 'AMX-500',
        genericName: 'Amoxicillin',
        brandName: 'Amoxil',
        strength: '500 mg',
        dosageForm: 'Capsules',
        unit: 'caps',
        stock: 12,
        reorderPoint: 40,
        status: 'low',
      }),
    ]);
    renderInventory();

    const link = within(inventoryRowFor('Amoxicillin 500 mg')).getByRole('link', { name: 'Email reorder' });
    const href = link.getAttribute('href') ?? '';
    expect(href.startsWith('mailto:?subject=')).toBe(true);
    const params = new URLSearchParams(href.slice('mailto:?'.length));
    expect(params.get('subject')).toBe('Reorder request: Amoxicillin 500 mg Capsules');
    expect(params.get('body')).toBe(
      'Medication: Amoxicillin 500 mg Capsules\nBrand: Amoxil\nSKU: AMX-500\nUsable stock: 12 caps\nReorder level: 40 caps\n\nPlease arrange a reorder.'
    );
    expect(href).not.toContain('0b7c2f4e');
    expect(link).toHaveAttribute('title', 'Opens an email draft to send to your supplier');
  });
});

describe('PharmacyInventory stock export (QA-270)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the items shown, with usable and expired stock, through the shared CSV helper', async () => {
    showInventory([
      item({ id: 'amox', sku: 'AMX-500', genericName: 'Amoxicillin', strength: '500 mg', stock: 40, expiredStock: 30, nextExpiryDate: '2027-08-01' }),
      item({ id: 'met', sku: 'MET-850', genericName: 'Metformin', stock: 5, reorderPoint: 50, status: 'low' }),
    ]);
    renderInventory();

    await userEvent.click(screen.getByRole('button', { name: /^Expired \(1\)/ }));
    await userEvent.click(screen.getByRole('button', { name: /Export Stock Report/ }));

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [fileName, rows] = vi.mocked(downloadCsv).mock.calls[0];
    expect(fileName).toMatch(/^pharmacy-inventory-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(rows[0]).toEqual([
      'sku', 'generic_name', 'brand_name', 'strength', 'form', 'usable_stock', 'expired_stock',
      'unit', 'reorder_level', 'stock_status', 'expiring_soon', 'next_expiry', 'controlled',
    ]);
    // Only the item shown by the Expired filter, and no internal id.
    expect(rows.slice(1)).toEqual([
      ['AMX-500', 'Amoxicillin', '', '500 mg', 'Tablets', 40, 30, 'tabs', 20, 'in_stock', false, '2027-08-01', false],
    ]);
  });

  it('shows a plain message when the export fails, not the browser error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(downloadCsv).mockImplementation(() => {
      throw new Error('Failed to execute createObjectURL');
    });
    showInventory([item({ id: 'amox', genericName: 'Amoxicillin' })]);
    renderInventory();

    await userEvent.click(screen.getByRole('button', { name: /Export Stock Report/ }));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not create the export. Please try again.');
    expect(screen.queryByText(/createObjectURL/)).not.toBeInTheDocument();
    warn.mockRestore();
  });
});
