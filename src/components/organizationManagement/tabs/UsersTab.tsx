import { UserPlus, CreditCard as Edit, Ban, Clock } from 'lucide-react';
import { Organization, OrganizationUser } from '../../../types/organizationManagement';
import { formatDistanceToNow } from 'date-fns';

interface UsersTabProps {
  organization: Organization;
}

export default function UsersTab({ organization }: UsersTabProps) {
  const mockUsers: OrganizationUser[] = [
    {
      id: 'u1',
      name: 'Dr. Ahmed Hassan',
      email: 'ahmed.hassan@mediclinic.ae',
      role: 'Physician',
      dhaLicense: 'DHA-DR-2023-45678',
      status: 'active',
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'u2',
      name: 'Fatima Al Zaabi',
      email: 'fatima.alzaabi@mediclinic.ae',
      role: 'IT Administrator',
      status: 'active',
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      id: 'u3',
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@mediclinic.ae',
      role: 'Physician',
      dhaLicense: 'DHA-DR-2024-12389',
      status: 'active',
      lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      id: 'u4',
      name: 'Omar Khalid',
      email: 'omar.khalid@mediclinic.ae',
      role: 'Pharmacist',
      dhaLicense: 'DHA-PH-2023-98234',
      status: 'active',
      lastLogin: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      id: 'u5',
      name: 'Lisa Chen',
      email: 'lisa.chen@mediclinic.ae',
      role: 'Lab Technician',
      dhaLicense: 'DHA-LT-2024-55678',
      status: 'inactive',
      lastLogin: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Organization Users</h3>
          <div className="text-sm text-slate-400">
            {mockUsers.filter((u) => u.status === 'active').length} active users
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors">
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-700">
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
                Role
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
                DHA License
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
                Status
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
                Last Login
              </th>
              <th className="text-left text-xs font-bold text-slate-400 uppercase px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
              <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-900">
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-white">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-white">{user.role}</div>
                </td>
                <td className="px-4 py-3">
                  {user.dhaLicense ? (
                    <div className="text-xs text-slate-300 font-mono">{user.dhaLicense}</div>
                  ) : (
                    <div className="text-xs text-slate-500">N/A</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      user.status === 'active'
                        ? 'bg-green-600 bg-opacity-20 text-green-400'
                        : 'bg-slate-600 bg-opacity-20 text-slate-400'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(user.lastLogin, { addSuffix: true })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-slate-700 rounded transition-colors">
                      <Edit className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                    </button>
                    <button className="p-1.5 hover:bg-slate-700 rounded transition-colors">
                      <Ban className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-bold text-white mb-3">Bulk Actions</h4>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors">
            Bulk Role Assignment
          </button>
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors">
            Export User List
          </button>
        </div>
      </div>
    </div>
  );
}
