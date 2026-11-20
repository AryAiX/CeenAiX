import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorLabOrders } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { downloadPrescriptionPdf, printPrescription } from '../../lib/prescription-print';
import { DoctorLabOrders } from './LabOrders';

vi.mock('../../hooks', () => ({ useDoctorLabOrders: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('../../lib/prescription-print', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/prescription-print')>()),
  printPrescription: vi.fn(),
  downloadPrescriptionPdf: vi.fn().mockResolvedValue(undefined),
}));

const labItem = (id: string, testName: string, overrides: Record<string, unknown> = {}) => ({
  id,
  test_name: testName,
  test_name_ar: null,
  test_code: null,
  status: 'resulted',
  result_value: '6.5',
  numeric_value: null,
  result_unit: null,
  reference_range: null,
  is_abnormal: false,
  flag: null,
  status_category: null,
  resulted_at: null,
  lab_test_catalog_suggestion_id: null,
  ...overrides,
});

const order = (id: string, patientName: string, status: string, items: ReturnType<typeof labItem>[]) => ({
  id,
  patient_id: `patient-${id}`,
  appointment_id: null,
  status,
  ordered_at: '2026-11-19T08:00:00Z',
  patientName,
  patientEmail: null,
  items,
});

const renderWith = (orders: ReturnType<typeof order>[]) => {
  vi.mocked(useDoctorLabOrders).mockReturnValue({ data: orders, loading: false, error: null, refetch: vi.fn() } as never);
  return render(
    <MemoryRouter>
      <DoctorLabOrders />
    </MemoryRouter>
  );
};

const criticalBanner = () => screen.queryByText('Critical result');

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'doctor-1' } } as never);
});

describe('DoctorLabOrders critical results (QA-142)', () => {
  it('does not raise the critical alarm for a result that is only abnormal', async () => {
    renderWith([order('1', 'Abnormal Patient', 'resulted', [labItem('a', 'Cholesterol', { is_abnormal: true, flag: 'H' })])]);
    expect(criticalBanner()).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^All/ }));
    expect(screen.getByText(i18n.t('patient.labResults.statusAbnormal'))).toBeInTheDocument();
  });

  it('raises it for a result the lab marked critical', () => {
    renderWith([order('2', 'Critical Patient', 'resulted', [labItem('b', 'Potassium', { is_abnormal: true, flag: 'HH' })])]);
    expect(criticalBanner()).toBeInTheDocument();
    expect(screen.getAllByText(i18n.t('patient.labResults.statusCritical')).length).toBeGreaterThan(0);
  });

  it('stops the alarm once the doctor has reviewed the order', () => {
    renderWith([order('3', 'Reviewed Patient', 'reviewed', [labItem('c', 'Potassium', { is_abnormal: true, flag: 'LL' })])]);
    expect(criticalBanner()).not.toBeInTheDocument();
  });
});

describe('DoctorLabOrders pending count and reorder (QA-144)', () => {
  const orders = [
    order('p1', 'Waiting Patient', 'ordered', [labItem('w1', 'HbA1c', { status: 'ordered', result_value: null })]),
    order('p2', 'Results Patient', 'resulted', [
      labItem('r1', 'Lipid Panel', { lab_test_catalog_id: 'cat-lipid', test_code: '57698-3', loinc_code: '57698-3', specimen_type: 'Serum' }),
      labItem('r2', 'Cholesterol', { parent_item_id: 'r1' }),
    ]),
    order('p3', 'Reviewed Patient', 'reviewed', [labItem('v1', 'TSH')]),
  ];

  it('counts only orders still waiting for the lab, like the Pending tab', async () => {
    renderWith(orders);
    const card = screen.getByText(i18n.t('doctor.labOrders.pendingResults')).closest('button');
    expect(card).toHaveTextContent('1');
    await userEvent.click(card as HTMLElement);
    expect(screen.getByText('Waiting Patient')).toBeInTheDocument();
    expect(screen.queryByText('Results Patient')).not.toBeInTheDocument();
  });

  it('copies the original tests when reordering', async () => {
    let landed: { path: string; state: unknown } | null = null;
    const Probe = () => {
      const location = useLocation();
      landed = { path: `${location.pathname}${location.search}`, state: location.state };
      return null;
    };
    vi.mocked(useDoctorLabOrders).mockReturnValue({ data: orders, loading: false, error: null, refetch: vi.fn() } as never);
    render(
      <MemoryRouter initialEntries={['/doctor/lab-orders']}>
        <Routes>
          <Route path="/doctor/lab-orders" element={<DoctorLabOrders />} />
          <Route path="/doctor/lab-orders/new" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole('button', { name: /^All/ }));
    await userEvent.click(screen.getAllByRole('button', { name: i18n.t('doctor.labOrders.reorder') })[0]);
    expect(landed).toEqual({
      path: '/doctor/lab-orders/new?patient=patient-p2&appointment=',
      state: {
        reorderItems: [
          {
            labTestCatalogId: 'cat-lipid',
            labTestCatalogSuggestionId: null,
            testName: 'Lipid Panel',
            testNameAr: '',
            testCode: '57698-3',
            loincCode: '57698-3',
            specimen: 'Serum',
          },
        ],
      },
    });
  });
});

