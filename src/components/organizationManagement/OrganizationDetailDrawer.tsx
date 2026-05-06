import { X } from 'lucide-react';
import { useState } from 'react';
import { Organization } from '../../types/organizationManagement';
import OverviewTab from './tabs/OverviewTab';
import UsersTab from './tabs/UsersTab';
import PortalsAccessTab from './tabs/PortalsAccessTab';
import ComplianceTab from './tabs/ComplianceTab';

interface OrganizationDetailDrawerProps {
  organization: Organization;
  onClose: () => void;
}

type TabId = 'overview' | 'users' | 'portals' | 'billing' | 'integration' | 'compliance' | 'audit';

export default function OrganizationDetailDrawer({
  organization,
  onClose,
}: OrganizationDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'portals', label: 'Portals Access' },
    { id: 'billing', label: 'Billing' },
    { id: 'integration', label: 'Integration' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'audit', label: 'Audit Log' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
      <div className="w-full max-w-4xl h-full bg-slate-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">{organization.name}</h2>
            <div className="text-sm text-slate-400 font-mono">{organization.dhaLicense}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && <OverviewTab organization={organization} />}
          {activeTab === 'users' && <UsersTab organization={organization} />}
          {activeTab === 'portals' && <PortalsAccessTab organization={organization} />}
          {activeTab === 'compliance' && <ComplianceTab organization={organization} />}
          {activeTab === 'billing' && (
            <div className="text-center text-slate-500 py-12">
              Billing tab coming soon
            </div>
          )}
          {activeTab === 'integration' && (
            <div className="text-center text-slate-500 py-12">
              Integration tab coming soon
            </div>
          )}
          {activeTab === 'audit' && (
            <div className="text-center text-slate-500 py-12">
              Audit log tab coming soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
