import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, CheckCircle, Clock, AlertCircle, X, Save, Stethoscope, Phone, Mail, Calendar, Star, MoreVertical, CreditCard as Edit2, Trash2, Eye } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  dhaLicense: string;
  phone: string;
  email: string;
  status: 'active' | 'pending' | 'inactive' | 'suspended';
  initials: string;
  gradient: string;
  joinedDate: string;
  todayAppts: number;
  totalAppts: number;
  rating: number;
  consultationFee: number;
  availability: string[];
}

const mockDoctors: Doctor[] = [
  { id: '1', name: 'Dr. Fatima Hassan', specialty: 'Cardiology', dhaLicense: 'DHA-PRAC-2018-047821', phone: '+971 50 234 5678', email: 'fatima.hassan@clinic.ae', status: 'active', initials: 'FH', gradient: 'from-teal-600 to-blue-600', joinedDate: 'Jan 2023', todayAppts: 5, totalAppts: 312, rating: 4.9, consultationFee: 800, availability: ['Mon', 'Tue', 'Wed', 'Thu'] },
  { id: '2', name: 'Dr. Khalid Nasser', specialty: 'Internal Medicine', dhaLicense: 'DHA-PRAC-2019-038421', phone: '+971 55 345 6789', email: 'khalid.nasser@clinic.ae', status: 'active', initials: 'KN', gradient: 'from-blue-600 to-blue-700', joinedDate: 'Mar 2023', todayAppts: 4, totalAppts: 218, rating: 4.7, consultationFee: 600, availability: ['Mon', 'Tue', 'Thu', 'Fri'] },
  { id: '3', name: 'Dr. Tooraj Helmi', specialty: 'General Practice', dhaLicense: 'DHA-PRAC-2015-019834', phone: '+971 54 456 7890', email: 'tooraj.helmi@clinic.ae', status: 'active', initials: 'TH', gradient: 'from-slate-600 to-slate-700', joinedDate: 'Jun 2022', todayAppts: 3, totalAppts: 487, rating: 4.6, consultationFee: 300, availability: ['Mon', 'Wed', 'Thu', 'Fri', 'Sat'] },
  { id: '4', name: 'Dr. Aisha Al Mansoori', specialty: 'Endocrinology', dhaLicense: 'DHA-PRAC-2020-052341', phone: '+971 52 567 8901', email: 'aisha.mansoori@clinic.ae', status: 'active', initials: 'AA', gradient: 'from-emerald-600 to-teal-600', joinedDate: 'Sep 2023', todayAppts: 0, totalAppts: 134, rating: 4.8, consultationFee: 700, availability: ['Tue', 'Wed', 'Fri'] },
  { id: '5', name: 'Dr. Omar Al Sayed', specialty: 'Orthopedics', dhaLicense: 'DHA-PRAC-2022-067891', phone: '+971 56 678 9012', email: 'omar.sayed@clinic.ae', status: 'pending', initials: 'OS', gradient: 'from-amber-600 to-amber-700', joinedDate: 'Pending', todayAppts: 0, totalAppts: 0, rating: 0, consultationFee: 900, availability: [] },
  { id: '6', name: 'Dr. Nour Al Rashidi', specialty: 'Pediatrics', dhaLicense: 'DHA-PRAC-2021-059234', phone: '+971 58 789 0123', email: 'nour.rashidi@clinic.ae', status: 'pending', initials: 'NR', gradient: 'from-rose-500 to-rose-600', joinedDate: 'Pending', todayAppts: 0, totalAppts: 0, rating: 0, consultationFee: 500, availability: [] },
];

