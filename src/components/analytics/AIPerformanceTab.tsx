import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import {
  MOCK_MODEL_METRICS,
  MOCK_FEATURE_USAGE,
  MOCK_SPECIALTY_PERFORMANCE,
  MOCK_BIAS_METRICS,
} from '../../types/analytics';

export default function AIPerformanceTab() {
  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-rose-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const alertAccuracy = 87.3;

  return (
    <div className="space-y-6">
      <div className="bg-violet-900 bg-opacity-20 border border-violet-600 rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              CeenAiX Clinical AI v3.2.1
            </h3>
            <div className="text-sm text-violet-300">Last updated 3 March 2026</div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            View Changelog
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {MOCK_MODEL_METRICS.map((metric) => (
          <div
            key={metric.name}
            className="bg-slate-800 border border-slate-700 rounded-lg p-5"
          >
            <div className="text-xs font-bold text-slate-400 uppercase mb-2">
              {metric.name}
            </div>
            <div className="flex items-end gap-3 mb-3">
              <div className="text-3xl font-bold text-white">
                {metric.value}
                <span className="text-lg text-slate-400 ml-1">{metric.unit}</span>
              </div>
              <div className="flex items-center gap-1 mb-1">
                {getTrendIcon(metric.trend)}
                <span
                  className={`text-sm font-bold ${
                    metric.trend === 'up'
                      ? 'text-green-400'
                      : metric.trend === 'down'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {Math.abs(metric.trendValue)}%
                </span>
              </div>
            </div>
            <div className="flex items-end gap-0.5 h-8">
              {metric.sparklineData.map((value, idx) => {
                const maxValue = Math.max(...metric.sparklineData);
                const height = (value / maxValue) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-violet-600 bg-opacity-40 rounded-sm"
                    style={{ height: `${height}%` }}
                  ></div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            AI Usage by Feature
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-48 h-48 relative">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {MOCK_FEATURE_USAGE.map((feature, idx) => {
                  const prevPercentage = MOCK_FEATURE_USAGE.slice(0, idx).reduce(
                    (sum, f) => sum + f.percentage,
                    0
                  );
                  const circumference = 2 * Math.PI * 40;
                  const strokeDasharray = `${
                    (feature.percentage / 100) * circumference
                  } ${circumference}`;
                  const strokeDashoffset = -(prevPercentage / 100) * circumference;

                  return (
                    <circle
                      key={feature.name}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={feature.color}
                      strokeWidth="20"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                    />
                  );
                })}
              </svg>
            </div>
            <div className="flex-1 space-y-3">
              {MOCK_FEATURE_USAGE.map((feature) => (
                <div key={feature.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: feature.color }}
                    ></div>
                    <span className="text-sm text-white">{feature.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      {feature.percentage}%
                    </div>
                    <div className="text-xs text-slate-400">
                      {feature.count.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            Alert Accuracy
          </h3>
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-violet-400 mb-2">
              {alertAccuracy}%
            </div>
            <div className="text-sm text-slate-400">
              AI-generated alerts resulting in clinician action
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400">Total Alerts Generated</span>
              <span className="text-white font-bold">12,847</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400">Clinician Actions Taken</span>
              <span className="text-white font-bold">11,216</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">False Alerts</span>
              <span className="text-rose-400 font-bold">1,631</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">
          Model Performance by Specialty
        </h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Specialty
              </th>
              <th className="text-right text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Interactions
              </th>
              <th className="text-right text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Accuracy
              </th>
              <th className="text-right text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Feedback Score
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SPECIALTY_PERFORMANCE.map((specialty) => (
              <tr key={specialty.specialty} className="border-b border-slate-700">
                <td className="px-3 py-3 text-sm text-white">{specialty.specialty}</td>
                <td className="px-3 py-3 text-sm text-right text-slate-300">
                  {specialty.interactions.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-sm text-right">
                  <span className="text-violet-400 font-bold">{specialty.accuracy}%</span>
                </td>
                <td className="px-3 py-3 text-sm text-right">
                  <span className="text-teal-400 font-bold">{specialty.feedbackScore}</span>
                  <span className="text-slate-500 text-xs ml-1">/5.0</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">
          Bias Monitoring
        </h3>
        <div className="text-xs text-slate-400 mb-4">
          Ensuring no demographic disparity in AI accuracy
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-3">Age Groups</div>
            <div className="space-y-2">
              {MOCK_BIAS_METRICS.filter((m) => m.category === 'Age').map((metric) => (
                <div key={metric.group}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white">{metric.group}</span>
                    <span className="text-violet-400 font-bold">{metric.accuracy}%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-600"
                      style={{ width: `${metric.accuracy}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-3">Gender</div>
            <div className="space-y-2">
              {MOCK_BIAS_METRICS.filter((m) => m.category === 'Gender').map((metric) => (
                <div key={metric.group}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white">{metric.group}</span>
                    <span className="text-violet-400 font-bold">{metric.accuracy}%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-600"
                      style={{ width: `${metric.accuracy}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-3">
              Nationality
            </div>
            <div className="space-y-2">
              {MOCK_BIAS_METRICS.filter((m) => m.category === 'Nationality').map(
                (metric) => (
                  <div key={metric.group}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white">{metric.group}</span>
                      <span className="text-violet-400 font-bold">{metric.accuracy}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-600"
                        style={{ width: `${metric.accuracy}%` }}
                      ></div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
