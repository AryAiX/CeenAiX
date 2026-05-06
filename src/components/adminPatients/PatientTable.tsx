import { useState } from 'react';
import { Eye, CreditCard as Edit2, MoreVertical, Copy, ChevronUp, ChevronDown, MapPin } from 'lucide-react';
import { AdminPatient, PatientStatus, RiskLevel } from '../../data/adminPatientsData';

interface PatientTableProps {
  patients: AdminPatient[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onRowClick: (p: AdminPatient) => void;
  onStatusAction: (p: AdminPatient, action: 'flag' | 'suspend' | 'deactivate') => void;
  showToast: (msg: string) => void;
}

const statusBadge: Record<PatientStatus, { bg: string; color: string; label: string }> = {
  active: { bg: 'rgba(5,150,105,0.2)', color: '#6EE7B7', label: '✅ Active' },
  inactive: { bg: 'rgba(51,65,85,0.6)', color: '#94A3B8', label: '⏸ Inactive' },
  flagged: { bg: 'rgba(154,52,18,0.25)', color: '#FDBA74', label: '🚩 Flagged' },
  suspended: { bg: 'rgba(153,27,27,0.25)', color: '#FCA5A5', label: '🔒 Suspended' },
};

const riskBadge: Record<RiskLevel, { bg: string; color: string }> = {
  low: { bg: 'rgba(5,150,105,0.15)', color: '#34D399' },
  medium: { bg: 'rgba(180,83,9,0.2)', color: '#FCD34D' },
  high: { bg: 'rgba(194,65,12,0.2)', color: '#FB923C' },
  critical: { bg: 'rgba(153,27,27,0.25)', color: '#F87171' },
};

const insuranceBadge: Record<string, { bg: string; color: string }> = {
  'Daman Gold': { bg: 'rgba(29,78,216,0.3)', color: '#93C5FD' },
  'Daman Silver': { bg: 'rgba(29,78,216,0.18)', color: '#BFDBFE' },
  'Daman Basic': { bg: '#334155', color: '#94A3B8' },
  'AXA Gulf': { bg: 'rgba(79,70,229,0.25)', color: '#A5B4FC' },
  'ADNIC': { bg: 'rgba(124,58,237,0.25)', color: '#C4B5FD' },
  'Thiqa': { bg: 'rgba(5,150,105,0.2)', color: '#6EE7B7' },
  'Oman Insurance': { bg: 'rgba(37,99,235,0.2)', color: '#93C5FD' },
  'Cash': { bg: '#2D3748', color: '#94A3B8' },
};

const rowBg: Record<PatientStatus, string> = {
  active: '#1E293B',
  inactive: 'rgba(30,41,59,0.55)',
  flagged: 'rgba(154,52,18,0.07)',
  suspended: 'rgba(153,27,27,0.07)',
};

type SortField = 'name' | 'ptId' | 'joined' | 'lastActive' | 'risk' | 'status';

const contextMenuItems = [
  { label: '👁 View Full Profile', action: 'view' },
  { label: '✏️ Edit Account', action: 'edit' },
  { label: '📧 Send Email', action: 'email' },
  { label: '💬 Send Platform Message', action: 'message' },
  { label: '🚩 Flag Account', action: 'flag' },
  { label: '⏸ Deactivate Account', action: 'deactivate' },
  { label: '🔒 Suspend Account', action: 'suspend' },
  { label: '🔄 Reset Password', action: 'reset' },
  { label: '📋 View Audit Log', action: 'audit' },
  { label: '📤 Export Patient Data', action: 'export' },
  { label: '❌ Delete Account', action: 'delete', danger: true },
];

export default function PatientTable({
  patients, selectedIds, onToggleSelect, onRowClick, onStatusAction, showToast,
}: PatientTableProps) {
  const [sortField, setSortField] = useState<SortField>('joined');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp style={{ width: 12, height: 12, opacity: 0.3 }} />;
    return sortDir === 'asc'
      ? <ChevronUp style={{ width: 12, height: 12, color: '#2DD4BF' }} />
      : <ChevronDown style={{ width: 12, height: 12, color: '#2DD4BF' }} />;
  };

