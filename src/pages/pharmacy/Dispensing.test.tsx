import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { formatLocaleCurrency } from '../../lib/i18n-ui';
import { mockScreen } from '../../test/phone-screen';
import type { PharmacyQueuePrescriptionItem } from '../../hooks';

vi.mock('../../components/OpsShell', () => ({
  OpsShell: ({
    children,
    title,
    subtitle,
    navItems,
  }: {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    navItems?: Array<{ href: string; badge?: number }>;
  }) => (
    <div>
      <header data-testid="shell-header">
        <span>{title}</span>
        <span>{subtitle}</span>
      </header>
      <nav hidden>
        {navItems?.map((item) => (
          <span key={item.href} data-testid={`badge-${item.href}`}>
            {item.badge ?? ''}
          </span>
        ))}
      </nav>
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

import {
  fetchPharmacyPrescriptionDetails,
  PharmacyTaskChangeNotAllowedError,
  sendPharmacyHoldNotificationAndMessage,
  updatePharmacyDispensingTaskStatus,
  usePharmacyPrescriptionQueue,
  usePharmacyUnreadMessages,
} from '../../hooks';
import { PharmacyDispensing } from './Dispensing';

const PRESCRIPTION = '1a2b3c4d-1111-2222-3333-444455556666';

const task = (
  overrides: Partial<PharmacyQueuePrescriptionItem> & Pick<PharmacyQueuePrescriptionItem, 'id' | 'medication'>
): PharmacyQueuePrescriptionItem => ({
  prescriptionId: PRESCRIPTION,
  externalRef: `rx-${PRESCRIPTION}-item-${overrides.id}`,
  prescriptionItemId: `item-${overrides.id}`,
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

describe('PharmacyDispensing prescription details (QA-253)', () => {
  const vocab = [
    { category: 'frequency', code: 'tid', label_en: 'Three times a day', label_ar: 'ثلاث مرات يومياً', legacy_match: null },
    { category: 'duration', code: 'd7', label_en: '7 days', label_ar: '٧ أيام', legacy_match: null },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPharmacyPrescriptionDetails).mockResolvedValue({
      items: [
        {
          id: 'item-task-a',
          medicationName: 'Amoxicillin 500 mg',
          medicationNameAr: 'أموكسيسيلين ٥٠٠ ملغ',
          dosage: '1 capsule',
          frequency: 'Three times a day',
          frequencyCode: 'tid',
          duration: '7 days',
          durationCode: 'd7',
          quantity: 21,
          instructions: 'Take after food',
        },
      ],
      vocab,
    });
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  const queue = () => [
    task({ id: 'task-a', medication: 'Amoxicillin 500 mg', quantity: 21 }),
    task({ id: 'task-b', medication: 'Demo medicine', prescriptionItemId: null, quantity: null }),
  ];

  it('opens from every open row and shows what the doctor prescribed for each medicine', async () => {
    showQueue(queue());
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'Details' }));

    const dialog = await screen.findByRole('dialog', { name: 'Prescription details' });
    expect(fetchPharmacyPrescriptionDetails).toHaveBeenCalledWith(['item-task-a']);
    expect(await within(dialog).findByText('1 capsule')).toBeInTheDocument();
    expect(within(dialog).getByText('Three times a day')).toBeInTheDocument();
    expect(within(dialog).getByText('7 days')).toBeInTheDocument();
    expect(within(dialog).getByText('21')).toBeInTheDocument();
    expect(within(dialog).getByText('Take after food')).toBeInTheDocument();
    // A medicine without the doctor's line still shows, and says so.
    expect(within(dialog).getByText('Demo medicine')).toBeInTheDocument();
    expect(within(dialog).getByText("The doctor's details for this medicine are not linked.")).toBeInTheDocument();
    expect(updatePharmacyDispensingTaskStatus).not.toHaveBeenCalled();
  });

  it('opens the details from View on a picked up prescription (it did nothing before)', async () => {
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin 500 mg', workflowStatus: 'picked_up', isDispensed: true })]);
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'View' }));

    expect(await screen.findByRole('dialog', { name: 'Prescription details' })).toBeInTheDocument();
    expect(updatePharmacyDispensingTaskStatus).not.toHaveBeenCalled();
  });

  it('no longer shows a made-up DHA reference on a dispensed prescription', async () => {
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin 500 mg', workflowStatus: 'dispensed', isDispensed: true })]);
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'View' }));

    const dialog = await screen.findByRole('dialog', { name: 'Prescription details' });
    expect(within(dialog).queryByText(/DHA/)).not.toBeInTheDocument();
  });

  it('says plainly when the details cannot be loaded, and closes with Escape', async () => {
    vi.mocked(fetchPharmacyPrescriptionDetails).mockRejectedValueOnce(new Error('permission denied for table'));
    showQueue(queue());
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'Details' }));

    const dialog = await screen.findByRole('dialog', { name: 'Prescription details' });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not load the prescription details.');
    expect(within(dialog).queryByText(/permission denied/)).not.toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the details in Arabic, with the Arabic medicine name and labels', async () => {
    await i18n.changeLanguage('ar');
    showQueue(queue());
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'التفاصيل' }));

    const dialog = await screen.findByRole('dialog', { name: 'تفاصيل الوصفة' });
    expect(await within(dialog).findByText('أموكسيسيلين ٥٠٠ ملغ')).toBeInTheDocument();
    expect(within(dialog).getByText('ثلاث مرات يومياً')).toBeInTheDocument();
    expect(within(dialog).getByText('٧ أيام')).toBeInTheDocument();
    expect(within(dialog).getAllByText('عدد المرات')).toHaveLength(2);
    expect(within(dialog).getByText('٢١')).toBeInTheDocument();
  });
});

