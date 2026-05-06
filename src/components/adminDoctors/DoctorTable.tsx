import { useState } from 'react';
import { Eye, CreditCard as Edit2, MoreVertical, Copy, ChevronUp, ChevronDown, Star, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { AdminDoctor } from '../../data/adminDoctorsData';

interface DoctorTableProps {
  doctors: AdminDoctor[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onRowClick: (d: AdminDoctor) => void;
  onApprove?: (d: AdminDoctor) => void;
  onReject?: (d: AdminDoctor) => void;
  showToast: (msg: string) => void;
}

const specialtyColors: Record<string, { bg: string; color: string }> = {
  'Cardiology': { bg: 'rgba(37,99,235,0.2)', color: '#93C5FD' },
  'General Practice': { bg: 'rgba(13,148,136,0.2)', color: '#5EEAD4' },
  'Dermatology': { bg: 'rgba(124,58,237,0.2)', color: '#C4B5FD' },
  'Orthopedics': { bg: 'rgba(5,150,105,0.2)', color: '#6EE7B7' },
  'Pediatrics': { bg: 'rgba(245,158,11,0.2)', color: '#FDE68A' },
  'Psychiatry': { bg: 'rgba(124,58,237,0.15)', color: '#A78BFA' },
  'Endocrinology': { bg: 'rgba(79,70,229,0.25)', color: '#A5B4FC' },
  'Neurology': { bg: 'rgba(124,58,237,0.25)', color: '#C4B5FD' },
  'Radiology': { bg: 'rgba(79,70,229,0.25)', color: '#A5B4FC' },
  'Pulmonology': { bg: 'rgba(37,99,235,0.2)', color: '#93C5FD' },
};

const verificationBadge = {
  verified: { bg: 'rgba(5,150,105,0.15)', color: '#34D399', label: '✅ DHA Verified' },
  pending: { bg: 'rgba(180,83,9,0.15)', color: '#FCD34D', label: '⏳ Pending' },
  reviewing: { bg: 'rgba(37,99,235,0.15)', color: '#93C5FD', label: '🔍 Reviewing' },
  rejected: { bg: 'rgba(153,27,27,0.2)', color: '#FCA5A5', label: '❌ Rejected' },
  incomplete: { bg: 'rgba(180,83,9,0.15)', color: '#FCD34D', label: '⚠️ Incomplete' },
  mismatch: { bg: 'rgba(153,27,27,0.2)', color: '#FCA5A5', label: '❌ Mismatch' },
};

const accountStatusBadge = {
  active: { bg: 'rgba(5,150,105,0.2)', color: '#6EE7B7', label: '✅ Verified' },
  inactive: { bg: '#334155', color: '#94A3B8', label: '⏸ Inactive' },
  expiring: { bg: 'rgba(154,52,18,0.2)', color: '#FDBA74', label: '⚠️ Expiring' },
  expired: { bg: 'rgba(153,27,27,0.25)', color: '#FCA5A5', label: '🔒 Expired' },
  flagged: { bg: 'rgba(154,52,18,0.25)', color: '#FDBA74', label: '🚩 Flagged' },
  suspended: { bg: 'rgba(153,27,27,0.3)', color: '#FCA5A5', label: '⛔ Suspended' },
};

const rowBgMap: Record<string, string> = {
  active: '#1E293B',
  inactive: 'rgba(30,41,59,0.55)',
  expiring: 'rgba(154,52,18,0.06)',
  expired: 'rgba(153,27,27,0.08)',
  flagged: 'rgba(154,52,18,0.08)',
  suspended: 'rgba(153,27,27,0.1)',
};

const dotColor: Record<string, string> = {
  active: '#34D399', inactive: '#64748B', expiring: '#FB923C',
  expired: '#F87171', flagged: '#FB923C', suspended: '#F87171',
  pending: '#FCD34D',
};

const contextMenuItems = [
  { label: '👁 View Full Profile', action: 'view' },
  { label: '✏️ Edit Account', action: 'edit' },
  { label: '🛡️ View DHA License', action: 'dha' },
  { label: '📧 Send Email', action: 'email' },
  { label: '💬 Send Platform Message', action: 'message' },
  { label: '🔔 Send License Renewal Reminder', action: 'remind' },
  { label: '✅ Approve', action: 'approve' },
  { label: '❌ Reject', action: 'reject' },
  { label: '🚩 Flag Account', action: 'flag' },
  { label: '⏸ Deactivate Account', action: 'deactivate' },
  { label: '⛔ Suspend Account', action: 'suspend' },
  { label: '📋 View Audit Log', action: 'audit' },
  { label: '📤 Export Doctor Data', action: 'export' },
  { label: '❌ Remove from Platform', action: 'remove', danger: true },
];

export default function DoctorTable({ doctors, selectedIds, onToggleSelect, onRowClick, onApprove, onReject, showToast }: DoctorTableProps) {
  const [sortField, setSortField] = useState<string>('consultationsTotal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronUp style={{ width: 12, height: 12, opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp style={{ width: 12, height: 12, color: '#2DD4BF' }} /> : <ChevronDown style={{ width: 12, height: 12, color: '#2DD4BF' }} />;
  };

  const thStyle = (field?: string) => ({
    fontSize: 10, fontFamily: 'Inter, sans-serif', color: field && sortField === field ? '#2DD4BF' : '#64748B',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    cursor: field ? 'pointer' : 'default', userSelect: 'none' as const,
    padding: '0 8px', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' as const,
  });

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
        <div
          className="grid items-center"
          style={{
            background: 'rgba(15,23,42,0.6)', height: 44, padding: '0 20px',
            gridTemplateColumns: '40px 210px 150px 130px 160px 90px 80px 110px 110px 80px',
            borderBottom: '1px solid rgba(51,65,85,0.5)',
          }}
        >
          <div />
          <button style={thStyle('name')} onClick={() => handleSort('name')}>Doctor <SortIcon field="name" /></button>
          <div style={thStyle()}>DHA License</div>
          <button style={thStyle('specialty')} onClick={() => handleSort('specialty')}>Specialty <SortIcon field="specialty" /></button>
          <div style={thStyle()}>Clinic</div>
          <button style={thStyle('consultationsTotal')} onClick={() => handleSort('consultationsTotal')}>Consults <SortIcon field="consultationsTotal" /></button>
          <button style={thStyle('rating')} onClick={() => handleSort('rating')}>Rating <SortIcon field="rating" /></button>
          <button style={thStyle('daysUntilExpiry')} onClick={() => handleSort('daysUntilExpiry')}>Expiry <SortIcon field="daysUntilExpiry" /></button>
          <div style={thStyle()}>Status</div>
          <div style={thStyle()}>Actions</div>
        </div>

        {doctors.map((d, i) => {
          const isSelected = selectedIds.has(d.id);
          const statusKey = d.verificationStatus === 'pending' ? 'pending' : d.accountStatus;
          const rowBg = rowBgMap[d.accountStatus] || '#1E293B';
          const dot = d.verificationStatus === 'pending' ? dotColor.pending : dotColor[d.accountStatus] || '#64748B';
          const vBadge = verificationBadge[d.verificationStatus];
          const aBadge = accountStatusBadge[d.accountStatus];
          const spColor = specialtyColors[d.specialty] || { bg: '#334155', color: '#94A3B8' };

          const expiryColor = d.daysUntilExpiry < 0 ? '#F87171' : d.daysUntilExpiry <= 30 ? '#FB923C' : d.daysUntilExpiry <= 90 ? '#FCD34D' : '#94A3B8';
          const expiryLabel = d.daysUntilExpiry < 0 ? `EXPIRED` : d.daysUntilExpiry <= 30 ? `${d.daysUntilExpiry} DAYS` : `${d.daysUntilExpiry} days`;

          return (
            <div
              key={d.id}
              onClick={() => onRowClick(d)}
              className="grid items-center cursor-pointer transition-all duration-100"
              style={{
                height: 68, padding: '0 20px',
                background: isSelected ? 'rgba(13,148,136,0.08)' : rowBg,
                borderBottom: i < doctors.length - 1 ? '1px solid rgba(51,65,85,0.35)' : 'none',
                borderLeft: isSelected ? '2px solid #0D9488' : '2px solid transparent',
                gridTemplateColumns: '40px 210px 150px 130px 160px 90px 80px 110px 110px 80px',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.25)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? 'rgba(13,148,136,0.08)' : rowBg; }}
            >
              <div onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(d.id)} style={{ accentColor: '#0D9488', width: 15, height: 15 }} />
              </div>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold" style={{ background: d.avatarGradient, fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {d.initials}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: rowBg, background: dot }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-semibold truncate" style={{ fontSize: 13, color: '#F1F5F9' }}>{d.name}</span>
                    {d.isTopRated && <span style={{ fontSize: 9, background: 'rgba(180,83,9,0.2)', color: '#FCD34D', borderRadius: 4, padding: '1px 5px' }}>⭐ Top</span>}
                    {d.isPlatformTeam && <span style={{ fontSize: 9, background: 'rgba(13,148,136,0.2)', color: '#5EEAD4', borderRadius: 4, padding: '1px 5px' }}>⭐ Team</span>}
                    {d.accountStatus === 'flagged' && <span style={{ fontSize: 9, background: 'rgba(154,52,18,0.2)', color: '#FB923C', borderRadius: 4, padding: '1px 5px' }}>🚩</span>}
                    {d.accountStatus === 'suspended' && <span style={{ fontSize: 9, background: 'rgba(153,27,27,0.2)', color: '#F87171', borderRadius: 4, padding: '1px 5px' }}>⛔</span>}
                    {d.daysUntilExpiry > 0 && d.daysUntilExpiry <= 30 && <span style={{ fontSize: 9, background: 'rgba(154,52,18,0.2)', color: '#FB923C', borderRadius: 4, padding: '1px 5px' }}>⚠️ Expiring</span>}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'DM Mono, monospace' }}>
                    {d.age}{d.gender} · {d.nationalityFlag}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div
                  className="flex items-center gap-1 group"
                  style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#2DD4BF', fontWeight: 700 }}
                >
                  {d.dhaLicense.length > 18 ? d.dhaLicense.slice(0, 18) + '…' : d.dhaLicense}
                  <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(d.dhaLicense).catch(() => {}); showToast('✅ DHA License copied'); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy style={{ width: 10, height: 10, color: '#64748B' }} />
                  </button>
                </div>
                <span className="inline-flex px-2 py-0.5 rounded-md self-start" style={{ background: vBadge.bg, color: vBadge.color, fontSize: 9, fontWeight: 700 }}>
                  {vBadge.label}
                </span>
              </div>

              <div>
                <span className="px-2 py-0.5 rounded-md font-semibold" style={{ background: spColor.bg, color: spColor.color, fontSize: 10 }}>
                  {d.specialty}
                </span>
                {d.subSpecialty && <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{d.subSpecialty}</div>}
              </div>

              <div>
                <div className="truncate" style={{ fontSize: 12, color: '#CBD5E1' }}>{d.clinicPrimary}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin style={{ width: 10, height: 10, color: '#64748B' }} />
                  <span style={{ fontSize: 10, color: '#64748B' }}>{d.location}</span>
                </div>
              </div>

              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>
                  {d.consultationsTotal.toLocaleString()}
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#2DD4BF' }}>
                  {d.consultationsToday != null ? `${d.consultationsToday} today` : `${d.consultationsMonth}/mo`}
                </div>
              </div>

              <div>
                {d.rating > 0 ? (
                  <>
                    <div className="flex items-center gap-1">
                      <Star style={{ width: 12, height: 12, color: '#FCD34D' }} />
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: '#FDE68A' }}>{d.rating.toFixed(1)}</span>
                    </div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#64748B' }}>({d.ratingCount})</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: '#475569' }}>—</div>
                )}
              </div>

              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: d.daysUntilExpiry < 0 ? '#F87171' : '#CBD5E1' }}>
                  {d.licenseExpiry}
                </div>
                <div
                  style={{
                    fontFamily: 'DM Mono, monospace', fontSize: 10, color: expiryColor, fontWeight: 700,
                    animation: d.daysUntilExpiry <= 30 ? 'pulse 2s infinite' : undefined,
                  }}
                >
                  {expiryLabel}
                </div>
                {d.renewalStatus && (
                  <div style={{ fontSize: 9, color: d.renewalStatus.includes('✅') ? '#34D399' : '#FB923C', marginTop: 1 }}>
                    {d.renewalStatus.slice(0, 20)}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="px-2 py-0.5 rounded-full self-start font-semibold" style={{ background: aBadge.bg, color: aBadge.color, fontSize: 10 }}>
                  {aBadge.label}
                </span>
                {d.verificationStatus === 'pending' && (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onApprove?.(d)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(5,150,105,0.2)', color: '#6EE7B7', fontSize: 9, fontWeight: 700 }}
                    >
                      <CheckCircle style={{ width: 9, height: 9 }} /> OK
                    </button>
                    <button
                      onClick={() => onReject?.(d)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(153,27,27,0.2)', color: '#FCA5A5', fontSize: 9, fontWeight: 700 }}
                    >
                      <XCircle style={{ width: 9, height: 9 }} /> Reject
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={e => { e.stopPropagation(); onRowClick(d); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(51,65,85,0.5)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.9)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.5)'}
                >
                  <Eye style={{ width: 13, height: 13, color: '#94A3B8' }} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); showToast('✏️ Edit doctor (coming soon)'); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(51,65,85,0.5)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.9)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.5)'}
                >
                  <Edit2 style={{ width: 13, height: 13, color: '#94A3B8' }} />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setContextMenu(contextMenu?.id === d.id ? null : { id: d.id, x: rect.left, y: rect.bottom + 4 });
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(51,65,85,0.5)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.9)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.5)'}
                >
                  <MoreVertical style={{ width: 13, height: 13, color: '#94A3B8' }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 rounded-xl shadow-2xl overflow-hidden" style={{ left: Math.min(contextMenu.x, window.innerWidth - 230), top: Math.min(contextMenu.y, window.innerHeight - 360), width: 220, background: '#1E293B', border: '1px solid #334155' }}>
            {contextMenuItems.map((item, idx) => {
              const doctor = doctors.find(d => d.id === contextMenu.id)!;
              if (item.danger) {
                return (
                  <div key={item.action}>
                    <div style={{ height: 1, background: '#334155', margin: '4px 0' }} />
                    <button
                      onClick={() => { setContextMenu(null); showToast('⚠️ Remove requires confirmation'); }}
                      className="w-full text-left px-4 py-2.5 transition-colors"
                      style={{ fontSize: 12, color: '#F87171' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(153,27,27,0.2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      {item.label}
                    </button>
                  </div>
                );
              }
              return (
                <button
                  key={item.action}
                  onClick={() => {
                    setContextMenu(null);
                    if (item.action === 'view') onRowClick(doctor);
                    else if (item.action === 'approve') onApprove?.(doctor);
                    else if (item.action === 'reject') onReject?.(doctor);
                    else if (item.action === 'remind') showToast(`🔔 Reminder sent to ${doctor.name}`);
                    else if (item.action === 'email') showToast(`📧 Email sent to ${doctor.email}`);
                    else showToast('✅ Action completed');
                  }}
                  className="w-full text-left px-4 py-2.5 transition-colors"
                  style={{ fontSize: 12, color: '#CBD5E1' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.5)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
