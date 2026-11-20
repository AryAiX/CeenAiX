import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorLabOrders } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { DoctorLabOrders } from './LabOrders';

vi.mock('../../hooks', () => ({ useDoctorLabOrders: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));

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