describe('DoctorLabOrders print and PDF (QA-145)', () => {
  const resulted = order('x1', 'عبد الله', 'resulted', [
    labItem('k', 'Potassium', { test_name_ar: 'البوتاسيوم', result_value: '6.9', result_unit: 'mmol/L', reference_range: '3.5-5.1', flag: 'HH', test_code: '2823-3' }),
    labItem('c', 'Cholesterol', { result_value: '230', result_unit: 'mg/dL', is_abnormal: true, flag: 'H' }),
    labItem('t', 'TSH', { status: 'processing', result_value: null }),
  ]);

  it('prints only the lab order and builds a translated, colour-coded PDF', async () => {
    await i18n.changeLanguage('ar');
    const pagePrint = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    // The order has a critical result, so it is on the default Critical tab.
    renderWith([resulted]);
    await userEvent.click(screen.getByRole('button', { name: i18n.t('doctor.prescriptions.print.button') }));

    const modalText = document.body.textContent ?? '';
    for (const english of ['Print or Download Lab Order', 'Print Now', 'Download PDF', 'Ordered:', 'Close']) {
      expect(modalText).not.toContain(english);
    }

    await userEvent.click(screen.getByRole('button', { name: i18n.t('doctor.prescriptions.print.printNow') }));
    expect(printPrescription).toHaveBeenCalledTimes(1);
    expect(pagePrint).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: i18n.t('doctor.prescriptions.print.downloadPdf') }));
    const content = vi.mocked(downloadPrescriptionPdf).mock.calls[0][0];
    expect(content.language).toBe('ar');
    expect(content.title).toBe('طلب فحص مخبري');
    expect(content.fileName).toBe('lab-order-x1');
    expect(content.items).toEqual([
      expect.objectContaining({ name: 'البوتاسيوم', secondaryName: 'Potassium', tone: 'critical', quantity: '2823-3', instructions: '3.5-5.1' }),
      expect.objectContaining({ name: 'Cholesterol', tone: 'abnormal' }),
      expect.objectContaining({ name: 'TSH', tone: null }),
    ]);
    expect(content.items[0].detail).toContain('6.9 mmol/L');
    expect(content.items[0].detail).toContain('حرج');
  });
});

describe('DoctorLabOrders in Arabic (QA-146)', () => {
  it('shows no English labels on the list', async () => {
    await i18n.changeLanguage('ar');
    const { container } = renderWith([
      order('a1', 'Critical Patient', 'resulted', [
        labItem('k', 'Potassium', { flag: 'HH', reference_range: '3.5-5.1', resulted_at: '2026-11-19T09:30:00Z' }),
      ]),
      order('a2', 'Waiting Patient', 'ordered', [labItem('w', 'TSH', { status: 'ordered', result_value: null })]),
    ]);
    const text = container.textContent ?? '';
    for (const english of [
      'Critical result',
      'Review critical result',
      'Critical results',
      'Scheduled',
      'Click to',
      ' shown',
      'View Patient',
      'Mark reviewed',
      'Ref:',
      'Reference:',
      'Resulted',
    ]) {
      expect(text).not.toContain(english);
    }
    for (const tab of ['الكل', 'حرجة', 'معلّقة', 'النتائج', 'مجدولة']) {
      expect(screen.getAllByRole('button', { name: new RegExp(`^${tab}`) }).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('نتيجة حرجة')).toBeInTheDocument();
  });
});

describe('DoctorLabOrders saved message (QA-147)', () => {
  const renderAt = (state?: unknown) => {
    vi.mocked(useDoctorLabOrders).mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() } as never);
    return render(
      <MemoryRouter initialEntries={[{ pathname: '/doctor/lab-orders', state }]}>
        <Routes>
          <Route path="/doctor/lab-orders" element={<DoctorLabOrders />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('confirms a new lab order after New Lab Order sends the doctor here', async () => {
    renderAt({ labOrderSaved: true });
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('doctor.createLabOrder.saveSuccess'));
    await userEvent.click(screen.getByRole('button', { name: i18n.t('doctor.prescriptions.print.close') }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows no saved message on a normal visit', () => {
    renderAt();
    expect(screen.queryByText(i18n.t('doctor.createLabOrder.saveSuccess'))).not.toBeInTheDocument();
  });
});

describe('DoctorLabOrders opened from the dashboard (QA-180)', () => {
  it('shows the order under All and highlights it', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    vi.mocked(useDoctorLabOrders).mockReturnValue({
      data: [
        order('x1', 'Other Patient', 'resulted', [labItem('o', 'Sodium', { is_abnormal: true, flag: 'HH' })]),
        order('x2', 'Abnormal Patient', 'resulted', [labItem('h', 'Cholesterol', { is_abnormal: true, flag: 'H' })]),
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    const { container } = render(
      <MemoryRouter initialEntries={[{ pathname: '/doctor/lab-orders', state: { focusLabOrderId: 'x2' } }]}>
        <DoctorLabOrders />
      </MemoryRouter>
    );

    // The abnormal (not critical) order is visible because the page opened on "All".
    expect(screen.getByText('Abnormal Patient')).toBeInTheDocument();
    expect(container.querySelector('#lab-order-x2')).toHaveAttribute('data-focused', 'true');
    expect(container.querySelector('#lab-order-x1')).not.toHaveAttribute('data-focused');
    expect(scroll).toHaveBeenCalled();
  });
});

