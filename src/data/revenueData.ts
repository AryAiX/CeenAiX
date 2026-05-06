// ─── Currency ──────────────────────────────────────────────────────────────────
export type Currency = 'AED' | 'USD' | 'EUR' | 'SAR';

export const FX_RATES: Record<Currency, number> = {
  AED: 1,
  USD: 0.2723,
  EUR: 0.2491,
  SAR: 1.0211,
};

export const FX_TIMESTAMP = '7 Apr 2026 · 11:59 PM GST';

export function convertCurrency(aed: number, currency: Currency): number {
  return aed * FX_RATES[currency];
}

export function formatCurrency(aed: number, currency: Currency, locale = 'en-AE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(convertCurrency(aed, currency));
}

export function formatNum(n: number, locale = 'en-AE'): string {
  return new Intl.NumberFormat(locale).format(n);
}

// ─── KPI strip ─────────────────────────────────────────────────────────────────
export const KPI = {
  totalRevenue:       { value: 4_872_400, delta: 12.4,  spark: [3.2,3.45,3.8,3.6,4.1,4.5,4.87].map(v=>v*1e6) },
  netRevenue:         { value: 4_214_800, delta: 10.8,  spark: [2.8,3.0,3.3,3.1,3.6,3.9,4.21].map(v=>v*1e6) },
  mrr:                { value: 1_248_000, arr: 14_976_000, delta: 8.2, spark: [0.98,1.02,1.08,1.12,1.16,1.2,1.248].map(v=>v*1e6) },
  arpu:               { value: 4_890,     delta: 3.1,   spark: [4200,4350,4500,4480,4600,4750,4890] },
  activeWorkspaces:   { value: 247,       delta: 5.5,   spark: [195,203,215,218,228,238,247] },
  receivables: {
    total: 892_400, delta: -4.2,
    buckets: [
      { label: '0–30d',  value: 412000, color: '#0D9488' },
      { label: '31–60d', value: 228000, color: '#F59E0B' },
      { label: '61–90d', value: 164000, color: '#EF4444' },
      { label: '90+d',   value: 88400,  color: '#7F1D1D' },
    ],
  },
};

// ─── Revenue trend (30 days stacked) ──────────────────────────────────────────
export const REVENUE_TREND = Array.from({ length: 30 }, (_, i) => {
  const base = 140000 + Math.sin(i / 4) * 18000 + i * 1800;
  return {
    date: `Apr ${i + 1}`,
    subscription:  Math.round(base * 0.28 + (i % 3) * 2000),
    consultations: Math.round(base * 0.32 + (i % 5) * 1800),
    labRadiology:  Math.round(base * 0.18 + (i % 4) * 1200),
    pharmacy:      Math.round(base * 0.12 + (i % 3) * 800),
    insuranceFees: Math.round(base * 0.07 + (i % 2) * 600),
    other:         Math.round(base * 0.03 + (i % 2) * 200),
  };
});

// Prev-period overlay (same shape, shifted down ~12%)
export const PREV_TREND = REVENUE_TREND.map(d => ({
  date: d.date,
  total: Math.round((d.subscription + d.consultations + d.labRadiology + d.pharmacy + d.insuranceFees + d.other) * 0.88),
}));

// ─── Revenue by source ─────────────────────────────────────────────────────────
export const SOURCES = [
  { name: 'Subscriptions',    value: 1_364_272, pct: 28.0, growth: 8.2,  color: '#0D9488', spark: [1.1,1.15,1.22,1.28,1.3,1.34].map(v=>v*1e6) },
  { name: 'Consultations',    value: 1_559_168, pct: 32.0, growth: 14.1, color: '#0891B2', spark: [1.25,1.3,1.38,1.44,1.5,1.56].map(v=>v*1e6) },
  { name: 'Lab & Radiology',  value:   877_032, pct: 18.0, growth: 11.3, color: '#059669', spark: [0.72,0.76,0.8,0.83,0.86,0.877].map(v=>v*1e6) },
  { name: 'Pharmacy',         value:   584_688, pct: 12.0, growth: 6.8,  color: '#D97706', spark: [0.5,0.52,0.54,0.56,0.57,0.585].map(v=>v*1e6) },
  { name: 'Insurance Fees',   value:   341_068, pct:  7.0, growth: 18.5, color: '#DC2626', spark: [0.26,0.28,0.29,0.31,0.33,0.341].map(v=>v*1e6) },
  { name: 'Other',            value:   146_172, pct:  3.0, growth: 2.1,  color: '#64748B', spark: [0.13,0.135,0.14,0.142,0.144,0.146].map(v=>v*1e6) },
];

