import InsuranceShell, {
    KpiCard,
    SectionCard,
    formatCurrency,
    useInsurancePageData,
  } from './InsuranceShell';
  
  export const InsuranceRiskAnalytics = () => {
    const { data, error, refetch } = useInsurancePageData();
    const maxLossRatio = Math.max(...(data?.riskSegments.map((item) => item.lossRatioPercent) ?? [1]), 1);
    const savingsFound = data?.fraudAlerts.reduce((sum, alert) => sum + alert.exposureAmountAed, 0) ?? 0;
    const averageLossRatio = data?.riskSegments.length
      ? Math.round(
          data.riskSegments.reduce((sum, item) => sum + item.lossRatioPercent, 0) /
            data.riskSegments.length,
        )
      : 0;
  
    return (
      <InsuranceShell data={data} loadError={error ?? null} onRetry={() => void refetch()}>
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <SectionCard title="Risk Analytics" subtitle="Plan utilization and cost trend signals">
            <div className="space-y-4">
              {(data?.riskSegments ?? []).map((segment) => (
                <div key={segment.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-slate-600">{segment.segmentName}</span>
                    <span className="font-mono text-slate-500">{segment.utilizationPercent}% utilization</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-[#1E3A5F]"
                      style={{ width: `${Math.min(100, (segment.lossRatioPercent / maxLossRatio) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{segment.forecastNote}</div>
                </div>
              ))}
            </div>
          </SectionCard>
  
          <SectionCard title="Loss Ratio Forecast" subtitle="Reporting window (live workspace)">
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="Medical loss"
                value={`${averageLossRatio}%`}
                helper="Average risk segment loss ratio"
                tone="amber"
              />
              <KpiCard
                label="Savings found"
                value={formatCurrency(savingsFound)}
                helper="Open fraud alert exposure"
                tone="emerald"
              />
            </div>
          </SectionCard>
        </section>
      </InsuranceShell>
    );
  };
  
  export default InsuranceRiskAnalytics;