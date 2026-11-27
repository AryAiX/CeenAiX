import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ShieldCheck, Store, Trash2, Upload, UserRound, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue, usePharmacyUnreadMessages } from '../../hooks';
import { supabase } from '../../lib/supabase';
import { formatLocaleDigits } from '../../lib/i18n-ui';
import { formatClinicDate } from '../../lib/clinic-booking-time';
import { PHARMACY_NAV_ITEMS, pharmacyNavCounts } from './navItems';
import { groupReportPrescriptions } from './report-figures';
import { FORM_FIELD_LIMITS } from '../../lib/form-field-limits';
import {
  openDaysCount,
  parseWorkingHours,
  PHARMACY_DAYS,
  PHARMACY_NAME_MAX,
  PHARMACY_WEBSITE_MAX,
  validatePharmacyDetails,
  type FieldError,
  type PharmacyDetailsErrors,
  type PharmacyDetailsInput,
  type WorkingHours,
} from './profile-rules';

const DAYS = PHARMACY_DAYS;

const SHIFT_OPTIONS = ['on_shift', 'off_shift', 'on_call'] as const;
const SHIFT_DEFAULTS: Record<(typeof SHIFT_OPTIONS)[number], string> = {
  on_shift: 'On Shift',
  off_shift: 'Off Shift',
  on_call: 'On Call',
};

const LOGO_BUCKET = 'pharmacy-logos';
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** The storage path of the current logo, when it is a file in this pharmacy's own folder. */
const previousLogoPath = (logoUrl: string | null | undefined, orgId: string): string | null => {
  if (!logoUrl) return null;
  const marker = `/${LOGO_BUCKET}/`;
  const at = logoUrl.indexOf(marker);
  if (at < 0) return null;
  const path = decodeURIComponent(logoUrl.slice(at + marker.length).split('?')[0]);
  return path.startsWith(`${orgId}/`) ? path : null;
};