// ─── Top workspaces ────────────────────────────────────────────────────────────
export const WORKSPACES = [
  { rank:1,  name:'Al Noor Medical Center',       logo:'AN', tier:'Enterprise', region:'UAE', revenue:628400, growth:14.2,  users:1240, arpu:507, health:'Healthy'  as const },
  { rank:2,  name:'Emirates Specialty Hospital',  logo:'ES', tier:'Enterprise', region:'UAE', revenue:542100, growth:9.8,   users:980,  arpu:553, health:'Healthy'  as const },
  { rank:3,  name:'Saudi German Hospital DXB',    logo:'SG', tier:'Enterprise', region:'UAE', revenue:418200, growth:7.4,   users:820,  arpu:510, health:'Healthy'  as const },
  { rank:4,  name:'Burjeel Hospital Abu Dhabi',   logo:'BU', tier:'Enterprise', region:'UAE', revenue:312400, growth:11.6,  users:620,  arpu:504, health:'Healthy'  as const },
  { rank:5,  name:'HealthBay Polyclinic',         logo:'HB', tier:'Growth',     region:'UAE', revenue:284700, growth:22.1,  users:540,  arpu:527, health:'Healthy'  as const },
  { rank:6,  name:'Gulf Medical Center',          logo:'GM', tier:'Growth',     region:'UAE', revenue:198400, growth:5.3,   users:380,  arpu:522, health:'Healthy'  as const },
  { rank:7,  name:'Aster Clinics Network',        logo:'AC', tier:'Growth',     region:'UAE', revenue:143600, growth:8.9,   users:290,  arpu:495, health:'Healthy'  as const },
  { rank:8,  name:'NMC Healthcare Sharjah',       logo:'NM', tier:'Growth',     region:'UAE', revenue:167800, growth:3.1,   users:340,  arpu:494, health:'At risk'  as const },
  { rank:9,  name:'City Medical Center Deira',    logo:'CM', tier:'Pilot',      region:'UAE', revenue:48200,  growth:-2.4,  users:120,  arpu:402, health:'At risk'  as const },
  { rank:10, name:'University Hospital Sharjah',  logo:'UH', tier:'Growth',     region:'UAE', revenue:112800, growth:-1.8,  users:240,  arpu:470, health:'Churned'  as const },
];

// ─── Cohort heatmap ────────────────────────────────────────────────────────────
export const COHORT_MONTHS = ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
export const COHORT = Array.from({ length: 12 }, (_, row) =>
  Array.from({ length: 12 - row }, (_, col) =>
    Math.min(100, Math.max(20, 100 - col * 6 - row * 2 + (col % 3) * 3))
  )
);

// ─── Subscription KPIs ────────────────────────────────────────────────────────
export const SUB_KPI = {
  mrr:        { value: 1_248_000, delta: 8.2  },
  newMrr:     { value:   184_200, delta: 12.1 },
  expansionMrr:{ value:   96_800, delta: 22.4 },
  churnedMrr: { value:    42_400, delta: -3.2 },
};

export const MRR_WATERFALL = [
  { label: 'Starting MRR', value: 1_009_400, type: 'base'     as const },
  { label: 'New',          value:   184_200, type: 'positive'  as const },
  { label: 'Expansion',    value:    96_800, type: 'positive'  as const },
  { label: 'Contraction',  value:   -18_200, type: 'negative'  as const },
  { label: 'Churn',        value:   -24_200, type: 'negative'  as const },
  { label: 'Ending MRR',   value: 1_248_000, type: 'total'     as const },
];

export const PLAN_BREAKDOWN = [
  { plan:'Pilot',      tier:'Pilot',      active:42,  mrr:84000,   pct:6.7,  avgLen:2.1,  churn:18.4 },
  { plan:'Growth',     tier:'Growth',     active:148, mrr:592000,  pct:47.4, avgLen:8.4,  churn:5.2  },
  { plan:'Enterprise', tier:'Enterprise', active:57,  mrr:572000,  pct:45.8, avgLen:18.7, churn:1.8  },
];

