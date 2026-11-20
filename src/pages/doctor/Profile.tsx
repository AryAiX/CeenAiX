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
import {
  dateTimeFormatWithNumerals,
  formatLocaleCurrency,
  formatLocaleDigits,
  resolveLocale,
} from '../../lib/i18n-ui';
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
import { removeAvatarFiles } from '../../lib/avatar-storage';
import {
  liveTemplate,
  nextFreeQuestionKey,
  pickEditorTemplate,
  templateQuestionsPayload,
  withUniqueQuestionKeys,
} from '../../lib/pre-visit-template-editor';
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

const createEmptyQuestion = (index: number, key = `question_${index + 1}`): PreVisitTemplateQuestionDraft =>
  normalizeTemplateQuestion(
    {
      key,
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
  const uiLang = i18n.language;
  // QA-171: translated labels for stored values.
  const genderLabel = (value: string) =>
    ['male', 'female', 'other'].includes(value) ? t(`doctor.profile.gender.${value}`) : value;
  const autofillLabel = (value: string, fallback: string) =>
    t(`doctor.profile.template.autofill.${value.replace(/\./g, '_')}`, { defaultValue: fallback });
  const fee = (value: number | null | undefined) => (value != null ? formatLocaleCurrency(value, uiLang) : '—');
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
  // QA-172: ask before removing the profile picture.
  const [confirmingPhotoRemoval, setConfirmingPhotoRemoval] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState<PreVisitTemplateEditorState>(createEmptyTemplateDraft);
  const [templateDirty, setTemplateDirty] = useState(false);
  // QA-166: the template open in the editor (may be a draft while another one is live).
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateExtracting, setTemplateExtracting] = useState(false);
  const [templateErrorMessage, setTemplateErrorMessage] = useState<string | null>(null);
  const [templateSuccessMessage, setTemplateSuccessMessage] = useState<string | null>(null);
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
      : t('doctor.profile.specializationMissing');
  const specializationNameById = useMemo(
    () => new Map(specializationOptions.map((specialization) => [specialization.id, specialization.name])),
    [specializationOptions]
  );
  // QA-166: the live template patients get, and the one open in the editor (can differ).
  const activePreVisitTemplate = useMemo(() => liveTemplate(preVisitTemplates), [preVisitTemplates]);
  const editorTemplate = useMemo(
    () => pickEditorTemplate(preVisitTemplates, editingTemplateId),
    [editingTemplateId, preVisitTemplates]
  );
  // QA-168: changing the licence number turns DHA verification off until an admin checks it again.
  const licenceChangeLosesVerification = Boolean(
    doctorProfile?.dha_license_verified &&
      formData.licenseNumber.trim() !== (doctorProfile.license_number ?? '').trim()
  );
  const editingLiveTemplate = Boolean(templateDraft.id && templateDraft.id === activePreVisitTemplate?.id);
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

    if (editorTemplate) {
      setTemplateDraft({
        id: editorTemplate.id,
        title: editorTemplate.title,
        description: editorTemplate.description ?? '',
        specializationId:
          editorTemplate.specializationId ?? formData.selectedSpecializationIds[0] ?? null,
        sourceBucket: editorTemplate.sourceBucket,
        sourcePath: editorTemplate.sourcePath,
        sourceFileName: editorTemplate.sourceFileName,
        extractionNotes:
          Array.isArray(editorTemplate.extractionMetadata.extractionNotes)
            ? (editorTemplate.extractionMetadata.extractionNotes as string[])
            : [],
        questions:
          editorTemplate.questions.length > 0
            ? editorTemplate.questions
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
  }, [editorTemplate, formData.selectedSpecializationIds, templateDirty]);

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
      questions: [
        ...currentDraft.questions,
        // QA-170: never reuse a key that is still in the list (e.g. after removing a question).
        createEmptyQuestion(currentDraft.questions.length, nextFreeQuestionKey(currentDraft.questions)),
      ],
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

    if (editorTemplate) {
      setTemplateDraft({
        id: editorTemplate.id,
        title: editorTemplate.title,
        description: editorTemplate.description ?? '',
        specializationId:
          editorTemplate.specializationId ?? formData.selectedSpecializationIds[0] ?? null,
        sourceBucket: editorTemplate.sourceBucket,
        sourcePath: editorTemplate.sourcePath,
        sourceFileName: editorTemplate.sourceFileName,
        extractionNotes:
          Array.isArray(editorTemplate.extractionMetadata.extractionNotes)
            ? (editorTemplate.extractionMetadata.extractionNotes as string[])
            : [],
        questions:
          editorTemplate.questions.length > 0
            ? editorTemplate.questions
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
      setTemplateSuccessMessage(t('doctor.profile.template.extracted'));
    } catch {
      setTemplateErrorMessage(t('doctor.profile.template.errExtract'));
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
      setErrorMessage(t('doctor.profile.errPhotoType'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage(t('doctor.profile.errPhotoSize'));
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
      setErrorMessage(t('doctor.profile.errPhoto'));
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
      setErrorMessage(t('doctor.profile.errPhoto'));
      setUploadingAvatar(false);
      return;
    }

    // QA-172: delete older pictures (e.g. avatar.jpg after uploading avatar.png). Best effort:
    // the new picture is already saved, so a failure here should not block the doctor.
    try {
      await removeAvatarFiles(user.id, filePath);
    } catch {
      // Left for the next upload or removal to clean up.
    }

    setAvatarUrl(publicUrl);
    await refreshProfile();
    setUploadingAvatar(false);
    setSuccessMessage(t('doctor.profile.photoUpdated'));
  };

  const handleAvatarDelete = async () => {
    if (!user || !avatarUrl) return;

    setConfirmingPhotoRemoval(false);
    setUploadingAvatar(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // QA-172: delete the image file first, so it is no longer reachable by its public link.
    // If that fails nothing has changed yet and the doctor can try again.
    try {
      await removeAvatarFiles(user.id);
    } catch {
      setErrorMessage(t('doctor.profile.errPhoto'));
      setUploadingAvatar(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: null })
      .eq('user_id', user.id);

    if (profileError) {
      setErrorMessage(t('doctor.profile.errPhoto'));
      setUploadingAvatar(false);
      return;
    }

    setAvatarUrl(null);
    await refreshProfile();
    setUploadingAvatar(false);
    setSuccessMessage(t('doctor.profile.photoRemoved'));
  };

  const handleSave = async () => {
    if (!user) {
      setErrorMessage(t('doctor.profile.errSignedOut'));
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // QA-167: a doctor profile needs a name; saving an empty one used to store "Doctor".
    const fullName = formData.fullName.trim();
    if (!fullName) {
      setErrorMessage(t('doctor.profile.errNameRequired'));
      setSaving(false);
      return;
    }

    if (formData.selectedSpecializationIds.length === 0) {
      setErrorMessage(t('doctor.profile.errSpecializationRequired'));
      setSaving(false);
      return;
    }

    const parsedName = splitFullName(fullName);
    const { primarySpecialization, secondarySpecialization } = getPrimaryAndSecondarySpecializations(
      formData.selectedSpecializationIds,
      specializationOptions
    );

    // QA-167: save only the fields on this form. The old upsert also wrote back role, email,
    // terms_accepted (defaulting to true), notification settings, city, photo, fee, languages
    // (defaulting to English) and the DHA verification flag, from values that could be missing
    // or out of date.
    const { data: updatedProfiles, error: userProfileError } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        first_name: parsedName.firstName,
        last_name: parsedName.lastName,
        ...(isPhoneManagedByOtp ? {} : { phone: formData.phone.trim() || null }),
        address: formData.address.trim() || null,
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || null,
      })
      .eq('user_id', user.id)
      .select('user_id');

    if (userProfileError) {
      setErrorMessage(t('doctor.profile.errSave'));
      setSaving(false);
      return;
    }

    if (!updatedProfiles || updatedProfiles.length === 0) {
      setErrorMessage(t('doctor.profile.errProfileMissing'));
      setSaving(false);
      return;
    }

    const { error: doctorProfileError } = await supabase.from('doctor_profiles').upsert(
      {
        user_id: user.id,
        specialization: primarySpecialization,
        sub_specialization: secondarySpecialization,
        license_number: formData.licenseNumber.trim() || null,
        bio: formData.bio.trim() || null,
      },
      { onConflict: 'user_id' }
    );

    if (doctorProfileError) {
      setErrorMessage(t('doctor.profile.errSave'));
      setSaving(false);
      return;
    }

    try {
      await syncDoctorSpecializations(user.id, formData.selectedSpecializationIds);
    } catch {
      setErrorMessage(t('doctor.profile.errSave'));
      setSaving(false);
      return;
    }

    await Promise.all([refreshProfile(), refetchDoctorSpecializationIds()]);
    setSaving(false);
    setIsEditing(false);
    setSuccessMessage(t('doctor.profile.saved'));
  };

  const handleSavePreVisitTemplate = async (publish: boolean) => {
    if (!user) {
      setTemplateErrorMessage(t('doctor.profile.errSignedOut'));
      return;
    }

    // QA-170: keys must be unique, or the database refuses the whole save.
    const normalizedQuestions = withUniqueQuestionKeys(
      templateDraft.questions.map((question, index) => normalizeTemplateQuestion(question, index))
    );

    if (!templateDraft.title.trim()) {
      setTemplateErrorMessage(t('doctor.profile.template.errTitleRequired'));
      return;
    }

    if (normalizedQuestions.length === 0 || normalizedQuestions.every((question) => !question.label.trim())) {
      setTemplateErrorMessage(t('doctor.profile.template.errQuestionRequired'));
      return;
    }

    setTemplateSaving(true);
    setTemplateErrorMessage(null);
    setTemplateSuccessMessage(null);

    try {
      // QA-166: one database call saves the template and its questions (all or nothing).
      // "Save draft" on the live template keeps it live and saves the changes as a new draft.
      const { data: saveResult, error: saveError } = await supabase.rpc('save_doctor_pre_visit_template', {
        p_template_id: templateDraft.id,
        p_publish: publish,
        p_title: templateDraft.title.trim(),
        p_description: templateDraft.description.trim() || null,
        p_specialization_id: templateDraft.specializationId ?? formData.selectedSpecializationIds[0] ?? null,
        p_source_bucket: templateDraft.sourceBucket,
        p_source_path: templateDraft.sourcePath,
        p_source_file_name: templateDraft.sourceFileName,
        p_extraction_notes: templateDraft.extractionNotes,
        p_questions: templateQuestionsPayload(normalizedQuestions),
      });

      if (saveError) {
        throw saveError;
      }

      const result = (saveResult ?? {}) as { template_id?: string; saved_as_copy?: boolean };
      const nextTemplateId = result.template_id ?? templateDraft.id;

      setEditingTemplateId(nextTemplateId);
      setTemplateDraft((currentDraft) => ({
        ...currentDraft,
        id: nextTemplateId,
        questions: normalizedQuestions,
      }));
      // Reload first, then let the editor follow the saved template (no flash of the old one).
      await refetchPreVisitTemplates();
      setTemplateDirty(false);
      setTemplateSuccessMessage(
        publish
          ? t('doctor.profile.template.published')
          : result.saved_as_copy
            ? t('doctor.profile.template.savedAsDraftCopy')
            : t('doctor.profile.template.draftSaved')
      );
    } catch {
      setTemplateErrorMessage(t('doctor.profile.template.errSave'));
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
          <h1 className="text-2xl font-bold text-slate-900">{t('doctor.profile.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('doctor.profile.subtitle')}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('doctor.profile.completeness')}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${profileCompleteness}%` }} />
              </div>
              <span className="font-mono text-sm font-bold text-teal-700">
                {t('doctor.profile.completenessValue', { value: formatLocaleDigits(profileCompleteness, uiLang) })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="overflow-hidden rounded-3xl bg-white shadow-md">
            <div className="bg-gradient-to-r from-slate-900 to-emerald-800 px-8 py-12">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={t('doctor.profile.photoAlt')}
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
                    className="absolute bottom-0 end-0 flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white shadow-md transition hover:bg-teal-700 disabled:opacity-60"
                    title={t('doctor.profile.uploadPhoto')}
                    aria-label={t('doctor.profile.uploadPhoto')}
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
                      onClick={() => setConfirmingPhotoRemoval(true)}
                      disabled={uploadingAvatar}
                      className="absolute -top-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-600 disabled:opacity-60"
                      title={t('doctor.profile.removePhoto')}
                      aria-label={t('doctor.profile.removePhoto')}
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
                  <h2 className="text-3xl font-bold">{formData.fullName || t('doctor.profile.nameFallback')}</h2>
                  <p className="mt-1 text-emerald-100">
                    {specializationSummary}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 py-6">
              {confirmingPhotoRemoval && avatarUrl ? (
                <div
                  role="alertdialog"
                  aria-labelledby="remove-photo-question"
                  className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  <p id="remove-photo-question">{t('doctor.profile.removePhotoConfirm')}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAvatarDelete()}
                      className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white transition hover:bg-red-700"
                    >
                      {t('doctor.profile.removePhotoYes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingPhotoRemoval(false)}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      {t('doctor.profile.removePhotoNo')}
                    </button>
                  </div>
                </div>
              ) : null}

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
                        {fee(clinicMembership.consultation_fee)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">{t('clinic.doctors.fieldTeleFee')}</dt>
                      <dd className="mt-1 font-mono text-base text-slate-900">
                        {fee(clinicMembership.telemedicine_fee)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">{t('clinic.doctors.fieldFollowUpFee')}</dt>
                      <dd className="mt-1 font-mono text-base text-slate-900">
                        {fee(clinicMembership.follow_up_fee)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{t('doctor.profile.professionalInfo')}</h3>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    {t('doctor.profile.edit')}
                  </button>
                ) : null}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.fields.fullName')}</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      maxLength={FORM_FIELD_LIMITS.personName}
                      onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      placeholder={t('doctor.profile.placeholders.fullName')}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.fields.email')}</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-500"
                    />
                  </div>

                  {!isPhoneManagedByOtp ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.fields.phone')}</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        maxLength={FORM_FIELD_LIMITS.phone}
                        onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                        placeholder={t('doctor.profile.placeholders.phone')}
                      />
                    </div>
                  ) : null}

                  <SpecializationMultiSelect
                    label={t('doctor.profile.fields.specialization')}
                    placeholder={t('doctor.profile.placeholders.specializationSearch')}
                    options={specializationOptions}
                    selectedIds={formData.selectedSpecializationIds}
                    onChange={(value) => setFormData({ ...formData, selectedSpecializationIds: value })}
                    loading={specializationsLoading || doctorSpecializationIdsLoading}
                    helperText={
                      specializationsError
                        ? t('doctor.profile.specializationLoadError')
                        : t('doctor.profile.specializationHelp')
                    }
                  />

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.fields.licenseNumber')}</label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      maxLength={FORM_FIELD_LIMITS.licenseNumber}
                      onChange={(event) =>
                        setFormData({ ...formData, licenseNumber: event.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      placeholder={t('doctor.profile.placeholders.licenseNumber')}
                      aria-describedby={licenceChangeLosesVerification ? 'licence-change-warning' : undefined}
                    />
                    {licenceChangeLosesVerification ? (
                      <p
                        id="licence-change-warning"
                        className="mt-1 text-xs text-amber-700"
                        data-testid="licence-change-warning"
                      >
                        {t('doctor.profile.licenceChangeWarning')}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.fields.dateOfBirth')}</label>
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
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.fields.gender')}</label>
                    <select
                      value={formData.gender}
                      onChange={(event) => setFormData({ ...formData, gender: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">{t('doctor.profile.gender.select')}</option>
                      <option value="male">{t('doctor.profile.gender.male')}</option>
                      <option value="female">{t('doctor.profile.gender.female')}</option>
                      <option value="other">{t('doctor.profile.gender.other')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.fields.address')}</label>
                    <textarea
                      value={formData.address}
                      maxLength={FORM_FIELD_LIMITS.address}
                      onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      rows={3}
                      placeholder={t('doctor.profile.placeholders.address')}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.fields.bio')}</label>
                    <textarea
                      value={formData.bio}
                      maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                      onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      rows={4}
                      placeholder={t('doctor.profile.placeholders.bio')}
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
                      {saving ? t('doctor.profile.saving') : t('doctor.profile.save')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      {t('doctor.profile.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('doctor.profile.fields.email')}</p>
                      <p className="mt-1 text-base text-gray-900">
                        {formData.email ? <bdi>{formData.email}</bdi> : t('doctor.profile.notProvided')}
                      </p>
                    </div>
                  </div>

                  {!isPhoneManagedByOtp ? (
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Phone className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{t('doctor.profile.fields.phone')}</p>
                        <p className="mt-1 text-base text-gray-900">
                          {formData.phone ? <bdi dir="ltr">{formData.phone}</bdi> : t('doctor.profile.notProvided')}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Stethoscope className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('doctor.profile.fields.specialization')}</p>
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
                          {t('doctor.profile.notProvided')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('doctor.profile.fields.licenseNumber')}</p>
                      <p className="mt-1 text-base text-gray-900">
                        {formData.licenseNumber ? <bdi>{formData.licenseNumber}</bdi> : t('doctor.profile.notProvided')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('doctor.profile.fields.dateOfBirth')}</p>
                      <p className="mt-1 text-base text-gray-900">
                        {formData.dateOfBirth
                          ? new Date(formData.dateOfBirth).toLocaleDateString(
                              locale,
                              // The date has no time; read it as UTC so no time zone moves it a day.
                              dtOpts({ year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
                            )
                          : t('doctor.profile.notProvided')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <UserCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('doctor.profile.fields.gender')}</p>
                      <p className="mt-1 text-base text-gray-900">
                        {formData.gender ? genderLabel(formData.gender) : t('doctor.profile.notProvided')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 md:col-span-2">
                    <div className="mt-1">
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('doctor.profile.fields.address')}</p>
                      <p className="mt-1 text-base text-gray-900">{formData.address || t('doctor.profile.notProvided')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 md:col-span-2">
                    <div className="mt-1">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('doctor.profile.fields.bioShort')}</p>
                      <p className="mt-1 text-base text-gray-900">{formData.bio || t('doctor.profile.notProvided')}</p>
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
                  <h3 className="text-xl font-semibold text-gray-900">{t('doctor.profile.template.title')}</h3>
                  <p className="mt-1 text-sm text-gray-600">{t('doctor.profile.template.intro')}</p>
                </div>
                {activePreVisitTemplate ? (
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                    {t('doctor.profile.template.activeLabel')}
                    {' '}
                    <span className="font-semibold">{activePreVisitTemplate.title}</span>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600">
                    {t('doctor.profile.template.noneLive')}
                  </div>
                )}
              </div>
              {templateDraft.id ? (
                <p className="mt-3 text-sm text-gray-600" data-testid="template-editing-status">
                  {editingLiveTemplate
                    ? t('doctor.profile.template.editingLive')
                    : activePreVisitTemplate
                      ? t('doctor.profile.template.editingDraft', { live: activePreVisitTemplate.title })
                      : t('doctor.profile.template.editingDraftNoLive')}
                </p>
              ) : null}
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
                  {t('doctor.profile.template.errLoad')}
                  <button
                    type="button"
                    onClick={() => void refetchPreVisitTemplates()}
                    className="ms-2 font-semibold underline"
                  >
                    {t('shared.retry')}
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
                      {t('doctor.profile.template.uploadPdf')}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTemplateQuestion}
                      disabled={templateExtracting || templateSaving}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      {t('doctor.profile.template.addQuestion')}
                    </button>
                    <button
                      type="button"
                      onClick={resetTemplateDraft}
                      disabled={templateExtracting || templateSaving}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      {t('doctor.profile.template.reset')}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.template.fieldTitle')}</span>
                      <input
                        type="text"
                        value={templateDraft.title}
                        maxLength={FORM_FIELD_LIMITS.shortText}
                        onChange={(event) => updateTemplateDraft({ title: event.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                        placeholder={t('doctor.profile.template.titlePlaceholder')}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.fields.specialization')}</span>
                      <select
                        value={templateDraft.specializationId ?? ''}
                        onChange={(event) =>
                          updateTemplateDraft({ specializationId: event.target.value || null })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">{t('doctor.profile.template.specializationDefault')}</option>
                        {specializationOptions.map((specialization) => (
                          <option key={specialization.id} value={specialization.id}>
                            {specialization.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.template.fieldDescription')}</span>
                    <textarea
                      value={templateDraft.description}
                      maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                      onChange={(event) => updateTemplateDraft({ description: event.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                      placeholder={t('doctor.profile.template.descriptionPlaceholder')}
                    />
                  </label>

                  <div className="mt-6 space-y-4">
                    {templateDraft.questions.map((question, index) => (
                      <div key={`${question.key}-${index}`} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {t('doctor.profile.template.questionNumber', { value: formatLocaleDigits(index + 1, uiLang) })}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRemoveTemplateQuestion(index)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('doctor.profile.template.remove')}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.template.prompt')}</span>
                            <input
                              type="text"
                              value={question.label}
                              maxLength={FORM_FIELD_LIMITS.shortText}
                              onChange={(event) =>
                                handleTemplateQuestionChange(index, { label: event.target.value })
                              }
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                              placeholder={t('doctor.profile.template.promptPlaceholder')}
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.template.questionType')}</span>
                            <select
                              value={question.type}
                              onChange={(event) =>
                                handleTemplateQuestionChange(index, {
                                  type: event.target.value as PreVisitTemplateQuestionDraft['type'],
                                })
                              }
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="short_text">{t('doctor.profile.template.types.short_text')}</option>
                              <option value="long_text">{t('doctor.profile.template.types.long_text')}</option>
                              <option value="single_select">{t('doctor.profile.template.types.single_select')}</option>
                              <option value="multi_select">{t('doctor.profile.template.types.multi_select')}</option>
                              <option value="boolean">{t('doctor.profile.template.types.boolean')}</option>
                              <option value="number">{t('doctor.profile.template.types.number')}</option>
                              <option value="date">{t('doctor.profile.template.types.date')}</option>
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.template.autofillSource')}</span>
                            <select
                              value={question.autofillSource ?? ''}
                              onChange={(event) =>
                                handleTemplateQuestionChange(index, {
                                  autofillSource: event.target.value || null,
                                })
                              }
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="">{t('doctor.profile.template.noAutofill')}</option>
                              {PRE_VISIT_AUTOFILL_SOURCE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {autofillLabel(option.value, option.label)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.template.memoryKey')}</span>
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
                              {t('doctor.profile.template.memoryKeyHelp')}
                            </p>
                          </label>

                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-sm font-medium text-gray-700">{t('doctor.profile.template.helpText')}</span>
                            <textarea
                              value={question.helpText ?? ''}
                              maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                              onChange={(event) =>
                                handleTemplateQuestionChange(index, { helpText: event.target.value })
                              }
                              rows={2}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-teal-500"
                              placeholder={t('doctor.profile.template.helpTextPlaceholder')}
                            />
                          </label>

                          {question.type === 'single_select' || question.type === 'multi_select' ? (
                            <label className="block md:col-span-2">
                              <span className="mb-1 block text-sm font-medium text-gray-700">
                                {t('doctor.profile.template.options')}
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
                                placeholder={t('doctor.profile.template.optionsPlaceholder')}
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
                            {t('doctor.profile.template.required')}
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
                        <p className="font-semibold text-gray-900">{t('doctor.profile.template.summaryTitle')}</p>
                        <p className="text-sm text-gray-600">{t('doctor.profile.template.summaryHint')}</p>
                      </div>
                    </div>

                    <dl className="mt-5 space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-gray-500">{t('doctor.profile.template.summaryQuestions')}</dt>
                        <dd className="font-medium text-gray-900">
                          {formatLocaleDigits(templateDraft.questions.length, uiLang)}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-gray-500">{t('doctor.profile.template.summaryRequired')}</dt>
                        <dd className="font-medium text-gray-900">
                          {formatLocaleDigits(
                            templateDraft.questions.filter((question) => question.required).length,
                            uiLang
                          )}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-gray-500">{t('doctor.profile.fields.specialization')}</dt>
                        <dd className="text-end font-medium text-gray-900">
                          {templateDraft.specializationId
                            ? specializationNameById.get(templateDraft.specializationId) ?? t('doctor.profile.template.summarySelected')
                            : t('doctor.profile.template.summaryPrimary')}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-gray-500">{t('doctor.profile.template.sourcePdf')}</dt>
                        <dd className="text-end font-medium text-gray-900">
                          {templateDraft.sourceFileName ? <bdi>{templateDraft.sourceFileName}</bdi> : t('doctor.profile.template.noSourcePdf')}
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
                        {t('doctor.profile.template.saveDraft')}
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
                        {t('doctor.profile.template.publish')}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h4 className="font-semibold text-gray-900">{t('doctor.profile.template.notesTitle')}</h4>
                    {templateExtracting || preVisitTemplatesLoading ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('doctor.profile.template.preparing')}
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
                        {t('doctor.profile.template.notesEmpty')}
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
