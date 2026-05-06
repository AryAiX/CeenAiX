import React from 'react';
import { Activity, ExternalLink } from 'lucide-react';
import { systemServices, integrations } from '../../data/superAdminData';

const nav = (href: string) => {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const statusDot: Record<'healthy' | 'warning' | 'error', string> = {
  healthy: '#34D399',
  warning: '#FCD34D',
  error: '#F87171',
};

const integrationStatus: Record<'active' | 'warning' | 'inactive', { dot: string; label: string; bg: string }> = {
  active: { dot: '#34D399', label: 'Active', bg: 'rgba(5,150,105,0.12)' },
  warning: { dot: '#FCD34D', label: 'Degraded', bg: 'rgba(245,158,11,0.12)' },
  inactive: { dot: '#F87171', label: 'Down', bg: 'rgba(239,68,68,0.12)' },
};

const SystemHealthPanel: React.FC = () => {
  const allHealthy = systemServices.every(s => s.status === 'healthy' || s.status === 'warning');
  const hasWarning = systemServices.some(s => s.status === 'warning');

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col w-full h-full"
      style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}
      >
        <div className="flex items-center gap-2">
          <Activity style={{ width: 16, height: 16, color: '#34D399' }} />
          <span className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
            System Health
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: hasWarning ? '#FCD34D' : '#34D399' }}
            />
            <span style={{ fontSize: 11, color: hasWarning ? '#FCD34D' : '#34D399' }}>
              {hasWarning ? 'Degraded Service' : 'All Systems Operational'}
            </span>
          </div>
          <button
            onClick={() => nav('/admin/system/status')}
            className="flex items-center gap-1 transition-opacity hover:opacity-80"
            style={{ fontSize: 11, color: '#2DD4BF' }}
          >
            View Details <ExternalLink style={{ width: 10, height: 10 }} />
          </button>
        </div>
      </div>

      <div className="p-5 flex-1">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {systemServices.map(svc => (
            <div
              key={svc.name}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150"
              style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.4)' }}
              onClick={() => nav('/admin/system/status')}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,41,59,0.8)'; e.currentTarget.style.borderColor = 'rgba(13,148,136,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.5)'; e.currentTarget.style.borderColor = 'rgba(51,65,85,0.4)'; }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: statusDot[svc.status],
                    boxShadow: svc.status === 'warning' ? `0 0 6px ${statusDot[svc.status]}` : undefined,
                  }}
                />
                <span
                  className="truncate"
                  style={{ fontSize: 11, color: '#CBD5E1' }}
                >
                  {svc.name}
                </span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 10,
                    color: svc.status === 'warning' ? '#FCD34D' : '#64748B',
                  }}
                >
                  {svc.metric}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div
            style={{
              fontSize: 9,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'DM Mono, monospace',
              marginBottom: 8,
            }}
          >
            INTEGRATION STATUS
          </div>
          <div className="flex flex-wrap gap-2">
            {integrations.map(intg => {
              const cfg = integrationStatus[intg.status];
              return (
                <div
                  key={intg.name}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.dot}22` }}
                  onClick={() => nav('/admin/integrations')}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                  <span style={{ fontSize: 10, color: '#CBD5E1' }}>{intg.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthPanel;