export const SUBSCRIPTIONS = Array.from({ length: 20 }, (_, i) => ({
  id: `WS-${String(i+1).padStart(4,'0')}`,
  workspace: WORKSPACES[i % 10].name,
  logo:      WORKSPACES[i % 10].logo,
  plan:      ['Pilot','Growth','Enterprise'][i % 3],
  status:    ['Active','Active','Active','Trial','Past due','Active'][i % 6],
  mrr:       [2000,4000,10000][i % 3] + (i * 180),
  cycle:     i % 3 === 0 ? 'Annual' : 'Monthly',
  renewal:   `${['Jan','Feb','Mar','Apr','May','Jun'][i%6]} 2026`,
  started:   `${['Jan','Feb','Mar'][i%3]} 2025`,
  ltv:       24000 + i * 4200,
}));

export const FUNNEL = [
  { stage:'Trial started',      count:840, pct:100,  delta:4.2  },
  { stage:'Trial active',       count:714, pct:85.0, delta:2.8  },
  { stage:'Converted to paid',  count:504, pct:60.0, delta:6.1  },
  { stage:'Renewed at month 2', count:420, pct:50.0, delta:8.4  },
];

// ─── Transactions ──────────────────────────────────────────────────────────────
export const TRANSACTIONS = Array.from({ length: 40 }, (_, i) => ({
  id:     `TXN-${String(7000000 + i * 13).padStart(7,'0')}`,
  ts:     `Apr ${7 - Math.floor(i/5)}, 2026 · ${String(11-i%12).padStart(2,'0')}:${String(i*7%60).padStart(2,'0')}`,
  type:   ['Consultation','Lab test','Pharmacy','Subscription','Insurance fee','Imaging'][i % 6],
  workspace: WORKSPACES[i % 10].name,
  amount: [840,2400,380,4000,1200,3600][i % 6] + i * 12,
  net:    [770,2200,340,3760,1100,3300][i % 6] + i * 11,
  method: ['Visa ••4242','Mastercard ••8181','Apple Pay','Bank transfer','Insurance','Wallet'][i % 6],
  status: ['Succeeded','Succeeded','Succeeded','Succeeded','Pending','Refunded','Failed'][i % 7],
  risk:   Math.round((i * 7) % 40),
}));

// ─── Invoices ──────────────────────────────────────────────────────────────────
export const INVOICES = Array.from({ length: 24 }, (_, i) => ({
  id:         `INV-2026-${String(1480+i).padStart(5,'0')}`,
  issued:     `Apr ${7 - Math.floor(i/3)}, 2026`,
  due:        `May ${(7 - Math.floor(i/3) + 30) % 31 + 1}, 2026`,
  customer:   WORKSPACES[i % 10].name,
  workspace:  WORKSPACES[i % 10].name,
  amount:     [4000,10000,40000,2000][i % 4] + i * 300,
  balance:    i % 4 === 1 ? 0 : [1000,0,8000,2000][i % 4],
  status:     ['Sent','Paid','Overdue','Draft','Partial','Sent'][i % 6],
  lastAction: ['Reminder sent 2d ago','Paid via bank transfer','Overdue 14d','Draft','50% paid','Sent 5d ago'][i % 6],
}));

// ─── Payouts ───────────────────────────────────────────────────────────────────
export const PAYOUT_KPI = {
  pending:   { value: 284_400, count: 18 },
  inTransit: { value: 142_800, count:  9 },
  paid:      { value: 2_140_200, count: 124 },
  failed:    { value:  18_400, count:  3 },
};

export const PAYOUTS = Array.from({ length: 15 }, (_, i) => ({
  id:        `PYT-${String(2026001+i).padStart(7,'0')}`,
  workspace: WORKSPACES[i % 10].name,
  bank:      `••${String(1000 + i*73).slice(-4)}`,
  amount:    14000 + i * 5800,
  status:    ['Paid','Paid','In transit','Pending','Failed'][i % 5],
  initiated: `Apr ${7 - Math.floor(i/3)}, 2026`,
  arrival:   `Apr ${9 - Math.floor(i/3) + 2}, 2026`,
}));

// ─── Insurance & Claims ────────────────────────────────────────────────────────
export const INS_KPI = {
  submitted:   { value: 4284,          delta: 8.4  },
  paid:        { value: 3812, money: 2_840_400, delta: 6.2 },
  avgDays:     { value: 12.4,          delta: -8.1 },
  rejection:   { value: 8.6,           delta: -1.4 },
  outstanding: { value: 1_284_000,     delta: 4.8  },
};