  const handleCopy = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).catch(() => {});
    showToast(`✅ ${label} copied to clipboard`);
  };

  const handleContextAction = (action: string, patient: AdminPatient) => {
    setContextMenu(null);
    if (action === 'view') { onRowClick(patient); return; }
    if (action === 'flag') { onStatusAction(patient, 'flag'); return; }
    if (action === 'suspend') { onStatusAction(patient, 'suspend'); return; }
    if (action === 'deactivate') { onStatusAction(patient, 'deactivate'); return; }
    if (action === 'email') { showToast(`📧 Email sent to ${patient.email}`); return; }
    if (action === 'export') { showToast('📤 Exporting patient data...'); return; }
    showToast('✅ Action completed');
  };

  const thStyle = (field?: SortField) => ({
    fontSize: 10, fontFamily: 'Inter, sans-serif', color: sortField === field ? '#2DD4BF' : '#64748B',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    cursor: field ? 'pointer' : 'default', userSelect: 'none' as const,
    padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4,
  });

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(51,65,85,0.5)' }}>
        <div
          className="grid items-center"
          style={{
            background: 'rgba(15,23,42,0.6)',
            height: 44, padding: '0 20px',
            gridTemplateColumns: '40px 220px 90px 110px 130px 100px 90px 100px 80px 90px 80px',
            borderBottom: '1px solid rgba(51,65,85,0.5)',
          }}
        >
          <div />
          <button style={thStyle('name')} onClick={() => handleSort('name')}>Patient <SortIcon field="name" /></button>
          <button style={thStyle('ptId')} onClick={() => handleSort('ptId')}>PT ID <SortIcon field="ptId" /></button>
          <div style={thStyle()}>Emirates ID</div>
          <div style={thStyle()}>Insurance</div>
          <div style={thStyle()}>Location</div>
          <button style={thStyle('joined')} onClick={() => handleSort('joined')}>Joined <SortIcon field="joined" /></button>
          <button style={thStyle('lastActive')} onClick={() => handleSort('lastActive')}>Last Active <SortIcon field="lastActive" /></button>
          <button style={thStyle('risk')} onClick={() => handleSort('risk')}>Risk <SortIcon field="risk" /></button>
          <button style={thStyle('status')} onClick={() => handleSort('status')}>Status <SortIcon field="status" /></button>
          <div style={thStyle()}>Actions</div>
        </div>

        {patients.map((p, i) => {
          const isSelected = selectedIds.has(p.id);
          const sb = statusBadge[p.status];
          const rb = riskBadge[p.risk];
          const ib = insuranceBadge[p.insurance] || { bg: '#334155', color: '#94A3B8' };
          return (
            <div
              key={p.id}
              onClick={() => onRowClick(p)}
              className="grid items-center cursor-pointer transition-all duration-100"
              style={{
                height: 64, padding: '0 20px',
                background: isSelected ? 'rgba(13,148,136,0.08)' : rowBg[p.status],
                borderBottom: i < patients.length - 1 ? '1px solid rgba(51,65,85,0.35)' : 'none',
                borderLeft: isSelected ? '2px solid #0D9488' : '2px solid transparent',
                gridTemplateColumns: '40px 220px 90px 110px 130px 100px 90px 100px 80px 90px 80px',
                opacity: p.status === 'inactive' ? 0.75 : 1,
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.25)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? 'rgba(13,148,136,0.08)' : rowBg[p.status]; }}
            >
              <div onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(p.id)}
                  style={{ accentColor: '#0D9488', width: 15, height: 15 }}
                />
              </div>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: p.avatarGradient, fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {p.initials}
                  </div>
                  <div
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                    style={{
                      borderColor: '#1E293B',
                      background: p.status === 'active' ? '#34D399' : p.status === 'suspended' ? '#F87171' : p.status === 'flagged' ? '#FB923C' : '#64748B',
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-semibold truncate" style={{ fontSize: 13, color: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
                      {p.name}
                    </span>
                    {p.isPremium && <span style={{ fontSize: 9, background: 'rgba(180,83,9,0.2)', color: '#FCD34D', borderRadius: 4, padding: '1px 5px' }}>⭐ Premium</span>}
                    {p.status === 'flagged' && <span style={{ fontSize: 9, background: 'rgba(154,52,18,0.2)', color: '#FB923C', borderRadius: 4, padding: '1px 5px' }}>🚩</span>}
                    {p.status === 'suspended' && <span style={{ fontSize: 9, background: 'rgba(153,27,27,0.2)', color: '#F87171', borderRadius: 4, padding: '1px 5px' }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'DM Mono, monospace' }}>
                    {p.age}{p.gender} · {p.bloodType}
                  </div>
                </div>
              </div>

              <div
                className="flex items-center gap-1 group"
                style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#2DD4BF', fontWeight: 700 }}
              >
                {p.ptId}
                <button
                  onClick={e => handleCopy(p.ptId, 'PT ID', e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Copy style={{ width: 11, height: 11, color: '#64748B' }} />
                </button>
              </div>

              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>
                {p.emiratesId.split('-').map((seg, i, arr) =>
                  i === 0 || i === arr.length - 1 ? seg : '●'.repeat(seg.length)
                ).join('-')}
              </div>

              <div>
                <div
                  className="inline-flex items-center px-2 py-0.5 rounded-md"
                  style={{ background: ib.bg, color: ib.color, fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
                >
                  {p.insurance}
                </div>
                <div style={{ fontSize: 9, color: '#475569', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                  {p.policyNumber.slice(0, 12)}…
                </div>
              </div>

              <div className="flex items-center gap-1">
                <MapPin style={{ width: 11, height: 11, color: '#64748B' }} />
                <span style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}>{p.location}</span>
              </div>

              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>{p.joined}</div>

              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: p.lastActiveColor }}>
                {p.lastActiveRelative}
              </div>

              <div>
                <span
                  className="px-2 py-0.5 rounded-md font-bold uppercase"
                  style={{
                    fontSize: 10, fontFamily: 'Inter, sans-serif',
                    background: rb.bg, color: rb.color,
                    animation: p.risk === 'critical' ? 'pulse 2s infinite' : undefined,
                  }}
                >
                  {p.risk}
                </span>
              </div>

              <div>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: sb.bg, color: sb.color, fontSize: 10 }}
                >
                  {sb.label}
                </span>
              </div>

              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100"
                onClick={e => e.stopPropagation()}
                style={{ opacity: 1 }}
              >
                <button
                  onClick={e => { e.stopPropagation(); onRowClick(p); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(51,65,85,0.5)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.9)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(51,65,85,0.5)'}
                >
                  <Eye style={{ width: 13, height: 13, color: '#94A3B8' }} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); showToast('✏️ Edit patient (coming soon)'); }}
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
                    setContextMenu(contextMenu?.id === p.id ? null : { id: p.id, x: rect.left, y: rect.bottom + 4 });
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
          <div
            className="fixed z-50 rounded-xl shadow-2xl overflow-hidden"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 220),
              top: Math.min(contextMenu.y, window.innerHeight - 320),
              width: 210, background: '#1E293B', border: '1px solid #334155',
            }}
          >
            {contextMenuItems.map((item, i) => {
              const patient = patients.find(p => p.id === contextMenu.id)!;
              if (i === contextMenuItems.length - 1) {
                return (
                  <div key={item.action}>
                    <div style={{ height: 1, background: '#334155', margin: '4px 0' }} />
                    <button
                      onClick={() => { setContextMenu(null); showToast('⚠️ Delete requires confirmation'); }}
                      className="w-full text-left px-4 py-2.5 transition-colors"
                      style={{ fontSize: 12, color: '#F87171', fontFamily: 'Inter, sans-serif' }}
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
                  onClick={() => handleContextAction(item.action, patient)}
                  className="w-full text-left px-4 py-2.5 transition-colors"
                  style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'Inter, sans-serif' }}
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
