import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Users, Stethoscope, Building2, Shield, Bot, Link2, TrendingUp, Activity, ShieldCheck, FileText, Lock, Server, Settings, LogOut, ChevronLeft, ChevronRight, CircleUser as UserCircle, Bell, Key, Globe, ScrollText, LifeBuoy, Layers } from 'lucide-react';
import { SUPER_ADMIN_USER, PLATFORM_INFO } from '../../data/superAdminData';

interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  badge?: string;
  badgeType?: 'amber' | 'red' | 'teal' | 'blue' | 'static-teal';
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    titleKey: 'admin.sidebar.overview',
    items: [
      { id: 'dashboard', labelKey: 'admin.sidebar.dashboard', icon: LayoutDashboard, badge: '3', badgeType: 'amber' },
    ],
  },
  {
    titleKey: 'admin.sidebar.usersOrgs',
    items: [
      { id: 'patients', labelKey: 'admin.sidebar.patients', icon: Users, badge: '48,231', badgeType: 'static-teal' },
      { id: 'doctors', labelKey: 'admin.sidebar.doctors', icon: Stethoscope, badge: '23', badgeType: 'amber' },
      { id: 'organizations', labelKey: 'admin.sidebar.organizations', icon: Building2, badge: '4', badgeType: 'blue' },
      { id: 'insurance', labelKey: 'admin.sidebar.insurance', icon: Shield },
    ],
  },
  {
    titleKey: 'admin.sidebar.platform',
    items: [
      { id: 'ai', labelKey: 'admin.sidebar.aiAnalytics', icon: Bot, badge: '8,921', badgeType: 'static-teal' },
      { id: 'integrations', labelKey: 'admin.sidebar.integrations', icon: Link2, badge: '⚠️', badgeType: 'amber' },
      { id: 'revenue', labelKey: 'admin.sidebar.revenue', icon: TrendingUp },
      { id: 'nabidh', labelKey: 'admin.sidebar.nabidh', icon: Activity },
    ],
  },
  {
    titleKey: 'admin.sidebar.compliance',
    items: [
      { id: 'compliance', labelKey: 'admin.sidebar.dhaCompliance', icon: ShieldCheck, badge: '3', badgeType: 'red' },
      { id: 'audit', labelKey: 'admin.sidebar.auditLogs', icon: FileText },
      { id: 'security', labelKey: 'admin.sidebar.security', icon: Lock, badge: '1', badgeType: 'amber' },
    ],
  },
  {
    titleKey: 'admin.sidebar.system',
    items: [
      { id: 'system-status', labelKey: 'admin.sidebar.systemStatus', icon: Activity },
      { id: 'system-changelog', labelKey: 'admin.sidebar.changelog', icon: ScrollText },
      { id: 'platform-settings', labelKey: 'admin.sidebar.platformSettings', icon: Settings },
      { id: 'api-keys', labelKey: 'admin.sidebar.apiKeys', icon: Key },
      { id: 'workspaces', labelKey: 'admin.sidebar.workspaces', icon: Layers },
      { id: 'support', labelKey: 'admin.sidebar.support', icon: LifeBuoy },
    ],
  },
  {
    titleKey: 'admin.sidebar.account',
    items: [
      { id: 'profile', labelKey: 'admin.sidebar.profile', icon: UserCircle },
      { id: 'settings-account', labelKey: 'admin.sidebar.accountSettings', icon: Settings },
      { id: 'settings-security', labelKey: 'admin.sidebar.securitySettings', icon: Lock },
      { id: 'settings-notifications', labelKey: 'admin.sidebar.notifications', icon: Bell },
      { id: 'audit-me', labelKey: 'admin.sidebar.myAuditLog', icon: FileText },
    ],
  },
];

