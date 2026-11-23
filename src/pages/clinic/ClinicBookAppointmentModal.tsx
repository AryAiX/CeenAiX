import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Calendar, Check, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  buildClinicBookingSlots,
  clinicDayOfWeek,
  clinicDayRangeUtc,
  clinicTodayKey,
  formatClinicSlot,
} from '../../lib/clinic-booking-time';
import {
  CLINIC_APPOINTMENT_REASONS,
  bookClinicAppointment,
  clinicBookingErrorKey,
  isClinicSlotUnavailable,
  visitReasonLabel,
} from '../../lib/clinic-booking';
import { searchClinicPatients } from '../../lib/clinic-patients';

export interface ClinicBookingDoctor {
  userId: string;
  name: string;
  specialty: string;
  consultationFee: number;
}

export interface ClinicBookingPatient {
  userId: string;
  fullName: string;
  phone: string;
}

export interface ClinicBookedAppointment {
  id: string;
  scheduledAt: string;
  date: string;
  time: string;
  doctor: ClinicBookingDoctor;
  patient: ClinicBookingPatient;
  reason: string;
  notes: string;
}

/**
 * QA-191: one booking popup for the clinic Appointments and Patients pages (they had two copies).
 * It stays open while saving, shows refusals inside the popup, refreshes the free slots when the
 * chosen time was taken, and books through clinic_book_appointment (one transaction).
 */
