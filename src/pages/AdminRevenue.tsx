import { useState, useRef, useEffect } from 'react';
import AdminPageLayout from '../components/admin/AdminPageLayout';
import { DollarSign, Download, ChevronDown, RefreshCw, AlertCircle, AlertTriangle, Info, XCircle, FileText, Grid3x3 as Grid3X3, BarChart2, Calendar, MoreVertical, CheckCircle, Settings, Clock, Zap } from 'lucide-react';
import { Currency, FX_TIMESTAMP, formatCurrency } from '../data/revenueData';
import { KpiStrip } from '../components/revenue/KpiStrip';
import { OverviewTab } from '../components/revenue/OverviewTab';
import { SubscriptionsTab } from '../components/revenue/SubscriptionsTab';
import { TransactionsTab } from '../components/revenue/TransactionsTab';
import { InvoicesTab } from '../components/revenue/InvoicesTab';
import { PayoutsTab } from '../components/revenue/PayoutsTab';
import { InsuranceTab } from '../components/revenue/InsuranceTab';
import { RefundsTab } from '../components/revenue/RefundsTab';
import { ForecastsTab } from '../components/revenue/ForecastsTab';
import { ReportsTab } from '../components/revenue/ReportsTab';
import { T, TabButton } from '../components/revenue/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab =
  | 'Overview' | 'Subscriptions' | 'Transactions' | 'Invoices' | 'Payouts'
  | 'Insurance & Claims' | 'Refunds & Disputes' | 'Forecasts' | 'Reports';

const TABS: Tab[] = [
  'Overview','Subscriptions','Transactions','Invoices','Payouts',
  'Insurance & Claims','Refunds & Disputes','Forecasts','Reports',
];

const CURRENCIES: Currency[] = ['AED','USD','EUR','SAR'];

const DATE_PRESETS = [
  'Today','Last 7 days','Month-to-date','Last 30 days',
  'Quarter-to-date','Year-to-date','Last 12 months','Custom',
];

// ─── Alert banners ─────────────────────────────────────────────────────────────
const BANNERS = [
  {
    id: 'action',
    type: 'error',
    icon: AlertCircle,
    title: 'Action required',
    msg: '1 failed payout (AED 18,400) · 2 disputes with evidence due in <48h · 1 invoice overdue >AED 50k',
    btn: 'Review',
  },
  {
    id: 'anomaly',
    type: 'warning',
    icon: AlertTriangle,
    title: 'Anomaly detected',
    msg: 'Refund rate spiked to 3.8% (threshold 3%) in last 6h · MSH International rejections up 40%',
    btn: 'Investigate',
  },
  {
    id: 'compliance',
    type: 'neutral',
    icon: Info,
    title: 'Compliance reminder',
    msg: 'UAE VAT filing window opens in 12 days (Q1 2026). Ensure all transaction records are reconciled.',
    btn: 'Prepare',
  },
];

const BANNER_STYLE = {
  error:   { bg: 'rgba(239,68,68,0.07)',    border: 'rgba(239,68,68,0.22)',    icon: '#F87171', btn: 'rgba(239,68,68,0.15)'    },
  warning: { bg: 'rgba(245,158,11,0.07)',   border: 'rgba(245,158,11,0.22)',   icon: '#FCD34D', btn: 'rgba(245,158,11,0.15)'   },
  neutral: { bg: 'rgba(100,116,139,0.07)',  border: 'rgba(100,116,139,0.2)',   icon: '#94A3B8', btn: 'rgba(100,116,139,0.15)'  },
};

