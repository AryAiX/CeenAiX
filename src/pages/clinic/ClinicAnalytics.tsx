import { TrendingUp, Users, DollarSign, Calendar, ArrowUpRight } from 'lucide-react';

const monthlyRevenue = [
  { month: 'Nov', value: 98 }, { month: 'Dec', value: 112 }, { month: 'Jan', value: 105 },
  { month: 'Feb', value: 118 }, { month: 'Mar', value: 126 }, { month: 'Apr', value: 142 },
];
const maxRevenue = Math.max(...monthlyRevenue.map(m => m.value));

const doctorPerf = [
  { name: 'Dr. Fatima Hassan', specialty: 'Cardiology', appts: 312, revenue: 249600, rating: 4.9, initials: 'FH', gradient: 'from-teal-600 to-blue-600' },
  { name: 'Dr. Khalid Nasser', specialty: 'Internal Medicine', appts: 218, revenue: 130800, rating: 4.7, initials: 'KN', gradient: 'from-blue-600 to-blue-700' },
  { name: 'Dr. Aisha Al Mansoori', specialty: 'Endocrinology', appts: 134, revenue: 93800, rating: 4.8, initials: 'AA', gradient: 'from-emerald-600 to-teal-600' },
  { name: 'Dr. Tooraj Helmi', specialty: 'General Practice', appts: 487, revenue: 146100, rating: 4.6, initials: 'TH', gradient: 'from-slate-600 to-slate-700' },
];
const maxAppts = Math.max(...doctorPerf.map(d => d.appts));

const serviceBreakdown = [
  { name: 'Consultations', pct: 48, color: 'bg-teal-500' },
  { name: 'Follow-ups', pct: 28, color: 'bg-blue-500' },
  { name: 'Procedures', pct: 12, color: 'bg-amber-500' },
  { name: 'Telemedicine', pct: 8, color: 'bg-emerald-500' },
  { name: 'Packages', pct: 4, color: 'bg-slate-400' },
];

export default function ClinicAnalytics() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Analytics</h2>
        <p className="text-sm text-slate-500 mt-0.5">Performance overview for Al Noor Medical Center</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Monthly Revenue', value: 'AED 142K', sub: '+12% vs Mar', icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50', trend: true },
          { label: 'Total Appointments', value: '1,151', sub: 'All-time', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', trend: true },
          { label: 'Active Patients', value: '384', sub: 'Last 90 days', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: true },
          { label: 'Avg. Rating', value: '4.75', sub: 'Across all doctors', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', trend: true },
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
        {/* Revenue chart */}
        <div className="col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Monthly Revenue</div>
              <div className="text-xs text-slate-400 mt-0.5">Nov 2025 – Apr 2026</div>
            </div>
            <div className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">+18% YoY</div>
          </div>
          <div className="flex items-end gap-4 h-40">
            {monthlyRevenue.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-bold text-slate-700" style={{ fontFamily: 'DM Mono, monospace' }}>{m.value}K</div>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-400 transition-all"
                  style={{ height: `${(m.value / maxRevenue) * 120}px` }}
                />
                <div className="text-xs text-slate-400">{m.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Service breakdown */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="font-bold text-slate-800 mb-5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Revenue by Service</div>
          <div className="space-y-3">
            {serviceBreakdown.map(s => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">{s.name}</span>
                  <span className="text-sm font-bold text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{s.pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Doctor performance */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Doctor Performance</div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Doctor', 'Specialty', 'Total Appointments', 'Revenue (AED)', 'Rating'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {doctorPerf.sort((a, b) => b.revenue - a.revenue).map(d => (
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
                  <span className="flex items-center gap-1 text-amber-600 font-bold text-sm">★ {d.rating}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
