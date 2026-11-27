// The browser here is NOT in Dubai (and west of UTC): Revenue days and months are Dubai days.
process.env.TZ = 'America/New_York';

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
vi.mock('../../lib/csv-export', () => ({ downloadCsv: vi.fn() }));

import { usePharmacyPrescriptionQueue } from '../../hooks';
import { downloadCsv } from '../../lib/csv-export';
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
    prescriptionId: null,
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

describe('PharmacyRevenue ledger (QA-281)', () => {
  const PRESCRIPTION = '1a2b3c4d-1111-2222-3333-444455556666';
  const setClaims = (list: PharmacyClaimLedgerItem[]) =>
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
      data: { claims: list, profile: null, organization: null, lowStockAlerts: 0 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  const linked: PharmacyClaimLedgerItem = {
    ...claim('CLM-1', 'paid', 45, '2026-11-26T21:00:00Z'),
    prescriptionId: PRESCRIPTION,
    // 26 Nov 2026 01:30 in Dubai, still 25 Nov in New York.
    submittedAt: '2026-11-25T21:30:00Z',
  };
  const unlinked: PharmacyClaimLedgerItem = {
    ...claim('CLM-2', 'review', 20, null, 'AXA'),
    patientName: null,
    medication: null,
    submittedAt: '2026-11-20T08:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows the Dubai submitted date, a plain subtitle, and "Not linked" instead of made-up names', () => {
    setClaims([linked, unlinked]);
    renderPage();
    expect(screen.getByText('Insurance claims, newest first')).toBeInTheDocument();
    expect(screen.queryByText(/pharmacy_claims/)).toBeNull();
    const [first, second] = screen.getAllByTestId('ledger-row').map((row) => normalize(row.textContent));
    expect(first).toContain('Submitted Nov 26, 2026');
    expect(second).toContain('Not linked to a prescription');
    expect(second).not.toContain('Linked dispensing task');
    expect(second).not.toContain('CLM-2 ·');
    expect(second).toContain('In review');
  });

  it('"View" opens the claim details under its row, with dates, and closes again', async () => {
    const user = userEvent.setup();
    setClaims([linked, unlinked]);
    renderPage();
    const viewButton = screen.getByRole('button', { name: 'View claim CLM-1' });
    expect(viewButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(viewButton);
    const details = screen.getByTestId('claim-details');
    const text = normalize(details.textContent);
    expect(text).toContain('Claim referenceCLM-1');
    expect(text).toContain('PrescriptionRX-1A2B3C4D');
    expect(text).toContain('PatientTest Patient');
    expect(text).toContain('MedicineAmoxicillin');
    expect(text).toContain('SubmittedNov 26, 2026 · 01:30');
    expect(text).toContain('PaidNov 27, 2026 · 01:00');
    expect(within(screen.getAllByTestId('ledger-row')[0]).getByTestId('claim-details')).toBe(details);
    const hideButton = screen.getByRole('button', { name: 'Hide claim CLM-1' });
    expect(hideButton).toHaveAttribute('aria-expanded', 'true');
    await user.click(hideButton);
    expect(screen.queryByTestId('claim-details')).toBeNull();
  });

  it('shows "Not paid" and "Not linked" in the details of an unlinked claim', async () => {
    const user = userEvent.setup();
    setClaims([unlinked]);
    renderPage();
    await user.click(screen.getByRole('button', { name: 'View claim CLM-2' }));
    const text = normalize(screen.getByTestId('claim-details').textContent);
    expect(text).toContain('PrescriptionNot linked to a prescription');
    expect(text).toContain('PatientNot recorded');
    expect(text).toContain('PaidNot paid');
  });

  it('translates "Show more" with the number left', async () => {
    const user = userEvent.setup();
    setClaims(Array.from({ length: 11 }, (_, index) => claim(`CLM-${index + 1}`, 'pending', 10)));
    renderPage();
    expect(screen.getAllByTestId('ledger-row')).toHaveLength(8);
    await i18n.changeLanguage('ar');
    expect(await screen.findByRole('button', { name: 'عرض المزيد (٣ متبقية)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'عرض المزيد (٣ متبقية)' }));
    expect(screen.getAllByTestId('ledger-row')).toHaveLength(11);
  });
});

describe('PharmacyRevenue export (QA-282)', () => {
  const PRESCRIPTION = '1a2b3c4d-1111-2222-3333-444455556666';
  const setClaims = (list: PharmacyClaimLedgerItem[]) =>
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
      data: { claims: list, profile: null, organization: null, lowStockAlerts: 0 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    // 27 Nov 2026 01:30 in Dubai, still 26 Nov in New York and UTC.
    vi.setSystemTime(new Date('2026-11-26T21:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports through the shared CSV helper, with the prescription and Dubai dates, and a Dubai file date', async () => {
    setClaims([
      {
        ...claim('CLM-1', 'paid', 45, '2026-11-26T21:00:00Z'),
        prescriptionId: PRESCRIPTION,
        submittedAt: '2026-11-25T21:30:00Z',
        patientName: '=HYPERLINK("x")',
      },
      { ...claim('CLM-2', 'pending', 20, null, 'AXA'), patientName: null, medication: null, submittedAt: null },
    ]);
    renderPage();
    act(() => screen.getByRole('button', { name: /Export Revenue Report/ }).click());

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [fileName, rows] = vi.mocked(downloadCsv).mock.calls[0];
    expect(fileName).toBe('pharmacy-revenue-2026-11-27.csv');
    expect(rows).toEqual([
      [
        'claim_reference', 'prescription', 'patient_name', 'medication', 'payer',
        'amount_aed', 'status', 'submitted_at_dubai', 'paid_at_dubai',
      ],
      // The helper itself makes a cell starting with "=" safe (see csv-export.test.ts).
      ['CLM-1', 'RX-1A2B3C4D', '=HYPERLINK("x")', 'Amoxicillin', 'Daman', 45, 'paid', '2026-11-26 01:30', '2026-11-27 01:00'],
      ['CLM-2', '', null, null, 'AXA', 20, 'pending', '', ''],
    ]);
  });

  it('shows a plain message when the export fails, not the browser error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(downloadCsv).mockImplementation(() => {
      throw new Error('Failed to execute createObjectURL');
    });
    setClaims([claim('CLM-1', 'paid', 45, '2026-11-26T21:00:00Z')]);
    renderPage();
    act(() => screen.getByRole('button', { name: /Export Revenue Report/ }).click());
    expect(screen.getByRole('alert')).toHaveTextContent('Could not create the export. Please try again.');
    expect(screen.queryByText(/createObjectURL/)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('cannot export when there are no claims', () => {
    setClaims([]);
    renderPage();
    expect(screen.getByRole('button', { name: /Export Revenue Report/ })).toBeDisabled();
    expect(screen.getByText('No claims yet.')).toBeInTheDocument();
  });
});

describe('PharmacyRevenue header (QA-283)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    // 27 Nov 2026 01:30 in Dubai, still 26 Nov in New York.
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

  it('shows the Dubai date and says the page counts insurance claims, once, in the top bar', () => {
    renderPage();
    const header = normalize(screen.getByTestId('shell-header').textContent);
    expect(header).toContain('Insurance claims and payments · QA Test Pharmacy · Nov 27, 2026');
    expect(header).not.toMatch(/dispensing revenue/i);
    expect(screen.queryByRole('heading', { level: 2, name: 'Revenue' })).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent(
      'Shows insurance claims only. Cash sales and copays are not recorded in the portal yet.'
    );
  });

  it('shows the header in Arabic', async () => {
    await i18n.changeLanguage('ar');
    renderPage();
    expect(normalize(screen.getByTestId('shell-header').textContent)).toContain('مطالبات التأمين والمدفوعات · QA Test Pharmacy');
    expect(screen.getByRole('note')).toHaveTextContent('مطالبات التأمين فقط');
  });
});
