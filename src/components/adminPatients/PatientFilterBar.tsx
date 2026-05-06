import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, SlidersHorizontal, LayoutList, LayoutGrid, ChevronUp } from 'lucide-react';
import { PatientStatus } from '../../data/adminPatientsData';

interface PatientFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: PatientStatus | 'all';
  onStatusChange: (v: PatientStatus | 'all') => void;
  insuranceFilter: string;
  onInsuranceChange: (v: string) => void;
  emirateFilter: string;
  onEmirateChange: (v: string) => void;
  sortBy: string;
  onSortChange: (v: string) => void;
  viewMode: 'table' | 'cards';
  onViewModeChange: (v: 'table' | 'cards') => void;
  perPage: number;
  onPerPageChange: (v: number) => void;
  selectAll: boolean;
  onSelectAll: (v: boolean) => void;
}

const statusOptions: { value: PatientStatus | 'all'; label: string; count: number }[] = [
  { value: 'all', label: 'All', count: 48231 },
  { value: 'active', label: 'Active', count: 31847 },
  { value: 'inactive', label: 'Inactive', count: 16377 },
  { value: 'flagged', label: 'Flagged', count: 5 },
  { value: 'suspended', label: 'Suspended', count: 2 },
];

const insuranceOptions = ['All', 'Daman Gold', 'Daman Silver', 'Daman Basic', 'AXA Gulf', 'ADNIC', 'Thiqa', 'Oman Insurance', 'Cash/Uninsured'];
const emirateOptions = ['All UAE', 'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'RAK', 'Fujairah', 'UAQ'];
const sortOptions = ['Newest First', 'Oldest First', 'Name A–Z', 'Name Z–A', 'Most Active', 'Last Login', 'Risk Level', 'Patient ID'];

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
        style={{ background: '#334155', border: '1px solid #475569', fontSize: 12, fontFamily: 'Inter, sans-serif', height: 36 }}
      >
        <span>{value === options[0] ? label : value}</span>
        <ChevronDown style={{ width: 13, height: 13, color: '#64748B' }} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-10 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[160px]"
          style={{ background: '#1E293B', border: '1px solid #334155' }}
        >
          {options.map(o => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 transition-colors"
              style={{
                fontSize: 12, fontFamily: 'Inter, sans-serif',
                color: value === o ? '#2DD4BF' : '#CBD5E1',
                background: value === o ? 'rgba(13,148,136,0.1)' : 'transparent',
              }}
              onMouseEnter={e => { if (value !== o) e.currentTarget.style.background = 'rgba(51,65,85,0.5)'; }}
              onMouseLeave={e => { if (value !== o) e.currentTarget.style.background = 'transparent'; }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientFilterBar({
  search, onSearchChange,
  statusFilter, onStatusChange,
  insuranceFilter, onInsuranceChange,
  emirateFilter, onEmirateChange,
  sortBy, onSortChange,
  viewMode, onViewModeChange,
  perPage, onPerPageChange,
  selectAll, onSelectAll,
}: PatientFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterTags: { label: string; clear: () => void }[] = [];
  if (statusFilter !== 'all') activeFilterTags.push({ label: `Status: ${statusFilter}`, clear: () => onStatusChange('all') });
  if (insuranceFilter !== 'All') activeFilterTags.push({ label: `Insurance: ${insuranceFilter}`, clear: () => onInsuranceChange('All') });
  if (emirateFilter !== 'All UAE') activeFilterTags.push({ label: `Emirate: ${emirateFilter}`, clear: () => onEmirateChange('All UAE') });

  return (
    <div
      className="rounded-2xl mb-4"
      style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
    >
      <div className="flex items-center gap-3 px-5 py-4 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 360 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#64748B' }} />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search name, Emirates ID, email, PT-..."
            style={{
              width: '100%', height: 40, paddingLeft: 36, paddingRight: search ? 32 : 12,
              background: '#334155', border: `1px solid ${search ? 'rgba(13,148,136,0.5)' : '#475569'}`,
              borderRadius: 10, color: '#F1F5F9', fontSize: 12,
              fontFamily: 'DM Mono, monospace', outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#0D9488'; e.target.style.boxShadow = '0 0 0 2px rgba(13,148,136,0.15)'; }}
            onBlur={e => { e.target.style.borderColor = search ? 'rgba(13,148,136,0.5)' : '#475569'; e.target.style.boxShadow = 'none'; }}
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {statusOptions.map(s => (
            <button
              key={s.value}
              onClick={() => onStatusChange(s.value)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
              style={{
                fontSize: 12, fontFamily: 'Inter, sans-serif', height: 36,
                background: statusFilter === s.value ? '#0D9488' : '#334155',
                color: statusFilter === s.value ? '#fff' : '#94A3B8',
                border: `1px solid ${statusFilter === s.value ? '#0D9488' : '#475569'}`,
              }}
            >
              {s.label}
              <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', opacity: 0.8 }}>
                ({s.count.toLocaleString()})
              </span>
            </button>
          ))}
        </div>

        <Dropdown label="Insurance" options={insuranceOptions} value={insuranceFilter} onChange={onInsuranceChange} />
        <Dropdown label="All UAE" options={emirateOptions} value={emirateFilter} onChange={onEmirateChange} />

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors"
          style={{ background: showAdvanced ? 'rgba(13,148,136,0.1)' : '#334155', border: `1px solid ${showAdvanced ? 'rgba(13,148,136,0.4)' : '#475569'}`, color: showAdvanced ? '#2DD4BF' : '#94A3B8', fontSize: 12, height: 36 }}
        >
          <SlidersHorizontal style={{ width: 13, height: 13 }} />
          More Filters
          {showAdvanced ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Dropdown label="Sort" options={sortOptions} value={sortBy} onChange={onSortChange} />

          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #475569' }}>
            <button
              onClick={() => onViewModeChange('table')}
              className="flex items-center justify-center w-9 h-9 transition-colors"
              style={{ background: viewMode === 'table' ? '#334155' : 'transparent', color: viewMode === 'table' ? '#2DD4BF' : '#64748B' }}
            >
              <LayoutList style={{ width: 15, height: 15 }} />
            </button>
            <button
              onClick={() => onViewModeChange('cards')}
              className="flex items-center justify-center w-9 h-9 transition-colors"
              style={{ background: viewMode === 'cards' ? '#334155' : 'transparent', color: viewMode === 'cards' ? '#2DD4BF' : '#64748B' }}
            >
              <LayoutGrid style={{ width: 15, height: 15 }} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={e => onSelectAll(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#0D9488' }}
            />
            <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>All</span>
          </div>
        </div>
      </div>

      {activeFilterTags.length > 0 && (
        <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
          {activeFilterTags.map((tag, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.3)', fontSize: 11, color: '#2DD4BF' }}
            >
              {tag.label}
              <button onClick={tag.clear} className="hover:text-white transition-colors">
                <X style={{ width: 11, height: 11 }} />
              </button>
            </span>
          ))}
          <button
            onClick={() => { onStatusChange('all'); onInsuranceChange('All'); onEmirateChange('All UAE'); }}
            style={{ fontSize: 11, color: '#2DD4BF', fontFamily: 'Inter, sans-serif' }}
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
