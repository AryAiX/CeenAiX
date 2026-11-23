import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { createPortal } from 'react-dom';
import { Plus, Search, Calendar, Clock, Check, DollarSign, Phone } from 'lucide-react';
import { clinicDateKey, clinicTimeOfDay, clinicTodayKey } from '../../lib/clinic-booking-time';
import ClinicBookAppointmentModal, { type ClinicBookedAppointment, type ClinicBookingDoctor } from './ClinicBookAppointmentModal';
import { getClinicAppointmentActions, type ClinicAppointmentStatusChange } from '../../lib/appointment-actions';
import type { AppointmentStatus } from '../../types/enums';

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  doctor: string;
  specialty: string;
  type: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  price: number;
  notes: string;
  wasRescheduled: boolean;
  /** Stored start time (UTC ISO); used for the QA-190 status rules. */
  scheduledAt: string;
}

/** QA-190: friendly message for a refused status change (never the raw database text). */
const statusChangeErrorMessage = (err: unknown): string => {
  const code = (err as { code?: string } | null)?.code;
  if (code === '22023' || code === 'P0002') {
    return 'This change is no longer possible for this appointment. The list has been refreshed.';
  }
  if (code === '42501') {
    return 'Only clinic admins and managers can change appointments.';
  }
  return 'Could not update the appointment. Please try again.';
};

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 id="clinic-cancel-appointment-title" className="font-bold text-slate-900">Cancel appointment</h3>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-600">
            {appointment.patientName} with {appointment.doctor} on {appointment.date} at {appointment.time}.
          </p>
          <p className="text-sm text-slate-600">The patient and the doctor will be notified.</p>
          <div>
            <label htmlFor="clinic-cancel-reason" className="block text-xs font-semibold text-slate-600 mb-1">
              Reason (optional)
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
            Keep appointment
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={busy}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          >
            Cancel appointment
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}