export const TPA = [
  { name:'Daman Health',      sub:1840, paid:1680, rej:124, pend:36, days:10.2, rejRate:6.7,  total:1_248_000, outstanding:412_000 },
  { name:'AXA Gulf Insurance',sub:960,  paid:840,  rej:84,  pend:36, days:14.8, rejRate:8.8,  total:624_000,   outstanding:228_000 },
  { name:'ADNIC',             sub:720,  paid:648,  rej:54,  pend:18, days:11.4, rejRate:7.5,  total:480_000,   outstanding:148_000 },
  { name:'Thiqa (HAAD)',      sub:480,  paid:448,  rej:24,  pend:8,  days:8.4,  rejRate:5.0,  total:324_000,   outstanding:84_000  },
  { name:'MSH International', sub:284,  paid:196,  rej:64,  pend:24, days:22.4, rejRate:22.5, total:164_400,   outstanding:412_000 },
];

export const REJECTION_REASONS = [
  { reason:'Missing prior authorization',         count:124, pct:35.2 },
  { reason:'Service not covered under plan',      count:84,  pct:23.9 },
  { reason:'Duplicate claim submission',          count:42,  pct:11.9 },
  { reason:'Patient eligibility expired',         count:36,  pct:10.2 },
  { reason:'Invalid diagnosis code (ICD-10)',     count:28,  pct:7.9  },
  { reason:'Exceeded annual benefit limit',       count:18,  pct:5.1  },
  { reason:'Late submission (>90 days)',          count:14,  pct:4.0  },
  { reason:'Other / Admin error',                count:6,   pct:1.7  },
];

export const ECLAIM_HEALTH = {
  successRate: 97.4,
  avgLatency: '340ms',
  lastError: 'Apr 6 · 14:22 — Timeout on PA-20260406-00847',
};

// ─── Refunds & Disputes ────────────────────────────────────────────────────────
export const REFUND_KPI = {
  total: { value: 124_800, delta: -12.4 },
  rate:  { value: 2.4,     delta: -0.8  },
  avg:   { value: 840,     delta: 4.2   },
};

export const REFUNDS = Array.from({ length: 15 }, (_, i) => ({
  id:          `REF-${String(20260001+i).padStart(8,'0')}`,
  transaction: `TXN-${String(7000000+i*17).padStart(7,'0')}`,
  workspace:   WORKSPACES[i % 10].name,
  amount:      200 + i * 180,
  reason:      ['Customer request','Duplicate charge','Service not rendered','Quality issue','Billing error'][i % 5],
  by:          ['Admin','Patient','System','Doctor'][i % 4],
  status:      ['Completed','Pending','Completed','Processing'][i % 4],
  created:     `Apr ${7 - Math.floor(i/2)}, 2026`,
}));

export const DISPUTE_KPI = { open:12, lost:3, won:28, rate:0.8, atRisk:48_400 };

export const DISPUTES = Array.from({ length: 8 }, (_, i) => ({
  id:          `DSP-${String(20260001+i).padStart(8,'0')}`,
  transaction: `TXN-${String(7000000+i*23).padStart(7,'0')}`,
  workspace:   WORKSPACES[i % 10].name,
  amount:      840 + i * 1120,
  reason:      ['Fraudulent','Product not received','Service quality','Duplicate'][i % 4],
  stage:       ['Inquiry','Chargeback','Pre-arbitration','Arbitration'][i % 4],
  evidenceDue: `${3 - (i % 3)} days`,
  status:      ['Needs evidence','Under review','Won','Lost'][i % 4],
}));

// ─── Forecasts ─────────────────────────────────────────────────────────────────
export const FORECAST = [
  { month:'Jan', actual:3_200_000, low:null,      mid:null,      high:null      },
  { month:'Feb', actual:3_450_000, low:null,      mid:null,      high:null      },
  { month:'Mar', actual:3_820_000, low:null,      mid:null,      high:null      },
  { month:'Apr', actual:4_872_400, low:null,      mid:null,      high:null      },
  { month:'May', actual:null,      low:4_600_000, mid:5_100_000, high:5_600_000 },
  { month:'Jun', actual:null,      low:4_800_000, mid:5_400_000, high:6_000_000 },
  { month:'Jul', actual:null,      low:5_000_000, mid:5_700_000, high:6_400_000 },
  { month:'Aug', actual:null,      low:5_100_000, mid:5_900_000, high:6_700_000 },
  { month:'Sep', actual:null,      low:5_300_000, mid:6_100_000, high:6_900_000 },
  { month:'Oct', actual:null,      low:5_500_000, mid:6_400_000, high:7_200_000 },
  { month:'Nov', actual:null,      low:5_700_000, mid:6_700_000, high:7_600_000 },
  { month:'Dec', actual:null,      low:5_900_000, mid:7_000_000, high:8_000_000 },
];

