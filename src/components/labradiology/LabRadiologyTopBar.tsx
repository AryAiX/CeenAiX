import React, { useState } from 'react';
import { FlaskConical, ScanLine, Search, Bell, X, ChevronDown } from 'lucide-react';

export type DeptFilter = 'all' | 'lab' | 'radiology';

interface LabRadiologyTopBarProps {
  activePage: string;
  deptFilter: DeptFilter;
  onDeptChange: (f: DeptFilter) => void;
}

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  dashboard:        { title: 'Lab & Radiology Dashboard', sub: '7 April 2026 · 2:07 PM · Day Shift (53 min remaining)' },
  'lab-queue':      { title: 'Lab & Radiology Portal › Laboratory › Queue', sub: '234 samples today · 1 critical unnotified' },
  'lab-orders':     { title: 'Lab & Radiology Portal › Laboratory › Orders', sub: '3 new orders awaiting processing' },
  'lab-results':    { title: 'Lab & Radiology Portal › Laboratory › Results', sub: '5 results pending verification' },
  'lab-qc':         { title: 'Lab & Radiology Portal › Laboratory › Quality Control', sub: '4/5 analyzers passing QC' },
  'imaging-queue':  { title: 'Lab & Radiology Portal › Radiology › Imaging Queue', sub: '47 studies today · 3 scanning now' },
  'imaging-orders': { title: 'Lab & Radiology Portal › Radiology › Orders', sub: '3 new imaging orders' },
  'imaging-reports':{ title: 'Lab & Radiology Portal › Radiology › Reports', sub: '9 pending sign-off · Dr. Rania on duty' },
  'imaging-equipment': { title: 'Lab & Radiology Portal › Radiology › Equipment', sub: '2 issues · 1 scanner in maintenance' },
  'lab-equipment':  { title: 'Lab & Radiology Portal › Shared › Lab Equipment', sub: 'Siemens BCS XP in maintenance' },
  'nabidh':         { title: 'Lab & Radiology Portal › NABIDH Submission Centre', sub: '67/75 submitted · 8 pending' },
  'reports':        { title: 'Lab & Radiology Portal › Reports & Analytics', sub: 'Both departments · Today' },
  'profile':        { title: 'Lab & Radiology Portal › Lab & Radiology Profile', sub: 'DHA-LAB-2015-002841 · DHA-RAD-2016-001247' },
  'settings':       { title: 'Lab & Radiology Portal › Settings', sub: 'Portal configuration' },
};

const LabRadiologyTopBar: React.FC<LabRadiologyTopBarProps> = ({ activePage, deptFilter, onDeptChange }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const info = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard;
  const showFilter = activePage === 'dashboard';

  return (
    <div className="flex-shrink-0 bg-white" style={{ borderBottom: '1px solid #E2E8F0', height: 64 }}>
      <div className="flex items-center h-full px-5 gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1">
            <FlaskConical style={{ width: 18, height: 18, color: '#4F46E5' }} />
            <ScanLine style={{ width: 18, height: 18, color: '#1D4ED8' }} />
          </div>
          <div>
            <div className="font-bold text-slate-800 leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}>
              {activePage === 'dashboard' ? 'Lab & Radiology Dashboard' : info.title.split(' › ').pop()}
            </div>
            <div className="text-slate-400 leading-tight" style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
              {activePage === 'dashboard' ? info.sub : info.title.includes('›') ? `Lab & Radiology Portal › ${info.title.split(' › ').slice(1, -1).join(' › ')}` : info.sub}
            </div>
          </div>
        </div>

        {/* Center — dept toggle on dashboard */}
        {showFilter ? (
          <div className="flex-1 flex justify-center">
            <div className="flex items-center rounded-xl p-1 gap-0.5" style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
              {([
                ['all',       'All'],
                ['lab',       'Lab Only'],
                ['radiology', 'Radiology Only'],
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
        ) : <div className="flex-1" />}

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showSearch ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}>
              <Search style={{ width: 14, height: 14, color: '#94A3B8' }} />
              <input
                autoFocus
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Patient, accession, study..."
                className="bg-transparent text-slate-700 focus:outline-none w-48"
                style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}
              />
              <button onClick={() => { setShowSearch(false); setSearchVal(''); }}>
                <X style={{ width: 13, height: 13, color: '#94A3B8' }} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
              style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', fontSize: 12, height: 36, color: '#4F46E5' }}
            >
              <Search style={{ width: 13, height: 13 }} />
              <span className="font-medium">Search</span>
            </button>
          )}

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold animate-pulse"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', fontSize: 11, height: 36, color: '#DC2626' }}>
            <span className="w-2 h-2 rounded-full bg-red-500" />
            1 Critical
          </button>

          <button className="relative p-2.5 rounded-xl" style={{ color: '#64748B' }}>
            <Bell style={{ width: 16, height: 16 }} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #1D4ED8)' }}>FA</div>
              <ChevronDown style={{ width: 12, height: 12, color: '#94A3B8' }} />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-12 w-60 rounded-xl shadow-xl py-1 z-50" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                <div className="px-4 py-3 mb-1" style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <div className="font-semibold text-slate-800 text-sm">Fatima Al Rashidi</div>
                  <div className="text-slate-500 text-xs">Senior Diagnostics Coordinator</div>
                  <div className="text-xs mt-0.5" style={{ fontFamily: 'DM Mono, monospace', color: '#4F46E5' }}>Lab + Radiology Access</div>
                </div>
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-4 py-2 text-red-500 text-sm"
                  onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabRadiologyTopBar;