export const PharmacyProfile = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const { data, error, refetch } = usePharmacyPrescriptionQueue();
  const unreadMessages = usePharmacyUnreadMessages();
  const fallbackName = t('pharmacy.profile.fallbackName', { defaultValue: 'Pharmacy' });
  const notOnFile = t('pharmacy.profile.notOnFile', { defaultValue: 'Not on file' });
  const openDays = openDaysCount(data?.profile?.workingHoursJson);
  // QA-295: values as stored, or "Not on file" (no "Pending", no "UAE", and the pharmacist in
  // charge was the name of whoever was signed in).
  const stored = (value: string | null | undefined) => value?.trim() || notOnFile;
  // QA-295: open prescriptions as on Dispensing (the old number counted medicine lines, picked-up ones too).
  const openPrescriptions = groupReportPrescriptions(data?.queue ?? []).filter((prescription) =>
    ['new', 'in_progress', 'on_hold'].includes(prescription.status)
  ).length;
  const pharmacyName = data?.profile?.displayName ?? data?.organization?.name ?? fallbackName;

  const [workingHours, setWorkingHours] = useState<WorkingHours>(() => parseWorkingHours(null));
  const [fieldErrors, setFieldErrors] = useState<PharmacyDetailsErrors>({});

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    address: '',
    operating_hours: '',
    pharmacist_in_charge: '',
    phone: '',
    email: '',
    website: '',
    emergency_contact: '',
  });

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [updatingStaffId, setUpdatingStaffId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [staffListError, setStaffListError] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    role_title: '',
    credential_number: '',
    shift_status: 'on_shift',
  });

  const handleOpenEditModal = () => {
    setEditForm({
      display_name: data?.profile?.displayName ?? '',
      address: data?.profile?.address ?? '',
      operating_hours: data?.profile?.operatingHours ?? '',
      pharmacist_in_charge: data?.profile?.pharmacistInCharge ?? '',
      phone: data?.profile?.phone ?? '',
      email: data?.profile?.email ?? '',
      website: data?.profile?.website ?? '',
      emergency_contact: data?.profile?.emergencyContact ?? '',
    });
    // QA-293: stored hours with a missing or broken day no longer crash the dialog.
    setWorkingHours(parseWorkingHours(data?.profile?.workingHoursJson));
    setFieldErrors({});
    setEditError(null);
    setEditSuccess(false);
    setEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    // QA-293: check the details first, and check that the row was really changed.
    const checked = validatePharmacyDetails(editForm, workingHours);
    if (!checked.ok) {
      setFieldErrors(checked.errors);
      setEditError(t('pharmacy.profile.errors.fixFields', { defaultValue: 'Please correct the highlighted fields.' }));
      return;
    }
    const orgId = data?.organization?.id;
    setFieldErrors({});
    setEditSaving(true);
    setEditError(null);
    try {
      if (!orgId) throw new Error('no organization');
      const value = checked.value;
      const { data: updated, error } = await supabase
        .from('pharmacy_facility_profiles')
        .update({
          // QA-291: the licence and the DHA / NABIDH status are set by a CeenAiX administrator (the
          // database refuses changes to them from the portal), so they are not sent.
          display_name: value.display_name,
          address: value.address,
          operating_hours: editForm.operating_hours,
          pharmacist_in_charge: value.pharmacist_in_charge || null,
          phone: value.phone || null,
          email: value.email || null,
          website: value.website || null,
          emergency_contact: value.emergency_contact || null,
          working_hours_json: workingHours,
        })
        .eq('organization_id', orgId)
        .select('organization_id');
      if (error) throw error;
      if (!updated || updated.length === 0) {
        setEditError(
          t('pharmacy.profile.errors.noProfile', {
            defaultValue: 'This pharmacy has no profile to update yet. Contact CeenAiX support.',
          })
        );
        return;
      }
      setEditSuccess(true);
      void refetch();
      setTimeout(() => {
        setEditModalOpen(false);
        setEditSuccess(false);
      }, 1500);
    } catch (err) {
      console.warn(`[pharmacy] profile save failed: ${err instanceof Error ? err.message : String(err)}`);
      setEditError(t('pharmacy.profile.errors.saveFailed', { defaultValue: 'Could not save the changes. Please try again.' }));
    } finally {
      setEditSaving(false);
    }
  };

  const fieldErrorText = (error: FieldError | undefined) =>
    error ? t(`pharmacy.profile.errors.${error.key}`, { ...error.values, defaultValue: error.key }) : null;

  const renderDetailField = (field: { label: string; key: keyof PharmacyDetailsInput; type: string; placeholder: string; maxLength: number }) => {
    const error = fieldErrorText(fieldErrors[field.key]);
    const id = `pharmacy-profile-${field.key}`;
    return (
      <div key={field.key}>
        <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-600">
          {field.label}
        </label>
        <input
          id={id}
          type={field.type}
          value={editForm[field.key]}
          maxLength={field.maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setEditForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
          placeholder={field.placeholder}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none ${
            error ? 'border-red-300' : 'border-slate-200'
          }`}
        />
        {error ? (
          <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  const shiftLabel = (status: (typeof SHIFT_OPTIONS)[number]) =>
    t(`pharmacy.profile.shift.${status}`, { defaultValue: SHIFT_DEFAULTS[status] });

  const handleOpenStaffModal = () => {
    setStaffForm({
      full_name: '',
      role_title: '',
      credential_number: '',
      shift_status: 'on_shift',
    });
    setStaffError(null);
    setStaffSuccess(false);
    setStaffModalOpen(true);
  };

  // QA-294: plain messages, and every change checked (a refused change used to fail silently).
  const handleAddStaff = async () => {
    const fullName = staffForm.full_name.trim().replace(/\s+/g, ' ');
    const roleTitle = staffForm.role_title.trim().replace(/\s+/g, ' ');
    if (!fullName || !roleTitle) {
      setStaffError(t('pharmacy.profile.staffErrors.required', { defaultValue: 'Enter the name and the role.' }));
      return;
    }
    const orgId = data?.organization?.id;
    setStaffSaving(true);
    setStaffError(null);
    try {
      if (!orgId) throw new Error('no organization');
      const { data: added, error } = await supabase
        .from('organization_staff_members')
        .insert({
          organization_id: orgId,
          full_name: fullName,
          role_title: roleTitle,
          credential_number: staffForm.credential_number.trim() || null,
          shift_status: staffForm.shift_status,
        })
        .select('id');
      if (error) throw error;
      if (!added || added.length === 0) throw new Error('staff member not added (0 rows)');
      setStaffSuccess(true);
      void refetch();
      setTimeout(() => {
        setStaffModalOpen(false);
        setStaffSuccess(false);
      }, 1500);
    } catch (err) {
      console.warn(`[pharmacy] add staff failed: ${err instanceof Error ? err.message : String(err)}`);
      setStaffError(t('pharmacy.profile.staffErrors.addFailed', { defaultValue: 'Could not add the staff member. Please try again.' }));
    } finally {
      setStaffSaving(false);
    }
  };

  const handleUpdateShiftStatus = async (staffId: string, newStatus: string) => {
    setStaffListError(null);
    setUpdatingStaffId(staffId);
    try {
      const { data: changed, error } = await supabase
        .from('organization_staff_members')
        .update({ shift_status: newStatus })
        .eq('id', staffId)
        .select('id');
      if (error) throw error;
      if (!changed || changed.length === 0) throw new Error('shift not changed (0 rows)');
      void refetch();
    } catch (err) {
      console.warn(`[pharmacy] shift change failed: ${err instanceof Error ? err.message : String(err)}`);
      setStaffListError(t('pharmacy.profile.staffErrors.shiftFailed', { defaultValue: 'Could not change the shift. Please try again.' }));
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    setStaffListError(null);
    setDeletingStaffId(staffId);
    try {
      const { data: removed, error } = await supabase
        .from('organization_staff_members')
        .delete()
        .eq('id', staffId)
        .select('id');
      if (error) throw error;
      if (!removed || removed.length === 0) throw new Error('staff member not removed (0 rows)');
      setConfirmRemoveId(null);
      void refetch();
    } catch (err) {
      console.warn(`[pharmacy] remove staff failed: ${err instanceof Error ? err.message : String(err)}`);
      setStaffListError(t('pharmacy.profile.staffErrors.removeFailed', { defaultValue: 'Could not remove the staff member. Please try again.' }));
    } finally {
      setDeletingStaffId(null);
    }
  };

  // QA-292: JPEG, PNG or WebP up to 2 MB (the storage bucket allows only these), saved as a new file
  // in the pharmacy's own folder each time, so the browser shows the new logo at once.
  const handleLogoUpload = async (file: File) => {
    const orgId = data?.organization?.id;
    const extension = LOGO_TYPES[file.type];
    if (!extension) {
      setLogoError(t('pharmacy.profile.logoWrongType', { defaultValue: 'Choose a JPEG, PNG or WebP image.' }));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError(t('pharmacy.profile.logoTooBig', { defaultValue: 'The image must be 2 MB or smaller.' }));
      return;
    }
    if (!orgId || !data?.profile) {
      setLogoError(t('pharmacy.profile.logoNoProfile', { defaultValue: 'Save the pharmacy details first, then add a logo.' }));
      return;
    }
    setLogoUploading(true);
    setLogoError(null);
    try {
      const path = `${orgId}/logo-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
      const { data: updated, error: updateError } = await supabase
        .from('pharmacy_facility_profiles')
        .update({ logo_url: urlData.publicUrl })
        .eq('organization_id', orgId)
        .select('organization_id');
      if (updateError) throw updateError;
      if (!updated || updated.length === 0) throw new Error('logo_url not saved (0 rows)');
      // Remove the previous logo of this pharmacy (best effort: an old file left behind is harmless).
      const previous = previousLogoPath(data.profile.logoUrl, orgId);
      if (previous) void supabase.storage.from(LOGO_BUCKET).remove([previous]);
      void refetch();
    } catch (err) {
      console.warn(`[pharmacy] logo upload failed: ${err instanceof Error ? err.message : String(err)}`);
      setLogoError(t('pharmacy.profile.logoFailed', { defaultValue: 'Could not upload the logo. Please try again.' }));
    } finally {
      setLogoUploading(false);
    }
  };

  const operationRows: Array<[string, string, LucideIcon, string]> = [
    [
      t('pharmacy.profile.opOpenPrescriptions', { defaultValue: 'Prescriptions to dispense' }),
      formatLocaleDigits(openPrescriptions, uiLang),
      UserRound,
      '/pharmacy/dispensing',
    ],
    [t('pharmacy.profile.opAlerts', { defaultValue: 'Inventory alerts' }), formatLocaleDigits(data?.lowStockAlerts ?? 0, uiLang), ShieldCheck, '/pharmacy/inventory'],
  ];

  return (
    <OpsShell
      title={t('pharmacy.profile.title', { defaultValue: 'My Pharmacy' })}
      subtitle={`${pharmacyName} ${t('pharmacy.profile.subtitleSuffix', { defaultValue: 'profile' })}`}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, pharmacyNavCounts(data, unreadMessages))}
      accent="emerald"
      variant="pharmacy"
    >
      <PortalQueryBanner error={error} onRetry={() => void refetch()} />
      <div className="min-h-full bg-slate-50 p-6">
        <div className="w-full">
          <h2 className="mb-5 text-[20px] font-bold text-slate-900">
            {t('pharmacy.profile.title', { defaultValue: 'My Pharmacy' })}
          </h2>

          <section className="mb-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-5">
              <div className="flex flex-col items-center gap-1">
                <div className="relative">
                  {data?.profile?.logoUrl ? (
                    <img
                      src={data.profile.logoUrl}
                      alt={pharmacyName}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-xl font-bold text-white">
                      {pharmacyName
                        .split(/\s+/)
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  {/* QA-292: a real button (the label could not be reached with the keyboard). */}
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    aria-label={t('pharmacy.profile.changeLogo', { defaultValue: 'Change logo' })}
                    title={t('pharmacy.profile.changeLogo', { defaultValue: 'Change logo' })}
                    className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Upload className="h-3 w-3 text-white" aria-hidden="true" />
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    data-testid="logo-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void handleLogoUpload(file);
                    }}
                  />
                </div>
                {logoUploading ? (
                  <div className="text-xs text-emerald-600" role="status">
                    {t('pharmacy.profile.logoUploading', { defaultValue: 'Uploading…' })}
                  </div>
                ) : null}
                {logoError ? (
                  <div className="max-w-[10rem] text-center text-xs text-red-600" role="alert">
                    {logoError}
                  </div>
                ) : null}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{pharmacyName}</h3>
                {data?.organization?.city?.trim() ? (
                  <div className="text-sm text-slate-500">{data.organization.city}</div>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {/* QA-291: the stored status (the "DHA Licensed" badge was always shown). */}
                  <span
                    data-testid="badge-dha"
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      data?.profile?.dhaConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {data?.profile?.dhaConnected
                      ? t('pharmacy.profile.dhaLicensed', { defaultValue: 'DHA Licensed' })
                      : t('pharmacy.profile.dhaNotConfirmed', { defaultValue: 'DHA licence not confirmed' })}
                  </span>
                  <span
                    data-testid="badge-nabidh"
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      data?.profile?.nabidhConnected ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {data?.profile?.nabidhConnected
                      ? t('pharmacy.profile.nabidhConnected', { defaultValue: 'NABIDH Connected' })
                      : t('pharmacy.profile.nabidhNotConnected', { defaultValue: 'NABIDH not connected' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {[
                // QA-291: only a real licence (it fell back to the organization's notes), and the expiry as
                // a Dubai date (it was a day early west of UTC).
                [
                  t('pharmacy.profile.fieldLicense', { defaultValue: 'DHA License' }),
                  data?.profile?.licenseNumber?.trim() || notOnFile,
                ],
                [
                  t('pharmacy.profile.fieldLicenseValid', { defaultValue: 'License Valid Until' }),
                  data?.profile?.licenseValidUntil
                    ? formatClinicDate(data.profile.licenseValidUntil.slice(0, 10), uiLang)
                    : notOnFile,
                ],
                [
                  t('pharmacy.profile.fieldLocation', { defaultValue: 'Location' }),
                  data?.profile?.address?.trim() || stored(data?.organization?.city),
                ],
                [
                  t('pharmacy.profile.fieldHours', { defaultValue: 'Operating Hours' }),
                  // QA-293: counted safely from the stored hours, in the page language.
                  openDays !== null
                    ? t('pharmacy.profile.openDays', { count: openDays, defaultValue: 'Open {{count}} days a week' })
                    : stored(data?.profile?.operatingHours),
                ],
                [
                  t('pharmacy.profile.fieldPicName', { defaultValue: 'Pharmacist-in-Charge' }),
                  stored(data?.profile?.pharmacistInCharge),
                ],
                [
                  t('pharmacy.profile.fieldPhone', { defaultValue: 'Phone' }),
                  stored(data?.profile?.phone),
                ],
                [
                  t('pharmacy.profile.fieldEmail', { defaultValue: 'Email' }),
                  stored(data?.profile?.email),
                ],
                [
                  t('pharmacy.profile.fieldWebsite', { defaultValue: 'Website' }),
                  stored(data?.profile?.website),
                ],
                [
                  t('pharmacy.profile.fieldEmergencyContact', { defaultValue: 'Emergency Contact' }),
                  stored(data?.profile?.emergencyContact),
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-0.5 text-xs text-slate-400">{label}</div>
                  <div className="font-semibold text-slate-800">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.8fr]">
          <article className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm" aria-labelledby="pharmacy-staff-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h4 id="pharmacy-staff-heading" className="text-[15px] font-bold text-slate-800">
                {t('pharmacy.profile.staffHeading', { defaultValue: 'Staff' })}
              </h4>
              <button
                type="button"
                onClick={handleOpenStaffModal}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t('pharmacy.profile.addStaff', { defaultValue: 'Add Staff' })}
              </button>
            </div>
            {staffListError ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {staffListError}
              </div>
            ) : null}
            {(data?.staff ?? []).length === 0 ? (
              // QA-294: the old text said staff "will appear here once added by an admin", next to an Add button.
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <UserRound className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  {t('pharmacy.profile.staffEmpty', { defaultValue: 'No staff added yet' })}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {t('pharmacy.profile.staffEmptyHint', {
                    defaultValue: 'Use "Add Staff" to list the pharmacists and staff who work here.',
                  })}
                </p>
              </div>
            ) : null}
            <ul>
              {(data?.staff ?? []).map((staff) => {
                const confirming = confirmRemoveId === staff.id;
                return (
                  <li key={staff.id} data-testid="staff-row" className="border-b border-slate-100 py-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700"
                        aria-hidden="true"
                      >
                        {staff.fullName
                          .split(/\s+/)
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">{staff.fullName}</div>
                        <div className="truncate text-xs text-slate-500">
                          {staff.roleTitle} ·{' '}
                          <span className="font-mono">
                            {staff.credentialNumber ??
                              t('pharmacy.profile.credentialPending', { defaultValue: 'Credential pending' })}
                          </span>
                        </div>
                      </div>
                      <select
                        value={staff.shiftStatus}
                        disabled={updatingStaffId === staff.id}
                        aria-label={t('pharmacy.profile.shiftFor', { name: staff.fullName, defaultValue: 'Shift for {{name}}' })}
                        onChange={(e) => void handleUpdateShiftStatus(staff.id, e.target.value)}
                        className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold focus:outline-none disabled:opacity-60 ${
                          staff.shiftStatus === 'on_shift'
                            ? 'bg-emerald-100 text-emerald-700'
                            : staff.shiftStatus === 'on_call'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {SHIFT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {shiftLabel(option)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(staff.id)}
                        disabled={deletingStaffId === staff.id || confirming}
                        aria-label={t('pharmacy.profile.removeStaff', { name: staff.fullName, defaultValue: 'Remove {{name}}' })}
                        title={t('pharmacy.profile.removeStaff', { name: staff.fullName, defaultValue: 'Remove {{name}}' })}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    {confirming ? (
                      // QA-294: ask before removing (it used to remove at once).
                      <div
                        role="group"
                        aria-label={t('pharmacy.profile.removeStaffQuestion', { name: staff.fullName, defaultValue: 'Remove {{name}} from the staff list?' })}
                        className="mt-2 flex flex-wrap items-center justify-end gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800"
                      >
                        <span className="me-auto">
                          {t('pharmacy.profile.removeStaffQuestion', { name: staff.fullName, defaultValue: 'Remove {{name}} from the staff list?' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(null)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {t('pharmacy.profile.keepStaff', { defaultValue: 'Keep' })}
                        </button>
                        <button
                          type="button"
                          disabled={deletingStaffId === staff.id}
                          onClick={() => void handleDeleteStaff(staff.id)}
                          className="rounded-lg bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {t('pharmacy.profile.confirmRemove', { defaultValue: 'Remove' })}
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            </article>

            <article className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <Store className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-slate-800">
                    {t('pharmacy.profile.operationsHeading', { defaultValue: 'Operations Status' })}
                  </h4>
                  <div className="text-xs text-slate-400">
                    {t('pharmacy.profile.operationsCaption', { defaultValue: 'From the Dispensing and Inventory pages' })}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {operationRows.map(([label, value, Icon, route]) => (
                  <Link
                    key={label}
                    to={route}
                    data-testid="operation-row"
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 transition hover:ring-2 hover:ring-emerald-300"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Icon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      {label}
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-800">{value}</div>
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  {t('pharmacy.profile.editDetails', { defaultValue: 'Edit pharmacy details' })}
                </button>
              </div>
            </article>
          </section>
        </div>
      </div>
      {editModalOpen ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {t('pharmacy.profile.editDetails', { defaultValue: 'Edit pharmacy details' })}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{pharmacyName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 px-6 py-4">
              {editError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {editError}
                </div>
              ) : null}
              {editSuccess ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  ✅ Changes saved successfully!
                </div>
              ) : null}
              {(
                [
                  { label: 'Pharmacy Name', key: 'display_name', type: 'text', placeholder: 'Al Shifa Pharmacy', maxLength: PHARMACY_NAME_MAX },
                  { label: 'Address', key: 'address', type: 'text', placeholder: 'Al Barsha 1, Dubai, UAE', maxLength: FORM_FIELD_LIMITS.address },
                ] as const
              ).map(renderDetailField)}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">Working Hours</label>
                <div className="space-y-2">
                  {DAYS.map((day) => (
                    <div key={day}>
                    <div className="flex items-center gap-2" data-testid={`hours-${day}`}>
                      <div className="w-24 text-xs font-medium text-slate-600">{day}</div>
                      <input
                        type="time"
                        value={workingHours[day].open}
                        disabled={workingHours[day].closed}
                        onChange={(e) => setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }))}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-emerald-400 focus:outline-none disabled:opacity-40"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="time"
                        value={workingHours[day].close}
                        disabled={workingHours[day].closed}
                        onChange={(e) => setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }))}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-emerald-400 focus:outline-none disabled:opacity-40"
                      />
                      <button
                        type="button"
                        onClick={() => setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], closed: !prev[day].closed } }))}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${workingHours[day].closed ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}
                      >
                        {workingHours[day].closed ? 'Closed' : 'Open'}
                      </button>
                    </div>
                    {fieldErrors.days?.[day] ? (
                      <p className="mt-1 text-xs text-red-600" data-testid={`hours-error-${day}`}>
                        {fieldErrorText(fieldErrors.days[day])}
                      </p>
                    ) : null}
                    </div>
                  ))}
                </div>
              </div>
              {(
                [
                  { label: 'Pharmacist-in-Charge', key: 'pharmacist_in_charge', type: 'text', placeholder: 'Rania Hassan', maxLength: FORM_FIELD_LIMITS.personName },
                  { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+971 4 123 4567', maxLength: FORM_FIELD_LIMITS.phone },
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'info@alshifapharmacy.ae', maxLength: FORM_FIELD_LIMITS.email },
                  { label: 'Website', key: 'website', type: 'text', placeholder: 'www.alshifapharmacy.ae', maxLength: PHARMACY_WEBSITE_MAX },
                  { label: 'Emergency Contact', key: 'emergency_contact', type: 'tel', placeholder: '+971 50 999 8888', maxLength: FORM_FIELD_LIMITS.phone },
                ] as const
              ).map(renderDetailField)}
              <p role="note" className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {t('pharmacy.profile.regulatoryNote', {
                  defaultValue:
                    'The licence number, its expiry date and the DHA / NABIDH status are set by a CeenAiX administrator. Contact CeenAiX support to change them.',
                })}
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={() => void handleSaveProfile()}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      {staffModalOpen ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Add Staff Member</h2>
                <p className="mt-0.5 text-xs text-slate-500">{pharmacyName}</p>
              </div>
              <button
                type="button"
                onClick={() => setStaffModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 px-6 py-4">
              {staffError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {staffError}
                </div>
              ) : null}
              {staffSuccess ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  ✅ Staff member added successfully!
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={staffForm.full_name}
                  maxLength={FORM_FIELD_LIMITS.personName}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Rania Hassan"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Role Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={staffForm.role_title}
                  maxLength={FORM_FIELD_LIMITS.shortText}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, role_title: e.target.value }))}
                  placeholder="Head Pharmacist"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Credential Number <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={staffForm.credential_number}
                  maxLength={FORM_FIELD_LIMITS.licenseNumber}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, credential_number: e.target.value }))}
                  placeholder="DHA-PHAR-2017-001294"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Shift Status</label>
                <select
                  value={staffForm.shift_status}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, shift_status: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none"
                >
                  {SHIFT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {shiftLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setStaffModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={staffSaving}
                onClick={() => void handleAddStaff()}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {staffSaving ? 'Adding...' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </OpsShell>
  );
};
