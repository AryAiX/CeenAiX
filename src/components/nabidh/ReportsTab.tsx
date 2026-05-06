import { FileText, Download, Calendar, Users } from 'lucide-react';
import { REPORT_TEMPLATES } from '../../data/nabidhData';
import { N, Card, SectionHeader } from './NabidhPrimitives';

export function ReportsTab() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <SectionHeader title="Scheduled Reports">
          <button className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }}>
            <FileText size={10} /> New Report
          </button>
        </SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {REPORT_TEMPLATES.map(r => (
            <div key={r.id} className="p-4 rounded-xl flex flex-col gap-3" style={{ background: N.bg1, border: `1px solid ${N.border}` }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold mb-1 pr-2" style={{ color: N.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{r.name}</div>
                  <div className="text-[10px]" style={{ color: N.text3 }}>{r.description}</div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full flex-shrink-0" style={{
                  background: r.format === 'PDF' ? N.errorBg : N.successBg,
                  color: r.format === 'PDF' ? N.errorLight : N.successLight,
                }}>{r.format}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1" style={{ color: N.text3 }}>
                  <Calendar size={9} />
                  <span>{r.schedule}</span>
                </div>
                <div className="flex items-center gap-1" style={{ color: N.text3 }}>
                  <Users size={9} />
                  <span>{r.recipients} recipients</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px]" style={{ color: N.text3 }}>
                <div>Last: <span style={{ color: N.text2, fontFamily: 'DM Mono, monospace' }}>{r.lastRun}</span></div>
                <div>Next: <span style={{ color: N.tealLight, fontFamily: 'DM Mono, monospace' }}>{r.nextRun}</span></div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 text-[10px] py-1.5 rounded-lg"
                  style={{ background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }}>
                  <Download size={9} /> Download
                </button>
                <button className="flex-1 text-[10px] py-1.5 rounded-lg"
                  style={{ background: N.bg2, color: N.text2, border: `1px solid ${N.border}` }}>
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* On-demand export */}
      <Card className="p-5">
        <SectionHeader title="On-Demand Export" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Submission History Export', desc: 'All submissions for a date range. PHI requires nabidh:export-phi.', badge: 'PHI-optional' },
            { label: 'DHA Compliance Package', desc: 'Full compliance dossier for DHA audit. Includes cert chain and consent logs.', badge: 'Audit-ready' },
            { label: 'Error & Rejection Summary', desc: 'Aggregated rejection codes with resolution guide. Safe to share externally.', badge: 'No PHI' },
          ].map(e => (
            <div key={e.label} className="p-4 rounded-xl" style={{ background: N.bg1, border: `1px solid ${N.border}` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="text-xs font-semibold" style={{ color: N.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{e.label}</div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0" style={{ background: N.tealBg, color: N.tealLight }}>{e.badge}</span>
              </div>
              <div className="text-[10px] mb-3" style={{ color: N.text3 }}>{e.desc}</div>
              <button className="w-full flex items-center justify-center gap-1.5 text-[10px] py-2 rounded-lg"
                style={{ background: N.tealBg, color: N.tealLight, border: `1px solid ${N.tealBorder}` }}>
                <Download size={9} /> Generate & Download
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
