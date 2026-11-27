// The browser here is NOT in Dubai (and west of UTC): "this month" is the Dubai month.
process.env.TZ = 'America/New_York';

import { act, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { mockScreen } from '../../test/phone-screen';

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
import { PharmacyReports } from './Reports';

type Task = {
  id: string;
  prescriptionId: string;
  medication: string;
  workflowStatus: 'new' | 'in_progress' | 'on_hold' | 'dispensed' | 'picked_up' | 'cancelled';
  receivedAt: string;
  patientName: string;
  prescriber: string;
  priority: string;
};

const task = (id: string, prescriptionId: string, workflowStatus: Task['workflowStatus'], extra: Partial<Task> = {}) => ({
  id,
  prescriptionId,
  externalRef: id,
  medication: 'Amoxicillin 500 mg',
  workflowStatus,
  isDispensed: workflowStatus === 'dispensed' || workflowStatus === 'picked_up',
  receivedAt: '2026-11-20T08:00:00Z',
  patientName: 'Test Patient',
  prescriber: 'Dr Test',
  priority: 'routine',
  ...extra,
});

const stockItem = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  stock: 10,
  expiredStock: 0,
  expiringSoon: false,
  status: 'healthy',
  isControlled: false,
  ...extra,
});

const showReports = (data: Record<string, unknown> = {}) =>
  vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
    data: {
      queue: [],
      inventory: [],
      claims: [],
      claimsInReview: 0,
      lowStockAlerts: 0,
      organization: { id: 'org-1', name: 'QA Pharmacy', notes: 'Free text notes about the pharmacy' },
      profile: { displayName: 'QA Test Pharmacy', licenseNumber: '', dhaConnected: false },
      // What the shared loader still builds (fixed on the Dashboard page): the Reports page must not show it.
      reportMetrics: {
        dispensingAccuracyPercent: 50,
        controlledCompliancePercent: 100,
        dhaSubmittedCount: 9,
        lastSubmittedLabel: 'Today',
      },
      ...data,
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as never);

const renderPage = () =>
  render(
    <MemoryRouter>
      <PharmacyReports />
    </MemoryRouter>
  );

