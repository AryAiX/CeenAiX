import { useState, useEffect } from 'react';
import { Building2, Users, FileText, CircleDollarSign, AlertTriangle, Activity } from 'lucide-react';
import { PLATFORM_TOTALS } from '../../data/adminInsuranceData';

function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(Math.floor(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

interface InsuranceKpiStripProps {
  onTabChange?: (tab: string) => void;
}

export default function InsuranceKpiStrip({ onTabChange }: InsuranceKpiStripProps) {
  const members = useCountUp(PLATFORM_TOTALS.totalMembers);
  const claims = useCountUp(PLATFORM_TOTALS.claimsToday);
  const fraud = useCountUp(PLATFORM_TOTALS.fraudAlertsOpen);

  const cards = [
    {
      icon: <Building2 style={{ width: 18, height: 18 }} />,
      iconBg: 'rgba(13,148,136,0.15)',
      iconColor: '#2DD4BF',
      value: '7',
      label: 'ACTIVE INSURERS',
      sub: '2 premium · 5 standard',
      trend: '↑ +1 this year (GIG Gulf)',
      trendColor: '#34D399',
      pulse: false,
    },
    {
      icon: <Users style={{ width: 18, height: 18 }} />,
      iconBg: 'rgba(37,99,235,0.15)',
      iconColor: '#60A5FA',
      value: members.toLocaleString(),
      label: 'INSURED MEMBERS',
      sub: '60.2% of all platform patients',
      trend: '↑ +2,847 this month',
      trendColor: '#34D399',
      pulse: false,
      color: '#93C5FD',
    },
    {
      icon: <FileText style={{ width: 18, height: 18 }} />,
      iconBg: 'rgba(16,185,129,0.15)',
      iconColor: '#34D399',
      value: claims.toLocaleString(),
      label: 'CLAIMS TODAY',
      sub: `AED ${(PLATFORM_TOTALS.claimsValueToday / 1000000).toFixed(2)}M total value`,
      trend: '80.7% auto-approved',
      trendColor: '#34D399',
      pulse: false,
      subColor: '#6EE7B7',
    },
    {
      icon: <CircleDollarSign style={{ width: 18, height: 18 }} />,
      iconBg: 'rgba(16,185,129,0.15)',
      iconColor: '#34D399',
      value: 'AED 297K',
      label: 'INSURANCE REVENUE/MONTH',
      sub: 'From API + data services · all 7 insurers',
      trend: '↑ +18.4% vs Jan 2026',
      trendColor: '#34D399',
      pulse: false,
      color: '#6EE7B7',
    },
    {
      icon: <AlertTriangle style={{ width: 18, height: 18 }} />,
      iconBg: 'rgba(234,88,12,0.15)',
      iconColor: '#FB923C',
      value: fraud.toString(),
      label: 'OPEN FRAUD ALERTS',
      sub: `${PLATFORM_TOTALS.fraudHigh} HIGH · ${PLATFORM_TOTALS.fraudMedium} MEDIUM · ${PLATFORM_TOTALS.fraudLow} LOW`,
      trend: null,
      subColor: '#FB923C',
      pulse: true,
      pulseBorder: 'rgba(234,88,12,0.4)',
      onClick: () => onTabChange?.('fraud'),
    },
    {
      icon: <Activity style={{ width: 18, height: 18 }} />,
      iconBg: 'rgba(245,158,11,0.15)',
      iconColor: '#FCD34D',
      value: '6/7 ✅',
      label: 'APIs HEALTHY',
      sub: '⚠️ Daman degraded (3.2s)',
      trend: null,
      subColor: '#FCD34D',
      pulse: true,
      pulseBorder: 'rgba(245,158,11,0.4)',
      onClick: () => onTabChange?.('api'),
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-4 mb-6">
      {cards.map((card, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 cursor-pointer transition-all"
          style={{
            background: '#1E293B',
            border: card.pulse ? `1px solid ${card.pulseBorder}` : '1px solid #334155',
            animation: card.pulse ? 'pulse 2s infinite' : undefined,
          }}
          onClick={card.onClick}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#263347'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#1E293B'}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: card.iconBg, color: card.iconColor }}
            >
              {card.icon}
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: card.color || '#F1F5F9', lineHeight: 1 }}>
            {card.value}
          </div>
          <div style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
            {card.label}
          </div>
          <div style={{ fontSize: 11, fontFamily: card.subColor ? 'DM Mono, monospace' : 'Inter, sans-serif', color: card.subColor || '#64748B', marginTop: 4 }}>
            {card.sub}
          </div>
          {card.trend && (
            <div style={{ fontSize: 11, color: card.trendColor, fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
              {card.trend}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
