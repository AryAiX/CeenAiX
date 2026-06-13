import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import {
  LayoutDashboard, Stethoscope, CalendarDays, DollarSign, Settings,
  ChevronLeft, ChevronRight, LogOut, Users, BarChart2, Building2,
  MessageSquare, Bell
} from 'lucide-react';
import type { ClinicPortalMeta } from './ClinicPortal';

interface ClinicSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: string;
  meta: ClinicPortalMeta;
}

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
  badgeColor?: string;
  section?: string;
}

function buildNavItems(meta: ClinicPortalMeta): NavItem[] {
  return [
    { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard',          href: '/clinic/dashboard',     section: 'OVERVIEW' },
    { id: 'doctors',       icon: Stethoscope,     label: 'Doctors',            href: '/clinic/doctors',       badge: meta.pendingDoctors,      badgeColor: 'bg-amber-500' },
    { id: 'appointments',  icon: CalendarDays,    label: 'Appointments',       href: '/clinic/appointments',  badge: meta.todayApptCount,      badgeColor: 'bg-teal-500' },
    { id: 'patients',      icon: Users,           label: 'Patients',           href: '/clinic/patients',      section: 'MANAGEMENT' },
    { id: 'pricing',       icon: DollarSign,      label: 'Pricing & Services', href: '/clinic/pricing' },
    { id: 'messages',      icon: MessageSquare,   label: 'Messages',           href: '/clinic/messages',      badge: meta.unreadMessages,      badgeColor: 'bg-blue-500' },
    { id: 'notifications', icon: Bell,            label: 'Notifications',      href: '/clinic/notifications', badge: meta.unreadNotifications, badgeColor: 'bg-red-500' },
    { id: 'analytics',     icon: BarChart2,       label: 'Analytics',          href: '/clinic/analytics',     section: 'INSIGHTS' },
    { id: 'settings',      icon: Settings,        label: 'Settings',           href: '/clinic/settings',      section: 'ACCOUNT' },
  ];
}

const ClinicSidebar: React.FC<ClinicSidebarProps> = ({ isCollapsed, onToggleCollapse, activeTab, meta }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navItems = buildNavItems(meta);

  const facilityInitials = meta.facilityName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'CL';

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await signOut();
    setSigningOut(false);
    if (!error) {
      navigate('/auth/login', { replace: true });
    }
  }

  return (
    <aside className={`${isCollapsed ? 'w-[72px]' : 'w-[260px]'} bg-[#0A1628] flex flex-col transition-all duration-300 shadow-2xl shrink-0`}>
      {/* Header */}
      <div className="h-[72px] flex items-center justify-between px-4 border-b border-white/[0.06]">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
                <Building2 size={16} className="text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>CeenAiX</div>
                <div className="text-teal-400 text-[10px] uppercase tracking-wide">Clinic Portal</div>
              </div>
            </div>
            <button onClick={onToggleCollapse} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft size={16} className="text-slate-400" />
            </button>
          </>
        ) : (
          <button onClick={onToggleCollapse} className="mx-auto p-2 hover:bg-white/10 rounded-lg transition-colors">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
          </button>
        )}
      </div>

      {/* Clinic card */}
      {!isCollapsed && (
        <div className="px-4 py-3">
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {facilityInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-[13px] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{meta.facilityName}</div>
                <div className="text-teal-400 text-[11px] truncate">{meta.facilityAddress || 'Clinic Portal'}</div>
                <div className="mt-1 inline-flex items-center px-2 py-0.5 bg-emerald-900/50 rounded text-emerald-300 text-[9px] font-medium">
                  DHA Licensed ✓
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const showSection = item.section && (index === 0 || navItems[index - 1].section !== item.section);
          const isActive = activeTab === item.id;

          return (
            <React.Fragment key={item.id}>
              {!isCollapsed && showSection && (
                <div className="px-3 pt-4 pb-1">
                  <p className="text-slate-500 text-[9px] uppercase tracking-wider font-semibold">{item.section}</p>
                </div>
              )}
              <button
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="shrink-0" />
                  {!isCollapsed && <span className="font-medium text-[13px]" style={{ fontFamily: 'Inter, sans-serif' }}>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span className={`${item.badgeColor} text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center`}>
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Bottom stats + sign out */}
      {!isCollapsed && (
        <div className="border-t border-white/[0.06] p-3.5 space-y-2.5">
          <p className="text-slate-500 text-[9px] uppercase tracking-wider font-semibold px-2">TODAY</p>
          <div className="space-y-2 text-[12px]">
            {[
              { label: `${meta.todayApptCount} appointments`, value: `${meta.todayConfirmedCount} confirmed`, color: 'text-teal-400' },
              { label: 'Revenue', value: `AED ${meta.todayRevenue.toLocaleString()}`, color: 'text-emerald-400' },
              { label: 'Pending approvals', value: `${meta.pendingDoctors} doctor${meta.pendingDoctors !== 1 ? 's' : ''}`, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between px-2">
                <span className="text-slate-400">{s.label}</span>
                <span className={`font-mono font-semibold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5 disabled:opacity-50"
          >
            <LogOut size={16} />
            <span className="text-[13px]" style={{ fontFamily: 'Inter, sans-serif' }}>
              {signingOut ? 'Signing Out…' : 'Sign Out'}
            </span>
          </button>
        </div>
      )}

      {isCollapsed && (
        <button onClick={onToggleCollapse} className="p-4 border-t border-white/[0.06] hover:bg-white/5 transition-colors">
          <ChevronRight size={18} className="text-slate-400 mx-auto" />
        </button>
      )}

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900">Sign Out</h3>
            <p className="mt-2 text-sm text-gray-500">Are you sure you want to sign out?</p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  void handleSignOut();
                }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
};

export default ClinicSidebar;
