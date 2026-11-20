import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useDoctorPrescriptions } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { DoctorPrescriptions } from './Prescriptions';

vi.mock('../../hooks', () => ({ useDoctorPrescriptions: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));

const item = (id: string, name: string, nameAr: string | null) => ({
  id,
  medication_name: name,
  medication_name_ar: nameAr,
  dosage: '500 mg',
  frequency: 'Three times daily',
  duration: null,
  instructions: null,
  quantity: 21,
  is_dispensed: false,
  medication_catalog_suggestion_id: null,
});

const prescriptions = [
  {
    id: 'rx-active-1',
    patient_id: 'patient-1',
    status: 'active',
    prescribed_at: '2026-11-20T08:00:00Z',
    patientName: 'Demo Patient',
    patientEmail: null,
    items: [item('i1', 'amoxicillin', 'أموكسيسيلين')],
  },
  {
    id: 'rx-done-1',
    patient_id: 'patient-2',
    status: 'completed',
    prescribed_at: '2026-10-01T08:00:00Z',
    patientName: 'Old Patient',
    patientEmail: null,
    items: [item('i2', 'ibuprofen', null)],
  },
];

let lastLocation = '';
const LocationProbe = () => {
  const location = useLocation();
  lastLocation = `${location.pathname}${location.search}`;
  return null;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/doctor/prescriptions']}>
      <Routes>
        <Route path="/doctor/prescriptions" element={<DoctorPrescriptions />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'doctor-1', email: 'doctor@test' },
    profile: { full_name: 'Abud' },
    doctorProfile: null,
  } as never);
  vi.mocked(useDoctorPrescriptions).mockReturnValue({
    data: prescriptions,
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as never);
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('DoctorPrescriptions (QA-138)', () => {
  it('shows no English labels in Arabic', async () => {
    await i18n.changeLanguage('ar');
    const { container } = renderPage();
    const text = container.textContent ?? '';
    for (const english of ['View Patient', 'Print / PDF', 'Click to', 'Newest First', 'Oldest First']) {
      expect(text).not.toContain(english);
    }
    expect(screen.getAllByText('عرض المريض')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'الأحدث أولاً' })).toBeInTheDocument();
  });

  it('writes the message draft in the app language', async () => {
    await i18n.changeLanguage('ar');
    renderPage();
    await userEvent.click(screen.getAllByRole('button', { name: i18n.t('doctor.messages.messagePatient') })[0]);
    const draft = decodeURIComponent(new URLSearchParams(lastLocation.split('?')[1]).get('draft') ?? '');
    expect(lastLocation.startsWith('/doctor/messages?patient=patient-1')).toBe(true);
    expect(draft).toContain('مرحباً Demo Patient');
    expect(draft).toContain('أموكسيسيلين (amoxicillin)');
    expect(draft).toContain('د. Abud');
    expect(draft).not.toContain('Hi ');
  });

  it('lets keyboard users use the summary cards', () => {
    renderPage();
    expect(screen.getByText('Old Patient')).toBeInTheDocument();
    const activeCard = screen.getByText(i18n.t('doctor.prescriptions.activePlans')).closest('[role="button"]');
    expect(activeCard).not.toBeNull();
    fireEvent.keyDown(activeCard as Element, { key: 'Enter' });
    expect(screen.queryByText('Old Patient')).not.toBeInTheDocument();
  });

  it('finds a prescription by its translated status', async () => {
    await i18n.changeLanguage('ar');
    renderPage();
    const completed = i18n.t('shared.prescriptionStatus.completed');
    await userEvent.type(screen.getByPlaceholderText(i18n.t('doctor.prescriptions.searchPlaceholder')), completed);
    expect(screen.getByText('Old Patient')).toBeInTheDocument();
    expect(screen.queryByText('Demo Patient')).not.toBeInTheDocument();
  });
});
