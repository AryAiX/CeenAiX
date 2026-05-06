import { useState } from 'react';
import { FileText, Send, Clock, CheckCircle, Download } from 'lucide-react';
import { DHA_REPORTS, type DhaReport } from '../../data/dhaComplianceData';
import { D, Card, SectionHeader, MonoId } from './DhaCompliancePrimitives';

function ReportCard({ report }: { report: DhaReport }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 1500);
  };

  return (
    <div className="p-4 rounded-xl" style={{ background: D.bg1, border: `1px solid ${D.border}` }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="text-xs font-semibold" style={{ color: D.text1 }}>{report.name}</div>
            <span className="text-[9px] px-2 py-0.5 rounded-full"
              style={{ background: D.tealBg, color: D.tealLight }}>{report.frequency}</span>
            {report.submitToDHA && (
              <span className="text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: 'rgba(37,99,235,0.12)', color: D.blueLight }}>
                <Send size={8} /> DHA filing
              </span>
            )}
          </div>
          <div className="text-[10px]" style={{ color: D.text3 }}>{report.description}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-[10px]">
        <div className="flex justify-between py-0.5">
          <span style={{ color: D.text3 }}>Last generated</span>
          <span style={{ color: D.text2, fontFamily: 'DM Mono, monospace' }}>{report.lastGenerated}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span style={{ color: D.text3 }}>Next scheduled</span>
          <span style={{ color: D.text2, fontFamily: 'DM Mono, monospace' }}>{report.nextScheduled}</span>
        </div>
        {report.lastFilingRef && (
          <div className="flex justify-between py-0.5 col-span-2">
            <span style={{ color: D.text3 }}>Last DHA filing ref</span>
            <MonoId value={report.lastFilingRef} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${D.border}` }}>
        <div className="flex-1 text-[10px]" style={{ color: D.text3 }}>
          Recipients: {report.recipients.join(', ')}
        </div>
        <div className="flex gap-1.5">
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg transition-opacity"
            style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}`, opacity: generating ? 0.6 : 1 }}>
            {generating ? <Clock size={9} className="animate-spin" /> : <FileText size={9} />}
            {generating ? 'Generating…' : 'Generate'}
          </button>
          <button className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg"
            style={{ background: D.bg2, color: D.text2, border: `1px solid ${D.border}` }}>
            <Download size={9} /> Last
          </button>
          {report.submitToDHA && (
            <button className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg"
              style={{ background: 'rgba(37,99,235,0.12)', color: D.blueLight, border: '1px solid rgba(37,99,235,0.3)' }}>
              <Send size={9} /> Submit to DHA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportsTab() {
  const dhaReports = DHA_REPORTS.filter(r => r.submitToDHA);
  const internalReports = DHA_REPORTS.filter(r => !r.submitToDHA);

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* Upcoming filings */}
      <Card className="p-5">
        <SectionHeader title="Upcoming DHA Filings" />
        <div className="space-y-2">
          {[
            { name: 'DHA Annual Compliance Report 2025–2026', due: '2026-05-30', days: 26, ref: 'RPT-001', status: 'pending' },
            { name: 'NABIDH Monthly Compliance Report (May 2026)', due: '2026-05-31', days: 27, ref: 'RPT-002', status: 'scheduled' },
            { name: 'DHA Path B Periodic Activity Report (Q1)', due: '2026-06-30', days: 57, ref: 'RPT-005', status: 'scheduled' },
          ].map(f => (
            <div key={f.ref} className="flex items-center justify-between p-3 rounded-xl" style={{ background: D.bg1, border: `1px solid ${D.border}` }}>
              <div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: D.text1 }}>{f.name}</div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span style={{ color: D.text3, fontFamily: 'DM Mono, monospace' }}>{f.due}</span>
                  <span className="px-1.5 py-0.5 rounded"
                    style={{ background: f.status === 'pending' ? D.warningBg : D.bg2, color: f.status === 'pending' ? D.warningLight : D.text3 }}>
                    {f.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded"
                  style={{ background: f.days <= 30 ? D.warningBg : D.successBg, color: f.days <= 30 ? D.warningLight : D.successLight, fontFamily: 'DM Mono, monospace' }}>
                  {f.days}d
                </span>
                <button className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg"
                  style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
                  <FileText size={9} /> Prepare
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* DHA submissions */}
      <Card className="p-5">
        <SectionHeader title={`DHA Regulatory Reports (${dhaReports.length})`}>
          <div className="flex items-center gap-1.5">
            <Send size={10} style={{ color: D.blueLight }} />
            <span className="text-[10px]" style={{ color: D.blueLight }}>Filed directly with DHA</span>
          </div>
        </SectionHeader>
        <div className="space-y-3">
          {dhaReports.map(r => <ReportCard key={r.id} report={r} />)}
        </div>
      </Card>

      {/* Internal reports */}
      <Card className="p-5">
        <SectionHeader title={`Internal Reports (${internalReports.length})`} />
        <div className="space-y-3">
          {internalReports.map(r => <ReportCard key={r.id} report={r} />)}
        </div>
      </Card>

      {/* Audit trail */}
      <Card className="p-5">
        <SectionHeader title="Recent Filing Activity" />
        <div className="space-y-2">
          {[
            { action: 'NABIDH Monthly Report filed with DHA', ref: 'DHA-NABIDH-2026-04', date: '2026-04-30 16:42', status: 'success' },
            { action: 'DHA Annual Compliance Report 2024–2025 filed', ref: 'DHA-ACR-2025-00441', date: '2025-05-28 15:00', status: 'success' },
            { action: 'DHA Path B Periodic Report Q4-2025 filed', ref: 'DHA-PATHB-Q4-2025', date: '2025-12-31 14:22', status: 'success' },
            { action: 'Patient Rights Q3-2025 Report filed', ref: 'DHA-PR-Q3-2025', date: '2025-10-02 11:18', status: 'success' },
          ].map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${D.border}` }}>
              <div className="flex items-center gap-2.5">
                <CheckCircle size={12} style={{ color: D.successLight }} />
                <div>
                  <div className="text-[11px]" style={{ color: D.text1 }}>{a.action}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MonoId value={a.ref} />
                    <span className="text-[9px]" style={{ color: D.text3, fontFamily: 'DM Mono, monospace' }}>{a.date}</span>
                  </div>
                </div>
              </div>
              <button className="text-[10px] px-2 py-0.5 rounded"
                style={{ background: D.bg1, color: D.text3 }}>
                <Download size={8} className="inline mr-1" />PDF
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
