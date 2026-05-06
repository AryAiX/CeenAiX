import { DollarSign, TrendingUp, RefreshCw, Users, Building2, AlertCircle } from 'lucide-react';
import { Currency, KPI, formatCurrency, formatNum } from '../../data/revenueData';
import { T, Card, DeltaBadge, Sparkline } from './primitives';

export function KpiStrip({ currency }: { currency: Currency }) {
  const cards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(KPI.totalRevenue.value, currency),
      delta: KPI.totalRevenue.delta,
      spark: KPI.totalRevenue.spark,
      icon: DollarSign,
      iconColor: T.teal,
    },
    {
      label: 'Net Revenue',
      value: formatCurrency(KPI.netRevenue.value, currency),
      delta: KPI.netRevenue.delta,
      spark: KPI.netRevenue.spark,
      icon: TrendingUp,
      iconColor: '#059669',
    },
    {
      label: 'MRR',
      value: formatCurrency(KPI.mrr.value, currency),
      sub: `ARR ${formatCurrency(KPI.mrr.arr, currency)}`,
      delta: KPI.mrr.delta,
      spark: KPI.mrr.spark,
      icon: RefreshCw,
      iconColor: T.cyan,
    },
    {
      label: 'ARPU',
      value: formatCurrency(KPI.arpu.value, currency),
      delta: KPI.arpu.delta,
      spark: KPI.arpu.spark,
      icon: Users,
      iconColor: '#D97706',
    },
    {
      label: 'Active Workspaces',
      value: formatNum(KPI.activeWorkspaces.value),
      delta: KPI.activeWorkspaces.delta,
      spark: KPI.activeWorkspaces.spark,
      icon: Building2,
      iconColor: T.blue,
    },
    {
      label: 'Receivables',
      value: formatCurrency(KPI.receivables.total, currency),
      delta: KPI.receivables.delta,
      spark: null,
      icon: AlertCircle,
      iconColor: '#DC2626',
      receivables: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="p-4 flex flex-col gap-2">
            {/* top row: icon + sparkline */}
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${c.iconColor}1A` }}>
                <Icon size={14} style={{ color: c.iconColor }} />
              </div>
              {c.spark && <Sparkline data={c.spark} color={c.iconColor} />}
            </div>

            {/* label */}
            <div className="text-[10px] leading-tight" style={{ color: T.text3, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {c.label}
            </div>

            {/* value */}
            <div className="text-base font-semibold leading-tight" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {c.value}
            </div>

            {/* sub (ARR) */}
            {c.sub && (
              <div className="text-[9px]" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>{c.sub}</div>
            )}

            {/* delta */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <DeltaBadge delta={c.delta} size="xs" />
              <span className="text-[9px]" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>vs prev period</span>
            </div>

            {/* receivables stacked bar */}
            {c.receivables && (
              <div className="flex h-1.5 rounded-full overflow-hidden gap-px" aria-label="Receivables aging">
                {KPI.receivables.buckets.map(b => (
                  <div
                    key={b.label}
                    title={`${b.label}: ${formatCurrency(b.value, currency)}`}
                    style={{ flex: b.value, background: b.color }}
                  />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
