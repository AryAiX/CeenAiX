import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { useTranslation } from 'react-i18next';
import { Building2, Clock, Info, Save } from 'lucide-react';
import {
  CLINIC_DAY_KEYS,
  buildOperatingHours,
  parseOperatingHours,
  settingsSaveErrorKey,
  validateClinicInfo,
  validateHours,
  type ClinicDayKey,
  type ClinicInfoErrors,
  type SettingsFieldError,
} from '../../lib/clinic-settings';

type Feedback = { type: 'success' | 'error'; message: string } | null;

/** QA-232: the message for one section, shown next to its Save button. */
function SectionFeedback({ feedback, testId }: { feedback: Feedback; testId: string }) {
  if (!feedback) return null;
  return (
    <p
      role={feedback.type === 'error' ? 'alert' : 'status'}
      data-testid={testId}
      className={`text-sm ${feedback.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}
    >
      {feedback.message}
    </p>
  );
}

export default function ClinicSettings() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const S = 'clinic.settingsPage';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  // QA-232: only a clinic admin may save (facilities_clinic_admin_update); others see the page read-only
  const [canEdit, setCanEdit] = useState(false);
  const [infoFeedback, setInfoFeedback] = useState<Feedback>(null);
  const [hoursFeedback, setHoursFeedback] = useState<Feedback>(null);
  const [infoErrors, setInfoErrors] = useState<ClinicInfoErrors>({});
  const [hoursError, setHoursError] = useState<SettingsFieldError | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [clinicName, setClinicName] = useState('');
  const [clinicType, setClinicType] = useState('');
  const [license, setLicense] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [workingDays, setWorkingDays] = useState<ClinicDayKey[]>(['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [mixedHours, setMixedHours] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('clinic_portal_members')
        .select('facility_id, portal_role')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.facility_id) throw new Error('No clinic facility found.');
      const fId = memberData.facility_id;
      setFacilityId(fId);
      setCanEdit(memberData.portal_role === 'clinic_admin');

      const { data: facilityData, error: facilityError } = await supabase
        .from('facilities')
        .select('name, facility_type, license_number, phone, email, address, operating_hours')
        .eq('id', fId)
        .maybeSingle();

      if (facilityError) throw facilityError;
      if (facilityData) {
        setClinicName(facilityData.name ?? '');
        setClinicType(facilityData.facility_type ?? '');
        setLicense(facilityData.license_number ?? '');
        setPhone(facilityData.phone ?? '');
        setEmail(facilityData.email ?? '');
        setAddress(facilityData.address ?? '');
        const hours = parseOperatingHours(facilityData.operating_hours);
        setWorkingDays(hours.days);
        setOpenTime(hours.open);
        setCloseTime(hours.close);
        setMixedHours(hours.mixed);
      }
    } catch (err) {
      console.warn('[ClinicSettings] load failed', err);
      setError(t(`${S}.errors.loadFailed`));
    } finally {
      setLoading(false);
    }
  };

  /** Saves and asks for the row back: without permission the database changes 0 rows and says nothing. */
  const saveFacility = async (fields: Record<string, unknown>): Promise<string | null> => {
    const { data, error: updateError } = await supabase
      .from('facilities')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', facilityId!)
      .select('id');
    if (updateError) {
      console.warn('[ClinicSettings] save failed', updateError);
      return t(`${S}.errors.${settingsSaveErrorKey(updateError)}`);
    }
    if (!Array.isArray(data) || data.length === 0) return t(`${S}.errors.notAllowed`);
    return null;
  };

  const handleSaveClinicInfo = async () => {
    if (!facilityId || savingInfo) return;
    setInfoFeedback(null);
    const result = validateClinicInfo({ name: clinicName, phone, email, address });
    if (!result.ok) {
      setInfoErrors(result.errors);
      return;
    }
    setInfoErrors({});
    setSavingInfo(true);
    // QA-230: facility type and DHA licence are managed by CeenAiX (the database refuses changes)
    const failure = await saveFacility({ ...result.value });
    setSavingInfo(false);
    setInfoFeedback(failure ? { type: 'error', message: failure } : { type: 'success', message: t(`${S}.savedInfo`) });
  };

  const handleSaveHours = async () => {
    if (!facilityId || savingHours) return;
    setHoursFeedback(null);
    const problem = validateHours(workingDays, openTime, closeTime);
    setHoursError(problem);
    if (problem) return;
    setSavingHours(true);
    const failure = await saveFacility({ operating_hours: buildOperatingHours(workingDays, openTime, closeTime) });
    setSavingHours(false);
    if (!failure) setMixedHours(false);
    setHoursFeedback(failure ? { type: 'error', message: failure } : { type: 'success', message: t(`${S}.savedHours`) });
  };

  function toggleDay(day: ClinicDayKey) {
    setWorkingDays(prev => (prev.includes(day) ? prev.filter(x => x !== day) : [...prev, day]));
  }

  const fieldError = (problem: SettingsFieldError | null | undefined, id: string) =>
    problem ? <p id={id} className="mt-1 text-xs text-red-600">{t(`${S}.errors.${problem.key}`, problem.values)}</p> : null;

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  const inputClass =
    'w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-500';
  const infoFields = [
    { id: 'clinic-name', field: 'name' as const, label: t(`${S}.name`), value: clinicName, set: setClinicName, wide: true, type: 'text' },
    { id: 'clinic-phone', field: 'phone' as const, label: t(`${S}.phone`), value: phone, set: setPhone, wide: false, type: 'tel' },
    { id: 'clinic-email', field: 'email' as const, label: t(`${S}.email`), value: email, set: setEmail, wide: false, type: 'email' },
  ];

  return (
    // QA-246: full width like the other clinic pages (it was capped at max-w-3xl, which left an empty
    // area on the right on desktop). On wide screens the two cards sit side by side.
    <div data-testid="settings-page" className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 items-start" dir={i18n.dir()}>
      {error ? (
        <div role="alert" className="xl:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void fetchData()} className="ms-2 font-semibold underline">{t('clinic.actions.retry')}</button>
        </div>
      ) : null}

      <div className="xl:col-span-2">
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${S}.title`)}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t(`${S}.subtitle`)}</p>
      </div>

      {!canEdit && !error ? (
        <p data-testid="settings-read-only" className="xl:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t(`${S}.readOnly`)}
        </p>
      ) : null}

      {/* Clinic info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div aria-hidden="true" className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center"><Building2 size={18} className="text-teal-600" aria-hidden="true" /></div>
          <h3 className="font-bold text-slate-800">{t(`${S}.infoTitle`)}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {infoFields.map(f => (
            <div key={f.id} className={f.wide ? 'sm:col-span-2' : ''}>
              <label htmlFor={f.id} className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
              <input
                id={f.id}
                type={f.type}
                value={f.value}
                disabled={!canEdit}
                onChange={e => f.set(e.target.value)}
                aria-invalid={infoErrors[f.field] ? true : undefined}
                aria-describedby={infoErrors[f.field] ? `${f.id}-error` : undefined}
                dir={f.field === 'name' ? undefined : 'ltr'}
                className={inputClass}
              />
              {fieldError(infoErrors[f.field], `${f.id}-error`)}
            </div>
          ))}
          {/* QA-230: shown, not editable */}
          {[
            { id: 'clinic-type', label: t(`${S}.clinicType`), value: clinicType ? t(`${S}.facilityTypes.${clinicType}`, { defaultValue: clinicType }) : '' },
            { id: 'clinic-license', label: t(`${S}.license`), value: license },
          ].map(f => (
            <div key={f.id}>
              <div id={`${f.id}-label`} className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</div>
              <div
                aria-labelledby={`${f.id}-label`}
                aria-describedby={`${f.id}-hint`}
                data-testid={`${f.id}-value`}
                className="w-full min-h-10 px-3 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm text-slate-700"
              >
                {f.value || '—'}
              </div>
              <p id={`${f.id}-hint`} className="mt-1 text-xs text-slate-400">{t('clinic.settingsPage.managedByCeenaix')}</p>
            </div>
          ))}
          <div className="sm:col-span-2">
            <label htmlFor="clinic-address" className="block text-xs font-semibold text-slate-600 mb-1">{t(`${S}.address`)}</label>
            <input
              id="clinic-address"
              type="text"
              value={address}
              disabled={!canEdit}
              onChange={e => setAddress(e.target.value)}
              aria-invalid={infoErrors.address ? true : undefined}
              aria-describedby={infoErrors.address ? 'clinic-address-error' : undefined}
              className={inputClass}
            />
            {fieldError(infoErrors.address, 'clinic-address-error')}
          </div>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSaveClinicInfo()}
              disabled={savingInfo}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <Save size={15} aria-hidden="true" /> {savingInfo ? t(`${S}.saving`) : t(`${S}.saveInfo`)}
            </button>
            <SectionFeedback feedback={infoFeedback} testId="settings-info-feedback" />
          </div>
        ) : null}
      </div>

      {/* Working hours */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div aria-hidden="true" className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center"><Clock size={18} className="text-blue-600" aria-hidden="true" /></div>
          <h3 className="font-bold text-slate-800">{t(`${S}.hoursTitle`)}</h3>
        </div>
        {mixedHours ? (
          <p data-testid="settings-mixed-hours" className="text-xs text-amber-700">{t(`${S}.mixedHours`)}</p>
        ) : null}
        <div>
          <div id="clinic-days-label" className="text-xs font-semibold text-slate-600 mb-2">{t(`${S}.workingDays`)}</div>
          <div role="group" aria-labelledby="clinic-days-label" className="flex flex-wrap gap-2">
            {CLINIC_DAY_KEYS.map(day => (
              <button
                key={day}
                type="button"
                disabled={!canEdit}
                aria-pressed={workingDays.includes(day)}
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:cursor-not-allowed ${workingDays.includes(day) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >{t(`shared.weekdays.${day}`)}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="clinic-open" className="block text-xs font-semibold text-slate-600 mb-1">{t(`${S}.openTime`)}</label>
            <input id="clinic-open" type="time" dir="ltr" value={openTime} disabled={!canEdit} onChange={e => setOpenTime(e.target.value)} aria-describedby={hoursError ? 'clinic-hours-error' : undefined} className={inputClass} />
          </div>
          <div>
            <label htmlFor="clinic-close" className="block text-xs font-semibold text-slate-600 mb-1">{t(`${S}.closeTime`)}</label>
            <input id="clinic-close" type="time" dir="ltr" value={closeTime} disabled={!canEdit} onChange={e => setCloseTime(e.target.value)} aria-describedby={hoursError ? 'clinic-hours-error' : undefined} className={inputClass} />
          </div>
        </div>
        {fieldError(hoursError, 'clinic-hours-error')}
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSaveHours()}
              disabled={savingHours}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <Save size={15} aria-hidden="true" /> {savingHours ? t(`${S}.saving`) : t(`${S}.saveHours`)}
            </button>
            <SectionFeedback feedback={hoursFeedback} testId="settings-hours-feedback" />
          </div>
        ) : null}
      </div>

      {/* QA-231: the notification switches and "NABIDH sync is active — records are being submitted
          automatically" did nothing (nothing reads these settings, and the clinic portal sends nothing
          to NABIDH). They are replaced by a plain note until the features exist. */}
      <div data-testid="settings-not-available" className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center"><Info size={18} className="text-slate-500" aria-hidden="true" /></div>
          <h3 className="font-bold text-slate-800">{t('clinic.settingsPage.notAvailableTitle')}</h3>
        </div>
        <p className="text-sm text-slate-500">{t('clinic.settingsPage.notAvailable')}</p>
      </div>
    </div>
  );
}
