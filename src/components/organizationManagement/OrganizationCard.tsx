import { Building2, Users, Activity, Database, Eye, CreditCard as Edit, Ban, CreditCard, FileText } from 'lucide-react';
import { Organization } from '../../types/organizationManagement';

interface OrganizationCardProps {
  organization: Organization;
  onView: () => void;
}

export default function OrganizationCard({ organization, onView }: OrganizationCardProps) {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'hospital':
        return 'bg-teal-600 bg-opacity-20 border-teal-600 text-teal-400';
      case 'clinic':
        return 'bg-amber-600 bg-opacity-20 border-amber-600 text-amber-400';
      case 'pharmacy':
        return 'bg-violet-600 bg-opacity-20 border-violet-600 text-violet-400';
      case 'laboratory':
        return 'bg-slate-600 bg-opacity-20 border-slate-600 text-slate-400';
      default:
        return 'bg-slate-600 bg-opacity-20 border-slate-600 text-slate-400';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600 bg-opacity-20 border-green-600 text-green-400';
      case 'pending_approval':
        return 'bg-amber-600 bg-opacity-20 border-amber-600 text-amber-400';
      case 'suspended':
        return 'bg-rose-600 bg-opacity-20 border-rose-600 text-rose-400';
      case 'onboarding':
        return 'bg-blue-600 bg-opacity-20 border-blue-600 text-blue-400';
      default:
        return 'bg-slate-600 bg-opacity-20 border-slate-600 text-slate-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending_approval':
        return 'Pending Approval';
      case 'suspended':
        return 'Suspended';
      case 'onboarding':
        return 'Onboarding';
      default:
        return status;
    }
  };

  const getNabidhStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-400';
      case 'disconnected':
        return 'text-slate-500';
      case 'error':
        return 'text-rose-400';
      default:
        return 'text-slate-500';
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-teal-600 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-6 h-6 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white mb-1">{organization.name}</h3>
          <div className="text-xs text-slate-400 font-mono">{organization.dhaLicense}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-1 rounded text-xs font-bold border ${getTypeBadgeColor(organization.type)}`}>
          {organization.type.charAt(0).toUpperCase() + organization.type.slice(1)}
        </span>
        <span className="px-2 py-1 bg-slate-700 rounded text-xs font-bold text-slate-400">
          {organization.emirate}
        </span>
        <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusBadgeColor(organization.status)}`}>
          {getStatusLabel(organization.status)}
        </span>
      </div>

      <div className="space-y-2 mb-4 pb-4 border-b border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users className="w-3 h-3" />
            <span>Active Users</span>
          </div>
          <span className="font-bold text-white">{organization.stats.activeUsers}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity className="w-3 h-3" />
            <span>Monthly Trans.</span>
          </div>
          <span className="font-bold text-white">{organization.stats.monthlyTransactions.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Database className="w-3 h-3" />
            <span>NABIDH Status</span>
          </div>
          <span className={`font-bold ${getNabidhStatusColor(organization.stats.nabidhSyncStatus)}`}>
            {organization.stats.nabidhSyncStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onView}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded transition-colors"
        >
          <Eye className="w-3 h-3" />
          View
        </button>
        <button className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors">
          <Edit className="w-3 h-3" />
          Edit
        </button>
        <button className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors">
          <CreditCard className="w-3 h-3" />
          Billing
        </button>
        <button className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors">
          <FileText className="w-3 h-3" />
          Audit
        </button>
      </div>
    </div>
  );
}
