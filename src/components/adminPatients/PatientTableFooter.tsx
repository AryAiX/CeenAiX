import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PatientTableFooterProps {
  totalCount: number;
  page: number;
  perPage: number;
  onPageChange: (p: number) => void;
  selectedCount: number;
  onBulkAction: (action: string) => void;
  onDeselectAll: () => void;
}

export default function PatientTableFooter({
  totalCount, page, perPage, onPageChange,
  selectedCount, onBulkAction, onDeselectAll,
}: PatientTableFooterProps) {
  const totalPages = Math.ceil(totalCount / perPage);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, totalCount);

  const pages = () => {
    const arr: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
      if (page < totalPages - 2) arr.push('...');
      arr.push(totalPages);
    }
    return arr;
  };

  return (
    <div className="mt-4">
      {selectedCount > 0 && (
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-xl mb-3 shadow-xl"
          style={{ background: '#334155', border: '1px solid #475569', animation: 'slideUp 0.2s ease-out' }}
        >
          <span style={{ fontSize: 13, color: '#F1F5F9', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            {selectedCount} patient{selectedCount > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-4">
            {[
              { label: '📧 Send Email', action: 'email', bg: 'rgba(51,65,85,0.8)' },
              { label: '💬 Platform Message', action: 'message', bg: 'rgba(51,65,85,0.8)' },
              { label: '🚩 Flag Selected', action: 'flag', bg: 'rgba(154,52,18,0.3)', color: '#FB923C' },
              { label: '⏸ Deactivate', action: 'deactivate', bg: 'rgba(51,65,85,0.8)' },
              { label: '📤 Export', action: 'export', bg: 'rgba(51,65,85,0.8)' },
              { label: '❌ Delete Selected', action: 'delete', bg: 'rgba(153,27,27,0.3)', color: '#F87171' },
            ].map(btn => (
              <button
                key={btn.action}
                onClick={() => onBulkAction(btn.action)}
                className="px-3 py-1.5 rounded-lg transition-colors"
                style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', background: btn.bg, color: btn.color || '#CBD5E1', border: '1px solid rgba(71,85,105,0.5)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <button
            onClick={onDeselectAll}
            className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
            style={{ fontSize: 11 }}
          >
            ✕ Deselect All
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
          Showing {from.toLocaleString()}–{to.toLocaleString()} of {totalCount.toLocaleString()} patients
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => page > 1 && onPageChange(page - 1)}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: '#1E293B', border: '1px solid #334155',
              color: page === 1 ? '#334155' : '#94A3B8', cursor: page === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>
          {pages().map((p, i) => (
            p === '...' ? (
              <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#475569', fontSize: 12 }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className="w-8 h-8 rounded-lg transition-colors"
                style={{
                  background: page === p ? '#0D9488' : '#1E293B',
                  border: `1px solid ${page === p ? '#0D9488' : '#334155'}`,
                  color: page === p ? '#fff' : '#94A3B8',
                  fontSize: 12, fontFamily: 'DM Mono, monospace',
                }}
              >
                {p}
              </button>
            )
          ))}
          <button
            onClick={() => page < totalPages && onPageChange(page + 1)}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: '#1E293B', border: '1px solid #334155',
              color: page === totalPages ? '#334155' : '#94A3B8', cursor: page === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#64748B' }}>
          Page {page} of {totalPages.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
