import { AlertTriangle, Download, Shield, MapPin, Activity } from 'lucide-react';
import { MOCK_SECURITY_INCIDENTS, MOCK_ACTIVE_SESSIONS } from '../../types/compliance';
import { format, formatDistanceToNow } from 'date-fns';

export default function SecurityEventsTab() {
  const failedLoginData = [
    { hour: '00:00', count: 2 },
    { hour: '03:00', count: 1 },
    { hour: '06:00', count: 4 },
    { hour: '09:00', count: 12 },
    { hour: '12:00', count: 8 },
    { hour: '15:00', count: 15 },
    { hour: '18:00', count: 7 },
    { hour: '21:00', count: 3 },
  ];

  const suspiciousActivities = [
    {
      id: 'sus-1',
      type: 'Unusual Access Pattern',
      description: 'User accessed 89 patient records in 15 minutes',
      user: 'Dr. Mohammed Hassan',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      severity: 'medium' as const,
    },
    {
      id: 'sus-2',
      type: 'Bulk Data Download',
      description: 'Export of 1,247 patient records to CSV',
      user: 'Ahmed Al-Mazrouei',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      severity: 'high' as const,
    },
    {
      id: 'sus-3',
      type: 'Off-Hours Access',
      description: 'Administrative portal access at 2:47 AM from new IP',
      user: 'Sara Johnson',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      severity: 'low' as const,
    },
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-1 bg-red-600 bg-opacity-20 border border-red-600 rounded text-xs font-bold text-red-400">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-1 bg-rose-600 bg-opacity-20 border border-rose-600 rounded text-xs font-bold text-rose-400">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-1 bg-amber-600 bg-opacity-20 border border-amber-600 rounded text-xs font-bold text-amber-400">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-slate-600 bg-opacity-20 border border-slate-600 rounded text-xs font-bold text-slate-400">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="px-2 py-1 bg-green-600 bg-opacity-20 border border-green-600 rounded text-xs font-bold text-green-400">
            Resolved
          </span>
        );
      case 'investigating':
        return (
          <span className="px-2 py-1 bg-amber-600 bg-opacity-20 border border-amber-600 rounded text-xs font-bold text-amber-400">
            Investigating
          </span>
        );
      case 'open':
        return (
          <span className="px-2 py-1 bg-rose-600 bg-opacity-20 border border-rose-600 rounded text-xs font-bold text-rose-400">
            Open
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-slate-600 bg-opacity-20 border border-slate-600 rounded text-xs font-bold text-slate-400">
            Closed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Download Security Report
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-lg transition-colors">
          <Shield className="w-4 h-4" />
          Trigger Security Scan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            Failed Login Attempts (24h)
          </h3>
          <div className="flex items-end gap-2 h-40 mb-3">
            {failedLoginData.map((data, idx) => {
              const maxValue = Math.max(...failedLoginData.map((d) => d.count));
              const height = (data.count / maxValue) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-rose-600 rounded-t"
                    style={{ height: `${height}%` }}
                    title={`${data.count} failed attempts`}
                  ></div>
                  <span className="text-xs text-slate-500 mt-2">{data.hour}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Total Failed Attempts</span>
            <span className="text-rose-400 font-bold">52</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-4">
            Suspicious Activity Flags
          </h3>
          <div className="space-y-3">
            {suspiciousActivities.map((activity) => (
              <div
                key={activity.id}
                className="bg-slate-900 border border-slate-700 rounded-lg p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getSeverityBadge(activity.severity)}
                      <span className="text-sm font-bold text-white">{activity.type}</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-1">{activity.description}</div>
                    <div className="text-xs text-slate-500">
                      User: <span className="text-white">{activity.user}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 text-right whitespace-nowrap ml-3">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-white uppercase">
              Active Sessions Map
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-400">
              {MOCK_ACTIVE_SESSIONS.length} active sessions
            </span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <svg viewBox="0 0 1000 500" className="w-full h-full">
              <path
                d="M0,250 Q250,100 500,250 T1000,250"
                fill="none"
                stroke="#14b8a6"
                strokeWidth="1"
              />
              <path
                d="M0,300 Q250,150 500,300 T1000,300"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1"
              />
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-4 relative">
            {MOCK_ACTIVE_SESSIONS.map((session) => (
              <div
                key={session.userId}
                className="bg-slate-800 border border-slate-700 rounded-lg p-3"
              >
                <div className="flex items-start gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {session.userName}
                    </div>
                    <div className="text-xs text-slate-400">{session.location}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>IP:</span>
                    <span className="font-mono">{session.ipAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active:</span>
                    <span>{formatDistanceToNow(session.lastActivity, { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">
          Security Incidents Log
        </h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Timestamp
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Severity
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Type
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Description
              </th>
              <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Affected Users
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Status
              </th>
              <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">
                DHA Notified
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">
                Assigned To
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SECURITY_INCIDENTS.map((incident) => (
              <tr
                key={incident.id}
                className={`border-b border-slate-700 hover:bg-slate-900 transition-colors ${
                  incident.severity === 'critical' || incident.severity === 'high'
                    ? 'bg-rose-900 bg-opacity-5'
                    : ''
                }`}
              >
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm text-white">
                    {format(incident.timestamp, 'MMM dd, HH:mm')}
                  </div>
                  <div className="text-xs text-slate-500">
                    {format(incident.timestamp, 'yyyy')}
                  </div>
                </td>
                <td className="px-3 py-3">{getSeverityBadge(incident.severity)}</td>
                <td className="px-3 py-3">
                  <span className="text-sm text-violet-400">{incident.type}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-slate-300">{incident.description}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-bold text-white">
                    {incident.affectedUsers}
                  </span>
                </td>
                <td className="px-3 py-3">{getStatusBadge(incident.resolutionStatus)}</td>
                <td className="px-3 py-3 text-center">
                  {incident.dhaNotified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Yes
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">No</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-white">{incident.assignedTo}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-3">
            Incident Summary
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Incidents (30d)</span>
              <span className="text-white font-bold">24</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Critical/High</span>
              <span className="text-rose-400 font-bold">2</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Open Cases</span>
              <span className="text-amber-400 font-bold">0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Resolved</span>
              <span className="text-green-400 font-bold">24</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-3">
            Response Metrics
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Avg Response Time</span>
              <span className="text-white font-bold">12 min</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Avg Resolution Time</span>
              <span className="text-white font-bold">2.4 hrs</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">DHA Notifications</span>
              <span className="text-white font-bold">1</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">False Positives</span>
              <span className="text-slate-400 font-bold">8%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h3 className="text-sm font-bold text-white uppercase mb-3">
            Security Posture
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Last Security Scan</span>
              <span className="text-white font-bold">2h ago</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Vulnerabilities</span>
              <span className="text-green-400 font-bold">0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Firewall Status</span>
              <span className="text-green-400 font-bold">Active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">WAF Status</span>
              <span className="text-green-400 font-bold">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