// ─── Currency dropdown ─────────────────────────────────────────────────────────
function CurrencyMenu({ currency, onChange }: { currency: Currency; onChange: (c: Currency) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium transition-all"
        style={{ background: T.bg1, border: `1px solid ${T.border}`, color: T.text1 }}
      >
        <DollarSign size={11} style={{ color: T.teal }} />
        {currency}
        <ChevronDown size={11} style={{ color: T.text3 }} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 rounded-xl border py-1 z-40 w-40"
          style={{ background: T.bg1, borderColor: T.border2, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
          {CURRENCIES.map(c => (
            <button key={c} onClick={() => { onChange(c); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-white/[0.04]"
              style={{ color: c === currency ? T.tealLight : T.text2 }}>
              <span style={{ fontFamily: 'DM Mono, monospace' }}>{c}</span>
              {c === currency && <CheckCircle size={11} style={{ color: T.teal }} />}
            </button>
          ))}
          <div className="px-3 pt-1 pb-2 mt-1" style={{ borderTop: `1px solid ${T.border}` }}>
            <div className="text-[9px] leading-snug" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>
              FX as of {FX_TIMESTAMP}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Date range dropdown ───────────────────────────────────────────────────────
function DateRangeMenu({ preset, onChange }: { preset: string; onChange: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const [compare, setCompare] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium"
        style={{ background: T.bg1, border: `1px solid ${T.border}`, color: T.text1 }}
      >
        <Calendar size={11} style={{ color: T.teal }} />
        {preset}
        <ChevronDown size={11} style={{ color: T.text3 }} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 rounded-xl border py-1 z-40 w-52"
          style={{ background: T.bg1, borderColor: T.border2, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
          {DATE_PRESETS.map(p => (
            <button key={p} onClick={() => { onChange(p); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-white/[0.04]"
              style={{ color: p === preset ? T.tealLight : T.text2 }}>
              {p}
              {p === preset && <CheckCircle size={11} style={{ color: T.teal }} />}
            </button>
          ))}
          <div className="px-3 pt-2 pb-2 mt-1 space-y-1.5" style={{ borderTop: `1px solid ${T.border}` }}>
            <div className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: T.text3 }}>Compare to</div>
            {['Previous period','Same period last year'].map(c => (
              <label key={c} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="compare" checked={compare && c === 'Previous period'}
                  onChange={() => setCompare(true)} className="w-3 h-3 accent-teal-500" />
                <span className="text-[11px]" style={{ color: T.text2 }}>{c}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="compare" checked={!compare} onChange={() => setCompare(false)} className="w-3 h-3 accent-teal-500" />
              <span className="text-[11px]" style={{ color: T.text2 }}>No comparison</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export dropdown ───────────────────────────────────────────────────────────
function ExportMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium transition-all"
        style={{ background: T.tealBg, border: `1px solid ${T.tealBorder}`, color: T.tealLight }}
      >
        <Download size={11} />
        Export
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 rounded-xl border py-1 z-40 w-48"
          style={{ background: T.bg1, borderColor: T.border2, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
          {[
            { label: 'Export as CSV',      icon: FileText  },
            { label: 'Export as XLSX',     icon: Grid3X3   },
            { label: 'PDF Financial Summary', icon: BarChart2 },
          ].map(({ label, icon: Icon }) => (
            <button key={label}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-white/[0.04]"
              style={{ color: T.text2 }}>
              <Icon size={12} style={{ color: T.teal }} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Kebab menu ────────────────────────────────────────────────────────────────
function KebabMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: T.bg1, border: `1px solid ${T.border}`, color: T.text3 }}
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 rounded-xl border py-1 z-40 w-52"
          style={{ background: T.bg1, borderColor: T.border2, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
          {[
            { label: 'Schedule recurring report', icon: Clock    },
            { label: 'Configure revenue settings',icon: Settings },
            { label: 'View revenue audit log',    icon: Zap      },
          ].map(({ label, icon: Icon }) => (
            <button key={label}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-white/[0.04]"
              style={{ color: T.text2 }}>
              <Icon size={12} style={{ color: T.teal }} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AdminRevenue() {
  const [currency, setCurrency] = useState<Currency>('AED');
  const [datePreset, setDatePreset] = useState('Month-to-date');
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const visibleBanners = BANNERS.filter(b => !dismissed.includes(b.id));

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setLastRefresh(new Date()); }, 1200);
  };

  return (
    <AdminPageLayout activeSection="revenue">
      <div className="min-h-screen" style={{ background: T.bg0 }}>
        <div className="px-6 py-5 max-w-[1680px] mx-auto">

          {/* ── Page header ── */}
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold" style={{ color: T.text1, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Revenue
              </h1>
              <p className="text-[11px] mt-0.5" style={{ color: T.text3, fontFamily: 'DM Mono, monospace' }}>
                Platform-wide financial performance across CeenAiX.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Refresh */}
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium transition-all"
                style={{ background: T.bg1, border: `1px solid ${T.border}`, color: T.text3 }}
                title={`Last refreshed ${lastRefresh.toLocaleTimeString()}`}
              >
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <CurrencyMenu currency={currency} onChange={setCurrency} />
              <DateRangeMenu preset={datePreset} onChange={setDatePreset} />
              <ExportMenu />
              <KebabMenu />
            </div>
          </div>

          {/* ── Alert banners ── */}
          {visibleBanners.length > 0 && (
            <div className="flex flex-col gap-2 mb-5">
              {visibleBanners.map(b => {
                const s = BANNER_STYLE[b.type as keyof typeof BANNER_STYLE];
                const Icon = b.icon;
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs"
                    style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <Icon size={13} style={{ color: s.icon, flexShrink: 0 }} />
                    <span className="font-semibold flex-shrink-0" style={{ color: s.icon }}>{b.title}:</span>
                    <span className="flex-1 leading-snug" style={{ color: T.text2 }}>{b.msg}</span>
                    <button className="text-[10px] px-3 py-1 rounded-lg font-medium flex-shrink-0 transition-opacity hover:opacity-80"
                      style={{ background: s.btn, color: s.icon }}>
                      {b.btn}
                    </button>
                    <button onClick={() => setDismissed(d => [...d, b.id])}
                      className="opacity-40 hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: s.icon }}>
                      <XCircle size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── KPI strip ── */}
          <div className="mb-5">
            <KpiStrip currency={currency} />
          </div>

          {/* ── Tabs ── */}
          <div className="mb-5 border-b" style={{ borderColor: T.border }}>
            <div
              className="flex overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}
              role="tablist"
              aria-label="Revenue sections"
            >
              {TABS.map(tab => (
                <TabButton key={tab} label={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />
              ))}
            </div>
          </div>

          {/* ── Tab content ── */}
          <div role="tabpanel">
            {activeTab === 'Overview'           && <OverviewTab      currency={currency} />}
            {activeTab === 'Subscriptions'      && <SubscriptionsTab currency={currency} />}
            {activeTab === 'Transactions'       && <TransactionsTab  currency={currency} />}
            {activeTab === 'Invoices'           && <InvoicesTab      currency={currency} />}
            {activeTab === 'Payouts'            && <PayoutsTab       currency={currency} />}
            {activeTab === 'Insurance & Claims' && <InsuranceTab     currency={currency} />}
            {activeTab === 'Refunds & Disputes' && <RefundsTab       currency={currency} />}
            {activeTab === 'Forecasts'          && <ForecastsTab     currency={currency} />}
            {activeTab === 'Reports'            && <ReportsTab />}
          </div>

          {/* Bottom breathing room */}
          <div className="h-12" />
        </div>
      </div>
    </AdminPageLayout>
  );
}
