import React from 'react';
import {
  LayoutDashboard, FlaskConical, ClipboardList, CheckSquare, Microscope,
  ScanLine, FileText, BarChart3, Activity, Upload, Building2, Settings,
  ChevronLeft, ChevronRight, LogOut, AlertTriangle, Zap
} from 'lucide-react';

interface DiagnosticsSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
}

const navSections = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: '1', badgeType: 'red' as const },
    ],
  },
  {
    title: 'LABORATORY',
    items: [
      { id: 'lab', icon: FlaskConical, label: 'Lab Queue', badge: '14', badgeType: 'blue' as const },
      { id: 'lab-orders', icon: ClipboardList, label: 'Lab Orders' },
      { id: 'lab-results', icon: CheckSquare, label: 'Lab Results', badge: '5', badgeType: 'amber' as const },
      { id: 'lab-qc', icon: Microscope, label: 'Quality Control', badge: '⚠', badgeType: 'amber' as const },
    ],
  },
  {
    title: 'RADIOLOGY',
    items: [
      { id: 'imaging-queue', icon: ScanLine, label: 'Imaging Queue', badge: '7', badgeType: 'blue' as const },
      { id: 'imaging-orders', icon: ClipboardList, label: 'Imaging Orders', badge: '3', badgeType: 'blue' as const },
      { id: 'reports', icon: FileText, label: 'Reports', badge: '9', badgeType: 'amber' as const },
    ],
  },
  {
    title: 'SHARED',
    items: [
      { id: 'equipment', icon: Zap, label: 'Equipment', badge: '⚠', badgeType: 'amber' as const },
      { id: 'nabidh', icon: Upload, label: 'NABIDH', badge: '5', badgeType: 'violet' as const },
      { id: 'analytics', icon: BarChart3, label: 'Reports & Analytics' },
    ],
  },
  {
    title: 'ADMIN',
    items: [
      { id: 'profile', icon: Building2, label: 'Facility Profile' },
      { id: 'settings', icon: Settings, label: 'Settings' },
    ],
  },
];

const DiagnosticsSidebar: React.FC<DiagnosticsSidebarProps> = ({ isCollapsed, onToggle, activePage, onNavigate }) => {
  const getBadgeStyle = (type: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      red:    { bg: 'rgba(239,68,68,0.9)',   color: '#fff' },
      blue:   { bg: 'rgba(29,78,216,0.85)',  color: '#fff' },
      indigo: { bg: 'rgba(79,70,229,0.85)',  color: '#fff' },
      violet: { bg: 'rgba(124,58,237,0.85)', color: '#fff' },
      amber:  { bg: 'rgba(217,119,6,0.85)',  color: '#fff' },
      teal:   { bg: 'rgba(15,118,110,0.85)', color: '#fff' },
    };
    return map[type] || map.blue;
  };

  const isRedBadge = (type: string) => type === 'red';

  return (
    <div
      className="flex flex-col h-full flex-shrink-0 transition-all duration-300 overflow-hidden"
      style={{
        background: '#1E1B4B',
        width: isCollapsed ? 72 : 260,
        minWidth: isCollapsed ? 72 : 260,
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        {!isCollapsed ? (
          <>
            <div>
              <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18 }}>
                CeenAiX
              </div>
              <div className="uppercase tracking-widest" style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'rgba(165,180,252,0.8)', letterSpacing: '0.15em' }}>
                Diagnostics Portal
              </div>
            </div>
            <button onClick={onToggle} className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button onClick={onToggle} className="w-full flex justify-center py-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #1D4ED8)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}
            >
              C
            </div>
          </button>
        )}
      </div>

      {/* Facility card */}
      {!isCollapsed && (
        <div className="mx-3 mt-3 mb-1 px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <div className="font-bold text-white leading-snug" style={{ fontSize: 13 }}>Dubai Medical & Imaging Centre</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#34D399' }} />
            <span style={{ fontSize: 10, color: 'rgba(165,180,252,0.85)' }}>Healthcare City · DHA Licensed ✅</span>
          </div>
          <div className="mt-0.5" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Lab + Radiology</div>
          <div className="mt-0.5" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Fatima Al Rashidi · Day Shift</div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navSections.map(section => (
          <div key={section.title} className="mb-3">
            {!isCollapsed && (
              <div
                className="px-2 py-1 uppercase mb-0.5"
                style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.12em' }}
              >
                {section.title}
              </div>
            )}
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              const badge = (item as any).badge as string | undefined;
              const badgeType = (item as any).badgeType as string | undefined;
              const badgeStyle = badgeType ? getBadgeStyle(badgeType) : null;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 mb-0.5"
                  style={{
                    padding: isCollapsed ? '10px 0' : '8px 10px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                    border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                  }}
                >
                  <Icon
                    className="flex-shrink-0"
                    style={{
                      width: 15, height: 15,
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  />
                  {!isCollapsed && (
                    <>
                      <span
                        className="flex-1 text-left"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 13,
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {item.label}
                      </span>
                      {badge && badgeStyle && (
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${isRedBadge(badgeType || '') ? 'animate-pulse' : ''}`}
                          style={{ fontSize: 9, background: badgeStyle.bg, color: badgeStyle.color }}
                        >
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom summary */}
      {!isCollapsed && (
        <div
          className="mx-3 mb-2 px-3 py-2.5 rounded-xl space-y-1.5"
          style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 10, color: 'rgba(165,180,252,0.9)' }}>🧪 Lab</span>
            <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.5)' }}>234 samples · 80.8% done</span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 10, color: 'rgba(147,197,253,0.9)' }}>🩻 Imaging</span>
            <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.5)' }}>47 studies · 28 reported</span>
          </div>
          <div className="flex items-center justify-between pt-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="flex items-center gap-1" style={{ fontSize: 10, color: 'rgba(252,165,165,0.9)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              1 critical unnotified
            </span>
            <span style={{ fontSize: 10, color: 'rgba(252,211,77,0.8)' }}>⚠ 2 equip issues</span>
          </div>
        </div>
      )}

      {/* Collapse toggle (collapsed mode) */}
      {isCollapsed && (
        <button
          onClick={onToggle}
          className="flex justify-center py-3 transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Sign out */}
      <div className="p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full flex items-center gap-2 rounded-lg p-2.5 transition-colors"
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
          {!isCollapsed && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Sign Out</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default DiagnosticsSidebar;
