import { useState } from 'react';
import InsuranceShell, {
  FraudAlertCard,
  KpiHostedCard,
  formatCurrency,
  formatNumber,
  useInsurancePageData,
} from './InsuranceShell';

export const InsuranceFraudDetection = () => {
  const { data, loading, error, openFraud, refetch } = useInsurancePageData();
  const alerts = data?.fraudAlerts ?? [];
  const high = alerts.filter((a) => a.severity === 'high' && a.status !== 'resolved').length;
  const medium = alerts.filter((a) => a.severity === 'medium' && a.status !== 'resolved').length;
  const low = alerts.filter((a) => a.severity === 'low' && a.status !== 'resolved').length;
  const exposure = openFraud.reduce((sum, a) => sum + a.exposureAmountAed, 0);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const filtered = severityFilter === 'all' ? alerts : alerts.filter((a) => a.severity === severityFilter);

  return (
    <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiHostedCard label="High Risk" value={loading ? '...' : formatNumber(high)} caption="Investigation required" tone="red" />
        <KpiHostedCard label="Medium Risk" value={loading ? '...' : formatNumber(medium)} caption="Watchlist" tone="amber" />
        <KpiHostedCard label="Low Risk" value={loading ? '...' : formatNumber(low)} caption="Monitored only" tone="blue" />
        <KpiHostedCard label="Total Exposure" value={loading ? '...' : formatCurrency(exposure)} caption="Open alert exposure" tone="violet" />
      </section>

      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Fraud Detection</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              AI flagged providers and claim patterns · {alerts.length} total alerts
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'high', 'medium', 'low'] as const).map((tone) => (
              <button
                key={tone}
                onClick={() => setSeverityFilter(tone)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize ${severityFilter === tone ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {tone === 'all' ? 'All' : tone}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 lg:grid-cols-2">
          {filtered.map((alert) => (
            <FraudAlertCard key={alert.id} alert={alert} />
          ))}
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No fraud alerts.
            </div>
          ) : null}
        </div>
      </article>
    </InsuranceShell>
  );
};

export default InsuranceFraudDetection;