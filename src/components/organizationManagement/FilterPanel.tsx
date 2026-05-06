import { Search, Filter } from 'lucide-react';
import { OrganizationFilters, OrganizationTypeFilter, OrganizationStatusFilter, EmirateFilter } from '../../types/organizationManagement';

interface FilterPanelProps {
  filters: OrganizationFilters;
  onFiltersChange: (filters: OrganizationFilters) => void;
}

export default function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const types: { value: OrganizationTypeFilter; label: string }[] = [
    { value: 'hospital', label: 'Hospital' },
    { value: 'clinic', label: 'Clinic' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'laboratory', label: 'Laboratory' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'multi', label: 'Multi' },
  ];

  const statuses: { value: OrganizationStatusFilter; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'onboarding', label: 'Onboarding' },
  ];

  const emirates: EmirateFilter[] = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'RAK', 'Fujairah', 'UAQ'];

  const toggleType = (type: OrganizationTypeFilter) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const toggleStatus = (status: OrganizationStatusFilter) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const toggleEmirate = (emirate: EmirateFilter) => {
    const newEmirates = filters.emirates.includes(emirate)
      ? filters.emirates.filter((e) => e !== emirate)
      : [...filters.emirates, emirate];
    onFiltersChange({ ...filters, emirates: newEmirates });
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto h-full">
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-5 h-5 text-teal-400" />
        <h3 className="text-sm font-bold text-white uppercase">Filters</h3>
      </div>

      <div className="mb-6">
        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Name, DHA license, location..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Type</label>
        <div className="space-y-1.5">
          {types.map((type) => (
            <label key={type.value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.types.includes(type.value)}
                onChange={() => toggleType(type.value)}
                className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
              />
              <span className="text-sm text-slate-300 group-hover:text-white">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Status</label>
        <div className="space-y-1.5">
          {statuses.map((status) => (
            <label key={status.value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.statuses.includes(status.value)}
                onChange={() => toggleStatus(status.value)}
                className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
              />
              <span className="text-sm text-slate-300 group-hover:text-white">{status.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Emirate</label>
        <div className="space-y-1.5">
          {emirates.map((emirate) => (
            <label key={emirate} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.emirates.includes(emirate)}
                onChange={() => toggleEmirate(emirate)}
                className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
              />
              <span className="text-sm text-slate-300 group-hover:text-white">{emirate}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Additional</label>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.insuranceNetwork === true}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  insuranceNetwork: e.target.checked ? true : null,
                })
              }
              className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
            />
            <span className="text-sm text-slate-300 group-hover:text-white">
              Insurance Network Participation
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.nabidhConnected === true}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  nabidhConnected: e.target.checked ? true : null,
                })
              }
              className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
            />
            <span className="text-sm text-slate-300 group-hover:text-white">NABIDH Connected</span>
          </label>
        </div>
      </div>

      <button
        onClick={() =>
          onFiltersChange({
            search: '',
            types: [],
            statuses: [],
            emirates: [],
            insuranceNetwork: null,
            nabidhConnected: null,
          })
        }
        className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors"
      >
        Clear All Filters
      </button>
    </div>
  );
}
