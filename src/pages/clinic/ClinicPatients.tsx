import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
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

export default function ClinicPatients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    void fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get facility_id
      const { data: memberData, error: memberError } = await supabase
        .from('clinic_portal_members')
        .select('facility_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.facility_id) throw new Error('No clinic facility found.');

      const facilityId = memberData.facility_id;

      // Get all appointments for this facility
      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .select('patient_id, doctor_id, scheduled_at, status')
        .eq('facility_id', facilityId)
        .eq('is_deleted', false);

      if (apptError) throw apptError;

      // Get unique patient IDs
      const patientIds = [...new Set((apptData ?? []).map(a => a.patient_id))];
      if (patientIds.length === 0) { setPatients([]); return; }

      // Get unique doctor IDs
      const doctorIds = [...new Set((apptData ?? []).map(a => a.doctor_id))];

      // Fetch patient profiles
      const { data: patientProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, phone, email, date_of_birth')
        .in('user_id', patientIds);

      // Fetch doctor profiles
      const { data: doctorProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', doctorIds);

      const doctorMap = new Map((doctorProfiles ?? []).map(d => [d.user_id, d.full_name]));

      // Build patient rows
      const rows: Patient[] = patientIds.map(pid => {
        const profile = (patientProfiles ?? []).find(p => p.user_id === pid);
        const patientAppts = (apptData ?? []).filter(a => a.patient_id === pid);
        const sorted = [...patientAppts].sort((a, b) =>
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

        return {
          id: pid,
          name: profile?.full_name ?? 'Unknown Patient',
          phone: profile?.phone ?? '—',
          email: profile?.email ?? '—',
          dob,
          lastVisit,
          doctor: doctorMap.get(primaryDoctorId) ? `Dr. ${doctorMap.get(primaryDoctorId)}` : '—',
          totalVisits: patientAppts.length,
          balance: 0,
        };
      });

      setPatients(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const visitedThisMonth = patients.filter(p => {
    const d = new Date(p.lastVisit);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) ||
    p.doctor.toLowerCase().includes(search.toLowerCase())
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-sm text-slate-400">
                  No patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
