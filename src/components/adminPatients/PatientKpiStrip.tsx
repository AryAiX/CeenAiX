import { useEffect, useState } from 'react';
import { Users, Activity, UserPlus, Clock, AlertTriangle } from 'lucide-react';

interface PatientKpiStripProps {
  onFilterChange: (filter: string) => void;
  activeFilter: string;
}

function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

const kpis = [
  {
    id: 'all',
    icon: Users,
    iconColor: '#2DD4BF',
    iconBg: 'rgba(13,148,136,0.15)',
    value: 48231,
    label: 'TOTAL PATIENTS',
    sub: '↑ +12.4% vs last month',
    subColor: '#34D399',
    valueColor: '#F1F5F9',
  },
  {
    id: 'active',
    icon: Activity,
    iconColor: '#34D399',
    iconBg: 'rgba(5,150,105,0.15)',
    value: 31847,
    label: 'ACTIVE (30 DAYS)',
    sub: '65.9% of total',
    subColor: '#94A3B8',
    valueColor: '#6EE7B7',
  },
  {
    id: 'new',
    icon: UserPlus,
    iconColor: '#60A5FA',
    iconBg: 'rgba(37,99,235,0.15)',
    value: 1247,
    label: 'NEW THIS MONTH',
    sub: '↑ +12.4% vs March',
    subColor: '#34D399',
    valueColor: '#93C5FD',
  },
  {
    id: 'pending',
    icon: Clock,
    iconColor: '#FCD34D',
    iconBg: 'rgba(180,83,9,0.15)',
    value: 0,
    label: 'PENDING VERIFICATION',
    sub: 'All patients auto-verified ✅',
    subColor: '#34D399',
    valueColor: '#CBD5E1',
  },
  {
    id: 'flagged',
    icon: AlertTriangle,
    iconColor: '#FB923C',
    iconBg: 'rgba(154,52,18,0.15)',
    value: 7,
    label: 'FLAGGED / SUSPENDED',
    sub: '5 flagged · 2 suspended',
    subColor: '#94A3B8',
    valueColor: '#FDBA74',
  },
];

export default function PatientKpiStrip({ onFilterChange, activeFilter }: PatientKpiStripProps) {
  const vals = kpis.map(k => useCountUp(k.value));

  return (
    <div className="grid grid-cols-5 gap-4 mb-5">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        const isActive = activeFilter === kpi.id;
        return (
          <button
            key={kpi.id}
            onClick={() => onFilterChange(kpi.id === activeFilter ? 'all' : kpi.id)}
            className="text-left rounded-2xl p-5 transition-all duration-200"
            style={{
              background: isActive ? 'rgba(13,148,136,0.12)' : '#1E293B',
              border: isActive ? '1px solid rgba(13,148,136,0.4)' : '1px solid rgba(51,65,85,0.5)',
              cursor: 'pointer',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: kpi.iconBg }}
              >
                <Icon style={{ width: 17, height: 17, color: kpi.iconColor }} />
              </div>
              <span
                className="font-bold"
                style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, color: kpi.valueColor, lineHeight: 1 }}
              >
                {vals[i].toLocaleString()}
              </span>
            </div>
            <div
              className="uppercase tracking-widest mb-1"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#64748B', letterSpacing: '0.08em' }}
            >
              {kpi.label}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: kpi.subColor }}>
              {kpi.sub}
            </div>
          </button>
        );
      })}
    </div>
  );
}