type DoctorOption = ClinicBookingDoctor;

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  scheduled:    { label: 'Scheduled',   color: 'bg-slate-100 text-slate-600 border-slate-200',      dot: 'bg-slate-400' },
  confirmed:    { label: 'Confirmed',   color: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500' },
  'in-progress':{ label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500 animate-pulse' },
  in_progress:  { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500 animate-pulse' },
  completed:    { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled:    { label: 'Cancelled',   color: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400' },
  'no-show':    { label: 'No Show',     color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  no_show:      { label: 'No Show',     color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
};

const statusOptions = [
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'confirmed',   label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
  { value: 'no_show',     label: 'No Show' },
];


export default function ClinicAppointments() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDoctor, setFilterDoctor] = useState('All Doctors');
  const [filterDate, setFilterDate] = useState('today');
  const [showBook, setShowBook] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

      // Fetch appointments
      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, scheduled_at, status, type, chief_complaint, notes, duration_minutes, created_at, updated_at')
        .eq('facility_id', fId)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: false });

      if (apptError) throw apptError;

      // Get all unique user IDs
      const patientIds = [...new Set((apptData ?? []).map(a => a.patient_id))];
      const doctorIds = [...new Set((apptData ?? []).map(a => a.doctor_id))];
      const allIds = [...new Set([...patientIds, ...doctorIds])];

      // Fetch profiles
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, phone')
        .in('user_id', allIds);

      // Fetch doctor specializations
      const { data: doctorProfileData } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialization')
        .in('user_id', doctorIds);

      const profileMap = new Map((profileData ?? []).map(p => [p.user_id, p]));
      const specMap = new Map((doctorProfileData ?? []).map(d => [d.user_id, d.specialization]));

      const { data: staffData } = await supabase
        .from('facility_staff')
        .select('doctor_user_id, consultation_fee')
        .eq('facility_id', fId)
        .eq('is_active', true);

      const feeMap = new Map(
        (staffData ?? []).map(s => [s.doctor_user_id, Number(s.consultation_fee) || 0])
      );

      // Build appointments
      const apptRows: Appointment[] = (apptData ?? []).map(a => {
        const patient = profileMap.get(a.patient_id);
        const doctor = profileMap.get(a.doctor_id);
        const createdAt = new Date(a.created_at).getTime();
        const updatedAt = new Date(a.updated_at).getTime();
        const wasRescheduled = updatedAt - createdAt > 60000; // more than 1 minute apart
        return {
          id: a.id,
          patientName: patient?.full_name ?? 'Unknown Patient',
          patientPhone: patient?.phone ?? '—',
          doctor: doctor?.full_name ?? 'Unknown Doctor',
          specialty: specMap.get(a.doctor_id) ?? 'General Practice',
          type: a.chief_complaint ?? a.type ?? 'Consultation',
          date: clinicDateKey(a.scheduled_at),
          time: clinicTimeOfDay(a.scheduled_at),
          status: a.status as Appointment['status'],
          price: feeMap.get(a.doctor_id) ?? 0,
          notes: a.notes ?? '',
          wasRescheduled,
          scheduledAt: a.scheduled_at,
        };
      });

      setAppts(apptRows);

      const staffIds = (staffData ?? []).map(s => s.doctor_user_id).filter(Boolean);
      const { data: staffProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', staffIds);

      const doctorRows: DoctorOption[] = (staffData ?? []).map(s => {
        const profile = (staffProfiles ?? []).find(p => p.user_id === s.doctor_user_id);
        return {
          userId: s.doctor_user_id,
          name: profile?.full_name ?? 'Unknown Doctor',
          specialty: specMap.get(s.doctor_user_id) ?? 'General Practice',
          consultationFee: Number(s.consultation_fee) || 0,
        };
      });

      setDoctorOptions(doctorRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = appts.filter(a => {
    const matchSearch = a.patientName.toLowerCase().includes(search.toLowerCase()) ||
      a.doctor.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchDoctor = filterDoctor === 'All Doctors' || a.doctor === filterDoctor;
    const matchDate = filterDate === 'all' ||
      (filterDate === 'today' && a.date === today) ||
      (filterDate === 'upcoming' && a.date > today) ||
      (filterDate === 'past' && a.date < today);
    return matchSearch && matchStatus && matchDoctor && matchDate;
  });

  const todayRevenue = appts
    .filter(a => a.date === today && a.status === 'completed')
    .reduce((s, a) => s + a.price, 0);

  /** QA-191: the popup books through clinic_book_appointment; here we only show the new row. */
  const handleBooked = (booked: ClinicBookedAppointment) => {
    const newAppt: Appointment = {
      id: booked.id,
      patientName: booked.patient.fullName,
      patientPhone: booked.patient.phone,
      doctor: booked.doctor.name,
      specialty: booked.doctor.specialty,
      type: booked.reason,
      date: booked.date,
      time: booked.time,
      status: 'scheduled',
      price: booked.doctor.consultationFee,
      notes: booked.notes,
      wasRescheduled: false,
      scheduledAt: booked.scheduledAt,
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
      setError(statusChangeErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => void fetchData()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Appointments</h2>
          <p className="text-sm text-slate-500 mt-0.5">Book and manage patient appointments</p>
        </div>
        <button
          onClick={() => setShowBook(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} /> Book Appointment
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Today's Total", value: appts.filter(a => a.date === today).length, icon: Calendar, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Completed Today', value: appts.filter(a => a.date === today && a.status === 'completed').length, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Upcoming', value: appts.filter(a => a.date >= today && ['scheduled', 'confirmed'].includes(a.status)).length, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: "Today's Revenue", value: `AED ${todayRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}><Icon size={18} className={k.color} /></div>
              <div>
                <div className="text-xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, doctor, type…" className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="flex gap-2">
          {[['today', 'Today'], ['upcoming', 'Upcoming'], ['past', 'Past'], ['all', 'All']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterDate(v)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterDate === v ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>
          ))}
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
          <option value="all">All Status</option>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
          <option>All Doctors</option>
          {doctorOptions.map(d => <option key={d.userId}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Date & Time', 'Patient', 'Doctor', 'Type', 'Price', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(a => {
              const s = statusConfig[a.status] ?? statusConfig.scheduled;
              return (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{a.time}</span>
                      {a.wasRescheduled && (
                        <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px] font-semibold border border-violet-200">↻ Rescheduled</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{a.date}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800 text-sm">{a.patientName}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} /> {a.patientPhone}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-700 text-sm">{a.doctor}</div>
                    <div className="text-xs text-slate-400">{a.specialty}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{a.type}</td>
                  <td className="px-5 py-4 font-bold text-sm text-teal-700" style={{ fontFamily: 'DM Mono, monospace' }}>AED {a.price}</td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-fit ${s.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {(() => {
                      const actions = getClinicAppointmentActions({ status: a.status, scheduled_at: a.scheduledAt });
                      const busy = busyId === a.id;
                      if (!actions.canConfirm && !actions.canCancel && !actions.canMarkNoShow) {
                        return <span className="text-xs text-slate-400">—</span>;
                      }
                      const base = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-60';
                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {actions.canConfirm && (
                            <button type="button" disabled={busy} onClick={() => void changeStatus(a.id, 'confirmed')} className={`${base} bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100`}>
                              Confirm
                            </button>
                          )}
                          {actions.canCancel && (
                            <button type="button" disabled={busy} onClick={() => setCancelTarget(a)} className={`${base} bg-white text-red-600 border-red-200 hover:bg-red-50`}>
                              Cancel
                            </button>
                          )}
                          {actions.canMarkNoShow && (
                            <button type="button" disabled={busy} onClick={() => void changeStatus(a.id, 'no_show')} className={`${base} bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100`}>
                              No-show
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Calendar size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No appointments found.</p>
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
