import { AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import { FORMULARY_STATUS } from '../../data/dhaComplianceData';
import { D, Card, SectionHeader } from './DhaCompliancePrimitives';

export function FormularyTab() {
  const f = FORMULARY_STATUS;
  const quotaPct = f.controlledSubstanceQuota.used;

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* Unmapped drugs alert */}
      {f.unmappedCount > 0 && (
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: D.warningBg, border: `1px solid ${D.warningBorder}` }}>
          <AlertTriangle size={14} style={{ color: D.warningLight, flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1">
            <div className="text-xs font-semibold" style={{ color: D.warningLight }}>
              {f.unmappedCount} drugs not mapped to MOHAP formulary
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: D.text3 }}>
              Prescriptions for unmapped drugs trigger a compliance warning. Map all entries by 2026-05-20.
              Also {f.offFormularyPrescriptions} off-formulary prescriptions in last 24h require review.
            </div>
          </div>
          <button className="flex-shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg"
            style={{ background: D.warningBg, color: D.warningLight, border: `1px solid ${D.warningBorder}` }}>
            Map now <ChevronRight size={9} />
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Formulary Drugs', value: f.totalDrugs.toLocaleString(), color: D.text1 },
          { label: 'Mapped Drugs', value: f.mappedDrugs.toLocaleString(), color: D.successLight },
          { label: 'Coverage Rate', value: `${f.coverageRate}%`, color: f.coverageRate >= 99 ? D.successLight : D.warningLight },
          { label: 'Off-Formulary Rx (24h)', value: f.offFormularyPrescriptions.toString(), color: f.offFormularyPrescriptions > 10 ? D.warningLight : D.successLight },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <div className="text-[10px] mb-1" style={{ color: D.text3 }}>{k.label}</div>
            <div className="text-xl font-bold" style={{ color: k.color, fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Formulary sync status */}
        <Card className="p-5">
          <SectionHeader title="Formulary Sync Status">
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
              <RefreshCw size={9} /> Sync now
            </button>
          </SectionHeader>
          <div className="space-y-2 text-[10px]">
            {[
              { label: 'Active version', value: f.activeVersion, color: D.tealLight },
              { label: 'Last sync', value: '2026-05-03 02:00 GST', color: D.text2 },
              { label: 'Source', value: f.source, color: D.text2 },
              { label: 'Next scheduled sync', value: '2026-05-04 02:00 GST', color: D.text2 },
              { label: 'Sync frequency', value: 'Daily (02:00 GST)', color: D.text2 },
            ].map(field => (
              <div key={field.label} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                <span style={{ color: D.text3 }}>{field.label}</span>
                <span style={{ color: field.color, fontFamily: 'DM Mono, monospace' }}>{field.value}</span>
              </div>
            ))}
          </div>

          {/* Q2 diff */}
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${D.border}` }}>
            <div className="text-[10px] font-semibold mb-2" style={{ color: D.text2 }}>Q2-2026 Formulary Changes (2026-04-01)</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Added', value: f.diff.added, color: D.successLight },
                { label: 'Removed', value: f.diff.removed, color: D.errorLight },
                { label: 'Changed', value: f.diff.changed, color: D.warningLight },
              ].map(d => (
                <div key={d.label} className="text-center p-2.5 rounded-lg" style={{ background: D.bg1 }}>
                  <div className="text-lg font-bold" style={{ color: d.color, fontFamily: 'DM Mono, monospace' }}>{d.value}</div>
                  <div className="text-[9px]" style={{ color: D.text3 }}>{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Controlled substance quota */}
        <Card className="p-5">
          <SectionHeader title="Controlled Substance Quota" />
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span style={{ color: D.text3 }}>Daily quota used</span>
              <span style={{ color: quotaPct >= 90 ? D.errorLight : quotaPct >= 75 ? D.warningLight : D.successLight, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>
                {quotaPct}%
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${quotaPct}%`, background: quotaPct >= 90 ? D.error : quotaPct >= 75 ? D.warning : D.teal }} />
            </div>
            <div className="text-[9px] mt-1" style={{ color: D.text3 }}>Resets at midnight GST · DHA reporting required if {'>'}90% for 3 consecutive days</div>
          </div>

          <div className="space-y-3 mt-4">
            {[
              { schedule: 'Schedule 1 (Narcotics)', pct: 60, limit: '20 Rx/day', color: '#F87171' },
              { schedule: 'Schedule 3 (Psychotropics)', pct: 56, limit: '50 Rx/day', color: D.warningLight },
              { schedule: 'Schedule 4 (Other controlled)', pct: 60, limit: '300 Rx/day', color: D.blueLight },
            ].map(s => (
              <div key={s.schedule}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span style={{ color: D.text2 }}>{s.schedule}</span>
                  <span style={{ color: D.text3 }}>{s.limit}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl text-[10px]" style={{ background: D.bg1, border: `1px solid ${D.border}` }}>
            <div className="font-semibold mb-1" style={{ color: D.text2 }}>Hard guardrail</div>
            <div style={{ color: D.text3 }}>Prescriptions that would exceed schedule quota are blocked at the prescription point. Clinical override requires two-person approval + documented justification.</div>
          </div>
        </Card>
      </div>

      {/* Coverage progress */}
      <Card className="p-5">
        <SectionHeader title="Drug Coverage by Category" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
          {[
            { category: 'Cardiovascular', mapped: 412, total: 418, pct: 98.6 },
            { category: 'Antibiotics', mapped: 284, total: 292, pct: 97.3 },
            { category: 'Oncology', mapped: 198, total: 231, pct: 85.7 },
            { category: 'Diabetes & Endocrine', mapped: 312, total: 315, pct: 99.0 },
            { category: 'Respiratory', mapped: 187, total: 194, pct: 96.4 },
            { category: 'Mental Health', mapped: 143, total: 162, pct: 88.3 },
            { category: 'Analgesics', mapped: 224, total: 228, pct: 98.2 },
            { category: 'Dermatology', mapped: 156, total: 178, pct: 87.6 },
          ].map(c => (
            <div key={c.category}>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span style={{ color: D.text2 }}>{c.category}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: D.text3 }}>{c.mapped}/{c.total}</span>
                  <span style={{ color: c.pct >= 98 ? D.successLight : c.pct >= 90 ? D.warningLight : D.errorLight, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
                    {c.pct}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
                <div className="h-full rounded-full"
                  style={{ width: `${c.pct}%`, background: c.pct >= 98 ? D.success : c.pct >= 90 ? D.warning : D.error }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