describe('PharmacyDispensing hold and errors told plainly (QA-254)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(updatePharmacyDispensingTaskStatus).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  const putOnHold = async () => {
    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'Hold' }));
    await userEvent.click(screen.getByRole('button', { name: /Out of Stock/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Hold' }));
  };

  it('puts the open medicines on hold and tells the patient, with no warning when both got through', async () => {
    vi.mocked(sendPharmacyHoldNotificationAndMessage).mockResolvedValue({ notified: true, messaged: true });
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin' })]);
    renderPage();

    await putOnHold();

    expect(updatePharmacyDispensingTaskStatus).toHaveBeenCalledWith('task-a', 'on_hold', {
      holdReasonCode: 'out_of_stock',
      holdNote: '',
    });
    expect(sendPharmacyHoldNotificationAndMessage).toHaveBeenCalledWith(
      expect.objectContaining({ taskIds: ['task-a'], patientUserId: 'patient-1', holdReasonLabel: 'Out of Stock' })
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says when the patient was notified but the message could not be sent', async () => {
    vi.mocked(sendPharmacyHoldNotificationAndMessage).mockResolvedValue({ notified: true, messaged: false });
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin' })]);
    renderPage();

    await putOnHold();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'The prescription is on hold and the patient was notified, but the message could not be sent.'
    );
  });

  it('says when the patient could not be told at all', async () => {
    vi.mocked(sendPharmacyHoldNotificationAndMessage).mockResolvedValue({ notified: false, messaged: false });
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin' })]);
    renderPage();

    await putOnHold();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'The prescription is on hold, but the patient could not be told. Please contact them directly.'
    );
  });

  it('says when the patient has no CeenAiX account to tell', async () => {
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin', patientUserId: null })]);
    renderPage();

    await putOnHold();

    expect(sendPharmacyHoldNotificationAndMessage).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('This patient has no CeenAiX account');
  });

  it('shows a plain, translated message instead of the database error when a status change fails', async () => {
    vi.mocked(updatePharmacyDispensingTaskStatus).mockRejectedValue(
      new Error('new row violates row-level security policy for table "pharmacy_dispensing_tasks"')
    );
    await i18n.changeLanguage('ar');
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin' })]);
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'بدء' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحديث الوصفة. يُرجى المحاولة مرة أخرى.');
    expect(screen.queryByText(/row-level security/)).not.toBeInTheDocument();
  });
});

describe('PharmacyDispensing refused changes (QA-255)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('says the change is not allowed and reloads the list when the database refuses it', async () => {
    const refetch = vi.fn();
    vi.mocked(updatePharmacyDispensingTaskStatus).mockRejectedValue(new PharmacyTaskChangeNotAllowedError('0 rows'));
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
      data: { queue: [task({ id: 'task-a', medication: 'Amoxicillin' })], profile: null, organization: null, lowStockAlerts: 0 },
      loading: false,
      error: null,
      refetch,
    } as never);
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'Start' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This change isn't allowed for this prescription. The list now shows what is saved."
    );
    expect(refetch).toHaveBeenCalled();
  });
});

