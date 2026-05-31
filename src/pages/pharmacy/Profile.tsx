import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ShieldCheck, Store, Trash2, UserRound, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PortalQueryBanner } from '../../components/PortalQueryBanner';
import { OpsShell } from '../../components/OpsShell';
import { usePharmacyPrescriptionQueue } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { formatLocaleDigits } from '../../lib/i18n-ui';
import { PHARMACY_NAV_ITEMS } from './navItems';

export const PharmacyProfile = () => {
  const { t, i18n } = useTranslation('common');
  const uiLang = i18n.language ?? 'en';
  const { profile, user } = useAuth();
  const { data, error, refetch } = usePharmacyPrescriptionQueue();
  const fallbackName = t('pharmacy.profile.fallbackName', { defaultValue: 'Pharmacy' });
  const pendingLabel = t('pharmacy.profile.fallbackPending', { defaultValue: 'Pending' });
  const displayName =
    profile?.full_name?.trim() ||
    profile?.first_name?.trim() ||
    user?.email?.split('@')[0] ||
    fallbackName;
  const pharmacyName = data?.profile?.displayName ?? data?.organization?.name ?? fallbackName;

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    license_number: '',
    license_valid_until: '',
    address: '',
    operating_hours: '',
    pharmacist_in_charge: '',
  });

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    role_title: '',
    credential_number: '',
    shift_status: 'on_shift',
  });

  const handleOpenEditModal = () => {
    setEditForm({
      display_name: data?.profile?.displayName ?? '',
      license_number: data?.profile?.licenseNumber ?? '',
      license_valid_until: data?.profile?.licenseValidUntil ?? '',
      address: data?.profile?.address ?? '',
      operating_hours: data?.profile?.operatingHours ?? '',
      pharmacist_in_charge: data?.profile?.pharmacistInCharge ?? '',
    });
    setEditError(null);
    setEditSuccess(false);
    setEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    setEditSaving(true);
    setEditError(null);
    try {
      const { error } = await supabase
        .from('pharmacy_facility_profiles')
        .update({
          display_name: editForm.display_name,
          license_number: editForm.license_number,
          license_valid_until: editForm.license_valid_until || null,
          address: editForm.address,
          operating_hours: editForm.operating_hours,
          pharmacist_in_charge: editForm.pharmacist_in_charge,
        })
        .eq('organization_id', data?.organization?.id);
      if (error) throw error;
      setEditSuccess(true);
      void refetch();
      setTimeout(() => {
        setEditModalOpen(false);
        setEditSuccess(false);
      }, 1500);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setEditSaving(false);
    }
  };

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

  const handleAddStaff = async () => {
    if (!staffForm.full_name.trim() || !staffForm.role_title.trim()) {
      setStaffError('Name and role are required.');
      return;
    }
    setStaffSaving(true);
    setStaffError(null);
    try {
      const { error } = await supabase
        .from('organization_staff_members')
        .insert({
          organization_id: data?.organization?.id,
          full_name: staffForm.full_name.trim(),
          role_title: staffForm.role_title.trim(),
          credential_number: staffForm.credential_number.trim() || null,
          shift_status: staffForm.shift_status,
        });
      if (error) throw error;
      setStaffSuccess(true);
      void refetch();
      setTimeout(() => {
        setStaffModalOpen(false);
        setStaffSuccess(false);
      }, 1500);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Could not add staff member.');
    } finally {
      setStaffSaving(false);
    }
  };

  const handleUpdateShiftStatus = async (staffId: string, newStatus: string) => {
    try {
      await supabase
        .from('organization_staff_members')
        .update({ shift_status: newStatus })
        .eq('id', staffId);
      void refetch();
    } catch {
      // silent fail
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    setDeletingStaffId(staffId);
    try {
      await supabase
        .from('organization_staff_members')
        .delete()
        .eq('id', staffId);
      void refetch();
    } catch {
      // silent fail
    } finally {
      setDeletingStaffId(null);
    }
  };

  const operationRows: Array<[string, string | number, LucideIcon, string]> = [
    [t('pharmacy.profile.opPending', { defaultValue: 'Pending prescriptions' }), formatLocaleDigits(data?.pendingPrescriptions ?? 0, uiLang), UserRound, '/pharmacy/dispensing'],
    [t('pharmacy.profile.opAlerts', { defaultValue: 'Inventory alerts' }), formatLocaleDigits(data?.lowStockAlerts ?? 0, uiLang), ShieldCheck, '/pharmacy/inventory'],
    [
      t('pharmacy.profile.opDhaSync', { defaultValue: 'DHA sync' }),
      data?.profile?.dhaConnected
        ? t('pharmacy.profile.ready', { defaultValue: 'Ready' })
        : t('pharmacy.profile.needsSetup', { defaultValue: 'Needs setup' }),
      ShieldCheck,
      '/pharmacy/reports',
    ],
  ];

  return (
    <OpsShell
      title={t('pharmacy.profile.title', { defaultValue: 'My Pharmacy' })}
      subtitle={`${pharmacyName} ${t('pharmacy.profile.subtitleSuffix', { defaultValue: 'profile' })}`}
      eyebrow={t('pharmacy.dashboard.eyebrow')}
      navItems={PHARMACY_NAV_ITEMS(t, {
        prescriptions: data?.pendingPrescriptions || undefined,
        inventory: data?.lowStockAlerts || undefined,
        messages: data?.messages.reduce((sum, item) => sum + item.unreadCount, 0) || undefined,
      })}
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-xl font-bold text-white">
                {pharmacyName
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{pharmacyName}</h3>
                <div className="text-sm text-slate-500">
                  {data?.organization?.city ?? t('pharmacy.profile.fallbackLocation', { defaultValue: 'UAE' })}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    {t('pharmacy.profile.dhaLicensed', { defaultValue: 'DHA Licensed' })} ✅
                  </span>
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">
                    {data?.profile?.nabidhConnected
                      ? `${t('pharmacy.profile.nabidhConnected', { defaultValue: 'NABIDH Connected' })} ✅`
                      : t('pharmacy.profile.nabidhPending', { defaultValue: 'NABIDH Pending' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {[
                [
                  t('pharmacy.profile.fieldLicense', { defaultValue: 'DHA License' }),
                  data?.profile?.licenseNumber ?? data?.organization?.notes ?? pendingLabel,
                ],
                [
                  t('pharmacy.profile.fieldLicenseValid', { defaultValue: 'License Valid Until' }),
                  data?.profile?.licenseValidUntil
                    ? new Date(data.profile.licenseValidUntil).toLocaleDateString(uiLang)
                    : pendingLabel,
                ],
                [
                  t('pharmacy.profile.fieldLocation', { defaultValue: 'Location' }),
                  data?.profile?.address ??
                    data?.organization?.city ??
                    t('pharmacy.profile.fallbackLocation', { defaultValue: 'UAE' }),
                ],
                [
                  t('pharmacy.profile.fieldHours', { defaultValue: 'Operating Hours' }),
                  data?.profile?.operatingHours ?? pendingLabel,
                ],
                [
                  t('pharmacy.profile.fieldPicName', { defaultValue: 'Pharmacist-in-Charge' }),
                  data?.profile?.pharmacistInCharge ?? displayName,
                ],
                [
                  t('pharmacy.profile.fieldEprescription', { defaultValue: 'CeenAiX ePrescription' }),
                  data?.profile?.dhaConnected
                    ? `${t('pharmacy.profile.connected', { defaultValue: 'Connected' })} ✅`
                    : t('pharmacy.profile.notConnected', { defaultValue: 'Not connected' }),
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
<article className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-[15px] font-bold text-slate-800">
              {t('pharmacy.profile.staffHeading', { defaultValue: 'Staff' })}
            </h4>
            <button
              type="button"
              onClick={handleOpenStaffModal}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Staff
            </button>
          </div>
          {(data?.staff ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <UserRound className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600">No staff members found</p>
              <p className="mt-1 text-xs text-slate-400">Staff will appear here once added by an admin</p>
            </div>
          ) : null}
          {(data?.staff ?? []).map((staff) => (
                <div key={staff.id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
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
                    onChange={(e) => void handleUpdateShiftStatus(staff.id, e.target.value)}
                    className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold focus:outline-none ${
                      staff.shiftStatus === 'on_shift'
                        ? 'bg-emerald-100 text-emerald-700'
                        : staff.shiftStatus === 'on_call'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <option value="on_shift">On Shift</option>
                    <option value="off_shift">Off Shift</option>
                    <option value="on_call">On Call</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleDeleteStaff(staff.id)}
                    disabled={deletingStaffId === staff.id}
                    className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    title="Remove staff member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
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
                    {t('pharmacy.profile.operationsSubtitle', { defaultValue: 'Live from pharmacy queue' })}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {operationRows.map(([label, value, Icon, route]) => (
                  <Link key={label as string} to={route as string} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 transition hover:ring-2 hover:ring-emerald-300">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Icon className="h-4 w-4 text-emerald-600" />
                      {label as string}
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-800">{value as string | number}</div>
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  {t('pharmacy.profile.editLicense', { defaultValue: 'Edit license details' })}
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
                <h2 className="text-base font-semibold text-slate-900">Edit License Details</h2>
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
              {[
                { label: 'Pharmacy Name', key: 'display_name', type: 'text', placeholder: 'Al Shifa Pharmacy' },
                { label: 'DHA License Number', key: 'license_number', type: 'text', placeholder: 'DHA-PHARM-2019-003481' },
                { label: 'License Valid Until', key: 'license_valid_until', type: 'date', placeholder: '' },
                { label: 'Address', key: 'address', type: 'text', placeholder: 'Al Barsha 1, Dubai, UAE' },
                { label: 'Operating Hours', key: 'operating_hours', type: 'text', placeholder: '8 AM - 10 PM (Sun-Sat)' },
                { label: 'Pharmacist-in-Charge', key: 'pharmacist_in_charge', type: 'text', placeholder: 'Rania Hassan' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">{field.label}</label>
                  <input
                    type={field.type}
                    value={editForm[field.key as keyof typeof editForm]}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              ))}
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
                  <option value="on_shift">On Shift</option>
                  <option value="off_shift">Off Shift</option>
                  <option value="on_call">On Call</option>
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
