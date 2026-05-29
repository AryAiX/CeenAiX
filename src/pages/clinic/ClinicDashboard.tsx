import { Calendar, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, ArrowRight, Stethoscope, Activity } from 'lucide-react';

function navigate(href: string) {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const kpis = [
  { label: "Today's Appointments", value: '12', sub: '8 confirmed · 4 pending', icon: Calendar, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', trend: '+3 vs yesterday' },
  { label: 'Active Doctors', value: '8', sub: '2 pending approval', icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', trend: '6 on duty today' },
  { label: "Today's Revenue", value: 'AED 8,400', sub: 'Across all services', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', trend: '+18% vs last week' },
  { label: 'Monthly Revenue', value: 'AED 142K', sub: 'Apr 2026', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', trend: '+12% vs Mar' },
];

const todayAppts = [
  { time: '09:00', patient: 'Ahmed Al Rashidi', type: 'Cardiology Consultation', doctor: 'Dr. Fatima Hassan', status: 'completed', price: 800 },
  { time: '09:30', patient: 'Layla Al Mansoori', type: 'Follow-up Visit', doctor: 'Dr. Khalid Nasser', status: 'in-progress', price: 400 },
  { time: '10:00', patient: 'Omar Ibrahim', type: 'General Checkup', doctor: 'Dr. Tooraj Helmi', status: 'confirmed', price: 300 },
  { time: '10:30', patient: 'Sara Khalid', type: 'Diabetes Management', doctor: 'Dr. Fatima Hassan', status: 'confirmed', price: 600 },
  { time: '11:00', patient: 'Yousef Al Zahrani', type: 'Cardiology Consultation', doctor: 'Dr. Fatima Hassan', status: 'scheduled', price: 800 },
  { time: '11:30', patient: 'Noor Al Sayed', type: 'Lab Results Review', doctor: 'Dr. Tooraj Helmi', status: 'scheduled', price: 200 },
];

const doctors = [
  { name: 'Dr. Fatima Hassan', specialty: 'Cardiology', initials: 'FH', gradient: 'from-teal-600 to-blue-600', appts: 5, status: 'on-duty', revenue: 4000 },
  { name: 'Dr. Khalid Nasser', specialty: 'Internal Medicine', initials: 'KN', gradient: 'from-blue-600 to-blue-700', appts: 4, status: 'on-duty', revenue: 2800 },
  { name: 'Dr. Tooraj Helmi', specialty: 'General Practice', initials: 'TH', gradient: 'from-slate-600 to-slate-700', appts: 3, status: 'on-duty', revenue: 1600 },
  { name: 'Dr. Aisha Al Mansoori', specialty: 'Endocrinology', initials: 'AA', gradient: 'from-emerald-600 to-teal-600', appts: 0, status: 'off-duty', revenue: 0 },
];

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  completed:   { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500 animate-pulse' },
  confirmed:   { label: 'Confirmed',   color: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  scheduled:   { label: 'Scheduled',   color: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  cancelled:   { label: 'Cancelled',   color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

export default function ClinicDashboard() {
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
                <div className="text-xs text-slate-400">Thursday, 28 May 2026</div>
              </div>
            </div>
            <button onClick={() => navigate('/clinic/appointments')} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {todayAppts.map((a, i) => {
              const s = statusConfig[a.status];
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="w-14 text-center shrink-0">
                    <div className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{a.time}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm truncate">{a.patient}</div>
                    <div className="text-xs text-slate-400 truncate">{a.type} · {a.doctor}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-slate-700" style={{ fontFamily: 'DM Mono, monospace' }}>AED {a.price}</div>
                  </div>
                  <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Doctors on duty */}
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
            {doctors.map(d => (
              <div key={d.name} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${d.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
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
          </div>

          {/* Revenue by doctor mini chart */}
          <div className="px-5 pb-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Revenue by Doctor</div>
            <div className="space-y-2">
              {doctors.filter(d => d.revenue > 0).map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-24 text-xs text-slate-500 truncate shrink-0">{d.name.split(' ')[1]}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                      style={{ width: `${(d.revenue / 4000) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-700 shrink-0" style={{ fontFamily: 'DM Mono, monospace', minWidth: 60, textAlign: 'right' }}>
                    AED {d.revenue.toLocaleString()}
                  </div>
                </div>
              ))}
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

        {/* Recent alerts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Alerts & Notices</div>
          <div className="space-y-3">
            {[
              { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', title: 'DHA License Renewal', sub: 'Dr. Tooraj Helmi — expires in 14 days' },
              { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Doctor Approval Pending', sub: '2 doctors awaiting verification' },
              { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'NABIDH Sync Complete', sub: 'All records synced — 09:15 AM today' },
            ].map(a => {
              const Icon = a.icon;
              return (
                <div key={a.title} className={`flex items-start gap-3 p-3 ${a.bg} rounded-xl`}>
                  <Icon size={16} className={`${a.color} shrink-0 mt-0.5`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{a.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{a.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Appointment status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Appointment Status</div>
          <div className="space-y-3">
            {[
              { label: 'Completed', count: 2, total: 12, color: 'bg-emerald-500' },
              { label: 'In Progress', count: 1, total: 12, color: 'bg-blue-500' },
              { label: 'Confirmed', count: 5, total: 12, color: 'bg-teal-500' },
              { label: 'Scheduled', count: 4, total: 12, color: 'bg-slate-300' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">{s.label}</span>
                  <span className="text-sm font-bold text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{s.count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${(s.count / s.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>12</span>
            <span className="text-sm text-slate-400 ml-2">total today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