describe('PharmacyDispensing handing medicines to the patient (QA-256)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updatePharmacyDispensingTaskStatus).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  const dispensedQueue = () => [
    task({ id: 'task-done', medication: 'Amoxicillin', workflowStatus: 'dispensed', isDispensed: true, quantity: 21 }),
    task({ id: 'task-picked', medication: 'Paracetamol', workflowStatus: 'picked_up', isDispensed: true }),
    task({ id: 'task-cancelled', medication: 'Ibuprofen', workflowStatus: 'cancelled' }),
  ];

  it('lets the pharmacy record the handover of the dispensed medicines, after confirming', async () => {
    showQueue(dispensedQueue());
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'Handed to patient' }));

    const dialog = screen.getByRole('dialog', { name: 'Handed to the patient?' });
    expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['AmoxicillinQty 21']);
    expect(updatePharmacyDispensingTaskStatus).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm handover' }));

    expect(updatePharmacyDispensingTaskStatus).toHaveBeenCalledTimes(1);
    expect(updatePharmacyDispensingTaskStatus).toHaveBeenCalledWith('task-done', 'picked_up');
  });

  it('does not offer a handover before the medicines are dispensed, or after they are picked up', () => {
    showQueue([
      task({ id: 'task-new', medication: 'Amoxicillin' }),
      task({ id: 'task-picked', medication: 'Paracetamol', patientName: 'Picked Patient', prescriptionId: 'rx-2', workflowStatus: 'picked_up', isDispensed: true }),
    ]);
    renderPage();

    expect(screen.queryByRole('button', { name: 'Handed to patient' })).not.toBeInTheDocument();
  });

  it('offers the handover in Arabic', async () => {
    await i18n.changeLanguage('ar');
    showQueue(dispensedQueue());
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'تم التسليم للمريض' }));

    const dialog = screen.getByRole('dialog', { name: 'هل تم تسليم الأدوية للمريض؟' });
    expect(within(dialog).getByRole('button', { name: 'تأكيد التسليم' })).toBeInTheDocument();
  });
});

describe('PharmacyDispensing shows only real facts on the rows (QA-257)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no made-up "live", "CeenAiX care team" or "Complete" labels', () => {
    showQueue([
      task({ id: 'task-a', medication: 'Amoxicillin' }),
      task({ id: 'task-b', medication: 'Paracetamol', patientName: 'Done Patient', prescriptionId: 'rx-2', workflowStatus: 'dispensed', isDispensed: true }),
    ]);
    renderPage();

    expect(screen.queryByText(/· live/)).not.toBeInTheDocument();
    expect(screen.queryByText('CeenAiX care team')).not.toBeInTheDocument();
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();
    expect(screen.queryByText(/DHA/)).not.toBeInTheDocument();
    // The real facts stay.
    expect(within(rowFor('Test Patient')).getByText('Dr Test')).toBeInTheDocument();
    expect(within(rowFor('Done Patient')).getByText('DISPENSED')).toBeInTheDocument();
  });

  it('names the allergy warning for screen readers', () => {
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin', allergyFlag: true })]);
    renderPage();

    expect(within(rowFor('Test Patient')).getByRole('img', { name: 'Allergy flag on record' })).toBeInTheDocument();
  });
});

describe('PharmacyDispensing very long lists (QA-259)', () => {
  it('says when the oldest prescriptions are not shown', () => {
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
      data: { queue: [task({ id: 'task-a', medication: 'Amoxicillin' })], profile: null, organization: null, lowStockAlerts: 0, tasksTruncated: true },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    renderPage();

    expect(screen.getByRole('note')).toHaveTextContent('This list is very long, so the oldest prescriptions are not shown.');
  });
});

