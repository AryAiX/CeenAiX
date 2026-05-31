import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { usePatientPrescriptions } from '../../hooks/use-patient-prescriptions';
import { usePatientPrimaryInsurance } from '../../hooks/use-patient-primary-insurance';
import { usePatientDashboardAlert } from '../../hooks/use-patient-dashboard-alert';
import { useAuth } from '../../lib/auth-context';
import { PatientPrescriptions } from './Prescriptions';

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

vi.mock('../../components/Navigation', () => ({
  Navigation: () => <div data-testid="patient-navigation" />,
}));

vi.mock('../../hooks/use-patient-prescriptions', () => ({
  usePatientPrescriptions: vi.fn(),
}));

vi.mock('../../hooks/use-patient-primary-insurance', () => ({
  usePatientPrimaryInsurance: vi.fn(),
}));

vi.mock('../../hooks/use-patient-dashboard-alert', () => ({
  usePatientDashboardAlert: vi.fn(),
}));

vi.mock('../../lib/auth-context', () => ({
  useAuth: vi.fn(),
}));

describe('PatientPrescriptions', () => {
  const usePatientPrescriptionsMock = vi.mocked(usePatientPrescriptions);
  const usePatientPrimaryInsuranceMock = vi.mocked(usePatientPrimaryInsurance);
  const usePatientDashboardAlertMock = vi.mocked(usePatientDashboardAlert);
  const useAuthMock = vi.mocked(useAuth);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: { id: 'patient-1' },
    } as never);
    usePatientPrimaryInsuranceMock.mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() } as never);
    usePatientDashboardAlertMock.mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() } as never);
  });

  it('renders active and historical prescriptions from normalized data', async () => {
    usePatientPrescriptionsMock.mockReturnValue({
      data: [
        {
          id: 'prescription-1',
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          appointment_id: 'appointment-1',
          status: 'active',
          prescribed_at: '2026-02-10T05:15:00Z',
          is_deleted: false,
          deleted_at: null,
          created_at: '2026-02-10T05:15:00Z',
          updated_at: '2026-02-10T05:15:00Z',
          doctorName: 'Doctor 1',
          doctorSpecialty: 'General Surgery',
          pharmacyStatus: 'not_sent',
          pharmacyName: null,
          items: [
            {
              id: 'item-1',
              prescription_id: 'prescription-1',
              medication_name: 'Losartan',
              medication_name_ar: null,
              dosage: '50 mg',
              frequency: 'Once daily',
              duration: '30 days',
              quantity: 30,
              instructions: 'Take in the morning',
              is_dispensed: true,
              created_at: '2026-02-10T05:15:00Z',
              updated_at: '2026-02-10T05:15:00Z',
            },
            {
              id: 'item-2',
              prescription_id: 'prescription-1',
              medication_name: 'Metformin',
              medication_name_ar: null,
              dosage: '500 mg',
              frequency: 'Twice daily',
              duration: '30 days',
              quantity: 60,
              instructions: 'Take with meals',
              is_dispensed: false,
              created_at: '2026-02-10T05:15:00Z',
              updated_at: '2026-02-10T05:15:00Z',
            },
          ],
        },
        {
          id: 'prescription-2',
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          appointment_id: 'appointment-2',
          status: 'completed',
          prescribed_at: '2026-01-18T07:45:00Z',
          is_deleted: false,
          deleted_at: null,
          created_at: '2026-01-18T07:45:00Z',
          updated_at: '2026-01-18T07:45:00Z',
          doctorName: 'Doctor 1',
          doctorSpecialty: 'General Surgery',
          pharmacyStatus: 'not_sent',
          pharmacyName: null,
          items: [
            {
              id: 'item-3',
              prescription_id: 'prescription-2',
              medication_name: 'Vitamin D3',
              medication_name_ar: null,
              dosage: '2000 IU',
              frequency: 'Once daily',
              duration: '60 days',
              quantity: 60,
              instructions: 'Completed course',
              is_dispensed: true,
              created_at: '2026-01-18T07:45:00Z',
              updated_at: '2026-01-18T07:45:00Z',
            },
          ],
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithRouter(<PatientPrescriptions />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /My Medications/ })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/Across 1 active care plan/)).toBeInTheDocument();
    });
    expect(screen.getAllByText('Active Medications').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Losartan/ })).toBeInTheDocument();
    });
    expect(screen.getAllByText('Metformin').length).toBeGreaterThan(0);

    const user = userEvent.setup();
    expect(screen.queryByText('Prescription History')).not.toBeInTheDocument();
    expect(screen.queryByText('Vitamin D3')).not.toBeInTheDocument();

    await user.click(
      await screen.findByRole('button', {
        name: /Past Medications/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Past Medications/i })).toBeInTheDocument();
    });
    expect(screen.getAllByText('Vitamin D3').length).toBeGreaterThan(0);
  });

  it('exposes per-line drug cards and request refill for messaging', async () => {
    usePatientPrescriptionsMock.mockReturnValue({
      data: [
        {
          id: 'prescription-1',
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          appointment_id: 'appointment-1',
          status: 'active',
          prescribed_at: '2026-02-10T05:15:00Z',
          is_deleted: false,
          deleted_at: null,
          created_at: '2026-02-10T05:15:00Z',
          updated_at: '2026-02-10T05:15:00Z',
          doctorName: 'Doctor 1',
          doctorSpecialty: 'General Surgery',
          pharmacyStatus: 'not_sent',
          pharmacyName: null,
          items: [
            {
              id: 'item-1',
              prescription_id: 'prescription-1',
              medication_name: 'Losartan',
              medication_name_ar: null,
              dosage: '50 mg',
              frequency: 'Once daily',
              duration: '30 days',
              quantity: 30,
              instructions: 'Take in the morning',
              is_dispensed: true,
              created_at: '2026-02-10T05:15:00Z',
              updated_at: '2026-02-10T05:15:00Z',
            },
            {
              id: 'item-2',
              prescription_id: 'prescription-1',
              medication_name: 'Metformin',
              medication_name_ar: null,
              dosage: '500 mg',
              frequency: 'Twice daily',
              duration: '30 days',
              quantity: 60,
              instructions: 'Take with meals',
              is_dispensed: false,
              created_at: '2026-02-10T05:15:00Z',
              updated_at: '2026-02-10T05:15:00Z',
            },
          ],
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithRouter(<PatientPrescriptions />);

    const user = userEvent.setup();
    const expand = await waitFor(() => screen.getAllByRole('button', { name: 'Show actions' })[0]);
    await user.click(expand);
    const followUps = await waitFor(() => screen.getAllByRole('button', { name: 'Mark for refill follow-up' }));
    expect(followUps.length).toBeGreaterThan(0);
  });

  it('renders schedule, reminders, and costs tabs from live prescription fields', async () => {
    usePatientPrimaryInsuranceMock.mockReturnValue({
      data: {
        planName: 'Enhanced Care',
        providerCompany: 'Daman',
        coPayPercent: 20,
        annualLimit: 25000,
        annualLimitUsed: 9250,
        validUntil: '2026-12-31',
        policyNumber: 'POL-1',
        isPrimary: true,
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    usePatientPrescriptionsMock.mockReturnValue({
      data: [
        {
          id: 'prescription-1',
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          appointment_id: 'appointment-1',
          status: 'active',
          prescribed_at: '2026-02-10T05:15:00Z',
          is_deleted: false,
          deleted_at: null,
          created_at: '2026-02-10T05:15:00Z',
          updated_at: '2026-02-10T05:15:00Z',
          doctorName: 'Doctor 1',
          doctorSpecialty: 'General Surgery',
          pharmacyStatus: 'not_sent',
          pharmacyName: null,
          items: [
            {
              id: 'item-1',
              prescription_id: 'prescription-1',
              medication_name: 'Losartan',
              medication_name_ar: null,
              dosage: '50 mg',
              frequency: 'Once daily',
              duration: '30 days',
              quantity: 30,
              instructions: 'Take in the morning',
              is_dispensed: true,
              created_at: '2026-02-10T05:15:00Z',
              updated_at: '2026-02-10T05:15:00Z',
            },
            {
              id: 'item-2',
              prescription_id: 'prescription-1',
              medication_name: 'Metformin',
              medication_name_ar: null,
              dosage: '500 mg',
              frequency: 'Twice daily',
              duration: '30 days',
              quantity: 60,
              instructions: 'Take with meals',
              is_dispensed: false,
              created_at: '2026-02-10T05:15:00Z',
              updated_at: '2026-02-10T05:15:00Z',
            },
          ],
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithRouter(<PatientPrescriptions />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Today's Schedule/i }));
    expect(await screen.findByText(/remaining today/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Suggested dose|Scheduled for/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Reminders/i }));
    expect(await screen.findByText('Active Reminders')).toBeInTheDocument();
    expect(screen.getAllByText(/This reminder is inferred/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Costs & Coverage/i }));
    expect(await screen.findByText('Coverage Breakdown')).toBeInTheDocument();
    expect(screen.getAllByText(/With Enhanced Care/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Medication Coverage Table')).toBeInTheDocument();
  });
});
