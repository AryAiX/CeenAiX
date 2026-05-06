import React from 'react';
import { FlaskConical, ScanLine, AlertTriangle, Clock, Upload, CheckSquare, Activity, FileText, Cpu } from 'lucide-react';

const KpiCard: React.FC<{
  value: string | number;
  label: string;
  sub: string;
  accent: string;
  icon: React.FC<{ style?: React.CSSProperties }>;
  pulse?: boolean;
  warn?: boolean;
}> = ({ value, label, sub, accent, icon: Icon, pulse, warn }) => (
  <div className="flex-1 rounded-xl p-3.5 relative overflow-hidden"
    style={{ background: '#fff', border: `1px solid #E2E8F0`, borderLeft: `3px solid ${accent}` }}>
    <div className="flex items-start justify-between mb-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
        <Icon style={{ width: 14, height: 14, color: accent }} />
      </div>
      {pulse && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />}
    </div>
    <div className="font-black leading-none mb-0.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, color: warn ? '#EF4444' : accent }}>
      {value}
    </div>
    <div className="font-semibold text-slate-700" style={{ fontSize: 11 }}>{label}</div>
    <div className="text-slate-400" style={{ fontSize: 10, marginTop: 1 }}>{sub}</div>
  </div>
);

export const LabKpiRow: React.FC = () => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <FlaskConical style={{ width: 13, height: 13, color: '#4F46E5' }} />
      <span className="font-bold text-indigo-700" style={{ fontSize: 11, fontFamily: 'Plus Jakarta Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Laboratory</span>
    </div>
    <div className="flex gap-3">
      <KpiCard value={234}   label="Samples"       sub="All departments"          accent="#4F46E5" icon={FlaskConical} />
      <KpiCard value={7}     label="Critical"       sub="1 unnotified"             accent="#EF4444" icon={AlertTriangle} pulse warn />
      <KpiCard value="3.2h"  label="Avg TAT"        sub="Target 4h"               accent="#4F46E5" icon={Clock} />
      <KpiCard value="42/47" label="NABIDH"         sub="5 pending"               accent="#8B5CF6" icon={Upload} />
      <KpiCard value="4/5"   label="QC Pass"        sub="1 in maintenance"        accent="#F59E0B" icon={CheckSquare} />
    </div>
  </div>
);

export const RadKpiRow: React.FC = () => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <ScanLine style={{ width: 13, height: 13, color: '#1D4ED8' }} />
      <span className="font-bold text-blue-700" style={{ fontSize: 11, fontFamily: 'Plus Jakarta Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Radiology</span>
    </div>
    <div className="flex gap-3">
      <KpiCard value={47}    label="Studies"        sub="All modalities"          accent="#1D4ED8" icon={ScanLine} />
      <KpiCard value={3}     label="Scanning Now"   sub="MRI + CT + USS"          accent="#8B5CF6" icon={Activity} pulse />
      <KpiCard value={9}     label="Reports Pending" sub="9 awaiting sign-off"   accent="#F59E0B" icon={FileText} />
      <KpiCard value={7}     label="Scheduled"      sub="Next: 2:30 PM"          accent="#1D4ED8" icon={Clock} />
      <KpiCard value={2}     label="Equipment Issues" sub="1 scanner, 1 QA"     accent="#EF4444" icon={Cpu} warn />
    </div>
  </div>
);
