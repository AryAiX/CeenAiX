import { CheckCircle, Download, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';
import { MOCK_NABIDH_ERRORS, MOCK_DATA_CATEGORIES, MOCK_CONSENT_RECORDS } from '../../types/compliance';
import { formatDistanceToNow, format } from 'date-fns';

export default function NABIDHStatusTab() {
  const recordsSent = 8923;
  const recordsReceived = 12441;
  const syncErrors = 3;
  const avgSyncTime = 1.2;
  const consentPercentage = 94.3;

  const getRetryStatusBadge = (status: string) => {
    switch (status) {
      case 'retrying':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 bg-opacity-20 border border-amber-600 rounded text-xs font-bold text-amber-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Retrying
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-600 bg-opacity-20 border border-rose-600 rounded text-xs font-bold text-rose-400">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 bg-opacity-20 border border-green-600 rounded text-xs font-bold text-green-400">
            <CheckCircle className="w-3 h-3" />
            Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-600 bg-opacity-20 border border-slate-600 rounded text-xs font-bold text-slate-400">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-green-900 to-green-800 border border-green-600 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
              <div className="text-green-800 font-bold text-sm">NABIDH</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <span className="text-2xl font-bold text-white">Connected</span>
              </div>
              <div className="text-sm text-green-200">
                Real-time synchronization active
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-200">Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <div className="text-xs font-bold text-slate-400 uppercase">Records Sent</div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {recordsSent.toLocaleString()}
          </div>
          <div className="text-xs text-green-400">Today</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <div className="text-xs font-bold text-slate-400 uppercase">Records Received</div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {recordsReceived.toLocaleString()}
          </div>
          <div className="text-xs text-green-400">Today</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <div className="text-xs font-bold text-slate-400 uppercase">Sync Errors</div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{syncErrors}</div>
          <div className="text-xs text-slate-400">Active</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <div className="text-xs font-bold text-slate-400 uppercase">Avg Sync Time</div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{avgSyncTime}</div>
          <div className="text-xs text-slate-400">seconds</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            Data Categories Sent Today
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40 relative">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {MOCK_DATA_CATEGORIES.map((category, idx) => {
                  const prevPercentage = MOCK_DATA_CATEGORIES.slice(0, idx).reduce(
                    (sum, c) => sum + c.percentage,
                    0
                  );
                  const circumference = 2 * Math.PI * 40;
                  const strokeDasharray = `${
                    (category.percentage / 100) * circumference
                  } ${circumference}`;
                  const strokeDashoffset = -(prevPercentage / 100) * circumference;

                  return (
                    <circle
                      key={category.name}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={category.color}
                      strokeWidth="20"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                    />
                  );
                })}
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              {MOCK_DATA_CATEGORIES.map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-sm text-white">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      {category.percentage}%
                    </div>
                    <div className="text-xs text-slate-400">
                      {category.count.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            Consent Tracking
          </h3>
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-green-400 mb-2">
              {consentPercentage}%
            </div>
            <div className="text-sm text-slate-400">
              Patients with NABIDH consent
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400">Total Enrolled Patients</span>
              <span className="text-white font-bold">15,847</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400">Consent Granted</span>
              <span className="text-green-400 font-bold">14,944</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Missing Consent</span>
              <span className="text-rose-400 font-bold">903</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase">Sync Error Log</h3>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded transition-colors">
              Manual Sync Trigger
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded transition-colors">
              <Download className="w-3.5 h-3.5" />
              Download Error Report
            </button>
          </div>
        </div>

        {MOCK_NABIDH_ERRORS.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <div className="text-sm text-slate-400">No sync errors at this time</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Patient ID
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Record Type
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Error Message
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Retry Status
                </th>
                <th className="text-right text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_NABIDH_ERRORS.map((error) => (
                <tr key={error.id} className="border-b border-slate-700">
                  <td className="px-3 py-3">
                    <span className="text-sm font-mono text-white font-bold">
                      {error.patientId}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-violet-400">{error.recordType}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-slate-300">{error.errorMessage}</span>
                  </td>
                  <td className="px-3 py-3">{getRetryStatusBadge(error.retryStatus)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-xs text-slate-500">
                      {formatDistanceToNow(error.timestamp, { addSuffix: true })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">
          Missing Consent Cases
        </h3>
        {MOCK_CONSENT_RECORDS.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <div className="text-sm text-slate-400">All patients have granted consent</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Patient ID
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Enrollment Date
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Consent Status
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Last Updated
                </th>
                <th className="text-right text-xs font-bold text-slate-400 uppercase px-3 py-2">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CONSENT_RECORDS.map((record) => (
                <tr key={record.patientId} className="border-b border-slate-700">
                  <td className="px-3 py-3">
                    <span className="text-sm font-mono text-white font-bold">
                      {record.patientId}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-slate-300">
                      {format(record.enrollmentDate, 'MMM dd, yyyy')}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-600 bg-opacity-20 border border-rose-600 rounded text-xs font-bold text-rose-400">
                      <AlertCircle className="w-3 h-3" />
                      Missing
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-slate-400">
                      {format(record.lastUpdated, 'MMM dd, yyyy')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded transition-colors">
                      Request Consent
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
