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
  paidAt: string | null = null
): PharmacyClaimLedgerItem =>
  ({
    id: `id-${externalRef}`,
    externalRef,
    payerName: 'Daman',
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
