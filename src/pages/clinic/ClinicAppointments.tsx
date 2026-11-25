import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { useIsPhone } from '../../hooks/use-is-phone';
import { createPortal } from 'react-dom';
import { Plus, Search, Calendar, Clock, Check, DollarSign, Phone } from 'lucide-react';
import {
  clinicDateKey,
  clinicTodayKey,
  clinicWallTimeToUtcIso,
  formatClinicDate,
  formatClinicTime,
} from '../../lib/clinic-booking-time';
import ClinicBookAppointmentModal, { type ClinicBookedAppointment, type ClinicBookingDoctor } from './ClinicBookAppointmentModal';
import { appointmentTypeForReason, doctorFilterOptions, isBookableClinicDoctor, visitReasonLabel } from '../../lib/clinic-booking';
import { estimatedVisitFee, sumEstimatedFees, type ClinicFeeLink } from '../../lib/clinic-visit-fee';
import { appointmentStatusLabel, formatLocaleCurrency, formatLocaleDigits, formatLocalePhoneDisplay } from '../../lib/i18n-ui';
import { fetchAllPages, fetchByIdChunks } from '../../lib/supabase-batches';
import { fetchClinicPatientProfiles } from '../../lib/clinic-patients';
import { getClinicAppointmentActions, type ClinicAppointmentStatusChange } from '../../lib/appointment-actions';
import type { AppointmentStatus } from '../../types/enums';

interface Appointment {
  id: string;
  /** null when the profile could not be found (shown as "Unknown patient" in the UI language) */
  patientName: string | null;
  patientPhone: string | null;
  doctorId: string;
  doctor: string | null;
  specialty: string | null;
  /** Stored reason (English, e.g. "Follow-up Visit"); translated only for display (QA-198). */
  type: string;
  /** Clinic (Dubai) calendar day, YYYY-MM-DD; used for the Today / Upcoming / Past filters. */
  date: string;
  status: AppointmentStatus;
  /** 'in_person' | 'virtual' (QA-195: telemedicine visits use the telemedicine fee) */
  visitType: string;
  notes: string;
  /** Stored start time (UTC ISO); used for the QA-190 status rules and for display. */
  scheduledAt: string;
}

/** QA-190 / QA-198: message key for a refused status change (never the raw database text). */
const statusChangeErrorKey = (err: unknown): string => {
  const code = (err as { code?: string } | null)?.code;
  if (code === '22023' || code === 'P0002') return 'clinic.appointments.statusErrors.noLongerPossible';
  if (code === '42501') return 'clinic.appointments.statusErrors.notAllowed';
  return 'clinic.appointments.statusErrors.generic';
};

const TRUNCATED_AT = 20000;

