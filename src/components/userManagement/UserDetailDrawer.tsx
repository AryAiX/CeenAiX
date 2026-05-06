import { X, User, Mail, Phone, MapPin, Shield, Activity, FileText, Clock } from 'lucide-react';
import { useState } from 'react';
import { PlatformUser, ROLE_LABELS, STATUS_LABELS } from '../../types/userManagement';
import { format, formatDistanceToNow } from 'date-fns';

interface UserDetailDrawerProps {
  user: PlatformUser;
  onClose: () => void;
}

type TabId = 'profile' | 'login' | 'activity' | 'security' | 'linked' | 'notes';

export default function UserDetailDrawer({ user, onClose }: UserDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'login', label: 'Login Activity', icon: Clock },
    { id: 'activity', label: 'Activity Log', icon: Activity },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'linked', label: 'Linked Records', icon: FileText },
    { id: 'notes', label: 'Admin Notes', icon: FileText },
  ];

  const mockLoginActivities = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      ipAddress: '185.192.70.45',
      device: 'Chrome on macOS',
      location: 'Dubai, UAE',
      latitude: 25.2048,
      longitude: 55.2708,
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      ipAddress: '185.192.70.45',
      device: 'Safari on iOS',
      location: 'Dubai, UAE',
      latitude: 25.2048,
      longitude: 55.2708,
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      ipAddress: '185.192.70.45',
      device: 'Chrome on macOS',
      location: 'Dubai, UAE',
      latitude: 25.2048,
      longitude: 55.2708,
    },
  ];

  const mockActivityLog = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      action: 'Updated',
      entity: 'Patient Record',
      entityId: 'PR-12345',
      details: 'Updated medical history',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      action: 'Created',
      entity: 'Prescription',
      entityId: 'RX-67890',
      details: 'Prescribed medication for patient',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      action: 'Viewed',
      entity: 'Lab Results',
      entityId: 'LR-11223',
      details: 'Accessed patient lab results',
    },
  ];

  const mockSessions = [
    {
      id: '1',
      device: 'Chrome on macOS',
      location: 'Dubai, UAE',
      ipAddress: '185.192.70.45',
      lastActive: new Date(Date.now() - 30 * 60 * 1000),
    },
    {
      id: '2',
      device: 'Safari on iOS',
      location: 'Dubai, UAE',
      ipAddress: '185.192.70.46',
      lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
      <div className="w-full max-w-4xl h-full bg-slate-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.fullName}</h2>
              <div className="text-sm text-slate-400">{ROLE_LABELS[user.role]}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-800 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h3 className="text-sm font-bold text-white uppercase mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      First Name
                    </label>
                    <div className="text-sm text-white">{user.firstName}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Last Name
                    </label>
                    <div className="text-sm text-white">{user.lastName}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Emirates ID
                    </label>
                    <div className="text-sm text-white font-mono">{user.emiratesId || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                      Date Joined
                    </label>
                    <div className="text-sm text-white">{format(user.dateJoined, 'MMM dd, yyyy')}</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h3 className="text-sm font-bold text-white uppercase mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-teal-400" />
                    <div>
                      <div className="text-sm text-white">{user.email}</div>
                      {user.emailVerified ? (
                        <div className="text-xs text-green-400">Verified</div>
                      ) : (
                        <div className="text-xs text-amber-400">Unverified</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-teal-400" />
                    <div>
                      <div className="text-sm text-white">{user.phone || 'N/A'}</div>
                      {user.phoneVerified ? (
                        <div className="text-xs text-green-400">Verified</div>
                      ) : (
                        <div className="text-xs text-amber-400">Unverified</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {user.dhaLicenseNumber && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                  <h3 className="text-sm font-bold text-white uppercase mb-4">DHA License</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                        License Number
                      </label>
                      <div className="text-sm text-white font-mono">{user.dhaLicenseNumber}</div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                        Status
                      </label>
                      <div>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                            user.dhaLicenseStatus === 'verified'
                              ? 'bg-green-600 bg-opacity-20 text-green-400'
                              : user.dhaLicenseStatus === 'expired'
                              ? 'bg-rose-600 bg-opacity-20 text-rose-400'
                              : 'bg-amber-600 bg-opacity-20 text-amber-400'
                          }`}
                        >
                          {user.dhaLicenseStatus}
                        </span>
                      </div>
                    </div>
                    {user.dhaLicenseExpiry && (
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                          Expiry Date
                        </label>
                        <div className="text-sm text-white">
                          {format(user.dhaLicenseExpiry, 'MMM dd, yyyy')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {user.organization && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                  <h3 className="text-sm font-bold text-white uppercase mb-4">Organization</h3>
                  <div className="text-sm text-white">{user.organization.name}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'login' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Recent Login Activity</h3>
              <div className="space-y-3">
                {mockLoginActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-semibold text-white">
                        {format(activity.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400">IP Address:</span>
                        <span className="text-white ml-2 font-mono">{activity.ipAddress}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Device:</span>
                        <span className="text-white ml-2">{activity.device}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-teal-400" />
                        <span className="text-white">{activity.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Activity Log</h3>
              <div className="space-y-2">
                {mockActivityLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-white">{entry.action}</span>
                        <span className="text-sm text-slate-400 mx-2">•</span>
                        <span className="text-sm text-teal-400">{entry.entity}</span>
                        {entry.entityId && (
                          <span className="text-xs text-slate-500 ml-2 font-mono">
                            ({entry.entityId})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{entry.details}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h3 className="text-sm font-bold text-white uppercase mb-4">Security Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Two-Factor Authentication</div>
                      <div className="text-xs text-slate-400">
                        {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-xs font-bold ${
                        user.twoFactorEnabled
                          ? 'bg-green-600 bg-opacity-20 text-green-400'
                          : 'bg-slate-600 bg-opacity-20 text-slate-400'
                      }`}
                    >
                      {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {user.passwordLastChanged && (
                    <div>
                      <div className="text-sm font-semibold text-white">Password Last Changed</div>
                      <div className="text-xs text-slate-400">
                        {format(user.passwordLastChanged, 'MMM dd, yyyy')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h3 className="text-sm font-bold text-white uppercase mb-4">Active Sessions</h3>
                <div className="space-y-3">
                  {mockSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                    >
                      <div>
                        <div className="text-sm text-white">{session.device}</div>
                        <div className="text-xs text-slate-400">
                          {session.location} • {session.ipAddress}
                        </div>
                        <div className="text-xs text-slate-500">
                          Last active: {formatDistanceToNow(session.lastActive, { addSuffix: true })}
                        </div>
                      </div>
                      <button className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded transition-colors">
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'linked' && (
            <div className="text-center text-slate-500 py-12">
              Linked records section coming soon
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Admin Notes</h3>
              <textarea
                defaultValue={user.adminNotes}
                placeholder="Add admin notes about this user..."
                className="w-full h-64 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600"
              />
              <div className="flex justify-end">
                <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors">
                  Save Notes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