export const DEFAULT_ASSUMPTIONS = {
  acquisitionRate: 12,
  avgDealGrowth:   4.8,
  churnPilot:      18.4,
  churnGrowth:     5.2,
  churnEnterprise: 1.8,
  expansionRate:   7.8,
  seasonality:     1.0,
};

export const GOALS = [
  { label:'Q1 2026', target:10_800_000, actual:11_240_000, complete:true  },
  { label:'Q2 2026', target:12_400_000, actual:4_872_400,  complete:false },
  { label:'Annual 2026', target:48_000_000, actual:16_112_400, complete:false },
];

// ─── Activity feed ─────────────────────────────────────────────────────────────
export const ACTIVITY = [
  { id:'a1',  icon:'CheckCircle', type:'success', event:'Invoice paid',          detail:'INV-2026-01480 · AED 40,000 · Al Noor Medical',      amount:40000,  time:'2m ago'  },
  { id:'a2',  icon:'Plus',        type:'teal',    event:'New subscription',      detail:'HealthBay Polyclinic · Growth · Monthly',              amount:4000,   time:'14m ago' },
  { id:'a3',  icon:'AlertCircle', type:'error',   event:'Payout failed',         detail:'PYT-2026001 · City Medical · AED 18,400',              amount:-18400, time:'28m ago' },
  { id:'a4',  icon:'RefreshCw',   type:'warning', event:'Refund initiated',      detail:'REF-20260001 · AED 840 · Patient request',             amount:-840,   time:'45m ago' },
  { id:'a5',  icon:'ArrowUpRight',type:'success', event:'Payout completed',      detail:'PYT-2026003 · Emirates Specialty · AED 62,400',        amount:62400,  time:'1h ago'  },
  { id:'a6',  icon:'Shield',      type:'error',   event:'Dispute opened',        detail:'DSP-20260001 · AED 2,400 · Visa ••4242',               amount:-2400,  time:'2h ago'  },
  { id:'a7',  icon:'Clock',       type:'warning', event:'Invoice overdue',       detail:'INV-2026-01482 · AED 10,000 · NMC Sharjah',            amount:10000,  time:'3h ago'  },
  { id:'a8',  icon:'TrendingUp',  type:'success', event:'Plan upgrade',          detail:'Gulf Medical Center · Pilot → Growth',                 amount:2000,   time:'4h ago'  },
  { id:'a9',  icon:'DollarSign',  type:'teal',    event:'Insurance claim paid',  detail:'CLM-20260407-00481 · AED 14,800 · Daman',              amount:14800,  time:'5h ago'  },
  { id:'a10', icon:'AlertTriangle',type:'warning',event:'Subscription past due', detail:'University Hospital Sharjah · AED 4,000',              amount:-4000,  time:'6h ago'  },
  { id:'a11', icon:'XCircle',     type:'error',   event:'Churn detected',        detail:'GMC Ajman · Growth plan cancelled',                    amount:-4000,  time:'8h ago'  },
  { id:'a12', icon:'Package',     type:'success', event:'Large transaction',     detail:'TXN-8294012 · AED 28,400 · Burjeel Hospital',          amount:28400,  time:'10h ago' },
];

// ─── Report templates ──────────────────────────────────────────────────────────
export const REPORT_TEMPLATES = [
  { id:'r1', name:'Monthly Board Pack',          desc:'Executive KPIs, revenue, and key events for the board.',         lastRun:'Apr 1, 2026',  schedule:'Monthly',   owner:'Dr. Parnia Y.' },
  { id:'r2', name:'Investor Update',             desc:'MRR, ARR, growth metrics, and cohort data for investors.',        lastRun:'Apr 1, 2026',  schedule:'Monthly',   owner:'Dr. Parnia Y.' },
  { id:'r3', name:'Tax Summary (VAT)',           desc:'UAE VAT-ready transaction summary by category.',                  lastRun:'Mar 31, 2026', schedule:'Quarterly', owner:'Finance Team'  },
  { id:'r4', name:'Workspace P&L',              desc:'Per-workspace profit and loss for the selected period.',           lastRun:'Apr 7, 2026',  schedule:'Weekly',    owner:'Admin System'  },
  { id:'r5', name:'TPA Performance',            desc:'Claims data by TPA/insurer with rejection analysis.',             lastRun:'Apr 6, 2026',  schedule:'Weekly',    owner:'Admin System'  },
  { id:'r6', name:'Cohort Revenue Retention',   desc:'Revenue cohort heatmap for investor and internal review.',        lastRun:'Apr 1, 2026',  schedule:'Monthly',   owner:'Admin System'  },
];
