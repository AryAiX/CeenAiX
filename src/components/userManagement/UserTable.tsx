import { User, CheckCircle, Clock, X, Eye, CreditCard as Edit, UserCheck, Ban, Trash2, Key, Mail } from 'lucide-react';
import { PlatformUser, ROLE_LABELS, STATUS_LABELS } from '../../types/userManagement';
import { formatDistanceToNow } from 'date-fns';

interface UserTableProps {
  users: PlatformUser[];
  selectedUsers: string[];
  onUserSelect: (userId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onViewUser: (user: PlatformUser) => void;
}

export default function UserTable({
  users,
  selectedUsers,
  onUserSelect,
  onSelectAll,
  onViewUser,
}: UserTableProps) {
  const allSelected = users.length > 0 && selectedUsers.length === users.length;
  const someSelected = selectedUsers.length > 0 && !allSelected;

  const getDhaLicenseIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'unverified':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'expired':
        return <X className="w-4 h-4 text-rose-400" />;
      default:
        return <span className="text-xs text-slate-500">N/A</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600 bg-opacity-20 border-green-600 text-green-400';
      case 'inactive':
        return 'bg-slate-600 bg-opacity-20 border-slate-600 text-slate-400';
      case 'pending_verification':
        return 'bg-amber-600 bg-opacity-20 border-amber-600 text-amber-400';
      case 'suspended':
        return 'bg-rose-600 bg-opacity-20 border-rose-600 text-rose-400';
      case 'locked':
        return 'bg-slate-600 bg-opacity-20 border-slate-700 text-slate-500';
      default:
        return 'bg-slate-600 bg-opacity-20 border-slate-600 text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-900 border-b border-slate-700">
            <th className="px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = someSelected;
                  }
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
              />
            </th>
            <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
              User
            </th>
            <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
              Emirates ID
            </th>
            <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
              Role
            </th>
            <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
              Organization
            </th>
            <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
              Email
            </th>
            <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
              Phone
            </th>
            <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
              DHA License
            </th>
            <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
              Last Login
            </th>
            <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
              Status
            </th>
            <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-slate-700 hover:bg-slate-900 transition-colors"
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => onUserSelect(user.id)}
                  className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-teal-600 focus:ring-teal-600"
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{user.fullName}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-slate-300 font-mono">{user.emiratesId || 'N/A'}</div>
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-slate-700 rounded text-xs font-bold text-slate-300">
                  {ROLE_LABELS[user.role]}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-white">{user.organization?.name || 'N/A'}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-slate-300">{user.email}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-slate-300">{user.phone || 'N/A'}</div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {getDhaLicenseIcon(user.dhaLicenseStatus)}
                  {user.dhaLicenseNumber && (
                    <span className="text-xs text-slate-400 font-mono">
                      {user.dhaLicenseNumber}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                {user.lastLogin ? (
                  <div className="text-xs text-slate-400">
                    {formatDistanceToNow(user.lastLogin, { addSuffix: true })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Never</div>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-bold border ${getStatusBadge(
                    user.status
                  )}`}
                >
                  {STATUS_LABELS[user.status]}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onViewUser(user)}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="View"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-teal-400" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Impersonate"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 hover:text-blue-400" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Suspend"
                  >
                    <Ban className="w-3.5 h-3.5 text-slate-400 hover:text-amber-400" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Reset Password"
                  >
                    <Key className="w-3.5 h-3.5 text-slate-400 hover:text-violet-400" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Resend Verification"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 hover:text-green-400" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