const statusConfig = {
  active:    { label: 'Active',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  inactive:  { label: 'Inactive',  color: 'bg-slate-100 text-slate-600 border-slate-200' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700 border-red-200' },
};

const specialties = ['All Specialties', 'Cardiology', 'Internal Medicine', 'General Practice', 'Endocrinology', 'Orthopedics', 'Pediatrics'];

function AddDoctorModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Partial<Doctor>) => void }) {
  const [form, setForm] = useState({ name: '', specialty: '', dhaLicense: '', phone: '', email: '', consultationFee: 0 });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center"><Stethoscope size={18} className="text-teal-600" /></div>
            <h3 className="font-bold text-slate-900">Add New Doctor</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Full Name', key: 'name', placeholder: 'Dr. First Last', col: 'col-span-2' },
            { label: 'Specialty', key: 'specialty', placeholder: 'e.g. Cardiology' },
            { label: 'DHA License #', key: 'dhaLicense', placeholder: 'DHA-PRAC-YYYY-XXXXXX' },
            { label: 'Phone', key: 'phone', placeholder: '+971 XX XXX XXXX' },
            { label: 'Email', key: 'email', placeholder: 'doctor@clinic.ae' },
            { label: 'Consultation Fee (AED)', key: 'consultationFee', placeholder: '500' },
          ].map(f => (
            <div key={f.key} className={f.col || ''}>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
              <input
                type={f.key === 'email' ? 'email' : f.key === 'consultationFee' ? 'number' : 'text'}
                value={(form as Record<string, string | number>)[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Save size={15} /> Add Doctor
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DoctorDetailDrawer({ doctor, onClose, onApprove, onSuspend }: { doctor: Doctor; onClose: () => void; onApprove?: () => void; onSuspend?: () => void }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return createPortal(
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[420px] bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Doctor Profile</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Hero */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${doctor.gradient} flex items-center justify-center text-white font-bold text-xl`}>
              {doctor.initials}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg">{doctor.name}</div>
              <div className="text-slate-500 text-sm">{doctor.specialty}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig[doctor.status].color}`}>{statusConfig[doctor.status].label}</span>
                {doctor.rating > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <Star size={12} fill="currentColor" /> {doctor.rating}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* License */}
          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">DHA License</div>
            <div className="font-mono text-sm text-slate-800">{doctor.dhaLicense}</div>
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${doctor.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
              <CheckCircle size={12} /> {doctor.status === 'active' ? 'Verified & Active' : 'Pending Verification'}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            {[{ icon: Phone, value: doctor.phone }, { icon: Mail, value: doctor.email }].map(c => {
              const Icon = c.icon;
              return (
                <div key={c.value} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center"><Icon size={14} className="text-slate-500" /></div>
                  <span className="text-sm text-slate-700">{c.value}</span>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Today's Appts", value: doctor.todayAppts },
              { label: 'Total Appts', value: doctor.totalAppts },
              { label: 'Fee (AED)', value: doctor.consultationFee },
            ].map(s => (
              <div key={s.label} className="p-3 bg-slate-50 rounded-xl text-center">
                <div className="font-bold text-slate-900 text-lg" style={{ fontFamily: 'DM Mono, monospace' }}>{s.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Availability */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Availability</div>
            <div className="flex gap-2 flex-wrap">
              {days.map(d => (
                <span key={d} className={`px-3 py-1 rounded-full text-xs font-medium ${doctor.availability.includes(d) ? 'bg-teal-100 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-400'}`}>
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          {doctor.status === 'pending' && onApprove && (
            <button onClick={() => { onApprove(); onClose(); }} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <CheckCircle size={16} /> Approve Doctor
            </button>
          )}
          {doctor.status === 'active' && onSuspend && (
            <button onClick={() => { onSuspend(); onClose(); }} className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
              Suspend Doctor
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ClinicDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>(mockDoctors);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSpec, setFilterSpec] = useState('All Specialties');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = doctors.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchSpec = filterSpec === 'All Specialties' || d.specialty === filterSpec;
    return matchSearch && matchStatus && matchSpec;
  });

  const counts = {
    all: doctors.length,
    active: doctors.filter(d => d.status === 'active').length,
    pending: doctors.filter(d => d.status === 'pending').length,
  };

  function handleAdd(data: Partial<Doctor>) {
    const newDoc: Doctor = {
      id: Date.now().toString(),
      name: data.name || '',
      specialty: data.specialty || '',
      dhaLicense: data.dhaLicense || '',
      phone: data.phone || '',
      email: data.email || '',
      status: 'pending',
      initials: (data.name || 'DR').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      gradient: 'from-slate-600 to-slate-700',
      joinedDate: 'Pending',
      todayAppts: 0, totalAppts: 0, rating: 0,
      consultationFee: Number(data.consultationFee) || 0,
      availability: [],
    };
    setDoctors(prev => [newDoc, ...prev]);
  }

  function handleApprove(id: string) {
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, status: 'active', joinedDate: 'May 2026' } : d));
  }

  function handleSuspend(id: string) {
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, status: 'suspended' } : d));
  }

  function handleDelete(id: string) {
    setDoctors(prev => prev.filter(d => d.id !== id));
    setMenuOpen(null);
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Doctors</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage your clinic's medical staff</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Doctor
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Doctors', value: doctors.length, icon: Stethoscope, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Active', value: counts.active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Approval', value: counts.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Today on Duty', value: doctors.filter(d => d.todayAppts > 0).length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or specialty…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {[['all', `All (${counts.all})`], ['active', `Active (${counts.active})`], ['pending', `Pending (${counts.pending})`]].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterStatus === v ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >{label}</button>
          ))}
        </div>
        <select
          value={filterSpec}
          onChange={e => setFilterSpec(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          {specialties.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Pending banner */}
      {counts.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-amber-800 text-sm">{counts.pending} doctor{counts.pending > 1 ? 's' : ''} pending approval</span>
            <span className="text-amber-700 text-sm"> — Review their DHA licenses before activating.</span>
          </div>
        </div>
      )}

      {/* Doctor table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Doctor', 'Specialty', 'DHA License', 'Today', 'Total Appts', 'Fee (AED)', 'Rating', 'Status', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${d.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {d.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{d.name}</div>
                      <div className="text-xs text-slate-400">Joined {d.joinedDate}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{d.specialty}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-600">{d.dhaLicense}</td>
                <td className="px-5 py-4 font-bold text-sm text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{d.todayAppts}</td>
                <td className="px-5 py-4 font-bold text-sm text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{d.totalAppts}</td>
                <td className="px-5 py-4 font-bold text-sm text-teal-700" style={{ fontFamily: 'DM Mono, monospace' }}>{d.consultationFee}</td>
                <td className="px-5 py-4">
                  {d.rating > 0 ? (
                    <span className="flex items-center gap-1 text-sm text-amber-600 font-medium"><Star size={12} fill="currentColor" />{d.rating}</span>
                  ) : <span className="text-slate-300 text-sm">—</span>}
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[d.status].color}`}>{statusConfig[d.status].label}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelectedDoctor(d)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="View profile">
                      <Eye size={15} className="text-slate-400 hover:text-teal-600" />
                    </button>
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === d.id ? null : d.id)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical size={15} className="text-slate-400" />
                      </button>
                      {menuOpen === d.id && (
                        <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 w-44 py-1">
                          {d.status === 'pending' && (
                            <button onClick={() => { handleApprove(d.id); setMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"><CheckCircle size={14} /> Approve</button>
                          )}
                          <button onClick={() => { setSelectedDoctor(d); setMenuOpen(null); }} className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={14} /> Edit Profile</button>
                          <button onClick={() => handleDelete(d.id)} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Stethoscope size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No doctors found matching your filters.</p>
          </div>
        )}
      </div>

      {showAdd && <AddDoctorModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {selectedDoctor && (
        <DoctorDetailDrawer
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onApprove={selectedDoctor.status === 'pending' ? () => handleApprove(selectedDoctor.id) : undefined}
          onSuspend={selectedDoctor.status === 'active' ? () => handleSuspend(selectedDoctor.id) : undefined}
        />
      )}
    </div>
  );
}
