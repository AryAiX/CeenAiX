import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, Search, X, ChevronDown, User, LogOut,
  ChevronRight, UserCheck, Lock, LayoutGrid,
} from 'lucide-react';
import { SUPER_ADMIN_USER, PLATFORM_INFO, alerts } from '../../data/superAdminData';
import { MOCK_WORKSPACES } from '../../data/workspacesData';
import SwitchWorkspaceSubmenu from './SwitchWorkspaceSubmenu';
import ImpersonateUserModal from './ImpersonateUserModal';
import ImpersonationBanner, { ImpersonationSession } from './ImpersonationBanner';
import LockScreenOverlay from './LockScreenOverlay';
import LiveActivityDropdown from './LiveActivityDropdown';

const searchResults = {
  patients: [
    { name: 'Parnia Yazdkhasti', sub: 'PT-001 · Daman Gold · Al Noor', id: 'PT-001' },
    { name: 'Aisha Mohammed Al Reem', sub: 'PT-006 · AXA Gulf · Al Noor', id: 'PT-006' },
  ],
  doctors: [
    { name: 'Dr. Ahmed Al Rashidi', sub: 'DHA-PRAC-2018-047821 · Cardiologist', id: 'DHA-PRAC-2018-047821' },
    { name: 'Dr. Reem Al Suwaidi', sub: 'DHA-PRAC-2019-055128 · Psychiatrist', id: 'DHA-PRAC-2019-055128' },
  ],
  organizations: [
    { name: 'Al Noor Medical Center', sub: '18 doctors · Active ✅', id: 'ORG-001' },
    { name: 'Al Shifa Pharmacy', sub: 'DHA-PHARM-2019-003481 · Active', id: 'ORG-002' },
  ],
};

type SearchCategory = 'all' | 'patients' | 'doctors' | 'organizations' | 'transactions' | 'audit';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 min default
const IDLE_WARN_MS = 14 * 60 * 1000;    // warn at 14 min

// Only show Switch Workspace if admin has >1 workspace
const canSwitchWorkspace = MOCK_WORKSPACES.length > 1;

