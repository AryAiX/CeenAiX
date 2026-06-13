import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '../../lib/auth-context';
import { createPortal } from 'react-dom';
import { Plus, Search, Calendar, Clock, X, Save, Check, DollarSign, Phone } from 'lucide-react';

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  doctor: string;
  specialty: string;
  type: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  price: number;
  notes: string;
  wasRescheduled: boolean;
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

interface DoctorOption {
  userId: string;
  name: string;
  specialty: string;
  consultationFee: number;
}

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

function BookModal({ onClose, onBook, doctors: doctorList, supabase }: { onClose: () => void; onBook: (a: Partial<Appointment> & { patientId: string }) => void; doctors: DoctorOption[]; supabase: SupabaseClient }) {
  const [form, setForm] = useState({ patientName: '', patientPhone: '', doctor: doctorList[0]?.userId ?? '', type: apptTypes[0], date: '', time: '', notes: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<{ userId: string; fullName: string; phone: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ userId: string; fullName: string; phone: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.doctor, form.date]);

  const searchPatients = async (query: string) => {
    setPatientSearch(query);
    setSelectedPatient(null);
    setSearchError(null);
    if (query.length < 2) { setPatientResults([]); setShowDropdown(false); return; }
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, phone')
      .eq('role', 'patient')
      .ilike('full_name', `%${query}%`)
      .limit(8);
    setPatientResults((data ?? []).map(p => ({ userId: p.user_id, fullName: p.full_name ?? 'Unknown', phone: p.phone ?? '—' })));
    setShowDropdown(true);
  };

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
          <div className="col-span-2 relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Name</label>
            <div className="relative">
              <input
                type="text"
                value={patientSearch}
                onChange={e => void searchPatients(e.target.value)}
                placeholder="Search patient by name…"
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {selectedPatient && (
                <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500" />
              )}
            </div>
            {showDropdown && patientResults.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {patientResults.map(p => (
                  <div
                    key={p.userId}
                    onClick={() => {
                      setSelectedPatient(p);
                      setPatientSearch(p.fullName);
                      setForm(f => ({ ...f, patientName: p.fullName, patientPhone: p.phone }));
                      setShowDropdown(false);
                    }}
                    className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-sm"
                  >
                    <div className="font-medium text-slate-800">{p.fullName}</div>
                    <div className="text-xs text-slate-400">{p.phone}</div>
                  </div>
                ))}
              </div>
            )}
            {patientSearch.length >= 2 && showDropdown && patientResults.length === 0 && !selectedPatient && (
              <p className="text-xs text-slate-400 mt-1">No patients found.</p>
            )}
            {searchError && <p className="text-xs text-red-500 mt-1">{searchError}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Phone</label>
            <input type="text" value={form.patientPhone} onChange={set('patientPhone')} placeholder="+971 XX XXX XXXX" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
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
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={() => {
              if (!selectedPatient) {
                setSearchError('Please search and select a patient from the list.');
                return;
              }
              if (!form.time) {
                setSearchError('Please select an available time slot.');
                return;
              }
              onBook({ ...form, patientId: selectedPatient.userId });
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

export default function ClinicAppointments() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDoctor, setFilterDoctor] = useState('All Doctors');
  const [filterDate, setFilterDate] = useState('today');
  const [showBook, setShowBook] = useState(false);

  const today = new Date().toISOString().split('T')[0];

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
      setFacilityId(fId);

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
        const scheduledAt = new Date(a.scheduled_at);
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
          date: scheduledAt.toISOString().split('T')[0],
          time: scheduledAt.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false }),
          status: a.status as Appointment['status'],
          price: feeMap.get(a.doctor_id) ?? 0,
          notes: a.notes ?? '',
          wasRescheduled,
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

  const handleBook = async (data: Partial<Appointment> & { patientId: string; doctor?: string }) => {
    if (!facilityId) return;
    try {
      const selectedDoctor = doctorOptions.find(d => d.userId === data.doctor);
      if (!selectedDoctor) throw new Error('Please select a valid doctor.');

      const scheduledAt = `${data.date}T${data.time}:00`;

      const apptType = data.type && TELEMEDICINE_TYPES.has(data.type) ? 'virtual' : 'in_person';

      const { data: inserted, error: insertError } = await supabase
        .from('appointments')
        .insert({
          facility_id: facilityId,
          doctor_id: selectedDoctor.userId,
          patient_id: data.patientId,
          type: apptType,
          status: 'scheduled',
          scheduled_at: scheduledAt,
          duration_minutes: 30,
          chief_complaint: data.type || 'Consultation',
          notes: data.notes || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      await supabase.from('notifications').insert({
        user_id: data.patientId,
        type: 'appointment',
        title: '📅 New Appointment Scheduled',
        body: `${selectedDoctor.name} has scheduled an appointment with you on ${data.date} at ${data.time}.`,
        action_url: '/patient/appointments',
      });

      const newAppt: Appointment = {
        id: inserted.id,
        patientName: data.patientName || '',
        patientPhone: data.patientPhone || '',
          doctor: selectedDoctor.name,
          specialty: selectedDoctor.specialty,
        type: data.type || 'Consultation',
        date: data.date || today,
        time: data.time || '09:00',
        status: 'scheduled',
        price: selectedDoctor.consultationFee,
        notes: data.notes || '',
        wasRescheduled: false,
      };
      setAppts(prev => [newAppt, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment.');
    }
  };

  const changeStatus = async (id: string, status: Appointment['status']) => {
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);
      if (updateError) throw updateError;

      // Auto-create invoice when appointment is marked completed
      if (status === 'completed' && facilityId) {
        const appt = appts.find(a => a.id === id);
        if (appt && appt.price > 0) {
          const { data: existingInvoice } = await supabase
            .from('patient_invoices')
            .select('id')
            .eq('appointment_id', id)
            .maybeSingle();

          if (!existingInvoice) {
            const patientProfile = await supabase
              .from('appointments')
              .select('patient_id')
              .eq('id', id)
              .single();

            if (patientProfile.data?.patient_id) {
              await supabase.from('patient_invoices').insert({
                facility_id: facilityId,
                patient_id: patientProfile.data.patient_id,
                appointment_id: id,
                amount: appt.price,
                status: 'unpaid',
              });
            }
          }
        }
      }

      setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
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
                    <select
                      value={a.status}
                      onChange={e => changeStatus(a.id, e.target.value as Appointment['status'])}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
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

      {showBook && <BookModal onClose={() => setShowBook(false)} onBook={handleBook} doctors={doctorOptions} supabase={supabase} />}
    </div>
  );
}
