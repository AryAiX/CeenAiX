import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import {
  useBookableDoctors,
  useDoctorClinicMembership,
  useDoctorPreVisitTemplates,
  useDoctorSpecializationIds,
  useSpecializations,
} from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import type { DoctorPreVisitTemplateRecord } from '../../lib/pre-visit';
import { supabase } from '../../lib/supabase';
import { removeAvatarFiles } from '../../lib/avatar-storage';
import { DoctorProfile } from './Profile';

vi.mock('../../hooks', () => ({
  useBookableDoctors: vi.fn(),
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
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn(), storage: { from: vi.fn() } } }));
vi.mock('../../lib/avatar-storage', () => ({ removeAvatarFiles: vi.fn() }));
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

  it('saves with unique question keys after a question is removed and another added (QA-170)', async () => {
    withTemplates([template('live-1', 'Live intake', 'published', true)]);
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { template_id: 'live-1', saved_as_copy: false },
      error: null,
    } as never);
    renderPage();

    // symptoms + question_2 + question_3, remove question_2, add one more.
    fireEvent.click(screen.getByRole('button', { name: /Add question/ }));
    fireEvent.click(screen.getByRole('button', { name: /Add question/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /Remove/ })[1]);
    fireEvent.click(screen.getByRole('button', { name: /Add question/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish active template' }));

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(supabase.rpc).mock.calls[0][1] as { p_questions: Array<{ question_key: string }> };
    const keys = payload.p_questions.map((question) => question.question_key);
    expect(keys).toEqual(['symptoms', 'question_3', 'question_4']);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('shows the error and no success message when the save fails', async () => {
    withTemplates([template('live-1', 'Live intake', 'published', true)]);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('boom') } as never);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    const alert = await screen.findByRole('alert');
    // QA-171: a translated message instead of the raw database error.
    expect(within(alert).getByText("Couldn't save the intake template. Please try again.")).toBeInTheDocument();
    expect(alert).not.toHaveTextContent('boom');
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

  it('warns that changing the licence number removes DHA verification (QA-168)', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/ }));

    const licence = screen.getByPlaceholderText('Enter your medical license number');
    expect(screen.queryByTestId('licence-change-warning')).not.toBeInTheDocument();

    fireEvent.change(licence, { target: { value: 'DHA-2' } });
    expect(screen.getByTestId('licence-change-warning')).toHaveTextContent(
      'Changing your licence number removes your DHA verification until an admin checks the new number.'
    );
    expect(licence).toHaveAttribute('aria-describedby', 'licence-change-warning');

    fireEvent.change(licence, { target: { value: ' DHA-1 ' } });
    expect(screen.queryByTestId('licence-change-warning')).not.toBeInTheDocument();
  });

  it('shows no licence warning for a doctor who is not verified yet (QA-168)', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'doc-1', email: 'doc@test.com' },
      profile: { full_name: 'Dr. Test Person' },
      doctorProfile: { license_number: 'DHA-1', dha_license_verified: false },
      isLoading: false,
      refreshProfile,
    } as never);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter your medical license number'), { target: { value: 'DHA-2' } });
    expect(screen.queryByTestId('licence-change-warning')).not.toBeInTheDocument();
  });
});

