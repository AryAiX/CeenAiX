import { useState } from 'react';
import { BarChart2, Plus, Play, Calendar, Share2, CreditCard as Edit, Copy, X, ChevronDown } from 'lucide-react';
import { REPORT_TEMPLATES } from '../../data/revenueData';
import { T, Card, SectionHeader } from './primitives';

const SCHEDULE_COLORS: Record<string, { bg: string; color: string }> = {
  Monthly:   { bg: T.tealBg,   color: T.tealLight },
  Weekly:    { bg: T.blueBg,   color: T.blue       },
  Quarterly: { bg: 'rgba(217,119,6,0.12)', color: '#FCD34D' },
  Daily:     { bg: T.successBg, color: T.success   },
};

function ReportBuilderModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const steps = ['Data source', 'Dimensions', 'Visualization', 'Schedule'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-2xl mx-4 rounded-2xl border overflow-hidden" style={{ background: T.bg1, borderColor: T.border2, boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Report Builder</div>
            <div className="text-[10px] mt-0.5" style={{ color: T.text3 }}>Build a custom revenue report</div>
          </div>
          <button onClick={onClose} style={{ color: T.text3 }}><X size={18} /></button>
        </div>

        {/* Steps */}
        <div className="flex px-6 pt-4 gap-2">
          {steps.map((s, i) => (
            <button key={s} onClick={() => setStep(i + 1)}
              className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={step === i + 1
                ? { background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }
                : { background: 'transparent', color: step > i + 1 ? T.success : T.text3, border: `1px solid ${T.border}` }
              }>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                style={{ background: step === i + 1 ? T.teal : step > i + 1 ? '#059669' : T.bg2, color: '#fff' }}>
                {i + 1}
              </span>
              {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-64">
          {step === 1 && (
            <div>
              <div className="text-xs font-semibold mb-3" style={{ color: T.text2 }}>Choose data sources</div>
              <div className="grid grid-cols-2 gap-2">
                {['Revenue transactions','Subscriptions','Invoices','Payouts','Insurance claims','Refunds & disputes'].map(src => (
                  <label key={src} className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                    <input type="checkbox" defaultChecked={src === 'Revenue transactions'} className="w-3.5 h-3.5 accent-teal-500" />
                    <span className="text-xs" style={{ color: T.text2 }}>{src}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div className="text-xs font-semibold mb-3" style={{ color: T.text2 }}>Choose dimensions & measures</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] mb-2" style={{ color: T.text3 }}>Dimensions (group by)</div>
                  {['Date','Workspace','Revenue source','Region','Tier','Payment method'].map(d => (
                    <label key={d} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                      <input type="checkbox" defaultChecked={['Date','Workspace'].includes(d)} className="w-3.5 h-3.5 accent-teal-500" />
                      <span className="text-[11px]" style={{ color: T.text2 }}>{d}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <div className="text-[10px] mb-2" style={{ color: T.text3 }}>Measures</div>
                  {['Total revenue','Net revenue','Transaction count','Avg transaction','Refund rate','Growth %'].map(m => (
                    <label key={m} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                      <input type="checkbox" defaultChecked={['Total revenue','Transaction count'].includes(m)} className="w-3.5 h-3.5 accent-teal-500" />
                      <span className="text-[11px]" style={{ color: T.text2 }}>{m}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <div className="text-xs font-semibold mb-3" style={{ color: T.text2 }}>Choose visualization</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'Table', icon: '▦' },
                  { type: 'Line chart', icon: '📈' },
                  { type: 'Bar chart', icon: '▬' },
                  { type: 'Area chart', icon: '▲' },
                  { type: 'Pie chart', icon: '◉' },
                  { type: 'KPI card', icon: '◻' },
                ].map(v => (
                  <button key={v.type}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                    style={v.type === 'Table' ? { background: T.tealBg, border: `1px solid ${T.tealBorder}`, color: T.tealLight }
                      : { background: T.bg2, border: `1px solid ${T.border}`, color: T.text3 }}>
                    <span className="text-xl">{v.icon}</span>
                    <span className="text-[10px]">{v.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: T.text3 }}>Report name</label>
                <input type="text" placeholder="My custom report" className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: T.bg2, border: `1px solid ${T.border}`, color: T.text1 }} />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: T.text3 }}>Schedule</label>
                <div className="relative">
                  <select className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none"
                    style={{ background: T.bg2, border: `1px solid ${T.border}`, color: T.text1 }}>
                    {['None (manual only)', 'Daily', 'Weekly', 'Monthly', 'Quarterly'].map(o => <option key={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: T.text3, pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: T.text3 }}>Format</label>
                <div className="flex gap-2">
                  {['PDF', 'XLSX', 'CSV'].map(f => (
                    <button key={f} className="flex-1 py-2 rounded-lg text-xs font-medium"
                      style={f === 'PDF' ? { background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }
                        : { background: T.bg2, color: T.text3, border: `1px solid ${T.border}` }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg" style={{ background: T.bg2, color: T.text2, border: `1px solid ${T.border}` }}>
            Cancel
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="text-xs px-4 py-2 rounded-lg"
                style={{ background: T.bg2, color: T.text2, border: `1px solid ${T.border}` }}>
                Back
              </button>
            )}
            <button onClick={() => step < 4 ? setStep(s => s + 1) : onClose()}
              className="text-xs px-4 py-2 rounded-lg font-medium"
              style={{ background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }}>
              {step < 4 ? 'Continue' : 'Save report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportsTab() {
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <>
      {showBuilder && <ReportBuilderModal onClose={() => setShowBuilder(false)} />}
      <div className="flex flex-col gap-4">
        <SectionHeader title="Saved Reports Library">
          <button onClick={() => setShowBuilder(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium"
            style={{ background: T.tealBg, color: T.tealLight, border: `1px solid ${T.tealBorder}` }}>
            <Plus size={13} /> Build report
          </button>
        </SectionHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORT_TEMPLATES.map(t => {
            const schedStyle = SCHEDULE_COLORS[t.schedule] ?? SCHEDULE_COLORS.Monthly;
            return (
              <Card key={t.id} className="p-4 flex flex-col gap-3 cursor-pointer transition-all hover:border-teal-700">
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.tealBg }}>
                    <BarChart2 size={16} style={{ color: T.teal }} />
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: schedStyle.bg, color: schedStyle.color }}>
                    {t.schedule}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t.name}</div>
                  <div className="text-[10px] mt-1 leading-relaxed" style={{ color: T.text3 }}>{t.desc}</div>
                </div>
                <div className="flex items-center justify-between text-[9px]" style={{ color: T.text3 }}>
                  <span>Last run: {t.lastRun}</span>
                  <span>{t.owner}</span>
                </div>
                <div className="flex gap-1.5 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                  {[
                    { label: 'Run now',  icon: Play     },
                    { label: 'Schedule', icon: Calendar },
                    { label: 'Share',    icon: Share2   },
                    { label: 'Edit',     icon: Edit     },
                    { label: 'Clone',    icon: Copy     },
                  ].map(({ label, icon: Icon }) => (
                    <button key={label} title={label}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] flex-1 justify-center transition-all hover:bg-white/[0.04]"
                      style={{ background: T.bg2, color: T.text3, border: `1px solid ${T.border}` }}>
                      <Icon size={10} />
                      <span className="hidden lg:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}

          {/* Add custom card */}
          <div
            onClick={() => setShowBuilder(true)}
            className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 p-6 cursor-pointer transition-all hover:border-teal-600"
            style={{ borderColor: T.tealBorder, minHeight: 180 }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.tealBg }}>
              <Plus size={20} style={{ color: T.teal }} />
            </div>
            <div className="text-xs font-semibold" style={{ color: T.text2, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Custom Report</div>
            <div className="text-[10px] text-center" style={{ color: T.text3 }}>Build from scratch with the report builder</div>
          </div>
        </div>

        {/* Scheduled reports summary */}
        <Card className="p-5">
          <SectionHeader title="Scheduled Report Deliveries" />
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {['Report','Frequency','Next Run','Recipients','Format','Delivery'].map(h => (
                  <th key={h} className="pb-2 pr-4 text-left font-semibold text-[10px] uppercase tracking-wide" style={{ color: T.text3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REPORT_TEMPLATES.slice(0, 4).map(r => (
                <tr key={r.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: T.border }}>
                  <td className="py-2.5 pr-4 font-medium" style={{ color: T.text1 }}>{r.name}</td>
                  <td className="py-2.5 pr-4" style={{ color: T.text2 }}>{r.schedule}</td>
                  <td className="py-2.5 pr-4" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>
                    {r.schedule === 'Monthly' ? 'May 1, 2026' : r.schedule === 'Weekly' ? 'Apr 14, 2026' : 'Jul 1, 2026'}
                  </td>
                  <td className="py-2.5 pr-4" style={{ color: T.text3 }}>3 recipients</td>
                  <td className="py-2.5 pr-4">
                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: T.tealBg, color: T.tealLight }}>PDF</span>
                  </td>
                  <td className="py-2.5" style={{ color: T.text3 }}>Email</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
