import { useState } from 'react';
import { RefreshCw, Search, Filter, ChevronRight } from 'lucide-react';
import { SUBMISSIONS, Submission } from '../../data/nabidhData';
import { N, Card, SectionHeader, StatusChip, TH, TD, TR } from './NabidhPrimitives';

const STATUS_FILTERS = ['All', 'Accepted', 'Processing', 'Pending', 'Rejected', 'Failed', 'Resubmitted'];

export function SubmissionQueueTab() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Submission | null>(null);

  const filtered = SUBMISSIONS.filter(s => {
    const matchStatus = statusFilter === 'All' || s.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || s.id.toLowerCase().includes(q) || s.messageId.toLowerCase().includes(q)
      || s.workspace.toLowerCase().includes(q) || s.resourceType.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex gap-4">
      <div className="flex-1 flex flex-col gap-4">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-48 px-3 py-2 rounded-lg" style={{ background: N.bg1, border: `1px solid ${N.border}` }}>
              <Search size={12} style={{ color: N.text3 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search submissions, MRN, workspace…"
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: N.text1, fontFamily: 'DM Mono, monospace' }} />
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className="text-[10px] px-2.5 py-1 rounded-lg transition-all"
                  style={statusFilter === s
                    ? { background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }
                    : { background: N.bg1, color: N.text3, border: `1px solid ${N.border}` }}>
                  {s}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg"
              style={{ background: N.bg1, color: N.text2, border: `1px solid ${N.border}` }}>
              <RefreshCw size={10} /> Refresh
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card className="p-5">
          <SectionHeader title={`Submission Queue (${filtered.length})`}>
            <div className="flex items-center gap-2 text-[10px]" style={{ color: N.text3 }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
          </SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${N.border}` }}>
                  <TH>Sub ID</TH><TH>Message ID</TH><TH>Workspace</TH><TH>Patient MRN</TH>
                  <TH>Resource</TH><TH>Status</TH><TH>Attempts</TH><TH>Latency</TH><TH>Created</TH><TH></TH>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <TR key={s.id} onClick={() => setSelected(s)} highlight={s.status === 'Failed' || s.status === 'Rejected'}>
                    <td className="py-2.5 pr-4">
                      <span className="text-[11px]" style={{ color: N.tealLight, fontFamily: 'DM Mono, monospace' }}>{s.id}</span>
                    </td>
                    <TD mono muted>{s.messageId}</TD>
                    <td className="py-2.5 pr-4 text-xs max-w-[140px] truncate" style={{ color: N.text1 }}>{s.workspace}</td>
                    <TD mono muted>{s.patientMrn}</TD>
                    <td className="py-2.5 pr-4">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: N.blueBg, color: N.blueLight }}>{s.resourceType}</span>
                    </td>
                    <TD><StatusChip status={s.status} /></TD>
                    <td className="py-2.5 pr-4 text-xs text-center" style={{ color: s.attempts >= 3 ? N.errorLight : N.text2, fontFamily: 'DM Mono, monospace' }}>{s.attempts}</td>
                    <td className="py-2.5 pr-4 text-xs" style={{ color: s.latencyMs > 0 ? (s.latencyMs > 1000 ? N.warningLight : N.text2) : N.text3, fontFamily: 'DM Mono, monospace' }}>
                      {s.latencyMs > 0 ? `${s.latencyMs}ms` : '—'}
                    </td>
                    <TD mono muted>{s.created}</TD>
                    <td className="py-2.5">
                      <ChevronRight size={12} style={{ color: N.text3 }} />
                    </td>
                  </TR>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0">
          <Card className="p-5 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold" style={{ color: N.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Submission Detail</div>
              <button onClick={() => setSelected(null)} style={{ color: N.text3, fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Submission ID', value: selected.id },
                { label: 'Message ID', value: selected.messageId },
                { label: 'Correlation ID', value: selected.correlationId },
                { label: 'Workspace', value: selected.workspace },
                { label: 'Patient MRN', value: selected.patientMrn },
                { label: 'Resource Type', value: selected.resourceType },
                { label: 'FHIR Version', value: selected.fhirVersion },
                { label: 'Attempts', value: `${selected.attempts}` },
                { label: 'Payload Size', value: selected.size },
                { label: 'Created', value: selected.created },
                { label: 'Last Attempt', value: selected.lastAttempt },
              ].map(f => (
                <div key={f.label}>
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>{f.label}</div>
                  <div className="text-xs" style={{ color: N.text1, fontFamily: 'DM Mono, monospace' }}>{f.value}</div>
                </div>
              ))}
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: N.text3, fontFamily: 'DM Mono, monospace' }}>Status</div>
                <StatusChip status={selected.status} />
              </div>
            </div>
            {(selected.status === 'Rejected' || selected.status === 'Failed') && (
              <div className="mt-4 flex gap-2">
                <button className="flex-1 text-[10px] py-2 rounded-lg font-semibold"
                  style={{ background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }}>
                  Resubmit
                </button>
                <button className="flex-1 text-[10px] py-2 rounded-lg font-semibold"
                  style={{ background: N.bg1, color: N.text2, border: `1px solid ${N.border}` }}>
                  View Payload
                </button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
