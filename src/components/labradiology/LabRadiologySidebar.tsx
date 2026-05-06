import React from 'react';
import {
  FlaskConical, ScanLine, BarChart3, ClipboardList, CheckSquare,
  Beaker, Cpu, Upload, FileText, Settings, User, ChevronLeft,
  ChevronRight, AlertTriangle, Activity
} from 'lucide-react';

const S = {
  bg: '#1E1B4B',
  active: 'rgba(99,102,241,0.2)',
  activeBorder: 'rgba(99,102,241,0.4)',
  hover: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  text: '#E0E7FF',
  sub: 'rgba(224,231,255,0.55)',
  muted: 'rgba(224,231,255,0.3)',
  indigo: '#6366F1',
  blue: '#3B82F6',
  teal: '#0D9488',
  amber: '#F59E0B',
  red: '#EF4444',
  violet: '#8B5CF6',
};

interface NavItem {
  id: string;
  icon: React.FC<{ style?: React.CSSProperties }>;
  label: string;
  badge?: string | number;
  badgeColor?: string;
  dept?: 'lab' | 'rad' | 'shared' | 'admin';
}

const SECTIONS: { label: string; accent: string; items: NavItem[] }[] = [
  {
    label: 'OVERVIEW',
    accent: S.indigo,
    items: [
      { id: 'dashboard', icon: BarChart3, label: 'Dashboard', badge: '1', badgeColor: S.red },
    ],
  },
  {
    label: 'LABORATORY',
    accent: S.indigo,
    items: [
      { id: 'lab-queue',   icon: FlaskConical,   label: 'Lab Queue',       badge: 14,    badgeColor: S.blue },
      { id: 'lab-orders',  icon: ClipboardList,  label: 'Lab Orders',      badge: 3,     badgeColor: S.blue },
      { id: 'lab-results', icon: CheckSquare,    label: 'Lab Results',     badge: 5,     badgeColor: S.amber },
      { id: 'lab-qc',      icon: Beaker,         label: 'Quality Control', badge: '⚠',   badgeColor: S.amber },
    ],
  },
  {
    label: 'RADIOLOGY',
    accent: S.blue,
    items: [
      { id: 'imaging-queue',   icon: ScanLine,    label: 'Imaging Queue',    badge: 7,   badgeColor: S.blue },
      { id: 'imaging-orders',  icon: ClipboardList, label: 'Imaging Orders', badge: 3,   badgeColor: S.blue },
      { id: 'imaging-reports', icon: FileText,    label: 'Radiology Reports',badge: 9,   badgeColor: S.amber },
      { id: 'imaging-equipment',icon: Cpu,        label: 'Imaging Equipment',badge: '⚠', badgeColor: S.amber },
    ],
  },
  {
    label: 'SHARED',
    accent: S.teal,
    items: [
      { id: 'lab-equipment', icon: Activity, label: 'Lab Equipment' },
      { id: 'nabidh',        icon: Upload,   label: 'NABIDH Sync',  badge: 5, badgeColor: S.violet },
      { id: 'reports',       icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: 'ADMIN',
    accent: 'rgba(224,231,255,0.35)',
    items: [
      { id: 'profile',   icon: User,     label: 'Lab & Radiology Profile' },
      { id: 'settings',  icon: Settings, label: 'Settings' },
    ],
  },
];

interface LabRadiologySidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const LabRadiologySidebar: React.FC<LabRadiologySidebarProps> = ({ activePage, onNavigate, collapsed, onToggle }) => {
  const w = collapsed ? 72 : 260;

  return (
    <nav
      className="flex-shrink-0 flex flex-col h-full relative transition-all duration-300"
      style={{ width: w, background: S.bg, borderRight: `1px solid ${S.border}` }}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
        style={{ background: S.indigo, border: `2px solid #1E1B4B` }}
      >
        {collapsed
          ? <ChevronRight style={{ width: 10, height: 10, color: '#fff' }} />
          : <ChevronLeft  style={{ width: 10, height: 10, color: '#fff' }} />
        }
      </button>

      {/* Logo area */}
      <div className="flex-shrink-0 px-4 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #3B82F6)', fontSize: 16 }}>C</div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #3B82F6)', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
                <span className="font-black text-white" style={{ fontSize: 14 }}>C</span>
              </div>
              <div>
                <div className="font-black text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, letterSpacing: '-0.01em' }}>CeenAiX</div>
                <div style={{ fontSize: 9, color: '#A5B4FC', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Lab & Radiology Portal</div>
              </div>
            </div>

            {/* Facility card */}
            <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="font-bold text-white mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12 }}>Dubai Medical & Imaging Centre</div>
              <div style={{ fontSize: 10, color: '#C7D2FE', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: 6 }}>مركز دبي للتشخيص والتصوير الطبي</div>
              <div style={{ fontSize: 9, color: '#A5B4FC', marginBottom: 6 }}>Healthcare City, Dubai</div>
              <div className="flex gap-1.5 mb-2">
                <span className="px-1.5 py-0.5 rounded-md font-bold" style={{ fontSize: 8, background: 'rgba(99,102,241,0.25)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.3)' }}>DHA Lab ✓</span>
                <span className="px-1.5 py-0.5 rounded-md font-bold" style={{ fontSize: 8, background: 'rgba(59,130,246,0.2)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.3)' }}>DHA Radiology ✓</span>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(224,231,255,0.4)' }}>Fatima Al Rashidi · Day Shift</div>
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: 'none' }}>
        {SECTIONS.map(section => (
          <div key={section.label} className="mb-2">
            {!collapsed && (
              <div className="px-4 py-1 mb-1" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: section.accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                {section.label === 'LABORATORY' ? '⬡ ' : section.label === 'RADIOLOGY' ? '◈ ' : ''}{section.label}
              </div>
            )}
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="w-full flex items-center gap-2.5 transition-all duration-150"
                  style={{
                    padding: collapsed ? '9px 0' : '8px 14px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: isActive ? S.active : 'transparent',
                    borderLeft: isActive && !collapsed ? `2px solid ${section.accent}` : '2px solid transparent',
                    marginLeft: collapsed ? 0 : 0,
                  }}
                  onMouseEnter={e => !isActive && (e.currentTarget.style.background = S.hover)}
                  onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon style={{ width: 15, height: 15, color: isActive ? section.accent : S.muted, flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left" style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? S.text : S.sub }}>{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded-full font-bold" style={{ fontSize: 9, background: `${item.badgeColor}22`, color: item.badgeColor, border: `1px solid ${item.badgeColor}33`, minWidth: 20, textAlign: 'center' }}>
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

      {/* Bottom summary */}
      {!collapsed && (
        <div className="flex-shrink-0 px-4 py-3 space-y-1.5" style={{ borderTop: `1px solid ${S.border}` }}>
          <div className="flex items-center gap-2">
            <FlaskConical style={{ width: 11, height: 11, color: S.indigo }} />
            <span style={{ fontSize: 10, color: S.sub }}>234 samples · 80.8% done</span>
          </div>
          <div className="flex items-center gap-2">
            <ScanLine style={{ width: 11, height: 11, color: S.blue }} />
            <span style={{ fontSize: 10, color: S.sub }}>47 studies · 28 reported</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: S.red }} />
            <span style={{ fontSize: 10, color: S.red, fontWeight: 600 }}>1 critical unnotified</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle style={{ width: 11, height: 11, color: S.amber }} />
            <span style={{ fontSize: 10, color: S.amber }}>2 equipment issues</span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LabRadiologySidebar;
