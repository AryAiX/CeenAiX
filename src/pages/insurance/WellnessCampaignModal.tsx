import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Send, Users, X } from 'lucide-react';
import { logWellnessOutreach, type InsuranceMember } from '../../hooks';

// ─── Local types & constants ──────────────────────────────────────────────────

type PlanKey  = 'Gold' | 'Silver' | 'Basic' | 'Thiqa';
type Channel  = 'sms' | 'email' | 'push';
type Audience = 'all' | 'high_risk' | 'benefit_alert' | 'custom';
type RiskFilter = 'high' | 'medium' | 'low';

const PLAN_BADGE: Record<PlanKey, { bg: string; text: string }> = {
  Gold:   { bg: '#FEF3C7', text: '#92400E' },
  Silver: { bg: '#F1F5F9', text: '#475569' },
  Basic:  { bg: '#EFF6FF', text: '#1E40AF' },
  Thiqa:  { bg: '#F3E8FF', text: '#6B21A8' },
};

const RISK_FILTER_OPTIONS: { value: RiskFilter; label: string; activeColor: string }[] = [
  { value: 'high',   label: 'HIGH',   activeColor: '#F97316' },
  { value: 'medium', label: 'MEDIUM', activeColor: '#F59E0B' },
  { value: 'low',    label: 'LOW',    activeColor: '#10B981' },
];

const TEMPLATES = [
  {
    id: 'annual_checkup',
    label: 'Annual Checkup Reminder',
    subject: 'Time for Your Annual Health Checkup',
    subjectAr: 'حان وقت الفحص الصحي السنوي',
    msgEn: 'Dear Member,\n\nAs part of our commitment to your health and wellbeing, we would like to remind you that your annual health checkup is due. Early detection saves lives.\n\nBook your appointment today at any Daman network facility.\n\nWarm regards,\nDaman National Health Insurance',
    msgAr: 'عزيزي العضو،\n\nالتزاماً منا بصحتك ورفاهيتك، نود تذكيرك بأن موعد فحصك الصحي السنوي قد حان. الكشف المبكر ينقذ الأرواح.\n\nاحجز موعدك اليوم في أي منشأة من شبكة ضمان.\n\nمع تحياتنا،\nضمان التأمين الصحي الوطني',
  },
  {
    id: 'chronic_mgmt',
    label: 'Chronic Disease Management',
    subject: 'Important: Managing Your Chronic Condition',
    subjectAr: 'مهم: إدارة حالتك المزمنة',
    msgEn: 'Dear Member,\n\nManaging your chronic condition effectively is key to maintaining a high quality of life. Our care coordinators are available to support you with personalised guidance and resources.\n\nContact us at 800-DAMAN to speak with a health advisor.\n\nWarm regards,\nDaman National Health Insurance',
    msgAr: 'عزيزي العضو،\n\nإدارة حالتك المزمنة بفعالية هي مفتاح الحفاظ على جودة حياة عالية. منسقو الرعاية لدينا متاحون لدعمك بتوجيهات وموارد مخصصة.\n\nتواصل معنا على DAMAN-800.\n\nمع تحياتنا،\nضمان التأمين الصحي الوطني',
  },
  {
    id: 'benefit_expiry',
    label: 'Benefits Expiring Soon',
    subject: 'Your Insurance Benefits Expire Soon',
    subjectAr: 'تنتهي مزاياك التأمينية قريباً',
    msgEn: 'Dear Member,\n\nYour annual insurance benefits are approaching their limit. To maximise your coverage, we encourage you to schedule any pending medical appointments or procedures before the policy year ends.\n\nFor assistance, call 800-DAMAN.\n\nWarm regards,\nDaman National Health Insurance',
    msgAr: 'عزيزي العضو،\n\nتقترب مزاياك التأمينية السنوية من حدها الأقصى. لتحقيق أقصى استفادة من تغطيتك، نشجعك على تحديد مواعيد أي إجراءات طبية معلقة قبل انتهاء سنة الوثيقة.\n\nللمساعدة، اتصل على DAMAN-800.\n\nمع تحياتنا،\nضمان التأمين الصحي الوطني',
  },
  {
    id: 'preventive_care',
    label: 'Preventive Care Program',
    subject: "Join Daman's Preventive Care Program",
    subjectAr: 'انضم إلى برنامج الرعاية الوقائية',
    msgEn: "Dear Member,\n\nDaman's Preventive Care Program offers free screenings, wellness consultations, and health coaching to help you stay ahead of potential health concerns.\n\nEnrol today through the Daman app or visit our website.\n\nWarm regards,\nDaman National Health Insurance",
    msgAr: 'عزيزي العضو،\n\nيقدم برنامج الرعاية الوقائية من ضمان فحوصات مجانية واستشارات صحية وتدريباً.\n\nسجّل اليوم عبر تطبيق ضمان.\n\nمع تحياتنا،\nضمان التأمين الصحي الوطني',
  },
  { id: 'custom', label: 'Custom Message', subject: '', subjectAr: '', msgEn: '', msgAr: '' },
];

