import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('DoctorImaging full report (QA-150)', () => {
  it('opens the full released report with recommendations and alerts', async () => {
    renderImaging([
      imagingStudy('chest', {
        status: 'released',
        accession: 'ACC-2026-001',
        findings: 'Small right pleural effusion.',
        impression: 'Effusion, likely reactive.',
        recommendations: 'Repeat chest X-ray in 6 weeks.',
        alerts: ['Follow-up required'],
        releasedAt: '2026-11-19T10:00:00Z',
      }),
    ]);
    expect(screen.queryByText('Repeat chest X-ray in 6 weeks.')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: i18n.t('doctor.imaging.viewReport') });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById('imaging-report-chest') as HTMLElement;
    expect(within(panel).getByText('ACC-2026-001')).toBeInTheDocument();
    expect(within(panel).getByText('Small right pleural effusion.')).toBeInTheDocument();
    expect(within(panel).getByText('Effusion, likely reactive.')).toBeInTheDocument();
    expect(within(panel).getByText('Repeat chest X-ray in 6 weeks.')).toBeInTheDocument();
    expect(within(panel).getByText('Follow-up required')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: i18n.t('doctor.imaging.hideReport') }));
    expect(document.getElementById('imaging-report-chest')).toBeNull();
  });

  it('never shows draft text in the opened report', async () => {
    renderImaging([imagingStudy('draft', { status: 'reported', findings: 'Draft findings', recommendations: 'Draft advice' })]);
    await userEvent.click(screen.getByRole('button', { name: i18n.t('doctor.imaging.viewReport') }));
    const panel = document.getElementById('imaging-report-draft') as HTMLElement;
    expect(within(panel).queryByText('Draft findings')).not.toBeInTheDocument();
    expect(within(panel).queryByText('Draft advice')).not.toBeInTheDocument();
    expect(within(panel).getByText(i18n.t('doctor.imaging.reportNotReleased'))).toBeInTheDocument();
  });

  it('shows when a study was reviewed instead of the button', () => {
    renderImaging([imagingStudy('done', { status: 'released', impression: 'Normal.', reviewedAt: '2026-11-19T12:00:00Z' })]);
    expect(screen.getByText(/^Reviewed /)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark reviewed/ })).not.toBeInTheDocument();
  });
});

describe('DoctorImaging in Arabic (QA-151)', () => {
  it('shows translated statuses, scan types and labels, never raw codes', async () => {
    await i18n.changeLanguage('ar');
    const { container } = renderImaging([
      imagingStudy('a', { status: 'report_pending', modality: 'Ultrasound' }),
      imagingStudy('b', { status: 'scanning', modality: 'X-Ray' }),
      imagingStudy('c', { status: 'released', modality: 'CT', impression: 'سليم' }),
      imagingStudy('d', { status: 'rejected', modality: 'Echo' }),
    ]);
    const text = container.textContent ?? '';
    for (const raw of ['report_pending', 'scanning', 'released', 'rejected', 'Retry', 'Mark reviewed', 'canonical', 'DICOM', 'Ultrasound', 'X-Ray']) {
      expect(text).not.toContain(raw);
    }
    expect(screen.getByText('جارٍ كتابة التقرير')).toBeInTheDocument();
    expect(screen.getAllByText('موجات فوق صوتية').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(i18n.t('doctor.imaging.searchPh'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تحديد كمُراجَع' })).toBeInTheDocument();
  });

  it('finds a study by its translated status', async () => {
    await i18n.changeLanguage('ar');
    renderImaging([
      imagingStudy('a', { status: 'rejected', patientName: 'Rejected Patient' }),
      imagingStudy('b', { status: 'released', patientName: 'Released Patient', impression: 'سليم' }),
    ]);
    await userEvent.type(screen.getByPlaceholderText(i18n.t('doctor.imaging.searchPh')), 'مرفوضة');
    expect(screen.getByText('Rejected Patient')).toBeInTheDocument();
    expect(screen.queryByText('Released Patient')).not.toBeInTheDocument();
  });
});
