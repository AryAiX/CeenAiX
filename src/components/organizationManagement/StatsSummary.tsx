import { Building2, Guitar as Hospital, Stethoscope, TestTube2 } from 'lucide-react';
import { OrganizationStats } from '../../types/organizationManagement';

interface StatsSummaryProps {
  stats: OrganizationStats;
}

export default function StatsSummary({ stats }: StatsSummaryProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex items-center gap-2 px-4 py-2 bg-teal-600 bg-opacity-20 border border-teal-600 rounded-lg">
        <Hospital className="w-4 h-4 text-teal-400" />
        <span className="text-xs font-bold text-slate-400">Hospitals:</span>
        <span className="text-sm font-bold text-white">{stats.hospitals}</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-600 bg-opacity-20 border border-amber-600 rounded-lg">
        <Stethoscope className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold text-slate-400">Clinics:</span>
        <span className="text-sm font-bold text-white">{stats.clinics}</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-violet-600 bg-opacity-20 border border-violet-600 rounded-lg">
        <Building2 className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-bold text-slate-400">Pharmacies:</span>
        <span className="text-sm font-bold text-white">{stats.pharmacies}</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-600 bg-opacity-20 border border-slate-600 rounded-lg">
        <TestTube2 className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-400">Labs:</span>
        <span className="text-sm font-bold text-white">{stats.laboratories}</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg ml-2">
        <span className="text-xs font-bold text-slate-400">Total Organizations:</span>
        <span className="text-lg font-bold text-white">{stats.total}</span>
      </div>
    </div>
  );
}
