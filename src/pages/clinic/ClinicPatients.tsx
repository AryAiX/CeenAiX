import { useIsPhone } from '../../hooks/use-is-phone';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import ClinicBookAppointmentModal, { type ClinicBookingDoctor } from './ClinicBookAppointmentModal';
import { doctorFilterOptions, isBookableClinicDoctor, visitReasonLabel } from '../../lib/clinic-booking';
import { appointmentStatusLabel, formatLocaleDigits, formatLocalePhoneDisplay } from '../../lib/i18n-ui';
import { fetchAllPages, fetchByIdChunks } from '../../lib/supabase-batches';
import { fetchClinicPatientProfiles } from '../../lib/clinic-patients';
import { countUpcomingVisits, isInCurrentClinicMonth, summarisePatientVisits } from '../../lib/clinic-patient-summary';
import { formatClinicDate, formatClinicTime } from '../../lib/clinic-booking-time';
import { Search, Users, Phone, Mail, Calendar, Clock, ChevronRight, X, BookOpen, MessageSquare, User } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  /** YYYY-MM-DD */
  dateOfBirth: string | null;
  /** QA-209: latest COMPLETED visit (not a future or cancelled booking) */
  lastVisitDate: string | null;
  nextVisitDate: string | null;
  doctorId: string | null;
  /** primary doctor's name (shown as "Dr. …" in the UI language), null when unknown */
  doctor: string | null;
  /** QA-209: completed visits only */
  totalVisits: number;
}

const apptStatusColor: Record<string, string> = {
  scheduled:   'bg-slate-100 text-slate-600',
  confirmed:   'bg-teal-50 text-teal-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed:   'bg-emerald-50 text-emerald-700',
  cancelled:   'bg-red-50 text-red-600',
  no_show:     'bg-amber-50 text-amber-700',
};

type DoctorOption = ClinicBookingDoctor;

/** QA-210: one visit in the patient card (clinic time, with the doctor and the reason). */
interface PatientVisit {
  id?: string;
  scheduled_at: string;
  status: string;
  /** null when the doctor's name is not known */
  doctorName: string | null;
  /** stored reason (English); translated for display */
  reason: string;
}