const AdminTopBar: React.FC = () => {
  const [sessionCount, setSessionCount] = useState(1247);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCat, setSearchCat] = useState<SearchCategory>('all');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Workspace submenu
  const [showWorkspaceSubmenu, setShowWorkspaceSubmenu] = useState(false);

  // Impersonation
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [impersonationSession, setImpersonationSession] = useState<ImpersonationSession | null>(null);

  // Lock screen
  const [isLocked, setIsLocked] = useState(false);
  const [lockedAt, setLockedAt] = useState<Date | null>(null);
  const [impersonationExpiredWhileLocked, setImpersonationExpiredWhileLocked] = useState(false);

  // Idle timer
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleWarnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showIdleWarn, setShowIdleWarn] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Session counter ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionCount(n => n + Math.floor(Math.random() * 5) - 2);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Search focus ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showSearch]);

  // ── Idle detection ─────────────────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (isLocked) return;
    setShowIdleWarn(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (idleWarnTimerRef.current) clearTimeout(idleWarnTimerRef.current);
    idleWarnTimerRef.current = setTimeout(() => setShowIdleWarn(true), IDLE_WARN_MS);
    idleTimerRef.current = setTimeout(() => {
      setIsLocked(true);
      setLockedAt(new Date());
      setShowIdleWarn(false);
    }, IDLE_TIMEOUT_MS);
  }, [isLocked]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (idleWarnTimerRef.current) clearTimeout(idleWarnTimerRef.current);
    };
  }, [resetIdleTimer]);

  // ── Click outside menu ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
        setShowWorkspaceSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));
  const hasIssue = activeAlerts.some(a => a.type === 'warning' || a.type === 'error');

  const handleLock = () => {
    setIsLocked(true);
    setLockedAt(new Date());
    setShowUserMenu(false);
  };

  const handleUnlock = (password: string): 'success' | 'fail' | 'expired' => {
    // Demo: accept "admin123"
    if (password === 'admin123') {
      setIsLocked(false);
      setLockedAt(null);
      setImpersonationExpiredWhileLocked(false);
      resetIdleTimer();
      return 'success';
    }
    return 'fail';
  };

  const handleSignOut = () => {
    setIsLocked(false);
    setImpersonationSession(null);
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleEndImpersonation = () => {
    setImpersonationSession(null);
  };

  const handleExtendImpersonation = () => {
    if (!impersonationSession) return;
    setImpersonationSession({ ...impersonationSession, durationMinutes: impersonationSession.durationMinutes + 30, startedAt: new Date() });
  };

  return (
    <>
      {/* Impersonation banner — always at very top when active */}
      {impersonationSession && (
        <ImpersonationBanner
          session={impersonationSession}
          onEnd={handleEndImpersonation}
          onExtend={handleExtendImpersonation}
        />
      )}

      <div
        className="sticky z-40 flex items-center gap-4 px-6 flex-shrink-0"
        style={{
          top: impersonationSession ? 44 : 0,
          height: 64,
          background: '#1E293B',
          borderBottom: '1px solid rgba(51,65,85,0.8)',
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div>
            <div className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16 }}>
              Platform Dashboard
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>
              {PLATFORM_INFO.timestamp}
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#34D399' }}>
              {sessionCount.toLocaleString()} active sessions
            </span>
          </div>
        </div>

        {/* Center — status pill */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: hasIssue ? 'rgba(245,158,11,0.1)' : 'rgba(30,41,59,0.5)',
            border: `1px solid ${hasIssue ? 'rgba(245,158,11,0.3)' : 'rgba(51,65,85,0.5)'}`,
          }}
        >
          <div className={`w-2 h-2 rounded-full ${hasIssue ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
          <span style={{ fontSize: 12, color: hasIssue ? '#FCD34D' : '#6EE7B7', fontFamily: 'Inter, sans-serif' }}>
            {hasIssue ? `${activeAlerts.length} issue${activeAlerts.length > 1 ? 's' : ''} detected` : 'All Systems Operational'}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Alerts */}
          <div className="relative">
            <button
              onClick={() => { setShowAlerts(!showAlerts); setShowSearch(false); setShowUserMenu(false); setShowWorkspaceSubmenu(false); }}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{
                background: activeAlerts.length > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(30,41,59,0.8)',
                color: activeAlerts.length > 0 ? '#FCD34D' : '#94A3B8',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = activeAlerts.length > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(30,41,59,0.8)'; }}
            >
              <Bell className="w-4 h-4" />
              {activeAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeAlerts.length}
                </span>
              )}
            </button>

            {showAlerts && (
              <div
                className="absolute right-0 top-11 w-80 rounded-xl shadow-2xl overflow-hidden z-50"
                style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.8)' }}
              >
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <span className="font-bold text-white" style={{ fontSize: 13 }}>Alerts</span>
                  <button onClick={() => setShowAlerts(false)} className="text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {activeAlerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 animate-pulse" style={{ background: alert.type === 'error' ? '#EF4444' : '#F59E0B' }} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 12, color: alert.type === 'error' ? '#FCA5A5' : '#FCD34D' }}>{alert.message}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button style={{ fontSize: 10, color: alert.type === 'error' ? '#FCA5A5' : '#FCD34D' }}>{alert.action}</button>
                      <button onClick={() => setDismissedAlerts(p => [...p, alert.id])} className="text-slate-600 hover:text-slate-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {activeAlerts.length === 0 && (
                  <div className="px-4 py-6 text-center text-slate-500 text-sm">No active alerts</div>
                )}
              </div>
            )}
          </div>

          {/* Search */}
          <button
            onClick={() => { setShowSearch(true); setShowAlerts(false); setShowUserMenu(false); setShowWorkspaceSubmenu(false); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'rgba(30,41,59,0.8)', color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.8)'; e.currentTarget.style.color = '#CBD5E1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,41,59,0.8)'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Live Activity */}
          <LiveActivityDropdown />

          {/* Avatar + Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowAlerts(false);
                setShowSearch(false);
                if (showUserMenu) setShowWorkspaceSubmenu(false);
              }}
              className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors"
              style={{ background: 'rgba(30,41,59,0.8)', color: '#CBD5E1' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,41,59,0.8)'; }}
            >
              <div className="relative">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0D9488, #0891B2)' }}
                >
                  {SUPER_ADMIN_USER.initials}
                </div>
                {/* Impersonation badge on avatar */}
                {impersonationSession && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                    style={{ background: '#F59E0B', border: '1.5px solid #1E293B' }}
                  >
                    <UserCheck className="w-1.5 h-1.5 text-black" />
                  </div>
                )}
              </div>
              <ChevronDown className="w-3 h-3" style={{ color: '#64748B' }} />
            </button>

            {showUserMenu && !showWorkspaceSubmenu && (
              <div
                className="absolute right-0 top-11 rounded-xl shadow-2xl overflow-hidden z-50"
                style={{ width: 240, background: '#1E293B', border: '1px solid rgba(51,65,85,0.8)' }}
              >
                {/* User info */}
                <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.6)' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0D9488, #0891B2)' }}
                    >
                      {SUPER_ADMIN_USER.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate" style={{ fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {SUPER_ADMIN_USER.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#5EEAD4', fontFamily: 'DM Mono, monospace' }}>
                        {SUPER_ADMIN_USER.role}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1 — Profile */}
                <div className="py-1.5 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
                  <MenuRow
                    icon={<User className="w-4 h-4" />}
                    label="Profile"
                    onClick={() => {
                      setShowUserMenu(false);
                      window.history.pushState({}, '', '/admin/profile');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                  />
                </div>

                {/* Section 2 — Workspace & Access */}
                <div className="py-1.5 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
                  {canSwitchWorkspace && (
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                      style={{ color: '#CBD5E1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.5)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => { setShowWorkspaceSubmenu(true); }}
                    >
                      <LayoutGrid className="w-4 h-4" style={{ color: '#64748B' }} />
                      <span className="flex-1">Switch Workspace</span>
                      <ChevronRight className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                    </button>
                  )}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors group"
                    style={{
                      color: impersonationSession ? '#475569' : '#CBD5E1',
                      fontSize: 13,
                      fontFamily: 'Inter, sans-serif',
                      cursor: impersonationSession ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={e => { if (!impersonationSession) e.currentTarget.style.background = 'rgba(51,65,85,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => { if (!impersonationSession) { setShowImpersonateModal(true); setShowUserMenu(false); } }}
                    title={impersonationSession ? 'Already impersonating — end current session first' : undefined}
                  >
                    <UserCheck className="w-4 h-4" style={{ color: impersonationSession ? '#334155' : '#64748B' }} />
                    <span className="flex-1">Impersonate User</span>
                    {impersonationSession && (
                      <span style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono, monospace' }}>ACTIVE</span>
                    )}
                  </button>
                </div>

                {/* Section 3 — Lock */}
                <div className="py-1.5 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)' }}>
                  <div className="flex items-center gap-1 px-2">
                    <button
                      className="flex-1 flex items-center gap-3 px-2 py-2 text-left rounded-lg transition-colors"
                      style={{ color: '#CBD5E1', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.5)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={handleLock}
                    >
                      <Lock className="w-4 h-4" style={{ color: '#64748B' }} />
                      Lock Screen
                    </button>
                    <button
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ color: '#475569' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.5)'; e.currentTarget.style.color = '#94A3B8'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                      onClick={() => setShowUserMenu(false)}
                      title="Close menu"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Section 4 — Sign out */}
                <div className="py-1.5">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2 transition-colors"
                    style={{ color: '#F87171', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* Workspace submenu — side flyout */}
            {showUserMenu && showWorkspaceSubmenu && (
              <div className="absolute right-full top-11 mr-2 z-50">
                <SwitchWorkspaceSubmenu
                  onBack={() => setShowWorkspaceSubmenu(false)}
                  onClose={() => { setShowWorkspaceSubmenu(false); setShowUserMenu(false); }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Search Overlay */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center pt-24"
          style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowSearch(false); }}
        >
          <div className="w-full max-w-2xl mx-auto px-4">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search across all CeenAiX data..."
                className="w-full bg-slate-800 text-white rounded-2xl px-5 py-4 pl-12 text-lg focus:outline-none"
                style={{ fontFamily: 'DM Mono, monospace', border: '1px solid rgba(13,148,136,0.4)', caretColor: '#0D9488' }}
                onKeyDown={e => e.key === 'Escape' && setShowSearch(false)}
              />
              <button onClick={() => setShowSearch(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'patients', 'doctors', 'organizations', 'transactions', 'audit'] as SearchCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSearchCat(cat)}
                  className="rounded-full px-3 py-1 font-medium capitalize"
                  style={{
                    fontSize: 12,
                    background: searchCat === cat ? '#0D9488' : 'rgba(30,41,59,0.8)',
                    color: searchCat === cat ? '#fff' : '#94A3B8',
                    border: '1px solid rgba(51,65,85,0.6)',
                  }}
                >
                  {cat === 'all' ? 'All ●' : cat}
                </button>
              ))}
            </div>
            {searchQuery && (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.8)' }}>
                {(searchCat === 'all' || searchCat === 'patients') && (
                  <div>
                    <div className="px-4 py-2 border-b border-slate-700" style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace' }}>PATIENTS</div>
                    {searchResults.patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50">
                        <div>
                          <div className="text-white text-sm font-medium">{r.name}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{r.sub}</div>
                        </div>
                        <span style={{ fontSize: 11, color: '#0D9488' }}>View Profile →</span>
                      </div>
                    ))}
                  </div>
                )}
                {(searchCat === 'all' || searchCat === 'doctors') && (
                  <div>
                    <div className="px-4 py-2 border-b border-slate-700" style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace' }}>DOCTORS</div>
                    {searchResults.doctors.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50">
                        <div>
                          <div className="text-white text-sm font-medium">{r.name}</div>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{r.sub}</div>
                        </div>
                        <span style={{ fontSize: 11, color: '#0D9488' }}>View Profile →</span>
                      </div>
                    ))}
                  </div>
                )}
                {(searchCat === 'all' || searchCat === 'organizations') && (
                  <div>
                    <div className="px-4 py-2 border-b border-slate-700" style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace' }}>ORGANIZATIONS</div>
                    {searchResults.organizations.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 cursor-pointer">
                        <div>
                          <div className="text-white text-sm font-medium">{r.name}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{r.sub}</div>
                        </div>
                        <span style={{ fontSize: 11, color: '#0D9488' }}>View →</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!searchQuery && (
              <div className="text-center" style={{ color: '#475569', fontSize: 13 }}>
                Start typing to search across patients, doctors, organizations, and more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Impersonate User Modal */}
      {showImpersonateModal && (
        <ImpersonateUserModal
          onClose={() => setShowImpersonateModal(false)}
          onStart={session => setImpersonationSession(session)}
          isAlreadyImpersonating={!!impersonationSession}
        />
      )}

      {/* Lock Screen */}
      {isLocked && lockedAt && (
        <LockScreenOverlay
          lockedAt={lockedAt}
          onUnlock={handleUnlock}
          onDismiss={() => { setIsLocked(false); setLockedAt(null); }}
          onSignOut={handleSignOut}
          impersonationExpiredWhileLocked={impersonationExpiredWhileLocked}
        />
      )}

      {/* Idle warning toast */}
      {showIdleWarn && !isLocked && (
        <div
          className="fixed bottom-4 right-4 z-[200] rounded-xl shadow-2xl overflow-hidden"
          style={{ background: '#1E293B', border: '1px solid rgba(13,148,136,0.4)', width: 280 }}
        >
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-teal-400" />
              <span style={{ fontSize: 12, color: '#5EEAD4', fontWeight: 600 }}>Inactivity warning</span>
            </div>
            <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>
              Your session will lock in 1 minute due to inactivity.
            </p>
            <button
              onClick={() => { setShowIdleWarn(false); resetIdleTimer(); }}
              className="w-full py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: '#0D9488', color: '#fff' }}
            >
              Stay signed in
            </button>
          </div>
        </div>
      )}
    </>
  );
};

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
      style={{
        background: hovered ? 'rgba(51,65,85,0.5)' : 'transparent',
        color: '#CBD5E1',
        fontSize: 13,
        fontFamily: 'Inter, sans-serif',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <span style={{ color: '#64748B' }}>{icon}</span>
      {label}
    </button>
  );
}

export default AdminTopBar;
