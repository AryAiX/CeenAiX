import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import {
  useDoctorClinicMembership,
  useDoctorPreVisitTemplates,
  useDoctorSpecializationIds,
  useSpecializations,
} from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import type { DoctorPreVisitTemplateRecord } from '../../lib/pre-visit';
import { supabase } from '../../lib/supabase';
import { DoctorProfile } from './Profile';

vi.mock('../../hooks', () => ({
  useDoctorClinicMembership: vi.fn(),
  useDoctorPreVisitTemplates: vi.fn(),
  useDoctorSpecializationIds: vi.fn(),
  useSpecializations: vi.fn(),
}));
vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../lib/ai', () => ({
  extractPreVisitQuestionnaire: vi.fn(),
  uploadPreVisitTemplateSource: vi.fn(),
}));
vi.mock('../../components/AccountSecurityPanel', () => ({ AccountSecurityPanel: () => null }));
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));

const refetchTemplates = vi.fn();

const question = (key: string, label: string) => ({
  key,
  label,
  helpText: null,
  type: 'short_text' as const,
  required: false,
  options: [],
  displayOrder: 0,
  autofillSource: null,
  memoryKey: null,
  aiInstructions: null,
});

const template = (
  id: string,
  title: string,
  status: 'draft' | 'published',
  isActive: boolean
): DoctorPreVisitTemplateRecord => ({
  id,
  title,
  description: null,
  status,
  isActive,
  specializationId: null,
  publishedAt: null,
  sourceBucket: null,
  sourcePath: null,
  sourceFileName: null,
  extractionMetadata: {},
  questions: [question('symptoms', 'Symptoms')],
});

const withTemplates = (templates: DoctorPreVisitTemplateRecord[]) =>
  vi.mocked(useDoctorPreVisitTemplates).mockReturnValue({
    data: templates,
    loading: false,
    error: null,
    refetch: refetchTemplates,
  } as never);

const renderPage = () =>
  render(
    <MemoryRouter>
      <DoctorProfile />
    </MemoryRouter>
  );

const titleInput = () => screen.getByPlaceholderText('Cardiology pre-visit intake') as HTMLInputElement;

describe('DoctorProfile pre-visit template (QA-166)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    refetchTemplates.mockReset().mockResolvedValue(undefined);
    vi.mocked(supabase.rpc).mockReset();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'doc-1', email: 'doc@test.com' },
      profile: { full_name: 'Dr. Test' },
      doctorProfile: null,
      isLoading: false,
      refreshProfile: vi.fn(),
    } as never);
    vi.mocked(useDoctorClinicMembership).mockReturnValue({ data: null } as never);
    vi.mocked(useSpecializations).mockReturnValue({ data: [], loading: false, error: null } as never);
    vi.mocked(useDoctorSpecializationIds).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
  });

  it('"Save draft" on the live template keeps it live and saves a new draft in one call', async () => {
    withTemplates([template('live-1', 'Live intake', 'published', true)]);
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { template_id: 'draft-2', saved_as_copy: true },
      error: null,
    } as never);
    renderPage();

    expect(screen.getByTestId('template-editing-status')).toHaveTextContent('You are editing the live template.');
    fireEvent.change(titleInput(), { target: { value: 'Live intake v2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() =>
      expect(
        screen.getByText('Saved as a new draft. Your live template is unchanged and patients still get it.')
      ).toBeInTheDocument()
    );
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith(
      'save_doctor_pre_visit_template',
      expect.objectContaining({
        p_template_id: 'live-1',
        p_publish: false,
        p_title: 'Live intake v2',
        p_questions: [expect.objectContaining({ question_key: 'symptoms', label: 'Symptoms', display_order: 0 })],
      })
    );
    expect(supabase.from).not.toHaveBeenCalled();
    expect(refetchTemplates).toHaveBeenCalledTimes(1);
  });

  it('"Publish" sends p_publish true for the same template', async () => {
    withTemplates([template('live-1', 'Live intake', 'published', true)]);
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { template_id: 'live-1', saved_as_copy: false },
      error: null,
    } as never);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Publish active template' }));

    await waitFor(() =>
      expect(screen.getByText('Pre-visit template published. New bookings will receive this intake.')).toBeInTheDocument()
    );
    expect(supabase.rpc).toHaveBeenCalledWith(
      'save_doctor_pre_visit_template',
      expect.objectContaining({ p_template_id: 'live-1', p_publish: true })
    );
  });

  it('opens a newer draft and says which template patients still get', () => {
    withTemplates([
      template('draft-2', 'Draft intake', 'draft', false),
      template('live-1', 'Live intake', 'published', true),
    ]);
    renderPage();

    expect(titleInput().value).toBe('Draft intake');
    expect(screen.getByTestId('template-editing-status')).toHaveTextContent(
      'You are editing a draft. Patients still get "Live intake" until you publish this one.'
    );
    expect(screen.getByText('Active template:').closest('div')).toHaveTextContent('Live intake');
  });

  it('does not call a draft the "active template" when nothing is live', () => {
    withTemplates([template('draft-2', 'Draft intake', 'draft', false)]);
    renderPage();

    expect(screen.queryByText('Active template:')).not.toBeInTheDocument();
    expect(screen.getByText('No published template yet')).toBeInTheDocument();
    expect(screen.getByTestId('template-editing-status')).toHaveTextContent('It is not live yet');
  });

  it('shows the error and no success message when the save fails', async () => {
    withTemplates([template('live-1', 'Live intake', 'published', true)]);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('boom') } as never);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('boom')).toBeInTheDocument();
    expect(refetchTemplates).not.toHaveBeenCalled();
  });
});
