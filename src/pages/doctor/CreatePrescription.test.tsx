import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorPatients, useMedicationCatalogSearch, useQuery } from '../../hooks';
import type { DoctorPatientFlag } from '../../hooks/use-doctor-patients';
import { useAuth } from '../../lib/auth-context';
import { CreatePrescription } from './CreatePrescription';

vi.mock('../../hooks', () => ({
  useDoctorPatients: vi.fn(),
  useMedicationCatalogSearch: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const patient = (id: string, name: string, flags: DoctorPatientFlag[]) => ({
  id,
  name,
  flags,
  allergies: [],
  conditions: [],
  dateOfBirth: null,
  gender: null,
  bloodType: null,
  insuranceName: null,
});

const renderPage = (patients: ReturnType<typeof patient>[], query = '') => {
  vi.mocked(useDoctorPatients).mockReturnValue({ data: patients, loading: false, error: null, refetch: vi.fn() } as never);
  return render(
    <MemoryRouter initialEntries={[`/doctor/prescriptions/new${query}`]}>
      <CreatePrescription />
    </MemoryRouter>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'doctor-1' }, doctorProfile: null, profile: null } as never);
  vi.mocked(useQuery).mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() } as never);
  vi.mocked(useMedicationCatalogSearch).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() } as never);
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('CreatePrescription allergy panel (QA-135)', () => {
  it('never claims "no known allergies" when nothing is on file', () => {
    renderPage([patient('patient-1', 'Patient One', [{ kind: 'newPatient' }])], '?patient=patient-1');
    expect(screen.getByText(i18n.t('doctor.createPrescription.noAllergiesRecorded'))).toBeInTheDocument();
    expect(screen.queryByText(/No Known Allergies/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Verified from patient allergy records/i)).not.toBeInTheDocument();
  });

  it('lists recorded allergies with a translated severity', async () => {
    await i18n.changeLanguage('ar');
    renderPage(
      [patient('patient-1', 'Patient One', [{ kind: 'allergy', allergen: 'Penicillin', severity: 'severe' }])],
      '?patient=patient-1'
    );
    expect(screen.getByText('تنبيه حساسية')).toBeInTheDocument();
    expect(screen.getByText(/Penicillin \(شديد\)/)).toBeInTheDocument();
  });

  it('shows no allergy status before a patient is available', () => {
    renderPage([]);
    expect(screen.queryByText(i18n.t('doctor.createPrescription.noAllergiesRecorded'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('doctor.createPrescription.allergyAlert'))).not.toBeInTheDocument();
    expect(screen.queryByText(/No Known Allergies/i)).not.toBeInTheDocument();
  });
});

describe('CreatePrescription in Arabic (QA-139)', () => {
  it('shows no English labels in the side panel, toolbar or dialogs', async () => {
    await i18n.changeLanguage('ar');
    const { container } = renderPage([patient('patient-1', 'Patient One', [])], '?patient=patient-1');
    await userEvent.click(screen.getByRole('button', { name: /تجديد وصفة حالية/ }));
    await userEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    await userEvent.click(screen.getByRole('button', { name: /^السجل$/ }));
    const text = `${container.textContent ?? ''} ${document.body.textContent ?? ''}`;
    for (const english of [
      'PRESCRIBING FOR',
      'CURRENT MEDICATIONS',
      'PRESCRIBER',
      'Add Medications',
      'Renew Existing',
      'History',
      'Prescription details',
      'Change Patient',
      'View Full Record',
      'Back to Prescriptions',
      'Prescription History',
      'View All Prescriptions',
      'No insurance on file',
    ]) {
      expect(text).not.toContain(english);
    }
    expect(screen.getByText('سجل الوصفات')).toBeInTheDocument();
  });
});
