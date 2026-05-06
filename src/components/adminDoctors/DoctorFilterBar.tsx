import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, SlidersHorizontal, LayoutList, LayoutGrid } from 'lucide-react';

interface DoctorFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  specialtyFilter: string;
  onSpecialtyChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  licenseFilter: string;
  onLicenseChange: (v: string) => void;
  sortBy: string;
  onSortChange: (v: string) => void;
  viewMode: 'table' | 'cards';
  onViewModeChange: (v: 'table' | 'cards') => void;
  selectAll: boolean;
  onSelectAll: (v: boolean) => void;
}

function Dropdown({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 transition-colors"
        style={{ background: '#334155', border: '1px solid #475569', fontSize: 12, height: 36 }}
      >
        <span>{value === options[0] ? label : value}</span>
        <ChevronDown style={{ width: 13, height: 13, color: '#64748B' }} />
      </button>
      {open && (
        <div className="absolute left-0 top-10 rounded-xl shadow-2xl overflow-hidden z-50" style={{ background: '#1E293B', border: '1px solid #334155', minWidth: 180 }}>
          {options.map(o => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 transition-colors"
              style={{ fontSize: 12, color: value === o ? '#2DD4BF' : '#CBD5E1', background: value === o ? 'rgba(13,148,136,0.1)' : 'transparent' }}
              onMouseEnter={e => { if (value !== o) (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.5)'; }}
              onMouseLeave={e => { if (value !== o) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const specialties = ['All Specialties', 'Cardiology', 'General Practice', 'Dermatology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Endocrinology', 'Neurology', 'Radiology', 'Pulmonology', 'Gynecology'];
const statusOptions = ['All Statuses', 'Verified', 'Pending', 'Under Review', 'Rejected', 'Incomplete', 'DHA Mismatch'];
const licenseOptions = ['All License Status', 'Valid (>90 days)', 'Expiring soon (30–90 days)', 'Critical (≤30 days)', 'Expired'];
const sortOptions = ['Most Consultations', 'Name A–Z', 'Name Z–A', 'Newest', 'Oldest', 'Rating ↓', 'Revenue ↓', 'License Expiry (soonest)'];

export default function DoctorFilterBar({
  search, onSearchChange,
  specialtyFilter, onSpecialtyChange,
  statusFilter, onStatusChange,
  licenseFilter, onLicenseChange,
  sortBy, onSortChange,
  viewMode, onViewModeChange,
  selectAll, onSelectAll,
}: DoctorFilterBarProps) {
  const activeTags: { label: string; clear: () => void }[] = [];
  if (specialtyFilter !== 'All Specialties') activeTags.push({ label: `Specialty: ${specialtyFilter}`, clear: () => onSpecialtyChange('All Specialties') });
  if (statusFilter !== 'All Statuses') activeTags.push({ label: `Status: ${statusFilter}`, clear: () => onStatusChange('All Statuses') });
  if (licenseFilter !== 'All License Status') activeTags.push({ label: `License: ${licenseFilter}`, clear: () => onLicenseChange('All License Status') });

  return (
    <div className="rounded-2xl mb-4" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
      <div className="flex items-center gap-3 px-5 py-4 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 380 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#64748B' }} />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search name, DHA license, specialty, clinic..."
            style={{
              width: '100%', height: 40, paddingLeft: 36, paddingRight: search ? 32 : 12,
              background: '#334155', border: `1px solid ${search ? 'rgba(13,148,136,0.5)' : '#475569'}`,
              borderRadius: 10, color: '#F1F5F9', fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = '#0D9488'; e.target.style.boxShadow = '0 0 0 2px rgba(13,148,136,0.15)'; }}
            onBlur={e => { e.target.style.borderColor = search ? 'rgba(13,148,136,0.5)' : '#475569'; e.target.style.boxShadow = 'none'; }}
          />
          {search && (
            <button onClick={() => onSearchChange('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        <Dropdown label="All Specialties" options={specialties} value={specialtyFilter} onChange={onSpecialtyChange} />
        <Dropdown label="All Statuses" options={statusOptions} value={statusFilter} onChange={onStatusChange} />
        <Dropdown label="License Status" options={licenseOptions} value={licenseFilter} onChange={onLicenseChange} />

        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors" style={{ background: '#334155', border: '1px solid #475569', color: '#94A3B8', fontSize: 12, height: 36 }}>
          <SlidersHorizontal style={{ width: 13, height: 13 }} />
          More Filters
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Dropdown label="Sort" options={sortOptions} value={sortBy} onChange={onSortChange} />
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #475569' }}>
            <button onClick={() => onViewModeChange('table')} className="flex items-center justify-center w-9 h-9 transition-colors" style={{ background: viewMode === 'table' ? '#334155' : 'transparent', color: viewMode === 'table' ? '#2DD4BF' : '#64748B' }}>
              <LayoutList style={{ width: 15, height: 15 }} />
            </button>
            <button onClick={() => onViewModeChange('cards')} className="flex items-center justify-center w-9 h-9 transition-colors" style={{ background: viewMode === 'cards' ? '#334155' : 'transparent', color: viewMode === 'cards' ? '#2DD4BF' : '#64748B' }}>
              <LayoutGrid style={{ width: 15, height: 15 }} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={selectAll} onChange={e => onSelectAll(e.target.checked)} style={{ accentColor: '#0D9488', width: 15, height: 15 }} />
            <span style={{ fontSize: 11, color: '#64748B' }}>All</span>
          </div>
        </div>
      </div>

      {activeTags.length > 0 && (
        <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
          {activeTags.map((tag, i) => (
            <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.3)', fontSize: 11, color: '#2DD4BF' }}>
              {tag.label}
              <button onClick={tag.clear}><X style={{ width: 11, height: 11 }} /></button>
            </span>
          ))}
          <button onClick={() => { onSpecialtyChange('All Specialties'); onStatusChange('All Statuses'); onLicenseChange('All License Status'); }} style={{ fontSize: 11, color: '#2DD4BF' }}>
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
