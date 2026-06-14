import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Mail,
  Phone,
  Calendar,
  CircleUser as UserCircle,
  MapPin,
  Save,
  CreditCard as Edit2,
  X,
  Stethoscope,
  FileText,
  ClipboardList,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { AccountSecurityPanel } from '../../components/AccountSecurityPanel';
import { SpecializationMultiSelect } from '../../components/SpecializationMultiSelect';
import {
  useDoctorClinicMembership,
  useDoctorPreVisitTemplates,
  useDoctorSpecializationIds,
  useSpecializations,
} from '../../hooks';
import { dateTimeFormatWithNumerals, resolveLocale } from '../../lib/i18n-ui';
import { useAuth } from '../../lib/auth-context';
import { extractPreVisitQuestionnaire, uploadPreVisitTemplateSource } from '../../lib/ai';
import {
  getPrimaryAndSecondarySpecializations,
  getSelectedSpecializations,
  syncDoctorSpecializations,
} from '../../lib/doctor-specializations';
import {
  PRE_VISIT_AUTOFILL_SOURCE_OPTIONS,
  normalizeTemplateQuestion,
  type PreVisitTemplateQuestionDraft,
} from '../../lib/pre-visit';
import { supabase } from '../../lib/supabase';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';

interface DoctorProfileFormState {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  selectedSpecializationIds: string[];
  licenseNumber: string;
  bio: string;
}

interface PreVisitTemplateEditorState {
  id: string | null;
  title: string;
  description: string;
  specializationId: string | null;
  sourceBucket: 'documents' | null;
  sourcePath: string | null;
  sourceFileName: string | null;
  extractionNotes: string[];
  questions: PreVisitTemplateQuestionDraft[];
}

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const createEmptyQuestion = (index: number): PreVisitTemplateQuestionDraft =>
  normalizeTemplateQuestion(
    {
      key: `question_${index + 1}`,
      label: '',
      helpText: null,
      type: 'short_text',
      required: false,
      options: [],
      displayOrder: index,
      autofillSource: null,
      memoryKey: null,
      aiInstructions: null,
    },
    index
  );

const createEmptyTemplateDraft = (): PreVisitTemplateEditorState => ({
  id: null,
  title: '',
  description: '',
  specializationId: null,
  sourceBucket: null,
  sourcePath: null,
  sourceFileName: null,
  extractionNotes: [],
  questions: [createEmptyQuestion(0)],
});