export default function ClinicBookAppointmentModal({
  doctors,
  fixedPatient,
  onClose,
  onBooked,
}: {
  doctors: ClinicBookingDoctor[];
  /** Set when booking from a patient's card; otherwise the popup lets staff search for a patient. */
  fixedPatient?: ClinicBookingPatient;
  onClose: () => void;
  onBooked: (appointment: ClinicBookedAppointment) => void;
}) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({
    doctor: doctors[0]?.userId ?? '',
    reason: CLINIC_APPOINTMENT_REASONS[0] as string,
    date: '',
    time: '',
    notes: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<ClinicBookingPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<ClinicBookingPatient | null>(fixedPatient ?? null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadSlots = useCallback(async (doctorId: string, dateStr: string) => {
    if (!doctorId || !dateStr) {
      setAvailableSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const { data: availability } = await supabase
        .from('doctor_availability')
        .select('start_time, end_time, slot_duration_minutes')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', clinicDayOfWeek(dateStr))
        .eq('is_active', true);

      const { data: blocked } = await supabase
        .from('blocked_slots')
        .select('start_time, end_time')
        .eq('doctor_id', doctorId)
        .eq('blocked_date', dateStr);

      const { startIso, endIso } = clinicDayRangeUtc(dateStr);
      const { data: existingAppts } = await supabase
        .from('appointments')
        .select('scheduled_at, duration_minutes')
        .eq('doctor_id', doctorId)
        .gte('scheduled_at', startIso)
        .lte('scheduled_at', endIso)
        .eq('is_deleted', false)
        .not('status', 'in', '("cancelled","no_show")');

      const slots = buildClinicBookingSlots({
        dateKey: dateStr,
        availability: availability ?? [],
        blocked: blocked ?? [],
        booked: existingAppts ?? [],
      });
      setAvailableSlots(slots);
      if (slots.length === 0) setSlotsError('clinic.booking.noSlots');
    } catch {
      setSlotsError('clinic.booking.slotsFailed');
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (form.doctor && form.date) {
      void loadSlots(form.doctor, form.date);
      setForm((f) => ({ ...f, time: '' }));
    }
  }, [form.doctor, form.date, loadSlots]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [saving, onClose]);

  const searchPatients = async (query: string) => {
    setPatientSearch(query);
    setSelectedPatient(null);
    setFormError(null);
    if (query.length < 2) {
      setPatientResults([]);
      setShowDropdown(false);
      return;
    }
    // QA-208: name and phone of this clinic's patients only
    let data: Awaited<ReturnType<typeof searchClinicPatients>> = [];
    try {
      data = await searchClinicPatients(supabase, query);
    } catch {
      data = [];
    }
    setPatientResults(data.map((p) => ({ userId: p.user_id, fullName: p.full_name ?? t('clinic.appointments.unknownPatient'), phone: p.phone ?? '—' })));
    setShowDropdown(true);
  };

  const submit = async () => {
    const doctor = doctors.find((d) => d.userId === form.doctor);
    if (!selectedPatient) {
      setFormError('clinic.booking.errorSelectPatient');
      return;
    }
    if (!doctor) {
      setFormError('clinic.booking.errorSelectDoctor');
      return;
    }
    if (!form.date || !form.time) {
      setFormError('clinic.booking.errorSelectSlot');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const { id, scheduledAt } = await bookClinicAppointment(supabase, {
        doctorId: doctor.userId,
        patientId: selectedPatient.userId,
        date: form.date,
        time: form.time,
        reason: form.reason,
        notes: form.notes,
      });
      onBooked({
        id,
        scheduledAt,
        date: form.date,
        time: form.time,
        doctor,
        patient: selectedPatient,
        reason: form.reason,
        notes: form.notes.trim(),
      });
    } catch (err) {
      setFormError(clinicBookingErrorKey(err));
      if (isClinicSlotUnavailable(err)) {
        setForm((f) => ({ ...f, time: '' }));
        void loadSlots(form.doctor, form.date);
      }
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clinic-book-appointment-title"
        dir={i18n.dir()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center"><Calendar size={18} className="text-teal-600" /></div>
            <h3 id="clinic-book-appointment-title" className="font-bold text-slate-900">{t('clinic.booking.title')}</h3>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={t('clinic.booking.close')} className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-60">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {fixedPatient ? (
            <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-100">
              <Check size={15} className="text-teal-600" />
              <div>
                <div className="text-sm font-semibold text-slate-800">{fixedPatient.fullName}</div>
                <div className="text-xs text-slate-400" dir="ltr">{fixedPatient.phone}</div>
              </div>
            </div>
          ) : (
            <div className="col-span-2 relative">
              <label htmlFor="clinic-book-patient" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.booking.patientName')}</label>
              <div className="relative">
                <input
                  id="clinic-book-patient"
                  type="text"
                  value={patientSearch}
                  onChange={(e) => void searchPatients(e.target.value)}
                  placeholder={t('clinic.booking.patientSearchPlaceholder')}
                  aria-describedby="clinic-book-patient-hint"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {selectedPatient && <Check size={16} aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2 text-teal-500" />}
              </div>
              {showDropdown && patientResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {patientResults.map((p) => (
                    <button
                      type="button"
                      key={p.userId}
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientSearch(p.fullName);
                        setShowDropdown(false);
                      }}
                      className="block w-full text-start px-3 py-2 hover:bg-teal-50 focus:bg-teal-50 focus:outline-none cursor-pointer text-sm"
                    >
                      <div className="font-medium text-slate-800">{p.fullName}</div>
                      <div className="text-xs text-slate-400" dir="ltr">{p.phone}</div>
                    </button>
                  ))}
                </div>
              )}
              {patientSearch.length >= 2 && showDropdown && patientResults.length === 0 && !selectedPatient && (
                <p className="text-xs text-amber-600 mt-1">{t('clinic.booking.noPatients')}</p>
              )}
              {selectedPatient && <p className="text-xs text-slate-400 mt-1" dir="ltr">{selectedPatient.phone}</p>}
              {/* QA-192: clinics only see patients who already have a visit here (database rule). */}
              <p id="clinic-book-patient-hint" className="text-xs text-slate-400 mt-1">{t('clinic.booking.patientHint')}</p>
            </div>
          )}
          {doctors.length === 0 && (
            <p role="status" className="col-span-2 text-xs text-amber-600">
              {t('clinic.booking.noDoctors')}
            </p>
          )}
          <div>
            <label htmlFor="clinic-book-doctor" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.booking.doctor')}</label>
            <select id="clinic-book-doctor" value={form.doctor} onChange={set('doctor')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              {doctors.map((d) => <option key={d.userId} value={d.userId}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="clinic-book-type" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.booking.type')}</label>
            <select id="clinic-book-type" value={form.reason} onChange={set('reason')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              {CLINIC_APPOINTMENT_REASONS.map((reason) => <option key={reason} value={reason}>{visitReasonLabel(t, reason)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="clinic-book-date" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.booking.date')}</label>
            <input
              id="clinic-book-date"
              type="date"
              value={form.date}
              min={clinicTodayKey()}
              onChange={set('date')}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="col-span-2">
            <span id="clinic-book-slots-label" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.booking.slots')}</span>
            {!form.date ? (
              <p className="text-xs text-slate-400">{t('clinic.booking.pickDate')}</p>
            ) : slotsLoading ? (
              <p className="text-xs text-slate-400">{t('clinic.booking.loadingSlots')}</p>
            ) : slotsError ? (
              <p className="text-xs text-amber-600">{t(slotsError)}</p>
            ) : (
              <div role="group" aria-labelledby="clinic-book-slots-label" className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={form.time === slot}
                    onClick={() => setForm((f) => ({ ...f, time: slot }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.time === slot ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {formatClinicSlot(form.date, slot, i18n.language)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="col-span-2">
            <label htmlFor="clinic-book-notes" className="block text-xs font-semibold text-slate-600 mb-1">{t('clinic.booking.notes')}</label>
            <textarea id="clinic-book-notes" value={form.notes} onChange={set('notes')} rows={2} maxLength={2000} placeholder={t('clinic.booking.notesPlaceholder')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>
          {formError && <p role="alert" className="col-span-2 text-xs text-red-600">{t(formError)}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
            {t('clinic.booking.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || doctors.length === 0}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save size={15} aria-hidden="true" /> {saving ? t('clinic.booking.submitting') : t('clinic.booking.submit')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