interface Props {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const AdminSidebar: React.FC<Props> = ({ activeSection, onSectionChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { t, i18n } = useTranslation('common');
  const isRTL = i18n.language === 'ar';

  return (
    <div
      className="flex flex-col flex-shrink-0 h-screen overflow-hidden transition-all duration-300"
      style={{
        width: collapsed ? 72 : 260,
        background: '#0A1628',
        borderRight: isRTL ? 'none' : '1px solid rgba(30,41,59,0.8)',
        borderLeft: isRTL ? '1px solid rgba(30,41,59,0.8)' : 'none',
      }}
    >
      <div className={`flex items-center justify-between px-4 py-3 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {!collapsed && (
          <div className={isRTL ? 'text-right' : ''}>
            <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18 }}>
              CeenAiX
            </div>
            <div className="uppercase tracking-widest font-bold mt-0.5" style={{ fontSize: 9, color: '#2DD4BF' }}>
              {t('admin.portal')}
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          {collapsed
            ? <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            : <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          }
        </button>
      </div>

      {!collapsed && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="font-bold text-emerald-400" style={{ fontFamily: 'DM Mono, monospace', fontSize: 9 }}>
            {PLATFORM_INFO.environment}
          </span>
          <span className="text-slate-500 ml-auto" style={{ fontFamily: 'DM Mono, monospace', fontSize: 9 }}>
            v{PLATFORM_INFO.version}
          </span>
        </div>
      )}

      {!collapsed && (
        <div className="mx-3 mb-2 rounded-xl p-2.5" style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.25)' }}>
          <div className={`flex items-center gap-2.5 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0D9488, #0891B2)' }}
            >
              {SUPER_ADMIN_USER.initials}
            </div>
            <div className={`min-w-0 ${isRTL ? 'text-right' : ''}`}>
              <div className="font-bold text-white truncate" style={{ fontSize: 12 }}>
                {SUPER_ADMIN_USER.name}
              </div>
              <div style={{ fontSize: 10, color: '#5EEAD4' }}>
                {SUPER_ADMIN_USER.role} · {SUPER_ADMIN_USER.company}
              </div>
            </div>
          </div>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="font-bold px-2 py-0.5 rounded-full" style={{ fontSize: 9, background: 'rgba(5,150,105,0.2)', color: '#34D399' }}>
              Super Admin · Full Access
            </span>
            <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span style={{ fontSize: 9, color: '#34D399' }}>Active</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden pb-1">
        {navSections.map(section => (
          <div key={section.titleKey} className="mb-0.5">
            {!collapsed && (
              <div className={`px-4 mb-0.5 mt-2 ${isRTL ? 'text-right' : ''}`} style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {t(section.titleKey)}
              </div>
            )}
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    const navPaths: Record<string, string> = {
                      dashboard: '/admin/dashboard',
                      patients: '/admin/patients',
                      doctors: '/admin/doctors',
                      insurance: '/admin/insurance',
                      ai: '/admin/ai',
                      users: '/admin/users',
                      organizations: '/admin/organizations',
                      integrations: '/admin/integrations',
                      revenue: '/admin/revenue',
                      nabidh: '/admin/integrations/nabidh',
                      compliance: '/admin/compliance/dha',
                      security: '/admin/security',
                      audit: '/admin/audit',
                      'system-status': '/admin/system/status',
                      'system-changelog': '/admin/system/changelog',
                      'api-keys': '/admin/settings/api-keys',
                      workspaces: '/admin/workspaces',
                      support: '/admin/support',
                      profile: '/admin/profile',
                      'settings-account': '/admin/settings/account',
                      'settings-security': '/admin/settings/security',
                      'settings-notifications': '/admin/settings/notifications',
                      'audit-me': '/admin/audit/me',
                      'platform-settings': '/admin/settings/platform',
                    };
                    if (navPaths[item.id]) {
                      window.history.pushState({}, '', navPaths[item.id]);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                  className="w-full flex items-center transition-all"
                  style={{
                    padding: collapsed ? '7px 0' : '6px 12px 6px 16px',
                    justifyContent: collapsed ? 'center' : (isRTL ? 'flex-end' : 'flex-start'),
                    flexDirection: isRTL && !collapsed ? 'row-reverse' : 'row',
                    background: isActive ? 'rgba(13,148,136,0.15)' : 'transparent',
                    borderLeft: !isRTL && isActive ? '3px solid #0D9488' : (!isRTL ? '3px solid transparent' : 'none'),
                    borderRight: isRTL && isActive ? '3px solid #0D9488' : (isRTL ? '3px solid transparent' : 'none'),
                    color: isActive ? '#2DD4BF' : '#94A3B8',
                    gap: 10,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(30,41,59,0.6)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`} style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: isActive ? 600 : 400 }}>
                        {t(item.labelKey)}
                      </span>
                      {item.badge && (
                        <span
                          className="font-bold rounded-full px-1.5 py-0.5"
                          style={{
                            fontSize: 9,
                            fontFamily: 'DM Mono, monospace',
                            background:
                              item.badgeType === 'amber' ? 'rgba(245,158,11,0.2)' :
                              item.badgeType === 'red' ? 'rgba(239,68,68,0.2)' :
                              item.badgeType === 'blue' ? 'rgba(59,130,246,0.2)' :
                              'rgba(13,148,136,0.2)',
                            color:
                              item.badgeType === 'amber' ? '#FCD34D' :
                              item.badgeType === 'red' ? '#FCA5A5' :
                              item.badgeType === 'blue' ? '#93C5FD' :
                              '#5EEAD4',
                            animation: (item.badgeType === 'amber' || item.badgeType === 'red') ? 'pulse 2s infinite' : undefined,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!collapsed && (
        <div className="flex-shrink-0 px-4 pb-2 pt-3" style={{ borderTop: '1px solid rgba(30,41,59,0.8)' }}>
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span style={{ fontSize: 11, color: '#34D399', fontFamily: 'Inter, sans-serif' }}>{t('admin.sidebar.allOperational')}</span>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#475569' }}>
            CeenAiX v{PLATFORM_INFO.version} · Production
          </div>
        </div>
      )}

      <button
        onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
        className="flex-shrink-0 flex items-center gap-3 transition-colors"
        style={{
          padding: collapsed ? '12px 0' : '12px 16px',
          justifyContent: collapsed ? 'center' : (isRTL ? 'flex-end' : 'flex-start'),
          flexDirection: isRTL && !collapsed ? 'row-reverse' : 'row',
          borderTop: '1px solid rgba(30,41,59,0.8)',
          color: '#475569',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent'; }}
        title={collapsed ? t('nav.signOut') : undefined}
      >
        <LogOut style={{ width: 15, height: 15, flexShrink: 0 }} />
        {!collapsed && <span style={{ fontSize: 12 }}>{t('nav.signOut')}</span>}
      </button>
    </div>
  );
};

export default AdminSidebar;
