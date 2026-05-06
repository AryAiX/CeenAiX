import React from 'react';
import { UserCheck, Building2, CircleDollarSign, Bot, Shield, AlertOctagon, FileBarChart, Terminal } from 'lucide-react';

const nav = (href: string) => {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const actions = [
  {
    icon: UserCheck,
    label: 'Verify Doctor',
    sub: '23 pending',
    color: '#60A5FA',
    bg: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.2)',
    badge: 23,
    badgeColor: '#FCD34D',
    href: '/admin/doctors',
  },
  {
    icon: Building2,
    label: 'Approve Org',
    sub: '2 requests',
    color: '#2DD4BF',
    bg: 'rgba(13,148,136,0.1)',
    border: 'rgba(13,148,136,0.2)',
    badge: 2,
    badgeColor: '#FCD34D',
    href: '/admin/workspaces',
  },
  {
    icon: CircleDollarSign,
    label: 'Platform Revenue',
    sub: 'AED 847K today',
    color: '#34D399',
    bg: 'rgba(5,150,105,0.1)',
    border: 'rgba(5,150,105,0.2)',
    badge: null,
    badgeColor: null,
    href: '/admin/revenue',
  },
  {
    icon: Bot,
    label: 'AI Dashboard',
    sub: '8,921 sessions',
    color: '#C4B5FD',
    bg: 'rgba(124,58,237,0.1)',
    border: 'rgba(124,58,237,0.2)',
    badge: null,
    badgeColor: null,
    href: '/admin/ai',
  },
  {
    icon: Shield,
    label: 'DHA Compliance',
    sub: 'Score: 97.4%',
    color: '#34D399',
    bg: 'rgba(5,150,105,0.1)',
    border: 'rgba(5,150,105,0.2)',
    badge: null,
    badgeColor: null,
    href: '/admin/compliance/dha',
  },
  {
    icon: AlertOctagon,
    label: 'Fraud Review',
    sub: '1 flagged',
    color: '#F87171',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.2)',
    badge: 1,
    badgeColor: '#F87171',
    href: '/admin/security',
  },
  {
    icon: FileBarChart,
    label: 'Generate Report',
    sub: 'April 2026',
    color: '#94A3B8',
    bg: 'rgba(71,85,105,0.1)',
    border: 'rgba(71,85,105,0.2)',
    badge: null,
    badgeColor: null,
    href: '/admin/audit',
  },
  {
    icon: Terminal,
    label: 'System Logs',
    sub: '0 critical',
    color: '#94A3B8',
    bg: 'rgba(71,85,105,0.1)',
    border: 'rgba(71,85,105,0.2)',
    badge: null,
    badgeColor: null,
    href: '/admin/system/status',
  },
];

const QuickActions: React.FC = () => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
  >
    <div
      className="flex items-center justify-between px-5 py-3.5"
      style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}
    >
      <span className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}>
        Quick Actions
      </span>
    </div>

    <div className="grid grid-cols-8 gap-0" style={{ padding: '12px 16px' }}>
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => nav(action.href)}
            className="flex flex-col items-center gap-2 rounded-xl py-3 px-2 transition-all duration-150 relative group"
            style={{ background: 'transparent' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = action.bg;
              e.currentTarget.style.border = `1px solid ${action.border}`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.border = '1px solid transparent';
            }}
          >
            {action.badge != null && (
              <div
                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: action.badgeColor ?? '#FCD34D', fontSize: 8, fontWeight: 700, color: '#0F172A', fontFamily: 'DM Mono, monospace' }}
              >
                {action.badge}
              </div>
            )}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: action.bg, border: `1px solid ${action.border}` }}
            >
              <Icon style={{ width: 18, height: 18, color: action.color }} />
            </div>
            <div className="text-center">
              <div style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 600, lineHeight: 1.2 }}>{action.label}</div>
              <div style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{action.sub}</div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export default QuickActions;
