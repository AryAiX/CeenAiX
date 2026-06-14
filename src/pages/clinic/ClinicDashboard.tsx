import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, ArrowRight, Stethoscope, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  completed:    { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  in_progress:  { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500 animate-pulse' },
  confirmed:    { label: 'Confirmed',   color: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500' },
  scheduled:    { label: 'Scheduled',   color: 'bg-slate-50 text-slate-600 border-slate-200',       dot: 'bg-slate-400' },
  cancelled:    { label: 'Cancelled',   color: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500' },
};

interface TodayAppointment {
  id: string;
  time: string;
  patient: string;
  type: string;
  doctor: string;
  status: string;
}

interface DoctorRow {
  id: string;
  name: string;
  specialty: string;
  initials: string;
  appts: number;
  status: string;
}

interface DashboardData {
  todayApptCount: number;
  confirmedCount: number;
  pendingCount: number;
  activeDoctors: number;
  onDutyCount: number;
  pendingApproval: number;
  todayRevenue: number;
  monthlyRevenue: number;
  currentMonth: string;
  todayAppts: TodayAppointment[];
  doctors: DoctorRow[];
  statusBreakdown: { label: string; count: number; color: string }[];
  nabidhActive: boolean;
}

export default function ClinicDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayLabel = new Date().toLocaleDateString('en-AE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const currentMonthLabel = new Date().toLocaleDateString('en-AE', {
    month: 'short', year: 'numeric',
  });

  useEffect(() => {
    if (!user?.id) return;
    void fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      // Get clinic's facility_id
      const { data: memberData, error: memberError } = await supabase
        .from('clinic_portal_members')
        .select('facility_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.facility_id) throw new Error('No clinic facility found for this user.');

      const facilityId = memberData.facility_id;

      const { data: facilitySettings } = await supabase
        .from('facilities')
        .select('settings')
        .eq('id', facilityId)
        .maybeSingle();

      const nabidhActive = (facilitySettings?.settings as Record<string, boolean>)?.nabidh ?? false;

      // Today's appointments filtered by facility
      const { data: appts, error: apptsError } = await supabase
        .from('appointments')
        .select('id, status, scheduled_at, chief_complaint, patient_id, doctor_id')
        .eq('facility_id', facilityId)
        .gte('scheduled_at', todayStart)
        .lt('scheduled_at', todayEnd)
        .eq('is_deleted', false)
        .order('scheduled_at', { ascending: true });

      if (apptsError) throw apptsError;

      const todayApptCount = appts?.length ?? 0;
      const confirmedCount = appts?.filter(a => ['confirmed', 'completed', 'in_progress'].includes(a.status)).length ?? 0;
      const pendingCount = appts?.filter(a => a.status === 'scheduled').length ?? 0;

      // Status breakdown
      const statusBreakdown = [
        { label: 'Completed',   count: appts?.filter(a => a.status === 'completed').length ?? 0,   color: 'bg-emerald-500' },
        { label: 'In Progress', count: appts?.filter(a => a.status === 'in_progress').length ?? 0, color: 'bg-blue-500' },
        { label: 'Confirmed',   count: appts?.filter(a => a.status === 'confirmed').length ?? 0,   color: 'bg-teal-500' },
        { label: 'Scheduled',   count: appts?.filter(a => a.status === 'scheduled').length ?? 0,   color: 'bg-slate-300' },
      ];

      // Get patient and doctor names
      const patientIds = [...new Set((appts ?? []).map(a => a.patient_id))];
      const doctorIds = [...new Set((appts ?? []).map(a => a.doctor_id))];

      const { data: patientProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', patientIds);

      const { data: doctorProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', doctorIds);

      const patientMap = new Map((patientProfiles ?? []).map(p => [p.user_id, p.full_name]));
      const doctorMap = new Map((doctorProfiles ?? []).map(d => [d.user_id, d.full_name]));

      // Build today's schedule
      const todayApptRows: TodayAppointment[] = (appts ?? []).slice(0, 6).map(a => ({
        id: a.id,
        time: new Date(a.scheduled_at).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false }),
        patient: patientMap.get(a.patient_id) ?? 'Unknown Patient',
        type: a.chief_complaint ?? 'Consultation',
        doctor: doctorMap.get(a.doctor_id) ? `Dr. ${doctorMap.get(a.doctor_id)}` : 'Unknown Doctor',
        status: a.status,
      }));

      // Fetch facility staff
      const { data: facilityStaff, error: staffError } = await supabase
        .from('facility_staff')
        .select('id, doctor_user_id, is_available, is_active, consultation_fee, invitation_status')
        .eq('facility_id', facilityId)
        .eq('is_active', true);

      if (staffError) throw staffError;

      // Pending/invited doctors are always is_active=false, so query separately
      const { data: pendingStaff } = await supabase
        .from('facility_staff')
        .select('id, invitation_status')
        .eq('facility_id', facilityId)
        .in('invitation_status', ['pending', 'invited']);

      const doctorUserIds = (facilityStaff ?? []).map(s => s.doctor_user_id).filter(Boolean);

      // Get doctor names
      let doctorNameMap = new Map<string, string>();
      let doctorSpecMap = new Map<string, string>();

      if (doctorUserIds.length > 0) {
        const { data: nameRows } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', doctorUserIds);
        doctorNameMap = new Map((nameRows ?? []).map(d => [d.user_id, d.full_name ?? '']));

        const { data: specRows } = await supabase
          .from('doctor_profiles')
          .select('user_id, specialization')
          .in('user_id', doctorUserIds);
        doctorSpecMap = new Map((specRows ?? []).map(d => [d.user_id, d.specialization ?? '']));
      }

      const activeDoctors = facilityStaff?.length ?? 0;
      const onDutyCount = facilityStaff?.filter(d => d.is_available).length ?? 0;
      const pendingApproval = (pendingStaff ?? []).filter(d => d.invitation_status === 'pending').length;

      // Count appointments per doctor today
      const doctorApptCount = new Map<string, number>();
      (appts ?? []).forEach(a => {
        doctorApptCount.set(a.doctor_id, (doctorApptCount.get(a.doctor_id) ?? 0) + 1);
      });

      const doctorRows: DoctorRow[] = (facilityStaff ?? []).slice(0, 4).map(d => {
        const fullName = doctorNameMap.get(d.doctor_user_id) || 'Unknown Doctor';
        const nameParts = fullName.trim().split(' ').filter(Boolean);
        const initials = nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
          : (nameParts[0]?.[0] ?? 'D').toUpperCase();
        return {
          id: d.id,
          name: fullName,
          specialty: doctorSpecMap.get(d.doctor_user_id) || 'General Practice',
          initials,
          appts: doctorApptCount.get(d.doctor_user_id) ?? 0,
          status: d.is_available ? 'on-duty' : 'off-duty',
        };
      });

      // Revenue — calculated from facility_staff consultation_fee × completed appointments
      const feeMap = new Map<string, number>(
        (facilityStaff ?? []).map(s => [s.doctor_user_id, Number(s.consultation_fee) || 0])
      );

      const todayRevenue = (appts ?? [])
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + (feeMap.get(a.doctor_id) ?? 0), 0);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: monthAppts } = await supabase
        .from('appointments')
        .select('doctor_id, status')
        .eq('facility_id', facilityId)
        .eq('is_deleted', false)
        .eq('status', 'completed')
        .gte('scheduled_at', monthStart);

      const monthlyRevenue = (monthAppts ?? [])
        .reduce((sum, a) => sum + (feeMap.get(a.doctor_id) ?? 0), 0);

      setData({
        todayApptCount,
        confirmedCount,
        pendingCount,
        activeDoctors,
        onDutyCount,
        pendingApproval,
        todayRevenue,
        monthlyRevenue,
        currentMonth: currentMonthLabel,
        todayAppts: todayApptRows,
        doctors: doctorRows,
        statusBreakdown,
        nabidhActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 h-64 bg-slate-100 rounded-2xl" />
          <div className="col-span-2 h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => void fetchDashboard()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxRevenue = Math.max(...data.doctors.map(d => d.appts), 1);

  const kpis = [
    {
      label: "Today's Appointments",
      value: String(data.todayApptCount),
      sub: `${data.confirmedCount} confirmed · ${data.pendingCount} pending`,
      icon: Calendar,
      color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200',
      trend: `${data.confirmedCount} confirmed`,
    },
    {
      label: 'Active Doctors',
      value: String(data.activeDoctors),
      sub: `${data.pendingApproval} pending approval`,
      icon: Stethoscope,
      color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
      trend: `${data.onDutyCount} on duty today`,
    },
    {
      label: "Today's Revenue",
      value: `AED ${data.todayRevenue.toLocaleString()}`,
      sub: 'Across all services',
      icon: DollarSign,
      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',
      trend: 'Today',
    },
    {
      label: 'Monthly Revenue',
      value: `AED ${data.monthlyRevenue >= 1000 ? `${(data.monthlyRevenue / 1000).toFixed(0)}K` : data.monthlyRevenue.toLocaleString()}`,
      sub: data.currentMonth,
      icon: TrendingUp,
      color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
      trend: 'This month',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`bg-white rounded-2xl border ${k.border} p-5 shadow-sm`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}>
                  <Icon size={20} className={k.color} />
                </div>
                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">{k.trend}</span>
              </div>
              <div className="font-bold text-slate-900 text-xl" style={{ fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{k.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Today's appointments */}
        <div className="col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
                <Calendar size={16} className="text-teal-600" />
              </div>
              <div>
                <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Today's Schedule</div>
                <div className="text-xs text-slate-400">{todayLabel}</div>
              </div>
            </div>
            <button onClick={() => navigate('/clinic/appointments')} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {data.todayAppts.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-400">No appointments today.</div>
            ) : (
              data.todayAppts.map((a) => {
                const s = statusConfig[a.status] ?? statusConfig.scheduled;
                return (
                  <div key={a.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="w-14 text-center shrink-0">
                      <div className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{a.time}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">{a.patient}</div>
                      <div className="text-xs text-slate-400 truncate">{a.type} · {a.doctor}</div>
                    </div>
                    <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Doctors today */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Stethoscope size={16} className="text-blue-600" />
              </div>
              <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Doctors Today</div>
            </div>
            <button onClick={() => navigate('/clinic/doctors')} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
              Manage <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {data.doctors.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {d.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{d.name}</div>
                  <div className="text-xs text-slate-400">{d.specialty}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-700" style={{ fontFamily: 'DM Mono, monospace' }}>{d.appts} appts</div>
                  <div className={`text-[10px] font-medium mt-0.5 ${d.status === 'on-duty' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {d.status === 'on-duty' ? '● On duty' : '○ Off duty'}
                  </div>
                </div>
              </div>
            ))}
            {data.doctors.length === 0 && (
              <div className="text-center py-4 text-sm text-slate-400">No doctors found.</div>
            )}
          </div>

          {/* Appointments by doctor mini chart */}
          <div className="px-5 pb-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Appointments by Doctor</div>
            <div className="space-y-2">
              {data.doctors.filter(d => d.appts > 0).map(d => (
                <div key={d.id} className="flex items-center gap-2">
                  <div className="w-24 text-xs text-slate-500 truncate shrink-0">{d.name.split(' ').pop()}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                      style={{ width: `${(d.appts / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-700 shrink-0" style={{ fontFamily: 'DM Mono, monospace', minWidth: 40, textAlign: 'right' }}>
                    {d.appts} appts
                  </div>
                </div>
              ))}
              {data.doctors.filter(d => d.appts > 0).length === 0 && (
                <div className="text-xs text-slate-400">No appointments yet today.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Quick Actions</div>
          <div className="space-y-2">
            {[
              { label: 'Book New Appointment', icon: Calendar, color: 'bg-teal-600 hover:bg-teal-700', href: '/clinic/appointments' },
              { label: 'Add New Doctor', icon: Stethoscope, color: 'bg-blue-600 hover:bg-blue-700', href: '/clinic/doctors' },
              { label: 'Manage Pricing', icon: DollarSign, color: 'bg-emerald-600 hover:bg-emerald-700', href: '/clinic/pricing' },
              { label: 'View Analytics', icon: Activity, color: 'bg-slate-600 hover:bg-slate-700', href: '/clinic/analytics' },
            ].map(a => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => navigate(a.href)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 ${a.color} text-white rounded-xl text-sm font-medium transition-colors`}
                >
                  <Icon size={16} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alerts & Notices */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Alerts & Notices</div>
          <div className="space-y-3">
            {data.pendingApproval > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                <Clock size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Doctor Approval Pending</div>
                  <div className="text-xs text-slate-500 mt-0.5">{data.pendingApproval} doctor{data.pendingApproval > 1 ? 's' : ''} awaiting verification</div>
                </div>
              </div>
            ) : null}
            {data.todayApptCount === 0 ? (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">No Appointments Today</div>
                  <div className="text-xs text-slate-500 mt-0.5">Schedule is clear for today</div>
                </div>
              </div>
            ) : null}
            {data.nabidhActive && (
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
                <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">NABIDH Sync Active</div>
                  <div className="text-xs text-slate-500 mt-0.5">Records syncing automatically</div>
                </div>
              </div>
            )}
            {data.pendingApproval === 0 && data.todayApptCount > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-teal-50 rounded-xl">
                <CheckCircle size={16} className="text-teal-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">All Systems Operational</div>
                  <div className="text-xs text-slate-500 mt-0.5">{data.todayApptCount} appointments scheduled today</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Appointment status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Appointment Status</div>
          <div className="space-y-3">
            {data.statusBreakdown.map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">{s.label}</span>
                  <span className="text-sm font-bold text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{s.count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color}`}
                    style={{ width: `${data.todayApptCount > 0 ? (s.count / data.todayApptCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{data.todayApptCount}</span>
            <span className="text-sm text-slate-400 ml-2">total today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