function PatientModal({ patient, appts, onClose, onBook, onMessage }: {
  patient: Patient;
  appts: PatientVisit[];
  onClose: () => void;
  onBook: () => void;
  onMessage: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const C = 'clinic.patientsPage.card';
  const initials = patient.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const date = (iso: string | null) => (iso ? formatClinicDate(iso, lang) : '—');
  const doctorLabel = (name: string | null) =>
    name ? t('clinic.patientsPage.doctorName', { name }) : t('clinic.appointments.unknownDoctor');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="patient-card-title" dir={i18n.dir()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            <div>
              <h3 id="patient-card-title" className="font-bold text-slate-900">{patient.name}</h3>
              <p className="text-xs text-slate-400">{t(`${C}.subtitle`)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t(`${C}.close`)} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-400" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Patient Info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{t(`${C}.info`)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400" aria-hidden="true" />
                <span className="sr-only">{t(`${C}.phone`)}: </span>
                <span dir="ltr">{patient.phone ? formatLocalePhoneDisplay(patient.phone, lang) : '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={14} className="text-slate-400" aria-hidden="true" />
                <span className="sr-only">{t(`${C}.email`)}: </span>
                <span dir="ltr">{patient.email ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User size={14} className="text-slate-400" aria-hidden="true" /> {t(`${C}.dob`, { value: date(patient.dateOfBirth) })}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar size={14} className="text-slate-400" aria-hidden="true" /> {t(`${C}.lastVisit`, { value: date(patient.lastVisitDate) })}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock size={14} className="text-slate-400" aria-hidden="true" /> {t(`${C}.nextVisit`, { value: date(patient.nextVisitDate) })}
              </div>
            </div>
          </div>

          {/* Visit summary (QA-210: counts only, no clinical data) */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{t(`${C}.summary`)}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{formatLocaleDigits(patient.totalVisits, lang)}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t(`${C}.completed`)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-sm font-semibold text-slate-700">{patient.doctor ? doctorLabel(patient.doctor) : '—'}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t(`${C}.primaryDoctor`)}</div>
              </div>
            </div>
          </div>

          {/* Appointment History */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{t(`${C}.history`)}</p>
            {appts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar size={28} className="mx-auto mb-2 opacity-30" aria-hidden="true" />
                <p className="text-sm">{t(`${C}.noHistory`)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appts.map((a, idx) => {
                  const color = apptStatusColor[a.status] ?? apptStatusColor.scheduled;
                  return (
                    <div key={a.id ?? idx} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                          <Calendar size={13} className="text-teal-600" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">
                            {formatClinicDate(a.scheduled_at, lang)}
                            <span className="ms-2 text-xs font-normal text-slate-400">{formatClinicTime(a.scheduled_at, lang)}</span>
                          </div>
                          <div className="text-xs text-slate-500">{doctorLabel(a.doctorName)} · {visitReasonLabel(t, a.reason)}</div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
                        {appointmentStatusLabel(t, a.status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onMessage}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare size={15} aria-hidden="true" /> {t(`${C}.sendMessage`)}
          </button>
          <button
            type="button"
            onClick={onBook}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen size={15} aria-hidden="true" /> {t(`${C}.book`)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ClinicPatients() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rawAppts, setRawAppts] = useState<{ id?: string; patient_id: string; doctor_id: string; scheduled_at: string; status: string; chief_complaint?: string | null }[]>([]);
  const [doctorNames, setDoctorNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientAppts, setPatientAppts] = useState<PatientVisit[]>([]);
  const [showBook, setShowBook] = useState(false);
  const isPhone = useIsPhone();
  const [bookingPatient, setBookingPatient] = useState<{ userId: string; fullName: string; phone: string } | null>(null);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [listTruncated, setListTruncated] = useState(false);

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
        .select('facility_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.facility_id) throw new Error('No clinic facility found.');

      const facilityId = memberData.facility_id;

      // QA-197: read every visit in pages (the API stops at 1,000 rows without saying so)
      const { rows: apptData, truncated } = await fetchAllPages((from, to) =>
        supabase
          .from('appointments')
          .select('id, patient_id, doctor_id, scheduled_at, status, chief_complaint')
          .eq('facility_id', facilityId)
          .eq('is_deleted', false)
          .order('scheduled_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );
      setListTruncated(truncated);

      const { data: staffData } = await supabase
        .from('facility_staff')
        .select('doctor_user_id, consultation_fee, invitation_status, is_active')
        .eq('facility_id', facilityId)
        .eq('is_active', true);

      // QA-194: only accepted / active clinic doctors can be booked
      const bookableStaff = (staffData ?? []).filter(isBookableClinicDoctor);
      const staffIds = bookableStaff.map(s => s.doctor_user_id).filter(Boolean);
      const { data: staffProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', staffIds);

      const { data: doctorSpecs } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialization')
        .in('user_id', staffIds);

      const specMap = new Map((doctorSpecs ?? []).map(d => [d.user_id, d.specialization]));

      const doctorRows: DoctorOption[] = bookableStaff.map(s => {
        const profile = (staffProfiles ?? []).find(p => p.user_id === s.doctor_user_id);
        return {
          userId: s.doctor_user_id,
          name: profile?.full_name ?? t('clinic.appointments.unknownDoctor'),
          specialty: specMap.get(s.doctor_user_id) ?? t('clinic.appointments.generalPractice'),
          consultationFee: Number(s.consultation_fee) || 0,
        };
      });

      setDoctorOptions(doctorRows);

      const patientIds = [...new Set((apptData ?? []).map(a => a.patient_id))];
      if (patientIds.length === 0) { setPatients([]); setRawAppts([]); return; }

      const doctorIds = [...new Set((apptData ?? []).map(a => a.doctor_id))];

      // QA-197: look names up in small batches (hundreds of ids in one address fail)
      // QA-208: patients only through clinic_patient_profiles (no identity / insurance data)
      const patientProfiles = await fetchClinicPatientProfiles(supabase, patientIds);
      const doctorProfiles = await fetchByIdChunks(doctorIds, (ids) =>
        supabase.from('user_profiles').select('user_id, full_name').in('user_id', ids)
      );

      const doctorMap = new Map(doctorProfiles.map(d => [d.user_id, d.full_name]));
      setDoctorNames(new Map(doctorProfiles.map(d => [d.user_id, d.full_name ?? ''])));

      const rows: Patient[] = patientIds.map(pid => {
        const profile = (patientProfiles ?? []).find(p => p.user_id === pid);
        const patientApptList = (apptData ?? []).filter(a => a.patient_id === pid);
        // QA-209: last = latest completed visit, next = earliest upcoming open visit (clinic time)
        const summary = summarisePatientVisits(patientApptList);
        const primaryDoctorId = summary.primaryDoctorId ?? undefined;

        return {
          id: pid,
          name: profile?.full_name ?? t('clinic.appointments.unknownPatient'),
          phone: profile?.phone ?? null,
          email: profile?.email ?? null,
          dateOfBirth: profile?.date_of_birth ? profile.date_of_birth.slice(0, 10) : null,
          lastVisitDate: summary.lastVisitAt,
          nextVisitDate: summary.nextVisitAt,
          doctorId: primaryDoctorId && doctorMap.get(primaryDoctorId) ? primaryDoctorId : null,
          doctor: primaryDoctorId ? doctorMap.get(primaryDoctorId) ?? null : null,
          totalVisits: summary.completedVisits,
        };
      });

      setPatients(rows);
      setRawAppts(apptData ?? []);
    } catch (err) {
      // QA-211: plain message in the UI language, not the raw database text
      console.warn('[ClinicPatients] load failed', err);
      setError(t('clinic.patientsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  /** QA-191: the shared popup books through clinic_book_appointment; reload the list afterwards. */
  const handleBooked = () => {
    setShowBook(false);
    setBookingPatient(null);
    void fetchData();
  };

  const handleRowClick = (patient: Patient) => {
    const appts: PatientVisit[] = rawAppts
      .filter(a => a.patient_id === patient.id)
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
      .map(a => ({
        id: a.id,
        scheduled_at: a.scheduled_at,
        status: a.status,
        doctorName: doctorNames.get(a.doctor_id) || null,
        reason: a.chief_complaint || 'Consultation',
      }));
    setPatientAppts(appts);
    setSelectedPatient(patient);
  };

  // QA-209: a completed visit in the current clinic (Dubai) month
  const visitedThisMonth = patients.filter(p => isInCurrentClinicMonth(p.lastVisitDate)).length;
  const upcomingVisits = countUpcomingVisits(rawAppts);

  const doctorList = doctorFilterOptions(
    patients.flatMap(p => (p.doctorId && p.doctor ? [{ id: p.doctorId, name: p.doctor }] : []))
  );
  const doctorLabel = (name: string | null) => (name ? t('clinic.patientsPage.doctorName', { name }) : '—');
  const P = 'clinic.patientsPage';

  const query = search.trim().toLowerCase();
  const filtered = patients.filter(p =>
    (!query ||
      p.name.toLowerCase().includes(query) ||
      (p.phone ?? '').toLowerCase().includes(query) ||
      (p.doctor ?? '').toLowerCase().includes(query)) &&
    (filterDoctor === 'all' || p.doctorId === filterDoctor)
  );
  const date = (iso: string | null) => (iso ? formatClinicDate(iso, lang) : '—');

  if (loading) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void fetchData()} className="ms-2 font-semibold underline">{t('clinic.actions.retry')}</button>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t(`${P}.title`)}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t(`${P}.subtitle`, { count: patients.length })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t(`${P}.kpiTotal`), value: patients.length, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: t(`${P}.kpiVisitedThisMonth`), value: visitedThisMonth, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t(`${P}.kpiUpcoming`), value: upcomingVisits, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}><Icon size={18} className={k.color} aria-hidden="true" /></div>
              <div>
                <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{formatLocaleDigits(k.value, lang)}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {listTruncated && (
        <p role="status" className="text-xs text-amber-700">{t(`${P}.truncated`, { value: formatLocaleDigits(20000, lang) })}</p>
      )}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t(`${P}.searchPlaceholder`)}
            aria-label={t(`${P}.searchLabel`)}
            className="w-full ps-9 pe-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          aria-label={t(`${P}.doctorFilterLabel`)}
          value={filterDoctor}
          onChange={e => setFilterDoctor(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="all">{t('clinic.filters.allDoctors')}</option>
          {doctorList.map(d => <option key={d.id} value={d.id}>{doctorLabel(d.name)}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        {isPhone ? (
          // QA-249: a card per patient on phones
          <ul data-testid="clinic-patient-cards" className="divide-y divide-slate-100">
            {filtered.map(p => {
              const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleRowClick(p)}
                    aria-label={t(`${P}.openPatient`, { name: p.name })}
                    className="w-full p-4 text-start hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
                  >
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">{initials}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-800 text-sm">{p.name}</span>
                        <span className="block text-xs text-slate-500" dir="ltr">{p.phone ? formatLocalePhoneDisplay(p.phone, lang) : '—'}</span>
                      </span>
                      <ChevronRight size={16} className="text-slate-300 rtl:rotate-180 shrink-0" aria-hidden="true" />
                    </span>
                    <span className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <span><span className="block text-slate-400">{t(`${P}.colDoctor`)}</span><span className="block text-slate-700">{doctorLabel(p.doctor)}</span></span>
                      <span><span className="block text-slate-400">{t(`${P}.colCompleted`)}</span><span className="block font-bold text-slate-800">{formatLocaleDigits(p.totalVisits, lang)}</span></span>
                      <span><span className="block text-slate-400">{t(`${P}.colLastVisit`)}</span><span className="block text-slate-700">{date(p.lastVisitDate)}</span></span>
                      <span><span className="block text-slate-400">{t(`${P}.colNextVisit`)}</span><span className="block text-slate-700">{date(p.nextVisitDate)}</span></span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="flex flex-col items-center gap-2 text-center py-16 text-slate-400">
                <Users size={32} className="opacity-30" aria-hidden="true" />
                <p className="text-sm">{t(`${P}.empty`)}</p>
              </li>
            )}
          </ul>
        ) : (
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {[
                { key: 'patient', label: t(`${P}.colPatient`) },
                { key: 'contact', label: t(`${P}.colContact`) },
                { key: 'dob', label: t(`${P}.colDob`) },
                { key: 'doctor', label: t(`${P}.colDoctor`) },
                { key: 'last', label: t(`${P}.colLastVisit`) },
                { key: 'next', label: t(`${P}.colNextVisit`) },
                { key: 'completed', label: t(`${P}.colCompleted`) },
              ].map(h => (
                <th key={h.key} scope="col" className="text-start text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">{h.label}</th>
              ))}
              <th scope="col" className="px-5 py-3"><span className="sr-only">{t(`${P}.colOpen`)}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(p => {
              const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <tr key={p.id} onClick={() => handleRowClick(p)} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {initials}
                      </div>
                      {/* QA-211: a real button so the patient can be opened from the keyboard */}
                      <button
                        type="button"
                        onClick={event => { event.stopPropagation(); handleRowClick(p); }}
                        aria-label={t(`${P}.openPatient`, { name: p.name })}
                        className="font-semibold text-slate-800 text-sm text-start hover:underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                      >
                        {p.name}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500"><Phone size={11} aria-hidden="true" /> <span dir="ltr">{p.phone ? formatLocalePhoneDisplay(p.phone, lang) : '—'}</span></div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5"><Mail size={11} aria-hidden="true" /> <span dir="ltr">{p.email ?? '—'}</span></div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{date(p.dateOfBirth)}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{doctorLabel(p.doctor)}</td>
                  <td className="px-5 py-4 text-sm text-slate-600" style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{date(p.lastVisitDate)}</td>
                  <td className="px-5 py-4 text-sm text-slate-600" style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{date(p.nextVisitDate)}</td>
                  <td className="px-5 py-4 font-bold text-sm text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{formatLocaleDigits(p.totalVisits, lang)}</td>
                  <td className="px-5 py-4">
                    <ChevronRight size={16} className="text-slate-300 rtl:rotate-180" aria-hidden="true" />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-16 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Users size={32} className="opacity-30" aria-hidden="true" />
                    <p className="text-sm">{t(`${P}.empty`)}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </div>

      {selectedPatient && (
        <PatientModal
          patient={selectedPatient}
          appts={patientAppts}
          onClose={() => setSelectedPatient(null)}
          onBook={() => {
            setBookingPatient({
              userId: selectedPatient.id,
              fullName: selectedPatient.name,
              phone: selectedPatient.phone ?? '—',
            });
            setSelectedPatient(null);
            setShowBook(true);
          }}
          onMessage={() => navigate(`/clinic/messages?patient=${selectedPatient.id}`)}
        />
      )}

      {showBook && bookingPatient && (
        <ClinicBookAppointmentModal
          doctors={doctorOptions}
          fixedPatient={bookingPatient}
          onClose={() => { setShowBook(false); setBookingPatient(null); }}
          onBooked={handleBooked}
        />
      )}
    </div>
  );
}