const extractPlanTier = (planName: string): PlanKey => {
  const l = planName.toLowerCase();
  if (l.includes('gold'))   return 'Gold';
  if (l.includes('silver')) return 'Silver';
  if (l.includes('thiqa'))  return 'Thiqa';
  return 'Basic';
};

const getBenefitAlert = (m: InsuranceMember): 'EXHAUSTED' | 'NEAR_LIMIT' | null =>
  m.utilizationPercent >= 100 ? 'EXHAUSTED' : m.utilizationPercent >= 80 ? 'NEAR_LIMIT' : null;

// ─── WellnessCampaignModal ────────────────────────────────────────────────────

export const WellnessCampaignModal = ({
  members, onClose, onSend, onError,
}: {
  members: InsuranceMember[];
  onClose: () => void;
  onSend: (count: number) => void;
  onError: (msg: string) => void;
}) => {
  const [step,          setStep]          = useState(0);
  const [audience,      setAudience]      = useState<Audience>('high_risk');
  const [filterPlan,    setFilterPlan]    = useState<PlanKey[]>([]);
  const [filterRisk,    setFilterRisk]    = useState<RiskFilter[]>([]);
  const [templateId,    setTemplateId]    = useState('annual_checkup');
  const [subjectEn,     setSubjectEn]     = useState(TEMPLATES[0].subject);
  const [subjectAr,     setSubjectAr]     = useState(TEMPLATES[0].subjectAr);
  const [messageEn,     setMessageEn]     = useState(TEMPLATES[0].msgEn);
  const [messageAr,     setMessageAr]     = useState(TEMPLATES[0].msgAr);
  const [channels,      setChannels]      = useState<Channel[]>(['sms', 'email']);
  const [sending,       setSending]       = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const audienceCount = useMemo(() => {
    if (audience === 'all')          return members.length;
    if (audience === 'high_risk')    return members.filter(m => m.riskLevel === 'high').length;
    if (audience === 'benefit_alert') return members.filter(m => getBenefitAlert(m) !== null).length;
    // custom
    let filtered = [...members];
    if (filterPlan.length)  filtered = filtered.filter(m => filterPlan.includes(extractPlanTier(m.planName)));
    if (filterRisk.length)  filtered = filtered.filter(m => filterRisk.includes(m.riskLevel as RiskFilter));
    return filtered.length;
  }, [audience, members, filterPlan, filterRisk]);

  const togglePlan    = (p: PlanKey)    => setFilterPlan(prev  => prev.includes(p)  ? prev.filter(x => x !== p)  : [...prev, p]);
  const toggleRisk    = (r: RiskFilter) => setFilterRisk(prev  => prev.includes(r)  ? prev.filter(x => x !== r)  : [...prev, r]);
  const toggleChannel = (c: Channel)   => setChannels(prev    => prev.includes(c)  ? prev.filter(x => x !== c)  : [...prev, c]);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const t = TEMPLATES.find(t => t.id === id);
    if (t) { setSubjectEn(t.subject); setSubjectAr(t.subjectAr); setMessageEn(t.msgEn); setMessageAr(t.msgAr); }
  };

  const handleSend = async () => {
    setSending(true);
    setCampaignError(null);
    try {
      await logWellnessOutreach({
        audience,
        recipientCount: audienceCount,
        channels,
        messageEn,
        memberId: null,
        planFilter: filterPlan.length > 0 ? filterPlan : null,
        subjectEn: subjectEn.trim() || null,
        subjectAr: subjectAr.trim() || null,
        messageAr: messageAr.trim() || null,
      });
      onSend(audienceCount);
    } catch (err) {
      setSending(false);
      const msg = err instanceof Error ? err.message : 'Failed to send campaign';
      setCampaignError(msg);
      onError(msg);
    }
  };

  const steps      = ['Audience', 'Message', 'Preview & Send'];
  const canProceed = step === 0
    ? audienceCount > 0
    : step === 1
    ? (subjectEn.trim().length > 0 && messageEn.trim().length > 0 && channels.length > 0)
    : true;

  const audienceLabel =
    audience === 'all'           ? 'All Members'
    : audience === 'high_risk'   ? 'High Risk Members'
    : audience === 'benefit_alert' ? 'Benefit Alert Members'
    : 'Custom Filter';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 560, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ backgroundColor: '#0F2D4A' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <Send size={16} color="#fff" />
            </div>
            <span className="text-white font-semibold text-base">Send Wellness Outreach</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 px-6 py-4 border-b border-slate-100 flex-shrink-0">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: i < step ? '#10B981' : i === step ? '#0F2D4A' : '#E2E8F0',
                    color: i <= step ? '#fff' : '#94A3B8',
                  }}
                >
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${i === step ? 'text-slate-800' : i < step ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {s}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── STEP 1 — Audience ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Who Receives This Message
                </p>
                <div className="space-y-2">
                  {([
                    { id: 'all',           label: 'All Members',           desc: `All ${members.length} members in portfolio` },
                    { id: 'high_risk',     label: 'High Risk Members',     desc: `${members.filter(m => m.riskLevel === 'high').length} members with high risk` },
                    { id: 'benefit_alert', label: 'Benefit Alert Members', desc: `${members.filter(m => getBenefitAlert(m) !== null).length} members near or at annual limit` },
                    { id: 'custom',        label: 'Custom Filter',         desc: 'Define specific criteria below' },
                  ] as const).map(opt => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        audience === opt.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={audience === opt.id}
                        onChange={() => setAudience(opt.id)}
                        style={{ accentColor: '#2563EB' }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom filters */}
              {audience === 'custom' && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Plan Type</p>
                    <div className="flex flex-wrap gap-2">
                      {(['Gold', 'Silver', 'Basic', 'Thiqa'] as PlanKey[]).map(p => {
                        const pc = PLAN_BADGE[p];
                        const active = filterPlan.includes(p);
                        return (
                          <button
                            key={p}
                            onClick={() => togglePlan(p)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                            style={{
                              borderColor: active ? pc.text : '#E2E8F0',
                              backgroundColor: active ? pc.bg : '#fff',
                              color: active ? pc.text : '#64748B',
                            }}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Risk Level</p>
                    <div className="flex flex-wrap gap-2">
                      {RISK_FILTER_OPTIONS.map(r => {
                        const active = filterRisk.includes(r.value);
                        return (
                          <button
                            key={r.value}
                            onClick={() => toggleRisk(r.value)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                            style={{
                              borderColor: active ? r.activeColor : '#E2E8F0',
                              backgroundColor: active ? `${r.activeColor}18` : '#fff',
                              color: active ? r.activeColor : '#64748B',
                            }}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Plan filter strip (for non-custom audiences) */}
              {audience !== 'custom' && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Filter by Plan <span className="text-slate-400 normal-case font-normal">(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['Gold', 'Silver', 'Basic', 'Thiqa'] as PlanKey[]).map(p => {
                      const pc = PLAN_BADGE[p];
                      const active = filterPlan.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() => togglePlan(p)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                          style={{
                            borderColor: active ? pc.text : '#E2E8F0',
                            backgroundColor: active ? pc.bg : '#fff',
                            color: active ? pc.text : '#64748B',
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Estimated reach */}
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Users size={20} color="#059669" />
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-medium">Estimated Reach</p>
                  <p className="text-lg font-bold text-emerald-700" style={{ fontFamily: 'DM Mono, monospace' }}>
                    {audienceCount.toLocaleString()} <span className="text-sm font-normal">members</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 — Message ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Template</p>
                <div className="relative">
                  <select
                    value={templateId}
                    onChange={e => handleTemplateChange(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-700 pr-8 focus:outline-none"
                  >
                    {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject (English)</label>
                  <input
                    value={subjectEn}
                    onChange={e => setSubjectEn(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none"
                    placeholder="English subject"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject (Arabic)</label>
                  <input
                    value={subjectAr}
                    onChange={e => setSubjectAr(e.target.value)}
                    dir="rtl"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none"
                    placeholder="الموضوع بالعربية"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message (English)</label>
                  <textarea
                    value={messageEn}
                    onChange={e => setMessageEn(e.target.value)}
                    rows={7}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                    placeholder="English message…"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message (Arabic)</label>
                  <textarea
                    value={messageAr}
                    onChange={e => setMessageAr(e.target.value)}
                    rows={7}
                    dir="rtl"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                    placeholder="الرسالة بالعربية…"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Delivery Channels</p>
                <div className="flex gap-3">
                  {(['sms', 'email', 'push'] as Channel[]).map(ch => (
                    <label
                      key={ch}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                        channels.includes(ch) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={channels.includes(ch)}
                        onChange={() => toggleChannel(ch)}
                        style={{ accentColor: '#2563EB' }}
                      />
                      <span className="text-sm font-semibold text-slate-700 uppercase">{ch}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 — Preview & Send ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campaign Summary</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    {audienceCount.toLocaleString()} recipients
                  </span>
                </div>
                <div className="space-y-2">
                  {([
                    ['Audience', audienceLabel],
                    ['Channels', channels.join(' · ').toUpperCase()],
                    ['Subject',  subjectEn],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                      <span className="text-xs text-slate-500 w-20 flex-shrink-0 mt-0.5">{k}</span>
                      <span className="text-xs font-semibold text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Message Preview</p>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {messageEn.length > 300 ? messageEn.slice(0, 300) + '…' : messageEn}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-800 mb-1">DHA Compliance Notice</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    All communications must comply with the DHA Patient Rights Charter and Federal Law No. 2 of 2019 on ICT
                    in Health Fields. Ensure content is medically accurate and does not constitute unsolicited medical advice.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-white" style={{ borderTop: '1px solid #F1F5F9' }}>
          {campaignError && (
            <div
              style={{
                background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B',
                fontSize: 12, borderRadius: 10, padding: '8px 12px', margin: '8px 24px 0',
              }}
            >
              {campaignError}
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < 2 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed}
                className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ backgroundColor: '#0F2D4A' }}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => void handleSend()}
                disabled={sending}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 justify-center"
                style={{ backgroundColor: '#0F2D4A', minWidth: 180 }}
              >
                {sending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Send Campaign
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WellnessCampaignModal;
