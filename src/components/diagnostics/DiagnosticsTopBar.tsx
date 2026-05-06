import React, { useState } from 'react';
import { FlaskConical, ScanLine, Search, Bell, ChevronDown, X } from 'lucide-react';

export type DeptFilter = 'all' | 'lab' | 'radiology';

interface DiagnosticsTopBarProps {
  deptFilter: DeptFilter;
  onDeptChange: (f: DeptFilter) => void;
  activePage?: string;
}

const pageTitles: Record<string, { title: string; sub: string }> = {
  dashboard:      { title: 'Diagnostics Dashboard', sub: '7 April 2026 · 2:07 PM · Day Shift (53 min remaining)' },
  mri:            { title: 'MRI — Magnetic Resonance Imaging', sub: 'Siemens Vida 3T · MAGNETOM Sola 1.5T · 2 scanners online' },
  ct:             { title: 'CT Scan — Computed Tomography', sub: 'Philips 256-slice · Siemens 64-slice · 2 scanners' },
  lab:            { title: 'Clinical Laboratory Portal', sub: '234 samples today · 1 critical unnotified · DHA-LAB-2015-002841' },
  'lab-queue':    { title: 'Laboratory Queue', sub: '234 samples today · 45 active' },
  'lab-results':  { title: 'Lab Results', sub: '189 resulted · 5 pending verification' },
  'imaging-queue': { title: 'Imaging Queue', sub: '47 studies today · 3 scanning now' },
  reports:        { title: 'Radiology Reports', sub: '9 pending sign-off · Dr. Rania on duty' },
  equipment:      { title: 'Equipment Status', sub: '2 issues · Coag maintenance · X-Ray QA' },
  nabidh:         { title: 'NABIDH Submissions', sub: '67/75 submitted · 8 pending' },
};

const DiagnosticsTopBar: React.FC<DiagnosticsTopBarProps> = ({ deptFilter, onDeptChange, activePage = 'dashboard' }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const pageInfo = pageTitles[activePage] || pageTitles.dashboard;
  const showDeptToggle = activePage === 'dashboard';

  return (
    <div
      className="flex-shrink-0 border-b bg-white"
      style={{ borderColor: '#E2E8F0', height: 64 }}
    >
      <div className="flex items-center h-full px-5 gap-4">

        {/* Left */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4" style={{ color: '#4F46E5' }} />
            <ScanLine className="w-4 h-4" style={{ color: '#1D4ED8' }} />
          </div>
          <div>
            <div
              className="font-bold leading-tight text-slate-800"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 17 }}
            >
              {pageInfo.title}
            </div>
            <div
              className="leading-tight text-slate-400"
              style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}
            >
              {pageInfo.sub}
            </div>
          </div>
        </div>

        {/* Center — department toggle, only on dashboard */}
        {showDeptToggle ? (
          <div className="flex-1 flex justify-center">
            <div
              className="flex items-center rounded-xl p-1 gap-0.5"
              style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
            >
              {([
                ['all',       '🔬 All'],
                ['lab',       '🧪 Lab Only'],
                ['radiology', '🩻 Radiology Only'],
              ] as [DeptFilter, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => onDeptChange(key)}
                  className="px-4 py-1.5 rounded-lg font-semibold transition-all"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    background: deptFilter === key
                      ? key === 'lab'       ? '#4F46E5'
                      : key === 'radiology' ? '#1D4ED8'
                      : '#1E293B'
                      : 'transparent',
                    color: deptFilter === key ? '#fff' : '#64748B',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showSearch ? (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Sample ID, accession, patient..."
                className="bg-transparent text-slate-700 text-sm focus:outline-none w-48"
                style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}
              />
              <button onClick={() => { setShowSearch(false); setSearchVal(''); }}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
              style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', fontSize: 12, height: 36, color: '#4F46E5' }}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="font-medium">Search</span>
            </button>
          )}

          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold animate-pulse"
            style={{
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.25)',
              fontSize: 11,
              height: 36,
              color: '#DC2626',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            1 Critical
          </button>

          <button className="relative p-2.5 rounded-xl transition-colors" style={{ color: '#64748B' }}>
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #1D4ED8)' }}
              >
                FA
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showUserMenu && (
              <div
                className="absolute right-0 top-12 w-56 rounded-xl shadow-xl py-1 z-50"
                style={{ background: '#fff', border: '1px solid #E2E8F0' }}
              >
                <div className="px-4 py-3 border-b mb-1" style={{ borderColor: '#F1F5F9' }}>
                  <div className="font-semibold text-slate-800 text-sm">Fatima Al Rashidi</div>
                  <div className="text-slate-500 text-xs">Senior Diagnostics Coordinator</div>
                  <div className="text-xs mt-0.5" style={{ fontFamily: 'DM Mono, monospace', color: '#4F46E5' }}>
                    Lab + Radiology Access
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full text-left px-4 py-2 text-red-500 text-sm transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsTopBar;
