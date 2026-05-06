import { useState } from 'react';
import { Key, RefreshCw, Trash2, AlertTriangle, TrendingUp, CheckCircle, Play, CreditCard as Edit } from 'lucide-react';
import { MOCK_API_KEYS, MOCK_WEBHOOKS } from '../../types/systemHealth';
import { format } from 'date-fns';

export default function APIManagementTab() {
  const [selectedTab, setSelectedTab] = useState<'keys' | 'webhooks'>('keys');

  const usageData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    mediclinic: 8000 + Math.random() * 2000,
    aster: 2000 + Math.random() * 1000,
    unilabs: 6500 + Math.random() * 1500,
    healthhub: 4000 + Math.random() * 1000,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedTab('keys')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
            selectedTab === 'keys'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          API Keys
        </button>
        <button
          onClick={() => setSelectedTab('webhooks')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
            selectedTab === 'webhooks'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          Webhooks
        </button>
      </div>

      {selectedTab === 'keys' && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Total API Keys</div>
              <div className="text-3xl font-bold text-white">{MOCK_API_KEYS.length}</div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Total API Calls (30d)</div>
              <div className="text-3xl font-bold text-white">12.4M</div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Avg Response Time</div>
              <div className="text-3xl font-bold text-white">234ms</div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Error Rate</div>
              <div className="text-3xl font-bold text-green-400">0.12%</div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h3 className="text-sm font-bold text-white uppercase">API Usage by Organization (30d)</h3>
            </div>
            <div className="h-48 relative mb-4">
              <svg viewBox="0 0 600 200" className="w-full h-full">
                {['mediclinic', 'aster', 'unilabs', 'healthhub'].map((org, orgIdx) => {
                  const colors = ['#06b6d4', '#8b5cf6', '#14b8a6', '#f59e0b'];
                  const points = usageData.map((d, i) => {
                    const x = (i / (usageData.length - 1)) * 600;
                    const y = 200 - ((d[org as keyof typeof d] as number) / 10000) * 200;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <polyline
                      key={org}
                      points={points}
                      fill="none"
                      stroke={colors[orgIdx]}
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                <span className="text-xs text-slate-400">Mediclinic Dubai Mall</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-violet-500 rounded-full"></div>
                <span className="text-xs text-slate-400">Aster Pharmacy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                <span className="text-xs text-slate-400">Unilabs Dubai</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-xs text-slate-400">HealthHub AI</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase">API Keys</h3>
              <button className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded transition-colors">
                <Key className="w-3.5 h-3.5" />
                Generate New Key
              </button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">Organization</th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">API Key</th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">Scopes</th>
                  <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">Created</th>
                  <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">Last Used</th>
                  <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">Rate Limit</th>
                  <th className="text-right text-xs font-bold text-slate-400 uppercase px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_API_KEYS.map((key) => {
                  const usagePercent = (key.currentUsage / key.rateLimit) * 100;
                  const isNearLimit = usagePercent > 80;

                  return (
                    <tr
                      key={key.id}
                      className={`border-b border-slate-700 hover:bg-slate-900 transition-colors ${
                        isNearLimit ? 'bg-amber-900 bg-opacity-5' : ''
                      }`}
                    >
                      <td className="px-3 py-3">
                        <span className="text-sm font-bold text-white">{key.organizationName}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded">
                            {key.keyPrefix}
                          </code>
                          {isNearLimit && (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.slice(0, 2).map((scope) => (
                            <span
                              key={scope}
                              className="px-2 py-0.5 bg-violet-600 bg-opacity-20 text-violet-400 text-xs font-bold rounded"
                            >
                              {scope}
                            </span>
                          ))}
                          {key.scopes.length > 2 && (
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs font-bold rounded">
                              +{key.scopes.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs text-slate-400">
                          {format(key.createdDate, 'MMM dd, yyyy')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs text-slate-400">
                          {format(key.lastUsed, 'MMM dd, HH:mm')}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{key.currentUsage.toLocaleString()}</span>
                            <span className="text-slate-500">/ {key.rateLimit.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                usagePercent > 80
                                  ? 'bg-amber-500'
                                  : 'bg-teal-500'
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                            title="Rotate Key"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedTab === 'webhooks' && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Total Webhooks</div>
              <div className="text-3xl font-bold text-white">{MOCK_WEBHOOKS.length}</div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Active Webhooks</div>
              <div className="text-3xl font-bold text-green-400">
                {MOCK_WEBHOOKS.filter(w => w.isActive).length}
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Avg Success Rate</div>
              <div className="text-3xl font-bold text-white">
                {Math.round(
                  MOCK_WEBHOOKS.reduce((sum, w) => sum + w.deliverySuccessRate, 0) /
                    MOCK_WEBHOOKS.length
                )}%
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Deliveries (24h)</div>
              <div className="text-3xl font-bold text-white">1,247</div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase">Configured Webhooks</h3>
              <button className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded transition-colors">
                <Key className="w-3.5 h-3.5" />
                Create Webhook
              </button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">Organization</th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">URL</th>
                  <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">Events</th>
                  <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">Success Rate</th>
                  <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">Last Delivery</th>
                  <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">Status</th>
                  <th className="text-right text-xs font-bold text-slate-400 uppercase px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_WEBHOOKS.map((webhook) => (
                  <tr key={webhook.id} className="border-b border-slate-700 hover:bg-slate-900 transition-colors">
                    <td className="px-3 py-3">
                      <span className="text-sm font-bold text-white">{webhook.organizationName}</span>
                    </td>
                    <td className="px-3 py-3">
                      <code className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded block truncate max-w-xs">
                        {webhook.url}
                      </code>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event) => (
                          <span
                            key={event}
                            className="px-2 py-0.5 bg-teal-600 bg-opacity-20 text-teal-400 text-xs font-bold rounded"
                          >
                            {event}
                          </span>
                        ))}
                        {webhook.events.length > 2 && (
                          <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs font-bold rounded">
                            +{webhook.events.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              webhook.deliverySuccessRate >= 99
                                ? 'bg-green-500'
                                : webhook.deliverySuccessRate >= 95
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${webhook.deliverySuccessRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-white">
                          {webhook.deliverySuccessRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs text-slate-400">
                        {format(webhook.lastDelivery, 'MMM dd, HH:mm')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {webhook.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 bg-opacity-20 border border-green-600 rounded text-xs font-bold text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-600 bg-opacity-20 border border-slate-600 rounded text-xs font-bold text-slate-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          title="Test Webhook"
                        >
                          <Play className="w-3.5 h-3.5 text-teal-400" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          title="Edit Webhook"
                        >
                          <Edit className="w-3.5 h-3.5 text-violet-400" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          title="Delete Webhook"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
