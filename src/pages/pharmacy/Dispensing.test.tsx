import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import type { PharmacyQueuePrescriptionItem } from '../../hooks';

vi.mock('../../components/OpsShell', () => ({
  OpsShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../lib/auth-context', () => ({ useAuth: () => ({ user: { id: 'pharmacist-1' } }) }));
vi.mock('../../hooks', () => ({
  usePharmacyPrescriptionQueue: vi.fn(),
  updatePharmacyDispensingTaskStatus: vi.fn(),
  sendPharmacyHoldNotificationAndMessage: vi.fn(),
}));

import {
  updatePharmacyDispensingTaskStatus,
  usePharmacyPrescriptionQueue,
} from '../../hooks';
import { PharmacyDispensing } from './Dispensing';

const PRESCRIPTION = '1a2b3c4d-1111-2222-3333-444455556666';

const task = (
  overrides: Partial<PharmacyQueuePrescriptionItem> & Pick<PharmacyQueuePrescriptionItem, 'id' | 'medication'>
): PharmacyQueuePrescriptionItem => ({
  prescriptionId: PRESCRIPTION,
  externalRef: `rx-${PRESCRIPTION}-item-${overrides.id}`,
  patientName: 'Test Patient',
  prescriber: 'Dr Test',
  priority: 'routine',
  status: 'verifying',
  workflowStatus: 'new',
  waitMinutes: 5,
  quantity: 10,
  isDispensed: false,
  insuranceProvider: 'Cash',
  copayAed: 0,
  receivedAt: '2026-11-25T08:00:00.000Z',
  allergyFlag: false,
  assignedTo: null,
  patientUserId: 'patient-1',
  ...overrides,
});

const showQueue = (queue: PharmacyQueuePrescriptionItem[]) => {
  vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
    data: { queue, profile: null, organization: null, lowStockAlerts: 0 },
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as never);
};

const renderPage = (path = '/pharmacy/dispensing') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PharmacyDispensing />
    </MemoryRouter>
  );

const rowFor = (patientText: string) => {
  const cell = screen.getByText(patientText);
  const row = cell.closest('.grid');
  if (!row) throw new Error('row not found');
  return row as HTMLElement;
};

describe('PharmacyDispensing prescriptions with several medicines (QA-251)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updatePharmacyDispensingTaskStatus).mockResolvedValue(undefined);
  });

  it('shows one row per prescription and moves on only the medicines still open', async () => {
    showQueue([
      task({ id: 'task-done', medication: 'Amoxicillin', workflowStatus: 'dispensed', isDispensed: true }),
      task({ id: 'task-open', medication: 'Paracetamol' }),
    ]);
    renderPage();

    expect(screen.getAllByText('Test Patient')).toHaveLength(1);
    const row = rowFor('Test Patient');
    expect(within(row).getByText('Amoxicillin, Paracetamol')).toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', { name: 'Start' }));

    expect(updatePharmacyDispensingTaskStatus).toHaveBeenCalledTimes(1);
    expect(updatePharmacyDispensingTaskStatus).toHaveBeenCalledWith('task-open', 'in_progress');
  });

  it('does not treat a prescription as cancelled while another medicine still needs dispensing', () => {
    showQueue([
      task({ id: 'task-cancelled', medication: 'Amoxicillin', workflowStatus: 'cancelled' }),
      task({ id: 'task-new', medication: 'Paracetamol' }),
    ]);
    renderPage();

    const row = rowFor('Test Patient');
    expect(within(row).getByText('NEW')).toBeInTheDocument();
    expect(within(row).queryByText('CANCELLED')).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('shows the reference once, without a second RX-', () => {
    showQueue([
      task({ id: 'task-1', medication: 'Amoxicillin' }),
      task({
        id: 'task-demo',
        medication: 'Atorvastatin',
        patientName: 'Demo Patient',
        prescriptionId: 'RX-ATO-20',
        externalRef: 'RX-ATO-20',
      }),
    ]);
    renderPage();

    expect(within(rowFor('Test Patient')).getByText('RX-1A2B3C4D')).toBeInTheDocument();
    expect(within(rowFor('Demo Patient')).getByText('RX-ATO-20')).toBeInTheDocument();
    expect(screen.queryByText(/RX-RX-/)).not.toBeInTheDocument();
  });

  it('still finds the prescription from a link that uses one medicine reference', () => {
    showQueue([
      task({ id: 'task-1', medication: 'Amoxicillin' }),
      task({ id: 'task-2', medication: 'Paracetamol' }),
      task({ id: 'task-other', medication: 'Ibuprofen', patientName: 'Other Patient', prescriptionId: 'other-rx' }),
    ]);
    renderPage(`/pharmacy/dispensing?id=rx-${PRESCRIPTION}-item-task-2`);

    expect(screen.getByText('Test Patient')).toBeInTheDocument();
    expect(screen.queryByText('Other Patient')).not.toBeInTheDocument();
  });
});

