import { useState, useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopBar from '../components/admin/AdminTopBar';
import FilterBar from '../components/userManagement/FilterBar';
import UserTable from '../components/userManagement/UserTable';
import BulkActionsBar from '../components/userManagement/BulkActionsBar';
import UserDetailDrawer from '../components/userManagement/UserDetailDrawer';
import CreateUserModal from '../components/userManagement/CreateUserModal';
import { MOCK_USERS } from '../types/userManagement';
import type { PlatformUser, UserFilters, CreateUserData } from '../types/userManagement';

export default function UserManagement() {
  const [activeSection, setActiveSection] = useState('users');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    roles: [],
    organizationId: null,
    statuses: [],
    dhaLicenseStatuses: [],
    dateJoinedStart: null,
    dateJoinedEnd: null,
  });

  const filteredUsers = useMemo(() => {
    return MOCK_USERS.filter((user) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          user.fullName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.emiratesId?.toLowerCase().includes(searchLower) ||
          user.dhaLicenseNumber?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filters.roles.length > 0 && !filters.roles.includes(user.role)) {
        return false;
      }

      if (filters.statuses.length > 0 && !filters.statuses.includes(user.status)) {
        return false;
      }

      if (
        filters.dhaLicenseStatuses.length > 0 &&
        !filters.dhaLicenseStatuses.includes(user.dhaLicenseStatus)
      ) {
        return false;
      }

      if (
        filters.organizationId &&
        user.organization?.id !== filters.organizationId
      ) {
        return false;
      }

      return true;
    });
  }, [filters]);

  const handleUserSelect = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleExportCSV = () => {
    console.log('Exporting all users to CSV');
  };

  const handleBulkActivate = () => {
    console.log('Activating users:', selectedUsers);
  };

  const handleBulkSuspend = () => {
    console.log('Suspending users:', selectedUsers);
  };

  const handleBulkResetPassword = () => {
    console.log('Resetting passwords for users:', selectedUsers);
  };

  const handleBulkExport = () => {
    console.log('Exporting selected users:', selectedUsers);
  };

  const handleBulkAssignOrganization = () => {
    console.log('Assigning organization to users:', selectedUsers);
  };

  const handleCreateUser = (data: CreateUserData) => {
    console.log('Creating user:', data);
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="flex-1 flex flex-col">
        <AdminTopBar />

        <div className="border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">User Management</h1>
              <div className="text-sm text-slate-400">
                {filteredUsers.length} users • {selectedUsers.length} selected
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </button>
          </div>
        </div>

        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onExportCSV={handleExportCSV}
        />

        <BulkActionsBar
          selectedCount={selectedUsers.length}
          onActivate={handleBulkActivate}
          onSuspend={handleBulkSuspend}
          onResetPassword={handleBulkResetPassword}
          onExportSelected={handleBulkExport}
          onAssignOrganization={handleBulkAssignOrganization}
          onClearSelection={() => setSelectedUsers([])}
        />

        <div className="flex-1 overflow-y-auto p-6">
          {filteredUsers.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
              <div className="text-slate-400 mb-2">No users found</div>
              <div className="text-sm text-slate-500">
                Try adjusting your filters or search criteria
              </div>
            </div>
          ) : (
            <UserTable
              users={filteredUsers}
              selectedUsers={selectedUsers}
              onUserSelect={handleUserSelect}
              onSelectAll={handleSelectAll}
              onViewUser={setSelectedUser}
            />
          )}
        </div>
      </div>

      {selectedUser && (
        <UserDetailDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateUser}
        />
      )}
    </div>
  );
}
