import React from 'react';
import { Heart, Stethoscope, Pill, FlaskConical, Shield, Settings } from 'lucide-react';
import { portals } from '../../data/superAdminData';

const nav = (href: string) => {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const portalRoutes: Record<string, string> = {
  patient: '/patient/home',
  doctor: '/doctor/dashboard',
  pharmacy: '/pharmacy/dashboard',
  lab: '/lab/dashboard',
  insurance: '/insurance',
  admin: '/admin/dashboard',
};

const iconMap: Record<string, React.ElementType> = {
  Heart,
  Stethoscope,
  Pill,
  FlaskConical,
  Shield,
  Settings,
};

const colorMap: Record<string, { icon: string; bg: string }> = {
  teal: { icon: '#2DD4BF', bg: 'rgba(13,148,136,0.15)' },
  blue: { icon: '#60A5FA', bg: 'rgba(59,130,246,0.15)' },
  emerald: { icon: '#34D399', bg: 'rgba(5,150,105,0.15)' },
  indigo: { icon: '#818CF8', bg: 'rgba(99,102,241,0.15)' },
  amber: { icon: '#FCD34D', bg: 'rgba(245,158,11,0.15)' },
  slate: { icon: '#94A3B8', bg: 'rgba(71,85,105,0.15)' },
};

const PortalStatus: React.FC = () => (
  <div
    className="rounded-2xl overflow-hidden flex flex-col"
    style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
  >
    <div
      className="flex items-center justify-between px-5 py-4 flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}
    >
      <span className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
        Portal Status
      </span>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span style={{ fontSize: 9, color: '#34D399', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          LIVE
        </span>
      </div>
    </div>

    <div className="p-4 flex flex-col gap-2 flex-1">
      {portals.map(portal => {
        const Icon = iconMap[portal.icon] || Settings;
        const colors = colorMap[portal.color] || colorMap.slate;
        const isOnline = portal.status === 'Online';
        const isDegraded = portal.status === 'Degraded';

        return (
          <div
            key={portal.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150"
            style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(51,65,85,0.4)' }}
            onClick={() => nav(portalRoutes[portal.id] ?? '/admin/system/status')}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.25)'; e.currentTarget.style.borderColor = 'rgba(13,148,136,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.4)'; e.currentTarget.style.borderColor = 'rgba(51,65,85,0.4)'; }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: colors.bg }}
            >
              <Icon style={{ width: 15, height: 15, color: colors.icon }} />
            </div>

            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600 }}>{portal.name}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>
                {portal.active} active
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1.5 justify-end mb-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isOnline ? '#34D399' : isDegraded ? '#FCD34D' : '#F87171',
                    boxShadow: isDegraded ? '0 0 5px #FCD34D' : undefined,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: isOnline ? '#34D399' : isDegraded ? '#FCD34D' : '#F87171',
                  }}
                >
                  {portal.status}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 10,
                  color: portal.ms > 500 ? '#FCD34D' : '#475569',
                }}
              >
                {portal.ms}ms
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default PortalStatus;
