import { CheckCircle, XCircle, AlertCircle, ArrowRight, ArrowLeft, ArrowLeftRight, PlayCircle, FileText, Settings } from 'lucide-react';
import { MOCK_INTEGRATIONS } from '../../types/systemHealth';
import { formatDistanceToNow } from 'date-fns';

export default function IntegrationsTab() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-400" />;
      case 'disconnected':
        return <AlertCircle className="w-5 h-5 text-slate-500" />;
      default:
        return null;
    }
  };

  const getDataFlowIcon = (flow: string) => {
    switch (flow) {
      case 'inbound':
        return <ArrowLeft className="w-4 h-4 text-violet-400" />;
      case 'outbound':
        return <ArrowRight className="w-4 h-4 text-teal-400" />;
      case 'bidirectional':
        return <ArrowLeftRight className="w-4 h-4 text-blue-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 bg-opacity-20 border border-green-600 rounded text-xs font-bold text-green-400">
            <CheckCircle className="w-3 h-3" />
            Connected
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-600 bg-opacity-20 border border-rose-600 rounded text-xs font-bold text-rose-400">
            <XCircle className="w-3 h-3" />
            Error
          </span>
        );
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-600 bg-opacity-20 border border-slate-600 rounded text-xs font-bold text-slate-400">
            <AlertCircle className="w-3 h-3" />
            Disconnected
          </span>
        );
      default:
        return null;
    }
  };

  const connectedCount = MOCK_INTEGRATIONS.filter(i => i.status === 'connected').length;
  const errorCount = MOCK_INTEGRATIONS.filter(i => i.status === 'error').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Total Integrations</div>
          <div className="text-3xl font-bold text-white">{MOCK_INTEGRATIONS.length}</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Connected</div>
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-green-400">{connectedCount}</div>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Errors</div>
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold text-rose-400">{errorCount}</div>
            <XCircle className="w-5 h-5 text-rose-400" />
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Health Score</div>
          <div className="text-3xl font-bold text-white">
            {Math.round((connectedCount / MOCK_INTEGRATIONS.length) * 100)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {MOCK_INTEGRATIONS.map((integration) => (
          <div
            key={integration.id}
            className={`bg-slate-800 border rounded-lg p-5 transition-all hover:border-teal-600 ${
              integration.status === 'error'
                ? 'border-rose-600 bg-rose-900 bg-opacity-5'
                : 'border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700">
                  {getStatusIcon(integration.status)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-1">{integration.name}</div>
                  <div className="text-xs text-slate-400">{integration.description}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Status</div>
                {getStatusBadge(integration.status)}
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Data Flow</div>
                <div className="flex items-center gap-1">
                  {getDataFlowIcon(integration.dataFlow)}
                  <span className="text-xs font-bold text-white capitalize">
                    {integration.dataFlow}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-slate-400 mb-1">Last Sync</div>
              <div className="text-sm text-white">
                {formatDistanceToNow(integration.lastSync, { addSuffix: true })}
              </div>
            </div>

            {integration.errorMessage && (
              <div className="bg-rose-900 bg-opacity-20 border border-rose-600 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-300">{integration.errorMessage}</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded transition-colors">
                <PlayCircle className="w-3.5 h-3.5" />
                Test Connection
              </button>
              <button className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors">
                <FileText className="w-3.5 h-3.5" />
                Logs
              </button>
              <button className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">Integration Health Timeline</h3>
        <div className="space-y-3">
          {MOCK_INTEGRATIONS.filter(i => i.status === 'error' || i.status === 'disconnected').map((integration) => (
            <div key={integration.id} className="flex items-center gap-4 bg-slate-900 border border-slate-700 rounded-lg p-3">
              <div className="flex-shrink-0">
                {getStatusIcon(integration.status)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white mb-1">{integration.name}</div>
                <div className="text-xs text-slate-400">
                  {integration.errorMessage || 'Connection lost'}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {formatDistanceToNow(integration.lastSync, { addSuffix: true })}
              </div>
            </div>
          ))}
          {MOCK_INTEGRATIONS.filter(i => i.status === 'error' || i.status === 'disconnected').length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <div className="text-sm text-slate-400">All integrations are healthy</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
