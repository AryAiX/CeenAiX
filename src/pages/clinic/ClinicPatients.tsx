import { useState } from 'react';
import { Search, Users, Phone, Mail, Calendar, Clock, ChevronRight } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  lastVisit: string;
  doctor: string;
  totalVisits: number;
  balance: number;
}

const mockPatients: Patient[] = [
  { id: '1', name: 'Ahmed Al Rashidi', phone: '+971 50 111 2233', email: 'ahmed@email.ae', dob: '12 Mar 1978', lastVisit: '28 May 2026', doctor: 'Dr. Fatima Hassan', totalVisits: 12, balance: 0 },
  { id: '2', name: 'Layla Al Mansoori', phone: '+971 55 222 3344', email: 'layla@email.ae', dob: '5 Jul 1992', lastVisit: '28 May 2026', doctor: 'Dr. Khalid Nasser', totalVisits: 8, balance: 400 },
  { id: '3', name: 'Omar Ibrahim', phone: '+971 54 333 4455', email: 'omar@email.ae', dob: '19 Nov 1985', lastVisit: '28 May 2026', doctor: 'Dr. Tooraj Helmi', totalVisits: 5, balance: 0 },
  { id: '4', name: 'Sara Khalid', phone: '+971 52 444 5566', email: 'sara@email.ae', dob: '3 Feb 1990', lastVisit: '28 May 2026', doctor: 'Dr. Fatima Hassan', totalVisits: 20, balance: 0 },
  { id: '5', name: 'Yousef Al Zahrani', phone: '+971 56 555 6677', email: 'yousef@email.ae', dob: '28 Sep 1975', lastVisit: '15 Apr 2026', doctor: 'Dr. Fatima Hassan', totalVisits: 7, balance: 800 },
  { id: '6', name: 'Noor Al Sayed', phone: '+971 58 666 7788', email: 'noor@email.ae', dob: '14 Jun 2001', lastVisit: '3 May 2026', doctor: 'Dr. Tooraj Helmi', totalVisits: 3, balance: 0 },
  { id: '7', name: 'Reem Al Hassan', phone: '+971 50 777 8899', email: 'reem@email.ae', dob: '22 Jan 1988', lastVisit: '10 May 2026', doctor: 'Dr. Aisha Al Mansoori', totalVisits: 15, balance: 0 },
  { id: '8', name: 'Bilal Farooq', phone: '+971 55 888 9900', email: 'bilal@email.ae', dob: '8 Aug 1983', lastVisit: '20 Apr 2026', doctor: 'Dr. Khalid Nasser', totalVisits: 6, balance: 300 },
];

export default function ClinicPatients() {
  const [search, setSearch] = useState('');
  const filtered = mockPatients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) ||
    p.doctor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Patients</h2>
          <p className="text-sm text-slate-500 mt-0.5">{mockPatients.length} registered patients</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Patients', value: mockPatients.length, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Visited This Month', value: 6, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Balances', value: mockPatients.filter(p => p.balance > 0).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients by name, phone, or doctor…" className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
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
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
