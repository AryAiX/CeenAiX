import { useEffect, useState } from 'react';
import { Stethoscope, Clock, Activity, AlertTriangle, CircleDollarSign, Star } from 'lucide-react';

interface DoctorKpiStripProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
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
    id: 'verified',
    icon: Stethoscope, iconColor: '#2DD4BF', iconBg: 'rgba(13,148,136,0.15)',
    value: 847, label: 'VERIFIED DOCTORS', sub: '↑ +8 this month', subColor: '#34D399',
    valueColor: '#F1F5F9', format: (v: number) => v.toLocaleString(),
  },
  {
    id: 'pending',
    icon: Clock, iconColor: '#FCD34D', iconBg: 'rgba(180,83,9,0.15)',
    value: 23, label: 'PENDING VERIFICATION', sub: '4 new today · 2 flagged', subColor: '#FCD34D',
    valueColor: '#FDE68A', format: (v: number) => v.toLocaleString(),
    pulse: true,
  },
  {
    id: 'active',
    icon: Activity, iconColor: '#34D399', iconBg: 'rgba(5,150,105,0.15)',
    value: 234, label: 'ACTIVE NOW', sub: 'In sessions · 1,247 platform-wide', subColor: '#94A3B8',
    valueColor: '#6EE7B7', format: (v: number) => v.toLocaleString(),
  },
  {
    id: 'alerts',
    icon: AlertTriangle, iconColor: '#FB923C', iconBg: 'rgba(154,52,18,0.15)',
    value: 11, label: 'LICENSE ALERTS', sub: '3 critical · 8 upcoming · 1 expired', subColor: '#FB923C',
    valueColor: '#FDBA74', format: (v: number) => v.toLocaleString(),
    pulse: true,
  },
  {
    id: 'revenue',
    icon: CircleDollarSign, iconColor: '#34D399', iconBg: 'rgba(5,150,105,0.15)',
    value: 39900, label: 'PLATFORM FEES (MTD)', sub: 'From 847 doctors · 8% fee', subColor: '#94A3B8',
    valueColor: '#6EE7B7', format: (v: number) => `AED ${(v / 1000).toFixed(1)}K`,
  },
  {
    id: 'rating',
    icon: Star, iconColor: '#FCD34D', iconBg: 'rgba(180,83,9,0.15)',
    value: 47, label: 'AVG DOCTOR RATING', sub: 'From 12,847 verified reviews', subColor: '#94A3B8',
    valueColor: '#FDE68A', format: (v: number) => `${(v / 10).toFixed(1)}★`,
  },
];

export default function DoctorKpiStrip({ onTabChange, activeTab }: DoctorKpiStripProps) {
  const vals = kpis.map(k => useCountUp(k.value));

  const tabMap: Record<string, string> = {
    verified: 'all', pending: 'pending', alerts: 'alerts', active: 'all',
  };

  return (
    <div className="grid grid-cols-6 gap-4 mb-5">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        const targetTab = tabMap[kpi.id];
        const isClickable = !!targetTab;
        const isActive = targetTab && activeTab === targetTab;
        return (
          <button
            key={kpi.id}
            onClick={() => isClickable && onTabChange(targetTab)}
            className="text-left rounded-2xl p-4 transition-all duration-200"
            style={{
              background: isActive ? 'rgba(13,148,136,0.1)' : '#1E293B',
              border: `1px solid ${isActive ? 'rgba(13,148,136,0.4)' : kpi.pulse ? 'rgba(251,146,60,0.3)' : 'rgba(51,65,85,0.5)'}`,
              cursor: isClickable ? 'pointer' : 'default',
              animation: kpi.pulse ? 'none' : undefined,
            }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: kpi.iconBg }}>
                <Icon style={{ width: 16, height: 16, color: kpi.iconColor }} />
              </div>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 26, fontWeight: 700, color: kpi.valueColor, lineHeight: 1 }}>
                {kpi.format(vals[i])}
              </span>
            </div>
            <div className="uppercase tracking-widest mb-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#64748B', letterSpacing: '0.07em' }}>
              {kpi.label}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: kpi.subColor }}>
              {kpi.sub}
            </div>
          </button>
        );
      })}
    </div>
  );
}
