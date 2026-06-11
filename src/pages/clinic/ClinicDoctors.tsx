import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { createPortal } from 'react-dom';
import { Search, Plus, CheckCircle, Clock, AlertCircle, X, Save, Stethoscope, Phone, Mail, Calendar, Star, MoreVertical, Pencil as Edit2, Trash2, Eye } from 'lucide-react';

interface Doctor {
  id: string;
  doctorUserId: string;
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
  dhaVerified: boolean;
}

const gradients = [
  'from-teal-600 to-blue-600',
  'from-blue-600 to-blue-700',
  'from-emerald-600 to-teal-600',
  'from-slate-600 to-slate-700',
  'from-amber-600 to-amber-700',
  'from-rose-500 to-rose-600',
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
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSpec, setFilterSpec] = useState('All Specialties');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void fetchDoctors();
  }, [user?.id]);

  const fetchDoctors = async () => {
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

      // Get today's date range
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      // Fetch facility staff
      const { data: staffData, error: staffError } = await supabase
        .from('facility_staff')
        .select('id, doctor_user_id, is_available, is_active, invitation_status, consultation_fee, created_at')
        .eq('facility_id', fId);

      if (staffError) throw staffError;

      const doctorUserIds = (staffData ?? []).map(s => s.doctor_user_id).filter(Boolean);

      if (doctorUserIds.length === 0) {
        setDoctors([]);
        setLoading(false);
        return;
      }

      // Fetch user profiles
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, phone, email')
        .in('user_id', doctorUserIds);

      // Fetch doctor profiles
      const { data: doctorProfileData } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialization, license_number, dha_license_verified, consultation_fee')
        .in('user_id', doctorUserIds);

      // Fetch ratings
      const { data: ratingsData } = await supabase
        .from('doctor_ratings_summary')
        .select('doctor_id, average_rating, total_reviews')
        .in('doctor_id', doctorUserIds);

      // Fetch today's appointments
      const { data: todayApptData } = await supabase
        .from('appointments')
        .select('doctor_id')
        .eq('facility_id', fId)
        .gte('scheduled_at', todayStart)
        .lt('scheduled_at', todayEnd)
        .eq('is_deleted', false);

      // Fetch total appointments
      const { data: totalApptData } = await supabase
        .from('appointments')
        .select('doctor_id')
        .eq('facility_id', fId)
        .eq('is_deleted', false);

      // Build maps
      const profileMap = new Map((profileData ?? []).map(p => [p.user_id, p]));
      const doctorProfileMap = new Map((doctorProfileData ?? []).map(d => [d.user_id, d]));
      const ratingsMap = new Map((ratingsData ?? []).map(r => [r.doctor_id, r]));

      const todayApptCount = new Map<string, number>();
      (todayApptData ?? []).forEach(a => {
        todayApptCount.set(a.doctor_id, (todayApptCount.get(a.doctor_id) ?? 0) + 1);
      });

      const totalApptCount = new Map<string, number>();
      (totalApptData ?? []).forEach(a => {
        totalApptCount.set(a.doctor_id, (totalApptCount.get(a.doctor_id) ?? 0) + 1);
      });

      // Build doctor rows
      const doctorRows: Doctor[] = (staffData ?? []).map((staff, idx) => {
        const profile = profileMap.get(staff.doctor_user_id);
        const doctorProfile = doctorProfileMap.get(staff.doctor_user_id);
        const ratings = ratingsMap.get(staff.doctor_user_id);
        const fullName = profile?.full_name ?? 'Unknown Doctor';
        const nameParts = fullName.trim().split(' ').filter(Boolean);
        const initials = nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
          : (nameParts[0]?.[0] ?? 'D').toUpperCase();

        const status: Doctor['status'] = staff.invitation_status === 'accepted' && staff.is_active
          ? 'active'
          : staff.invitation_status === 'pending'
            ? 'pending'
            : 'inactive';

        const joinedDate = staff.created_at
          ? new Date(staff.created_at).toLocaleDateString('en-AE', { month: 'short', year: 'numeric' })
          : 'Unknown';

        return {
          id: staff.id,
          doctorUserId: staff.doctor_user_id,
          name: fullName,
          specialty: doctorProfile?.specialization ?? 'General Practice',
          dhaLicense: doctorProfile?.license_number ?? '—',
          phone: profile?.phone ?? '—',
          email: profile?.email ?? '—',
          status,
          initials,
          gradient: gradients[idx % gradients.length],
          joinedDate: status === 'pending' ? 'Pending' : joinedDate,
          todayAppts: todayApptCount.get(staff.doctor_user_id) ?? 0,
          totalAppts: totalApptCount.get(staff.doctor_user_id) ?? 0,
          rating: ratings?.average_rating ? Number(Number(ratings.average_rating).toFixed(1)) : 0,
          consultationFee: Number(staff.consultation_fee ?? doctorProfile?.consultation_fee ?? 0),
          availability: [],
          dhaVerified: doctorProfile?.dha_license_verified ?? false,
        };
      });

      setDoctors(doctorRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doctors.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => void fetchDoctors()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      </div>
    );
  }

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

  const handleAdd = async (data: Partial<Doctor>) => {
    if (!facilityId || !user?.id) return;
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('clinic_doctor_invitations')
        .insert({
          facility_id: facilityId,
          invited_by: user.id,
          email: data.email || '',
          full_name: data.name || '',
          status: 'pending',
          payload: {
            specialty: data.specialty || '',
            dha_license: data.dhaLicense || '',
            phone: data.phone || '',
            consultation_fee: Number(data.consultationFee) || 0,
          },
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const nameParts = (data.name || 'DR').split(' ').filter(Boolean);
      const initials = nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : (nameParts[0]?.[0] ?? 'D').toUpperCase();

      const newDoc: Doctor = {
        id: inserted.id,
        doctorUserId: '',
        name: data.name || '',
        specialty: data.specialty || '',
        dhaLicense: data.dhaLicense || '',
        phone: data.phone || '',
        email: data.email || '',
        status: 'pending',
        initials,
        gradient: 'from-slate-600 to-slate-700',
        joinedDate: 'Pending',
        todayAppts: 0,
        totalAppts: 0,
        rating: 0,
        consultationFee: Number(data.consultationFee) || 0,
        availability: [],
        dhaVerified: false,
      };
      setDoctors(prev => [newDoc, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add doctor.');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('facility_staff')
        .update({ is_active: true, is_available: true, invitation_status: 'accepted' })
        .eq('id', id);
      if (updateError) throw updateError;
      setDoctors(prev => prev.map(d => d.id === id ? {
        ...d,
        status: 'active',
        joinedDate: new Date().toLocaleDateString('en-AE', { month: 'short', year: 'numeric' }),
      } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve doctor.');
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('facility_staff')
        .update({ is_active: false, is_available: false })
        .eq('id', id);
      if (updateError) throw updateError;
      setDoctors(prev => prev.map(d => d.id === id ? { ...d, status: 'suspended' } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend doctor.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('facility_staff')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      setDoctors(prev => prev.filter(d => d.id !== id));
      setMenuOpen(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove doctor.');
    }
  };

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
