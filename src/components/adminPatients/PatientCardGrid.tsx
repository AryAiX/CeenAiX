import { Eye, CreditCard as Edit2, MoreVertical } from 'lucide-react';
import { AdminPatient, PatientStatus, RiskLevel } from '../../data/adminPatientsData';

interface PatientCardGridProps {
  patients: AdminPatient[];
  onRowClick: (p: AdminPatient) => void;
  showToast: (msg: string) => void;
}

const statusStrip: Record<PatientStatus, string> = {
  active: '#34D399', inactive: '#64748B', flagged: '#FB923C', suspended: '#F87171',
};
const riskColor: Record<RiskLevel, string> = {
  low: '#34D399', medium: '#FCD34D', high: '#FB923C', critical: '#F87171',
};
const insuranceBg: Record<string, string> = {
  'Daman Gold': 'rgba(29,78,216,0.25)', 'Daman Silver': 'rgba(29,78,216,0.15)',
  'Daman Basic': '#334155', 'AXA Gulf': 'rgba(79,70,229,0.2)',
  'ADNIC': 'rgba(124,58,237,0.2)', 'Thiqa': 'rgba(5,150,105,0.15)',
  'Oman Insurance': 'rgba(37,99,235,0.15)', 'Cash': '#2D3748',
};

export default function PatientCardGrid({ patients, onRowClick, showToast }: PatientCardGridProps) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
      {patients.map(p => (
        <div
          key={p.id}
          onClick={() => onRowClick(p)}
          className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
          style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.border = '1px solid rgba(13,148,136,0.35)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(13,148,136,0.08)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.border = '1px solid rgba(51,65,85,0.5)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            (e.currentTarget as HTMLElement).style.transform = 'none';
          }}
        >
          <div style={{ height: 4, background: statusStrip[p.status] }} />
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: p.avatarGradient, fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  {p.initials}
                </div>
                <div
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                  style={{
                    borderColor: '#1E293B',
                    background: p.status === 'active' ? '#34D399' : p.status === 'suspended' ? '#F87171' : p.status === 'flagged' ? '#FB923C' : '#64748B',
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="font-bold truncate" style={{ fontSize: 13, color: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.name}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#2DD4BF' }}>{p.ptId}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>{p.age}{p.gender} · {p.bloodType}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="px-2 py-0.5 rounded-md font-semibold"
                style={{ fontSize: 10, background: insuranceBg[p.insurance] || '#334155', color: '#94A3B8' }}
              >
                {p.insurance}
              </span>
              <span
                className="px-2 py-0.5 rounded-md font-bold uppercase"
                style={{ fontSize: 10, background: 'rgba(30,41,59,0.8)', color: riskColor[p.risk] }}
              >
                {p.risk}
              </span>
            </div>

            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>
              Last active: {p.lastActiveRelative}
            </div>
          </div>

          <div
            className="flex items-center justify-end gap-1 px-4 pb-3"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => onRowClick(p)}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }}
            >
              <Eye style={{ width: 13, height: 13 }} />
            </button>
            <button
              onClick={() => showToast('✏️ Edit patient (coming soon)')}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }}
            >
              <Edit2 style={{ width: 13, height: 13 }} />
            </button>
            <button
              onClick={() => showToast('⋮ More actions (coming soon)')}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(51,65,85,0.5)', color: '#94A3B8' }}
            >
              <MoreVertical style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