describe('PharmacyDispensing in Arabic, right to left (QA-260)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(updatePharmacyDispensingTaskStatus).mockResolvedValue(undefined);
    vi.mocked(sendPharmacyHoldNotificationAndMessage).mockResolvedValue({ notified: true, messaged: true });
    await i18n.changeLanguage('ar');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  // Arabic test data, so any Latin letter left on screen is an untranslated label.
  const arabicQueue = () => [
    task({
      id: 'task-a',
      medication: 'أموكسيسيلين',
      patientName: 'مريض تجريبي',
      prescriber: 'د. اختبار',
      insuranceProvider: 'نقدي',
      copayAed: 15,
    }),
  ];
  const latinOutsideReference = (text: string | null) =>
    (text ?? '').replace(/RX-[0-9A-F]+/g, '').match(/[A-Za-z]+/g) ?? [];

  it('shows the whole page in Arabic', () => {
    showQueue(arabicQueue());
    renderPage();

    expect(latinOutsideReference(document.body.textContent)).toEqual([]);
    expect(screen.getByRole('button', { name: /^الكل/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /الترتيب: الأحدث أولاً/ })).toBeInTheDocument();
    expect(screen.getByText('وقت الاستلام')).toBeInTheDocument();
    const row = rowFor('مريض تجريبي');
    expect(within(row).getByText('جديدة')).toBeInTheDocument();
    // The copay is in Arabic currency format, not "AED 15".
    expect(row).toHaveTextContent(formatLocaleCurrency(15, 'ar').replace(/\s+/g, ' '));
    expect(row).not.toHaveTextContent('AED');
    expect(within(row).getByRole('button', { name: 'مراسلة المريض بخصوص هذه الوصفة' })).toBeInTheDocument();
    expect(within(screen.getByTestId('shell-header')).getByText('الوصفات')).toBeInTheDocument();
  });

  it('shows the hold dialog in Arabic but writes the reason to the patient in English, like the notification', async () => {
    showQueue(arabicQueue());
    renderPage();

    await userEvent.click(within(rowFor('مريض تجريبي')).getByRole('button', { name: 'تعليق' }));
    const title = screen.getByRole('heading', { name: 'تعليق الوصفة' });
    const dialog = title.closest('.rounded-2xl') as HTMLElement;
    expect(latinOutsideReference(dialog.textContent)).toEqual([]);
    expect(within(dialog).getByRole('button', { name: 'إغلاق' })).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: /غير متوفر في المخزون/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد التعليق' }));

    expect(sendPharmacyHoldNotificationAndMessage).toHaveBeenCalledWith(
      expect.objectContaining({ holdReasonLabel: 'Out of Stock' })
    );
  });

  it('places the search, sort menu and status bar on the right side in Arabic', async () => {
    showQueue(arabicQueue());
    renderPage();

    await userEvent.type(screen.getByRole('textbox'), 'x');
    const clear = screen.getByRole('button', { name: 'مسح البحث' });
    expect(clear.className).toContain('end-3');
    expect(clear.className).not.toMatch(/\bright-3\b/);

    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.click(screen.getByRole('button', { name: /الترتيب/ }));
    const newest = screen.getByRole('button', { name: 'الأقدم أولاً' });
    expect(newest.className).toContain('text-start');
    expect(newest.parentElement?.className).toContain('end-0');

    expect(rowFor('مريض تجريبي').className).toContain('border-s-4');
    expect(rowFor('مريض تجريبي').className).not.toContain('border-l-4');
  });
});

describe('PharmacyDispensing on a phone and in its dialogs (QA-261)', () => {
  let restoreScreen: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updatePharmacyDispensingTaskStatus).mockResolvedValue(undefined);
  });

  afterEach(() => {
    restoreScreen?.();
    restoreScreen = null;
  });

  it('shows a card per prescription on a phone, with its status and buttons, instead of the wide table', async () => {
    restoreScreen = mockScreen(true);
    showQueue([
      task({ id: 'task-a', medication: 'Amoxicillin' }),
      task({ id: 'task-b', medication: 'Paracetamol' }),
      task({ id: 'task-c', medication: 'Ibuprofen', patientName: 'Second Patient', prescriptionId: 'rx-2', workflowStatus: 'dispensed', isDispensed: true }),
    ]);
    const { container } = renderPage();

    expect(container.querySelector('.min-w-\\[1200px\\]')).toBeNull();
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    const first = cards.find((card) => card.textContent?.includes('Test Patient')) as HTMLElement;
    expect(within(first).getByText('NEW')).toBeInTheDocument();
    expect(within(first).getByText('Amoxicillin, Paracetamol')).toBeInTheDocument();
    expect(within(first).getByText('RX-1A2B3C4D')).toBeInTheDocument();
    const second = cards.find((card) => card.textContent?.includes('Second Patient')) as HTMLElement;
    expect(within(second).getByRole('button', { name: 'Handed to patient' })).toBeInTheDocument();

    await userEvent.click(within(first).getByRole('button', { name: 'Start' }));
    expect(updatePharmacyDispensingTaskStatus).toHaveBeenCalledWith('task-a', 'in_progress');
  });

  it('keeps the table on a wider screen', () => {
    restoreScreen = mockScreen(false);
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin' })]);
    const { container } = renderPage();

    expect(container.querySelector('.min-w-\\[1200px\\]')).not.toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('makes the hold dialog a real dialog: named, focused, closed with Escape', async () => {
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin' })]);
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'Hold' }));

    const dialog = screen.getByRole('dialog', { name: 'Put Prescription On Hold' });
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    const reason = within(dialog).getByRole('button', { name: /Out of Stock/ });
    expect(reason).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(reason);
    expect(reason).toHaveAttribute('aria-pressed', 'true');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(updatePharmacyDispensingTaskStatus).not.toHaveBeenCalled();
  });

  it('limits the hold note to what the database accepts and shows how much is used', async () => {
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin' })]);
    renderPage();

    await userEvent.click(within(rowFor('Test Patient')).getByRole('button', { name: 'Hold' }));

    const note = screen.getByLabelText(/Additional Notes/);
    expect(note).toHaveAttribute('maxLength', '1000');
    await userEvent.type(note, 'Back Monday');
    expect(screen.getByText('11 / 1000')).toBeInTheDocument();
  });
});

