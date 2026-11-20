import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { useImagingStudies } from '../../hooks';
import type { ImagingStudyRecord } from '../../hooks/use-imaging-studies';
import { useAuth } from '../../lib/auth-context';
import { DoctorImaging } from './Imaging';

vi.mock('../../hooks', () => ({ useImagingStudies: vi.fn(), markDoctorImagingStudyReviewed: vi.fn() }));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));

const imagingStudy = (id: string, overrides: Partial<ImagingStudyRecord> = {}): ImagingStudyRecord => ({
  id,
  accession: `ACC-${id}`,
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  patientName: `Patient ${id}`,
  doctorName: 'Dr Demo',
  clinicName: 'Demo Clinic',
  modality: 'CT',
  studyName: `Study ${id}`,
  priority: 'routine',
  status: 'released',
  room: null,
  scheduledAt: '2026-11-18T08:00:00Z',
  releasedAt: null,
  reviewedAt: null,
  findings: null,
  impression: null,
  recommendations: null,
  reportStatus: null,
  alerts: [],
  isDeleted: false,
  ...overrides,
});

const renderImaging = (studies: ImagingStudyRecord[]) => {
  vi.mocked(useImagingStudies).mockReturnValue({ data: studies, loading: false, error: null, refetch: vi.fn() } as never);
  return render(
    <MemoryRouter>
      <DoctorImaging />
    </MemoryRouter>
  );
};

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'doctor-1' } } as never);
});

describe('DoctorImaging report text (QA-149)', () => {
  it('shows the report only once it is released', () => {
    renderImaging([
      imagingStudy('released', { status: 'released', impression: 'No acute abnormality.', findings: 'Lungs clear.' }),
      imagingStudy('draft', { status: 'reported', impression: 'DRAFT: possible nodule', findings: 'Draft findings' }),
      imagingStudy('pending', { status: 'report_pending', findings: 'Typing in progress' }),
    ]);
    expect(screen.getByText('No acute abnormality.')).toBeInTheDocument();
    expect(screen.queryByText('DRAFT: possible nodule')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft findings')).not.toBeInTheDocument();
    expect(screen.queryByText('Typing in progress')).not.toBeInTheDocument();
    expect(screen.getAllByText(i18n.t('doctor.imaging.reportNotReleased'))).toHaveLength(2);
  });

  it('says a rejected study was rejected, not pending', () => {
    renderImaging([imagingStudy('rejected', { status: 'rejected' })]);
    expect(screen.getByText(i18n.t('doctor.imaging.studyRejected'))).toBeInTheDocument();
  });

  it('says there is no report yet before the scan is reported', () => {
    renderImaging([imagingStudy('scheduled', { status: 'scheduled' })]);
    expect(screen.getByText(i18n.t('doctor.imaging.noReportYet'))).toBeInTheDocument();
  });
});
