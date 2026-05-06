import { CheckCircle, AlertTriangle, Shield, Calendar } from 'lucide-react';
import { PATH_B_STATUS } from '../../data/dhaComplianceData';
import { D, Card, SectionHeader, MonoId, DaysChip } from './DhaCompliancePrimitives';

export function PathBTab() {
  const p = PATH_B_STATUS;

  return (
    <div className="p-5 flex flex-col gap-4 overflow-auto">
      {/* Status hero */}
      <Card className="p-5">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: D.tealBg, border: `1px solid ${D.tealBorder}` }}>
            <Shield size={24} style={{ color: D.tealLight }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="text-lg font-bold" style={{ color: D.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>DHA Path B — Telehealth Approval</div>
              <span className="text-xs px-3 py-1 rounded-full font-bold"
                style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
                {p.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <MonoId value={p.referenceNumber} label="DHA Reference" />
              <DaysChip days={p.daysRemaining} label="Days until renewal" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[10px]">
              {[
                { label: 'Submitted', value: p.submittedDate },
                { label: 'Approved', value: p.approvalDate },
                { label: 'Valid until', value: p.validUntil },
                { label: 'Days remaining', value: `${p.daysRemaining}d` },
              ].map(f => (
                <div key={f.label} className="p-2.5 rounded-lg" style={{ background: D.bg1 }}>
                  <div style={{ color: D.text3 }}>{f.label}</div>
                  <div className="font-semibold mt-0.5" style={{ color: D.text2, fontFamily: 'DM Mono, monospace' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Hard guardrail info */}
      <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: D.tealBg, border: `1px solid ${D.tealBorder}` }}>
        <CheckCircle size={14} style={{ color: D.tealLight, flexShrink: 0, marginTop: 1 }} />
        <div className="text-[10px]" style={{ color: D.tealLight }}>
          <span className="font-semibold">Hard guardrail active:</span> Telehealth sessions are gated behind Path B status. If approval lapses or is revoked, all synchronous and asynchronous teleconsultation features are automatically disabled platform-wide.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Approval conditions */}
        <Card className="p-5">
          <SectionHeader title="Approval Conditions" />
          <div className="space-y-2">
            {p.conditions.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: D.bg1, border: `1px solid ${D.border}` }}>
                <span className="text-[9px] font-bold mt-0.5 flex-shrink-0 w-4 text-center" style={{ color: D.tealLight }}>{i + 1}</span>
                <span className="text-[10px] leading-snug" style={{ color: D.text2 }}>{c}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quality metrics */}
        <Card className="p-5">
          <SectionHeader title="Quality Metrics (DHA Requirement)" />
          <div className="space-y-3">
            {[
              { label: 'Consultation completion rate', value: p.qualityMetrics.consultationCompletionRate, target: 95, suffix: '%', format: (v: number) => `${v}%` },
              { label: 'Technical failure rate', value: p.qualityMetrics.technicalFailureRate, target: 2, suffix: '%', isLow: true, format: (v: number) => `${v}%` },
              { label: 'Follow-up adherence', value: p.qualityMetrics.followUpAdherence, target: 80, suffix: '%', format: (v: number) => `${v}%` },
              { label: 'Patient satisfaction', value: p.qualityMetrics.patientSatisfaction * 20, target: 80, suffix: '', format: (_v: number) => `${p.qualityMetrics.patientSatisfaction}/5.0` },
            ].map(m => {
              const passing = m.isLow
                ? m.value <= m.target
                : m.value >= m.target;
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span style={{ color: D.text2 }}>{m.label}</span>
                    <div className="flex items-center gap-2">
                      <span style={{ color: D.text3 }}>target: {m.isLow ? '≤' : '≥'}{m.target}{m.suffix}</span>
                      <span style={{ color: passing ? D.successLight : D.errorLight, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>
                        {m.format(m.value)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: D.bg1 }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min(m.value, 100)}%`, background: passing ? D.success : D.error }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Approved modalities */}
        <Card className="p-5">
          <SectionHeader title="Approved Modalities" />
          <div className="space-y-2">
            {p.approvedModalities.map(m => (
              <div key={m} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ background: D.bg1 }}>
                <CheckCircle size={12} style={{ color: D.successLight }} />
                <span className="text-[10px]" style={{ color: D.text1 }}>{m}</span>
              </div>
            ))}
            <div className="p-2.5 rounded-lg" style={{ background: 'rgba(220,38,38,0.06)', border: `1px solid ${D.errorBorder}` }}>
              <div className="text-[10px] font-semibold mb-1" style={{ color: D.errorLight }}>Not approved</div>
              <div className="text-[10px]" style={{ color: D.text3 }}>In-person diagnostic procedures via remote — each requires separate DHA approval</div>
            </div>
          </div>
        </Card>

        {/* Approved specialties */}
        <Card className="p-5">
          <SectionHeader title="Approved Specialties" />
          <div className="flex flex-wrap gap-2">
            {p.approvedSpecialties.map(s => (
              <span key={s} className="text-[10px] px-2.5 py-1 rounded-lg"
                style={{ background: D.tealBg, color: D.tealLight, border: `1px solid ${D.tealBorder}` }}>
                {s}
              </span>
            ))}
          </div>
          <div className="mt-3 text-[10px] p-2.5 rounded-lg" style={{ background: D.bg1, border: `1px solid ${D.border}` }}>
            <span style={{ color: D.text3 }}>Specialties not in this list require a separate DHA Path B amendment request before being made available in the telehealth booking flow.</span>
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${D.border}` }}>
            <div className="text-[10px] font-semibold mb-2" style={{ color: D.text2 }}>Renewal timeline</div>
            <div className="space-y-1.5">
              {[
                { label: 'Prepare renewal package', date: '2026-01-22', status: 'Pending', days: 263 },
                { label: 'Submit to DHA', date: '2026-02-21', status: 'Pending', days: 293 },
                { label: 'Expected review', date: '2026-03-14', status: 'Pending', days: 314 },
                { label: 'Path B expires', date: '2026-04-21', status: 'Deadline', days: 352 },
              ].map(t => (
                <div key={t.label} className="flex items-center justify-between text-[10px] py-1" style={{ borderBottom: `1px solid ${D.border}` }}>
                  <span style={{ color: D.text2 }}>{t.label}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: D.text3, fontFamily: 'DM Mono, monospace' }}>{t.date}</span>
                    <DaysChip days={t.days} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