function CancelAppointmentDialog({
  appointment,
  busy,
  onClose,
  onConfirm,
}: {
  appointment: Appointment;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [reason, setReason] = useState('');
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    reasonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clinic-cancel-appointment-title"
        dir={i18n.dir()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 id="clinic-cancel-appointment-title" className="font-bold text-slate-900">
            {t('clinic.appointments.cancelDialog.title')}
          </h3>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-600">
            {t('clinic.appointments.cancelDialog.summary', {
              patient: appointment.patientName ?? t('clinic.appointments.unknownPatient'),
              doctor: appointment.doctor ?? t('clinic.appointments.unknownDoctor'),
              date: formatClinicDate(appointment.scheduledAt, i18n.language),
              time: formatClinicTime(appointment.scheduledAt, i18n.language),
            })}
          </p>
          <p className="text-sm text-slate-600">{t('clinic.appointments.cancelDialog.notify')}</p>
          <div>
            <label htmlFor="clinic-cancel-reason" className="block text-xs font-semibold text-slate-600 mb-1">
              {t('clinic.appointments.cancelDialog.reason')}
            </label>
            <textarea
              id="clinic-cancel-reason"
              ref={reasonRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
          >
            {t('clinic.appointments.cancelDialog.keep')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={busy}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {t('clinic.appointments.cancelDialog.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

type DoctorOption = ClinicBookingDoctor;

const statusStyle: Record<string, { color: string; dot: string }> = {
  scheduled:   { color: 'bg-slate-100 text-slate-600 border-slate-200',      dot: 'bg-slate-400' },
  confirmed:   { color: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500' },
  in_progress: { color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500 animate-pulse' },
  completed:   { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled:   { color: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400' },
  no_show:     { color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
};

const STATUS_FILTERS: AppointmentStatus[] = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
const DATE_RANGES = ['today', 'upcoming', 'past', 'all'] as const;

export default function ClinicAppointments() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [feeLinks, setFeeLinks] = useState<Map<string, ClinicFeeLink>>(new Map());
  const [listTruncated, setListTruncated] = useState(false);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterDate, setFilterDate] = useState<(typeof DATE_RANGES)[number]>('today');
  const [showBook, setShowBook] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const isPhone = useIsPhone();

  const today = clinicTodayKey();

  useEffect(() => {
    if (!user?.id) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get facility ID
      const { data: memberData, error: memberError } = await supabase
        .from('clinic_portal_members')
        .select('facility_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.facility_id) throw new Error('No clinic facility found.');

      const fId = memberData.facility_id;

      // QA-197: read the whole list in pages (the API stops at 1,000 rows without saying so)
      const { rows: apptData, truncated } = await fetchAllPages((from, to) =>
        supabase
          .from('appointments')
          .select('id, patient_id, doctor_id, scheduled_at, status, type, chief_complaint, notes, duration_minutes, created_at, updated_at')
          .eq('facility_id', fId)
          .eq('is_deleted', false)
          .order('scheduled_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to)
      );
      setListTruncated(truncated);

      // Get all unique user IDs
      const patientIds = [...new Set(apptData.map(a => a.patient_id))];
      const doctorIds = [...new Set(apptData.map(a => a.doctor_id))];

      // QA-197: look names up in small batches (hundreds of ids in one address fail)
      // QA-208: patients only through clinic_patient_profiles (no identity / insurance data)
      const patientProfiles = await fetchClinicPatientProfiles(supabase, patientIds);
      const doctorNames = await fetchByIdChunks(doctorIds, (ids) =>
        supabase.from('user_profiles').select('user_id, full_name, phone').in('user_id', ids)
      );
      const profileData = [...patientProfiles, ...doctorNames];
      const doctorProfileData = await fetchByIdChunks(doctorIds, (ids) =>
        supabase.from('doctor_profiles').select('user_id, specialization').in('user_id', ids)
      );

      const profileMap = new Map(profileData.map(p => [p.user_id, p]));
      const specMap = new Map(doctorProfileData.map(d => [d.user_id, d.specialization]));

      const { data: staffData } = await supabase
        .from('facility_staff')
        .select('doctor_user_id, consultation_fee, telemedicine_fee, follow_up_fee, invitation_status, is_active')
        .eq('facility_id', fId);

      // QA-195: all links (also doctors who left), so past visits keep their estimated price
      setFeeLinks(new Map((staffData ?? []).map(s => [s.doctor_user_id, s as ClinicFeeLink])));

      // Build appointments
      const apptRows: Appointment[] = apptData.map(a => {
        const patient = profileMap.get(a.patient_id);
        const doctor = profileMap.get(a.doctor_id);
        return {
          id: a.id,
          patientName: patient?.full_name ?? null,
          patientPhone: patient?.phone ?? null,
          doctorId: a.doctor_id,
          doctor: doctor?.full_name ?? null,
          specialty: specMap.get(a.doctor_id) ?? null,
          type: a.chief_complaint ?? 'Consultation',
          date: clinicDateKey(a.scheduled_at),
          status: a.status as Appointment['status'],
          visitType: a.type ?? 'in_person',
          notes: a.notes ?? '',
          scheduledAt: a.scheduled_at,
        };
      });

      setAppts(apptRows);

      // QA-194: only accepted / active clinic doctors can be booked
      const bookableStaff = (staffData ?? []).filter(isBookableClinicDoctor);
      const staffIds = bookableStaff.map(s => s.doctor_user_id).filter(Boolean);
      const { data: staffProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', staffIds);

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
    } catch (err) {
      // QA-198: plain message in the UI language, not the raw database text
      console.warn('[ClinicAppointments] load failed', err);
      setError(t('clinic.appointments.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const patientLabel = (a: Appointment) => a.patientName ?? t('clinic.appointments.unknownPatient');
  const doctorLabel = (a: Appointment) => a.doctor ?? t('clinic.appointments.unknownDoctor');

  const query = search.trim().toLowerCase();
  const filtered = appts.filter(a => {
    const matchSearch = !query ||
      patientLabel(a).toLowerCase().includes(query) ||
      doctorLabel(a).toLowerCase().includes(query) ||
      a.type.toLowerCase().includes(query) ||
      visitReasonLabel(t, a.type).toLowerCase().includes(query);
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchDoctor = filterDoctor === 'all' || a.doctorId === filterDoctor;
    const matchDate = filterDate === 'all' ||
      (filterDate === 'today' && a.date === today) ||
      (filterDate === 'upcoming' && a.date > today) ||
      (filterDate === 'past' && a.date < today);
    return matchSearch && matchStatus && matchDoctor && matchDate;
  });

  /** QA-195: estimate only (current fee list; nothing is billed from this page). */
  const feeFor = (a: Appointment) => estimatedVisitFee(feeLinks.get(a.doctorId), { visitType: a.visitType, reason: a.type });
  const money = (value: number | null) => (value === null ? '—' : formatLocaleCurrency(value, lang));
  const todayRevenue = sumEstimatedFees(appts.filter(a => a.date === today && a.status === 'completed').map(feeFor));

  /** QA-191: the popup books through clinic_book_appointment; here we only show the new row. */
  const handleBooked = (booked: ClinicBookedAppointment) => {
    const newAppt: Appointment = {
      id: booked.id,
      patientName: booked.patient.fullName,
      patientPhone: booked.patient.phone,
      doctorId: booked.doctor.userId,
      doctor: booked.doctor.name,
      specialty: booked.doctor.specialty,
      type: booked.reason,
      date: booked.date,
      status: 'scheduled',
      visitType: appointmentTypeForReason(booked.reason),
      notes: booked.notes,
      scheduledAt: booked.scheduledAt || clinicWallTimeToUtcIso(booked.date, booked.time),
    };
    setAppts(prev => [newAppt, ...prev]);
    setShowBook(false);
  };

  /** QA-190: status changes go through clinic_set_appointment_status, which enforces the rules. */
  const changeStatus = async (id: string, status: ClinicAppointmentStatusChange, reason?: string) => {
    setBusyId(id);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('clinic_set_appointment_status', {
        p_appointment_id: id,
        p_status: status,
        p_reason: reason?.trim() ? reason.trim() : null,
      });
      if (rpcError) throw rpcError;

      setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      setCancelTarget(null);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      setCancelTarget(null);
      if (code === '22023' || code === 'P0002') {
        await fetchData();
      }
      setError(t(statusChangeErrorKey(err)));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5 animate-pulse" aria-busy="true">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  const kpis = [
    { key: 'kpiTodayTotal', value: formatLocaleDigits(appts.filter(a => a.date === today).length, lang), icon: Calendar, color: 'text-teal-600', bg: 'bg-teal-50' },
    { key: 'kpiCompletedToday', value: formatLocaleDigits(appts.filter(a => a.date === today && a.status === 'completed').length, lang), icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { key: 'kpiUpcoming', value: formatLocaleDigits(appts.filter(a => a.date >= today && ['scheduled', 'confirmed'].includes(a.status)).length, lang), icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'kpiRevenueToday', value: money(todayRevenue), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];
  const columns = [
    t('clinic.appointments.colDateTime'),
    t('clinic.appointments.patient'),
    t('clinic.appointments.doctor'),
    t('clinic.appointments.colType'),
    t('clinic.appointments.colPrice'),
    t('clinic.appointments.status'),
    t('clinic.appointments.colActions'),
  ];

  // QA-249: the same buttons in the table and in the phone cards
  const renderActions = (a: Appointment) => {
    const actions = getClinicAppointmentActions({ status: a.status, scheduled_at: a.scheduledAt });
    const busy = busyId === a.id;
    if (!actions.canConfirm && !actions.canCancel && !actions.canMarkNoShow) {
      return (
        <span className="text-xs text-slate-400">
          <span aria-hidden="true">—</span>
          <span className="sr-only">{t('clinic.appointments.noActions')}</span>
        </span>
      );
    }
    const base = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-60';
    return (
      <div className="flex flex-wrap gap-1.5">
        {actions.canConfirm && (
          <button type="button" disabled={busy} onClick={() => void changeStatus(a.id, 'confirmed')} className={`${base} bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100`}>
            {t('clinic.appointments.confirm')}
          </button>
        )}
        {actions.canCancel && (
          <button type="button" disabled={busy} onClick={() => setCancelTarget(a)} className={`${base} bg-white text-red-600 border-red-200 hover:bg-red-50`}>
            {t('clinic.appointments.cancel')}
          </button>
        )}
        {actions.canMarkNoShow && (
          <button type="button" disabled={busy} onClick={() => void changeStatus(a.id, 'no_show')} className={`${base} bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100`}>
            {t('clinic.appointments.noShow')}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5">
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void fetchData()} className="ms-2 font-semibold underline">
            {t('clinic.actions.retry')}
          </button>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('clinic.appointments.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('clinic.appointments.pageSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowBook(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} aria-hidden="true" /> {t('clinic.appointments.book')}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.key} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 shrink-0 rounded-xl ${k.bg} flex items-center justify-center`}><Icon size={18} className={k.color} aria-hidden="true" /></div>
              <div>
                <div className="text-xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
                <div className="text-xs text-slate-500">{t(`clinic.appointments.${k.key}`)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} aria-hidden="true" className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('clinic.appointments.searchPlaceholder')}
            aria-label={t('clinic.appointments.searchLabel')}
            className="w-full ps-9 pe-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div role="group" aria-label={t('clinic.appointments.rangeLabel')} className="flex gap-2">
          {DATE_RANGES.map(range => (
            <button
              key={range}
              type="button"
              aria-pressed={filterDate === range}
              onClick={() => setFilterDate(range)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterDate === range ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t(`clinic.appointments.range.${range}`)}
            </button>
          ))}
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          aria-label={t('clinic.appointments.statusFilterLabel')}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="all">{t('clinic.filters.allStatuses')}</option>
          {STATUS_FILTERS.map(status => <option key={status} value={status}>{appointmentStatusLabel(t, status)}</option>)}
        </select>
        <select
          value={filterDoctor}
          onChange={e => setFilterDoctor(e.target.value)}
          aria-label={t('clinic.appointments.doctorFilterLabel')}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="all">{t('clinic.filters.allDoctors')}</option>
          {doctorFilterOptions([
            ...doctorOptions.map(d => ({ id: d.userId, name: d.name })),
            ...appts.map(a => ({ id: a.doctorId, name: doctorLabel(a) })),
          ]).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {listTruncated && (
        <p role="status" className="text-xs text-amber-700">
          {t('clinic.appointments.truncated', { value: formatLocaleDigits(TRUNCATED_AT, lang) })}
        </p>
      )}
      <p className="text-xs text-slate-500">{t('clinic.appointments.estimateNote')}</p>

      {/* Table (QA-249: a card per visit on phones) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        {isPhone ? (
          <ul data-testid="clinic-appointment-cards" className="divide-y divide-slate-100">
            {filtered.map(a => {
              const s = statusStyle[a.status] ?? statusStyle.scheduled;
              return (
                <li key={a.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{formatClinicTime(a.scheduledAt, lang)}</div>
                      <div className="text-xs text-slate-400">{formatClinicDate(a.scheduledAt, lang)}</div>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-fit ${s.color}`}>
                      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{appointmentStatusLabel(t, a.status)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{patientLabel(a)}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Phone size={10} aria-hidden="true" />
                      <span dir="ltr">{a.patientPhone ? formatLocalePhoneDisplay(a.patientPhone, lang) : '—'}</span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {doctorLabel(a)} <span className="text-xs text-slate-400">· {a.specialty ?? t('clinic.appointments.generalPractice')}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600">{visitReasonLabel(t, a.type)}</span>
                    <span className="font-bold text-teal-700" style={{ fontFamily: 'DM Mono, monospace' }}>{money(feeFor(a))}</span>
                  </div>
                  {renderActions(a)}
                </li>
              );
            })}
          </ul>
        ) : (
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {columns.map(h => (
                <th key={h} scope="col" className="text-start text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(a => {
              const s = statusStyle[a.status] ?? statusStyle.scheduled;
              return (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{formatClinicTime(a.scheduledAt, lang)}</span>
                    </div>
                    <div className="text-xs text-slate-400">{formatClinicDate(a.scheduledAt, lang)}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800 text-sm">{patientLabel(a)}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Phone size={10} aria-hidden="true" />
                      <span dir="ltr">{a.patientPhone ? formatLocalePhoneDisplay(a.patientPhone, lang) : '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-700 text-sm">{doctorLabel(a)}</div>
                    <div className="text-xs text-slate-400">{a.specialty ?? t('clinic.appointments.generalPractice')}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{visitReasonLabel(t, a.type)}</td>
                  <td className="px-5 py-4 font-bold text-sm text-teal-700" style={{ fontFamily: 'DM Mono, monospace' }}>{money(feeFor(a))}</td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-fit ${s.color}`}>
                      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{appointmentStatusLabel(t, a.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {renderActions(a)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Calendar size={32} aria-hidden="true" className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('clinic.appointments.empty')}</p>
          </div>
        )}
      </div>

      {cancelTarget && (
        <CancelAppointmentDialog
          appointment={cancelTarget}
          busy={busyId === cancelTarget.id}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason) => void changeStatus(cancelTarget.id, 'cancelled', reason)}
        />
      )}
      {showBook && (
        <ClinicBookAppointmentModal doctors={doctorOptions} onClose={() => setShowBook(false)} onBooked={handleBooked} />
      )}
    </div>
  );
}
