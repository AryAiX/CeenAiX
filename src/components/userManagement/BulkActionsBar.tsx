import { CheckCircle, Ban, Key, Download, Building2, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onActivate: () => void;
  onSuspend: () => void;
  onResetPassword: () => void;
  onExportSelected: () => void;
  onAssignOrganization: () => void;
  onClearSelection: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  onActivate,
  onSuspend,
  onResetPassword,
  onExportSelected,
  onAssignOrganization,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-teal-900 bg-opacity-30 border-b border-teal-600 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{selectedCount} users selected</span>
            <button
              onClick={onClearSelection}
              className="p-1 hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="h-5 w-px bg-slate-700"></div>
          <div className="flex items-center gap-2">
            <button
              onClick={onActivate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Activate
            </button>
            <button
              onClick={onSuspend}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              Suspend
            </button>
            <button
              onClick={onResetPassword}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              Reset Password
            </button>
            <button
              onClick={onExportSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export Selected
            </button>
            <button
              onClick={onAssignOrganization}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              Assign to Organization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
