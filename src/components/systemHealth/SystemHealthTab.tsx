import { useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { MOCK_SERVICES, MOCK_INCIDENTS, MOCK_SLA_TARGETS, MOCK_BACKGROUND_JOBS } from '../../types/systemHealth';
import { format, formatDistanceToNow } from 'date-fns';

export default function SystemHealthTab() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'portal' | 'api' | 'infrastructure'>('all');

  const filteredServices = selectedCategory === 'all'
    ? MOCK_SERVICES
    : MOCK_SERVICES.filter(s => s.category === selectedCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-amber-500';
      case 'outage':
        return 'bg-rose-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'critical':
        return <span className="px-2 py-1 bg-red-600 bg-opacity-20 border border-red-600 rounded text-xs font-bold text-red-400">Critical</span>;
      case 'major':
        return <span className="px-2 py-1 bg-rose-600 bg-opacity-20 border border-rose-600 rounded text-xs font-bold text-rose-400">Major</span>;
      case 'minor':
        return <span className="px-2 py-1 bg-amber-600 bg-opacity-20 border border-amber-600 rounded text-xs font-bold text-amber-400">Minor</span>;
      default:
        return null;
    }
  };

  const serverResponseData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    value: 120 + Math.random() * 80,
  }));

  const apiCallsData = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    value: 4500 + Math.random() * 2000,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
            selectedCategory === 'all'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          All Services
        </button>
        <button
          onClick={() => setSelectedCategory('portal')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
            selectedCategory === 'portal'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          Portals
        </button>
        <button
          onClick={() => setSelectedCategory('api')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
            selectedCategory === 'api'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          APIs
        </button>
        <button
          onClick={() => setSelectedCategory('infrastructure')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
            selectedCategory === 'infrastructure'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          Infrastructure
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-teal-600 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(service.status)}`}></div>
                  <span className="text-sm font-bold text-white">{service.name}</span>
                </div>
                <span className="text-xs text-slate-500 capitalize">{service.category}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Uptime (30d)</span>
                <span className={`font-bold ${service.uptimePercent >= 99.9 ? 'text-green-400' : service.uptimePercent >= 99.0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {service.uptimePercent}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Response Time</span>
                <span className="font-bold text-white">{service.responseTime}ms</span>
              </div>

              {service.lastIncident && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Last Incident</span>
                  <span className="font-bold text-slate-500">
                    {format(service.lastIncident, 'MMM dd')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-white uppercase">Server Response Time (24h)</h3>
          </div>
          <div className="h-40 flex items-end gap-1">
            {serverResponseData.map((data, idx) => {
              const maxValue = Math.max(...serverResponseData.map(d => d.value));
              const height = (data.value / maxValue) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 bg-teal-600 rounded-t hover:bg-teal-500 transition-colors"
                  style={{ height: `${height}%` }}
                  title={`${data.hour}:00 - ${Math.round(data.value)}ms`}
                ></div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <span>00:00</span>
            <span>Avg: {Math.round(serverResponseData.reduce((a, b) => a + b.value, 0) / serverResponseData.length)}ms</span>
            <span>23:00</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-bold text-white uppercase">API Calls per Minute</h3>
          </div>
          <div className="h-40 relative">
            <svg viewBox="0 0 400 160" className="w-full h-full">
              <defs>
                <linearGradient id="apiGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`M ${apiCallsData.map((d, i) => `${(i / (apiCallsData.length - 1)) * 400},${160 - (d.value / 7000) * 160}`).join(' L ')} L 400,160 L 0,160 Z`}
                fill="url(#apiGradient)"
              />
              <path
                d={`M ${apiCallsData.map((d, i) => `${(i / (apiCallsData.length - 1)) * 400},${160 - (d.value / 7000) * 160}`).join(' L ')}`}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-slate-400">Current: <span className="text-white font-bold">5,847</span> calls/min</span>
            <span className="text-green-400 font-bold">↑ 12%</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">Active Background Jobs</h3>
        <div className="space-y-3">
          {MOCK_BACKGROUND_JOBS.map((job) => (
            <div key={job.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-bold text-white">{job.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    job.status === 'running' ? 'bg-teal-600 bg-opacity-20 text-teal-400' :
                    job.status === 'completed' ? 'bg-green-600 bg-opacity-20 text-green-400' :
                    job.status === 'failed' ? 'bg-rose-600 bg-opacity-20 text-rose-400' :
                    'bg-slate-600 bg-opacity-20 text-slate-400'
                  }`}>
                    {job.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  {job.status === 'running' && job.estimatedCompletion && (
                    <span>ETA: {formatDistanceToNow(job.estimatedCompletion)}</span>
                  )}
                  {job.status === 'completed' && (
                    <span>Completed {formatDistanceToNow(job.startTime, { addSuffix: true })}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      job.status === 'completed' ? 'bg-green-500' :
                      job.status === 'failed' ? 'bg-rose-500' :
                      'bg-teal-500'
                    }`}
                    style={{ width: `${job.progress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-white w-12 text-right">{job.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-bold text-white uppercase mb-4">Uptime SLA Tracker</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-3 py-2">Service</th>
              <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">Contractual SLA</th>
              <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">Actual Uptime</th>
              <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">Difference</th>
              <th className="text-center text-xs font-bold text-slate-400 uppercase px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SLA_TARGETS.map((sla) => (
              <tr key={sla.serviceId} className="border-b border-slate-700 hover:bg-slate-900 transition-colors">
                <td className="px-3 py-3">
                  <span className="text-sm font-bold text-white">{sla.serviceName}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm text-slate-300">{sla.contractualSLA}%</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-bold text-white">{sla.actualUptime}%</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-sm font-bold ${sla.difference >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                    {sla.difference >= 0 ? '+' : ''}{sla.difference}%
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  {sla.difference >= 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-400 inline-block" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 inline-block" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase">Incident History</h3>
        </div>
        <div className="space-y-3">
          {MOCK_INCIDENTS.map((incident, idx) => (
            <div key={incident.id} className="relative">
              {idx !== MOCK_INCIDENTS.length - 1 && (
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-700"></div>
              )}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-slate-900 border-2 border-slate-700 rounded-full flex items-center justify-center">
                    {getImpactBadge(incident.impact) ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getImpactBadge(incident.impact)}
                        <span className="text-sm font-bold text-white">{incident.title}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {incident.serviceName} • {format(incident.startTime, 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">{incident.duration}</span>
                  </div>
                  <div className="text-sm text-slate-300 mb-2">{incident.resolution}</div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-600 bg-opacity-20 border border-green-600 rounded text-xs font-bold text-green-400">
                      {incident.status}
                    </span>
                    {incident.endTime && (
                      <span className="text-xs text-slate-500">
                        Resolved: {format(incident.endTime, 'HH:mm')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
