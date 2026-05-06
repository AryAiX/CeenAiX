import { useState } from 'react';
import { Download, Play, Clock, ChevronRight, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, LineChart, Line } from 'recharts';

const SLA_DATA = [
  { service: 'Patient Portal', target: 99.95, thisMonth: 100.00, lastMonth: 99.98, tier: 'Enterprise', status: 'Met' },
  { service: 'Doctor Portal', target: 99.95, thisMonth: 100.00, lastMonth: 99.97, tier: 'Enterprise', status: 'Met' },
  { service: 'Insurance Portal', target: 99.90, thisMonth: 98.70, lastMonth: 99.94, tier: 'Enterprise', status: 'Breached' },
  { service: 'Pharmacy Portal', target: 99.90, thisMonth: 99.98, lastMonth: 99.99, tier: 'Growth', status: 'Met' },
  { service: 'NABIDH Gateway', target: 99.95, thisMonth: 99.96, lastMonth: 99.91, tier: 'Regulatory', status: 'Met' },
  { service: 'DHA Sheryan', target: 99.99, thisMonth: 100.00, lastMonth: 100.00, tier: 'Regulatory', status: 'Met' },
  { service: 'Auth & Identity', target: 99.99, thisMonth: 100.00, lastMonth: 100.00, tier: 'Enterprise', status: 'Met' },
];

const REPORT_TEMPLATES = [
  { name: 'Monthly Availability Report', desc: 'Service uptime, incidents, and SLA status for the month', lastRun: '2026-05-01', next: '2026-06-01', format: 'PDF', recipients: 3 },
  { name: 'Quarterly DHA Reliability Report', desc: 'DHA and NABIDH availability per regulatory requirements', lastRun: '2026-04-01', next: '2026-07-01', format: 'PDF', recipients: 2 },
  { name: 'Postmortem Digest', desc: 'All postmortems filed in the selected period', lastRun: '2026-05-01', next: '2026-06-01', format: 'PDF', recipients: 5 },
  { name: 'Per-customer SLA Statement', desc: 'Per-customer uptime with credit calculations', lastRun: '2026-05-01', next: '2026-06-01', format: 'PDF', recipients: 0 },
  { name: 'Change History Report', desc: 'Deploys, maintenance, and config changes', lastRun: '2026-04-30', next: '2026-05-31', format: 'CSV', recipients: 4 },
  { name: 'Annual Board Reliability Summary', desc: 'Year-over-year trends for executive review', lastRun: '2026-01-01', next: '2027-01-01', format: 'PDF', recipients: 8 },
];

function slaMonthlyData() {
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  return months.map((m, i) => ({
    month: m,
    patient: Math.max(99.5, 100 - Math.random() * 0.15),
    doctor: Math.max(99.5, 100 - Math.random() * 0.1),
    insurance: i === 6 ? 98.70 : Math.max(99.5, 100 - Math.random() * 0.2),
    nabidh: Math.max(99.8, 100 - Math.random() * 0.1),
  }));
}

const MONTHLY = slaMonthlyData();

const STATUS_COLORS: Record<string, string> = { Met: '#10B981', 'At risk': '#F59E0B', Breached: '#EF4444' };
const TIER_COLORS: Record<string, string> = { Enterprise: '#0D9488', Growth: '#0891B2', Regulatory: '#F59E0B' };

