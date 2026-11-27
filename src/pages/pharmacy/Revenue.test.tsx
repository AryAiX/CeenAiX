// The browser here is NOT in Dubai (and west of UTC): Revenue days and months are Dubai days.
process.env.TZ = 'America/New_York';

import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PharmacyClaimLedgerItem } from '../../hooks';
import i18n from '../../i18n';

vi.mock('../../components/OpsShell', () => ({
  OpsShell: ({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) => (
    <div>
      <header data-testid="shell-header">
        <span>{title}</span>
        <span>{subtitle}</span>
      </header>
      {children}
    </div>
  ),
}));
vi.mock('../../hooks', () => ({ usePharmacyPrescriptionQueue: vi.fn(), usePharmacyUnreadMessages: vi.fn() }));

import { usePharmacyPrescriptionQueue } from '../../hooks';
import { PharmacyRevenue } from './Revenue';

const claim = (
  externalRef: string,
  status: PharmacyClaimLedgerItem['status'],
  amountAed: number,
  paidAt: string | null = null,
  payerName = 'Daman'
): PharmacyClaimLedgerItem =>
  ({
    id: `id-${externalRef}`,
    externalRef,
    payerName,
    amountAed,
    status,
    submittedAt: '2026-11-01T08:00:00Z',
    paidAt,
    patientName: 'Test Patient',
    medication: 'Amoxicillin',
  }) as PharmacyClaimLedgerItem;

const claims: PharmacyClaimLedgerItem[] = [
  // 27 Nov 2026 01:00 in Dubai, still 26 Nov in New York and UTC.
  claim('CLM-1', 'paid', 100, '2026-11-26T21:00:00Z'),
  claim('CLM-2', 'paid', 200, '2026-11-26T10:00:00Z'),
  claim('CLM-3', 'paid', 900, '2026-10-15T10:00:00Z'),
  claim('CLM-4', 'pending', 120),
  claim('CLM-5', 'review', 80),
  claim('CLM-6', 'denied', 70),
];

const normalize = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
const card = (label: string) => normalize(screen.getByRole('article', { name: label }).textContent);

const renderPage = () =>
  render(
    <MemoryRouter>
      <PharmacyRevenue />
    </MemoryRouter>
  );

describe('PharmacyRevenue figures (QA-279)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    // 27 Nov 2026 01:30 in Dubai.
    vi.setSystemTime(new Date('2026-11-26T21:30:00.000Z'));
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
      data: { claims, profile: { displayName: 'QA Test Pharmacy' }, organization: null, lowStockAlerts: 0 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('en');
  });

  it('shows paid today, paid this month, outstanding and denied from the claims', () => {
    renderPage();
    expect(card('Paid Today')).toMatch(/AED\s?100/);
    expect(card('Paid Today')).toContain('1 claim paid today');
    expect(card('Paid This Month')).toMatch(/AED\s?300/);
    expect(card('Paid This Month')).toMatch(/Average paid claim: AED\s?150/);
    expect(card('Outstanding')).toMatch(/AED\s?200/);
    expect(card('Outstanding')).toContain('2 claims · 1 in review');
    expect(card('Denied')).toMatch(/AED\s?70/);
    expect(card('Denied')).toContain('1 claim');
  });

  it('does not make the figure cards links', () => {
    renderPage();
    for (const label of ['Paid Today', 'Paid This Month', 'Outstanding', 'Denied']) {
      expect(within(screen.getByRole('article', { name: label })).queryByRole('link')).toBeNull();
      expect(screen.queryByRole('link', { name: new RegExp(label, 'i') })).toBeNull();
    }
  });

  it('says when nothing was paid this month', () => {
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
      data: { claims: [claim('CLM-4', 'pending', 120)], profile: null, organization: null, lowStockAlerts: 0 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    renderPage();
    expect(card('Paid This Month')).toContain('No claims paid this month');
    expect(card('Paid Today')).toContain('0 claims paid today');
  });

  it('shows the figures in Arabic', async () => {
    await i18n.changeLanguage('ar');
    renderPage();
    expect(card('المدفوع اليوم')).toContain('مطالبة واحدة مدفوعة اليوم');
    expect(card('المستحق')).toContain('مطالبتان');
    expect(card('المرفوض')).toContain('مطالبة واحدة');
    expect(card('المدفوع هذا الشهر')).toContain('متوسط المطالبة المدفوعة');
  });
});

describe('PharmacyRevenue by payer (QA-280)', () => {
  const setClaims = (list: PharmacyClaimLedgerItem[]) =>
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
      data: { claims: list, profile: null, organization: null, lowStockAlerts: 0 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  const payerRows = () =>
    screen.getAllByTestId('payer-row').map((row) => ({
      text: normalize(row.textContent),
      paid: (within(row).getByTestId('payer-bar-paid') as HTMLElement).style.width,
      outstanding: (within(row).getByTestId('payer-bar-outstanding') as HTMLElement).style.width,
    }));

  it('sizes the bars by money, not by number of claims, and leaves denied claims out', () => {
    setClaims([
      // Daman: three small paid claims. AXA: one big paid claim, one in review, one big denied claim.
      claim('D-1', 'paid', 50, '2026-11-01T08:00:00Z', 'Daman'),
      claim('D-2', 'paid', 50, '2026-11-01T08:00:00Z', 'Daman'),
      claim('D-3', 'paid', 50, '2026-11-01T08:00:00Z', 'Daman'),
      claim('A-1', 'paid', 900, '2026-11-01T08:00:00Z', 'AXA'),
      claim('A-2', 'review', 100, null, 'AXA'),
      claim('A-3', 'denied', 5000, null, 'AXA'),
      claim('N-1', 'denied', 70, null, 'NAS'),
    ]);
    renderPage();
    const rows = payerRows();
    expect(rows).toHaveLength(2);
    expect(rows[0].text).toMatch(/^AXA\s?Paid: AED\s?900\s?Outstanding: AED\s?100$/);
    expect(rows[0].paid).toBe('90%');
    expect(rows[0].outstanding).toBe('10%');
    expect(rows[1].text).toMatch(/^Daman\s?Paid: AED\s?150$/);
    expect(rows[1].paid).toBe('15%');
    expect(rows[1].outstanding).toBe('0%');
    expect(screen.queryByText('NAS')).toBeNull();
  });

  it('says so when there is nothing paid or outstanding', () => {
    setClaims([claim('N-1', 'denied', 70, null, 'NAS')]);
    renderPage();
    expect(screen.getByText('No paid or outstanding claims yet.')).toBeInTheDocument();
    expect(screen.queryAllByTestId('payer-row')).toHaveLength(0);
  });

  it('shows the payer texts in Arabic', async () => {
    await i18n.changeLanguage('ar');
    setClaims([claim('A-2', 'review', 100, null, 'AXA')]);
    renderPage();
    expect(normalize(screen.getByTestId('payer-row').textContent)).toMatch(/المستحق:/);
  });
});