describe('PharmacyDispensing marking a prescription as dispensed (QA-252)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updatePharmacyDispensingTaskStatus).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  const inProgressQueue = () => [
    task({ id: 'task-done', medication: 'Amoxicillin', workflowStatus: 'dispensed', isDispensed: true }),
    task({ id: 'task-a', medication: 'Paracetamol', workflowStatus: 'in_progress', quantity: 20 }),
    task({ id: 'task-b', medication: 'Ibuprofen', workflowStatus: 'in_progress', quantity: null }),
  ];

  it('calls the buttons what they do: Start a new prescription, Mark as dispensed one in progress', () => {
    showQueue([
      task({ id: 'task-new', medication: 'Amoxicillin' }),
      task({ id: 'task-wip', medication: 'Paracetamol', patientName: 'Second Patient', prescriptionId: 'rx-2', workflowStatus: 'in_progress' }),
    ]);
    renderPage();

    expect(within(rowFor('Test Patient')).getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(within(rowFor('Second Patient')).getByRole('button', { name: 'Mark as dispensed' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Dispense|Continue)$/ })).not.toBeInTheDocument();
  });

  it('asks for confirmation first, listing the medicines still to dispense with their quantity', async () => {
    showQueue(inProgressQueue());
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'Mark as dispensed' }));

    const dialog = screen.getByRole('dialog', { name: 'Mark as dispensed?' });
    expect(updatePharmacyDispensingTaskStatus).not.toHaveBeenCalled();
    const items = within(dialog).getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual(['ParacetamolQty 20', 'IbuprofenQty not given']);
    expect(within(dialog).getByText(/ready for pickup/)).toBeInTheDocument();
  });

  it('marks only the open medicines as dispensed after confirming', async () => {
    showQueue(inProgressQueue());
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'Mark as dispensed' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm dispensed' }));

    expect(updatePharmacyDispensingTaskStatus).toHaveBeenCalledTimes(2);
    expect(updatePharmacyDispensingTaskStatus).toHaveBeenCalledWith('task-a', 'dispensed');
    expect(updatePharmacyDispensingTaskStatus).toHaveBeenCalledWith('task-b', 'dispensed');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('changes nothing when the pharmacist cancels or presses Escape', async () => {
    showQueue(inProgressQueue());
    renderPage();
    const button = within(rowFor('Test Patient')).getByRole('button', { name: 'Mark as dispensed' });

    await userEvent.click(button);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(button);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(updatePharmacyDispensingTaskStatus).not.toHaveBeenCalled();
  });

  it('shows the buttons and the confirmation in Arabic', async () => {
    await i18n.changeLanguage('ar');
    showQueue(inProgressQueue());
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'تأكيد الصرف' }));

    const dialog = screen.getByRole('dialog', { name: 'تأكيد صرف الوصفة؟' });
    expect(within(dialog).getByRole('button', { name: 'نعم، تم الصرف' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'إلغاء' })).toBeInTheDocument();
    expect(within(dialog).getByText('الكمية ٢٠')).toBeInTheDocument();
  });
});