describe('DoctorProfile in Arabic (QA-171)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.mocked(supabase.rpc).mockReset();
    vi.mocked(supabase.from).mockReset();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'doc-1', email: 'doc@test.com' },
      profile: { full_name: 'Dr. Test Person', gender: 'female', phone: '+971500000000' },
      doctorProfile: { license_number: 'DHA-1', bio: null },
      isLoading: false,
      refreshProfile: vi.fn(),
    } as never);
    vi.mocked(useDoctorClinicMembership).mockReturnValue({
      data: {
        consultation_fee: 300,
        telemedicine_fee: 250.5,
        follow_up_fee: null,
        facilities: { name: 'Clinic One' },
      },
    } as never);
    vi.mocked(useSpecializations).mockReturnValue({ data: [], loading: false, error: null } as never);
    vi.mocked(useDoctorSpecializationIds).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    withTemplates([template('live-1', 'Live intake', 'published', true)]);
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows the profile in Arabic with Arabic digits, money and gender', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('الملف الشخصي للطبيب');
    expect(screen.getByText('المعلومات المهنية')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تعديل الملف الشخصي/ })).toBeInTheDocument();
    // Stored 'female' is shown translated, not as the raw value.
    expect(screen.getByText('أنثى')).toBeInTheDocument();
    expect(screen.queryByText(/female/i)).not.toBeInTheDocument();
    // Clinic fees in the Arabic money format, '—' when missing.
    // Ignore no-break spaces and invisible direction marks the money format adds.
    const plain = (text: string | null) => (text ?? '').replace(/\u00a0/g, ' ').replace(/[\u200e\u200f]/g, '');
    const fees = screen.getAllByRole('definition').map((item) => plain(item.textContent));
    expect(fees.slice(0, 3)).toEqual(['٣٠٠ د.إ.', '٢٥٠٫٥٠ د.إ.', '—']);
    expect(fees.join(' ')).not.toContain('AED');
    // Completeness uses Arabic digits and the Arabic percent sign.
    expect(screen.getByText(/٪$/)).toBeInTheDocument();
    // Missing values say "not provided" in Arabic.
    expect(screen.getAllByText('غير متوفر').length).toBeGreaterThan(0);
    expect(screen.queryByText('Not provided')).not.toBeInTheDocument();
  });

  it('shows the intake editor in Arabic', () => {
    renderPage();

    expect(screen.getByText('نموذج استبيان ما قبل الزيارة')).toBeInTheDocument();
    expect(screen.getByText('السؤال ١')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /حفظ كمسودة/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /نشر كنموذج نشط/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'نص قصير' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'الحساسية' })).toBeInTheDocument();
    expect(screen.queryByText('Save draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Add question')).not.toBeInTheDocument();
  });
});

describe('DoctorProfile photo removal (QA-172)', () => {
  const refreshProfile = vi.fn();
  let profileUpdates: Array<Record<string, unknown>>;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    profileUpdates = [];
    refreshProfile.mockReset().mockResolvedValue(undefined);
    vi.mocked(removeAvatarFiles).mockReset().mockResolvedValue(undefined);
    vi.mocked(supabase.from).mockReset().mockImplementation((() => ({
      update: (values: Record<string, unknown>) => {
        profileUpdates.push(values);
        return { eq: () => Promise.resolve({ error: null }) };
      },
    })) as never);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'doc-1', email: 'doc@test.com' },
      profile: { full_name: 'Dr. Test', avatar_url: 'https://cdn.test/avatars/doc-1/avatar.jpg' },
      doctorProfile: null,
      isLoading: false,
      refreshProfile,
    } as never);
    vi.mocked(useDoctorClinicMembership).mockReturnValue({ data: null } as never);
    vi.mocked(useSpecializations).mockReturnValue({ data: [], loading: false, error: null } as never);
    vi.mocked(useDoctorSpecializationIds).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    withTemplates([]);
  });

  it('asks first, then deletes the file and clears the picture', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Remove profile picture' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Remove your profile picture? Patients will no longer see it.'
    );
    expect(removeAvatarFiles).not.toHaveBeenCalled();

    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(screen.getByText('Profile picture removed.')).toBeInTheDocument());
    expect(removeAvatarFiles).toHaveBeenCalledWith('doc-1');
    expect(profileUpdates).toEqual([{ avatar_url: null }]);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('"Keep" closes the question and removes nothing', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Remove profile picture' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(removeAvatarFiles).not.toHaveBeenCalled();
    expect(profileUpdates).toEqual([]);
  });

  it('changes nothing when the file cannot be deleted, so the doctor can try again', async () => {
    vi.mocked(removeAvatarFiles).mockRejectedValue(new Error('storage down'));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Remove profile picture' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't update your profile picture.");
    expect(profileUpdates).toEqual([]);
    expect(screen.getByRole('button', { name: 'Remove profile picture' })).toBeInTheDocument();
  });

  it('after uploading a new picture, deletes the older files but keeps the new one', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload,
      getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.test/avatars/doc-1/avatar.png' } }),
    } as never);
    const { container } = renderPage();

    const input = container.querySelector('input[type="file"][accept^="image/"]') as HTMLInputElement;
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('Profile picture updated.')).toBeInTheDocument());
    expect(upload).toHaveBeenCalledWith('doc-1/avatar.png', file, { upsert: true });
    expect(removeAvatarFiles).toHaveBeenCalledWith('doc-1', 'doc-1/avatar.png');
  });
});