export default function SlaReportsTab() {
  const [activeSection, setActiveSection] = useState<'sla' | 'reports' | 'builder'>('sla');

  return (
    <div className="p-6 space-y-5">
      {/* Nav */}
      <div className="flex gap-2">
        {[{ id: 'sla', label: 'SLA Dashboards' }, { id: 'reports', label: 'Report Templates' }, { id: 'builder', label: 'Report Builder' }].map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id as typeof activeSection)} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: activeSection === s.id ? 'rgba(13,148,136,0.15)' : 'rgba(51,65,85,0.4)', color: activeSection === s.id ? '#0D9488' : '#64748B', border: `1px solid ${activeSection === s.id ? 'rgba(13,148,136,0.3)' : 'rgba(51,65,85,0.6)'}` }}>{s.label}</button>
        ))}
      </div>

      {activeSection === 'sla' && (
        <>
          {/* SLA table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
              <h3 className="font-bold" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Uptime SLA — Current Month</h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
              <div className="grid px-5 py-2" style={{ gridTemplateColumns: '1fr 80px 80px 80px 80px 80px' }}>
                {['Service', 'Tier', 'Target', 'This Month', 'Last Month', 'Status'].map(h => (
                  <span key={h} style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                ))}
              </div>
              {SLA_DATA.map((row, i) => {
                const statusColor = STATUS_COLORS[row.status];
                const tierColor = TIER_COLORS[row.tier] ?? '#64748B';
                return (
                  <div key={i} className="grid items-center px-5 py-3 gap-2 hover:bg-slate-700/10 transition-colors" style={{ gridTemplateColumns: '1fr 80px 80px 80px 80px 80px' }}>
                    <span style={{ fontSize: 12, color: '#CBD5E1' }}>{row.service}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold w-fit" style={{ background: `${tierColor}15`, color: tierColor }}>{row.tier}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{row.target}%</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: row.status === 'Breached' ? '#EF4444' : '#10B981', fontWeight: row.status === 'Breached' ? 700 : 400 }}>{row.thisMonth.toFixed(2)}%</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{row.lastMonth.toFixed(2)}%</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold w-fit" style={{ background: `${statusColor}15`, color: statusColor }}>{row.status}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SLA trend */}
          <div className="rounded-2xl p-5" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
            <h3 className="font-bold mb-4" style={{ fontSize: 13, color: '#CBD5E1', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Uptime Trend (7 months)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={MONTHLY}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis domain={[98, 100.1]} tick={{ fontSize: 9, fill: '#475569' }} unit="%" tickFormatter={v => v.toFixed(1)} />
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => `${v.toFixed(3)}%`} />
                <ReferenceLine y={99.95} stroke="#F59E0B50" strokeDasharray="4 4" label={{ value: 'SLA 99.95%', fill: '#F59E0B80', fontSize: 9 }} />
                <Line type="monotone" dataKey="patient" stroke="#0D9488" strokeWidth={1.5} dot={{ r: 3, fill: '#0D9488' }} name="Patient" />
                <Line type="monotone" dataKey="doctor" stroke="#0891B2" strokeWidth={1.5} dot={{ r: 3, fill: '#0891B2' }} name="Doctor" />
                <Line type="monotone" dataKey="insurance" stroke="#EF4444" strokeWidth={1.5} dot={{ r: 3, fill: '#EF4444' }} name="Insurance" />
                <Line type="monotone" dataKey="nabidh" stroke="#F59E0B" strokeWidth={1.5} dot={{ r: 3, fill: '#F59E0B' }} name="NABIDH" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeSection === 'reports' && (
        <div className="grid gap-3 md:grid-cols-2">
          {REPORT_TEMPLATES.map((r, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-bold" style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.name}</div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold flex-shrink-0" style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }}>{r.format}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>{r.desc}</div>
              <div className="flex items-center gap-3 mb-3">
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>Last: {r.lastRun}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>Next: {r.next}</span>
                {r.recipients > 0 && <span style={{ fontSize: 10, color: '#64748B' }}>{r.recipients} recipients</span>}
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(13,148,136,0.1)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.3)' }}>
                  <Play className="w-3 h-3" /> Run now
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8' }}>
                  <Download className="w-3 h-3" /> Download last
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8' }}>
                  <Clock className="w-3 h-3" /> Schedule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'builder' && (
        <div className="rounded-2xl p-6" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
          <h3 className="font-bold mb-6" style={{ fontSize: 15, color: '#E2E8F0', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Custom Report Builder</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {[
              { label: 'Dimensions', options: ['Service', 'Region', 'Customer Tier', 'Time', 'Portal'] },
              { label: 'Measures', options: ['Uptime', 'Latency', 'Error Rate', 'Incident Count', 'MTTD', 'MTTR'] },
            ].map(sec => (
              <div key={sec.label}>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 8 }}>{sec.label}</div>
                <div className="flex flex-wrap gap-2">
                  {sec.options.map(o => (
                    <button key={o} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8', border: '1px solid rgba(51,65,85,0.6)' }}>{o}</button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 8 }}>Date Range</div>
              <div className="flex gap-2">
                <input type="date" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: 'rgba(51,65,85,0.4)', color: '#CBD5E1', border: '1px solid rgba(51,65,85,0.6)' }} />
                <input type="date" className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: 'rgba(51,65,85,0.4)', color: '#CBD5E1', border: '1px solid rgba(51,65,85,0.6)' }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 8 }}>Visualization</div>
              <div className="flex gap-2">
                {['Table', 'Line Chart', 'Bar Chart', 'PDF'].map(v => (
                  <button key={v} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8', border: '1px solid rgba(51,65,85,0.6)' }}>{v}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(13,148,136,0.15)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.3)' }}>Generate Report</button>
            <button className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(51,65,85,0.4)', color: '#94A3B8' }}>Schedule</button>
          </div>
        </div>
      )}
    </div>
  );
}
