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
vi.mock('../../lib/doctor-specializations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/doctor-specializations')>()),
  syncDoctorSpecializations: vi.fn().mockResolvedValue(undefined),
}));

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
    vi.mocked(supabase.from).mockReset();
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

describe('DoctorProfile save (QA-167)', () => {
  const refreshProfile = vi.fn();
  let writes: Array<{ table: string; op: string; values: Record<string, unknown>; filters: unknown[] }>;
  let updatedRows: Array<{ user_id: string }>;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    writes = [];
    updatedRows = [{ user_id: 'doc-1' }];
    refreshProfile.mockReset().mockResolvedValue(undefined);
    vi.mocked(supabase.rpc).mockReset();
    vi.mocked(supabase.from).mockReset().mockImplementation(((table: string) => ({
      update: (values: Record<string, unknown>) => {
        const write = { table, op: 'update', values, filters: [] as unknown[] };
        writes.push(write);
        const chain = {
          eq: (column: string, value: unknown) => (write.filters.push([column, value]), chain),
          select: () => Promise.resolve({ data: updatedRows, error: null }),
        };
        return chain;
      },
      upsert: (values: Record<string, unknown>, options: unknown) => {
        writes.push({ table, op: 'upsert', values, filters: [options] });
        return Promise.resolve({ error: null });
      },
    })) as never);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'doc-1', email: 'doc@test.com' },
      profile: {
        full_name: 'Dr. Test Person',
        phone: '+971500000000',
        terms_accepted: null,
        notification_preferences: null,
        city: 'Dubai',
      },
      doctorProfile: {
        license_number: 'DHA-1',
        bio: 'Old bio',
        consultation_fee: 300,
        languages_spoken: ['English', 'Arabic'],
        dha_license_verified: true,
      },
      isLoading: false,
      refreshProfile,
    } as never);
    vi.mocked(useDoctorClinicMembership).mockReturnValue({ data: null } as never);
    vi.mocked(useSpecializations).mockReturnValue({
      data: [{ id: 'spec-1', name: 'Cardiology' }],
      loading: false,
      error: null,
    } as never);
    vi.mocked(useDoctorSpecializationIds).mockReturnValue({
      data: ['spec-1'],
      loading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    } as never);
    withTemplates([]);
  });

  const editAndSave = (changes: Record<string, string> = {}) => {
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/ }));
    for (const [placeholder, value] of Object.entries(changes)) {
      fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
  };

  it('saves only the fields on the form', async () => {
    renderPage();
    editAndSave({ 'Enter your full name': '  Dr. New Name  ', 'Summarize your expertise and care approach': 'New bio' });

    await waitFor(() => expect(screen.getByText('Doctor profile updated.')).toBeInTheDocument());

    expect(writes.map(({ table, op }) => `${table}:${op}`)).toEqual(['user_profiles:update', 'doctor_profiles:upsert']);
    expect(writes[0].values).toEqual({
      full_name: 'Dr. New Name',
      first_name: 'Dr.',
      last_name: 'New Name',
      phone: '+971500000000',
      address: null,
      date_of_birth: null,
      gender: null,
    });
    expect(writes[0].filters).toEqual([['user_id', 'doc-1']]);
    expect(writes[1].values).toEqual({
      user_id: 'doc-1',
      specialization: 'Cardiology',
      sub_specialization: null,
      license_number: 'DHA-1',
      bio: 'New bio',
    });
    // Nothing outside the form is written back (consent, languages, fee, verification, role...).
    for (const key of [
      'role',
      'email',
      'terms_accepted',
      'notification_preferences',
      'city',
      'avatar_url',
      'languages_spoken',
      'consultation_fee',
      'dha_license_verified',
      'dha_verified_at',
    ]) {
      expect(Object.keys({ ...writes[0].values, ...writes[1].values })).not.toContain(key);
    }
  });

  it('does not save an empty name', async () => {
    renderPage();
    editAndSave({ 'Enter your full name': '   ' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your full name before saving.');
    expect(writes).toEqual([]);
  });

  it('stops with a clear message when no profile row was updated', async () => {
    updatedRows = [];
    renderPage();
    editAndSave();

    expect(await screen.findByRole('alert')).toHaveTextContent('Your profile could not be found.');
    expect(writes.map(({ table }) => table)).toEqual(['user_profiles']);
  });
});

