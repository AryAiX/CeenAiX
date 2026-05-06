import React, { useEffect, useState } from 'react';
import { Users, Stethoscope, Building2, Bot, CircleDollarSign, Activity } from 'lucide-react';

interface KpiCard {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  value: string;
  valueColor?: string;
  label: string;
  sub: string;
  subColor?: string;
  trend: string;
  trendColor: string;
  progress?: number;
  targetNum?: number;
  href: string;
}

const cards: KpiCard[] = [
  {
    icon: Users,
    iconColor: '#2DD4BF',
    iconBg: 'rgba(13,148,136,0.15)',
    value: '48,231',
    label: 'REGISTERED PATIENTS',
    sub: '31,847 active (30d)',
    trend: '↑ +12.4% this month',
    trendColor: '#34D399',
    targetNum: 48231,
    href: '/admin/patients',
  },
  {
    icon: Stethoscope,
    iconColor: '#60A5FA',
    iconBg: 'rgba(59,130,246,0.15)',
    value: '847',
    label: 'VERIFIED DOCTORS',
    sub: '23 pending DHA verification',
    subColor: '#FCD34D',
    trend: '↑ +8 this month',
    trendColor: '#34D399',
    targetNum: 847,
    href: '/admin/doctors',
  },
  {
    icon: Building2,
    iconColor: '#A78BFA',
    iconBg: 'rgba(124,58,237,0.15)',
    value: '34',
    label: 'CONNECTED ORGS',
    sub: '18 clinics · 4 hospitals · 8 pharma · 4 labs',
    trend: '↑ +4 this month',
    trendColor: '#34D399',
    targetNum: 34,
    href: '/admin/workspaces',
  },
  {
    icon: Bot,
    iconColor: '#C4B5FD',
    iconBg: 'rgba(124,58,237,0.15)',
    value: '8,921',
    valueColor: '#C4B5FD',
    label: 'AI CONSULTATIONS TODAY',
    sub: '127,450 this month · 1.24M all time',
    trend: '↑ +23.1% vs last month',
    trendColor: '#34D399',
    targetNum: 8921,
    href: '/admin/ai',
  },
  {
    icon: CircleDollarSign,
    iconColor: '#34D399',
    iconBg: 'rgba(5,150,105,0.15)',
    value: 'AED 847K',
    valueColor: '#34D399',
    label: 'PLATFORM REVENUE',
    sub: '33.9% of AED 2.5M target',
    subColor: '#FCD34D',
    trend: '↑ +AED 847K April to date',
    trendColor: '#34D399',
    progress: 33.9,
    href: '/admin/revenue',
  },
  {
    icon: Activity,
    iconColor: '#34D399',
    iconBg: 'rgba(5,150,105,0.15)',
    value: '99.97%',
    valueColor: '#34D399',
    label: 'PLATFORM UPTIME (30D)',
    sub: 'All systems operational ✅',
    trend: '0 incidents this month ✅',
    trendColor: '#34D399',
    href: '/admin/system/status',
  },
];

function useCountUp(target: number, duration = 800): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const steps = 40;
    const step = target / steps;
    const interval = duration / steps;
    let current = 0;
    const t = setInterval(() => {
      current += step;
      if (current >= target) {
        setVal(target);
        clearInterval(t);
      } else {
        setVal(Math.floor(current));
      }
    }, interval);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

const nav = (href: string) => {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const KpiCardDisplay: React.FC<{ card: KpiCard; idx: number }> = ({ card, idx }) => {
  const Icon = card.icon;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150 + idx * 60);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2 transition-all duration-300 cursor-pointer"
      style={{
        background: '#1E293B',
        border: '1px solid rgba(51,65,85,0.5)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
      }}
      onClick={() => nav(card.href)}
      onMouseEnter={e => { e.currentTarget.style.background = '#263548'; e.currentTarget.style.transform = 'scale(1.02)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#1E293B'; e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: card.iconBg }}
        >
          <Icon style={{ width: 18, height: 18, color: card.iconColor }} />
        </div>
        <div className="text-right ml-auto">
          <div
            className="font-bold leading-none"
            style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, color: card.valueColor || '#FFFFFF' }}
          >
            {card.value}
          </div>
        </div>
      </div>

      <div>
        <div className="uppercase tracking-widest mb-1" style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', color: '#94A3B8', letterSpacing: '0.1em' }}>
          {card.label}
        </div>
        <div style={{ fontSize: 11, color: card.subColor || '#64748B' }}>{card.sub}</div>
      </div>

      {card.progress != null && (
        <div>
          <div className="w-full h-1 rounded-full" style={{ background: 'rgba(51,65,85,0.8)' }}>
            <div
              className="h-1 rounded-full transition-all duration-700"
              style={{ width: `${card.progress}%`, background: '#059669' }}
            />
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: card.trendColor, fontFamily: 'DM Mono, monospace' }}>
        {card.trend}
      </div>
    </div>
  );
};

const HeroMetrics: React.FC = () => (
  <div className="grid grid-cols-6 gap-4 mb-5">
    {cards.map((card, i) => (
      <KpiCardDisplay key={card.label} card={card} idx={i} />
    ))}
  </div>
);

export default HeroMetrics;
