import { Bell, Search, ChevronDown } from 'lucide-react';

interface ClinicTopBarProps {
  title: string;
  subtitle?: string;
}

export default function ClinicTopBar({ title, subtitle }: ClinicTopBarProps) {
  return (
    <div className="h-[64px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="font-bold text-slate-900 text-lg leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search…"
            className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-52"
          />
        </div>
        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={18} className="text-slate-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">AN</div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">Admin User</div>
            <div className="text-[10px] text-slate-400">Clinic Manager</div>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}
