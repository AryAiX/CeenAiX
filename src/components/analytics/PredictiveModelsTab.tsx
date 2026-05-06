import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { MOCK_PREDICTIVE_MODELS, MOCK_RISK_PREDICTIONS } from '../../types/analytics';
import { format, formatDistanceToNow } from 'date-fns';

export default function PredictiveModelsTab() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 bg-opacity-20 border border-green-600 rounded text-xs font-bold text-green-400">
            <CheckCircle className="w-3 h-3" />
            DHA Approved
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 bg-opacity-20 border border-amber-600 rounded text-xs font-bold text-amber-400">
            <Clock className="w-3 h-3" />
            Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-600 bg-opacity-20 border border-slate-600 rounded text-xs font-bold text-slate-400">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'diabetes':
        return 'bg-violet-600';
      case 'hypertension':
        return 'bg-rose-600';
      case 'readmission':
        return 'bg-amber-600';
      case 'adherence':
        return 'bg-teal-600';
      case 'sepsis':
        return 'bg-red-600';
      default:
        return 'bg-slate-600';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 85) return 'text-rose-400';
    if (score >= 75) return 'text-amber-400';
    return 'text-teal-400';
  };

  return (
    <div className="space-y-6">
      <div className="bg-violet-900 bg-opacity-20 border border-violet-600 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-violet-300">
          <AlertTriangle className="w-4 h-4" />
          <span>
            All predictive models are DHA-approved and comply with UAE healthcare AI regulations.
            Models are retrained monthly with updated clinical data.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {MOCK_PREDICTIVE_MODELS.map((model) => (
          <div
            key={model.id}
            className="bg-slate-800 border border-slate-700 rounded-lg p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-2 h-2 rounded-full ${getCategoryColor(
                      model.category
                    )}`}
                  ></div>
                  <h3 className="text-base font-bold text-white">{model.name}</h3>
                </div>
                <div className="text-xs text-slate-400">{model.description}</div>
              </div>
              <button className="p-2 hover:bg-slate-700 rounded transition-colors">
                <RefreshCw className="w-4 h-4 text-violet-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-xs text-slate-500 mb-1">Training Data</div>
                <div className="text-sm font-bold text-white">
                  {model.trainingDataSize.toLocaleString()} samples
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Last Retrained</div>
                <div className="text-sm font-bold text-white">
                  {format(model.lastRetrained, 'MMM dd, yyyy')}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Validation AUC</div>
                <div className="text-sm font-bold text-violet-400">
                  {model.validationAuc.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Active Predictions</div>
                <div className="text-sm font-bold text-teal-400">
                  {model.activePredictionsToday.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
              {getStatusBadge(model.dhaApprovalStatus)}
              <button className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded transition-colors">
                Retrain Model
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase mb-1">
              High Risk Predictions Leaderboard
            </h3>
            <div className="text-xs text-slate-400">
              Top 10 patients requiring immediate attention (authorized access only)
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-400">Live Updates</span>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Rank
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Patient ID
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Risk Type
              </th>
              <th className="text-right text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Risk Score
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Recommended Action
              </th>
              <th className="text-right text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_RISK_PREDICTIONS.map((prediction, idx) => (
              <tr
                key={prediction.patientId}
                className="border-b border-slate-700 hover:bg-slate-900 transition-colors"
              >
                <td className="px-3 py-3">
                  <span className="text-sm font-bold text-slate-500">#{idx + 1}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm font-mono text-white font-bold">
                    {prediction.patientId}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-violet-400">{prediction.riskType}</span>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex-1 max-w-[100px] h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          prediction.riskScore >= 85
                            ? 'bg-rose-600'
                            : prediction.riskScore >= 75
                            ? 'bg-amber-600'
                            : 'bg-teal-600'
                        }`}
                        style={{ width: `${prediction.riskScore}%` }}
                      ></div>
                    </div>
                    <span
                      className={`text-sm font-bold ${getRiskColor(
                        prediction.riskScore
                      )}`}
                    >
                      {prediction.riskScore}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-slate-300">
                    {prediction.recommendedAction}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="text-xs text-slate-500">
                    {formatDistanceToNow(prediction.lastUpdated, { addSuffix: true })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-3">
            Model Performance Summary
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Average AUC Score</span>
              <span className="text-white font-bold">0.85</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Active Predictions</span>
              <span className="text-white font-bold">12,859</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">High Risk Alerts Today</span>
              <span className="text-rose-400 font-bold">47</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Models Approved</span>
              <span className="text-green-400 font-bold">4/5</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-3">
            Prediction Accuracy
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">True Positives</span>
              <span className="text-green-400 font-bold">87.3%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">False Positives</span>
              <span className="text-amber-400 font-bold">8.2%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">False Negatives</span>
              <span className="text-rose-400 font-bold">4.5%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Sensitivity</span>
              <span className="text-white font-bold">95.1%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-3">
            Clinical Impact
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Interventions Triggered</span>
              <span className="text-white font-bold">3,421</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Events Prevented</span>
              <span className="text-green-400 font-bold">2,847</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Early Detections</span>
              <span className="text-teal-400 font-bold">1,234</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Lives Saved (Est.)</span>
              <span className="text-violet-400 font-bold">234</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
