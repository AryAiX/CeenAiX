import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { TrendingUp, Users, DollarSign, Calendar, ArrowUpRight } from 'lucide-react';

export default function ClinicAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState('Your Clinic');
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [activePatients, setActivePatients] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; value: number }[]>([]);
  const [doctorPerf, setDoctorPerf] = useState<{ name: string; specialty: string; appts: number; revenue: number; initials: string; gradient: string }[]>([]);
  const [serviceBreakdown, setServiceBreakdown] = useState<{ name: string; pct: number; color: string }[]>([]);
  const [monthlyRevenueTotal, setMonthlyRevenueTotal] = useState(0);

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
      const fId = memberData.facility_id;

      const { data: facilityData } = await supabase
        .from('facilities')
        .select('name')
        .eq('id', fId)
        .maybeSingle();
      setClinicName(facilityData?.name ?? 'Your Clinic');

      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, scheduled_at, status, type, chief_complaint')
        .eq('facility_id', fId)
        .eq('is_deleted', false);

      if (apptError) throw apptError;
      const appts = apptData ?? [];

      setTotalAppointments(appts.length);

      const now2 = new Date();
      const monthStart = new Date(now2.getFullYear(), now2.getMonth(), 1).toISOString();
      const monthEnd = new Date(now2.getFullYear(), now2.getMonth() + 1, 1).toISOString();

      const { data: invoiceData } = await supabase
        .from('patient_invoices')
        .select('amount, created_at')
        .eq('facility_id', fId)
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd);

      const revenueTotal = (invoiceData ?? []).reduce((sum, inv) => sum + Number(inv.amount), 0);
      setMonthlyRevenueTotal(revenueTotal);

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const recentPatients = new Set(
        appts
          .filter(a => new Date(a.scheduled_at) >= ninetyDaysAgo)
          .map(a => a.patient_id)
      );
      setActivePatients(recentPatients.size);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        return { month: monthNames[d.getMonth()], year: d.getFullYear(), value: 0 };
      });
      appts.forEach(a => {
        const d = new Date(a.scheduled_at);
        const idx = last6Months.findIndex(m => m.month === monthNames[d.getMonth()] && m.year === d.getFullYear());
        if (idx !== -1) last6Months[idx].value += 1;
      });
      setMonthlyRevenue(last6Months.map(m => ({ month: m.month, value: m.value })));

      const doctorIds = [...new Set(appts.map(a => a.doctor_id))];

      const { data: staffFeeData } = await supabase
        .from('facility_staff')
        .select('doctor_user_id, consultation_fee')
        .eq('facility_id', fId);

      const feeMap = new Map(
        (staffFeeData ?? []).map(s => [s.doctor_user_id, Number(s.consultation_fee) || 0])
      );

      const { data: doctorProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', doctorIds);
      const { data: doctorSpecData } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialization, consultation_fee')
        .in('user_id', doctorIds);

      const profileMap = new Map((doctorProfiles ?? []).map(p => [p.user_id, p.full_name]));
      const specMap = new Map((doctorSpecData ?? []).map(d => [d.user_id, d.specialization]));
      const baseFeeMap = new Map((doctorSpecData ?? []).map(d => [d.user_id, Number(d.consultation_fee) || 0]));

      const gradients = [
        'from-teal-600 to-blue-600',
        'from-blue-600 to-blue-700',
        'from-emerald-600 to-teal-600',
        'from-slate-600 to-slate-700',
        'from-amber-600 to-orange-600',
      ];

      const perfRows = doctorIds.map((did, idx) => {
        const name = profileMap.get(did) ?? 'Unknown Doctor';
        const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
        const doctorAppts = appts.filter(a => a.doctor_id === did);
        const completedAppts = doctorAppts.filter(a => a.status === 'completed');
        const fee = feeMap.get(did) ?? baseFeeMap.get(did) ?? 0;
        return {
          name,
          specialty: specMap.get(did) ?? 'General Practice',
          appts: doctorAppts.length,
          revenue: completedAppts.length * fee,
          initials,
          gradient: gradients[idx % gradients.length],
        };
      }).sort((a, b) => b.appts - a.appts);

      setDoctorPerf(perfRows);

      const typeCounts: Record<string, number> = {};
      appts.forEach(a => {
        const t = a.chief_complaint ?? a.type ?? 'Consultation';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      const total = appts.length || 1;
      const colors = ['bg-teal-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-slate-400'];
      const breakdown = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count], idx) => ({
          name,
          pct: Math.round((count / total) * 100),
          color: colors[idx % colors.length],
        }));
      setServiceBreakdown(breakdown);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.value), 1);
  const maxAppts = Math.max(...doctorPerf.map(d => d.appts), 1);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 h-64 bg-slate-100 rounded-2xl" />
          <div className="col-span-2 h-64 bg-slate-100 rounded-2xl" />
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => void fetchData()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      ) : null}

      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Analytics</h2>
        <p className="text-sm text-slate-500 mt-0.5">Performance overview for {clinicName}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Monthly Revenue', value: `AED ${monthlyRevenueTotal.toLocaleString()}`, sub: 'This month', icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Total Appointments', value: totalAppointments.toLocaleString(), sub: 'All-time', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Patients', value: activePatients.toLocaleString(), sub: 'Last 90 days', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg. Rating', value: '—', sub: 'Coming soon', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center`}><Icon size={20} className={k.color} /></div>
                <ArrowUpRight size={16} className="text-emerald-500" />
              </div>
              <div className="font-bold text-slate-900 text-2xl" style={{ fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{k.label}</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Appointment volume chart */}
        <div className="col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Monthly Appointments</div>
              <div className="text-xs text-slate-400 mt-0.5">Last 6 months</div>
            </div>
          </div>
          <div className="flex items-end gap-4 h-40">
            {monthlyRevenue.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-bold text-slate-700" style={{ fontFamily: 'DM Mono, monospace' }}>{m.value}</div>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-400 transition-all"
                  style={{ height: `${Math.max((m.value / maxRevenue) * 120, 4)}px` }}
                />
                <div className="text-xs text-slate-400">{m.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Service breakdown */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="font-bold text-slate-800 mb-5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Appointments by Type</div>
          {serviceBreakdown.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No data yet.</div>
          ) : (
            <div className="space-y-3">
              {serviceBreakdown.map(s => (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 truncate max-w-[140px]">{s.name}</span>
                    <span className="text-sm font-bold text-slate-800 shrink-0" style={{ fontFamily: 'DM Mono, monospace' }}>{s.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Doctor performance */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Doctor Performance</div>
        </div>
        {doctorPerf.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No doctor data yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Doctor', 'Specialty', 'Total Appointments', 'Revenue (AED)', 'Rating'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {doctorPerf.map(d => (
                <tr key={d.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${d.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>{d.initials}</div>
                      <span className="font-semibold text-slate-800 text-sm">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{d.specialty}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[120px] h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${(d.appts / maxAppts) * 100}%` }} />
                      </div>
                      <span className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{d.appts}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-teal-700 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{d.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-400 text-sm">—</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