describe('DoctorProfile tabs (QA-173)', () => {
  const auth = (doctorProfile: Record<string, unknown>) =>
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'doc-1', email: 'doc@test.com' },
      profile: { full_name: 'Dr. Test Person' },
      doctorProfile,
      isLoading: false,
      refreshProfile: vi.fn(),
    } as never);

  const bookable = (doctors: Array<Record<string, unknown>>) =>
    vi.mocked(useBookableDoctors).mockReturnValue({
      data: doctors,
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.mocked(useDoctorClinicMembership).mockReturnValue({ data: null } as never);
    vi.mocked(useSpecializations).mockReturnValue({ data: [], loading: false, error: null } as never);
    vi.mocked(useDoctorSpecializationIds).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    withTemplates([]);
    bookable([]);
    auth({ license_number: 'DHA-1', dha_license_verified: false, dha_verified_at: null });
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('opens on My profile and switches between the three tabs', () => {
    renderPage();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['My profile', 'Public preview', 'DHA & compliance']);
    expect(screen.getByRole('tab', { name: 'My profile' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /Edit Profile/ })).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: 'DHA & compliance' }));
    expect(screen.getByRole('tab', { name: 'DHA & compliance' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: /Edit Profile/ })).not.toBeInTheDocument();
    expect(screen.queryByText('This view is ready for the public preview')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'My profile' }));
    expect(screen.getByRole('button', { name: /Edit Profile/ })).toBeVisible();
  });

  it('keeps unsaved profile edits when switching tabs', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter your full name'), { target: { value: 'Dr. Half Typed' } });

    fireEvent.click(screen.getByRole('tab', { name: 'Public preview' }));
    fireEvent.click(screen.getByRole('tab', { name: 'My profile' }));

    expect(screen.getByPlaceholderText('Enter your full name')).toHaveValue('Dr. Half Typed');
  });

  it('shows licence, pending status and how to get verified', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'DHA & compliance' }));

    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByTestId('compliance-licence')).toHaveTextContent('DHA-1');
    expect(within(panel).getByTestId('compliance-status')).toHaveTextContent('Pending');
    expect(within(panel).getByTestId('compliance-date')).toHaveTextContent('—');
    expect(panel).toHaveTextContent('To get verified, send your DHA licence to support@ceenaix.com');
  });

  it('shows the verified status and date in Arabic', async () => {
    await i18n.changeLanguage('ar');
    auth({ license_number: 'DHA-1', dha_license_verified: true, dha_verified_at: '2026-03-05T10:00:00Z' });
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'هيئة الصحة والامتثال' }));

    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByTestId('compliance-status')).toHaveTextContent('موثّق');
    expect(within(panel).getByTestId('compliance-date')).toHaveTextContent('٢٠٢٦');
    expect(panel).not.toHaveTextContent('support@ceenaix.com');
  });

  it('shows the card patients see, with tips for what is missing', () => {
    bookable([
      { userId: 'other', fullName: 'Dr. Other', specialty: 'Cardiology', city: 'Dubai', address: null, activeAvailabilityCount: 3 },
      { userId: 'doc-1', fullName: 'Dr. Test Person', specialty: null, city: 'Dubai', address: 'Villa 12, Jumeirah', activeAvailabilityCount: 0 },
    ]);
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Public preview' }));

    const card = screen.getByTestId('public-preview-card');
    expect(card).toHaveTextContent('Dr. Test Person');
    expect(card).toHaveTextContent('General practice');
    expect(card).toHaveTextContent('Dubai • Villa 12, Jumeirah');
    expect(card).toHaveTextContent('0 windows');
    expect(card).not.toHaveTextContent('Dr. Other');

    const tips = screen.getByTestId('public-preview-tips');
    expect(tips).toHaveTextContent("You have no open time slots, so patients can't book you yet.");
    expect(within(tips).getByRole('link', { name: 'Open Schedule' })).toHaveAttribute('href', '/doctor/schedule');
    expect(tips).toHaveTextContent('No specialization is set');
    expect(tips).toHaveTextContent('Use your clinic address, not your home address.');
  });

  it('shows only the general tip when the card is complete', () => {
    bookable([
      { userId: 'doc-1', fullName: 'Dr. Test Person', specialty: 'Cardiology', city: 'Dubai', address: null, activeAvailabilityCount: 2 },
    ]);
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Public preview' }));

    expect(screen.getByTestId('public-preview-card')).toHaveTextContent('2 windows');
    const tips = screen.getByTestId('public-preview-tips');
    expect(within(tips).getAllByRole('listitem')).toHaveLength(1);
    expect(tips).toHaveTextContent("Patients don't see your photo, bio or licence on this card yet.");
  });

  it('says so when the doctor is not in the booking list', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Public preview' }));
    expect(screen.getByTestId('preview-not-listed')).toHaveTextContent("You don't appear in the patient booking list yet.");
  });
});