describe('PharmacyDispensing small fixes (QA-262)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the search when a filter is chosen', async () => {
    showQueue([
      task({ id: 'task-a', medication: 'Amoxicillin' }),
      task({ id: 'task-b', medication: 'Ibuprofen', patientName: 'Other Patient', prescriptionId: 'rx-2' }),
    ]);
    renderPage();

    await userEvent.type(screen.getByRole('textbox'), 'Amox');
    await userEvent.click(screen.getByRole('button', { name: /^New/ }));

    expect(screen.getByRole('textbox')).toHaveValue('Amox');
    expect(screen.getByText('Test Patient')).toBeInTheDocument();
    expect(screen.queryByText('Other Patient')).not.toBeInTheDocument();
  });

  it('keeps the Dashboard link to one prescription when a filter is chosen', async () => {
    showQueue([
      task({ id: 'task-a', medication: 'Amoxicillin' }),
      task({ id: 'task-b', medication: 'Ibuprofen', patientName: 'Other Patient', prescriptionId: 'rx-2', externalRef: 'rx-2-item-b' }),
    ]);
    renderPage(`/pharmacy/dispensing?id=${PRESCRIPTION}`);

    await userEvent.click(screen.getByRole('button', { name: /^New/ }));

    expect(screen.getByText('Test Patient')).toBeInTheDocument();
    expect(screen.queryByText('Other Patient')).not.toBeInTheDocument();
  });

  it('marks urgent prescriptions and lists them first while they are still open', () => {
    showQueue([
      task({ id: 'task-new', medication: 'Amoxicillin', patientName: 'Routine Patient', prescriptionId: 'rx-routine', receivedAt: '2026-11-26T09:00:00.000Z' }),
      task({ id: 'task-stat', medication: 'Adrenaline', patientName: 'Urgent Patient', prescriptionId: 'rx-stat', priority: 'stat', receivedAt: '2026-11-26T07:00:00.000Z' }),
      task({ id: 'task-done', medication: 'Insulin', patientName: 'Done Patient', prescriptionId: 'rx-done', priority: 'stat', workflowStatus: 'dispensed', isDispensed: true, receivedAt: '2026-11-26T10:00:00.000Z' }),
    ]);
    renderPage();

    const order = ['Done Patient', 'Routine Patient', 'Urgent Patient']
      .map((name) => ({ name, top: rowFor(name).compareDocumentPosition(rowFor('Urgent Patient')) }));
    // Urgent Patient comes before the others, although it is the oldest.
    expect(order.filter((item) => item.name !== 'Urgent Patient').every((item) => item.top & Node.DOCUMENT_POSITION_PRECEDING)).toBe(true);
    expect(within(rowFor('Urgent Patient')).getByText('Urgent (STAT)')).toBeInTheDocument();
    // A dispensed urgent prescription is no longer marked or moved up.
    expect(within(rowFor('Done Patient')).queryByText('Urgent (STAT)')).not.toBeInTheDocument();
  });

  it('shows unread messages on the Messages badge, like the other pharmacy pages', () => {
    // QA-275: the real unread count, not the demo table.
    vi.mocked(usePharmacyUnreadMessages).mockReturnValue(3);
    vi.mocked(usePharmacyPrescriptionQueue).mockReturnValue({
      data: {
        queue: [task({ id: 'task-a', medication: 'Amoxicillin', workflowStatus: 'on_hold' })],
        messages: [{ unreadCount: 9 }],
        profile: null,
        organization: null,
        lowStockAlerts: 0,
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    renderPage();

    expect(screen.getByTestId('badge-/pharmacy/messages')).toHaveTextContent('3');
  });

  it('shows the page title once, in the top bar', () => {
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin' })]);
    renderPage();

    expect(screen.getAllByText('Prescriptions')).toHaveLength(1);
    expect(within(screen.getByTestId('shell-header')).getByText('Prescriptions')).toBeInTheDocument();
  });

  it('shows long medicine names in full', () => {
    showQueue([task({ id: 'task-a', medication: 'Amoxicillin and clavulanic acid 875 mg' })]);
    renderPage();

    expect(within(rowFor('Test Patient')).getByText('Amoxicillin and clavulanic acid 875 mg')).toBeInTheDocument();
  });
});
