import { Search, Download, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { UserFilters, UserRole, UserStatus, DhaLicenseStatus, ROLE_LABELS, STATUS_LABELS } from '../../types/userManagement';

interface FilterBarProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onExportCSV: () => void;
}

export default function FilterBar({ filters, onFiltersChange, onExportCSV }: FilterBarProps) {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDhaDropdown, setShowDhaDropdown] = useState(false);

  const roles: UserRole[] = [
    'patient',
    'doctor',
    'nurse',
    'pharmacist',
    'lab_technician',
    'pharmacy_admin',
    'lab_admin',
    'org_admin',
    'super_admin',
  ];

  const statuses: UserStatus[] = [
    'active',
    'inactive',
    'pending_verification',
    'suspended',
    'locked',
  ];

  const dhaStatuses: DhaLicenseStatus[] = ['verified', 'unverified', 'expired', 'not_applicable'];

  const toggleRole = (role: UserRole) => {
    const newRoles = filters.roles.includes(role)
      ? filters.roles.filter((r) => r !== role)
      : [...filters.roles, role];
    onFiltersChange({ ...filters, roles: newRoles });
  };

  const toggleStatus = (status: UserStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const toggleDhaStatus = (status: DhaLicenseStatus) => {
    const newStatuses = filters.dhaLicenseStatuses.includes(status)
      ? filters.dhaLicenseStatuses.filter((s) => s !== status)
      : [...filters.dhaLicenseStatuses, status];
    onFiltersChange({ ...filters, dhaLicenseStatuses: newStatuses });
  };

  return (
    <div className="bg-slate-800 border-b border-slate-700 p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, Emirates ID, license number..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white hover:border-slate-600 transition-colors"
          >
            <span className="text-slate-400">Role:</span>
            {filters.roles.length > 0 ? (
              <span className="font-bold">{filters.roles.length} selected</span>
            ) : (
              <span>All</span>
            )}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showRoleDropdown && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
              <div className="p-2">
                {roles.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.roles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
                    />
                    <span className="text-sm text-white">{ROLE_LABELS[role]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white hover:border-slate-600 transition-colors"
          >
            <span className="text-slate-400">Status:</span>
            {filters.statuses.length > 0 ? (
              <span className="font-bold">{filters.statuses.length} selected</span>
            ) : (
              <span>All</span>
            )}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full mt-2 left-0 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50">
              <div className="p-2">
                {statuses.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(status)}
                      onChange={() => toggleStatus(status)}
                      className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
                    />
                    <span className="text-sm text-white">{STATUS_LABELS[status]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDhaDropdown(!showDhaDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white hover:border-slate-600 transition-colors"
          >
            <span className="text-slate-400">DHA:</span>
            {filters.dhaLicenseStatuses.length > 0 ? (
              <span className="font-bold">{filters.dhaLicenseStatuses.length} selected</span>
            ) : (
              <span>All</span>
            )}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showDhaDropdown && (
            <div className="absolute top-full mt-2 right-0 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50">
              <div className="p-2">
                {dhaStatuses.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.dhaLicenseStatuses.includes(status)}
                      onChange={() => toggleDhaStatus(status)}
                      className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
                    />
                    <span className="text-sm text-white capitalize">
                      {status.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
    </div>
  );
}
