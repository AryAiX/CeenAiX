import { useState } from 'react';
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
}

const doctors = ['Dr. Fatima Hassan', 'Dr. Khalid Nasser', 'Dr. Tooraj Helmi', 'Dr. Aisha Al Mansoori'];
const apptTypes = ['Cardiology Consultation', 'Follow-up Visit', 'General Checkup', 'Diabetes Management', 'Lab Results Review', 'Radiology Review', 'Specialist Referral', 'Telemedicine'];

const mockAppts: Appointment[] = [
  { id: '1', patientName: 'Ahmed Al Rashidi', patientPhone: '+971 50 111 2233', doctor: 'Dr. Fatima Hassan', specialty: 'Cardiology', type: 'Cardiology Consultation', date: '2026-05-28', time: '09:00', status: 'completed', price: 800, notes: '' },
  { id: '2', patientName: 'Layla Al Mansoori', patientPhone: '+971 55 222 3344', doctor: 'Dr. Khalid Nasser', specialty: 'Internal Medicine', type: 'Follow-up Visit', date: '2026-05-28', time: '09:30', status: 'in-progress', price: 400, notes: 'BP monitoring' },
  { id: '3', patientName: 'Omar Ibrahim', patientPhone: '+971 54 333 4455', doctor: 'Dr. Tooraj Helmi', specialty: 'General Practice', type: 'General Checkup', date: '2026-05-28', time: '10:00', status: 'confirmed', price: 300, notes: '' },
  { id: '4', patientName: 'Sara Khalid', patientPhone: '+971 52 444 5566', doctor: 'Dr. Fatima Hassan', specialty: 'Cardiology', type: 'Diabetes Management', date: '2026-05-28', time: '10:30', status: 'confirmed', price: 600, notes: 'HbA1c review' },
  { id: '5', patientName: 'Yousef Al Zahrani', patientPhone: '+971 56 555 6677', doctor: 'Dr. Fatima Hassan', specialty: 'Cardiology', type: 'Cardiology Consultation', date: '2026-05-28', time: '11:00', status: 'scheduled', price: 800, notes: '' },
  { id: '6', patientName: 'Noor Al Sayed', patientPhone: '+971 58 666 7788', doctor: 'Dr. Tooraj Helmi', specialty: 'General Practice', type: 'Lab Results Review', date: '2026-05-28', time: '11:30', status: 'scheduled', price: 200, notes: '' },
  { id: '7', patientName: 'Reem Al Hassan', patientPhone: '+971 50 777 8899', doctor: 'Dr. Aisha Al Mansoori', specialty: 'Endocrinology', type: 'Follow-up Visit', date: '2026-05-29', time: '09:00', status: 'scheduled', price: 700, notes: '' },
  { id: '8', patientName: 'Bilal Farooq', patientPhone: '+971 55 888 9900', doctor: 'Dr. Khalid Nasser', specialty: 'Internal Medicine', type: 'General Checkup', date: '2026-05-29', time: '10:00', status: 'scheduled', price: 300, notes: '' },
  { id: '9', patientName: 'Maya Johansson', patientPhone: '+971 54 999 0011', doctor: 'Dr. Tooraj Helmi', specialty: 'General Practice', type: 'Telemedicine', date: '2026-05-27', time: '14:00', status: 'cancelled', price: 200, notes: 'Patient cancelled' },
  { id: '10', patientName: 'Tariq Al Rashid', patientPhone: '+971 52 000 1122', doctor: 'Dr. Fatima Hassan', specialty: 'Cardiology', type: 'Cardiology Consultation', date: '2026-05-27', time: '11:00', status: 'no-show', price: 800, notes: '' },
];

const statusConfig = {
  scheduled:   { label: 'Scheduled',    color: 'bg-slate-100 text-slate-600 border-slate-200',     dot: 'bg-slate-400' },
  confirmed:   { label: 'Confirmed',    color: 'bg-teal-50 text-teal-700 border-teal-200',         dot: 'bg-teal-500' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500 animate-pulse' },
  completed:   { label: 'Completed',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled:   { label: 'Cancelled',    color: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-400' },
  'no-show':   { label: 'No Show',      color: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-400' },
};

function BookModal({ onClose, onBook }: { onClose: () => void; onBook: (a: Partial<Appointment>) => void }) {
  const [form, setForm] = useState({ patientName: '', patientPhone: '', doctor: doctors[0], type: apptTypes[0], date: '', time: '', price: 0, notes: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

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
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Name</label>
            <input type="text" value={form.patientName} onChange={set('patientName')} placeholder="Full name" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Phone</label>
            <input type="text" value={form.patientPhone} onChange={set('patientPhone')} placeholder="+971 XX XXX XXXX" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Doctor</label>
            <select value={form.doctor} onChange={set('doctor')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              {doctors.map(d => <option key={d}>{d}</option>)}
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
            <input type="date" value={form.date} onChange={set('date')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Time</label>
            <input type="time" value={form.time} onChange={set('time')} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Price (AED)</label>
            <input type="number" value={form.price} onChange={set('price')} placeholder="0" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Optional notes…" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={() => { onBook(form); onClose(); }}
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
  const [appts, setAppts] = useState<Appointment[]>(mockAppts);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDoctor, setFilterDoctor] = useState('All Doctors');
  const [filterDate, setFilterDate] = useState('today');
  const [showBook, setShowBook] = useState(false);

  const today = '2026-05-28';

  const filtered = appts.filter(a => {
    const matchSearch = a.patientName.toLowerCase().includes(search.toLowerCase()) || a.doctor.toLowerCase().includes(search.toLowerCase()) || a.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchDoctor = filterDoctor === 'All Doctors' || a.doctor === filterDoctor;
    const matchDate = filterDate === 'all' || (filterDate === 'today' && a.date === today) || (filterDate === 'upcoming' && a.date > today) || (filterDate === 'past' && a.date < today);
    return matchSearch && matchStatus && matchDoctor && matchDate;
  });

  const todayRevenue = appts.filter(a => a.date === today && a.status === 'completed').reduce((s, a) => s + a.price, 0);

  function handleBook(data: Partial<Appointment>) {
    setAppts(prev => [{
      id: Date.now().toString(),
      patientName: data.patientName || '',
      patientPhone: data.patientPhone || '',
      doctor: data.doctor || '',
      specialty: '',
      type: data.type || '',
      date: data.date || today,
      time: data.time || '09:00',
      status: 'scheduled',
      price: Number(data.price) || 0,
      notes: data.notes || '',
    }, ...prev]);
  }

  function changeStatus(id: string, status: Appointment['status']) {
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  return (
    <div className="p-6 space-y-5">
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
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
          <option>All Doctors</option>
          {doctors.map(d => <option key={d}>{d}</option>)}
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
              const s = statusConfig[a.status];
              return (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{a.time}</div>
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
                      {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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

      {showBook && <BookModal onClose={() => setShowBook(false)} onBook={handleBook} />}
    </div>
  );
}