export const DoctorProfile: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const locale = resolveLocale(i18n.language);
  const dtOpts = (options: Intl.DateTimeFormatOptions) => dateTimeFormatWithNumerals(i18n.language, options);
  const { doctorProfile, isLoading, profile, refreshProfile, user } = useAuth();
  const { data: clinicMembership } = useDoctorClinicMembership(user?.id);
  const isPhoneManagedByOtp = Boolean(user?.phone && !user?.email);
  const templateFileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    data: specializationOptionsData,
    loading: specializationsLoading,
    error: specializationsError,
  } = useSpecializations();
  const specializationOptions = useMemo(() => specializationOptionsData ?? [], [specializationOptionsData]);
  const {
    data: doctorSpecializationIdsData,
    loading: doctorSpecializationIdsLoading,
    refetch: refetchDoctorSpecializationIds,
  } = useDoctorSpecializationIds(user?.id);
  const doctorSpecializationIds = useMemo(
    () => doctorSpecializationIdsData ?? [],
    [doctorSpecializationIdsData]
  );
  const {
    data: preVisitTemplatesData,
    loading: preVisitTemplatesLoading,
    error: preVisitTemplatesError,
    refetch: refetchPreVisitTemplates,
  } = useDoctorPreVisitTemplates(user?.id);
  const preVisitTemplates = useMemo(() => preVisitTemplatesData ?? [], [preVisitTemplatesData]);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState<PreVisitTemplateEditorState>(createEmptyTemplateDraft);
  const [templateDirty, setTemplateDirty] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateExtracting, setTemplateExtracting] = useState(false);
  const [templateErrorMessage, setTemplateErrorMessage] = useState<string | null>(null);
  const [templateSuccessMessage, setTemplateSuccessMessage] = useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'preview' | 'compliance'>('profile');
  const [formData, setFormData] = useState<DoctorProfileFormState>({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    selectedSpecializationIds: [],
    licenseNumber: '',
    bio: '',
  });
  const selectedSpecializations = useMemo(
    () => getSelectedSpecializations(formData.selectedSpecializationIds, specializationOptions),
    [formData.selectedSpecializationIds, specializationOptions]
  );
  const specializationSummary =
    selectedSpecializations.length > 0
      ? selectedSpecializations.map((specialization) => specialization.name).join(', ')
      : 'Add your specialization to complete your clinician profile';
  const specializationNameById = useMemo(
    () => new Map(specializationOptions.map((specialization) => [specialization.id, specialization.name])),
    [specializationOptions]
  );
  const activePreVisitTemplate =
    preVisitTemplates.find((template) => template.isActive) ?? preVisitTemplates[0] ?? null;
  const profileCompleteness = useMemo(() => {
    const fields = [
      formData.fullName,
      formData.email,
      formData.phone,
      formData.licenseNumber,
      formData.bio,
      formData.selectedSpecializationIds.length > 0 ? 'specialization' : '',
      activePreVisitTemplate ? 'template' : '',
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [activePreVisitTemplate, formData]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setFormData({
      fullName: profile?.full_name ?? '',
      email: user?.email ?? profile?.email ?? '',
      phone: profile?.phone ?? user?.phone ?? '',
      dateOfBirth: profile?.date_of_birth ?? '',
      gender: profile?.gender ?? '',
      address: profile?.address ?? '',
      selectedSpecializationIds: doctorSpecializationIds,
      licenseNumber: doctorProfile?.license_number ?? '',
      bio: doctorProfile?.bio ?? '',
    });
  }, [doctorProfile, doctorSpecializationIds, isEditing, profile, specializationOptions, user]);

  useEffect(() => {
    if (templateDirty) {
      return;
    }

    if (activePreVisitTemplate) {
      setTemplateDraft({
        id: activePreVisitTemplate.id,
        title: activePreVisitTemplate.title,
        description: activePreVisitTemplate.description ?? '',
        specializationId:
          activePreVisitTemplate.specializationId ?? formData.selectedSpecializationIds[0] ?? null,
        sourceBucket: activePreVisitTemplate.sourceBucket,
        sourcePath: activePreVisitTemplate.sourcePath,
        sourceFileName: activePreVisitTemplate.sourceFileName,
        extractionNotes:
          Array.isArray(activePreVisitTemplate.extractionMetadata.extractionNotes)
            ? (activePreVisitTemplate.extractionMetadata.extractionNotes as string[])
            : [],
        questions:
          activePreVisitTemplate.questions.length > 0
            ? activePreVisitTemplate.questions
            : [createEmptyQuestion(0)],
      });
      return;
    }

    setTemplateDraft((currentDraft) =>
      currentDraft.id || currentDraft.title || currentDraft.questions.some((question) => question.label.trim())
        ? currentDraft
        : {
            ...createEmptyTemplateDraft(),
            specializationId: formData.selectedSpecializationIds[0] ?? null,
          }
    );
  }, [activePreVisitTemplate, formData.selectedSpecializationIds, templateDirty]);

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile?.avatar_url]);

  const updateTemplateDraft = (nextState: Partial<PreVisitTemplateEditorState>) => {
    setTemplateDraft((currentDraft) => ({ ...currentDraft, ...nextState }));
    setTemplateDirty(true);
    setTemplateErrorMessage(null);
    setTemplateSuccessMessage(null);
  };

  const handleTemplateQuestionChange = (
    index: number,
    nextState: Partial<PreVisitTemplateQuestionDraft>
  ) => {
    setTemplateDraft((currentDraft) => {
      const nextQuestions = [...currentDraft.questions];
      nextQuestions[index] = normalizeTemplateQuestion(
        {
          ...nextQuestions[index],
          ...nextState,
        },
        index
      );

      return {
        ...currentDraft,
        questions: nextQuestions,
      };
    });
    setTemplateDirty(true);
    setTemplateErrorMessage(null);
    setTemplateSuccessMessage(null);
  };

  const handleAddTemplateQuestion = () => {
    setTemplateDraft((currentDraft) => ({
      ...currentDraft,
      questions: [...currentDraft.questions, createEmptyQuestion(currentDraft.questions.length)],
    }));
    setTemplateDirty(true);
    setTemplateErrorMessage(null);
    setTemplateSuccessMessage(null);
  };

  const handleRemoveTemplateQuestion = (index: number) => {
    setTemplateDraft((currentDraft) => {
      const nextQuestions = currentDraft.questions.filter((_, currentIndex) => currentIndex !== index);

      return {
        ...currentDraft,
        questions: nextQuestions.length > 0
          ? nextQuestions.map((question, currentIndex) =>
              normalizeTemplateQuestion({ ...question, displayOrder: currentIndex }, currentIndex)
            )
          : [createEmptyQuestion(0)],
      };
    });
    setTemplateDirty(true);
    setTemplateErrorMessage(null);
    setTemplateSuccessMessage(null);
  };

  const resetTemplateDraft = () => {
    setTemplateDirty(false);
    setTemplateErrorMessage(null);
    setTemplateSuccessMessage(null);

    if (activePreVisitTemplate) {
      setTemplateDraft({
        id: activePreVisitTemplate.id,
        title: activePreVisitTemplate.title,
        description: activePreVisitTemplate.description ?? '',
        specializationId:
          activePreVisitTemplate.specializationId ?? formData.selectedSpecializationIds[0] ?? null,
        sourceBucket: activePreVisitTemplate.sourceBucket,
        sourcePath: activePreVisitTemplate.sourcePath,
        sourceFileName: activePreVisitTemplate.sourceFileName,
        extractionNotes:
          Array.isArray(activePreVisitTemplate.extractionMetadata.extractionNotes)
            ? (activePreVisitTemplate.extractionMetadata.extractionNotes as string[])
            : [],
        questions:
          activePreVisitTemplate.questions.length > 0
            ? activePreVisitTemplate.questions
            : [createEmptyQuestion(0)],
      });
      return;
    }

    setTemplateDraft({
      ...createEmptyTemplateDraft(),
      specializationId: formData.selectedSpecializationIds[0] ?? null,
    });
  };

  const handleTemplateSourceSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const sourceFile = event.target.files?.[0];
    event.target.value = '';

    if (!user || !sourceFile) {
      return;
    }

    try {
      setTemplateErrorMessage(null);
      setTemplateSuccessMessage(null);
      setTemplateExtracting(true);

      const uploadedFile = await uploadPreVisitTemplateSource(user.id, sourceFile);
      const extractedDraft = await extractPreVisitQuestionnaire({
        bucket: 'documents',
        path: uploadedFile.path,
        fileName: uploadedFile.fileName,
      });

      setTemplateDraft({
        id: null,
        title: extractedDraft.title,
        description: extractedDraft.description ?? '',
        specializationId: templateDraft.specializationId ?? formData.selectedSpecializationIds[0] ?? null,
        sourceBucket: 'documents',
        sourcePath: uploadedFile.path,
        sourceFileName: uploadedFile.fileName,
        extractionNotes: extractedDraft.extractionNotes,
        questions:
          extractedDraft.questions.length > 0
            ? extractedDraft.questions.map((question, index) => normalizeTemplateQuestion(question, index))
            : [createEmptyQuestion(0)],
      });
      setTemplateDirty(true);
      setTemplateSuccessMessage('AI converted the PDF into an editable draft. Review it before publishing.');
    } catch (error) {
      setTemplateErrorMessage(
        error instanceof Error ? error.message : 'Unable to extract a questionnaire from this PDF.'
      );
    } finally {
      setTemplateExtracting(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Only JPG, PNG or WebP images are allowed.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Image must be smaller than 2MB.');
      return;
    }

    setUploadingAvatar(true);
    setErrorMessage(null);

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: publicUrl })
      .eq('user_id', user.id);

    if (profileError) {
      setErrorMessage(profileError.message);
      setUploadingAvatar(false);
      return;
    }

    setAvatarUrl(publicUrl);
    await refreshProfile();
    setUploadingAvatar(false);
    setSuccessMessage('Profile picture updated successfully!');
  };

  const handleAvatarDelete = async () => {
    if (!user || !avatarUrl) return;

    setUploadingAvatar(true);
    setErrorMessage(null);

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: null })
      .eq('user_id', user.id);

    if (profileError) {
      setErrorMessage(profileError.message);
      setUploadingAvatar(false);
      return;
    }

    setAvatarUrl(null);
    await refreshProfile();
    setUploadingAvatar(false);
    setSuccessMessage('Profile picture removed.');
  };

  const handleSave = async () => {
    if (!user) {
      setErrorMessage('You must be signed in to update your doctor profile.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (formData.selectedSpecializationIds.length === 0) {
      setErrorMessage('Select at least one specialization before saving your doctor profile.');
      setSaving(false);
      return;
    }

    const parsedName = splitFullName(formData.fullName);
    const { primarySpecialization, secondarySpecialization } = getPrimaryAndSecondarySpecializations(
      formData.selectedSpecializationIds,
      specializationOptions
    );
    const persistedPhone = isPhoneManagedByOtp ? user?.phone ?? profile?.phone ?? null : formData.phone.trim() || null;

    const { error: userProfileError } = await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        role: 'doctor',
        full_name: formData.fullName.trim() || 'Doctor',
        first_name: parsedName.firstName,
        last_name: parsedName.lastName,
        phone: persistedPhone,
        email: user.email ?? (formData.email.trim() || null),
        address: formData.address.trim() || null,
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        profile_completed: profile?.profile_completed ?? false,
        terms_accepted: profile?.terms_accepted ?? true,
        notification_preferences: profile?.notification_preferences ?? {},
        city: profile?.city ?? null,
        avatar_url: profile?.avatar_url ?? null,
        emirates_id: profile?.emirates_id ?? null,
      },
      { onConflict: 'user_id' }
    );

    if (userProfileError) {
      setErrorMessage(userProfileError.message);
      setSaving(false);
      return;
    }

    const { error: doctorProfileError } = await supabase.from('doctor_profiles').upsert(
      {
        user_id: user.id,
        specialization: primarySpecialization,
        license_number: formData.licenseNumber.trim() || null,
        bio: formData.bio.trim() || null,
        sub_specialization: secondarySpecialization,
        years_of_experience: doctorProfile?.years_of_experience ?? null,
        consultation_fee: doctorProfile?.consultation_fee ?? null,
        languages_spoken: doctorProfile?.languages_spoken ?? ['English'],
        dha_license_verified: doctorProfile?.dha_license_verified ?? false,
        dha_verified_at: doctorProfile?.dha_verified_at ?? null,
      },
      { onConflict: 'user_id' }
    );

    if (doctorProfileError) {
      setErrorMessage(doctorProfileError.message);
      setSaving(false);
      return;
    }

    try {
      await syncDoctorSpecializations(user.id, formData.selectedSpecializationIds);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save doctor specializations.');
      setSaving(false);
      return;
    }

    await Promise.all([refreshProfile(), refetchDoctorSpecializationIds()]);
    setSaving(false);
    setIsEditing(false);
    setSuccessMessage('Doctor profile updated.');
  };

  const handleSavePreVisitTemplate = async (publish: boolean) => {
    if (!user) {
      setTemplateErrorMessage('You must be signed in to manage pre-visit templates.');
      return;
    }

    const normalizedQuestions = templateDraft.questions.map((question, index) =>
      normalizeTemplateQuestion(question, index)
    );

    if (!templateDraft.title.trim()) {
      setTemplateErrorMessage('Add a template title before saving.');
      return;
    }

    if (normalizedQuestions.length === 0 || normalizedQuestions.every((question) => !question.label.trim())) {
      setTemplateErrorMessage('Add at least one questionnaire item before saving.');
      return;
    }

    setTemplateSaving(true);
    setTemplateErrorMessage(null);
    setTemplateSuccessMessage(null);

    try {
      if (publish) {
        const { error: deactivateError } = await supabase
          .from('pre_visit_templates')
          .update({ is_active: false })
          .eq('doctor_user_id', user.id)
          .eq('is_active', true);

        if (deactivateError) {
          throw deactivateError;
        }
      }

      const templatePayload = {
        doctor_user_id: user.id,
        specialization_id: templateDraft.specializationId ?? formData.selectedSpecializationIds[0] ?? null,
        title: templateDraft.title.trim(),
        description: templateDraft.description.trim() || null,
        status: publish ? 'published' : 'draft',
        is_active: publish,
        source_bucket: templateDraft.sourceBucket,
        source_path: templateDraft.sourcePath,
        source_file_name: templateDraft.sourceFileName,
        extraction_metadata: {
          extractionNotes: templateDraft.extractionNotes,
          lastSavedAt: new Date().toISOString(),
        },
        published_at: publish ? new Date().toISOString() : null,
        is_deleted: false,
        deleted_at: null,
      };

      const templateMutation = templateDraft.id
        ? await supabase
            .from('pre_visit_templates')
            .update(templatePayload)
            .eq('id', templateDraft.id)
            .eq('doctor_user_id', user.id)
            .select('id')
            .single()
        : await supabase.from('pre_visit_templates').insert(templatePayload).select('id').single();

      if (templateMutation.error) {
        throw templateMutation.error;
      }

      const nextTemplateId = templateMutation.data.id;

      const { error: deleteQuestionsError } = await supabase
        .from('pre_visit_template_questions')
        .delete()
        .eq('template_id', nextTemplateId);

      if (deleteQuestionsError) {
        throw deleteQuestionsError;
      }

      const { error: insertQuestionsError } = await supabase.from('pre_visit_template_questions').insert(
        normalizedQuestions.map((question, index) => ({
          template_id: nextTemplateId,
          question_key: question.key,
          label: question.label,
          help_text: question.helpText,
          question_type: question.type,
          display_order: index,
          is_required: question.required,
          options: question.options,
          autofill_source: question.autofillSource,
          memory_key: question.memoryKey,
          ai_instructions: question.aiInstructions,
        }))
      );

      if (insertQuestionsError) {
        throw insertQuestionsError;
      }

      setTemplateDraft((currentDraft) => ({
        ...currentDraft,
        id: nextTemplateId,
        questions: normalizedQuestions,
      }));
      setTemplateDirty(false);
      setTemplateSuccessMessage(
        publish
          ? 'Pre-visit template published. New bookings will receive this intake.'
          : 'Pre-visit draft saved.'
      );
      await refetchPreVisitTemplates();
    } catch (error) {
      setTemplateErrorMessage(
        error instanceof Error ? error.message : 'Unable to save the pre-visit template.'
      );
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Review and update the profile information patients will rely on.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Profile completeness</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${profileCompleteness}%` }} />
              </div>
              <span className="font-mono text-sm font-bold text-teal-700">{profileCompleteness}%</span>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'profile' as const, label: 'My Profile' },
              { id: 'preview' as const, label: 'Public Preview' },
              { id: 'compliance' as const, label: 'DHA & Compliance' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveProfileTab(tab.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeProfileTab === tab.id ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {activeProfileTab !== 'profile' ? (
          <div className="p-5">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              This view is ready for the public preview and compliance-specific tables. The editable profile and pre-visit template sections below remain connected to the canonical profile data.
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="overflow-hidden rounded-3xl bg-white shadow-md">
            <div className="bg-gradient-to-r from-slate-900 to-emerald-800 px-8 py-12">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-teal-600" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white shadow-md transition hover:bg-teal-700 disabled:opacity-60"
                    title="Upload profile picture"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {avatarUrl ? (
                    <button
                      type="button"
                      onClick={handleAvatarDelete}
                      disabled={uploadingAvatar}
                      className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-600 disabled:opacity-60"
                      title="Remove profile picture"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div className="text-white">
                  <h2 className="text-3xl font-bold">{formData.fullName || 'Doctor profile'}</h2>
                  <p className="mt-1 text-emerald-100">
                    {specializationSummary}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 py-6">
              {errorMessage ? (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              {clinicMembership ? (
                <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                        {t('doctorProfile.clinicManagedBadge')}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {t('doctorProfile.clinicManagedTitle')}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {t('doctorProfile.clinicManagedHint', {
                          clinic:
                            clinicMembership.facilities?.name_en ??
                            clinicMembership.facilities?.name ??
                            t('clinic.facilityFallback'),
                        })}
                      </p>
                    </div>
                    {(clinicMembership.facilities?.phone || clinicMembership.facilities?.email) && (
                      <div className="text-sm text-slate-600">
                        {clinicMembership.facilities?.phone ? (
                          <p>{clinicMembership.facilities.phone}</p>
                        ) : null}
                        {clinicMembership.facilities?.email ? (
                          <p>{clinicMembership.facilities.email}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-sm font-medium text-slate-500">{t('clinic.doctors.fieldConsultFee')}</dt>
                      <dd className="mt-1 font-mono text-base text-slate-900">
                        {clinicMembership.consultation_fee != null
                          ? `AED ${clinicMembership.consultation_fee}`
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">{t('clinic.doctors.fieldTeleFee')}</dt>
                      <dd className="mt-1 font-mono text-base text-slate-900">
                        {clinicMembership.telemedicine_fee != null
                          ? `AED ${clinicMembership.telemedicine_fee}`
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">{t('clinic.doctors.fieldFollowUpFee')}</dt>
                      <dd className="mt-1 font-mono text-base text-slate-900">
                        {clinicMembership.follow_up_fee != null ? `AED ${clinicMembership.follow_up_fee}` : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Professional Information</h3>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Profile
                  </button>
                ) : null}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      maxLength={FORM_FIELD_LIMITS.personName}
                      onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-500"
                    />
                  </div>

                  {!isPhoneManagedByOtp ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        maxLength={FORM_FIELD_LIMITS.phone}
                        onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  ) : null}

                  <SpecializationMultiSelect
                    label="Specialization"
                    options={specializationOptions}
                    selectedIds={formData.selectedSpecializationIds}
                    onChange={(value) => setFormData({ ...formData, selectedSpecializationIds: value })}
                    loading={specializationsLoading || doctorSpecializationIdsLoading}
                    helperText={
                      specializationsError
                        ? 'Specializations could not be loaded yet.'
                        : 'Search and select one or more specialties. Selected items appear as chips.'
                    }
                  />

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">License Number</label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      maxLength={FORM_FIELD_LIMITS.licenseNumber}
                      onChange={(event) =>
                        setFormData({ ...formData, licenseNumber: event.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      placeholder="Enter your medical license number"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(event) =>
                        setFormData({ ...formData, dateOfBirth: event.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(event) => setFormData({ ...formData, gender: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      value={formData.address}
                      maxLength={FORM_FIELD_LIMITS.address}
                      onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      rows={3}
                      placeholder="Enter your address"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Professional Bio</label>
                    <textarea
                      value={formData.bio}
                      maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                      onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      rows={4}
                      placeholder="Summarize your expertise and care approach"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2 text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="mt-1 text-base text-gray-900">{formData.email || 'Not provided'}</p>
                    </div>
                  </div>

                  {!isPhoneManagedByOtp ? (
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        <Phone className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="mt-1 text-base text-gray-900">{formData.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      <Stethoscope className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Specialization</p>
                      {selectedSpecializations.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedSpecializations.map((specialization) => (
                            <span
                              key={specialization.id}
                              className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700"
                            >
                              {specialization.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-base text-gray-900">
                          Not provided
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">License Number</p>
                      <p className="mt-1 text-base text-gray-900">
                        {formData.licenseNumber || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                      <p className="mt-1 text-base text-gray-900">
                        {formData.dateOfBirth
                          ? new Date(formData.dateOfBirth).toLocaleDateString(
                              locale,
                              dtOpts({ year: 'numeric', month: 'short', day: 'numeric' })
                            )
                          : 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      <UserCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Gender</p>
                      <p className="mt-1 text-base capitalize text-gray-900">
                        {formData.gender || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 md:col-span-2">
                    <div className="mt-1">
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="mt-1 text-base text-gray-900">{formData.address || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 md:col-span-2">
                    <div className="mt-1">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Bio</p>
                      <p className="mt-1 text-base text-gray-900">{formData.bio || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-md">
            <div className="border-b border-gray-100 px-8 py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Pre-Visit Intake Template</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Upload a doctor questionnaire PDF, let AI convert it into structured questions, then review and publish the intake patients complete after booking.
                  </p>
                </div>
                {activePreVisitTemplate ? (
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                    Active template:
                    {' '}
                    <span className="font-semibold">{activePreVisitTemplate.title}</span>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600">
                    No published template yet
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 px-8 py-6">
              {templateErrorMessage ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {templateErrorMessage}
                </div>
              ) : null}

              {templateSuccessMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {templateSuccessMessage}
                </div>
              ) : null}

              {preVisitTemplatesError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  {preVisitTemplatesError}
                  <button
                    type="button"
                    onClick={() => void refetchPreVisitTemplates()}
                    className="ml-2 font-semibold underline"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              <input
                ref={templateFileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleTemplateSourceSelected}
              />

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => templateFileInputRef.current?.click()}
                      disabled={templateExtracting || templateSaving}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {templateExtracting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload PDF and draft
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTemplateQuestion}
                      disabled={templateExtracting || templateSaving}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      Add question
                    </button>
                    <button
                      type="button"
                      onClick={resetTemplateDraft}
                      disabled={templateExtracting || templateSaving}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      Reset
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">Template title</span>
                      <input
                        type="text"
                        value={templateDraft.title}
                        maxLength={FORM_FIELD_LIMITS.shortText}
                        onChange={(event) => updateTemplateDraft({ title: event.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                        placeholder="Cardiology pre-visit intake"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">Specialization</span>
                      <select
                        value={templateDraft.specializationId ?? ''}
                        onChange={(event) =>
                          updateTemplateDraft({ specializationId: event.target.value || null })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Use doctor primary specialty</option>
                        {specializationOptions.map((specialization) => (
                          <option key={specialization.id} value={specialization.id}>
                            {specialization.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Description</span>
                    <textarea
                      value={templateDraft.description}
                      maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                      onChange={(event) => updateTemplateDraft({ description: event.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      placeholder="Short note shown in the patient pre-visit flow."
                    />
                  </label>

                  <div className="mt-6 space-y-4">
                    {templateDraft.questions.map((question, index) => (
                      <div key={`${question.key}-${index}`} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">Question {index + 1}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveTemplateQuestion(index)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-sm font-medium text-gray-700">Prompt</span>
                            <input
                              type="text"
                              value={question.label}
                              maxLength={FORM_FIELD_LIMITS.shortText}
                              onChange={(event) =>
                                handleTemplateQuestionChange(index, { label: event.target.value })
                              }
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                              placeholder="Describe your current symptoms"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-gray-700">Question type</span>
                            <select
                              value={question.type}
                              onChange={(event) =>
                                handleTemplateQuestionChange(index, {
                                  type: event.target.value as PreVisitTemplateQuestionDraft['type'],
                                })
                              }
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="short_text">Short text</option>
                              <option value="long_text">Long text</option>
                              <option value="single_select">Single select</option>
                              <option value="multi_select">Multi select</option>
                              <option value="boolean">Yes / No</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-gray-700">Autofill source</span>
                            <select
                              value={question.autofillSource ?? ''}
                              onChange={(event) =>
                                handleTemplateQuestionChange(index, {
                                  autofillSource: event.target.value || null,
                                })
                              }
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="">No autofill</option>
                              {PRE_VISIT_AUTOFILL_SOURCE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-gray-700">Memory key</span>
                            <input
                              type="text"
                              value={question.memoryKey ?? ''}
                              maxLength={FORM_FIELD_LIMITS.shortText}
                              onChange={(event) =>
                                handleTemplateQuestionChange(index, {
                                  memoryKey: event.target.value || null,
                                })
                              }
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                              placeholder="symptom_duration"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Use the same key for semantically equivalent questions across templates.
                            </p>
                          </label>

                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-sm font-medium text-gray-700">Help text</span>
                            <textarea
                              value={question.helpText ?? ''}
                              maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                              onChange={(event) =>
                                handleTemplateQuestionChange(index, { helpText: event.target.value })
                              }
                              rows={2}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                              placeholder="Explain what the patient should include."
                            />
                          </label>

                          {question.type === 'single_select' || question.type === 'multi_select' ? (
                            <label className="block md:col-span-2">
                              <span className="mb-1 block text-sm font-medium text-gray-700">
                                Options
                              </span>
                              <textarea
                                value={question.options.map((option) => option.label).join('\n')}
                                maxLength={FORM_FIELD_LIMITS.chatMessage}
                                onChange={(event) =>
                                  handleTemplateQuestionChange(index, {
                                    options: event.target.value
                                      .split('\n')
                                      .map((option) => option.trim())
                                      .filter(Boolean)
                                      .map((option) => ({ label: option, value: option })),
                                  })
                                }
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                                placeholder={'Chest pain\nShortness of breath\nPalpitations'}
                              />
                            </label>
                          ) : null}

                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(event) =>
                                handleTemplateQuestionChange(index, { required: event.target.checked })
                              }
                              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            Required question
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Template summary</p>
                        <p className="text-sm text-gray-600">
                          Patients will be asked to complete this right after booking.
                        </p>
                      </div>
                    </div>

                    <dl className="mt-5 space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-gray-500">Questions</dt>
                        <dd className="font-medium text-gray-900">{templateDraft.questions.length}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-gray-500">Required</dt>
                        <dd className="font-medium text-gray-900">
                          {templateDraft.questions.filter((question) => question.required).length}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-gray-500">Specialization</dt>
                        <dd className="text-right font-medium text-gray-900">
                          {templateDraft.specializationId
                            ? specializationNameById.get(templateDraft.specializationId) ?? 'Selected'
                            : 'Doctor primary specialty'}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-gray-500">Source PDF</dt>
                        <dd className="text-right font-medium text-gray-900">
                          {templateDraft.sourceFileName ?? 'Structured draft only'}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 space-y-3">
                      <button
                        type="button"
                        onClick={() => void handleSavePreVisitTemplate(false)}
                        disabled={templateSaving || templateExtracting}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {templateSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save draft
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSavePreVisitTemplate(true)}
                        disabled={templateSaving || templateExtracting}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {templateSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Publish active template
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h4 className="font-semibold text-gray-900">Extraction notes</h4>
                    {templateExtracting || preVisitTemplatesLoading ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing pre-visit template data...
                      </div>
                    ) : templateDraft.extractionNotes.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm text-gray-700">
                        {templateDraft.extractionNotes.map((note) => (
                          <li key={note} className="rounded-xl bg-gray-50 px-3 py-2">
                            {note}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-gray-600">
                        Upload a PDF to receive AI extraction notes and a structured draft questionnaire.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AccountSecurityPanel tone="doctor" />
        </div>
      </div>
    </>
  );
};
