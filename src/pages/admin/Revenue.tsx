import { useEffect } from 'react';
import { Activity, Bot, CircleDollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import AdminShell, { useAdminContextValue, Card, PageHeader, KpiTile, formatAed, exportRowsToCsv, type AdminContext } from './AdminShell';
import type { AdminRevenueDay } from '../../types/database';


const RevenueBars = ({ revenueDaily }: { revenueDaily: AdminRevenueDay[] }) => {
  if (revenueDaily.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
        No revenue data available yet.
      </div>
    );
  }
  const max = Math.max(...revenueDaily.map((row) => Math.max(row.total_aed, row.target_aed)), 1);
  const avgDailyTarget = revenueDaily.reduce((s, r) => s + r.target_aed, 0) / revenueDaily.length;
  const cols = revenueDaily.length;
  return (
    <div>
      <div
        className="grid h-44 items-end gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {revenueDaily.map((row) => (
          <div key={row.day_label} className="flex flex-col items-center justify-end gap-1">
            <div className="flex h-full w-full items-end gap-1">
              <div
                className="flex-1 rounded-t-md bg-emerald-500"
                style={{ height: `${(row.total_aed / max) * 100}%` }}
                title={`Total ${formatAed(row.total_aed)}`}
              />
              <div
                className="flex-1 rounded-t-md bg-blue-500"
                style={{ height: `${(row.consults_aed / max) * 100}%` }}
                title={`Consults ${formatAed(row.consults_aed)}`}
              />
              <div
                className="flex-1 rounded-t-md bg-purple-500"
                style={{ height: `${(row.ai_aed / max) * 100}%` }}
                title={`AI ${formatAed(row.ai_aed)}`}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-500">{row.day_label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Total
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-blue-500" /> Consultations
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-purple-500" /> AI Services
        </span>
        <span className="ml-auto text-slate-500">Daily target {formatAed(avgDailyTarget)}</span>
      </div>
    </div>
  );
};

const RevenueView = ({ context }: { context: AdminContext }) => {
  const ctx = context.dashboard?.context;
  const series = context.dashboard?.revenueDaily ?? [];

  const currentMonthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform Revenue"
        subtitle={`${currentMonthLabel} · platform-wide revenue performance`}
      >
        <button
          type="button"
          onClick={() => context.refetchDashboard()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        <button
          type="button"
          disabled={series.length === 0}
          onClick={() =>
            exportRowsToCsv(
              series.map((r) => ({
                day_label: r.day_label,
                total_aed: r.total_aed,
                consults_aed: r.consults_aed,
                ai_aed: r.ai_aed,
                lab_aed: r.lab_aed,
                target_aed: r.target_aed,
              } satisfies Record<string, unknown>)),
              `revenue-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Export
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Today"
          value={formatAed(ctx?.revenue_today_aed ?? 0)}
          caption={`Target ${formatAed(ctx?.revenue_target_aed ?? 0)}`}
          icon={CircleDollarSign}
          iconTone="bg-emerald-50 text-emerald-600 ring-emerald-100"
        />
        <KpiTile
          label="MTD Change"
          value={`${ctx?.revenue_change_pct != null ? (ctx.revenue_change_pct >= 0 ? '+' : '') + ctx.revenue_change_pct.toFixed(1) : '—'}%`}
          caption="vs same period last month"
          icon={TrendingUp}
          iconTone="bg-teal-50 text-teal-600 ring-teal-100"
        />
        <KpiTile
          label="AI Revenue"
          value={formatAed(ctx?.ai_revenue_today_aed ?? 0)}
          caption={`Net margin ${formatAed(ctx?.ai_revenue_net_aed ?? 0)}`}
          icon={Bot}
          iconTone="bg-purple-50 text-purple-600 ring-purple-100"
        />
        <KpiTile
          label="Margin %"
          value={`${ctx?.ai_revenue_margin_pct?.toFixed(1) ?? '0.0'}%`}
          caption="AI services margin"
          icon={Activity}
          iconTone="bg-blue-50 text-blue-600 ring-blue-100"
        />
      </div>

      <Card>
        <h2 className="mb-4 font-['Plus_Jakarta_Sans'] text-lg font-bold">Daily Revenue Trend</h2>
        <RevenueBars revenueDaily={series} />
      </Card>
    </div>
  );
};


export const AdminRevenue = () => {
  const context = useAdminContextValue();
  useEffect(() => { document.title = 'Revenue · CeenAiX Admin'; }, []);
  return (
    <AdminShell page="revenue" context={context}>
      {context.loading && !context.metrics ? (
        <Card><div className="py-12 text-center text-slate-500">Loading...</div></Card>
      ) : <RevenueView context={context} />}
    </AdminShell>
  );
};
