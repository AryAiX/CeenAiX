import { useState } from 'react';
import { Search, Filter, Download, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { MOCK_AUDIT_LOGS } from '../../types/compliance';
import { format } from 'date-fns';

export default function AuditLogsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterPortal, setFilterPortal] = useState('');
  const [showSensitiveOnly, setShowSensitiveOnly] = useState(false);

  const filteredLogs = MOCK_AUDIT_LOGS.filter((log) => {
    if (searchTerm && !log.userName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.resourceId.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterUser && log.userName !== filterUser) return false;
    if (filterAction && log.action !== filterAction) return false;
    if (filterPortal && log.portal !== filterPortal) return false;
    if (showSensitiveOnly && !log.isSensitive) return false;
    return true;
  });

  const uniqueUsers = Array.from(new Set(MOCK_AUDIT_LOGS.map((log) => log.userName)));
  const uniqueActions = Array.from(new Set(MOCK_AUDIT_LOGS.map((log) => log.action)));
  const uniquePortals = Array.from(new Set(MOCK_AUDIT_LOGS.map((log) => log.portal)));

  return (
    <div className="space-y-6">
      <div className="bg-amber-900 bg-opacity-20 border border-amber-600 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-amber-300 mb-1">
              Immutable Audit Trail
            </div>
            <div className="text-xs text-amber-400">
              All audit logs are immutable and cannot be edited or deleted. Records are retained
              for 7 years in compliance with DHA requirements. Export-only access.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user or resource ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
              User
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-600"
            >
              <option value="">All Users</option>
              {uniqueUsers.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
              Action Type
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-600"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
              Portal
            </label>
            <select
              value={filterPortal}
              onChange={(e) => setFilterPortal(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-600"
            >
              <option value="">All Portals</option>
              {uniquePortals.map((portal) => (
                <option key={portal} value={portal}>
                  {portal}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
              Filters
            </label>
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={showSensitiveOnly}
                onChange={(e) => setShowSensitiveOnly(e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
              <span className="text-sm text-white">Sensitive Data Only</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-slate-700">
          <div className="text-xs text-slate-400">
            Showing {filteredLogs.length} of {MOCK_AUDIT_LOGS.length} log entries
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
              <span className="text-slate-400">Sensitive Action</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              <span className="text-slate-400">Failed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900">
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-3">
                  Timestamp
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-3">
                  User
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-3">
                  Organization
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-3">
                  Portal
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-3">
                  Action
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-3">
                  Resource Type
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-3">
                  Resource ID
                </th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-3">
                  IP Address
                </th>
                <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-3">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b border-slate-700 hover:bg-slate-900 transition-colors ${
                    log.isSensitive ? 'bg-rose-900 bg-opacity-5' : ''
                  } ${log.result === 'failure' ? 'bg-red-900 bg-opacity-10' : ''}`}
                >
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {format(log.timestamp, 'MMM dd, HH:mm')}
                    </div>
                    <div className="text-xs text-slate-500">
                      {format(log.timestamp, 'yyyy')}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm text-white">{log.userName}</div>
                    <div className="text-xs text-slate-500 font-mono">{log.userId}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-slate-300">{log.organizationName}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-violet-400">{log.portal}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {log.isSensitive && (
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                      )}
                      <span className="text-sm font-bold text-teal-400">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-slate-300">{log.resourceType}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm font-mono text-white">{log.resourceId}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-mono text-slate-400">{log.ipAddress}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {log.result === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-400 inline-block" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 inline-block" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            Retention Policy: 7 years (DHA Requirement) | All logs are immutable and
            tamper-proof
          </div>
          <div className="text-slate-500">
            Last log entry: {format(MOCK_AUDIT_LOGS[0].timestamp, 'MMM dd, yyyy HH:mm:ss')}
          </div>
        </div>
      </div>
    </div>
  );
}
