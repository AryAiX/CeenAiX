import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorPatientDetail } from '../../hooks';
import type { DoctorPatientDetailData } from '../../hooks/use-doctor-patient-detail';
import { useAuth } from '../../lib/auth-context';
import type { UserProfile } from '../../types';
import { DoctorPatientDetail } from './PatientDetail';

vi.mock('../../hooks', () => ({ useDoctorPatientDetail: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));

const emptyData = (patientProfile: UserProfile | null): DoctorPatientDetailData => ({
  patientProfile,
  patientExtensionProfile: null,
  appointments: [],
  medicalConditions: [],
  allergies: [],
  vaccinations: [],
  prescriptions: [],
  labOrders: [],
  canonicalUpdates: [],
  reportedMedications: [],
});

const renderPage = (data: DoctorPatientDetailData | null, error: string | null = null) => {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'doctor-1' } } as never);
  vi.mocked(useDoctorPatientDetail).mockReturnValue({ data, loading: false, error, refetch: vi.fn() } as never);
  return render(
    <MemoryRouter initialEntries={['/doctor/patients/patient-1']}>
      <Routes>
        <Route path="/doctor/patients/:patientId" element={<DoctorPatientDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('DoctorPatientDetail access states (QA-132)', () => {
  it('shows "not available" instead of an empty chart when the profile cannot be read', () => {
    renderPage(emptyData(null));
    expect(screen.getByText(i18n.t('doctor.patientDetail.noAccessTitle'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('doctor.patientDetail.createPrescription'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('doctor.patientDetail.createLabOrder'))).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('doctor.imaging.actionBackPatients') })).toBeInTheDocument();
  });

  it('shows the Arabic message in Arabic', async () => {
    await i18n.changeLanguage('ar');
    renderPage(emptyData(null));
    expect(screen.getByText('سجل المريض غير متاح')).toBeInTheDocument();
  });

  it('keeps the load-error state, with Retry, when the request fails', () => {
    renderPage(null, 'network down');
    expect(screen.getByText(i18n.t('doctor.patientDetail.loadError'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('shared.retry') })).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('doctor.patientDetail.noAccessTitle'))).not.toBeInTheDocument();
  });

  it('renders the workspace when the profile is readable, even with no appointments', () => {
    renderPage(emptyData({ user_id: 'patient-1', full_name: 'Demo Patient' } as UserProfile));
    expect(screen.getAllByText('Demo Patient').length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('doctor.patientDetail.createPrescription'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('doctor.patientDetail.noAppointmentsTitle'))).toBeInTheDocument();
  });
});
