import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
