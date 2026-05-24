import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, ArrowRight, LogOut, UserCheck } from 'lucide-react';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { SpecializationMultiSelect } from '../../components/SpecializationMultiSelect';
import { useDoctorSpecializationIds, useSpecializations } from '../../hooks';
import {
  getPrimaryAndSecondarySpecializations,
  syncDoctorSpecializations,
} from '../../lib/doctor-specializations';
import { getDefaultRouteForRole, useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import type { UserRole } from '../../types';

interface OnboardingFormState {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  selectedSpecializationIds: string[];
  licenseNumber: string;
  bio: string;
  termsAccepted: boolean;
}

const JAKARTA: CSSProperties = { fontFamily: 'Plus Jakarta Sans, sans-serif' };

const safeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const onboardingRoles: readonly UserRole[] = ['patient', 'doctor', 'pharmacy', 'lab', 'insurance', 'super_admin'];

const isOnboardingRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && onboardingRoles.includes(value as UserRole);

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

const getOnboardingRole = (role: UserRole | null, metadataRole: unknown): UserRole => {
  if (role) {
    return role;
  }

  return isOnboardingRole(metadataRole) ? metadataRole : 'patient';
};

export const Onboarding = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { doctorProfile, patientProfile, profile, refreshProfile, role, signOut, user } = useAuth();

  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<OnboardingFormState>({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    selectedSpecializationIds: [],
    licenseNumber: '',
    bio: '',
    termsAccepted: false,
  });
  const [hasInitializedDoctorSpecializations, setHasInitializedDoctorSpecializations] = useState(false);

  const activeRole = useMemo(
    () => getOnboardingRole(role, user?.user_metadata?.role),
    [role, user?.user_metadata?.role]
  );
  const isPhoneManagedByOtp = Boolean(user?.phone && !user?.email);
  const {
    data: specializationOptions = [],
    loading: specializationsLoading,
    error: specializationsError,
  } = useSpecializations();
  const {
    data: doctorSpecializationIds = [],
    loading: doctorSpecializationIdsLoading,
  } = useDoctorSpecializationIds(user?.id);

  useEffect(() => {
    if (hasInitialized || !user) {
      return;
    }

    setForm({
      fullName:
        profile?.full_name ??
        safeString(user.user_metadata?.full_name) ??
        safeString(user.email) ??
        '',
      email: profile?.email ?? user.email ?? '',
      phone: profile?.phone ?? user.phone ?? '',
      city: profile?.city ?? '',
      address: profile?.address ?? '',
      emergencyContactName: patientProfile?.emergency_contact_name ?? '',
      emergencyContactPhone: patientProfile?.emergency_contact_phone ?? '',
      selectedSpecializationIds: [],
      licenseNumber: doctorProfile?.license_number ?? '',
      bio: doctorProfile?.bio ?? '',
      termsAccepted: profile?.terms_accepted ?? Boolean(user.user_metadata?.terms_accepted),
    });
    setHasInitialized(true);
  }, [doctorProfile, hasInitialized, patientProfile, profile, user]);

  useEffect(() => {
    if (
      activeRole !== 'doctor' ||
      hasInitializedDoctorSpecializations ||
      !user ||
      doctorSpecializationIdsLoading
    ) {
      return;
    }

    setForm((current) => ({
      ...current,
      selectedSpecializationIds: Array.isArray(doctorSpecializationIds) ? doctorSpecializationIds : [],
    }));
    setHasInitializedDoctorSpecializations(true);
  }, [
    activeRole,
    doctorSpecializationIds,
    doctorSpecializationIdsLoading,
    hasInitializedDoctorSpecializations,
    user,
  ]);

  const updateField = <Key extends keyof OnboardingFormState>(
    field: Key,
    value: OnboardingFormState[Key]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!user) {
      setErrorMessage(t('auth.onboarding.errors.mustSignIn'));
      return;
    }

    if (!form.fullName.trim()) {
      setErrorMessage(t('auth.onboarding.errors.fullNameRequired'));
      return;
    }

    if (!user.email && !form.email.trim()) {
      setErrorMessage(t('auth.onboarding.errors.emailRequiredOtp'));
      return;
    }

    if (!form.termsAccepted) {
      setErrorMessage(t('auth.onboarding.errors.termsRequired'));
      return;
    }

    if (activeRole === 'doctor' && form.selectedSpecializationIds.length === 0) {
      setErrorMessage(t('auth.onboarding.errors.specializationRequired'));
      return;
    }

    setIsSubmitting(true);

    const parsedName = splitFullName(form.fullName);
    const persistedPhone = isPhoneManagedByOtp ? user?.phone ?? profile?.phone ?? null : form.phone.trim() || null;

    const { error: profileError } = await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        role: activeRole,
        full_name: form.fullName.trim(),
        first_name: parsedName.firstName,
        last_name: parsedName.lastName,
        phone: persistedPhone,
        email: user.email ?? (form.email.trim() || null),
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        avatar_url: profile?.avatar_url ?? null,
        date_of_birth: profile?.date_of_birth ?? null,
        gender: profile?.gender ?? null,
        emirates_id: profile?.emirates_id ?? null,
        notification_preferences: profile?.notification_preferences ?? {},
        profile_completed: true,
        terms_accepted: form.termsAccepted,
      },
      { onConflict: 'user_id' }
    );

    if (profileError) {
      setErrorMessage(profileError.message);
      setIsSubmitting(false);
      return;
    }

    if (activeRole === 'patient') {
      const { error } = await supabase.from('patient_profiles').upsert(
        {
          user_id: user.id,
          emergency_contact_name: form.emergencyContactName.trim() || null,
          emergency_contact_phone: form.emergencyContactPhone.trim() || null,
          blood_type: patientProfile?.blood_type ?? null,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }
    }

    if (activeRole === 'doctor') {
      const { primarySpecialization, secondarySpecialization } = getPrimaryAndSecondarySpecializations(
        form.selectedSpecializationIds,
        specializationOptions
      );

      const { error } = await supabase.from('doctor_profiles').upsert(
        {
          user_id: user.id,
          specialization: primarySpecialization,
          license_number: form.licenseNumber.trim() || null,
          bio: form.bio.trim() || null,
          sub_specialization: secondarySpecialization,
          years_of_experience: doctorProfile?.years_of_experience ?? null,
          consultation_fee: doctorProfile?.consultation_fee ?? null,
          languages_spoken: doctorProfile?.languages_spoken ?? [],
          dha_license_verified: doctorProfile?.dha_license_verified ?? false,
          dha_verified_at: doctorProfile?.dha_verified_at ?? null,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      try {
        await syncDoctorSpecializations(user.id, form.selectedSpecializationIds);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : t('auth.onboarding.errors.specializationsSaveFailed')
        );
        setIsSubmitting(false);
        return;
      }
    }

    await refreshProfile();
    setSuccessMessage(t('auth.onboarding.successSaved'));
    setIsSubmitting(false);
    navigate(getDefaultRouteForRole(activeRole), { replace: true });
  };

  const sidebarFeatures = [
    t('auth.roleAccess.sidebarFeature1'),
    t('auth.roleAccess.sidebarFeature2'),
    t('auth.roleAccess.sidebarFeature3'),
    t('auth.roleAccess.sidebarFeature4'),
  ];

  const inputClass =
    'w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <div className="relative min-h-screen bg-slate-50 lg:flex">
      <div className="absolute end-4 top-4 z-20 sm:end-6 sm:top-6 lg:end-8 lg:top-8">
        <LanguageSwitcher />
      </div>

      <div className="relative hidden w-80 shrink-0 flex-col justify-between overflow-hidden bg-slate-900 p-8 lg:flex">
        <div className="pointer-events-none absolute -right-20 top-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          <Link to="/" className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-white" style={JAKARTA}>
                CeenAiX
              </div>
              <div className="text-xs text-teal-400">{t('auth.roleAccess.sidebarEyebrow')}</div>
            </div>
          </Link>

          <div className="space-y-6">
            <div>
              <div className="text-2xl font-bold leading-tight text-white" style={JAKARTA}>
                {t('auth.roleAccess.sidebarTitle')}
              </div>
              <div className="mt-3 text-sm text-slate-400">
                {t('auth.roleAccess.sidebarDescription')}
              </div>
            </div>

            <div className="space-y-3">
              {sidebarFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative text-xs text-slate-500">{t('auth.roleAccess.copyright')}</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-2xl">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-800" style={JAKARTA}>
              CeenAiX
            </span>
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
            {t('auth.onboarding.badge')}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <h2 className="mb-1 text-2xl font-bold text-slate-900" style={JAKARTA}>
              {t('auth.onboarding.title')}
            </h2>
            <p className="mb-6 text-sm text-slate-500">{t('auth.onboarding.description')}</p>

            {errorMessage ? (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  {t('auth.onboarding.fields.fullName')}
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  maxLength={FORM_FIELD_LIMITS.personName}
                  className={inputClass}
                  placeholder={t('auth.onboarding.fields.fullNamePlaceholder')}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    {t('auth.onboarding.fields.email')}
                    {!user?.email ? t('auth.onboarding.fields.emailRequired') : ''}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    maxLength={FORM_FIELD_LIMITS.email}
                    className={`${inputClass} ${user?.email ? 'bg-slate-50 text-slate-500' : ''}`}
                    placeholder={t('auth.onboarding.fields.emailPlaceholder')}
                    autoComplete="email"
                    required={!user?.email}
                    disabled={Boolean(user?.email)}
                  />
                </div>

                {!isPhoneManagedByOtp ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      {t('auth.onboarding.fields.phone')}
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      maxLength={FORM_FIELD_LIMITS.phone}
                      className={inputClass}
                      placeholder={t('auth.register.mobilePlaceholder')}
                      autoComplete="tel"
                    />
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  {t('auth.onboarding.fields.city')}
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  maxLength={FORM_FIELD_LIMITS.shortText}
                  className={inputClass}
                  placeholder={t('auth.onboarding.fields.cityPlaceholder')}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  {t('auth.onboarding.fields.address')}
                </label>
                <textarea
                  value={form.address}
                  onChange={(event) => updateField('address', event.target.value)}
                  maxLength={FORM_FIELD_LIMITS.address}
                  rows={3}
                  className={inputClass}
                  placeholder={t('auth.onboarding.fields.addressPlaceholder')}
                />
              </div>

              {activeRole === 'patient' ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      {t('auth.onboarding.fields.emergencyName')}
                    </label>
                    <input
                      type="text"
                      value={form.emergencyContactName}
                      onChange={(event) => updateField('emergencyContactName', event.target.value)}
                      maxLength={FORM_FIELD_LIMITS.personName}
                      className={inputClass}
                      placeholder={t('auth.onboarding.fields.emergencyNamePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      {t('auth.onboarding.fields.emergencyPhone')}
                    </label>
                    <input
                      type="tel"
                      value={form.emergencyContactPhone}
                      onChange={(event) => updateField('emergencyContactPhone', event.target.value)}
                      maxLength={FORM_FIELD_LIMITS.phone}
                      className={inputClass}
                      placeholder={t('auth.onboarding.fields.emergencyPhonePlaceholder')}
                    />
                  </div>
                </div>
              ) : null}

              {activeRole === 'doctor' ? (
                <>
                  <SpecializationMultiSelect
                    label={t('auth.onboarding.doctor.specialization')}
                    options={specializationOptions}
                    selectedIds={form.selectedSpecializationIds}
                    onChange={(value) => updateField('selectedSpecializationIds', value)}
                    loading={specializationsLoading || doctorSpecializationIdsLoading}
                    placeholder={t('auth.onboarding.doctor.specSearchPlaceholder')}
                    helperText={
                      specializationsError
                        ? t('auth.onboarding.doctor.specHelperError')
                        : t('auth.onboarding.doctor.specHelperOk')
                    }
                  />

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      {t('auth.onboarding.fields.licenseNumber')}
                    </label>
                    <input
                      type="text"
                      value={form.licenseNumber}
                      onChange={(event) => updateField('licenseNumber', event.target.value)}
                      maxLength={FORM_FIELD_LIMITS.licenseNumber}
                      className={inputClass}
                      placeholder={t('auth.onboarding.fields.licensePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      {t('auth.onboarding.fields.bio')}
                    </label>
                    <textarea
                      value={form.bio}
                      onChange={(event) => updateField('bio', event.target.value)}
                      maxLength={FORM_FIELD_LIMITS.clinicalNotes}
                      rows={4}
                      className={inputClass}
                      placeholder={t('auth.onboarding.fields.bioPlaceholder')}
                    />
                  </div>
                </>
              ) : null}

              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={(event) => updateField('termsAccepted', event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm leading-relaxed text-slate-600">
                  {t('auth.onboarding.fields.termsConfirm')}
                </span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {/* Skip is intentionally not offered because ProtectedRoute will
                    immediately bounce the user back here until profile_completed
                    is true. Removed to avoid a redirect loop. */}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>
                    {isSubmitting ? t('auth.onboarding.buttons.saving') : t('auth.onboarding.buttons.save')}
                  </span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </div>

              <div className="flex items-center justify-center border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate('/auth/login', { replace: true });
                  }}
                  className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition-colors hover:text-teal-700"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t('auth.onboarding.buttons.useAnotherAccount')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