describe('PharmacyReports DHA card (QA-285)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows no made-up compliance, accuracy or DHA submission figures', () => {
    showReports({
      queue: [task('t1', 'rx-1', 'dispensed'), task('t2', 'rx-2', 'new')],
      inventory: [
        stockItem('Warfarin 5 mg'),
        stockItem('Morphine 10 mg', { isControlled: true }),
        stockItem('Tramadol 50 mg', { isControlled: true, stock: 0 }),
      ],
    });
    renderPage();
    const page = document.body.textContent ?? '';
    expect(page).not.toMatch(/Compliant/);
    expect(page).not.toMatch(/compliance/i);
    expect(page).not.toMatch(/Dispensing accuracy/);
    expect(page).not.toMatch(/Submitted to DHA/);
    expect(page).not.toMatch(/Last submitted/);
    expect(page).not.toMatch(/pharmacy_dispensing_tasks/);
    expect(page).not.toContain('✅');
    expect(screen.getByRole('note')).toHaveTextContent('Submissions to DHA are not recorded in the portal');
    expect(within(screen.getByTestId('dha-dispensed')).getByText('1')).toBeInTheDocument();
    // Only real controlled items with stock (not "warfarin" by name).
    expect(within(screen.getByTestId('dha-controlled')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByTestId('dha-dha')).getByText('Not connected')).toBeInTheDocument();
  });

  it('shows the licence number only when it is on file, never the organization notes', () => {
    showReports();
    renderPage();
    const card = within(screen.getByRole('region', { name: 'DHA Reporting' }));
    expect(card.getByText(/Licence number not on file/)).toBeInTheDocument();
    expect(screen.queryByText(/Free text notes/)).toBeNull();
  });

  it('shows a licence number on file and a connected profile', () => {
    showReports({ profile: { displayName: 'QA Test Pharmacy', licenseNumber: 'DHA-P-12345', dhaConnected: true } });
    renderPage();
    const card = within(screen.getByRole('region', { name: 'DHA Reporting' }));
    expect(card.getByText('DHA-P-12345')).toBeInTheDocument();
    expect(within(screen.getByTestId('dha-dha')).getByText('Connected')).toBeInTheDocument();
  });

  it('shows the card in Arabic', async () => {
    await i18n.changeLanguage('ar');
    showReports();
    renderPage();
    expect(screen.getByRole('region', { name: 'التقارير إلى DHA' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('لا تُسجَّل الإرسالات إلى DHA');
  });
});

describe('PharmacyReports this month (QA-286)', () => {
  const card = (label: string) =>
    (screen.getByRole('article', { name: label }).textContent ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    // 1 Dec 2026 01:00 in Dubai; still 30 Nov in New York and UTC.
    vi.setSystemTime(new Date('2026-11-30T21:00:00.000Z'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('en');
  });

  const decemberInDubai = '2026-11-30T20:30:00Z'; // 1 Dec 00:30 in Dubai
  const november = '2026-11-15T08:00:00Z';

  it('counts the prescriptions received this Dubai month by their status now, not every prescription ever', () => {
    showReports({
      queue: [
        // Two medicines of one prescription: one dispensed, one cancelled -> dispensed.
        task('t1', 'rx-1', 'dispensed', { receivedAt: decemberInDubai }),
        task('t2', 'rx-1', 'cancelled', { receivedAt: decemberInDubai }),
        task('t3', 'rx-2', 'on_hold', { receivedAt: decemberInDubai }),
        task('t4', 'rx-3', 'new', { receivedAt: decemberInDubai }),
        // November (last month in Dubai): not counted.
        task('t5', 'rx-4', 'picked_up', { receivedAt: november }),
        task('t6', 'rx-5', 'on_hold', { receivedAt: november }),
      ],
    });
    renderPage();
    expect(card('Prescriptions this month')).toBe('3Prescriptions this monthReceived in December 2026');
    expect(card('Dispensed')).toContain('1');
    expect(card('On hold')).toContain('1');
  });

  it('works out the insurance approval rate from paid and denied claims', () => {
    showReports({
      claims: [
        { id: 'c1', status: 'paid' },
        { id: 'c2', status: 'paid' },
        { id: 'c3', status: 'paid' },
        { id: 'c4', status: 'denied' },
        { id: 'c5', status: 'review' },
        { id: 'c6', status: 'pending' },
      ],
    });
    renderPage();
    expect(card('Insurance approval rate')).toBe('75%Insurance approval rateAll claims: 3 paid · 1 denied');
  });

  it('shows no rate (instead of 100%) when no claim has been decided', () => {
    showReports({ claims: [{ id: 'c5', status: 'review' }] });
    renderPage();
    expect(card('Insurance approval rate')).toBe('—Insurance approval rateNo decided claims yet');
  });

  it('does not make the cards links', () => {
    showReports();
    renderPage();
    expect(screen.getAllByRole('article', { name: /./ }).filter((el) => el.closest('a'))).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('shows the cards in Arabic', async () => {
    await i18n.changeLanguage('ar');
    showReports({ claims: [{ id: 'c1', status: 'paid' }] });
    renderPage();
    expect(card('الوصفات هذا الشهر')).toContain('المستلمة في');
    expect(card('نسبة موافقة التأمين')).toContain('كل المطالبات');
  });
});

describe('PharmacyReports status chart and top medicines (QA-287)', () => {
  const decemberInDubai = '2026-11-30T20:30:00Z'; // 1 Dec 00:30 in Dubai
  const november = '2026-11-15T08:00:00Z';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    // 1 Dec 2026 01:00 in Dubai.
    vi.setSystemTime(new Date('2026-11-30T21:00:00.000Z'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('en');
  });

  const row = (key: string) => (screen.getByTestId(`status-${key}`).textContent ?? '').replace(/\s+/g, ' ').trim();

  it('shows this month\'s prescriptions by status on one scale, without claims, cancelled apart', () => {
    showReports({
      claimsInReview: 7,
      queue: [
        task('t1', 'rx-1', 'dispensed', { receivedAt: decemberInDubai }),
        task('t2', 'rx-2', 'picked_up', { receivedAt: decemberInDubai }),
        task('t3', 'rx-3', 'new', { receivedAt: decemberInDubai }),
        task('t4', 'rx-4', 'cancelled', { receivedAt: decemberInDubai }),
        task('t5', 'rx-5', 'new', { receivedAt: november }),
      ],
    });
    renderPage();
    expect(row('dispensed')).toBe('Dispensed or picked up2');
    expect(row('open')).toBe('New or in progress1');
    expect(row('on-hold')).toBe('On hold0');
    expect(row('cancelled')).toBe('Cancelled1');
    expect((screen.getByTestId('status-bar-dispensed') as HTMLElement).style.width).toBe('50%');
    expect(screen.queryByText('Claims in review')).toBeNull();
  });

  it('lists only dispensed medicines of this month, with their strength, most often first', () => {
    showReports({
      queue: [
        task('t1', 'rx-1', 'dispensed', { receivedAt: decemberInDubai, medication: 'Metformin 500 mg' }),
        task('t2', 'rx-2', 'picked_up', { receivedAt: decemberInDubai, medication: 'Metformin 500 mg' }),
        task('t3', 'rx-3', 'dispensed', { receivedAt: decemberInDubai, medication: 'Metformin 850 mg' }),
        // Not dispensed, cancelled, or last month: left out.
        task('t4', 'rx-4', 'new', { receivedAt: decemberInDubai, medication: 'Ibuprofen 400 mg' }),
        task('t5', 'rx-5', 'cancelled', { receivedAt: decemberInDubai, medication: 'Ibuprofen 400 mg' }),
        task('t6', 'rx-6', 'dispensed', { receivedAt: november, medication: 'Atorvastatin 20 mg' }),
      ],
    });
    renderPage();
    const rows = screen.getAllByTestId('top-medicine').map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(rows).toEqual(['Metformin 500 mg2', 'Metformin 850 mg1']);
  });

  it('says when nothing was dispensed this month', () => {
    showReports({ queue: [task('t4', 'rx-4', 'new', { receivedAt: decemberInDubai })] });
    renderPage();
    expect(screen.getByText('No medicines dispensed this month yet.')).toBeInTheDocument();
  });

  it('shows the chart texts in Arabic', async () => {
    await i18n.changeLanguage('ar');
    showReports();
    renderPage();
    expect(screen.getByText('وصفات هذا الشهر حسب الحالة')).toBeInTheDocument();
    expect(screen.getByText('أكثر الأدوية صرفاً هذا الشهر')).toBeInTheDocument();
  });
});

describe('PharmacyReports inventory risk (QA-288)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  const tile = (key: string) => (screen.getByTestId(`risk-${key}`).textContent ?? '').replace(/\s+/g, ' ').trim();

  it('counts like the Inventory figures: an item can be low and expiring, and expired stock is shown', () => {
    showReports({
      inventory: [
        stockItem('healthy', { stock: 100, reorderPoint: 20 }),
        // Low and expiring soon (the loader calls it "low", so the old page did not count it as expiring).
        stockItem('low-expiring', { stock: 15, reorderPoint: 20, status: 'low', expiringSoon: true }),
        // Critical, with expired units on the shelf.
        stockItem('critical-expired', { stock: 5, reorderPoint: 20, status: 'low', expiredStock: 30 }),
        // Out of usable stock (only expired units left).
        stockItem('out', { stock: 0, reorderPoint: 20, status: 'out', expiredStock: 4 }),
        // In stock and expiring soon (the loader calls it "near_expiry").
        stockItem('expiring', { stock: 60, reorderPoint: 20, status: 'near_expiry', expiringSoon: true }),
      ],
    });
    renderPage();
    expect(tile('in-stock')).toBe('In Stock2');
    expect(tile('low')).toBe('Low / Critical2');
    expect(tile('out')).toBe('Out of Stock1');
    expect(tile('expiring')).toBe('Expiring Soon2');
    expect(tile('expired')).toBe('Expired Stock2');
  });

  it('shows the same names as Inventory in Arabic', async () => {
    await i18n.changeLanguage('ar');
    showReports({ inventory: [stockItem('healthy', { stock: 100, reorderPoint: 20 })] });
    renderPage();
    expect(tile('expired')).toContain(i18n.t('pharmacy.inventory.kpi.expired'));
    expect(tile('in-stock')).toContain(i18n.t('pharmacy.inventory.kpi.inStock'));
  });
});

describe('PharmacyReports exports (QA-289)', () => {
  const PRESCRIPTION = '1a2b3c4d-1111-2222-3333-444455556666';
  const decemberInDubai = '2026-11-30T20:30:00Z'; // 1 Dec 00:30 in Dubai
  const november = '2026-11-15T08:00:00Z';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    // 1 Dec 2026 01:00 in Dubai; still 30 Nov in New York and UTC.
    vi.setSystemTime(new Date('2026-11-30T21:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const click = (name: RegExp) => act(() => screen.getByRole('button', { name }).click());

  it('exports this Dubai month\'s dispensing through the shared CSV helper, with prescription references and Dubai times', () => {
    showReports({
      queue: [
        task('t1', PRESCRIPTION, 'dispensed', { receivedAt: decemberInDubai, patientName: 'مريم' }),
        task('t2', 'rx-old', 'dispensed', { receivedAt: november }),
      ],
    });
    renderPage();
    click(/Export This Month/);
    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [fileName, rows] = vi.mocked(downloadCsv).mock.calls[0];
    expect(fileName).toBe('pharmacy-dispensing-2026-12.csv');
    expect(rows).toEqual([
      ['prescription', 'medicine', 'patient_name', 'prescriber', 'status', 'received_at_dubai', 'priority'],
      ['RX-1A2B3C4D', 'Amoxicillin 500 mg', 'مريم', 'Dr Test', 'dispensed', '2026-12-01 00:30', 'routine'],
    ]);
  });

  it('cannot export the dispensing file when nothing was received this month', () => {
    showReports({ queue: [task('t2', 'rx-old', 'dispensed', { receivedAt: november })] });
    renderPage();
    expect(screen.getByRole('button', { name: /Export This Month/ })).toBeDisabled();
  });

  it('exports a monthly summary CSV that says it is not a DHA submission (no "DHA Monthly Report" .txt)', () => {
    showReports({
      queue: [task('t1', PRESCRIPTION, 'dispensed', { receivedAt: decemberInDubai })],
      claims: [{ id: 'c1', status: 'paid' }, { id: 'c2', status: 'denied' }],
      profile: { displayName: 'QA Test Pharmacy', licenseNumber: 'DHA-P-1', dhaConnected: false },
    });
    renderPage();
    expect(screen.queryByRole('button', { name: /DHA Monthly Report/ })).toBeNull();
    click(/Monthly Summary \(CSV\)/);
    const [fileName, rows] = vi.mocked(downloadCsv).mock.calls[0];
    expect(fileName).toBe('pharmacy-monthly-summary-2026-12.csv');
    expect(rows).toEqual([
      ['item', 'value'],
      ['month', '2026-12'],
      ['pharmacy', 'QA Test Pharmacy'],
      ['licence_number', 'DHA-P-1'],
      ['prescriptions_received', 1],
      ['dispensed_or_picked_up', 1],
      ['new_or_in_progress', 0],
      ['on_hold', 0],
      ['cancelled', 0],
      ['controlled_items_in_stock', 0],
      ['claims_paid_all_time', 1],
      ['claims_denied_all_time', 1],
      ['insurance_approval_rate_percent', 50],
      ['note', 'Summary from the CeenAiX portal. Not a DHA submission.'],
    ]);
  });

  it('shows a plain message when an export fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(downloadCsv).mockImplementation(() => {
      throw new Error('Failed to execute createObjectURL');
    });
    showReports();
    renderPage();
    click(/Monthly Summary/);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not create the export. Please try again.');
    expect(screen.queryByText(/createObjectURL/)).toBeNull();
    warn.mockRestore();
  });
});

describe('PharmacyReports header and phone (QA-290)', () => {
  let restoreScreen: () => void = () => undefined;
  const decemberInDubai = '2026-11-30T20:30:00Z'; // 1 Dec 00:30 in Dubai

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    // 1 Dec 2026 01:00 in Dubai; still November in New York and UTC.
    vi.setSystemTime(new Date('2026-11-30T21:00:00.000Z'));
  });

  afterEach(async () => {
    restoreScreen();
    vi.useRealTimers();
    await i18n.changeLanguage('en');
  });

  it('shows the Dubai month and the pharmacy once, in the top bar', () => {
    showReports();
    renderPage();
    const header = (screen.getByTestId('shell-header').textContent ?? '').replace(/\s+/g, ' ');
    expect(header).toContain('December 2026 · QA Test Pharmacy');
    expect(header).not.toMatch(/Live analytics/);
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(screen.queryByText('Reports & Analytics')).toBeNull();
  });

  it('shows the month in Arabic', async () => {
    await i18n.changeLanguage('ar');
    showReports();
    renderPage();
    expect(screen.getByTestId('shell-header')).toHaveTextContent('ديسمبر');
  });

  it('on a phone, shows the full medicine name with its count, and the bar under it', () => {
    restoreScreen = mockScreen(true);
    showReports({
      queue: [
        task('t1', 'rx-1', 'dispensed', { receivedAt: decemberInDubai, medication: 'Amoxicillin and clavulanic acid 875 mg / 125 mg' }),
      ],
    });
    renderPage();
    const row = screen.getByTestId('top-medicine');
    expect(row.className).not.toMatch(/grid-cols-\[140px/);
    expect(within(row).getByText('Amoxicillin and clavulanic acid 875 mg / 125 mg').className).not.toMatch(/truncate/);
  });
});
