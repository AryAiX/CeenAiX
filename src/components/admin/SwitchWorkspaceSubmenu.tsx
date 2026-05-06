import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Check, Search, AlertCircle, RefreshCw, ExternalLink, X } from 'lucide-react';
import { MOCK_WORKSPACES, ACTIVE_WORKSPACE_ID, ENV_COLORS, Workspace } from '../../data/workspacesData';

interface Props {
  onBack: () => void;
  onClose: () => void;
}

const RECENT_THRESHOLD_MS = 1000 * 60 * 60 * 4; // 4 hours

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function ConfirmSwitchModal({
  workspace,
  onConfirm,
  onCancel,
}: {
  workspace: Workspace;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(4px)' }} />
      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.8)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 font-bold text-white text-sm"
            style={{ background: workspace.brandColor }}
          >
            {getInitials(workspace.name)}
          </div>
          <h3 className="font-bold text-white mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16 }}>
            Switch to {workspace.name}?
          </h3>
          <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
            You'll be signed into the{' '}
            <span style={{ color: ENV_COLORS[workspace.environment], fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
              {workspace.environment}
            </span>{' '}
            environment. Any unsaved work in the current workspace may be lost.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold transition-colors"
            style={{ background: 'rgba(51,65,85,0.6)', color: '#CBD5E1', fontSize: 13 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.6)'; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-semibold transition-colors"
            style={{ background: '#0D9488', color: '#fff', fontSize: 13 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0F766E'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0D9488'; }}
          >
            Switch Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

const SwitchWorkspaceSubmenu: React.FC<Props> = ({ onBack, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeWs, setActiveWs] = useState(ACTIVE_WORKSPACE_ID);
  const [confirmTarget, setConfirmTarget] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const now = Date.now();
  const recentWs = MOCK_WORKSPACES.filter(
    w => w.lastVisited && now - new Date(w.lastVisited).getTime() < RECENT_THRESHOLD_MS && w.id !== activeWs
  );
  const allOtherWs = MOCK_WORKSPACES.filter(w => !recentWs.find(r => r.id === w.id) && w.id !== activeWs);
  const activeWorkspace = MOCK_WORKSPACES.find(w => w.id === activeWs)!;

  const filterFn = (ws: Workspace) =>
    !query || ws.name.toLowerCase().includes(query.toLowerCase());

  const filteredRecent = recentWs.filter(filterFn);
  const filteredAll = allOtherWs.filter(filterFn);
  const totalVisible = filteredRecent.length + filteredAll.length + 1; // +1 for active

  const handleSwitch = (ws: Workspace) => {
    setConfirmTarget(ws);
  };

  const handleConfirmSwitch = () => {
    if (!confirmTarget) return;
    setActiveWs(confirmTarget.id);
    setConfirmTarget(null);
    onClose();
  };

  function WorkspaceRow({ ws, isActive = false }: { ws: Workspace; isActive?: boolean }) {
    const [hovered, setHovered] = useState(false);
    return (
      <button
        key={ws.id}
        disabled={isActive}
        onClick={() => !isActive && handleSwitch(ws)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-current={isActive ? 'true' : undefined}
        role="menuitem"
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors relative"
        style={{
          background: hovered && !isActive ? 'rgba(51,65,85,0.5)' : 'transparent',
          cursor: isActive ? 'default' : 'pointer',
          borderLeft: isActive || hovered ? `2px solid ${ws.brandColor}` : '2px solid transparent',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
          style={{ background: ws.brandColor }}
        >
          {getInitials(ws.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="truncate"
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? '#E2E8F0' : '#CBD5E1',
            }}
          >
            {ws.name}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: ENV_COLORS[ws.environment], marginTop: 1 }}>
            {ws.environment}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="px-2 py-0.5 rounded-md"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 10,
              fontWeight: 600,
              background: 'rgba(51,65,85,0.6)',
              color: '#94A3B8',
            }}
          >
            {ws.role}
          </span>
          {isActive && <Check className="w-4 h-4" style={{ color: '#0D9488' }} />}
        </div>
      </button>
    );
  }

  const hasResults = totalVisible > 1 || (!query && true);
  const noSearchResults = query && filteredRecent.length === 0 && filteredAll.length === 0;

  return (
    <>
      <div
        className="flex flex-col"
        style={{
          width: 320,
          background: '#1E293B',
          border: '1px solid rgba(51,65,85,0.8)',
          borderRadius: 16,
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          maxHeight: 520,
          overflow: 'hidden',
        }}
        role="menu"
        aria-label="Switch Workspace"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.6)', flexShrink: 0 }}>
          <button
            onClick={onBack}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className="font-semibold text-white flex-1"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}
          >
            Switch Workspace
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#64748B' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.4)', flexShrink: 0 }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#475569' }} />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search workspaces…"
              className="w-full rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none"
              style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(51,65,85,0.6)',
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: '#CBD5E1',
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') { if (query) setQuery(''); else onBack(); }
                if (e.key === 'Backspace' && !query) onBack();
              }}
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loadError ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <AlertCircle className="w-8 h-8" style={{ color: '#EF4444' }} />
              <span style={{ fontSize: 12, color: '#94A3B8' }}>Failed to load workspaces</span>
              <button
                onClick={() => setLoadError(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(51,65,85,0.6)', color: '#CBD5E1', fontSize: 11 }}
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          ) : noSearchResults ? (
            <div className="py-8 px-4 text-center" style={{ color: '#475569', fontSize: 12 }}>
              No workspaces match "{query}"
            </div>
          ) : (
            <>
              {/* Active workspace */}
              {!query && (
                <div>
                  <div className="px-4 py-2" style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Current
                  </div>
                  <WorkspaceRow ws={activeWorkspace} isActive />
                </div>
              )}

              {/* Recent */}
              {filteredRecent.length > 0 && (
                <div>
                  <div className="px-4 py-2" style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Recent
                  </div>
                  {filteredRecent.map(ws => <WorkspaceRow key={ws.id} ws={ws} />)}
                </div>
              )}

              {/* All */}
              {filteredAll.length > 0 && (
                <div>
                  <div className="px-4 py-2" style={{ fontSize: 10, color: '#475569', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    All Workspaces
                  </div>
                  {filteredAll.map(ws => <WorkspaceRow key={ws.id} ws={ws} />)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(51,65,85,0.4)', flexShrink: 0 }}>
          <button
            className="w-full flex items-center gap-2 py-2 text-left transition-colors rounded-lg px-2"
            style={{ color: '#5EEAD4', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(51,65,85,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Manage Workspaces
          </button>
        </div>
      </div>

      {confirmTarget && (
        <ConfirmSwitchModal
          workspace={confirmTarget}
          onConfirm={handleConfirmSwitch}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </>
  );
};

export default SwitchWorkspaceSubmenu;
