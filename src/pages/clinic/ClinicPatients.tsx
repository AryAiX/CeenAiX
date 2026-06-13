import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { Search, Users, Phone, Mail, Calendar, Clock, ChevronRight, X, BookOpen, MessageSquare, User, Save, Check } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  lastVisit: string;
  lastVisitDate: string | null;
  doctor: string;
  totalVisits: number;
  balance: number;
}

const apptStatusConfig: Record<string, { label: string; color: string }> = {
  scheduled:     { label: 'Scheduled',   color: 'bg-slate-100 text-slate-600' },
  confirmed:     { label: 'Confirmed',   color: 'bg-teal-50 text-teal-700' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-50 text-blue-700' },
  in_progress:   { label: 'In Progress', color: 'bg-blue-50 text-blue-700' },
  completed:     { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700' },
  cancelled:     { label: 'Cancelled',   color: 'bg-red-50 text-red-600' },
  'no-show':     { label: 'No Show',     color: 'bg-amber-50 text-amber-700' },
  no_show:       { label: 'No Show',     color: 'bg-amber-50 text-amber-700' },
};

interface Appointment {
  patientName: string;
  patientPhone: string;
  doctor: string;
  type: string;
  date: string;
  time: string;
  notes: string;
}

interface DoctorOption {
  userId: string;
  name: string;
  specialty: string;
  consultationFee: number;
}

const apptTypes = ['Consultation', 'Follow-up Visit', 'General Checkup', 'Diabetes Management', 'Lab Results Review', 'Radiology Review', 'Specialist Referral', 'Telemedicine'];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

const TELEMEDICINE_TYPES = new Set(['Telemedicine']);

function BookModal({ onClose, onBook, doctors: doctorList, initialPatient }: {
  onClose: () => void;
  onBook: (a: Partial<Appointment> & { patientId: string }) => void;
  doctors: DoctorOption[];
  initialPatient: { userId: string; fullName: string; phone: string };
}) {
  const [form, setForm] = useState({
    patientName: initialPatient.fullName,
    patientPhone: initialPatient.phone,
    doctor: doctorList[0]?.userId ?? '',
    type: apptTypes[0],
    date: '',
    time: '',
    notes: '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const [bookError, setBookError] = useState<string | null>(null);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const loadSlots = async (doctorId: string, dateStr: string) => {
    if (!doctorId || !dateStr) { setAvailableSlots([]); return; }
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const dayOfWeek = new Date(`${dateStr}T00:00:00`).getDay();

      const { data: availability } = await supabase
        .from('doctor_availability')
        .select('start_time, end_time, slot_duration_minutes')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      const { data: blocked } = await supabase
        .from('blocked_slots')
        .select('start_time, end_time')
        .eq('doctor_id', doctorId)
        .eq('blocked_date', dateStr);

      const dayStart = `${dateStr}T00:00:00`;
      const dayEnd = `${dateStr}T23:59:59`;
      const { data: existingAppts } = await supabase
        .from('appointments')
        .select('scheduled_at, duration_minutes')
        .eq('doctor_id', doctorId)
        .gte('scheduled_at', dayStart)
        .lte('scheduled_at', dayEnd)
        .eq('is_deleted', false)
        .not('status', 'in', '("cancelled","no_show")');

      const slots: string[] = [];
      (availability ?? []).forEach(window => {
        const duration = window.slot_duration_minutes || 30;
        let cursor = timeToMinutes(window.start_time);
        const end = timeToMinutes(window.end_time);
        while (cursor + duration <= end) {
          const slotEnd = cursor + duration;

          const isBlocked = (blocked ?? []).some(b => {
            const bStart = timeToMinutes(b.start_time);
            const bEnd = timeToMinutes(b.end_time);
            return cursor < bEnd && slotEnd > bStart;
          });

          const isBooked = (existingAppts ?? []).some(a => {
            const aStart = timeToMinutes(new Date(a.scheduled_at).toTimeString().slice(0, 5));
            const aEnd = aStart + (a.duration_minutes || 30);
            return cursor < aEnd && slotEnd > aStart;
          });

          if (!isBlocked && !isBooked) {
            slots.push(minutesToTime(cursor));
          }
          cursor += duration;
        }
      });

      setAvailableSlots(slots);
      if (slots.length === 0) {
        setSlotsError('This doctor has no available slots on this day.');
      }
    } catch (err) {
      setSlotsError(err instanceof Error ? err.message : 'Failed to load availability.');
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (form.doctor && form.date) {
      void loadSlots(form.doctor, form.date);
      setForm(f => ({ ...f, time: '' }));
    }
  }, [form.doctor, form.date]);

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center"><Calendar size={18} className="text-teal-600" /></div>
            <h3 className="font-bold text-slate-900">Book Appointment</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-100">
            <Check size={15} className="text-teal-600" />
            <div>
              <div className="text-sm font-semibold text-slate-800">{initialPatient.fullName}</div>
              <div className="text-xs text-slate-400">{initialPatient.phone}</div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Doctor</label>
            <select value={form.doctor} onChange={set('doctor')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              {doctorList.map(d => <option key={d.userId} value={d.userId}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Appointment Type</label>
            <select value={form.type} onChange={set('type')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              {apptTypes.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={set('date')}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Available Time Slots</label>
            {!form.date ? (
              <p className="text-xs text-slate-400">Select a date to see available slots.</p>
            ) : slotsLoading ? (
              <p className="text-xs text-slate-400">Loading availability…</p>
            ) : slotsError ? (
              <p className="text-xs text-amber-600">{slotsError}</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, time: slot }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.time === slot
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Optional notes…" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>
          {bookError && <p className="col-span-2 text-xs text-red-500">{bookError}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={() => {
              if (!form.date || !form.time) {
                setBookError('Please select a date and an available time slot.');
                return;
              }
              onBook({ ...form, patientId: initialPatient.userId });
              onClose();
            }}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Save size={15} /> Book Appointment
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PatientModal({ patient, appts, invoices, onClose, onBook, onMessage, onMarkPaid }: {
  patient: Patient;
  appts: { id?: string; scheduled_at: string; status: string }[];
  invoices: { id: string; amount: number; status: string; created_at: string }[];
  onClose: () => void;
  onBook: () => void;
  onMessage: () => void;
  onMarkPaid: (invoiceId: string) => void;
}) {
  const initials = patient.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{patient.name}</h3>
              <p className="text-xs text-slate-400">Patient Profile</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Patient Info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Patient Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400" /> {patient.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={14} className="text-slate-400" /> {patient.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User size={14} className="text-slate-400" /> DOB: {patient.dob}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar size={14} className="text-slate-400" /> Last Visit: {patient.lastVisit}
              </div>
            </div>
          </div>

          {/* Clinical Summary */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Clinical Summary</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{patient.totalVisits}</div>
                <div className="text-xs text-slate-500 mt-0.5">Total Visits</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-sm font-semibold text-slate-700">{patient.doctor}</div>
                <div className="text-xs text-slate-500 mt-0.5">Primary Doctor</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                {patient.balance > 0 ? (
                  <>
                    <div className="text-xl font-bold text-amber-600" style={{ fontFamily: 'DM Mono, monospace' }}>AED {patient.balance}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Outstanding</div>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold text-emerald-600">✓</div>
                    <div className="text-xs text-slate-500 mt-0.5">Balance Cleared</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Outstanding Invoices */}
          {invoices.filter(inv => inv.status === 'unpaid').length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Outstanding Invoices</p>
              <div className="space-y-2">
                {invoices.filter(inv => inv.status === 'unpaid').map(inv => (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div>
                      <div className="text-sm font-bold text-amber-700" style={{ fontFamily: 'DM Mono, monospace' }}>AED {inv.amount}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(inv.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <button
                      onClick={() => onMarkPaid(inv.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Mark as Paid
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointment History */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Appointment History</p>
            {appts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No appointments found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appts.map((a, idx) => {
                  const s = apptStatusConfig[a.status] ?? apptStatusConfig.scheduled;
                  const date = new Date(a.scheduled_at);
                  return (
                    <div key={a.id ?? idx} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                          <Calendar size={13} className="text-teal-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">
                            {date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-xs text-slate-400">
                            {date.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
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
            onClick={onMessage}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare size={15} /> Send Message
          </button>
          <button
            onClick={onBook}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen size={15} /> Book Appointment
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ClinicPatients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rawAppts, setRawAppts] = useState<{ id?: string; patient_id: string; doctor_id: string; scheduled_at: string; status: string }[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; patient_id: string; appointment_id: string | null; amount: number; status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('All Doctors');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientAppts, setPatientAppts] = useState<{ id?: string; scheduled_at: string; status: string }[]>([]);
  const [showBook, setShowBook] = useState(false);
  const [bookingPatient, setBookingPatient] = useState<{ userId: string; fullName: string; phone: string } | null>(null);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);

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

      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, scheduled_at, status')
        .eq('facility_id', facilityId)
        .eq('is_deleted', false);

      if (apptError) throw apptError;

      const { data: invoiceData } = await supabase
        .from('patient_invoices')
        .select('id, patient_id, appointment_id, amount, status, created_at')
        .eq('facility_id', facilityId);

      setInvoices(invoiceData ?? []);

      const { data: staffData } = await supabase
        .from('facility_staff')
        .select('doctor_user_id, consultation_fee')
        .eq('facility_id', facilityId)
        .eq('is_active', true);

      const staffIds = (staffData ?? []).map(s => s.doctor_user_id).filter(Boolean);
      const { data: staffProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', staffIds);

      const { data: doctorSpecs } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialization')
        .in('user_id', staffIds);

      const specMap = new Map((doctorSpecs ?? []).map(d => [d.user_id, d.specialization]));

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

      const patientIds = [...new Set((apptData ?? []).map(a => a.patient_id))];
      if (patientIds.length === 0) { setPatients([]); setRawAppts([]); return; }

      const doctorIds = [...new Set((apptData ?? []).map(a => a.doctor_id))];

      const { data: patientProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, phone, email, date_of_birth')
        .in('user_id', patientIds);

      const { data: doctorProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', doctorIds);

      const doctorMap = new Map((doctorProfiles ?? []).map(d => [d.user_id, d.full_name]));

      const rows: Patient[] = patientIds.map(pid => {
        const profile = (patientProfiles ?? []).find(p => p.user_id === pid);
        const patientApptList = (apptData ?? []).filter(a => a.patient_id === pid);
        const sorted = [...patientApptList].sort((a, b) =>
          new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
        );
        const lastAppt = sorted[0];
        const primaryDoctorId = lastAppt?.doctor_id;
        const dob = profile?.date_of_birth
          ? new Date(profile.date_of_birth).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—';
        const lastVisit = lastAppt?.scheduled_at
          ? new Date(lastAppt.scheduled_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—';

        const patientBalance = (invoiceData ?? [])
          .filter(inv => inv.patient_id === pid && inv.status === 'unpaid')
          .reduce((sum, inv) => sum + Number(inv.amount), 0);

        return {
          id: pid,
          name: profile?.full_name ?? 'Unknown Patient',
          phone: profile?.phone ?? '—',
          email: profile?.email ?? '—',
          dob,
          lastVisit,
          lastVisitDate: lastAppt?.scheduled_at ?? null,
          doctor: doctorMap.get(primaryDoctorId) ? `Dr. ${doctorMap.get(primaryDoctorId)}` : '—',
          totalVisits: patientApptList.length,
          balance: patientBalance,
        };
      });

      setPatients(rows);
      setRawAppts(apptData ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (data: Partial<Appointment> & { patientId: string }) => {
    try {
      const { data: memberData } = await supabase
        .from('clinic_portal_members')
        .select('facility_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      const fId = memberData?.facility_id;
      if (!fId) throw new Error('No clinic facility found.');

      const selectedDoctor = doctorOptions.find(d => d.userId === data.doctor);
      if (!selectedDoctor) throw new Error('Please select a valid doctor.');

      const scheduledAt = `${data.date}T${data.time}:00`;

      const apptType = data.type && TELEMEDICINE_TYPES.has(data.type) ? 'virtual' : 'in_person';

      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          facility_id: fId,
          doctor_id: selectedDoctor.userId,
          patient_id: data.patientId,
          type: apptType,
          status: 'scheduled',
          scheduled_at: scheduledAt,
          duration_minutes: 30,
          chief_complaint: data.type || 'Consultation',
          notes: data.notes || null,
        });

      if (insertError) throw insertError;

      await supabase.from('notifications').insert({
        user_id: data.patientId,
        type: 'appointment',
        title: '📅 New Appointment Scheduled',
        body: `${selectedDoctor.name} has scheduled an appointment with you on ${data.date} at ${data.time}.`,
        action_url: '/patient/appointments',
      });

      void fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment.');
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('patient_invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoiceId);
      if (updateError) throw updateError;

      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'paid' } : inv));
      setPatients(prev => prev.map(p => {
        if (p.id !== selectedPatient?.id) return p;
        const newBalance = invoices
          .filter(inv => inv.patient_id === p.id && inv.status === 'unpaid' && inv.id !== invoiceId)
          .reduce((sum, inv) => sum + Number(inv.amount), 0);
        return { ...p, balance: newBalance };
      }));
      if (selectedPatient) {
        setSelectedPatient(prev => prev ? { ...prev, balance: prev.balance - (invoices.find(i => i.id === invoiceId)?.amount ?? 0) } : prev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark invoice as paid.');
    }
  };

  const handleRowClick = (patient: Patient) => {
    const appts = rawAppts
      .filter(a => a.patient_id === patient.id)
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    setPatientAppts(appts);
    setSelectedPatient(patient);
  };

  const now = new Date();
  const visitedThisMonth = patients.filter(p => {
    if (!p.lastVisitDate) return false;
    const d = new Date(p.lastVisitDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const doctorList = ['All Doctors', ...new Set(patients.map(p => p.doctor).filter(d => d !== '—'))];

  const filtered = patients.filter(p =>
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) ||
    p.doctor.toLowerCase().includes(search.toLowerCase())) &&
    (filterDoctor === 'All Doctors' || p.doctor === filterDoctor)
  );

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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => void fetchData()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Patients</h2>
          <p className="text-sm text-slate-500 mt-0.5">{patients.length} registered patients</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Patients', value: patients.length, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Visited This Month', value: visitedThisMonth, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Balances', value: patients.filter(p => p.balance > 0).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}><Icon size={18} className={k.color} /></div>
              <div>
                <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients by name, phone, or doctor…" className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <select
          value={filterDoctor}
          onChange={e => setFilterDoctor(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          {doctorList.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Patient', 'Contact', 'Date of Birth', 'Doctor', 'Last Visit', 'Visits', 'Balance', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">{h}</th>
              ))}
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
                      <span className="font-semibold text-slate-800 text-sm">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500"><Phone size={11} /> {p.phone}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5"><Mail size={11} /> {p.email}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{p.dob}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{p.doctor}</td>
                  <td className="px-5 py-4 text-sm text-slate-600" style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{p.lastVisit}</td>
                  <td className="px-5 py-4 font-bold text-sm text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{p.totalVisits}</td>
                  <td className="px-5 py-4">
                    {p.balance > 0 ? (
                      <span className="font-bold text-amber-600 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>AED {p.balance}</span>
                    ) : (
                      <span className="text-emerald-600 text-xs font-medium">Cleared</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <ChevronRight size={16} className="text-slate-300" />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-16 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Users size={32} className="opacity-30" />
                    <p className="text-sm">No patients found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPatient && (
        <PatientModal
          patient={selectedPatient}
          appts={patientAppts}
          invoices={invoices.filter(inv => inv.patient_id === selectedPatient.id)}
          onClose={() => setSelectedPatient(null)}
          onBook={() => {
            setBookingPatient({
              userId: selectedPatient.id,
              fullName: selectedPatient.name,
              phone: selectedPatient.phone,
            });
            setSelectedPatient(null);
            setShowBook(true);
          }}
          onMessage={() => navigate(`/clinic/messages?patient=${selectedPatient.id}`)}
          onMarkPaid={(invoiceId) => void handleMarkPaid(invoiceId)}
        />
      )}

      {showBook && bookingPatient && (
        <BookModal
          onClose={() => { setShowBook(false); setBookingPatient(null); }}
          onBook={handleBook}
          doctors={doctorOptions}
          initialPatient={bookingPatient}
        />
      )}
    </div>
  );
}
